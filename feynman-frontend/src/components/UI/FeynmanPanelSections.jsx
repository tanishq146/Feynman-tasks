import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const sf = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
export const sfT = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
export const verdictColors = { 'Master': '#ffd700', 'Understands': '#00d4ff', 'Partial': '#ffaa00', 'Memorized': '#ff6b35', 'Missing It': '#ff2d55' };
export const difficultyColors = { beginner: '#00ff88', intermediate: '#ffaa00', advanced: '#ff2d55' };
export const body = { fontFamily: sfT, fontSize: '13px', lineHeight: '1.7', color: 'rgba(232,244,253,0.8)', margin: 0 };

export function timeAgo(d) {
    if (!d) return '';
    const m = Math.floor((new Date() - new Date(d)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(h / 24);
    if (dy < 30) return `${dy}d ago`;
    return `${Math.floor(dy / 30)}mo ago`;
}

/* ═══ SVG ICON SYSTEM — no emojis ═══ */
const svgStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
export const Icons = {
    bolt: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" fill={c} opacity="0.85"/></svg>,
    chart: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 14V8l3-2 3 3 3-5 3 2v8H2z" stroke={c} strokeWidth="1.3" fill={`${c}15`} strokeLinejoin="round"/></svg>,
    star: (c = '#ffd700', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.8 3.7 4 .6-2.9 2.8.7 4L8 10.8 4.4 12.6l.7-4-2.9-2.8 4-.6L8 1.5z" fill={c} opacity="0.9"/></svg>,
    diamond: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 2L14 8L8 14L2 8Z" stroke={c} strokeWidth="1.3" fill={`${c}12`}/></svg>,
    target: (c = '#ffaa00', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={c} strokeWidth="1.2"/><circle cx="8" cy="8" r="3" stroke={c} strokeWidth="1.2"/><circle cx="8" cy="8" r="0.8" fill={c}/></svg>,
    feynman: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6L14 6L11 9L12 14L8 11L4 14L5 9L2 6L6 6Z" stroke={c} strokeWidth="1.2" fill={`${c}10`} strokeLinejoin="round"/></svg>,
    bulb: (c = '#a78bfa', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 1C5.2 1 3 3.2 3 6c0 1.8 1 3.4 2.5 4.2V12h5v-1.8C12 9.4 13 7.8 13 6c0-2.8-2.2-5-5-5z" stroke={c} strokeWidth="1.2"/><line x1="6" y1="14" x2="10" y2="14" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg>,
    puzzle: (c = '#00ff88', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 5h2c0-1.1.9-2 2-2s2 .9 2 2h2v3h-1c-.6 0-1 .4-1 1s.4 1 1 1h1v3H3V5z" stroke={c} strokeWidth="1.2" fill={`${c}10`}/></svg>,
    arrow: (c = '#4a9eba', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8h8M8 4l4 4-4 4" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    node: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill={c} opacity="0.8"/><circle cx="8" cy="8" r="5.5" stroke={c} strokeWidth="0.8" opacity="0.4"/></svg>,
    strength: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 10l2-4 3 2 3-5" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 3h3v3" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/></svg>,
    decay: (c = '#7c3aed', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M12 3L4 13" stroke={c} strokeWidth="1.3" strokeLinecap="round"/><path d="M4 3v4h4" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/></svg>,
    timer: (c = '#ff6b35', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="9" r="5" stroke={c} strokeWidth="1.2"/><path d="M8 6v3l2 1.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/><line x1="6.5" y1="2" x2="9.5" y2="2" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg>,
    warn: (c = '#ff2d55', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 2L14.5 13H1.5L8 2z" stroke={c} strokeWidth="1.2" fill={`${c}10`}/><line x1="8" y1="6" x2="8" y2="9.5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="11.2" r="0.6" fill={c}/></svg>,
    notes: (c = '#a78bfa', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1.5" stroke={c} strokeWidth="1.2"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke={c} strokeWidth="0.8" opacity="0.5"/><line x1="5.5" y1="7.5" x2="10.5" y2="7.5" stroke={c} strokeWidth="0.8" opacity="0.5"/><line x1="5.5" y1="10" x2="8.5" y2="10" stroke={c} strokeWidth="0.8" opacity="0.5"/></svg>,
    refresh: (c = '#4a9eba', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 1 1 8 3" stroke={c} strokeWidth="1.3" strokeLinecap="round"/><path d="M10 1l3 2-3 2" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    check: (c = '#00ff88', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={c} strokeWidth="1.2" fill={`${c}10`}/><path d="M5.5 8l2 2 3.5-4" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    trash: (c = '#ff2d55', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 5h8l-.7 8H4.7L4 5z" stroke={c} strokeWidth="1.2"/><line x1="3" y1="4" x2="13" y2="4" stroke={c} strokeWidth="1.2" strokeLinecap="round"/><path d="M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke={c} strokeWidth="1.1"/></svg>,
    expand: (c = '#4a9eba', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><polyline points="1,5 1,1 5,1" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="15,11 15,15 11,15" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    collapse: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><polyline points="5,1 5,5 1,5" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="11,15 11,11 15,11" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    close: (c = '#4a9eba', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>,
    review: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 12V4a1 1 0 011-1h10a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 2z" stroke={c} strokeWidth="1.2" fill={`${c}08`}/><circle cx="6" cy="7" r="0.7" fill={c} opacity="0.6"/><circle cx="8" cy="7" r="0.7" fill={c} opacity="0.6"/><circle cx="10" cy="7" r="0.7" fill={c} opacity="0.6"/></svg>,
    edit: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/><path d="M9.5 4.5l2 2" stroke={c} strokeWidth="1.2"/></svg>,
    download: (c = '#00d4ff', s = 14) => <svg style={svgStyle} width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 8l3 3 3-3" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12h10" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>,
};

/* ═══ Glassmorphic Card ═══ */
export function GlassCard({ children, accent = 'rgba(255,255,255,0.06)', glow, style = {} }) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: `1px solid ${accent}`, borderRadius: '16px', padding: '20px',
            position: 'relative', overflow: 'hidden',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            boxShadow: glow ? `0 0 30px ${glow}` : 'none', ...style,
        }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            {children}
        </div>
    );
}

/* ═══ Section Header ═══ */
export function SectionHead({ icon, label, color = '#4a9eba', right }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <span style={{ fontFamily: sf, fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color }}>{label}</span>
            </div>
            {right}
        </div>
    );
}

/* ═══ Accordion ═══ */
export function Accordion({ icon, label, color = '#4a9eba', badge, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <GlassCard accent={`${color}15`}>
            <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                    <span style={{ fontFamily: sf, fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color }}>{label}</span>
                    {badge && <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}20`, color, fontFamily: sfT, fontWeight: 700 }}>{badge}</span>}
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>▾</motion.div>
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }}>
                        <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
}

/* ═══ Stat Metric ═══ */
export function Metric({ label, value, color, icon }) {
    return (
        <div style={{ flex: '1 1 0', minWidth: '90px', padding: '14px 16px', borderRadius: '12px', background: `${color}06`, border: `1px solid ${color}12`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: `radial-gradient(circle, ${color}08, transparent)`, borderRadius: '0 0 0 40px' }} />
            <div style={{ fontFamily: sfT, fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {icon}{label}
            </div>
            <div style={{ fontFamily: sf, fontSize: '17px', fontWeight: 700, color, letterSpacing: '0.3px' }}>{value}</div>
        </div>
    );
}

/* ═══ Strength Bar ═══ */
export function StrengthBar({ strength, status }) {
    const c = status === 'critical' ? '#ff2d55' : status === 'fading' ? '#ff6b35' : '#00d4ff';
    const cls = status === 'critical' ? 'strength-critical' : status === 'fading' ? 'strength-fading' : 'strength-healthy';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div className="strength-bar-bg" style={{ flex: 1 }}><div className={`strength-bar-fill ${cls}`} style={{ width: `${Math.max(2, strength)}%` }} /></div>
            <span style={{ fontFamily: sf, fontSize: '14px', fontWeight: 700, color: c, minWidth: '36px', textAlign: 'right' }}>{Math.round(strength)}%</span>
        </div>
    );
}

/* ═══ Score Bar ═══ */
export function ScoreBar({ label, score, color = '#00d4ff', animate = false }) {
    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontFamily: sfT, fontSize: '11px', color: 'rgba(232,244,253,0.5)' }}>{label}</span>
                <span style={{ fontFamily: sf, fontSize: '11px', fontWeight: 700, color }}>{score}%</span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div initial={animate ? { width: 0 } : false} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: 'easeOut' }} style={{ height: '100%', borderRadius: '2px', background: `linear-gradient(90deg, ${color}88, ${color})` }} />
            </div>
        </div>
    );
}

/* ═══ Loader ═══ */
export function Loader({ text = 'Feynman is thinking...' }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0' }}>
            <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4ff' }} />
            <span style={{ fontFamily: sfT, fontSize: '12px', color: '#4a9eba', letterSpacing: '0.5px' }}>{text}</span>
        </div>
    );
}

/* ═══ Real Life Moment ═══ */
export function RealLifeMoment({ moment, loading, count, onRefresh }) {
    return (
        <GlassCard accent="rgba(0,212,255,0.12)" glow="rgba(0,212,255,0.04)">
            <SectionHead icon={Icons.bolt('#00d4ff', 13)} label="Right Now" color="#00d4ff" right={<span style={{ fontFamily: sfT, fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>#{count}</span>} />
            {loading ? <Loader text="Generating moment..." /> : (
                <AnimatePresence mode="wait">
                    <motion.p key={moment} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ ...body, fontSize: '14px', lineHeight: '1.85', color: '#e8f4fd', fontStyle: 'italic', padding: '8px 0' }}>"{moment}"</motion.p>
                </AnimatePresence>
            )}
            <button onClick={onRefresh} disabled={loading} style={{ marginTop: '10px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '10px', padding: '8px 16px', color: '#4a9eba', fontSize: '11px', fontFamily: sfT, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.4 : 1, letterSpacing: '0.5px', transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '6px' }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(0,212,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)'; }}>
                {Icons.refresh('#4a9eba', 12)} New moment
            </button>
        </GlassCard>
    );
}

/* ═══ Feynman Challenge ═══ */
export function FeynmanChallenge({ question, loading, answer, setAnswer, result, grading, onSubmit }) {
    if (loading) return <Loader />;
    return (
        <div>
            <p style={{ ...body, marginBottom: '14px', color: '#e8f4fd', fontWeight: 500 }}>{question}</p>
            {!result ? (
                <>
                    <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer..." rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', color: '#e8f4fd', fontFamily: sfT, fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }} onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.3)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSubmit} disabled={grading || !answer.trim()} style={{ marginTop: '12px', padding: '11px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(255,170,0,0.12), rgba(255,170,0,0.06))', border: '1px solid rgba(255,170,0,0.25)', color: '#ffaa00', fontFamily: sfT, fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: grading ? 'wait' : 'pointer', opacity: grading || !answer.trim() ? 0.4 : 1 }}>{grading ? 'Grading...' : 'Submit Answer'}</motion.button>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ScoreBar label="Score" score={result.score} color={verdictColors[result.verdict] || '#00d4ff'} animate />
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '12px 0', padding: '5px 16px', borderRadius: '10px', background: `${verdictColors[result.verdict]}12`, border: `1px solid ${verdictColors[result.verdict]}25` }}>
                        <span style={{ fontFamily: sf, fontSize: '14px', fontWeight: 700, color: verdictColors[result.verdict] }}>{result.verdict}</span>
                    </div>
                    <p style={{ ...body, marginBottom: '14px' }}>{result.feedback}</p>
                    <GlassCard accent="rgba(255,215,0,0.12)">
                        <span style={{ fontFamily: sfT, fontSize: '9px', color: '#ffd700', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Key Insight</span>
                        <p style={{ ...body, marginTop: '8px', color: '#e8f4fd' }}>{result.the_key_insight}</p>
                    </GlassCard>
                    {result.score < 70 && <p style={{ ...body, marginTop: '12px', color: '#ff6b35', fontSize: '12px' }}>Review this node and try again tomorrow</p>}
                    {result.score >= 90 && <p style={{ ...body, marginTop: '12px', color: '#ffd700', fontSize: '12px' }}>✦ You own this knowledge</p>}
                </motion.div>
            )}
        </div>
    );
}

/* ═══ Teach It ═══ */
export function TeachIt({ nodeTitle, explanation, setExplanation, result, grading, onSubmit }) {
    const cc = explanation.length;
    return (
        <div>
            <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(0,212,255,0.01))', border: '1px solid rgba(0,212,255,0.08)', marginBottom: '16px' }}>
                <p style={{ ...body, fontSize: '13px', color: '#4a9eba', fontStyle: 'italic' }}>"If you can't explain it simply, you don't understand it well enough."<br /><span style={{ color: 'rgba(232,244,253,0.35)', fontSize: '11px' }}>— Richard Feynman</span></p>
                <p style={{ ...body, marginTop: '10px', color: '#e8f4fd' }}>Explain <strong>{nodeTitle}</strong> to a 12-year-old. No jargon. Pure understanding.</p>
            </div>
            {!result ? (
                <>
                    <textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Explain it simply..." rows={3} maxLength={500} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', color: '#e8f4fd', fontFamily: sfT, fontSize: '13px', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.3)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span style={{ fontFamily: sfT, fontSize: '10px', color: cc >= 200 && cc <= 400 ? '#00ff88' : cc > 400 ? '#ff6b35' : 'rgba(232,244,253,0.3)' }}>{cc}/400</span>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSubmit} disabled={grading || !explanation.trim()} style={{ padding: '11px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,212,255,0.06))', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', fontFamily: sfT, fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: grading ? 'wait' : 'pointer', opacity: grading || !explanation.trim() ? 0.4 : 1 }}>{grading ? 'Testing...' : 'Test Understanding'}</motion.button>
                    </div>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ScoreBar label="Clarity" score={result.clarity_score} color="#00d4ff" animate />
                    <ScoreBar label="Simplicity" score={result.simplicity_score} color="#00ff88" animate />
                    <ScoreBar label="Accuracy" score={result.accuracy_score} color="#7c3aed" animate />
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />
                    <ScoreBar label="Overall" score={result.overall} color={result.passed ? '#00ff88' : '#ff6b35'} animate />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                        {result.passed ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>{Icons.check('#00ff88', 22)}</motion.span> : Icons.close('#ff6b35', 22)}
                        <span style={{ fontFamily: sf, fontSize: '14px', fontWeight: 700, color: result.passed ? '#00ff88' : '#ff6b35' }}>{result.passed ? 'PASSED — Feynman Certified!' : 'NOT YET'}</span>
                    </div>
                    <GlassCard accent="rgba(0,212,255,0.1)" style={{ marginBottom: '12px' }}>
                        <span style={{ fontFamily: sfT, fontSize: '9px', color: '#4a9eba', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Feynman Says</span>
                        <p style={{ ...body, marginTop: '8px', fontStyle: 'italic', color: '#e8f4fd' }}>"{result.feynman_says}"</p>
                    </GlassCard>
                    <GlassCard accent="rgba(0,255,136,0.1)">
                        <span style={{ fontFamily: sfT, fontSize: '9px', color: '#00ff88', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Feynman's Version</span>
                        <p style={{ ...body, marginTop: '8px', color: '#e8f4fd' }}>"{result.simpler_version}"</p>
                    </GlassCard>
                    {!result.passed && <p style={{ ...body, marginTop: '12px', color: '#4a9eba', fontSize: '12px' }}>Try again — simplicity takes more effort than complexity</p>}
                </motion.div>
            )}
        </div>
    );
}

/* ═══ Knowledge Gaps ═══ */
export function KnowledgeGaps({ gaps, loading, fillingGap, onFillGap }) {
    if (loading) return <Loader text="Discovering knowledge gaps..." />;
    if (!gaps || gaps.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {gaps.map((gap, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} style={{ padding: '14px 16px', borderRadius: '12px', border: `1px solid ${gap.filled ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.06)'}`, background: gap.filled ? 'rgba(0,255,136,0.03)' : 'rgba(255,255,255,0.02)', opacity: gap.filled ? 0.6 : 1, transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                {Icons.diamond('#00d4ff', 10)}
                                <span style={{ fontFamily: sf, fontSize: '12px', fontWeight: 600, color: '#e8f4fd' }}>{gap.title}</span>
                                <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '8px', background: `${difficultyColors[gap.difficulty]}10`, border: `1px solid ${difficultyColors[gap.difficulty]}20`, color: difficultyColors[gap.difficulty], fontFamily: sfT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{gap.difficulty}</span>
                            </div>
                            <p style={{ ...body, fontSize: '12px', marginBottom: '4px' }}>{gap.teaser}</p>
                            <p style={{ ...body, fontSize: '11px', color: 'rgba(232,244,253,0.4)' }}>Why: {gap.why_it_matters}</p>
                        </div>
                        {!gap.filled ? (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onFillGap(gap, i)} disabled={fillingGap !== null} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', fontFamily: sfT, fontSize: '11px', fontWeight: 600, cursor: fillingGap !== null ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: fillingGap !== null ? 0.4 : 1 }}>{fillingGap === i ? '...' : 'ADD →'}</motion.button>
                        ) : Icons.check('#00ff88', 18)}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
