// ─── Firebase Admin SDK ────────────────────────────────────────────────────
// Initializes Firebase Admin for server-side token verification.
//
// Setup options (choose one):
// 1. Set FIREBASE_SERVICE_ACCOUNT env var with the full JSON string of your
//    service account key (recommended for production / Render).
// 2. Set GOOGLE_APPLICATION_CREDENTIALS env var to the path of a local
//    service account JSON file (for local development).
// 3. If deployed on Google Cloud, default credentials work automatically.

import admin from 'firebase-admin';

let initialized = false;

export function initFirebaseAdmin() {
    if (initialized) return;

    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccount) {
            // Option 1: JSON string from env var
            const parsed = JSON.parse(serviceAccount);
            admin.initializeApp({
                credential: admin.credential.cert(parsed),
            });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Option 2: File path to service account key
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        } else {
            // Option 3: Default credentials (GCP) or no credentials (local dev)
            console.warn('⚠️  No Firebase credentials found — auth middleware will skip verification in development.');
            admin.initializeApp();
        }

        initialized = true;
        console.log('🔐 Firebase Admin initialized');
    } catch (err) {
        console.error('❌ Firebase Admin init failed:', err.message);
    }
}

export { admin };
