// ─── Decay Service ──────────────────────────────────────────────────────────
// Implements the Ebbinghaus Forgetting Curve.
//
// Formula: current_strength = 100 × e^(−decay_rate × days_since_last_review)
//
// Strength is NEVER stored permanently — it's always calculated fresh.
// This is the heartbeat of Antigravity: knowledge decays unless you fight for it.

/**
 * Calculate the current memory strength of a knowledge node.
 * @param {number} decayRate - The node's decay rate (0.03 – 0.15)
 * @param {string|Date} lastReviewedAt - ISO timestamp of last review
 * @returns {number} Strength value between 0 and 100
 */
export function calculateStrength(decayRate, lastReviewedAt) {
    const now = new Date();
    const lastReview = new Date(lastReviewedAt);
    const msSinceReview = now.getTime() - lastReview.getTime();
    const daysSinceReview = msSinceReview / (1000 * 60 * 60 * 24);

    // Ebbinghaus forgetting curve
    const strength = 100 * Math.exp(-decayRate * daysSinceReview);

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, parseFloat(strength.toFixed(2))));
}

/**
 * Determine the memory status based on current strength.
 * @param {number} strength - Current strength value (0–100)
 * @returns {'healthy' | 'fading' | 'critical' | 'forgotten'}
 */
export function getMemoryStatus(strength) {
    if (strength >= 70) return 'healthy';
    if (strength >= 30) return 'fading';
    if (strength >= 10) return 'critical';
    return 'forgotten';
}

/**
 * Enrich a raw database node with dynamically calculated strength and status.
 * This is the function you call before returning any node to the frontend.
 * @param {object} node - Raw node from database
 * @returns {object} Node with `current_strength` and `status` fields added
 */
export function enrichNodeWithStrength(node) {
    const currentStrength = calculateStrength(node.decay_rate, node.last_reviewed_at);
    const status = getMemoryStatus(currentStrength);

    return {
        ...node,
        current_strength: currentStrength,
        status,
    };
}

/**
 * Calculate the reduced decay rate after a review.
 * Each review makes the memory 10% stickier.
 * @param {number} currentDecayRate - The current decay rate
 * @returns {number} New decay rate (reduced by 10%)
 */
export function reduceDecayRate(currentDecayRate) {
    // Minimum decay rate of 0.005 — nothing is truly permanent, but it gets close
    const newRate = currentDecayRate * 0.9;
    return Math.max(0.005, parseFloat(newRate.toFixed(6)));
}
