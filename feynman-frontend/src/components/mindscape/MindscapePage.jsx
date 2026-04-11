// ═══════════════════════════════════════════════════════════════════════════
// MindscapePage.jsx — Full Mindscape Layout Wrapper (Phase 5)
// Orchestrates: GodViewControls + MindGraph + AgentSimulation + NodeSidebar
//               + AgentMemoryPanel + Agent Dominance Arc Chart + MirrorReport
// Full viewport, dark scene, living graph + brain simulation side-by-side.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';
import MindGraph from './MindGraph';
import AgentSimulation from './AgentSimulation';
import AgentMemoryPanel from './AgentMemoryPanel';
import NodeSidebar from './NodeSidebar';
import GodViewControls from './GodViewControls';
import AgentDialogueOverlay from './AgentDialogueOverlay';
import MirrorReport, { MirrorReportPreview } from './MirrorReport';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

// ─── Agent colors + metadata for dominance chart ─────────────────────────────
const AGENT_COLORS = {
    // Core 8 (Plutchik Primary)
    sentinel:     { color: '#E85D4A', label: 'Sentinel',  emotion: 'Fear',         icon: '◆', desc: 'Your threat-detection system. Activates when the mind perceives danger — real or imagined. Guards against reckless decisions.' },
    fury:         { color: '#FF4136', label: 'Fury',      emotion: 'Anger',        icon: '▲', desc: 'The boundary enforcer. Fires when your values are violated or you feel disrespected. Channeled well, it drives change.' },
    euphoric:     { color: '#FFD700', label: 'Euphoric',  emotion: 'Joy',          icon: '○', desc: 'The celebration engine. Lights up during moments of achievement, connection, or play.' },
    mourner:      { color: '#6B7B8D', label: 'Mourner',   emotion: 'Sadness',      icon: '◇', desc: 'The loss processor. Activates when something meaningful is gone. Critical for letting go and moving forward.' },
    believer:     { color: '#2ECC71', label: 'Believer',  emotion: 'Trust',        icon: '□', desc: 'The faith keeper. Decides who and what you can rely on. When dominant, you feel safe.' },
    purist:       { color: '#8B5CF6', label: 'Purist',    emotion: 'Disgust',      icon: '✦', desc: 'The contamination detector. Rejects what feels morally or physically toxic. Protects your identity.' },
    oracle:       { color: '#F59E0B', label: 'Oracle',    emotion: 'Anticipation', icon: '◎', desc: 'The forward-scanner. Always simulating what comes next. Fuels preparation but can spiral into anxiety.' },
    witness:      { color: '#FBBF24', label: 'Witness',   emotion: 'Surprise',     icon: '◉', desc: 'The pattern-breaker. Activates when reality defies expectation. Forces the mind to update its model.' },
    // Self-Conscious
    phantom:      { color: '#A3A3A3', label: 'Phantom',   emotion: 'Guilt',        icon: '◈', desc: 'The moral accountant. Haunts you with things you did or didn\'t do. Weight grows until addressed.' },
    exile:        { color: '#92400E', label: 'Exile',     emotion: 'Shame',        icon: '▽', desc: 'The identity wound. Unlike guilt, shame says "I am bad." Drives self-sabotage until brought to light.' },
    crown:        { color: '#D4AF37', label: 'Crown',     emotion: 'Pride',        icon: '♕', desc: 'The status tracker. Measures your worth against your own standards. Healthy pride fuels confidence.' },
    // Social
    mirror_agent: { color: '#10B981', label: 'Mirror',    emotion: 'Envy',         icon: '◆', desc: 'The comparison engine. Observes others and measures what you lack. Can motivate or breed resentment.' },
    hollow:       { color: '#6366F1', label: 'Hollow',    emotion: 'Loneliness',   icon: '◌', desc: 'The connection seeker. Aches when meaningful bonds are absent. About feeling unseen by people who matter.' },
    bridge:       { color: '#14B8A6', label: 'Bridge',    emotion: 'Empathy',      icon: '⌒', desc: 'The emotional translator. Lets you feel what others feel. Foundation of deep relationships.' },
    garden:       { color: '#84CC16', label: 'Garden',    emotion: 'Gratitude',    icon: '✧', desc: 'The abundance recognizer. Highlights what\'s already good. Active gratitude rewires the brain toward resilience.' },
    // Anticipatory
    void:         { color: '#EF4444', label: 'Void',      emotion: 'Anxiety',      icon: '●', desc: 'The catastrophe simulator. Fear projected into the future. Runs worst-case loops. The mind\'s smoke alarm.' },
    torch:        { color: '#3B82F6', label: 'Torch',     emotion: 'Hope',         icon: '△', desc: 'The possibility engine. Believes things can get better. The emotional fuel behind every goal and fresh start.' },
    ghost:        { color: '#9CA3AF', label: 'Ghost',     emotion: 'Regret',       icon: '○', desc: 'The replayer. Loops past decisions you wish you could undo. Resolution comes from acceptance, not time travel.' },
    // Complex Dyads
    judge:        { color: '#7C3AED', label: 'Judge',     emotion: 'Contempt',     icon: '⬡', desc: 'The hierarchy enforcer. Anger + disgust directed at someone deemed "beneath." The most corrosive social emotion.' },
    hearth:       { color: '#EC4899', label: 'Hearth',    emotion: 'Love',         icon: '◇', desc: 'The deep attachment bond. Trust + joy + vulnerability. The warmth you feel toward family, friends, and ideas.' },
    sublime:      { color: '#818CF8', label: 'Sublime',   emotion: 'Awe',          icon: '✦', desc: 'The wonder response. Fires when something is so vast it dissolves your sense of self. Resets perspective.' },
    abyss:        { color: '#374151', label: 'Abyss',     emotion: 'Despair',      icon: '◉', desc: 'The hopelessness signal. Sadness meets helplessness. The mind\'s way of saying something fundamental must change.' },
    // Behavioral
    wanderer:     { color: '#06B6D4', label: 'Wanderer',  emotion: 'Curiosity',    icon: '✦', desc: 'The exploration drive. Pulls you toward the unknown. The engine behind learning, creativity, and growth.' },
    anchor:       { color: '#D4678A', label: 'Anchor',    emotion: 'Nostalgia',    icon: '◇', desc: 'The past reaches back. Bittersweet attachment to what was. Can provide comfort or keep you from growing.' },
    spark:        { color: '#F97316', label: 'Spark',     emotion: 'Frustration',  icon: '▲', desc: 'The blocked-goal detector. Fires when effort meets obstacle. How you handle it defines growth.' },
    drift:        { color: '#78716C', label: 'Drift',     emotion: 'Boredom',      icon: '◌', desc: 'The meaning vacuum. Signals that current activity lacks purpose. A quiet alarm about potential.' },
};


// ─── SVG Arc Dominance Chart ─────────────────────────────────────────────────
function DominanceArcChart({ agentStates }) {
    const size = 120;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 44;
    const strokeWidth = 8;

    // Build arc segments from dominance scores — only agents that have states
    const agents = Object.keys(agentStates)
        .filter(key => AGENT_COLORS[key] && (agentStates[key]?.dominance_score || 0) > 0)
        .map(key => [key, AGENT_COLORS[key]]);

    if (agents.length === 0) return null;

    const scores = agents.map(([key]) => agentStates[key]?.dominance_score || 0);
    const total = scores.reduce((s, v) => s + v, 0) || 1;

    let accAngle = -90; // Start at top
    const arcs = agents.map(([key, meta], i) => {
        const fraction = scores[i] / total;
        const angle = fraction * 360;
        const startAngle = accAngle;
        accAngle += angle;
        const endAngle = accAngle;

        // Convert to radians for SVG arc
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        const d = angle >= 359.9
            ? `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy}`
            : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

        return {
            key,
            d,
            color: meta.color,
            label: meta.label,
            pct: Math.round(fraction * 100),
            score: scores[i],
        };
    });

    // Find dominant agent
    const maxIdx = scores.indexOf(Math.max(...scores));
    const dominantMeta = agents[maxIdx] ? AGENT_COLORS[agents[maxIdx][0]] : null;

    // Show only top 6 agents in legend (sorted by score)
    const topArcs = [...arcs].sort((a, b) => b.score - a.score).slice(0, 6);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px',
        }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background ring */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.03)"
                    strokeWidth={strokeWidth}
                />
                {/* Arc segments */}
                {arcs.map(arc => (
                    <path
                        key={arc.key}
                        d={arc.d}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        opacity={0.75}
                    />
                ))}
                {/* Center text */}
                <text
                    x={cx} y={cy - 4}
                    textAnchor="middle"
                    fill={dominantMeta?.color || '#e8f4fd'}
                    fontSize="10" fontWeight="700"
                    fontFamily={font}
                >{dominantMeta?.label || '—'}</text>
                <text
                    x={cx} y={cy + 10}
                    textAnchor="middle"
                    fill="rgba(232,244,253,0.25)"
                    fontSize="7"
                    fontFamily={fontMono}
                >dominant</text>
            </svg>

            {/* Legend — top 6 */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px',
                justifyContent: 'center', maxWidth: '140px',
            }}>
                {topArcs.map(arc => (
                    <div key={arc.key} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                    }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: arc.color,
                        }} />
                        <span style={{
                            fontFamily: fontMono, fontSize: '7px',
                            color: 'rgba(232,244,253,0.3)',
                        }}>{arc.pct}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}


export default function MindscapePage({ isOpen, onClose }) {
    // ─── State ───────────────────────────────────────────────────────────
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [timelineCutoff, setTimelineCutoff] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [rightPanel, setRightPanel] = useState('agents'); // 'agents' | 'memory' | 'mirror' | null
    const [agentStates, setAgentStates] = useState({});
    const [graphDimensions, setGraphDimensions] = useState({ width: 0, height: 0 });
    const [mirrorReport, setMirrorReport] = useState(null);
    const [mirrorFullOpen, setMirrorFullOpen] = useState(false);
    const [hasNewReport, setHasNewReport] = useState(false);
    const [nodeTrajectories, setNodeTrajectories] = useState([]);
    const [historyMode, setHistoryMode] = useState(false);
    const [historySnapshots, setHistorySnapshots] = useState([]);
    const [autoFocusAgents, setAutoFocusAgents] = useState(false);
    const [simOverlay, setSimOverlay] = useState({
        active: false,
        agents: [],
        messages: [],
        speakingAgentKey: null,
    });
    const graphContainerRef = useRef(null);

    const addToast = useBrainStore(s => s.addToast);
    const { isMobile, isTablet, isTouchDevice } = useResponsive();

    // ─── Dynamic tab title ───────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const originalTitle = document.title;
        document.title = `Mindscape — ${nodes.length} thought${nodes.length !== 1 ? 's' : ''} mapped`;
        return () => { document.title = originalTitle; };
    }, [isOpen, nodes.length]);

    // ─── Fetch graph + agent states + mirror report on mount ─────────────
    useEffect(() => {
        if (!isOpen) return;
        fetchGraph();
        fetchAgentStates();
        fetchMirrorPreview();
    }, [isOpen]);

    const fetchGraph = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/mindmirror/graph');
            setNodes(res.data.nodes || []);
            setEdges(res.data.edges || []);

            // Check for pending background simulation
            if (res.data.pendingSimulation) {
                addToast({
                    type: 'info', icon: '◉',
                    message: 'A background simulation just completed — check the Agents panel',
                    duration: 4000,
                });
            }
        } catch (err) {
            console.error('Failed to fetch mind graph:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Failed to load mind graph', duration: 3000 });
        }
        setLoading(false);
    }, [addToast]);

    const fetchAgentStates = useCallback(async () => {
        try {
            const res = await api.get('/api/mindmirror/agent-states');
            setAgentStates(res.data.agentStates || {});
        } catch (err) {
            console.error('Failed to fetch agent states:', err);
        }
    }, []);

    const fetchMirrorPreview = useCallback(async () => {
        try {
            const res = await api.get('/api/mindmirror/mirror-report/latest');
            if (res.data.report) {
                setMirrorReport(res.data.report);
                setNodeTrajectories(res.data.nodeTrajectories || []);
                // Check if this report is < 24h old (new)
                const created = new Date(res.data.report.created_at);
                const hoursSince = (Date.now() - created) / (1000 * 60 * 60);
                if (hoursSince < 24) {
                    setHasNewReport(true);
                }
            }
        } catch (err) {
            console.error('Failed to fetch mirror report preview:', err);
        }
    }, []);

    // ─── Fetch snapshots for history mode ────────────────────────────────
    const fetchSnapshots = useCallback(async () => {
        try {
            const res = await api.get('/api/mindmirror/mirror-report/snapshots');
            setHistorySnapshots(res.data.snapshots || []);
        } catch (err) {
            console.error('Failed to fetch snapshots:', err);
        }
    }, []);

    useEffect(() => {
        if (historyMode && historySnapshots.length === 0) {
            fetchSnapshots();
        }
    }, [historyMode, historySnapshots.length, fetchSnapshots]);

    // ─── Measure graph container ─────────────────────────────────────────
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

    // ─── Node click handler ──────────────────────────────────────────────
    const handleNodeClick = useCallback((node) => {
        setSelectedNode(node);
    }, []);

    // ─── Resolve toggle handler ──────────────────────────────────────────
    const handleResolveToggle = useCallback((nodeId) => {
        setNodes(prev => prev.map(n =>
            n.id === nodeId ? { ...n, resolved: !n.resolved } : n
        ));
        if (selectedNode?.id === nodeId) {
            setSelectedNode(prev => prev ? { ...prev, resolved: !prev.resolved } : null);
        }
    }, [selectedNode]);

    // ─── Simulate trigger (for GodView button) ──────────────────────────
    const handleSimulateClick = useCallback(() => {
        setRightPanel('agents');
        setAutoFocusAgents(true);
        // Reset autoFocus after panel animation completes
        setTimeout(() => setAutoFocusAgents(false), 800);
    }, []);

    // ─── Simulation overlay callback ─────────────────────────────────
    const handleSimulationUpdate = useCallback((state) => {
        setSimOverlay(state);
    }, []);

    // ─── Mirror tab handlers ────────────────────────────────────────────
    const handleMirrorTabClick = useCallback(() => {
        setRightPanel(prev => prev === 'mirror' ? null : 'mirror');
        if (hasNewReport) setHasNewReport(false);
    }, [hasNewReport]);

    const handleOpenFullMirror = useCallback(() => {
        setMirrorFullOpen(true);
    }, []);

    // ─── History mode toggle ─────────────────────────────────────────────
    const handleHistoryModeChange = useCallback((enabled) => {
        setHistoryMode(enabled);
    }, []);

    // ─── Keyboard: Escape closes sidebar/page ────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handle = (e) => {
            if (e.key === 'Escape') {
                if (mirrorFullOpen) {
                    setMirrorFullOpen(false);
                } else if (selectedNode) {
                    setSelectedNode(null);
                } else {
                    onClose?.();
                }
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [isOpen, selectedNode, mirrorFullOpen, onClose]);

    if (!isOpen) return null;

    const isPanelOpen = rightPanel !== null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: '#050508',
                display: 'flex', flexDirection: 'column',
                fontFamily: font,
            }}
        >
            {/* ─── Top Bar: Back + God-View Controls ────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', flexShrink: 0,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                overflowX: isMobile ? 'auto' : 'visible',
                WebkitOverflowScrolling: 'touch',
            }}>
                {/* Back button */}
                <button
                    onClick={onClose}
                    style={{
                        padding: '0 16px', height: '44px',
                        background: 'none', border: 'none', borderRight: '1px solid rgba(255,255,255,0.04)',
                        color: 'rgba(232,244,253,0.4)', fontFamily: fontMono, fontSize: '11px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'color 0.15s', flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e8f4fd'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,244,253,0.4)'}
                >
                    <span style={{ fontSize: '13px' }}>←</span>
                    <span>Back</span>
                </button>

                {/* God-view controls (fills remaining space) */}
                <div style={{ flex: 1 }}>
                    <GodViewControls
                        nodes={nodes}
                        filter={filter}
                        onFilterChange={setFilter}
                        timelineCutoff={timelineCutoff}
                        onTimelineChange={setTimelineCutoff}
                        onSimulateClick={handleSimulateClick}
                        historyMode={historyMode}
                        onHistoryModeChange={handleHistoryModeChange}
                        historySnapshots={historySnapshots}
                    />
                </div>

                {/* Agent Dominance mini-chart — hidden on mobile */}
                {!isMobile && Object.keys(agentStates).length > 0 && (
                    <div style={{
                        padding: '0 8px', borderLeft: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', height: '44px',
                        flexShrink: 0,
                    }}>
                        <DominanceMiniBar agentStates={agentStates} />
                    </div>
                )}

                {/* Right panel tabs */}
                <button
                    onClick={() => setRightPanel(prev => prev === 'agents' ? null : 'agents')}
                    style={{
                        padding: '0 14px', height: '44px',
                        background: rightPanel === 'agents' ? 'rgba(155,127,232,0.06)' : 'none',
                        border: 'none', borderLeft: '1px solid rgba(255,255,255,0.04)',
                        color: rightPanel === 'agents' ? '#9B7FE8' : 'rgba(232,244,253,0.3)',
                        fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                        letterSpacing: '0.3px',
                    }}
                >
                    {isMobile ? '◉' : '◉ Agents'}
                </button>
                <button
                    onClick={() => setRightPanel(prev => prev === 'memory' ? null : 'memory')}
                    style={{
                        padding: '0 14px', height: '44px',
                        background: rightPanel === 'memory' ? 'rgba(29,184,138,0.06)' : 'none',
                        border: 'none', borderLeft: '1px solid rgba(255,255,255,0.04)',
                        color: rightPanel === 'memory' ? '#1DB88A' : 'rgba(232,244,253,0.3)',
                        fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                        letterSpacing: '0.3px',
                    }}
                >
                    {isMobile ? '◬' : '◬ Memory'}
                </button>
                <button
                    onClick={handleMirrorTabClick}
                    style={{
                        padding: '0 14px', height: '44px',
                        background: rightPanel === 'mirror' ? 'rgba(91,164,245,0.06)' : 'none',
                        border: 'none', borderLeft: '1px solid rgba(255,255,255,0.04)',
                        color: rightPanel === 'mirror' ? '#5BA4F5' : 'rgba(232,244,253,0.3)',
                        fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                        letterSpacing: '0.3px',
                        position: 'relative',
                    }}
                >
                    {isMobile ? '◈' : '◈ Mirror'}
                    {/* New report notification dot */}
                    {hasNewReport && (
                        <span style={{
                            position: 'absolute', top: '10px', right: '8px',
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#E85D4A',
                            boxShadow: '0 0 6px rgba(232,93,74,0.5)',
                            animation: 'mirrorDotPulse 2s ease-in-out 1',
                        }} />
                    )}
                </button>
            </div>

            {/* Notification dot pulse animation */}
            <style>{`
                @keyframes mirrorDotPulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.6); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            {/* ─── Main Content Area ────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
                {/* Graph Canvas */}
                <div
                    ref={graphContainerRef}
                    style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
                >
                    {loading ? (
                        <div style={{
                            width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: '#050508',
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                    style={{
                                        width: '24px', height: '24px', margin: '0 auto 12px',
                                        border: '2px solid rgba(155,127,232,0.1)',
                                        borderTop: '2px solid #9B7FE8', borderRadius: '50%',
                                    }}
                                />
                                <div style={{
                                    fontFamily: fontMono, fontSize: '11px',
                                    color: 'rgba(232,244,253,0.2)', letterSpacing: '2px',
                                    textTransform: 'uppercase',
                                }}>Mapping consciousness...</div>
                            </div>
                        </div>
                    ) : (
                        <MindGraph
                            nodes={nodes}
                            edges={edges}
                            filter={filter}
                            timelineCutoff={timelineCutoff}
                            onNodeClick={handleNodeClick}
                            width={graphDimensions.width}
                            height={graphDimensions.height}
                            nodeTrajectories={nodeTrajectories}
                            historyMode={historyMode}
                        />
                    )}

                    {/* Floating Dominance Arc Chart (bottom-left corner) */}
                    {Object.keys(agentStates).length > 0 && !loading && (
                        <div style={{
                            position: 'absolute', bottom: '20px', left: '20px',
                            background: 'rgba(13,15,20,0.85)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '16px',
                            padding: '14px',
                            zIndex: 10,
                        }}>
                            <DominanceArcChart agentStates={agentStates} />
                        </div>
                    )}

                    {/* Agent Dialogue Overlay (neural constellation on graph) */}
                    <AgentDialogueOverlay
                        active={simOverlay.active}
                        agents={simOverlay.agents}
                        speakingAgentKey={simOverlay.speakingAgentKey}
                        messages={simOverlay.messages}
                        width={graphDimensions.width}
                        height={graphDimensions.height}
                    />
                </div>

                {/* Right Panel: Agents, Memory, or Mirror */}
                <AnimatePresence>
                    {rightPanel === 'agents' && (
                        <motion.div
                            initial={isMobile ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            animate={isMobile ? { y: 0, opacity: 1 } : { width: isTablet ? 320 : 380, opacity: 1 }}
                            exit={isMobile ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={isMobile ? { position: 'absolute', inset: 0, zIndex: 20, background: '#08090E', overflow: 'auto' } : { flexShrink: 0, overflow: 'hidden' }}
                        >
                            <AgentSimulation isOpen={true} autoFocus={autoFocusAgents} onSimulationUpdate={handleSimulationUpdate} />
                        </motion.div>
                    )}
                    {rightPanel === 'memory' && (
                        <motion.div
                            initial={isMobile ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            animate={isMobile ? { y: 0, opacity: 1 } : { width: isTablet ? 320 : 380, opacity: 1 }}
                            exit={isMobile ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={isMobile ? { position: 'absolute', inset: 0, zIndex: 20, background: '#08090E', overflow: 'auto' } : { flexShrink: 0, overflow: 'hidden' }}
                        >
                            <AgentMemoryPanel isOpen={true} />
                        </motion.div>
                    )}
                    {rightPanel === 'mirror' && (
                        <motion.div
                            initial={isMobile ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            animate={isMobile ? { y: 0, opacity: 1 } : { width: isTablet ? 320 : 380, opacity: 1 }}
                            exit={isMobile ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={isMobile ? { position: 'absolute', inset: 0, zIndex: 20, background: '#08090E', overflow: 'auto' } : {
                                flexShrink: 0, overflow: 'hidden',
                                borderLeft: '1px solid rgba(255,255,255,0.04)',
                                background: '#08090E',
                                display: 'flex', flexDirection: 'column',
                            }}
                        >
                            <div style={{
                                padding: '14px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                    color: 'rgba(232,244,253,0.25)', letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                }}>Mirror Report</div>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
                                <MirrorReportPreview
                                    report={mirrorReport}
                                    onReadFull={handleOpenFullMirror}
                                />
                                {!mirrorReport && (
                                    <div style={{
                                        textAlign: 'center', padding: '20px 0',
                                        fontFamily: fontMono, fontSize: '10px',
                                        color: 'rgba(232,244,253,0.15)', lineHeight: '1.6',
                                    }}>
                                        No report yet.<br />
                                        Keep journaling — your Mirror will speak soon.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Node Sidebar (overlay) */}
                <AnimatePresence>
                    {selectedNode && (
                        <NodeSidebar
                            node={selectedNode}
                            edges={edges}
                            allNodes={nodes}
                            onClose={() => setSelectedNode(null)}
                            onResolveToggle={handleResolveToggle}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Full-screen Mirror Report overlay */}
            <AnimatePresence>
                {mirrorFullOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 400,
                            background: '#08090E',
                        }}
                    >
                        <div style={{
                            height: '44px', display: 'flex', alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            padding: '0 16px',
                        }}>
                            <button
                                onClick={() => setMirrorFullOpen(false)}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'rgba(232,244,253,0.4)',
                                    fontFamily: fontMono, fontSize: '11px',
                                    cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: '6px',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#e8f4fd'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,244,253,0.4)'}
                            >
                                <span style={{ fontSize: '13px' }}>←</span>
                                <span>Back to Mindscape</span>
                            </button>
                        </div>
                        <div style={{ height: 'calc(100% - 44px)' }}>
                            <MirrorReport isOpen={true} onClose={() => setMirrorFullOpen(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


// ─── Mini Dominance Bar (inline in top bar) ──────────────────────────────────
function DominanceMiniBar({ agentStates }) {
    // Only show agents that have states and scores > 0
    const entries = Object.keys(agentStates)
        .filter(key => AGENT_COLORS[key] && (agentStates[key]?.dominance_score || 0) > 0)
        .map(key => ({
            key,
            meta: AGENT_COLORS[key],
            score: agentStates[key]?.dominance_score || 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8); // Show top 8 segments max

    const total = entries.reduce((s, e) => s + e.score, 0) || 1;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            height: '16px', width: '80px',
        }}>
            {entries.map(({ key, meta, score }) => {
                const pct = (score / total) * 100;
                return (
                    <div
                        key={key}
                        title={`${meta.label}: ${Math.round(pct)}%`}
                        style={{
                            height: '4px',
                            width: `${Math.max(pct, 2)}%`,
                            background: meta.color,
                            borderRadius: '2px',
                            opacity: 0.6,
                            transition: 'width 0.5s ease',
                        }}
                    />
                );
            })}
        </div>
    );
}
