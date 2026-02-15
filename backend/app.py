from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


@app.route('/')
def home():
    return "Backend Running Successfully!"


# ----------------------------
# CREATE BOOKING
# ----------------------------
@app.route('/book', methods=['POST'])
def book_room():
    data = request.json

    room = data['room']
    date = data['date']
    start_time = data['start_time']
    end_time = data['end_time']
    purpose = data['purpose']
    user = data['user']

    bookings_ref = db.collection('bookings')
    existing = bookings_ref.where('room', '==', room).where('date', '==', date).stream()

    # Conflict detection
    for booking in existing:
        b = booking.to_dict()

        if not (end_time <= b['start_time'] or start_time >= b['end_time']):
            return jsonify({"status": "conflict", "message": "Room already booked"}), 400

    bookings_ref.add({
        "room": room,
        "date": date,
        "start_time": start_time,
        "end_time": end_time,
        "purpose": purpose,
        "user": user,
        "status": "Pending"
    })

    return jsonify({"status": "success", "message": "Booking submitted"})


from firebase_admin import auth

def verify_token(request):
    auth_header = request.headers.get('Authorization')

    if not auth_header:
        return None

    try:
        id_token = auth_header.split("Bearer ")[1]
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        return None


@app.route('/api/create-booking', methods=['POST'])
def create_booking():

    user = verify_token(request)

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    room = data['room']
    date = data['date']
    start_time = data['start_time']
    end_time = data['end_time']
    purpose = data['purpose']

    user_email = user['email']  # from Firebase token

    bookings_ref = db.collection('bookings')
    existing = bookings_ref.where('room', '==', room).where('date', '==', date).stream()

    for booking in existing:
        b = booking.to_dict()

        if not (end_time <= b['start_time'] or start_time >= b['end_time']):
            return jsonify({"status": "conflict", "message": "Room already booked"}), 400

    bookings_ref.add({
        "room": room,
        "date": date,
        "start_time": start_time,
        "end_time": end_time,
        "purpose": purpose,
        "user": user_email,
        "status": "Pending"
    })

    return jsonify({"status": "success", "message": "Booking submitted"})






# ----------------------------
# APPROVE / REJECT
# ----------------------------
@app.route('/approve', methods=['POST'])
def approve_booking():
    data = request.json
    booking_id = data['id']
    status = data['status']

    db.collection('bookings').document(booking_id).update({
        "status": status
    })

    return jsonify({"message": "Booking updated"})


if __name__ == '__main__':
    app.run(debug=True)



