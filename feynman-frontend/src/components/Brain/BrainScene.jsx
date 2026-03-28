import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
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
            {/* ─── Deep Space Stars ─────────────────── */}
            <Stars
                radius={100}
                depth={60}
                count={800}
                factor={3}
                saturation={0.08}
                fade
                speed={0}
            />

            {/* ─── Space Environment (nebulae, galaxies, shooting stars) ── */}
            <SpaceEnvironment />

            {/* ─── Environment for reflections ─── */}
            <Environment preset="night" />

            {/* ─── Brain ───────────────────────────────────── */}
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
            autoRotateSpeed={0.1}
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
                    toneMappingExposure: 1.1,
                }}
                style={{ background: '#050510' }}
            >
                <Suspense fallback={null}>
                    <BrainContent />
                </Suspense>

                <BrainControls />

                {/* ─── Fog for atmosphere ──────────────── */}
                <fog attach="fog" args={['#050510', 22, 55]} />
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
                        background: 'rgba(5, 5, 16, 0.92)',
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            border: '2px solid rgba(124, 92, 224, 0.15)',
                            borderTop: '2px solid #7c5ce0',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '16px',
                        }}
                    />
                    <div
                        style={{
                            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontSize: '16px',
                            color: '#7c9eba',
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
                            border: '2px solid rgba(124, 92, 224, 0.1)',
                            borderTop: '2px solid #7c5ce0',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                </div>
            )}
        </div>
    );
}
