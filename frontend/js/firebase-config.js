// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAom7HOb0uDR9U9WYGIJk5H2Hdf8DQ-nEs",
  authDomain: "build-data-15c3a.firebaseapp.com",
  projectId: "build-data-15c3a",
  storageBucket: "build-data-15c3a.firebasestorage.app",
  messagingSenderId: "756232059529",
  appId: "1:756232059529:web:76d8d2812163d6fbc6a458",
  measurementId: "G-JM10ELQE9G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);