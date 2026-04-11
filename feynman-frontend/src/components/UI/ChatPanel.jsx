import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';


const sfDisplay = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const sfText = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export default function ChatPanel({ isOpen = false, onClose }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { isMobile, isTouchDevice } = useResponsive();
    const effectiveExpanded = isMobile ? true : isExpanded;
    const panelWidth = effectiveExpanded ? 600 : 360;
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hey! I\'m **Feynman** — your second brain. Ask me anything about what you\'ve learned, or just chat. ✦' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // ─── Why Chain State ────────────────────────────────────
    const [whyChainActive, setWhyChainActive] = useState(false);
    const [whyChainEnabled, setWhyChainEnabled] = useState(false);
    const [whyChainDepth, setWhyChainDepth] = useState(0);
    const [whyChainResponses, setWhyChainResponses] = useState([]);
    const [whyChainInitialQ, setWhyChainInitialQ] = useState('');
    const [pendingWhyChain, setPendingWhyChain] = useState(false);

    const MAX_DEPTH = 5;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Reset why chain state
    const resetWhyChain = useCallback(() => {
        setWhyChainActive(false);
        setWhyChainDepth(0);
        setWhyChainResponses([]);
        setWhyChainInitialQ('');
        setPendingWhyChain(false);
    }, []);

    // ─── Send Regular Chat Message ──────────────────────────
    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // If in active why chain, send to why-chain endpoint
        if (whyChainActive) {
            await handleWhyChainResponse(text);
            return;
        }

        try {
            const { data } = await api.post('/api/chat', {
                message: text,
                history: messages,
            });

            const assistantMsg = {
                role: 'assistant',
                content: data.reply,
                referencedNodes: data.referenced_nodes || [],
            };
            setMessages(prev => [...prev, assistantMsg]);

            // If Why Chain Mode is enabled, start the chain after AI answers
            if (whyChainEnabled) {
                setPendingWhyChain(true);
                setWhyChainInitialQ(text);
                // After a brief pause, trigger the first why question
                setTimeout(() => initiateWhyChain(text, data.reply), 1200);
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I couldn\'t process that. Please try again. ✦',
                isError: true,
            }]);
        } finally {
            setLoading(false);
        }
    };

    // ─── Initiate Why Chain ─────────────────────────────────
    const initiateWhyChain = async (initialQuestion, aiAnswer) => {
        setWhyChainActive(true);
        setWhyChainDepth(0);
        setWhyChainResponses([]);
        setPendingWhyChain(false);
        setLoading(true);

        try {
            const { data } = await api.post('/api/chat/why-chain', {
                message: aiAnswer,
                depth: 0,
                chainResponses: [],
                initialQuestion: initialQuestion,
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                isWhyChain: true,
                whyDepth: data.depth,
            }]);
            setWhyChainDepth(data.depth);
        } catch (err) {
            console.error('Why Chain init error:', err);
            resetWhyChain();
        } finally {
            setLoading(false);
        }
    };

    // ─── Handle Why Chain Response ──────────────────────────
    const handleWhyChainResponse = async (userResponse) => {
        const lastWhyMsg = messages.filter(m => m.isWhyChain).pop();
        const currentQuestion = lastWhyMsg?.content || '';

        const newChainResponses = [
            ...whyChainResponses,
            { question: currentQuestion, answer: userResponse },
        ];
        setWhyChainResponses(newChainResponses);

        try {
            const { data } = await api.post('/api/chat/why-chain', {
                message: userResponse,
                depth: whyChainDepth,
                chainResponses: newChainResponses,
                initialQuestion: whyChainInitialQ,
            });

            if (data.complete) {
                // Final analysis
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.reply,
                    isWhyChain: true,
                    isAnalysis: true,
                    whyDepth: 'complete',
                }]);
                resetWhyChain();
                setWhyChainEnabled(false);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.reply,
                    isWhyChain: true,
                    whyDepth: data.depth,
                }]);
                setWhyChainDepth(data.depth);
            }
        } catch (err) {
            console.error('Why Chain error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'The Why Chain encountered an error. Let\'s continue chatting normally. ✦',
                isError: true,
            }]);
            resetWhyChain();
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ─── Rich Markdown Renderer ──────────────────────────
    const renderContent = (text) => {
        // Process block-level elements line by line
        const lines = text.split('\n');
        const htmlLines = [];
        let inList = false;
        let listType = null; // 'ul' or 'ol'

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // ─── Headers → styled bold paragraphs ──────────
            const h4 = line.match(/^####\s+(.+)/);
            if (h4) {
                if (inList) { htmlLines.push(`</${listType}>`); inList = false; }
                htmlLines.push(`<p style="font-weight:700;color:#b0d4e8;font-size:12px;margin:10px 0 4px;letter-spacing:0.5px;text-transform:uppercase;opacity:0.7;">${inlineFormat(h4[1])}</p>`);
                continue;
            }
            const h3 = line.match(/^###\s+(.+)/);
            if (h3) {
                if (inList) { htmlLines.push(`</${listType}>`); inList = false; }
                htmlLines.push(`<p style="font-weight:700;color:#c8e6f4;font-size:13px;margin:12px 0 4px;">${inlineFormat(h3[1])}</p>`);
                continue;
            }
            const h2 = line.match(/^##\s+(.+)/);
            if (h2) {
                if (inList) { htmlLines.push(`</${listType}>`); inList = false; }
                htmlLines.push(`<p style="font-weight:700;color:#e0f0fa;font-size:14px;margin:14px 0 4px;">${inlineFormat(h2[1])}</p>`);
                continue;
            }
            const h1 = line.match(/^#\s+(.+)/);
            if (h1) {
                if (inList) { htmlLines.push(`</${listType}>`); inList = false; }
                htmlLines.push(`<p style="font-weight:700;color:#e8f4fd;font-size:15px;margin:14px 0 6px;">${inlineFormat(h1[1])}</p>`);
                continue;
            }

            // ─── Horizontal rule ────────────────────────────
            if (/^[-*_]{3,}\s*$/.test(line)) {
                if (inList) { htmlLines.push(`</${listType}>`); inList = false; }
                htmlLines.push('<hr style="border:none;border-top:1px solid rgba(0,212,255,0.08);margin:10px 0;" />');
                continue;
            }

            // ─── Unordered list items ───────────────────────
            const ulMatch = line.match(/^\s*[-*•]\s+(.+)/);
            if (ulMatch) {
                if (!inList || listType !== 'ul') {
                    if (inList) htmlLines.push(`</${listType}>`);
                    htmlLines.push('<ul style="margin:4px 0;padding-left:16px;list-style:none;">');
                    inList = true;
                    listType = 'ul';
                }
                htmlLines.push(`<li style="margin-bottom:3px;display:flex;gap:6px;line-height:1.55;"><span style="color:#00d4ff;flex-shrink:0;margin-top:1px;">•</span><span>${inlineFormat(ulMatch[1])}</span></li>`);
                continue;
            }

            // ─── Ordered list items ─────────────────────────
            const olMatch = line.match(/^\s*(\d+)[.)]\s+(.+)/);
            if (olMatch) {
                if (!inList || listType !== 'ol') {
                    if (inList) htmlLines.push(`</${listType}>`);
                    htmlLines.push('<ol style="margin:4px 0;padding-left:16px;list-style:none;">');
                    inList = true;
                    listType = 'ol';
                }
                htmlLines.push(`<li style="margin-bottom:3px;display:flex;gap:6px;line-height:1.55;"><span style="color:#00d4ff;flex-shrink:0;font-weight:600;font-size:11px;min-width:14px;">${olMatch[1]}.</span><span>${inlineFormat(olMatch[2])}</span></li>`);
                continue;
            }

            // Close any open list before a blank or regular line
            if (inList) {
                htmlLines.push(`</${listType}>`);
                inList = false;
            }

            // ─── Empty line → spacing ───────────────────────
            if (line.trim() === '') {
                htmlLines.push('<div style="height:6px;"></div>');
                continue;
            }

            // ─── Regular paragraph ──────────────────────────
            htmlLines.push(`<p style="margin:3px 0;line-height:1.6;">${inlineFormat(line)}</p>`);
        }

        // Close any trailing list
        if (inList) htmlLines.push(`</${listType}>`);

        return htmlLines.join('');
    };

    // ─── Inline formatting ──────────────────────────────
    const inlineFormat = (text) => {
        return text
            // Code (inline)
            .replace(/`([^`]+)`/g, '<code style="background:rgba(0,212,255,0.08);padding:1px 5px;border-radius:4px;font-size:11px;color:#7ec8e3;font-family:\'SF Mono\',monospace;">$1</code>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4fd;font-weight:600;">$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em style="color:#b0d4e8;">$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#00d4ff;text-decoration:none;border-bottom:1px solid rgba(0,212,255,0.3);">$1</a>')
            // Feynman signature
            .replace(/✦/g, '<span style="color:#00d4ff;text-shadow:0 0 6px rgba(0,212,255,0.4);">✦</span>');
    };

    return (
        <>
            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: -380, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: isExpanded ? 0 : -380, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'fixed',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            right: effectiveExpanded ? 0 : 'auto',
                            width: isMobile ? '100%' : effectiveExpanded ? '100%' : '360px',
                            zIndex: 55,
                            background: effectiveExpanded ? 'rgba(2, 6, 16, 0.98)' : 'rgba(2, 6, 16, 0.95)',
                            backdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                            WebkitBackdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                            borderRight: effectiveExpanded ? 'none' : '1px solid rgba(0, 212, 255, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: effectiveExpanded ? 'none' : '4px 0 40px rgba(0, 0, 0, 0.5)',
                            transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease, right 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: isMobile ? '16px 14px 10px' : '20px 20px 12px',
                            borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Back button */}
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title="Back to Brain"
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '10px',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        color: '#4a9eba', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'; e.currentTarget.style.color = '#00d4ff'; e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#4a9eba'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </motion.button>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: '#00d4ff',
                                    boxShadow: '0 0 8px rgba(0, 212, 255, 0.5)',
                                    animation: 'pulse 2s ease-in-out infinite',
                                }} />
                                <span style={{
                                    fontFamily: sfDisplay, fontSize: '15px', fontWeight: 700,
                                    color: '#e8f4fd', letterSpacing: '2px', textTransform: 'uppercase',
                                }}>Feynman AI</span>
                                <span style={{
                                    fontFamily: sfText, fontSize: '10px',
                                    color: 'rgba(0, 212, 255, 0.5)', marginLeft: 'auto',
                                }}>Your Second Brain</span>

                                {/* Expand / Collapse toggle — hidden on mobile (already full width) */}
                                {!isMobile && <motion.button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title={isExpanded ? 'Compact view' : 'Expanded view'}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        border: `1px solid ${isExpanded ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                        background: isExpanded ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                        color: isExpanded ? '#00d4ff' : '#4a5568',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        flexShrink: 0,
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {isExpanded ? '⇋' : '⇔'}
                                </motion.button>}

                                {/* Close / Back button */}
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title="Close chat"
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        color: '#4a5568',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)'; e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#4a5568'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                </motion.button>
                            </div>

                            {/* Why Chain Toggle */}
                            <div style={{
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <button
                                    onClick={() => {
                                        if (whyChainActive) {
                                            resetWhyChain();
                                            setWhyChainEnabled(false);
                                        } else {
                                            setWhyChainEnabled(!whyChainEnabled);
                                        }
                                    }}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        border: `1px solid ${whyChainEnabled || whyChainActive
                                            ? 'rgba(124, 58, 237, 0.4)'
                                            : 'rgba(255, 255, 255, 0.08)'}`,
                                        background: whyChainEnabled || whyChainActive
                                            ? 'rgba(124, 58, 237, 0.12)'
                                            : 'rgba(255, 255, 255, 0.03)',
                                        color: whyChainEnabled || whyChainActive
                                            ? '#b794f6'
                                            : '#6b7280',
                                        fontFamily: sfText,
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                    }}
                                >
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: whyChainEnabled || whyChainActive ? '#b794f6' : '#4a5568',
                                        transition: 'background 0.2s',
                                    }} />
                                    Why Chain Mode
                                </button>

                                {/* Active chain depth indicator */}
                                {whyChainActive && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                        }}
                                    >
                                        {Array.from({ length: MAX_DEPTH }, (_, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: '14px', height: '3px',
                                                    borderRadius: '2px',
                                                    background: i < whyChainDepth
                                                        ? '#b794f6'
                                                        : 'rgba(255, 255, 255, 0.08)',
                                                    transition: 'background 0.3s',
                                                }}
                                            />
                                        ))}
                                        <span style={{
                                            fontFamily: sfText, fontSize: '9px',
                                            color: '#b794f6', marginLeft: '4px',
                                        }}>
                                            {whyChainDepth}/{MAX_DEPTH}
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            style={{
                                flex: 1, overflowY: 'auto',
                                padding: isMobile ? '12px' : effectiveExpanded ? '24px 32px' : '16px',
                                display: 'flex', flexDirection: 'column', gap: '12px',
                                maxWidth: effectiveExpanded ? '800px' : 'none',
                                margin: effectiveExpanded ? '0 auto' : '0',
                                width: '100%',
                            }}
                            className="chat-scrollbar"
                        >
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        // Why chain indentation
                                        ...(msg.isWhyChain && !msg.isAnalysis ? {
                                            paddingLeft: '12px',
                                            borderLeft: '2px solid rgba(124, 58, 237, 0.2)',
                                            marginLeft: '4px',
                                        } : {}),
                                        // Analysis special styling
                                        ...(msg.isAnalysis ? {
                                            paddingLeft: '0',
                                            borderLeft: 'none',
                                            marginLeft: '0',
                                        } : {}),
                                    }}
                                >
                                    <div
                                        style={{
                                            maxWidth: '85%',
                                            padding: msg.isAnalysis ? '14px' : '10px 14px',
                                            borderRadius: msg.role === 'user'
                                                ? '14px 14px 4px 14px'
                                                : '14px 14px 14px 4px',
                                            background: msg.role === 'user'
                                                ? msg.isWhyChain || whyChainActive
                                                    ? 'rgba(124, 58, 237, 0.1)'
                                                    : 'rgba(0, 212, 255, 0.12)'
                                                : msg.isAnalysis
                                                    ? 'rgba(124, 58, 237, 0.08)'
                                                    : msg.isWhyChain
                                                        ? 'rgba(124, 58, 237, 0.06)'
                                                        : msg.isError
                                                            ? 'rgba(255, 45, 85, 0.08)'
                                                            : 'rgba(255, 255, 255, 0.04)',
                                            border: `1px solid ${msg.isAnalysis
                                                ? 'rgba(124, 58, 237, 0.25)'
                                                : msg.isWhyChain
                                                    ? 'rgba(124, 58, 237, 0.15)'
                                                    : msg.role === 'user'
                                                        ? whyChainActive
                                                            ? 'rgba(124, 58, 237, 0.2)'
                                                            : 'rgba(0, 212, 255, 0.2)'
                                                        : msg.isError
                                                            ? 'rgba(255, 45, 85, 0.15)'
                                                            : 'rgba(255, 255, 255, 0.06)'
                                                }`,
                                        }}
                                    >
                                        {/* Message label */}
                                        {msg.role === 'assistant' && (
                                            <div style={{
                                                fontFamily: sfText, fontSize: '9px', fontWeight: 600,
                                                color: msg.isWhyChain ? 'rgba(183, 148, 246, 0.5)' : 'rgba(0, 212, 255, 0.4)',
                                                letterSpacing: '1px', textTransform: 'uppercase',
                                                marginBottom: '6px',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                            }}>
                                                {msg.isAnalysis ? (
                                                    <>◇ WHY CHAIN ANALYSIS</>
                                                ) : msg.isWhyChain ? (
                                                    <>◇ DEPTH {msg.whyDepth}/{MAX_DEPTH}</>
                                                ) : (
                                                    'FEYNMAN'
                                                )}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div
                                            style={{
                                                fontFamily: sfText, fontSize: '13px', lineHeight: '1.6',
                                                color: msg.role === 'user' ? '#e8f4fd' : 'rgba(232, 244, 253, 0.8)',
                                                wordBreak: 'break-word',
                                            }}
                                            dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                                        />

                                        {/* Referenced nodes */}
                                        {msg.referencedNodes?.length > 0 && (
                                            <div style={{
                                                marginTop: '8px', paddingTop: '8px',
                                                borderTop: '1px solid rgba(0, 212, 255, 0.08)',
                                                display: 'flex', flexWrap: 'wrap', gap: '4px',
                                            }}>
                                                <span style={{
                                                    fontFamily: sfText, fontSize: '9px',
                                                    color: 'rgba(0, 212, 255, 0.35)', letterSpacing: '0.5px',
                                                    width: '100%', marginBottom: '2px',
                                                }}>FROM YOUR BRAIN:</span>
                                                {msg.referencedNodes.map((title, j) => (
                                                    <span key={j} style={{
                                                        fontFamily: sfText, fontSize: '10px',
                                                        padding: '2px 8px', borderRadius: '6px',
                                                        background: 'rgba(0, 212, 255, 0.06)',
                                                        border: '1px solid rgba(0, 212, 255, 0.12)',
                                                        color: '#4a9eba',
                                                    }}>◉ {title}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing indicator */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ display: 'flex', justifyContent: 'flex-start' }}
                                >
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '14px 14px 14px 4px',
                                        background: whyChainActive
                                            ? 'rgba(124, 58, 237, 0.06)'
                                            : 'rgba(255, 255, 255, 0.04)',
                                        border: `1px solid ${whyChainActive
                                            ? 'rgba(124, 58, 237, 0.15)'
                                            : 'rgba(255, 255, 255, 0.06)'}`,
                                        display: 'flex', gap: '4px', alignItems: 'center',
                                    }}>
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} style={{
                                                width: '6px', height: '6px', borderRadius: '50%',
                                                background: whyChainActive ? '#b794f6' : '#00d4ff',
                                                opacity: 0.5,
                                                animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                                            }} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{
                            padding: isMobile ? '10px 12px 14px' : effectiveExpanded ? '16px 32px 20px' : '12px 16px 16px',
                            borderTop: '1px solid rgba(0, 212, 255, 0.08)',
                            maxWidth: effectiveExpanded ? '800px' : 'none',
                            margin: effectiveExpanded ? '0 auto' : '0',
                            width: '100%',
                        }}>
                            {/* Why Chain active status */}
                            {whyChainActive && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{
                                        marginBottom: '8px',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        background: 'rgba(124, 58, 237, 0.06)',
                                        border: '1px solid rgba(124, 58, 237, 0.12)',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <span style={{
                                        fontFamily: sfText, fontSize: '10px',
                                        color: '#b794f6',
                                    }}>
                                        ◇ Why Chain Active — Depth {whyChainDepth}/{MAX_DEPTH}
                                    </span>
                                    <button
                                        onClick={() => {
                                            resetWhyChain();
                                            setWhyChainEnabled(false);
                                            setMessages(prev => [...prev, {
                                                role: 'assistant',
                                                content: 'Why Chain ended. Feel free to continue chatting normally. ✦',
                                            }]);
                                        }}
                                        style={{
                                            fontFamily: sfText, fontSize: '9px',
                                            color: '#6b7280', background: 'transparent',
                                            border: 'none', cursor: 'pointer',
                                            padding: '2px 6px',
                                        }}
                                    >
                                        End
                                    </button>
                                </motion.div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={whyChainActive
                                        ? 'Reflect and answer honestly...'
                                        : 'Ask Feynman anything...'}
                                    rows={1}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: `1px solid ${whyChainActive
                                            ? 'rgba(124, 58, 237, 0.15)'
                                            : 'rgba(0, 212, 255, 0.12)'}`,
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        color: '#e8f4fd',
                                        fontFamily: sfText,
                                        fontSize: '13px',
                                        lineHeight: '1.5',
                                        resize: 'none',
                                        outline: 'none',
                                        maxHeight: '120px',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = whyChainActive
                                            ? 'rgba(124, 58, 237, 0.3)'
                                            : 'rgba(0, 212, 255, 0.3)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = whyChainActive
                                            ? 'rgba(124, 58, 237, 0.15)'
                                            : 'rgba(0, 212, 255, 0.12)';
                                    }}
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || loading}
                                    style={{
                                        width: '38px', height: '38px', borderRadius: '10px',
                                        background: input.trim() && !loading
                                            ? whyChainActive
                                                ? 'rgba(124, 58, 237, 0.15)'
                                                : 'rgba(0, 212, 255, 0.15)'
                                            : 'rgba(255, 255, 255, 0.03)',
                                        border: `1px solid ${input.trim() && !loading
                                            ? whyChainActive
                                                ? 'rgba(124, 58, 237, 0.3)'
                                                : 'rgba(0, 212, 255, 0.3)'
                                            : 'rgba(255, 255, 255, 0.06)'}`,
                                        color: input.trim() && !loading
                                            ? whyChainActive ? '#b794f6' : '#00d4ff'
                                            : '#4a5568',
                                        fontSize: '16px',
                                        cursor: input.trim() && !loading ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, transition: 'all 0.2s',
                                    }}
                                >
                                    ↑
                                </button>
                            </div>
                            <div style={{
                                fontFamily: sfText, fontSize: '9px',
                                color: 'rgba(255, 255, 255, 0.15)',
                                textAlign: 'center', marginTop: '8px', letterSpacing: '0.5px',
                            }}>
                                {whyChainActive
                                    ? 'Why Chain in progress • Answer to go deeper'
                                    : 'Powered by your knowledge • Press Enter to send'
                                }
                            </div>
                        </div>

                        {/* Animations */}
                        <style>{`
                            @keyframes typingDot {
                                0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
                                30% { transform: translateY(-4px); opacity: 1; }
                            }
                            @keyframes pulse {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0.4; }
                            }
                            .chat-scrollbar::-webkit-scrollbar { width: 4px; }
                            .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
                            .chat-scrollbar::-webkit-scrollbar-thumb {
                                background: rgba(0, 212, 255, 0.15);
                                border-radius: 4px;
                            }
                            .chat-scrollbar::-webkit-scrollbar-thumb:hover {
                                background: rgba(0, 212, 255, 0.3);
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
