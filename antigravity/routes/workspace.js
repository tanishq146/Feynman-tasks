// ─── Workspace Routes ───────────────────────────────────────────────────────
// Full-featured note-taking workspace. Notes are standalone (not tied to a node).
// Feynman AI can analyze notes and suggest knowledge nodes to create.
//
// GET    /api/workspace/notes          → Get all workspace notes
// POST   /api/workspace/notes          → Create a new workspace note
// PUT    /api/workspace/notes/:id      → Update a workspace note
// DELETE /api/workspace/notes/:id      → Delete a workspace note
// POST   /api/workspace/notes/:id/pin  → Toggle pin status
// POST   /api/workspace/analyze        → AI analyzes notes → suggests nodes
// POST   /api/workspace/upload/image   → Upload image for workspace note
// POST   /api/workspace/upload/voice   → Upload voice recording

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL } from '../lib/groq.js';

const router = Router();

// ─── Verify table exists on first use ────────────────────────────────────────
let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    // Try a lightweight query to verify the table exists
    const { error } = await supabase
        .from('workspace_notes')
        .select('id')
        .limit(1);
    if (error && error.code === '42P01') {
        // Table does not exist — give a clear message
        console.error('❌ workspace_notes table does not exist. Run the migration:');
        console.error('   migrations/add_workspace_notes.sql');
        throw new Error('workspace_notes table not found. Run the migration SQL in Supabase dashboard.');
    }
    if (error) {
        // Don't set tableReady on error — allow retry on next request
        console.warn('⚠️ workspace_notes check returned error:', error.message);
        return;
    }
    tableReady = true;
}


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/workspace/notes
// Get all workspace notes for the user, ordered by updated_at
// ═══════════════════════════════════════════════════════════════════════════

router.get('/notes', async (req, res, next) => {
    try {
        await ensureTable();
        const userId = req.user.uid;

        const { data, error } = await supabase
            .from('workspace_notes')
            .select('*')
            .eq('user_id', userId)
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json({ notes: data || [] });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/notes
// Create a new workspace note
// ═══════════════════════════════════════════════════════════════════════════

router.post('/notes', async (req, res, next) => {
    try {
        await ensureTable();
        const userId = req.user.uid;
        const { title, content } = req.body;

        const noteId = uuid();
        const now = new Date().toISOString();

        const note = {
            id: noteId,
            user_id: userId,
            title: title || 'Untitled',
            content: content || '',
            images: [],
            voice_urls: [],
            is_pinned: false,
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await supabase
            .from('workspace_notes')
            .insert(note)
            .select()
            .single();

        if (error) throw error;

        console.log(`📓 Workspace note created: "${data.title}"`);
        res.status(201).json({ note: data });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/workspace/notes/:id
// Update a workspace note (title, content, images, voice_urls)
// ═══════════════════════════════════════════════════════════════════════════

router.put('/notes/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const { title, content, images, voice_urls } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (images !== undefined) updates.images = images;
        if (voice_urls !== undefined) updates.voice_urls = voice_urls;

        const { data, error } = await supabase
            .from('workspace_notes')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ note: data });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/workspace/notes/:id
// Delete a workspace note
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/notes/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        const { error } = await supabase
            .from('workspace_notes')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`🗑️ Workspace note deleted: ${id}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/notes/:id/pin
// Toggle pin status for a workspace note
// ═══════════════════════════════════════════════════════════════════════════

router.post('/notes/:id/pin', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        // Get current pin status
        const { data: current } = await supabase
            .from('workspace_notes')
            .select('is_pinned')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        const { data, error } = await supabase
            .from('workspace_notes')
            .update({ is_pinned: !current?.is_pinned })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ note: data });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/upload/image
// Upload an image for a workspace note
// Stores as base64 data URL directly (no Supabase Storage dependency)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/upload/image', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { base64, mimeType } = req.body;

        if (!base64 || !mimeType) {
            return res.status(400).json({ error: 'base64 and mimeType are required' });
        }

        // Validate it's actually a data URL or raw base64
        if (!base64.includes('base64')) {
            return res.status(400).json({ error: 'Invalid base64 data' });
        }

        // Validate size — the raw base64 string (before decoding) shouldn't exceed ~7MB
        // (base64 is ~33% larger than binary)
        if (base64.length > 7 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 5MB)' });
        }

        // The data URL IS the image — store it directly
        // Ensure it's a proper data URL format
        let dataUrl = base64;
        if (!dataUrl.startsWith('data:')) {
            dataUrl = `data:${mimeType};base64,${base64}`;
        }

        console.log(`🖼️ Workspace image received for user ${userId} (${Math.round(dataUrl.length / 1024)}KB)`);
        res.json({ url: dataUrl });
    } catch (err) {
        console.error('❌ Image upload error:', err);
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/upload/voice
// Upload a voice recording for a workspace note
// Stores as base64 data URL directly (no Supabase Storage dependency)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/upload/voice', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { base64, mimeType, duration } = req.body;

        if (!base64) {
            return res.status(400).json({ error: 'base64 audio data is required' });
        }

        // Validate size — base64 encoded audio shouldn't exceed ~14MB
        if (base64.length > 14 * 1024 * 1024) {
            return res.status(400).json({ error: 'Audio too large (max 10MB)' });
        }

        // The data URL IS the audio — store it directly
        let dataUrl = base64;
        if (!dataUrl.startsWith('data:')) {
            dataUrl = `data:${mimeType || 'audio/webm'};base64,${base64}`;
        }

        console.log(`🎤 Voice note received for user ${userId} (${duration || '?'}s, ${Math.round(dataUrl.length / 1024)}KB)`);
        res.json({ url: dataUrl, duration });
    } catch (err) {
        console.error('❌ Voice upload error:', err);
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/analyze
// AI reads selected workspace notes and suggests knowledge nodes to create
// ═══════════════════════════════════════════════════════════════════════════

router.post('/analyze', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { noteIds } = req.body;

        // Get the selected notes
        let query = supabase
            .from('workspace_notes')
            .select('*')
            .eq('user_id', userId);

        if (noteIds?.length > 0) {
            query = query.in('id', noteIds);
        }

        const { data: notes, error: notesErr } = await query
            .order('created_at', { ascending: true });

        if (notesErr) throw notesErr;

        if (!notes || notes.length === 0) {
            return res.json({ suggestions: [] });
        }

        // Get existing nodes to avoid duplicates
        const { data: existingNodes } = await supabase
            .from('knowledge_nodes')
            .select('title, topic_category')
            .eq('user_id', userId);

        const existingTitles = (existingNodes || []).map(n => n.title.toLowerCase());

        // Build context from notes
        const notesContext = notes.map(n => {
            let text = `## ${n.title}\n${n.content}`;
            if (n.images?.length > 0) text += `\n[${n.images.length} image(s) attached]`;
            if (n.voice_urls?.length > 0) text += `\n[${n.voice_urls.length} voice note(s) attached]`;
            return text;
        }).join('\n\n---\n\n');

        const prompt = `You are Feynman's knowledge extraction AI. Analyze these personal notes and identify distinct knowledge topics that should be added to the user's brain.

Notes content:
"""
${notesContext}
"""

Existing topics in their brain (avoid duplicates): ${existingTitles.slice(0, 50).join(', ') || 'none yet'}

For each knowledge topic you identify, provide:
- title: Clear, concise topic name
- content: 2-4 sentences explaining the concept (should be self-contained knowledge)
- category: One of: Science, Mathematics, History, Technology, Philosophy, Art, Language, Business, Health, Other
- source_note_title: Which note this came from
- confidence: How confident you are this is a distinct, valuable knowledge node (0.0-1.0)

Rules:
- Extract real knowledge, not meta-observations about the notes
- Each suggestion should be independently useful
- Focus on concepts, facts, techniques, or insights
- Aim for 2-6 suggestions depending on note richness
- Only suggest if confidence > 0.6

Respond with JSON: {"suggestions": [...]}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a precise AI that responds with valid JSON only.' },
                { role: 'user', content: prompt },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 2048,
            response_format: { type: 'json_object' },
        });

        const text = chatCompletion.choices[0]?.message?.content || '{"suggestions": []}';

        let suggestions = [];
        try {
            const parsed = JSON.parse(text);
            suggestions = (parsed.suggestions || [])
                .filter(s => s.title && s.confidence >= 0.6)
                .filter(s => !existingTitles.includes(s.title.toLowerCase()));
        } catch (e) {
            console.warn('⚠️ Could not parse AI workspace suggestions:', e.message);
        }

        console.log(`💡 AI extracted ${suggestions.length} knowledge topics from ${notes.length} workspace note(s)`);
        res.json({ suggestions });
    } catch (err) {
        next(err);
    }
});


export default router;
