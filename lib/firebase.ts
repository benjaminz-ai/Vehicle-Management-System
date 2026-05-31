import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDblUYQG2n3V2E7cMesON3GPTtW_FhIfo4",
  authDomain: "vehicle-management-syste-3b7df.firebaseapp.com",
  projectId: "vehicle-management-syste-3b7df",
  storageBucket: "vehicle-management-syste-3b7df.firebasestorage.app",
  messagingSenderId: "109130012059",
  appId: "1:109130012059:web:7b5003d36d93eda8e2fd3e",
  measurementId: "G-NKGJZBCK1K",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);