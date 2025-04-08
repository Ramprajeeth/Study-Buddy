// frontend/lib/firebase.ts
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBckkUnC86zEdaNvXqYha1Ir0xcFguqkdg",
  authDomain: "study-buddy-63a7a.firebaseapp.com",
  projectId: "study-buddy-63a7a",
  storageBucket: "study-buddy-63a7a.firebasestorage.app",
  messagingSenderId: "22115081290",
  appId: "1:22115081290:web:2ae0b693eec86d37cc5ab3",
  measurementId: "G-FHK764XYRQ",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
