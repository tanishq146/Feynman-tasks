// ═══════════════════════════════════════════════════════════════════════════
// CompressPanel.jsx — Knowledge Compression Engine
//
// Two modes:
//   1. Compress All — Distill your ENTIRE thinking graph into one pasteable
//      knowledge packet. Copy it, paste it into any AI, and it instantly
//      understands everything you know.
//   2. Quick Compress — Paste a single conversation and get a compressed
//      version back immediately.
//
// Format: FKPV1 (Feynman Knowledge Packet v1)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

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
    purple: '#A78BFA',
    purpleDim: 'rgba(167, 139, 250, 0.08)',
    purpleBorder: 'rgba(167, 139, 250, 0.18)',
    cyan: '#3DD6F5',
    cyanDim: 'rgba(61, 214, 245, 0.08)',
    gold: '#FBBF24',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
    textGhost: 'rgba(232,240,248,0.08)',
    danger: '#EF4444',
};

const AI_SOURCES = [
    { key: 'claude', label: 'Claude', color: '#D4A574' },
    { key: 'chatgpt', label: 'ChatGPT', color: '#74AA9C' },
    { key: 'gemini', label: 'Gemini', color: '#4285F4' },
    { key: 'copilot', label: 'Copilot', color: '#6CC644' },
    { key: 'other', label: 'Other', color: '#9CA3AF' },
];


export default function CompressPanel({ isOpen, onClose, thoughtCount = 0 }) {
    const [mode, setMode] = useState('all'); // 'all' | 'single'
    const [compressing, setCompressing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [copiedBlock, setCopiedBlock] = useState(null);

    // Single mode state
    const [content, setContent] = useState('');
    const [sourceAi, setSourceAi] = useState('claude');

    const resultRef = useRef(null);

    // ─── Compress all thoughts ────────────────────────────────────────
    const handleCompressAll = useCallback(async () => {
        setCompressing(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.post('/api/engram/compress/all', {}, { timeout: 120000 });
            setResult({ type: 'all', data: res.data });
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Compression failed');
        }
        setCompressing(false);
    }, []);

    // ─── Compress single conversation ─────────────────────────────────
    const handleCompressSingle = useCallback(async () => {
        if (!content.trim() || content.trim().length < 20) return;
        setCompressing(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.post('/api/engram/compress/conversation', {
                content: content.trim(),
                source_ai: sourceAi,
            }, { timeout: 60000 });
            setResult({ type: 'single', data: res.data });
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Compression failed');
        }
        setCompressing(false);
    }, [content, sourceAi]);

    // ─── Copy to clipboard ────────────────────────────────────────────
    const copyToClipboard = useCallback(async (text, blockId = 'main') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setCopiedBlock(blockId);
            setTimeout(() => { setCopied(false); setCopiedBlock(null); }, 2500);
        } catch { /* fallback */ }
    }, []);

    // ─── Reset ────────────────────────────────────────────────────────
    const handleReset = () => {
        setResult(null);
        setError(null);
        setCopied(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1002,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.88)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                }}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    style={{
                        width: '100%', maxWidth: '700px',
                        maxHeight: '90vh',
                        background: 'linear-gradient(180deg, rgba(14,16,22,0.99), rgba(8,10,14,0.99))',
                        border: `1px solid ${C.purpleBorder}`,
                        borderRadius: '22px',
                        overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 80px rgba(167, 139, 250, 0.05)',
                    }}
                >
                    {/* ═══ Header ═══════════════════════════════════════════ */}
                    <div style={{
                        padding: '28px 32px 20px',
                        borderBottom: `1px solid ${C.border}`,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '6px',
                        }}>
                            <span style={{ fontSize: '15px', fontFamily: "'SF Mono', monospace", color: C.purple }}>⬢</span>
                            <span style={{
                                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                color: C.purple, letterSpacing: '3px', textTransform: 'uppercase',
                            }}>Knowledge Compression</span>
                        </div>
                        <div style={{
                            fontFamily: font, fontSize: '20px', fontWeight: 700,
                            color: C.text, letterSpacing: '-0.5px',
                        }}>
                            {result ? 'Your Knowledge Packet' : 'Compress for AI Transfer'}
                        </div>
                        <div style={{
                            fontFamily: fontMono, fontSize: '11px', color: C.textMid,
                            marginTop: '4px', lineHeight: '1.5',
                        }}>
                            {result
                                ? 'Copy and paste this into any AI for instant context'
                                : 'Distill knowledge into a token-efficient format any AI can instantly parse'}
                        </div>
                    </div>

                    {/* ═══ Content ══════════════════════════════════════════ */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>

                        {/* ─── Mode Selection (only before results) ─── */}
                        {!result && (
                            <>
                                <div style={{
                                    display: 'flex', gap: '8px', marginBottom: '24px',
                                }}>
                                    <ModeTab
                                        active={mode === 'all'}
                                        onClick={() => { setMode('all'); setError(null); }}
                                        icon="◆"
                                        label="Compress All Thoughts"
                                        desc={`${thoughtCount} thoughts → 1 packet`}
                                        color={C.purple}
                                    />
                                    <ModeTab
                                        active={mode === 'single'}
                                        onClick={() => { setMode('single'); setError(null); }}
                                        icon="◇"
                                        label="Quick Compress"
                                        desc="Paste a conversation"
                                        color={C.cyan}
                                    />
                                </div>

                                {/* ─── ALL MODE ──────────────────────────── */}
                                {mode === 'all' && (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <div style={{
                                            width: '100px', height: '100px', margin: '0 auto 20px',
                                            borderRadius: '50%',
                                            background: `radial-gradient(circle at 30% 30%, ${C.purpleDim}, transparent 70%)`,
                                            border: `1px solid ${C.purpleBorder}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <motion.div
                                                animate={compressing ? { rotate: 360 } : {}}
                                                transition={compressing ? { repeat: Infinity, duration: 2, ease: 'linear' } : {}}
                                                style={{ fontSize: '36px' }}
                                            >
                                                {compressing ? '⟳' : '⬢'}
                                            </motion.div>
                                        </div>

                                        <div style={{
                                            fontFamily: font, fontSize: '17px', fontWeight: 600,
                                            color: C.text, marginBottom: '8px',
                                        }}>
                                            {compressing ? 'Compressing your knowledge...' : 'Export Your Entire Brain'}
                                        </div>

                                        <div style={{
                                            fontFamily: fontMono, fontSize: '11px', lineHeight: '1.7',
                                            color: C.textMid, maxWidth: '400px', margin: '0 auto 24px',
                                        }}>
                                            {compressing
                                                ? 'AI is analyzing all your thoughts and their relationships to create the most token-efficient encoding possible...'
                                                : <>
                                                    Takes <strong style={{ color: C.purple }}>all {thoughtCount} thoughts</strong> and their connections,
                                                    then compresses them into a single pasteable block. Any AI that reads it will
                                                    <strong style={{ color: C.accent }}> instantly understand your full knowledge landscape</strong>.
                                                </>
                                            }
                                        </div>

                                        {!compressing && (
                                            <motion.button
                                                onClick={handleCompressAll}
                                                disabled={thoughtCount === 0}
                                                whileHover={{ scale: thoughtCount > 0 ? 1.04 : 1 }}
                                                whileTap={{ scale: thoughtCount > 0 ? 0.96 : 1 }}
                                                style={{
                                                    padding: '14px 36px',
                                                    borderRadius: '14px',
                                                    border: 'none',
                                                    background: thoughtCount > 0
                                                        ? 'linear-gradient(135deg, #A78BFA, #7C3AED)'
                                                        : 'rgba(255,255,255,0.03)',
                                                    color: thoughtCount > 0 ? '#fff' : C.textDim,
                                                    fontFamily: fontMono, fontSize: '14px', fontWeight: 700,
                                                    cursor: thoughtCount > 0 ? 'pointer' : 'not-allowed',
                                                    letterSpacing: '0.3px',
                                                    boxShadow: thoughtCount > 0 ? '0 6px 30px rgba(167, 139, 250, 0.3)' : 'none',
                                                }}
                                            >
                                                ◆ Compress {thoughtCount} Thoughts
                                            </motion.button>
                                        )}

                                        {compressing && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'center', gap: '3px',
                                                marginTop: '8px',
                                            }}>
                                                {[0, 1, 2].map(i => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ opacity: [0.2, 1, 0.2] }}
                                                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                                                        style={{
                                                            width: '6px', height: '6px', borderRadius: '50%',
                                                            background: C.purple,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── SINGLE MODE ───────────────────────── */}
                                {mode === 'single' && (
                                    <div>
                                        {/* Source AI selector */}
                                        <div style={{ marginBottom: '14px' }}>
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                color: C.textDim, letterSpacing: '1.5px', textTransform: 'uppercase',
                                                marginBottom: '8px',
                                            }}>Source AI</div>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {AI_SOURCES.map(s => (
                                                    <button
                                                        key={s.key}
                                                        onClick={() => setSourceAi(s.key)}
                                                        style={{
                                                            padding: '6px 14px', borderRadius: '8px',
                                                            border: `1px solid ${sourceAi === s.key ? `${s.color}40` : C.border}`,
                                                            background: sourceAi === s.key ? `${s.color}12` : 'transparent',
                                                            color: sourceAi === s.key ? s.color : C.textMid,
                                                            fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                                            cursor: 'pointer', transition: 'all 0.15s',
                                                        }}
                                                    >{s.label}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Conversation paste area */}
                                        <div>
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                color: C.textDim, letterSpacing: '1.5px', textTransform: 'uppercase',
                                                marginBottom: '8px',
                                                display: 'flex', justifyContent: 'space-between',
                                            }}>
                                                <span>Paste Conversation</span>
                                                {content.length > 0 && (
                                                    <span style={{ color: C.cyan, opacity: 0.5 }}>
                                                        {content.length.toLocaleString()} chars
                                                    </span>
                                                )}
                                            </div>
                                            <textarea
                                                value={content}
                                                onChange={e => setContent(e.target.value)}
                                                placeholder={"Paste your AI conversation here...\n\nTip: Go to your AI chat, select all (⌘A), copy (⌘C), then paste here.\nThe compressor strips all the fluff and gives you pure knowledge."}
                                                style={{
                                                    width: '100%', height: '160px',
                                                    padding: '14px',
                                                    borderRadius: '12px',
                                                    background: C.surface,
                                                    border: `1px solid ${content.length > 20 ? C.purpleBorder : C.border}`,
                                                    color: C.text,
                                                    fontFamily: fontMono, fontSize: '12px',
                                                    lineHeight: '1.6', outline: 'none',
                                                    resize: 'vertical',
                                                    transition: 'border-color 0.3s',
                                                }}
                                            />
                                        </div>

                                        {/* Compress button */}
                                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                                            <motion.button
                                                onClick={handleCompressSingle}
                                                disabled={content.trim().length < 20 || compressing}
                                                whileHover={{ scale: content.trim().length >= 20 ? 1.03 : 1 }}
                                                whileTap={{ scale: content.trim().length >= 20 ? 0.97 : 1 }}
                                                style={{
                                                    padding: '10px 24px', borderRadius: '10px',
                                                    border: 'none',
                                                    background: content.trim().length >= 20
                                                        ? 'linear-gradient(135deg, #3DD6F5, #00B4D8)'
                                                        : 'rgba(255,255,255,0.03)',
                                                    color: content.trim().length >= 20 ? '#050508' : C.textDim,
                                                    fontFamily: fontMono, fontSize: '12px', fontWeight: 700,
                                                    cursor: content.trim().length >= 20 ? 'pointer' : 'not-allowed',
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    marginLeft: 'auto',
                                                }}
                                            >
                                                {compressing ? (
                                                    <>
                                                        <motion.span
                                                            animate={{ rotate: 360 }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                            style={{ display: 'inline-block' }}
                                                        >⟳</motion.span>
                                                        Compressing...
                                                    </>
                                                ) : '◇ Compress This'}
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ─── ERROR ────────────────────────────────── */}
                        {error && (
                            <div style={{
                                marginTop: '12px', padding: '12px 16px',
                                borderRadius: '10px',
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.15)',
                                fontFamily: fontMono, fontSize: '11px',
                                color: C.danger, lineHeight: '1.5',
                            }}>{error}</div>
                        )}

                        {/* ─── RESULTS ──────────────────────────────── */}
                        {result && (
                            <div ref={resultRef}>
                                {/* ═══ ALL THOUGHTS RESULT ═══ */}
                                {result.type === 'all' && result.data && (
                                    <div>
                                        {/* Context header */}
                                        {result.data.context && (
                                            <div style={{
                                                padding: '14px 18px',
                                                borderRadius: '12px',
                                                background: C.purpleDim,
                                                border: `1px solid ${C.purpleBorder}`,
                                                marginBottom: '16px',
                                            }}>
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                    color: C.purple, letterSpacing: '2px', textTransform: 'uppercase',
                                                    marginBottom: '6px',
                                                }}>Your Knowledge Profile</div>
                                                <div style={{
                                                    fontFamily: font, fontSize: '14px', fontWeight: 500,
                                                    color: C.text, lineHeight: '1.6',
                                                }}>{result.data.context}</div>
                                            </div>
                                        )}

                                        {/* Stats row */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                                            gap: '10px', marginBottom: '20px',
                                        }}>
                                            <StatBox label="Thoughts" value={result.data.thoughtCount} color={C.accent} />
                                            <StatBox label="Domains" value={result.data.domainCount} color={C.cyan} />
                                            <StatBox label="Compression" value={result.data.stats?.ratio || 'N/A'} color={C.purple} />
                                        </div>

                                        {/* Domain blocks */}
                                        {result.data.blocks?.length > 0 && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                                    marginBottom: '10px',
                                                }}>Domain Packets</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {result.data.blocks.map((block, i) => (
                                                        <div key={i} style={{
                                                            padding: '12px 16px',
                                                            borderRadius: '10px',
                                                            background: C.surface,
                                                            border: `1px solid ${C.border}`,
                                                        }}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                marginBottom: '6px',
                                                            }}>
                                                                <span style={{
                                                                    fontFamily: fontMono, fontSize: '11px', fontWeight: 700,
                                                                    color: C.cyan, textTransform: 'capitalize',
                                                                }}>{block.domain}</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(block.compressed, `block-${i}`)}
                                                                    style={{
                                                                        padding: '3px 10px', borderRadius: '6px',
                                                                        background: 'none', border: `1px solid ${C.border}`,
                                                                        fontFamily: fontMono, fontSize: '9px',
                                                                        color: copiedBlock === `block-${i}` ? C.accent : C.textDim,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >{copiedBlock === `block-${i}` ? '✓ Copied' : 'Copy'}</button>
                                                            </div>
                                                            <div style={{
                                                                fontFamily: fontMono, fontSize: '11px',
                                                                color: C.textMid, lineHeight: '1.6',
                                                                maxHeight: '80px', overflow: 'hidden',
                                                            }}>{block.compressed}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Open frontiers */}
                                        {result.data.frontiers?.length > 0 && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                                    marginBottom: '8px',
                                                }}>Open Frontiers</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {result.data.frontiers.map((q, i) => (
                                                        <div key={i} style={{
                                                            padding: '8px 14px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(251, 191, 36, 0.04)',
                                                            border: '1px solid rgba(251, 191, 36, 0.1)',
                                                            fontFamily: fontMono, fontSize: '11px',
                                                            color: C.gold,
                                                        }}>? {q}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ═══ MASTER PACKET — The main event ═══ */}
                                        {result.data.masterPacket && (
                                            <MasterPacketBlock
                                                packet={result.data.masterPacket}
                                                onCopy={(text) => copyToClipboard(text, 'master')}
                                                copied={copiedBlock === 'master'}
                                                stats={result.data.stats}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* ═══ SINGLE CONVERSATION RESULT ═══ */}
                                {result.type === 'single' && result.data && (
                                    <div>
                                        {/* Title */}
                                        <div style={{
                                            padding: '14px 18px',
                                            borderRadius: '12px',
                                            background: C.cyanDim,
                                            border: `1px solid rgba(61, 214, 245, 0.15)`,
                                            marginBottom: '16px',
                                        }}>
                                            <div style={{
                                                fontFamily: font, fontSize: '15px', fontWeight: 600,
                                                color: C.text,
                                            }}>{result.data.title}</div>
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                                                marginTop: '4px',
                                            }}>
                                                {result.data.domains?.join(' · ')} · {result.data.format}
                                            </div>
                                        </div>

                                        {/* Insights */}
                                        {result.data.insights?.length > 0 && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                                    marginBottom: '8px',
                                                }}>Core Insights</div>
                                                {result.data.insights.map((ins, i) => (
                                                    <div key={i} style={{
                                                        padding: '10px 14px',
                                                        borderRadius: '8px',
                                                        background: C.surface,
                                                        border: `1px solid ${C.border}`,
                                                        marginBottom: '4px',
                                                    }}>
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            marginBottom: '4px',
                                                        }}>
                                                            <span style={{
                                                                fontFamily: fontMono, fontSize: '10px',
                                                                color: ins.confidence === '✓' ? C.accent : ins.confidence === '~' ? C.gold : C.textMid,
                                                            }}>{ins.confidence}</span>
                                                            <span style={{
                                                                fontFamily: font, fontSize: '12px', fontWeight: 600,
                                                                color: C.text,
                                                            }}>{ins.concept}</span>
                                                        </div>
                                                        <div style={{
                                                            fontFamily: fontMono, fontSize: '11px',
                                                            color: C.textMid, lineHeight: '1.5',
                                                        }}>{ins.essence}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Compressed text */}
                                        {result.data.compressed && (
                                            <MasterPacketBlock
                                                packet={result.data.compressed}
                                                onCopy={(text) => copyToClipboard(text, 'single')}
                                                copied={copiedBlock === 'single'}
                                                label="Compressed Packet"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ Footer ═══════════════════════════════════════════ */}
                    <div style={{
                        padding: '16px 32px 20px',
                        borderTop: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{
                            fontFamily: fontMono, fontSize: '9px',
                            color: C.textDim, letterSpacing: '0.3px',
                        }}>
                            {result ? 'Paste this into any AI chat for instant context' : 'Format: FKPV1 · Token-optimized'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {result && (
                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '8px 18px', borderRadius: '8px',
                                        background: 'none', border: `1px solid ${C.border}`,
                                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                        color: C.textMid, cursor: 'pointer',
                                    }}
                                >← New Compression</button>
                            )}
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px 18px', borderRadius: '8px',
                                    background: 'none', border: `1px solid ${C.border}`,
                                    fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                    color: C.textMid, cursor: 'pointer',
                                }}
                            >{result ? 'Done' : 'Cancel'}</button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}


// ─── Sub-components ─────────────────────────────────────────────────────────

function ModeTab({ active, onClick, icon, label, desc, color }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
                flex: 1, padding: '16px',
                borderRadius: '14px',
                border: `1.5px solid ${active ? color + '40' : C.border}`,
                background: active ? color + '08' : C.surface,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
            }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '4px',
            }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{
                    fontFamily: font, fontSize: '13px', fontWeight: 600,
                    color: active ? C.text : C.textMid,
                }}>{label}</span>
            </div>
            <div style={{
                fontFamily: fontMono, fontSize: '10px',
                color: active ? color : C.textDim,
            }}>{desc}</div>
        </motion.button>
    );
}

function StatBox({ label, value, color }) {
    return (
        <div style={{
            padding: '14px', borderRadius: '12px',
            background: color + '06',
            border: `1px solid ${color}15`,
            textAlign: 'center',
        }}>
            <div style={{
                fontFamily: font, fontSize: '22px', fontWeight: 700,
                color,
            }}>{value}</div>
            <div style={{
                fontFamily: fontMono, fontSize: '8px', fontWeight: 600,
                color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
                marginTop: '3px',
            }}>{label}</div>
        </div>
    );
}

function MasterPacketBlock({ packet, onCopy, copied, stats, label = 'Master Knowledge Packet' }) {
    return (
        <div style={{
            borderRadius: '14px',
            border: `1.5px solid rgba(167, 139, 250, 0.25)`,
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.04), rgba(61, 214, 245, 0.02))',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{
                        fontFamily: fontMono, fontSize: '10px', fontWeight: 700,
                        color: C.purple, letterSpacing: '1px', textTransform: 'uppercase',
                    }}>◆ {label}</div>
                    {stats && (
                        <div style={{
                            fontFamily: fontMono, fontSize: '9px', color: C.textDim,
                            marginTop: '2px',
                        }}>
                            {stats.originalChars?.toLocaleString()} → {stats.compressedChars?.toLocaleString()} chars ({stats.ratio} compression)
                        </div>
                    )}
                </div>
                <motion.button
                    onClick={() => onCopy(packet)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    style={{
                        padding: '8px 20px', borderRadius: '8px',
                        border: 'none',
                        background: copied
                            ? 'linear-gradient(135deg, #00E5A0, #34D399)'
                            : 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                        color: '#fff',
                        fontFamily: fontMono, fontSize: '11px', fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: copied
                            ? '0 4px 16px rgba(0, 229, 160, 0.3)'
                            : '0 4px 16px rgba(167, 139, 250, 0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    {copied ? '✓ Copied to Clipboard!' : '⎘ Copy Packet'}
                </motion.button>
            </div>

            {/* Packet content */}
            <div style={{
                padding: '16px 18px',
                maxHeight: '240px',
                overflow: 'auto',
            }}>
                <pre style={{
                    fontFamily: fontMono, fontSize: '11px',
                    color: C.text, lineHeight: '1.7',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    margin: 0, opacity: 0.85,
                }}>{packet}</pre>
            </div>

            {/* Usage hint */}
            <div style={{
                padding: '10px 18px',
                borderTop: '1px solid rgba(255,255,255,0.03)',
                background: 'rgba(167, 139, 250, 0.03)',
            }}>
                <div style={{
                    fontFamily: fontMono, fontSize: '10px',
                    color: C.textDim, lineHeight: '1.5',
                }}>
                    › <strong style={{ color: C.textMid }}>How to use:</strong> Copy this packet → Start a new AI chat →
                    Paste it as your first message → The AI instantly has all your context
                </div>
            </div>
        </div>
    );
}
