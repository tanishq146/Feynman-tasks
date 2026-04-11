// ═══════════════════════════════════════════════════════════════════════════
// NeuralCanvas.jsx — The living neural void behind the cognitive simulation.
// Full-screen HTML5 Canvas rendering:
//   - Ambient particle field (floating neural dust)
//   - 6 Agent orbs with radial glow + orbital drift
//   - Connection web between agents (pulsing energy lines)
//   - Energy particles flowing along connections during speech
//   - Round-based color/intensity shifts
//   - Conflict sparks between challenging agents
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from 'react';

// ─── Agent Layout ────────────────────────────────────────────────────────────
const AGENT_CONFIGS = [
    { key: 'critic',        color: [232, 93, 74],   angle: -30  },
    { key: 'dreamer',       color: [155, 127, 232],  angle: 30   },
    { key: 'avoider',       color: [245, 166, 35],   angle: 90   },
    { key: 'ambitious_self',color: [29, 184, 138],   angle: 150  },
    { key: 'rationalist',   color: [91, 164, 245],   angle: 210  },
    { key: 'shadow',        color: [212, 103, 138],  angle: 270  },
];

// ─── Particle class ──────────────────────────────────────────────────────────
class Particle {
    constructor(w, h) {
        this.reset(w, h);
    }
    reset(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 1.8 + 0.3;
        this.speedX = (Math.random() - 0.5) * 0.15;
        this.speedY = (Math.random() - 0.5) * 0.15;
        this.opacity = Math.random() * 0.35 + 0.05;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.hue = Math.random() * 60 + 220; // blue-purple range
    }
    update(w, h, t) {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < -10 || this.x > w + 10 || this.y < -10 || this.y > h + 10) {
            this.reset(w, h);
        }
        this.currentOpacity = this.opacity * (0.6 + 0.4 * Math.sin(t * this.pulseSpeed + this.pulsePhase));
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 60%, 75%, ${this.currentOpacity})`;
        ctx.fill();
    }
}

// ─── Energy Particle (flows along connections) ───────────────────────────────
class EnergyParticle {
    constructor(fromX, fromY, toX, toY, color) {
        this.fromX = fromX; this.fromY = fromY;
        this.toX = toX; this.toY = toY;
        this.color = color;
        this.progress = 0;
        this.speed = 0.008 + Math.random() * 0.012;
        this.size = 1.5 + Math.random() * 2;
        this.alive = true;
    }
    update() {
        this.progress += this.speed;
        if (this.progress >= 1) this.alive = false;
        this.x = this.fromX + (this.toX - this.fromX) * this.progress;
        this.y = this.fromY + (this.toY - this.fromY) * this.progress;
    }
    draw(ctx) {
        const fade = 1 - Math.abs(this.progress - 0.5) * 2;
        const [r, g, b] = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${fade * 0.8})`;
        ctx.fill();
        // Glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${fade * 0.15})`;
        ctx.fill();
    }
}

export default function NeuralCanvas({
    speakingAgentKey,
    currentRound,
    conflictPairs,
    isActive,
    agentPositions,   // will be set by parent
}) {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const energyRef = useRef([]);
    const frameRef = useRef(0);
    const animRef = useRef(null);
    const sizeRef = useRef({ w: 0, h: 0 });

    // ─── Initialize particles ────────────────────────────────────────
    const initParticles = useCallback((w, h) => {
        const count = Math.min(Math.floor((w * h) / 6000), 200);
        particlesRef.current = [];
        for (let i = 0; i < count; i++) {
            particlesRef.current.push(new Particle(w, h));
        }
    }, []);

    // ─── Spawn energy particles along a connection ───────────────────
    const spawnEnergy = useCallback((fromIdx, toIdx, color) => {
        if (!agentPositions || agentPositions.length < 6) return;
        const from = agentPositions[fromIdx];
        const to = agentPositions[toIdx];
        if (!from || !to) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                energyRef.current.push(new EnergyParticle(from.x, from.y, to.x, to.y, color));
            }, i * 120);
        }
    }, [agentPositions]);

    // Spawn energy when speaking agent changes
    useEffect(() => {
        if (!speakingAgentKey || !agentPositions?.length) return;
        const speakerIdx = AGENT_CONFIGS.findIndex(a => a.key === speakingAgentKey);
        if (speakerIdx === -1) return;
        const color = AGENT_CONFIGS[speakerIdx].color;
        // Send energy to 2-3 random other agents
        const targets = [0, 1, 2, 3, 4, 5].filter(i => i !== speakerIdx);
        const shuffled = targets.sort(() => Math.random() - 0.5).slice(0, 3);
        shuffled.forEach((t, i) => {
            setTimeout(() => spawnEnergy(speakerIdx, t, color), i * 200);
        });
    }, [speakingAgentKey, agentPositions, spawnEnergy]);

    // Spawn conflict sparks
    useEffect(() => {
        if (!conflictPairs?.length || !agentPositions?.length) return;
        conflictPairs.forEach(([a, b]) => {
            const idxA = AGENT_CONFIGS.findIndex(c => c.key === a);
            const idxB = AGENT_CONFIGS.findIndex(c => c.key === b);
            if (idxA >= 0 && idxB >= 0) {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => spawnEnergy(idxA, idxB, [255, 80, 60]), i * 100);
                    setTimeout(() => spawnEnergy(idxB, idxA, [255, 120, 40]), i * 100 + 50);
                }
            }
        });
    }, [conflictPairs, agentPositions, spawnEnergy]);

    // ─── Canvas render loop ──────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.scale(dpr, dpr);
            sizeRef.current = { w: window.innerWidth, h: window.innerHeight };
            initParticles(window.innerWidth, window.innerHeight);
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const { w, h } = sizeRef.current;
            const t = frameRef.current++;
            ctx.clearRect(0, 0, w, h);

            // ── Background gradient ──
            const roundHue = currentRound === 1 ? 0 : currentRound === 2 ? 140 : 260;
            const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
            bgGrad.addColorStop(0, `hsla(${roundHue}, 30%, 4%, 0.02)`);
            bgGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // ── Ambient particles ──
            for (const p of particlesRef.current) {
                p.update(w, h, t);
                p.draw(ctx);
            }

            // ── Agent orbs + connections ──
            if (agentPositions && agentPositions.length === 6) {
                // Draw connections first (behind orbs)
                for (let i = 0; i < 6; i++) {
                    for (let j = i + 1; j < 6; j++) {
                        const a = agentPositions[i];
                        const b = agentPositions[j];
                        if (!a || !b) continue;

                        const isConflict = conflictPairs?.some(
                            ([x, y]) => (AGENT_CONFIGS[i].key === x && AGENT_CONFIGS[j].key === y) ||
                                        (AGENT_CONFIGS[i].key === y && AGENT_CONFIGS[j].key === x)
                        );

                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);

                        if (isConflict) {
                            ctx.strokeStyle = `rgba(255, 80, 60, ${0.15 + 0.1 * Math.sin(t * 0.05)})`;
                            ctx.lineWidth = 1.5;
                        } else {
                            ctx.strokeStyle = `rgba(255, 255, 255, ${0.02 + 0.01 * Math.sin(t * 0.02 + i)})`;
                            ctx.lineWidth = 0.5;
                        }
                        ctx.stroke();
                    }
                }

                // Draw orbs
                for (let i = 0; i < 6; i++) {
                    const pos = agentPositions[i];
                    if (!pos) continue;
                    const [r, g, b] = AGENT_CONFIGS[i].color;
                    const isSpeaking = AGENT_CONFIGS[i].key === speakingAgentKey;
                    const baseSize = isSpeaking ? 28 : 16;
                    const pulse = Math.sin(t * 0.03 + i * 1.2) * 3;
                    const size = baseSize + pulse;

                    // Outer glow
                    const glowSize = isSpeaking ? size * 4 : size * 2.5;
                    const glowOpacity = isSpeaking ? 0.15 : 0.06;
                    const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
                    glow.addColorStop(0, `rgba(${r},${g},${b},${glowOpacity})`);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
                    ctx.fill();

                    // Core orb
                    const orbGrad = ctx.createRadialGradient(
                        pos.x - size * 0.2, pos.y - size * 0.2, size * 0.1,
                        pos.x, pos.y, size
                    );
                    orbGrad.addColorStop(0, `rgba(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 60, 255)},${isSpeaking ? 0.95 : 0.6})`);
                    orbGrad.addColorStop(0.7, `rgba(${r},${g},${b},${isSpeaking ? 0.8 : 0.4})`);
                    orbGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                    ctx.fillStyle = orbGrad;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner bright core
                    if (isSpeaking) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, size * 0.3, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.2 * Math.sin(t * 0.1)})`;
                        ctx.fill();
                    }
                }
            }

            // ── Energy particles ──
            energyRef.current = energyRef.current.filter(e => e.alive);
            for (const e of energyRef.current) {
                e.update();
                e.draw(ctx);
            }

            animRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [agentPositions, speakingAgentKey, currentRound, conflictPairs, initParticles]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0, zIndex: 0,
                background: '#030306',
                pointerEvents: 'none',
            }}
        />
    );
}

export { AGENT_CONFIGS };
