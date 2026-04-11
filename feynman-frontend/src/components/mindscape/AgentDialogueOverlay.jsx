// ═══════════════════════════════════════════════════════════════════════════
// AgentDialogueOverlay.jsx — Neural Constellation Animation
// Visual overlay that shows agents as floating orbs sending signal beams
// to each other during a simulation. Appears on top of the MindGraph.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const fontMono = "'SF Pro Text', -apple-system, sans-serif";
const font = "'SF Pro Display', -apple-system, sans-serif";

// ─── Layout: arrange agents in an elliptical orbit ───────────────────────────
function getOrbitPosition(index, total, cx, cy, rx, ry) {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
    };
}


// ─── Signal Beam (animated line between two points) ──────────────────────────
function SignalBeam({ x1, y1, x2, y2, color, delay = 0 }) {
    const id = `beam-${Math.random().toString(36).slice(2, 8)}`;

    return (
        <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay }}
        >
            {/* Glow layer */}
            <motion.line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={3}
                strokeOpacity={0.08}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay, ease: 'easeOut' }}
            />
            {/* Core line */}
            <motion.line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.25}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay, ease: 'easeOut' }}
            />
            {/* Traveling pulse dot */}
            <defs>
                <radialGradient id={id}>
                    <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
            </defs>
            <motion.circle
                r={4}
                fill={`url(#${id})`}
                initial={{ cx: x1, cy: y1, opacity: 0 }}
                animate={{
                    cx: [x1, x2],
                    cy: [y1, y2],
                    opacity: [0, 1, 1, 0],
                }}
                transition={{
                    duration: 0.8,
                    delay: delay + 0.15,
                    ease: 'easeInOut',
                }}
            />
        </motion.g>
    );
}


// ─── Agent Orb ───────────────────────────────────────────────────────────────
function AgentOrb({ agent, x, y, isSpeaking, isActive, index }) {
    const icon = agent.icon || '◆';

    return (
        <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: isActive ? 1 : 0.3,
                scale: 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
                duration: 0.5,
                delay: index * 0.06,
                type: 'spring',
                damping: 15,
            }}
        >
            {/* Outer pulse ring (when speaking) */}
            {isSpeaking && (
                <motion.circle
                    cx={x} cy={y} r={28}
                    fill="none"
                    stroke={agent.color}
                    strokeWidth={1}
                    initial={{ opacity: 0.6, r: 18 }}
                    animate={{
                        opacity: [0.5, 0],
                        r: [18, 38],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: 'easeOut',
                    }}
                />
            )}

            {/* Ambient glow */}
            <circle
                cx={x} cy={y}
                r={isSpeaking ? 22 : 16}
                fill={agent.color}
                opacity={isSpeaking ? 0.06 : 0.02}
                style={{ transition: 'all 0.4s ease', filter: 'blur(8px)' }}
            />

            {/* Core orb */}
            <motion.circle
                cx={x} cy={y}
                r={isSpeaking ? 16 : 12}
                fill={`${agent.color}15`}
                stroke={agent.color}
                strokeWidth={isSpeaking ? 1.5 : 0.5}
                strokeOpacity={isSpeaking ? 0.7 : 0.25}
                animate={{
                    r: isSpeaking ? [14, 16, 14] : 12,
                }}
                transition={{
                    duration: 1.5,
                    repeat: isSpeaking ? Infinity : 0,
                    ease: 'easeInOut',
                }}
            />

            {/* Icon glyph */}
            <text
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={agent.color}
                fontSize={isSpeaking ? '11px' : '9px'}
                fontFamily={fontMono}
                fontWeight="600"
                opacity={isSpeaking ? 0.9 : 0.5}
                style={{ transition: 'all 0.3s', pointerEvents: 'none' }}
            >
                {icon}
            </text>

            {/* Name label (only when speaking or hovered) */}
            <motion.text
                x={x}
                y={y + (isSpeaking ? 26 : 22)}
                textAnchor="middle"
                fill={agent.color}
                fontSize="7px"
                fontFamily={fontMono}
                fontWeight="600"
                letterSpacing="0.5"
                opacity={isSpeaking ? 0.7 : 0.2}
                style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
            >
                {agent.emotion || agent.name?.replace('The ', '')}
            </motion.text>
        </motion.g>
    );
}


// ─── Center Nexus (the brain center where signals converge) ──────────────────
function CenterNexus({ cx, cy, active }) {
    return (
        <g>
            {/* Outer rotating ring */}
            {active && (
                <motion.circle
                    cx={cx} cy={cy} r={6}
                    fill="none"
                    stroke="rgba(129,140,248,0.2)"
                    strokeWidth={0.5}
                    strokeDasharray="2 4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
            )}
            {/* Core dot */}
            <motion.circle
                cx={cx} cy={cy}
                r={active ? 3 : 2}
                fill={active ? '#818CF8' : 'rgba(255,255,255,0.1)'}
                animate={{
                    opacity: active ? [0.5, 1, 0.5] : 0.3,
                    r: active ? [2.5, 3.5, 2.5] : 2,
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            {/* Glow */}
            {active && (
                <circle
                    cx={cx} cy={cy} r={12}
                    fill="#818CF8"
                    opacity={0.04}
                    style={{ filter: 'blur(6px)' }}
                />
            )}
        </g>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// AgentDialogueOverlay — Main Component
// ═══════════════════════════════════════════════════════════════════════════

const AGENT_ICONS = {
    sentinel: '◆', fury: '▲', euphoric: '○', mourner: '◇',
    believer: '□', purist: '✦', oracle: '◎', witness: '◉',
    phantom: '◈', exile: '▽', crown: '♕',
    mirror_agent: '◆', hollow: '◌', bridge: '⌒', garden: '✧',
    void: '●', torch: '△', ghost: '○',
    judge: '⬡', hearth: '◇', sublime: '✦', abyss: '◉',
    wanderer: '✦', anchor: '◇', spark: '▲', drift: '◌',
};

export default function AgentDialogueOverlay({
    active = false,
    agents = [],
    speakingAgentKey = null,
    messages = [],
    width = 800,
    height = 600,
}) {
    const [beams, setBeams] = useState([]);
    const [prevMsgCount, setPrevMsgCount] = useState(0);
    const beamIdCounter = useRef(0);

    const cx = width / 2;
    const cy = height / 2;
    const rx = Math.min(width * 0.28, 180);
    const ry = Math.min(height * 0.28, 140);

    // Agent positions
    const agentPositions = useMemo(() => {
        if (!agents.length) return {};
        const positions = {};
        agents.forEach((a, i) => {
            const pos = getOrbitPosition(i, agents.length, cx, cy, rx, ry);
            positions[a.key] = pos;
        });
        return positions;
    }, [agents, cx, cy, rx, ry]);

    // Enriched agents with icons
    const enrichedAgents = useMemo(() =>
        agents.map(a => ({
            ...a,
            icon: AGENT_ICONS[a.key] || '◆',
        })),
    [agents]);

    // Fire signal beams when new messages arrive
    useEffect(() => {
        if (messages.length <= prevMsgCount) {
            setPrevMsgCount(messages.length);
            return;
        }

        const newMsgs = messages.slice(prevMsgCount);
        setPrevMsgCount(messages.length);

        const newBeams = [];

        for (const msg of newMsgs) {
            const fromPos = agentPositions[msg.agentKey];
            if (!fromPos) continue;

            // Send beam from agent to center
            newBeams.push({
                id: `beam-${beamIdCounter.current++}`,
                x1: fromPos.x, y1: fromPos.y,
                x2: cx, y2: cy,
                color: msg.color || '#818CF8',
                delay: 0,
            });

            // Also send beams to 1-2 random other agents (simulating cross-talk)
            const otherAgents = agents.filter(a => a.key !== msg.agentKey);
            const targets = otherAgents
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.min(2, otherAgents.length));

            targets.forEach((target, i) => {
                const toPos = agentPositions[target.key];
                if (!toPos) return;
                newBeams.push({
                    id: `beam-${beamIdCounter.current++}`,
                    x1: fromPos.x, y1: fromPos.y,
                    x2: toPos.x, y2: toPos.y,
                    color: msg.color || '#818CF8',
                    delay: 0.15 * (i + 1),
                });
            });
        }

        setBeams(prev => [...prev, ...newBeams]);

        // Clean up old beams after animation
        const timer = setTimeout(() => {
            setBeams(prev => prev.filter(b => !newBeams.find(nb => nb.id === b.id)));
        }, 2000);

        return () => clearTimeout(timer);
    }, [messages.length, prevMsgCount, agentPositions, agents, cx, cy]);

    // Reset beams when simulation ends
    useEffect(() => {
        if (!active) {
            setBeams([]);
            setPrevMsgCount(0);
        }
    }, [active]);

    if (!active && agents.length === 0) return null;

    return (
        <AnimatePresence>
            {(active || agents.length > 0) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 5,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                    }}
                >
                    <svg
                        width={width}
                        height={height}
                        viewBox={`0 0 ${width} ${height}`}
                        style={{ width: '100%', height: '100%' }}
                    >
                        {/* Ambient connection lines (dormant) */}
                        {enrichedAgents.map((agent, i) => {
                            const pos = agentPositions[agent.key];
                            if (!pos) return null;
                            return (
                                <motion.line
                                    key={`conn-${agent.key}`}
                                    x1={pos.x} y1={pos.y}
                                    x2={cx} y2={cy}
                                    stroke={agent.color}
                                    strokeWidth={0.5}
                                    strokeOpacity={0.04}
                                    strokeDasharray="2 6"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.08, duration: 0.6 }}
                                />
                            );
                        })}

                        {/* Signal beams */}
                        <AnimatePresence>
                            {beams.map(beam => (
                                <SignalBeam
                                    key={beam.id}
                                    x1={beam.x1} y1={beam.y1}
                                    x2={beam.x2} y2={beam.y2}
                                    color={beam.color}
                                    delay={beam.delay}
                                />
                            ))}
                        </AnimatePresence>

                        {/* Center nexus */}
                        <CenterNexus cx={cx} cy={cy} active={active} />

                        {/* Agent orbs */}
                        <AnimatePresence>
                            {enrichedAgents.map((agent, i) => {
                                const pos = agentPositions[agent.key];
                                if (!pos) return null;
                                return (
                                    <AgentOrb
                                        key={agent.key}
                                        agent={agent}
                                        x={pos.x}
                                        y={pos.y}
                                        isSpeaking={speakingAgentKey === agent.key}
                                        isActive={active}
                                        index={i}
                                    />
                                );
                            })}
                        </AnimatePresence>

                        {/* Title label */}
                        {active && (
                            <motion.text
                                x={cx}
                                y={cy + ry + 36}
                                textAnchor="middle"
                                fill="rgba(129,140,248,0.2)"
                                fontSize="8px"
                                fontFamily={fontMono}
                                fontWeight="600"
                                letterSpacing="3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                style={{ textTransform: 'uppercase', pointerEvents: 'none' }}
                            >
                                NEURAL DIALOGUE
                            </motion.text>
                        )}
                    </svg>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
