// ═══════════════════════════════════════════════════════════════════════════
// IngestPanel.jsx — The gateway for AI conversations
//
// Users paste raw AI conversation text, select the source AI,
// and the system extracts atomic thoughts from it.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const C = {
    bg: '#07080C',
    surface: 'rgba(255,255,255,0.02)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.05)',
    accent: '#00E5A0',
    accentDim: 'rgba(0, 229, 160, 0.08)',
    accentBorder: 'rgba(0, 229, 160, 0.15)',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
};

const AI_SOURCES = [
    { key: 'claude',  label: 'Claude',   color: '#D4A574' },
    { key: 'chatgpt', label: 'ChatGPT',  color: '#74AA9C' },
    { key: 'gemini',  label: 'Gemini',   color: '#4285F4' },
    { key: 'copilot', label: 'Copilot',  color: '#6CC644' },
    { key: 'other',   label: 'Other',    color: '#9CA3AF' },
];

export default function IngestPanel({ isOpen, onClose, onIngest, processing }) {
    const [content, setContent] = useState('');
    const [sourceAi, setSourceAi] = useState('claude');
    const [title, setTitle] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 200);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!content.trim() || content.trim().length < 10) return;
        onIngest({
            content: content.trim(),
            source_ai: sourceAi,
            title: title.trim(),
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        if (e.key === 'Escape') onClose?.();
    };

    const charCount = content.length;
    const isReady = content.trim().length >= 10 && !processing;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 400,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.92, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.92, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: '640px',
                            background: 'rgba(12, 13, 18, 0.98)',
                            border: `1px solid ${C.accentBorder}`,
                            borderRadius: '24px',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 120px rgba(0, 229, 160, 0.04)',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* ─── Scrollable Content ─── */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '28px 32px 16px',
                            minHeight: 0,
                        }}>
                            {/* Header */}
                            <div style={{
                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                color: C.accent, letterSpacing: '3px', textTransform: 'uppercase',
                                marginBottom: '6px', opacity: 0.6,
                            }}>
                                Ingest Conversation
                            </div>
                            <div style={{
                                fontFamily: font, fontSize: '18px', fontWeight: 700,
                                color: C.text, letterSpacing: '-0.3px', marginBottom: '20px',
                            }}>
                                Feed your thinking graph
                            </div>

                            {/* Source AI */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                                    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px',
                                }}>Source AI</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {AI_SOURCES.map(s => (
                                        <button
                                            key={s.key}
                                            onClick={() => setSourceAi(s.key)}
                                            style={{
                                                padding: '7px 16px',
                                                borderRadius: '10px',
                                                border: `1px solid ${sourceAi === s.key ? `${s.color}40` : C.border}`,
                                                background: sourceAi === s.key ? `${s.color}12` : 'transparent',
                                                color: sourceAi === s.key ? s.color : C.textMid,
                                                fontFamily: fontMono, fontSize: '12px', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title (optional) */}
                            <div style={{ marginBottom: '14px' }}>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Conversation title (optional)"
                                    style={{
                                        width: '100%', padding: '10px 0',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: `1px solid ${C.border}`,
                                        color: C.text,
                                        fontFamily: font, fontSize: '14px', fontWeight: 500,
                                        outline: 'none',
                                        letterSpacing: '-0.2px',
                                        transition: 'border-color 0.3s',
                                    }}
                                    onFocus={e => e.target.style.borderBottomColor = C.accentBorder}
                                    onBlur={e => e.target.style.borderBottomColor = C.border}
                                />
                            </div>

                            {/* Conversation Content */}
                            <div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                                    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px',
                                    display: 'flex', justifyContent: 'space-between',
                                }}>
                                    <span>Paste Conversation</span>
                                    {charCount > 0 && (
                                        <span style={{ color: C.accent, opacity: 0.5 }}>
                                            {charCount.toLocaleString()} chars
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Paste your AI conversation here...&#10;&#10;Include both your messages and the AI's responses.&#10;The system will extract the thoughts and insights."
                                    style={{
                                        width: '100%', height: '180px',
                                        padding: '14px',
                                        borderRadius: '14px',
                                        background: C.surface,
                                        border: `1px solid ${content.trim().length > 10 ? C.accentBorder : C.border}`,
                                        color: C.text,
                                        fontFamily: fontMono, fontSize: '13px',
                                        lineHeight: '1.6',
                                        outline: 'none',
                                        resize: 'vertical',
                                        transition: 'border-color 0.3s',
                                    }}
                                />
                            </div>
                        </div>

                        {/* ─── Fixed Footer (always visible) ─── */}
                        <div style={{
                            flexShrink: 0,
                            padding: '0 32px 24px',
                        }}>
                            {/* Info */}
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: C.accentDim,
                                border: `1px solid ${C.accentBorder}`,
                                marginBottom: '16px',
                            }}>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '11px',
                                    color: C.textMid, lineHeight: '1.6',
                                }}>
                                    Engram will extract <strong style={{ color: C.accent }}>atomic thoughts</strong> — not conversation summaries.
                                    Each thought becomes a living node that grows as you feed it more conversations.
                                </div>
                            </div>

                            {/* ─── ⌘+Enter hint + Actions ─── */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{
                                    fontFamily: fontMono, fontSize: '10px',
                                    color: C.textDim, letterSpacing: '0.3px',
                                }}>
                                    ⌘+Enter to extract
                                </span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={onClose}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px',
                                            border: `1px solid ${C.border}`,
                                            background: 'transparent', color: C.textMid,
                                            fontFamily: fontMono, fontSize: '12px', fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >Cancel</button>
                                    <motion.button
                                        onClick={handleSubmit}
                                        disabled={!isReady}
                                        whileHover={{ scale: isReady ? 1.03 : 1 }}
                                        whileTap={{ scale: isReady ? 0.97 : 1 }}
                                        style={{
                                            padding: '10px 24px', borderRadius: '10px',
                                            border: 'none',
                                            background: isReady
                                                ? 'linear-gradient(135deg, #00E5A0, #3DD6F5)'
                                                : 'rgba(255,255,255,0.03)',
                                            color: isReady ? '#050508' : C.textDim,
                                            fontFamily: fontMono, fontSize: '12px', fontWeight: 700,
                                            cursor: isReady ? 'pointer' : 'not-allowed',
                                            letterSpacing: '0.3px',
                                            boxShadow: isReady ? '0 4px 20px rgba(0, 229, 160, 0.2)' : 'none',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                        }}
                                    >
                                        {processing ? (
                                            <>
                                                <motion.span
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                    style={{ display: 'inline-block' }}
                                                >⟳</motion.span>
                                                Extracting thoughts...
                                            </>
                                        ) : (
                                            '◆ Extract Thoughts'
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
