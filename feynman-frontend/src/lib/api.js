// ─── Authenticated Axios Instance ───────────────────────────────────────────
// Automatically attaches the Firebase ID token to every request.

import axios from 'axios';
import { auth } from '../lib/firebase';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API,
});

// Attach Firebase token to every request
api.interceptors.request.use(async (config) => {
    try {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (err) {
        console.warn('Could not get auth token:', err.message);
    }
    return config;
});

export default api;
