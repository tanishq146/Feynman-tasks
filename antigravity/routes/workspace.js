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


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/workspace/notes
// Get all workspace notes for the user, ordered by updated_at
// ═══════════════════════════════════════════════════════════════════════════

router.get('/notes', async (req, res, next) => {
    try {
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
// ═══════════════════════════════════════════════════════════════════════════

router.post('/upload/image', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { base64, mimeType } = req.body;

        if (!base64 || !mimeType) {
            return res.status(400).json({ error: 'base64 and mimeType are required' });
        }

        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 5MB)' });
        }

        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `${userId}/workspace/${uuid()}.${ext}`;

        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = (buckets || []).some(b => b.name === 'note-images');
        if (!bucketExists) {
            await supabase.storage.createBucket('note-images', {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
            });
        }

        const { error } = await supabase.storage
            .from('note-images')
            .upload(fileName, buffer, { contentType: mimeType, upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('note-images')
            .getPublicUrl(fileName);

        console.log(`🖼️ Workspace image uploaded: ${fileName}`);
        res.json({ url: urlData.publicUrl });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/upload/voice
// Upload a voice recording for a workspace note
// ═══════════════════════════════════════════════════════════════════════════

router.post('/upload/voice', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { base64, mimeType, duration } = req.body;

        if (!base64) {
            return res.status(400).json({ error: 'base64 audio data is required' });
        }

        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'Audio too large (max 10MB)' });
        }

        const ext = (mimeType || 'audio/webm').split('/')[1]?.split(';')[0] || 'webm';
        const fileName = `${userId}/voice/${uuid()}.${ext}`;

        // Ensure voice bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = (buckets || []).some(b => b.name === 'voice-notes');
        if (!bucketExists) {
            await supabase.storage.createBucket('voice-notes', {
                public: true,
                fileSizeLimit: 10 * 1024 * 1024,
                allowedMimeTypes: ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'],
            });
        }

        const { error } = await supabase.storage
            .from('voice-notes')
            .upload(fileName, buffer, { contentType: mimeType || 'audio/webm', upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('voice-notes')
            .getPublicUrl(fileName);

        console.log(`🎤 Voice note uploaded: ${fileName} (${duration || '?'}s)`);
        res.json({ url: urlData.publicUrl, duration });
    } catch (err) {
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
