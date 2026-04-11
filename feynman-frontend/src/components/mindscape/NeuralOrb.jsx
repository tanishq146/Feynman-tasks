// ═══════════════════════════════════════════════════════════════════════════
// NeuralOrb.jsx — Individual Agent Orb in 3D Neural Space
// Floating, pulsing, conscious entity with particle trails
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle system for orb aura
function OrbParticles({ color, count = 40, radius = 0.6, active }) {
    const ref = useRef();
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.8 + Math.random() * 0.6);
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, [count, radius]);

    const speeds = useMemo(() => {
        return Array.from({ length: count }, () => 0.3 + Math.random() * 0.7);
    }, [count]);

    useFrame((_, delta) => {
        if (!ref.current) return;
        const posArr = ref.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            const speed = speeds[i];
            const angle = delta * speed * (active ? 2.5 : 0.5);
            const x = posArr[i * 3];
            const z = posArr[i * 3 + 2];
            posArr[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
            posArr[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
            // Gentle vertical drift
            posArr[i * 3 + 1] += Math.sin(Date.now() * 0.001 * speed) * delta * 0.05;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    const col = new THREE.Color(color);

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={count}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.035}
                color={col}
                transparent
                opacity={active ? 0.7 : 0.3}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation
            />
        </points>
    );
}

export default function NeuralOrb({
    agent,
    orbitRadius = 3,
    orbitSpeed = 0.15,
    orbitOffset = 0,
    dominance = 0,
    isActive = false,
    isSpeaking = false,
    onClick,
}) {
    const groupRef = useRef();
    const meshRef = useRef();
    const glowRef = useRef();
    const pulseRef = useRef(0);

    const baseSize = 0.22 + dominance * 0.35;
    const col = new THREE.Color(agent.color);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Orbital motion
        const t = state.clock.elapsedTime * orbitSpeed + orbitOffset;
        const x = Math.cos(t) * orbitRadius;
        const z = Math.sin(t) * orbitRadius;
        const y = Math.sin(t * 0.7) * 0.5; // gentle vertical wave

        groupRef.current.position.set(x, y, z);

        // Pulse effect when speaking
        if (isSpeaking) {
            pulseRef.current += delta * 4;
            const pulse = 1 + Math.sin(pulseRef.current) * 0.15;
            if (meshRef.current) meshRef.current.scale.setScalar(pulse);
            if (glowRef.current) {
                glowRef.current.scale.setScalar(pulse * 1.8);
                glowRef.current.material.opacity = 0.15 + Math.sin(pulseRef.current) * 0.08;
            }
        } else {
            pulseRef.current += delta * 1.5;
            const subtle = 1 + Math.sin(pulseRef.current) * 0.04;
            if (meshRef.current) meshRef.current.scale.setScalar(subtle);
            if (glowRef.current) {
                glowRef.current.scale.setScalar(subtle * 1.5);
                glowRef.current.material.opacity = 0.06;
            }
        }
    });

    return (
        <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick?.(agent); }}>
            {/* Core orb */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[baseSize, 32, 32]} />
                <meshPhysicalMaterial
                    color={col}
                    emissive={col}
                    emissiveIntensity={isSpeaking ? 1.2 : 0.4}
                    roughness={0.15}
                    metalness={0.3}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    transparent
                    opacity={0.9}
                    envMapIntensity={0.5}
                />
            </mesh>

            {/* Outer glow sphere */}
            <mesh ref={glowRef} scale={1.5}>
                <sphereGeometry args={[baseSize, 24, 24]} />
                <meshBasicMaterial
                    color={col}
                    transparent
                    opacity={0.06}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Particle aura */}
            <OrbParticles
                color={agent.color}
                count={isSpeaking ? 60 : 30}
                radius={baseSize + 0.4}
                active={isSpeaking}
            />
        </group>
    );
}

// Get world position of an orb for connection lines
NeuralOrb.getOrbPosition = (time, orbitRadius, orbitSpeed, orbitOffset) => {
    const t = time * orbitSpeed + orbitOffset;
    return new THREE.Vector3(
        Math.cos(t) * orbitRadius,
        Math.sin(t * 0.7) * 0.5,
        Math.sin(t) * orbitRadius,
    );
};
