import { useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { ingestKnowledge } from '../../hooks/useBrainData';
import useBrainStore from '../../store/brainStore';

export default function InputBar() {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [ripple, setRipple] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const dragControls = useDragControls();
    const { setIngesting, addToast } = useBrainStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = value.trim();
        if (!text) return;

        setValue('');
        setIngesting(true);
        setRipple(true);
        setTimeout(() => setRipple(false), 800);

        try {
            await ingestKnowledge(text);
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

    return (
        <motion.div
            drag
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
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                width: '100%',
                maxWidth: '600px',
                padding: '0 24px',
            }}
        >
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        position: 'relative',
                        background: 'rgba(2, 8, 20, 0.9)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        border: `1px solid ${focused
                            ? 'rgba(0, 212, 255, 0.35)'
                            : 'rgba(0, 212, 255, 0.12)'
                            }`,
                        boxShadow: isDragging
                            ? '0 12px 50px rgba(0, 212, 255, 0.12), 0 0 0 1px rgba(0, 212, 255, 0.2)'
                            : focused
                                ? '0 0 40px rgba(0, 212, 255, 0.08), inset 0 0 20px rgba(0, 212, 255, 0.03)'
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
                                    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.3), transparent)',
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
                        {/* Drag Handle — grab here to move */}
                        <div
                            onPointerDown={startDrag}
                            style={{
                                padding: '12px 8px 12px 12px',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                color: isDragging ? '#00d4ff' : focused ? '#00d4ff' : '#4a9eba',
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
                            {/* Drag grip icon */}
                            <svg
                                width="10"
                                height="14"
                                viewBox="0 0 10 14"
                                fill="currentColor"
                                style={{
                                    opacity: isDragging ? 1 : 0.5,
                                    transition: 'opacity 0.2s',
                                }}
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
                                        background: 'rgba(0, 212, 255, 0.12)',
                                        border: '1px solid rgba(0, 212, 255, 0.25)',
                                        borderRadius: '10px',
                                        padding: '8px 16px',
                                        color: '#00d4ff',
                                        fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        letterSpacing: '1px',
                                        marginRight: '4px',
                                        flexShrink: 0,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
                                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 212, 255, 0.12)';
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
