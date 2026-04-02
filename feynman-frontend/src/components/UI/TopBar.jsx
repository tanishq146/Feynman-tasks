import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

const sfDisplay = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const sfText = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

// Category color map
const CATEGORY_COLORS = {
    hippocampus: '#00d4ff',
    prefrontal_cortex: '#7c3aed',
    amygdala: '#ffaa00',
    cerebellum: '#00bfa6',
    wernickes_area: '#3b82f6',
    occipital_lobe: '#6366f1',
    temporal_lobe: '#10b981',
};

const CATEGORY_LABELS = {
    hippocampus: 'Memory',
    prefrontal_cortex: 'Reasoning',
    amygdala: 'Emotion',
    cerebellum: 'Motor',
    wernickes_area: 'Language',
    occipital_lobe: 'Visual',
    temporal_lobe: 'Auditory',
};

function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative;
    if (diffMins < 1) relative = 'Just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHrs < 24) relative = `${diffHrs}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return { relative, time, date };
}

export default function TopBar() {
    const nodes = useBrainStore((s) => s.nodes);
    const highlightFading = useBrainStore((s) => s.highlightFading);
    const toggleHighlightFading = useBrainStore((s) => s.toggleHighlightFading);
    const selectNode = useBrainStore((s) => s.selectNode);
    const { isMobile, isTablet, isTouchDevice } = useResponsive();

    const [isListOpen, setIsListOpen] = useState(false);
    const panelRef = useRef(null);

    const totalNodes = nodes.length;
    const fadingCount = nodes.filter(
        (n) => n.status === 'fading' || n.status === 'critical'
    ).length;

    // Sort nodes by date descending
    const sortedNodes = [...nodes].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    // Group nodes by date
    const groupedByDate = sortedNodes.reduce((groups, node) => {
        const d = new Date(node.created_at);
        const dateKey = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(node);
        return groups;
    }, {});

    // Close panel on outside click
    useEffect(() => {
        if (!isListOpen) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsListOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isListOpen]);

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '12px 14px' : isTablet ? '14px 20px' : '16px 28px',
                background: 'linear-gradient(to bottom, rgba(2, 4, 8, 0.8), transparent)',
                pointerEvents: 'none',
            }}
        >
            {/* ─── Left: Brand ──────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                    style={{
                        color: '#00d4ff',
                        fontSize: '16px',
                        filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.4))',
                    }}
                >
                    ✦
                </span>
                <span
                    style={{
                        fontFamily: sfDisplay,
                        fontSize: isMobile ? '14px' : '18px',
                        fontWeight: 700,
                        color: '#e8f4fd',
                        letterSpacing: isMobile ? '2px' : '4px',
                        textTransform: 'uppercase',
                    }}
                >
                    Feynman
                </span>
            </div>

            {/* ─── Right: Stats ─────────────────────────── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    pointerEvents: 'auto',
                    position: 'relative',
                }}
                ref={panelRef}
            >
                {/* Fading Counter */}
                {fadingCount > 0 && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleHighlightFading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            background: highlightFading
                                ? 'rgba(255, 107, 53, 0.15)'
                                : 'rgba(255, 107, 53, 0.08)',
                            border: `1px solid ${highlightFading
                                ? 'rgba(255, 107, 53, 0.4)'
                                : 'rgba(255, 107, 53, 0.2)'
                                }`,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                        }}
                    >
                        <div
                            style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#ff6b35',
                                boxShadow: '0 0 8px rgba(255, 107, 53, 0.6)',
                                animation: 'pulse-dot 2s ease-in-out infinite',
                            }}
                        />
                        <span
                            style={{
                                fontFamily: sfText,
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#ff6b35',
                                letterSpacing: '0.5px',
                            }}
                        >
                            {fadingCount} fading
                        </span>
                    </motion.button>
                )}

                {/* Total Nodes — Clickable */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsListOpen(!isListOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: isListOpen
                            ? 'rgba(0, 212, 255, 0.12)'
                            : 'rgba(0, 212, 255, 0.06)',
                        border: `1px solid ${isListOpen
                            ? 'rgba(0, 212, 255, 0.3)'
                            : 'rgba(0, 212, 255, 0.12)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                    }}
                >
                    <div
                        style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#00d4ff',
                            boxShadow: '0 0 6px rgba(0, 212, 255, 0.5)',
                        }}
                    />
                    <span
                        style={{
                            fontFamily: sfText,
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#4a9eba',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {totalNodes} {totalNodes === 1 ? 'node' : 'nodes'}
                    </span>
                    <motion.span
                        animate={{ rotate: isListOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            fontSize: '8px',
                            color: '#4a9eba',
                            marginLeft: '2px',
                        }}
                    >
                        ▼
                    </motion.span>
                </motion.button>

                {/* ─── Node List Dropdown ─────────────────── */}
                <AnimatePresence>
                    {isListOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                position: isMobile ? 'fixed' : 'absolute',
                                top: isMobile ? '56px' : '48px',
                                right: isMobile ? '8px' : 0,
                                left: isMobile ? '8px' : 'auto',
                                width: isMobile ? 'auto' : '400px',
                                maxHeight: isMobile ? '70vh' : '520px',
                                overflowY: 'auto',
                                borderRadius: '16px',
                                background: 'rgba(2, 6, 16, 0.97)',
                                backdropFilter: isMobile ? 'blur(20px)' : 'blur(40px)',
                                WebkitBackdropFilter: isMobile ? 'blur(20px)' : 'blur(40px)',
                                border: '1px solid rgba(0, 212, 255, 0.1)',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 212, 255, 0.2)',
                            }}
                            className="node-list-scrollbar"
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px 12px',
                                borderBottom: '1px solid rgba(0, 212, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                position: 'sticky',
                                top: 0,
                                background: 'rgba(2, 6, 16, 0.98)',
                                borderRadius: '16px 16px 0 0',
                                zIndex: 2,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px' }}>📚</span>
                                    <span style={{
                                        fontFamily: sfDisplay,
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#e8f4fd',
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase',
                                    }}>Knowledge Library</span>
                                </div>
                                <span style={{
                                    fontFamily: sfText,
                                    fontSize: '10px',
                                    color: 'rgba(0, 212, 255, 0.4)',
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 212, 255, 0.06)',
                                }}>
                                    {totalNodes} entries
                                </span>
                            </div>

                            {/* Empty state */}
                            {sortedNodes.length === 0 && (
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.4 }}>🧠</div>
                                    <div style={{
                                        fontFamily: sfText,
                                        fontSize: '12px',
                                        color: 'rgba(232, 244, 253, 0.3)',
                                    }}>No knowledge stored yet.</div>
                                </div>
                            )}

                            {/* Grouped by date */}
                            {Object.entries(groupedByDate).map(([dateLabel, dateNodes], groupIdx) => (
                                <div key={dateLabel}>
                                    {/* Date header */}
                                    <div style={{
                                        padding: '10px 20px 6px',
                                        fontFamily: sfText,
                                        fontSize: '9px',
                                        fontWeight: 600,
                                        color: 'rgba(0, 212, 255, 0.35)',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        position: 'sticky',
                                        top: '48px',
                                        background: 'rgba(2, 6, 16, 0.95)',
                                        zIndex: 1,
                                        borderBottom: '1px solid rgba(0, 212, 255, 0.04)',
                                    }}>
                                        {dateLabel}
                                    </div>

                                    {/* Nodes in this date group */}
                                    {dateNodes.map((node, i) => {
                                        const { time } = formatDateTime(node.created_at);
                                        const { relative } = formatDateTime(node.created_at);
                                        const regionColor = CATEGORY_COLORS[node.brain_region] || '#00d4ff';
                                        const regionLabel = CATEGORY_LABELS[node.brain_region] || node.brain_region;
                                        const strength = Math.round(node.current_strength || 100);

                                        return (
                                            <motion.div
                                                key={node.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: (groupIdx * dateNodes.length + i) * 0.02, duration: 0.25 }}
                                                onClick={() => {
                                                    selectNode(node.id);
                                                    setIsListOpen(false);
                                                }}
                                                style={{
                                                    padding: '12px 20px',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                                                    position: 'relative',
                                                }}
                                                whileHover={{
                                                    backgroundColor: 'rgba(0, 212, 255, 0.04)',
                                                }}
                                            >
                                                {/* Top row: Title + Time */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    marginBottom: '6px',
                                                }}>
                                                    <span style={{
                                                        fontFamily: sfText,
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#e8f4fd',
                                                        lineHeight: '1.4',
                                                        flex: 1,
                                                    }}>
                                                        {node.title}
                                                    </span>
                                                    <span style={{
                                                        fontFamily: sfText,
                                                        fontSize: '9px',
                                                        color: 'rgba(255, 255, 255, 0.2)',
                                                        flexShrink: 0,
                                                        marginTop: '2px',
                                                    }}>
                                                        {time}
                                                    </span>
                                                </div>

                                                {/* Summary */}
                                                {node.summary && (
                                                    <div style={{
                                                        fontFamily: sfText,
                                                        fontSize: '11px',
                                                        color: 'rgba(232, 244, 253, 0.4)',
                                                        lineHeight: '1.5',
                                                        marginBottom: '8px',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    }}>
                                                        {node.summary}
                                                    </div>
                                                )}

                                                {/* Bottom row: Category + Tags + Strength */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    flexWrap: 'wrap',
                                                }}>
                                                    {/* Brain region badge */}
                                                    <span style={{
                                                        fontFamily: sfText,
                                                        fontSize: '9px',
                                                        fontWeight: 600,
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        background: `${regionColor}10`,
                                                        border: `1px solid ${regionColor}25`,
                                                        color: regionColor,
                                                        letterSpacing: '0.3px',
                                                    }}>
                                                        {regionLabel}
                                                    </span>

                                                    {/* Topic category */}
                                                    {node.topic_category && (
                                                        <span style={{
                                                            fontFamily: sfText,
                                                            fontSize: '9px',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                                            color: 'rgba(232, 244, 253, 0.4)',
                                                        }}>
                                                            {node.topic_category}
                                                        </span>
                                                    )}

                                                    {/* Relative time */}
                                                    <span style={{
                                                        fontFamily: sfText,
                                                        fontSize: '9px',
                                                        color: 'rgba(255, 255, 255, 0.15)',
                                                        marginLeft: 'auto',
                                                    }}>
                                                        {relative}
                                                    </span>

                                                    {/* Strength bar */}
                                                    <div style={{
                                                        width: '30px',
                                                        height: '3px',
                                                        borderRadius: '2px',
                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                        overflow: 'hidden',
                                                    }}>
                                                        <div style={{
                                                            width: `${strength}%`,
                                                            height: '100%',
                                                            borderRadius: '2px',
                                                            background: strength > 70
                                                                ? '#00ff88'
                                                                : strength > 40
                                                                    ? '#ffaa00'
                                                                    : '#ff6b35',
                                                            transition: 'width 0.3s',
                                                        }} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Footer */}
                            <div style={{
                                padding: '10px 20px',
                                textAlign: 'center',
                                borderTop: '1px solid rgba(0, 212, 255, 0.04)',
                            }}>
                                <span style={{
                                    fontFamily: sfText,
                                    fontSize: '9px',
                                    color: 'rgba(255, 255, 255, 0.1)',
                                    letterSpacing: '0.5px',
                                }}>
                                    Click any entry to view details
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.8); }
                }
                .node-list-scrollbar::-webkit-scrollbar { width: 4px; }
                .node-list-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .node-list-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 212, 255, 0.12);
                    border-radius: 4px;
                }
                .node-list-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 212, 255, 0.25);
                }
            `}</style>
        </motion.div>
    );
}
