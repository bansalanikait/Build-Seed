from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
import re
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


@app.route("/")
def home():
    return "Backend Running Successfully!"


@app.route("/api/me", methods=["GET"])
def get_me():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify(
        {
            "status": "success",
            "email": user.get("email", ""),
            "is_admin": is_admin_user(user),
        }
    )


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
    # Allow admins via Firebase custom claim and optional explicit allowlist.
    if bool(user.get("admin")):
        return True

    admin_emails = {
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    }
    user_email = str(user.get("email", "")).strip().lower()
    return bool(user_email) and user_email in admin_emails


def has_conflict(room, date, start_time, end_time, transaction=None):
    start_dt = parse_datetime_parts(date, start_time)
    end_dt = parse_datetime_parts(date, end_time)
    if not start_dt or not end_dt:
        return True

    existing = (
        db.collection("bookings")
        .where("room", "==", room)
        .where("date", "==", date)
        .stream(transaction=transaction)
    )
    for booking in existing:
        b = booking.to_dict() or {}
        existing_start = parse_datetime_parts(date, b.get("start_time", ""))
        existing_end = parse_datetime_parts(date, b.get("end_time", ""))
        if not existing_start or not existing_end:
            continue
        if start_dt < existing_end and end_dt > existing_start:
            return True
    return False


def get_booking_lock_id(room, date):
    normalized_room = re.sub(r"[^A-Za-z0-9_.-]", "_", str(room or "").strip())
    return f"{normalized_room}__{date}"


def create_booking_transaction(room, date, start_time, end_time, payload):
    booking_doc_ref = db.collection("bookings").document()
    lock_doc_ref = db.collection("booking_locks").document(get_booking_lock_id(room, date))

    @firestore.transactional
    def txn_handler(transaction):
        # Serialize writes for the same room/date to reduce double-booking races.
        transaction.set(lock_doc_ref, {"updated_at": firestore.SERVER_TIMESTAMP}, merge=True)

        if has_conflict(room, date, start_time, end_time, transaction=transaction):
            return False

        transaction.set(booking_doc_ref, payload)
        return True

    transaction = db.transaction()
    created = txn_handler(transaction)
    return created, booking_doc_ref.id


def is_valid_week_format(week):
    if not isinstance(week, str):
        return False
    match = re.match(r"^(\d{4})-W(\d{2})$", week)
    if not match:
        return False
    week_number = int(match.group(2))
    return 1 <= week_number <= 53


def parse_datetime_parts(date_value, time_value):
    try:
        return datetime.strptime(f"{date_value} {time_value}", "%Y-%m-%d %H:%M")
    except Exception:
        return None


def get_safety_alert_message(booking_data):
    if (booking_data.get("status") or "").lower() == "rejected":
        return ""
    if bool(booking_data.get("has_arrived")):
        return ""

    date_value = booking_data.get("date", "")
    expected_arrival_time = booking_data.get("expected_arrival_time", "")
    if not date_value or not expected_arrival_time:
        return ""

    expected_dt = parse_datetime_parts(date_value, expected_arrival_time)
    if not expected_dt:
        return ""

    if datetime.now() <= expected_dt:
        return ""

    return "Student has not marked arrival after expected time."


def get_commute_alert_message(commute_data):
    if bool(commute_data.get("has_arrived")):
        return ""

    commute_date = commute_data.get("date", "")
    expected_arrival_time = commute_data.get("expected_arrival_time", "")
    if not commute_date or not expected_arrival_time:
        return ""

    expected_dt = parse_datetime_parts(commute_date, expected_arrival_time)
    if not expected_dt:
        return ""

    if datetime.now() <= expected_dt:
        return ""

    return "Student has not reached institute by expected commute ETA."


def serialize_current_affair(doc):
    data = doc.to_dict() or {}
    return {
        "id": doc.id,
        "title": data.get("title", ""),
        "content": data.get("content", ""),
        "category": data.get("category", ""),
        "event_date": data.get("event_date", ""),
        "created_by": data.get("created_by", ""),
    }


@app.route("/api/create-booking", methods=["POST"])
def create_booking():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    required_fields = ["room", "date", "start_time", "end_time", "expected_arrival_time", "purpose"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    room = data["room"]
    date = data["date"]
    start_time = data["start_time"]
    end_time = data["end_time"]
    expected_arrival_time = data["expected_arrival_time"]
    purpose = data["purpose"]
    user_email = user.get("email", "")

    start_dt = parse_datetime_parts(date, start_time)
    end_dt = parse_datetime_parts(date, end_time)
    expected_dt = parse_datetime_parts(date, expected_arrival_time)
    if not start_dt or not end_dt or not expected_dt:
        return jsonify({"error": "Invalid date or time format. Use YYYY-MM-DD and HH:MM."}), 400

    if start_dt >= end_dt:
        return jsonify({"error": "End time must be greater than start time."}), 400

    if start_dt > expected_dt or expected_dt > end_dt:
        return jsonify({"error": "Expected arrival time must be between start and end time."}), 400

    payload = {
        "room": room,
        "date": date,
        "start_time": start_time,
        "end_time": end_time,
        "expected_arrival_time": expected_arrival_time,
        "purpose": purpose,
        "user": user_email,
        "status": "Pending",
        "has_arrived": False,
        "arrival_marked_at": None,
    }
    try:
        created, booking_id = create_booking_transaction(room, date, start_time, end_time, payload)
    except Exception:
        return jsonify({"error": "Unable to create booking at the moment. Please retry."}), 503

    if not created:
        return jsonify({"status": "conflict", "message": "Room already booked"}), 400

    return jsonify(
        {
            "status": "success",
            "message": "Booking submitted",
            "booking_id": booking_id,
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


@app.route("/api/submit-commute-eta", methods=["POST"])
def submit_commute_eta():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    required_fields = ["date", "expected_arrival_time"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    date_value = str(data.get("date", "")).strip()
    expected_arrival_time = str(data.get("expected_arrival_time", "")).strip()
    travel_mode = str(data.get("travel_mode", "")).strip()
    notes = str(data.get("notes", "")).strip()
    user_email = user.get("email", "")

    if parse_datetime_parts(date_value, expected_arrival_time) is None:
        return jsonify({"error": "Invalid date or expected arrival time."}), 400

    existing = (
        db.collection("commute_eta")
        .where("user", "==", user_email)
        .where("date", "==", date_value)
        .limit(1)
        .stream()
    )
    existing_doc = next(existing, None)

    payload = {
        "user": user_email,
        "date": date_value,
        "expected_arrival_time": expected_arrival_time,
        "travel_mode": travel_mode,
        "notes": notes,
        "has_arrived": False,
        "arrival_marked_at": None,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    if existing_doc:
        existing_data = existing_doc.to_dict() or {}
        if bool(existing_data.get("has_arrived")):
            payload["has_arrived"] = True
            payload["arrival_marked_at"] = existing_data.get("arrival_marked_at")
        db.collection("commute_eta").document(existing_doc.id).update(payload)
        return jsonify({"status": "success", "message": "Commute ETA updated", "id": existing_doc.id})

    doc_ref = db.collection("commute_eta").document()
    payload["created_at"] = firestore.SERVER_TIMESTAMP
    doc_ref.set(payload)
    return jsonify({"status": "success", "message": "Commute ETA submitted", "id": doc_ref.id})


@app.route("/api/get-commute-entries", methods=["GET"])
def get_commute_entries():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    user_email = user.get("email", "")
    docs = db.collection("commute_eta").where("user", "==", user_email).stream()

    entries = []
    for doc in docs:
        data = doc.to_dict() or {}
        entries.append(
            {
                "id": doc.id,
                "date": data.get("date", ""),
                "expected_arrival_time": data.get("expected_arrival_time", ""),
                "travel_mode": data.get("travel_mode", ""),
                "notes": data.get("notes", ""),
                "has_arrived": bool(data.get("has_arrived")),
                "alert_message": get_commute_alert_message(data),
            }
        )

    entries.sort(key=lambda e: (e["date"], e["expected_arrival_time"]), reverse=True)
    return jsonify({"status": "success", "entries": entries})


@app.route("/api/mark-commute-arrived", methods=["POST"])
def mark_commute_arrived():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    entry_id = data.get("id")
    if not entry_id:
        return jsonify({"error": "Missing required field: id"}), 400

    doc_ref = db.collection("commute_eta").document(entry_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        return jsonify({"error": "Commute entry not found"}), 404

    entry = snapshot.to_dict() or {}
    user_email = user.get("email", "")
    is_owner = entry.get("user", "") == user_email
    if not (is_owner or is_admin_user(user)):
        return jsonify({"error": "Forbidden"}), 403

    doc_ref.update({"has_arrived": True, "arrival_marked_at": firestore.SERVER_TIMESTAMP})
    return jsonify({"status": "success", "message": "Commute arrival marked successfully"})


@app.route("/api/get-admin-commute-alerts", methods=["GET"])
def get_admin_commute_alerts():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not is_admin_user(user):
        return jsonify({"error": "Forbidden"}), 403

    docs = db.collection("commute_eta").stream()

    alerts = []
    entries = []
    for doc in docs:
        data = doc.to_dict() or {}
        alert_message = get_commute_alert_message(data)
        is_alert = bool(alert_message)
        item = {
            "id": doc.id,
            "user": data.get("user", ""),
            "date": data.get("date", ""),
            "expected_arrival_time": data.get("expected_arrival_time", ""),
            "travel_mode": data.get("travel_mode", ""),
            "notes": data.get("notes", ""),
            "has_arrived": bool(data.get("has_arrived")),
            "alert_message": alert_message,
            "is_alert": is_alert,
        }
        entries.append(item)
        if is_alert:
            alerts.append(item)

    entries.sort(key=lambda e: (e["date"], e["expected_arrival_time"]), reverse=True)
    alerts.sort(key=lambda e: (e["date"], e["expected_arrival_time"]))
    return jsonify({"status": "success", "alerts": alerts, "entries": entries})


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


@app.route("/api/current-affairs", methods=["GET"])
def get_current_affairs():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    docs = db.collection("current_affairs").stream()
    items = [serialize_current_affair(doc) for doc in docs]
    items.sort(key=lambda x: (x["event_date"], x["id"]), reverse=True)
    return jsonify({"status": "success", "items": items})


@app.route("/api/admin/current-affairs", methods=["POST"])
def create_current_affair():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not is_admin_user(user):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    required_fields = ["title", "content", "event_date"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    title = str(data.get("title", "")).strip()
    content = str(data.get("content", "")).strip()
    category = str(data.get("category", "")).strip()
    event_date = str(data.get("event_date", "")).strip()

    try:
        datetime.strptime(event_date, "%Y-%m-%d")
    except Exception:
        return jsonify({"error": "Invalid event date. Use YYYY-MM-DD."}), 400

    doc_ref = db.collection("current_affairs").document()
    doc_ref.set(
        {
            "title": title,
            "content": content,
            "category": category,
            "event_date": event_date,
            "created_by": user.get("email", ""),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return jsonify({"status": "success", "message": "Current affair added", "id": doc_ref.id})


@app.route("/api/admin/current-affairs/<affair_id>", methods=["PUT"])
def update_current_affair(affair_id):
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not is_admin_user(user):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    required_fields = ["title", "content", "event_date"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    title = str(data.get("title", "")).strip()
    content = str(data.get("content", "")).strip()
    category = str(data.get("category", "")).strip()
    event_date = str(data.get("event_date", "")).strip()

    try:
        datetime.strptime(event_date, "%Y-%m-%d")
    except Exception:
        return jsonify({"error": "Invalid event date. Use YYYY-MM-DD."}), 400

    doc_ref = db.collection("current_affairs").document(affair_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        return jsonify({"error": "Current affair not found"}), 404

    doc_ref.update(
        {
            "title": title,
            "content": content,
            "category": category,
            "event_date": event_date,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return jsonify({"status": "success", "message": "Current affair updated"})


@app.route("/api/admin/current-affairs/<affair_id>", methods=["DELETE"])
def delete_current_affair(affair_id):
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not is_admin_user(user):
        return jsonify({"error": "Forbidden"}), 403

    doc_ref = db.collection("current_affairs").document(affair_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        return jsonify({"error": "Current affair not found"}), 404

    doc_ref.delete()
    return jsonify({"status": "success", "message": "Current affair deleted"})


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
                "expected_arrival_time": data.get("expected_arrival_time", ""),
                "purpose": data.get("purpose", ""),
                "status": data.get("status", "Pending"),
                "has_arrived": bool(data.get("has_arrived")),
                "safety_alert_message": get_safety_alert_message(data),
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
    safety_alerts = []
    for doc in docs:
        data = doc.to_dict()
        safety_alert_message = get_safety_alert_message(data)
        safety_alert = bool(safety_alert_message)
        if safety_alert:
            safety_alerts.append(
                {
                    "booking_id": doc.id,
                    "user": data.get("user", ""),
                    "room": data.get("room", ""),
                    "date": data.get("date", ""),
                    "expected_arrival_time": data.get("expected_arrival_time", ""),
                    "message": safety_alert_message,
                }
            )

        booking_list.append(
            {
                "id": doc.id,
                "room": data.get("room", ""),
                "date": data.get("date", ""),
                "start_time": data.get("start_time", ""),
                "end_time": data.get("end_time", ""),
                "expected_arrival_time": data.get("expected_arrival_time", ""),
                "purpose": data.get("purpose", ""),
                "user": data.get("user", ""),
                "status": data.get("status", "Pending"),
                "has_arrived": bool(data.get("has_arrived")),
                "safety_alert": safety_alert,
                "safety_alert_message": safety_alert_message,
            }
        )

    booking_list.sort(key=lambda b: (b["date"], b["start_time"]))
    safety_alerts.sort(key=lambda a: (a["date"], a["expected_arrival_time"]))
    return jsonify({"status": "success", "bookings": booking_list, "safety_alerts": safety_alerts})


@app.route("/api/mark-arrived", methods=["POST"])
def mark_arrived():
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    booking_id = data.get("id")
    if not booking_id:
        return jsonify({"error": "Missing required field: id"}), 400

    doc_ref = db.collection("bookings").document(booking_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        return jsonify({"error": "Booking not found"}), 404

    booking = snapshot.to_dict() or {}
    user_email = user.get("email", "")
    is_owner = booking.get("user", "") == user_email
    if not (is_owner or is_admin_user(user)):
        return jsonify({"error": "Forbidden"}), 403

    if (booking.get("status") or "").lower() == "rejected":
        return jsonify({"error": "Arrival cannot be marked for rejected bookings."}), 400

    doc_ref.update({"has_arrived": True, "arrival_marked_at": firestore.SERVER_TIMESTAMP})
    return jsonify({"status": "success", "message": "Arrival marked successfully"})


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

    booking_ref = db.collection("bookings").document(booking_id)
    booking_snapshot = booking_ref.get()
    if not booking_snapshot.exists:
        return jsonify({"error": "Booking not found"}), 404

    booking_ref.update({"status": new_status})
    return jsonify({"status": "success", "message": f"Booking {new_status.lower()}"})


@app.route("/api/approve", methods=["POST"])
def approve_booking():
    return update_booking_status("Approved")


@app.route("/api/reject", methods=["POST"])
def reject_booking():
    return update_booking_status("Rejected")


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode)
