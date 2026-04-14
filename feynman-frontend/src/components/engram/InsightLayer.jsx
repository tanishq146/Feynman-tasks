// ═══════════════════════════════════════════════════════════════════════════
// InsightLayer.jsx — The Intelligence Surface
//
// A slide-out panel that reveals what your thinking graph sees:
//   - Velocity: Which thoughts are deepening fastest
//   - Contradictions: Where your AIs disagree
//   - Gravity Wells: The core questions you keep circling
//   - Domain Distribution & Maturity Breakdown
//
// This is where Engram stops being a pretty graph and becomes a mirror.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const C = {
    bg: '#08090E',
    surface: 'rgba(255,255,255,0.02)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.05)',
    accent: '#00E5A0',
    accentDim: 'rgba(0, 229, 160, 0.08)',
    accentBorder: 'rgba(0, 229, 160, 0.15)',
    cyan: '#3DD6F5',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
    textGhost: 'rgba(232,240,248,0.08)',
    contradict: '#EF4444',
    gold: '#FBBF24',
    purple: '#A78BFA',
};

const DOMAIN_COLORS = {
    philosophy: '#A78BFA', science: '#34D399', technology: '#3DD6F5',
    psychology: '#F472B6', health: '#10B981', creativity: '#FBBF24',
    career: '#F59E0B', relationships: '#EC4899', finance: '#6EE7B7',
    history: '#C4B5FD', mathematics: '#60A5FA', language: '#818CF8',
    art: '#FB923C', music: '#E879F9', general: '#00E5A0',
};

const MATURITY_META = {
    seed:      { label: 'Seed',      color: '#6B7280', icon: '○' },
    sprouting: { label: 'Sprouting', color: '#34D399', icon: '◐' },
    growing:   { label: 'Growing',   color: '#FBBF24', icon: '◑' },
    mature:    { label: 'Mature',    color: '#3DD6F5', icon: '●' },
    evolved:   { label: 'Evolved',   color: '#A78BFA', icon: '◆' },
};

const TRAJECTORY_ICONS = {
    accelerating: '↗',
    steady: '→',
    decelerating: '↘',
    static: '·',
    breakthrough: '⚡',
};

export default function InsightLayer({ isOpen, onClose, onThoughtClick, isMobile }) {
    const [insights, setInsights] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch lightweight insights on open
    useEffect(() => {
        if (!isOpen) return;
        fetchInsights();
    }, [isOpen]);

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/engram/insights');
            setInsights(res.data);
        } catch (err) {
            console.error('Failed to fetch insights:', err);
        }
        setLoading(false);
    }, []);

    const runDeepAnalysis = useCallback(async () => {
        setAnalyzing(true);
        try {
            const res = await api.post('/api/engram/analyze');
            setAnalysis(res.data);
            setActiveTab('velocity');
        } catch (err) {
            console.error('Deep analysis failed:', err);
        }
        setAnalyzing(false);
    }, []);

    if (!isOpen) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '⬡' },
        { id: 'velocity', label: 'Velocity', icon: '↗' },
        { id: 'contradictions', label: 'Conflicts', icon: '⚡' },
        { id: 'gravity', label: 'Gravity', icon: '◉' },
    ];

    return (
        <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
                position: isMobile ? 'fixed' : 'absolute',
                ...(isMobile
                    ? { inset: 0, zIndex: 60 }
                    : { top: 0, right: 0, bottom: 0, width: '420px', zIndex: 60 }
                ),
                background: C.bg,
                borderLeft: isMobile ? 'none' : `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ─── Header ─── */}
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
                }}>Intelligence</span>
            </div>

            {/* ─── Tabs ─── */}
            <div style={{
                display: 'flex', borderBottom: `1px solid ${C.border}`,
                padding: '0 8px',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1, padding: '10px 8px',
                            background: 'none', border: 'none',
                            borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
                            color: activeTab === tab.id ? C.text : C.textDim,
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            letterSpacing: '0.3px',
                        }}
                    >
                        <span style={{ fontSize: '11px' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── Content ─── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
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
                        }}>Loading insights...</div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && <OverviewTab insights={insights} onRunAnalysis={runDeepAnalysis} analyzing={analyzing} analysis={analysis} />}
                        {activeTab === 'velocity' && <VelocityTab analysis={analysis} onRunAnalysis={runDeepAnalysis} analyzing={analyzing} onThoughtClick={onThoughtClick} />}
                        {activeTab === 'contradictions' && <ContradictionsTab analysis={analysis} insights={insights} onRunAnalysis={runDeepAnalysis} analyzing={analyzing} onThoughtClick={onThoughtClick} />}
                        {activeTab === 'gravity' && <GravityTab analysis={analysis} onRunAnalysis={runDeepAnalysis} analyzing={analyzing} onThoughtClick={onThoughtClick} />}
                    </>
                )}
            </div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Overview Tab — Stats dashboard
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ insights, onRunAnalysis, analyzing, analysis }) {
    if (!insights || insights.total_thoughts === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                    fontFamily: font, fontSize: '16px', fontWeight: 600,
                    color: C.text, marginBottom: '8px',
                }}>No insights yet</div>
                <div style={{
                    fontFamily: fontMono, fontSize: '11px', color: C.textMid,
                    lineHeight: '1.7',
                }}>
                    Ingest some conversations first. Insights emerge as your thinking graph grows.
                </div>
            </div>
        );
    }

    const { domain_breakdown, maturity_breakdown, total_thoughts, fastest_growing, stale_thoughts } = insights;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <StatCard label="Total Thoughts" value={total_thoughts} color={C.accent} />
                <StatCard label="Domains" value={Object.keys(domain_breakdown).length} color={C.cyan} />
            </div>

            {/* Maturity Distribution */}
            <SectionCard title="Maturity Distribution">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(maturity_breakdown).map(([key, count]) => {
                        const meta = MATURITY_META[key] || MATURITY_META.seed;
                        const pct = Math.round((count / total_thoughts) * 100);
                        return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontFamily: fontMono, fontSize: '11px', color: meta.color, width: '14px' }}>{meta.icon}</span>
                                <span style={{ fontFamily: fontMono, fontSize: '10px', color: C.textMid, width: '60px' }}>{meta.label}</span>
                                <div style={{ flex: 1, height: '4px', background: C.textGhost, borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: meta.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                                </div>
                                <span style={{ fontFamily: fontMono, fontSize: '10px', color: C.textDim, width: '30px', textAlign: 'right' }}>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            {/* Domain Breakdown */}
            <SectionCard title="Domain Landscape">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {Object.entries(domain_breakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([domain, count]) => {
                            const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS.general;
                            return (
                                <span key={domain} style={{
                                    padding: '4px 10px', borderRadius: '8px',
                                    background: `${color}10`,
                                    border: `1px solid ${color}20`,
                                    fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                    color: color,
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                }}>
                                    <span style={{ fontSize: '8px', opacity: 0.6 }}>●</span>
                                    {domain} ({count})
                                </span>
                            );
                        })}
                </div>
            </SectionCard>

            {/* Fastest Growing */}
            {fastest_growing?.length > 0 && (
                <SectionCard title="Fastest Growing" icon="↗" iconColor={C.accent}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {fastest_growing.map(t => (
                            <ThoughtRow
                                key={t.id}
                                title={t.title}
                                domain={t.domain}
                                badge={`v${Math.round(t.velocity_score * 100)}%`}
                                badgeColor={C.accent}
                            />
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Stale Thoughts */}
            {stale_thoughts?.length > 0 && (
                <SectionCard title="Fading Thoughts" icon="⏳" iconColor={C.gold}>
                    <div style={{
                        fontFamily: fontMono, fontSize: '10px', color: C.textMid,
                        marginBottom: '8px', lineHeight: '1.5',
                    }}>
                        These thoughts haven't been enriched in 2+ weeks. They may need fresh perspective.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {stale_thoughts.map(t => (
                            <ThoughtRow
                                key={t.id}
                                title={t.title}
                                domain={t.domain}
                                badge={`${Math.round((Date.now() - new Date(t.last_enriched).getTime()) / (1000*60*60*24))}d`}
                                badgeColor={C.gold}
                            />
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Deep Analysis CTA */}
            <motion.button
                onClick={onRunAnalysis}
                disabled={analyzing}
                whileHover={{ scale: analyzing ? 1 : 1.02 }}
                whileTap={{ scale: analyzing ? 1 : 0.98 }}
                style={{
                    width: '100%', padding: '14px',
                    borderRadius: '14px', border: 'none',
                    background: analyzing
                        ? 'rgba(255,255,255,0.03)'
                        : 'linear-gradient(135deg, rgba(0,229,160,0.12), rgba(61,214,245,0.08))',
                    color: analyzing ? C.textDim : C.accent,
                    fontFamily: fontMono, fontSize: '12px', fontWeight: 700,
                    cursor: analyzing ? 'wait' : 'pointer',
                    letterSpacing: '0.5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                }}
            >
                {analyzing ? (
                    <>
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                            style={{ display: 'inline-block' }}
                        >⟳</motion.span>
                        Analyzing thinking patterns...
                    </>
                ) : (
                    <>
                        <span>🔬</span>
                        Run Deep Analysis
                    </>
                )}
            </motion.button>

            {analysis && (
                <div style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: C.accentDim,
                    border: `1px solid ${C.accentBorder}`,
                    fontFamily: fontMono, fontSize: '10px', color: C.textMid,
                    lineHeight: '1.6',
                }}>
                    ✦ Last analysis found <strong style={{ color: C.accent }}>{analysis.summary.contradiction_count}</strong> contradictions
                    and <strong style={{ color: C.purple }}>{analysis.summary.gravity_well_count}</strong> gravity wells.
                    Check the dedicated tabs for details.
                </div>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Velocity Tab — How fast is understanding deepening
// ═══════════════════════════════════════════════════════════════════════════

function VelocityTab({ analysis, onRunAnalysis, analyzing, onThoughtClick }) {
    if (!analysis) {
        return (
            <NeedAnalysisPrompt
                title="Thought Velocity"
                description="Measure how rapidly your understanding deepens over time. Tracks your trajectory from surface questions to structural insight."
                onRunAnalysis={onRunAnalysis}
                analyzing={analyzing}
            />
        );
    }

    const { velocity } = analysis;
    if (!velocity || velocity.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontFamily: font, fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '8px' }}>
                    No velocity data
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '11px', color: C.textMid, lineHeight: '1.7' }}>
                    Velocity requires thoughts with 2+ history snapshots. Feed the same topic from multiple conversations to see velocity emerge.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                letterSpacing: '0.3px', lineHeight: '1.6', marginBottom: '4px',
            }}>
                How rapidly your understanding is deepening. Thoughts with multiple history snapshots are tracked.
            </div>

            {velocity.sort((a, b) => b.velocity_score - a.velocity_score).map((v, i) => (
                <motion.div
                    key={v.thought_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onThoughtClick?.({ id: v.thought_id })}
                    style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = C.surfaceHover;
                        e.currentTarget.style.borderColor = C.accentBorder;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = C.surface;
                        e.currentTarget.style.borderColor = C.border;
                    }}
                >
                    {/* Title + Trajectory */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                            fontFamily: fontMono, fontSize: '14px',
                            color: v.trajectory === 'accelerating' ? C.accent
                                : v.trajectory === 'breakthrough' ? C.gold
                                : C.textMid,
                        }}>
                            {TRAJECTORY_ICONS[v.trajectory] || '·'}
                        </span>
                        <span style={{
                            fontFamily: font, fontSize: '13px', fontWeight: 600,
                            color: C.text, flex: 1,
                        }}>{v.thought_title}</span>
                        <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: `${C.accent}15`,
                            border: `1px solid ${C.accent}25`,
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 700,
                            color: C.accent,
                        }}>{Math.round(v.velocity_score * 100)}%</span>
                    </div>

                    {/* Velocity bar */}
                    <div style={{
                        height: '3px', borderRadius: '2px',
                        background: C.textGhost, marginBottom: '8px',
                        overflow: 'hidden',
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${v.velocity_score * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{
                                height: '100%', borderRadius: '2px',
                                background: `linear-gradient(90deg, ${C.accent}80, ${C.cyan}80)`,
                            }}
                        />
                    </div>

                    {/* Description */}
                    {v.description && (
                        <div style={{
                            fontFamily: fontMono, fontSize: '10px',
                            color: C.textMid, lineHeight: '1.5', marginBottom: '6px',
                        }}>{v.description}</div>
                    )}

                    {/* Depth shift */}
                    {v.depth_shift && (
                        <div style={{
                            fontFamily: fontMono, fontSize: '9px',
                            color: C.textDim, lineHeight: '1.5',
                            paddingTop: '6px', borderTop: `1px solid ${C.textGhost}`,
                        }}>
                            <span style={{ color: C.accent, opacity: 0.6 }}>Shift:</span> {v.depth_shift}
                        </div>
                    )}

                    {/* Next frontier */}
                    {v.next_frontier && (
                        <div style={{
                            marginTop: '6px', padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'rgba(61,214,245,0.05)',
                            border: `1px solid rgba(61,214,245,0.1)`,
                            fontFamily: fontMono, fontSize: '10px',
                            color: C.cyan, lineHeight: '1.5',
                        }}>
                            <span style={{ opacity: 0.6 }}>Next frontier →</span> {v.next_frontier}
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Contradictions Tab — Where your AIs disagree
// ═══════════════════════════════════════════════════════════════════════════

function ContradictionsTab({ analysis, insights, onRunAnalysis, analyzing, onThoughtClick }) {
    // Show pre-computed contradiction links if available
    const hasPrecomputed = insights?.contradiction_links?.length > 0;
    const hasAnalysis = analysis?.contradictions?.length > 0;

    if (!hasPrecomputed && !hasAnalysis) {
        return (
            <NeedAnalysisPrompt
                title="Contradiction Detection"
                description="Your AIs don't always agree. Engram finds cases where different conversations or sources present conflicting information about the same topic."
                icon="⚡"
                color={C.contradict}
                onRunAnalysis={onRunAnalysis}
                analyzing={analyzing}
            />
        );
    }

    const contradictions = analysis?.contradictions || [];
    const precomputedLinks = insights?.contradiction_links || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                letterSpacing: '0.3px', lineHeight: '1.6', marginBottom: '4px',
            }}>
                Ideas that conflict with each other. Not all contradictions are bad — some represent valid different perspectives worth maintaining.
            </div>

            {/* Deep analysis contradictions */}
            {contradictions.map((c, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: C.surface,
                        border: `1px solid ${c.severity > 0.7 ? 'rgba(239,68,68,0.2)' : C.border}`,
                    }}
                >
                    {/* Nature badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: c.nature === 'direct' ? 'rgba(239,68,68,0.12)' 
                                : c.nature === 'outdated' ? 'rgba(251,191,36,0.12)' 
                                : 'rgba(167,139,250,0.12)',
                            border: `1px solid ${c.nature === 'direct' ? 'rgba(239,68,68,0.25)' 
                                : c.nature === 'outdated' ? 'rgba(251,191,36,0.25)' 
                                : 'rgba(167,139,250,0.25)'}`,
                            fontFamily: fontMono, fontSize: '9px', fontWeight: 700,
                            color: c.nature === 'direct' ? C.contradict 
                                : c.nature === 'outdated' ? C.gold 
                                : C.purple,
                            letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>{c.nature}</span>
                        <span style={{
                            fontFamily: fontMono, fontSize: '9px',
                            color: C.textDim,
                        }}>severity: {Math.round(c.severity * 100)}%</span>
                    </div>

                    {/* Thought A vs B */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                        <div
                            onClick={() => onThoughtClick?.({ id: c.thought_a_id })}
                            style={{
                                padding: '8px 10px', borderRadius: '8px',
                                background: 'rgba(239,68,68,0.04)',
                                border: `1px solid rgba(239,68,68,0.1)`,
                                fontFamily: font, fontSize: '12px', fontWeight: 600,
                                color: C.text, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            <span style={{ fontFamily: fontMono, fontSize: '9px', color: C.contradict, opacity: 0.6 }}>A</span>
                            {c.thought_a_title}
                        </div>
                        <div style={{
                            textAlign: 'center',
                            fontFamily: fontMono, fontSize: '10px', color: C.contradict, opacity: 0.4,
                        }}>⚡ contradicts ⚡</div>
                        <div
                            onClick={() => onThoughtClick?.({ id: c.thought_b_id })}
                            style={{
                                padding: '8px 10px', borderRadius: '8px',
                                background: 'rgba(239,68,68,0.04)',
                                border: `1px solid rgba(239,68,68,0.1)`,
                                fontFamily: font, fontSize: '12px', fontWeight: 600,
                                color: C.text, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            <span style={{ fontFamily: fontMono, fontSize: '9px', color: C.contradict, opacity: 0.6 }}>B</span>
                            {c.thought_b_title}
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{
                        fontFamily: fontMono, fontSize: '11px',
                        color: C.textMid, lineHeight: '1.6', marginBottom: '8px',
                    }}>{c.description}</div>

                    {/* Resolution hint */}
                    {c.resolution_hint && (
                        <div style={{
                            padding: '8px 10px', borderRadius: '8px',
                            background: C.accentDim,
                            border: `1px solid ${C.accentBorder}`,
                            fontFamily: fontMono, fontSize: '10px',
                            color: C.accent, lineHeight: '1.5',
                        }}>
                            <span style={{ opacity: 0.6 }}>Resolution →</span> {c.resolution_hint}
                        </div>
                    )}
                </motion.div>
            ))}

            {/* Pre-computed contradiction links (from insights) */}
            {!hasAnalysis && precomputedLinks.map((link, i) => (
                <div key={i} style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: C.surface,
                    border: `1px solid rgba(239,68,68,0.15)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: fontMono, fontSize: '11px', color: C.contradict }}>⚡</span>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontFamily: font, fontSize: '11px', fontWeight: 600,
                                color: C.text, marginBottom: '2px',
                            }}>{link.source_title}</div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '9px', color: C.contradict, opacity: 0.5,
                            }}>vs</div>
                            <div style={{
                                fontFamily: font, fontSize: '11px', fontWeight: 600,
                                color: C.text,
                            }}>{link.target_title}</div>
                        </div>
                    </div>
                    {link.reason && (
                        <div style={{
                            marginTop: '8px', fontFamily: fontMono, fontSize: '10px',
                            color: C.textMid, lineHeight: '1.5',
                        }}>{link.reason}</div>
                    )}
                </div>
            ))}

            {!hasAnalysis && (
                <DeepAnalysisButton onRunAnalysis={onRunAnalysis} analyzing={analyzing} label="Detect More Contradictions" />
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Gravity Wells Tab — The unsaid questions
// ═══════════════════════════════════════════════════════════════════════════

function GravityTab({ analysis, onRunAnalysis, analyzing, onThoughtClick }) {
    if (!analysis?.gravity_wells?.length) {
        return (
            <NeedAnalysisPrompt
                title="Gravity Wells"
                description="When 3+ thoughts orbit the same deeper question without directly addressing it — that's a gravity well. The thought you haven't thought yet. The question you keep circling without asking."
                icon="◉"
                color={C.purple}
                onRunAnalysis={onRunAnalysis}
                analyzing={analyzing}
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                letterSpacing: '0.3px', lineHeight: '1.6', marginBottom: '4px',
            }}>
                Core questions your thinking is orbiting — patterns you might not have noticed consciously.
            </div>

            {analysis.gravity_wells.map((well, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: `linear-gradient(135deg, rgba(167,139,250,0.04), rgba(0,229,160,0.02))`,
                        border: `1px solid rgba(167,139,250,0.15)`,
                    }}
                >
                    {/* Label + Pull Strength */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{
                            padding: '3px 10px', borderRadius: '8px',
                            background: 'rgba(167,139,250,0.12)',
                            border: '1px solid rgba(167,139,250,0.25)',
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 700,
                            color: C.purple, letterSpacing: '0.5px',
                        }}>{well.label}</span>
                        <span style={{
                            fontFamily: fontMono, fontSize: '9px', color: C.textDim,
                            marginLeft: 'auto',
                        }}>Pull: {Math.round(well.pull_strength * 100)}%</span>
                    </div>

                    {/* Core Question */}
                    <div style={{
                        fontFamily: font, fontSize: '15px', fontWeight: 700,
                        color: C.text, lineHeight: '1.4',
                        letterSpacing: '-0.2px', marginBottom: '10px',
                    }}>"{well.core_question}"</div>

                    {/* Insight */}
                    <div style={{
                        fontFamily: fontMono, fontSize: '11px',
                        color: C.textMid, lineHeight: '1.6', marginBottom: '12px',
                    }}>{well.insight}</div>

                    {/* Orbiting Thoughts */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{
                            fontFamily: fontMono, fontSize: '8px', fontWeight: 600,
                            color: C.textDim, letterSpacing: '1.5px', textTransform: 'uppercase',
                            marginBottom: '6px',
                        }}>Orbiting Thoughts ({well.orbiting_thoughts.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {well.orbiting_thoughts.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => onThoughtClick?.({ id: t.id })}
                                    style={{
                                        padding: '6px 10px', borderRadius: '8px',
                                        background: C.surface,
                                        border: `1px solid ${C.border}`,
                                        fontFamily: font, fontSize: '11px',
                                        color: C.text, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                                >
                                    <span style={{ fontFamily: fontMono, fontSize: '9px', color: C.purple, opacity: 0.5 }}>◦</span>
                                    {t.title}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggested Exploration */}
                    {well.suggested_exploration && (
                        <div style={{
                            padding: '10px 12px', borderRadius: '10px',
                            background: `linear-gradient(135deg, rgba(167,139,250,0.06), rgba(0,229,160,0.04))`,
                            border: '1px solid rgba(167,139,250,0.12)',
                        }}>
                            <div style={{
                                fontFamily: fontMono, fontSize: '8px', fontWeight: 600,
                                color: C.purple, letterSpacing: '1px', textTransform: 'uppercase',
                                marginBottom: '4px', opacity: 0.7,
                            }}>Explore This</div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '11px',
                                color: C.text, lineHeight: '1.5',
                            }}>{well.suggested_exploration}</div>
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, color }) {
    return (
        <div style={{
            padding: '14px', borderRadius: '14px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            textAlign: 'center',
        }}>
            <div style={{
                fontFamily: font, fontSize: '28px', fontWeight: 700,
                color: color, letterSpacing: '-1px',
                marginBottom: '2px',
            }}>{value}</div>
            <div style={{
                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
            }}>{label}</div>
        </div>
    );
}

function SectionCard({ title, icon, iconColor, children }) {
    return (
        <div style={{
            padding: '14px',
            borderRadius: '14px',
            background: C.surface,
            border: `1px solid ${C.border}`,
        }}>
            <div style={{
                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                color: C.textDim, letterSpacing: '1.5px', textTransform: 'uppercase',
                marginBottom: '10px',
                display: 'flex', alignItems: 'center', gap: '5px',
            }}>
                {icon && <span style={{ color: iconColor || C.textDim }}>{icon}</span>}
                {title}
            </div>
            {children}
        </div>
    );
}

function ThoughtRow({ title, domain, badge, badgeColor, onClick }) {
    const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS.general;
    return (
        <div
            onClick={onClick}
            style={{
                padding: '8px 10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.01)',
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: color, opacity: 0.5,
                flexShrink: 0,
            }} />
            <span style={{
                fontFamily: font, fontSize: '11px', fontWeight: 500,
                color: C.text, flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{title}</span>
            {badge && (
                <span style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 700,
                    color: badgeColor || C.textDim,
                    flexShrink: 0,
                }}>{badge}</span>
            )}
        </div>
    );
}

function NeedAnalysisPrompt({ title, description, icon, color, onRunAnalysis, analyzing }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
                width: '60px', height: '60px', margin: '0 auto 16px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${(color || C.accent)}15, transparent 70%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
            }}>{icon || '⬡'}</div>
            <div style={{
                fontFamily: font, fontSize: '16px', fontWeight: 700,
                color: C.text, marginBottom: '8px', letterSpacing: '-0.3px',
            }}>{title}</div>
            <div style={{
                fontFamily: fontMono, fontSize: '11px', color: C.textMid,
                lineHeight: '1.7', marginBottom: '20px',
            }}>{description}</div>
            <DeepAnalysisButton onRunAnalysis={onRunAnalysis} analyzing={analyzing} />
        </div>
    );
}

function DeepAnalysisButton({ onRunAnalysis, analyzing, label }) {
    return (
        <motion.button
            onClick={onRunAnalysis}
            disabled={analyzing}
            whileHover={{ scale: analyzing ? 1 : 1.03 }}
            whileTap={{ scale: analyzing ? 1 : 0.97 }}
            style={{
                padding: '12px 24px', borderRadius: '12px',
                border: 'none',
                background: analyzing
                    ? 'rgba(255,255,255,0.03)'
                    : 'linear-gradient(135deg, #00E5A0, #3DD6F5)',
                color: analyzing ? C.textDim : '#050508',
                fontFamily: fontMono, fontSize: '12px', fontWeight: 700,
                cursor: analyzing ? 'wait' : 'pointer',
                letterSpacing: '0.3px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%',
                boxShadow: analyzing ? 'none' : '0 4px 20px rgba(0, 229, 160, 0.2)',
            }}
        >
            {analyzing ? (
                <>
                    <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                        style={{ display: 'inline-block' }}
                    >⟳</motion.span>
                    Analyzing...
                </>
            ) : (
                <>🔬 {label || 'Run Deep Analysis'}</>
            )}
        </motion.button>
    );
}
