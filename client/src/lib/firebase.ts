import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
// You can find this in your Firebase console Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyCkl3wqF_0SwBdLQieHu8vXeO79_7zkAy4",
  authDomain: "luneacabs.firebaseapp.com",
  projectId: "luneacabs",
  storageBucket: "luneacabs.appspot.com",
  messagingSenderId: "736709697784",
  appId: "1:736709697784:web:c6a6f80b40a02bda27db0d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
