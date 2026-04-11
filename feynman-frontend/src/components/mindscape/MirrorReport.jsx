// ═══════════════════════════════════════════════════════════════════════════
// MirrorReport.jsx — Phase 5: The Mirror Report Reading Experience
// An intimate, narrative letter from the user's data back to themselves.
// Features: typewriter entrance, animated underline on final question,
//           shimmer top border, node trajectories, agent snapshot, archive.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";
const fontSerif = "Georgia, 'Times New Roman', serif";

// ─── Emotional Tone Colors ───────────────────────────────────────────────────
const TONE_COLORS = {
    turbulent: '#E85D4A',
    driven: '#1DB88A',
    stuck: '#F5A623',
    transforming: '#9B7FE8',
    reflective: '#5BA4F5',
    dormant: '#888780',
};

const AGENT_COLORS = {
    // Legacy 6
    critic:         { color: '#E85D4A', label: 'Critic' },
    dreamer:        { color: '#9B7FE8', label: 'Dreamer' },
    avoider:        { color: '#F5A623', label: 'Avoider' },
    ambitious_self: { color: '#1DB88A', label: 'Ambitious' },
    rationalist:    { color: '#5BA4F5', label: 'Rationalist' },
    shadow:         { color: '#D4678A', label: 'Shadow' },
    // Emotion Constellation — 16
    sentinel:       { color: '#E85D4A', label: 'Sentinel' },
    fury:           { color: '#FF4136', label: 'Fury' },
    euphoric:       { color: '#FFD700', label: 'Euphoric' },
    mourner:        { color: '#6B7B8D', label: 'Mourner' },
    believer:       { color: '#2ECC71', label: 'Believer' },
    purist:         { color: '#8B5CF6', label: 'Purist' },
    oracle:         { color: '#F59E0B', label: 'Oracle' },
    wanderer:       { color: '#06B6D4', label: 'Wanderer' },
    phantom:        { color: '#A3A3A3', label: 'Phantom' },
    exile:          { color: '#92400E', label: 'Exile' },
    crown:          { color: '#D4AF37', label: 'Crown' },
    mirror_agent:   { color: '#10B981', label: 'Mirror' },
    anchor:         { color: '#D4678A', label: 'Anchor' },
    torch:          { color: '#3B82F6', label: 'Torch' },
    void:           { color: '#EF4444', label: 'Void' },
    ghost:          { color: '#9CA3AF', label: 'Ghost' },
};

const NODE_TYPE_COLORS = {
    fear: '#E85D4A',
    goal: '#1DB88A',
    desire: '#9B7FE8',
    contradiction: '#F5A623',
    tension: '#E8834A',
    recurring_thought: '#5BA4F5',
};


// ─── Helper: split narrative into paragraphs + extract final question ────────
function splitNarrative(narrative) {
    if (!narrative) return { paragraphs: [], finalQuestion: '' };
    const paras = narrative.split('\n').filter(p => p.trim().length > 0);
    if (paras.length === 0) return { paragraphs: [], finalQuestion: '' };

    // The final paragraph is treated as the "question"
    const last = paras[paras.length - 1];
    const isQuestion = last.includes('?');
    if (isQuestion && paras.length > 1) {
        return {
            paragraphs: paras.slice(0, -1),
            finalQuestion: last,
        };
    }
    return { paragraphs: paras, finalQuestion: '' };
}


// ─── Format date range ──────────────────────────────────────────────────────
function formatDateRange(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const opts = { month: 'short', day: 'numeric' };
    const startStr = s.toLocaleDateString('en-US', opts);
    const endStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${startStr} — ${endStr}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// Main MirrorReport Component
// ═══════════════════════════════════════════════════════════════════════════

export default function MirrorReport({ isOpen, onClose }) {
    const [report, setReport] = useState(null);
    const [trajectories, setTrajectories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveHistory, setArchiveHistory] = useState([]);
    const [selectedArchiveReport, setSelectedArchiveReport] = useState(null);
    const [error, setError] = useState(null);

    // Fetch latest report
    const fetchLatest = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/mindmirror/mirror-report/latest');
            setReport(res.data.report);
            setTrajectories(res.data.nodeTrajectories || []);
        } catch (err) {
            console.error('Failed to fetch mirror report:', err);
            setError('Could not load your Mirror Report.');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen) fetchLatest();
    }, [isOpen, fetchLatest]);

    // Manual generate
    const handleGenerate = useCallback(async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await api.post('/api/mindmirror/mirror-report/generate');
            setReport(res.data.report);
            setTrajectories(res.data.nodeTrajectories || []);
        } catch (err) {
            console.error('Failed to generate report:', err);
            setError('Failed to generate report. Keep journaling and try again.');
        }
        setGenerating(false);
    }, []);

    // Fetch archive
    const handleOpenArchive = useCallback(async () => {
        setArchiveOpen(true);
        try {
            const res = await api.get('/api/mindmirror/mirror-report/history');
            setArchiveHistory(res.data.history || []);
        } catch (err) {
            console.error('Failed to fetch report history:', err);
        }
    }, []);

    // View a specific archived report
    const handleViewArchived = useCallback(async (reportId) => {
        // We only have summaries in archive; fetch full report from latest (if it matches) or just show excerpt
        const archived = archiveHistory.find(r => r.id === reportId);
        if (archived) {
            // We need to show the full report — fetch it
            try {
                const res = await api.get('/api/mindmirror/mirror-report/latest');
                // If the latest is this one, great
                if (res.data.report?.id === reportId) {
                    setSelectedArchiveReport(res.data.report);
                } else {
                    // Show partial data from archive
                    setSelectedArchiveReport({
                        ...archived,
                        narrative: archived.excerpt || 'Full report not available in archive view.',
                    });
                }
            } catch {
                setSelectedArchiveReport({
                    ...archived,
                    narrative: archived.excerpt || 'Full report not available.',
                });
            }
        }
        setArchiveOpen(false);
    }, [archiveHistory]);

    if (!isOpen) return null;

    const displayReport = selectedArchiveReport || report;
    const toneColor = TONE_COLORS[displayReport?.emotional_tone] || TONE_COLORS.reflective;

    return (
        <div style={{
            width: '100%', height: '100%', overflow: 'auto',
            background: '#08090E',
            fontFamily: font,
        }}>
            {/* CSS for animations */}
            <style>{`
                @keyframes mirrorShimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes underlineDraw {
                    from { stroke-dashoffset: 300; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes tonePulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
            `}</style>

            {loading ? (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', flexDirection: 'column', gap: '12px',
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        style={{
                            width: '24px', height: '24px',
                            border: '2px solid rgba(155,127,232,0.1)',
                            borderTop: '2px solid #9B7FE8', borderRadius: '50%',
                        }}
                    />
                    <span style={{
                        fontFamily: fontMono, fontSize: '11px',
                        color: 'rgba(232,244,253,0.2)', letterSpacing: '2px',
                        textTransform: 'uppercase',
                    }}>Loading your Mirror Report...</span>
                </div>
            ) : !displayReport ? (
                <EmptyState
                    onGenerate={handleGenerate}
                    generating={generating}
                    error={error}
                />
            ) : (
                <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px 60px' }}>
                    {/* Shimmer top border */}
                    <div style={{
                        height: '3px',
                        background: `linear-gradient(90deg, transparent, ${toneColor}, transparent)`,
                        backgroundSize: '200% 100%',
                        animation: 'mirrorShimmer 1.2s ease-out forwards',
                        marginBottom: '32px',
                    }} />

                    {/* Report Header */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        marginBottom: '28px',
                    }}>
                        <div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                color: 'rgba(232,244,253,0.25)', letterSpacing: '2px',
                                textTransform: 'uppercase', marginBottom: '4px',
                            }}>Mirror Report</div>
                            {selectedArchiveReport && (
                                <button
                                    onClick={() => setSelectedArchiveReport(null)}
                                    style={{
                                        background: 'none', border: 'none', color: 'rgba(232,244,253,0.3)',
                                        fontFamily: fontMono, fontSize: '10px', cursor: 'pointer',
                                        padding: 0, marginTop: '4px',
                                    }}
                                >← Back to latest</button>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                fontFamily: fontMono, fontSize: '11px',
                                color: 'rgba(232,244,253,0.3)',
                            }}>{formatDateRange(displayReport.week_start, displayReport.week_end)}</span>
                            <span style={{
                                padding: '3px 10px', borderRadius: '10px',
                                background: `${toneColor}15`,
                                color: toneColor,
                                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                letterSpacing: '0.5px', textTransform: 'capitalize',
                            }}>{displayReport.emotional_tone}</span>
                        </div>
                    </div>

                    {/* Narrative */}
                    <NarrativeRenderer
                        narrative={displayReport.narrative}
                        toneColor={toneColor}
                    />

                    {/* Metric pills */}
                    <div style={{
                        display: 'flex', gap: '10px', marginTop: '32px',
                        flexWrap: 'wrap',
                    }}>
                        <MetricPill
                            value={(displayReport.top_growing_nodes || []).length}
                            label="nodes growing"
                            color="#1DB88A"
                        />
                        <MetricPill
                            value={(displayReport.unresolved_nodes || []).length}
                            label="unresolved"
                            color="#F5A623"
                        />
                        <MetricPill
                            value={displayReport.resolution_count || 0}
                            label="resolved this week"
                            color="#5BA4F5"
                        />
                    </div>

                    {/* Node Trajectories */}
                    <TrajectorySection
                        growing={displayReport.top_growing_nodes || []}
                        fading={displayReport.top_fading_nodes || []}
                    />

                    {/* Agent Snapshot */}
                    {displayReport.agent_dominance_snapshot && (
                        <AgentSnapshotSection snapshot={displayReport.agent_dominance_snapshot} />
                    )}

                    {/* Actions bar */}
                    <div style={{
                        display: 'flex', gap: '10px', marginTop: '32px',
                        paddingTop: '20px',
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        <button
                            onClick={handleOpenArchive}
                            style={{
                                padding: '8px 16px', borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(255,255,255,0.02)',
                                color: 'rgba(232,244,253,0.4)',
                                fontFamily: fontMono, fontSize: '11px',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#e8f4fd'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,244,253,0.4)'}
                        >Past reports</button>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            style={{
                                padding: '8px 16px', borderRadius: '8px',
                                border: `1px solid ${toneColor}30`,
                                background: `${toneColor}08`,
                                color: toneColor,
                                fontFamily: fontMono, fontSize: '11px',
                                cursor: generating ? 'wait' : 'pointer',
                                transition: 'all 0.15s',
                                opacity: generating ? 0.5 : 1,
                            }}
                        >{generating ? 'Generating...' : '⟳ Generate new'}</button>
                    </div>
                </div>
            )}

            {/* Archive Modal */}
            <AnimatePresence>
                {archiveOpen && (
                    <ArchiveModal
                        history={archiveHistory}
                        onSelect={handleViewArchived}
                        onClose={() => setArchiveOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


// ─── Minimal Preview Card (for the right panel tab) ──────────────────────────
export function MirrorReportPreview({ report, onReadFull }) {
    if (!report) return null;

    const toneColor = TONE_COLORS[report.emotional_tone] || TONE_COLORS.reflective;
    const excerpt = report.narrative
        ? report.narrative.split(/[.!?]/).slice(0, 2).join('. ') + '.'
        : '';

    return (
        <div style={{
            padding: '14px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.015)',
            border: `1px solid rgba(255,255,255,0.04)`,
            borderTop: `2px solid ${toneColor}`,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '8px',
            }}>
                <span style={{
                    padding: '2px 8px', borderRadius: '8px',
                    background: `${toneColor}15`, color: toneColor,
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    textTransform: 'capitalize',
                }}>{report.emotional_tone}</span>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px',
                    color: 'rgba(232,244,253,0.2)',
                }}>{report.dominant_theme}</span>
            </div>
            <div style={{
                fontFamily: fontSerif, fontSize: '12px', lineHeight: '1.7',
                color: 'rgba(212,212,220,0.6)',
                marginBottom: '10px',
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{excerpt}</div>
            <button
                onClick={onReadFull}
                style={{
                    background: 'none', border: 'none', padding: 0,
                    color: toneColor, fontFamily: fontMono, fontSize: '10px',
                    cursor: 'pointer', fontWeight: 600,
                }}
            >Read full report →</button>
        </div>
    );
}


// ─── Narrative Renderer with Typewriter Entrance ─────────────────────────────
function NarrativeRenderer({ narrative, toneColor }) {
    const { paragraphs, finalQuestion } = splitNarrative(narrative);
    const [underlineReady, setUnderlineReady] = useState(false);

    useEffect(() => {
        const totalDelay = paragraphs.length * 200 + 400 + 600;
        const timer = setTimeout(() => setUnderlineReady(true), totalDelay);
        return () => clearTimeout(timer);
    }, [paragraphs.length]);

    return (
        <div>
            {paragraphs.map((para, i) => (
                <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2, duration: 0.4 }}
                    style={{
                        fontFamily: fontSerif, fontSize: '16px', lineHeight: '1.9',
                        color: '#D4D4DC', marginBottom: '16px',
                    }}
                >{para}</motion.p>
            ))}

            {finalQuestion && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: paragraphs.length * 0.2, duration: 0.4 }}
                    style={{
                        paddingLeft: '16px',
                        borderLeft: `2px solid ${toneColor}`,
                        marginTop: '28px',
                        position: 'relative',
                    }}
                >
                    <p style={{
                        fontFamily: fontSerif, fontSize: '18px', lineHeight: '1.9',
                        color: '#D4D4DC', fontStyle: 'italic', margin: 0,
                    }}>{finalQuestion}</p>

                    {/* Animated underline */}
                    {underlineReady && (
                        <svg
                            width="100%" height="4"
                            style={{
                                position: 'absolute', bottom: '-8px', left: '16px',
                                overflow: 'visible',
                            }}
                        >
                            <line
                                x1="0" y1="2" x2="100%" y2="2"
                                stroke={toneColor}
                                strokeWidth="1"
                                strokeDasharray="300"
                                strokeDashoffset="300"
                                style={{
                                    animation: 'underlineDraw 0.8s ease-out forwards',
                                    opacity: 0.5,
                                }}
                            />
                        </svg>
                    )}
                </motion.div>
            )}
        </div>
    );
}


// ─── Metric Pill ─────────────────────────────────────────────────────────────
function MetricPill({ value, label, color }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '8px',
            background: `${color}08`,
            border: `1px solid ${color}15`,
        }}>
            <span style={{
                fontFamily: font, fontSize: '14px', fontWeight: 700, color,
            }}>{value}</span>
            <span style={{
                fontFamily: fontMono, fontSize: '10px',
                color: 'rgba(232,244,253,0.3)',
            }}>{label}</span>
        </div>
    );
}


// ─── Node Trajectory Section ─────────────────────────────────────────────────
function TrajectorySection({ growing, fading }) {
    if (growing.length === 0 && fading.length === 0) return null;

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
            marginTop: '28px', paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
            <div>
                <div style={{
                    fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                    color: 'rgba(232,244,253,0.25)', letterSpacing: '1.5px',
                    textTransform: 'uppercase', marginBottom: '10px',
                }}>Growing in your mind</div>
                {growing.slice(0, 5).map((node, i) => (
                    <NodePill key={i} node={node} delta={node.growth_delta} direction="up" />
                ))}
                {growing.length === 0 && (
                    <span style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.15)' }}>
                        Nothing notably growing
                    </span>
                )}
            </div>
            <div>
                <div style={{
                    fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                    color: 'rgba(232,244,253,0.25)', letterSpacing: '1.5px',
                    textTransform: 'uppercase', marginBottom: '10px',
                }}>Fading from your mind</div>
                {fading.slice(0, 5).map((node, i) => (
                    <NodePill key={i} node={node} delta={node.decay_delta} direction="down" />
                ))}
                {fading.length === 0 && (
                    <span style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.15)' }}>
                        Nothing notably fading
                    </span>
                )}
            </div>
        </div>
    );
}


function NodePill({ node, delta, direction }) {
    const color = NODE_TYPE_COLORS[node.type] || '#5BA4F5';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 10px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.02)',
            marginBottom: '4px',
        }}>
            <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: color,
                boxShadow: `0 0 6px ${color}40`,
            }} />
            <span style={{
                fontFamily: fontMono, fontSize: '11px', color: '#D4D4DC',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>{node.label}</span>
            <span style={{
                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                color: direction === 'up' ? '#1DB88A' : '#E85D4A',
            }}>
                {direction === 'up' ? '+' : ''}{delta}
            </span>
        </div>
    );
}


// ─── Agent Snapshot Bar ──────────────────────────────────────────────────────
function AgentSnapshotSection({ snapshot }) {
    // Filter to agents with actual scores, sorted by dominance
    const agents = Object.entries(AGENT_COLORS)
        .map(([key, meta]) => ({ key, meta, score: snapshot[key]?.dominance_score || 0 }))
        .filter(a => a.score > 0)
        .sort((a, b) => b.score - a.score);

    const total = agents.reduce((s, a) => s + a.score, 0) || 1;

    if (agents.length === 0) return null;

    // Bar shows all agents with score; legend shows top 8
    const legendAgents = agents.slice(0, 8);

    return (
        <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
            <div style={{
                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                color: 'rgba(232,244,253,0.25)', letterSpacing: '1.5px',
                textTransform: 'uppercase', marginBottom: '12px',
            }}>Your inner voices this week</div>

            <div style={{
                display: 'flex', gap: '2px', height: '8px',
                borderRadius: '4px', overflow: 'hidden', marginBottom: '10px',
            }}>
                {agents.map(({ key, meta, score }) => {
                    const pct = (score / total) * 100;
                    return (
                        <div
                            key={key}
                            title={`${meta.label}: ${Math.round(pct)}%`}
                            style={{
                                width: `${Math.max(pct, 1.5)}%`,
                                background: meta.color,
                                opacity: 0.7,
                                transition: 'width 0.5s ease',
                            }}
                        />
                    );
                })}
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px',
            }}>
                {legendAgents.map(({ key, meta, score }) => {
                    const pct = Math.round((score / total) * 100);
                    return (
                        <div key={key} style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: meta.color,
                            }} />
                            <span style={{
                                fontFamily: fontMono, fontSize: '9px',
                                color: 'rgba(232,244,253,0.35)',
                            }}>{meta.label} {pct}%</span>
                        </div>
                    );
                })}
                {agents.length > 8 && (
                    <span style={{
                        fontFamily: fontMono, fontSize: '9px',
                        color: 'rgba(232,244,253,0.15)',
                    }}>+{agents.length - 8} more</span>
                )}
            </div>
        </div>
    );
}


// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onGenerate, generating, error }) {
    // Next Sunday
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    const nextSundayStr = nextSunday.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    });

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', padding: '40px',
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: '40px', marginBottom: '16px', opacity: 0.25,
            }}>◈</div>
            <div style={{
                fontFamily: font, fontSize: '17px', fontWeight: 600,
                color: 'rgba(232,244,253,0.35)', marginBottom: '8px',
            }}>Your Mirror is Forming</div>
            <div style={{
                fontFamily: fontMono, fontSize: '12px',
                color: 'rgba(232,244,253,0.15)', lineHeight: '1.6',
                maxWidth: '380px', marginBottom: '24px',
            }}>
                Your first Mirror Report will be ready on {nextSundayStr}.<br />
                Keep journaling — every entry feeds the mirror.
            </div>

            <button
                onClick={onGenerate}
                disabled={generating}
                style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: '1px solid rgba(155,127,232,0.2)',
                    background: 'rgba(155,127,232,0.08)',
                    color: '#9B7FE8', fontFamily: fontMono, fontSize: '11px',
                    fontWeight: 600, cursor: generating ? 'wait' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: generating ? 0.5 : 1,
                }}
            >
                {generating ? 'Generating...' : '✦ Generate now'}
            </button>

            {error && (
                <div style={{
                    marginTop: '12px', fontFamily: fontMono, fontSize: '10px',
                    color: '#E85D4A',
                }}>{error}</div>
            )}
        </div>
    );
}


// ─── Archive Modal ───────────────────────────────────────────────────────────
function ArchiveModal({ history, onSelect, onClose }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 500,
                background: 'rgba(5,5,8,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '440px', maxHeight: '70vh',
                    background: '#0D0F14',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px', overflow: 'hidden',
                }}
            >
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span style={{
                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                        color: 'rgba(232,244,253,0.4)', letterSpacing: '1px',
                        textTransform: 'uppercase',
                    }}>Past Reports</span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none',
                            color: 'rgba(232,244,253,0.3)', cursor: 'pointer',
                            fontSize: '16px',
                        }}
                    >×</button>
                </div>

                <div style={{ padding: '8px', maxHeight: '60vh', overflow: 'auto' }}>
                    {history.length === 0 ? (
                        <div style={{
                            padding: '40px 20px', textAlign: 'center',
                            fontFamily: fontMono, fontSize: '11px',
                            color: 'rgba(232,244,253,0.15)',
                        }}>No past reports yet</div>
                    ) : (
                        history.map(r => {
                            const toneColor = TONE_COLORS[r.emotional_tone] || TONE_COLORS.reflective;
                            return (
                                <button
                                    key={r.id}
                                    onClick={() => onSelect(r.id)}
                                    style={{
                                        width: '100%', padding: '12px 14px',
                                        borderRadius: '8px', border: 'none',
                                        background: 'rgba(255,255,255,0.015)',
                                        cursor: 'pointer', textAlign: 'left',
                                        marginBottom: '4px', transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{
                                            fontFamily: fontMono, fontSize: '11px',
                                            color: 'rgba(232,244,253,0.4)',
                                        }}>{formatDateRange(r.week_start, r.week_end)}</span>
                                        <span style={{
                                            padding: '2px 7px', borderRadius: '6px',
                                            background: `${toneColor}15`, color: toneColor,
                                            fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                            textTransform: 'capitalize',
                                        }}>{r.emotional_tone}</span>
                                    </div>
                                    <div style={{
                                        fontFamily: fontMono, fontSize: '10px',
                                        color: 'rgba(232,244,253,0.25)',
                                    }}>{r.dominant_theme}</div>
                                    {r.excerpt && (
                                        <div style={{
                                            fontFamily: fontSerif, fontSize: '11px',
                                            color: 'rgba(212,212,220,0.3)', lineHeight: '1.5',
                                            marginTop: '4px',
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>{r.excerpt}</div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
