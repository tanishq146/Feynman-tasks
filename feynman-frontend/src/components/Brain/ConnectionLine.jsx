import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import useBrainStore from '../../store/brainStore';

const ORB_RADIUS = 4.8;

function clampToOrb(v, maxR = ORB_RADIUS) {
    const len = v.length();
    if (len > maxR) {
        v.multiplyScalar(maxR / len);
    }
    return v;
}

export default function ConnectionLine({ edge }) {
    const lineRef = useRef();
    const glowRef = useRef();
    const outerGlowRef = useRef();
    const hitRef = useRef();
    const progressRef = useRef(0);
    const [hovered, setHovered] = useState(false);

    const nodes = useBrainStore((s) => s.nodes);
    const hoveredNodeId = useBrainStore((s) => s.hoveredNodeId);
    const selectedEdge = useBrainStore((s) => s.selectedEdge);
    const selectEdge = useBrainStore((s) => s.selectEdge);

    const sourceNode = nodes.find((n) => n.id === edge.source_node_id);
    const targetNode = nodes.find((n) => n.id === edge.target_node_id);

    const isConnectedToHovered =
        hoveredNodeId &&
        (edge.source_node_id === hoveredNodeId || edge.target_node_id === hoveredNodeId);

    const isSelected = selectedEdge?.id === edge.id;

    const { curve, points } = useMemo(() => {
        if (!sourceNode || !targetNode) return { curve: null, points: null };

        const src = sourceNode.coordinates || { x: 0, y: 0, z: 0 };
        const tgt = targetNode.coordinates || { x: 0, y: 0, z: 0 };

        const start = new THREE.Vector3(src.x, src.y, src.z);
        const end = new THREE.Vector3(tgt.x, tgt.y, tgt.z);

        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const separation = start.distanceTo(end);
        const pullFactor = THREE.MathUtils.clamp(0.35 + separation * 0.04, 0.3, 0.65);
        mid.multiplyScalar(1 - pullFactor);

        const tangent = new THREE.Vector3().subVectors(end, start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(tangent, up).normalize();

        if (perp.length() < 0.1) {
            perp.crossVectors(tangent, new THREE.Vector3(1, 0, 0)).normalize();
        }

        const hash = (edge.id || '').charCodeAt(0) || 0;
        const perpOffset = ((hash % 10) - 5) * 0.06;
        mid.add(perp.multiplyScalar(perpOffset));
        clampToOrb(mid);

        const cp1 = new THREE.Vector3().lerpVectors(start, mid, 0.6);
        clampToOrb(cp1);
        const cp2 = new THREE.Vector3().lerpVectors(mid, end, 0.4);
        clampToOrb(cp2);

        const bezierCurve = new THREE.CubicBezierCurve3(start, cp1, cp2, end);
        const curvePoints = bezierCurve.getPoints(48);

        for (const p of curvePoints) {
            clampToOrb(p);
        }

        return { curve: bezierCurve, points: curvePoints };
    }, [sourceNode, targetNode, edge.id]);

    // Tube geometry for click detection
    const tubeGeometry = useMemo(() => {
        if (!curve) return null;
        return new THREE.TubeGeometry(curve, 20, 0.15, 6, false);
    }, [curve]);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        selectEdge(edge);
    }, [edge, selectEdge]);

    // Animated opacities
    const coreOpacity = useRef(0);
    const glowOpacity = useRef(0);
    const outerOpacity = useRef(0);

    useFrame((_, delta) => {
        // Animate draw-in
        if (progressRef.current < 1) {
            progressRef.current = Math.min(1, progressRef.current + 0.02);
        }

        const baseStrength = (edge.connection_strength || 50) / 100;
        const t = delta * 5; // Smooth lerp factor

        // Core line opacity
        const targetCore = isSelected
            ? 0.95
            : hovered
                ? 0.8
                : isConnectedToHovered
                    ? Math.max(0.65, baseStrength * 0.9)
                    : baseStrength * 0.45 + 0.1;
        coreOpacity.current = THREE.MathUtils.lerp(coreOpacity.current, targetCore * progressRef.current, t);

        // Inner glow opacity
        const targetGlow = isSelected
            ? 0.5
            : hovered
                ? 0.35
                : isConnectedToHovered
                    ? 0.25
                    : baseStrength * 0.12 + 0.03;
        glowOpacity.current = THREE.MathUtils.lerp(glowOpacity.current, targetGlow * progressRef.current, t);

        // Outer glow opacity
        const targetOuter = isSelected
            ? 0.2
            : hovered
                ? 0.15
                : isConnectedToHovered
                    ? 0.08
                    : 0.02;
        outerOpacity.current = THREE.MathUtils.lerp(outerOpacity.current, targetOuter * progressRef.current, t);

        // Apply to materials
        if (lineRef.current) lineRef.current.material.opacity = coreOpacity.current;
        if (glowRef.current) glowRef.current.material.opacity = glowOpacity.current;
        if (outerGlowRef.current) outerGlowRef.current.material.opacity = outerOpacity.current;

        // Hit mesh glow on hover
        if (hitRef.current?.material) {
            hitRef.current.material.opacity = hovered ? 0.06 : 0;
        }
    });

    if (!points || !sourceNode || !targetNode) return null;

    // Show only drawn portion (animate in)
    const visibleCount = Math.ceil(points.length * progressRef.current);
    const visiblePoints = points.slice(0, Math.max(2, visibleCount));
    const linePoints = visiblePoints.map(p => [p.x, p.y, p.z]);

    // Connection type color palette
    const colorMap = {
        supports: '#00ff88',
        contradicts: '#ff6b35',
        extends: '#00d4ff',
        requires: '#7c3aed',
        example_of: '#ffaa00',
    };

    const lineColor = colorMap[edge.connection_type] || '#00ff88';

    return (
        <group>
            {/* Layer 1: Outer glow (widest, softest) */}
            <Line
                ref={outerGlowRef}
                points={linePoints}
                color={lineColor}
                lineWidth={6}
                transparent
                opacity={0.02}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />

            {/* Layer 2: Inner glow */}
            <Line
                ref={glowRef}
                points={linePoints}
                color={lineColor}
                lineWidth={3.5}
                transparent
                opacity={0.06}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />

            {/* Layer 3: Core line (sharpest, brightest) */}
            <Line
                ref={lineRef}
                points={linePoints}
                color={lineColor}
                lineWidth={1.8}
                transparent
                opacity={0.2}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />

            {/* Invisible clickable tube mesh for raycasting */}
            {tubeGeometry && (
                <mesh
                    ref={hitRef}
                    geometry={tubeGeometry}
                    onClick={handleClick}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        setHovered(true);
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={(e) => {
                        e.stopPropagation();
                        setHovered(false);
                        document.body.style.cursor = 'default';
                    }}
                >
                    <meshBasicMaterial
                        color={lineColor}
                        transparent
                        opacity={0}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </group>
    );
}
