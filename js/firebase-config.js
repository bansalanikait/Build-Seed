const cfFirebaseConfig = {
    apiKey: "AIzaSyAom7HOb0uDR9U9WYGIJk5H2Hdf8DQ-nEs",
    authDomain: "build-data-15c3a.firebaseapp.com",
    projectId: "build-data-15c3a",
    storageBucket: "build-data-15c3a.firebasestorage.app",
    messagingSenderId: "756232059529",
    appId: "1:756232059529:web:76d8d2812163d6fbc6a458",
    measurementId: "G-JM10ELQE9G"
};

if (!firebase.apps.length) {
    firebase.initializeApp(cfFirebaseConfig);
}

const cfFirebaseAuth = firebase.auth();
