// ─── Goals Routes ───────────────────────────────────────────────────────────
// Goals give meaning to knowledge. Without goals, the Feynman layer
// can't answer "how does this serve what you're trying to become?"
//
// POST /api/goals    → Create a new goal
// GET  /api/goals    → List all goals

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';

const router = Router();


// ─── POST /api/goals ────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
    try {
        const { goal_text } = req.body;

        if (!goal_text || typeof goal_text !== 'string' || goal_text.trim().length === 0) {
            return res.status(400).json({
                error: 'goal_text is required. Send { "goal_text": "I want to become a physicist" }',
            });
        }

        const goal = {
            id: uuid(),
            goal_text: goal_text.trim(),
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('user_goals')
            .insert(goal)
            .select()
            .single();

        if (error) throw error;

        console.log(`🎯 New goal: "${data.goal_text}"`);
        res.status(201).json(data);
    } catch (err) {
        next(err);
    }
});


// ─── GET /api/goals ─────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('user_goals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        next(err);
    }
});


export default router;
