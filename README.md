# Build Seed - Student Campus Management Platform

A comprehensive web application designed to streamline student life on campus by integrating room bookings, commute tracking, food reviews, and current affairs management.

## Features

### 🏠 Room Booking System
- Reserve study rooms with specific time slots
- Conflict detection to prevent double bookings
- Mark arrival status and track expected vs. actual arrival times
- Admin approval workflow for bookings
- Safety alerts for missed check-ins

### 🚗 Commute Tracker
- Log daily commute information with expected arrival times
- Support for multiple travel modes
- Track whether students have arrived at the institute
- Automated alerts for missed ETAs
- Historical commute data and notes

### 🍽️ Food Review System
- Submit weekly hostel food ratings (taste, hygiene, variety)
- Aggregate ratings by hostel and week
- Comment system for detailed feedback
- Review history and trends

### 📰 Current Affairs
- Browse and manage campus news and events
- Filter by category (academic, cultural, sports, etc.)
- Event date tracking
- Admin capabilities to publish updates

### 👥 User Management
- Firebase authentication
- Role-based access control (admin/student)
- Admin dashboard for system management
- User-specific data tracking

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive styling
- **JavaScript** - Dynamic interactions
- **Firebase SDK** - Real-time authentication and data

### Backend
- **Flask** - Python web framework
- **Flask-CORS** - Cross-origin request handling
- **Firebase Admin SDK** - Backend authentication and Firestore database
- **Gunicorn** - Production WSGI server

### Database
- **Firebase Firestore** - NoSQL cloud database

## Project Structure

```
.
├── index.html                    # Landing page
├── student.html                  # Student dashboard
├── admin.html                    # Admin panel
├── room_booking.html            # Room booking interface
├── commute_tracker.html         # Commute tracking
├── food_review.html             # Food review submission
├── academic_discovery.html      # Current affairs/news
├── css/
│   ├── style.css               # Global styles
│   └── style_student.css       # Student page specific
├── frontend/css/
│   └── style_index.css         # Landing page styles
├── js/
│   ├── firebase-config.js      # Firebase configuration
│   ├── auth.js                 # Authentication logic
│   └── main.js                 # Main application logic
└── backend/
    ├── app.py                  # Flask application server
    ├── requirements.txt        # Python dependencies
    ├── package.json           # Node dependencies
    ├── PROCFILE               # Deployment configuration
    └── serviceAccountKey.json # Firebase credentials (not included)
```

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js (optional, for frontend build tools)
- Firebase account with Firestore database setup

### Backend Setup

1. **Clone and navigate to the project**
   ```bash
   cd Build-Seed
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configure Firebase**
   - Download your Firebase service account key from Firebase Console
   - Save it as `backend/serviceAccountKey.json`
   - Or set the `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable

5. **Run the backend server**
   ```bash
   python backend/app.py
   ```
   Server will run at `http://localhost:5000`

### Frontend Setup

1. **Update Firebase configuration**
   - Edit `js/firebase-config.js` with your Firebase project credentials

2. **Serve the frontend**
   - Option 1: Open HTML files directly in a browser (for development)
   - Option 2: Use a simple HTTP server:
     ```bash
     python -m http.server 8000
     ```
   - Then navigate to `http://localhost:8000`

## API Endpoints

### Booking Management
- `POST /api/create-booking` - Create a new room booking
- `POST /api/mark-arrival` - Mark student arrival for a booking
- `GET /api/my-bookings` - Retrieve user's bookings
- `GET /api/all-bookings` - Admin: Get all bookings

### Commute Tracking
- `POST /api/submit-commute-eta` - Log commute information
- `GET /api/my-commute-status` - Check commute status
- `GET /api/all-commute-status` - Admin: View all commute data

### Food Reviews
- `POST /api/submit-food-review` - Submit hostel food review
- `GET /api/food-reviews` - Get reviews by hostel and week
- `GET /api/food-review-stats` - Get aggregated statistics

### Current Affairs
- `POST /api/create-current-affair` - Admin: Post news/event
- `GET /api/current-affairs` - Get all current affairs
- `DELETE /api/current-affair/:id` - Admin: Delete current affair

## Environment Variables

Create a `.env` file in the `backend/` directory:

```plaintext
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FLASK_ENV=development
FLASK_DEBUG=True
```

## Deployment

### Deploy to Heroku
1. Ensure `PROCFILE` is in the root directory
2. Set environment variable for Firebase credentials:
   ```bash
   heroku config:set FIREBASE_SERVICE_ACCOUNT_PATH=/app/serviceAccountKey.json
   ```
3. Push to Heroku:
   ```bash
   git push heroku main
   ```

### Deploy Frontend
- Host static files on Firebase Hosting, Netlify, or Vercel

## Authentication

The application uses Firebase Authentication:
- Users log in with email and password
- JWT tokens are sent in Authorization headers
- Admin users have custom claims or admin email addresses
- All API endpoints verify tokens before processing requests

## Data Models

### Bookings
- `room` - Room identifier
- `date` - Booking date (YYYY-MM-DD)
- `start_time` - Start time (HH:MM)
- `end_time` - End time (HH:MM)
- `expected_arrival_time` - When student expects to arrive
- `purpose` - Booking purpose
- `user` - User email
- `status` - Pending/Approved/Rejected
- `has_arrived` - Arrival status
- `arrival_marked_at` - Timestamp of arrival

### Food Reviews
- `week` - Week number (YYYY-Www format)
- `hostel` - Hostel name
- `taste_rating` - 1-5 scale
- `hygiene_rating` - 1-5 scale
- `variety_rating` - 1-5 scale
- `overall_rating` - Calculated average
- `comment` - User comment
- `user` - User email

### Commute ETA
- `date` - Commute date
- `expected_arrival_time` - Expected arrival time
- `travel_mode` - Mode of transport
- `notes` - Additional notes
- `user` - User email
- `has_arrived` - Arrival status

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## Troubleshooting

### Firebase Connection Errors
- Verify `serviceAccountKey.json` exists and is valid
- Check Firebase Firestore rules allow read/write operations
- Ensure environment variable is set correctly

### CORS Errors
- Backend is already configured with `flask-cors`
- Check that frontend origin is authorized in Firebase

### Port Already in Use
- Change port in `app.py`: Modify `app.run(port=5000)` to a different port
- Or kill existing process using port 5000

## License

This project is part of the buildathon starter template.

## Support

For issues or questions, please refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- Create an issue in the repository
