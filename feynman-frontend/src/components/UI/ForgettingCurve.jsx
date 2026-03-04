import { useMemo } from 'react';
import { getForgettingCurveData } from '../../hooks/useDecayTicker';

/**
 * A mini SVG chart that renders the Ebbinghaus Forgetting Curve for a node.
 * Shows the decay trajectory from 100% → current → projected future.
 * The current position is marked with a pulsing dot.
 */
export default function ForgettingCurve({ decayRate, lastReviewedAt, currentStrength, status }) {
    const width = 320;
    const height = 100;
    const padding = { top: 8, right: 12, bottom: 20, left: 32 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const { points, currentDayIndex } = useMemo(
        () => getForgettingCurveData(decayRate, lastReviewedAt, 30, 60),
        [decayRate, lastReviewedAt]
    );

    if (!points || points.length === 0) return null;

    const totalDays = points[points.length - 1].day;

    const toX = (day) => padding.left + (day / totalDays) * chartW;
    const toY = (strength) => padding.top + ((100 - strength) / 100) * chartH;

    // Build the path
    const pastPoints = points.filter((p) => !p.isFuture);
    const futurePoints = points.filter((p) => p.isFuture);

    const buildPath = (pts) =>
        pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.day).toFixed(1)} ${toY(p.strength).toFixed(1)}`)
            .join(' ');

    const pastPath = buildPath(pastPoints);

    // Connect future from last past point
    const futurePts = pastPoints.length > 0 ? [pastPoints[pastPoints.length - 1], ...futurePoints] : futurePoints;
    const futurePath = buildPath(futurePts);

    // Area fill for past
    const pastAreaPath = pastPoints.length > 0
        ? `${pastPath} L ${toX(pastPoints[pastPoints.length - 1].day).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(pastPoints[0].day).toFixed(1)} ${toY(0).toFixed(1)} Z`
        : '';

    // Current dot position
    const currentX = toX(currentDayIndex);
    const currentY = toY(currentStrength);

    // Color based on status
    const colors = {
        healthy: { stroke: '#00d4ff', fill: 'rgba(0, 212, 255, 0.08)', dot: '#00d4ff' },
        fading: { stroke: '#ff6b35', fill: 'rgba(255, 107, 53, 0.08)', dot: '#ff6b35' },
        critical: { stroke: '#ff2d55', fill: 'rgba(255, 45, 85, 0.08)', dot: '#ff2d55' },
        forgotten: { stroke: '#444466', fill: 'rgba(68, 68, 102, 0.08)', dot: '#444466' },
    };
    const c = colors[status] || colors.healthy;

    // Threshold lines
    const thresholds = [
        { y: 70, label: 'Fading', color: 'rgba(255, 107, 53, 0.3)' },
        { y: 30, label: 'Critical', color: 'rgba(255, 45, 85, 0.3)' },
    ];

    return (
        <div style={{ width: '100%', maxWidth: `${width}px` }}>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                height={height}
                style={{ overflow: 'visible' }}
            >
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((v) => (
                    <line
                        key={v}
                        x1={padding.left}
                        y1={toY(v)}
                        x2={width - padding.right}
                        y2={toY(v)}
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="0.5"
                    />
                ))}

                {/* Y-axis labels */}
                {[0, 50, 100].map((v) => (
                    <text
                        key={v}
                        x={padding.left - 6}
                        y={toY(v) + 3}
                        fill="rgba(255, 255, 255, 0.25)"
                        fontSize="7"
                        fontFamily="'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                        textAnchor="end"
                    >
                        {v}%
                    </text>
                ))}

                {/* Threshold lines */}
                {thresholds.map((t) => (
                    <g key={t.y}>
                        <line
                            x1={padding.left}
                            y1={toY(t.y)}
                            x2={width - padding.right}
                            y2={toY(t.y)}
                            stroke={t.color}
                            strokeWidth="0.5"
                            strokeDasharray="3 3"
                        />
                        <text
                            x={width - padding.right + 2}
                            y={toY(t.y) + 3}
                            fill={t.color}
                            fontSize="6"
                            fontFamily="'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                        >
                            {t.label}
                        </text>
                    </g>
                ))}

                {/* Area under past curve */}
                {pastAreaPath && (
                    <path d={pastAreaPath} fill={c.fill} />
                )}

                {/* Past curve */}
                <path
                    d={pastPath}
                    fill="none"
                    stroke={c.stroke}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Future projection (dashed) */}
                {futurePath && (
                    <path
                        d={futurePath}
                        fill="none"
                        stroke={c.stroke}
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.4"
                        strokeLinecap="round"
                    />
                )}

                {/* Current position marker */}
                {/* Outer pulse ring */}
                <circle
                    cx={currentX}
                    cy={currentY}
                    r="5"
                    fill="none"
                    stroke={c.dot}
                    strokeWidth="0.5"
                    opacity="0.4"
                >
                    <animate
                        attributeName="r"
                        values="4;8;4"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="opacity"
                        values="0.4;0;0.4"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </circle>

                {/* Inner dot */}
                <circle
                    cx={currentX}
                    cy={currentY}
                    r="3"
                    fill={c.dot}
                    filter={`drop-shadow(0 0 3px ${c.dot})`}
                />

                {/* "now" label */}
                <text
                    x={currentX}
                    y={height - 4}
                    fill={c.dot}
                    fontSize="7"
                    fontFamily="'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                    textAnchor="middle"
                    fontWeight="600"
                >
                    now
                </text>

                {/* X-axis label */}
                <text
                    x={width - padding.right}
                    y={height - 4}
                    fill="rgba(255, 255, 255, 0.2)"
                    fontSize="7"
                    fontFamily="'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                    textAnchor="end"
                >
                    +{Math.round(30)}d
                </text>
                <text
                    x={padding.left}
                    y={height - 4}
                    fill="rgba(255, 255, 255, 0.2)"
                    fontSize="7"
                    fontFamily="'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
                    textAnchor="start"
                >
                    created
                </text>
            </svg>
        </div>
    );
}
