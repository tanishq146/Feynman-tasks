import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BRAIN_REGIONS = {
    hippocampus: { center: [0, -2, 0], color: '#00d4ff' },
    prefrontal_cortex: { center: [0, 2.5, 1.5], color: '#7c3aed' },
    amygdala: { center: [-1.5, -0.5, 0], color: '#ffaa00' },
    cerebellum: { center: [0, -3, -1.5], color: '#00bfa6' },
    wernickes_area: { center: [-2.5, 0.5, 0], color: '#3b82f6' },
    occipital_lobe: { center: [0, -0.5, -2.5], color: '#6366f1' },
    temporal_lobe: { center: [2.5, 0, 0], color: '#10b981' },
};

export default function BrainMesh() {
    const outerRef = useRef();
    const innerRef = useRef();
    const particlesRef = useRef();
    const ring1Ref = useRef();
    const ring2Ref = useRef();
    const ring3Ref = useRef();
    const coreRef = useRef();
    const coreGlowRef = useRef();
    const auroraRefs = useRef([]);
    const sparkRefs = useRef([]);

    // ─── Custom wireframe shader for glow effect ──────────────
    const wireframeMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color('#00d4ff') },
                uOpacity: { value: 0.45 },
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                    vPosition = position;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uOpacity;
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                    // Fresnel-like edge glow
                    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                    float pulse = 0.85 + sin(uTime * 0.8 + vPosition.y * 1.5) * 0.15;
                    float alpha = uOpacity * pulse * (0.6 + fresnel * 0.4);
                    gl_FragColor = vec4(uColor * (1.0 + fresnel * 0.5), alpha);
                }
            `,
            transparent: true,
            wireframe: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }, []);

    const innerWireframeMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color('#7c3aed') },
                uOpacity: { value: 0.25 },
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                    vPosition = position;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uOpacity;
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                    float pulse = 0.9 + sin(uTime * 0.6 + vPosition.x * 2.0) * 0.1;
                    float alpha = uOpacity * pulse * (0.5 + fresnel * 0.5);
                    gl_FragColor = vec4(uColor * (1.0 + fresnel * 0.3), alpha);
                }
            `,
            transparent: true,
            wireframe: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }, []);

    // ─── Neural particle field ──────────────────────────────
    const particleData = useMemo(() => {
        const count = 800;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2.5 + Math.random() * 3.5;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            sizes[i] = 0.01 + Math.random() * 0.03;
        }

        return { positions, sizes, count };
    }, []);

    // ─── Spark particles (fast, bright dots that fly through) ──
    const sparkData = useMemo(() => {
        const count = 30;
        const sparks = [];
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            sparks.push({
                speed: 0.3 + Math.random() * 0.6,
                radius: 2 + Math.random() * 3,
                theta,
                phi,
                phase: Math.random() * Math.PI * 2,
            });
        }
        return sparks;
    }, []);

    // ─── Animation frame ────────────────────────────────────
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // Update shader uniforms
        if (wireframeMaterial.uniforms) {
            wireframeMaterial.uniforms.uTime.value = t;
        }
        if (innerWireframeMaterial.uniforms) {
            innerWireframeMaterial.uniforms.uTime.value = t;
        }

        // Outer wireframe breathing + slow rotation
        if (outerRef.current) {
            const breathe = 1 + Math.sin(t * 0.4) * 0.015;
            outerRef.current.scale.setScalar(breathe);
            outerRef.current.rotation.y = t * 0.025;
            outerRef.current.rotation.x = Math.sin(t * 0.15) * 0.03;
        }

        // Inner sphere
        if (innerRef.current) {
            const innerBreathe = 1 + Math.sin(t * 0.5 + 0.5) * 0.018;
            innerRef.current.scale.setScalar(innerBreathe);
            innerRef.current.rotation.y = -t * 0.018;
            innerRef.current.rotation.z = t * 0.012;
        }

        // Energy core pulsing
        if (coreRef.current) {
            const pulse = 0.8 + Math.sin(t * 1.2) * 0.15 + Math.sin(t * 2.7) * 0.05;
            coreRef.current.scale.setScalar(pulse);
            coreRef.current.material.opacity = 0.2 + Math.sin(t * 1.5) * 0.1;
        }
        if (coreGlowRef.current) {
            const gPulse = 1.2 + Math.sin(t * 0.8) * 0.3;
            coreGlowRef.current.scale.setScalar(gPulse);
            coreGlowRef.current.material.opacity = 0.08 + Math.sin(t * 1.2) * 0.04;
        }

        // Orbital rings — each on a different axis, different speed
        if (ring1Ref.current) {
            ring1Ref.current.rotation.z = t * 0.12;
            ring1Ref.current.rotation.x = Math.PI / 2.5;
            ring1Ref.current.material.opacity = 0.12 + Math.sin(t * 0.7) * 0.06;
        }
        if (ring2Ref.current) {
            ring2Ref.current.rotation.z = -t * 0.08;
            ring2Ref.current.rotation.x = Math.PI / 3.5;
            ring2Ref.current.rotation.y = Math.PI / 5;
            ring2Ref.current.material.opacity = 0.1 + Math.sin(t * 0.5 + 1) * 0.05;
        }
        if (ring3Ref.current) {
            ring3Ref.current.rotation.z = t * 0.15;
            ring3Ref.current.rotation.x = Math.PI / 4;
            ring3Ref.current.rotation.y = -Math.PI / 3;
            ring3Ref.current.material.opacity = 0.08 + Math.sin(t * 0.9 + 2) * 0.04;
        }

        // Aurora bands — subtle sine wave glow
        auroraRefs.current.forEach((ref, i) => {
            if (ref) {
                const phase = i * Math.PI * 0.6;
                const s = 1 + Math.sin(t * 0.3 + phase) * 0.08;
                ref.scale.setScalar(s);
                ref.rotation.y = t * (0.02 + i * 0.008);
                ref.rotation.x = Math.sin(t * 0.2 + phase) * 0.1;
                ref.material.opacity = 0.04 + Math.sin(t * 0.5 + phase) * 0.02;
            }
        });

        // Animate particles
        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array;
            for (let i = 0; i < particleData.count; i++) {
                const i3 = i * 3;
                const angle = t * 0.08 + i * 0.012;
                positions[i3] += Math.sin(angle) * 0.0008;
                positions[i3 + 1] += Math.cos(angle * 0.7) * 0.0008;
                positions[i3 + 2] += Math.sin(angle * 1.3) * 0.0008;

                const newDist = Math.sqrt(
                    positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
                );
                if (newDist > 6.5 || newDist < 2) {
                    const scale = (2.5 + Math.random() * 3) / newDist;
                    positions[i3] *= scale;
                    positions[i3 + 1] *= scale;
                    positions[i3 + 2] *= scale;
                }
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Spark particles — fast moving bright dots
        sparkRefs.current.forEach((ref, i) => {
            if (ref && sparkData[i]) {
                const s = sparkData[i];
                const progress = ((t * s.speed + s.phase) % (Math.PI * 2));
                const r = s.radius;
                ref.position.set(
                    r * Math.sin(progress) * Math.cos(s.theta),
                    r * Math.sin(progress) * Math.sin(s.theta) * 0.8,
                    r * Math.cos(progress)
                );
                // Fade in/out based on position
                const brightness = Math.abs(Math.sin(progress));
                ref.material.opacity = brightness * 0.7;
                ref.scale.setScalar(0.5 + brightness * 0.5);
            }
        });
    });

    return (
        <group>
            {/* ─── Outer Brain Shell (Glowing Wireframe) ─────────── */}
            <mesh ref={outerRef} material={wireframeMaterial}>
                <icosahedronGeometry args={[5.5, 3]} />
            </mesh>

            {/* ─── Secondary Wireframe Layer ─────────────────── */}
            <mesh rotation={[0.3, 0.5, 0]} ref={innerRef} material={innerWireframeMaterial}>
                <icosahedronGeometry args={[5.2, 2]} />
            </mesh>

            {/* ─── Inner Glow Sphere (volumetric fill) ──────────── */}
            <mesh>
                <sphereGeometry args={[4.8, 32, 32]} />
                <meshBasicMaterial
                    color="#051020"
                    transparent
                    opacity={0.12}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* ─── Wireframe Glow Halo (additive bloom around edges) ── */}
            <mesh>
                <icosahedronGeometry args={[5.7, 3]} />
                <meshBasicMaterial
                    color="#00d4ff"
                    wireframe
                    transparent
                    opacity={0.06}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ─── Energy Core (pulsing center) ────────────────── */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.8, 24, 24]} />
                <meshBasicMaterial
                    color="#00d4ff"
                    transparent
                    opacity={0.2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ─── Core Outer Glow ──────────────────────────────── */}
            <mesh ref={coreGlowRef}>
                <sphereGeometry args={[1.8, 16, 16]} />
                <meshBasicMaterial
                    color="#7c3aed"
                    transparent
                    opacity={0.08}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ─── Orbital Energy Rings ─────────────────────────── */}
            <mesh ref={ring1Ref}>
                <torusGeometry args={[3.8, 0.02, 8, 80]} />
                <meshBasicMaterial
                    color="#00d4ff"
                    transparent
                    opacity={0.12}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            <mesh ref={ring2Ref}>
                <torusGeometry args={[3.2, 0.015, 8, 80]} />
                <meshBasicMaterial
                    color="#7c3aed"
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            <mesh ref={ring3Ref}>
                <torusGeometry args={[4.2, 0.012, 8, 80]} />
                <meshBasicMaterial
                    color="#00bfa6"
                    transparent
                    opacity={0.08}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ─── Aurora Glow Bands ────────────────────────────── */}
            {[
                { radius: 3.5, color: '#00d4ff', rotation: [0, 0, 0] },
                { radius: 4.0, color: '#7c3aed', rotation: [Math.PI / 4, 0, 0] },
                { radius: 3.0, color: '#00bfa6', rotation: [0, Math.PI / 3, Math.PI / 6] },
            ].map((band, i) => (
                <mesh
                    key={`aurora-${i}`}
                    ref={(el) => (auroraRefs.current[i] = el)}
                    rotation={band.rotation}
                >
                    <torusGeometry args={[band.radius, 0.5, 4, 60]} />
                    <meshBasicMaterial
                        color={band.color}
                        transparent
                        opacity={0.04}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}

            {/* ─── Neural Particle Field ─────────────────────── */}
            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        array={particleData.positions}
                        count={particleData.count}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color="#00d4ff"
                    size={0.04}
                    transparent
                    opacity={0.3}
                    sizeAttenuation
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </points>

            {/* ─── Flying Spark Particles ──────────────────────── */}
            {sparkData.map((_, i) => (
                <mesh key={`spark-${i}`} ref={(el) => (sparkRefs.current[i] = el)}>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshBasicMaterial
                        color={i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#7c3aed' : '#00bfa6'}
                        transparent
                        opacity={0.6}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            ))}

            {/* ─── Lighting for 3D node visibility ────────────────── */}
            <ambientLight intensity={0.35} color="#8ab4d0" />
            <pointLight position={[0, 0, 0]} intensity={0.8} color="#00d4ff" distance={15} />
            <pointLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" distance={20} />
            <pointLight position={[-5, -3, 4]} intensity={0.3} color="#7c3aed" distance={15} />
            <pointLight position={[0, 3, 0]} intensity={0.25} color="#7c3aed" distance={10} />
            <pointLight position={[0, -3, 0]} intensity={0.2} color="#00bfa6" distance={10} />
            <directionalLight position={[3, 4, 5]} intensity={0.3} color="#e0f0ff" />
            <directionalLight position={[-3, -2, -4]} intensity={0.15} color="#a0b0ff" />
        </group>
    );
}

export { BRAIN_REGIONS };
