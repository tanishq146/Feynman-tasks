// ═══════════════════════════════════════════════════════════════════════════
// MindMirror — Journal into your subconscious
// A full-screen journaling interface that maps consciousness.
// Two modes: Conscious (light introspection) and Subconscious (deep, fluid).
//
// Phase 1: Raw journaling + persistence. No AI extraction yet.
// Phase 2 will slot in: entity extraction → mind_nodes graph building.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

// ─── Mode Configuration ─────────────────────────────────────────────────────
const MODES = {
    conscious: {
        label: 'Conscious',
        description: 'Structured reflection',
        icon: '☀️',
        accent: '#00d4ff',
        accentDim: 'rgba(0, 212, 255, 0.08)',
        accentBorder: 'rgba(0, 212, 255, 0.12)',
        bg: 'rgba(2, 8, 20, 0.98)',
        placeholder: 'What are you thinking about right now?\n\nWrite freely — structure your thoughts, reflect on your day, or work through a problem.',
        textColor: 'rgba(232, 244, 253, 0.85)',
    },
    subconscious: {
        label: 'Subconscious',
        description: 'Free-flowing thought',
        icon: '🌙',
        accent: '#8b5cf6',
        accentDim: 'rgba(139, 92, 246, 0.08)',
        accentBorder: 'rgba(139, 92, 246, 0.12)',
        bg: 'rgba(2, 4, 12, 0.99)',
        placeholder: 'Let your mind wander...\n\nDon\'t filter. Don\'t edit. Write whatever surfaces — fears, desires, contradictions, fragments of thought.',
        textColor: 'rgba(200, 180, 255, 0.8)',
    },
};

// ─── Time Formatting ─────────────────────────────────────────────────────────
function formatTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Journal Entry Card ──────────────────────────────────────────────────────
function JournalEntry({ entry, onDelete }) {
    const mode = MODES[entry.mode] || MODES.conscious;
    const [expanded, setExpanded] = useState(false);
    const preview = entry.content.length > 180 ? entry.content.slice(0, 180) + '…' : entry.content;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
                padding: '16px 20px',
                borderRadius: '14px',
                background: mode.accentDim,
                border: `1px solid ${mode.accentBorder}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${mode.accent}33`;
                e.currentTarget.style.boxShadow = `0 2px 20px ${mode.accent}0a`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = mode.accentBorder;
                e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => setExpanded(!expanded)}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px' }}>{mode.icon}</span>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    color: mode.accent, letterSpacing: '1.5px', textTransform: 'uppercase',
                    opacity: 0.7,
                }}>
                    {mode.label}
                </span>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px',
                    color: 'rgba(232, 244, 253, 0.2)', marginLeft: 'auto',
                }}>
                    {entry.word_count} words
                </span>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px',
                    color: 'rgba(232, 244, 253, 0.2)',
                }}>
                    {formatTimeAgo(entry.created_at)}
                </span>
                {/* Delete button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(244, 63, 94, 0.25)', fontSize: '11px',
                        padding: '2px 4px', transition: 'color 0.15s',
                        display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(244, 63, 94, 0.25)'}
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div style={{
                fontFamily: fontMono, fontSize: '13px', lineHeight: '1.7',
                color: 'rgba(232, 244, 253, 0.6)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
                {expanded ? entry.content : preview}
            </div>

            {entry.content.length > 180 && (
                <div style={{
                    fontFamily: fontMono, fontSize: '10px', marginTop: '6px',
                    color: mode.accent, opacity: 0.5,
                }}>
                    {expanded ? '↑ collapse' : '↓ expand'}
                </div>
            )}
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// MindMirror — Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function MindMirror({ isOpen, onClose }) {
    const [mode, setMode] = useState('conscious');
    const [content, setContent] = useState('');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const textareaRef = useRef(null);

    const { isMobile } = useResponsive();
    const addToast = useBrainStore(s => s.addToast);

    const modeConfig = MODES[mode];
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // ─── Fetch entries on open ──────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        fetchEntries();
    }, [isOpen]);

    // Auto-focus textarea when opening
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            setTimeout(() => textareaRef.current?.focus(), 300);
        }
    }, [isOpen, mode]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/mindmirror/journal');
            setEntries(res.data.entries || []);
        } catch (err) {
            console.error('Failed to fetch journal entries:', err);
        }
        setLoading(false);
    };

    // ─── Submit journal entry ──────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!content.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await api.post('/api/mindmirror/journal', {
                content: content.trim(),
                mode,
            });
            const saved = res.data.entry;
            setEntries(prev => [saved, ...prev]);
            setContent('');
            addToast({
                type: 'success',
                icon: '🪞',
                message: `${modeConfig.label} thought captured (${saved.word_count} words)`,
                duration: 3000,
            });
        } catch (err) {
            console.error('Failed to save journal entry:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Failed to save entry', duration: 3000 });
        }
        setSubmitting(false);
    }, [content, mode, submitting, addToast, modeConfig.label]);

    // ─── Delete entry ──────────────────────────────────────────────────
    const handleDelete = async (entryId) => {
        try {
            await api.delete(`/api/mindmirror/journal/${entryId}`);
            setEntries(prev => prev.filter(e => e.id !== entryId));
            addToast({ type: 'success', icon: '✓', message: 'Entry deleted', duration: 2000 });
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    };

    // ─── Keyboard shortcut: Cmd/Ctrl + Enter to submit ─────────────────
    const handleKeyDown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: modeConfig.bg,
            display: 'flex', flexDirection: 'column',
            fontFamily: font,
            transition: 'background 0.5s ease',
            animation: 'mindMirrorFadeIn 0.3s ease',
        }}>
            {/* ═══ TOP BAR ═══════════════════════════════════════════════════ */}
            <div style={{
                padding: isMobile ? '12px 16px' : '16px 32px',
                borderBottom: `1px solid ${modeConfig.accentBorder}`,
                display: 'flex', alignItems: 'center', gap: '16px',
                flexShrink: 0,
            }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🪞</span>
                    <div>
                        <div style={{
                            fontFamily: font, fontSize: '15px', fontWeight: 700,
                            color: '#e8f4fd', letterSpacing: '-0.3px',
                        }}>
                            Mind Mirror
                        </div>
                        <div style={{
                            fontFamily: fontMono, fontSize: '9px',
                            color: 'rgba(232, 244, 253, 0.25)', letterSpacing: '1px',
                        }}>
                            JOURNAL INTO YOUR SUBCONSCIOUS
                        </div>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div style={{
                    display: 'flex', gap: '2px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '10px', padding: '3px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    marginLeft: 'auto',
                }}>
                    {Object.entries(MODES).map(([key, m]) => (
                        <button
                            key={key}
                            onClick={() => setMode(key)}
                            style={{
                                padding: isMobile ? '6px 12px' : '7px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: mode === key
                                    ? `linear-gradient(135deg, ${m.accentDim}, ${m.accent}12)`
                                    : 'transparent',
                                color: mode === key ? m.accent : 'rgba(232, 244, 253, 0.35)',
                                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.25s',
                                letterSpacing: '0.5px',
                                boxShadow: mode === key ? `0 0 12px ${m.accent}15` : 'none',
                            }}
                        >
                            <span style={{ marginRight: '6px' }}>{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px', width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(232, 244, 253, 0.4)', fontSize: '12px', cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    ✕
                </button>
            </div>

            {/* ═══ MAIN CONTENT ════════════════════════════════════════════ */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                maxWidth: '800px', width: '100%', margin: '0 auto',
                padding: isMobile ? '16px' : '32px 40px',
                overflow: 'hidden',
            }}>
                {/* ─── Writing Area ────────────────────────────────────────── */}
                <div style={{
                    flexShrink: 0,
                    marginBottom: '24px',
                }}>
                    {/* Mode indicator */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '12px',
                    }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: modeConfig.accent,
                            boxShadow: `0 0 8px ${modeConfig.accent}60`,
                        }} />
                        <span style={{
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                            color: modeConfig.accent, letterSpacing: '1.5px',
                            textTransform: 'uppercase', opacity: 0.6,
                        }}>
                            {modeConfig.description}
                        </span>
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={modeConfig.placeholder}
                        style={{
                            width: '100%',
                            minHeight: isMobile ? '150px' : '200px',
                            maxHeight: '40vh',
                            padding: '20px 24px',
                            background: modeConfig.accentDim,
                            border: `1px solid ${modeConfig.accentBorder}`,
                            borderRadius: '16px',
                            color: modeConfig.textColor,
                            fontFamily: mode === 'subconscious'
                                ? "'Georgia', 'Times New Roman', serif"
                                : `${fontMono}`,
                            fontSize: mode === 'subconscious' ? '16px' : '14px',
                            lineHeight: mode === 'subconscious' ? '1.9' : '1.75',
                            letterSpacing: mode === 'subconscious' ? '0.3px' : '0.1px',
                            resize: 'vertical',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxSizing: 'border-box',
                        }}
                        onFocus={e => {
                            e.currentTarget.style.borderColor = `${modeConfig.accent}40`;
                            e.currentTarget.style.boxShadow = `0 0 24px ${modeConfig.accent}08`;
                        }}
                        onBlur={e => {
                            e.currentTarget.style.borderColor = modeConfig.accentBorder;
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />

                    {/* Footer: word count + submit */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: '10px', padding: '0 4px',
                    }}>
                        <span style={{
                            fontFamily: fontMono, fontSize: '10px',
                            color: 'rgba(232, 244, 253, 0.2)',
                        }}>
                            {wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? 's' : ''}` : ''}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                fontFamily: fontMono, fontSize: '9px',
                                color: 'rgba(232, 244, 253, 0.15)',
                            }}>
                                {isMobile ? 'tap to submit' : '⌘ + Enter'}
                            </span>
                            <button
                                onClick={handleSubmit}
                                disabled={!content.trim() || submitting}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: content.trim()
                                        ? `linear-gradient(135deg, ${modeConfig.accent}, ${mode === 'subconscious' ? '#6d28d9' : '#0891b2'})`
                                        : 'rgba(255,255,255,0.03)',
                                    color: content.trim() ? '#fff' : 'rgba(232, 244, 253, 0.2)',
                                    fontFamily: font, fontSize: '12px', fontWeight: 600,
                                    cursor: content.trim() && !submitting ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    letterSpacing: '0.3px',
                                    opacity: submitting ? 0.6 : 1,
                                }}
                            >
                                {submitting ? 'Saving...' : '🪞 Capture'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Past Entries ────────────────────────────────────────── */}
                <div style={{
                    flex: 1, minHeight: 0, overflowY: 'auto',
                    paddingRight: '4px',
                }}>
                    {/* Section header */}
                    {entries.length > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            marginBottom: '14px', padding: '0 2px',
                        }}>
                            <div style={{
                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                color: 'rgba(232, 244, 253, 0.2)', letterSpacing: '2px',
                                textTransform: 'uppercase',
                            }}>
                                Past Entries
                            </div>
                            <div style={{
                                flex: 1, height: '1px',
                                background: 'rgba(255, 255, 255, 0.04)',
                            }} />
                            <div style={{
                                fontFamily: fontMono, fontSize: '9px',
                                color: 'rgba(232, 244, 253, 0.15)',
                            }}>
                                {entries.length}
                            </div>
                        </div>
                    )}

                    {/* Entries list */}
                    {loading ? (
                        <div style={{
                            textAlign: 'center', padding: '60px 0',
                            color: 'rgba(232, 244, 253, 0.2)', fontSize: '12px',
                            fontFamily: fontMono,
                        }}>
                            Loading...
                        </div>
                    ) : entries.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '60px 20px',
                            color: 'rgba(232, 244, 253, 0.15)',
                        }}>
                            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.4 }}>🪞</div>
                            <div style={{
                                fontFamily: font, fontSize: '14px', fontWeight: 500,
                                color: 'rgba(232, 244, 253, 0.25)', marginBottom: '6px',
                            }}>
                                Your mirror is empty
                            </div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '11px',
                                color: 'rgba(232, 244, 253, 0.15)',
                            }}>
                                Start writing above to capture your first thought
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <AnimatePresence>
                                {entries.map(entry => (
                                    <JournalEntry
                                        key={entry.id}
                                        entry={entry}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Subconscious mode ambient effect ────────────────────────── */}
            {mode === 'subconscious' && (
                <div style={{
                    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1,
                    background: 'radial-gradient(ellipse at 50% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 70%)',
                }} />
            )}

            <style>{`
                @keyframes mindMirrorFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
