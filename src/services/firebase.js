import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC6iGqFyxfvpayRsfKiy71ObLYwJOA4l8g",
    authDomain: "education-platform-76e27.firebaseapp.com",
    projectId: "education-platform-76e27",
    storageBucket: "education-platform-76e27.firebasestorage.app",
    messagingSenderId: "349893480386",
    appId: "1:349893480386:web:5e15335d5aff80585ad05b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);