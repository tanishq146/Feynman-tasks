/**
 * SpaceEnvironment — ultra-lightweight.
 * Just 2 subtle nebula blobs. All stars come from drei's <Stars> in BrainScene.
 * No per-frame loops, no particle systems.
 */
import * as THREE from 'three';

export default function SpaceEnvironment() {
    return (
        <group>
            <mesh position={[-20, 12, -35]}>
                <sphereGeometry args={[14, 8, 8]} />
                <meshBasicMaterial
                    color="#120830"
                    transparent opacity={0.04}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false} side={THREE.BackSide}
                />
            </mesh>
            <mesh position={[25, -8, -40]}>
                <sphereGeometry args={[18, 8, 8]} />
                <meshBasicMaterial
                    color="#081830"
                    transparent opacity={0.03}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false} side={THREE.BackSide}
                />
            </mesh>
        </group>
    );
}
