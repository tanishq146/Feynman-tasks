// ─── Mind Mirror Routes ─────────────────────────────────────────────────────
// Journal API for the Mind Mirror feature.
// POST   /api/mindmirror/journal       → Save a journal entry
// GET    /api/mindmirror/journal       → Get all journal entries for user
// DELETE /api/mindmirror/journal/:id   → Delete a journal entry

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ─── Verify tables exist on first use ────────────────────────────────────────
let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    const { error } = await supabase
        .from('journal_entries')
        .select('id')
        .limit(1);
    if (error && error.code === '42P01') {
        console.error('❌ journal_entries table does not exist. Run the migration:');
        console.error('   migrations/add_mind_mirror.sql');
        throw new Error('journal_entries table not found. Run the migration SQL in Supabase dashboard.');
    }
    if (error) {
        console.warn('⚠️ journal_entries check returned error:', error.message);
        return;
    }
    tableReady = true;
}


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/journal
// Save a new journal entry
// ═══════════════════════════════════════════════════════════════════════════

router.post('/journal', async (req, res, next) => {
    try {
        await ensureTable();
        const userId = req.user.uid;
        const { content, mode } = req.body;

        // Validation
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'content is required and must be a non-empty string' });
        }

        const validModes = ['conscious', 'subconscious'];
        const entryMode = validModes.includes(mode) ? mode : 'conscious';

        // Count words
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

        const entryId = uuid();
        const now = new Date().toISOString();

        const entry = {
            id: entryId,
            user_id: userId,
            content: content.trim(),
            mode: entryMode,
            word_count: wordCount,
            created_at: now,
        };

        const { data, error } = await supabase
            .from('journal_entries')
            .insert(entry)
            .select()
            .single();

        if (error) throw error;

        console.log(`🪞 Mind Mirror: Journal entry saved [${entryMode}] (${wordCount} words)`);
        res.status(201).json({ entry: data });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/journal
// Get all journal entries for the authenticated user
// ═══════════════════════════════════════════════════════════════════════════

router.get('/journal', async (req, res, next) => {
    try {
        await ensureTable();
        const userId = req.user.uid;
        const { mode } = req.query;

        let query = supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Optional mode filter
        if (mode && ['conscious', 'subconscious'].includes(mode)) {
            query = query.eq('mode', mode);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ entries: data || [] });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/mindmirror/journal/:id
// Delete a journal entry
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/journal/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`🪞 Mind Mirror: Journal entry deleted: ${id}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


export default router;
