// src/firebase/config.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNHTTeN86yq2sRuNrqnPAikPSZ__GDfP0",
  authDomain: "di-mouras.firebaseapp.com",
  projectId: "di-mouras",
  storageBucket: "di-mouras.firebasestorage.app",
  messagingSenderId: "580329114577",
  appId: "1:580329114577:web:c88100cf805374fd586ef0",
  measurementId: "G-G48GLH9YKL",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
