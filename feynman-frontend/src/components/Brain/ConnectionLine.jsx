import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useBrainStore from '../../store/brainStore';

const ORB_RADIUS = 4.8; // Keep curves inside the visible orb (shell is 5.5)

/**
 * Clamp a Vector3 so it stays within the orb radius.
 * If outside, project back onto the surface with a small inward margin.
 */
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
    const progressRef = useRef(0);

    const nodes = useBrainStore((s) => s.nodes);
    const hoveredNodeId = useBrainStore((s) => s.hoveredNodeId);

    const sourceNode = nodes.find((n) => n.id === edge.source_node_id);
    const targetNode = nodes.find((n) => n.id === edge.target_node_id);

    const isConnectedToHovered =
        hoveredNodeId &&
        (edge.source_node_id === hoveredNodeId || edge.target_node_id === hoveredNodeId);

    const points = useMemo(() => {
        if (!sourceNode || !targetNode) return null;

        const src = sourceNode.coordinates || { x: 0, y: 0, z: 0 };
        const tgt = targetNode.coordinates || { x: 0, y: 0, z: 0 };

        const start = new THREE.Vector3(src.x, src.y, src.z);
        const end = new THREE.Vector3(tgt.x, tgt.y, tgt.z);

        // ─── Build a smooth curve that stays inside the orb ─────────
        // Midpoint between the two nodes
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        // Pull midpoint toward the center of the orb (origin)
        // The further apart the nodes, the more we pull inward
        const separation = start.distanceTo(end);
        const pullFactor = THREE.MathUtils.clamp(0.35 + separation * 0.04, 0.3, 0.65);
        mid.multiplyScalar(1 - pullFactor);

        // Add a slight perpendicular offset for visual separation
        // when multiple connections are near each other
        const tangent = new THREE.Vector3().subVectors(end, start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // If tangent is nearly parallel to up, use a different reference
        if (perp.length() < 0.1) {
            perp.crossVectors(tangent, new THREE.Vector3(1, 0, 0)).normalize();
        }

        // Small perpendicular offset based on edge id hash for variety
        const hash = (edge.id || '').charCodeAt(0) || 0;
        const perpOffset = ((hash % 10) - 5) * 0.06;
        mid.add(perp.multiplyScalar(perpOffset));

        // Clamp the control point inside the orb
        clampToOrb(mid);

        // Use a cubic bezier with two control points for smoother curves
        // Control point 1: 1/3 from start, pulled toward center
        const cp1 = new THREE.Vector3().lerpVectors(start, mid, 0.6);
        clampToOrb(cp1);

        // Control point 2: 2/3 toward end, pulled toward center
        const cp2 = new THREE.Vector3().lerpVectors(mid, end, 0.4);
        clampToOrb(cp2);

        const curve = new THREE.CubicBezierCurve3(start, cp1, cp2, end);
        const curvePoints = curve.getPoints(40);

        // Final safety pass: clamp every point inside the orb
        for (const p of curvePoints) {
            clampToOrb(p);
        }

        return curvePoints;
    }, [sourceNode, targetNode, edge.id]);

    useFrame(() => {
        // Animate the line drawing in
        if (progressRef.current < 1) {
            progressRef.current = Math.min(1, progressRef.current + 0.02);
        }

        if (lineRef.current?.material) {
            const baseOpacity = (edge.connection_strength || 50) / 100;
            const targetOpacity = isConnectedToHovered
                ? Math.max(0.6, baseOpacity)
                : baseOpacity * 0.3;

            lineRef.current.material.opacity = THREE.MathUtils.lerp(
                lineRef.current.material.opacity,
                targetOpacity * progressRef.current,
                0.1
            );
        }

        if (glowRef.current?.material) {
            const targetGlow = isConnectedToHovered ? 0.12 : 0.03;
            glowRef.current.material.opacity = THREE.MathUtils.lerp(
                glowRef.current.material.opacity,
                targetGlow * progressRef.current,
                0.1
            );
        }
    });

    if (!points || !sourceNode || !targetNode) return null;

    // Show only drawn portion (animate in)
    const visibleCount = Math.ceil(points.length * progressRef.current);
    const visiblePoints = points.slice(0, Math.max(2, visibleCount));

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(visiblePoints);

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
            {/* Main line */}
            <line ref={lineRef} geometry={lineGeometry}>
                <lineBasicMaterial
                    color={lineColor}
                    transparent
                    opacity={0.2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </line>

            {/* Glow line (wider, softer) */}
            <line ref={glowRef} geometry={lineGeometry}>
                <lineBasicMaterial
                    color={lineColor}
                    transparent
                    opacity={0.03}
                    linewidth={2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </line>
        </group>
    );
}
