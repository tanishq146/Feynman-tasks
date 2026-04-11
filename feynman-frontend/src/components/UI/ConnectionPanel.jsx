import { useMemo } from 'react';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

// ─── Connection Type Config ─────────────────────────────────
const typeConfig = {
    supports: {
        label: 'Supports',
        icon: '◎',
        color: '#00ff88',
        bg: 'rgba(0, 255, 136, 0.08)',
        border: 'rgba(0, 255, 136, 0.2)',
        description: 'These ideas reinforce each other',
    },
    contradicts: {
        label: 'Contradicts',
        icon: '⚡',
        color: '#ff6b35',
        bg: 'rgba(255, 107, 53, 0.08)',
        border: 'rgba(255, 107, 53, 0.2)',
        description: 'These ideas create productive tension',
    },
    extends: {
        label: 'Extends',
        icon: '◬',
        color: '#00d4ff',
        bg: 'rgba(0, 212, 255, 0.08)',
        border: 'rgba(0, 212, 255, 0.2)',
        description: 'One idea builds on the other',
    },
    requires: {
        label: 'Requires',
        icon: '◇',
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.08)',
        border: 'rgba(124, 58, 237, 0.2)',
        description: 'One needs the other to make sense',
    },
    example_of: {
        label: 'Example Of',
        icon: '○',
        color: '#ffaa00',
        bg: 'rgba(255, 170, 0, 0.08)',
        border: 'rgba(255, 170, 0, 0.2)',
        description: 'A specific instance of a broader concept',
    },
};

export default function ConnectionPanel() {
    const selectedEdge = useBrainStore((s) => s.selectedEdge);
    const isOpen = useBrainStore((s) => s.isConnectionPanelOpen);
    const clearEdge = useBrainStore((s) => s.clearEdge);
    const nodes = useBrainStore((s) => s.nodes);
    const selectNode = useBrainStore((s) => s.selectNode);
    const { isMobile, isTouchDevice } = useResponsive();

    const { sourceNode, targetNode, config } = useMemo(() => {
        if (!selectedEdge) return {};
        const src = nodes.find((n) => n.id === selectedEdge.source_node_id);
        const tgt = nodes.find((n) => n.id === selectedEdge.target_node_id);
        const cfg = typeConfig[selectedEdge.connection_type] || typeConfig.supports;
        return { sourceNode: src, targetNode: tgt, config: cfg };
    }, [selectedEdge, nodes]);

    if (!isOpen || !selectedEdge || !sourceNode || !targetNode || !config) return null;

    const strength = selectedEdge.connection_strength || 50;
    const reason = selectedEdge.reason || 'These knowledge nodes share a meaningful connection that strengthens your understanding of both concepts.';

    return (
        <div
            id="connection-panel"
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 200,
                width: 'min(480px, 92vw)',
                maxHeight: '85vh',
                overflowY: 'auto',
                borderRadius: '20px',
                border: `1px solid ${config.border}`,
                background: 'rgba(2, 8, 20, 0.97)',
                backdropFilter: isTouchDevice ? 'blur(20px)' : 'blur(40px)',
                WebkitBackdropFilter: isTouchDevice ? 'blur(20px)' : 'blur(40px)',
                boxShadow: `
                    0 0 60px rgba(0, 0, 0, 0.5),
                    0 0 30px ${config.bg},
                    inset 0 1px 0 rgba(255, 255, 255, 0.04)
                `,
                animation: 'connectionPanelIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
        >
            {/* ─── Decorative top glow ─── */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
                    opacity: 0.6,
                }}
            />

            {/* ─── Header ─── */}
            <div style={{ padding: isMobile ? '20px 16px 0' : '24px 24px 0' }}>
                {/* Close button */}
                <button
                    onClick={clearEdge}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#4a9eba',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = '#e8f4fd';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.color = '#4a9eba';
                    }}
                >
                    ✕
                </button>

                {/* Connection type badge */}
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: config.bg,
                        border: `1px solid ${config.border}`,
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: config.color,
                        marginBottom: '16px',
                    }}
                >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                </div>

                <h2
                    style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#e8f4fd',
                        lineHeight: 1.4,
                        margin: '0 0 6px',
                    }}
                >
                    Neural Thread
                </h2>
                <p
                    style={{
                        fontSize: '13px',
                        color: '#4a9eba',
                        margin: 0,
                        lineHeight: 1.5,
                    }}
                >
                    {config.description}
                </p>
            </div>

            {/* ─── Visual Connection Diagram ─── */}
            <div style={{ padding: isMobile ? '16px 16px' : '20px 24px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    {/* Source Node */}
                    <NodeCard
                        node={sourceNode}
                        color={config.color}
                        onClick={() => {
                            clearEdge();
                            selectNode(sourceNode.id);
                        }}
                    />

                    {/* Connection Arrow */}
                    <div
                        style={{
                            flex: '0 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <div
                            style={{
                                width: '40px',
                                height: '2px',
                                background: `linear-gradient(90deg, ${config.color}44, ${config.color}, ${config.color}44)`,
                                borderRadius: '1px',
                                position: 'relative',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '-2px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderTop: '4px solid transparent',
                                    borderBottom: '4px solid transparent',
                                    borderLeft: `6px solid ${config.color}`,
                                }}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: '9px',
                                color: config.color,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                opacity: 0.7,
                            }}
                        >
                            {config.label}
                        </span>
                    </div>

                    {/* Target Node */}
                    <NodeCard
                        node={targetNode}
                        color={config.color}
                        onClick={() => {
                            clearEdge();
                            selectNode(targetNode.id);
                        }}
                    />
                </div>
            </div>

            {/* ─── Strength Meter ─── */}
            <div style={{ padding: isMobile ? '0 16px 16px' : '0 24px 20px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#4a9eba',
                        }}
                    >
                        Connection Strength
                    </span>
                    <span
                        style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: config.color,
                        }}
                    >
                        {strength}%
                    </span>
                </div>
                <div
                    style={{
                        height: '6px',
                        borderRadius: '3px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${strength}%`,
                            borderRadius: '3px',
                            background: `linear-gradient(90deg, ${config.color}88, ${config.color})`,
                            boxShadow: `0 0 10px ${config.color}44`,
                            transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                    />
                </div>
            </div>

            {/* ─── Reason / Explanation ─── */}
            <div style={{ padding: isMobile ? '0 16px 20px' : '0 24px 24px' }}>
                <div
                    style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        color: '#4a9eba',
                        marginBottom: '10px',
                    }}
                >
                    Why They're Connected
                </div>
                <div
                    style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '14px',
                        lineHeight: 1.7,
                        color: '#c0d8e8',
                        fontStyle: reason === selectedEdge?.reason ? 'normal' : 'italic',
                    }}
                >
                    <span
                        style={{
                            display: 'inline-block',
                            width: '3px',
                            height: '3px',
                            borderRadius: '50%',
                            background: config.color,
                            boxShadow: `0 0 6px ${config.color}`,
                            marginRight: '10px',
                            verticalAlign: 'middle',
                        }}
                    />
                    {reason}
                </div>
            </div>

            {/* ─── Keyframes ─── */}
            <style>{`
                @keyframes connectionPanelIn {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.92);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}


// ─── Mini Node Card ────────────────────────────────────────────
function NodeCard({ node, color, onClick }) {
    if (!node) return null;

    const statusColor =
        node.status === 'critical' ? '#ff2d55' :
        node.status === 'fading' ? '#ff6b35' : '#00d4ff';

    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                minWidth: 0,
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                outline: 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = `${color}33`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
        >
            {/* Category pill */}
            <div
                style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: statusColor,
                    marginBottom: '6px',
                    opacity: 0.8,
                }}
            >
                {node.topic_category || 'Unknown'}
            </div>

            {/* Title */}
            <div
                style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#e8f4fd',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                }}
            >
                {node.title}
            </div>

            {/* Summary snippet */}
            {node.summary && (
                <div
                    style={{
                        fontSize: '11px',
                        color: '#4a9eba',
                        lineHeight: 1.4,
                        marginTop: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {node.summary}
                </div>
            )}

            {/* View hint */}
            <div
                style={{
                    fontSize: '10px',
                    color: color,
                    marginTop: '8px',
                    opacity: 0.6,
                    fontWeight: 500,
                }}
            >
                Click to view →
            </div>
        </button>
    );
}
