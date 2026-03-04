// ─── 3D Brain Coordinate Generator ──────────────────────────────────────────
// Maps brain regions to spatial coordinates INSIDE the 3D brain orb.
// The orb has a radius of 5.5. All nodes must stay within radius ~4.0
// to appear clearly inside the wireframe sphere.

const ORB_RADIUS = 4.0; // Max distance from center for any node

const REGION_BOUNDS = {
    hippocampus: { x: [-1.5, 1.5], y: [-2.5, -0.5], z: [-1, 1] },
    prefrontal_cortex: { x: [-1.5, 1.5], y: [1.5, 3.5], z: [0.5, 2] },
    amygdala: { x: [-2.5, -0.5], y: [-1.5, 0.5], z: [-0.5, 1] },
    cerebellum: { x: [-1.5, 1.5], y: [-3.5, -2], z: [-2, -0.5] },
    wernickes_area: { x: [-3, -1.5], y: [-0.5, 1.5], z: [-1, 1] },
    occipital_lobe: { x: [-1.5, 1.5], y: [-1.5, 0.5], z: [-3, -1.5] },
    temporal_lobe: { x: [1.5, 3], y: [-1, 1], z: [-1, 1] },
};

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

function jitter(value, amount = 0.3) {
    return value + (Math.random() * 2 - 1) * amount;
}

/**
 * Clamp a 3D point to fit within the orb radius.
 * If the point is outside the sphere, it gets pulled back to the surface.
 */
function clampToOrb(x, y, z) {
    const dist = Math.sqrt(x * x + y * y + z * z);
    if (dist > ORB_RADIUS) {
        const scale = ORB_RADIUS / dist;
        return { x: x * scale, y: y * scale, z: z * scale };
    }
    return { x, y, z };
}

/**
 * Generate a random 3D position within the specified brain region,
 * guaranteed to be inside the orb.
 * @param {string} brainRegion - One of the valid brain region keys
 * @returns {{ x: number, y: number, z: number }}
 */
export function generateCoordinates(brainRegion) {
    const bounds = REGION_BOUNDS[brainRegion];
    if (!bounds) {
        console.warn(`⚠️  Unknown brain region "${brainRegion}", defaulting to hippocampus`);
        return generateCoordinates('hippocampus');
    }

    const rawX = jitter(randomInRange(bounds.x[0], bounds.x[1]));
    const rawY = jitter(randomInRange(bounds.y[0], bounds.y[1]));
    const rawZ = jitter(randomInRange(bounds.z[0], bounds.z[1]));

    const clamped = clampToOrb(rawX, rawY, rawZ);

    return {
        x: parseFloat(clamped.x.toFixed(3)),
        y: parseFloat(clamped.y.toFixed(3)),
        z: parseFloat(clamped.z.toFixed(3)),
    };
}

/**
 * Returns the valid brain regions and their bounds.
 */
export function getRegionBounds() {
    return { ...REGION_BOUNDS };
}
