// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB0tBhjL5_x_AuPUJ0ZeFxVtcuS82HBtSI",
  authDomain: "online-notepad-6f08e.firebaseapp.com",
  databaseURL: "https://online-notepad-6f08e-default-rtdb.firebaseio.com",
  projectId: "online-notepad-6f08e",
  storageBucket: "online-notepad-6f08e.firebasestorage.app",
  messagingSenderId: "313726545431",
  appId: "1:313726545431:web:0bfffb43d15f9ceb923652",
  measurementId: "G-B1EWGRM6TH"
};

// Initialize Firebase app and the realtime database/analytics
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);  

export { database, ref, set, onValue }; //exports the necessary fns and the database 