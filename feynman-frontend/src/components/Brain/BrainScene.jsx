import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import BrainMesh from './BrainMesh';
import KnowledgeNode from './KnowledgeNode';
import ConnectionLine from './ConnectionLine';
import SpaceEnvironment from './SpaceEnvironment';
import useBrainStore from '../../store/brainStore';

function BrainContent() {
    const nodes = useBrainStore((s) => s.nodes);
    const edges = useBrainStore((s) => s.edges);

    return (
        <>
            {/* ─── Deep Space Star Layers ─────────────────── */}
            <Stars
                radius={100}
                depth={80}
                count={3000}
                factor={3}
                saturation={0.1}
                fade
                speed={0.2}
            />
            <Stars
                radius={60}
                depth={40}
                count={800}
                factor={5}
                saturation={0}
                fade
                speed={0.5}
            />

            {/* ─── Space Environment (nebulae, galaxies, shooting stars) ── */}
            <SpaceEnvironment />

            {/* ─── Brain Wireframe ───────────────────────── */}
            <BrainMesh />

            {/* ─── Connection Lines ──────────────────────── */}
            {edges.map((edge) => (
                <ConnectionLine key={edge.id} edge={edge} />
            ))}

            {/* ─── Knowledge Nodes ───────────────────────── */}
            {nodes.map((node) => (
                <KnowledgeNode key={node.id} node={node} />
            ))}
        </>
    );
}

function BrainControls() {
    const isDraggingNode = useBrainStore((s) => s.isDraggingNode);

    return (
        <OrbitControls
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.7}
            minDistance={6}
            maxDistance={30}
            enablePan={false}
            autoRotate={!isDraggingNode}
            autoRotateSpeed={0.15}
            enabled={!isDraggingNode}
        />
    );
}

export default function BrainScene() {
    const loading = useBrainStore((s) => s.loading);
    const isIngesting = useBrainStore((s) => s.isIngesting);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Canvas
                camera={{
                    position: [0, 2, 14],
                    fov: 50,
                    near: 0.1,
                    far: 200,
                }}
                gl={{
                    antialias: true,
                    alpha: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2,
                }}
                style={{ background: '#020408' }}
            >
                <Suspense fallback={null}>
                    <BrainContent />
                </Suspense>

                <BrainControls />

                {/* ─── Fog for depth ──────────────────────── */}
                <fog attach="fog" args={['#020408', 20, 50]} />
            </Canvas>

            {/* ─── Loading Overlay ──────────────────────── */}
            {loading && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(2, 4, 8, 0.9)',
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            border: '2px solid rgba(0, 212, 255, 0.15)',
                            borderTop: '2px solid #00d4ff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '16px',
                        }}
                    />
                    <div
                        style={{
                            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontSize: '16px',
                            color: '#4a9eba',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                        }}
                    >
                        Mapping your mind...
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* ─── Ingestion Indicator ──────────────────── */}
            {isIngesting && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 5,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            width: '60px',
                            height: '60px',
                            border: '2px solid rgba(0, 212, 255, 0.1)',
                            borderTop: '2px solid #00d4ff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                </div>
            )}
        </div>
    );
}
