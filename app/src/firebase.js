import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBoR3Z5qRt6VAoqMvKLrNpxRt2ie3hyvZs",
    authDomain: "vn-alpha-scan.firebaseapp.com",
    projectId: "vn-alpha-scan",
    storageBucket: "vn-alpha-scan.firebasestorage.app",
    messagingSenderId: "1083458788792",
    appId: "1:1083458788792:web:b67a8ff4b5ba720ae8834d",
    measurementId: "G-FR1DZ73QYG",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
