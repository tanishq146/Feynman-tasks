// ═══════════════════════════════════════════════════════════════════════════
// ThoughtSidebar.jsx — Detail view for a selected thought node
//
// Shows: title, essence, maturity, tags, connected thoughts,
// evolution timeline (from history snapshots).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const C = {
    accent: '#00E5A0',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
    textGhost: 'rgba(232,240,248,0.08)',
    border: 'rgba(255,255,255,0.05)',
    surface: 'rgba(255,255,255,0.02)',
};

const DOMAIN_COLORS = {
    philosophy: '#A78BFA', science: '#34D399', technology: '#3DD6F5',
    psychology: '#F472B6', health: '#10B981', creativity: '#FBBF24',
    career: '#F59E0B', relationships: '#EC4899', finance: '#6EE7B7',
    history: '#C4B5FD', mathematics: '#60A5FA', language: '#818CF8',
    art: '#FB923C', music: '#E879F9', general: '#00E5A0',
};

const MATURITY_META = {
    seed:      { label: 'Seed',      color: '#6B7280', icon: '○', desc: 'Just planted. First encounter.' },
    sprouting: { label: 'Sprouting', color: '#34D399', icon: '◐', desc: 'Growing. Multiple sources feeding it.' },
    growing:   { label: 'Growing',   color: '#FBBF24', icon: '◑', desc: 'Deepening. Connections forming.' },
    mature:    { label: 'Mature',    color: '#3DD6F5', icon: '●', desc: 'Rich understanding. Well-connected.' },
    evolved:   { label: 'Evolved',   color: '#A78BFA', icon: '◆', desc: 'Expert-level. Core to your thinking.' },
};

const LINK_TYPES = {
    builds_on: { label: 'Builds on', color: '#34D399' },
    contradicts: { label: 'Contradicts', color: '#EF4444' },
    extends: { label: 'Extends', color: '#3DD6F5' },
    requires: { label: 'Requires', color: '#FBBF24' },
    exemplifies: { label: 'Exemplifies', color: '#A78BFA' },
    generalizes: { label: 'Generalizes', color: '#60A5FA' },
    questions: { label: 'Questions', color: '#F472B6' },
    resolves: { label: 'Resolves', color: '#10B981' },
};


export default function ThoughtSidebar({ thoughtId, onClose, onDelete, isMobile }) {
    const [thought, setThought] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchThought = useCallback(async () => {
        if (!thoughtId) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/engram/thought/${thoughtId}`);
            setThought(res.data);
        } catch (err) {
            console.error('Failed to fetch thought:', err);
        }
        setLoading(false);
    }, [thoughtId]);

    useEffect(() => { fetchThought(); }, [fetchThought]);

    if (!thoughtId) return null;

    const mat = MATURITY_META[thought?.maturity] || MATURITY_META.seed;
    const domainColor = DOMAIN_COLORS[thought?.domain] || DOMAIN_COLORS.general;

    return (
        <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
                position: isMobile ? 'fixed' : 'absolute',
                ...(isMobile
                    ? { inset: 0, zIndex: 50 }
                    : { top: 0, right: 0, bottom: 0, width: '380px', zIndex: 50 }
                ),
                background: '#08090E',
                borderLeft: isMobile ? 'none' : `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: '10px',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none', border: 'none',
                        color: C.textMid, fontFamily: fontMono, fontSize: '11px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = C.text}
                    onMouseLeave={e => e.currentTarget.style.color = C.textMid}
                >
                    <span style={{ fontSize: '13px' }}>←</span>
                    <span>{isMobile ? 'Back' : 'Close'}</span>
                </button>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    color: C.accent, letterSpacing: '2px', textTransform: 'uppercase',
                    marginLeft: 'auto', opacity: 0.5,
                }}>Thought Node</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            style={{
                                width: '20px', height: '20px', margin: '0 auto 12px',
                                border: `2px solid rgba(0,229,160,0.1)`,
                                borderTop: `2px solid ${C.accent}`, borderRadius: '50%',
                            }}
                        />
                        <div style={{
                            fontFamily: fontMono, fontSize: '10px',
                            color: C.textDim, letterSpacing: '1.5px',
                        }}>Loading thought...</div>
                    </div>
                ) : thought ? (
                    <>
                        {/* Domain + Maturity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{
                                padding: '3px 10px', borderRadius: '6px',
                                background: `${domainColor}12`,
                                border: `1px solid ${domainColor}25`,
                                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                color: domainColor, textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}>{thought.domain}</span>
                            <span style={{
                                padding: '3px 10px', borderRadius: '6px',
                                background: `${mat.color}12`,
                                border: `1px solid ${mat.color}25`,
                                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                color: mat.color,
                                display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                                <span>{mat.icon}</span>
                                {mat.label}
                            </span>
                        </div>

                        {/* Title */}
                        <h2 style={{
                            fontFamily: font, fontSize: '20px', fontWeight: 700,
                            color: C.text, letterSpacing: '-0.3px',
                            marginBottom: '12px', lineHeight: '1.3',
                        }}>{thought.title}</h2>

                        {/* Essence */}
                        <div style={{
                            fontFamily: fontMono, fontSize: '13px', lineHeight: '1.65',
                            color: C.textMid, marginBottom: '20px',
                            padding: '14px',
                            borderRadius: '12px',
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                        }}>
                            {thought.essence}
                        </div>

                        {/* Tags */}
                        {thought.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {thought.tags.map((tag, i) => (
                                    <span key={i} style={{
                                        padding: '3px 10px', borderRadius: '20px',
                                        background: 'rgba(0,229,160,0.06)',
                                        border: '1px solid rgba(0,229,160,0.1)',
                                        fontFamily: fontMono, fontSize: '10px',
                                        color: C.accent, opacity: 0.7,
                                    }}>{tag}</span>
                                ))}
                            </div>
                        )}

                        {/* Connected Thoughts */}
                        {thought.links?.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                    marginBottom: '10px',
                                }}>Connections</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {thought.links.map((link, i) => {
                                        const lt = LINK_TYPES[link.link_type] || LINK_TYPES.extends;
                                        return (
                                            <div key={i} style={{
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                background: C.surface,
                                                border: `1px solid ${C.border}`,
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                            }}>
                                                <div style={{
                                                    width: '4px', height: '20px', borderRadius: '2px',
                                                    background: lt.color, opacity: 0.6,
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontFamily: font, fontSize: '12px', fontWeight: 600,
                                                        color: C.text, overflow: 'hidden',
                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>{link.connected_title}</div>
                                                    <div style={{
                                                        fontFamily: fontMono, fontSize: '9px',
                                                        color: lt.color, opacity: 0.7,
                                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    }}>{lt.label}</div>
                                                </div>
                                                {link.reason && (
                                                    <div style={{
                                                        fontFamily: fontMono, fontSize: '9px',
                                                        color: C.textDim, maxWidth: '120px',
                                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>{link.reason}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Evolution Timeline */}
                        {thought.history?.length > 0 && (
                            <div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                    marginBottom: '10px',
                                }}>Evolution</div>
                                <div style={{ position: 'relative', paddingLeft: '16px' }}>
                                    {/* Timeline bar */}
                                    <div style={{
                                        position: 'absolute', left: '3px', top: '6px', bottom: '6px',
                                        width: '2px', background: `linear-gradient(to bottom, ${C.accent}40, ${C.accent}08)`,
                                        borderRadius: '1px',
                                    }} />

                                    {thought.history.map((h, i) => {
                                        const date = new Date(h.recorded_at);
                                        const sophPct = Math.round((h.sophistication || 0) * 100);
                                        return (
                                            <div key={i} style={{
                                                padding: '8px 0 12px 12px',
                                                position: 'relative',
                                            }}>
                                                {/* Timeline dot */}
                                                <div style={{
                                                    position: 'absolute', left: '-2.5px', top: '12px',
                                                    width: '7px', height: '7px', borderRadius: '50%',
                                                    background: C.accent,
                                                    boxShadow: `0 0 6px ${C.accent}40`,
                                                    opacity: 0.5 + (h.sophistication || 0) * 0.5,
                                                }} />
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '9px',
                                                    color: C.textDim, marginBottom: '3px',
                                                    display: 'flex', gap: '8px', alignItems: 'center',
                                                }}>
                                                    <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                    <span style={{
                                                        color: C.accent, opacity: 0.6,
                                                    }}>Depth: {sophPct}%</span>
                                                </div>
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '11px',
                                                    color: C.textMid, lineHeight: '1.5',
                                                }}>
                                                    {h.delta_note || h.snapshot?.slice(0, 100)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Delete thought */}
                        {onDelete && (
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Remove this thought from your graph?')) {
                                            onDelete(thoughtId);
                                        }
                                    }}
                                    style={{
                                        width: '100%', padding: '10px',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                        background: 'rgba(239,68,68,0.04)',
                                        color: 'rgba(239,68,68,0.6)',
                                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                        e.currentTarget.style.color = '#EF4444';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(239,68,68,0.04)';
                                        e.currentTarget.style.color = 'rgba(239,68,68,0.6)';
                                    }}
                                >Remove Thought</button>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{
                        textAlign: 'center', padding: '40px 0',
                        fontFamily: fontMono, fontSize: '11px', color: C.textDim,
                    }}>Thought not found</div>
                )}
            </div>
        </motion.div>
    );
}
