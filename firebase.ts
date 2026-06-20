// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBpCUw_agGo9NJcCv82tjQOP1sW1nn7UBM",
    authDomain: "arshcorp-97b15.firebaseapp.com",
    projectId: "arshcorp-97b15",
    storageBucket: "arshcorp-97b15.firebasestorage.app",
    messagingSenderId: "860321634172",
    appId: "1:860321634172:web:05d24ee4112391bcbc76f9",
    measurementId: "G-J2MMV09NN0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);