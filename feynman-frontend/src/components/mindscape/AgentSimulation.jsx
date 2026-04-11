// ═══════════════════════════════════════════════════════════════════════════
// AgentSimulation.jsx — Inner Dialogue: 26 Emotion Agents Thinking Simulation
// Agents selected dynamically from 26 emotion agents debate the user's thought.
// Features: chat-style conversation, round indicators, typing animation,
// agent emotion badges, memory references, and simulation summary.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

// ─── 26 Emotion Agent Registry (geometric glyphs — NO emojis) ────────────────
const AGENT_REGISTRY = {
    // Core 8 (Plutchik Primary)
    sentinel:     { name: 'The Sentinel',  color: '#E85D4A', emotion: 'Fear',         icon: '◆', category: 'Core',         desc: 'Your threat-detection system. Activates when the mind perceives danger — real or imagined. Guards against reckless decisions by surfacing worst-case scenarios.' },
    fury:         { name: 'The Fury',      color: '#FF4136', emotion: 'Anger',        icon: '▲', category: 'Core',         desc: 'The boundary enforcer. Fires when your values are violated or you feel disrespected. Channeled well, it drives change. Unchecked, it burns bridges.' },
    euphoric:     { name: 'The Euphoric',  color: '#FFD700', emotion: 'Joy',          icon: '○', category: 'Core',         desc: 'The celebration engine. Lights up during moments of achievement, connection, or play. It reinforces behaviors that make life feel worth living.' },
    mourner:      { name: 'The Mourner',   color: '#6B7B8D', emotion: 'Sadness',      icon: '◇', category: 'Core',         desc: 'The loss processor. Activates when something meaningful is gone — a relationship, an identity, a dream. Critical for letting go and moving forward.' },
    believer:     { name: 'The Believer',  color: '#2ECC71', emotion: 'Trust',        icon: '□', category: 'Core',         desc: 'The faith keeper. Decides who and what you can rely on. When dominant, you feel safe. When wounded, paranoia and isolation follow.' },
    purist:       { name: 'The Purist',    color: '#8B5CF6', emotion: 'Disgust',      icon: '✦', category: 'Core',         desc: 'The contamination detector. Rejects what feels morally or physically toxic. Protects your identity by drawing hard lines about what you will not tolerate.' },
    oracle:       { name: 'The Oracle',    color: '#F59E0B', emotion: 'Anticipation', icon: '◎', category: 'Core',         desc: 'The forward-scanner. Always simulating what comes next. Dominant in planners and overthinkers. It fuels preparation but can spiral into anxiety.' },
    witness:      { name: 'The Witness',   color: '#FBBF24', emotion: 'Surprise',     icon: '◉', category: 'Core',         desc: 'The pattern-breaker. Activates when reality defies expectation — positive or negative. Forces the mind to update its model of the world.' },
    // Self-Conscious
    phantom:      { name: 'The Phantom',   color: '#A3A3A3', emotion: 'Guilt',        icon: '◈', category: 'Self',         desc: 'The moral accountant. Haunts you with things you did (or didn\'t do). Weight grows until addressed through action, confession, or forgiveness.' },
    exile:        { name: 'The Exile',     color: '#92400E', emotion: 'Shame',        icon: '▽', category: 'Self',         desc: 'The identity wound. Unlike guilt (I did bad), shame says I am bad. Hides in the shadows and drives self-sabotage until it\'s brought into the light.' },
    crown:        { name: 'The Crown',     color: '#D4AF37', emotion: 'Pride',        icon: '♕', category: 'Self',         desc: 'The status tracker. Measures your worth against your own standards and the world\'s. Healthy pride fuels confidence; toxic pride creates blind spots.' },
    // Social
    mirror_agent: { name: 'The Mirror',    color: '#10B981', emotion: 'Envy',         icon: '◆', category: 'Social',       desc: 'The comparison engine. Observes others and measures what you lack. Can motivate transformation or breed resentment — depends on how you channel it.' },
    hollow:       { name: 'The Hollow',    color: '#6366F1', emotion: 'Loneliness',   icon: '◌', category: 'Social',       desc: 'The connection seeker. Aches when meaningful bonds are absent. Not about being alone — it\'s about feeling unseen by the people who matter.' },
    bridge:       { name: 'The Bridge',    color: '#14B8A6', emotion: 'Empathy',      icon: '⌒', category: 'Social',       desc: 'The emotional translator. Lets you feel what others feel and understand their perspective. The foundation of deep relationships and moral reasoning.' },
    garden:       { name: 'The Garden',    color: '#84CC16', emotion: 'Gratitude',    icon: '✧', category: 'Social',       desc: 'The abundance recognizer. Highlights what\'s already good in your life. Active gratitude rewires the brain toward resilience and satisfaction.' },
    // Anticipatory
    void:         { name: 'The Void',      color: '#EF4444', emotion: 'Anxiety',      icon: '●', category: 'Anticipatory', desc: 'The catastrophe simulator. Fear projected into the future. Runs worst-case loops about things that haven\'t happened yet. The mind\'s smoke alarm.' },
    torch:        { name: 'The Torch',     color: '#3B82F6', emotion: 'Hope',         icon: '△', category: 'Anticipatory', desc: 'The possibility engine. Believes things can get better. Without it, action stops. The emotional fuel behind every goal, recovery, and fresh start.' },
    ghost:        { name: 'The Ghost',     color: '#9CA3AF', emotion: 'Regret',       icon: '○', category: 'Anticipatory', desc: 'The replayer. Loops past decisions you wish you could undo. Can teach wisdom or trap you in paralysis. Resolution comes from acceptance, not time travel.' },
    // Complex Dyads
    judge:        { name: 'The Judge',     color: '#7C3AED', emotion: 'Contempt',     icon: '⬡', category: 'Dyad',         desc: 'The hierarchy enforcer. A cocktail of anger + disgust directed at someone you\'ve deemed "beneath." The most corrosive social emotion — dissolves respect.' },
    hearth:       { name: 'The Hearth',    color: '#EC4899', emotion: 'Love',         icon: '◇', category: 'Dyad',         desc: 'The deep attachment bond. Combines trust + joy + vulnerability. Not just romance — it\'s the warmth you feel toward family, friends, places, and ideas.' },
    sublime:      { name: 'The Sublime',   color: '#818CF8', emotion: 'Awe',          icon: '✦', category: 'Dyad',         desc: 'The wonder response. Fires when something is so vast or beautiful that it temporarily dissolves your sense of self. Resets perspective and inspires humility.' },
    abyss:        { name: 'The Abyss',     color: '#374151', emotion: 'Despair',      icon: '◉', category: 'Dyad',         desc: 'The hopelessness signal. What happens when sadness meets helplessness. The mind\'s way of saying "something fundamental must change." Demands to be heard.' },
    // Behavioral
    wanderer:     { name: 'The Wanderer',  color: '#06B6D4', emotion: 'Curiosity',    icon: '✦', category: 'Behavioral',   desc: 'The exploration drive. Pulls you toward the unknown. The engine behind learning, creativity, and growth. Needs novelty like the body needs food.' },
    anchor:       { name: 'The Anchor',    color: '#D4678A', emotion: 'Nostalgia',    icon: '◇', category: 'Behavioral',   desc: 'The past-reaches back. Bittersweet attachment to what was. Can provide comfort and identity — or keep you from growing into who you\'re becoming.' },
    spark:        { name: 'The Spark',     color: '#F97316', emotion: 'Frustration',  icon: '▲', category: 'Behavioral',   desc: 'The blocked-goal detector. Fires when effort meets obstacle. The emotional precursor to either problem-solving or giving up. How you handle it defines growth.' },
    drift:        { name: 'The Drift',     color: '#78716C', emotion: 'Boredom',      icon: '◌', category: 'Behavioral',   desc: 'The meaning vacuum. Signals that current activity lacks purpose or challenge. A quiet alarm that you\'re not living up to your potential.' },
};


// ─── Typewriter Hook (slower for realism) ────────────────────────────────────
function useTypewriter(text, speed = 28, active = false) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!active || !text) { setDisplayed(text || ''); setDone(true); return; }
        setDisplayed('');
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) { setDone(true); clearInterval(interval); }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed, active]);

    return { displayed, done };
}


// ─── Agent Message Bubble ────────────────────────────────────────────────────
function AgentMessage({ msg, index, isLatest, isFirstInRound }) {
    const { displayed, done } = useTypewriter(msg.message, 28, isLatest);
    const agentInfo = AGENT_REGISTRY[msg.agentKey] || {};
    const hasMemRef = msg.hasMemoryRef;

    return (
        <>
            {/* Round divider */}
            {isFirstInRound && msg.round > 1 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    margin: '18px 0 12px',
                }}>
                    <div style={{
                        flex: 1, height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                    }} />
                    <span style={{
                        fontFamily: fontMono, fontSize: '8px', fontWeight: 600,
                        color: 'rgba(232,244,253,0.15)', letterSpacing: '2px',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                        {msg.round === 2 ? '◆ DEBATE' : '◆ FINAL POSITIONS'}
                    </span>
                    <div style={{
                        flex: 1, height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                    }} />
                </div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                    display: 'flex', gap: '10px',
                    padding: '8px 0',
                    position: 'relative',
                }}
            >
                {/* Agent Avatar (geometric glyph) */}
                <div style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: `linear-gradient(135deg, ${msg.color}15, ${msg.color}06)`,
                    border: `1px solid ${msg.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', flexShrink: 0,
                    color: msg.color,
                    boxShadow: hasMemRef ? `0 0 12px ${msg.color}15` : 'none',
                    fontFamily: fontMono,
                }}>
                    {agentInfo.icon || '◆'}
                </div>

                {/* Message Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Agent header row */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginBottom: '4px',
                    }}>
                        <span style={{
                            fontFamily: font, fontSize: '11.5px', fontWeight: 700,
                            color: msg.color,
                        }}>{msg.agent.replace('The ', '')}</span>
                        <span style={{
                            fontFamily: fontMono, fontSize: '8px', fontWeight: 500,
                            color: `${msg.color}80`,
                            padding: '1px 5px', borderRadius: '4px',
                            background: `${msg.color}0A`,
                            border: `1px solid ${msg.color}15`,
                            letterSpacing: '0.5px',
                        }}>{agentInfo.emotion}</span>
                        {hasMemRef && (
                            <span style={{
                                fontFamily: fontMono, fontSize: '7px', fontWeight: 600,
                                color: '#F59E0B', opacity: 0.7,
                                padding: '1px 5px', borderRadius: '3px',
                                background: 'rgba(245,158,11,0.08)',
                                letterSpacing: '0.5px',
                            }}>MEMORY</span>
                        )}
                    </div>

                    {/* Message bubble */}
                    <div style={{
                        background: '#12151C',
                        borderRadius: '4px 12px 12px 12px',
                        padding: '10px 14px',
                        borderLeft: `2px solid ${msg.color}30`,
                        ...(hasMemRef ? {
                            boxShadow: `inset 2px 0 10px -4px ${msg.color}15`,
                        } : {}),
                    }}>
                        <div style={{
                            fontFamily: fontMono, fontSize: '12px', lineHeight: '1.65',
                            color: 'rgba(232,244,253,0.72)',
                        }}>
                            {isLatest && !done ? displayed : msg.message}
                            {isLatest && !done && (
                                <span style={{
                                    display: 'inline-block', width: '2px', height: '13px',
                                    background: msg.color, marginLeft: '2px',
                                    animation: 'blink 0.7s step-end infinite',
                                    verticalAlign: 'text-bottom',
                                }} />
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}


// ─── Active Agent Roster (shows which agents are debating + descriptions) ────
function ActiveAgentRoster({ agents, agentStates }) {
    const [expandedKey, setExpandedKey] = useState(null);

    if (!agents || agents.length === 0) return null;

    const toggleExpand = (key) => setExpandedKey(prev => prev === key ? null : key);

    return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px',
                padding: '10px 16px',
            }}>
                {agents.map(a => {
                    const info = AGENT_REGISTRY[a.key] || {};
                    const state = agentStates?.[a.key] || {};
                    const dominance = state.dominance_score || 0;
                    const isExpanded = expandedKey === a.key;

                    return (
                        <motion.div
                            key={a.key}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => toggleExpand(a.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '4px 8px 4px 6px', borderRadius: '8px',
                                background: isExpanded ? `${a.color}18` : `${a.color}08`,
                                border: `1px solid ${isExpanded ? `${a.color}30` : `${a.color}15`}`,
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <span style={{
                                fontSize: '11px', color: a.color, fontFamily: fontMono,
                             }}>{info.icon}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                    fontFamily: fontMono, fontSize: '8.5px', fontWeight: 600,
                                    color: a.color, opacity: 0.9, lineHeight: '1.2',
                                }}>{info.emotion || a.name.replace('The ', '')}</span>
                                {/* Dominance micro-bar */}
                                <div style={{
                                    width: '36px', height: '1.5px', borderRadius: '1px',
                                    background: 'rgba(255,255,255,0.04)', marginTop: '2px',
                                    overflow: 'hidden',
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round(dominance * 100)}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        style={{
                                            height: '100%', borderRadius: '1px',
                                            background: a.color, opacity: 0.6,
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Expanded description panel */}
            <AnimatePresence>
                {expandedKey && (() => {
                    const info = AGENT_REGISTRY[expandedKey] || {};
                    const agentData = agents.find(a => a.key === expandedKey);
                    const c = agentData?.color || info.color || '#fff';
                    return (
                        <motion.div
                            key={`desc-${expandedKey}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                margin: '0 16px 10px',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                background: `linear-gradient(135deg, ${c}06, ${c}03)`,
                                border: `1px solid ${c}15`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{ fontFamily: fontMono, fontSize: '14px', color: c }}>{info.icon}</span>
                                    <div>
                                        <div style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: c }}>{info.name}</div>
                                        <div style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{info.category} · {info.emotion}</div>
                                    </div>
                                </div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '10px', lineHeight: '1.7',
                                    color: 'rgba(232,244,253,0.5)',
                                }}>{info.desc}</div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}


// ─── Past Simulations Modal ──────────────────────────────────────────────────
function PastSimulationsModal({ isOpen, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        api.get('/api/mindmirror/simulation-history?limit=20')
            .then(res => setHistory(res.data.history || []))
            .catch(err => console.error('Failed to fetch simulation history:', err))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'absolute', inset: 0, zIndex: 50,
                background: 'rgba(5,5,8,0.92)',
                backdropFilter: 'blur(12px)',
                display: 'flex', flexDirection: 'column',
            }}
        >
            <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: font, fontSize: '13px', fontWeight: 700,
                    color: '#e8f4fd',
                }}>▤ Past Simulations</span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none', border: 'none', color: 'rgba(232,244,253,0.3)',
                        fontFamily: fontMono, fontSize: '11px', cursor: 'pointer',
                        padding: '4px 8px', borderRadius: '4px',
                    }}
                >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {loading && (
                    <div style={{
                        textAlign: 'center', padding: '30px',
                        color: 'rgba(232,244,253,0.2)', fontFamily: fontMono, fontSize: '11px',
                    }}>Loading...</div>
                )}

                {!loading && history.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '30px',
                        color: 'rgba(232,244,253,0.15)', fontFamily: fontMono, fontSize: '11px',
                    }}>No past simulations yet.</div>
                )}

                {history.map(sim => {
                    const date = new Date(sim.created_at);
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const trigger = sim.trigger_content
                        ? (sim.trigger_content.length > 60 ? sim.trigger_content.slice(0, 60) + '…' : sim.trigger_content)
                        : 'Unknown trigger';
                    const insight = sim.summary?.insights?.[0] || 'No summary available';
                    const dominantInfo = Object.values(AGENT_REGISTRY).find(a => a.name === sim.dominant_agent);
                    const dominantColor = dominantInfo?.color || '#888';

                    return (
                        <div key={sim.id} style={{
                            background: '#141720',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            marginBottom: '8px',
                            borderLeft: `3px solid ${dominantColor}`,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: '6px',
                            }}>
                                <span style={{
                                    fontFamily: fontMono, fontSize: '9px',
                                    color: 'rgba(232,244,253,0.3)',
                                }}>{dateStr} · {timeStr}</span>
                                <span style={{
                                    fontFamily: fontMono, fontSize: '8px',
                                    padding: '2px 6px', borderRadius: '4px',
                                    background: sim.trigger_type === 'auto_journal'
                                        ? 'rgba(245,166,35,0.1)' : 'rgba(155,127,232,0.1)',
                                    color: sim.trigger_type === 'auto_journal'
                                        ? '#F5A623' : '#9B7FE8',
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>{sim.trigger_type === 'auto_journal' ? 'Auto' : 'Manual'}</span>
                            </div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '11px',
                                color: 'rgba(232,244,253,0.55)', marginBottom: '4px',
                                fontStyle: 'italic',
                            }}>"{trigger}"</div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '10px',
                                color: 'rgba(232,244,253,0.4)', marginBottom: '4px',
                            }}>{insight}</div>
                            <div style={{
                                fontFamily: fontMono, fontSize: '9px',
                                color: dominantColor, opacity: 0.7,
                            }}>Dominant: {sim.dominant_agent}</div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}


// ─── Thinking Indicator ──────────────────────────────────────────────────────
function ThinkingIndicator({ round, totalRounds }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px',
            }}
        >
            <div style={{
                display: 'flex', gap: '3px', alignItems: 'center',
            }}>
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        animate={{
                            opacity: [0.2, 0.8, 0.2],
                            scale: [0.8, 1.1, 0.8],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                        style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #818CF8, #9B7FE8)',
                        }}
                    />
                ))}
            </div>
            <span style={{
                fontFamily: fontMono, fontSize: '10px',
                color: 'rgba(155,127,232,0.5)',
            }}>
                {round <= totalRounds
                    ? `Agents thinking (round ${round}/${totalRounds})...`
                    : 'Synthesizing insights...'
                }
            </span>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// AgentSimulation — Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function AgentSimulation({ isOpen, autoFocus = false, onSimulationUpdate }) {
    const [thought, setThought] = useState('');
    const [simulating, setSimulating] = useState(false);
    const [messages, setMessages] = useState([]);
    const [summary, setSummary] = useState(null);
    const [latestIdx, setLatestIdx] = useState(-1);
    const [agentStates, setAgentStates] = useState({});
    const [activeAgents, setActiveAgents] = useState([]);
    const [newMemoriesCount, setNewMemoriesCount] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [currentRound, setCurrentRound] = useState(0);
    const feedRef = useRef(null);
    const inputRef = useRef(null);
    const addToast = useBrainStore(s => s.addToast);

    // ─── Fetch agent states on mount ─────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        api.get('/api/mindmirror/agent-states')
            .then(res => setAgentStates(res.data.agentStates || {}))
            .catch(err => console.error('Failed to fetch agent states:', err));
    }, [isOpen]);

    // Auto-focus input when panel opens or when triggered by simulate button
    useEffect(() => {
        if (isOpen && autoFocus && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, autoFocus]);

    // Auto-scroll feed
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [messages.length, latestIdx]);

    // ─── Run simulation ──────────────────────────────────────────────
    const handleSimulate = useCallback(async () => {
        if (!thought.trim() || simulating) return;
        setSimulating(true);
        setMessages([]);
        setSummary(null);
        setLatestIdx(-1);
        setNewMemoriesCount(0);
        setActiveAgents([]);
        setCurrentRound(1);

        // Notify parent: simulation starting
        onSimulationUpdate?.({ active: true, agents: [], messages: [], speakingAgentKey: null });

        const savedThought = thought.trim();

        try {
            // Save thought as journal (parallel, non-blocking)
            api.post('/api/mindmirror/journal', {
                content: savedThought,
                mode: 'subconscious',
            }).then(() => {
                addToast({
                    type: 'success', icon: '♦',
                    message: 'Thought saved to journal',
                    duration: 2000,
                });
            }).catch(err => {
                console.warn('Failed to save thought to journal:', err);
            });

            const res = await api.post('/api/mindmirror/simulate-thought', {
                thought: savedThought,
            });

            const { rounds, summary: sim, agentStates: states, newMemoriesCreated, activeAgents: active } = res.data;

            if (active) {
                setActiveAgents(active);
                // Notify parent: agents selected
                onSimulationUpdate?.({ active: true, agents: active, messages: [], speakingAgentKey: null });
            }

            // Update agent states with fresh data
            if (states) setAgentStates(prev => {
                const merged = { ...prev };
                for (const [key, val] of Object.entries(states)) {
                    merged[key] = { ...(merged[key] || {}), ...val };
                }
                return merged;
            });

            // Stream messages slowly — stagger messages with realistic pauses
            const allMsgs = rounds.flat();
            for (let i = 0; i < allMsgs.length; i++) {
                // Longer pause between rounds, shorter within rounds
                const isNewRound = i > 0 && allMsgs[i].round !== allMsgs[i - 1]?.round;
                const delay = isNewRound ? 1200 : 600;
                await new Promise(r => setTimeout(r, delay));
                setMessages(prev => [...prev, allMsgs[i]]);
                setLatestIdx(i);
                if (allMsgs[i].round) setCurrentRound(allMsgs[i].round);
                // Notify parent: new message + current speaker
                onSimulationUpdate?.({
                    active: true,
                    agents: active || [],
                    messages: allMsgs.slice(0, i + 1),
                    speakingAgentKey: allMsgs[i].agentKey,
                });
            }

            // Show summary after last typewriter finishes
            await new Promise(r => setTimeout(r, 1500));
            setSummary(sim);
            setNewMemoriesCount(newMemoriesCreated || 0);
            setLatestIdx(-1);
            setCurrentRound(0);

        } catch (err) {
            console.error('Simulation failed:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Simulation failed', duration: 3000 });
        }
        setSimulating(false);
        // Notify parent: simulation ended
        onSimulationUpdate?.({ active: false, agents: [], messages: [], speakingAgentKey: null });
    }, [thought, simulating, addToast, onSimulationUpdate]);

    if (!isOpen) return null;

    // Track round boundaries for dividers
    const roundFirstIdx = {};
    messages.forEach((msg, i) => {
        if (msg.round && !(msg.round in roundFirstIdx)) {
            roundFirstIdx[msg.round] = i;
        }
    });

    return (
        <div style={{
            width: '380px', flexShrink: 0, height: '100%',
            background: '#0A0C12',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{
                        fontFamily: font, fontSize: '13px', fontWeight: 700,
                        color: '#e8f4fd', letterSpacing: '-0.2px', marginBottom: '2px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <span style={{
                            display: 'inline-block', width: '8px', height: '8px',
                            borderRadius: '50%',
                            background: simulating
                                ? 'linear-gradient(135deg, #818CF8, #9B7FE8)'
                                : 'rgba(255,255,255,0.1)',
                            boxShadow: simulating ? '0 0 8px rgba(129,140,248,0.4)' : 'none',
                            transition: 'all 0.3s',
                        }} />
                        Inner Dialogue
                    </div>
                    <div style={{
                        fontFamily: fontMono, fontSize: '9px',
                        color: 'rgba(232,244,253,0.2)', letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                    }}>26 agents · 2 rounds · persistent memory</div>
                </div>
                <button
                    onClick={() => setShowHistory(true)}
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(232,244,253,0.35)',
                        fontFamily: fontMono, fontSize: '9px',
                        padding: '4px 8px', borderRadius: '6px',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = '#818CF8';
                        e.currentTarget.style.borderColor = 'rgba(129,140,248,0.2)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(232,244,253,0.35)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                >▤ History</button>
            </div>

            {/* Thought injection */}
            <div style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        ref={inputRef}
                        value={thought}
                        onChange={e => setThought(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSimulate()}
                        placeholder="What's on your mind?"
                        disabled={simulating}
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: '#e8f4fd', fontFamily: fontMono, fontSize: '12px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                    />
                    <button
                        onClick={handleSimulate}
                        disabled={!thought.trim() || simulating}
                        style={{
                            padding: '10px 16px', borderRadius: '10px', border: 'none',
                            background: thought.trim() && !simulating
                                ? 'linear-gradient(135deg, #818CF8, #6d28d9)'
                                : 'rgba(255,255,255,0.03)',
                            color: thought.trim() && !simulating ? '#fff' : 'rgba(232,244,253,0.2)',
                            fontFamily: font, fontSize: '11px', fontWeight: 600,
                            cursor: thought.trim() && !simulating ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                        }}
                    >
                        {simulating ? '...' : '◆'}
                    </button>
                </div>
            </div>

            {/* Active Agents Roster */}
            <ActiveAgentRoster agents={activeAgents} agentStates={agentStates} />

            {/* Thinking indicator */}
            <AnimatePresence>
                {simulating && messages.length === 0 && (
                    <ThinkingIndicator round={currentRound} totalRounds={2} />
                )}
            </AnimatePresence>

            {/* Live Debate Feed */}
            <div
                ref={feedRef}
                style={{
                    flex: 1, overflowY: 'auto', padding: '8px 14px',
                    minHeight: 0,
                }}
            >
                {messages.length === 0 && !simulating && (
                    <div style={{
                        textAlign: 'center', padding: '48px 20px',
                        color: 'rgba(232,244,253,0.12)',
                    }}>
                        <div style={{
                            fontSize: '18px', marginBottom: '14px', opacity: 0.3,
                            fontFamily: fontMono, color: '#4a6080',
                        }}>◉</div>
                        <div style={{
                            fontFamily: font, fontSize: '13px', fontWeight: 600,
                            color: 'rgba(232,244,253,0.25)', marginBottom: '8px',
                        }}>
                            Inner Dialogue
                        </div>
                        <div style={{
                            fontFamily: fontMono, fontSize: '11px', lineHeight: '1.7',
                            color: 'rgba(232,244,253,0.12)', maxWidth: '260px',
                            margin: '0 auto',
                        }}>
                            Type a thought and watch 26 emotion agents debate it — simulating the internal thinking process of your mind.
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <AgentMessage
                            key={`${msg.agentKey}-${msg.round}-${i}`}
                            msg={msg}
                            index={i}
                            isLatest={i === latestIdx}
                            isFirstInRound={roundFirstIdx[msg.round] === i}
                        />
                    ))}
                </AnimatePresence>

                {/* Summary card */}
                {summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(129,140,248,0.06), rgba(155,127,232,0.04))',
                            border: '1px solid rgba(129,140,248,0.12)',
                            borderRadius: '14px', padding: '16px 18px',
                            marginTop: '16px', marginBottom: '12px',
                        }}
                    >
                        <div style={{
                            fontFamily: font, fontSize: '12px', fontWeight: 700,
                            color: '#818CF8', marginBottom: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                <span style={{ fontSize: '11px', fontFamily: fontMono }}>◈</span>
                                What your mind revealed
                            </span>
                            {newMemoriesCount > 0 && (
                                <span style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 500,
                                    color: '#1DB88A',
                                    background: 'rgba(29,184,138,0.1)',
                                    padding: '2px 8px', borderRadius: '8px',
                                }}>+{newMemoriesCount} memories</span>
                            )}
                        </div>

                        {summary.insights?.map((insight, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: '8px', marginBottom: '8px',
                            }}>
                                <span style={{ color: '#818CF8', fontSize: '6px', marginTop: '6px' }}>●</span>
                                <span style={{
                                    fontFamily: fontMono, fontSize: '11.5px', lineHeight: '1.6',
                                    color: 'rgba(232,244,253,0.6)',
                                }}>{insight}</span>
                            </div>
                        ))}

                        {summary.dominantTension && (
                            <div style={{
                                marginTop: '12px', paddingTop: '10px',
                                borderTop: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: '#F59E0B', letterSpacing: '1px', textTransform: 'uppercase',
                                    marginBottom: '4px',
                                }}>Dominant Tension</div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '11px',
                                    color: 'rgba(232,244,253,0.5)', lineHeight: '1.5',
                                }}>{summary.dominantTension}</div>
                            </div>
                        )}

                        {summary.winning_agent && (
                            <div style={{
                                marginTop: '10px', paddingTop: '8px',
                                borderTop: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: '#1DB88A', letterSpacing: '1px', textTransform: 'uppercase',
                                    marginBottom: '2px',
                                }}>Most Persuasive</div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '11px',
                                    color: 'rgba(232,244,253,0.5)',
                                }}>{summary.winning_agent}</div>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Past Simulations Modal */}
            <AnimatePresence>
                {showHistory && (
                    <PastSimulationsModal
                        isOpen={showHistory}
                        onClose={() => setShowHistory(false)}
                    />
                )}
            </AnimatePresence>

            <style>{`
                @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>
        </div>
    );
}
