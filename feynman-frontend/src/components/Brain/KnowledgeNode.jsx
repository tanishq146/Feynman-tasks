import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import useBrainStore from '../../store/brainStore';
import { LOBE_CONFIG } from './BrainMesh';

const ORB_RADIUS = 1.8; // Very tight — nothing leaves the brain

function getRegionColor(region) {
    if (!region) return '#00d4ff';
    for (const lobe of Object.values(LOBE_CONFIG)) {
        if (lobe.regions.includes(region)) return lobe.color;
    }
    return '#00d4ff';
}

const STATUS_CONFIG = {
    healthy:   { emissiveIntensity: 1.0, radius: 0.08 },
    fading:    { emissiveIntensity: 0.7, radius: 0.07, forceColor: '#ff8c00' },
    critical:  { emissiveIntensity: 1.5, radius: 0.065, forceColor: '#ff2d55' },
    forgotten: { emissiveIntensity: 0.3, radius: 0.05, forceColor: '#556688' },
};

export default function KnowledgeNode({ node, isNew = false }) {
    const meshRef = useRef();
    const groupRef = useRef();
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const selectNode = useBrainStore((s) => s.selectNode);
    const startDive = useBrainStore((s) => s.startDive);
    const nodes = useBrainStore((s) => s.nodes);
    const hoveredNodeId = useBrainStore((s) => s.hoveredNodeId);
    const setHoveredNodeId = useBrainStore((s) => s.setHoveredNodeId);
    const updateNode = useBrainStore((s) => s.updateNode);
    const setDraggingNode = useBrainStore((s) => s.setDraggingNode);

    const { camera, gl, raycaster, size } = useThree();

    const cfg = STATUS_CONFIG[node.status] || STATUS_CONFIG.healthy;
    const nodeColor = cfg.forceColor || getRegionColor(node.brain_region);
    const coords = node.coordinates || { x: 0, y: 0, z: 0 };
    const isActive = hovered || hoveredNodeId === node.id;

    // Clamp hard — nothing leaves the brain
    const clampedCoords = useMemo(() => {
        const v = new THREE.Vector3(coords.x, coords.y, coords.z);
        if (v.length() > ORB_RADIUS) v.setLength(ORB_RADIUS * 0.85);
        return { x: v.x, y: v.y, z: v.z };
    }, [coords.x, coords.y, coords.z]);

    const posRef = useRef(new THREE.Vector3(clampedCoords.x, clampedCoords.y, clampedCoords.z));

    const seed = useMemo(() => ({
        xP: Math.random() * Math.PI * 2,
        yP: Math.random() * Math.PI * 2,
        zP: Math.random() * Math.PI * 2,
        sp: 0.15 + Math.random() * 0.1,
        amp: 0.015 + Math.random() * 0.02,
    }), []);

    // Drag state
    const dragPlane = useRef(new THREE.Plane());
    const dragOffset = useRef(new THREE.Vector3());
    const intersection = useRef(new THREE.Vector3());
    const pointerStart = useRef({ x: 0, y: 0 });
    const didDrag = useRef(false);
    const isPointerDown = useRef(false);

    const clampToOrb = useCallback((vec) => {
        if (vec.length() > ORB_RADIUS) vec.setLength(ORB_RADIUS);
        return vec;
    }, []);

    const handlePointerDown = useCallback((e) => {
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
        pointerStart.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;
        isPointerDown.current = true;

        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        dragPlane.current.setFromNormalAndCoplanarPoint(cameraDir.negate(), posRef.current);
        raycaster.setFromCamera(
            new THREE.Vector2((e.clientX / size.width) * 2 - 1, -(e.clientY / size.height) * 2 + 1),
            camera
        );
        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
        dragOffset.current.copy(posRef.current).sub(intersection.current);
    }, [camera, raycaster, size]);

    const handlePointerMove = useCallback((e) => {
        if (!isPointerDown.current) return;
        e.stopPropagation();
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (!didDrag.current && Math.sqrt(dx * dx + dy * dy) < 5) return;

        if (!didDrag.current) {
            didDrag.current = true;
            setDragging(true);
            setDraggingNode(true);
            gl.domElement.style.cursor = 'grabbing';
        }

        raycaster.setFromCamera(
            new THREE.Vector2((e.clientX / size.width) * 2 - 1, -(e.clientY / size.height) * 2 + 1),
            camera
        );
        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
        const newPos = intersection.current.add(dragOffset.current);
        clampToOrb(newPos);
        posRef.current.copy(newPos);
        if (groupRef.current) groupRef.current.position.copy(newPos);
    }, [camera, gl, raycaster, size, clampToOrb, setDraggingNode]);

    const handlePointerUp = useCallback((e) => {
        e.stopPropagation();
        isPointerDown.current = false;

        if (didDrag.current) {
            setDragging(false);
            setDraggingNode(false);
            gl.domElement.style.cursor = 'default';
            updateNode(node.id, {
                coordinates: { x: posRef.current.x, y: posRef.current.y, z: posRef.current.z },
            });
        }
    }, [gl, node.id, updateNode, setDraggingNode]);

    // Timer-based click: delay single click so double-click can cancel it
    const clickTimer = useRef(null);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (didDrag.current) { didDrag.current = false; return; }

        // If there's already a pending click, this is the 2nd click → double-click
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            const fullNode = nodes.find(n => n.id === node.id) || node;
            startDive(fullNode);
            return;
        }

        // First click — wait 300ms to see if a second click comes
        clickTimer.current = setTimeout(() => {
            clickTimer.current = null;
            selectNode(node.id);
        }, 300);
    }, [selectNode, startDive, nodes, node]);

    // Also handle native onDoubleClick as backup
    const handleDoubleClick = useCallback((e) => {
        e.stopPropagation();
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        const fullNode = nodes.find(n => n.id === node.id) || node;
        startDive(fullNode);
    }, [startDive, nodes, node]);

    // Animation
    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.getElapsedTime();

        if (!dragging) {
            const fx = Math.sin(t * seed.sp + seed.xP) * seed.amp;
            const fy = Math.cos(t * seed.sp * 0.8 + seed.yP) * seed.amp;
            const fz = Math.sin(t * seed.sp * 0.6 + seed.zP) * seed.amp * 0.5;
            posRef.current.set(clampedCoords.x + fx, clampedCoords.y + fy, clampedCoords.z + fz);
            clampToOrb(posRef.current);
            groupRef.current.position.copy(posRef.current);
        }

        if (meshRef.current) {
            const target = isActive ? 2.0 : 1.0;
            const s = THREE.MathUtils.lerp(meshRef.current.scale.x, target, 0.1);
            meshRef.current.scale.setScalar(s);
        }
    });

    return (
        <group
            ref={groupRef}
            position={[clampedCoords.x, clampedCoords.y, clampedCoords.z]}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* Core sphere */}
            <mesh
                ref={meshRef}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setHoveredNodeId(node.id); document.body.style.cursor = 'grab'; }}
                onPointerOut={() => { setHovered(false); setHoveredNodeId(null); if (!dragging) document.body.style.cursor = 'default'; }}
            >
                <sphereGeometry args={[cfg.radius, 16, 16]} />
                <meshStandardMaterial
                    color={nodeColor}
                    emissive={nodeColor}
                    emissiveIntensity={isActive ? cfg.emissiveIntensity * 2.5 : cfg.emissiveIntensity}
                    transparent opacity={0.95}
                    roughness={0.15} metalness={0.4}
                    toneMapped={false}
                />
            </mesh>

            {/* Soft glow halo */}
            <mesh scale={isActive ? 2.5 : 1.8}>
                <sphereGeometry args={[cfg.radius, 8, 8]} />
                <meshBasicMaterial
                    color={nodeColor}
                    transparent opacity={isActive ? 0.15 : 0.06}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Tooltip */}
            {isActive && !dragging && (
                <Html center distanceFactor={12} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <div style={{
                        background: 'rgba(2, 8, 20, 0.92)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${nodeColor}44`,
                        borderRadius: '8px',
                        padding: '6px 12px',
                        whiteSpace: 'nowrap',
                        transform: 'translateY(-28px)',
                        boxShadow: `0 0 20px ${nodeColor}30`,
                    }}>
                        <div style={{
                            fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                            fontSize: '11px', fontWeight: 600, color: '#e8f4fd', marginBottom: '2px',
                        }}>
                            {node.title}
                        </div>
                        <div style={{
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '9px', color: nodeColor, letterSpacing: '0.4px',
                        }}>
                            {Math.round(node.current_strength)}% · click for details · double-click to dive · drag to move
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}
