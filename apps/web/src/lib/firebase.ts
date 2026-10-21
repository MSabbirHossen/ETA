import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton pattern for Next.js SSR / Fast Refresh)
function getFirebaseInstances(): { app: FirebaseApp | null; auth: Auth | null } {
  try {
    if (getApps().length > 0) {
      const existingApp = getApp();
      return { app: existingApp, auth: getAuth(existingApp) };
    }

    if (firebaseConfig.apiKey) {
      const newApp = initializeApp(firebaseConfig);
      return { app: newApp, auth: getAuth(newApp) };
    }
  } catch (err) {
    console.warn('[Firebase] Initialization warning:', err);
  }

  return { app: null, auth: null };
}

const { app, auth } = getFirebaseInstances();

export { app, auth, firebaseConfig };
export default app;
