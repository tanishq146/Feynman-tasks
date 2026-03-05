import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'feynman';

const RANDOM_FACTS = [
    "Your brain generates about 70,000 thoughts per day.",
    "Neurons can transmit signals at speeds up to 268 mph.",
    "The human brain can store approximately 2.5 petabytes of data.",
    "Reading rewires your brain — literally creating new neural pathways.",
    "Your brain uses 20% of your body's total energy.",
    "A single neuron can connect to up to 10,000 other neurons.",
    "The brain's storage capacity is virtually unlimited.",
    "Dreams are believed to help consolidate memories.",
    "Learning a new skill changes the physical structure of your brain.",
    "The brain can process images in as little as 13 milliseconds.",
    "Spaced repetition can increase long-term retention by up to 200%.",
    "The hippocampus grows larger in people who learn complex spatial tasks.",
    "Sleep deprivation impairs the brain more than alcohol intoxication.",
    "Music activates more areas of the brain than any other stimulus.",
    "Handwriting activates more brain regions than typing.",
    "The brain's neural network has more connections than stars in the Milky Way.",
    "Curiosity enhances memory by priming the brain's reward system.",
    "Your brain physically shrinks when you're stressed for long periods.",
    "Meditation can increase grey matter density in just 8 weeks.",
    "The 'forgetting curve' shows we lose 70% of new info within 24 hours without review.",
    "Teaching others is one of the most effective ways to learn — the Feynman Technique.",
    "Bilingual brains have more grey matter in language-processing areas.",
    "Exercise increases BDNF, a protein that helps grow new brain cells.",
    "The brain can't actually multitask — it rapidly switches between tasks.",
    "Emotional memories are stored more strongly than neutral ones.",
];

// Smooth cubic-bezier easing
const smoothSpring = { type: 'spring', stiffness: 80, damping: 20, mass: 0.8 };
const gentleSpring = { type: 'spring', stiffness: 50, damping: 25, mass: 1 };
const softEase = { duration: 1, ease: [0.25, 0.1, 0.25, 1] };
const fadeEase = { duration: 0.8, ease: [0.4, 0, 0.2, 1] };

// Stagger container
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.3,
        },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { ...gentleSpring } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.4, ease: [0.4, 0, 1, 1] } },
};

export default function PasswordGate({ onUnlock }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [factIndex, setFactIndex] = useState(0);
    const [inputFocused, setInputFocused] = useState(false);
    const inputRef = useRef(null);

    const shuffledFacts = useMemo(() => {
        const arr = [...RANDOM_FACTS];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, []);

    // Precompute particle positions — rendered via pure CSS animations for GPU smoothness
    const particles = useMemo(() =>
        Array.from({ length: 40 }).map((_, i) => ({
            x: Math.random() * 100,
            y: 20 + Math.random() * 70,
            size: 1 + Math.random() * 2,
            duration: 5 + Math.random() * 6,
            delay: Math.random() * 5,
            drift: 30 + Math.random() * 50,
            xDrift: (Math.random() - 0.5) * 20,
            isPurple: i % 6 === 0,
        })),
        []);

    // CSS keyframes injected once — particles animate entirely on GPU
    const particleCSS = useMemo(() => `
        @keyframes floatParticle {
            0% { transform: translate(0, 0); opacity: 0; }
            15% { opacity: var(--peak-opacity, 0.5); }
            85% { opacity: var(--peak-opacity, 0.5); }
            100% { transform: translate(var(--x-drift), calc(-1 * var(--drift))); opacity: 0; }
        }
    `, []);

    useEffect(() => {
        if (sessionStorage.getItem('feynman_auth') === 'true') {
            onUnlock();
        }
        inputRef.current?.focus();
    }, [onUnlock]);

    useEffect(() => {
        if (!unlocking) return;
        const interval = setInterval(() => {
            setFactIndex((prev) => (prev + 1) % shuffledFacts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [unlocking, shuffledFacts]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === CORRECT_PASSWORD) {
            setUnlocking(true);
            sessionStorage.setItem('feynman_auth', 'true');
            setTimeout(() => onUnlock(), 4000);
        } else {
            setError(true);
            setPassword('');
            setTimeout(() => setError(false), 1500);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!unlocking ? (
                <motion.div
                    key="gate"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
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
                    {/* ─── CSS Keyframes for GPU-smooth particles ──── */}
                    <style>{particleCSS}</style>

                    {/* ─── Floating Particles (pure CSS, GPU-composited) ── */}
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

                    {/* ─── Ambient Glow ──────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{
                            position: 'absolute',
                            width: '500px',
                            height: '500px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, rgba(124, 58, 237, 0.03) 40%, transparent 70%)',
                            filter: 'blur(40px)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* ─── Orbital Rings (smooth continuous spin) ──── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1, rotate: 360 }}
                        transition={{
                            opacity: { duration: 1.5, ease: 'easeOut' },
                            scale: { duration: 1.5, ease: 'easeOut' },
                            rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
                        }}
                        style={{
                            position: 'absolute',
                            width: '300px',
                            height: '300px',
                            borderRadius: '50%',
                            border: '1px solid rgba(0, 212, 255, 0.06)',
                            pointerEvents: 'none',
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1, rotate: -360 }}
                        transition={{
                            opacity: { duration: 2, ease: 'easeOut' },
                            scale: { duration: 2, ease: 'easeOut' },
                            rotate: { duration: 45, repeat: Infinity, ease: 'linear' },
                        }}
                        style={{
                            position: 'absolute',
                            width: '400px',
                            height: '400px',
                            borderRadius: '50%',
                            border: '1px solid rgba(124, 58, 237, 0.04)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* ─── Brand Title ───────────────────────────────── */}
                    <motion.div
                        variants={fadeUp}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '48px',
                            zIndex: 2,
                        }}
                    >
                        <h1
                            style={{
                                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontSize: '28px',
                                fontWeight: 700,
                                letterSpacing: '6px',
                                textTransform: 'uppercase',
                                background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0,
                            }}
                        >
                            Feynman
                        </h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
                            style={{
                                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontSize: '13px',
                                color: '#4a9eba',
                                letterSpacing: '2px',
                                margin: 0,
                            }}
                        >
                            Your Second Brain
                        </motion.p>
                    </motion.div>

                    {/* ─── Password Form ──────────────────────────────── */}
                    <motion.form
                        onSubmit={handleSubmit}
                        variants={fadeUp}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            zIndex: 2,
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <motion.div
                                animate={{
                                    boxShadow: inputFocused
                                        ? '0 0 24px rgba(0, 212, 255, 0.12), 0 4px 30px rgba(0, 0, 0, 0.3)'
                                        : error
                                            ? '0 0 24px rgba(255, 45, 85, 0.15)'
                                            : '0 4px 30px rgba(0, 0, 0, 0.3)',
                                    borderColor: error
                                        ? 'rgba(255, 45, 85, 0.5)'
                                        : inputFocused
                                            ? 'rgba(0, 212, 255, 0.4)'
                                            : 'rgba(0, 212, 255, 0.2)',
                                }}
                                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                style={{
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 212, 255, 0.2)',
                                    background: error
                                        ? 'rgba(255, 45, 85, 0.06)'
                                        : 'rgba(10, 22, 40, 0.8)',
                                    backdropFilter: 'blur(20px)',
                                    overflow: 'hidden',
                                }}
                            >
                                <motion.input
                                    ref={inputRef}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    animate={error ? {
                                        x: [0, -10, 10, -7, 7, -3, 3, 0],
                                    } : {}}
                                    transition={error ? {
                                        duration: 0.6,
                                        ease: [0.36, 0.07, 0.19, 0.97],
                                    } : {}}
                                    onFocus={() => setInputFocused(true)}
                                    onBlur={() => setInputFocused(false)}
                                    style={{
                                        width: '280px',
                                        padding: '14px 50px 14px 20px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#e8f4fd',
                                        fontSize: '15px',
                                        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        letterSpacing: '2px',
                                        outline: 'none',
                                    }}
                                />
                            </motion.div>

                            {/* Submit arrow */}
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                animate={{
                                    background: password.length > 0
                                        ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(124, 58, 237, 0.2))'
                                        : 'rgba(255, 255, 255, 0.04)',
                                    color: password.length > 0 ? '#00d4ff' : '#4a9eba',
                                }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                }}
                            >
                                →
                            </motion.button>
                        </div>

                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                    style={{
                                        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        fontSize: '12px',
                                        color: '#ff2d55',
                                        letterSpacing: '1px',
                                        margin: 0,
                                    }}
                                >
                                    Access denied — wrong passphrase
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </motion.form>

                    {/* Bottom tagline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 1.5, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            bottom: '30px',
                            fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontSize: '11px',
                            color: 'rgba(74, 158, 186, 0.4)',
                            letterSpacing: '1.5px',
                        }}
                    >
                        Knowledge that breathes, connects, and evolves
                    </motion.p>

                    {/* Vignette */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 2, 8, 0.6) 100%)',
                        }}
                    />
                </motion.div>
            ) : (
                /* ─── Loading Screen ───────────────────────────── */
                <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
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
                    {/* Radial glow */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            width: '600px',
                            height: '600px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.05) 0%, rgba(124, 58, 237, 0.03) 40%, transparent 70%)',
                            filter: 'blur(50px)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Spinner */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...gentleSpring, delay: 0.2 }}
                        style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '32px' }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                border: '2px solid rgba(0, 212, 255, 0.1)',
                                borderTopColor: '#00d4ff',
                            }}
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            style={{
                                position: 'absolute',
                                inset: '8px',
                                borderRadius: '50%',
                                border: '2px solid rgba(124, 58, 237, 0.1)',
                                borderTopColor: '#7c3aed',
                            }}
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.6, 1, 0.6],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#00d4ff',
                                boxShadow: '0 0 12px rgba(0, 212, 255, 0.5)',
                            }}
                        />
                    </motion.div>

                    {/* Status text */}
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, ...softEase }}
                        style={{
                            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontSize: '14px',
                            color: '#4a9eba',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            marginBottom: '40px',
                        }}
                    >
                        Mapping your mind...
                    </motion.p>

                    {/* Fact card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, ...softEase }}
                        style={{
                            width: '420px',
                            maxWidth: '85vw',
                            textAlign: 'center',
                            position: 'relative',
                            minHeight: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={factIndex}
                                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                style={{
                                    padding: '16px 24px',
                                    borderRadius: '12px',
                                    background: 'rgba(10, 22, 40, 0.5)',
                                    border: '1px solid rgba(0, 212, 255, 0.08)',
                                }}
                            >
                                <p
                                    style={{
                                        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        fontSize: '13px',
                                        lineHeight: '1.6',
                                        color: 'rgba(232, 244, 253, 0.6)',
                                        margin: 0,
                                        fontStyle: 'italic',
                                    }}
                                >
                                    "{shuffledFacts[factIndex]}"
                                </p>
                                <p
                                    style={{
                                        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        fontSize: '10px',
                                        color: 'rgba(0, 212, 255, 0.4)',
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase',
                                        marginTop: '8px',
                                        marginBottom: 0,
                                    }}
                                >
                                    Did you know?
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Vignette */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 2, 8, 0.6) 100%)',
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
