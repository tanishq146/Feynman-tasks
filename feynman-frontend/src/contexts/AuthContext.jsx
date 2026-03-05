// ─── Auth Context ──────────────────────────────────────────────────────────
// Provides Firebase auth state to the entire app.
// Wraps the app in <AuthProvider> and use the useAuth() hook anywhere.

import { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // ─── Auth Methods ─────────────────────────────────────────

    const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

    const signInWithEmail = (email, password) =>
        signInWithEmailAndPassword(auth, email, password);

    const signUpWithEmail = async (email, password, displayName) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(result.user, { displayName });
        }
        return result;
    };

    const signOut = () => firebaseSignOut(auth);

    // Helper: get the current user's ID token (for backend API calls)
    const getToken = async () => {
        if (!auth.currentUser) return null;
        return auth.currentUser.getIdToken();
    };

    const value = {
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        getToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
