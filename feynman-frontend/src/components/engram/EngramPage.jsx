// ═══════════════════════════════════════════════════════════════════════════
// EngramPage.jsx — The Living Thinking Graph
//
// Full-screen overlay. Orchestrates:
//   - ThoughtGraph (force-directed visualization)
//   - IngestPanel (paste AI conversations)
//   - ThoughtSidebar (node detail view)
//   - InsightLayer (velocity, contradictions, gravity wells)
//   - Stats bar (thought count, maturity breakdown)
//
// Thoughts, not conversations. Understanding, not data.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';
import ThoughtGraph from './ThoughtGraph';
import IngestPanel from './IngestPanel';
import ImportPanel from './ImportPanel';
import CompressPanel from './CompressPanel';
import QuickCapture from './QuickCapture';
import ThoughtSidebar from './ThoughtSidebar';
import InsightLayer from './InsightLayer';

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const C = {
    bg: '#050508',
    accent: '#00E5A0',
    accentDim: 'rgba(0, 229, 160, 0.08)',
    accentBorder: 'rgba(0, 229, 160, 0.15)',
    cyan: '#3DD6F5',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
    textGhost: 'rgba(232,240,248,0.08)',
    border: 'rgba(255,255,255,0.04)',
    contradict: '#EF4444',
};

const MATURITY_COLORS = {
    seed: '#6B7280', sprouting: '#34D399', growing: '#FBBF24',
    mature: '#3DD6F5', evolved: '#A78BFA',
};


export default function EngramPage({ isOpen, onClose }) {
    // ─── State ────────────────────────────────────────────────────────
    const [thoughts, setThoughts] = useState([]);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ingestOpen, setIngestOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [compressOpen, setCompressOpen] = useState(false);
    const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedThoughtId, setSelectedThoughtId] = useState(null);
    const [insightOpen, setInsightOpen] = useState(false);
    const [graphDimensions, setGraphDimensions] = useState({ width: 0, height: 0 });
    const graphContainerRef = useRef(null);

    const addToast = useBrainStore(s => s.addToast);
    const { isMobile, isTablet } = useResponsive();

    // ─── Dynamic tab title ────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const originalTitle = document.title;
        document.title = `Engram — ${thoughts.length} thought${thoughts.length !== 1 ? 's' : ''} mapped`;
        return () => { document.title = originalTitle; };
    }, [isOpen, thoughts.length]);

    // ─── Fetch graph on mount ─────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        fetchGraph();
    }, [isOpen]);

    const fetchGraph = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/engram/graph');
            setThoughts(res.data.thoughts || []);
            setLinks(res.data.links || []);
        } catch (err) {
            console.error('Failed to fetch thinking graph:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Failed to load thinking graph', duration: 3000 });
        }
        setLoading(false);
    }, [addToast]);

    // ─── Measure graph container ──────────────────────────────────────
    useEffect(() => {
        if (!graphContainerRef.current || !isOpen) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setGraphDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });
        observer.observe(graphContainerRef.current);
        return () => observer.disconnect();
    }, [isOpen]);

    // ─── Ingest handler ───────────────────────────────────────────────
    const handleIngest = useCallback(async (data) => {
        setProcessing(true);
        try {
            const res = await api.post('/api/engram/ingest', data);
            const result = res.data;

            if (result.thoughts_created + result.thoughts_merged === 0) {
                addToast({
                    type: 'info', icon: '◇',
                    message: 'No distinct thoughts found in this conversation',
                    duration: 3000,
                });
            } else {
                addToast({
                    type: 'success', icon: '◆',
                    message: `Extracted ${result.thoughts_created} new + ${result.thoughts_merged} enriched thoughts`,
                    duration: 4000,
                });
            }

            setIngestOpen(false);

            // Refresh graph after a short delay (links are detected async)
            setTimeout(() => fetchGraph(), 2000);

        } catch (err) {
            console.error('Ingestion failed:', err);
            addToast({
                type: 'danger', icon: '✕',
                message: 'Failed to process conversation — ' + (err.response?.data?.error || err.message),
                duration: 4000,
            });
        }
        setProcessing(false);
    }, [addToast, fetchGraph]);

    // ─── Node click ───────────────────────────────────────────────────
    const handleNodeClick = useCallback((node) => {
        setSelectedThoughtId(node.id);
    }, []);

    // ─── Delete thought ───────────────────────────────────────────────
    const handleDeleteThought = useCallback(async (thoughtId) => {
        try {
            await api.delete(`/api/engram/thought/${thoughtId}`);
            setThoughts(prev => prev.filter(t => t.id !== thoughtId));
            setLinks(prev => prev.filter(l => l.source_id !== thoughtId && l.target_id !== thoughtId));
            setSelectedThoughtId(null);
            addToast({ type: 'success', icon: '✦', message: 'Thought removed', duration: 2500 });
        } catch (err) {
            addToast({ type: 'danger', icon: '✕', message: 'Failed to delete', duration: 3000 });
        }
    }, [addToast]);

    // ─── Keyboard: Escape ─────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handle = (e) => {
            if (e.key === 'Escape') {
                if (compressOpen) setCompressOpen(false);
                else if (quickCaptureOpen) setQuickCaptureOpen(false);
                else if (ingestOpen) setIngestOpen(false);
                else if (insightOpen) setInsightOpen(false);
                else if (selectedThoughtId) setSelectedThoughtId(null);
                else onClose?.();
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [isOpen, compressOpen, quickCaptureOpen, ingestOpen, insightOpen, selectedThoughtId, onClose]);

    if (!isOpen) return null;

    // ─── Stats ────────────────────────────────────────────────────────
    const maturityCounts = { seed: 0, sprouting: 0, growing: 0, mature: 0, evolved: 0 };
    thoughts.forEach(t => {
        maturityCounts[t.maturity || 'seed']++;
    });
    const contradictions = links.filter(l => l.link_type === 'contradicts').length;
    const domains = [...new Set(thoughts.map(t => t.domain || 'general'))];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: C.bg,
                display: 'flex', flexDirection: 'column',
                fontFamily: font,
            }}
        >
            {/* ═══ TOP BAR ════════════════════════════════════════════════ */}
            <div style={{
                display: 'flex', alignItems: 'center',
                borderBottom: `1px solid ${C.border}`,
                height: '46px', flexShrink: 0,
            }}>
                {/* Back */}
                <button
                    onClick={onClose}
                    style={{
                        padding: '0 16px', height: '100%',
                        background: 'none', border: 'none',
                        borderRight: `1px solid ${C.border}`,
                        color: C.textMid, fontFamily: fontMono, fontSize: '11px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'color 0.15s', flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = C.text}
                    onMouseLeave={e => e.currentTarget.style.color = C.textMid}
                >
                    <span style={{ fontSize: '13px' }}>←</span>
                    <span>Back</span>
                </button>

                {/* Title */}
                <div style={{
                    padding: '0 16px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    flexShrink: 0,
                }}>
                    <span style={{
                        fontFamily: font, fontSize: '15px', fontWeight: 700,
                        color: C.text, letterSpacing: '-0.3px',
                    }}>Engram</span>
                    <span style={{
                        fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                        color: C.accent, letterSpacing: '1.5px',
                        textTransform: 'uppercase', opacity: 0.5,
                    }}>Thinking Graph</span>
                </div>

                {/* Stats bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    flex: 1, padding: '0 16px',
                    overflow: 'hidden',
                }}>
                    {/* Thought count */}
                    <span style={{
                        fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                        display: 'flex', alignItems: 'center', gap: '5px',
                        flexShrink: 0,
                    }}>
                        <span style={{ color: C.accent, fontWeight: 700 }}>{thoughts.length}</span>
                        thoughts
                    </span>

                    {/* Domain count */}
                    {!isMobile && domains.length > 0 && (
                        <span style={{
                            fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                            display: 'flex', alignItems: 'center', gap: '5px',
                            flexShrink: 0,
                        }}>
                            <span style={{ color: C.cyan, fontWeight: 700 }}>{domains.length}</span>
                            domains
                        </span>
                    )}

                    {/* Contradictions badge */}
                    {contradictions > 0 && !isMobile && (
                        <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            fontFamily: fontMono, fontSize: '9px', fontWeight: 700,
                            color: C.contradict, letterSpacing: '0.5px',
                            flexShrink: 0,
                        }}>
                            {contradictions} contradiction{contradictions !== 1 ? 's' : ''}
                        </span>
                    )}

                    {/* Maturity breakdown mini-bar */}
                    {!isMobile && thoughts.length > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '2px',
                            height: '6px', flexShrink: 0,
                        }}>
                            {Object.entries(maturityCounts).map(([key, count]) => {
                                if (count === 0) return null;
                                const pct = (count / thoughts.length) * 100;
                                return (
                                    <div
                                        key={key}
                                        title={`${key}: ${count}`}
                                        style={{
                                            height: '4px',
                                            width: `${Math.max(pct * 0.6, 3)}px`,
                                            background: MATURITY_COLORS[key],
                                            borderRadius: '2px',
                                            opacity: 0.6,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Insights button */}
                {thoughts.length > 0 && (
                    <motion.button
                        onClick={() => { setInsightOpen(v => !v); setSelectedThoughtId(null); }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            padding: '0 14px', height: '100%',
                            background: insightOpen ? C.accentDim : 'none',
                            border: 'none',
                            borderLeft: `1px solid ${C.border}`,
                            color: insightOpen ? C.accent : C.textMid,
                            fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            letterSpacing: '0.3px', flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: '12px' }}>⬡</span>
                        {isMobile ? '' : 'Insights'}
                    </motion.button>
                )}

                {/* Compress button */}
                {thoughts.length > 0 && (
                    <motion.button
                        onClick={() => setCompressOpen(true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            padding: '0 14px', height: '100%',
                            background: 'none', border: 'none',
                            borderLeft: `1px solid ${C.border}`,
                            color: '#A78BFA',
                            fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            letterSpacing: '0.3px', flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: '12px', fontFamily: "'SF Mono', monospace" }}>⬢</span>
                        {isMobile ? '' : 'Compress'}
                    </motion.button>
                )}

                {/* Quick Capture button */}
                <motion.button
                    onClick={() => setQuickCaptureOpen(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                        padding: '0 14px', height: '100%',
                        background: 'none', border: 'none',
                        borderLeft: `1px solid ${C.border}`,
                        color: C.cyan,
                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        letterSpacing: '0.3px', flexShrink: 0,
                    }}
                >
                    <span style={{ fontSize: '12px', fontFamily: "'SF Mono', monospace" }}>⇗</span>
                    {isMobile ? 'Grab' : 'Quick Capture'}
                </motion.button>

                {/* Import button */}
                <motion.button
                    onClick={() => setImportOpen(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                        padding: '0 14px', height: '100%',
                        background: 'none', border: 'none',
                        borderLeft: `1px solid ${C.border}`,
                        color: C.textMid,
                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        letterSpacing: '0.3px', flexShrink: 0,
                    }}
                >
                    <span style={{ fontSize: '12px' }}>↑</span>
                    {isMobile ? 'JSON' : 'Import JSON'}
                </motion.button>

                {/* Ingest button */}
                <motion.button
                    onClick={() => setIngestOpen(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                        padding: '0 16px', height: '100%',
                        background: 'none', border: 'none',
                        borderLeft: `1px solid ${C.border}`,
                        color: C.accent,
                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        letterSpacing: '0.3px', flexShrink: 0,
                    }}
                >
                    <span style={{ fontSize: '13px' }}>+</span>
                    {isMobile ? 'Paste' : 'Paste'}
                </motion.button>
            </div>

            {/* ═══ MAIN CONTENT ══════════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
                {/* Graph area */}
                <div
                    ref={graphContainerRef}
                    style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
                >
                    {loading ? (
                        <div style={{
                            width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: C.bg,
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                    style={{
                                        width: '24px', height: '24px', margin: '0 auto 12px',
                                        border: `2px solid rgba(0,229,160,0.1)`,
                                        borderTop: `2px solid ${C.accent}`, borderRadius: '50%',
                                    }}
                                />
                                <div style={{
                                    fontFamily: fontMono, fontSize: '11px',
                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                }}>Loading thinking graph...</div>
                            </div>
                        </div>
                    ) : thoughts.length === 0 ? (
                        /* ─── Empty State ─── */
                        <div style={{
                            width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: C.bg,
                        }}>
                            <div style={{ textAlign: 'center', maxWidth: '420px', padding: '20px' }}>
                                {/* Decorative glow */}
                                <div style={{
                                    width: '80px', height: '80px', margin: '0 auto 24px',
                                    borderRadius: '50%',
                                    background: `radial-gradient(circle, ${C.accentDim}, transparent 70%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <div style={{
                                        width: '12px', height: '12px', borderRadius: '50%',
                                        background: C.accent, opacity: 0.4,
                                        boxShadow: `0 0 20px ${C.accent}40`,
                                    }} />
                                </div>

                                <div style={{
                                    fontFamily: font, fontSize: '22px', fontWeight: 700,
                                    color: C.text, letterSpacing: '-0.5px', marginBottom: '8px',
                                }}>Your thinking graph is empty</div>

                                <div style={{
                                    fontFamily: fontMono, fontSize: '12px', lineHeight: '1.7',
                                    color: C.textMid, marginBottom: '28px',
                                }}>
                                    Import your chats from Claude, ChatGPT, or Gemini — or paste a single conversation.
                                    Engram will extract your <em style={{ color: C.accent }}>thoughts</em> — not summaries — and connect them into a living graph of your understanding.
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                                    <motion.button
                                        onClick={() => setQuickCaptureOpen(true)}
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        style={{
                                            padding: '12px 28px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #00E5A0, #3DD6F5)',
                                            color: '#050508',
                                            fontFamily: fontMono, fontSize: '13px', fontWeight: 700,
                                            cursor: 'pointer',
                                            letterSpacing: '0.3px',
                                            boxShadow: '0 4px 24px rgba(0, 229, 160, 0.25)',
                                        }}
                                    >
                                        ⇗ Quick Capture from AI Chat
                                    </motion.button>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <motion.button
                                            onClick={() => setImportOpen(true)}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                border: `1px solid ${C.border}`,
                                                background: 'none',
                                                color: C.textMid,
                                                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ↑ Import JSON
                                        </motion.button>
                                        <motion.button
                                            onClick={() => setIngestOpen(true)}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                border: `1px solid ${C.border}`,
                                                background: 'none',
                                                color: C.textMid,
                                                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            + Paste text
                                        </motion.button>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: '20px',
                                    fontFamily: fontMono, fontSize: '10px',
                                    color: C.textDim, letterSpacing: '0.3px',
                                }}>
                                    ⌘+V to paste · Works with any AI
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ThoughtGraph
                            thoughts={thoughts}
                            links={links}
                            width={graphDimensions.width}
                            height={graphDimensions.height}
                            onNodeClick={handleNodeClick}
                            selectedThoughtId={selectedThoughtId}
                        />
                    )}

                    {/* Link type legend (bottom-left) */}
                    {!loading && thoughts.length > 0 && !isMobile && (
                        <div style={{
                            position: 'absolute', bottom: '16px', left: '16px',
                            background: 'rgba(13,15,20,0.85)',
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${C.border}`,
                            borderRadius: '12px',
                            padding: '10px 14px',
                            zIndex: 10,
                        }}>
                            <div style={{
                                fontFamily: fontMono, fontSize: '8px', fontWeight: 600,
                                color: C.textDim, letterSpacing: '1.5px', textTransform: 'uppercase',
                                marginBottom: '6px',
                            }}>Link Types</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {[
                                    { type: 'builds_on', label: 'Builds on', color: '#34D399' },
                                    { type: 'extends', label: 'Extends', color: '#3DD6F5' },
                                    { type: 'contradicts', label: 'Contradicts', color: '#EF4444' },
                                    { type: 'requires', label: 'Requires', color: '#FBBF24' },
                                ].map(({ type, label, color }) => {
                                    const count = links.filter(l => l.link_type === type).length;
                                    if (count === 0) return null;
                                    return (
                                        <div key={type} style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}>
                                            <div style={{
                                                width: '12px', height: '2px', borderRadius: '1px',
                                                background: color, opacity: 0.6,
                                            }} />
                                            <span style={{
                                                fontFamily: fontMono, fontSize: '8px',
                                                color: C.textDim,
                                            }}>{label} ({count})</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Thought Sidebar */}
                <AnimatePresence>
                    {selectedThoughtId && (
                        <ThoughtSidebar
                            thoughtId={selectedThoughtId}
                            onClose={() => setSelectedThoughtId(null)}
                            onDelete={handleDeleteThought}
                            isMobile={isMobile}
                        />
                    )}
                </AnimatePresence>

                {/* Insight Layer */}
                <AnimatePresence>
                    {insightOpen && (
                        <InsightLayer
                            isOpen={insightOpen}
                            onClose={() => setInsightOpen(false)}
                            onThoughtClick={(node) => {
                                setSelectedThoughtId(node.id);
                                setInsightOpen(false);
                            }}
                            isMobile={isMobile}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Ingest Modal */}
            <IngestPanel
                isOpen={ingestOpen}
                onClose={() => setIngestOpen(false)}
                onIngest={handleIngest}
                processing={processing}
            />

            {/* Import Modal */}
            <ImportPanel
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                onComplete={() => {
                    setImportOpen(false);
                    fetchGraph();
                }}
            />

            {/* Quick Capture Modal */}
            <QuickCapture
                isOpen={quickCaptureOpen}
                onClose={() => setQuickCaptureOpen(false)}
                onCapture={(data) => {
                    setQuickCaptureOpen(false);
                    handleIngest(data);
                }}
            />

            {/* Knowledge Compression Modal */}
            <CompressPanel
                isOpen={compressOpen}
                onClose={() => setCompressOpen(false)}
                thoughtCount={thoughts.length}
            />
        </motion.div>
    );
}
