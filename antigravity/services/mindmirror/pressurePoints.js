// ═══════════════════════════════════════════════════════════════════════════
// pressurePoints.js — Pressure Point Detector
//
// Identifies "pressure points" — topics the user keeps returning to
// (occurrence_count >= 3) that have never been marked as resolved.
// These are the unfinished loops in their mind that demand attention.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js';

/**
 * Detect pressure points for a user.
 * A pressure point is a mind node with:
 *   - occurrence_count >= 3
 *   - resolved = false
 *
 * @param {string} userId
 * @returns {Promise<Array>} - Array of pressure point nodes, sorted by strength desc
 */
export async function detectPressurePoints(userId) {
    console.log(`🪞 Pressure: Checking pressure points for user ${userId}...`);

    const { data, error } = await supabase
        .from('mind_nodes')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false)
        .gte('occurrence_count', 3)
        .order('strength', { ascending: false });

    if (error) {
        console.error('🪞 Pressure: Failed to query pressure points:', error.message);
        return [];
    }

    const points = data || [];

    if (points.length > 0) {
        console.log(`🪞 Pressure: ${points.length} pressure point(s) detected:`);
        for (const p of points) {
            console.log(`  🔴 "${p.label}" (${p.type}, seen ${p.occurrence_count}x, strength: ${p.strength.toFixed(2)})`);
        }
    } else {
        console.log('🪞 Pressure: No pressure points detected');
    }

    return points;
}


/**
 * Mark a pressure point as resolved.
 *
 * @param {string} userId
 * @param {string} nodeId
 * @returns {Promise<boolean>}
 */
export async function resolvePressurePoint(userId, nodeId) {
    const { error } = await supabase
        .from('mind_nodes')
        .update({ resolved: true })
        .eq('id', nodeId)
        .eq('user_id', userId);

    if (error) {
        console.error('🪞 Pressure: Failed to resolve node:', error.message);
        return false;
    }

    console.log(`🪞 Pressure: Node ${nodeId} marked as resolved`);
    return true;
}
