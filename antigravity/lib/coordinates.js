// ─── 3D Brain Coordinate Generator ──────────────────────────────────────────
// Maps brain regions to spatial coordinates INSIDE the anatomical brain lobes.
// ORB_RADIUS = 1.8 — tight, matching frontend KnowledgeNode.jsx

const ORB_RADIUS = 1.8;

// Every bound is intentionally narrow to keep nodes deep inside each lobe
const REGION_BOUNDS = {
    // Frontal lobe center: [0, 0.8, 1.4]
    prefrontal_cortex: { x: [-0.3, 0.3], y: [0.4, 0.9], z: [0.7, 1.2] },

    // Temporal lobe center: [0, -0.6, 0.2]
    temporal_lobe:  { x: [0.2, 0.8], y: [-0.4, 0], z: [-0.1, 0.4] },
    wernickes_area: { x: [-0.8, -0.2], y: [-0.4, 0], z: [-0.1, 0.4] },
    amygdala:       { x: [-0.3, 0.3], y: [-0.4, -0.1], z: [0, 0.3] },

    // Parietal lobe center: [0, 1.2, -0.8]
    hippocampus: { x: [-0.4, 0.4], y: [0.5, 1.0], z: [-0.8, -0.2] },

    // Occipital lobe center: [0, 0.1, -2.0]
    occipital_lobe: { x: [-0.3, 0.3], y: [-0.1, 0.2], z: [-1.5, -1.0] },

    // Cerebellum center: [0, -1.5, -1.4]
    cerebellum: { x: [-0.4, 0.4], y: [-1.3, -0.9], z: [-1.3, -0.8] },
};

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

function clampToOrb(x, y, z) {
    const dist = Math.sqrt(x * x + y * y + z * z);
    if (dist > ORB_RADIUS) {
        const scale = (ORB_RADIUS * 0.85) / dist;
        return { x: x * scale, y: y * scale, z: z * scale };
    }
    return { x, y, z };
}

export function generateCoordinates(brainRegion) {
    const bounds = REGION_BOUNDS[brainRegion];
    if (!bounds) {
        console.warn(`⚠️  Unknown brain region "${brainRegion}", defaulting to hippocampus`);
        return generateCoordinates('hippocampus');
    }

    const rawX = randomInRange(bounds.x[0], bounds.x[1]);
    const rawY = randomInRange(bounds.y[0], bounds.y[1]);
    const rawZ = randomInRange(bounds.z[0], bounds.z[1]);

    const clamped = clampToOrb(rawX, rawY, rawZ);

    return {
        x: parseFloat(clamped.x.toFixed(3)),
        y: parseFloat(clamped.y.toFixed(3)),
        z: parseFloat(clamped.z.toFixed(3)),
    };
}

export function getRegionBounds() {
    return { ...REGION_BOUNDS };
}
