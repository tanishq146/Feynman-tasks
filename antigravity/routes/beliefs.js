// ─── Belief Evolution Routes ────────────────────────────────────────────────
// GET /api/beliefs/evolution — Dashboard data for the Belief Evolution Tracker.
// GET /api/beliefs/all       — All beliefs.

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ─── GET /api/beliefs/evolution ─────────────────────────────────────────────
// Returns belief evolution dashboard data.
router.get('/evolution', async (req, res, next) => {
    try {
        // Total beliefs
        const { count: totalBeliefs } = await supabase
            .from('beliefs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.uid);

        // Total shifts (only meaningful ones: contradiction + evolution)
        const { count: totalShifts } = await supabase
            .from('belief_shifts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.uid)
            .in('shift_type', ['contradiction', 'evolution', 'refinement']);

        // Most evolving topic — the topic_tag with the most shifts
        const { data: allShifts } = await supabase
            .from('belief_shifts')
            .select(`
                id,
                shift_type,
                insight_summary,
                created_at,
                old_belief:old_belief_id ( id, belief_statement, topic_tag, confidence_score, category ),
                new_belief:new_belief_id ( id, belief_statement, topic_tag, confidence_score, category )
            `)
            .eq('user_id', req.user.uid)
            .order('created_at', { ascending: false });

        // Count shifts by topic
        const topicCounts = {};
        (allShifts || []).forEach(s => {
            const topic = s.new_belief?.topic_tag || s.old_belief?.topic_tag || 'unknown';
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        const mostEvolvingTopic = Object.entries(topicCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

        // Last 10 shift insights
        const recentShifts = (allShifts || []).slice(0, 10).map(s => ({
            id: s.id,
            shift_type: s.shift_type,
            insight_summary: s.insight_summary,
            created_at: s.created_at,
            old_belief: s.old_belief?.belief_statement || '',
            new_belief: s.new_belief?.belief_statement || '',
            topic: s.new_belief?.topic_tag || s.old_belief?.topic_tag || '',
            old_confidence: s.old_belief?.confidence_score || 0,
            new_confidence: s.new_belief?.confidence_score || 0,
        }));

        res.json({
            total_beliefs: totalBeliefs || 0,
            total_shifts: totalShifts || 0,
            most_evolving_topic: mostEvolvingTopic,
            recent_shifts: recentShifts,
        });
    } catch (err) {
        console.error('🧠 Belief evolution error:', err.message);
        next(err);
    }
});

// ─── GET /api/beliefs/all ───────────────────────────────────────────────────
// Returns all beliefs, newest first.
router.get('/all', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('beliefs')
            .select('*')
            .eq('user_id', req.user.uid)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        next(err);
    }
});

export default router;
