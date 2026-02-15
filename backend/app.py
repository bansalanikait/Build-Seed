from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, auth

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



