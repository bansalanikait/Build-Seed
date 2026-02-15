// Firebase Configuration

const cfFirebaseConfig = {
    apiKey: "YOUR_REAL_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(cfFirebaseConfig);

// Create Auth Instance
const cfFirebaseAuth = firebase.auth();
