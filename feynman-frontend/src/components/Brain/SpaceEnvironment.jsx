import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Spiral Galaxy Generator ────────────────────────────────
function generateSpiralGalaxy(config) {
    const { arms = 3, particlesPerArm = 120, radius = 6, spread = 0.4, coreSize = 40 } = config;
    const total = arms * particlesPerArm + coreSize;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);

    let idx = 0;

    // Spiral arms
    for (let a = 0; a < arms; a++) {
        const armAngle = (a / arms) * Math.PI * 2;

        for (let i = 0; i < particlesPerArm; i++) {
            const t = i / particlesPerArm;
            const angle = armAngle + t * Math.PI * 2.5; // spiral twist
            const r = t * radius;

            // Add randomness for natural look
            const rx = (Math.random() - 0.5) * spread * (1 + t * 2);
            const ry = (Math.random() - 0.5) * spread * 0.3;
            const rz = (Math.random() - 0.5) * spread * (1 + t * 2);

            positions[idx * 3] = Math.cos(angle) * r + rx;
            positions[idx * 3 + 1] = ry;
            positions[idx * 3 + 2] = Math.sin(angle) * r + rz;

            // Color gradient: bright core → blue tips
            const coreColor = new THREE.Color('#b8a0e8');
            const tipColor = new THREE.Color('#3a5a9e');
            const c = coreColor.clone().lerp(tipColor, t);

            colors[idx * 3] = c.r;
            colors[idx * 3 + 1] = c.g;
            colors[idx * 3 + 2] = c.b;

            sizes[idx] = 0.08 * (1 - t * 0.6);
            idx++;
        }
    }

    // Bright core cluster
    for (let i = 0; i < coreSize; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * radius * 0.15;
        const y = (Math.random() - 0.5) * 0.15;

        positions[idx * 3] = Math.cos(theta) * r;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = Math.sin(theta) * r;

        const c = new THREE.Color('#e8d8ff');
        colors[idx * 3] = c.r;
        colors[idx * 3 + 1] = c.g;
        colors[idx * 3 + 2] = c.b;

        sizes[idx] = 0.06 + Math.random() * 0.08;
        idx++;
    }

    return { positions, colors, sizes, count: total };
}

/**
 * A single spiral galaxy component
 */
function SpiralGalaxy({ position, rotation, scale = 1, arms = 3, color = '#7c5acd', speed = 0.01 }) {
    const groupRef = useRef();
    const coreGlowRef = useRef();

    const galaxyData = useMemo(() => generateSpiralGalaxy({
        arms,
        particlesPerArm: 100,
        radius: 5,
        spread: 0.35,
        coreSize: 35,
    }), [arms]);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (groupRef.current) {
            groupRef.current.rotation.y = t * speed;
        }
        if (coreGlowRef.current) {
            coreGlowRef.current.material.opacity = 0.12 + Math.sin(t * 0.5) * 0.04;
        }
    });

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <group ref={groupRef}>
                {/* Spiral arm particles */}
                <points>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            array={galaxyData.positions}
                            count={galaxyData.count}
                            itemSize={3}
                        />
                        <bufferAttribute
                            attach="attributes-color"
                            array={galaxyData.colors}
                            count={galaxyData.count}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <pointsMaterial
                        size={0.08}
                        transparent
                        opacity={0.6}
                        vertexColors
                        sizeAttenuation
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </points>

                {/* Core glow sphere */}
                <mesh ref={coreGlowRef}>
                    <sphereGeometry args={[0.6, 16, 16]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.12}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>

                {/* Outer halo */}
                <mesh>
                    <sphereGeometry args={[2, 12, 12]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.02}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            </group>
        </group>
    );
}


/**
 * SpaceEnvironment — deep space aesthetics
 */
export default function SpaceEnvironment() {
    const nebulaRefs = useRef([]);
    const shootingStarRefs = useRef([]);
    const dustRef = useRef();
    const twinkleRef = useRef();

    // ─── Twinkling bright stars ─────────────────────────────
    const twinkleData = useMemo(() => {
        const count = 250;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const phases = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 30 + Math.random() * 60;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            sizes[i] = 0.05 + Math.random() * 0.15;
            phases[i] = Math.random() * Math.PI * 2;
        }

        return { positions, sizes, phases, count };
    }, []);

    // ─── Cosmic dust ────────────────────────────────────────
    const dustData = useMemo(() => {
        const count = 400;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 10 + Math.random() * 50;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }

        return { positions, count };
    }, []);

    // ─── Shooting stars ─────────────────────────────────────
    const shootingStarData = useMemo(() => {
        return Array.from({ length: 5 }, () => ({
            speed: 8 + Math.random() * 12,
            startAngle: Math.random() * Math.PI * 2,
            elevation: -0.3 + Math.random() * 0.6,
            distance: 20 + Math.random() * 30,
            phase: Math.random() * 60,
            duration: 1.5 + Math.random() * 2,
        }));
    }, []);

    // ─── Nebula configs ─────────────────────────────────────
    const nebulaConfigs = useMemo(() => [
        { pos: [-25, 15, -40], color: '#1a0a3e', scale: 18, opacity: 0.04 },
        { pos: [30, -10, -35], color: '#0a1a3e', scale: 22, opacity: 0.035 },
        { pos: [-15, -20, -45], color: '#0e2a1a', scale: 15, opacity: 0.03 },
        { pos: [20, 25, -50], color: '#2a0a1e', scale: 20, opacity: 0.025 },
    ], []);

    // ─── Animation ──────────────────────────────────────────
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // Twinkle stars
        if (twinkleRef.current) {
            const sizes = twinkleRef.current.geometry.attributes.size;
            for (let i = 0; i < twinkleData.count; i++) {
                const twinkle = 0.5 + Math.sin(t * (1.5 + i * 0.02) + twinkleData.phases[i]) * 0.5;
                sizes.array[i] = twinkleData.sizes[i] * twinkle;
            }
            sizes.needsUpdate = true;
        }

        // Nebula drift
        nebulaRefs.current.forEach((ref, i) => {
            if (ref) {
                const phase = i * 1.5;
                ref.rotation.z = Math.sin(t * 0.02 + phase) * 0.1;
                ref.position.y = nebulaConfigs[i].pos[1] + Math.sin(t * 0.03 + phase) * 0.5;
                ref.material.opacity = nebulaConfigs[i].opacity + Math.sin(t * 0.1 + phase) * 0.008;
            }
        });

        // Cosmic dust slow rotation
        if (dustRef.current) {
            dustRef.current.rotation.y = t * 0.003;
            dustRef.current.rotation.x = Math.sin(t * 0.01) * 0.02;
        }

        // Shooting stars
        shootingStarRefs.current.forEach((ref, i) => {
            if (!ref) return;
            const s = shootingStarData[i];
            const cycle = 30 + s.phase;
            const cycleT = t % cycle;

            if (cycleT < s.duration) {
                const progress = cycleT / s.duration;
                const angle = s.startAngle + progress * 0.8;
                const r = s.distance;

                ref.position.set(
                    r * Math.cos(angle),
                    s.elevation * r + (1 - progress) * 5,
                    -20 - progress * 15
                );

                const fade = progress < 0.2
                    ? progress / 0.2
                    : progress > 0.7
                        ? (1 - progress) / 0.3
                        : 1;

                ref.material.opacity = fade * 0.8;
                ref.scale.set(1 + progress * 2, 0.1, 0.1);
                ref.visible = true;
            } else {
                ref.visible = false;
            }
        });
    });

    return (
        <group>
            {/* ─── Distant Nebula Glows ──────────────────────── */}
            {nebulaConfigs.map((nebula, i) => (
                <mesh
                    key={`nebula-${i}`}
                    ref={(el) => (nebulaRefs.current[i] = el)}
                    position={nebula.pos}
                >
                    <sphereGeometry args={[nebula.scale, 16, 16]} />
                    <meshBasicMaterial
                        color={nebula.color}
                        transparent
                        opacity={nebula.opacity}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        side={THREE.BackSide}
                    />
                </mesh>
            ))}

            {/* ═══ SPIRAL GALAXIES ════════════════════════════ */}

            {/* Large galaxy — upper right, tilted face-on */}
            <SpiralGalaxy
                position={[38, 18, -55]}
                rotation={[0.8, 0.3, 0.2]}
                scale={1.2}
                arms={3}
                color="#7c5acd"
                speed={0.008}
            />

            {/* Medium galaxy — lower left, edge-on view */}
            <SpiralGalaxy
                position={[-42, -12, -65]}
                rotation={[1.4, -0.3, 0.8]}
                scale={0.8}
                arms={2}
                color="#3a7abd"
                speed={0.012}
            />

            {/* Small distant galaxy — far center-left */}
            <SpiralGalaxy
                position={[-20, 28, -80]}
                rotation={[0.3, 1.2, 0.5]}
                scale={0.5}
                arms={4}
                color="#5a8acd"
                speed={0.015}
            />

            {/* Tiny galaxy — far right, almost edge-on */}
            <SpiralGalaxy
                position={[55, -5, -90]}
                rotation={[1.5, 0.1, 0.3]}
                scale={0.35}
                arms={2}
                color="#8a6abd"
                speed={0.02}
            />

            {/* Medium galaxy — upper left background */}
            <SpiralGalaxy
                position={[-50, 25, -75]}
                rotation={[0.6, -0.8, 1.0]}
                scale={0.6}
                arms={3}
                color="#4a6a9d"
                speed={0.01}
            />

            {/* ─── Twinkling Stars ────────────────────────────── */}
            <points ref={twinkleRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        array={twinkleData.positions}
                        count={twinkleData.count}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-size"
                        array={twinkleData.sizes}
                        count={twinkleData.count}
                        itemSize={1}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color="#e8f0ff"
                    size={0.12}
                    transparent
                    opacity={0.7}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>

            {/* ─── Cosmic Dust ────────────────────────────────── */}
            <points ref={dustRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        array={dustData.positions}
                        count={dustData.count}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color="#6080a0"
                    size={0.03}
                    transparent
                    opacity={0.15}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>

            {/* ─── Shooting Stars ─────────────────────────────── */}
            {shootingStarData.map((_, i) => (
                <mesh
                    key={`shooting-${i}`}
                    ref={(el) => (shootingStarRefs.current[i] = el)}
                    visible={false}
                >
                    <boxGeometry args={[0.8, 0.02, 0.02]} />
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
}
