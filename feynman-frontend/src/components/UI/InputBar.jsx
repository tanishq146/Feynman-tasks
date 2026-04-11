import { useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { ingestKnowledge } from '../../hooks/useBrainData';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

// ─── Lobe options for the picker ────────────────────────────────────────────
const LOBE_OPTIONS = [
    { value: null, label: 'Auto-detect', icon: '◉', color: '#00d4ff', description: 'AI picks the best lobe' },
    { value: 'prefrontal_cortex', label: 'Frontal', icon: '◈', color: '#7c5ce0', description: 'Goals · Planning · Decisions' },
    { value: 'temporal_lobe', label: 'Temporal', icon: '◇', color: '#e8922a', description: 'Language · Stories · Memory' },
    { value: 'hippocampus', label: 'Parietal', icon: '△', color: '#2abb7f', description: 'Spatial · Math · Logic' },
    { value: 'occipital_lobe', label: 'Occipital', icon: '○', color: '#e05580', description: 'Visual · Patterns · Images' },
    { value: 'cerebellum', label: 'Cerebellum', icon: '□', color: '#20b8c8', description: 'Skills · Habits · Procedures' },
];


export default function InputBar() {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [ripple, setRipple] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showLobePicker, setShowLobePicker] = useState(false);
    const [selectedLobe, setSelectedLobe] = useState(LOBE_OPTIONS[0]);
    const inputRef = useRef(null);
    const dragControls = useDragControls();
    const { setIngesting, addToast } = useBrainStore();
    const { isMobile, isTouchDevice } = useResponsive();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = value.trim();
        if (!text) return;

        setValue('');
        setIngesting(true);
        setRipple(true);
        setShowLobePicker(false);
        setTimeout(() => setRipple(false), 800);

        try {
            await ingestKnowledge(text, selectedLobe.value);
            addToast({
                type: 'success',
                icon: selectedLobe.icon,
                message: `Saved to ${selectedLobe.label}`,
                duration: 3000,
            });
        } catch (err) {
            console.error('Ingest error:', err);
            addToast({
                type: 'danger',
                icon: '✕',
                message: 'Failed to save knowledge',
                duration: 5000,
            });
        } finally {
            setIngesting(false);
        }
    };

    const startDrag = (e) => {
        dragControls.start(e);
    };

    const currentColor = selectedLobe.color;

    return (
        <motion.div
            drag={!isTouchDevice}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={{
                top: -window.innerHeight + 120,
                left: -window.innerWidth / 2 + 40,
                right: window.innerWidth / 2 - 40,
                bottom: 0,
            }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setTimeout(() => setIsDragging(false), 50)}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
                position: 'fixed',
                bottom: isMobile ? '16px' : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                width: '100%',
                maxWidth: isMobile ? '95%' : '600px',
                padding: isMobile ? '0 8px' : '0 24px',
            }}
        >
            {/* ─── Lobe Picker Dropdown ─── */}
            <AnimatePresence>
                {showLobePicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '24px',
                            right: '24px',
                            marginBottom: '8px',
                            background: 'rgba(5, 5, 16, 0.95)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255,255,255,0.1)',
                            padding: '6px',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            padding: '10px 14px 6px',
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.3)',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                        }}>
                            Save to lobe
                        </div>
                        {LOBE_OPTIONS.map((lobe) => (
                            <button
                                key={lobe.label}
                                onClick={() => {
                                    setSelectedLobe(lobe);
                                    setShowLobePicker(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: selectedLobe.label === lobe.label
                                        ? `${lobe.color}15`
                                        : 'transparent',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${lobe.color}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = selectedLobe.label === lobe.label
                                        ? `${lobe.color}15`
                                        : 'transparent';
                                }}
                            >
                                <span style={{
                                    fontSize: '18px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    background: `${lobe.color}15`,
                                    flexShrink: 0,
                                }}>
                                    {lobe.icon}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: lobe.color,
                                        letterSpacing: '0.3px',
                                    }}>
                                        {lobe.label}
                                    </div>
                                    <div style={{
                                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                        fontSize: '10px',
                                        color: 'rgba(255,255,255,0.35)',
                                        letterSpacing: '0.3px',
                                    }}>
                                        {lobe.description}
                                    </div>
                                </div>
                                {selectedLobe.label === lobe.label && (
                                    <span style={{ color: lobe.color, fontSize: '14px' }}>✓</span>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        position: 'relative',
                        background: 'rgba(2, 8, 20, 0.9)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        border: `1px solid ${focused
                            ? `${currentColor}55`
                            : `${currentColor}20`
                            }`,
                        boxShadow: isDragging
                            ? `0 12px 50px ${currentColor}18, 0 0 0 1px ${currentColor}30`
                            : focused
                                ? `0 0 40px ${currentColor}12, inset 0 0 20px ${currentColor}06`
                                : '0 8px 32px rgba(0, 0, 0, 0.4)',
                        transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Ripple animation on submit */}
                    <AnimatePresence>
                        {ripple && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0.4 }}
                                animate={{ scale: 3, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: `radial-gradient(circle, ${currentColor}40, transparent)`,
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '2px 4px' : '4px 8px' }}>
                        {/* Drag Handle — hidden on touch devices */}
                        {!isTouchDevice && (
                        <div
                            onPointerDown={startDrag}
                            style={{
                                padding: '12px 8px 12px 12px',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                color: isDragging ? currentColor : focused ? currentColor : '#4a9eba',
                                fontSize: '16px',
                                transition: 'color 0.3s',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                userSelect: 'none',
                                touchAction: 'none',
                            }}
                            title="Drag to move"
                        >
                            <svg
                                width="10"
                                height="14"
                                viewBox="0 0 10 14"
                                fill="currentColor"
                                style={{ opacity: isDragging ? 1 : 0.5, transition: 'opacity 0.2s' }}
                            >
                                <circle cx="2.5" cy="2" r="1.2" />
                                <circle cx="7.5" cy="2" r="1.2" />
                                <circle cx="2.5" cy="7" r="1.2" />
                                <circle cx="7.5" cy="7" r="1.2" />
                                <circle cx="2.5" cy="12" r="1.2" />
                                <circle cx="7.5" cy="12" r="1.2" />
                            </svg>
                            <span>✦</span>
                        </div>
                        )}
                        {/* Feynman icon for mobile (replaces drag handle) */}
                        {isTouchDevice && (
                            <div style={{ padding: '10px 8px 10px 12px', color: currentColor, fontSize: '16px', flexShrink: 0 }}>
                                <span>✦</span>
                            </div>
                        )}

                        {/* Input */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            placeholder="What did you learn today?"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#e8f4fd',
                                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontSize: '14px',
                                padding: '12px 4px',
                                letterSpacing: '0.3px',
                            }}
                            id="knowledge-input"
                            autoComplete="off"
                        />

                        {/* Lobe Picker Toggle */}
                        <AnimatePresence>
                            {value.trim() && (
                                <motion.button
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    type="button"
                                    onClick={() => setShowLobePicker(!showLobePicker)}
                                    title={`Saving to: ${selectedLobe.label}`}
                                    style={{
                                        background: `${currentColor}12`,
                                        border: `1px solid ${currentColor}30`,
                                        borderRadius: '10px',
                                        padding: '6px 10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        flexShrink: 0,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = `${currentColor}25`;
                                        e.currentTarget.style.boxShadow = `0 0 12px ${currentColor}15`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = `${currentColor}12`;
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <span style={{ fontSize: '14px' }}>{selectedLobe.icon}</span>
                                    {!isMobile && <span style={{
                                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: currentColor,
                                        letterSpacing: '0.5px',
                                    }}>
                                        {selectedLobe.label}
                                    </span>}
                                    <span style={{
                                        fontSize: '8px',
                                        color: currentColor,
                                        opacity: 0.6,
                                        transform: showLobePicker ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                    }}>▲</span>
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Submit button */}
                        <AnimatePresence>
                            {value.trim() && (
                                <motion.button
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    type="submit"
                                    style={{
                                        background: `${currentColor}18`,
                                        border: `1px solid ${currentColor}35`,
                                        borderRadius: '10px',
                                        padding: '8px 16px',
                                        color: currentColor,
                                        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        letterSpacing: '1px',
                                        marginLeft: '6px',
                                        marginRight: '4px',
                                        flexShrink: 0,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = `${currentColor}30`;
                                        e.currentTarget.style.boxShadow = `0 0 15px ${currentColor}18`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = `${currentColor}18`;
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    SAVE
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </form>
        </motion.div>
    );
}
