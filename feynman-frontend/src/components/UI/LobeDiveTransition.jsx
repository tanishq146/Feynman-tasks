// ═══════════════════════════════════════════════════════════════════════════
// LobeDiveTransition — Smooth, GPU-accelerated "entering the brain" animation
//
// Uses pure CSS @keyframes + transforms for 60fps smoothness.
// All animated properties use transform/opacity only (compositor-only).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import useBrainStore from '../../store/brainStore';
import { LOBE_CONFIG } from '../Brain/BrainMesh';
import { useResponsive } from '../../hooks/useResponsive';

export default function LobeDiveTransition() {
    const activeLobeKey = useBrainStore((s) => s.activeLobeKey);
    const isLobeView = useBrainStore((s) => s.isLobeView);
    const [visible, setVisible] = useState(false);
    const [lobeKey, setLobeKey] = useState(null);
    const [fading, setFading] = useState(false);
    const prevLobeView = useRef(false);
    const { isMobile } = useResponsive();

    useEffect(() => {
        if (isLobeView && !prevLobeView.current && activeLobeKey) {
            setLobeKey(activeLobeKey);
            setVisible(true);
            setFading(false);

            // Begin fade-out
            const t1 = setTimeout(() => setFading(true), 1400);
            // Remove from DOM
            const t2 = setTimeout(() => {
                setVisible(false);
                setLobeKey(null);
                setFading(false);
            }, 2200);

            prevLobeView.current = true;
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        if (!isLobeView) {
            prevLobeView.current = false;
        }
    }, [isLobeView, activeLobeKey]);

    if (!visible || !lobeKey) return null;

    const config = LOBE_CONFIG[lobeKey];
    if (!config) return null;

    const c = config.color;
    const a = config.accent;

    // Generate ring data
    const ringCount = isMobile ? 6 : 10;
    const rings = Array.from({ length: ringCount }, (_, i) => ({
        delay: i * 60,
        size: (isMobile ? 30 : 40) + i * (isMobile ? 25 : 30),
        color: i % 2 === 0 ? c : a,
    }));

    // Generate particles
    const particleCount = isMobile ? 10 : 20;
    const particles = Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const dist = (isMobile ? 20 : 30) + Math.random() * (isMobile ? 30 : 50);
        return {
            id: i,
            tx: Math.cos(angle) * dist,
            ty: Math.sin(angle) * dist,
            size: 2 + Math.random() * 3,
            delay: Math.random() * 300,
            dur: 800 + Math.random() * 400,
        };
    });

    // Speed lines
    const lineCount = isMobile ? 8 : 16;
    const speedLines = Array.from({ length: lineCount }, (_, i) => ({
        angle: (i / lineCount) * 360,
        delay: i * 20,
        len: (isMobile ? 15 : 25) + Math.random() * (isMobile ? 20 : 35),
    }));

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 41,
                overflow: 'hidden',
                pointerEvents: 'none',
                background: '#020208',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'opacity',
            }}
        >
            {/* Background glow */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `
                    radial-gradient(ellipse at 50% 50%, ${c}15 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, #0a0a1a 0%, #020208 100%)
                `,
            }} />

            {/* Synapse flash — GPU-composited radial burst */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '200px', height: '200px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${c}60 0%, ${c}20 40%, transparent 70%)`,
                animation: 'lobeSynapseFlash 1s ease-out forwards',
                willChange: 'transform, opacity',
            }} />

            {/* Neural tunnel rings */}
            {rings.map((ring, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: `${ring.size}px`, height: `${ring.size}px`,
                    transform: 'translate(-50%, -50%) scale(0)',
                    borderRadius: '50%',
                    border: `1.5px solid ${ring.color}`,
                    boxShadow: `0 0 ${12 + i * 2}px ${c}25`,
                    animation: `lobeRingExpand 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${ring.delay}ms forwards`,
                    willChange: 'transform, opacity',
                }} />
            ))}

            {/* Speed lines */}
            {speedLines.map((sl, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: '1px', height: `${sl.len}vh`,
                    background: `linear-gradient(to bottom, transparent, ${c}60, transparent)`,
                    transformOrigin: 'top center',
                    transform: `rotate(${sl.angle}deg) translateY(-50%) scaleY(0)`,
                    animation: `lobeSpeedLine 0.8s ease-out ${200 + sl.delay}ms forwards`,
                    willChange: 'transform, opacity',
                }} />
            ))}

            {/* Scanline sweep */}
            <div style={{
                position: 'absolute',
                left: 0, right: 0, top: '-5%',
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${c}80, ${c}, ${c}80, transparent)`,
                boxShadow: `0 0 20px 6px ${c}30`,
                animation: 'lobeScanline 0.9s cubic-bezier(0.4, 0, 0.2, 1) 100ms forwards',
                willChange: 'transform',
            }} />

            {/* Particle burst */}
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: `${p.size}px`, height: `${p.size}px`,
                    borderRadius: '50%',
                    background: c,
                    boxShadow: `0 0 ${p.size * 3}px ${c}80`,
                    transform: 'translate(-50%, -50%) translate(0px, 0px) scale(0)',
                    animation: `lobeParticle ${p.dur}ms ease-out ${150 + p.delay}ms forwards`,
                    '--tx': `${p.tx}vw`,
                    '--ty': `${p.ty}vh`,
                    willChange: 'transform, opacity',
                }} />
            ))}

            {/* Center vortex glow */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '250px', height: '250px',
                transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)',
                borderRadius: '50%',
                background: `conic-gradient(from 0deg, ${c}00, ${c}35, ${a}25, ${c}00)`,
                filter: 'blur(18px)',
                animation: 'lobeVortex 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                willChange: 'transform, opacity',
            }} />

            {/* Lobe name reveal */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 10,
                animation: 'lobeTextReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 500ms both',
                willChange: 'transform, opacity',
            }}>
                {/* Glow halo */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '280px', height: '280px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${c}20 0%, transparent 70%)`,
                    filter: 'blur(25px)',
                }} />

                {/* Neural icon — SVG, no emoji */}
                <div style={{
                    width: '44px', height: '44px',
                    margin: '0 auto 14px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${c}40, ${a}30)`,
                    border: `1.5px solid ${c}50`,
                    boxShadow: `0 0 30px ${c}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'lobeIconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 600ms both',
                }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="3" fill={c} opacity="0.9"/>
                        <circle cx="10" cy="10" r="5.5" stroke={c} strokeWidth="0.8" opacity="0.5"/>
                        <circle cx="10" cy="10" r="8" stroke={c} strokeWidth="0.5" opacity="0.25" strokeDasharray="2 3"/>
                        <circle cx="4" cy="6" r="1.2" fill={a} opacity="0.7"/>
                        <circle cx="16" cy="7" r="1" fill={a} opacity="0.6"/>
                        <circle cx="6" cy="16" r="1.1" fill={a} opacity="0.5"/>
                        <circle cx="15" cy="14" r="0.9" fill={a} opacity="0.6"/>
                        <line x1="10" y1="10" x2="4" y2="6" stroke={c} strokeWidth="0.5" opacity="0.3"/>
                        <line x1="10" y1="10" x2="16" y2="7" stroke={c} strokeWidth="0.5" opacity="0.3"/>
                        <line x1="10" y1="10" x2="6" y2="16" stroke={c} strokeWidth="0.5" opacity="0.3"/>
                        <line x1="10" y1="10" x2="15" y2="14" stroke={c} strokeWidth="0.5" opacity="0.3"/>
                    </svg>
                </div>

                {/* Label */}
                <div style={{
                    fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                    fontSize: isMobile ? '22px' : '30px', fontWeight: 800,
                    color: '#e8f4fd',
                    letterSpacing: isMobile ? '4px' : '6px',
                    textTransform: 'uppercase',
                    textShadow: `0 0 40px ${c}80, 0 0 80px ${c}40`,
                    position: 'relative',
                    padding: isMobile ? '0 16px' : 0,
                }}>
                    {config.label}
                </div>

                {/* Category */}
                <div style={{
                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                    fontSize: '11px', color: a,
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    marginTop: '10px',
                    opacity: 0,
                    animation: 'lobeFadeUp 0.4s ease-out 700ms forwards',
                }}>
                    {config.category}
                </div>

                {/* Entering text */}
                <div style={{
                    fontFamily: "'SF Mono', 'Menlo', monospace",
                    fontSize: '8px', color: a,
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    marginTop: '18px',
                    opacity: 0,
                    animation: 'lobeFadeUp 0.3s ease-out 850ms forwards',
                }}>
                    ▸ entering neural space
                </div>
            </div>

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0,
                boxShadow: 'inset 0 0 100px 30px rgba(2,2,8,0.8), inset 0 0 200px 60px rgba(2,2,8,0.5)',
                pointerEvents: 'none', zIndex: 8,
            }} />

            {/* Perspective grid */}
            <div style={{
                position: 'absolute',
                bottom: 0, left: '-50%', right: '-50%',
                height: '55vh',
                background: `
                    repeating-linear-gradient(90deg, ${c}12 0px, transparent 1px, transparent 60px),
                    repeating-linear-gradient(0deg, ${c}08 0px, transparent 1px, transparent 60px)
                `,
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                opacity: 0,
                animation: 'lobeGridFade 1.4s ease-out 100ms forwards',
            }} />

            {/* CSS Keyframes — all use transform/opacity for GPU compositing */}
            <style>{`
                @keyframes lobeSynapseFlash {
                    0%   { transform: translate(-50%,-50%) scale(1); opacity: 0; }
                    20%  { opacity: 0.6; }
                    50%  { transform: translate(-50%,-50%) scale(4); opacity: 0.3; }
                    100% { transform: translate(-50%,-50%) scale(8); opacity: 0; }
                }
                @keyframes lobeRingExpand {
                    0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
                    15%  { opacity: 0.5; }
                    100% { transform: translate(-50%,-50%) scale(12); opacity: 0; }
                }
                @keyframes lobeSpeedLine {
                    0%   { opacity: 0; }
                    30%  { opacity: 0.4; }
                    100% { transform: rotate(var(--a, 0deg)) translateY(-50%) scaleY(1.5); opacity: 0; }
                }
                @keyframes lobeScanline {
                    0%   { top: -5%; }
                    100% { top: 105%; }
                }
                @keyframes lobeParticle {
                    0%   { transform: translate(-50%,-50%) translate(0,0) scale(0); opacity: 0; }
                    20%  { opacity: 0.8; transform: translate(-50%,-50%) translate(calc(var(--tx) * 0.2), calc(var(--ty) * 0.2)) scale(1); }
                    100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) scale(0.3); opacity: 0; }
                }
                @keyframes lobeVortex {
                    0%   { transform: translate(-50%,-50%) scale(0.3) rotate(0deg); opacity: 0; }
                    30%  { opacity: 0.5; }
                    70%  { opacity: 0.3; }
                    100% { transform: translate(-50%,-50%) scale(3) rotate(180deg); opacity: 0; }
                }
                @keyframes lobeTextReveal {
                    0%   { transform: translate(-50%,-50%) scale(0.8) translateY(15px); opacity: 0; }
                    100% { transform: translate(-50%,-50%) scale(1) translateY(0); opacity: 1; }
                }
                @keyframes lobeIconPop {
                    0%   { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes lobeFadeUp {
                    0%   { opacity: 0; transform: translateY(8px); }
                    100% { opacity: 0.45; transform: translateY(0); }
                }
                @keyframes lobeGridFade {
                    0%   { opacity: 0; }
                    30%  { opacity: 0.07; }
                    70%  { opacity: 0.04; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
