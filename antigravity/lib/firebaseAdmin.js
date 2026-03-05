// ─── Firebase Admin SDK ────────────────────────────────────────────────────

import admin from 'firebase-admin';

let initialized = false;

export function initFirebaseAdmin() {
    if (initialized) return;

    try {
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

        // Debug: log whether the env var exists and its format
        if (serviceAccountRaw) {
            console.log(`🔑 FIREBASE_SERVICE_ACCOUNT found (${serviceAccountRaw.length} chars)`);
            console.log(`🔑 Starts with: "${serviceAccountRaw.substring(0, 15)}..."`);
            console.log(`🔑 Ends with: "...${serviceAccountRaw.substring(serviceAccountRaw.length - 10)}"`);
        } else {
            console.log('🔑 FIREBASE_SERVICE_ACCOUNT is NOT set');
        }

        if (serviceAccountRaw) {
            let parsed;

            // Try parsing directly
            try {
                parsed = JSON.parse(serviceAccountRaw);
                console.log('🔑 JSON parsed successfully (direct)');
            } catch (e1) {
                console.log('🔑 Direct JSON.parse failed:', e1.message);
                // Try fixing escaped newlines
                try {
                    const fixed = serviceAccountRaw.replace(/\\n/g, '\n');
                    parsed = JSON.parse(fixed);
                    console.log('🔑 JSON parsed after fixing newlines');
                } catch (e2) {
                    console.log('🔑 Fixed newlines parse also failed:', e2.message);
                    // Try stripping surrounding quotes (Render sometimes adds them)
                    try {
                        let stripped = serviceAccountRaw;
                        if (stripped.startsWith('"') && stripped.endsWith('"')) {
                            stripped = stripped.slice(1, -1);
                        }
                        if (stripped.startsWith("'") && stripped.endsWith("'")) {
                            stripped = stripped.slice(1, -1);
                        }
                        stripped = stripped.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                        parsed = JSON.parse(stripped);
                        console.log('🔑 JSON parsed after stripping quotes + fixing escapes');
                    } catch (e3) {
                        console.error('🔑 All parsing attempts failed:', e3.message);
                        throw e3;
                    }
                }
            }

            // Fix private_key newlines (very common issue)
            if (parsed.private_key) {
                parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
            }

            console.log(`🔑 Service account project: ${parsed.project_id}`);
            console.log(`🔑 Service account email: ${parsed.client_email}`);

            admin.initializeApp({
                credential: admin.credential.cert(parsed),
            });
            console.log('🔐 Firebase Admin initialized with service account ✓');
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log('🔐 Firebase Admin initialized with default credentials');
        } else {
            console.warn('⚠️  No Firebase credentials found — auth will skip verification in dev.');
            admin.initializeApp();
        }

        initialized = true;
    } catch (err) {
        console.error('❌ Firebase Admin init FAILED:', err.message);
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        initialized = true;
    }
}

export { admin };
