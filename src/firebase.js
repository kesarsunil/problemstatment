// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPwT0s2xR1u1cgZwEBzSL8EizxF09md9o",
  authDomain: "owasp-78ee6.firebaseapp.com",
  projectId: "owasp-78ee6",
  storageBucket: "owasp-78ee6.firebasestorage.app",
  messagingSenderId: "142802259787",
  appId: "1:142802259787:web:1378f46932bc4cecdf62ce",
  measurementId: "G-WDBNXCDFZS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export default app;