import { useRef, useMemo, useCallback, useState, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { LOBE_CONFIG } from '../Brain/BrainMesh';
import { useResponsive } from '../../hooks/useResponsive';

// Shared position registry — nodes register their live positions,
// connection threads read from this to stay perfectly aligned.
const NodePositionContext = createContext(null);

function useNodePositionRegistry() {
    const registryRef = useRef({});
    const register = useCallback((nodeId, pos) => {
        registryRef.current[nodeId] = pos.clone();
    }, []);
    const getPosition = useCallback((nodeId) => {
        return registryRef.current[nodeId] || null;
    }, []);
    return { register, getPosition, registryRef };
}

// ═══════════════════════════════════════════════════════════════════════════
// AmbientParticles — beautiful floating dots in the lobe-colored space
// ═══════════════════════════════════════════════════════════════════════════
function AmbientParticles({ color, count = 60 }) {
    const meshRef = useRef();
    const data = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
            sizes[i] = 0.02 + Math.random() * 0.04;
        }
        return { positions, sizes };
    }, [count]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const pos = meshRef.current.geometry.attributes.position;
        for (let i = 0; i < count; i++) {
            pos.setY(i, pos.getY(i) + Math.sin(t * 0.1 + i) * 0.0005);
        }
        pos.needsUpdate = true;
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={data.positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                color={color}
                size={0.04}
                transparent opacity={0.3}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation
            />
        </points>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FloatingNode — 3D glowing sphere with drag support and click → analysis
// ═══════════════════════════════════════════════════════════════════════════
function FloatingNode({ node, index, lobeColor, totalNodes, onSelect, onDive, registerPosition }) {
    const isCrucial = !!node.feynman?.is_crucial;
    const groupRef = useRef();
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const { camera, raycaster, size, gl } = useThree();

    // Drag refs
    const dragPlane = useRef(new THREE.Plane());
    const dragOffset = useRef(new THREE.Vector3());
    const intersection = useRef(new THREE.Vector3());
    const pointerStart = useRef({ x: 0, y: 0 });
    const didDrag = useRef(false);
    const isPointerDown = useRef(false);

    // Golden-angle spherical distribution for infinite scalability
    const basePos = useMemo(() => {
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const y = 1 - (index / Math.max(totalNodes - 1, 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * index;
        const spread = 2.0 + Math.sqrt(totalNodes) * 0.4;
        return new THREE.Vector3(
            Math.cos(theta) * radiusAtY * spread,
            y * spread,
            Math.sin(theta) * radiusAtY * spread
        );
    }, [index, totalNodes]);

    const posRef = useRef(basePos.clone());

    // Each node has unique floating orbital motion
    const seed = useMemo(() => ({
        speed: 0.12 + Math.random() * 0.08,
        xP: Math.random() * Math.PI * 2,
        yP: Math.random() * Math.PI * 2,
        zP: Math.random() * Math.PI * 2,
        orbitR: 0.04 + Math.random() * 0.06,
    }), []);

    const strength = node.current_strength || 50;
    const nodeSize = 0.08 + (strength / 100) * 0.08;

    useFrame(({ clock }) => {
        if (!groupRef.current || dragging) return;
        const t = clock.getElapsedTime();
        posRef.current.set(
            basePos.x + Math.sin(t * seed.speed + seed.xP) * seed.orbitR,
            basePos.y + Math.cos(t * seed.speed * 0.7 + seed.yP) * seed.orbitR,
            basePos.z + Math.sin(t * seed.speed * 1.3 + seed.zP) * seed.orbitR * 0.8
        );
        groupRef.current.position.copy(posRef.current);

        // Register live position for connection threads
        if (registerPosition) registerPosition(node.id, posRef.current);

        // Hover pulse + crucial glow pulse
        if (meshRef.current) {
            let target = hovered ? 1.5 : 1.0;
            if (isCrucial) {
                target += 0.15 * Math.sin(t * 2.5); // gentle breathing pulse for starred nodes
            }
            const s = THREE.MathUtils.lerp(meshRef.current.scale.x, target, 0.1);
            meshRef.current.scale.setScalar(s);
        }
    });

    // Drag handlers
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
            gl.domElement.style.cursor = 'grabbing';
        }

        raycaster.setFromCamera(
            new THREE.Vector2((e.clientX / size.width) * 2 - 1, -(e.clientY / size.height) * 2 + 1),
            camera
        );
        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
        const newPos = intersection.current.add(dragOffset.current);
        posRef.current.copy(newPos);
        if (groupRef.current) groupRef.current.position.copy(newPos);
    }, [camera, gl, raycaster, size]);

    const handlePointerUp = useCallback((e) => {
        e.stopPropagation();
        isPointerDown.current = false;
        if (didDrag.current) {
            setDragging(false);
            gl.domElement.style.cursor = 'default';
        }
    }, [gl]);

    const clickTimer = useRef(null);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (didDrag.current) { didDrag.current = false; return; }

        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            onDive(node);
            return;
        }

        clickTimer.current = setTimeout(() => {
            clickTimer.current = null;
            onSelect(node.id);
        }, 300);
    }, [node, onSelect, onDive]);

    const handleDoubleClick = useCallback((e) => {
        e.stopPropagation();
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        onDive(node);
    }, [node, onDive]);

    return (
        <group
            ref={groupRef}
            position={basePos.toArray()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* 3D sphere */}
            <mesh
                ref={meshRef}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
                onPointerOut={() => { setHovered(false); if (!dragging) document.body.style.cursor = 'default'; }}
            >
                <sphereGeometry args={[nodeSize, 20, 20]} />
                <meshStandardMaterial
                    color={isCrucial ? '#ffd700' : lobeColor}
                    emissive={isCrucial ? '#ffd700' : lobeColor}
                    emissiveIntensity={isCrucial ? 2.5 : (hovered ? 2.0 : strength > 70 ? 1.2 : strength > 30 ? 0.7 : 0.3)}
                    transparent opacity={0.95}
                    roughness={isCrucial ? 0.05 : 0.1}
                    metalness={isCrucial ? 0.8 : 0.5}
                    toneMapped={false}
                />
            </mesh>

            {/* Outer glow — larger and golden for crucial nodes */}
            <mesh scale={isCrucial ? 3.5 : 2.5}>
                <sphereGeometry args={[nodeSize, 8, 8]} />
                <meshBasicMaterial
                    color={isCrucial ? '#ffd700' : lobeColor}
                    transparent opacity={isCrucial ? 0.18 : (hovered ? 0.15 : 0.06)}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Star halo ring — only for crucial nodes */}
            {isCrucial && (
                <mesh scale={4.0} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[nodeSize * 0.9, nodeSize * 1.1, 32]} />
                    <meshBasicMaterial
                        color="#ffd700"
                        transparent opacity={0.25}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Second halo ring for crucial — perpendicular */}
            {isCrucial && (
                <mesh scale={4.0} rotation={[0, 0, 0]}>
                    <ringGeometry args={[nodeSize * 0.85, nodeSize * 1.05, 32]} />
                    <meshBasicMaterial
                        color="#ffaa00"
                        transparent opacity={0.15}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Inner bright core */}
            <mesh scale={isCrucial ? 0.5 : 0.35}>
                <sphereGeometry args={[nodeSize, 8, 8]} />
                <meshBasicMaterial
                    color={isCrucial ? '#fff8dc' : '#ffffff'}
                    transparent opacity={isCrucial ? 0.7 : (hovered ? 0.5 : 0.2)}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Label on hover */}
            {hovered && !dragging && (
                <Html center distanceFactor={10} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <div style={{
                        background: 'rgba(2, 6, 18, 0.9)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${lobeColor}40`,
                        borderRadius: '10px',
                        padding: '8px 14px',
                        whiteSpace: 'nowrap',
                        transform: 'translateY(-30px)',
                        boxShadow: `0 0 24px ${lobeColor}25`,
                    }}>
                        <div style={{
                            fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                            fontSize: '12px', fontWeight: 600, color: '#e8f4fd',
                        }}>
                            {isCrucial ? '⭐ ' : ''}{node.title}
                        </div>
                        <div style={{
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '9px', color: isCrucial ? '#ffd700' : lobeColor, marginTop: '2px', letterSpacing: '0.3px',
                        }}>
                            {isCrucial ? '★ crucial · ' : ''}{Math.round(strength)}% · click for details · double-click to dive
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// LobeScene — 3D scene inside the lobe view
// ═══════════════════════════════════════════════════════════════════════════
function LobeConnectionLine({ edge, nodes, lobeColor, onEdgeClick, getPosition }) {
    const groupRef = useRef();
    const tubeRef = useRef();
    const glowRef = useRef();
    const hitRef = useRef();
    const prevCurveKey = useRef('');

    // Rebuild geometry each frame from live positions
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // Get live positions from the registry
        const startPos = getPosition(edge.source_node_id);
        const endPos = getPosition(edge.target_node_id);
        if (!startPos || !endPos) return;

        // Only rebuild geometry if positions changed significantly (perf optimization)
        const curveKey = `${startPos.x.toFixed(2)},${startPos.y.toFixed(2)},${startPos.z.toFixed(2)}-${endPos.x.toFixed(2)},${endPos.y.toFixed(2)},${endPos.z.toFixed(2)}`;
        if (curveKey !== prevCurveKey.current) {
            prevCurveKey.current = curveKey;

            // Build curved path between actual node positions
            const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
            const separation = startPos.distanceTo(endPos);
            const pullFactor = THREE.MathUtils.clamp(0.15 + separation * 0.02, 0.1, 0.4);
            mid.multiplyScalar(1 - pullFactor);

            const cp1 = new THREE.Vector3().lerpVectors(startPos, mid, 0.5);
            const cp2 = new THREE.Vector3().lerpVectors(mid, endPos, 0.5);
            const curve = new THREE.CubicBezierCurve3(startPos.clone(), cp1, cp2, endPos.clone());

            const newTubeGeo = new THREE.TubeGeometry(curve, 24, 0.012, 6, false);
            const newGlowGeo = new THREE.TubeGeometry(curve, 24, 0.035, 6, false);
            const newHitGeo  = new THREE.TubeGeometry(curve, 12, 0.08, 4, false);

            if (tubeRef.current) {
                tubeRef.current.geometry.dispose();
                tubeRef.current.geometry = newTubeGeo;
            }
            if (glowRef.current) {
                glowRef.current.geometry.dispose();
                glowRef.current.geometry = newGlowGeo;
            }
            if (hitRef.current) {
                hitRef.current.geometry.dispose();
                hitRef.current.geometry = newHitGeo;
            }
        }

        // Pulsing opacity
        const pulse = 0.05 * Math.sin(t * 1.2 + (edge.id?.charCodeAt(0) || 0) * 0.2);
        const strength = (edge.connection_strength || 50) / 100;
        if (tubeRef.current) {
            tubeRef.current.material.opacity = strength * 0.4 + 0.15 + pulse;
        }
        if (glowRef.current) {
            glowRef.current.material.opacity = 0.08 + pulse * 0.4;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Core thread */}
            <mesh ref={tubeRef}>
                <tubeGeometry args={[new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.01,0)), 4, 0.012, 6, false]} />
                <meshBasicMaterial
                    color={lobeColor}
                    transparent opacity={0.25}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            {/* Outer glow */}
            <mesh ref={glowRef}>
                <tubeGeometry args={[new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.01,0)), 4, 0.035, 6, false]} />
                <meshBasicMaterial
                    color={lobeColor}
                    transparent opacity={0.08}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            {/* Invisible hit mesh for clicking */}
            <mesh
                ref={hitRef}
                onClick={(e) => { e.stopPropagation(); onEdgeClick(edge); }}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'default'; }}
            >
                <tubeGeometry args={[new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.01,0)), 4, 0.08, 4, false]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// CameraAnimator — starts zoomed out, smoothly animates to final position
// ═══════════════════════════════════════════════════════════════════════════
function CameraAnimator({ targetZ = 8 }) {
    const { camera } = useThree();
    const started = useRef(false);
    const startTime = useRef(0);

    useFrame(({ clock }) => {
        if (!started.current) {
            started.current = true;
            startTime.current = clock.getElapsedTime();
            camera.position.set(0, 4, 35); // Start very zoomed out — nodes appear small
        }

        const elapsed = clock.getElapsedTime() - startTime.current;
        const duration = 2.5; // 2.5 second zoom-in for cinematic feel

        if (elapsed < duration) {
            // Smooth easeOutQuart
            const t = 1 - Math.pow(1 - Math.min(elapsed / duration, 1), 4);
            camera.position.z = THREE.MathUtils.lerp(35, targetZ, t);
            camera.position.y = THREE.MathUtils.lerp(4, 1, t);
        }
    });

    return null;
}

function LobeScene({ nodes, lobeColor, onSelectNode, onDiveNode, edges, onEdgeClick }) {
    const { register, getPosition } = useNodePositionRegistry();

    // Filter edges to only those connecting nodes within this lobe
    const lobeEdges = useMemo(() => {
        const nodeIds = new Set(nodes.map(n => n.id));
        return (edges || []).filter(e =>
            nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id)
        );
    }, [nodes, edges]);

    return (
        <>
            {/* Camera zoom-in animation — starts zoomed out for overview */}
            <CameraAnimator targetZ={8} />

            {/* Connection threads between related nodes — uses live positions */}
            {lobeEdges.map(edge => (
                <LobeConnectionLine
                    key={edge.id}
                    edge={edge}
                    nodes={nodes}
                    lobeColor={lobeColor}
                    onEdgeClick={onEdgeClick}
                    getPosition={getPosition}
                />
            ))}

            {nodes.map((node, i) => (
                <FloatingNode
                    key={node.id}
                    node={node}
                    index={i}
                    lobeColor={lobeColor}
                    totalNodes={nodes.length}
                    onSelect={onSelectNode}
                    onDive={onDiveNode}
                    registerPosition={register}
                />
            ))}

            {/* Ambient floating particles */}
            <AmbientParticles color={lobeColor} count={50} />

            {/* Central nebula sphere */}
            <mesh>
                <sphereGeometry args={[1.2, 16, 16]} />
                <meshBasicMaterial
                    color={lobeColor}
                    transparent opacity={0.015}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Second deeper nebula */}
            <mesh>
                <sphereGeometry args={[3, 12, 12]} />
                <meshBasicMaterial
                    color={lobeColor}
                    transparent opacity={0.006}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false} side={THREE.BackSide}
                />
            </mesh>

            {/* Lighting */}
            <ambientLight intensity={0.15} color="#8ab4d0" />
            <pointLight position={[0, 0, 0]} intensity={0.4} color={lobeColor} distance={12} />
            <pointLight position={[5, 3, 5]} intensity={0.3} color="#ffffff" distance={15} />
            <pointLight position={[-5, -3, -5]} intensity={0.2} color={lobeColor} distance={12} />

            <OrbitControls
                enableDamping dampingFactor={0.05}
                rotateSpeed={0.4} zoomSpeed={0.5}
                minDistance={2} maxDistance={25}
                enablePan={false}
                autoRotate autoRotateSpeed={0.15}
            />
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// LobeView — Full-screen immersive overlay
// ═══════════════════════════════════════════════════════════════════════════
export default function LobeView() {
    const activeLobeKey = useBrainStore((s) => s.activeLobeKey);
    const isLobeView = useBrainStore((s) => s.isLobeView);
    const exitLobe = useBrainStore((s) => s.exitLobe);
    const selectNode = useBrainStore((s) => s.selectNode);
    const startDive = useBrainStore((s) => s.startDive);
    const selectEdge = useBrainStore((s) => s.selectEdge);
    const nodes = useBrainStore((s) => s.nodes);
    const edges = useBrainStore((s) => s.edges);

    // Timer for sidebar double-click detection
    const sidebarTimer = useRef(null);
    const { isMobile, isTouchDevice } = useResponsive();

    const lobeConfig = activeLobeKey ? LOBE_CONFIG[activeLobeKey] : null;

    const lobeNodes = useMemo(() => {
        if (!lobeConfig) return [];
        return nodes.filter(n => lobeConfig.regions.includes(n.brain_region));
    }, [nodes, lobeConfig]);

    const handleSelectNode = useCallback((nodeId) => {
        selectNode(nodeId);
    }, [selectNode]);

    const handleDiveNode = useCallback((node) => {
        startDive(node);
    }, [startDive]);

    const handleEdgeClick = useCallback((edge) => {
        selectEdge(edge);
    }, [selectEdge]);

    if (!isLobeView || !lobeConfig) return null;

    const c = lobeConfig.color;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 40,
                    background: `radial-gradient(ellipse at 40% 40%, ${c}08 0%, #050510 50%, #020208 100%)`,
                }}
            >
                {/* Top gradient overlay */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '200px',
                    background: `linear-gradient(180deg, ${c}0A 0%, transparent 100%)`,
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* Bottom vignette */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px',
                    background: `linear-gradient(0deg, #020208 0%, transparent 100%)`,
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* Side vignettes */}
                <div style={{
                    position: 'absolute', inset: 0,
                    boxShadow: `inset 0 0 120px 40px rgba(2, 2, 8, 0.6), inset 0 0 300px 100px rgba(2, 2, 8, 0.3)`,
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* 3D Canvas — opaque background, no bleedthrough */}
                <Canvas
                    camera={{ position: [0, 4, 35], fov: 55, near: 0.1, far: 100 }}
                    gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
                    style={{ background: '#050510' }}
                >
                    <color attach="background" args={['#050510']} />
                    <LobeScene nodes={lobeNodes} lobeColor={c} onSelectNode={handleSelectNode} onDiveNode={handleDiveNode} edges={edges} onEdgeClick={handleEdgeClick} />
                    <fog attach="fog" args={['#050510', 12, 35]} />
                </Canvas>

                {/* ─── Header ─── */}
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                    style={{
                        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
                        padding: isMobile ? '14px 14px' : '20px 28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                >
                    <button
                        onClick={exitLobe}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '10px',
                            padding: '8px 18px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            color: 'rgba(232, 244, 253, 0.5)',
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '13px', fontWeight: 500,
                            transition: 'all 0.25s ease',
                            backdropFilter: 'blur(16px)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e8f4fd'; e.currentTarget.style.borderColor = `${c}30`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(232, 244, 253, 0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                        ← Back
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                            fontSize: isMobile ? '16px' : '20px', fontWeight: 700, color: c,
                            letterSpacing: isMobile ? '2px' : '4px', textTransform: 'uppercase',
                            textShadow: `0 0 40px ${c}50, 0 0 80px ${c}20`,
                        }}>
                            {lobeConfig.label}
                        </div>
                        <div style={{
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '10px', color: 'rgba(232, 244, 253, 0.25)',
                            letterSpacing: '2px', marginTop: '6px', textTransform: 'uppercase',
                        }}>
                            {lobeConfig.category} · {lobeNodes.length} node{lobeNodes.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    {!isMobile && <div style={{ width: '90px' }} />}
                </motion.div>

                {/* ─── Sidebar: Node List ─── hidden on mobile */}
                {!isMobile && <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                    style={{
                        position: 'absolute', right: '20px', top: '80px', bottom: '20px',
                        width: '220px', overflowY: 'auto', zIndex: 2, padding: '4px',
                    }}
                >
                    <div style={{
                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                        fontSize: '9px', color: `${c}60`,
                        letterSpacing: '2px', textTransform: 'uppercase',
                        fontWeight: 600, padding: '8px 10px', marginBottom: '4px',
                    }}>
                        Knowledge
                    </div>
                    {lobeNodes.length === 0 ? (
                        <div style={{
                            padding: '24px 10px',
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '12px', color: 'rgba(255,255,255,0.1)',
                            textAlign: 'center', lineHeight: '1.6',
                        }}>
                            No knowledge here yet.<br />
                            <span style={{ color: `${c}40`, fontSize: '10px' }}>
                                Use the input bar to save concepts to this lobe.
                            </span>
                        </div>
                    ) : (
                        lobeNodes.map((node) => (
                            <button
                                key={node.id}
                                onClick={() => {
                                    if (sidebarTimer.current) {
                                        clearTimeout(sidebarTimer.current);
                                        sidebarTimer.current = null;
                                        startDive(node);
                                        return;
                                    }
                                    sidebarTimer.current = setTimeout(() => {
                                        sidebarTimer.current = null;
                                        selectNode(node.id);
                                    }, 300);
                                }}
                                onDoubleClick={() => {
                                    if (sidebarTimer.current) { clearTimeout(sidebarTimer.current); sidebarTimer.current = null; }
                                    startDive(node);
                                }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '10px 10px', marginBottom: '2px',
                                    background: 'rgba(255,255,255,0.015)',
                                    border: '1px solid transparent',
                                    borderRadius: '8px', cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = `${c}0C`;
                                    e.currentTarget.style.borderColor = `${c}20`;
                                    e.currentTarget.style.boxShadow = `0 0 12px ${c}08`;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                    fontSize: '12px', fontWeight: 600, color: '#d0e0f0',
                                    marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {node.title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        flex: 1, height: '3px', background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '2px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${node.current_strength || 0}%`, height: '100%',
                                            background: `linear-gradient(90deg, ${c}50, ${c})`,
                                            borderRadius: '2px',
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                    <span style={{
                                        fontFamily: "'SF Mono', 'Menlo', monospace",
                                        fontSize: '8px', color: 'rgba(255,255,255,0.2)',
                                        minWidth: '24px', textAlign: 'right',
                                    }}>
                                        {Math.round(node.current_strength || 0)}%
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </motion.div>}
            </motion.div>
        </AnimatePresence>
    );
}
