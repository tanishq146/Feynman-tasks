// ─── Fading Warning Banner ──────────────────────────────────────────────────
// Pulsing banner shown when nodes are losing strength.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

export default function FadingWarning({ onStudyNow }) {
    const nodes = useBrainStore(s => s.nodes);
    const [dismissed, setDismissed] = useState(false);
    const [visible, setVisible] = useState(false);

    const fadingNodes = nodes.filter(n => (n.current_strength || 100) < 60);
    const count = fadingNodes.length;

    useEffect(() => {
        // Recheck when nodes change, but don't re-show if dismissed this session
        if (count > 0 && !dismissed) {
            // Small delay so it doesn't flash on initial load
            const timer = setTimeout(() => setVisible(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [count, dismissed]);

    const handleStudy = () => {
        setVisible(false);
        onStudyNow(fadingNodes.map(n => n.id));
    };

    return (
        <AnimatePresence>
            {visible && count > 0 && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        top: '64px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 80,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 24px',
                        borderRadius: '14px',
                        background: 'rgba(255,68,102,0.08)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,68,102,0.2)',
                        boxShadow: '0 4px 30px rgba(255,68,102,0.15)',
                        maxWidth: '90vw',
                    }}
                >
                    {/* Pulsing dot */}
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: '#ff4466', flexShrink: 0,
                            boxShadow: '0 0 12px rgba(255,68,102,0.6)',
                        }}
                    />

                    {/* Text */}
                    <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#e8c8cc', margin: 0, whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#ff4466' }}>{count} {count === 1 ? 'memory is' : 'memories are'} fading</strong>
                        <span style={{ color: '#9a7a80' }}> — review before they disappear</span>
                    </p>

                    {/* Study Now button */}
                    <button
                        onClick={handleStudy}
                        style={{
                            padding: '6px 16px', borderRadius: '8px',
                            background: 'rgba(255,68,102,0.15)',
                            border: '1px solid rgba(255,68,102,0.3)',
                            color: '#ff4466', fontFamily: fontMono, fontSize: '12px',
                            fontWeight: 700, letterSpacing: '0.5px',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,68,102,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,68,102,0.15)'; }}
                    >
                        Study Now →
                    </button>

                    {/* Dismiss */}
                    <button
                        onClick={() => { setDismissed(true); setVisible(false); }}
                        style={{
                            background: 'none', border: 'none', color: '#9a7a80',
                            fontSize: '14px', cursor: 'pointer', padding: '2px 6px',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e8c8cc'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9a7a80'; }}
                    >
                        ✕
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
