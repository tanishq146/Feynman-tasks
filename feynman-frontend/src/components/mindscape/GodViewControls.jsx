// ═══════════════════════════════════════════════════════════════════════════
// GodViewControls.jsx — Top Toolbar for the Mindscape Graph (Phase 5)
// Filter buttons, temporal slider (now/history modes), node count badge,
// simulate trigger, history mode toggle
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const FILTERS = [
    { id: 'all', label: 'All', color: '#e8f4fd' },
    { id: 'fears', label: 'Fears', color: '#E85D4A' },
    { id: 'goals', label: 'Goals', color: '#1DB88A' },
    { id: 'desires', label: 'Desires', color: '#9B7FE8' },
    { id: 'contradictions', label: 'Contradictions', color: '#F5A623' },
    { id: 'pressure', label: 'Pressure Points', color: '#E8834A' },
];

export default function GodViewControls({
    nodes = [],
    filter,
    onFilterChange,
    timelineCutoff,
    onTimelineChange,
    onSimulateClick,
    historyMode = false,
    onHistoryModeChange,
    historySnapshots = [],
}) {
    const pressureCount = useMemo(() =>
        nodes.filter(n => (n.occurrence_count || 0) >= 3 && !n.resolved).length
    , [nodes]);

    // Timeline range from earliest node to today
    const { minDate, maxDate } = useMemo(() => {
        if (nodes.length === 0) return { minDate: null, maxDate: null };
        const dates = nodes.map(n => new Date(n.first_seen_at || n.created_at || Date.now()).getTime());
        return {
            minDate: new Date(Math.min(...dates)),
            maxDate: new Date(),
        };
    }, [nodes]);

    // History mode: get unique snapshot dates as week boundaries
    const historyWeeks = useMemo(() => {
        if (!historySnapshots || historySnapshots.length === 0) return [];
        const dateSet = new Set(historySnapshots.map(s => s.snapshot_date));
        return Array.from(dateSet).sort();
    }, [historySnapshots]);

    // Current history slider position
    const [historyIndex, setHistoryIndex] = useState(-1); // -1 = "now"

    const handleHistorySlider = useCallback((e) => {
        const idx = parseInt(e.target.value);
        setHistoryIndex(idx);

        if (idx >= historyWeeks.length || idx < 0) {
            // Reset to "now"
            onTimelineChange(null);
        } else {
            // Set the cutoff to the end of that snapshot week
            const snapDate = historyWeeks[idx];
            const weekEnd = new Date(snapDate);
            weekEnd.setDate(weekEnd.getDate() + 7);
            onTimelineChange(weekEnd.toISOString());
        }
    }, [historyWeeks, onTimelineChange]);

    // Format the history week label
    const historyLabel = useMemo(() => {
        if (historyIndex < 0 || historyIndex >= historyWeeks.length) return 'Your mind — now';
        const date = new Date(historyWeeks[historyIndex]);
        return `Your mind — week of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }, [historyIndex, historyWeeks]);

    const handleToggleHistoryMode = useCallback(() => {
        const next = !historyMode;
        onHistoryModeChange?.(next);
        if (!next) {
            setHistoryIndex(-1);
            onTimelineChange(null);
        }
    }, [historyMode, onHistoryModeChange, onTimelineChange]);

    return (
        <div style={{
            height: '44px', flexShrink: 0,
            background: 'rgba(5,5,8,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: '8px',
        }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '3px' }}>
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => onFilterChange(f.id)}
                        style={{
                            padding: '4px 10px', borderRadius: '6px', border: 'none',
                            background: filter === f.id
                                ? `${f.color}18`
                                : 'transparent',
                            color: filter === f.id ? f.color : 'rgba(232,244,253,0.3)',
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            letterSpacing: '0.3px',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)' }} />

            {/* Timeline / History slider */}
            {historyMode ? (
                /* ─── History Mode Slider ──────────────── */
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                    <span style={{
                        fontFamily: fontMono, fontSize: '9px', color: '#5BA4F5',
                        letterSpacing: '1px', textTransform: 'uppercase',
                        fontWeight: 600,
                    }}>History</span>
                    {historyWeeks.length > 0 ? (
                        <>
                            <input
                                type="range"
                                min={0}
                                max={historyWeeks.length}
                                value={historyIndex < 0 ? historyWeeks.length : historyIndex}
                                onChange={handleHistorySlider}
                                style={{
                                    width: '140px', height: '3px',
                                    accentColor: '#5BA4F5', cursor: 'pointer',
                                    opacity: 0.8,
                                }}
                            />
                            <span style={{
                                fontFamily: fontMono, fontSize: '9px',
                                color: 'rgba(232,244,253,0.4)',
                                whiteSpace: 'nowrap', maxWidth: '200px',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{historyLabel}</span>
                        </>
                    ) : (
                        <span style={{
                            fontFamily: fontMono, fontSize: '9px',
                            color: 'rgba(232,244,253,0.2)',
                        }}>No snapshots yet</span>
                    )}
                </div>
            ) : (
                /* ─── Normal Timeline Slider ──────────── */
                minDate && maxDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                        <span style={{
                            fontFamily: fontMono, fontSize: '9px', color: 'rgba(232,244,253,0.2)',
                            letterSpacing: '1px', textTransform: 'uppercase',
                        }}>Timeline</span>
                        <input
                            type="range"
                            min={minDate.getTime()}
                            max={maxDate.getTime()}
                            value={timelineCutoff ? new Date(timelineCutoff).getTime() : maxDate.getTime()}
                            onChange={(e) => onTimelineChange(new Date(parseInt(e.target.value)).toISOString())}
                            style={{
                                width: '120px', height: '3px',
                                accentColor: '#5BA4F5', cursor: 'pointer',
                                opacity: 0.6,
                            }}
                        />
                    </div>
                )
            )}

            {/* History mode toggle */}
            <button
                onClick={handleToggleHistoryMode}
                style={{
                    padding: '3px 8px', borderRadius: '5px',
                    border: `1px solid ${historyMode ? 'rgba(91,164,245,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    background: historyMode ? 'rgba(91,164,245,0.08)' : 'transparent',
                    color: historyMode ? '#5BA4F5' : 'rgba(232,244,253,0.25)',
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    letterSpacing: '0.3px',
                }}
            >
                {historyMode ? '◉ History' : '○ History'}
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Node count badge */}
            <div style={{
                fontFamily: fontMono, fontSize: '10px',
                color: 'rgba(232,244,253,0.2)', letterSpacing: '0.3px',
            }}>
                {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                {pressureCount > 0 && (
                    <span style={{ color: '#E8834A', marginLeft: '6px' }}>
                        · {pressureCount} pressure
                    </span>
                )}
            </div>

            {/* Simulate button */}
            <button
                onClick={onSimulateClick}
                style={{
                    padding: '5px 14px', borderRadius: '7px',
                    border: '1px solid rgba(155,127,232,0.2)',
                    background: 'rgba(155,127,232,0.08)',
                    color: '#9B7FE8', fontFamily: fontMono,
                    fontSize: '10px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    letterSpacing: '0.3px',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(155,127,232,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(155,127,232,0.35)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(155,127,232,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(155,127,232,0.2)';
                }}
            >
                ◉ Simulate
            </button>
        </div>
    );
}
