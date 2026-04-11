// ═══════════════════════════════════════════════════════════════════════════
// MindGraph.jsx — D3 v7 Force-Directed Graph of the User's Psyche (Phase 5)
// Infinite canvas rendering mind_nodes + mind_edges with:
//   - Infinite pan & zoom (scroll / pinch / drag)
//   - Glowing orbs (SVG circles, no CSS blur)
//   - Pressure point pulse animations
//   - Contradiction edge flow animation
//   - Hover focus effect (connected highlight, others dim)
//   - Click → opens NodeSidebar
//   - Staggered entrance animation on load
//   - Phase 5: Temporal drift, trajectory arrows, fog of mind effect
//   - Zoom controls (zoom in/out, fit all, reset)
//   - Infinite dot-grid background that moves with the camera
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';

// ─── Node Type Colors ────────────────────────────────────────────────────────
const NODE_COLORS = {
    fear: '#E85D4A',
    goal: '#1DB88A',
    desire: '#9B7FE8',
    contradiction: '#F5A623',
    tension: '#E8834A',
    recurring_thought: '#5BA4F5',
    person: '#8EC9A2',
    emotion: '#D4678A',
};

function getNodeRadius(node, trajectory) {
    const base = Math.min(40, 8 + (node.occurrence_count || 1) * 2.5);
    if (!trajectory) return base;
    if (trajectory === 'growing') return base * 1.1;
    if (trajectory === 'fading') return base * 0.85;
    return base;
}

function isPressurePoint(node) {
    return (node.occurrence_count || 0) >= 3 && !node.resolved;
}

// ─── Desaturate a hex color (mix with gray) ──────────────────────────────────
function desaturateColor(hex, amount = 0.5) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const gray = 128;
    const nr = Math.round(r + (gray - r) * amount);
    const ng = Math.round(g + (gray - g) * amount);
    const nb = Math.round(b + (gray - b) * amount);
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// ─── Days since a date ───────────────────────────────────────────────────────
function daysSince(dateStr) {
    if (!dateStr) return 999;
    return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

const fontMono = "'SF Pro Text', -apple-system, sans-serif";
const font = "'SF Pro Display', -apple-system, sans-serif";

export default function MindGraph({
    nodes = [],
    edges = [],
    filter = 'all',
    timelineCutoff = null,
    onNodeClick,
    width,
    height,
    nodeTrajectories = [],
    historyMode = false,
}) {
    const svgRef = useRef(null);
    const simRef = useRef(null);
    const tooltipRef = useRef(null);
    const zoomRef = useRef(null);
    const [initialized, setInitialized] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Build trajectory map: nodeId → trajectory info
    const trajectoryMap = {};
    for (const t of nodeTrajectories) {
        trajectoryMap[t.nodeId] = t;
    }

    // Filter nodes based on type filter only (timeline handled separately)
    const getFilteredNodes = useCallback(() => {
        let filtered = [...nodes];
        if (filter !== 'all') {
            const filterMap = {
                fears: n => n.type === 'fear',
                goals: n => n.type === 'goal',
                desires: n => n.type === 'desire',
                contradictions: n => n.type === 'contradiction',
                pressure: n => isPressurePoint(n),
            };
            if (filterMap[filter]) {
                const matchFn = filterMap[filter];
                filtered = filtered.map(n => ({ ...n, _dimmed: !matchFn(n) }));
            }
        }
        return filtered;
    }, [nodes, filter]);

    // ─── Fit All: compute transform to show every node ───────────────────────
    const fitAll = useCallback(() => {
        if (!svgRef.current || !simRef.current || !zoomRef.current || !width || !height) return;
        const svg = d3.select(svgRef.current);
        const simNodes = simRef.current.nodes();
        if (simNodes.length === 0) return;

        const padding = 80;
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        for (const n of simNodes) {
            if (n.x == null || n.y == null) continue;
            const r = getNodeRadius(n, trajectoryMap[n.id]?.trajectory) || 12;
            if (n.x - r < xMin) xMin = n.x - r;
            if (n.x + r > xMax) xMax = n.x + r;
            if (n.y - r < yMin) yMin = n.y - r;
            if (n.y + r > yMax) yMax = n.y + r;
        }

        const bw = xMax - xMin;
        const bh = yMax - yMin;
        if (bw <= 0 || bh <= 0) return;

        const scale = Math.min(
            (width - padding * 2) / bw,
            (height - padding * 2) / bh,
            2 // max zoom cap
        );
        const cx = (xMin + xMax) / 2;
        const cy = (yMin + yMax) / 2;

        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-cx, -cy);

        svg.transition()
            .duration(700)
            .ease(d3.easeCubicInOut)
            .call(zoomRef.current.transform, transform);
    }, [width, height, trajectoryMap]);

    // ─── Zoom controls ───────────────────────────────────────────────────────
    const zoomIn = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.4);
    }, []);

    const zoomOut = useCallback(() => {
        if (!svgRef.current || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.4);
    }, []);

    const resetView = useCallback(() => {
        if (!svgRef.current || !zoomRef.current || !width || !height) return;
        const svg = d3.select(svgRef.current);
        const transform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1).translate(-width / 2, -height / 2);
        svg.transition().duration(500).ease(d3.easeCubicInOut).call(zoomRef.current.transform, transform);
    }, [width, height]);

    // ─── D3 Rendering ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!svgRef.current || !width || !height) return;
        if (nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const filteredNodes = getFilteredNodes();
        const nodeIds = new Set(filteredNodes.map(n => n.id));

        // Build edge data referencing node objects
        const edgeData = edges
            .filter(e => nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id))
            .map(e => ({
                ...e,
                source: e.source_node_id,
                target: e.target_node_id,
            }));

        // ─── Defs for glow + grid pattern ───────────────────
        const defs = svg.append('defs');

        // Infinite dot-grid background pattern
        const gridPattern = defs.append('pattern')
            .attr('id', 'infiniteGrid')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 40)
            .attr('height', 40);
        gridPattern.append('circle')
            .attr('cx', 20)
            .attr('cy', 20)
            .attr('r', 0.8)
            .attr('fill', 'rgba(255, 255, 255, 0.06)');

        // Animated dash for contradiction edges + pulse + strengthening ring + fog ring
        defs.append('style').text(`
            @keyframes mindPulse {
                0%, 100% { r: var(--pulse-r); opacity: 0.35; }
                50% { r: calc(var(--pulse-r) * 1.4); opacity: 0; }
            }
            .pulse-ring {
                animation: mindPulse 2.5s ease-in-out infinite;
            }
            @keyframes dashFlow {
                to { stroke-dashoffset: -20; }
            }
            .contradiction-edge {
                animation: dashFlow 2s linear infinite;
            }
            @keyframes strengthenRing {
                0% { transform: scale(1); opacity: 0.6; }
                100% { transform: scale(1.3); opacity: 0; }
            }
            .strengthen-ring {
                animation: strengthenRing 3s ease-out infinite;
                transform-origin: center;
                transform-box: fill-box;
            }
        `);

        // ─── Main container group (will be transformed by zoom) ─────
        const container = svg.append('g').attr('class', 'zoom-container');

        // ─── Infinite grid background (a huge rect with pattern) ────
        container.append('rect')
            .attr('class', 'grid-bg')
            .attr('x', -50000)
            .attr('y', -50000)
            .attr('width', 100000)
            .attr('height', 100000)
            .attr('fill', 'url(#infiniteGrid)');

        // ─── Zoom behavior ──────────────────────────────────
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.05, 8])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
                setZoomLevel(event.transform.k);
            });

        svg.call(zoomBehavior);
        zoomRef.current = zoomBehavior;

        // Set initial transform to center the graph
        const initialTransform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(1)
            .translate(-width / 2, -height / 2);
        svg.call(zoomBehavior.transform, initialTransform);

        // ─── Edge group ─────────────────────────────────────
        const edgeG = container.append('g').attr('class', 'edges');
        const edgeElements = edgeG.selectAll('line')
            .data(edgeData)
            .join('line')
            .attr('stroke', d => {
                if (d.relationship_type === 'contradiction') return '#F5A623';
                if (d.relationship_type === 'co_occurs') return '#ffffff';
                return '#ffffff';
            })
            .attr('stroke-opacity', d => {
                if (d.relationship_type === 'contradiction') return 0.6;
                if (d.relationship_type === 'co_occurs') return 0.08;
                return 0.18;
            })
            .attr('stroke-width', d => {
                if (d.relationship_type === 'contradiction') return 1.5;
                return 1;
            })
            .attr('stroke-dasharray', d =>
                d.relationship_type === 'contradiction' ? '6 4' : 'none'
            )
            .classed('contradiction-edge', d => d.relationship_type === 'contradiction')
            .classed('edge-line', true);

        // ─── Node group ─────────────────────────────────────
        const nodeG = container.append('g').attr('class', 'nodes');

        const nodeGroups = nodeG.selectAll('g')
            .data(filteredNodes, d => d.id)
            .join('g')
            .attr('class', 'node-group')
            .attr('cursor', 'pointer')
            .style('opacity', 0)
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simRef.current?.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    // Use the inverse of the zoom transform to get correct coords
                    const transform = d3.zoomTransform(svgRef.current);
                    const [mx, my] = transform.invert([event.sourceEvent.clientX - svgRef.current.getBoundingClientRect().left, event.sourceEvent.clientY - svgRef.current.getBoundingClientRect().top]);
                    d.fx = mx;
                    d.fy = my;
                })
                .on('end', (event, d) => {
                    if (!event.active) simRef.current?.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );

        // ─── Determine visual state per node based on trajectory ────
        const getNodeColor = (d) => {
            const traj = trajectoryMap[d.id];
            const baseColor = NODE_COLORS[d.type] || '#ffffff';
            if (traj?.trajectory === 'fading') return desaturateColor(baseColor, 0.5);
            if (traj?.trajectory === 'resolved' || d.resolved) return '#3a3a4a';
            return baseColor;
        };

        const getNodeOpacity = (d) => {
            if (d._dimmed) return 0.05;
            const traj = trajectoryMap[d.id];
            let opacity = 0.85;
            if (traj?.trajectory === 'growing') opacity = 1.0;
            if (traj?.trajectory === 'stable') opacity = 0.85;
            if (traj?.trajectory === 'fading') opacity = 0.45;
            if (traj?.trajectory === 'resolved' || d.resolved) opacity = 0.3;
            // Fog of mind: nodes not journaled in 30+ days
            const lastJournaled = d.last_seen_at || d.first_seen_at;
            if (lastJournaled && daysSince(lastJournaled) > 30 && !d.resolved) {
                opacity = Math.max(0.15, opacity - 0.3);
            }
            return opacity;
        };

        // Glow ring (larger, low opacity circle behind)
        nodeGroups.append('circle')
            .attr('class', 'glow-ring')
            .attr('r', d => getNodeRadius(d, trajectoryMap[d.id]?.trajectory) + 8)
            .attr('fill', d => getNodeColor(d))
            .attr('opacity', 0.08);

        // Fog ring for abandoned nodes (30+ days)
        nodeGroups.filter(d => {
            const lastJ = d.last_seen_at || d.first_seen_at;
            return lastJ && daysSince(lastJ) > 30 && !d.resolved;
        })
            .append('circle')
            .attr('class', 'fog-ring')
            .attr('r', d => getNodeRadius(d, trajectoryMap[d.id]?.trajectory) + 4)
            .attr('fill', 'none')
            .attr('stroke', '#555560')
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.3)
            .attr('stroke-dasharray', '2 2');

        // Pressure point pulse ring
        nodeGroups.filter(d => isPressurePoint(d))
            .append('circle')
            .attr('class', 'pulse-ring')
            .attr('r', d => getNodeRadius(d, trajectoryMap[d.id]?.trajectory) + 6)
            .style('--pulse-r', d => `${getNodeRadius(d, trajectoryMap[d.id]?.trajectory) + 6}px`)
            .attr('fill', 'none')
            .attr('stroke', d => getNodeColor(d))
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.35);

        // Strengthening animated ring
        nodeGroups.filter(d => trajectoryMap[d.id]?.trajectory === 'strengthening')
            .append('circle')
            .attr('class', 'strengthen-ring')
            .attr('r', d => getNodeRadius(d, 'strengthening') + 4)
            .attr('fill', 'none')
            .attr('stroke', d => NODE_COLORS[d.type] || '#ffffff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.6);

        // Main node circle
        nodeGroups.append('circle')
            .attr('class', 'node-core')
            .attr('r', d => getNodeRadius(d, trajectoryMap[d.id]?.trajectory))
            .attr('fill', d => getNodeColor(d))
            .attr('opacity', d => getNodeOpacity(d));

        // Node labels
        nodeGroups.append('text')
            .attr('dy', d => getNodeRadius(d, trajectoryMap[d.id]?.trajectory) + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff')
            .attr('font-size', '11px')
            .attr('font-family', "'SF Pro Text', -apple-system, sans-serif")
            .attr('opacity', d => {
                if (isPressurePoint(d)) return 0.7;
                if (getNodeRadius(d, trajectoryMap[d.id]?.trajectory) > 14) return 0.6;
                return 0;
            })
            .text(d => d.label.length > 24 ? d.label.slice(0, 22) + '…' : d.label);

        // Pressure point "!" indicator
        nodeGroups.filter(d => isPressurePoint(d))
            .append('text')
            .attr('dy', 4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('font-family', "'SF Pro Text', -apple-system, sans-serif")
            .text('!');

        // ─── Trajectory Arrows (Phase 5) ────────────────────
        // Growing: green ↑ at top-right
        nodeGroups.filter(d => {
            const r = getNodeRadius(d, trajectoryMap[d.id]?.trajectory);
            return trajectoryMap[d.id]?.trajectory === 'growing' && r > 12;
        })
            .append('text')
            .attr('x', d => getNodeRadius(d, 'growing'))
            .attr('y', d => -getNodeRadius(d, 'growing'))
            .attr('fill', '#1DB88A')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('font-family', "'SF Pro Text', -apple-system, sans-serif")
            .text('↑');

        // Fading: red ↓ at top-right
        nodeGroups.filter(d => {
            const r = getNodeRadius(d, trajectoryMap[d.id]?.trajectory);
            return trajectoryMap[d.id]?.trajectory === 'fading' && r > 12;
        })
            .append('text')
            .attr('x', d => getNodeRadius(d, 'fading'))
            .attr('y', d => -getNodeRadius(d, 'fading'))
            .attr('fill', '#E85D4A')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('font-family', "'SF Pro Text', -apple-system, sans-serif")
            .text('↓');

        // Resolved: white ✓ at top-right
        nodeGroups.filter(d => {
            const r = getNodeRadius(d, trajectoryMap[d.id]?.trajectory);
            return d.resolved && r > 12;
        })
            .append('text')
            .attr('x', d => getNodeRadius(d, 'resolved'))
            .attr('y', d => -getNodeRadius(d, 'resolved'))
            .attr('fill', '#ffffff')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('font-family', "'SF Pro Text', -apple-system, sans-serif")
            .attr('opacity', 0.6)
            .text('✓');

        // Hidden nodes — set initial opacity 0 (will be managed by timeline effect)
        // Don't use display:none — it breaks the D3 simulation
        nodeGroups.filter(d => d._dimmed)
            .style('opacity', 0.05);

        // ─── Staggered entrance ─────────────────────────────
        nodeGroups.each(function (d, i) {
            d3.select(this)
                .transition()
                .delay(i * 80)
                .duration(500)
                .ease(d3.easeCubicOut)
                .style('opacity', d._dimmed ? 0.05 : getNodeOpacity(d))
                .attrTween('transform', () => {
                    const interp = d3.interpolate(0.3, 1);
                    return t => `scale(${interp(t)})`;
                });
        });

        // ─── Hover: focus effect ────────────────────────────
        const connectedMap = new Map();
        for (const e of edgeData) {
            const sId = typeof e.source === 'object' ? e.source.id : e.source;
            const tId = typeof e.target === 'object' ? e.target.id : e.target;
            if (!connectedMap.has(sId)) connectedMap.set(sId, new Set());
            if (!connectedMap.has(tId)) connectedMap.set(tId, new Set());
            connectedMap.get(sId).add(tId);
            connectedMap.get(tId).add(sId);
        }

        nodeGroups
            .on('mouseenter', (event, d) => {
                const connected = connectedMap.get(d.id) || new Set();
                // Dim non-connected
                nodeGroups.transition().duration(200)
                    .style('opacity', n => {
                        if (n.id === d.id) return 1;
                        if (connected.has(n.id)) return 0.8;
                        return 0.1;
                    });
                edgeElements.transition().duration(200)
                    .attr('stroke-opacity', e => {
                        const sId = typeof e.source === 'object' ? e.source.id : e.source;
                        const tId = typeof e.target === 'object' ? e.target.id : e.target;
                        if (sId === d.id || tId === d.id) {
                            return e.relationship_type === 'contradiction' ? 0.8 : 0.4;
                        }
                        return 0.02;
                    });
                // Show label on hover for small nodes
                d3.select(event.currentTarget).select('text')
                    .transition().duration(150).attr('opacity', 0.9);
                // Tooltip
                showTooltip(event, d);
            })
            .on('mouseleave', (event, d) => {
                nodeGroups.transition().duration(300)
                    .style('opacity', n => n._dimmed ? 0.05 : getNodeOpacity(n));
                edgeElements.transition().duration(300)
                    .attr('stroke-opacity', e => {
                        if (e.relationship_type === 'contradiction') return 0.6;
                        if (e.relationship_type === 'co_occurs') return 0.08;
                        return 0.18;
                    });
                // Reset label
                d3.select(event.currentTarget).select('text')
                    .transition().duration(150)
                    .attr('opacity', (() => {
                        if (isPressurePoint(d)) return 0.7;
                        if (getNodeRadius(d, trajectoryMap[d.id]?.trajectory) > 14) return 0.6;
                        return 0;
                    })());
                hideTooltip();
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                onNodeClick?.(d);
            });

        // ─── Force Simulation (no center force — infinite canvas) ────
        // Use a gentle center gravity instead of strict forceCenter
        // so nodes spread out but don't fly to infinity
        const simulation = d3.forceSimulation(filteredNodes)
            .force('link', d3.forceLink(edgeData)
                .id(d => d.id)
                .strength(0.3)
                .distance(100)
            )
            .force('charge', d3.forceManyBody().strength(-250))
            .force('x', d3.forceX(width / 2).strength(0.015))
            .force('y', d3.forceY(height / 2).strength(0.015))
            .force('collision', d3.forceCollide().radius(d => getNodeRadius(d, trajectoryMap[d.id]?.trajectory) + 25))
            .on('tick', () => {
                edgeElements
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
            });

        simRef.current = simulation;
        setInitialized(true);

        // Auto-fit after simulation settles
        const fitTimer = setTimeout(() => {
            fitAll();
        }, 2200);

        return () => {
            simulation.stop();
            clearTimeout(fitTimer);
        };
    }, [nodes, edges, filter, width, height, onNodeClick, getFilteredNodes, nodeTrajectories]);

    // ─── Timeline Cutoff Effect (lightweight — no D3 re-render) ──────────────
    // This runs independently of the main D3 effect, just toggles opacity
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const nodeGroups = svg.selectAll('.node-group');
        const edgeElements = svg.selectAll('.edge-line');
        if (nodeGroups.empty()) return;

        if (!timelineCutoff) {
            // Show all nodes — restore their natural opacity
            nodeGroups.transition().duration(300)
                .style('opacity', function(d) {
                    if (d._dimmed) return 0.05;
                    return 1;
                })
                .style('pointer-events', 'all');
            edgeElements.transition().duration(300)
                .style('opacity', 1);
            return;
        }

        const cutoff = new Date(timelineCutoff).getTime();

        nodeGroups.each(function(d) {
            const created = new Date(d.first_seen_at || d.created_at || 0).getTime();
            const isHidden = created > cutoff;
            d3.select(this)
                .transition().duration(300)
                .style('opacity', isHidden ? 0.03 : (d._dimmed ? 0.05 : 1))
                .style('pointer-events', isHidden ? 'none' : 'all');
        });

        // Fade edges connected to hidden nodes
        edgeElements.each(function(e) {
            const sourceDate = new Date(e.source?.first_seen_at || e.source?.created_at || 0).getTime();
            const targetDate = new Date(e.target?.first_seen_at || e.target?.created_at || 0).getTime();
            const isHidden = sourceDate > cutoff || targetDate > cutoff;
            d3.select(this)
                .transition().duration(300)
                .style('opacity', isHidden ? 0.02 : 1);
        });
    }, [timelineCutoff]);

    // ─── Tooltip ─────────────────────────────────────────────────────────────
    function showTooltip(event, d) {
        const tip = tooltipRef.current;
        if (!tip) return;
        const color = NODE_COLORS[d.type] || '#fff';
        const traj = trajectoryMap[d.id];

        // Enhanced tooltip with trajectory info
        let trajectoryHtml = '';
        if (traj) {
            const trajColors = {
                growing: '#1DB88A', fading: '#E85D4A', stable: 'rgba(232,244,253,0.3)',
                strengthening: '#9B7FE8', resolved: '#3a3a4a',
            };
            const trajColor = trajColors[traj.trajectory] || 'rgba(232,244,253,0.3)';
            trajectoryHtml = `
                <div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:9px;color:${trajColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">${traj.trajectory}</div>
                    ${traj.growthDelta !== undefined ? `<div style="font-size:10px;color:rgba(232,244,253,0.4);">Δ this week: ${traj.growthDelta > 0 ? '+' : ''}${traj.growthDelta} occurrences</div>` : ''}
                    ${traj.strengthDelta !== undefined ? `<div style="font-size:10px;color:rgba(232,244,253,0.4);">Strength Δ: ${traj.strengthDelta > 0 ? '+' : ''}${traj.strengthDelta.toFixed(2)}</div>` : ''}
                </div>
            `;
        }

        const firstSeen = d.first_seen_at ? new Date(d.first_seen_at).toLocaleDateString() : '—';
        const lastSeen = d.last_seen_at ? new Date(d.last_seen_at).toLocaleDateString() : '—';

        tip.innerHTML = `
            <div style="font-weight:600;color:${color};margin-bottom:3px;">${d.label}</div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:${color};opacity:0.6;margin-bottom:6px;">${d.type.replace('_', ' ')}</div>
            <div style="font-size:10px;color:rgba(232,244,253,0.5);">Seen ${d.occurrence_count}× · Strength ${(d.strength * 100).toFixed(0)}%</div>
            <div style="font-size:9px;color:rgba(232,244,253,0.25);margin-top:2px;">First: ${firstSeen} · Last: ${lastSeen}</div>
            ${isPressurePoint(d) ? '<div style="font-size:10px;color:#F5A623;margin-top:3px;">⚠ Pressure Point</div>' : ''}
            ${d.resolved ? '<div style="font-size:10px;color:#1DB88A;margin-top:3px;">✓ Resolved</div>' : ''}
            ${trajectoryHtml}
        `;
        tip.style.opacity = 1;
        tip.style.left = `${event.clientX + 14}px`;
        tip.style.top = `${event.clientY - 10}px`;
    }

    function hideTooltip() {
        if (tooltipRef.current) tooltipRef.current.style.opacity = 0;
    }

    // ─── Empty State ─────────────────────────────────────────────────────────
    if (nodes.length === 0) {
        return (
            <div style={{
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#050508',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Ambient particle field */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.15,
                    background: 'radial-gradient(circle at 30% 40%, rgba(91,164,245,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(155,127,232,0.06) 0%, transparent 50%)',
                }} />
                <div style={{
                    fontSize: '36px', marginBottom: '16px', opacity: 0.3,
                    animation: 'mindPulseEmoji 3s ease-in-out infinite',
                }}>◉</div>
                <div style={{
                    fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                    fontSize: '16px', fontWeight: 600, color: 'rgba(232,244,253,0.3)',
                    marginBottom: '8px', letterSpacing: '-0.3px',
                }}>Your mind is a blank canvas</div>
                <div style={{
                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                    fontSize: '12px', color: 'rgba(232,244,253,0.15)',
                    maxWidth: '320px', textAlign: 'center', lineHeight: '1.6',
                }}>
                    Start journaling to see your thoughts take form. Each entry feeds the graph — fears, goals, desires, contradictions — all mapped as living nodes.
                </div>
                <style>{`
                    @keyframes mindPulseEmoji { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', background: '#050508', position: 'relative' }}>
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{
                    display: 'block',
                    cursor: 'grab',
                    // History mode sepia treatment
                    filter: historyMode ? 'sepia(0.15)' : 'none',
                    transition: 'filter 0.5s ease',
                }}
            />
            {/* Tooltip */}
            <div
                ref={tooltipRef}
                style={{
                    position: 'fixed', zIndex: 1000, pointerEvents: 'none',
                    background: 'rgba(13,15,20,0.95)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '10px 14px', maxWidth: '280px',
                    fontFamily: "'SF Pro Text', -apple-system, sans-serif", fontSize: '12px',
                    color: '#e8f4fd', opacity: 0, transition: 'opacity 0.15s',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                }}
            />

            {/* ─── Zoom Controls (bottom-right) ───────────────────── */}
            <div style={{
                position: 'absolute', bottom: '20px', right: '20px',
                display: 'flex', flexDirection: 'column', gap: '6px',
                zIndex: 20,
            }}>
                {/* Zoom In */}
                <ZoomButton onClick={zoomIn} title="Zoom in">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </ZoomButton>

                {/* Zoom Level Indicator */}
                <div style={{
                    width: '36px', height: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    color: 'rgba(232,244,253,0.3)', letterSpacing: '0.3px',
                    userSelect: 'none',
                }}>
                    {Math.round(zoomLevel * 100)}%
                </div>

                {/* Zoom Out */}
                <ZoomButton onClick={zoomOut} title="Zoom out">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </ZoomButton>

                {/* Divider */}
                <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px auto' }} />

                {/* Fit All */}
                <ZoomButton onClick={fitAll} title="Fit all nodes in view">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 5V2C1 1.5 1.5 1 2 1H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 1H12C12.5 1 13 1.5 13 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 9V12C13 12.5 12.5 13 12 13H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 13H2C1.5 13 1 12.5 1 12V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </ZoomButton>

                {/* Reset */}
                <ZoomButton onClick={resetView} title="Reset view">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
                    </svg>
                </ZoomButton>
            </div>

            {/* Legend */}
            <div style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'rgba(13,15,20,0.85)', borderRadius: '10px',
                padding: '10px 14px', border: '1px solid rgba(255,255,255,0.05)',
                zIndex: 15,
            }}>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '4px',
                    }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: color, boxShadow: `0 0 6px ${color}60`,
                        }} />
                        <span style={{
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '9px', color: 'rgba(232,244,253,0.4)',
                            letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>{type.replace('_', ' ')}</span>
                    </div>
                ))}
            </div>

            {/* Pan hint — shows briefly on first load */}
            {initialized && (
                <div style={{
                    position: 'absolute', bottom: '20px', left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: fontMono, fontSize: '10px',
                    color: 'rgba(232,244,253,0.15)',
                    letterSpacing: '0.5px',
                    animation: 'fadeOutHint 4s ease-in-out forwards',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}>
                    scroll to zoom · drag to pan
                </div>
            )}

            {/* History mode badge */}
            {historyMode && (
                <div style={{
                    position: 'absolute', top: '12px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(91,164,245,0.08)',
                    border: '1px solid rgba(91,164,245,0.15)',
                    borderRadius: '8px', padding: '4px 14px',
                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                    fontSize: '10px', color: '#5BA4F5',
                    letterSpacing: '0.5px',
                    zIndex: 15,
                }}>
                    ◎ Viewing historical state
                </div>
            )}

            <style>{`
                @keyframes fadeOutHint {
                    0% { opacity: 0; }
                    15% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}


// ─── Zoom Control Button Component ───────────────────────────────────────────
function ZoomButton({ onClick, title, children }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                background: 'rgba(13,15,20,0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(232,244,253,0.45)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
                padding: 0,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(155,127,232,0.1)';
                e.currentTarget.style.borderColor = 'rgba(155,127,232,0.25)';
                e.currentTarget.style.color = '#e8f4fd';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(13,15,20,0.85)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(232,244,253,0.45)';
            }}
        >
            {children}
        </button>
    );
}
