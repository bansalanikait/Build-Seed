from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
import re

app = Flask(__name__)
CORS(app)

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


@app.route("/")
def home():
    return "Backend Running Successfully!"


def verify_token(req):
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    try:
        id_token = auth_header.split("Bearer ", 1)[1]
        return auth.verify_id_token(id_token)
    except Exception:
        return None


def is_admin_user(user):
    # Prefer Firebase custom claim `admin=true`; keep demo fallback for existing test accounts.
    return bool(user.get("admin")) or "admin" in user.get("email", "").lower()


def has_conflict(room, date, start_time, end_time):
    existing = (
        db.collection("bookings")
        .where("room", "==", room)
        .where("date", "==", date)
        .stream()
    )
    for booking in existing:
        b = booking.to_dict()
        if not (end_time <= b.get("start_time", "") or start_time >= b.get("end_time", "")):
            return True
    return False


def is_valid_week_format(week):
    if not isinstance(week, str):
        return False
    match = re.match(r"^(\d{4})-W(\d{2})$", week)
    if not match:
        return False
    week_number = int(match.group(2))
    return 1 <= week_number <= 53


@app.route("/api/create-booking", methods=["POST"])
def create_booking():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    required_fields = ["room", "date", "start_time", "end_time", "purpose"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    room = data["room"]
    date = data["date"]
    start_time = data["start_time"]
    end_time = data["end_time"]
    purpose = data["purpose"]
    user_email = user.get("email", "")

    if has_conflict(room, date, start_time, end_time):
        return jsonify({"status": "conflict", "message": "Room already booked"}), 400

    doc_ref = db.collection("bookings").document()
    doc_ref.set(
        {
            "room": room,
            "date": date,
            "start_time": start_time,
            "end_time": end_time,
            "purpose": purpose,
            "user": user_email,
            "status": "Pending",
        }
    )

    return jsonify(
        {
            "status": "success",
            "message": "Booking submitted",
            "booking_id": doc_ref.id,
        }
    )


@app.route("/api/submit-food-review", methods=["POST"])
def submit_food_review():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    required_fields = [
        "hostel",
        "week",
        "taste_rating",
        "hygiene_rating",
        "variety_rating",
    ]
    missing = [field for field in required_fields if data.get(field) is None or data.get(field) == ""]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    week = str(data.get("week", "")).strip()
    if not is_valid_week_format(week):
        return jsonify({"error": "Invalid week format. Use YYYY-Www."}), 400

    try:
        taste_rating = int(data["taste_rating"])
        hygiene_rating = int(data["hygiene_rating"])
        variety_rating = int(data["variety_rating"])
    except (TypeError, ValueError):
        return jsonify({"error": "Ratings must be numbers from 1 to 5."}), 400

    for value in [taste_rating, hygiene_rating, variety_rating]:
        if value < 1 or value > 5:
            return jsonify({"error": "Ratings must be between 1 and 5."}), 400

    hostel = str(data.get("hostel", "")).strip()
    comment = str(data.get("comment", "")).strip()
    user_email = user.get("email", "")

    existing = (
        db.collection("food_reviews")
        .where("week", "==", week)
        .where("hostel", "==", hostel)
        .where("user", "==", user_email)
        .limit(1)
        .stream()
    )
    existing_doc = next(existing, None)

    payload = {
        "week": week,
        "hostel": hostel,
        "taste_rating": taste_rating,
        "hygiene_rating": hygiene_rating,
        "variety_rating": variety_rating,
        "overall_rating": round((taste_rating + hygiene_rating + variety_rating) / 3, 2),
        "comment": comment,
        "user": user_email,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    if existing_doc:
        db.collection("food_reviews").document(existing_doc.id).update(payload)
        return jsonify({"status": "success", "message": "Food review updated", "review_id": existing_doc.id})

    doc_ref = db.collection("food_reviews").document()
    payload["created_at"] = firestore.SERVER_TIMESTAMP
    doc_ref.set(payload)

    return jsonify({"status": "success", "message": "Food review submitted", "review_id": doc_ref.id})


@app.route("/api/get-food-review-summary", methods=["GET"])
def get_food_review_summary():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    week = (request.args.get("week") or "").strip()
    if not is_valid_week_format(week):
        return jsonify({"error": "Invalid or missing week. Use YYYY-Www."}), 400

    docs = db.collection("food_reviews").where("week", "==", week).stream()

    hostel_map = {}
    for doc in docs:
        data = doc.to_dict()
        hostel = data.get("hostel", "Unknown Hostel")
        if hostel not in hostel_map:
            hostel_map[hostel] = {
                "hostel": hostel,
                "review_count": 0,
                "taste_total": 0,
                "hygiene_total": 0,
                "variety_total": 0,
                "overall_total": 0,
                "comments": [],
            }

        item = hostel_map[hostel]
        taste = int(data.get("taste_rating", 0) or 0)
        hygiene = int(data.get("hygiene_rating", 0) or 0)
        variety = int(data.get("variety_rating", 0) or 0)
        overall = float(data.get("overall_rating", 0) or 0)
        comment = (data.get("comment", "") or "").strip()

        item["review_count"] += 1
        item["taste_total"] += taste
        item["hygiene_total"] += hygiene
        item["variety_total"] += variety
        item["overall_total"] += overall
        if comment and len(item["comments"]) < 3:
            item["comments"].append(comment)

    summary = []
    for hostel, item in hostel_map.items():
        count = item["review_count"] or 1
        summary.append(
            {
                "hostel": hostel,
                "review_count": item["review_count"],
                "avg_taste": round(item["taste_total"] / count, 2),
                "avg_hygiene": round(item["hygiene_total"] / count, 2),
                "avg_variety": round(item["variety_total"] / count, 2),
                "avg_overall": round(item["overall_total"] / count, 2),
                "sample_comments": item["comments"],
            }
        )

    summary.sort(key=lambda x: x["avg_overall"], reverse=True)

    return jsonify({"status": "success", "week": week, "hostels": summary})


@app.route("/api/get-bookings", methods=["GET"])
def get_bookings():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    user_email = user.get("email", "")
    docs = db.collection("bookings").where("user", "==", user_email).stream()

    booking_list = []
    for doc in docs:
        data = doc.to_dict()
        booking_list.append(
            {
                "id": doc.id,
                "room": data.get("room", ""),
                "date": data.get("date", ""),
                "start_time": data.get("start_time", ""),
                "end_time": data.get("end_time", ""),
                "purpose": data.get("purpose", ""),
                "status": data.get("status", "Pending"),
            }
        )

    booking_list.sort(key=lambda b: (b["date"], b["start_time"]))
    return jsonify({"status": "success", "bookings": booking_list})


@app.route("/api/get-all-bookings", methods=["GET"])
def get_all_bookings():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not is_admin_user(user):
        return jsonify({"error": "Forbidden"}), 403

    docs = db.collection("bookings").stream()
    booking_list = []
    for doc in docs:
        data = doc.to_dict()
        booking_list.append(
            {
                "id": doc.id,
                "room": data.get("room", ""),
                "date": data.get("date", ""),
                "start_time": data.get("start_time", ""),
                "end_time": data.get("end_time", ""),
                "purpose": data.get("purpose", ""),
                "user": data.get("user", ""),
                "status": data.get("status", "Pending"),
            }
        )

    booking_list.sort(key=lambda b: (b["date"], b["start_time"]))
    return jsonify({"status": "success", "bookings": booking_list})


def update_booking_status(new_status):
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not is_admin_user(user):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    booking_id = data.get("id")
    if not booking_id:
        return jsonify({"error": "Missing required field: id"}), 400

    db.collection("bookings").document(booking_id).update({"status": new_status})
    return jsonify({"status": "success", "message": f"Booking {new_status.lower()}"})


@app.route("/api/approve", methods=["POST"])
def approve_booking():
    return update_booking_status("Approved")


@app.route("/api/reject", methods=["POST"])
def reject_booking():
    return update_booking_status("Rejected")


if __name__ == "__main__":
    app.run(debug=True)



