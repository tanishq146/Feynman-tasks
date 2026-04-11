import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';


const sfDisplay = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const sfText = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const SHIFT_CONFIG = {
    reinforcement: { icon: '◎', color: '#4a9eba', label: 'Reinforced' },
    refinement: { icon: '○', color: '#b794f6', label: 'Refined' },
    contradiction: { icon: '◆', color: '#ff6b6b', label: 'Contradicted' },
    evolution: { icon: '△', color: '#00d4ff', label: 'Evolved' },
};

export default function BeliefEvolutionPanel({ isOpen, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isMobile, isTouchDevice } = useResponsive();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: evo } = await api.get('/api/beliefs/evolution');
            setData(evo);
        } catch (err) {
            console.error('Belief evolution fetch error:', err);
            setError('Could not load belief data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: -380, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -380, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        position: 'fixed',
                        left: 0, top: 0, bottom: 0,
                        width: isMobile ? '100%' : '360px',
                        zIndex: 55,
                        background: 'rgba(2, 6, 16, 0.95)',
                        backdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                        WebkitBackdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                        borderRight: isMobile ? 'none' : '1px solid rgba(0, 212, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: isMobile ? 'none' : '4px 0 40px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: isMobile ? '16px 14px 12px' : '20px 20px 16px',
                        borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                <span style={{ fontSize: '16px', color: '#00d4ff', fontFamily: "'SF Mono', monospace" }}>◬</span>
                                <span style={{
                                    fontFamily: sfDisplay, fontSize: '14px', fontWeight: 700,
                                    color: '#e8f4fd', letterSpacing: '1.5px', textTransform: 'uppercase',
                                }}>Belief Evolution</span>
                            </div>
                            <motion.button
                                onClick={onClose}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Close"
                                style={{
                                    width: '28px', height: '28px', borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    color: '#4a5568', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)'; e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#4a5568'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </motion.button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {data && (
                        <div style={{
                            padding: '12px 16px',
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                            borderBottom: '1px solid rgba(0, 212, 255, 0.06)',
                        }}>
                            <StatCard label="Beliefs" value={data.total_beliefs} color="#00d4ff" />
                            <StatCard label="Shifts" value={data.total_shifts} color="#b794f6" />
                            <StatCard
                                label="Top Topic"
                                value={data.most_evolving_topic || '—'}
                                color="#00ff88"
                                isText
                            />
                        </div>
                    )}

                    {/* Timeline */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '16px',
                    }} className="belief-scrollbar">
                        {loading && (
                            <div style={{
                                display: 'flex', justifyContent: 'center', padding: '40px 0',
                            }}>
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    border: '2px solid rgba(0, 212, 255, 0.2)',
                                    borderTopColor: '#00d4ff',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: '20px', textAlign: 'center',
                                fontFamily: sfText, fontSize: '12px', color: '#ff6b6b',
                            }}>{error}</div>
                        )}

                        {data && !loading && data.recent_shifts.length === 0 && (
                            <div style={{
                                padding: '40px 20px', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5, fontFamily: "'SF Mono', monospace", color: '#4a6080' }}>◬</div>
                                <div style={{
                                    fontFamily: sfText, fontSize: '13px',
                                    color: 'rgba(232, 244, 253, 0.5)', lineHeight: '1.6',
                                }}>
                                    No belief shifts detected yet.<br />
                                    Keep adding knowledge — Feynman will track how your thinking evolves.
                                </div>
                            </div>
                        )}

                        {data && data.recent_shifts.length > 0 && (
                            <div style={{ position: 'relative' }}>
                                {/* Timeline line */}
                                <div style={{
                                    position: 'absolute',
                                    left: '11px', top: '8px', bottom: '8px',
                                    width: '1px',
                                    background: 'linear-gradient(to bottom, rgba(0, 212, 255, 0.15), transparent)',
                                }} />

                                {data.recent_shifts.map((shift, i) => {
                                    const cfg = SHIFT_CONFIG[shift.shift_type] || SHIFT_CONFIG.reinforcement;
                                    return (
                                        <motion.div
                                            key={shift.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.06, duration: 0.3 }}
                                            style={{
                                                display: 'flex', gap: '12px',
                                                marginBottom: '16px', position: 'relative',
                                            }}
                                        >
                                            {/* Timeline dot */}
                                            <div style={{
                                                width: '22px', height: '22px',
                                                borderRadius: '50%', flexShrink: 0,
                                                background: `${cfg.color}15`,
                                                border: `1px solid ${cfg.color}40`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '10px', marginTop: '2px',
                                            }}>
                                                {cfg.icon}
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {/* Type badge + time */}
                                                <div style={{
                                                    display: 'flex', alignItems: 'center',
                                                    gap: '8px', marginBottom: '6px',
                                                }}>
                                                    <span style={{
                                                        fontFamily: sfText, fontSize: '9px', fontWeight: 600,
                                                        letterSpacing: '0.5px', textTransform: 'uppercase',
                                                        color: cfg.color,
                                                        padding: '2px 6px', borderRadius: '4px',
                                                        background: `${cfg.color}10`,
                                                        border: `1px solid ${cfg.color}20`,
                                                    }}>
                                                        {cfg.label}
                                                    </span>
                                                    <span style={{
                                                        fontFamily: sfText, fontSize: '9px',
                                                        color: 'rgba(255, 255, 255, 0.2)',
                                                    }}>
                                                        {shift.topic}
                                                    </span>
                                                    <span style={{
                                                        fontFamily: sfText, fontSize: '9px',
                                                        color: 'rgba(255, 255, 255, 0.15)',
                                                        marginLeft: 'auto',
                                                    }}>
                                                        {formatDate(shift.created_at)}
                                                    </span>
                                                </div>

                                                {/* Insight */}
                                                <div style={{
                                                    fontFamily: sfText, fontSize: '12px',
                                                    color: 'rgba(232, 244, 253, 0.7)',
                                                    lineHeight: '1.5', marginBottom: '6px',
                                                }}>
                                                    {shift.insight_summary}
                                                </div>

                                                {/* Old → New beliefs */}
                                                <div style={{
                                                    padding: '8px 10px', borderRadius: '8px',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                                }}>
                                                    <div style={{
                                                        fontFamily: sfText, fontSize: '10px',
                                                        color: 'rgba(255, 255, 255, 0.3)',
                                                        marginBottom: '3px',
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                    }}>
                                                        <span style={{ color: '#ff6b6b', fontSize: '8px' }}>◉</span>
                                                        was
                                                    </div>
                                                    <div style={{
                                                        fontFamily: sfText, fontSize: '11px',
                                                        color: 'rgba(232, 244, 253, 0.4)',
                                                        marginBottom: '6px',
                                                        textDecoration: shift.shift_type === 'contradiction'
                                                            ? 'line-through' : 'none',
                                                    }}>
                                                        "{shift.old_belief}"
                                                    </div>
                                                    <div style={{
                                                        fontFamily: sfText, fontSize: '10px',
                                                        color: 'rgba(255, 255, 255, 0.3)',
                                                        marginBottom: '3px',
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                    }}>
                                                        <span style={{ color: '#00d4ff', fontSize: '8px' }}>◉</span>
                                                        now
                                                    </div>
                                                    <div style={{
                                                        fontFamily: sfText, fontSize: '11px',
                                                        color: 'rgba(232, 244, 253, 0.7)',
                                                    }}>
                                                        "{shift.new_belief}"
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '10px 16px',
                        borderTop: '1px solid rgba(0, 212, 255, 0.06)',
                        textAlign: 'center',
                    }}>
                        <span style={{
                            fontFamily: sfText, fontSize: '9px',
                            color: 'rgba(255, 255, 255, 0.12)', letterSpacing: '0.5px',
                        }}>
                            Beliefs are extracted automatically from your knowledge
                        </span>
                    </div>

                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                        .belief-scrollbar::-webkit-scrollbar { width: 4px; }
                        .belief-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .belief-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(0, 212, 255, 0.15);
                            border-radius: 4px;
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function StatCard({ label, value, color, isText = false }) {
    return (
        <div style={{
            padding: '10px 8px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            textAlign: 'center',
        }}>
            <div style={{
                fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
                fontSize: isText ? '11px' : '20px',
                fontWeight: 700,
                color,
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>{value}</div>
            <div style={{
                fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                fontSize: '8px',
                color: 'rgba(255, 255, 255, 0.25)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
            }}>{label}</div>
        </div>
    );
}
