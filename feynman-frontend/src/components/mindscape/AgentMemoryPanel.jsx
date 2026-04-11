// ═══════════════════════════════════════════════════════════════════════════
// AgentMemoryPanel.jsx — Agent Memory Viewer (Phase 4)
// Scrollable list of all agent memories grouped by agent.
// Each memory shows: type badge, content, emotional_weight bar, date.
// Filter by agent, by memory_type. Delete button on each memory.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const AGENT_META = {
    // Core 8 (Plutchik Primary)
    sentinel:       { name: 'The Sentinel',       color: '#E85D4A', icon: '◆', emotion: 'Fear' },
    fury:           { name: 'The Fury',           color: '#FF4136', icon: '▲', emotion: 'Anger' },
    euphoric:       { name: 'The Euphoric',       color: '#FFD700', icon: '○', emotion: 'Joy' },
    mourner:        { name: 'The Mourner',        color: '#6B7B8D', icon: '◇', emotion: 'Sadness' },
    believer:       { name: 'The Believer',       color: '#2ECC71', icon: '□', emotion: 'Trust' },
    purist:         { name: 'The Purist',         color: '#8B5CF6', icon: '✦', emotion: 'Disgust' },
    oracle:         { name: 'The Oracle',         color: '#F59E0B', icon: '◎', emotion: 'Anticipation' },
    witness:        { name: 'The Witness',        color: '#FBBF24', icon: '◉', emotion: 'Surprise' },
    // Self-Conscious
    phantom:        { name: 'The Phantom',        color: '#A3A3A3', icon: '◈', emotion: 'Guilt' },
    exile:          { name: 'The Exile',          color: '#92400E', icon: '▽', emotion: 'Shame' },
    crown:          { name: 'The Crown',          color: '#D4AF37', icon: '♕', emotion: 'Pride' },
    // Social
    mirror_agent:   { name: 'The Mirror',         color: '#10B981', icon: '◆', emotion: 'Envy' },
    hollow:         { name: 'The Hollow',         color: '#6366F1', icon: '◌', emotion: 'Loneliness' },
    bridge:         { name: 'The Bridge',         color: '#14B8A6', icon: '⌒', emotion: 'Empathy' },
    garden:         { name: 'The Garden',         color: '#84CC16', icon: '✧', emotion: 'Gratitude' },
    // Anticipatory
    void:           { name: 'The Void',           color: '#EF4444', icon: '●', emotion: 'Anxiety' },
    torch:          { name: 'The Torch',          color: '#3B82F6', icon: '△', emotion: 'Hope' },
    ghost:          { name: 'The Ghost',          color: '#9CA3AF', icon: '○', emotion: 'Regret' },
    // Complex Dyads
    judge:          { name: 'The Judge',          color: '#7C3AED', icon: '⬡', emotion: 'Contempt' },
    hearth:         { name: 'The Hearth',         color: '#EC4899', icon: '◇', emotion: 'Love' },
    sublime:        { name: 'The Sublime',        color: '#818CF8', icon: '✦', emotion: 'Awe' },
    abyss:          { name: 'The Abyss',          color: '#374151', icon: '◉', emotion: 'Despair' },
    // Behavioral
    wanderer:       { name: 'The Wanderer',       color: '#06B6D4', icon: '✦', emotion: 'Curiosity' },
    anchor:         { name: 'The Anchor',         color: '#D4678A', icon: '◇', emotion: 'Nostalgia' },
    spark:          { name: 'The Spark',          color: '#F97316', icon: '▲', emotion: 'Frustration' },
    drift:          { name: 'The Drift',          color: '#78716C', icon: '◌', emotion: 'Boredom' },
};

const MEMORY_TYPE_COLORS = {
    past_debate:          { bg: 'rgba(155,127,232,0.12)', fg: '#9B7FE8', label: 'Debate' },
    user_contradiction:   { bg: 'rgba(232,93,74,0.12)',   fg: '#E85D4A', label: 'Contradiction' },
    key_insight:          { bg: 'rgba(29,184,138,0.12)',   fg: '#1DB88A', label: 'Insight' },
    unresolved_tension:   { bg: 'rgba(245,166,35,0.12)',   fg: '#F5A623', label: 'Tension' },
};

const ALL_AGENTS = Object.keys(AGENT_META);
const ALL_TYPES = Object.keys(MEMORY_TYPE_COLORS);


export default function AgentMemoryPanel({ isOpen }) {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterAgent, setFilterAgent] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [deletingId, setDeletingId] = useState(null);
    const addToast = useBrainStore(s => s.addToast);

    // ─── Fetch memories ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        fetchMemories();
    }, [isOpen]);

    const fetchMemories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/mindmirror/agent-memories');
            setMemories(res.data.memories || []);
        } catch (err) {
            console.error('Failed to fetch agent memories:', err);
        }
        setLoading(false);
    }, []);

    // ─── Delete a memory ─────────────────────────────────────────────
    const handleDelete = useCallback(async (memoryId) => {
        setDeletingId(memoryId);
        try {
            await api.delete(`/api/mindmirror/agent-memory/${memoryId}`);
            setMemories(prev => prev.filter(m => m.id !== memoryId));
            addToast({ type: 'neutral', icon: '—', message: 'Memory deleted', duration: 2000 });
        } catch (err) {
            console.error('Failed to delete memory:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Failed to delete memory', duration: 3000 });
        }
        setDeletingId(null);
    }, [addToast]);

    if (!isOpen) return null;

    // ─── Filter memories ─────────────────────────────────────────────
    const filtered = memories.filter(m => {
        if (filterAgent !== 'all' && m.agent_name !== filterAgent) return false;
        if (filterType !== 'all' && m.memory_type !== filterType) return false;
        return true;
    });

    // ─── Group by agent ──────────────────────────────────────────────
    const grouped = {};
    for (const m of filtered) {
        if (!grouped[m.agent_name]) grouped[m.agent_name] = [];
        grouped[m.agent_name].push(m);
    }

    return (
        <div style={{
            width: '380px', flexShrink: 0, height: '100%',
            background: '#0D0F14',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', flexDirection: 'column',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                flexShrink: 0,
            }}>
                <div style={{
                    fontFamily: font, fontSize: '13px', fontWeight: 700,
                    color: '#e8f4fd', letterSpacing: '-0.2px', marginBottom: '2px',
                }}>◬ Agent Memory</div>
                <div style={{
                    fontFamily: fontMono, fontSize: '9px',
                    color: 'rgba(232,244,253,0.2)', letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                }}>{memories.length} total memories · {Object.keys(grouped).length} agents</div>
            </div>

            {/* Filters */}
            <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
                {/* Agent filter */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <FilterPill
                        label="All"
                        active={filterAgent === 'all'}
                        color="#e8f4fd"
                        onClick={() => setFilterAgent('all')}
                    />
                    {ALL_AGENTS.map(key => (
                        <FilterPill
                            key={key}
                            label={AGENT_META[key].icon}
                            active={filterAgent === key}
                            color={AGENT_META[key].color}
                            onClick={() => setFilterAgent(prev => prev === key ? 'all' : key)}
                        />
                    ))}
                </div>

                {/* Type filter */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <FilterPill
                        label="All types"
                        active={filterType === 'all'}
                        color="#e8f4fd"
                        onClick={() => setFilterType('all')}
                    />
                    {ALL_TYPES.map(type => (
                        <FilterPill
                            key={type}
                            label={MEMORY_TYPE_COLORS[type].label}
                            active={filterType === type}
                            color={MEMORY_TYPE_COLORS[type].fg}
                            onClick={() => setFilterType(prev => prev === type ? 'all' : type)}
                        />
                    ))}
                </div>
            </div>

            {/* Memory List */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '12px',
                minHeight: 0,
            }}>
                {loading && (
                    <div style={{
                        textAlign: 'center', padding: '40px',
                        color: 'rgba(232,244,253,0.15)', fontFamily: fontMono, fontSize: '11px',
                    }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                            style={{
                                width: '18px', height: '18px', margin: '0 auto 10px',
                                border: '2px solid rgba(155,127,232,0.1)',
                                borderTop: '2px solid #9B7FE8', borderRadius: '50%',
                            }}
                        />
                        Loading memories...
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '40px 16px',
                        color: 'rgba(232,244,253,0.12)',
                    }}>
                        <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.4, fontFamily: "'SF Mono', monospace", color: '#4a6080' }}>◬</div>
                        <div style={{
                            fontFamily: fontMono, fontSize: '11px', lineHeight: '1.6',
                        }}>
                            {memories.length === 0
                                ? 'No memories yet. Run a simulation to create agent memories.'
                                : 'No memories match this filter.'
                            }
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {Object.entries(grouped).map(([agentKey, agentMems]) => {
                        const meta = AGENT_META[agentKey] || { name: agentKey, color: '#888', icon: '?' };

                        return (
                            <motion.div
                                key={agentKey}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ marginBottom: '16px' }}
                            >
                                {/* Agent header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    marginBottom: '8px', paddingLeft: '4px',
                                }}>
                                    <span style={{ fontSize: '11px' }}>{meta.icon}</span>
                                    <span style={{
                                        fontFamily: font, fontSize: '11px', fontWeight: 700,
                                        color: meta.color,
                                    }}>{meta.name}</span>
                                    <span style={{
                                        fontFamily: fontMono, fontSize: '9px',
                                        color: 'rgba(232,244,253,0.2)',
                                    }}>· {agentMems.length} memories</span>
                                </div>

                                {/* Memories */}
                                {agentMems.map(mem => {
                                    const typeInfo = MEMORY_TYPE_COLORS[mem.memory_type] || MEMORY_TYPE_COLORS.key_insight;
                                    const date = new Date(mem.created_at);
                                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    const weight = mem.emotional_weight || 0;

                                    return (
                                        <motion.div
                                            key={mem.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                background: '#141720',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                marginBottom: '5px',
                                                borderLeft: `2px solid ${meta.color}30`,
                                                position: 'relative',
                                            }}
                                        >
                                            {/* Top row: type badge + date + delete */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center',
                                                gap: '6px', marginBottom: '6px',
                                            }}>
                                                <span style={{
                                                    fontFamily: fontMono, fontSize: '8px',
                                                    fontWeight: 600, letterSpacing: '0.3px',
                                                    padding: '2px 6px', borderRadius: '4px',
                                                    background: typeInfo.bg, color: typeInfo.fg,
                                                    textTransform: 'uppercase',
                                                }}>{typeInfo.label}</span>
                                                <span style={{
                                                    fontFamily: fontMono, fontSize: '8px',
                                                    color: 'rgba(232,244,253,0.2)', flex: 1,
                                                }}>{dateStr}</span>
                                                <button
                                                    onClick={() => handleDelete(mem.id)}
                                                    disabled={deletingId === mem.id}
                                                    style={{
                                                        background: 'none', border: 'none',
                                                        color: 'rgba(232,244,253,0.15)',
                                                        fontFamily: fontMono, fontSize: '10px',
                                                        cursor: 'pointer', padding: '2px 4px',
                                                        borderRadius: '3px',
                                                        transition: 'color 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#E85D4A'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,244,253,0.15)'}
                                                >
                                                    {deletingId === mem.id ? '...' : '×'}
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '11px',
                                                lineHeight: '1.55', color: 'rgba(232,244,253,0.6)',
                                                marginBottom: '8px',
                                            }}>{mem.content}</div>

                                            {/* Emotional weight bar */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                            }}>
                                                <span style={{
                                                    fontFamily: fontMono, fontSize: '8px',
                                                    color: 'rgba(232,244,253,0.15)',
                                                    minWidth: '52px',
                                                }}>weight {(weight * 100).toFixed(0)}%</span>
                                                <div style={{
                                                    flex: 1, height: '2px', borderRadius: '1px',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${weight * 100}%`,
                                                        height: '100%', borderRadius: '1px',
                                                        background: `linear-gradient(90deg, ${meta.color}60, ${meta.color})`,
                                                        transition: 'width 0.4s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}


// ─── Filter Pill Component ───────────────────────────────────────────────────
function FilterPill({ label, active, color, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? `${color}15` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? `${color}30` : 'rgba(255,255,255,0.04)'}`,
                color: active ? color : 'rgba(232,244,253,0.25)',
                fontFamily: fontMono, fontSize: '9px', fontWeight: active ? 600 : 400,
                padding: '3px 8px', borderRadius: '6px',
                cursor: 'pointer', transition: 'all 0.15s',
            }}
        >{label}</button>
    );
}
