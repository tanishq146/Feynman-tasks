import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { reviewNode, getNodeConnections, fetchFeynmanExtras, gradeChallenge, gradeTeach, generateMoment, fillKnowledgeGap } from '../../hooks/useBrainData';
import { timeUntilThreshold } from '../../hooks/useDecayTicker';
import ForgettingCurve from './ForgettingCurve';

// ─── Shared Styles ──────────────────────────────────────────────────────────
const textStyle = {
    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontSize: '13px',
    lineHeight: '1.7',
    color: 'rgba(232, 244, 253, 0.8)',
    margin: 0,
};
const sectionHeaderStyle = {
    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#4a9eba',
    marginBottom: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    userSelect: 'none',
};

// ─── Small Components ───────────────────────────────────────────────────────
function StrengthBar({ strength, status }) {
    const cls = status === 'critical' ? 'strength-critical' : status === 'fading' ? 'strength-fading' : 'strength-healthy';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div className="strength-bar-bg" style={{ flex: 1 }}>
                <div className={`strength-bar-fill ${cls}`} style={{ width: `${Math.max(2, strength)}%` }} />
            </div>
            <span style={{ fontFamily: "'SF Pro Text', -apple-system, sans-serif", fontSize: '13px', fontWeight: 600, color: status === 'critical' ? '#ff2d55' : status === 'fading' ? '#ff6b35' : '#00d4ff', minWidth: '36px', textAlign: 'right' }}>
                {Math.round(strength)}%
            </span>
        </div>
    );
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diffMins = Math.floor((new Date() - new Date(dateStr)) / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

function DecayStat({ label, value, color }) {
    return (
        <div style={{ padding: '6px 12px', borderRadius: '8px', background: `${color}08`, border: `1px solid ${color}20`, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
            <span style={{ fontFamily: "'SF Pro Text', -apple-system, sans-serif", fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ fontFamily: "'SF Pro Text', -apple-system, sans-serif", fontSize: '14px', fontWeight: 600, color }}>{value}</span>
        </div>
    );
}

function CollapsibleSection({ title, icon, defaultOpen = false, highlight = false, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={highlight ? { background: 'rgba(0, 212, 255, 0.03)', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(0, 212, 255, 0.08)' } : {}}>
            <div style={sectionHeaderStyle} onClick={() => setOpen(!open)}>
                <span>{icon && `${icon} `}{title}</span>
                <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <div className="section-header">{title}</div>
            {children}
        </div>
    );
}

function ScoreBar({ label, score, color = '#00d4ff', animate = false }) {
    return (
        <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ ...textStyle, fontSize: '11px', color: 'rgba(232,244,253,0.6)' }}>{label}</span>
                <span style={{ ...textStyle, fontSize: '11px', fontWeight: 600, color }}>{score}%</span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                    initial={animate ? { width: 0 } : false}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: '2px', background: color }}
                />
            </div>
        </div>
    );
}

function PulsingLoader({ text = 'Feynman is thinking...' }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4ff' }} />
            <span style={{ ...textStyle, fontSize: '12px', color: '#4a9eba', letterSpacing: '0.5px' }}>{text}</span>
        </div>
    );
}

// ─── Verdict Colors ─────────────────────────────────────────────────────────
const verdictColors = { 'Master': '#ffd700', 'Understands': '#00d4ff', 'Partial': '#ffaa00', 'Memorized': '#ff6b35', 'Missing It': '#ff2d55' };
const difficultyColors = { beginner: '#00ff88', intermediate: '#ffaa00', advanced: '#ff2d55' };

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ═════════════════════════════════════════════════════════════════════════════
export default function FeynmanPanel() {
    const selectedNode = useBrainStore((s) => s.selectedNode);
    const isOpen = useBrainStore((s) => s.isFeynmanPanelOpen);
    const clearSelection = useBrainStore((s) => s.clearSelection);
    const selectNode = useBrainStore((s) => s.selectNode);
    const updateNode = useBrainStore((s) => s.updateNode);
    const addToast = useBrainStore((s) => s.addToast);
    const nodes = useBrainStore((s) => s.nodes);

    const [connections, setConnections] = useState([]);
    const [reviewing, setReviewing] = useState(false);

    // ── Extras state ──
    const [extras, setExtras] = useState(null);
    const [extrasLoading, setExtrasLoading] = useState(false);
    const [challengeAnswer, setChallengeAnswer] = useState('');
    const [challengeResult, setChallengeResult] = useState(null);
    const [challengeGrading, setChallengeGrading] = useState(false);
    const [teachExplanation, setTeachExplanation] = useState('');
    const [teachResult, setTeachResult] = useState(null);
    const [teachGrading, setTeachGrading] = useState(false);
    const [momentLoading, setMomentLoading] = useState(false);
    const [momentCount, setMomentCount] = useState(1);
    const [fillingGap, setFillingGap] = useState(null);

    // Fetch connections
    useEffect(() => {
        if (selectedNode?.id) {
            getNodeConnections(selectedNode.id).then(setConnections).catch(() => setConnections([]));
        } else {
            setConnections([]);
        }
    }, [selectedNode?.id]);

    // Fetch extras when panel opens and feynman exists
    useEffect(() => {
        if (selectedNode?.id && selectedNode?.feynman) {
            const f = selectedNode.feynman;
            if (f.challenge_question && f.knowledge_gaps && f.real_life_moment) {
                setExtras({ challenge_question: f.challenge_question, knowledge_gaps: f.knowledge_gaps, real_life_moment: f.real_life_moment, challenge_attempts: f.challenge_attempts || [], teach_attempts: f.teach_attempts || [], feynman_certified: f.feynman_certified || false });
            } else {
                setExtrasLoading(true);
                fetchFeynmanExtras(selectedNode.id)
                    .then((data) => { setExtras(data); setExtrasLoading(false); })
                    .catch(() => setExtrasLoading(false));
            }
        }
        // Reset state on node change  
        setChallengeAnswer(''); setChallengeResult(null); setTeachExplanation(''); setTeachResult(null); setMomentCount(1);
    }, [selectedNode?.id, selectedNode?.feynman]);

    const handleReview = async () => {
        if (!selectedNode || reviewing) return;
        setReviewing(true);
        try {
            const updated = await reviewNode(selectedNode.id);
            updateNode(selectedNode.id, { current_strength: updated.current_strength, status: updated.status, last_reviewed_at: updated.last_reviewed_at, decay_rate: updated.decay_rate });
            addToast({ type: 'success', icon: '📖', message: `Reviewed "${selectedNode.title}" — strength reset!`, duration: 3000 });
        } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to review node', duration: 4000 }); }
        finally { setReviewing(false); }
    };

    const handleChallengeSubmit = async () => {
        if (!challengeAnswer.trim() || challengeGrading) return;
        setChallengeGrading(true);
        try {
            const result = await gradeChallenge(selectedNode.id, challengeAnswer);
            setChallengeResult(result);
        } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to grade challenge', duration: 4000 }); }
        finally { setChallengeGrading(false); }
    };

    const handleTeachSubmit = async () => {
        if (!teachExplanation.trim() || teachGrading) return;
        setTeachGrading(true);
        try {
            const result = await gradeTeach(selectedNode.id, teachExplanation);
            setTeachResult(result);
            if (result.passed) {
                addToast({ type: 'success', icon: '🎓', message: `Feynman Certified! Decay rate reduced.`, duration: 5000 });
            }
        } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to grade explanation', duration: 4000 }); }
        finally { setTeachGrading(false); }
    };

    const handleNewMoment = async () => {
        if (momentLoading) return;
        setMomentLoading(true);
        try {
            const result = await generateMoment(selectedNode.id);
            setExtras(prev => prev ? { ...prev, real_life_moment: result.moment } : prev);
            setMomentCount(c => c + 1);
        } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to generate moment', duration: 4000 }); }
        finally { setMomentLoading(false); }
    };

    const handleFillGap = async (gap, index) => {
        if (fillingGap !== null) return;
        setFillingGap(index);
        try {
            const content = `${gap.title}: ${gap.teaser}. ${gap.why_it_matters}`;
            await fillKnowledgeGap(content);
            setExtras(prev => {
                if (!prev) return prev;
                const gaps = [...prev.knowledge_gaps];
                gaps[index] = { ...gaps[index], filled: true };
                return { ...prev, knowledge_gaps: gaps };
            });
            addToast({ type: 'success', icon: '◈', message: `Added "${gap.title}" to your brain!`, duration: 4000 });
        } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to add knowledge gap', duration: 4000 }); }
        finally { setFillingGap(null); }
    };

    const feynman = selectedNode?.feynman;

    return (
        <AnimatePresence>
            {isOpen && selectedNode && (
                <>
                    {/* Backdrop */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={clearSelection} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 55 }} />

                    {/* Panel */}
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '60vh', maxHeight: '700px', zIndex: 60, background: 'rgba(2,8,20,0.96)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderTop: '1px solid rgba(0,212,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <span style={{ color: '#00d4ff', fontSize: '14px' }}>✦</span>
                                    <h2 style={{ fontFamily: "'SF Pro Display', -apple-system, sans-serif", fontSize: '18px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selectedNode.title}
                                    </h2>
                                    {extras?.feynman_certified && <span style={{ fontSize: '12px', color: '#00ff88', background: 'rgba(0,255,136,0.1)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(0,255,136,0.2)', fontFamily: "'SF Pro Text', sans-serif", fontWeight: 600, letterSpacing: '0.5px' }}>✓ Certified</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ flex: 1, maxWidth: '200px' }}><StrengthBar strength={selectedNode.current_strength} status={selectedNode.status} /></div>
                                    <span style={{ fontFamily: "'SF Pro Text', sans-serif", fontSize: '11px', color: '#4a9eba', letterSpacing: '0.5px', flexShrink: 0 }}>{timeAgo(selectedNode.created_at)}</span>
                                    {selectedNode.brain_region && <span style={{ fontFamily: "'SF Pro Text', sans-serif", fontSize: '10px', color: '#7c3aed', letterSpacing: '0.5px', padding: '3px 8px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', flexShrink: 0 }}>{selectedNode.brain_region.replace('_', ' ')}</span>}
                                </div>
                            </div>
                            <button onClick={clearSelection} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4a9eba', fontSize: '16px', flexShrink: 0, marginLeft: '16px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e8f4fd'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#4a9eba'; }}>✕</button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
                            {feynman ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                    {/* ═══ FEATURE 4: REAL LIFE MOMENT ═══ */}
                                    {(extras?.real_life_moment || extrasLoading) && (
                                        <RealLifeMoment moment={extras?.real_life_moment} loading={extrasLoading || momentLoading} count={momentCount} onRefresh={handleNewMoment} />
                                    )}

                                    {/* Forgetting Curve */}
                                    <Section title="Memory Decay — Forgetting Curve">
                                        <ForgettingCurve decayRate={selectedNode.decay_rate} lastReviewedAt={selectedNode.last_reviewed_at} currentStrength={selectedNode.current_strength} status={selectedNode.status} />
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                                            <DecayStat label="Strength" value={`${Math.round(selectedNode.current_strength)}%`} color={selectedNode.status === 'critical' ? '#ff2d55' : selectedNode.status === 'fading' ? '#ff6b35' : '#00d4ff'} />
                                            <DecayStat label="Decay Rate" value={`${(selectedNode.decay_rate * 100).toFixed(1)}%/day`} color="#7c3aed" />
                                            {selectedNode.current_strength >= 70 && <DecayStat label="Fading in" value={timeUntilThreshold(selectedNode.decay_rate, selectedNode.last_reviewed_at, 70)} color="#ff6b35" />}
                                            {selectedNode.current_strength >= 30 && <DecayStat label="Critical in" value={timeUntilThreshold(selectedNode.decay_rate, selectedNode.last_reviewed_at, 30)} color="#ff2d55" />}
                                        </div>
                                    </Section>

                                    {/* Summary */}
                                    {selectedNode.summary && <Section title="Summary"><p style={textStyle}>{selectedNode.summary}</p></Section>}

                                    {/* Why you learned this */}
                                    {feynman.why_important && <Section title="Why you learned this"><p style={textStyle}>{feynman.why_important}</p></Section>}

                                    {/* Simple explanation */}
                                    {feynman.simple_explanation && <Section title="Simple Explanation"><p style={textStyle}>{feynman.simple_explanation}</p></Section>}

                                    {/* ═══ FEATURE 1: FEYNMAN CHALLENGE ═══ */}
                                    {(extras?.challenge_question || extrasLoading) && (
                                        <CollapsibleSection title="FEYNMAN CHALLENGE" icon="🎯">
                                            <FeynmanChallenge question={extras?.challenge_question} loading={extrasLoading} answer={challengeAnswer} setAnswer={setChallengeAnswer} result={challengeResult} grading={challengeGrading} onSubmit={handleChallengeSubmit} />
                                        </CollapsibleSection>
                                    )}

                                    {/* ═══ FEATURE 2: TEACH IT ═══ */}
                                    {feynman && (
                                        <CollapsibleSection title="THE FEYNMAN TEST" icon="✦" highlight>
                                            <TeachIt nodeTitle={selectedNode.title} explanation={teachExplanation} setExplanation={setTeachExplanation} result={teachResult} grading={teachGrading} onSubmit={handleTeachSubmit} />
                                        </CollapsibleSection>
                                    )}

                                    {/* Applications */}
                                    {feynman.real_world_applications?.length > 0 && (
                                        <Section title="Real World Applications">
                                            <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'none' }}>
                                                {feynman.real_world_applications.map((app, i) => (
                                                    <li key={i} style={{ ...textStyle, marginBottom: '6px', display: 'flex', gap: '8px' }}>
                                                        <span style={{ color: '#00d4ff', flexShrink: 0 }}>→</span><span>{app}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Section>
                                    )}

                                    {/* Connected Nodes */}
                                    {connections.length > 0 && (
                                        <Section title="Connected To">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {connections.map((conn) => {
                                                    const connNode = nodes.find(n => n.id === conn.connected_node_id);
                                                    const typeColors = {
                                                        supports: { bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)', text: '#00ff88', label: 'Supports' },
                                                        contradicts: { bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.2)', text: '#ff6b35', label: 'Contradicts' },
                                                        extends: { bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)', text: '#00d4ff', label: 'Extends' },
                                                        requires: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', text: '#7c3aed', label: 'Requires' },
                                                        example_of: { bg: 'rgba(255,170,0,0.08)', border: 'rgba(255,170,0,0.2)', text: '#ffaa00', label: 'Example of' },
                                                    };
                                                    const t = typeColors[conn.connection_type] || typeColors.supports;
                                                    return (
                                                        <button key={conn.id} onClick={() => selectNode(conn.connected_node_id)} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 14px', borderRadius: '10px', background: t.bg, border: `1px solid ${t.border}`, cursor: connNode ? 'pointer' : 'default', textAlign: 'left', transition: 'all 0.2s', width: '100%' }} onMouseEnter={e => { e.currentTarget.style.background = t.border; e.currentTarget.style.boxShadow = `0 0 15px ${t.border}`; }} onMouseLeave={e => { e.currentTarget.style.background = t.bg; e.currentTarget.style.boxShadow = 'none'; }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ color: t.text, fontSize: '12px', flexShrink: 0 }}>◉</span>
                                                                <span style={{ fontFamily: "'SF Pro Display', sans-serif", fontSize: '13px', fontWeight: 600, color: '#e8f4fd', flex: 1 }}>{conn.connected_node_title}</span>
                                                                <span style={{ fontFamily: "'SF Pro Text', sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: t.text, padding: '2px 8px', borderRadius: '6px', background: t.bg, border: `1px solid ${t.border}`, flexShrink: 0 }}>{t.label}</span>
                                                            </div>
                                                            {conn.reason && <div style={{ fontFamily: "'SF Pro Text', sans-serif", fontSize: '11px', lineHeight: '1.5', color: 'rgba(232,244,253,0.55)', paddingLeft: '20px' }}>{conn.reason}</div>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Section>
                                    )}

                                    {/* ═══ FEATURE 3: KNOWLEDGE GAPS ═══ */}
                                    {(extras?.knowledge_gaps?.length > 0 || extrasLoading) && (
                                        <CollapsibleSection title="KNOWLEDGE GAPS" icon="◈">
                                            <KnowledgeGaps gaps={extras?.knowledge_gaps || []} loading={extrasLoading} fillingGap={fillingGap} onFillGap={handleFillGap} />
                                        </CollapsibleSection>
                                    )}

                                    {/* Tags */}
                                    {selectedNode.tags?.length > 0 && (
                                        <Section title="Tags">
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {selectedNode.tags.map((tag, i) => (
                                                    <span key={i} style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', fontFamily: "'SF Pro Text', sans-serif", fontSize: '11px', color: '#7c3aed' }}>{tag}</span>
                                                ))}
                                            </div>
                                        </Section>
                                    )}
                                </div>
                            ) : (
                                /* Loading state */
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                                    {selectedNode.summary && <Section title="Summary"><p style={textStyle}>{selectedNode.summary}</p></Section>}
                                    {connections.length > 0 && (
                                        <Section title="Connected To">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {connections.map(conn => (
                                                    <button key={conn.id} onClick={() => selectNode(conn.connected_node_id)} className="tag-pill" style={{ textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '8px 12px' }}>
                                                        <span>◉ {conn.connected_node_title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </Section>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', marginTop: '16px' }}>
                                        <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,212,255,0.15)', borderTop: '2px solid #00d4ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        <span style={{ fontFamily: "'SF Pro Text', sans-serif", fontSize: '13px', color: '#4a9eba', letterSpacing: '0.5px' }}>Feynman is analyzing...</span>
                                    </div>
                                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                </div>
                            )}
                        </div>

                        {/* Footer: Review Button */}
                        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                            <motion.button whileHover={{ scale: 1.01, boxShadow: '0 0 30px rgba(0,212,255,0.15)' }} whileTap={{ scale: 0.98 }} onClick={handleReview} disabled={reviewing} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: reviewing ? 'rgba(0,212,255,0.05)' : 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', fontFamily: "'SF Pro Display', sans-serif", fontSize: '13px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', cursor: reviewing ? 'wait' : 'pointer', transition: 'all 0.3s', opacity: reviewing ? 0.5 : 1, boxShadow: '0 0 20px rgba(0,212,255,0.05)' }}>
                                {reviewing ? 'Reviewing...' : 'Review — Reset Strength to 100%'}
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Real Life Moment Component
// ═════════════════════════════════════════════════════════════════════════════
function RealLifeMoment({ moment, loading, count, onRefresh }) {
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '12px', padding: '16px 18px', position: 'relative', boxShadow: '0 0 20px rgba(0,212,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>⚡</span>
                    <span style={{ ...sectionHeaderStyle, marginBottom: 0, cursor: 'default' }}>RIGHT NOW</span>
                </div>
                <span style={{ ...textStyle, fontSize: '10px', color: 'rgba(232,244,253,0.35)' }}>Moment {count} of ∞</span>
            </div>
            {loading ? <PulsingLoader text="Generating moment..." /> : (
                <AnimatePresence mode="wait">
                    <motion.p key={moment} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ ...textStyle, fontSize: '14px', lineHeight: '1.8', color: '#e8f4fd', fontStyle: 'italic' }}>
                        "{moment}"
                    </motion.p>
                </AnimatePresence>
            )}
            <button onClick={onRefresh} disabled={loading} style={{ marginTop: '10px', background: 'none', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '8px', padding: '6px 14px', color: '#4a9eba', fontSize: '11px', fontFamily: "'SF Pro Text', sans-serif", cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s', opacity: loading ? 0.4 : 1 }} onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)'; }}>
                🔄 Generate new moment
            </button>
        </motion.div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — Feynman Challenge Component
// ═════════════════════════════════════════════════════════════════════════════
function FeynmanChallenge({ question, loading, answer, setAnswer, result, grading, onSubmit }) {
    if (loading) return <PulsingLoader />;
    return (
        <div>
            <p style={{ ...textStyle, marginBottom: '14px', color: '#e8f4fd', fontWeight: 500 }}>{question}</p>
            {!result ? (
                <>
                    <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer..." rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px', color: '#e8f4fd', fontFamily: "'SF Pro Text', sans-serif", fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = 'rgba(0,212,255,0.3)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSubmit} disabled={grading || !answer.trim()} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '10px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', fontFamily: "'SF Pro Text', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: grading ? 'wait' : 'pointer', opacity: grading || !answer.trim() ? 0.4 : 1 }}>
                        {grading ? 'Grading...' : 'Submit Answer'}
                    </motion.button>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ScoreBar label="Score" score={result.score} color={verdictColors[result.verdict] || '#00d4ff'} animate />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
                        <span style={{ fontFamily: "'SF Pro Display', sans-serif", fontSize: '14px', fontWeight: 700, color: verdictColors[result.verdict], padding: '4px 14px', borderRadius: '8px', background: `${verdictColors[result.verdict]}15`, border: `1px solid ${verdictColors[result.verdict]}30` }}>{result.verdict}</span>
                    </div>
                    <p style={{ ...textStyle, marginBottom: '12px' }}>{result.feedback}</p>
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.12)' }}>
                        <span style={{ ...textStyle, fontSize: '10px', color: '#ffd700', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>The Key Insight</span>
                        <p style={{ ...textStyle, marginTop: '6px', color: '#e8f4fd' }}>{result.the_key_insight}</p>
                    </div>
                    {result.score < 70 && <p style={{ ...textStyle, marginTop: '12px', color: '#ff6b35', fontSize: '12px' }}>Review this node and try again tomorrow</p>}
                    {result.score >= 90 && <p style={{ ...textStyle, marginTop: '12px', color: '#ffd700', fontSize: '12px' }}>✦ You own this knowledge</p>}
                </motion.div>
            )}
        </div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — Teach It Component
// ═════════════════════════════════════════════════════════════════════════════
function TeachIt({ nodeTitle, explanation, setExplanation, result, grading, onSubmit }) {
    const charCount = explanation.length;
    return (
        <div>
            <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)', marginBottom: '14px' }}>
                <p style={{ ...textStyle, fontSize: '12px', color: '#4a9eba', fontStyle: 'italic', lineHeight: '1.7' }}>
                    "If you can't explain it simply, you don't understand it well enough."<br />
                    <span style={{ color: 'rgba(232,244,253,0.4)', fontSize: '11px' }}>— Richard Feynman</span>
                </p>
                <p style={{ ...textStyle, marginTop: '10px', color: '#e8f4fd' }}>
                    Explain <strong>{nodeTitle}</strong> to a 12-year-old. No jargon. No technical terms. Pure understanding. You have 3 sentences.
                </p>
            </div>
            {!result ? (
                <>
                    <textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Explain it simply..." rows={3} maxLength={500} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px', color: '#e8f4fd', fontFamily: "'SF Pro Text', sans-serif", fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = 'rgba(0,212,255,0.3)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ ...textStyle, fontSize: '10px', color: charCount >= 200 && charCount <= 400 ? '#00ff88' : charCount > 400 ? '#ff6b35' : 'rgba(232,244,253,0.35)' }}>{charCount}/400 characters</span>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSubmit} disabled={grading || !explanation.trim()} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', fontFamily: "'SF Pro Text', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: grading ? 'wait' : 'pointer', opacity: grading || !explanation.trim() ? 0.4 : 1 }}>
                            {grading ? 'Testing...' : 'Test My Understanding'}
                        </motion.button>
                    </div>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ScoreBar label="Clarity" score={result.clarity_score} color="#00d4ff" animate />
                    <ScoreBar label="Simplicity" score={result.simplicity_score} color="#00ff88" animate />
                    <ScoreBar label="Accuracy" score={result.accuracy_score} color="#7c3aed" animate />
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                    <ScoreBar label="Overall" score={result.overall} color={result.passed ? '#00ff88' : '#ff6b35'} animate />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
                        {result.passed ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }} style={{ fontSize: '20px' }}>✅</motion.span>
                        ) : (
                            <span style={{ fontSize: '20px' }}>❌</span>
                        )}
                        <span style={{ fontFamily: "'SF Pro Display', sans-serif", fontSize: '14px', fontWeight: 700, color: result.passed ? '#00ff88' : '#ff6b35' }}>{result.passed ? 'PASSED — Feynman Certified!' : 'NOT YET'}</span>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.1)', marginBottom: '12px' }}>
                        <span style={{ ...textStyle, fontSize: '10px', color: '#4a9eba', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>Feynman Says</span>
                        <p style={{ ...textStyle, marginTop: '8px', fontStyle: 'italic', color: '#e8f4fd' }}>"{result.feynman_says}"</p>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)' }}>
                        <span style={{ ...textStyle, fontSize: '10px', color: '#00ff88', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>How Feynman Would Say It</span>
                        <p style={{ ...textStyle, marginTop: '8px', color: '#e8f4fd' }}>"{result.simpler_version}"</p>
                    </div>
                    {!result.passed && <p style={{ ...textStyle, marginTop: '12px', color: '#4a9eba', fontSize: '12px' }}>Try again — simplicity takes more effort than complexity</p>}
                </motion.div>
            )}
        </div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — Knowledge Gaps Component
// ═════════════════════════════════════════════════════════════════════════════
function KnowledgeGaps({ gaps, loading, fillingGap, onFillGap }) {
    if (loading) return <PulsingLoader text="Discovering knowledge gaps..." />;
    if (!gaps || gaps.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {gaps.map((gap, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} style={{ padding: '14px 16px', borderRadius: '10px', border: `1px dashed ${gap.filled ? 'rgba(0,255,136,0.2)' : 'rgba(0,212,255,0.15)'}`, background: gap.filled ? 'rgba(0,255,136,0.03)' : 'rgba(2,8,20,0.5)', opacity: gap.filled ? 0.6 : 1, transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ color: '#00d4ff', fontSize: '12px' }}>◈</span>
                                <span style={{ fontFamily: "'SF Pro Display', sans-serif", fontSize: '13px', fontWeight: 600, color: '#e8f4fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{gap.title}</span>
                                <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', background: `${difficultyColors[gap.difficulty]}10`, border: `1px solid ${difficultyColors[gap.difficulty]}25`, color: difficultyColors[gap.difficulty], fontFamily: "'SF Pro Text', sans-serif", fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{gap.difficulty}</span>
                            </div>
                            <p style={{ ...textStyle, fontSize: '12px', marginBottom: '4px' }}>{gap.teaser}</p>
                            <p style={{ ...textStyle, fontSize: '11px', color: 'rgba(232,244,253,0.45)' }}>Why it matters: {gap.why_it_matters}</p>
                        </div>
                        {!gap.filled ? (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onFillGap(gap, i)} disabled={fillingGap !== null} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', fontFamily: "'SF Pro Text', sans-serif", fontSize: '11px', fontWeight: 600, cursor: fillingGap !== null ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: fillingGap !== null ? 0.4 : 1, letterSpacing: '0.5px' }}>
                                {fillingGap === i ? '...' : 'ADD →'}
                            </motion.button>
                        ) : (
                            <span style={{ color: '#00ff88', fontSize: '16px' }}>✓</span>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
