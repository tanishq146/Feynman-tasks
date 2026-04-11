// ═══════════════════════════════════════════════════════════════════════════
// AlexanderPage.jsx — "Alexander"
// aMCC Resistance System — The Willpower Forge
//
// This is not a tracker. This is a forge. You come here to fight yourself.
// The anterior midcingulate cortex grows ONLY through resistance — doing
// what you genuinely don't want to do. This UI makes that process visceral.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontNum = "'SF Pro Display', 'SF Mono', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#07080C',
  surface: 'rgba(255,255,255,0.02)',
  surfaceHover: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.05)',
  borderHover: 'rgba(255,255,255,0.1)',
  // Ember spectrum — willpower burns
  ember1: '#FF6B35',
  ember2: '#E8A838',
  ember3: '#FFD666',
  // Growth
  growth: '#34D399',
  growthDim: 'rgba(52,211,153,0.1)',
  // Decay
  decay: '#EF4444',
  // Neutrals
  text: '#E8F0F8',
  textMid: 'rgba(232,240,248,0.55)',
  textDim: 'rgba(232,240,248,0.2)',
  textGhost: 'rgba(232,240,248,0.08)',
};

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'body',    label: 'Body',    color: '#34D399', icon: '●' },
  { key: 'mind',    label: 'Mind',    color: '#60A5FA', icon: '●' },
  { key: 'social',  label: 'Social',  color: '#A78BFA', icon: '●' },
  { key: 'career',  label: 'Career',  color: '#FBBF24', icon: '●' },
  { key: 'fear',    label: 'Fear',    color: '#F472B6', icon: '●' },
];

// ─── Stages ──────────────────────────────────────────────────────────────────
const STAGES = [
  { name: 'Dormant',       min: 0,    max: 200,  color: '#4B5563', desc: 'Resting state. Every task feels mountainous.' },
  { name: 'Awakening',     min: 200,  max: 500,  color: '#34D399', desc: 'First neural changes. The after-feeling shifts.' },
  { name: 'Forging',       min: 500,  max: 1000, color: '#E8A838', desc: 'Active neuroplasticity. You can feel the rewiring.' },
  { name: 'Tempered',      min: 1000, max: 2000, color: '#A78BFA', desc: 'Resistance to starting dissolves. Approach reflex rewired.' },
  { name: 'Indomitable',   min: 2000, max: 5000, color: '#E85D4A', desc: 'Super-ager territory. Top 2% aMCC development.' },
];

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
const STORAGE_KEY = 'alexander_v2';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    tasks: [
      { id: 1, title: 'Cold shower — 2 minutes, no warm-up', cat: 'body', resistance: 4, completions: 8, streak: 0, lastDone: null, created: Date.now() - 86400000 * 20 },
      { id: 2, title: 'Gym when every fiber says no', cat: 'body', resistance: 3, completions: 14, streak: 3, lastDone: Date.now() - 86400000, created: Date.now() - 86400000 * 30 },
      { id: 3, title: 'Send the email sitting in drafts', cat: 'career', resistance: 3, completions: 0, streak: 0, lastDone: null, created: Date.now() - 86400000 * 6 },
      { id: 4, title: 'Call Dad about the argument', cat: 'fear', resistance: 5, completions: 0, streak: 0, lastDone: null, created: Date.now() - 86400000 * 11 },
      { id: 5, title: 'Wake up at 5am — no snooze', cat: 'mind', resistance: 4, completions: 5, streak: 1, lastDone: Date.now() - 86400000 * 2, created: Date.now() - 86400000 * 15 },
    ],
    log: [], // { id, taskId, taskTitle, resistance, points, ts }
    totalPoints: 847,
  };
}

function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
}


// ═══════════════════════════════════════════════════════════════════════════
// NEURAL CANVAS — The Living Brain (Performance-Optimized)
// Uses batched draws, cached dimensions, no per-particle gradients
// ═══════════════════════════════════════════════════════════════════════════
function NeuralCanvas({ score, pulseSignal }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    raf: null,
    particles: [],
    pulse: 0,
    time: 0,
    w: 0,
    h: 0,
    prevPulse: 0,
  });
  const { isMobile } = useResponsive();

  const PARTICLE_COUNT = isMobile ? 35 : 70;
  const growth = Math.min(score / 2000, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2
    const S = stateRef.current;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      S.w = rect.width;
      S.h = rect.height;
      canvas.width = S.w * dpr;
      canvas.height = S.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    if (S.particles.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 75;
        S.particles.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.7,
          radius: 1 + Math.random() * 1.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.4,
          orbit: dist,
          orbitAngle: angle,
          isCore: i < 10,
        });
      }
    }

    // Pre-compute connection threshold squared to avoid sqrt
    const draw = () => {
      const { w, h, particles } = S;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      S.time += 0.008;
      const t = S.time;

      if (S.pulse > 0.01) S.pulse *= 0.95;
      else S.pulse = 0;

      const coreRadius = 15 + growth * 25;
      const growthScale = 0.6 + growth * 0.4;
      const threshold = 30 + growth * 15;
      const thresholdSq = threshold * threshold;

      // ── Update particles ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.orbitAngle += p.speed * 0.005;
        const breathe = Math.sin(t * 0.5 + p.phase) * 3;
        const targetX = Math.cos(p.orbitAngle) * (p.orbit + breathe) * growthScale;
        const targetY = Math.sin(p.orbitAngle) * (p.orbit + breathe) * 0.65 * growthScale;
        p.x += (targetX - p.x) * 0.02;
        p.y += (targetY - p.y) * 0.02;
        if (S.pulse > 0.05) {
          p.x -= p.x * 0.03 * S.pulse;
          p.y -= p.y * 0.03 * S.pulse;
        }
      }

      // ── Draw connections — single batched path per alpha bucket ──
      // Group into 3 alpha buckets to batch strokes
      const buckets = [[], [], []]; // low, mid, high alpha
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < thresholdSq) {
            const ratio = 1 - Math.sqrt(distSq) / threshold;
            const bucket = ratio > 0.6 ? 2 : ratio > 0.3 ? 1 : 0;
            buckets[bucket].push(cx + pi.x, cy + pi.y, cx + pj.x, cy + pj.y);
          }
        }
      }
      const alphas = [0.03 + growth * 0.03, 0.06 + growth * 0.06, 0.1 + growth * 0.1];
      ctx.lineWidth = 0.5;
      for (let b = 0; b < 3; b++) {
        const lines = buckets[b];
        if (lines.length === 0) continue;
        ctx.beginPath();
        for (let k = 0; k < lines.length; k += 4) {
          ctx.moveTo(lines[k], lines[k + 1]);
          ctx.lineTo(lines[k + 2], lines[k + 3]);
        }
        ctx.strokeStyle = `rgba(232,168,56,${alphas[b]})`;
        ctx.stroke();
      }

      // ── Core glow — single gradient, drawn once ──
      const glowR = coreRadius + Math.sin(t) * 4 + S.pulse * 30;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      cg.addColorStop(0, `rgba(232,168,56,${(0.15 + growth * 0.2 + S.pulse * 0.3).toFixed(2)})`);
      cg.addColorStop(0.5, `rgba(232,93,74,${(0.05 + growth * 0.08).toFixed(2)})`);
      cg.addColorStop(1, 'rgba(232,93,74,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();

      // ── Draw particles — batch into two groups by color ──
      const coreColor = `rgba(255,214,102,${(0.5 + growth * 0.4).toFixed(2)})`;
      const outerColor = `rgba(232,168,56,${(0.2 + growth * 0.15).toFixed(2)})`;

      // Core particle glow (simple larger circles, no gradient)
      ctx.fillStyle = `rgba(232,168,56,${(0.08 + growth * 0.06).toFixed(2)})`;
      ctx.beginPath();
      for (const p of particles) {
        const distSq = p.x * p.x + p.y * p.y;
        if (distSq < coreRadius * coreRadius || p.isCore) {
          const px = cx + p.x;
          const py = cy + p.y;
          const r = p.radius * (1.2 + growth * 0.8) * 3;
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Outer particles (batch)
      ctx.fillStyle = outerColor;
      ctx.beginPath();
      for (const p of particles) {
        const distSq = p.x * p.x + p.y * p.y;
        if (distSq >= coreRadius * coreRadius && !p.isCore) {
          const px = cx + p.x;
          const py = cy + p.y;
          ctx.moveTo(px + p.radius, py);
          ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Core particles (batch)
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      for (const p of particles) {
        const distSq = p.x * p.x + p.y * p.y;
        if (distSq < coreRadius * coreRadius || p.isCore) {
          const px = cx + p.x;
          const py = cy + p.y;
          const r = p.radius * (1.2 + growth * 0.8);
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3 + growth * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,214,102,${(0.6 + Math.sin(t * 1.5) * 0.2 + S.pulse * 0.3).toFixed(2)})`;
      ctx.fill();

      S.raf = requestAnimationFrame(draw);
    };

    S.raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(S.raf);
      window.removeEventListener('resize', resize);
    };
  }, [PARTICLE_COUNT, growth]);

  // Trigger pulse on task completion
  useEffect(() => {
    const S = stateRef.current;
    if (pulseSignal !== S.prevPulse && pulseSignal > 0) {
      S.pulse = 1;
    }
    S.prevPulse = pulseSignal;
  }, [pulseSignal]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%', height: '100%',
        position: 'absolute', inset: 0,
      }}
    />
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER — uses RAF + DOM ref instead of React re-renders
// ═══════════════════════════════════════════════════════════════════════════
function AnimatedNumber({ value, size = 48, color = C.ember2 }) {
  const spanRef = useRef(null);
  const currentRef = useRef(value);
  const targetRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    targetRef.current = value;
    const animate = () => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 0.5) {
        currentRef.current = targetRef.current;
        if (spanRef.current) spanRef.current.textContent = targetRef.current;
        return;
      }
      currentRef.current += diff * 0.08;
      if (spanRef.current) spanRef.current.textContent = Math.round(currentRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span ref={spanRef} style={{
      fontFamily: fontNum,
      fontSize: `${size}px`,
      fontWeight: 700,
      color,
      letterSpacing: '-2px',
      fontFeatureSettings: '"tnum"',
    }}>
      {value}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// RESISTANCE RING — circular progress for current stage
// ═══════════════════════════════════════════════════════════════════════════
function ResistanceRing({ score, size = 200 }) {
  const stage = STAGES.find(s => score >= s.min && score < s.max) || STAGES[STAGES.length - 1];
  const stageIdx = STAGES.indexOf(stage);
  const progress = (score - stage.min) / (stage.max - stage.min);
  const circumference = Math.PI * (size - 16);
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Track */}
        <path
          d={`M 8 ${size / 2 + 10} A ${size / 2 - 8} ${size / 2 - 8} 0 0 1 ${size - 8} ${size / 2 + 10}`}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Progress */}
        <motion.path
          d={`M 8 ${size / 2 + 10} A ${size / 2 - 8} ${size / 2 - 8} 0 0 1 ${size - 8} ${size / 2 + 10}`}
          fill="none"
          stroke={stage.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${stage.color}60)` }}
        />
        {/* Stage markers */}
        {STAGES.map((s, i) => {
          const angle = Math.PI - (i / (STAGES.length - 1)) * Math.PI;
          const markerX = size / 2 + Math.cos(angle) * (size / 2 - 8);
          const markerY = size / 2 + 10 - Math.sin(angle) * (size / 2 - 8);
          return (
            <circle
              key={i}
              cx={markerX} cy={markerY}
              r={stageIdx >= i ? 3 : 2}
              fill={stageIdx >= i ? s.color : 'rgba(255,255,255,0.1)'}
              style={stageIdx >= i ? { filter: `drop-shadow(0 0 4px ${s.color}80)` } : {}}
            />
          );
        })}
      </svg>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK ROW — individual resistance task with completion
// ═══════════════════════════════════════════════════════════════════════════
function TaskRow({ task, onComplete, onDelete }) {
  const [locking, setLocking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [hovered, setHovered] = useState(false);

  const cat = CATEGORIES.find(c => c.key === task.cat) || CATEGORIES[0];
  const daysAvoided = task.lastDone
    ? Math.floor((Date.now() - task.lastDone) / 86400000)
    : Math.floor((Date.now() - task.created) / 86400000);
  const isAvoided = daysAvoided > 3 && task.completions > 0 || (task.completions === 0 && daysAvoided > 2);
  const avoidanceMultiplier = 1 + Math.floor(Math.max(daysAvoided - 2, 0) / 3) * 0.5;
  const basePoints = task.resistance * 25;
  const totalPoints = Math.round(basePoints * avoidanceMultiplier);

  const handleLock = () => {
    setLocking(true);
    setTimeout(() => {
      setLocking(false);
      setLocked(true);
    }, 800);
  };

  const handleComplete = () => {
    setCompleting(true);
    setTimeout(() => {
      onComplete(task.id, totalPoints);
      setCompleting(false);
      setLocked(false);
    }, 600);
  };

  // Resistance bars
  const bars = Array.from({ length: 5 }, (_, i) => i < task.resistance);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: completing ? 0.3 : 1, y: 0, scale: completing ? 0.98 : 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '18px 20px',
        borderRadius: '16px',
        background: locked
          ? `linear-gradient(135deg, ${C.surface}, rgba(232, 168, 56, 0.03))`
          : hovered ? C.surfaceHover : C.surface,
        border: `1px solid ${locked ? 'rgba(232, 168, 56, 0.15)' : hovered ? C.borderHover : C.border}`,
        transition: 'background 0.2s, border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Lock sweep animation */}
      <AnimatePresence>
        {locking && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(232, 168, 56, 0.08), transparent)',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
        {/* Left: Category dot + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: cat.color,
              boxShadow: `0 0 8px ${cat.color}50`,
            }} />
            <span style={{
              fontFamily: font, fontSize: '14px', fontWeight: 600,
              color: C.text, letterSpacing: '-0.2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {task.title}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px' }}>
            {/* Resistance bars */}
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              {bars.map((active, i) => (
                <div key={i} style={{
                  width: '12px', height: '3px', borderRadius: '1.5px',
                  background: active
                    ? i < 2 ? '#34D399' : i < 4 ? '#FBBF24' : '#EF4444'
                    : 'rgba(255,255,255,0.06)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>

            {/* Streak */}
            {task.streak > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  fontFamily: fontNum, fontSize: '11px', fontWeight: 700,
                  color: '#FBBF24',
                  display: 'flex', alignItems: 'center', gap: '3px',
                }}
              >
                <span style={{ fontSize: '10px' }}>🔥</span>
                {task.streak}
              </motion.span>
            )}

            {/* Completions */}
            <span style={{
              fontFamily: fontNum, fontSize: '10px',
              color: C.textDim,
            }}>
              {task.completions}×
            </span>

            {/* Avoidance indicator */}
            {isAvoided && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontFamily: fontMono, fontSize: '9px', fontWeight: 700,
                  color: daysAvoided > 7 ? '#EF4444' : '#F97316',
                  background: daysAvoided > 7 ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.08)',
                  padding: '2px 6px', borderRadius: '4px',
                  border: `1px solid ${daysAvoided > 7 ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.15)'}`,
                  letterSpacing: '0.5px',
                }}
              >
                {daysAvoided}d avoided
              </motion.span>
            )}
          </div>
        </div>

        {/* Right side: Points + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Points preview */}
          <div style={{ textAlign: 'right', marginRight: '4px' }}>
            <div style={{
              fontFamily: fontNum, fontSize: '16px', fontWeight: 700,
              color: C.growth, letterSpacing: '-0.5px',
            }}>
              +{totalPoints}
            </div>
            {avoidanceMultiplier > 1 && (
              <div style={{
                fontFamily: fontNum, fontSize: '9px',
                color: C.ember1, opacity: 0.7,
              }}>
                {avoidanceMultiplier.toFixed(1)}× bonus
              </div>
            )}
          </div>

          {/* Action button */}
          {!locked ? (
            <motion.button
              onClick={handleLock}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: `1px solid rgba(232, 168, 56, 0.2)`,
                background: 'rgba(232, 168, 56, 0.06)',
                color: C.ember2,
                fontFamily: fontMono, fontSize: '11px', fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
              }}
            >
              {locking ? '⟳ Locking...' : '◆ Lock'}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleComplete}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.88 }}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${C.ember1}, ${C.ember2})`,
                color: '#fff',
                fontFamily: fontMono, fontSize: '11px', fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
                boxShadow: `0 4px 16px rgba(232, 168, 56, 0.25)`,
              }}
            >
              ✦ Done
            </motion.button>
          )}

          {/* Delete (hover only) */}
          <AnimatePresence>
            {hovered && !locked && (
              <motion.button
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                onClick={() => onDelete(task.id)}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(239, 68, 68, 0.3)',
                  fontSize: '11px', cursor: 'pointer',
                  padding: '4px',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.3)'}
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// FORGE — Task Creator (immersive, not a form)
// ═══════════════════════════════════════════════════════════════════════════
function ForgePanel({ onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('body');
  const [resistance, setResistance] = useState(3);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleCreate = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), cat, resistance });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCreate();
    if (e.key === 'Escape') onClose();
  };

  const rlColors = ['#6B7280', '#34D399', '#FBBF24', '#F97316', '#EF4444'];
  const rlLabels = ['Mild', 'Reluctant', 'Hard', 'Dread', 'Pure hell'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          background: 'rgba(12, 13, 18, 0.98)',
          border: `1px solid rgba(232, 168, 56, 0.12)`,
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 120px rgba(232, 168, 56, 0.04)',
        }}
      >
        {/* Header */}
        <div style={{
          fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
          color: C.ember2, letterSpacing: '3px', textTransform: 'uppercase',
          marginBottom: '20px', opacity: 0.6,
        }}>
          Forge New Challenge
        </div>

        {/* Title input */}
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you avoiding?"
          style={{
            width: '100%', padding: '16px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${title.trim() ? 'rgba(232, 168, 56, 0.2)' : C.border}`,
            color: C.text,
            fontFamily: font, fontSize: '20px', fontWeight: 600,
            outline: 'none',
            letterSpacing: '-0.3px',
            transition: 'border-color 0.3s',
            marginBottom: '28px',
          }}
        />

        {/* Category */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontFamily: fontMono, fontSize: '10px', color: C.textDim,
            letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px',
          }}>Domain</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${cat === c.key ? `${c.color}40` : C.border}`,
                  background: cat === c.key ? `${c.color}12` : 'transparent',
                  color: cat === c.key ? c.color : C.textMid,
                  fontFamily: fontMono, fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resistance */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: fontMono, fontSize: '10px', color: C.textDim,
            letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px',
          }}>How much do you hate this?</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map(r => (
              <motion.button
                key={r}
                onClick={() => setResistance(r)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  flex: 1, padding: '14px 0',
                  borderRadius: '12px',
                  border: `2px solid ${resistance === r ? rlColors[r - 1] : 'rgba(255,255,255,0.04)'}`,
                  background: resistance === r ? `${rlColors[r - 1]}10` : 'transparent',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  fontFamily: fontNum, fontSize: '22px', fontWeight: 700,
                  color: resistance === r ? rlColors[r - 1] : C.textDim,
                  marginBottom: '2px',
                }}>{r}</div>
                <div style={{
                  fontFamily: fontMono, fontSize: '8px', fontWeight: 600,
                  color: resistance === r ? rlColors[r - 1] : C.textGhost,
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                }}>{rlLabels[r - 1]}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'rgba(232, 168, 56, 0.03)',
          border: '1px solid rgba(232, 168, 56, 0.08)',
          marginBottom: '24px',
        }}>
          <div style={{
            fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6',
            color: C.textMid,
          }}>
            Once locked, the resistance level is sealed. You rate the difficulty <em>before</em> starting, not after — that's the integrity the entire system depends on.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: 'transparent', color: C.textMid,
              fontFamily: fontMono, fontSize: '12px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >Cancel</button>
          <motion.button
            onClick={handleCreate}
            disabled={!title.trim()}
            whileHover={{ scale: title.trim() ? 1.03 : 1 }}
            whileTap={{ scale: title.trim() ? 0.97 : 1 }}
            style={{
              padding: '10px 24px', borderRadius: '10px',
              border: 'none',
              background: title.trim()
                ? `linear-gradient(135deg, ${C.ember1}, ${C.ember2})`
                : 'rgba(255,255,255,0.03)',
              color: title.trim() ? '#fff' : C.textDim,
              fontFamily: fontMono, fontSize: '12px', fontWeight: 700,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              letterSpacing: '0.3px',
              boxShadow: title.trim() ? '0 4px 20px rgba(232, 168, 56, 0.2)' : 'none',
            }}
          >◆ Forge Task</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// COMPLETION BURST — visual feedback when task is completed
// ═══════════════════════════════════════════════════════════════════════════
function CompletionBurst({ active, points }) {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1.5] }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 500,
        pointerEvents: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '8px',
      }}
    >
      <span style={{
        fontFamily: fontNum, fontSize: '48px', fontWeight: 700,
        color: C.growth,
        textShadow: `0 0 40px ${C.growth}80, 0 0 80px ${C.growth}40`,
      }}>
        +{points}
      </span>
      <span style={{
        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
        color: C.ember2, letterSpacing: '3px', textTransform: 'uppercase',
      }}>
        aMCC Growth
      </span>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG — proof of who you're becoming
// ═══════════════════════════════════════════════════════════════════════════
function ActivityLog({ log }) {
  if (log.length === 0) return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
    }}>
      <div style={{
        fontFamily: font, fontSize: '14px', fontWeight: 500,
        color: C.textDim, marginBottom: '4px',
      }}>No evidence yet</div>
      <div style={{
        fontFamily: fontMono, fontSize: '11px',
        color: C.textGhost,
      }}>Complete a resistance task to build your ledger</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {log.slice(0, 30).map((entry, i) => {
        const date = new Date(entry.ts);
        const relative = formatRelative(entry.ts);
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 16px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {/* Points */}
            <div style={{
              fontFamily: fontNum, fontSize: '14px', fontWeight: 700,
              color: C.growth, width: '48px', textAlign: 'right',
              flexShrink: 0,
            }}>+{entry.points}</div>

            {/* Divider */}
            <div style={{
              width: '1px', height: '24px',
              background: C.border,
            }} />

            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: font, fontSize: '13px', fontWeight: 500,
                color: 'rgba(232,240,248,0.7)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{entry.taskTitle}</div>
              <div style={{
                fontFamily: fontMono, fontSize: '10px',
                color: C.textDim,
                display: 'flex', gap: '8px', marginTop: '2px',
              }}>
                <span>Resistance {entry.resistance}</span>
                <span>·</span>
                <span>{relative}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function formatRelative(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY — Milestone progression
// ═══════════════════════════════════════════════════════════════════════════
function JourneyPanel({ score }) {
  const currentStage = STAGES.findIndex(s => score >= s.min && score < s.max);
  const stageIdx = currentStage === -1 ? STAGES.length - 1 : currentStage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {STAGES.map((s, i) => {
        const done = stageIdx > i;
        const active = stageIdx === i;
        const locked = stageIdx < i;
        const progress = active ? (score - s.min) / (s.max - s.min) : done ? 1 : 0;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{
              padding: '16px 18px',
              borderRadius: '14px',
              background: active ? `${s.color}06` : 'transparent',
              border: `1px solid ${active ? `${s.color}20` : 'transparent'}`,
              opacity: locked ? 0.35 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              {/* Status dot */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: done ? s.color : active ? s.color : 'rgba(255,255,255,0.08)',
                boxShadow: (done || active) ? `0 0 8px ${s.color}60` : 'none',
              }} />
              <span style={{
                fontFamily: font, fontSize: '14px', fontWeight: 700,
                color: (done || active) ? C.text : C.textMid,
              }}>
                {s.name}
              </span>
              <span style={{
                fontFamily: fontNum, fontSize: '11px',
                color: C.textDim, marginLeft: 'auto',
              }}>
                {s.min}–{s.max === 5000 ? '∞' : s.max}
              </span>
            </div>
            <div style={{
              fontFamily: fontMono, fontSize: '11px', lineHeight: '1.55',
              color: C.textMid, paddingLeft: '20px', marginBottom: active ? '10px' : '0',
            }}>
              {s.desc}
            </div>
            {/* Progress bar for active stage */}
            {active && (
              <div style={{ paddingLeft: '20px' }}>
                <div style={{
                  height: '3px', borderRadius: '2px',
                  background: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: '100%', borderRadius: '2px',
                      background: s.color,
                      boxShadow: `0 0 8px ${s.color}40`,
                    }}
                  />
                </div>
                <div style={{
                  fontFamily: fontNum, fontSize: '10px',
                  color: s.color, marginTop: '6px', opacity: 0.7,
                }}>
                  {score} / {s.max}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AlexanderPage({ isOpen, onClose }) {
  const [data, setData] = useState(() => loadData());
  const [tab, setTab] = useState('home'); // home | forge | log | journey
  const [forgeOpen, setForgeOpen] = useState(false);
  const [pulseSignal, setPulseSignal] = useState(0);
  const [burstPoints, setBurstPoints] = useState(null);
  const { isMobile, isTablet } = useResponsive();
  const addToast = useBrainStore(s => s.addToast);

  useEffect(() => { persist(data); }, [data]);

  const score = data.totalPoints;
  const stage = STAGES.find(s => score >= s.min && score < s.max) || STAGES[STAGES.length - 1];
  const stageIdx = STAGES.indexOf(stage);

  // Sort tasks: avoided first, then by resistance desc
  const sortedTasks = useMemo(() => {
    return [...data.tasks].sort((a, b) => {
      const aAvoided = a.lastDone
        ? Math.floor((Date.now() - a.lastDone) / 86400000)
        : Math.floor((Date.now() - a.created) / 86400000);
      const bAvoided = b.lastDone
        ? Math.floor((Date.now() - b.lastDone) / 86400000)
        : Math.floor((Date.now() - b.created) / 86400000);
      const aVal = (aAvoided > 3 ? 1000 : 0) + aAvoided * 10 + a.resistance;
      const bVal = (bAvoided > 3 ? 1000 : 0) + bAvoided * 10 + b.resistance;
      return bVal - aVal;
    });
  }, [data.tasks]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleComplete = useCallback((taskId, points) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;

    setData(prev => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
      tasks: prev.tasks.map(t =>
        t.id === taskId
          ? { ...t, completions: t.completions + 1, streak: t.streak + 1, lastDone: Date.now() }
          : t
      ),
      log: [
        { id: Date.now(), taskId, taskTitle: task.title, resistance: task.resistance, points, ts: Date.now() },
        ...prev.log,
      ],
    }));

    setPulseSignal(p => p + 1);
    setBurstPoints(points);
    setTimeout(() => setBurstPoints(null), 1500);

    addToast({
      type: 'success', icon: '◆',
      message: `+${points} aMCC — ${task.title}`,
      duration: 3000,
    });
  }, [data.tasks, addToast]);

  const handleAddTask = useCallback((task) => {
    setData(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        id: Date.now(),
        ...task,
        completions: 0, streak: 0, lastDone: null, created: Date.now(),
      }],
    }));
    addToast({
      type: 'success', icon: '◆',
      message: `Forged: ${task.title}`,
      duration: 2500,
    });
  }, [addToast]);

  const handleDeleteTask = useCallback((taskId) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
  }, []);

  // Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (e.key === 'Escape') {
        if (forgeOpen) setForgeOpen(false);
        else onClose?.();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, forgeOpen, onClose]);

  if (!isOpen) return null;

  const TABS = [
    { key: 'home',    label: 'Cortex' },
    { key: 'log',     label: 'Ledger' },
    { key: 'journey', label: 'Journey' },
  ];

  const totalCompleted = data.log.length;
  const todayCount = data.log.filter(l => Date.now() - l.ts < 86400000).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: font,
      }}
    >
      {/* Completion burst overlay */}
      <CompletionBurst active={burstPoints !== null} points={burstPoints} />

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${C.border}`,
        height: '52px', flexShrink: 0,
      }}>
        {/* Back */}
        <button
          onClick={onClose}
          style={{
            padding: '0 16px', height: '100%',
            background: 'none', border: 'none',
            borderRight: `1px solid ${C.border}`,
            color: C.textMid, fontFamily: fontMono, fontSize: '11px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'color 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.text}
          onMouseLeave={e => e.currentTarget.style.color = C.textMid}
        >
          <span style={{ fontSize: '13px' }}>←</span>
          <span>Back</span>
        </button>

        {/* Title */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 20px',
        }}>
          <motion.div
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: C.ember2,
              boxShadow: `0 0 12px ${C.ember2}80`,
            }}
          />
          <div>
            <div style={{
              fontFamily: font, fontSize: '15px', fontWeight: 700,
              color: C.text, letterSpacing: '-0.3px',
            }}>Alexander</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '2px', alignItems: 'center',
          height: '100%', marginLeft: isMobile ? 'auto' : '0',
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '0 16px', height: '100%',
                background: tab === t.key ? 'rgba(232, 168, 56, 0.05)' : 'none',
                border: 'none',
                borderBottom: tab === t.key ? `2px solid ${C.ember2}` : '2px solid transparent',
                color: tab === t.key ? C.ember2 : C.textMid,
                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                letterSpacing: '0.3px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{
          marginLeft: 'auto',
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '0 20px', height: '100%',
          borderLeft: `1px solid ${C.border}`,
        }}>
          {!isMobile && (
            <>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: fontNum, fontSize: '11px', fontWeight: 700,
                  color: C.growth,
                }}>{todayCount}</div>
                <div style={{
                  fontFamily: fontMono, fontSize: '7px',
                  color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
                }}>Today</div>
              </div>
              <div style={{ width: '1px', height: '20px', background: C.border }} />
            </>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: fontNum, fontSize: '18px', fontWeight: 700,
              color: C.ember2, letterSpacing: '-0.5px',
            }}>{score}</div>
            <div style={{
              fontFamily: fontMono, fontSize: '7px',
              color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
            }}>aMCC</div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {/* ─── HOME / CORTEX ─── */}
          {tab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1, display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                overflow: 'hidden',
              }}
            >
              {/* Left: Neural Canvas + Score */}
              <div style={{
                width: isMobile ? '100%' : '42%',
                height: isMobile ? '300px' : '100%',
                position: 'relative',
                borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
                borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
                flexShrink: 0,
              }}>
                <NeuralCanvas score={score} pulseSignal={pulseSignal} />

                {/* Score overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: isMobile ? '16px' : '40px',
                  left: '50%', transform: 'translateX(-50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}>
                  <AnimatedNumber value={score} size={isMobile ? 40 : 52} />
                  <div style={{
                    fontFamily: fontMono, fontSize: '8px',
                    color: C.textDim, letterSpacing: '3px', textTransform: 'uppercase',
                    marginTop: '4px',
                  }}>
                    aMCC Score
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    justifyContent: 'center', marginTop: '8px',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: stage.color,
                      boxShadow: `0 0 6px ${stage.color}60`,
                    }} />
                    <span style={{
                      fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                      color: stage.color, letterSpacing: '1px',
                    }}>
                      {stage.name}
                    </span>
                  </div>
                </div>

                {/* Stage arc — top left */}
                {!isMobile && (
                  <div style={{
                    position: 'absolute', top: '24px', left: '24px',
                    pointerEvents: 'none',
                  }}>
                    <ResistanceRing score={score} size={140} />
                  </div>
                )}

                {/* Huberman quote — subtle */}
                {!isMobile && (
                  <div style={{
                    position: 'absolute', top: '24px', right: '24px',
                    maxWidth: '180px',
                    fontFamily: fontMono, fontSize: '9px',
                    color: C.textGhost, lineHeight: '1.5',
                    fontStyle: 'italic',
                  }}>
                    "It grows only when you do what you don't want to do."
                    <div style={{ fontStyle: 'normal', color: C.textDim, marginTop: '4px', fontSize: '8px' }}>
                      — Huberman
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Tasks */}
              <div style={{
                flex: 1, overflow: 'auto',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Task list header */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                  }}>
                    Resistance Tasks
                  </div>
                  <div style={{
                    fontFamily: fontNum, fontSize: '10px',
                    color: C.textDim, marginLeft: '8px',
                  }}>
                    {data.tasks.length}
                  </div>
                  <motion.button
                    onClick={() => setForgeOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      marginLeft: 'auto',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `1px solid rgba(232, 168, 56, 0.2)`,
                      background: 'rgba(232, 168, 56, 0.05)',
                      color: C.ember2,
                      fontFamily: fontMono, fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>+</span>
                    Forge
                  </motion.button>
                </div>

                {/* Tasks */}
                <div style={{
                  flex: 1, overflow: 'auto',
                  padding: '12px 16px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  <AnimatePresence>
                    {sortedTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onComplete={handleComplete}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </AnimatePresence>

                  {data.tasks.length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '60px 20px',
                    }}>
                      <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        style={{
                          fontSize: '32px', marginBottom: '12px',
                          color: C.ember2,
                        }}
                      >◆</motion.div>
                      <div style={{
                        fontFamily: font, fontSize: '15px', fontWeight: 600,
                        color: C.textMid, marginBottom: '6px',
                      }}>No challenges forged yet</div>
                      <div style={{
                        fontFamily: fontMono, fontSize: '11px',
                        color: C.textDim,
                      }}>
                        What are you avoiding? That's your first task.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── LEDGER ─── */}
          {tab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1, overflow: 'auto',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Ledger header */}
              <div style={{
                padding: '24px 24px 16px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'flex-end', gap: '24px',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}>Identity Ledger</div>
                  <div style={{
                    fontFamily: font, fontSize: '18px', fontWeight: 700,
                    color: C.text, letterSpacing: '-0.3px',
                  }}>
                    Proof of who you're becoming
                  </div>
                  <div style={{
                    fontFamily: fontMono, fontSize: '11px',
                    color: C.textMid, marginTop: '4px',
                  }}>
                    Not affirmations. Evidence. Every entry was earned through resistance.
                  </div>
                </div>
                <div style={{
                  marginLeft: 'auto',
                  display: 'flex', gap: '20px', flexShrink: 0,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: fontNum, fontSize: '24px', fontWeight: 700,
                      color: C.growth,
                    }}>{totalCompleted}</div>
                    <div style={{
                      fontFamily: fontMono, fontSize: '8px',
                      color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
                    }}>Completed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: fontNum, fontSize: '24px', fontWeight: 700,
                      color: C.ember2,
                    }}>{score}</div>
                    <div style={{
                      fontFamily: fontMono, fontSize: '8px',
                      color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
                    }}>Total Points</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <ActivityLog log={data.log} />
              </div>
            </motion.div>
          )}

          {/* ─── JOURNEY ─── */}
          {tab === 'journey' && (
            <motion.div
              key="journey"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1, overflow: 'auto',
                maxWidth: '640px', margin: '0 auto', width: '100%',
              }}
            >
              {/* Journey header */}
              <div style={{ padding: '24px 24px 8px' }}>
                <div style={{
                  fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                  color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>Neural Development</div>
                <div style={{
                  fontFamily: font, fontSize: '18px', fontWeight: 700,
                  color: C.text, letterSpacing: '-0.3px', marginBottom: '4px',
                }}>
                  From dormant to indomitable
                </div>
                <div style={{
                  fontFamily: fontMono, fontSize: '11px',
                  color: C.textMid, marginBottom: '20px',
                }}>
                  Five stages of aMCC development, tracked by MRI research. Each stage represents measurable grey matter change.
                </div>
              </div>

              <div style={{ padding: '0 16px 40px' }}>
                <JourneyPanel score={score} />
              </div>

              {/* Science blurb at bottom */}
              <div style={{
                margin: '0 24px 40px',
                padding: '20px',
                borderRadius: '16px',
                background: 'rgba(232, 168, 56, 0.02)',
                border: `1px solid rgba(232, 168, 56, 0.06)`,
              }}>
                <div style={{
                  fontFamily: fontMono, fontSize: '12px', lineHeight: '1.7',
                  color: C.textMid, fontStyle: 'italic',
                  borderLeft: `2px solid rgba(232, 168, 56, 0.15)`,
                  paddingLeft: '16px',
                }}>
                  "The anterior midcingulate cortex is the only brain region that grows in people who are physically fit, mentally resilient, and long-lived — and shrinks in those who give in to every desire."
                  <div style={{
                    fontStyle: 'normal', marginTop: '8px',
                    fontFamily: fontMono, fontSize: '10px',
                    color: C.ember2, opacity: 0.6,
                  }}>
                    — Dr. Andrew Huberman, Stanford
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Forge modal */}
      <AnimatePresence>
        {forgeOpen && (
          <ForgePanel
            onAdd={handleAddTask}
            onClose={() => setForgeOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
