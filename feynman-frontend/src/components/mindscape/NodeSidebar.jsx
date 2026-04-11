// ═══════════════════════════════════════════════════════════════════════════
// NodeSidebar.jsx — Deep Node Dashboard
// Slides in from the right when a graph node is clicked.
// 4 tabs: Overview, Forecast, Roadmap, Share
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const NODE_COLORS = {
    fear: '#E85D4A', goal: '#1DB88A', desire: '#9B7FE8',
    contradiction: '#F5A623', tension: '#E8834A', recurring_thought: '#5BA4F5',
    person: '#8EC9A2', emotion: '#D4678A',
};

const NODE_TYPE_LABELS = {
    fear: 'Fear', goal: 'Goal', desire: 'Desire', contradiction: 'Contradiction',
    tension: 'Tension', recurring_thought: 'Recurring Thought', person: 'Person', emotion: 'Emotion',
};

const TAG_COLORS = {
    green: { bg: 'rgba(29,184,138,0.12)', border: 'rgba(29,184,138,0.25)', color: '#1DB88A' },
    amber: { bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.25)', color: '#F5A623' },
    blue:  { bg: 'rgba(91,164,245,0.12)', border: 'rgba(91,164,245,0.25)', color: '#5BA4F5' },
    red:   { bg: 'rgba(232,93,74,0.12)',   border: 'rgba(232,93,74,0.25)',   color: '#E85D4A' },
    purple:{ bg: 'rgba(155,127,232,0.12)', border: 'rgba(155,127,232,0.25)', color: '#9B7FE8' },
    gray:  { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',  color: 'rgba(232,244,253,0.5)' },
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Tag({ text, colorKey = 'gray' }) {
    const c = TAG_COLORS[colorKey] || TAG_COLORS.gray;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: '6px',
            background: c.bg, border: `1px solid ${c.border}`,
            fontFamily: fontMono, fontSize: '8.5px', fontWeight: 600,
            color: c.color, letterSpacing: '0.3px', whiteSpace: 'nowrap',
        }}>{text}</span>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: Overview
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ node, edges, allNodes, onResolveToggle }) {
    const [appearances, setAppearances] = useState([]);
    const [loadingAppearances, setLoadingAppearances] = useState(false);
    const [insight, setInsight] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [resolving, setResolving] = useState(false);

    const color = NODE_COLORS[node?.type] || '#ffffff';

    useEffect(() => {
        if (!node?.id) return;
        setAppearances([]);
        setInsight(null);
        setLoadingAppearances(true);
        api.get(`/api/mindmirror/node/${node.id}/appearances`)
            .then(res => setAppearances(res.data.appearances || []))
            .catch(err => console.error('Failed to fetch appearances:', err))
            .finally(() => setLoadingAppearances(false));
    }, [node?.id]);

    const handleResolve = useCallback(async () => {
        if (resolving) return;
        setResolving(true);
        try {
            await api.post(`/api/mindmirror/resolve/${node.id}`);
            onResolveToggle?.(node.id);
        } catch (err) { console.error('Failed to toggle resolve:', err); }
        setResolving(false);
    }, [node?.id, resolving, onResolveToggle]);

    const handleGenerateInsight = useCallback(async () => {
        if (loadingInsight) return;
        setLoadingInsight(true);
        setInsight(null);
        try {
            const res = await api.post(`/api/mindmirror/node/${node.id}/insight`);
            setInsight(res.data.insight);
        } catch (err) { setInsight('Failed to generate insight.'); }
        setLoadingInsight(false);
    }, [node?.id, loadingInsight]);

    const connectedEdges = (edges || []).filter(e =>
        e.source_node_id === node?.id || e.target_node_id === node?.id
    );
    const connectedNodeIds = connectedEdges.map(e =>
        e.source_node_id === node?.id ? e.target_node_id : e.source_node_id
    );
    const connectedNodes = (allNodes || []).filter(n => connectedNodeIds.includes(n.id));
    const contradictionEdges = connectedEdges.filter(e => e.relationship_type === 'contradiction');
    const contradictionNodeIds = contradictionEdges.map(e =>
        e.source_node_id === node?.id ? e.target_node_id : e.source_node_id
    );
    const contradictionNodes = (allNodes || []).filter(n => contradictionNodeIds.includes(n.id));
    const isPressure = (node?.occurrence_count || 0) >= 3 && !node?.resolved;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: fontMono, fontSize: '8px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Occurrences</div>
                    <div style={{ fontFamily: font, fontSize: '20px', fontWeight: 700, color: 'rgba(232,244,253,0.8)' }}>{node.occurrence_count || 0}</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: fontMono, fontSize: '8px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Connections</div>
                    <div style={{ fontFamily: font, fontSize: '20px', fontWeight: 700, color: 'rgba(232,244,253,0.8)' }}>{connectedNodes.length}</div>
                </div>
            </div>

            {/* Strength Bar */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Strength</span>
                    <span style={{ fontFamily: fontMono, fontSize: '11px', fontWeight: 600, color }}>{((node.strength || 0) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${(node.strength || 0) * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, boxShadow: `0 0 10px ${color}40`, transition: 'width 0.5s ease' }} />
                </div>
            </div>

            {/* Resolve Toggle */}
            <button onClick={handleResolve} disabled={resolving} style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: node.resolved ? '1px solid rgba(29,184,138,0.2)' : '1px solid rgba(255,255,255,0.06)',
                background: node.resolved ? 'rgba(29,184,138,0.06)' : 'rgba(255,255,255,0.02)',
                color: node.resolved ? '#1DB88A' : 'rgba(232,244,253,0.5)',
                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                cursor: resolving ? 'wait' : 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
                {resolving ? '...' : node.resolved ? '✓ Resolved — Click to Unresolve' : 'Mark as Resolved'}
            </button>

            {/* Contradictions */}
            {contradictionNodes.length > 0 && (
                <div>
                    <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: '#F5A623', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>◆ Contradicts</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {contradictionNodes.map(cn => (
                            <div key={cn.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: NODE_COLORS[cn.type] || '#fff', boxShadow: `0 0 4px ${(NODE_COLORS[cn.type] || '#fff')}60` }} />
                                <span style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.7)' }}>{cn.label}</span>
                                <span style={{ fontFamily: fontMono, fontSize: '8px', fontWeight: 600, color: NODE_COLORS[cn.type] || '#fff', opacity: 0.5, letterSpacing: '0.5px', textTransform: 'uppercase', marginLeft: 'auto' }}>{cn.type?.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Connected Nodes */}
            {connectedNodes.length > 0 && (
                <div>
                    <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Connected Nodes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {connectedNodes.map(cn => (
                            <div key={cn.id} style={{ padding: '7px 10px', borderRadius: '7px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: NODE_COLORS[cn.type] || '#fff' }} />
                                <span style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.6)', flex: 1 }}>{cn.label}</span>
                                <span style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.15)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{cn.type?.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Journal Appearances */}
            <div>
                <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Journal Appearances</div>
                {loadingAppearances ? (
                    <div style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.15)', padding: '12px 0' }}>Loading...</div>
                ) : appearances.length === 0 ? (
                    <div style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.12)', padding: '8px 0', fontStyle: 'italic' }}>No journal entries linked</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {appearances.map(a => (
                            <div key={a.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontFamily: fontMono, fontSize: '8px', color: a.mode === 'subconscious' ? '#8b5cf6' : '#00d4ff', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{a.mode}</span>
                                    <span style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.15)' }}>{formatDate(a.created_at)}</span>
                                </div>
                                <div style={{ fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6', color: 'rgba(232,244,253,0.45)' }}>{a.snippet}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Insight */}
            <div>
                <button onClick={handleGenerateInsight} disabled={loadingInsight} style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid rgba(155,127,232,0.15)',
                    background: 'linear-gradient(135deg, rgba(155,127,232,0.06), rgba(91,164,245,0.04))',
                    color: '#9B7FE8', fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                    cursor: loadingInsight ? 'wait' : 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                    {loadingInsight ? (<><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ display: 'inline-block', fontSize: '11px' }}>⟳</motion.span> Thinking...</>) : (<>◉ Generate AI Insight</>)}
                </button>
                {insight && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '10px', padding: '14px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(155,127,232,0.05), rgba(91,164,245,0.03))', border: '1px solid rgba(155,127,232,0.1)' }}>
                        <div style={{ fontFamily: fontMono, fontSize: '12px', lineHeight: '1.7', color: 'rgba(232,244,253,0.65)' }}>{insight}</div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: Emotional Forecast
// ═══════════════════════════════════════════════════════════════════════════

const PRED_BAR_COLORS = { negative: '#E85D4A', positive: '#1DB88A', neutral: '#5BA4F5' };
const AGENT_DIR_ICONS = { up: '↑', down: '↓', stable: '·' };
const AGENT_DIR_COLORS = { up: '#E85D4A', down: '#1DB88A', stable: 'rgba(232,244,253,0.4)' };

function ForecastTab({ node }) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeHorizon, setTimeHorizon] = useState('7d');
    const [error, setError] = useState(null);
    const color = NODE_COLORS[node?.type] || '#fff';

    const generateForecast = useCallback(async (horizon) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post(`/api/mindmirror/node/${node.id}/forecast`, { timeHorizon: horizon });
            setForecast(res.data.forecast);
        } catch (err) {
            console.error('Forecast error:', err);
            setError('Failed to generate forecast');
        }
        setLoading(false);
    }, [node?.id]);

    useEffect(() => {
        if (node?.id) generateForecast(timeHorizon);
    }, [node?.id]);

    const handleHorizonChange = (h) => {
        setTimeHorizon(h);
        generateForecast(h);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: '#e8f4fd' }}>{node.label}</span>
                    <Tag text={NODE_TYPE_LABELS[node.type] || node.type} colorKey="purple" />
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.4)', marginBottom: '10px' }}>What will happen to this thought?</div>

                {/* Time horizon tabs */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[{ id: '7d', label: 'Next 7 days' }, { id: '30d', label: 'Next 30 days' }, { id: '90d', label: 'Next 90 days' }].map(h => (
                        <button key={h.id} onClick={() => handleHorizonChange(h.id)} style={{
                            padding: '5px 12px', borderRadius: '8px', border: 'none',
                            background: timeHorizon === h.id ? 'rgba(91,164,245,0.12)' : 'rgba(255,255,255,0.03)',
                            color: timeHorizon === h.id ? '#5BA4F5' : 'rgba(232,244,253,0.3)',
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}>{h.label}</button>
                    ))}
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ width: '20px', height: '20px', margin: '0 auto 8px', border: '2px solid rgba(91,164,245,0.1)', borderTop: '2px solid #5BA4F5', borderRadius: '50%' }} />
                    <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.2)', letterSpacing: '1px' }}>Analyzing patterns...</div>
                </div>
            )}

            {error && <div style={{ fontFamily: fontMono, fontSize: '11px', color: '#E85D4A', padding: '12px', borderRadius: '8px', background: 'rgba(232,93,74,0.06)' }}>{error}</div>}

            {forecast && !loading && (
                <>
                    {/* Prediction bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(forecast.predictions || []).map((pred, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '6px', height: '32px', borderRadius: '3px', background: PRED_BAR_COLORS[pred.type] || '#5BA4F5', opacity: 0.5 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: font, fontSize: '12px', fontWeight: 600, color: '#e8f4fd', marginBottom: '2px' }}>{pred.label}</div>
                                    <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.35)' }}>{pred.description}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    <div style={{ width: '60px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pred.probability}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                            style={{ height: '100%', borderRadius: '3px', background: PRED_BAR_COLORS[pred.type] || '#5BA4F5' }}
                                        />
                                    </div>
                                    <span style={{ fontFamily: fontMono, fontSize: '11px', fontWeight: 700, color: PRED_BAR_COLORS[pred.type] || '#5BA4F5', width: '30px', textAlign: 'right' }}>{pred.probability}%</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Confidence */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.2)', letterSpacing: '0.5px' }}>Forecast confidence</span>
                        <span style={{ fontFamily: fontMono, fontSize: '10px', fontWeight: 600, color: 'rgba(232,244,253,0.5)' }}>
                            {forecast.confidence?.level || 'Medium'} — based on {forecast.confidence?.dataPoints || '?'} data points
                        </span>
                    </div>

                    {/* Reasoning */}
                    <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: 'rgba(232,244,253,0.5)', marginBottom: '8px' }}>Why these predictions?</div>
                        <div style={{ fontFamily: fontMono, fontSize: '11px', lineHeight: '1.65', color: 'rgba(232,244,253,0.45)' }}>{forecast.reasoning}</div>

                        {/* Driving agents */}
                        {forecast.drivingAgents && forecast.drivingAgents.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.2)', letterSpacing: '0.5px', marginBottom: '6px' }}>Agents driving this forecast</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {forecast.drivingAgents.map((agent, i) => (
                                        <span key={i} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                                            padding: '3px 8px', borderRadius: '6px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${AGENT_DIR_COLORS[agent.direction] || 'rgba(255,255,255,0.08)'}30`,
                                            fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                            color: AGENT_DIR_COLORS[agent.direction] || 'rgba(232,244,253,0.4)',
                                        }}>
                                            {agent.name}
                                            <span style={{ fontSize: '8px' }}>{AGENT_DIR_ICONS[agent.direction] || ''}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Triggers */}
                    {forecast.triggers && forecast.triggers.length > 0 && (
                        <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(245,166,35,0.03)', border: '1px solid rgba(245,166,35,0.08)' }}>
                            <div style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: '#F5A623', marginBottom: '10px' }}>Forecast triggers — what changes this prediction</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {forecast.triggers.map((trigger, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: trigger.type === 'positive' ? '#1DB88A' : '#E85D4A', marginTop: '5px', flexShrink: 0 }} />
                                        <div>
                                            <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: 'rgba(232,244,253,0.7)' }}>{trigger.action}</span>
                                            <span style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.35)' }}> — {trigger.effect}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: Resolution Roadmap
// ═══════════════════════════════════════════════════════════════════════════

function RoadmapTab({ node, onResolveToggle }) {
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [completedSteps, setCompletedSteps] = useState(new Set());

    const generateRoadmap = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post(`/api/mindmirror/node/${node.id}/roadmap`);
            setRoadmap(res.data.roadmap);
        } catch (err) {
            console.error('Roadmap error:', err);
            setError('Failed to generate roadmap');
        }
        setLoading(false);
    }, [node?.id]);

    useEffect(() => {
        if (node?.id) {
            setCompletedSteps(new Set());
            generateRoadmap();
        }
    }, [node?.id]);

    const toggleStep = (idx) => {
        setCompletedSteps(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const totalSteps = roadmap?.totalSteps || roadmap?.steps?.length || 0;
    const progress = totalSteps > 0 ? Math.round((completedSteps.size / totalSteps) * 100) : 0;

    const IMPACT_COLORS = { 'High impact': 'red', 'Contradiction': 'amber', 'Low impact': 'gray' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading && (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ width: '20px', height: '20px', margin: '0 auto 8px', border: '2px solid rgba(29,184,138,0.1)', borderTop: '2px solid #1DB88A', borderRadius: '50%' }} />
                    <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.2)', letterSpacing: '1px' }}>Building resolution path...</div>
                </div>
            )}

            {error && <div style={{ fontFamily: fontMono, fontSize: '11px', color: '#E85D4A', padding: '12px', borderRadius: '8px', background: 'rgba(232,93,74,0.06)' }}>{error}</div>}

            {roadmap && !loading && (
                <>
                    {/* Progress header */}
                    <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Overall resolution progress</div>
                        <div style={{ fontFamily: font, fontSize: '20px', fontWeight: 700, color: '#e8f4fd', marginBottom: '8px' }}>
                            Step {completedSteps.size} of {totalSteps}
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '6px' }}>
                            <motion.div
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #1DB88A, #14B8A6)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: fontMono, fontSize: '9px', color: completedSteps.size === 0 ? '#F5A623' : '#1DB88A' }}>
                                {completedSteps.size === 0 ? 'Just started' : completedSteps.size === totalSteps ? 'Complete!' : 'In progress'}
                            </span>
                            <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.3)' }}>{progress}% resolved</span>
                        </div>
                        <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.3)', marginTop: '8px', lineHeight: '1.5' }}>
                            Your 26 agents analysed this node's full history and connection graph to generate the most efficient resolution path — ordered by impact.
                        </div>
                    </div>

                    {/* Resolution Steps */}
                    <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Your resolution steps</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(roadmap.steps || []).map((step, i) => {
                            const isDone = completedSteps.has(i);
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    style={{
                                        padding: '14px 16px', borderRadius: '12px',
                                        background: isDone ? 'rgba(29,184,138,0.04)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isDone ? 'rgba(29,184,138,0.15)' : 'rgba(255,255,255,0.04)'}`,
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        {/* Step number / checkbox */}
                                        <button
                                            onClick={() => toggleStep(i)}
                                            style={{
                                                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                                background: isDone ? '#1DB88A' : (i === 0 ? 'rgba(29,184,138,0.15)' : 'rgba(255,255,255,0.04)'),
                                                border: `2px solid ${isDone ? '#1DB88A' : (i === 0 ? 'rgba(29,184,138,0.4)' : 'rgba(255,255,255,0.08)')}`,
                                                color: isDone ? '#fff' : 'rgba(232,244,253,0.5)',
                                                fontFamily: font, fontSize: '11px', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.15s', padding: 0,
                                            }}
                                        >
                                            {isDone ? '✓' : i + 1}
                                        </button>

                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontFamily: font, fontSize: '12.5px', fontWeight: 600,
                                                color: isDone ? 'rgba(232,244,253,0.4)' : '#e8f4fd',
                                                textDecoration: isDone ? 'line-through' : 'none',
                                                marginBottom: '4px',
                                            }}>{step.title}</div>
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '10.5px', lineHeight: '1.55',
                                                color: 'rgba(232,244,253,0.35)',
                                                marginBottom: '8px',
                                            }}>{step.description}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {(step.tags || []).map((tag, j) => (
                                                    <Tag key={j} text={tag} colorKey={(step.tagColors || [])[j] || 'gray'} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Blockers */}
                    {roadmap.blockers && roadmap.blockers.length > 0 && (
                        <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(232,93,74,0.03)', border: '1px solid rgba(232,93,74,0.08)' }}>
                            <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.3)', letterSpacing: '1px', marginBottom: '10px' }}>Blocked by these nodes — resolve them first</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {roadmap.blockers.map((blocker, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: IMPACT_COLORS[blocker.impact] === 'red' ? '#E85D4A' : IMPACT_COLORS[blocker.impact] === 'amber' ? '#F5A623' : '#6B7B8D' }} />
                                        <span style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.6)', flex: 1 }}>{blocker.label}</span>
                                        <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.2)' }}>{blocker.hops} hop{blocker.hops !== 1 ? 's' : ''} away</span>
                                        <Tag text={blocker.impact} colorKey={IMPACT_COLORS[blocker.impact] || 'gray'} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* What resolving unlocks */}
                    {roadmap.unlocksWhenResolved && (
                        <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(29,184,138,0.04)', border: '1px solid rgba(29,184,138,0.1)' }}>
                            <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: '#1DB88A', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>What resolving this unlocks</div>
                            <div style={{ fontFamily: font, fontSize: '12px', fontWeight: 600, color: 'rgba(232,244,253,0.6)' }}>{roadmap.unlocksWhenResolved}</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: Share This Node
// ═══════════════════════════════════════════════════════════════════════════

function ShareTab({ node, edges, allNodes }) {
    const color = NODE_COLORS[node?.type] || '#fff';
    const [shareSettings, setShareSettings] = useState({
        connectedNodes: true,
        journalText: false,
        identity: false,
    });
    const [cardFormat, setCardFormat] = useState('thought');
    const [copied, setCopied] = useState(false);
    const [copyImageStatus, setCopyImageStatus] = useState(null);
    const [copyRawStatus, setCopyRawStatus] = useState(null);
    const cardRef = useRef(null);

    const toggle = (key) => setShareSettings(prev => ({ ...prev, [key]: !prev[key] }));

    const connectedEdges = (edges || []).filter(e => e.source_node_id === node?.id || e.target_node_id === node?.id);
    const connectedNodeIds = connectedEdges.map(e => e.source_node_id === node?.id ? e.target_node_id : e.source_node_id);
    const connectedNodes = (allNodes || []).filter(n => connectedNodeIds.includes(n.id));

    // Build plain-text version of the card
    const buildCardText = () => {
        let text = `"${node.label}" — ${NODE_TYPE_LABELS[node.type] || node.type}\n`;
        text += `Strength: ${((node.strength || 0) * 100).toFixed(0)}% · Seen ${node.occurrence_count || 1} times\n`;
        if (shareSettings.connectedNodes && connectedNodes.length > 0) {
            text += `Connected to: ${connectedNodes.map(n => n.label).join(', ')}\n`;
        }
        text += `\n— Mapped with Feynman Mindscape`;
        return text;
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(buildCardText()).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Render the card preview to a canvas, then return the canvas
    const renderCardToCanvas = async () => {
        const el = cardRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const scale = 2; // retina quality
        const canvas = document.createElement('canvas');
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        // Dark background
        ctx.fillStyle = '#0D0F14';
        ctx.roundRect(0, 0, rect.width, rect.height, 14);
        ctx.fill();
        // Border
        ctx.strokeStyle = color + '30';
        ctx.lineWidth = 1;
        ctx.roundRect(0, 0, rect.width, rect.height, 14);
        ctx.stroke();
        // Node dot
        ctx.beginPath();
        ctx.arc(22, 26, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowColor = color + '60';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Node label
        ctx.font = '700 14px -apple-system, sans-serif';
        ctx.fillStyle = '#e8f4fd';
        ctx.fillText(node.label, 36, 30);
        // Type tag
        ctx.font = '600 9px -apple-system, sans-serif';
        const tagY = 50;
        const typeText = NODE_TYPE_LABELS[node.type] || node.type;
        ctx.fillStyle = color + '15';
        const tagW = ctx.measureText(typeText).width + 12;
        ctx.roundRect(14, tagY - 9, tagW, 18, 6);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(typeText, 20, tagY + 3);
        // Strength tag
        const strengthText = `${((node.strength || 0) * 100).toFixed(0)}% strength`;
        const sX = 14 + tagW + 6;
        ctx.fillStyle = '#1DB88A15';
        const sW = ctx.measureText(strengthText).width + 12;
        ctx.roundRect(sX, tagY - 9, sW, 18, 6);
        ctx.fill();
        ctx.fillStyle = '#1DB88A';
        ctx.fillText(strengthText, sX + 6, tagY + 3);
        // Connected nodes text
        if (shareSettings.connectedNodes && connectedNodes.length > 0) {
            ctx.font = '400 10px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(232,244,253,0.35)';
            const connText = 'Connected to: ' + connectedNodes.slice(0, 3).map(n => n.label).join(', ');
            ctx.fillText(connText, 14, 82);
        }
        // Watermark
        ctx.font = '500 8px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(232,244,253,0.15)';
        ctx.letterSpacing = '1px';
        ctx.fillText('FEYNMAN MINDSCAPE', 14, rect.height - 12);
        return canvas;
    };

    const handleCopyImage = async () => {
        setCopyImageStatus('Rendering...');
        try {
            const canvas = await renderCardToCanvas();
            if (!canvas) { setCopyImageStatus('Error'); setTimeout(() => setCopyImageStatus(null), 2000); return; }
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    setCopyImageStatus('✓ Copied!');
                } catch {
                    // Fallback: download instead if clipboard write fails
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `mindscape-${node.label.replace(/\s+/g, '-')}.png`; a.click();
                    URL.revokeObjectURL(url);
                    setCopyImageStatus('✓ Downloaded');
                }
                setTimeout(() => setCopyImageStatus(null), 2000);
            }, 'image/png');
        } catch { setCopyImageStatus('Error'); setTimeout(() => setCopyImageStatus(null), 2000); }
    };

    const handleDownloadImage = async () => {
        try {
            const canvas = await renderCardToCanvas();
            if (!canvas) return;
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mindscape-${node.label.replace(/\s+/g, '-')}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (e) { console.error('Download failed:', e); }
    };

    const handleCopyRaw = () => {
        navigator.clipboard.writeText(buildCardText()).then(() => {
            setCopyRawStatus('✓ Copied!');
            setTimeout(() => setCopyRawStatus(null), 2000);
        });
    };

    const TOGGLE_ITEMS = [
        { key: 'connectedNodes', label: 'Connected nodes', desc: 'What thoughts link to this', defaultOn: true },
        { key: 'journalText', label: 'Journal text', desc: 'Raw entries — never shared by default', defaultOn: false },
        { key: 'identity', label: 'Your name / identity', desc: 'Always anonymous unless you add it', defaultOn: false },
    ];

    const CARD_FORMATS = [
        { id: 'thought', label: 'Thought Card', desc: 'Clean summary card' },
        { id: 'agent_split', label: 'Agent Split', desc: 'Shows agent conflict' },
        { id: 'timeline', label: 'Timeline', desc: 'Shows the journey' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Card Format Selector */}
            <div>
                <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Card Format</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {CARD_FORMATS.map(fmt => (
                        <button
                            key={fmt.id}
                            onClick={() => setCardFormat(fmt.id)}
                            style={{
                                flex: 1, padding: '10px 8px', borderRadius: '10px',
                                background: cardFormat === fmt.id ? `${color}10` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${cardFormat === fmt.id ? `${color}30` : 'rgba(255,255,255,0.04)'}`,
                                cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                            }}
                        >
                            <div style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: cardFormat === fmt.id ? color : 'rgba(232,244,253,0.5)', marginBottom: '2px' }}>{fmt.label}</div>
                            <div style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.2)' }}>{fmt.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Card Preview */}
            <div ref={cardRef} style={{
                padding: '16px 18px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(13,15,20,0.95), rgba(20,22,30,0.95))',
                border: `1px solid ${color}20`,
                boxShadow: `0 4px 20px rgba(0,0,0,0.3), inset 0 0 30px ${color}05`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}60` }} />
                    <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: '#e8f4fd' }}>{node.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <Tag text={NODE_TYPE_LABELS[node.type] || node.type} colorKey="purple" />
                    <Tag text={`${((node.strength || 0) * 100).toFixed(0)}% strength`} colorKey="green" />
                    <Tag text={`${node.occurrence_count || 1}x seen`} colorKey="gray" />
                </div>
                {shareSettings.connectedNodes && connectedNodes.length > 0 && (
                    <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.35)', marginBottom: '6px' }}>
                        Connected to: {connectedNodes.slice(0, 3).map(n => n.label).join(', ')}{connectedNodes.length > 3 ? ` +${connectedNodes.length - 3} more` : ''}
                    </div>
                )}
                <div style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.15)', marginTop: '10px', letterSpacing: '1px' }}>FEYNMAN MINDSCAPE</div>
            </div>

            {/* Privacy Toggles */}
            <div>
                <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Privacy Controls</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {TOGGLE_ITEMS.map((item, i) => (
                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < TOGGLE_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                            <div>
                                <div style={{ fontFamily: font, fontSize: '11.5px', fontWeight: 600, color: 'rgba(232,244,253,0.7)' }}>{item.label}</div>
                                <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.25)' }}>{item.desc}</div>
                            </div>
                            <button
                                onClick={() => toggle(item.key)}
                                style={{
                                    width: '36px', height: '20px', borderRadius: '10px', border: 'none',
                                    background: shareSettings[item.key] ? '#1DB88A' : 'rgba(255,255,255,0.08)',
                                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                                }}
                            >
                                <div style={{
                                    width: '16px', height: '16px', borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute', top: '2px',
                                    left: shareSettings[item.key] ? '18px' : '2px',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                }} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Virality tips */}
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.08)' }}>
                <div style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: '#F5A623', marginBottom: '8px' }}>What makes this card go viral</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[
                        { b: 'Relatable inner conflict', d: '— seeing agent debates mirrors how everyone feels about big decisions' },
                        { b: 'Curiosity gap', d: '— "what are the other thoughts connected to this?" makes people want to try it' },
                        { b: 'No cringe', d: '— it never shows diary content, only abstracted data — safe to post publicly' },
                        { b: 'Branded watermark', d: '— every share is a Mindscape ad that doesn\'t look like an ad' },
                    ].map((tip, i) => (
                        <div key={i} style={{ fontFamily: fontMono, fontSize: '10px', lineHeight: '1.5', color: 'rgba(232,244,253,0.4)' }}>
                            <span style={{ fontWeight: 600, color: 'rgba(232,244,253,0.6)' }}>{tip.b}</span> {tip.d}
                        </div>
                    ))}
                </div>
            </div>

            {/* Share buttons */}
            <div>
                <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Export &amp; Share</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                        { label: copyImageStatus || 'Copy image', action: handleCopyImage, highlight: copyImageStatus === '✓ Copied!' },
                        { label: copied ? '✓ Copied!' : 'Copy link', action: handleCopyText, highlight: copied },
                        { label: 'Download PNG', action: handleDownloadImage, highlight: false },
                        { label: copyRawStatus || 'Copy as text', action: handleCopyRaw, highlight: copyRawStatus === '✓ Copied!' },
                    ].map((btn, i) => (
                        <button key={i} onClick={btn.action} style={{
                            padding: '10px', borderRadius: '10px',
                            background: btn.highlight ? 'rgba(29,184,138,0.08)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${btn.highlight ? 'rgba(29,184,138,0.2)' : 'rgba(255,255,255,0.06)'}`,
                            color: btn.highlight ? '#1DB88A' : 'rgba(232,244,253,0.5)',
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}>{btn.label}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// NodeSidebar — Main Component with Tabs
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
    { id: 'overview', label: 'Overview', icon: '◉' },
    { id: 'forecast', label: 'Forecast', icon: '◎' },
    { id: 'roadmap', label: 'Roadmap', icon: '◇' },
    { id: 'share', label: 'Share', icon: '◆' },
];

export default function NodeSidebar({ node, edges = [], allNodes = [], onClose, onResolveToggle }) {
    const [activeTab, setActiveTab] = useState('overview');
    const color = NODE_COLORS[node?.type] || '#ffffff';
    const typeLabel = NODE_TYPE_LABELS[node?.type] || node?.type || 'Unknown';
    const isPressure = (node?.occurrence_count || 0) >= 3 && !node?.resolved;
    const { isMobile, isTouchDevice } = useResponsive();

    // Reset tab when node changes
    useEffect(() => { setActiveTab('overview'); }, [node?.id]);

    if (!node) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="node-sidebar"
                initial={isMobile ? { y: '100%', opacity: 0 } : { x: 400, opacity: 0 }}
                animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                exit={isMobile ? { y: '100%', opacity: 0 } : { x: 400, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                style={{
                    position: 'absolute', top: isMobile ? 0 : 0, right: 0, bottom: 0,
                    left: isMobile ? 0 : 'auto',
                    width: isMobile ? '100%' : '400px', zIndex: 60,
                    background: 'rgba(8,10,16,0.98)',
                    borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: isMobile ? 'none' : '-8px 0 40px rgba(0,0,0,0.6)',
                }}
            >
                {/* ─── Header ─────────────────────────────────────────────── */}
                <div style={{
                    padding: '18px 20px 0', flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}08, transparent)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontFamily: font, fontSize: '18px', fontWeight: 700,
                                color, letterSpacing: '-0.3px', lineHeight: '1.3', marginBottom: '8px',
                            }}>{node.label}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <Tag text={typeLabel} colorKey="purple" />
                                {isPressure && <Tag text="◆ Pressure Point" colorKey="amber" />}
                                {node.resolved && <Tag text="✓ Resolved" colorKey="green" />}
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px', width: '30px', height: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(232,244,253,0.4)', fontSize: '11px', cursor: 'pointer', flexShrink: 0,
                        }}>✕</button>
                    </div>

                    {/* Tab bar */}
                    <div style={{
                        display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1, padding: '10px 4px 8px', border: 'none',
                                    background: 'none', cursor: 'pointer',
                                    borderBottom: activeTab === tab.id
                                        ? `2px solid ${color}`
                                        : '2px solid transparent',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: activeTab === tab.id ? color : 'rgba(232,244,253,0.25)',
                                    letterSpacing: '0.3px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                }}>
                                    <span style={{ fontSize: '8px' }}>{tab.icon}</span>
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Scrollable Content ─────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', minHeight: 0 }}>
                    {activeTab === 'overview' && (
                        <OverviewTab node={node} edges={edges} allNodes={allNodes} onResolveToggle={onResolveToggle} />
                    )}
                    {activeTab === 'forecast' && (
                        <ForecastTab node={node} />
                    )}
                    {activeTab === 'roadmap' && (
                        <RoadmapTab node={node} onResolveToggle={onResolveToggle} />
                    )}
                    {activeTab === 'share' && (
                        <ShareTab node={node} edges={edges} allNodes={allNodes} />
                    )}
                </div>

                {/* ─── Footer Meta ────────────────────────────────────────── */}
                <div style={{
                    padding: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.03)', flexShrink: 0,
                }}>
                    <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.1)' }}>
                        ID: {node.id?.slice(0, 8)}… · Created {formatDate(node.first_seen_at || node.created_at)}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
