// ═══════════════════════════════════════════════════════════════════════════
// HolographicMessages.jsx — Floating holographic message panels
// Semi-transparent glass panels that materialize from agent positions
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const ROUND_NAMES = ['Initial Stance', 'Conflict', 'Adaptation'];

// ─── Typewriter Hook ─────────────────────────────────────────────────────────
function useTypewriter(text, speed = 14, active = false) {
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

// ─── Single holographic message ──────────────────────────────────────────────
function HoloMessage({ msg, isLatest, agent, index, total }) {
    const { displayed, done } = useTypewriter(msg.message, 12, isLatest);

    const isConflict = msg.roundIndex === 1;
    const isAdaptation = msg.roundIndex === 2;

    // Position messages in a flowing column
    return (
        <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 20, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
                background: `linear-gradient(135deg, 
                    rgba(${hexToRgb(agent.color)}, 0.08) 0%, 
                    rgba(${hexToRgb(agent.color)}, 0.02) 100%)`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid rgba(${hexToRgb(agent.color)}, ${isConflict ? 0.25 : 0.12})`,
                borderRadius: '16px',
                padding: '14px 18px',
                position: 'relative',
                overflow: 'hidden',
                maxWidth: '100%',
            }}
        >
            {/* Holographic scan line effect */}
            {isLatest && !done && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(180deg, 
                        transparent 0%, 
                        rgba(${hexToRgb(agent.color)}, 0.03) 50%, 
                        transparent 100%)`,
                    animation: 'holoScan 2s linear infinite',
                    pointerEvents: 'none',
                }} />
            )}

            {/* Agent header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '8px',
            }}>
                {/* Pulsing dot */}
                <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: agent.color,
                    boxShadow: `0 0 ${isSpeaking(isLatest, done) ? '10' : '4'}px ${agent.color}`,
                    transition: 'box-shadow 0.3s',
                }} />
                <span style={{
                    fontFamily: font, fontSize: '11px', fontWeight: 700,
                    color: agent.color, letterSpacing: '0.3px',
                }}>{agent.name}</span>

                {msg.hasMemoryRef && (
                    <span style={{
                        fontFamily: fontMono, fontSize: '7px',
                        color: agent.color, opacity: 0.7,
                        padding: '2px 6px', borderRadius: '4px',
                        background: `${agent.color}12`,
                        letterSpacing: '1px', fontWeight: 600,
                    }}>MEMORY</span>
                )}

                {isConflict && msg.challengedAgent && (
                    <span style={{
                        fontFamily: fontMono, fontSize: '7px',
                        color: '#E85D4A', opacity: 0.8,
                        padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(232,93,74,0.1)',
                        letterSpacing: '0.5px', marginLeft: 'auto',
                    }}>⚡ CHALLENGES {msg.challengedAgent}</span>
                )}

                {isAdaptation && (
                    <span style={{
                        fontFamily: fontMono, fontSize: '7px',
                        color: '#1DB88A', opacity: 0.8,
                        padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(29,184,138,0.1)',
                        letterSpacing: '0.5px', marginLeft: 'auto',
                    }}>EVOLVED</span>
                )}
            </div>

            {/* Message body */}
            <div style={{
                fontFamily: fontMono, fontSize: '12.5px', lineHeight: '1.75',
                color: 'rgba(232,244,253,0.7)',
            }}>
                {isLatest && !done ? displayed : msg.message}
                {isLatest && !done && (
                    <span style={{
                        display: 'inline-block', width: '2px', height: '13px',
                        background: agent.color, marginLeft: '2px',
                        animation: 'holoBlink 0.7s step-end infinite',
                        verticalAlign: 'text-bottom',
                    }} />
                )}
            </div>
        </motion.div>
    );
}

function isSpeaking(isLatest, done) {
    return isLatest && !done;
}

// ─── Round Header ────────────────────────────────────────────────────────────
function RoundHeader({ roundIndex }) {
    const colors = ['#9B7FE8', '#E85D4A', '#1DB88A'];
    const icons = ['◇', '⚡', '◉'];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '8px 0',
            }}
        >
            <div style={{
                width: '28px', height: '28px', borderRadius: '10px',
                background: `${colors[roundIndex]}12`,
                border: `1px solid ${colors[roundIndex]}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fontMono, fontSize: '13px',
                color: colors[roundIndex],
            }}>{icons[roundIndex]}</div>
            <div>
                <div style={{
                    fontFamily: font, fontSize: '13px', fontWeight: 700,
                    color: '#e8f4fd', letterSpacing: '-0.2px',
                }}>{ROUND_NAMES[roundIndex]}</div>
                <div style={{
                    fontFamily: fontMono, fontSize: '8px',
                    color: 'rgba(232,244,253,0.2)', letterSpacing: '1px',
                    textTransform: 'uppercase',
                }}>Round {roundIndex + 1} of 3</div>
            </div>
            <div style={{
                flex: 1, height: '1px',
                background: `linear-gradient(90deg, ${colors[roundIndex]}20, transparent)`,
            }} />
        </motion.div>
    );
}

// ─── Synthesis Hologram ──────────────────────────────────────────────────────
function SynthesisHologram({ synthesis, dominantAgent }) {
    if (!synthesis) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
                display: 'flex', flexDirection: 'column', gap: '12px',
                marginTop: '16px',
            }}
        >
            {/* Core Tension */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(232,93,74,0.06), rgba(245,166,35,0.03))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(232,93,74,0.15)',
                borderRadius: '16px', padding: '16px 20px',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
                }}>
                    <span style={{ fontSize: '12px' }}>⚡</span>
                    <span style={{
                        fontFamily: fontMono, fontSize: '8px', fontWeight: 700,
                        color: '#E85D4A', letterSpacing: '2px', textTransform: 'uppercase',
                    }}>Core Tension</span>
                </div>
                <div style={{
                    fontFamily: fontMono, fontSize: '12px', lineHeight: '1.75',
                    color: 'rgba(232,244,253,0.65)',
                }}>{synthesis.core_tension}</div>
            </div>

            {/* Key Insight */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(155,127,232,0.06), rgba(91,164,245,0.03))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(155,127,232,0.15)',
                borderRadius: '16px', padding: '16px 20px',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
                }}>
                    <span style={{ fontSize: '12px' }}>◈</span>
                    <span style={{
                        fontFamily: fontMono, fontSize: '8px', fontWeight: 700,
                        color: '#9B7FE8', letterSpacing: '2px', textTransform: 'uppercase',
                    }}>Key Insight</span>
                </div>
                <div style={{
                    fontFamily: fontMono, fontSize: '12px', lineHeight: '1.75',
                    color: 'rgba(232,244,253,0.65)',
                }}>{synthesis.key_insight}</div>
            </div>

            {/* Recommended Action */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(29,184,138,0.06), rgba(91,164,245,0.03))',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${(dominantAgent?.color || '#1DB88A')}20`,
                borderRadius: '16px', padding: '16px 20px',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
                }}>
                    <span style={{ fontSize: '12px' }}>◉</span>
                    <span style={{
                        fontFamily: fontMono, fontSize: '8px', fontWeight: 700,
                        color: '#1DB88A', letterSpacing: '2px', textTransform: 'uppercase',
                    }}>Recommended Action</span>
                </div>
                <div style={{
                    fontFamily: fontMono, fontSize: '12px', lineHeight: '1.75',
                    color: 'rgba(232,244,253,0.75)', fontWeight: 500,
                }}>{synthesis.recommended_action}</div>
            </div>
        </motion.div>
    );
}

// ─── Main Messages Panel ─────────────────────────────────────────────────────
export default function HolographicMessages({
    streamedMessages,
    latestMsgIdx,
    currentRound,
    simulating,
    showSynthesis,
    result,
    agentMap,
}) {
    const feedRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [streamedMessages.length, latestMsgIdx]);

    return (
        <div
            ref={feedRef}
            style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                padding: '16px 20px 32px',
                scrollBehavior: 'smooth',
            }}
        >
            {/* Group by round */}
            {[0, 1, 2].map(roundIdx => {
                const roundMsgs = streamedMessages.filter(m => m.roundIndex === roundIdx);
                if (roundMsgs.length === 0) return null;

                return (
                    <div key={roundIdx} style={{ marginBottom: '24px' }}>
                        <RoundHeader roundIndex={roundIdx} />
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '8px',
                            paddingLeft: '4px', marginTop: '8px',
                        }}>
                            <AnimatePresence>
                                {roundMsgs.map((msg) => {
                                    const globalIdx = streamedMessages.indexOf(msg);
                                    const agent = agentMap[msg.agentKey] || {};
                                    return (
                                        <HoloMessage
                                            key={`${roundIdx}-${msg.agentKey}`}
                                            msg={msg}
                                            isLatest={globalIdx === latestMsgIdx}
                                            agent={agent}
                                            index={globalIdx}
                                            total={streamedMessages.length}
                                        />
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}

            {/* Loading during simulation */}
            {simulating && currentRound >= 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 0',
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        style={{
                            width: '14px', height: '14px',
                            border: '2px solid rgba(155,127,232,0.1)',
                            borderTop: '2px solid #9B7FE8',
                            borderRadius: '50%',
                        }}
                    />
                    <span style={{
                        fontFamily: fontMono, fontSize: '10px',
                        color: 'rgba(155,127,232,0.4)',
                        letterSpacing: '0.5px',
                    }}>
                        {currentRound < 3
                            ? `Round ${currentRound + 1} — ${ROUND_NAMES[currentRound]}...`
                            : 'Synthesizing consciousness...'}
                    </span>
                </div>
            )}

            {/* Synthesis */}
            {showSynthesis && result && (
                <SynthesisHologram
                    synthesis={result.synthesis}
                    dominantAgent={result.dominantAgent}
                />
            )}
        </div>
    );
}

export { SynthesisHologram };

function hexToRgb(hex) {
    if (!hex) return '136,136,136';
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r},${g},${b}`;
}
