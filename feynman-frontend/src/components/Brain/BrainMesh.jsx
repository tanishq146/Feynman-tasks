import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import useBrainStore from '../../store/brainStore';

// ═══════════════════════════════════════════════════════════════════════════
// CURATED COLOR PALETTE — Premium, futuristic, Gen-Z aesthetic
// ═══════════════════════════════════════════════════════════════════════════

const LOBE_CONFIG = {
    frontal: {
        label: 'Frontal Lobe',
        category: 'Goals · Planning · Decisions',
        color: '#7c3aed',      // Deep violet
        emissive: '#5b21b6',
        accent: '#a78bfa',     // Soft lavender highlight
        regions: ['prefrontal_cortex'],
        center: [0, 0.8, 1.4],
        scale: [2.0, 1.8, 1.5],
        rotation: [0.1, 0, 0],
        deform: { freq: 3, amp: 0.12 },
    },
    temporal: {
        label: 'Temporal Lobe',
        category: 'Language · Stories · Memory',
        color: '#d97706',      // Rich amber
        emissive: '#b45309',
        accent: '#fbbf24',     // Warm gold highlight
        regions: ['temporal_lobe', 'wernickes_area', 'amygdala'],
        center: [0, -0.6, 0.2],
        scale: [2.6, 1.1, 1.6],
        rotation: [0.05, 0, 0],
        deform: { freq: 4, amp: 0.1 },
    },
    parietal: {
        label: 'Parietal Lobe',
        category: 'Spatial · Math · Logic',
        color: '#059669',      // Emerald
        emissive: '#047857',
        accent: '#34d399',     // Mint highlight
        regions: ['hippocampus'],
        center: [0, 1.2, -0.8],
        scale: [1.8, 1.5, 1.6],
        rotation: [-0.05, 0, 0],
        deform: { freq: 3.5, amp: 0.14 },
    },
    occipital: {
        label: 'Occipital Lobe',
        category: 'Visual · Patterns · Images',
        color: '#dc2626',      // Cherry red
        emissive: '#b91c1c',
        accent: '#f87171',     // Soft rose
        regions: ['occipital_lobe'],
        center: [0, 0.1, -2.0],
        scale: [1.5, 1.3, 1.1],
        rotation: [-0.15, 0, 0],
        deform: { freq: 3, amp: 0.1 },
    },
    cerebellum: {
        label: 'Cerebellum',
        category: 'Skills · Habits · Procedures',
        color: '#0891b2',      // Ocean cyan
        emissive: '#0e7490',
        accent: '#22d3ee',     // Electric blue
        regions: ['cerebellum'],
        center: [0, -1.5, -1.4],
        scale: [1.6, 0.9, 1.1],
        rotation: [-0.25, 0, 0],
        deform: { freq: 5, amp: 0.08 },
    },
};

const BRAIN_REGIONS = {
    hippocampus:      { center: [0, 1.2, -0.8], color: '#059669' },
    prefrontal_cortex:{ center: [0, 0.8, 1.4],  color: '#7c3aed' },
    amygdala:         { center: [-1.5, -0.6, 0.2], color: '#d97706' },
    cerebellum:       { center: [0, -1.5, -1.4], color: '#0891b2' },
    wernickes_area:   { center: [1.5, -0.6, 0.2], color: '#d97706' },
    occipital_lobe:   { center: [0, 0.1, -2.0],  color: '#dc2626' },
    temporal_lobe:    { center: [-1.5, -0.6, 0.2], color: '#d97706' },
};

// ═══════════════════════════════════════════════════════════════════════════
// Generate a deformed sphere geometry that looks like a brain lobe
// ═══════════════════════════════════════════════════════════════════════════
function createLobeGeometry(lobeConfig) {
    const geo = new THREE.SphereGeometry(1, 24, 18);
    const pos = geo.attributes.position;
    const { freq, amp } = lobeConfig.deform;
    const [sx, sy, sz] = lobeConfig.scale;

    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        const noise = Math.sin(x * freq + y * 2) * Math.cos(z * freq * 0.7 + x) * amp;
        const sulci = Math.sin(x * freq * 2.5 + z * 3) * Math.cos(y * freq * 1.8) * amp * 0.4;
        const r = 1 + noise + sulci;

        pos.setXYZ(i, x * r * sx, y * r * sy, z * r * sz);
    }

    geo.computeVertexNormals();
    return geo;
}

// ═══════════════════════════════════════════════════════════════════════════
// BrainLobe — premium material with glassmorphism and outer glow
// ═══════════════════════════════════════════════════════════════════════════
function BrainLobe({ lobeKey, config, hoveredLobe, setHoveredLobe, nodeCount, onClickLobe }) {
    const meshRef = useRef();
    const glowRef = useRef();
    const isHovered = hoveredLobe === lobeKey;
    const isOtherHovered = hoveredLobe && hoveredLobe !== lobeKey;

    const geometry = useMemo(() => createLobeGeometry(config), [config]);

    // Main material — glossy, slightly transparent, with clearcoat for that premium glass look
    const material = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: config.color,
        emissive: config.emissive,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.82,
        roughness: 0.2,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        sheen: 1.0,
        sheenRoughness: 0.3,
        sheenColor: new THREE.Color(config.accent),
        envMapIntensity: 1.5,
        side: THREE.FrontSide,
        toneMapped: true,
    }), [config.color, config.emissive, config.accent]);

    // Outer glow shell
    const glowGeo = useMemo(() => {
        const g = geometry.clone();
        const pos = g.attributes.position;
        const normals = g.attributes.normal;
        for (let i = 0; i < pos.count; i++) {
            pos.setX(i, pos.getX(i) + normals.getX(i) * 0.06);
            pos.setY(i, pos.getY(i) + normals.getY(i) * 0.06);
            pos.setZ(i, pos.getZ(i) + normals.getZ(i) * 0.06);
        }
        return g;
    }, [geometry]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();

        const targetEmissive = isHovered ? 0.8 : isOtherHovered ? 0.12 : 0.35;
        const targetOpacity = isHovered ? 0.92 : isOtherHovered ? 0.5 : 0.82;

        material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.06;
        material.opacity += (targetOpacity - material.opacity) * 0.06;

        // Subtle breathing scale
        const breath = 1 + Math.sin(t * 0.8 + lobeKey.charCodeAt(0) * 0.5) * 0.005;
        meshRef.current.scale.setScalar(breath);

        // Glow shell
        if (glowRef.current) {
            const glowTarget = isHovered ? 0.18 : 0.04;
            glowRef.current.material.opacity += (glowTarget - glowRef.current.material.opacity) * 0.06;
        }
    });

    return (
        <group position={config.center} rotation={config.rotation}>
            {/* Main lobe — glossy premium material */}
            <mesh
                ref={meshRef}
                geometry={geometry}
                material={material}
                onPointerOver={(e) => { e.stopPropagation(); setHoveredLobe(lobeKey); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHoveredLobe(null); document.body.style.cursor = 'default'; }}
                onClick={(e) => { e.stopPropagation(); if (onClickLobe) onClickLobe(lobeKey); }}
            />

            {/* Outer glow aura — additive blending creates halo */}
            <mesh ref={glowRef} geometry={glowGeo}>
                <meshBasicMaterial
                    color={config.accent}
                    transparent
                    opacity={0.04}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Tooltip */}
            {isHovered && (
                <Html center distanceFactor={14} style={{ pointerEvents: 'none' }}>
                    <div style={{
                        background: 'rgba(5, 5, 16, 0.92)',
                        border: `1px solid ${config.color}44`,
                        borderRadius: '12px',
                        padding: '10px 16px',
                        backdropFilter: 'blur(12px)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        boxShadow: `0 0 30px ${config.color}25, 0 0 60px ${config.color}10`,
                    }}>
                        <div style={{
                            fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                            fontSize: '13px', fontWeight: 700, color: config.accent,
                            letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px',
                        }}>
                            {config.label}
                        </div>
                        <div style={{
                            fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                            fontSize: '10px', color: 'rgba(232, 244, 253, 0.45)', letterSpacing: '0.5px',
                        }}>
                            {config.category} · {nodeCount} node{nodeCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// BrainMesh — the full brain with premium lighting
// ═══════════════════════════════════════════════════════════════════════════
export default function BrainMesh() {
    const brainGroupRef = useRef();
    const [hoveredLobe, setHoveredLobe] = useState(null);
    const enterLobe = useBrainStore((s) => s.enterLobe);
    const nodes = useBrainStore((s) => s.nodes);

    const getNodeCount = useCallback((lobeKey) => {
        const config = LOBE_CONFIG[lobeKey];
        if (!config) return 0;
        return nodes.filter(n => config.regions.includes(n.brain_region)).length;
    }, [nodes]);

    // Slow rotation
    useFrame(({ clock }) => {
        if (!brainGroupRef.current) return;
        if (!hoveredLobe) {
            brainGroupRef.current.rotation.y = clock.getElapsedTime() * 0.03;
        }
    });

    return (
        <group>
            <group ref={brainGroupRef}>
                {Object.entries(LOBE_CONFIG).map(([key, config]) => (
                    <BrainLobe
                        key={key}
                        lobeKey={key}
                        config={config}
                        hoveredLobe={hoveredLobe}
                        setHoveredLobe={setHoveredLobe}
                        nodeCount={getNodeCount(key)}
                        onClickLobe={enterLobe}
                    />
                ))}

                {/* Brain Stem — dark metallic */}
                <mesh position={[0, -1.5, 0]} rotation={[0.2, 0, 0]}>
                    <cylinderGeometry args={[0.3, 0.5, 1.5, 10]} />
                    <meshPhysicalMaterial
                        color="#1a1a2e"
                        emissive="#0d0d1a"
                        emissiveIntensity={0.15}
                        transparent opacity={0.7}
                        roughness={0.3}
                        metalness={0.7}
                        clearcoat={0.8}
                    />
                </mesh>
            </group>

            {/* Premium 3-point lighting — key, fill, rim */}
            <directionalLight position={[3, 5, 4]} intensity={0.6} color="#e8f0ff" />
            <directionalLight position={[-3, -2, -4]} intensity={0.2} color="#3355cc" />
            <pointLight position={[0, 4, 2]} intensity={0.5} color="#ffffff" distance={18} decay={2} />
            <pointLight position={[-5, 0, 4]} intensity={0.25} color="#7c3aed" distance={20} decay={2} />
            <pointLight position={[5, -1, -4]} intensity={0.2} color="#0891b2" distance={20} decay={2} />
            <ambientLight intensity={0.25} color="#6080b0" />
        </group>
    );
}

export { BRAIN_REGIONS, LOBE_CONFIG };
