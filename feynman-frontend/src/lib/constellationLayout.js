/**
 * constellationLayout.js
 *
 * Computes 3D positions for nodes in a constellation-style layout.
 * Nodes are grouped by topic_category into clusters, each cluster
 * is positioned in 3D space, and nodes within a cluster are arranged
 * in a loose, organic formation.
 */

// ─── Color palette for clusters ───────────────────────────────
const CLUSTER_PALETTE = [
    '#00d4ff', '#7c3aed', '#00bfa6', '#ff6b35', '#3b82f6',
    '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6',
    '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
];

/**
 * Deterministic hash for consistent positioning across reloads
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}

/**
 * Seeded random number generator (for deterministic layouts)
 */
function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

/**
 * Compute cluster centers using golden-angle spiral on a sphere
 * This spreads clusters evenly in 3D space
 */
function computeClusterCenters(clusterCount, baseRadius = 25) {
    const centers = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    // Scale radius based on cluster count for breathing room
    const radius = baseRadius + clusterCount * 2;

    for (let i = 0; i < clusterCount; i++) {
        const y = 1 - (i / (clusterCount - 1 || 1)) * 2; // -1 to 1
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;

        centers.push({
            x: Math.cos(theta) * radiusAtY * radius * 0.7,
            y: y * radius * 0.5,
            z: Math.sin(theta) * radiusAtY * radius * 0.7,
        });
    }

    return centers;
}

/**
 * Arrange nodes within a cluster in a 3D formation.
 * Uses a Fibonacci sphere distribution for even spacing.
 */
function arrangeNodesInCluster(nodes, clusterCenter, clusterIndex) {
    const count = nodes.length;
    if (count === 0) return [];

    // Single node goes to center
    if (count === 1) {
        return [{
            ...nodes[0],
            coordinates: { ...clusterCenter },
        }];
    }

    // Scale intra-cluster radius based on node count
    const intraRadius = Math.min(3 + Math.sqrt(count) * 1.5, 12);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const rng = seededRandom(hashString(`cluster-${clusterIndex}`));

    return nodes.map((node, i) => {
        const y = 1 - (i / (count - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;

        // Add slight randomness for organic feel
        const jitter = 0.3;
        const jx = (rng() - 0.5) * jitter;
        const jy = (rng() - 0.5) * jitter;
        const jz = (rng() - 0.5) * jitter;

        return {
            ...node,
            coordinates: {
                x: clusterCenter.x + Math.cos(theta) * radiusAtY * intraRadius + jx,
                y: clusterCenter.y + y * intraRadius * 0.6 + jy,
                z: clusterCenter.z + Math.sin(theta) * radiusAtY * intraRadius + jz,
            },
        };
    });
}

/**
 * Main layout function.
 *
 * Groups nodes by topic_category, computes cluster positions,
 * and assigns 3D coordinates to each node.
 *
 * @param {Array} nodes - Raw nodes from the backend
 * @returns {{ nodes: Array, clusters: Array }} - Nodes with updated coordinates + cluster metadata
 */
export function computeConstellationLayout(nodes) {
    if (!nodes || nodes.length === 0) {
        return { nodes: [], clusters: [] };
    }

    // ─── Group nodes by topic_category ────────────────────────
    const groups = {};
    const uncategorized = [];

    nodes.forEach(node => {
        const category = node.topic_category || node.brain_region || 'uncategorized';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(node);
    });

    const clusterNames = Object.keys(groups);
    const clusterCount = clusterNames.length;

    // ─── Compute cluster center positions ─────────────────────
    const centers = computeClusterCenters(clusterCount);

    // ─── Assign node positions within clusters ────────────────
    const layoutNodes = [];
    const clusters = [];

    clusterNames.forEach((name, index) => {
        const clusterNodes = groups[name];
        const center = centers[index];
        const color = CLUSTER_PALETTE[index % CLUSTER_PALETTE.length];

        // Arrange nodes around the cluster center
        const positioned = arrangeNodesInCluster(clusterNodes, center, index);
        layoutNodes.push(...positioned);

        // Compute cluster health metrics
        const avgStrength = clusterNodes.reduce((sum, n) => sum + (n.current_strength || 100), 0) / clusterNodes.length;
        const fadingCount = clusterNodes.filter(n => n.status === 'fading' || n.status === 'critical').length;

        clusters.push({
            id: `cluster-${name}`,
            name,
            label: formatClusterLabel(name),
            center,
            color,
            nodeCount: clusterNodes.length,
            nodeIds: clusterNodes.map(n => n.id),
            avgStrength,
            fadingCount,
            radius: Math.min(3 + Math.sqrt(clusterNodes.length) * 1.5, 12),
        });
    });

    return { nodes: layoutNodes, clusters };
}

/**
 * Format a cluster label for display
 */
function formatClusterLabel(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get the cluster a node belongs to
 */
export function getClusterForNode(nodeId, clusters) {
    return clusters.find(c => c.nodeIds.includes(nodeId)) || null;
}

/**
 * Determine LOD level based on camera distance to a cluster
 */
export function getLODLevel(cameraPosition, clusterCenter, clusterRadius) {
    const dx = cameraPosition.x - clusterCenter.x;
    const dy = cameraPosition.y - clusterCenter.y;
    const dz = cameraPosition.z - clusterCenter.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < clusterRadius * 3) return 'detail';    // Full node detail
    if (distance < clusterRadius * 8) return 'nodes';     // Show individual nodes
    return 'cluster';                                       // Show as single star
}

export { CLUSTER_PALETTE };
