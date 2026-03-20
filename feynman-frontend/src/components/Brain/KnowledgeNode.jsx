import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import useBrainStore from '../../store/brainStore';

const ORB_RADIUS = 4.5; // Must stay inside the orb

const STATUS_CONFIG = {
    healthy: {
        color: '#00d4ff',       // Cyan glow
        emissive: '#00d4ff',
        emissiveIntensity: 1.2,
        radius: 0.18,
        lightIntensity: 1.5,
        lightDistance: 3.5,
        glowLayers: 3,
    },
    fading: {
        color: '#ff8c00',       // Warm orange
        emissive: '#ff8c00',
        emissiveIntensity: 0.9,
        radius: 0.14,
        lightIntensity: 1.0,
        lightDistance: 3,
        glowLayers: 2,
    },
    critical: {
        color: '#ff2d55',
        emissive: '#ff2d55',
        emissiveIntensity: 1.5,
        radius: 0.12,
        lightIntensity: 1.2,
        lightDistance: 2.5,
        glowLayers: 3,
    },
    forgotten: {
        color: '#556688',
        emissive: '#334466',
        emissiveIntensity: 0.3,
        radius: 0.10,
        lightIntensity: 0.4,
        lightDistance: 1.5,
        glowLayers: 1,
    },
};

export default function KnowledgeNode({ node, isNew = false }) {
    const meshRef = useRef();
    const groupRef = useRef();
    const lightRef = useRef();
    const glowRefs = useRef([]);
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const selectNode = useBrainStore((s) => s.selectNode);
    const hoveredNodeId = useBrainStore((s) => s.hoveredNodeId);
    const setHoveredNodeId = useBrainStore((s) => s.setHoveredNodeId);
    const highlightFading = useBrainStore((s) => s.highlightFading);
    const updateNode = useBrainStore((s) => s.updateNode);
    const setDraggingNode = useBrainStore((s) => s.setDraggingNode);
    const startDive = useBrainStore((s) => s.startDive);

    const { camera, gl, raycaster, size } = useThree();

    const config = STATUS_CONFIG[node.status] || STATUS_CONFIG.healthy;
    const coords = node.coordinates || { x: 0, y: 0, z: 0 };

    const isHighlighted = highlightFading && (node.status === 'fading' || node.status === 'critical');
    const isExternalHover = hoveredNodeId === node.id;
    const isActive = hovered || isExternalHover;

    // Current position (mutable for drag + float)
    const posRef = useRef(new THREE.Vector3(coords.x, coords.y, coords.z));

    // Unique seed for floating animation so each node moves differently
    const seed = useMemo(() => ({
        xPhase: Math.random() * Math.PI * 2,
        yPhase: Math.random() * Math.PI * 2,
        zPhase: Math.random() * Math.PI * 2,
        xSpeed: 0.08 + Math.random() * 0.06,
        ySpeed: 0.06 + Math.random() * 0.05,
        zSpeed: 0.07 + Math.random() * 0.05,
        xAmp: 0.02 + Math.random() * 0.03,
        yAmp: 0.02 + Math.random() * 0.03,
        zAmp: 0.015 + Math.random() * 0.025,
    }), []);

    // Drag offset reference
    const dragPlane = useRef(new THREE.Plane());
    const dragOffset = useRef(new THREE.Vector3());
    const intersection = useRef(new THREE.Vector3());

    // Spawn animation
    const spawnRef = useRef({ scale: isNew ? 0 : 1, done: !isNew });

    // Track pointer start for click vs drag detection
    const pointerStart = useRef({ x: 0, y: 0 });
    const didDrag = useRef(false);
    const isPointerDown = useRef(false);
    const DRAG_THRESHOLD = 5; // pixels before drag activates

    // Double-click tracking
    const lastClickTime = useRef(0);
    const clickTimer = useRef(null);
    const DOUBLE_CLICK_DELAY = 300; // ms

    // Clamp position to inside the orb
    const clampToOrb = useCallback((vec) => {
        const dist = vec.length();
        if (dist > ORB_RADIUS) {
            vec.multiplyScalar(ORB_RADIUS / dist);
        }
        return vec;
    }, []);

    // ─── Glow layer configs ────────────────────────────────────
    const glowLayers = useMemo(() => {
        const layers = [];
        for (let i = 0; i < config.glowLayers; i++) {
            layers.push({
                scale: 1.6 + i * 0.8,
                opacity: 0.12 - i * 0.03,
            });
        }
        return layers;
    }, [config.glowLayers]);

    // ─── Drag handlers ──────────────────────────────────────
    const handlePointerDown = useCallback((e) => {
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);

        // Record start position — don't start dragging yet
        pointerStart.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;
        isPointerDown.current = true;

        // Pre-compute drag plane and offset
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        dragPlane.current.setFromNormalAndCoplanarPoint(
            cameraDir.negate(),
            posRef.current
        );

        raycaster.setFromCamera(
            new THREE.Vector2(
                (e.clientX / size.width) * 2 - 1,
                -(e.clientY / size.height) * 2 + 1
            ),
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
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only activate drag after exceeding threshold
        if (!dragging && dist > DRAG_THRESHOLD) {
            setDragging(true);
            setDraggingNode(true);
            didDrag.current = true;
            gl.domElement.style.cursor = 'grabbing';
        }

        if (!dragging && dist <= DRAG_THRESHOLD) return;

        raycaster.setFromCamera(
            new THREE.Vector2(
                (e.clientX / size.width) * 2 - 1,
                -(e.clientY / size.height) * 2 + 1
            ),
            camera
        );

        if (raycaster.ray.intersectPlane(dragPlane.current, intersection.current)) {
            const newPos = intersection.current.add(dragOffset.current);
            clampToOrb(newPos);
            posRef.current.copy(newPos);

            if (groupRef.current) {
                groupRef.current.position.copy(newPos);
            }
        }
    }, [dragging, camera, gl, raycaster, size, clampToOrb, setDraggingNode]);

    const handlePointerUp = useCallback((e) => {
        e.stopPropagation();
        const wasDragging = didDrag.current;
        isPointerDown.current = false;

        if (dragging) {
            setDragging(false);
            setDraggingNode(false);
            gl.domElement.style.cursor = 'default';

            // Save new coordinates to store
            updateNode(node.id, {
                coordinates: {
                    x: posRef.current.x,
                    y: posRef.current.y,
                    z: posRef.current.z,
                },
            });
        }

        // If pointer didn't move much, treat as a click
        if (!wasDragging) {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTime.current;

            if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
                // Double-click → dive into node
                clearTimeout(clickTimer.current);
                lastClickTime.current = 0;
                startDive(node);
            } else {
                // Single click → open panel (delayed to check for double)
                lastClickTime.current = now;
                clickTimer.current = setTimeout(() => {
                    selectNode(node.id);
                }, DOUBLE_CLICK_DELAY);
            }
        }
    }, [dragging, gl, node, updateNode, selectNode, setDraggingNode, startDive]);

    const handlePointerOver = (e) => {
        e.stopPropagation();
        setHovered(true);
        setHoveredNodeId(node.id);
        document.body.style.cursor = dragging ? 'grabbing' : 'grab';
    };

    const handlePointerOut = () => {
        setHovered(false);
        setHoveredNodeId(null);
        if (!dragging) {
            document.body.style.cursor = 'default';
        }
    };

    // ─── Animation frame ────────────────────────────────────
    useFrame(({ clock }) => {
        if (!meshRef.current || !groupRef.current) return;
        const t = clock.getElapsedTime();

        // Spawn animation
        if (!spawnRef.current.done) {
            spawnRef.current.scale = Math.min(1, spawnRef.current.scale + 0.04);
            if (spawnRef.current.scale >= 1) spawnRef.current.done = true;
        }

        // Hover scale
        const targetScale = isActive ? 1.6 : 1.0;
        const currentScale = meshRef.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale * spawnRef.current.scale, 0.1);
        meshRef.current.scale.setScalar(newScale);

        // Critical / highlighted pulsing
        if (node.status === 'critical' || isHighlighted) {
            const pulse = 1 + Math.sin(t * 4) * 0.15;
            meshRef.current.scale.multiplyScalar(pulse);
        }

        // Animate glow layers
        glowRefs.current.forEach((ref, i) => {
            if (ref) {
                const glowPulse = 1 + Math.sin(t * 2 + i * 0.5) * 0.15;
                const baseScale = glowLayers[i].scale * (isActive ? 1.4 : 1.0);
                ref.scale.setScalar(baseScale * glowPulse * spawnRef.current.scale);
            }
        });

        // ─── Slow aesthetic floating (only when NOT dragging) ────
        if (!dragging) {
            const floatX = Math.sin(t * seed.xSpeed + seed.xPhase) * seed.xAmp;
            const floatY = Math.cos(t * seed.ySpeed + seed.yPhase) * seed.yAmp;
            const floatZ = Math.sin(t * seed.zSpeed + seed.zPhase) * seed.zAmp;

            posRef.current.x = coords.x + floatX;
            posRef.current.y = coords.y + floatY;
            posRef.current.z = coords.z + floatZ;

            // Ensure floating doesn't push outside orb
            clampToOrb(posRef.current);

            groupRef.current.position.copy(posRef.current);
        }

        // Light intensity animation
        if (lightRef.current) {
            const baseIntensity = isActive ? config.lightIntensity * 2.5 : config.lightIntensity;
            lightRef.current.intensity = baseIntensity + Math.sin(t * 2) * 0.3;
        }
    });

    return (
        <group
            ref={groupRef}
            position={[coords.x, coords.y, coords.z]}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* ─── Main 3D Sphere (high segment count for smooth look) ── */}
            <mesh
                ref={meshRef}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <sphereGeometry args={[config.radius, 32, 32]} />
                <meshStandardMaterial
                    color={config.color}
                    emissive={config.emissive}
                    emissiveIntensity={isActive ? config.emissiveIntensity * 2 : config.emissiveIntensity}
                    transparent
                    opacity={dragging ? 1 : 0.95}
                    roughness={0.15}
                    metalness={0.4}
                    toneMapped={false}
                />
            </mesh>

            {/* ─── Multi-layer Additive Glow (creates a 3D bloom effect) ── */}
            {glowLayers.map((layer, i) => (
                <mesh
                    key={`glow-${i}`}
                    ref={(el) => (glowRefs.current[i] = el)}
                    scale={layer.scale}
                >
                    <sphereGeometry args={[config.radius, 16, 16]} />
                    <meshBasicMaterial
                        color={config.color}
                        transparent
                        opacity={dragging ? layer.opacity * 2 : isActive ? layer.opacity * 1.5 : layer.opacity}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            ))}

            {/* ─── Inner core (bright center for depth illusion) ── */}
            <mesh scale={0.5}>
                <sphereGeometry args={[config.radius, 16, 16]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={isActive ? 0.5 : 0.25}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ─── Point Light (casts color onto nearby surfaces) ── */}
            <pointLight
                ref={lightRef}
                color={config.color}
                intensity={config.lightIntensity}
                distance={config.lightDistance}
            />

            {/* ─── Tooltip on Hover ─────────────────────── */}
            {isActive && !dragging && (
                <Html
                    center
                    distanceFactor={12}
                    style={{
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(2, 8, 20, 0.92)',
                            backdropFilter: 'blur(12px)',
                            border: `1px solid ${config.color}44`,
                            borderRadius: '8px',
                            padding: '8px 14px',
                            whiteSpace: 'nowrap',
                            transform: 'translateY(-30px)',
                            boxShadow: `0 0 24px ${config.color}30, inset 0 0 12px ${config.color}10`,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#e8f4fd',
                                marginBottom: '3px',
                            }}
                        >
                            {node.title}
                        </div>
                        <div
                            style={{
                                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontSize: '10px',
                                color: config.color,
                                letterSpacing: '0.5px',
                            }}
                        >
                            {Math.round(node.current_strength)}% • {node.brain_region?.replace('_', ' ')} • grab to move
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}
