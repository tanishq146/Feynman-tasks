// ─── Engram Routes ──────────────────────────────────────────────────────────
// The thinking graph API. Ingests AI conversations, extracts thoughts,
// builds a living graph of understanding.
//
// POST   /api/engram/ingest          → Ingest raw conversation → extract thoughts
// GET    /api/engram/thoughts        → Get all thought nodes for user
// GET    /api/engram/graph           → Get full graph (thoughts + links)
// GET    /api/engram/thought/:id     → Get single thought with history
// GET    /api/engram/conversations   → Get all ingested conversations
// DELETE /api/engram/thought/:id     → Delete a thought
// DELETE /api/engram/conversation/:id → Delete a conversation

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { extractThoughts, findMatchingThought, detectThoughtLinks } from '../services/engram/extractor.js';
import { analyzeThinkingGraph, detectContradictions, detectGravityWells, analyzeVelocity } from '../services/engram/analyzer.js';
import { parseExportFile } from '../services/engram/importer.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max
const router = Router();


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/engram/ingest
// The gateway. Accepts raw AI conversation text, extracts thoughts,
// merges with existing thoughts or creates new ones, detects links.
// ═══════════════════════════════════════════════════════════════════════════

router.post('/ingest', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { content, source_ai, title } = req.body;

        if (!content || typeof content !== 'string' || content.trim().length < 10) {
            return res.status(400).json({ error: 'Conversation content is required (min 10 characters)' });
        }

        const validSources = ['claude', 'chatgpt', 'gemini', 'copilot', 'other'];
        const sourceAi = validSources.includes(source_ai) ? source_ai : 'other';

        // ── Step 1: Store the raw conversation ──────────────────────────
        const convId = uuid();
        const { error: convError } = await supabase
            .from('engram_conversations')
            .insert({
                id: convId,
                user_id: userId,
                source_ai: sourceAi,
                title: title || '',
                raw_content: content.trim(),
                extracted: false,
            });

        if (convError) throw convError;
        console.log(`📥 Engram: Conversation stored [${sourceAi}] — ${content.length} chars`);

        // ── Step 2: AI extracts atomic thoughts ─────────────────────────
        console.log('🧠 Engram: Extracting thoughts...');
        const extractedThoughts = await extractThoughts(content.trim(), sourceAi);

        if (extractedThoughts.length === 0) {
            // Mark conversation as extracted (even if empty)
            await supabase
                .from('engram_conversations')
                .update({ extracted: true })
                .eq('id', convId);

            return res.json({
                conversation_id: convId,
                thoughts_created: 0,
                thoughts_merged: 0,
                thoughts: [],
                message: 'No distinct thoughts could be extracted from this conversation.',
            });
        }

        // ── Step 3: Fetch existing thoughts for matching ────────────────
        const { data: existingThoughts } = await supabase
            .from('engram_thoughts')
            .select('*')
            .eq('user_id', userId);

        // ── Step 4: Process each extracted thought ──────────────────────
        const results = [];
        let created = 0;
        let merged = 0;

        for (const extracted of extractedThoughts) {
            // Try to find a matching existing thought
            const match = await findMatchingThought(extracted, existingThoughts || []);

            if (match) {
                // ── MERGE: Update existing thought ──
                const existing = match.existingThought;
                const updatedEssence = `${existing.essence}\n\n[Updated from ${sourceAi}]: ${extracted.essence}`;
                const updatedContext = `${existing.full_context || ''}\n\n--- From ${sourceAi} conversation ---\n${extracted.key_quotes?.join('\n') || extracted.essence}`;
                const updatedTags = [...new Set([...(existing.tags || []), ...(extracted.tags || [])])];

                // Determine new maturity
                const maturityLevels = ['seed', 'sprouting', 'growing', 'mature', 'evolved'];
                const currentIdx = maturityLevels.indexOf(existing.maturity || 'seed');
                const newMaturity = maturityLevels[Math.min(currentIdx + 1, maturityLevels.length - 1)];

                const { data: updated, error: updateError } = await supabase
                    .from('engram_thoughts')
                    .update({
                        essence: updatedEssence,
                        full_context: updatedContext,
                        tags: updatedTags,
                        maturity: newMaturity,
                        last_enriched: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (!updateError && updated) {
                    // Record history snapshot
                    await supabase.from('engram_thought_history').insert({
                        id: uuid(),
                        thought_id: existing.id,
                        conversation_id: convId,
                        snapshot: extracted.essence,
                        sophistication: extracted.sophistication,
                        delta_note: match.mergeSuggestion || `Enriched from ${sourceAi} conversation`,
                    });

                    results.push({ ...updated, action: 'merged' });
                    merged++;
                    console.log(`🔄 Engram: Merged into "${existing.title}" (→ ${newMaturity})`);
                }
            } else {
                // ── CREATE: New thought node ──
                const thoughtId = uuid();
                const { data: created_thought, error: createError } = await supabase
                    .from('engram_thoughts')
                    .insert({
                        id: thoughtId,
                        user_id: userId,
                        title: extracted.title,
                        essence: extracted.essence,
                        full_context: extracted.key_quotes?.join('\n') || '',
                        domain: extracted.domain,
                        tags: extracted.tags,
                        maturity: 'seed',
                        velocity_score: 0,
                    })
                    .select()
                    .single();

                if (!createError && created_thought) {
                    // Record initial history
                    await supabase.from('engram_thought_history').insert({
                        id: uuid(),
                        thought_id: thoughtId,
                        conversation_id: convId,
                        snapshot: extracted.essence,
                        sophistication: extracted.sophistication,
                        delta_note: `Initial extraction from ${sourceAi}`,
                    });

                    // Add to existing thoughts list for subsequent matching
                    existingThoughts?.push(created_thought);
                    results.push({ ...created_thought, action: 'created' });
                    created++;
                    console.log(`✨ Engram: Created "${extracted.title}" [${extracted.domain}]`);
                }
            }
        }

        // ── Step 5: Mark conversation as extracted ──────────────────────
        await supabase
            .from('engram_conversations')
            .update({ extracted: true })
            .eq('id', convId);

        // ── Step 6: Return immediately ──────────────────────────────────
        res.json({
            conversation_id: convId,
            thoughts_created: created,
            thoughts_merged: merged,
            thoughts: results,
        });

        // ── ASYNC: Detect links between new/merged thoughts ─────────────
        (async () => {
            try {
                const { data: allThoughts } = await supabase
                    .from('engram_thoughts')
                    .select('*')
                    .eq('user_id', userId);

                for (const thought of results) {
                    const others = (allThoughts || []).filter(t => t.id !== thought.id);
                    const links = await detectThoughtLinks(thought, others);

                    for (const link of links) {
                        // Check if link already exists
                        const { data: existing } = await supabase
                            .from('engram_links')
                            .select('id')
                            .or(`and(source_id.eq.${thought.id},target_id.eq.${link.targetThought.id}),and(source_id.eq.${link.targetThought.id},target_id.eq.${thought.id})`)
                            .limit(1);

                        if (existing && existing.length > 0) continue;

                        await supabase.from('engram_links').insert({
                            id: uuid(),
                            source_id: thought.id,
                            target_id: link.targetThought.id,
                            link_type: link.linkType,
                            strength: link.strength,
                            reason: link.reason,
                        });

                        console.log(`🔗 Engram: Linked "${thought.title}" ──${link.linkType}──▶ "${link.targetThought.title}"`);
                    }
                }
            } catch (err) {
                console.error('❌ Engram async link detection error:', err.message);
            }
        })();

    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/engram/thoughts
// All thought nodes for the current user.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/thoughts', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('engram_thoughts')
            .select('*')
            .eq('user_id', req.user.uid)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/engram/graph
// Full graph: thoughts as nodes + links as edges. Ready for visualization.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/graph', async (req, res, next) => {
    try {
        const userId = req.user.uid;

        const { data: thoughts, error: tError } = await supabase
            .from('engram_thoughts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (tError) throw tError;

        // Get all links where either source or target belongs to user's thoughts
        const thoughtIds = (thoughts || []).map(t => t.id);
        let links = [];

        if (thoughtIds.length > 0) {
            const { data: linkData, error: lError } = await supabase
                .from('engram_links')
                .select('*')
                .or(`source_id.in.(${thoughtIds.join(',')}),target_id.in.(${thoughtIds.join(',')})`);

            if (!lError) links = linkData || [];
        }

        res.json({
            thoughts: thoughts || [],
            links,
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/engram/thought/:id
// Single thought with full evolution history.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/thought/:id', async (req, res, next) => {
    try {
        const { data: thought, error } = await supabase
            .from('engram_thoughts')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Thought not found' });
            throw error;
        }

        // Get history
        const { data: history } = await supabase
            .from('engram_thought_history')
            .select('*')
            .eq('thought_id', thought.id)
            .order('recorded_at', { ascending: true });

        // Get connected links
        const { data: links } = await supabase
            .from('engram_links')
            .select('*')
            .or(`source_id.eq.${thought.id},target_id.eq.${thought.id}`);

        // Get titles of connected thoughts
        const connectedIds = (links || []).map(l =>
            l.source_id === thought.id ? l.target_id : l.source_id
        );

        let connectedThoughts = [];
        if (connectedIds.length > 0) {
            const { data } = await supabase
                .from('engram_thoughts')
                .select('id, title, domain, maturity')
                .in('id', connectedIds);
            connectedThoughts = data || [];
        }

        res.json({
            ...thought,
            history: history || [],
            links: (links || []).map(l => {
                const otherId = l.source_id === thought.id ? l.target_id : l.source_id;
                const other = connectedThoughts.find(t => t.id === otherId);
                return {
                    ...l,
                    connected_title: other?.title || 'Unknown',
                    connected_domain: other?.domain || 'general',
                    connected_maturity: other?.maturity || 'seed',
                };
            }),
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/engram/conversations
// All ingested conversations for the user.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/conversations', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('engram_conversations')
            .select('id, source_ai, title, extracted, ingested_at')
            .eq('user_id', req.user.uid)
            .order('ingested_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/engram/thought/:id
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/thought/:id', async (req, res, next) => {
    try {
        const { error } = await supabase
            .from('engram_thoughts')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.uid);

        if (error) throw error;
        res.json({ deleted: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/engram/conversation/:id
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/conversation/:id', async (req, res, next) => {
    try {
        const { error } = await supabase
            .from('engram_conversations')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.uid);

        if (error) throw error;
        res.json({ deleted: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/engram/analyze
// Full intelligence analysis — velocity, contradictions, gravity wells.
// This is the expensive one. Call sparingly.
// ═══════════════════════════════════════════════════════════════════════════

router.post('/analyze', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        console.log('🔬 Engram: Running full thinking graph analysis...');

        const analysis = await analyzeThinkingGraph(userId);

        console.log(`✅ Engram analysis complete: ${analysis.summary.total_thoughts} thoughts, ${analysis.summary.contradiction_count} contradictions, ${analysis.summary.gravity_well_count} gravity wells`);

        res.json(analysis);
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/engram/insights
// Lightweight insights — returns pre-computed analysis data.
// Fetches velocity scores from thoughts + links with contradiction type.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/insights', async (req, res, next) => {
    try {
        const userId = req.user.uid;

        // Fetch thoughts with velocity
        const { data: thoughts } = await supabase
            .from('engram_thoughts')
            .select('id, title, domain, maturity, velocity_score, last_enriched, created_at, updated_at, essence')
            .eq('user_id', userId)
            .order('velocity_score', { ascending: false });

        if (!thoughts || thoughts.length === 0) {
            return res.json({
                fastest_growing: [],
                stale_thoughts: [],
                contradiction_links: [],
                domain_breakdown: {},
                maturity_breakdown: {},
                total_thoughts: 0,
            });
        }

        // Fastest growing (high velocity)
        const fastestGrowing = thoughts
            .filter(t => t.velocity_score > 0.3)
            .slice(0, 5);

        // Stale thoughts (not enriched in 14+ days)
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const staleThoughts = thoughts
            .filter(t => t.last_enriched && t.last_enriched < twoWeeksAgo)
            .slice(0, 5);

        // Contradiction links
        const thoughtIds = thoughts.map(t => t.id);
        const { data: contradictionLinks } = await supabase
            .from('engram_links')
            .select('*')
            .eq('link_type', 'contradicts')
            .or(`source_id.in.(${thoughtIds.join(',')}),target_id.in.(${thoughtIds.join(',')})`)
            .limit(10);

        // Enrich contradiction links with thought titles
        const enrichedContradictions = (contradictionLinks || []).map(link => {
            const sourceThought = thoughts.find(t => t.id === link.source_id);
            const targetThought = thoughts.find(t => t.id === link.target_id);
            return {
                ...link,
                source_title: sourceThought?.title || 'Unknown',
                target_title: targetThought?.title || 'Unknown',
            };
        });

        // Domain breakdown
        const domainBreakdown = {};
        thoughts.forEach(t => {
            const d = t.domain || 'general';
            domainBreakdown[d] = (domainBreakdown[d] || 0) + 1;
        });

        // Maturity breakdown
        const maturityBreakdown = {};
        thoughts.forEach(t => {
            const m = t.maturity || 'seed';
            maturityBreakdown[m] = (maturityBreakdown[m] || 0) + 1;
        });

        res.json({
            fastest_growing: fastestGrowing,
            stale_thoughts: staleThoughts,
            contradiction_links: enrichedContradictions,
            domain_breakdown: domainBreakdown,
            maturity_breakdown: maturityBreakdown,
            total_thoughts: thoughts.length,
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/engram/thought/:id/velocity
// Analyze velocity for a single thought (cheaper than full analysis).
// ═══════════════════════════════════════════════════════════════════════════

router.post('/thought/:id/velocity', async (req, res, next) => {
    try {
        const { data: thought, error } = await supabase
            .from('engram_thoughts')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.uid)
            .single();

        if (error || !thought) return res.status(404).json({ error: 'Thought not found' });

        const { data: history } = await supabase
            .from('engram_thought_history')
            .select('*')
            .eq('thought_id', thought.id)
            .order('recorded_at', { ascending: true });

        const velocity = await analyzeVelocity(thought, history || []);

        // Update thought velocity score
        await supabase
            .from('engram_thoughts')
            .update({ velocity_score: velocity.velocity_score })
            .eq('id', thought.id);

        res.json({
            thought_id: thought.id,
            thought_title: thought.title,
            ...velocity,
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/engram/import/parse
// Upload an export file from Claude/ChatGPT/Gemini.
// Returns a list of conversations found so the user can pick which to ingest.
// ═══════════════════════════════════════════════════════════════════════════

router.post('/import/parse', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`📂 Engram import: Received ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        const forcePlatform = req.body.platform || null;
        const result = parseExportFile(req.file.buffer, forcePlatform);

        console.log(`✅ Engram import: Parsed ${result.total} conversations from ${result.platform}`);

        // Cache the parsed data for the ingest step
        if (!global._engramImportCache) global._engramImportCache = {};
        const importId = uuid();
        global._engramImportCache[importId] = {
            conversations: result.conversations,
            platform: result.platform,
            userId: req.user.uid,
            createdAt: Date.now(),
        };

        // Clean up old cache entries (> 30 min)
        for (const [key, val] of Object.entries(global._engramImportCache)) {
            if (Date.now() - val.createdAt > 30 * 60 * 1000) {
                delete global._engramImportCache[key];
            }
        }

        // Return conversations with preview (don't send full text to frontend)
        res.json({
            platform: result.platform,
            total: result.total,
            import_id: importId,
            conversations: result.conversations.map((c, i) => ({
                index: i,
                title: c.title,
                source: c.source,
                created_at: c.created_at,
                message_count: c.message_count,
                preview: c.preview,
                char_count: c.raw_text.length,
            })),
        });
    } catch (err) {
        console.error('❌ Engram import parse failed:', err.message);
        res.status(400).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/engram/import/ingest
// Ingest selected conversations from a previously parsed import.
// Body: { import_id, selected_indices: [0, 1, 5, ...] }
// ═══════════════════════════════════════════════════════════════════════════

router.post('/import/ingest', async (req, res, next) => {
    try {
        const { import_id, selected_indices } = req.body;
        const userId = req.user.uid;

        if (!import_id || !global._engramImportCache?.[import_id]) {
            return res.status(400).json({ error: 'Import session expired. Please re-upload the file.' });
        }

        const cache = global._engramImportCache[import_id];
        if (cache.userId !== userId) {
            return res.status(403).json({ error: 'Import session belongs to another user.' });
        }

        const indices = selected_indices || cache.conversations.map((_, i) => i);
        const toIngest = indices
            .filter(i => i >= 0 && i < cache.conversations.length)
            .map(i => cache.conversations[i]);

        if (toIngest.length === 0) {
            return res.status(400).json({ error: 'No conversations selected.' });
        }

        console.log(`🧠 Engram import: Ingesting ${toIngest.length} conversations from ${cache.platform}...`);

        // Fetch existing thoughts for merge detection
        const { data: existingThoughts } = await supabase
            .from('engram_thoughts')
            .select('id, title, essence, domain, maturity, tags, sophistication')
            .eq('user_id', userId);

        const results = [];
        let totalThoughts = 0;
        let totalMerged = 0;
        let totalNew = 0;

        // Process each conversation sequentially to avoid rate limits
        for (const conv of toIngest) {
            try {
                // Store conversation
                const convId = uuid();
                const { error: convInsertError } = await supabase.from('engram_conversations').insert({
                    id: convId,
                    user_id: userId,
                    source_ai: conv.source,
                    title: conv.title,
                    raw_content: conv.raw_text,
                });

                if (convInsertError) {
                    console.error(`  ❌ Failed to store conversation: ${convInsertError.message}`);
                    throw convInsertError;
                }

                // Extract thoughts
                const extracted = await extractThoughts(conv.raw_text, conv.source);
                console.log(`  ✨ "${conv.title}" → ${extracted.length} thoughts`);

                for (const thought of extracted) {
                    // Check for existing match
                    const match = await findMatchingThought(thought, existingThoughts || []);

                    if (match && match.confidence > 0.6) {
                        // Merge into existing — use the existingThought from the match result
                        const existing = match.existingThought;
                        if (existing) {
                            const maturityOrder = ['seed', 'sprouting', 'growing', 'mature', 'evolved'];
                            const currentIdx = maturityOrder.indexOf(existing.maturity || 'seed');
                            const newMaturity = currentIdx < maturityOrder.length - 1
                                ? maturityOrder[currentIdx + 1]
                                : existing.maturity;

                            const updatedEssence = `${existing.essence}\n\n[Updated from ${conv.source}]: ${thought.essence}`;
                            const updatedTags = [...new Set([...(existing.tags || []), ...(thought.tags || [])])];

                            await supabase
                                .from('engram_thoughts')
                                .update({
                                    essence: updatedEssence,
                                    maturity: newMaturity,
                                    tags: updatedTags,
                                    last_enriched: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', existing.id);

                            // Record history
                            await supabase.from('engram_thought_history').insert({
                                id: uuid(),
                                thought_id: existing.id,
                                conversation_id: convId,
                                snapshot: thought.essence,
                                sophistication: thought.sophistication || 0,
                                delta_note: `Merged from imported ${conv.source} conversation: "${conv.title}"`,
                            });

                            totalMerged++;
                        }
                    } else {
                        // Create new thought
                        const thoughtId = uuid();
                        const newThought = {
                            id: thoughtId,
                            user_id: userId,
                            title: thought.title,
                            essence: thought.essence,
                            domain: thought.domain,
                            maturity: 'seed',
                            tags: thought.tags,
                            velocity_score: 0,
                        };

                        const { error: thoughtInsertError } = await supabase.from('engram_thoughts').insert(newThought);

                        if (thoughtInsertError) {
                            console.error(`  ⚠ Failed to insert thought "${thought.title}": ${thoughtInsertError.message}`);
                            continue;
                        }

                        // Record first history snapshot
                        await supabase.from('engram_thought_history').insert({
                            id: uuid(),
                            thought_id: thoughtId,
                            conversation_id: convId,
                            snapshot: thought.essence,
                            sophistication: thought.sophistication || 0,
                            delta_note: `First encountered in imported ${conv.source} conversation: "${conv.title}"`,
                        });

                        // Add to existing thoughts for merge detection in subsequent convos
                        if (existingThoughts) {
                            existingThoughts.push(newThought);
                        }

                        totalNew++;
                    }
                    totalThoughts++;
                }

                results.push({
                    title: conv.title,
                    thoughts_extracted: extracted.length,
                    status: 'success',
                });

                // Small delay between conversations to avoid rate limits
                await new Promise(r => setTimeout(r, 500));

            } catch (err) {
                console.error(`  ❌ Failed: "${conv.title}" — ${err.message}`);
                results.push({
                    title: conv.title,
                    thoughts_extracted: 0,
                    status: 'error',
                    error: err.message,
                });
            }
        }

        // Clean up cache
        delete global._engramImportCache[import_id];

        // Trigger async link detection for all new thoughts
        setTimeout(async () => {
            try {
                const { data: allThoughts } = await supabase
                    .from('engram_thoughts')
                    .select('id, title, essence, domain')
                    .eq('user_id', userId);

                if (allThoughts && allThoughts.length >= 2) {
                    const links = await detectThoughtLinks(allThoughts);
                    for (const link of links) {
                        const { data: existing } = await supabase
                            .from('engram_links')
                            .select('id')
                            .eq('source_id', link.source_id)
                            .eq('target_id', link.target_id)
                            .maybeSingle();

                        if (!existing) {
                            await supabase.from('engram_links').insert({
                                id: uuid(),
                                source_id: link.source_id,
                                target_id: link.target_id,
                                link_type: link.link_type,
                                strength: link.strength,
                                reason: link.reason,
                                detected_at: new Date().toISOString(),
                            });
                        }
                    }
                    console.log(`🔗 Engram import: Detected ${links.length} links post-import`);
                }
            } catch (err) {
                console.error('⚠ Post-import link detection failed:', err.message);
            }
        }, 2000);

        console.log(`✅ Engram import complete: ${totalThoughts} thoughts (${totalNew} new, ${totalMerged} merged)`);

        res.json({
            success: true,
            total_conversations: toIngest.length,
            total_thoughts: totalThoughts,
            new_thoughts: totalNew,
            merged_thoughts: totalMerged,
            results,
        });
    } catch (err) {
        next(err);
    }
});


export default router;
