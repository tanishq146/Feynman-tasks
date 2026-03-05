// ─── Firebase Admin SDK ────────────────────────────────────────────────────
// Initializes Firebase Admin for server-side token verification.
//
// Setup: Set FIREBASE_SERVICE_ACCOUNT env var with the full JSON string
// of your service account key.

import admin from 'firebase-admin';

let initialized = false;

export function initFirebaseAdmin() {
    if (initialized) return;

    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccountRaw) {
            let parsed;
            try {
                parsed = JSON.parse(serviceAccountRaw);
            } catch (parseErr) {
                // Sometimes env vars escape newlines as literal \n — fix them
                const fixed = serviceAccountRaw.replace(/\\n/g, '\n');
                parsed = JSON.parse(fixed);
            }

            // Fix private_key newlines (common Render issue)
            if (parsed.private_key) {
                parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
            }

            admin.initializeApp({
                credential: admin.credential.cert(parsed),
            });
            console.log('🔐 Firebase Admin initialized with service account');
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log('🔐 Firebase Admin initialized with application default credentials');
        } else {
            console.warn('⚠️  No Firebase credentials found — auth middleware will skip verification in development.');
            admin.initializeApp();
        }

        initialized = true;
    } catch (err) {
        console.error('❌ Firebase Admin init failed:', err.message);
        // Still initialize without credentials so the app doesn't crash
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        initialized = true;
    }
}

export { admin };
