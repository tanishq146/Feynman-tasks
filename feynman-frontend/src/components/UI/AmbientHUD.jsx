import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

const sfDisplay = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const sfText = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

/**
 * AmbientHUD — floating stats and info overlaid on the 3D scene.
 * Shows knowledge stats, cluster overview, and health indicators.
 */
export default function AmbientHUD() {
    const nodes = useBrainStore((s) => s.nodes);
    const edges = useBrainStore((s) => s.edges);
    const clusters = useBrainStore((s) => s.clusters);

    // ─── Compute stats ────────────────────────────────────────
    const stats = useMemo(() => {
        const total = nodes.length;
        const healthy = nodes.filter((n) => n.status === 'healthy').length;
        const fading = nodes.filter((n) => n.status === 'fading').length;
        const critical = nodes.filter((n) => n.status === 'critical').length;
        const forgotten = nodes.filter((n) => n.status === 'forgotten').length;
        const avgStrength =
            total > 0
                ? Math.round(
                      nodes.reduce((sum, n) => sum + (n.current_strength || 0), 0) / total
                  )
                : 0;
        const connections = edges.length;
        const healthPct = total > 0 ? Math.round((healthy / total) * 100) : 100;

        return { total, healthy, fading, critical, forgotten, avgStrength, connections, healthPct };
    }, [nodes, edges]);

    // ─── Recent activity ──────────────────────────────────────
    const recentNodes = useMemo(() => {
        return [...nodes]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 4);
    }, [nodes]);

    const { isMobile, isTablet } = useResponsive();

    if (nodes.length === 0) return null;

    // On mobile, hide the entire HUD to keep the 3D scene clean
    if (isMobile) return null;

    return (
        <>
            {/* ─── Bottom-Left: Knowledge Stats ─────────────────── */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '24px',
                    zIndex: 15,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}
            >
                {/* Health Ring */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', width: '44px', height: '44px' }}>
                        <svg width="44" height="44" viewBox="0 0 44 44">
                            {/* Background ring */}
                            <circle
                                cx="22"
                                cy="22"
                                r="18"
                                fill="none"
                                stroke="rgba(0, 212, 255, 0.08)"
                                strokeWidth="2.5"
                            />
                            {/* Health arc */}
                            <circle
                                cx="22"
                                cy="22"
                                r="18"
                                fill="none"
                                stroke={
                                    stats.healthPct > 70
                                        ? '#00d4ff'
                                        : stats.healthPct > 40
                                        ? '#ffaa00'
                                        : '#ff6b35'
                                }
                                strokeWidth="2.5"
                                strokeDasharray={`${(stats.healthPct / 100) * 113} 113`}
                                strokeDashoffset="0"
                                strokeLinecap="round"
                                transform="rotate(-90 22 22)"
                                style={{
                                    filter: `drop-shadow(0 0 4px ${
                                        stats.healthPct > 70 ? '#00d4ff40' : '#ffaa0040'
                                    })`,
                                    transition: 'stroke-dasharray 1s ease',
                                }}
                            />
                        </svg>
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: sfDisplay,
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#e8f4fd',
                            }}
                        >
                            {stats.healthPct}%
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontFamily: sfDisplay,
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'rgba(232, 244, 253, 0.5)',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                            }}
                        >
                            Brain Health
                        </div>
                        <div
                            style={{
                                fontFamily: sfText,
                                fontSize: '9px',
                                color: 'rgba(232, 244, 253, 0.25)',
                                marginTop: '2px',
                            }}
                        >
                            {stats.avgStrength}% avg retention
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div style={{ display: 'flex', gap: '14px' }}>
                    <StatPill label="Nodes" value={stats.total} color="#00d4ff" />
                    <StatPill label="Links" value={stats.connections} color="#00ff88" />
                    <StatPill label="Topics" value={clusters.length} color="#7c3aed" />
                </div>

                {/* Warning indicators */}
                {(stats.fading > 0 || stats.critical > 0) && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255, 107, 53, 0.06)',
                            border: '1px solid rgba(255, 107, 53, 0.12)',
                        }}
                    >
                        {stats.fading > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div
                                    style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: '#ff8c00',
                                        boxShadow: '0 0 6px rgba(255, 140, 0, 0.5)',
                                    }}
                                />
                                <span
                                    style={{
                                        fontFamily: sfText,
                                        fontSize: '9px',
                                        color: '#ff8c00',
                                    }}
                                >
                                    {stats.fading} fading
                                </span>
                            </div>
                        )}
                        {stats.critical > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div
                                    style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: '#ff2d55',
                                        boxShadow: '0 0 6px rgba(255, 45, 85, 0.5)',
                                        animation: 'pulse-critical 1.5s ease-in-out infinite',
                                    }}
                                />
                                <span
                                    style={{
                                        fontFamily: sfText,
                                        fontSize: '9px',
                                        color: '#ff2d55',
                                    }}
                                >
                                    {stats.critical} critical
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* ─── Bottom-Right: Cluster Legend ──────────────────── */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '24px',
                    zIndex: 15,
                    pointerEvents: 'none',
                    maxWidth: '180px',
                }}
            >
                <div
                    style={{
                        fontFamily: sfDisplay,
                        fontSize: '9px',
                        fontWeight: 600,
                        color: 'rgba(232, 244, 253, 0.3)',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                    }}
                >
                    Topics
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {clusters.slice(0, 8).map((cluster) => (
                        <div
                            key={cluster.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <div
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: cluster.color,
                                    boxShadow: `0 0 6px ${cluster.color}50`,
                                    flexShrink: 0,
                                }}
                            />
                            <span
                                style={{
                                    fontFamily: sfText,
                                    fontSize: '9px',
                                    color: 'rgba(232, 244, 253, 0.4)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                }}
                            >
                                {cluster.label}
                            </span>
                            <span
                                style={{
                                    fontFamily: sfText,
                                    fontSize: '8px',
                                    color: 'rgba(232, 244, 253, 0.2)',
                                    flexShrink: 0,
                                }}
                            >
                                {cluster.nodeCount}
                            </span>
                        </div>
                    ))}
                    {clusters.length > 8 && (
                        <span
                            style={{
                                fontFamily: sfText,
                                fontSize: '8px',
                                color: 'rgba(232, 244, 253, 0.15)',
                            }}
                        >
                            +{clusters.length - 8} more
                        </span>
                    )}
                </div>
            </motion.div>

            {/* ─── Top-Right Corner: Recent Activity ─── hide on tablet */}
            {!isTablet && recentNodes.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.6 }}
                    style={{
                        position: 'fixed',
                        top: '60px',
                        right: '24px',
                        zIndex: 14,
                        pointerEvents: 'none',
                        maxWidth: '200px',
                    }}
                >
                    <div
                        style={{
                            fontFamily: sfDisplay,
                            fontSize: '9px',
                            fontWeight: 600,
                            color: 'rgba(232, 244, 253, 0.2)',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            marginBottom: '6px',
                        }}
                    >
                        Recent
                    </div>
                    {recentNodes.map((node, i) => (
                        <div
                            key={node.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 0',
                                opacity: 1 - i * 0.2,
                            }}
                        >
                            <div
                                style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    background:
                                        node.status === 'healthy'
                                            ? '#00d4ff'
                                            : node.status === 'fading'
                                            ? '#ff8c00'
                                            : node.status === 'critical'
                                            ? '#ff2d55'
                                            : '#556688',
                                    flexShrink: 0,
                                }}
                            />
                            <span
                                style={{
                                    fontFamily: sfText,
                                    fontSize: '9px',
                                    color: 'rgba(232, 244, 253, 0.3)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {node.title}
                            </span>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Keyframes for critical pulse */}
            <style>{`
                @keyframes pulse-critical {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.7); }
                }
            `}</style>
        </>
    );
}

/**
 * Small stat pill component
 */
function StatPill({ label, value, color }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span
                style={{
                    fontFamily: sfDisplay,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: color,
                    textShadow: `0 0 12px ${color}30`,
                }}
            >
                {value}
            </span>
            <span
                style={{
                    fontFamily: sfText,
                    fontSize: '8px',
                    color: 'rgba(232, 244, 253, 0.25)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </span>
        </div>
    );
}
