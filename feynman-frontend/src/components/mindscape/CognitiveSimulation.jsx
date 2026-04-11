// ═══════════════════════════════════════════════════════════════════════════
// CognitiveSimulation.jsx — The Neural Theatre (v3)
// Full 3D R3F scene with orbiting agent nodes, energy connections,
// and clean glassmorphic overlay panels. Zero emojis.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Mono', 'Fira Code', monospace";

// ─── Agent Definitions — no emojis, geometric symbols ────────────────────────
const AGENTS = [
    { key: 'critic', name: 'Critic', color: '#E85D4A', shape: '◆', short: 'Risk analysis', orbColor: [0.91, 0.36, 0.29] },
    { key: 'dreamer', name: 'Dreamer', color: '#9B7FE8', shape: '○', short: 'Possibility space', orbColor: [0.61, 0.50, 0.91] },
    { key: 'avoider', name: 'Avoider', color: '#F5A623', shape: '△', short: 'Comfort bias', orbColor: [0.96, 0.65, 0.14] },
    { key: 'ambitious_self', name: 'Ambition', color: '#1DB88A', shape: '▲', short: 'Progress drive', orbColor: [0.11, 0.72, 0.54] },
    { key: 'rationalist', name: 'Rationalist', color: '#5BA4F5', shape: '□', short: 'Pattern logic', orbColor: [0.36, 0.64, 0.96] },
    { key: 'shadow', name: 'Shadow', color: '#D4678A', shape: '◇', short: 'Hidden truth', orbColor: [0.83, 0.40, 0.54] },
];
const AGENT_MAP = {}; AGENTS.forEach(a => { AGENT_MAP[a.key] = a; });
const ROUND_NAMES = ['Initial Stance', 'Conflict', 'Adaptation'];
const ROUND_COLORS = ['#9B7FE8', '#E85D4A', '#1DB88A'];

function hexToRgb(hex) {
    if (!hex) return '136,136,136';
    const h = hex.replace('#', '');
    return `${parseInt(h.substring(0, 2), 16)},${parseInt(h.substring(2, 4), 16)},${parseInt(h.substring(4, 6), 16)}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// 3D Scene Components
// ═══════════════════════════════════════════════════════════════════════════

// ─── Single Agent Orb in 3D space ────────────────────────────────────────────
function AgentOrb3D({ agent, index, isSpeaking, isConflict, isActive }) {
    const meshRef = useRef();
    const glowRef = useRef();
    const angle = (index / 6) * Math.PI * 2;
    const radius = 3.2;
    const baseY = Math.sin(index * 1.1) * 0.4;

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const orbAngle = angle + t * 0.15;
        meshRef.current.position.x = Math.cos(orbAngle) * radius;
        meshRef.current.position.z = Math.sin(orbAngle) * radius;
        meshRef.current.position.y = baseY + Math.sin(t * 0.8 + index) * 0.3;

        const scale = isSpeaking ? 1.4 + Math.sin(t * 3) * 0.15 : 0.8;
        meshRef.current.scale.setScalar(scale);

        if (glowRef.current) {
            glowRef.current.position.copy(meshRef.current.position);
            const glowScale = isSpeaking ? 2.8 : 1.6;
            glowRef.current.scale.setScalar(glowScale + Math.sin(t * 2 + index) * 0.2);
            glowRef.current.material.opacity = isSpeaking ? 0.12 : 0.04;
        }
    });

    const [r, g, b] = agent.orbColor;

    return (
        <group>
            {/* Glow sphere */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                    color={new THREE.Color(r, g, b)}
                    transparent
                    opacity={0.05}
                    depthWrite={false}
                />
            </mesh>
            {/* Core orb */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <MeshDistortMaterial
                    color={new THREE.Color(r, g, b)}
                    emissive={new THREE.Color(r * 0.3, g * 0.3, b * 0.3)}
                    emissiveIntensity={isSpeaking ? 1.5 : 0.3}
                    roughness={0.2}
                    metalness={0.8}
                    distort={isSpeaking ? 0.3 : 0.1}
                    speed={isSpeaking ? 4 : 1.5}
                />
            </mesh>
        </group>
    );
}

// ─── Central Thought Core ────────────────────────────────────────────────────
function ThoughtCore({ isActive }) {
    const meshRef = useRef();
    const wireRef = useRef();

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        meshRef.current.rotation.x = t * 0.1;
        meshRef.current.rotation.y = t * 0.15;
        const s = isActive ? 0.6 + Math.sin(t * 1.5) * 0.05 : 0.5;
        meshRef.current.scale.setScalar(s);

        if (wireRef.current) {
            wireRef.current.rotation.x = -t * 0.08;
            wireRef.current.rotation.z = t * 0.12;
            wireRef.current.scale.setScalar(s * 1.5);
        }
    });

    return (
        <group>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1, 1]} />
                <MeshDistortMaterial
                    color="#9B7FE8"
                    emissive="#4a2d8a"
                    emissiveIntensity={isActive ? 0.6 : 0.2}
                    roughness={0.15}
                    metalness={0.9}
                    distort={0.2}
                    speed={2}
                    transparent
                    opacity={0.7}
                />
            </mesh>
            <mesh ref={wireRef}>
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial
                    color="#9B7FE8"
                    wireframe
                    transparent
                    opacity={0.08}
                />
            </mesh>
        </group>
    );
}

// ─── Connection Lines Between Agents ─────────────────────────────────────────
function ConnectionLines({ agentCount, conflictPairs, speakingKey }) {
    const lineGroupRef = useRef();
    const linesRef = useRef([]);

    useFrame(({ clock }) => {
        if (!lineGroupRef.current) return;
        const t = clock.getElapsedTime();

        for (let i = 0; i < agentCount; i++) {
            for (let j = i + 1; j < agentCount; j++) {
                const lineIdx = i * agentCount + j;
                const line = linesRef.current[lineIdx];
                if (!line) continue;

                const angleI = (i / 6) * Math.PI * 2 + t * 0.15;
                const angleJ = (j / 6) * Math.PI * 2 + t * 0.15;
                const r = 3.2;

                const posI = new THREE.Vector3(Math.cos(angleI) * r, Math.sin(i * 1.1) * 0.4 + Math.sin(t * 0.8 + i) * 0.3, Math.sin(angleI) * r);
                const posJ = new THREE.Vector3(Math.cos(angleJ) * r, Math.sin(j * 1.1) * 0.4 + Math.sin(t * 0.8 + j) * 0.3, Math.sin(angleJ) * r);

                const positions = line.geometry.attributes.position;
                positions.setXYZ(0, posI.x, posI.y, posI.z);
                positions.setXYZ(1, posJ.x, posJ.y, posJ.z);
                positions.needsUpdate = true;

                const isConflict = conflictPairs?.some(
                    ([a, b]) => (AGENTS[i].key === a && AGENTS[j].key === b) ||
                                (AGENTS[i].key === b && AGENTS[j].key === a)
                );

                line.material.opacity = isConflict ? 0.15 + Math.sin(t * 4) * 0.08 : 0.025;
                line.material.color.set(isConflict ? '#E85D4A' : '#4a6080');
            }
        }
    });

    const lines = [];
    for (let i = 0; i < agentCount; i++) {
        for (let j = i + 1; j < agentCount; j++) {
            const idx = i * agentCount + j;
            lines.push(
                <line key={`${i}-${j}`} ref={el => { linesRef.current[idx] = el; }}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={new Float32Array(6)}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial transparent opacity={0.03} color="#4a6080" />
                </line>
            );
        }
    }

    return <group ref={lineGroupRef}>{lines}</group>;
}

// ─── Ambient Floating Particles ──────────────────────────────────────────────
function AmbientParticles({ count = 200 }) {
    const particlesRef = useRef();
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 16;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
        }
        return pos;
    }, [count]);

    useFrame(({ clock }) => {
        if (!particlesRef.current) return;
        const t = clock.getElapsedTime();
        const pos = particlesRef.current.geometry.attributes.position;
        for (let i = 0; i < count; i++) {
            pos.array[i * 3 + 1] += Math.sin(t * 0.3 + i * 0.1) * 0.001;
        }
        pos.needsUpdate = true;
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.02} color="#4a6080" transparent opacity={0.3} sizeAttenuation />
        </points>
    );
}

// ─── Camera Controller ───────────────────────────────────────────────────────
function CameraController({ isActive }) {
    const { camera } = useThree();
    useEffect(() => {
        camera.position.set(0, 2, 7);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (isActive) {
            camera.position.x = Math.sin(t * 0.05) * 0.5;
            camera.position.y = 2 + Math.sin(t * 0.08) * 0.2;
        }
    });

    return <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />;
}

// ─── Full 3D Scene ───────────────────────────────────────────────────────────
function NeuralScene({ speakingAgent, conflictPairs, isActive, currentRound }) {
    return (
        <>
            <CameraController isActive={isActive} />
            <ambientLight intensity={0.15} />
            <pointLight position={[5, 5, 5]} intensity={0.4} color="#9B7FE8" />
            <pointLight position={[-5, -3, 3]} intensity={0.2} color="#5BA4F5" />
            <pointLight position={[0, -4, -5]} intensity={0.15} color="#E85D4A" />

            <ThoughtCore isActive={isActive} />

            {AGENTS.map((agent, i) => (
                <AgentOrb3D
                    key={agent.key}
                    agent={agent}
                    index={i}
                    isSpeaking={speakingAgent === agent.key}
                    isConflict={conflictPairs?.some(([a, b]) => a === agent.key || b === agent.key)}
                    isActive={isActive}
                />
            ))}

            <ConnectionLines
                agentCount={6}
                conflictPairs={conflictPairs}
                speakingKey={speakingAgent}
            />

            <AmbientParticles count={150} />
            <Environment preset="night" />
            <fog attach="fog" args={['#030306', 8, 20]} />
        </>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// UI Overlay Components
// ═══════════════════════════════════════════════════════════════════════════

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

// ─── Round Header ────────────────────────────────────────────────────────────
function RoundHeader({ roundIndex }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '6px 0', marginBottom: '4px',
            }}
        >
            <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: ROUND_COLORS[roundIndex],
                boxShadow: `0 0 8px ${ROUND_COLORS[roundIndex]}60`,
            }} />
            <span style={{
                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                color: ROUND_COLORS[roundIndex], letterSpacing: '1.5px',
                textTransform: 'uppercase',
            }}>{ROUND_NAMES[roundIndex]}</span>
            <div style={{
                flex: 1, height: '1px',
                background: `linear-gradient(90deg, ${ROUND_COLORS[roundIndex]}15, transparent)`,
            }} />
            <span style={{
                fontFamily: fontMono, fontSize: '8px',
                color: 'rgba(232,244,253,0.12)',
            }}>{roundIndex + 1}/3</span>
        </motion.div>
    );
}

// ─── Single Message Card ─────────────────────────────────────────────────────
function MessageCard({ msg, agent, isLatest }) {
    const { displayed, done } = useTypewriter(msg.message, 12, isLatest);
    const isConflict = msg.roundIndex === 1;
    const isTyping = isLatest && !done;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
                padding: '10px 14px', borderRadius: '10px',
                background: `rgba(${hexToRgb(agent.color)}, 0.04)`,
                border: `1px solid rgba(${hexToRgb(agent.color)}, ${isConflict ? 0.15 : 0.06})`,
                position: 'relative', overflow: 'hidden',
            }}
        >
            {isTyping && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(180deg, transparent, rgba(${hexToRgb(agent.color)}, 0.02), transparent)`,
                    animation: 'scanLine 2.5s linear infinite',
                    pointerEvents: 'none',
                }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 700,
                    color: agent.color, letterSpacing: '1px',
                }}>{agent.shape}</span>
                <span style={{
                    fontFamily: font, fontSize: '10px', fontWeight: 700,
                    color: agent.color, letterSpacing: '0.5px',
                }}>{agent.name}</span>
                {msg.hasMemoryRef && (
                    <span style={{
                        fontFamily: fontMono, fontSize: '7px', fontWeight: 600,
                        color: 'rgba(232,244,253,0.25)', padding: '1px 5px',
                        borderRadius: '3px', background: 'rgba(255,255,255,0.03)',
                        letterSpacing: '1px',
                    }}>MEM</span>
                )}
                {isConflict && msg.challengedAgent && (
                    <span style={{
                        fontFamily: fontMono, fontSize: '7px', fontWeight: 600,
                        color: '#E85D4A', marginLeft: 'auto', opacity: 0.6,
                        letterSpacing: '0.5px',
                    }}>vs {msg.challengedAgent}</span>
                )}
            </div>
            <div style={{
                fontFamily: fontMono, fontSize: '11px', lineHeight: '1.7',
                color: 'rgba(232,244,253,0.6)',
            }}>
                {isLatest && !done ? displayed : msg.message}
                {isTyping && (
                    <span style={{
                        display: 'inline-block', width: '1.5px', height: '12px',
                        background: agent.color, marginLeft: '1px',
                        animation: 'cursorBlink 0.8s step-end infinite',
                        verticalAlign: 'text-bottom', opacity: 0.6,
                    }} />
                )}
            </div>
        </motion.div>
    );
}

// ─── Dominance Visualization ─────────────────────────────────────────────────
function DominanceBar({ dominanceScores, dominantAgent }) {
    if (!dominanceScores || Object.keys(dominanceScores).length === 0) return null;
    const total = AGENTS.reduce((s, a) => s + (dominanceScores[a.key]?.dominance_score || 0), 0) || 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255,255,255,0.03)',
            }}
        >
            <div style={{ fontFamily: fontMono, fontSize: '7px', color: 'rgba(232,244,253,0.12)', letterSpacing: '2px', marginBottom: '6px' }}>DOMINANCE</div>
            <div style={{ display: 'flex', gap: '1px', height: '3px', borderRadius: '2px', overflow: 'hidden' }}>
                {AGENTS.map(a => {
                    const score = dominanceScores[a.key]?.dominance_score || 0;
                    const pct = (score / total) * 100;
                    const isDom = dominantAgent?.key === a.key;
                    return (
                        <motion.div key={a.key}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(pct, 3)}%` }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            style={{ background: a.color, borderRadius: '2px', opacity: isDom ? 1 : 0.25 }}
                        />
                    );
                })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                {AGENTS.map(a => {
                    const score = dominanceScores[a.key]?.dominance_score || 0;
                    const isDom = dominantAgent?.key === a.key;
                    return (
                        <span key={a.key} style={{
                            fontFamily: fontMono, fontSize: '7px', fontWeight: 600,
                            color: isDom ? a.color : 'rgba(232,244,253,0.1)',
                            transition: 'color 0.3s',
                        }}>{a.shape} {Math.round(score * 100)}</span>
                    );
                })}
            </div>
        </motion.div>
    );
}

// ─── Synthesis Overlay ───────────────────────────────────────────────────────
function SynthesisOverlay({ synthesis, dominantAgent, dominanceScores, onClose }) {
    if (!synthesis) return null;
    const da = dominantAgent;

    const sections = [
        { label: 'CORE TENSION', text: synthesis.core_tension, color: '#E85D4A', symbol: '◆', delay: 0.15 },
        { label: 'KEY INSIGHT', text: synthesis.key_insight, color: '#9B7FE8', symbol: '○', delay: 0.3 },
        { label: 'RECOMMENDED ACTION', text: synthesis.recommended_action, color: '#1DB88A', symbol: '▲', delay: 0.45, sub: da ? `via ${da.name}` : null },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(3,3,6,0.92)',
                backdropFilter: 'blur(30px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '580px', width: '90%', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                    <div style={{ fontFamily: fontMono, fontSize: '8px', letterSpacing: '3px', color: 'rgba(155,127,232,0.3)', marginBottom: '4px' }}>SYNTHESIS</div>
                    <div style={{ fontFamily: font, fontSize: '18px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '-0.5px' }}>Neural Theatre Analysis</div>
                </div>

                {sections.map(s => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: s.delay }}
                        style={{
                            padding: '18px 22px', borderRadius: '14px',
                            background: `rgba(${hexToRgb(s.color)}, 0.04)`,
                            border: `1px solid rgba(${hexToRgb(s.color)}, 0.10)`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontFamily: fontMono, fontSize: '11px', color: s.color }}>{s.symbol}</span>
                            <span style={{ fontFamily: fontMono, fontSize: '8px', fontWeight: 700, color: s.color, letterSpacing: '2px' }}>{s.label}</span>
                            {s.sub && <span style={{ fontFamily: fontMono, fontSize: '7px', color: 'rgba(232,244,253,0.15)', marginLeft: 'auto' }}>{s.sub}</span>}
                        </div>
                        <div style={{ fontFamily: fontMono, fontSize: '12px', lineHeight: '1.8', color: 'rgba(232,244,253,0.65)' }}>{s.text}</div>
                    </motion.div>
                ))}

                {/* Dominance bar */}
                <div style={{
                    padding: '12px 22px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)',
                }}>
                    <div style={{ display: 'flex', gap: '2px', height: '3px', borderRadius: '2px', overflow: 'hidden' }}>
                        {AGENTS.map(a => {
                            const score = dominanceScores?.[a.key]?.dominance_score || 0;
                            const t = AGENTS.reduce((s2, ag) => s2 + (dominanceScores?.[ag.key]?.dominance_score || 0), 0) || 1;
                            return <div key={a.key} style={{ width: `${Math.max((score / t) * 100, 3)}%`, background: a.color, borderRadius: '2px', opacity: da?.key === a.key ? 1 : 0.2 }} />;
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '6px' }}>
                        {AGENTS.map(a => (
                            <span key={a.key} style={{ fontFamily: fontMono, fontSize: '9px', color: da?.key === a.key ? a.color : 'rgba(232,244,253,0.1)' }}>{a.shape}</span>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <span style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.08)' }}>click anywhere to dismiss</span>
                </div>
            </motion.div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// CognitiveSimulation — Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function CognitiveSimulation({ isOpen, onClose }) {
    const [thought, setThought] = useState('');
    const [simulating, setSimulating] = useState(false);
    const [result, setResult] = useState(null);
    const [speakingAgent, setSpeakingAgent] = useState(null);
    const [currentRound, setCurrentRound] = useState(-1);
    const [conflictPairs, setConflictPairs] = useState([]);
    const [showSynthesis, setShowSynthesis] = useState(false);
    const [phase, setPhase] = useState('input');
    const [streamedMessages, setStreamedMessages] = useState([]);
    const [latestMsgIdx, setLatestMsgIdx] = useState(-1);
    const [elapsedSec, setElapsedSec] = useState(0);
    const textareaRef = useRef(null);
    const feedRef = useRef(null);
    const timerRef = useRef(null);
    const addToast = useBrainStore(s => s.addToast);

    useEffect(() => {
        if (isOpen && phase === 'input' && textareaRef.current)
            setTimeout(() => textareaRef.current?.focus(), 400);
    }, [isOpen, phase]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (showSynthesis) setShowSynthesis(false);
                else onClose?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, showSynthesis]);

    useEffect(() => {
        if (simulating) {
            setElapsedSec(0);
            timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [simulating]);

    useEffect(() => {
        if (feedRef.current)
            feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }, [streamedMessages.length, latestMsgIdx]);

    const messagesByRound = useMemo(() => {
        const grouped = [[], [], []];
        streamedMessages.forEach(m => {
            if (m.roundIndex >= 0 && m.roundIndex < 3) grouped[m.roundIndex].push(m);
        });
        return grouped;
    }, [streamedMessages]);

    const handleRun = useCallback(async () => {
        if (!thought.trim() || thought.trim().length < 5 || simulating) return;
        setSimulating(true);
        setPhase('running');
        setStreamedMessages([]);
        setLatestMsgIdx(-1);
        setSpeakingAgent(null);
        setCurrentRound(-1);
        setConflictPairs([]);
        setResult(null);
        setShowSynthesis(false);

        try {
            api.post('/api/mindmirror/journal', { content: thought.trim(), mode: 'subconscious' }).catch(() => {});
            const res = await api.post('/api/mindmirror/cognitive-simulation', { thought: thought.trim() });
            const data = res.data;
            setResult(data);

            let globalIdx = 0;
            for (let roundIdx = 0; roundIdx < data.rounds.length; roundIdx++) {
                setCurrentRound(roundIdx);
                const round = data.rounds[roundIdx];
                const messages = round.messages || [];

                if (roundIdx === 1) {
                    const pairs = [];
                    messages.forEach(m => {
                        if (m.challengedAgent) {
                            const targetKey = AGENTS.find(a => a.name.toLowerCase().includes(m.challengedAgent.toLowerCase()) || a.key.includes(m.challengedAgent.toLowerCase()))?.key;
                            if (targetKey) pairs.push([m.agentKey, targetKey]);
                        }
                    });
                    setConflictPairs(pairs);
                }

                for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
                    const msg = messages[msgIdx];
                    const enrichedMsg = { ...msg, roundIndex: roundIdx, roundName: ROUND_NAMES[roundIdx] };
                    setSpeakingAgent(msg.agentKey);
                    setStreamedMessages(prev => [...prev, enrichedMsg]);
                    setLatestMsgIdx(globalIdx);
                    globalIdx++;
                    const charDelay = (msg.message?.length || 50) * 12 + 600;
                    await new Promise(r => setTimeout(r, Math.min(charDelay, 3000)));
                }

                if (roundIdx < data.rounds.length - 1) {
                    setSpeakingAgent(null);
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            setSpeakingAgent(null);
            setPhase('done');
            await new Promise(r => setTimeout(r, 1200));
            setShowSynthesis(true);
            addToast({ type: 'success', icon: '✦', message: 'Cognitive simulation complete', duration: 3000 });
        } catch (err) {
            console.error('Cognitive simulation failed:', err);
            addToast({ type: 'danger', icon: '—', message: 'Simulation failed', duration: 3000 });
            setPhase('input');
        }
        setSimulating(false);
    }, [thought, simulating, addToast]);

    const handleReset = useCallback(() => {
        setThought('');
        setResult(null);
        setStreamedMessages([]);
        setLatestMsgIdx(-1);
        setSpeakingAgent(null);
        setCurrentRound(-1);
        setConflictPairs([]);
        setShowSynthesis(false);
        setPhase('input');
    }, []);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 310, fontFamily: font, background: '#030306' }}>
            <style>{`
                @keyframes scanLine { 0% { transform: translateY(-100%); } 100% { transform: translateY(200%); } }
                @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>

            {/* ─── 3D Canvas Background ─── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
                    <Suspense fallback={null}>
                        <NeuralScene
                            speakingAgent={speakingAgent}
                            conflictPairs={conflictPairs}
                            isActive={phase !== 'input'}
                            currentRound={currentRound}
                        />
                    </Suspense>
                </Canvas>
            </div>

            {/* ─── Top Bar ─── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
                padding: '12px 20px',
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'linear-gradient(180deg, rgba(3,3,6,0.6) 0%, transparent 100%)',
            }}>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: 'rgba(232,244,253,0.25)',
                    fontFamily: fontMono, fontSize: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px', padding: 0,
                }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e8f4fd'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,244,253,0.25)'}
                >
                    <span style={{ fontSize: '12px' }}>←</span> Back
                </button>

                <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 600, color: '#e8f4fd', letterSpacing: '0.5px' }}>Neural Theatre</span>
                <span style={{ fontFamily: fontMono, fontSize: '7px', color: 'rgba(232,244,253,0.15)', letterSpacing: '2px' }}>6 AGENTS</span>

                {phase === 'running' && currentRound >= 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                opacity: i === currentRound ? 1 : i < currentRound ? 0.3 : 0.08,
                            }}>
                                <div style={{
                                    width: i === currentRound ? '5px' : '4px',
                                    height: i === currentRound ? '5px' : '4px',
                                    borderRadius: '50%', background: ROUND_COLORS[i],
                                    boxShadow: i === currentRound ? `0 0 6px ${ROUND_COLORS[i]}60` : 'none',
                                }} />
                                <span style={{ fontFamily: fontMono, fontSize: '8px', fontWeight: 600, color: i === currentRound ? ROUND_COLORS[i] : 'rgba(232,244,253,0.15)' }}>{ROUND_NAMES[i]}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {simulating && (
                        <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(155,127,232,0.25)' }}>
                            {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
                        </span>
                    )}
                    {phase === 'done' && (
                        <>
                            <button onClick={() => setShowSynthesis(true)} style={{
                                padding: '5px 12px', borderRadius: '6px',
                                border: '1px solid rgba(155,127,232,0.15)', background: 'rgba(155,127,232,0.04)',
                                color: '#9B7FE8', fontFamily: fontMono, fontSize: '9px', fontWeight: 600, cursor: 'pointer',
                            }}>Synthesis</button>
                            <button onClick={handleReset} style={{
                                padding: '5px 12px', borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)',
                                color: 'rgba(232,244,253,0.3)', fontFamily: fontMono, fontSize: '9px', fontWeight: 600, cursor: 'pointer',
                            }}>New</button>
                        </>
                    )}
                </div>
            </div>

            {/* ─── INPUT PHASE ─── */}
            <AnimatePresence>
                {phase === 'input' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 20,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '24px', padding: '40px',
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: font, fontSize: '22px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                                Neural Theatre
                            </div>
                            <div style={{ fontFamily: fontMono, fontSize: '11px', color: 'rgba(232,244,253,0.2)', lineHeight: '1.7', maxWidth: '420px' }}>
                                Six agents will analyze your thought across three rounds of debate.
                            </div>
                        </div>

                        <div style={{ width: '100%', maxWidth: '520px' }}>
                            <textarea
                                ref={textareaRef}
                                value={thought}
                                onChange={e => setThought(e.target.value)}
                                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleRun(); } }}
                                placeholder="A thought, a dilemma, a question you can't resolve..."
                                style={{
                                    width: '100%', minHeight: '90px', padding: '18px 22px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '12px', color: 'rgba(232,244,253,0.8)',
                                    fontFamily: fontMono, fontSize: '13px', lineHeight: '1.8',
                                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(155,127,232,0.2)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                                <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.1)' }}>Cmd + Enter</span>
                                <button
                                    onClick={handleRun}
                                    disabled={!thought.trim() || thought.trim().length < 5}
                                    style={{
                                        padding: '10px 28px', borderRadius: '10px',
                                        border: thought.trim().length >= 5 ? '1px solid rgba(155,127,232,0.3)' : '1px solid rgba(255,255,255,0.04)',
                                        background: thought.trim().length >= 5 ? 'rgba(155,127,232,0.08)' : 'rgba(255,255,255,0.02)',
                                        color: thought.trim().length >= 5 ? '#9B7FE8' : 'rgba(232,244,253,0.15)',
                                        fontFamily: fontMono, fontSize: '12px', fontWeight: 600,
                                        cursor: thought.trim().length >= 5 ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s', letterSpacing: '0.5px',
                                    }}
                                >Begin Simulation</button>
                            </div>
                        </div>

                        {/* Agent preview — geometric shapes, no emojis */}
                        <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                            {AGENTS.map((a, i) => (
                                <motion.div
                                    key={a.key}
                                    animate={{ y: [0, -2, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.5 + i * 0.3, ease: 'easeInOut', delay: i * 0.1 }}
                                    style={{ textAlign: 'center' }}
                                >
                                    <div style={{ fontFamily: fontMono, fontSize: '14px', color: `${a.color}60`, marginBottom: '3px' }}>{a.shape}</div>
                                    <div style={{ fontFamily: fontMono, fontSize: '7px', color: 'rgba(232,244,253,0.12)', letterSpacing: '0.5px' }}>{a.short}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── RUNNING / DONE: Message Feed Panel ─── */}
            {phase !== 'input' && (
                <motion.div
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        position: 'absolute', top: '46px', right: 0, bottom: 0,
                        width: '38%', minWidth: '320px', maxWidth: '480px',
                        zIndex: 25, display: 'flex', flexDirection: 'column',
                        background: 'linear-gradient(270deg, rgba(5,5,10,0.90) 0%, rgba(5,5,10,0.65) 100%)',
                        borderLeft: '1px solid rgba(255,255,255,0.03)',
                    }}
                >
                    <div style={{
                        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: simulating ? '#1DB88A' : phase === 'done' ? '#9B7FE8' : '#E85D4A',
                            boxShadow: simulating ? '0 0 6px rgba(29,184,138,0.4)' : 'none',
                        }} />
                        <span style={{ fontFamily: fontMono, fontSize: '8px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '2px' }}>
                            {simulating ? 'LIVE' : phase === 'done' ? 'COMPLETE' : 'FEED'}
                        </span>
                        <span style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.08)', marginLeft: 'auto' }}>
                            {streamedMessages.length}
                        </span>
                    </div>

                    <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 14px 24px' }}>
                        {[0, 1, 2].map(roundIdx => {
                            const msgs = messagesByRound[roundIdx];
                            if (msgs.length === 0) return null;
                            return (
                                <div key={roundIdx} style={{ marginBottom: '16px' }}>
                                    <RoundHeader roundIndex={roundIdx} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <AnimatePresence>
                                            {msgs.map((msg, mi) => {
                                                const globalIdx = streamedMessages.indexOf(msg);
                                                const agent = AGENT_MAP[msg.agentKey] || AGENTS[0];
                                                return <MessageCard key={`${roundIdx}-${msg.agentKey}-${mi}`} msg={msg} agent={agent} isLatest={globalIdx === latestMsgIdx} />;
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}

                        {simulating && streamedMessages.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 16px', textAlign: 'center' }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                    style={{ width: '16px', height: '16px', border: '1.5px solid rgba(155,127,232,0.1)', borderTop: '1.5px solid #9B7FE8', borderRadius: '50%' }}
                                />
                                <span style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(155,127,232,0.3)' }}>Agents initializing...</span>
                            </div>
                        )}
                    </div>

                    {phase === 'done' && result?.dominanceScores && (
                        <DominanceBar dominanceScores={result.dominanceScores} dominantAgent={result.dominantAgent} />
                    )}
                </motion.div>
            )}

            {/* Synthesis Overlay */}
            <AnimatePresence>
                {showSynthesis && result && (
                    <SynthesisOverlay synthesis={result.synthesis} dominantAgent={result.dominantAgent} dominanceScores={result.dominanceScores} onClose={() => setShowSynthesis(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
