// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCR1AwhukGCnLgItiHuMIR9YmIozjv_-jM",
    authDomain: "robot-bartender-f3e82.firebaseapp.com",
    projectId: "robot-bartender-f3e82",
    storageBucket: "robot-bartender-f3e82.firebasestorage.app",
    messagingSenderId: "394202333407",
    appId: "1:394202333407:web:00c9382d8fc51860eda96a",
    measurementId: "G-DF2CN36CNE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const functions = getFunctions(app);
const analytics = getAnalytics(app);