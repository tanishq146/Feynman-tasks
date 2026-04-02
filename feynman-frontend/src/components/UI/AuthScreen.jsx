// ─── Auth Screen ───────────────────────────────────────────────────────────
// Beautiful login/signup screen matching Feynman's aesthetic.
// Replaces the PasswordGate component when Firebase auth is enabled.

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';

const RANDOM_FACTS = [
    "Your brain generates about 70,000 thoughts per day.",
    "Neurons can transmit signals at speeds up to 268 mph.",
    "The human brain can store approximately 2.5 petabytes of data.",
    "Reading rewires your brain — literally creating new neural pathways.",
    "Your brain uses 20% of your body's total energy.",
    "Spaced repetition can increase long-term retention by up to 200%.",
    "Teaching others is one of the most effective ways to learn — the Feynman Technique.",
    "The brain's neural network has more connections than stars in the Milky Way.",
];

const smoothSpring = { type: 'spring', stiffness: 80, damping: 20, mass: 0.8 };
const gentleSpring = { type: 'spring', stiffness: 50, damping: 25, mass: 1 };

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.2 },
    },
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { ...gentleSpring } },
};

export default function AuthScreen() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const { isMobile, isTouchDevice } = useResponsive();
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const emailRef = useRef(null);

    // Precompute particle positions
    // Fewer particles on mobile for performance
    const particleCount = isMobile ? 15 : 35;
    const particles = useMemo(() =>
        Array.from({ length: particleCount }).map((_, i) => ({
            x: Math.random() * 100,
            y: 20 + Math.random() * 70,
            size: 1 + Math.random() * 2,
            duration: 5 + Math.random() * 6,
            delay: Math.random() * 5,
            drift: 30 + Math.random() * 50,
            xDrift: (Math.random() - 0.5) * 20,
            isPurple: i % 6 === 0,
        })),
        [particleCount]);

    const particleCSS = useMemo(() => `
    @keyframes floatParticle {
      0% { transform: translate(0, 0); opacity: 0; }
      15% { opacity: var(--peak-opacity, 0.5); }
      85% { opacity: var(--peak-opacity, 0.5); }
      100% { transform: translate(var(--x-drift), calc(-1 * var(--drift))); opacity: 0; }
    }
  `, []);

    useEffect(() => {
        emailRef.current?.focus();
    }, [mode]);

    const clearError = () => setError('');

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'signup') {
                await signUpWithEmail(email, password, name);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err) {
            const msg = err.code === 'auth/user-not-found' ? 'No account found with this email'
                : err.code === 'auth/wrong-password' ? 'Incorrect password'
                    : err.code === 'auth/email-already-in-use' ? 'Email already registered'
                        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
                            : err.code === 'auth/invalid-email' ? 'Invalid email address'
                                : 'Something went wrong. Try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError('Google sign-in failed. Try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '13px 16px',
        border: 'none',
        background: 'transparent',
        color: '#e8f4fd',
        fontSize: '14px',
        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        letterSpacing: '0.5px',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const inputWrapperStyle = {
        borderRadius: '12px',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        background: 'rgba(10, 22, 40, 0.6)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease',
    };

    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#020408',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            <style>{particleCSS}</style>

            {/* ─── Floating Particles ─────────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {particles.map((p, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            borderRadius: '50%',
                            background: p.isPurple ? '#7c3aed' : '#00d4ff',
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            '--drift': `${p.drift}px`,
                            '--x-drift': `${p.xDrift}px`,
                            '--peak-opacity': '0.45',
                            animation: `floatParticle ${p.duration}s ${p.delay}s ease-in-out infinite`,
                            willChange: 'transform, opacity',
                        }}
                    />
                ))}
            </div>

            {/* ─── Ambient Glow ────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
                style={{
                    position: 'absolute',
                    width: isMobile ? '300px' : '500px',
                    height: isMobile ? '300px' : '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, rgba(124, 58, 237, 0.03) 40%, transparent 70%)',
                    filter: isMobile ? 'blur(20px)' : 'blur(40px)',
                    pointerEvents: 'none',
                }}
            />

            {/* ─── Orbital Rings ───────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{
                    opacity: { duration: 1.5 },
                    scale: { duration: 1.5 },
                    rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
                }}
                style={{
                    position: 'absolute', width: isMobile ? '200px' : '300px', height: isMobile ? '200px' : '300px', borderRadius: '50%',
                    border: '1px solid rgba(0, 212, 255, 0.06)', pointerEvents: 'none',
                }}
            />

            {/* ─── Brand Title ─────────────────────────────────────── */}
            <motion.div
                variants={fadeUp}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: isMobile ? '6px' : '10px', marginBottom: isMobile ? '24px' : '36px', zIndex: 2,
                }}
            >
                <h1
                    style={{
                        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        fontSize: isMobile ? '22px' : '28px', fontWeight: 700, letterSpacing: isMobile ? '4px' : '6px', textTransform: 'uppercase',
                        background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0,
                    }}
                >
                    Feynman
                </h1>
                <p style={{
                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                    fontSize: '13px', color: '#4a9eba', letterSpacing: '2px', margin: 0,
                }}>
                    Your Second Brain
                </p>
            </motion.div>

            {/* ─── Auth Form ───────────────────────────────────────── */}
            <motion.div
                variants={fadeUp}
                style={{
                    width: '340px', maxWidth: '90vw', zIndex: 2,
                    display: 'flex', flexDirection: 'column', gap: '16px',
                }}
            >
                {/* Google Sign-In Button */}
                <motion.button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: '100%', padding: '13px', borderRadius: '12px',
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                        background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(20px)',
                        color: '#e8f4fd', fontSize: '14px', cursor: 'pointer',
                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        letterSpacing: '0.5px',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </motion.button>

                {/* Divider */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0, 212, 255, 0.1)' }} />
                    <span style={{ fontSize: '11px', color: '#4a9eba', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        or
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0, 212, 255, 0.1)' }} />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence mode="wait">
                        {mode === 'signup' && (
                            <motion.div
                                key="name-field"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={inputWrapperStyle}>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); clearError(); }}
                                        placeholder="Your name"
                                        style={inputStyle}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={inputWrapperStyle}>
                        <input
                            ref={emailRef}
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); clearError(); }}
                            placeholder="Email"
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputWrapperStyle}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); clearError(); }}
                            placeholder="Password"
                            style={inputStyle}
                        />
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    fontSize: '12px', color: '#ff2d55', letterSpacing: '0.5px',
                                    margin: 0, textAlign: 'center',
                                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                }}
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(124, 58, 237, 0.15))',
                            color: '#00d4ff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            letterSpacing: '1px', textTransform: 'uppercase',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </motion.button>
                </form>

                {/* Toggle Login/Signup */}
                <motion.p
                    style={{
                        fontSize: '12px', color: '#4a9eba', textAlign: 'center',
                        margin: 0, fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                    }}
                >
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <span
                        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); clearError(); }}
                        style={{
                            color: '#00d4ff', cursor: 'pointer', textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                        }}
                    >
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </span>
                </motion.p>
            </motion.div>

            {/* ─── Bottom tagline ──────────────────────────────────── */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1.5 }}
                style={{
                    position: 'absolute', bottom: isMobile ? '16px' : '30px',
                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                    fontSize: isMobile ? '10px' : '11px', color: 'rgba(74, 158, 186, 0.4)', letterSpacing: isMobile ? '1px' : '1.5px',
                    padding: isMobile ? '0 16px' : 0, textAlign: 'center',
                }}
            >
                Knowledge that breathes, connects, and evolves
            </motion.p>

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 2, 8, 0.6) 100%)',
            }} />
        </motion.div>
    );
}
