// ═══════════════════════════════════════════════════════════════════════════
// EnergyConnections.jsx — Pulsing energy beams between orbiting agents
// Renders dynamic connection lines with travelling energy particles
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ORBIT_CONFIG = [
    { radius: 3, speed: 0.15, offset: 0 },
    { radius: 3, speed: 0.15, offset: Math.PI / 3 },
    { radius: 3, speed: 0.15, offset: (2 * Math.PI) / 3 },
    { radius: 3, speed: 0.15, offset: Math.PI },
    { radius: 3, speed: 0.15, offset: (4 * Math.PI) / 3 },
    { radius: 3, speed: 0.15, offset: (5 * Math.PI) / 3 },
];

function getOrbPos(time, cfg) {
    const t = time * cfg.speed + cfg.offset;
    return new THREE.Vector3(
        Math.cos(t) * cfg.radius,
        Math.sin(t * 0.7) * 0.5,
        Math.sin(t) * cfg.radius,
    );
}

// Single energy beam between two agents
function EnergyBeam({ fromIdx, toIdx, color, intensity = 1, isConflict = false }) {
    const lineRef = useRef();
    const particlesRef = useRef();

    const particleCount = 12;
    const positions = useMemo(() => new Float32Array(particleCount * 3), []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const from = getOrbPos(time, ORBIT_CONFIG[fromIdx]);
        const to = getOrbPos(time, ORBIT_CONFIG[toIdx]);

        // Update line
        if (lineRef.current) {
            const pts = lineRef.current.geometry.attributes.position.array;
            pts[0] = from.x; pts[1] = from.y; pts[2] = from.z;
            pts[3] = to.x;   pts[4] = to.y;   pts[5] = to.z;
            lineRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Update travelling particles
        if (particlesRef.current) {
            const arr = particlesRef.current.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const t = ((time * (isConflict ? 2.5 : 1.2) + i / particleCount) % 1);
                arr[i * 3] = from.x + (to.x - from.x) * t;
                arr[i * 3 + 1] = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * 0.15;
                arr[i * 3 + 2] = from.z + (to.z - from.z) * t;
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    const col = new THREE.Color(color);

    return (
        <group>
            {/* Base line */}
            <line ref={lineRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        array={new Float32Array(6)}
                        count={2}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color={col}
                    transparent
                    opacity={intensity * (isConflict ? 0.3 : 0.12)}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </line>

            {/* Travelling energy particles */}
            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        array={positions}
                        count={particleCount}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={isConflict ? 0.06 : 0.04}
                    color={col}
                    transparent
                    opacity={intensity * (isConflict ? 0.8 : 0.5)}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    sizeAttenuation
                />
            </points>
        </group>
    );
}

// Central nexus point — the thought core
export function ThoughtNexus({ thought, isActive }) {
    const meshRef = useRef();
    const ringRef = useRef();

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.rotation.y = time * 0.3;
            meshRef.current.rotation.z = time * 0.15;
            const s = isActive ? 1 + Math.sin(time * 2) * 0.1 : 1;
            meshRef.current.scale.setScalar(s);
        }
        if (ringRef.current) {
            ringRef.current.rotation.x = time * 0.2;
            ringRef.current.rotation.z = time * 0.1;
        }
    });

    return (
        <group>
            {/* Core icosahedron */}
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[0.3, 1]} />
                <meshPhysicalMaterial
                    color="#9B7FE8"
                    emissive="#9B7FE8"
                    emissiveIntensity={isActive ? 0.8 : 0.3}
                    wireframe
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* Orbit ring */}
            <mesh ref={ringRef}>
                <torusGeometry args={[0.5, 0.008, 8, 64]} />
                <meshBasicMaterial
                    color="#9B7FE8"
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Ambient glow */}
            <mesh>
                <sphereGeometry args={[0.6, 16, 16]} />
                <meshBasicMaterial
                    color="#9B7FE8"
                    transparent
                    opacity={isActive ? 0.04 : 0.02}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>
        </group>
    );
}

export default function EnergyConnections({ activeConnections = [], roundIndex = 0 }) {
    return (
        <group>
            {activeConnections.map((conn, i) => (
                <EnergyBeam
                    key={`${conn.from}-${conn.to}-${i}`}
                    fromIdx={conn.from}
                    toIdx={conn.to}
                    color={conn.color}
                    intensity={conn.intensity || 1}
                    isConflict={roundIndex === 1}
                />
            ))}
        </group>
    );
}
