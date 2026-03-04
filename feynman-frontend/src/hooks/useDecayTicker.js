import { useEffect, useRef } from 'react';
import useBrainStore from '../store/brainStore';

/**
 * Ebbinghaus Forgetting Curve — client-side real-time calculation.
 * Formula: strength = 100 × e^(−decayRate × daysSinceReview)
 */
function calculateStrength(decayRate, lastReviewedAt) {
    const now = Date.now();
    const lastReview = new Date(lastReviewedAt).getTime();
    const daysSinceReview = (now - lastReview) / (1000 * 60 * 60 * 24);
    const strength = 100 * Math.exp(-decayRate * daysSinceReview);
    return Math.max(0, Math.min(100, parseFloat(strength.toFixed(2))));
}

function getStatus(strength) {
    if (strength >= 70) return 'healthy';
    if (strength >= 30) return 'fading';
    if (strength >= 10) return 'critical';
    return 'forgotten';
}

/**
 * Hook that recalculates all node strengths on the frontend every TICK_INTERVAL ms.
 * This makes the forgetting curve visible in real-time — nodes decay before your eyes.
 */
export function useDecayTicker(tickInterval = 10000) {
    const nodes = useBrainStore((s) => s.nodes);
    const setNodes = useBrainStore((s) => s.setNodes);
    const updateNode = useBrainStore((s) => s.updateNode);
    const selectedNodeId = useBrainStore((s) => s.selectedNodeId);
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;

    useEffect(() => {
        const interval = setInterval(() => {
            const currentNodes = nodesRef.current;
            if (!currentNodes || currentNodes.length === 0) return;

            let changed = false;
            const updatedNodes = currentNodes.map((node) => {
                if (!node.decay_rate || !node.last_reviewed_at) return node;

                const newStrength = calculateStrength(node.decay_rate, node.last_reviewed_at);
                const newStatus = getStatus(newStrength);

                // Only update if the strength actually changed (at least 0.01% difference)
                if (Math.abs(newStrength - (node.current_strength || 100)) >= 0.01) {
                    changed = true;
                    return {
                        ...node,
                        current_strength: newStrength,
                        status: newStatus,
                    };
                }
                return node;
            });

            if (changed) {
                setNodes(updatedNodes);

                // Also update selectedNode if it changed
                const selectedId = useBrainStore.getState().selectedNodeId;
                if (selectedId) {
                    const updatedSelected = updatedNodes.find(n => n.id === selectedId);
                    if (updatedSelected) {
                        useBrainStore.setState({ selectedNode: updatedSelected });
                    }
                }
            }
        }, tickInterval);

        return () => clearInterval(interval);
    }, [tickInterval, setNodes]);
}

/**
 * Calculate forgetting curve data points for visualization.
 * Returns an array of { day, strength } points showing projected decay.
 *
 * @param {number} decayRate - The node's decay rate
 * @param {string} lastReviewedAt - ISO timestamp of last review
 * @param {number} daysAhead - How many days into the future to project
 * @param {number} numPoints - Number of data points
 */
export function getForgettingCurveData(decayRate, lastReviewedAt, daysAhead = 30, numPoints = 60) {
    const now = Date.now();
    const lastReview = new Date(lastReviewedAt).getTime();
    const daysSinceReview = (now - lastReview) / (1000 * 60 * 60 * 24);

    const points = [];
    const totalDays = daysSinceReview + daysAhead;
    const step = totalDays / numPoints;

    for (let i = 0; i <= numPoints; i++) {
        const day = i * step;
        const strength = 100 * Math.exp(-decayRate * day);
        points.push({
            day: parseFloat(day.toFixed(2)),
            strength: Math.max(0, Math.min(100, parseFloat(strength.toFixed(2)))),
            isFuture: day > daysSinceReview,
        });
    }

    return {
        points,
        currentDayIndex: daysSinceReview,
        currentStrength: calculateStrength(decayRate, lastReviewedAt),
    };
}

/**
 * Get human-readable time until a node reaches a threshold.
 * @param {number} decayRate
 * @param {string} lastReviewedAt
 * @param {number} threshold - Target strength (e.g., 70 for "fading", 30 for "critical")
 * @returns {string} Human-readable time string
 */
export function timeUntilThreshold(decayRate, lastReviewedAt, threshold = 70) {
    // strength = 100 * e^(-decayRate * days)
    // threshold = 100 * e^(-decayRate * days)
    // days = -ln(threshold/100) / decayRate
    const daysToThreshold = -Math.log(threshold / 100) / decayRate;
    const now = Date.now();
    const lastReview = new Date(lastReviewedAt).getTime();
    const daysSinceReview = (now - lastReview) / (1000 * 60 * 60 * 24);
    const daysRemaining = daysToThreshold - daysSinceReview;

    if (daysRemaining <= 0) return 'now';

    if (daysRemaining < 1 / 24) {
        const mins = Math.round(daysRemaining * 24 * 60);
        return `${mins}m`;
    }
    if (daysRemaining < 1) {
        const hours = Math.round(daysRemaining * 24);
        return `${hours}h`;
    }
    if (daysRemaining < 30) {
        const days = Math.round(daysRemaining);
        return `${days}d`;
    }
    const months = Math.round(daysRemaining / 30);
    return `${months}mo`;
}
