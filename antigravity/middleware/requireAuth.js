// ─── Firebase Auth Middleware ───────────────────────────────────────────────
// Verifies the Firebase ID token from the Authorization header.
// Attaches the decoded user to `req.user`.
//
// Usage: app.use('/api/protected-route', requireAuth, routeHandler);
//
// In development (NODE_ENV !== 'production'), if token verification fails
// due to missing Firebase credentials, it decodes the token without
// verification so you can develop freely.

import { admin } from '../lib/firebaseAdmin.js';

export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    // Extract token from "Bearer <token>"
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    // No token at all
    if (!token) {
        if (process.env.NODE_ENV !== 'production') {
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
        // In development, decode the JWT payload without verification
        // This lets you dev locally without a service account key
        if (process.env.NODE_ENV !== 'production') {
            try {
                // Firebase ID tokens are JWTs — decode the payload (base64)
                const payload = token.split('.')[1];
                const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
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
        }

        console.error('🔒 Auth failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
