// ─── Background Scheduler ───────────────────────────────────────────────────
// Runs every 6 hours to scan all knowledge nodes for decay.
// Emits WebSocket alerts when nodes cross the fading (< 30) or critical (< 10) thresholds.

import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { calculateStrength } from './decay.js';
import { broadcast } from './websocket.js';

/**
 * Start the decay-checking background job.
 * Runs every 6 hours: at 00:00, 06:00, 12:00, 18:00.
 */
export function startScheduler() {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('🕐 Running scheduled decay check...');
        await runDecayCheck();
    });

    // Also run once on startup (after a short delay to let things initialize)
    setTimeout(async () => {
        console.log('🕐 Running initial decay check...');
        await runDecayCheck();
    }, 5000);

    console.log('🕐 Decay scheduler started (runs every 6 hours)');
}

/**
 * Check all nodes for fading/critical status and emit WebSocket events.
 */
async function runDecayCheck() {
    try {
        const { data: nodes, error } = await supabase
            .from('knowledge_nodes')
            .select('id, title, decay_rate, last_reviewed_at');

        if (error) {
            console.error('❌ Decay check database error:', error.message);
            return;
        }

        if (!nodes || nodes.length === 0) {
            console.log('🕐 No nodes to check.');
            return;
        }

        let fadingCount = 0;
        let criticalCount = 0;

        for (const node of nodes) {
            const strength = calculateStrength(node.decay_rate, node.last_reviewed_at);

            if (strength < 10) {
                broadcast('node.critical', {
                    node_id: node.id,
                    strength,
                    title: node.title,
                });
                criticalCount++;
            } else if (strength < 30) {
                broadcast('node.fading', {
                    node_id: node.id,
                    strength,
                    title: node.title,
                });
                fadingCount++;
            }
        }

        console.log(
            `🕐 Decay check complete: ${nodes.length} nodes checked, ` +
            `${fadingCount} fading, ${criticalCount} critical`
        );
    } catch (err) {
        console.error('❌ Scheduler error:', err.message);
    }
}
