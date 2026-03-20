import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';

const sfDisplay = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const sfText = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const statusColors = {
    healthy: '#00d4ff',
    fading: '#ff8c00',
    critical: '#ff2d55',
    forgotten: '#556688',
};

// ─── SVG Icons (no emojis) ────────────────────────────────────────
const StrictIcon = ({ color, isHovered }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ transition: 'all 0.4s' }}>
        {/* Outer rotating ring */}
        <circle cx="24" cy="24" r="22" stroke={isHovered ? color : 'rgba(255,255,255,0.08)'}
            strokeWidth="1.5" strokeDasharray="4 6" fill="none"
            style={{ transition: 'stroke 0.4s', animation: isHovered ? 'strictRotate 8s linear infinite' : 'none' }} />
        {/* Inner sharp diamond */}
        <path d="M24 6L36 24L24 42L12 24Z" fill="none"
            stroke={isHovered ? color : 'rgba(255,255,255,0.15)'}
            strokeWidth="1.5" style={{ transition: 'stroke 0.4s' }} />
        {/* Center crosshair */}
        <line x1="18" y1="24" x2="30" y2="24" stroke={color} strokeWidth="1.5" opacity={isHovered ? 1 : 0.3}
            style={{ transition: 'opacity 0.4s' }} />
        <line x1="24" y1="18" x2="24" y2="30" stroke={color} strokeWidth="1.5" opacity={isHovered ? 1 : 0.3}
            style={{ transition: 'opacity 0.4s' }} />
        {/* Corner marks */}
        <path d="M16 16L19 16L19 19" fill="none" stroke={color} strokeWidth="1" opacity={isHovered ? 0.8 : 0.15}
            style={{ transition: 'opacity 0.4s' }} />
        <path d="M32 16L29 16L29 19" fill="none" stroke={color} strokeWidth="1" opacity={isHovered ? 0.8 : 0.15}
            style={{ transition: 'opacity 0.4s' }} />
        <path d="M16 32L19 32L19 29" fill="none" stroke={color} strokeWidth="1" opacity={isHovered ? 0.8 : 0.15}
            style={{ transition: 'opacity 0.4s' }} />
        <path d="M32 32L29 32L29 29" fill="none" stroke={color} strokeWidth="1" opacity={isHovered ? 0.8 : 0.15}
            style={{ transition: 'opacity 0.4s' }} />
        {/* Center dot */}
        <circle cx="24" cy="24" r="2.5" fill={color} opacity={isHovered ? 1 : 0.4}
            style={{ transition: 'opacity 0.4s' }} />
    </svg>
);

const NonStrictIcon = ({ color, isHovered }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ transition: 'all 0.4s' }}>
        {/* Flowing circles */}
        <circle cx="24" cy="24" r="20" stroke={isHovered ? color : 'rgba(255,255,255,0.08)'}
            strokeWidth="1" fill="none" style={{ transition: 'stroke 0.4s' }} />
        <circle cx="24" cy="24" r="14" stroke={isHovered ? `${color}88` : 'rgba(255,255,255,0.06)'}
            strokeWidth="1" fill="none"
            style={{ transition: 'stroke 0.4s', animation: isHovered ? 'nonStrictPulse 3s ease-in-out infinite' : 'none' }} />
        <circle cx="24" cy="24" r="8" stroke={isHovered ? `${color}66` : 'rgba(255,255,255,0.04)'}
            strokeWidth="1" fill="none" style={{ transition: 'stroke 0.4s' }} />
        {/* Orbital dots */}
        <circle cx="24" cy="4" r="2" fill={color} opacity={isHovered ? 0.8 : 0.15}
            style={{ transition: 'opacity 0.4s', transformOrigin: '24px 24px',
                animation: isHovered ? 'orbit 6s linear infinite' : 'none' }} />
        <circle cx="44" cy="24" r="1.5" fill={color} opacity={isHovered ? 0.5 : 0.1}
            style={{ transition: 'opacity 0.4s', transformOrigin: '24px 24px',
                animation: isHovered ? 'orbit 8s linear infinite reverse' : 'none' }} />
        {/* Center glow */}
        <circle cx="24" cy="24" r="3" fill={color} opacity={isHovered ? 0.6 : 0.2}
            style={{ transition: 'opacity 0.4s' }} />
        <circle cx="24" cy="24" r="5" fill={color} opacity={isHovered ? 0.15 : 0.05}
            style={{ transition: 'opacity 0.4s' }} />
    </svg>
);

// ─── Mode Configurations ──────────────────────────────────────────
const MODES = {
    strict: {
        label: 'Strict Mode',
        tag: 'DEBATE · CHALLENGE',
        color: '#ff4d4d',
        colorAlt: '#ff7043',
        gradient: 'linear-gradient(135deg, #ff4d4d, #ff7043)',
        glow: 'rgba(255, 77, 77, 0.2)',
        glowStrong: 'rgba(255, 77, 77, 0.35)',
        bg: 'rgba(255, 77, 77, 0.04)',
        bgHover: 'rgba(255, 77, 77, 0.08)',
        description: 'Rigorous intellectual challenger. No sugar-coating — if you\'re wrong, you\'ll know it. Won\'t agree until you prove real understanding.',
        features: [
            ['Challenges every claim', 'Socratic questioning'],
            ['Corrects mistakes immediately', 'No flattery — pure accuracy'],
        ],
        Icon: StrictIcon,
    },
    nonstrict: {
        label: 'Non-Strict Mode',
        tag: 'GUIDE · ENCOURAGE',
        color: '#00cc88',
        colorAlt: '#00e5a0',
        gradient: 'linear-gradient(135deg, #00cc88, #00e5a0)',
        glow: 'rgba(0, 204, 136, 0.2)',
        glowStrong: 'rgba(0, 204, 136, 0.35)',
        bg: 'rgba(0, 204, 136, 0.04)',
        bgHover: 'rgba(0, 204, 136, 0.08)',
        description: 'Warm, patient tutor who builds your confidence. Gentle guidance, vivid analogies, and genuine excitement about learning together.',
        features: [
            ['Patient explanations', 'Positive reinforcement'],
            ['Builds on what you know', 'Safe space to explore'],
        ],
        Icon: NonStrictIcon,
    },
};

export default function NodeDive() {
    const diveNode = useBrainStore((s) => s.diveNode);
    const isDiving = useBrainStore((s) => s.isDiving);
    const exitDive = useBrainStore((s) => s.exitDive);

    const [phase, setPhase] = useState('idle');
    const [mode, setMode] = useState(null);
    const [hoveredMode, setHoveredMode] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [tiltTarget, setTiltTarget] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const nodeColor = statusColors[diveNode?.status] || '#00d4ff';
    const modeConfig = mode ? MODES[mode] : null;
    const activeColor = modeConfig?.color || nodeColor;

    // ─── 3D Tilt handler ──────────────────────────────────
    const handleMouseMove = useCallback((e, key) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
        setTilt({ x, y });
        setTiltTarget(key);
    }, []);

    const handleMouseLeave = useCallback((key) => {
        setTilt({ x: 0, y: 0 });
        setTiltTarget(null);
        setHoveredMode(null);
    }, []);

    // ─── Dive entry ───────────────────────────────────────
    useEffect(() => {
        if (isDiving && diveNode) {
            setPhase('entering');
            setMode(null);
            setMessages([]);
            setInput('');
            const timer = setTimeout(() => setPhase('selecting'), 1800);
            return () => clearTimeout(timer);
        } else {
            setPhase('idle');
            setMode(null);
            setMessages([]);
            setInput('');
        }
    }, [isDiving, diveNode]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectMode = useCallback((selectedMode) => {
        setMode(selectedMode);
        const cfg = MODES[selectedMode];
        const greeting = selectedMode === 'strict'
            ? `**${cfg.label} activated for "${diveNode?.title}".**\n\nI won't go easy on you. Explain what you know about this topic, and I'll find every gap, every misconception, every weak spot. Prove you truly understand it. ✦`
            : `**${cfg.label} activated for "${diveNode?.title}".**\n\nLet's explore this topic together! Ask me anything, and I'll help you understand it deeply. I'm here to guide, encourage, and make this enjoyable. ✦`;
        setMessages([{ role: 'assistant', content: greeting }]);
        setPhase('chat');
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [diveNode]);

    const handleExit = useCallback(() => {
        setPhase('exiting');
        setTimeout(() => { exitDive(); setPhase('idle'); }, 600);
    }, [exitDive]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && isDiving) handleExit(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isDiving, handleExit]);

    // ─── Send ─────────────────────────────────────────────
    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setInput('');
        setLoading(true);
        try {
            const { data } = await api.post('/api/chat', {
                message: text, history: messages, diveMode: mode,
                nodeContext: {
                    title: diveNode.title, summary: diveNode.summary,
                    raw_content: diveNode.raw_content, topic_category: diveNode.topic_category,
                    brain_region: diveNode.brain_region, tags: diveNode.tags,
                },
            });
            setMessages(prev => [...prev, {
                role: 'assistant', content: data.reply,
                referencedNodes: data.referenced_nodes || [],
            }]);
        } catch (err) {
            console.error('Dive chat error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant', content: 'Connection error. Try again. ✦', isError: true,
            }]);
        } finally { setLoading(false); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    // ─── Markdown ─────────────────────────────────────────
    const renderContent = (text) => {
        const lines = text.split('\n');
        const htmlLines = [];
        let inList = false, listType = null;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const h3 = line.match(/^###\s+(.+)/);
            if (h3) { if (inList) { htmlLines.push(`</${listType}>`); inList = false; } htmlLines.push(`<p style="font-weight:700;color:#c8e6f4;font-size:13px;margin:12px 0 4px;">${inlineFmt(h3[1])}</p>`); continue; }
            const h2 = line.match(/^##\s+(.+)/);
            if (h2) { if (inList) { htmlLines.push(`</${listType}>`); inList = false; } htmlLines.push(`<p style="font-weight:700;color:#e0f0fa;font-size:14px;margin:14px 0 4px;">${inlineFmt(h2[1])}</p>`); continue; }
            const h1 = line.match(/^#\s+(.+)/);
            if (h1) { if (inList) { htmlLines.push(`</${listType}>`); inList = false; } htmlLines.push(`<p style="font-weight:700;color:#e8f4fd;font-size:15px;margin:14px 0 6px;">${inlineFmt(h1[1])}</p>`); continue; }
            if (/^[-*_]{3,}\s*$/.test(line)) { if (inList) { htmlLines.push(`</${listType}>`); inList = false; } htmlLines.push('<hr style="border:none;border-top:1px solid rgba(0,212,255,0.08);margin:10px 0;" />'); continue; }
            const ulMatch = line.match(/^\s*[-*•]\s+(.+)/);
            if (ulMatch) {
                if (!inList || listType !== 'ul') { if (inList) htmlLines.push(`</${listType}>`); htmlLines.push('<ul style="margin:4px 0;padding-left:16px;list-style:none;">'); inList = true; listType = 'ul'; }
                htmlLines.push(`<li style="margin-bottom:3px;display:flex;gap:6px;line-height:1.55;"><span style="color:${activeColor};flex-shrink:0;margin-top:1px;">•</span><span>${inlineFmt(ulMatch[1])}</span></li>`);
                continue;
            }
            const olMatch = line.match(/^\s*(\d+)[.)]\s+(.+)/);
            if (olMatch) {
                if (!inList || listType !== 'ol') { if (inList) htmlLines.push(`</${listType}>`); htmlLines.push('<ol style="margin:4px 0;padding-left:16px;list-style:none;">'); inList = true; listType = 'ol'; }
                htmlLines.push(`<li style="margin-bottom:3px;display:flex;gap:6px;line-height:1.55;"><span style="color:${activeColor};flex-shrink:0;font-weight:600;font-size:11px;min-width:14px;">${olMatch[1]}.</span><span>${inlineFmt(olMatch[2])}</span></li>`);
                continue;
            }
            if (inList) { htmlLines.push(`</${listType}>`); inList = false; }
            if (line.trim() === '') { htmlLines.push('<div style="height:6px;"></div>'); continue; }
            htmlLines.push(`<p style="margin:3px 0;line-height:1.6;">${inlineFmt(line)}</p>`);
        }
        if (inList) htmlLines.push(`</${listType}>`);
        return htmlLines.join('');
    };

    const inlineFmt = (text) => {
        return text
            .replace(/`([^`]+)`/g, `<code style="background:rgba(0,212,255,0.08);padding:1px 5px;border-radius:4px;font-size:11px;color:#7ec8e3;font-family:'SF Mono',monospace;">$1</code>`)
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4fd;font-weight:600;">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em style="color:#b0d4e8;">$1</em>')
            .replace(/✦/g, `<span style="color:${activeColor};text-shadow:0 0 6px ${activeColor}66;">✦</span>`);
    };

    if (!isDiving && phase === 'idle') return null;

    const isEntering = phase === 'entering';
    const isSelecting = phase === 'selecting';
    const isExiting = phase === 'exiting';
    const isChat = phase === 'chat';

    return (
        <AnimatePresence>
            {(isEntering || isSelecting || isChat || isExiting) && (
                <motion.div
                    key="node-dive"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden' }}
                >
                    {/* Background */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at center, rgba(2, 6, 16, 0.92) 0%, rgba(2, 4, 8, 0.98) 70%)',
                            backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                        }}
                    />

                    {/* ═══ PHASE 1: Portal Animation ═══ */}
                    <AnimatePresence>
                        {isEntering && (
                            <>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <motion.div key={`ring-${i}`}
                                        initial={{ scale: 0, opacity: 0.8 }}
                                        animate={{ scale: 8 + i * 3, opacity: 0 }}
                                        transition={{ duration: 1.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                                        style={{
                                            position: 'absolute', top: '50%', left: '50%',
                                            width: '60px', height: '60px', borderRadius: '50%',
                                            border: `2px solid ${nodeColor}`,
                                            transform: 'translate(-50%, -50%)',
                                            boxShadow: `0 0 20px ${nodeColor}44, inset 0 0 20px ${nodeColor}22`,
                                        }}
                                    />
                                ))}
                                <motion.div
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{ scale: 30, opacity: 0 }}
                                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                                    style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: `radial-gradient(circle, ${nodeColor}66 0%, transparent 70%)`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                />
                                {Array.from({ length: 16 }).map((_, i) => {
                                    const angle = (i / 16) * 360;
                                    const distance = 400 + Math.random() * 200;
                                    return (
                                        <motion.div key={`p-${i}`}
                                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                            animate={{
                                                x: Math.cos(angle * Math.PI / 180) * distance,
                                                y: Math.sin(angle * Math.PI / 180) * distance,
                                                opacity: 0, scale: 0.3,
                                            }}
                                            transition={{ duration: 1.2, delay: 0.1 + Math.random() * 0.3, ease: [0.22, 1, 0.36, 1] }}
                                            style={{
                                                position: 'absolute', top: '50%', left: '50%',
                                                width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`,
                                                borderRadius: '50%', background: nodeColor,
                                                boxShadow: `0 0 8px ${nodeColor}`,
                                            }}
                                        />
                                    );
                                })}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.5 }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10,
                                    }}
                                >
                                    <div style={{
                                        fontFamily: sfDisplay, fontSize: '32px', fontWeight: 700,
                                        color: '#e8f4fd', letterSpacing: '2px',
                                        textShadow: `0 0 30px ${nodeColor}88`, marginBottom: '8px',
                                    }}>{diveNode?.title}</div>
                                    <div style={{
                                        fontFamily: sfText, fontSize: '13px', color: nodeColor,
                                        letterSpacing: '3px', textTransform: 'uppercase',
                                    }}>Feynman Analysis</div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* ═══ PHASE 2: Mode Selection ═══ */}
                    <AnimatePresence>
                        {isSelecting && (
                            <motion.div
                                key="mode-select"
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    padding: '40px',
                                }}
                            >
                                {/* Ambient background glow for hovered mode */}
                                <AnimatePresence>
                                    {hoveredMode && (
                                        <motion.div
                                            key={`glow-${hoveredMode}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            style={{
                                                position: 'absolute',
                                                top: '30%', left: hoveredMode === 'strict' ? '25%' : '75%',
                                                width: '400px', height: '400px',
                                                borderRadius: '50%',
                                                background: `radial-gradient(circle, ${MODES[hoveredMode].glow} 0%, transparent 70%)`,
                                                transform: 'translate(-50%, -50%)',
                                                pointerEvents: 'none', filter: 'blur(60px)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Back */}
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleExit}
                                    style={{
                                        position: 'absolute', top: '24px', left: '24px',
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        border: `1px solid ${nodeColor}30`,
                                        background: `${nodeColor}08`, color: nodeColor,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '16px',
                                    }}
                                    title="Exit (ESC)"
                                >←</motion.button>

                                {/* Title block */}
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    style={{ textAlign: 'center', marginBottom: '16px' }}
                                >
                                    <div style={{
                                        fontFamily: sfText, fontSize: '11px', fontWeight: 600,
                                        color: `${nodeColor}66`, letterSpacing: '4px',
                                        textTransform: 'uppercase', marginBottom: '10px',
                                    }}>Feynman Analysis</div>
                                    <div style={{
                                        fontFamily: sfDisplay, fontSize: '30px', fontWeight: 700,
                                        color: '#e8f4fd', letterSpacing: '1px',
                                    }}>{diveNode?.title}</div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    style={{
                                        fontFamily: sfText, fontSize: '14px',
                                        color: 'rgba(232, 244, 253, 0.4)',
                                        marginBottom: '48px', textAlign: 'center',
                                    }}
                                >Choose your analysis mode</motion.div>

                                {/* Cards */}
                                <div style={{
                                    display: 'flex', gap: '28px',
                                    maxWidth: '760px', width: '100%',
                                    perspective: '1200px',
                                }}>
                                    {['strict', 'nonstrict'].map((modeKey, idx) => {
                                        const cfg = MODES[modeKey];
                                        const isHovered = hoveredMode === modeKey;
                                        const IconComponent = cfg.Icon;
                                        const cardTilt = tiltTarget === modeKey ? tilt : { x: 0, y: 0 };

                                        return (
                                            <motion.div
                                                key={modeKey}
                                                initial={{ opacity: 0, y: 40 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    delay: 0.25 + idx * 0.15,
                                                    duration: 0.6,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                onMouseEnter={() => setHoveredMode(modeKey)}
                                                onMouseMove={(e) => handleMouseMove(e, modeKey)}
                                                onMouseLeave={() => handleMouseLeave(modeKey)}
                                                onClick={() => handleSelectMode(modeKey)}
                                                style={{
                                                    flex: 1,
                                                    position: 'relative',
                                                    borderRadius: '20px',
                                                    cursor: 'pointer',
                                                    transformStyle: 'preserve-3d',
                                                    transform: `rotateY(${cardTilt.x}deg) rotateX(${cardTilt.y}deg)`,
                                                    transition: tiltTarget === modeKey
                                                        ? 'box-shadow 0.4s, border-color 0.4s'
                                                        : 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                                                }}
                                            >
                                                {/* Gradient border effect */}
                                                <div style={{
                                                    position: 'absolute', inset: '-1px',
                                                    borderRadius: '21px',
                                                    background: isHovered
                                                        ? cfg.gradient
                                                        : 'rgba(255,255,255,0.06)',
                                                    opacity: isHovered ? 1 : 0.5,
                                                    transition: 'all 0.5s',
                                                    zIndex: 0,
                                                }} />

                                                {/* Card inner */}
                                                <div style={{
                                                    position: 'relative',
                                                    zIndex: 1,
                                                    padding: '32px 28px',
                                                    borderRadius: '20px',
                                                    background: isHovered
                                                        ? `linear-gradient(160deg, ${cfg.bgHover} 0%, rgba(2, 6, 16, 0.95) 60%)`
                                                        : 'rgba(6, 10, 22, 0.95)',
                                                    transition: 'background 0.5s',
                                                    backdropFilter: 'blur(20px)',
                                                    WebkitBackdropFilter: 'blur(20px)',
                                                }}>
                                                    {/* Animated scan line (strict) or wave (nonstrict) */}
                                                    {isHovered && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0, left: 0, right: 0, bottom: 0,
                                                            borderRadius: '20px',
                                                            overflow: 'hidden',
                                                            pointerEvents: 'none',
                                                        }}>
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 0, left: 0, right: 0,
                                                                height: '1px',
                                                                background: `linear-gradient(90deg, transparent 0%, ${cfg.color}44 50%, transparent 100%)`,
                                                                animation: modeKey === 'strict'
                                                                    ? 'scanLine 2s ease-in-out infinite'
                                                                    : 'waveLine 3s ease-in-out infinite',
                                                            }} />
                                                        </div>
                                                    )}

                                                    {/* Icon + Label row */}
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '16px',
                                                        marginBottom: '20px',
                                                    }}>
                                                        <div style={{
                                                            flexShrink: 0,
                                                            filter: isHovered ? `drop-shadow(0 0 8px ${cfg.glow})` : 'none',
                                                            transition: 'filter 0.4s',
                                                        }}>
                                                            <IconComponent color={cfg.color} isHovered={isHovered} />
                                                        </div>
                                                        <div>
                                                            <div style={{
                                                                fontFamily: sfDisplay,
                                                                fontSize: '20px',
                                                                fontWeight: 700,
                                                                color: isHovered ? '#ffffff' : '#e8f4fd',
                                                                letterSpacing: '0.5px',
                                                                transition: 'color 0.3s',
                                                            }}>{cfg.label}</div>
                                                            <div style={{
                                                                fontFamily: sfText,
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                color: isHovered ? cfg.color : 'rgba(255,255,255,0.2)',
                                                                letterSpacing: '3px',
                                                                marginTop: '3px',
                                                                transition: 'color 0.3s',
                                                            }}>{cfg.tag}</div>
                                                        </div>
                                                    </div>

                                                    {/* Separator */}
                                                    <div style={{
                                                        height: '1px',
                                                        background: isHovered
                                                            ? `linear-gradient(90deg, ${cfg.color}30 0%, transparent 100%)`
                                                            : 'rgba(255,255,255,0.04)',
                                                        marginBottom: '16px',
                                                        transition: 'background 0.4s',
                                                    }} />

                                                    {/* Description */}
                                                    <div style={{
                                                        fontFamily: sfText,
                                                        fontSize: '13px',
                                                        color: isHovered ? 'rgba(232, 244, 253, 0.7)' : 'rgba(232, 244, 253, 0.4)',
                                                        lineHeight: 1.65,
                                                        marginBottom: '20px',
                                                        transition: 'color 0.4s',
                                                    }}>{cfg.description}</div>

                                                    {/* Feature grid */}
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        gap: '8px',
                                                        marginBottom: '24px',
                                                    }}>
                                                        {cfg.features.flat().map((feat, j) => (
                                                            <div key={j} style={{
                                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                                padding: '6px 10px',
                                                                borderRadius: '8px',
                                                                background: isHovered ? `${cfg.color}08` : 'rgba(255,255,255,0.02)',
                                                                border: `1px solid ${isHovered ? `${cfg.color}15` : 'rgba(255,255,255,0.03)'}`,
                                                                transition: 'all 0.3s',
                                                            }}>
                                                                <div style={{
                                                                    width: '5px', height: '5px',
                                                                    borderRadius: '50%',
                                                                    background: isHovered ? cfg.color : 'rgba(255,255,255,0.1)',
                                                                    boxShadow: isHovered ? `0 0 6px ${cfg.color}44` : 'none',
                                                                    flexShrink: 0,
                                                                    transition: 'all 0.3s',
                                                                }} />
                                                                <span style={{
                                                                    fontFamily: sfText,
                                                                    fontSize: '11px',
                                                                    color: isHovered ? `${cfg.color}cc` : 'rgba(255,255,255,0.25)',
                                                                    transition: 'color 0.3s',
                                                                }}>{feat}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* CTA button */}
                                                    <div style={{
                                                        padding: '10px 0',
                                                        borderRadius: '12px',
                                                        background: isHovered
                                                            ? `linear-gradient(135deg, ${cfg.color}20, ${cfg.colorAlt}10)`
                                                            : 'rgba(255,255,255,0.02)',
                                                        border: `1px solid ${isHovered ? `${cfg.color}35` : 'rgba(255,255,255,0.04)'}`,
                                                        textAlign: 'center',
                                                        fontFamily: sfDisplay,
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: isHovered ? cfg.color : 'rgba(255,255,255,0.2)',
                                                        letterSpacing: '1.5px',
                                                        textTransform: 'uppercase',
                                                        transition: 'all 0.35s',
                                                        boxShadow: isHovered ? `0 4px 20px ${cfg.glow}` : 'none',
                                                    }}>
                                                        {isHovered ? `Enter ${cfg.label}` : 'Select Mode'}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Divider "VS" */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    style={{
                                        position: 'absolute',
                                        top: '50%', left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: '50%',
                                        background: 'rgba(6, 10, 22, 0.9)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: sfDisplay, fontSize: '11px', fontWeight: 700,
                                        color: 'rgba(255,255,255,0.2)', letterSpacing: '1px',
                                    }}>VS</div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══ PHASE 3: Chat Interface ═══ */}
                    <AnimatePresence>
                        {(isChat || isExiting) && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Header */}
                                <div style={{
                                    padding: '16px 24px',
                                    borderBottom: `1px solid ${activeColor}15`,
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    background: 'rgba(2, 6, 16, 0.6)',
                                }}>
                                    <motion.button
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleExit}
                                        style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            border: `1px solid ${activeColor}30`,
                                            background: `${activeColor}08`, color: activeColor,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                                        }}
                                        title="Exit node (ESC)"
                                    >←</motion.button>

                                    <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%',
                                        background: activeColor,
                                        boxShadow: `0 0 12px ${activeColor}80`,
                                        animation: 'divePulse 2s ease-in-out infinite', flexShrink: 0,
                                    }} />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontFamily: sfDisplay, fontSize: '16px', fontWeight: 700,
                                            color: '#e8f4fd', letterSpacing: '1px',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>{diveNode?.title}</div>
                                        <div style={{
                                            fontFamily: sfText, fontSize: '11px',
                                            color: `${activeColor}99`, letterSpacing: '1px',
                                            textTransform: 'uppercase', marginTop: '2px',
                                        }}>{diveNode?.topic_category} · {modeConfig?.label}</div>
                                    </div>

                                    {/* Mode badge */}
                                    <div style={{
                                        padding: '5px 14px', borderRadius: '20px',
                                        background: `linear-gradient(135deg, ${activeColor}12, ${modeConfig?.colorAlt || activeColor}08)`,
                                        border: `1px solid ${activeColor}25`,
                                        fontFamily: sfText, fontSize: '11px', fontWeight: 600,
                                        color: activeColor, flexShrink: 0, letterSpacing: '0.5px',
                                    }}>{modeConfig?.label}</div>
                                </div>

                                {/* Node Summary */}
                                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${activeColor}08` }}>
                                    <div style={{
                                        padding: '12px 16px', borderRadius: '12px',
                                        background: `${activeColor}06`,
                                        border: `1px solid ${activeColor}12`,
                                        display: 'flex', gap: '12px', alignItems: 'flex-start',
                                    }}>
                                        <div style={{
                                            width: '4px', borderRadius: '2px',
                                            background: `linear-gradient(180deg, ${activeColor}, transparent)`,
                                            alignSelf: 'stretch', flexShrink: 0,
                                        }} />
                                        <div>
                                            <div style={{
                                                fontFamily: sfText, fontSize: '12px',
                                                color: '#c0d8e8', lineHeight: 1.5,
                                            }}>{diveNode?.summary || diveNode?.raw_content?.slice(0, 200)}</div>
                                            {diveNode?.tags?.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                                    {diveNode.tags.map((tag, i) => (
                                                        <span key={i} style={{
                                                            padding: '2px 8px', borderRadius: '6px',
                                                            background: `${activeColor}08`,
                                                            border: `1px solid ${activeColor}15`,
                                                            fontFamily: sfText, fontSize: '10px', color: `${activeColor}aa`,
                                                        }}>{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="dive-chat-scroll" style={{
                                    flex: 1, overflowY: 'auto', padding: '20px 24px',
                                    display: 'flex', flexDirection: 'column', gap: '12px',
                                    maxWidth: '800px', margin: '0 auto', width: '100%',
                                }}>
                                    {messages.map((msg, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            style={{
                                                display: 'flex',
                                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            <div style={{
                                                maxWidth: '80%', padding: '10px 14px',
                                                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                                background: msg.role === 'user'
                                                    ? `${activeColor}15`
                                                    : msg.isError ? 'rgba(255, 45, 85, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                                                border: `1px solid ${msg.role === 'user'
                                                    ? `${activeColor}25`
                                                    : msg.isError ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
                                            }}>
                                                {msg.role === 'assistant' && (
                                                    <div style={{
                                                        fontFamily: sfText, fontSize: '9px', fontWeight: 600,
                                                        color: `${activeColor}66`, letterSpacing: '1px',
                                                        textTransform: 'uppercase', marginBottom: '6px',
                                                    }}>FEYNMAN · {diveNode?.title?.toUpperCase()}</div>
                                                )}
                                                <div style={{
                                                    fontFamily: sfText, fontSize: '13px', lineHeight: '1.6',
                                                    color: msg.role === 'user' ? '#e8f4fd' : 'rgba(232, 244, 253, 0.8)',
                                                    wordBreak: 'break-word',
                                                }}
                                                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}

                                    {loading && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            style={{ display: 'flex', justifyContent: 'flex-start' }}
                                        >
                                            <div style={{
                                                padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                                display: 'flex', gap: '4px', alignItems: 'center',
                                            }}>
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} style={{
                                                        width: '6px', height: '6px', borderRadius: '50%',
                                                        background: activeColor, opacity: 0.5,
                                                        animation: `diveTypingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                                                    }} />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div style={{
                                    padding: '12px 24px 20px',
                                    borderTop: `1px solid ${activeColor}10`,
                                    maxWidth: '800px', margin: '0 auto', width: '100%',
                                }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                        <textarea ref={inputRef} value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={mode === 'strict'
                                                ? `Explain what you know about ${diveNode?.title}...`
                                                : `Ask about ${diveNode?.title}...`}
                                            rows={1}
                                            style={{
                                                flex: 1, background: 'rgba(255, 255, 255, 0.04)',
                                                border: `1px solid ${activeColor}18`, borderRadius: '12px',
                                                padding: '10px 14px', color: '#e8f4fd',
                                                fontFamily: sfText, fontSize: '13px', lineHeight: '1.5',
                                                resize: 'none', outline: 'none', maxHeight: '120px',
                                                transition: 'border-color 0.2s',
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = `${activeColor}40`}
                                            onBlur={(e) => e.target.style.borderColor = `${activeColor}18`}
                                            onInput={(e) => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                            }}
                                        />
                                        <button onClick={sendMessage}
                                            disabled={!input.trim() || loading}
                                            style={{
                                                width: '38px', height: '38px', borderRadius: '10px',
                                                background: input.trim() && !loading ? `${activeColor}18` : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${input.trim() && !loading ? `${activeColor}35` : 'rgba(255, 255, 255, 0.06)'}`,
                                                color: input.trim() && !loading ? activeColor : '#4a5568',
                                                fontSize: '16px',
                                                cursor: input.trim() && !loading ? 'pointer' : 'default',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, transition: 'all 0.2s',
                                            }}
                                        >↑</button>
                                    </div>
                                    <div style={{
                                        fontFamily: sfText, fontSize: '9px',
                                        color: 'rgba(255, 255, 255, 0.15)',
                                        textAlign: 'center', marginTop: '8px', letterSpacing: '0.5px',
                                    }}>
                                        {modeConfig?.label} · {diveNode?.title} · ESC to exit · Enter to send
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Keyframes ─── */}
                    <style>{`
                        @keyframes divePulse {
                            0%, 100% { opacity: 1; box-shadow: 0 0 12px ${activeColor}80; }
                            50% { opacity: 0.5; box-shadow: 0 0 6px ${activeColor}40; }
                        }
                        @keyframes diveTypingDot {
                            0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
                            30% { transform: translateY(-4px); opacity: 1; }
                        }
                        @keyframes strictRotate {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        @keyframes nonStrictPulse {
                            0%, 100% { r: 14; opacity: 0.5; }
                            50% { r: 16; opacity: 0.8; }
                        }
                        @keyframes orbit {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        @keyframes scanLine {
                            0% { top: 0; opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { top: 100%; opacity: 0; }
                        }
                        @keyframes waveLine {
                            0% { top: 0; opacity: 0; transform: scaleX(0.3); }
                            20% { opacity: 0.6; transform: scaleX(1); }
                            80% { opacity: 0.6; transform: scaleX(1); }
                            100% { top: 100%; opacity: 0; transform: scaleX(0.3); }
                        }
                        @keyframes modeShimmer {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                        .dive-chat-scroll::-webkit-scrollbar { width: 4px; }
                        .dive-chat-scroll::-webkit-scrollbar-track { background: transparent; }
                        .dive-chat-scroll::-webkit-scrollbar-thumb {
                            background: ${activeColor}25;
                            border-radius: 4px;
                        }
                        .dive-chat-scroll::-webkit-scrollbar-thumb:hover {
                            background: ${activeColor}40;
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
