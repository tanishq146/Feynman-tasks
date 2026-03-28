import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useBrainStore from '../../store/brainStore';

const ORB_RADIUS = 1.8;

function clampToOrb(v) {
    if (v.length() > ORB_RADIUS) v.setLength(ORB_RADIUS * 0.85);
    return v;
}

const colorMap = {
    supports:     '#00ff88',
    contradicts:  '#ff6b35',
    extends:      '#00d4ff',
    requires:     '#7c3aed',
    example_of:   '#ffaa00',
    related:      '#00d4ff',
};

export default function ConnectionLine({ edge }) {
    const tubeRef = useRef();
    const glowRef = useRef();
    const hitRef = useRef();
    const progressRef = useRef(0);

    const nodes = useBrainStore((s) => s.nodes);
    const hoveredNodeId = useBrainStore((s) => s.hoveredNodeId);
    const selectEdge = useBrainStore((s) => s.selectEdge);
    const { raycaster, camera } = useThree();

    const sourceNode = nodes.find((n) => n.id === edge.source_node_id);
    const targetNode = nodes.find((n) => n.id === edge.target_node_id);

    const isConnectedToHovered =
        hoveredNodeId &&
        (edge.source_node_id === hoveredNodeId || edge.target_node_id === hoveredNodeId);

    const { curve, tubeGeo, glowGeo, hitGeo } = useMemo(() => {
        if (!sourceNode || !targetNode) return {};

        const src = sourceNode.coordinates || { x: 0, y: 0, z: 0 };
        const tgt = targetNode.coordinates || { x: 0, y: 0, z: 0 };

        const start = new THREE.Vector3(src.x, src.y, src.z);
        const end = new THREE.Vector3(tgt.x, tgt.y, tgt.z);
        clampToOrb(start);
        clampToOrb(end);

        // Create a smooth bezier curve that arcs inward
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const separation = start.distanceTo(end);
        const pullFactor = THREE.MathUtils.clamp(0.25 + separation * 0.03, 0.2, 0.55);
        mid.multiplyScalar(1 - pullFactor);
        clampToOrb(mid);

        const cp1 = new THREE.Vector3().lerpVectors(start, mid, 0.55);
        clampToOrb(cp1);
        const cp2 = new THREE.Vector3().lerpVectors(mid, end, 0.45);
        clampToOrb(cp2);

        const bezierCurve = new THREE.CubicBezierCurve3(start, cp1, cp2, end);

        // Create tube geometries
        const tubeGeometry = new THREE.TubeGeometry(bezierCurve, 32, 0.008, 6, false);
        const glowGeometry = new THREE.TubeGeometry(bezierCurve, 32, 0.025, 6, false);
        const hitGeometry = new THREE.TubeGeometry(bezierCurve, 16, 0.06, 4, false); // bigger for click detection

        return { curve: bezierCurve, tubeGeo: tubeGeometry, glowGeo: glowGeometry, hitGeo: hitGeometry };
    }, [sourceNode, targetNode, edge.id]);

    useFrame(({ clock }) => {
        if (progressRef.current < 1) progressRef.current = Math.min(1, progressRef.current + 0.02);
        const t = clock.getElapsedTime();
        const baseStrength = (edge.connection_strength || 50) / 100;
        const pulse = 0.06 * Math.sin(t * 1.5 + (edge.id?.charCodeAt(0) || 0) * 0.15);

        if (tubeRef.current) {
            const target = isConnectedToHovered
                ? Math.max(0.8, baseStrength) + pulse
                : baseStrength * 0.4 + 0.15 + pulse * 0.3;
            tubeRef.current.material.opacity += (target * progressRef.current - tubeRef.current.material.opacity) * 0.08;
        }
        if (glowRef.current) {
            const glowTarget = isConnectedToHovered
                ? 0.3 + pulse
                : 0.08 + pulse * 0.3;
            glowRef.current.material.opacity += (glowTarget * progressRef.current - glowRef.current.material.opacity) * 0.08;
        }
    });

    if (!tubeGeo || !glowGeo || !hitGeo) return null;

    const lineColor = colorMap[edge.connection_type] || '#00d4ff';

    const handleClick = (e) => {
        e.stopPropagation();
        selectEdge(edge);
    };

    return (
        <group>
            {/* Core thread — thin, bright */}
            <mesh ref={tubeRef} geometry={tubeGeo}>
                <meshBasicMaterial
                    color={lineColor}
                    transparent opacity={0.2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            {/* Outer glow — wider, softer */}
            <mesh ref={glowRef} geometry={glowGeo}>
                <meshBasicMaterial
                    color={lineColor}
                    transparent opacity={0.08}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            {/* Invisible hit mesh — wide tube for easy clicking */}
            <mesh
                ref={hitRef}
                geometry={hitGeo}
                onClick={handleClick}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'default'; }}
            >
                <meshBasicMaterial
                    transparent opacity={0}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}
