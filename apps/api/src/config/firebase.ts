import admin from 'firebase-admin';
import { getEnv } from './env.js';

/**
 * Firebase Admin SDK initialization — PRD §9.3
 *
 * Used for verifying Firebase ID tokens on the backend.
 * Credentials come from environment variables, never committed to source.
 */
export function initializeFirebase(): void {
  if (admin.apps.length > 0) return;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = getEnv();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // Private key comes with escaped newlines from env
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  console.log('✅ Firebase Admin initialized');
}

export { admin };
