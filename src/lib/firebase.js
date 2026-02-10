import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config - API key is safe to expose publicly
// Security is enforced by Firestore rules, not API key
const firebaseConfig = {
    projectId: "boat-finder-sydney",
    appId: "1:672303900445:web:d8d2e3c06dada1ab1323f4",
    storageBucket: "boat-finder-sydney.firebasestorage.app",
    apiKey: "AIzaSyBx3JzAa_TqFiQp_eJYjWO4DDW9_fMI8Oo",
    authDomain: "boat-finder-sydney.firebaseapp.com",
    messagingSenderId: "672303900445",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
