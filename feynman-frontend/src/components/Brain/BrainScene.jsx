import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import BrainMesh from './BrainMesh';
import KnowledgeNode from './KnowledgeNode';
import ConnectionLine from './ConnectionLine';
import SpaceEnvironment from './SpaceEnvironment';
import useBrainStore from '../../store/brainStore';

function BrainContent() {
    const nodes = useBrainStore((s) => s.nodes);
    const edges = useBrainStore((s) => s.edges);

    return (
        <>
            <Stars radius={100} depth={60} count={800} factor={3} saturation={0.08} fade speed={0} />
            <SpaceEnvironment />
            <Environment preset="night" />
            <BrainMesh />
            {edges.map((edge) => <ConnectionLine key={edge.id} edge={edge} />)}
            {nodes.map((node) => <KnowledgeNode key={node.id} node={node} />)}
        </>
    );
}

function BrainControls() {
    const isDraggingNode = useBrainStore((s) => s.isDraggingNode);
    return (
        <OrbitControls
            enableDamping dampingFactor={0.05} rotateSpeed={0.5} zoomSpeed={0.7}
            minDistance={6} maxDistance={30} enablePan={false}
            autoRotate={!isDraggingNode} autoRotateSpeed={0.1} enabled={!isDraggingNode}
        />
    );
}

/* ═══ 3D Neural Tunnel Intro ═══ */
function NeuralTunnelIntro({ onComplete }) {
    const [phase, setPhase] = useState(0); // 0=tunnel, 1=text, 2=fadeout
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Phase 0: Tunnel animation plays (0-1.2s)
        const t1 = setTimeout(() => setPhase(1), 400);   // Show text
        const t2 = setTimeout(() => setPhase(2), 1800);   // Start fade
        const t3 = setTimeout(() => {
            setOpacity(0);
        }, 1900);
        const t4 = setTimeout(() => onComplete(), 2600); // Remove
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [onComplete]);

    // Neural tunnel rings
    const rings = Array.from({ length: 14 }, (_, i) => ({
        delay: i * 50,
        size: 20 + i * 22,
    }));

    // Streaking particles
    const streaks = Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 20 + Math.random() * 45;
        return { id: i, tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist, delay: Math.random() * 400, size: 1.5 + Math.random() * 2.5 };
    });

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: '#020208', overflow: 'hidden',
            opacity, transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'opacity',
        }}>
            {/* Deep space gradient */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 50%), radial-gradient(circle, #0a0a1a 0%, #020208 100%)',
            }} />

            {/* Neural tunnel rings — expanding outward */}
            {rings.map((ring, i) => (
                <div key={i} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: `${ring.size}px`, height: `${ring.size}px`,
                    transform: 'translate(-50%, -50%) scale(0)',
                    borderRadius: '50%',
                    border: `1px solid ${i % 3 === 0 ? 'rgba(0,212,255,0.4)' : i % 3 === 1 ? 'rgba(124,58,237,0.3)' : 'rgba(0,255,136,0.2)'}`,
                    boxShadow: `0 0 ${8 + i * 2}px rgba(0,212,255,0.08)`,
                    animation: `introRing 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${ring.delay}ms forwards`,
                    willChange: 'transform, opacity',
                }} />
            ))}

            {/* Speed streaks — radial lines flying outward */}
            {Array.from({ length: 20 }, (_, i) => (
                <div key={`s${i}`} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '1px', height: `${20 + Math.random() * 30}vh`,
                    background: `linear-gradient(to bottom, transparent, rgba(0,212,255,0.3), transparent)`,
                    transformOrigin: 'top center',
                    transform: `rotate(${(i / 20) * 360}deg) translateY(-50%) scaleY(0)`,
                    animation: `introStreak 1s ease-out ${100 + i * 15}ms forwards`,
                    willChange: 'transform, opacity',
                }} />
            ))}

            {/* Particle burst */}
            {streaks.map(p => (
                <div key={p.id} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: `${p.size}px`, height: `${p.size}px`,
                    borderRadius: '50%', background: '#00d4ff',
                    boxShadow: `0 0 ${p.size * 4}px rgba(0,212,255,0.6)`,
                    transform: 'translate(-50%, -50%) scale(0)',
                    animation: `introParticle 1.2s ease-out ${200 + p.delay}ms forwards`,
                    '--ptx': `${p.tx}vw`, '--pty': `${p.ty}vh`,
                    willChange: 'transform, opacity',
                }} />
            ))}

            {/* Center flash */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '300px', height: '300px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, rgba(0,212,255,0.08) 30%, transparent 60%)',
                animation: 'introFlash 1.2s ease-out forwards',
                willChange: 'transform, opacity',
            }} />

            {/* Rotating vortex */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '200px', height: '200px',
                transform: 'translate(-50%, -50%) scale(0.5) rotate(0deg)',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent, rgba(0,212,255,0.15), rgba(124,58,237,0.1), transparent)',
                filter: 'blur(15px)',
                animation: 'introVortex 2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                willChange: 'transform, opacity',
            }} />

            {/* Text overlay */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10,
                opacity: phase >= 1 ? 1 : 0,
                transition: 'opacity 0.5s ease',
            }}>
                {/* Neural dot */}
                <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: '#00d4ff', margin: '0 auto 18px',
                    boxShadow: '0 0 20px rgba(0,212,255,0.6), 0 0 40px rgba(0,212,255,0.3)',
                    animation: phase >= 1 ? 'introPulse 1.5s ease-in-out infinite' : 'none',
                }} />
                <div style={{
                    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontSize: '13px', fontWeight: 600,
                    color: 'rgba(0,212,255,0.7)', letterSpacing: '6px',
                    textTransform: 'uppercase',
                    animation: phase >= 1 ? 'introTextIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none',
                }}>
                    Entering Neural Space
                </div>
                <div style={{
                    fontFamily: "'SF Mono', monospace", fontSize: '8px',
                    color: 'rgba(124,58,237,0.4)', letterSpacing: '3px',
                    textTransform: 'uppercase', marginTop: '12px',
                    opacity: phase >= 1 ? 0.6 : 0,
                    transition: 'opacity 0.5s ease 0.3s',
                }}>
                    ▸ initializing memory cortex
                </div>
            </div>

            {/* Perspective grid floor */}
            <div style={{
                position: 'absolute', bottom: 0, left: '-50%', right: '-50%', height: '45vh',
                background: `
                    repeating-linear-gradient(90deg, rgba(0,212,255,0.06) 0px, transparent 1px, transparent 60px),
                    repeating-linear-gradient(0deg, rgba(0,212,255,0.04) 0px, transparent 1px, transparent 60px)
                `,
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                opacity: 0,
                animation: 'introGrid 1.6s ease-out forwards',
            }} />

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0,
                boxShadow: 'inset 0 0 120px 40px rgba(2,2,8,0.9), inset 0 0 250px 80px rgba(2,2,8,0.5)',
                pointerEvents: 'none', zIndex: 8,
            }} />

            <style>{`
                @keyframes introRing {
                    0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
                    15%  { opacity: 0.6; }
                    100% { transform: translate(-50%,-50%) scale(15); opacity: 0; }
                }
                @keyframes introStreak {
                    0%   { opacity: 0; }
                    25%  { opacity: 0.5; }
                    100% { transform: rotate(var(--a,0deg)) translateY(-50%) scaleY(1.8); opacity: 0; }
                }
                @keyframes introFlash {
                    0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0; }
                    20%  { opacity: 0.8; }
                    60%  { transform: translate(-50%,-50%) scale(5); opacity: 0.15; }
                    100% { transform: translate(-50%,-50%) scale(10); opacity: 0; }
                }
                @keyframes introVortex {
                    0%   { transform: translate(-50%,-50%) scale(0.5) rotate(0deg); opacity: 0; }
                    30%  { opacity: 0.4; }
                    70%  { opacity: 0.2; }
                    100% { transform: translate(-50%,-50%) scale(4) rotate(270deg); opacity: 0; }
                }
                @keyframes introParticle {
                    0%   { transform: translate(-50%,-50%) translate(0,0) scale(0); opacity: 0; }
                    15%  { opacity: 0.9; transform: translate(-50%,-50%) translate(calc(var(--ptx) * 0.15), calc(var(--pty) * 0.15)) scale(1); }
                    100% { transform: translate(-50%,-50%) translate(var(--ptx), var(--pty)) scale(0.2); opacity: 0; }
                }
                @keyframes introTextIn {
                    0%   { transform: translateY(12px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes introPulse {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50%      { transform: scale(1.3); opacity: 1; }
                }
                @keyframes introGrid {
                    0%   { opacity: 0; }
                    40%  { opacity: 0.06; }
                    80%  { opacity: 0.03; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export default function BrainScene() {
    const loading = useBrainStore((s) => s.loading);
    const isIngesting = useBrainStore((s) => s.isIngesting);
    const [showIntro, setShowIntro] = useState(true);

    // The intro plays on mount. Once data loads AND intro finishes, we're good.
    const handleIntroComplete = () => setShowIntro(false);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Canvas
                camera={{ position: [0, 2, 14], fov: 50, near: 0.1, far: 200 }}
                gl={{
                    antialias: true, alpha: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.1,
                }}
                style={{ background: '#050510' }}
            >
                <Suspense fallback={null}>
                    <BrainContent />
                </Suspense>
                <BrainControls />
                <fog attach="fog" args={['#050510', 22, 55]} />
            </Canvas>

            {/* ═══ 3D Neural Tunnel Intro — replaces "Mapping your mind" ═══ */}
            {showIntro && <NeuralTunnelIntro onComplete={handleIntroComplete} />}

            {/* ═══ Ingestion Indicator ═══ */}
            {isIngesting && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5, pointerEvents: 'none',
                }}>
                    <div style={{
                        width: '60px', height: '60px',
                        border: '2px solid rgba(124, 92, 224, 0.1)',
                        borderTop: '2px solid #7c5ce0',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
