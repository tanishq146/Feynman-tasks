// ═══════════════════════════════════════════════════════════════════════════
// ThoughtGraph.jsx — Force-directed thinking graph (Canvas 2D)
//
// Pure Canvas 2D implementation — no WebGL, no react-force-graph dependency.
// Uses d3-force for layout simulation and native canvas for rendering.
//
// - Node size = maturity (seed → evolved)
// - Node color = domain
// - Link color = type (green for builds_on, red for contradicts, etc.)
// - Custom pulsing glow, smooth zoom/pan, and label rendering
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';

// ─── Domain Colors ────────────────────────────────────────────────────────
const DOMAIN_COLORS = {
    philosophy:    '#A78BFA',
    science:       '#34D399',
    technology:    '#3DD6F5',
    psychology:    '#F472B6',
    health:        '#10B981',
    creativity:    '#FBBF24',
    career:        '#F59E0B',
    relationships: '#EC4899',
    finance:       '#6EE7B7',
    history:       '#C4B5FD',
    mathematics:   '#60A5FA',
    language:      '#818CF8',
    art:           '#FB923C',
    music:         '#E879F9',
    general:       '#00E5A0',
};

// ─── Link Type Colors ─────────────────────────────────────────────────────
const LINK_COLORS = {
    builds_on:    '#34D399',
    contradicts:  '#EF4444',
    extends:      '#3DD6F5',
    requires:     '#FBBF24',
    exemplifies:  '#A78BFA',
    generalizes:  '#60A5FA',
    questions:    '#F472B6',
    resolves:     '#10B981',
};

// ─── Maturity → Node Size ─────────────────────────────────────────────────
const MATURITY_SIZE = {
    seed:      6,
    sprouting: 9,
    growing:   12,
    mature:    16,
    evolved:   20,
};

// ─── Simple force simulation (no d3 dependency) ──────────────────────────
function createSimulation(nodes, links, width, height) {
    // Initialize positions
    nodes.forEach((n, i) => {
        if (n.x === undefined) {
            const angle = (i / nodes.length) * Math.PI * 2;
            const r = Math.min(width, height) * 0.25;
            n.x = width / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 40;
            n.y = height / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 40;
        }
        n.vx = 0;
        n.vy = 0;
    });

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Resolve link references
    const resolvedLinks = links.map(l => ({
        ...l,
        sourceNode: nodeMap[l.source],
        targetNode: nodeMap[l.target],
    })).filter(l => l.sourceNode && l.targetNode);

    function tick() {
        const alpha = 0.3;
        const centerX = width / 2;
        const centerY = height / 2;

        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = -150 / (dist * dist) * alpha;
                const fx = dx / dist * force;
                const fy = dy / dist * force;
                a.vx -= fx; a.vy -= fy;
                b.vx += fx; b.vy += fy;
            }
        }

        // Link attraction
        for (const link of resolvedLinks) {
            const { sourceNode: a, targetNode: b } = link;
            let dx = b.x - a.x, dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 80 + (1 - (link.strength || 0.5)) * 60;
            const force = (dist - targetDist) * 0.005 * alpha;
            const fx = dx / dist * force;
            const fy = dy / dist * force;
            a.vx += fx; a.vy += fy;
            b.vx -= fx; b.vy -= fy;
        }

        // Center gravity
        for (const n of nodes) {
            n.vx += (centerX - n.x) * 0.001 * alpha;
            n.vy += (centerY - n.y) * 0.001 * alpha;
        }

        // Apply velocities with damping
        for (const n of nodes) {
            n.vx *= 0.85;
            n.vy *= 0.85;
            n.x += n.vx;
            n.y += n.vy;
        }
    }

    return { nodes, links: resolvedLinks, tick };
}


export default function ThoughtGraph({
    thoughts,
    links,
    width,
    height,
    onNodeClick,
    selectedThoughtId,
}) {
    const canvasRef = useRef(null);
    const simRef = useRef(null);
    const rafRef = useRef(null);
    const transformRef = useRef({ x: 0, y: 0, scale: 1 });
    const dragRef = useRef({ active: false, nodeId: null, lastX: 0, lastY: 0, isPan: false });
    const hoveredRef = useRef(null);
    const frameRef = useRef(0);

    // ─── Build simulation data ───────────────────────────────────────
    const simData = useMemo(() => {
        const nodes = thoughts.map(t => ({
            id: t.id,
            title: t.title || 'Untitled',
            domain: t.domain || 'general',
            maturity: t.maturity || 'seed',
            velocity_score: t.velocity_score || 0,
        }));

        const nodeIds = new Set(nodes.map(n => n.id));
        const edges = (links || [])
            .filter(l => nodeIds.has(l.source_id) && nodeIds.has(l.target_id))
            .map(l => ({
                source: l.source_id,
                target: l.target_id,
                link_type: l.link_type || 'extends',
                strength: l.strength || 0.5,
            }));

        return { nodes, links: edges };
    }, [thoughts, links]);

    // ─── Initialize simulation ───────────────────────────────────────
    useEffect(() => {
        if (!width || !height || simData.nodes.length === 0) return;

        simRef.current = createSimulation(
            simData.nodes.map(n => ({ ...n })),
            simData.links.map(l => ({ ...l })),
            width, height
        );

        // Warm up
        for (let i = 0; i < 80; i++) simRef.current.tick();

    }, [simData, width, height]);

    // ─── Coordinate transform helpers ────────────────────────────────
    const screenToWorld = useCallback((sx, sy) => {
        const t = transformRef.current;
        return {
            x: (sx - t.x) / t.scale,
            y: (sy - t.y) / t.scale,
        };
    }, []);

    const findNodeAt = useCallback((wx, wy) => {
        if (!simRef.current) return null;
        for (const n of simRef.current.nodes) {
            const size = (MATURITY_SIZE[n.maturity] || 6) + 6; // hit area padding
            const dx = n.x - wx, dy = n.y - wy;
            if (dx * dx + dy * dy < size * size) return n;
        }
        return null;
    }, []);

    // ─── Render loop ─────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width || !height) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        function render() {
            frameRef.current++;
            const t = transformRef.current;
            const sim = simRef.current;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            if (!sim || sim.nodes.length === 0) {
                rafRef.current = requestAnimationFrame(render);
                return;
            }

            // Tick simulation (gradually slow down)
            if (frameRef.current < 300) sim.tick();

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.scale(t.scale, t.scale);

            const globalScale = t.scale;

            // ── Draw links ──
            for (const link of sim.links) {
                const a = link.sourceNode, b = link.targetNode;
                if (!a || !b) continue;
                if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x) || !isFinite(b.y)) continue;

                const color = LINK_COLORS[link.link_type] || '#3DD6F5';
                const alpha = 0.12 + (link.strength || 0.5) * 0.3;
                const lw = 0.6 + (link.strength || 0.5) * 1.2;

                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = color;
                ctx.globalAlpha = alpha;
                ctx.lineWidth = lw / globalScale;

                if (link.link_type === 'contradicts') {
                    ctx.setLineDash([6 / globalScale, 4 / globalScale]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }

            // ── Draw nodes ──
            const time = Date.now() * 0.001;
            for (const node of sim.nodes) {
                // Guard against NaN positions
                if (!isFinite(node.x) || !isFinite(node.y)) continue;
                const size = MATURITY_SIZE[node.maturity] || 6;
                const color = DOMAIN_COLORS[node.domain] || DOMAIN_COLORS.general;
                const isSelected = node.id === selectedThoughtId;
                const isHovered = node.id === hoveredRef.current;

                // Breathing glow
                const breathe = Math.sin(time * 1.5 + node.x * 0.01) * 0.15 + 0.85;
                const glowR = size + (isSelected ? 14 : isHovered ? 10 : 5) * breathe;

                // Outer glow
                const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
                glow.addColorStop(0, color + (isSelected ? '50' : isHovered ? '35' : '15'));
                glow.addColorStop(1, color + '00');
                ctx.beginPath();
                ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();

                // Core circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? color : color + 'CC';
                ctx.fill();

                // Inner bright dot
                ctx.beginPath();
                ctx.arc(node.x, node.y, size * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF40';
                ctx.fill();

                // Selection ring
                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = color + '70';
                    ctx.lineWidth = 1.5 / globalScale;
                    ctx.stroke();
                }

                // Label
                const fontSize = Math.max(11 / globalScale, 3);
                if (globalScale > 0.4 || isSelected || isHovered) {
                    ctx.font = `${isSelected || isHovered ? 'bold ' : ''}${fontSize}px "SF Pro Display", -apple-system, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = isSelected ? '#E8F4FDDD' : isHovered ? '#E8F4FD99' : '#E8F4FD44';
                    ctx.fillText(node.title, node.x, node.y + size + 5 / globalScale);
                }
            }

            ctx.restore();
            rafRef.current = requestAnimationFrame(render);
        }

        rafRef.current = requestAnimationFrame(render);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [width, height, simData, selectedThoughtId]);

    // ─── Mouse interactions ──────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        function onMouseDown(e) {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const w = screenToWorld(sx, sy);
            const node = findNodeAt(w.x, w.y);

            if (node) {
                dragRef.current = { active: true, nodeId: node.id, lastX: sx, lastY: sy, isPan: false };
            } else {
                dragRef.current = { active: true, nodeId: null, lastX: sx, lastY: sy, isPan: true };
            }
        }

        function onMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            // Hover detection
            const w = screenToWorld(sx, sy);
            const hovered = findNodeAt(w.x, w.y);
            hoveredRef.current = hovered?.id || null;
            canvas.style.cursor = hovered ? 'pointer' : dragRef.current.active ? 'grabbing' : 'grab';

            if (!dragRef.current.active) return;

            const dx = sx - dragRef.current.lastX;
            const dy = sy - dragRef.current.lastY;
            dragRef.current.lastX = sx;
            dragRef.current.lastY = sy;

            if (dragRef.current.isPan) {
                transformRef.current.x += dx;
                transformRef.current.y += dy;
            } else if (dragRef.current.nodeId && simRef.current) {
                const node = simRef.current.nodes.find(n => n.id === dragRef.current.nodeId);
                if (node) {
                    node.x += dx / transformRef.current.scale;
                    node.y += dy / transformRef.current.scale;
                    node.vx = 0;
                    node.vy = 0;
                    frameRef.current = 0; // restart simulation
                }
            }
        }

        function onMouseUp(e) {
            if (dragRef.current.active && !dragRef.current.isPan && dragRef.current.nodeId) {
                const rect = canvas.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const w = screenToWorld(sx, sy);
                const node = findNodeAt(w.x, w.y);
                if (node && node.id === dragRef.current.nodeId) {
                    onNodeClick?.(node);
                }
            }
            dragRef.current = { active: false, nodeId: null, lastX: 0, lastY: 0, isPan: false };
        }

        function onWheel(e) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
            const t = transformRef.current;
            const newScale = Math.max(0.2, Math.min(6, t.scale * zoomFactor));

            // Zoom towards cursor
            t.x = sx - (sx - t.x) * (newScale / t.scale);
            t.y = sy - (sy - t.y) * (newScale / t.scale);
            t.scale = newScale;
        }

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', () => {
            dragRef.current.active = false;
            hoveredRef.current = null;
        });
        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [screenToWorld, findNodeAt, onNodeClick]);

    if (!width || !height) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: width,
                height: height,
                display: 'block',
                cursor: 'grab',
            }}
        />
    );
}
