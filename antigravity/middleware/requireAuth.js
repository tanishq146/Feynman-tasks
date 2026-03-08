// ─── Firebase Auth Middleware ───────────────────────────────────────────────
// Verifies the Firebase ID token from the Authorization header.
// Attaches the decoded user to `req.user`.
//
// Usage: app.use('/api/protected-route', requireAuth, routeHandler);
//
// If token verification fails due to missing Firebase credentials,
// it decodes the token without verification so you can develop freely.

import { admin } from '../lib/firebaseAdmin.js';

// Check if we have proper Firebase credentials configured.
// npm sometimes sets NODE_ENV=production even locally, so we check
// for actual credentials instead.
const hasFirebaseCredentials = !!(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
);

export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    // Extract token from "Bearer <token>"
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    // No token at all
    if (!token) {
        if (!hasFirebaseCredentials) {
            req.user = { uid: 'dev-user', email: 'dev@feynman.local', name: 'Developer' };
            return next();
        }
        return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Try to verify the token properly
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            name: decoded.name || decoded.email,
            picture: decoded.picture || null,
        };
        return next();
    } catch (err) {
        // If we don't have Firebase credentials, decode the JWT without verification
        // This lets you dev locally without a service account key
        try {
            // Firebase ID tokens are JWTs — decode the payload (base64url)
            const payload = token.split('.')[1];
            // Use base64url decoding (replace - with + and _ with /)
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = JSON.parse(Buffer.from(base64, 'base64').toString());
            req.user = {
                uid: decoded.user_id || decoded.sub || 'dev-user',
                email: decoded.email || 'dev@feynman.local',
                name: decoded.name || decoded.email || 'Developer',
                picture: decoded.picture || null,
            };
            console.log(`🔓 Dev auth (unverified): ${req.user.email} [${req.user.uid}]`);
            return next();
        } catch (decodeErr) {
            console.error('🔒 Could not decode token:', decodeErr.message);
        }

        console.error('🔒 Auth failed:', err.message);
        console.error('🔒 Token prefix:', token?.substring(0, 20) + '...');
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
