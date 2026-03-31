// ─── Notes Routes ───────────────────────────────────────────────────────────
// Notes are attached to knowledge nodes. Users can add rich text and images.
//
// GET    /api/notes/:nodeId        → Get all notes for a node
// POST   /api/notes/:nodeId        → Create a new note
// PUT    /api/notes/:noteId        → Update a note
// DELETE /api/notes/:noteId        → Delete a note
// POST   /api/notes/:nodeId/suggest → AI suggests related nodes from notes

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL } from '../lib/groq.js';

const router = Router();


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/notes/upload/image
// Upload an image to Supabase Storage and return a permanent URL
// This must be ABOVE the /:nodeId routes to avoid route conflicts
// ═══════════════════════════════════════════════════════════════════════════

router.post('/upload/image', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { base64, mimeType, nodeId } = req.body;

        if (!base64 || !mimeType) {
            return res.status(400).json({ error: 'base64 and mimeType are required' });
        }

        // Convert base64 to buffer (strip data URL prefix if present)
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const buffer = Buffer.from(base64Data, 'base64');

        // Check file size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 5MB)' });
        }

        // Generate unique filename
        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `${userId}/${nodeId || 'general'}/${uuid()}.${ext}`;

        // Ensure the bucket exists (create if not)
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = (buckets || []).some(b => b.name === 'note-images');
        if (!bucketExists) {
            await supabase.storage.createBucket('note-images', {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
            });
            console.log('📦 Created note-images storage bucket');
        }

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('note-images')
            .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) throw error;

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from('note-images')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        console.log(`🖼  Image uploaded: ${fileName}`);

        res.json({ url: publicUrl, path: fileName });
    } catch (err) {
        console.error('Image upload error:', err);
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/notes/:nodeId
// Get all notes for a specific knowledge node
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:nodeId', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { nodeId } = req.params;

        const { data, error } = await supabase
            .from('node_notes')
            .select('*')
            .eq('node_id', nodeId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ notes: data || [] });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/notes/:nodeId
// Create a new note attached to a node
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:nodeId', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { nodeId } = req.params;
        const { content, images } = req.body;

        if ((!content || typeof content !== 'string' || content.trim().length === 0) && (!images || images.length === 0)) {
            return res.status(400).json({ error: 'Content or images are required.' });
        }

        // Verify the node belongs to this user
        const { data: node, error: nodeErr } = await supabase
            .from('knowledge_nodes')
            .select('id')
            .eq('id', nodeId)
            .eq('user_id', userId)
            .single();

        if (nodeErr || !node) {
            return res.status(404).json({ error: 'Node not found.' });
        }

        const noteId = uuid();
        const now = new Date().toISOString();

        const note = {
            id: noteId,
            node_id: nodeId,
            user_id: userId,
            content: (content || '').trim(),
            images: images || [],
            created_at: now,
            updated_at: now,
        };

        const { data: savedNote, error } = await supabase
            .from('node_notes')
            .insert(note)
            .select()
            .single();

        if (error) throw error;

        console.log(`📝 Note added to node ${nodeId}`);
        res.status(201).json({ note: savedNote });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/notes/:noteId
// Update an existing note
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:noteId', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { noteId } = req.params;
        const { content, images } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (content !== undefined) updates.content = content.trim();
        if (images !== undefined) updates.images = images;

        const { data, error } = await supabase
            .from('node_notes')
            .update(updates)
            .eq('id', noteId)
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
// DELETE /api/notes/:noteId
// Delete a note
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:noteId', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { noteId } = req.params;

        const { error } = await supabase
            .from('node_notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`🗑️ Note ${noteId} deleted`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/notes/:nodeId/suggest
// AI reads notes for a node and suggests related knowledge nodes
// Only creates nodes if user approves (client sends approved suggestions)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:nodeId/suggest', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { nodeId } = req.params;

        // Get the original node
        const { data: node, error: nodeErr } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', userId)
            .single();

        if (nodeErr || !node) {
            return res.status(404).json({ error: 'Node not found.' });
        }

        // Get all notes for this node
        const { data: notes } = await supabase
            .from('node_notes')
            .select('content')
            .eq('node_id', nodeId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (!notes || notes.length === 0) {
            return res.json({ suggestions: [] });
        }

        const notesText = notes.map(n => n.content).join('\n\n');

        // Get existing nodes to avoid duplicates
        const { data: existingNodes } = await supabase
            .from('knowledge_nodes')
            .select('title, topic_category')
            .eq('user_id', userId);

        const existingTitles = (existingNodes || []).map(n => n.title.toLowerCase());

        // Use Groq (Llama 3.3 70B) to suggest related knowledge topics
        const prompt = `You are analyzing a student's notes about "${node.title}" (category: ${node.topic_category}).

Here are their notes:
"""
${notesText}
"""

Based on these notes, suggest 2-4 new knowledge topics that:
1. Are directly related to what the student is learning
2. Would deepen their understanding
3. Are NOT already in their brain: ${existingTitles.join(', ')}
4. Are specific enough to be useful (not too broad)

For each suggestion, provide:
- title: A concise topic name
- content: A 2-3 sentence explanation of what this topic covers and why it relates
- category: One of: Science, Mathematics, History, Technology, Philosophy, Art, Language, Business, Health, Other

Respond with JSON in this exact format:
{"suggestions": [{"title": "...", "content": "...", "category": "..."}]}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a precise AI that responds with valid JSON only. No preamble.' },
                { role: 'user', content: prompt },
            ],
            model: GROQ_MODEL,
            temperature: 0.4,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
        });

        const text = chatCompletion.choices[0]?.message?.content || '{"suggestions": []}';

        let suggestions = [];
        try {
            const parsed = JSON.parse(text);
            suggestions = parsed.suggestions || parsed.results || [];
        } catch (e) {
            console.warn('⚠️ Could not parse AI suggestions:', e.message);
            suggestions = [];
        }

        // Filter out any that match existing titles
        suggestions = suggestions.filter(s =>
            s.title && !existingTitles.includes(s.title.toLowerCase())
        );

        console.log(`💡 AI suggested ${suggestions.length} new topics from notes on "${node.title}"`);
        res.json({ suggestions });
    } catch (err) {
        next(err);
    }
});


export default router;
