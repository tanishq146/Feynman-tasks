import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { reviewNode, getNodeConnections, fetchFeynmanExtras, gradeChallenge, gradeTeach, generateMoment, fillKnowledgeGap, deleteNode, toggleCrucial } from '../../hooks/useBrainData';
import { timeUntilThreshold } from '../../hooks/useDecayTicker';
import ForgettingCurve from './ForgettingCurve';
import { sf, sfT, body, timeAgo, Icons, GlassCard, SectionHead, Accordion, Metric, StrengthBar, Loader, RealLifeMoment, FeynmanChallenge, TeachIt, KnowledgeGaps } from './FeynmanPanelSections';

const TABS = [
    { key: 'overview', label: 'Overview', icon: (c) => Icons.node(c, 12) },
    { key: 'memory', label: 'Memory', icon: (c) => Icons.chart(c, 12) },
    { key: 'challenge', label: 'Challenge', icon: (c) => Icons.target(c, 12) },
    { key: 'network', label: 'Network', icon: (c) => Icons.diamond(c, 12) },
];

export default function FeynmanPanel() {
    const selectedNode = useBrainStore(s => s.selectedNode);
    const isOpen = useBrainStore(s => s.isFeynmanPanelOpen);
    const clearSelection = useBrainStore(s => s.clearSelection);
    const selectNode = useBrainStore(s => s.selectNode);
    const updateNode = useBrainStore(s => s.updateNode);
    const removeNode = useBrainStore(s => s.removeNode);
    const addToast = useBrainStore(s => s.addToast);
    const openNotesPanel = useBrainStore(s => s.openNotesPanel);
    const nodes = useBrainStore(s => s.nodes);

    const [connections, setConnections] = useState([]);
    const [reviewing, setReviewing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
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
    const [togglingCrucial, setTogglingCrucial] = useState(false);

    useEffect(() => { if (selectedNode?.id) getNodeConnections(selectedNode.id).then(setConnections).catch(() => setConnections([])); else setConnections([]); }, [selectedNode?.id]);

    useEffect(() => {
        if (selectedNode?.id && selectedNode?.feynman) {
            const f = selectedNode.feynman;
            if (f.challenge_question && f.knowledge_gaps && f.real_life_moment) {
                setExtras({ challenge_question: f.challenge_question, knowledge_gaps: f.knowledge_gaps, real_life_moment: f.real_life_moment, challenge_attempts: f.challenge_attempts || [], teach_attempts: f.teach_attempts || [], feynman_certified: f.feynman_certified || false });
            } else { setExtrasLoading(true); fetchFeynmanExtras(selectedNode.id).then(d => { setExtras(d); setExtrasLoading(false); }).catch(() => setExtrasLoading(false)); }
        }
        setChallengeAnswer(''); setChallengeResult(null); setTeachExplanation(''); setTeachResult(null); setMomentCount(1); setIsExpanded(false); setActiveTab('overview');
    }, [selectedNode?.id, selectedNode?.feynman]);

    const handleReview = async () => { if (!selectedNode || reviewing) return; setReviewing(true); try { const u = await reviewNode(selectedNode.id); updateNode(selectedNode.id, { current_strength: u.current_strength, status: u.status, last_reviewed_at: u.last_reviewed_at, decay_rate: u.decay_rate }); addToast({ type: 'success', icon: '✦', message: `Reviewed "${selectedNode.title}"`, duration: 3000 }); } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to review', duration: 4000 }); } finally { setReviewing(false); } };
    const handleChallengeSubmit = async () => { if (!challengeAnswer.trim() || challengeGrading) return; setChallengeGrading(true); try { setChallengeResult(await gradeChallenge(selectedNode.id, challengeAnswer)); } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to grade', duration: 4000 }); } finally { setChallengeGrading(false); } };
    const handleTeachSubmit = async () => { if (!teachExplanation.trim() || teachGrading) return; setTeachGrading(true); try { const r = await gradeTeach(selectedNode.id, teachExplanation); setTeachResult(r); if (r.passed) addToast({ type: 'success', icon: '✦', message: 'Feynman Certified!', duration: 5000 }); } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to grade', duration: 4000 }); } finally { setTeachGrading(false); } };
    const handleNewMoment = async () => { if (momentLoading) return; setMomentLoading(true); try { const r = await generateMoment(selectedNode.id); setExtras(p => p ? { ...p, real_life_moment: r.moment } : p); setMomentCount(c => c + 1); } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to generate', duration: 4000 }); } finally { setMomentLoading(false); } };
    const handleFillGap = async (gap, i) => { if (fillingGap !== null) return; setFillingGap(i); try { await fillKnowledgeGap(`${gap.title}: ${gap.teaser}. ${gap.why_it_matters}`); setExtras(p => { if (!p) return p; const g = [...p.knowledge_gaps]; g[i] = { ...g[i], filled: true }; return { ...p, knowledge_gaps: g }; }); addToast({ type: 'success', icon: '◈', message: `Added "${gap.title}"`, duration: 4000 }); } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed to add', duration: 4000 }); } finally { setFillingGap(null); } };

    // ═══ TOGGLE CRUCIAL — with proper error handling & loading state ═══
    const handleToggleCrucial = async () => {
        if (togglingCrucial || !selectedNode?.id) return;
        setTogglingCrucial(true);
        try {
            const updated = await toggleCrucial(selectedNode.id);
            updateNode(updated.id, updated);
            const isCrucial = updated.feynman?.is_crucial;
            addToast({ type: 'success', icon: isCrucial ? '★' : '☆', message: isCrucial ? `"${updated.title}" marked crucial` : `"${updated.title}" unmarked`, duration: 3000 });
        } catch (err) {
            console.error('Toggle crucial error:', err);
            const msg = err?.response?.data?.error || err?.message || 'Failed to toggle';
            addToast({ type: 'danger', icon: '✕', message: msg, duration: 4000 });
        } finally {
            setTogglingCrucial(false);
        }
    };

    const feynman = selectedNode?.feynman;
    const sc = selectedNode?.status === 'critical' ? '#ff2d55' : selectedNode?.status === 'fading' ? '#ff6b35' : '#00d4ff';
    const isCrucial = selectedNode?.feynman?.is_crucial;
    const typeColors = { supports: { bg: 'rgba(0,255,136,0.05)', border: 'rgba(0,255,136,0.15)', text: '#00ff88', label: 'Supports' }, contradicts: { bg: 'rgba(255,107,53,0.05)', border: 'rgba(255,107,53,0.15)', text: '#ff6b35', label: 'Contradicts' }, extends: { bg: 'rgba(0,212,255,0.05)', border: 'rgba(0,212,255,0.15)', text: '#00d4ff', label: 'Extends' }, requires: { bg: 'rgba(124,58,237,0.05)', border: 'rgba(124,58,237,0.15)', text: '#7c3aed', label: 'Requires' }, example_of: { bg: 'rgba(255,170,0,0.05)', border: 'rgba(255,170,0,0.15)', text: '#ffaa00', label: 'Example of' } };

    return (
        <AnimatePresence>
            {isOpen && selectedNode && (<>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (isExpanded) setIsExpanded(false); else clearSelection(); }} style={{ position: 'fixed', inset: 0, background: isExpanded ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)', zIndex: 55, backdropFilter: 'blur(4px)', transition: 'background 0.3s' }} />

                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: isExpanded ? '100vh' : '65vh', maxHeight: isExpanded ? '100vh' : '740px', zIndex: 60, background: 'linear-gradient(180deg, rgba(4,10,24,0.99) 0%, rgba(2,6,16,0.99) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderTop: isExpanded ? 'none' : `1px solid ${sc}20`, borderRadius: isExpanded ? 0 : '24px 24px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1), max-height 0.4s, border-radius 0.3s' }}>

                    {/* Accent gradient line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${sc}, transparent)`, opacity: 0.6 }} />

                    {/* ═══ HEADER ═══ */}
                    <div style={{ padding: isExpanded ? '22px 32px 0' : '18px 24px 0', flexShrink: 0 }}>
                        {/* Row 1: Title + Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sc, boxShadow: `0 0 14px ${sc}80` }} />
                                    <div style={{ position: 'absolute', inset: '-3px', borderRadius: '50%', border: `1px solid ${sc}40`, animation: 'pulse-ring 2s ease-in-out infinite' }} />
                                </div>
                                <h2 style={{ fontFamily: sf, fontSize: isExpanded ? '22px' : '17px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '0.3px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>{selectedNode.title}</h2>
                                {extras?.feynman_certified && <span style={{ fontSize: '9px', color: '#00ff88', background: 'rgba(0,255,136,0.08)', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.15)', fontFamily: sfT, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>{Icons.check('#00ff88', 10)} CERTIFIED</span>}
                                {/* ★ Crucial toggle — SVG star, no emoji */}
                                <button onClick={handleToggleCrucial} disabled={togglingCrucial}
                                    title={isCrucial ? 'Unmark crucial' : 'Mark crucial'}
                                    style={{ background: isCrucial ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isCrucial ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', padding: '4px 8px', cursor: togglingCrucial ? 'wait' : 'pointer', lineHeight: 1, transition: 'all 0.2s', opacity: togglingCrucial ? 0.5 : 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                                    onMouseEnter={e => { if (!togglingCrucial) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.background = 'rgba(255,215,0,0.15)'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = isCrucial ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)'; }}>
                                    {Icons.star(isCrucial ? '#ffd700' : '#666', 14)}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                                <button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Collapse' : 'Expand'} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                    {isExpanded ? Icons.collapse('#00d4ff', 14) : Icons.expand('#4a9eba', 14)}
                                </button>
                                <button onClick={() => openNotesPanel(selectedNode.id)} title="Notes" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                    {Icons.notes('#a78bfa', 14)}
                                </button>
                                <button onClick={() => { setIsExpanded(false); clearSelection(); }} title="Close" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                    {Icons.close('#4a9eba', 14)}
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Quick stats bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, maxWidth: isExpanded ? '260px' : '170px' }}><StrengthBar strength={selectedNode.current_strength} status={selectedNode.status} /></div>
                            <span style={{ fontFamily: sfT, fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>{timeAgo(selectedNode.created_at)}</span>
                            {selectedNode.brain_region && <span style={{ fontFamily: sfT, fontSize: '9px', color: '#7c3aed', letterSpacing: '1px', padding: '3px 10px', borderRadius: '10px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.1)', textTransform: 'uppercase', fontWeight: 700 }}>{selectedNode.brain_region.replace('_', ' ')}</span>}
                        </div>

                        {/* Row 3: Tab navigation */}
                        {feynman && (
                            <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                {TABS.map(tab => {
                                    const active = activeTab === tab.key;
                                    return (
                                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '9px 0', borderRadius: '10px', border: 'none', background: active ? `${sc}12` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.25s', position: 'relative' }}>
                                            <span style={{ opacity: active ? 1 : 0.4, transition: 'opacity 0.25s', display: 'flex' }}>{tab.icon(active ? sc : 'rgba(255,255,255,0.4)')}</span>
                                            <span style={{ fontFamily: sfT, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: active ? sc : 'rgba(255,255,255,0.3)', transition: 'color 0.25s' }}>{tab.label}</span>
                                            {active && <motion.div layoutId="tab-ind" style={{ position: 'absolute', bottom: '2px', left: '20%', right: '20%', height: '2px', borderRadius: '1px', background: sc }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ═══ CONTENT ═══ */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: isExpanded ? '20px 32px 28px' : '16px 24px 24px' }}>
                        {feynman ? (
                            <AnimatePresence mode="wait">
                                <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                    {activeTab === 'overview' && (<>
                                        {(extras?.real_life_moment || extrasLoading) && <RealLifeMoment moment={extras?.real_life_moment} loading={extrasLoading || momentLoading} count={momentCount} onRefresh={handleNewMoment} />}
                                        {selectedNode.summary && <GlassCard accent="rgba(255,255,255,0.06)"><SectionHead icon={Icons.feynman('#7ec8e3', 13)} label="Summary" color="#7ec8e3" /><p style={body}>{selectedNode.summary}</p></GlassCard>}
                                        {feynman.why_important && <GlassCard accent="rgba(124,58,237,0.1)"><SectionHead icon={Icons.bulb('#a78bfa', 13)} label="Why You Learned This" color="#a78bfa" /><p style={body}>{feynman.why_important}</p></GlassCard>}
                                        {feynman.simple_explanation && <GlassCard accent="rgba(0,255,136,0.08)"><SectionHead icon={Icons.puzzle('#00ff88', 13)} label="Simple Explanation" color="#00ff88" /><p style={body}>{feynman.simple_explanation}</p></GlassCard>}
                                        {feynman.real_world_applications?.length > 0 && (
                                            <GlassCard accent="rgba(255,255,255,0.06)">
                                                <SectionHead icon={Icons.arrow('#4a9eba', 13)} label="Applications" />
                                                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                                    {feynman.real_world_applications.map((app, i) => (
                                                        <li key={i} style={{ ...body, marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                            <span style={{ marginTop: '5px', flexShrink: 0 }}>{Icons.arrow('#00d4ff', 10)}</span><span>{app}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </GlassCard>
                                        )}
                                        {selectedNode.tags?.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {selectedNode.tags.map((tag, i) => <span key={i} style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.1)', fontFamily: sfT, fontSize: '11px', color: '#a78bfa', fontWeight: 500 }}>{tag}</span>)}
                                            </div>
                                        )}
                                    </>)}

                                    {activeTab === 'memory' && (<>
                                        <GlassCard accent={`${sc}15`} glow={`${sc}06`}>
                                            <SectionHead icon={Icons.chart(sc, 13)} label="Forgetting Curve" color={sc} />
                                            <ForgettingCurve decayRate={selectedNode.decay_rate} lastReviewedAt={selectedNode.last_reviewed_at} currentStrength={selectedNode.current_strength} status={selectedNode.status} />
                                        </GlassCard>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <Metric label="Strength" value={`${Math.round(selectedNode.current_strength)}%`} color={sc} icon={Icons.strength(sc, 12)} />
                                            <Metric label="Decay Rate" value={`${(selectedNode.decay_rate * 100).toFixed(1)}%/d`} color="#7c3aed" icon={Icons.decay('#7c3aed', 12)} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {selectedNode.current_strength >= 70 && <Metric label="Fading in" value={timeUntilThreshold(selectedNode.decay_rate, selectedNode.last_reviewed_at, 70)} color="#ff6b35" icon={Icons.timer('#ff6b35', 12)} />}
                                            {selectedNode.current_strength >= 30 && <Metric label="Critical in" value={timeUntilThreshold(selectedNode.decay_rate, selectedNode.last_reviewed_at, 30)} color="#ff2d55" icon={Icons.warn('#ff2d55', 12)} />}
                                        </div>
                                    </>)}

                                    {activeTab === 'challenge' && (<>
                                        {(extras?.challenge_question || extrasLoading) && (
                                            <Accordion icon={Icons.target('#ffaa00', 13)} label="Feynman Challenge" color="#ffaa00" defaultOpen>
                                                <FeynmanChallenge question={extras?.challenge_question} loading={extrasLoading} answer={challengeAnswer} setAnswer={setChallengeAnswer} result={challengeResult} grading={challengeGrading} onSubmit={handleChallengeSubmit} />
                                            </Accordion>
                                        )}
                                        <Accordion icon={Icons.feynman('#00d4ff', 13)} label="The Feynman Test" color="#00d4ff" badge="CORE" defaultOpen>
                                            <TeachIt nodeTitle={selectedNode.title} explanation={teachExplanation} setExplanation={setTeachExplanation} result={teachResult} grading={teachGrading} onSubmit={handleTeachSubmit} />
                                        </Accordion>
                                    </>)}

                                    {activeTab === 'network' && (<>
                                        {connections.length > 0 ? (
                                            <GlassCard accent="rgba(255,255,255,0.06)">
                                                <SectionHead icon={Icons.node('#00d4ff', 13)} label="Connections" right={<span style={{ fontFamily: sfT, fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{connections.length} linked</span>} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {connections.map(conn => {
                                                        const t = typeColors[conn.connection_type] || typeColors.supports;
                                                        return (
                                                            <button key={conn.id} onClick={() => selectNode(conn.connected_node_id)} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px', borderRadius: '12px', background: t.bg, border: `1px solid ${t.border}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = t.border; e.currentTarget.style.boxShadow = `0 0 20px ${t.border}`; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = t.bg; e.currentTarget.style.boxShadow = 'none'; }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {Icons.node(t.text, 10)}
                                                                    <span style={{ fontFamily: sf, fontSize: '12px', fontWeight: 600, color: '#e8f4fd', flex: 1 }}>{conn.connected_node_title}</span>
                                                                    <span style={{ fontFamily: sfT, fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: t.text, padding: '2px 8px', borderRadius: '8px', background: t.bg, border: `1px solid ${t.border}` }}>{t.label}</span>
                                                                </div>
                                                                {conn.reason && <div style={{ fontFamily: sfT, fontSize: '11px', lineHeight: '1.5', color: 'rgba(232,244,253,0.4)', paddingLeft: '18px' }}>{conn.reason}</div>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </GlassCard>
                                        ) : <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontFamily: sfT, fontSize: '13px' }}>No connections yet</div>}
                                        {(extras?.knowledge_gaps?.length > 0 || extrasLoading) && (
                                            <Accordion icon={Icons.diamond('#00d4ff', 13)} label="Knowledge Gaps" color="#00d4ff" badge={extras?.knowledge_gaps?.length} defaultOpen>
                                                <KnowledgeGaps gaps={extras?.knowledge_gaps || []} loading={extrasLoading} fillingGap={fillingGap} onFillGap={handleFillGap} />
                                            </Accordion>
                                        )}
                                    </>)}
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                                {selectedNode.summary && <GlassCard accent="rgba(255,255,255,0.05)" style={{ width: '100%' }}><SectionHead icon={Icons.feynman('#4a9eba', 13)} label="Summary" /><p style={body}>{selectedNode.summary}</p></GlassCard>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px' }}>
                                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,212,255,0.15)', borderTop: '2px solid #00d4ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontFamily: sfT, fontSize: '13px', color: '#4a9eba' }}>Feynman is analyzing...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ FOOTER ═══ */}
                    <div style={{ padding: '12px 24px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', gap: '8px' }}>
                        <motion.button whileHover={{ scale: 1.01, boxShadow: `0 0 30px ${sc}15` }} whileTap={{ scale: 0.98 }} onClick={handleReview} disabled={reviewing} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: `linear-gradient(135deg, ${sc}10, ${sc}06)`, border: `1px solid ${sc}20`, color: sc, fontFamily: sf, fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: reviewing ? 'wait' : 'pointer', opacity: reviewing ? 0.5 : 1, transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {Icons.review(sc, 14)} {reviewing ? 'Reviewing...' : 'Review — Reset 100%'}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(255,45,85,0.2)' }} whileTap={{ scale: 0.95 }}
                            onClick={async () => { if (deleting) return; if (!window.confirm(`Delete "${selectedNode.title}"?`)) return; setDeleting(true); try { await deleteNode(selectedNode.id); removeNode(selectedNode.id); clearSelection(); addToast({ type: 'success', icon: '✕', message: `Deleted`, duration: 3000 }); } catch { addToast({ type: 'danger', icon: '✕', message: 'Failed', duration: 4000 }); } finally { setDeleting(false); } }}
                            disabled={deleting} style={{ padding: '13px 16px', borderRadius: '12px', background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.12)', cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.5 : 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                            {Icons.trash('#ff2d55', 14)}
                        </motion.button>
                    </div>

                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                        @keyframes pulse-ring { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.6); opacity: 0; } }
                    `}</style>
                </motion.div>
            </>)}
        </AnimatePresence>
    );
}
