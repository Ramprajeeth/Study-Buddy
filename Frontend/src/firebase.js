// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBckkUnC86zEdaNvXqYha1Ir0xcFguqkdg",
  authDomain: "study-buddy-63a7a.firebaseapp.com",
  projectId: "study-buddy-63a7a",
  storageBucket: "study-buddy-63a7a.firebasestorage.app",
  messagingSenderId: "22115081290",
  appId: "1:22115081290:web:2ae0b693eec86d37cc5ab3",
  measurementId: "G-FHK764XYRQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

export{db};