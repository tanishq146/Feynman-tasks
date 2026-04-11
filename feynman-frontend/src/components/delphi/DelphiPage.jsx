// ═══════════════════════════════════════════════════════════════════════════
// DelphiPage.jsx — The Oracle: Simulate Your People Before You Face Them
// Full Delphi Experience:
//   - Council Management (create/delete agents, quick add + chat builder)
//   - Multi-Agent Scenario Simulation
//   - Outcome Probability (calibrated predictions)
//   - Trigger Map (what to say / avoid per person)
//   - Rehearsal Mode (practice the conversation yourself)
//   - Post-Conversation Debrief (compare prediction vs reality)
//   - Simulation History (replay past simulations)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const DEFAULT_COLORS = [
    '#E85D4A', '#1DB88A', '#9B7FE8', '#F5A623', '#5BA4F5',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}


// ═══════════════════════════════════════════════════════════════════════════
// Agent Card
// ═══════════════════════════════════════════════════════════════════════════

function AgentCard({ agent, isSelected, onClick, onDelete }) {
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} whileHover={{ y: -2 }}
            onClick={onClick}
            style={{ padding: '16px', borderRadius: '14px', cursor: 'pointer', background: isSelected ? `${agent.color}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? `${agent.color}40` : 'rgba(255,255,255,0.05)'}`, transition: 'border-color 0.2s', position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}
                style={{ position: 'absolute', top: '8px', right: '8px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: 'none', color: 'rgba(232,244,253,0.2)', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${agent.color}20`, border: `2px solid ${agent.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: '12px', fontWeight: 700, color: agent.color, marginBottom: '10px' }}>{agent.initials || getInitials(agent.name)}</div>
            <div style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: '#e8f4fd', marginBottom: '2px' }}>{agent.name}</div>
            {agent.relationship && <div style={{ fontFamily: fontMono, fontSize: '9px', color: agent.color, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>{agent.relationship}</div>}
            <div style={{ fontFamily: fontMono, fontSize: '10px', lineHeight: '1.5', color: 'rgba(232,244,253,0.35)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{agent.personality || agent.raw_description}</div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Add Agent Form
// ═══════════════════════════════════════════════════════════════════════════

function AddAgentForm({ onCreated, agentCount }) {
    const [mode, setMode] = useState('quick');
    const [name, setName] = useState('');
    const [relationship, setRelationship] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatFeedRef = useRef(null);

    const handleQuickCreate = async () => {
        if (!name.trim() || !description.trim() || creating) return;
        setCreating(true);
        try {
            const res = await api.post('/api/delphi/agents', { name: name.trim(), relationship: relationship.trim(), description: description.trim(), color: DEFAULT_COLORS[agentCount % DEFAULT_COLORS.length] });
            onCreated(res.data.agent);
            setName(''); setRelationship(''); setDescription('');
        } catch (err) { console.error('Failed to create agent:', err); }
        setCreating(false);
    };

    const handleChatSend = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = { role: 'user', content: chatInput.trim() };
        const updated = [...chatMessages, userMsg];
        setChatMessages(updated); setChatInput(''); setChatLoading(true);
        try {
            const res = await api.post('/api/delphi/chat', { messages: updated, agentName: name || 'this person', relationship: relationship || 'close person' });
            setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, could you try again?' }]);
        }
        setChatLoading(false);
    };

    useEffect(() => { if (chatFeedRef.current) chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight; }, [chatMessages.length]);

    const handleBuildFromChat = async () => {
        if (!name.trim() || creating) return;
        const consolidatedDesc = chatMessages.filter(m => m.role === 'user').map(m => m.content).join('. ');
        if (!consolidatedDesc) return;
        setCreating(true);
        try {
            const res = await api.post('/api/delphi/agents', { name: name.trim(), relationship: relationship.trim(), description: consolidatedDesc, color: DEFAULT_COLORS[agentCount % DEFAULT_COLORS.length] });
            onCreated(res.data.agent);
            setName(''); setRelationship(''); setChatMessages([]); setMode('quick');
        } catch (err) { console.error('Failed to create agent from chat:', err); }
        setCreating(false);
    };

    return (
        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: '#e8f4fd', marginBottom: '14px' }}>◆ Add Person</div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                {[{ id: 'quick', label: 'Quick Add' }, { id: 'chat', label: 'Build via Chat' }].map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: mode === m.id ? 'rgba(155,127,232,0.12)' : 'rgba(255,255,255,0.03)', color: mode === m.id ? '#9B7FE8' : 'rgba(232,244,253,0.3)', fontFamily: fontMono, fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>{m.label}</button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e8f4fd', fontFamily: fontMono, fontSize: '12px', outline: 'none' }} />
                <input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Mother" style={{ width: '120px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e8f4fd', fontFamily: fontMono, fontSize: '12px', outline: 'none' }} />
            </div>
            {mode === 'quick' ? (
                <>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this person — how they think, what they value, how they'd react to big news..." rows={4}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e8f4fd', fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    <button onClick={handleQuickCreate} disabled={creating || !name.trim() || !description.trim()}
                        style={{ width: '100%', padding: '11px', borderRadius: '10px', marginTop: '10px', background: creating ? 'rgba(155,127,232,0.08)' : 'linear-gradient(135deg, rgba(155,127,232,0.12), rgba(91,164,245,0.08))', border: '1px solid rgba(155,127,232,0.2)', color: '#9B7FE8', fontFamily: fontMono, fontSize: '11px', fontWeight: 600, cursor: creating ? 'wait' : 'pointer' }}>
                        {creating ? 'Building personality...' : '◆ Create Agent'}
                    </button>
                </>
            ) : (
                <>
                    <div ref={chatFeedRef} style={{ height: '200px', overflowY: 'auto', marginBottom: '10px', borderRadius: '10px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {chatMessages.length === 0 && <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.15)', padding: '20px', textAlign: 'center' }}>Start describing {name || 'this person'}...</div>}
                        {chatMessages.map((msg, i) => (
                            <div key={i} style={{ padding: '8px 12px', marginBottom: '6px', borderRadius: '10px', background: msg.role === 'user' ? 'rgba(155,127,232,0.06)' : 'rgba(255,255,255,0.02)', borderLeft: msg.role === 'user' ? '2px solid #9B7FE8' : '2px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontFamily: fontMono, fontSize: '8px', color: msg.role === 'user' ? '#9B7FE8' : 'rgba(232,244,253,0.2)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '3px', fontWeight: 600 }}>{msg.role === 'user' ? 'You' : 'Delphi'}</div>
                                <div style={{ fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6', color: 'rgba(232,244,253,0.6)' }}>{msg.content}</div>
                            </div>
                        ))}
                        {chatLoading && <div style={{ padding: '8px 12px' }}><motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.2)' }}>Thinking...</motion.div></div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="Describe how they think, react..."
                            style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e8f4fd', fontFamily: fontMono, fontSize: '11px', outline: 'none' }} />
                        <button onClick={handleChatSend} disabled={chatLoading} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'rgba(155,127,232,0.1)', color: '#9B7FE8', fontFamily: fontMono, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>→</button>
                    </div>
                    {chatMessages.filter(m => m.role === 'user').length >= 2 && (
                        <button onClick={handleBuildFromChat} disabled={creating || !name.trim()} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(29,184,138,0.12), rgba(20,184,166,0.08))', border: '1px solid rgba(29,184,138,0.2)', color: '#1DB88A', fontFamily: fontMono, fontSize: '11px', fontWeight: 600, cursor: creating ? 'wait' : 'pointer' }}>
                            {creating ? 'Building...' : '◆ Build Agent From Chat'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Simulation Message — typewriter at readable pace
// ═══════════════════════════════════════════════════════════════════════════

function SimulationMessage({ msg, isLatest }) {
    const [displayText, setDisplayText] = useState('');
    const fullText = msg.content || '';

    useEffect(() => {
        if (!isLatest) { setDisplayText(fullText); return; }
        setDisplayText('');
        let i = 0;
        const timer = setInterval(() => {
            if (i < fullText.length) { setDisplayText(fullText.slice(0, i + 1)); i++; }
            else clearInterval(timer);
        }, 38); // Slower: 38ms per char (was 22ms)
        return () => clearInterval(timer);
    }, [fullText, isLatest]);

    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: `${msg.color}18`, border: `1.5px solid ${msg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontSize: '10px', fontWeight: 700, color: msg.color }}>{msg.initials}</div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: msg.color }}>{msg.agentName}</span>
                    {msg.relationship && <span style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{msg.relationship}</span>}
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '11px', lineHeight: '1.65', color: 'rgba(232,244,253,0.6)' }}>
                    {displayText}
                    {isLatest && displayText.length < fullText.length && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: msg.color }}>▎</motion.span>}
                </div>
            </div>
        </motion.div>
    );
}

function InsightCard({ insight, index }) {
    const colorMap = { red: '#E85D4A', green: '#1DB88A', blue: '#5BA4F5', amber: '#F5A623' };
    const c = colorMap[insight.color] || '#5BA4F5';
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.15 }}
            style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, marginTop: '5px', flexShrink: 0 }} />
            <div>
                <span style={{ fontFamily: font, fontSize: '11.5px', fontWeight: 700, color: 'rgba(232,244,253,0.8)' }}>{insight.headline} </span>
                <span style={{ fontFamily: fontMono, fontSize: '10.5px', color: 'rgba(232,244,253,0.4)', lineHeight: '1.55' }}>{insight.detail}</span>
            </div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Outcome Probability Bars
// ═══════════════════════════════════════════════════════════════════════════

function OutcomeProbability({ probabilities }) {
    if (!probabilities?.length) return null;
    const sentimentColor = { positive: '#1DB88A', negative: '#E85D4A', neutral: '#5BA4F5' };
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            style={{ padding: '18px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginTop: '12px' }}>
            <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>Outcome Probability</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {probabilities.map((p, i) => {
                    const c = sentimentColor[p.sentiment] || '#5BA4F5';
                    return (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontFamily: fontMono, fontSize: '10.5px', color: 'rgba(232,244,253,0.6)', lineHeight: '1.4' }}>{p.outcome}</span>
                                <span style={{ fontFamily: fontMono, fontSize: '11px', fontWeight: 700, color: c, flexShrink: 0, marginLeft: '8px' }}>{p.probability}%</span>
                            </div>
                            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${p.probability}%` }} transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                                    style={{ height: '100%', borderRadius: '2px', background: c }} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Trigger Map — what to say/avoid per person
// ═══════════════════════════════════════════════════════════════════════════

function TriggerMap({ triggerMap }) {
    if (!triggerMap?.length) return null;
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
            style={{ padding: '18px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginTop: '12px' }}>
            <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>Trigger Map — Language Intelligence</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {triggerMap.map((person, i) => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.15 }}>
                        <div style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: '#e8f4fd', marginBottom: '8px' }}>{person.name}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                                <div style={{ fontFamily: fontMono, fontSize: '8px', color: '#E85D4A', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>✕ Avoid Saying</div>
                                {(person.avoid || []).map((phrase, j) => (
                                    <div key={j} style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,93,74,0.6)', padding: '4px 8px', borderRadius: '6px', background: 'rgba(232,93,74,0.04)', border: '1px solid rgba(232,93,74,0.08)', marginBottom: '3px', lineHeight: '1.4' }}>"{phrase}"</div>
                                ))}
                            </div>
                            <div>
                                <div style={{ fontFamily: fontMono, fontSize: '8px', color: '#1DB88A', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>◆ Use Instead</div>
                                {(person.use || []).map((phrase, j) => (
                                    <div key={j} style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(29,184,138,0.6)', padding: '4px 8px', borderRadius: '6px', background: 'rgba(29,184,138,0.04)', border: '1px solid rgba(29,184,138,0.08)', marginBottom: '3px', lineHeight: '1.4' }}>"{phrase}"</div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Rehearsal Mode — user enters the conversation
// ═══════════════════════════════════════════════════════════════════════════

function RehearsalMode({ scenario, agents, conversationSoFar, onExit }) {
    const [rehearsalMessages, setRehearsalMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [sending, setSending] = useState(false);
    const feedRef = useRef(null);

    useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [rehearsalMessages.length]);

    const handleSend = async () => {
        if (!userInput.trim() || sending) return;
        const msg = userInput.trim();
        setRehearsalMessages(prev => [...prev, { type: 'user', content: msg }]);
        setUserInput('');
        setSending(true);

        try {
            const fullHistory = conversationSoFar + '\n' + rehearsalMessages.map(m => m.type === 'user' ? `You: "${m.content}"` : `${m.agentName}: "${m.content}"`).join('\n');
            const res = await api.post('/api/delphi/rehearse', {
                userMessage: msg,
                scenario,
                conversationSoFar: fullHistory,
                agentIds: agents.map(a => a.id),
            });

            const responses = res.data.responses || [];
            // Stagger agent responses
            for (let i = 0; i < responses.length; i++) {
                await new Promise(r => setTimeout(r, 1200));
                setRehearsalMessages(prev => [...prev, { type: 'agent', ...responses[i] }]);
            }
        } catch (err) {
            console.error('Rehearsal failed:', err);
        }
        setSending(false);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(155,127,232,0.15)' }}>
            {/* Header */}
            <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                    <div style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: '#06B6D4' }}>↻ Rehearsal Mode</div>
                    <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.2)', marginTop: '2px' }}>You entered the conversation — type what you'd actually say</div>
                </div>
                <button onClick={onExit} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(232,244,253,0.3)', fontFamily: fontMono, fontSize: '9px', cursor: 'pointer' }}>Exit Rehearsal</button>
            </div>

            {/* Chat Feed */}
            <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
                {rehearsalMessages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.12)' }}>Type what you'd say in the real conversation. Your council will respond.</div>
                    </div>
                )}
                {rehearsalMessages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: '8px' }}>
                        {msg.type === 'user' ? (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: '12px 12px 4px 12px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                                    <div style={{ fontFamily: fontMono, fontSize: '8px', color: '#06B6D4', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '3px', fontWeight: 600 }}>You</div>
                                    <div style={{ fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6', color: 'rgba(232,244,253,0.7)' }}>{msg.content}</div>
                                </div>
                            </motion.div>
                        ) : (
                            <SimulationMessage msg={msg} isLatest={false} />
                        )}
                    </div>
                ))}
                {sending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ width: '12px', height: '12px', border: '1.5px solid rgba(6,182,212,0.1)', borderTop: '1.5px solid #06B6D4', borderRadius: '50%' }} />
                        <span style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.2)' }}>They're reacting...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '8px' }}>
                <input value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Say what you'd actually say..."
                    style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6,182,212,0.12)', color: '#e8f4fd', fontFamily: fontMono, fontSize: '12px', outline: 'none' }} />
                <button onClick={handleSend} disabled={sending} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'rgba(6,182,212,0.12)', color: '#06B6D4', fontFamily: fontMono, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>↵ Send</button>
            </div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Debrief Mode — compare prediction vs reality
// ═══════════════════════════════════════════════════════════════════════════

function DebriefMode({ simulationId, onComplete }) {
    const [outcome, setOutcome] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [debrief, setDebrief] = useState(null);

    const handleSubmit = async () => {
        if (!outcome.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await api.post('/api/delphi/debrief', { simulationId, realOutcome: outcome.trim() });
            setDebrief(res.data.debrief);
        } catch (err) { console.error('Debrief failed:', err); }
        setSubmitting(false);
    };

    if (debrief) {
        return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '18px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Debrief — Prediction vs Reality</div>
                    <div style={{ fontFamily: font, fontSize: '20px', fontWeight: 700, color: debrief.accuracy_score >= 70 ? '#1DB88A' : debrief.accuracy_score >= 40 ? '#F5A623' : '#E85D4A' }}>{debrief.accuracy_score}%</div>
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6', color: 'rgba(232,244,253,0.5)', marginBottom: '12px' }}>{debrief.overall}</div>
                {debrief.comparison?.map((c, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '6px' }}>
                        <div style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: 'rgba(232,244,253,0.7)', marginBottom: '4px' }}>
                            {c.accurate ? '◆' : '✕'} {c.aspect}
                        </div>
                        <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.3)', lineHeight: '1.5' }}>
                            Predicted: {c.predicted} → Reality: {c.reality}
                        </div>
                    </div>
                ))}
                {debrief.learnings?.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontFamily: fontMono, fontSize: '8px', color: '#06B6D4', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Agent Model Updates</div>
                        {debrief.learnings.map((l, i) => (
                            <div key={i} style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(6,182,212,0.6)', lineHeight: '1.5', padding: '4px 0' }}>◇ {l}</div>
                        ))}
                    </div>
                )}
                <button onClick={onComplete} style={{ marginTop: '10px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: 'rgba(232,244,253,0.3)', fontFamily: fontMono, fontSize: '9px', cursor: 'pointer' }}>Done</button>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '18px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginTop: '12px' }}>
            <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>✦ Post-Conversation Debrief</div>
            <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.3)', marginBottom: '10px', lineHeight: '1.5' }}>Had the real conversation? Tell us what happened. Delphi will compare its prediction with reality and sharpen your agents.</div>
            <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What actually happened? How did each person react? Were they receptive, resistant? What surprised you?"
                rows={4} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e8f4fd', fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleSubmit} disabled={submitting || !outcome.trim()}
                style={{ width: '100%', padding: '11px', borderRadius: '10px', marginTop: '10px', background: submitting ? 'rgba(6,182,212,0.06)' : 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(99,102,241,0.08))', border: '1px solid rgba(6,182,212,0.2)', color: '#06B6D4', fontFamily: fontMono, fontSize: '11px', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}>
                {submitting ? 'Comparing...' : '✦ Compare with Prediction'}
            </button>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// History Item
// ═══════════════════════════════════════════════════════════════════════════

function HistoryItem({ sim, onReplay }) {
    const insights = sim.insights?.insights || [];
    const hasDebrief = !!sim.insights?.debrief;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ background: 'rgba(255,255,255,0.03)' }}
            onClick={() => onReplay(sim)}
            style={{ padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{formatDate(sim.created_at)}</div>
                    {hasDebrief && <div style={{ fontFamily: fontMono, fontSize: '7px', padding: '2px 5px', borderRadius: '4px', background: 'rgba(6,182,212,0.08)', color: '#06B6D4', fontWeight: 600 }}>DEBRIEFED</div>}
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '8px', color: '#9B7FE8', fontWeight: 600 }}>Replay →</div>
            </div>
            <div style={{ fontFamily: font, fontSize: '12px', fontWeight: 600, color: 'rgba(232,244,253,0.7)', fontStyle: 'italic', lineHeight: '1.5', marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>"{sim.scenario}"</div>
            {insights.length > 0 && <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.3)', lineHeight: '1.5' }}>◆ {insights[0].headline}</div>}
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// DelphiPage — Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function DelphiPage({ isOpen, onClose }) {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [rightView, setRightView] = useState('new');

    // Simulation state
    const [scenario, setScenario] = useState('');
    const [simulating, setSimulating] = useState(false);
    const [simMessages, setSimMessages] = useState([]);
    const [simInsights, setSimInsights] = useState([]);
    const [simProbabilities, setSimProbabilities] = useState([]);
    const [simTriggerMap, setSimTriggerMap] = useState([]);
    const [simId, setSimId] = useState(null);
    const [latestIdx, setLatestIdx] = useState(-1);
    const [showPostSim, setShowPostSim] = useState(false);

    // Rehearsal mode
    const [rehearsalActive, setRehearsalActive] = useState(false);
    const [conversationHistory, setConversationHistory] = useState('');

    // Debrief mode
    const [debriefActive, setDebriefActive] = useState(false);

    // History
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const simFeedRef = useRef(null);
    const addToast = useBrainStore(s => s.addToast);
    const { isMobile, isTablet, isTouchDevice } = useResponsive();
    // Mobile: toggle between council (left) and simulation (right) panels
    const [mobilePanel, setMobilePanel] = useState('council');

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        api.get('/api/delphi/agents')
            .then(res => setAgents(res.data.agents || []))
            .catch(err => console.error('Failed to fetch delphi agents:', err))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const fetchHistory = useCallback(() => {
        setLoadingHistory(true);
        api.get('/api/delphi/simulations')
            .then(res => setHistory(res.data.simulations || []))
            .catch(err => console.error('Failed to fetch history:', err))
            .finally(() => setLoadingHistory(false));
    }, []);

    useEffect(() => { if (rightView === 'history' && isOpen) fetchHistory(); }, [rightView, isOpen, fetchHistory]);
    useEffect(() => { if (simFeedRef.current) simFeedRef.current.scrollTop = simFeedRef.current.scrollHeight; }, [simMessages.length, latestIdx]);

    const handleAgentCreated = useCallback((agent) => {
        setAgents(prev => [...prev, agent]);
        addToast({ type: 'success', icon: '◆', message: `${agent.name} joined the council`, duration: 2500 });
    }, [addToast]);

    const handleDeleteAgent = useCallback(async (agentId) => {
        try {
            await api.delete(`/api/delphi/agents/${agentId}`);
            setAgents(prev => prev.filter(a => a.id !== agentId));
            if (selectedAgent === agentId) setSelectedAgent(null);
        } catch (err) { console.error('Failed to delete:', err); }
    }, [selectedAgent]);

    // ─── SIMULATE ────────────────────────────────────────────────────
    const handleSimulate = useCallback(async () => {
        if (simulating) return;
        if (agents.length === 0) { addToast({ type: 'warning', icon: '◇', message: 'Create at least 2 people in your council first', duration: 3000 }); return; }
        if (agents.length < 2) { addToast({ type: 'warning', icon: '◇', message: `Add ${2 - agents.length} more person to your council`, duration: 3000 }); return; }
        if (!scenario.trim()) { addToast({ type: 'warning', icon: '◇', message: 'Type a scenario to simulate', duration: 3000 }); return; }

        setSimulating(true);
        setSimMessages([]); setSimInsights([]); setSimProbabilities([]); setSimTriggerMap([]); setSimId(null);
        setShowPostSim(false); setRehearsalActive(false); setDebriefActive(false);
        setLatestIdx(-1); setRightView('new');

        try {
            const res = await api.post('/api/delphi/simulate', { scenario: scenario.trim(), agentIds: agents.map(a => a.id) });
            const { rounds, insights, probabilities, triggerMap, simulationId } = res.data;
            const allMsgs = rounds.flat();

            // Build conversation history string for rehearsal
            const convoStr = allMsgs.map(m => `${m.agentName}: "${m.content}"`).join('\n');
            setConversationHistory(convoStr);
            setSimId(simulationId);

            // Stream messages at readable pace
            for (let i = 0; i < allMsgs.length; i++) {
                const isNewRound = i > 0 && allMsgs[i].round !== allMsgs[i - 1]?.round;
                await new Promise(r => setTimeout(r, isNewRound ? 2500 : 1800)); // Slower: 1.8s between messages (was 600ms)
                setSimMessages(prev => [...prev, allMsgs[i]]);
                setLatestIdx(i);
            }

            // Wait for last message typewriter to finish, then show post-sim data
            await new Promise(r => setTimeout(r, 2500));
            setSimInsights(insights || []);
            setSimProbabilities(probabilities || []);
            setSimTriggerMap(triggerMap || []);
            setShowPostSim(true);
            setLatestIdx(-1);
        } catch (err) {
            console.error('Simulation failed:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Simulation failed — check console', duration: 4000 });
        }
        setSimulating(false);
    }, [scenario, simulating, agents, addToast]);

    // ─── REPLAY ──────────────────────────────────────────────────────
    const handleReplay = useCallback((sim) => {
        setRightView('new');
        setScenario(sim.scenario || '');
        setSimMessages((sim.rounds || []).flat());
        setSimInsights(sim.insights?.insights || []);
        setSimProbabilities(sim.insights?.probabilities || []);
        setSimTriggerMap(sim.insights?.triggerMap || []);
        setSimId(sim.id);
        setShowPostSim(true); setLatestIdx(-1);
        setRehearsalActive(false); setDebriefActive(false);
        setConversationHistory((sim.rounds || []).flat().map(m => `${m.agentName}: "${m.content}"`).join('\n'));
    }, []);

    if (!isOpen) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#06080C', display: 'flex', flexDirection: 'column', fontFamily: font }}>

            {/* Top Bar */}
            <div style={{ padding: isMobile ? '10px 14px' : '12px 24px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,8,12,0.95)', backdropFilter: isTouchDevice ? 'blur(8px)' : 'blur(12px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 12px', color: 'rgba(232,244,253,0.4)', fontFamily: fontMono, fontSize: '10px', cursor: 'pointer' }}>← Back</button>
                    <div>
                        <div style={{ fontFamily: font, fontSize: isMobile ? '14px' : '16px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '-0.3px' }}>Delphi</div>
                        {!isMobile && <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.2)', letterSpacing: '1px', textTransform: 'uppercase' }}>Simulate your people before you face them</div>}
                    </div>
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.15)' }}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Mobile Panel Switcher */}
            {isMobile && (
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                    {[{ id: 'council', label: '◆ Council' }, { id: 'simulation', label: '◎ Simulation' }].map(tab => (
                        <button key={tab.id} onClick={() => setMobilePanel(tab.id)}
                            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', background: 'none', borderBottom: mobilePanel === tab.id ? '2px solid #9B7FE8' : '2px solid transparent', color: mobilePanel === tab.id ? '#9B7FE8' : 'rgba(232,244,253,0.2)', fontFamily: fontMono, fontSize: '10px', fontWeight: 600, transition: 'all 0.15s' }}>{tab.label}</button>
                    ))}
                </div>
            )}

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>

                {/* Left Panel — hidden on mobile when simulation tab is active */}
                <div style={{ width: isMobile ? '100%' : isTablet ? '320px' : '380px', flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.04)', display: isMobile && mobilePanel !== 'council' ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden', flex: isMobile ? 1 : 'none' }}>
                    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px' }}>
                        <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.15)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>Your Council</div>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ width: '20px', height: '20px', margin: '0 auto', border: '2px solid rgba(155,127,232,0.1)', borderTop: '2px solid #9B7FE8', borderRadius: '50%' }} /></div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                    {agents.map(agent => <AgentCard key={agent.id} agent={agent} isSelected={selectedAgent === agent.id} onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)} onDelete={handleDeleteAgent} />)}
                                </div>
                            </AnimatePresence>
                        )}
                        <AddAgentForm onCreated={handleAgentCreated} agentCount={agents.length} />
                        <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ fontFamily: fontMono, fontSize: '9.5px', lineHeight: '1.6', color: 'rgba(232,244,253,0.25)' }}>Each agent remembers everything you've told it. The more you describe, the more accurate over time.</div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div style={{ flex: 1, display: isMobile && mobilePanel !== 'simulation' ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                        {[{ id: 'new', label: '◆ New Simulation' }, { id: 'history', label: '◇ History' }].map(tab => (
                            <button key={tab.id} onClick={() => { setRightView(tab.id); if (tab.id === 'new') setRehearsalActive(false); }}
                                style={{ flex: 1, padding: '12px', border: 'none', cursor: 'pointer', background: 'none', borderBottom: rightView === tab.id ? '2px solid #9B7FE8' : '2px solid transparent', color: rightView === tab.id ? '#9B7FE8' : 'rgba(232,244,253,0.2)', fontFamily: fontMono, fontSize: '10px', fontWeight: 600, transition: 'all 0.15s' }}>{tab.label}</button>
                        ))}
                    </div>

                    {rightView === 'new' ? (
                        rehearsalActive ? (
                            <RehearsalMode scenario={scenario} agents={agents} conversationSoFar={conversationHistory} onExit={() => setRehearsalActive(false)} />
                        ) : (
                            <>
                                {/* Scenario Input */}
                                <div style={{ padding: '20px 24px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.15)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Drop Your Scenario</div>
                                    <div style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <textarea value={scenario} onChange={(e) => setScenario(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSimulate(); } }}
                                            placeholder='"I want to drop out of college and move to the US to pursue my startup full time..."' rows={3}
                                            style={{ width: '100%', background: 'none', border: 'none', color: '#e8f4fd', fontFamily: font, fontSize: '13px', fontStyle: 'italic', lineHeight: '1.6', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                                            <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.15)' }}>
                                                {agents.length < 2 ? `⚠ Add ${Math.max(0, 2 - agents.length)} more agent${2 - agents.length !== 1 ? 's' : ''}` : 'Enter ↵ or click to simulate'}
                                            </span>
                                            <button onClick={handleSimulate}
                                                style={{ padding: '8px 20px', borderRadius: '10px', background: simulating ? 'rgba(155,127,232,0.06)' : 'linear-gradient(135deg, rgba(155,127,232,0.15), rgba(91,164,245,0.1))', border: '1px solid rgba(155,127,232,0.25)', color: '#9B7FE8', fontFamily: fontMono, fontSize: '10px', fontWeight: 600, cursor: simulating ? 'wait' : 'pointer' }}>
                                                {simulating ? '◎ Simulating...' : '◆ Simulate'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Simulation Feed */}
                                <div ref={simFeedRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                                    {simMessages.length === 0 && !simulating && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontFamily: font, fontSize: '40px', color: 'rgba(155,127,232,0.08)', marginBottom: '12px' }}>◆</div>
                                                <div style={{ fontFamily: font, fontSize: '14px', color: 'rgba(232,244,253,0.15)', marginBottom: '6px' }}>Build your council, drop your scenario</div>
                                                <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.08)', maxWidth: '360px' }}>Watch them debate in real time — walk into the conversation already knowing how it ends</div>
                                            </div>
                                        </div>
                                    )}

                                    {simMessages.map((msg, i) => {
                                        const isNewRound = i > 0 && msg.round !== simMessages[i - 1]?.round;
                                        return (
                                            <div key={i}>
                                                {(i === 0 || isNewRound) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0 10px' }}>
                                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }} />
                                                        <span style={{ fontFamily: fontMono, fontSize: '8px', color: 'rgba(232,244,253,0.12)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                                            {msg.round === 1 ? 'Initial Reactions' : 'Cross-Discussion'}
                                                        </span>
                                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.04)' }} />
                                                    </div>
                                                )}
                                                <div style={{ marginBottom: '8px' }}><SimulationMessage msg={msg} isLatest={i === latestIdx} /></div>
                                            </div>
                                        );
                                    })}

                                    {simulating && simMessages.length === 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px 0' }}>
                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ width: '14px', height: '14px', border: '1.5px solid rgba(155,127,232,0.1)', borderTop: '1.5px solid #9B7FE8', borderRadius: '50%' }} />
                                            <span style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.2)' }}>Your council is gathering...</span>
                                        </div>
                                    )}

                                    {/* Post-Simulation: Insights + Probability + Trigger Map + Actions */}
                                    <AnimatePresence>
                                        {showPostSim && (
                                            <>
                                                {/* Insights */}
                                                {simInsights.length > 0 && (
                                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                                                        style={{ marginTop: '20px', padding: '18px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>What the simulation revealed</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {simInsights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* Outcome Probability */}
                                                <OutcomeProbability probabilities={simProbabilities} />

                                                {/* Trigger Map */}
                                                <TriggerMap triggerMap={simTriggerMap} />

                                                {/* Action Buttons: Rehearsal + Debrief */}
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                                    style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                                    <button onClick={() => setRehearsalActive(true)}
                                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(6,182,212,0.15)', color: '#06B6D4', fontFamily: fontMono, fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                                                        ↻ Enter the Conversation
                                                    </button>
                                                    <button onClick={() => setDebriefActive(!debriefActive)}
                                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: debriefActive ? 'rgba(155,127,232,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(155,127,232,0.12)', color: '#9B7FE8', fontFamily: fontMono, fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                                                        ✦ Had the Real Talk? Debrief
                                                    </button>
                                                </motion.div>

                                                {/* Debrief */}
                                                {debriefActive && simId && (
                                                    <DebriefMode simulationId={simId} onComplete={() => setDebriefActive(false)} />
                                                )}
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )
                    ) : (
                        /* History View */
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                            {loadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ width: '20px', height: '20px', margin: '0 auto', border: '2px solid rgba(155,127,232,0.1)', borderTop: '2px solid #9B7FE8', borderRadius: '50%' }} /></div>
                            ) : history.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontFamily: font, fontSize: '40px', color: 'rgba(155,127,232,0.06)', marginBottom: '12px' }}>◇</div>
                                        <div style={{ fontFamily: font, fontSize: '14px', color: 'rgba(232,244,253,0.15)', marginBottom: '6px' }}>No simulations yet</div>
                                        <div style={{ fontFamily: fontMono, fontSize: '10px', color: 'rgba(232,244,253,0.08)' }}>Run your first simulation and it will appear here</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontFamily: fontMono, fontSize: '9px', fontWeight: 600, color: 'rgba(232,244,253,0.15)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{history.length} past simulation{history.length !== 1 ? 's' : ''}</div>
                                    {history.map(sim => <HistoryItem key={sim.id} sim={sim} onReplay={handleReplay} />)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
