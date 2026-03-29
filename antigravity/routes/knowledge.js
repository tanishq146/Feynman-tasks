// ─── Knowledge Routes ───────────────────────────────────────────────────────
// The heart of Antigravity. Every endpoint that touches knowledge nodes lives here.
//
// POST   /api/knowledge/ingest          → Create a new knowledge node
// GET    /api/knowledge/all             → Get all nodes with live strength
// GET    /api/knowledge/fading          → Get all fading/critical nodes
// GET    /api/knowledge/:id             → Get a single node
// GET    /api/knowledge/:id/connections → Get all connections for a node
// POST   /api/knowledge/:id/review      → Review a node (resets strength)
// DELETE /api/knowledge/:id             → Delete a node

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { generateCoordinates } from '../lib/coordinates.js';
import { enrichNodeWithStrength, reduceDecayRate } from '../services/decay.js';
import { analyzeAndClassify, detectConnections, generateFeynmanAnalysis, generateFeynmanExtras } from '../services/ai.js';
import { broadcast } from '../services/websocket.js';
import { processBeliefForNode } from '../services/beliefs.js';

const router = Router();


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/knowledge/ingest
// The most important endpoint. This is where knowledge enters the brain.
// ═══════════════════════════════════════════════════════════════════════════

router.post('/ingest', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { content, brain_region: userRegion } = req.body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required. Send { "content": "your knowledge" }' });
        }

        const rawContent = content.trim();

        // ── Step 1: AI classifies and analyzes the content ──────────────
        console.log('🧠 Analyzing new knowledge...');
        const analysis = await analyzeAndClassify(rawContent);

        // If user chose a specific brain region, override AI classification
        const validRegions = ['hippocampus', 'prefrontal_cortex', 'amygdala', 'cerebellum', 'wernickes_area', 'occipital_lobe', 'temporal_lobe'];
        if (userRegion && validRegions.includes(userRegion)) {
            analysis.brain_region = userRegion;
            console.log(`🧠 User override → ${userRegion}`);
        } else {
            console.log(`🧠 Classified as: ${analysis.topic_category} → ${analysis.brain_region}`);
        }

        // ── Step 2: Generate 3D coordinates in the brain ────────────────
        const coords = generateCoordinates(analysis.brain_region);

        // ── Step 3: Build the knowledge node ────────────────────────────
        const nodeId = uuid();
        const now = new Date().toISOString();

        const node = {
            id: nodeId,
            user_id: userId,
            title: analysis.title,
            raw_content: rawContent,
            summary: analysis.summary,
            topic_category: analysis.topic_category,
            brain_region: analysis.brain_region,
            coord_x: coords.x,
            coord_y: coords.y,
            coord_z: coords.z,
            decay_rate: analysis.decay_rate,
            last_reviewed_at: now,
            created_at: now,
            tags: analysis.tags,
            feynman: null, // Filled asynchronously
        };

        // ── Step 4: Save to Supabase ────────────────────────────────────
        const { data: savedNode, error } = await supabase
            .from('knowledge_nodes')
            .insert(node)
            .select()
            .single();

        if (error) throw error;

        // ── Step 5: Broadcast creation event ────────────────────────────
        const enriched = enrichNodeWithStrength(savedNode);
        broadcast('node.created', enriched);

        // ── Step 6: Return immediately ──────────────────────────────────
        // The frontend gets the node right away. Feynman analysis arrives via WebSocket.
        console.log(`✅ Node created: "${enriched.title}" [${enriched.brain_region}]`);
        res.status(201).json(enriched);

        // ── ASYNC: Connection detection + Feynman layer ─────────────────
        // This runs in the background — the user doesn't wait for it.
        (async () => {
            try {
                // Fetch all existing nodes (excluding this one)
                const { data: existingNodes } = await supabase
                    .from('knowledge_nodes')
                    .select('id, title, summary, tags')
                    .eq('user_id', userId)
                    .neq('id', nodeId);

                // ── Detect connections ──
                let connectedNodes = [];

                if (existingNodes && existingNodes.length > 0) {
                    console.log(`🔗 Checking connections against ${existingNodes.length} existing nodes...`);
                    const connections = await detectConnections(savedNode, existingNodes);

                    for (const conn of connections) {
                        const targetNode = existingNodes[conn.index];
                        if (!targetNode) continue;

                        const edge = {
                            id: uuid(),
                            user_id: userId,
                            source_node_id: nodeId,
                            target_node_id: targetNode.id,
                            connection_type: conn.connection_type,
                            connection_strength: conn.strength,
                            reason: conn.reason || '',
                            created_at: new Date().toISOString(),
                        };

                        const { error: edgeError } = await supabase
                            .from('connection_edges')
                            .insert(edge);

                        if (!edgeError) {
                            console.log(`🔗 Connected: "${savedNode.title}" ──${conn.connection_type}──▶ "${targetNode.title}" (${conn.strength}%)`);
                            broadcast('connection.formed', {
                                ...edge,
                                source_title: savedNode.title,
                                target_title: targetNode.title,
                                reason: conn.reason,
                            });
                        }
                    }
                }

                // ── Gather data for Feynman analysis ──
                const { data: edges } = await supabase
                    .from('connection_edges')
                    .select('target_node_id, source_node_id')
                    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

                const connectedNodeIds = (edges || []).map(e =>
                    e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
                );

                if (connectedNodeIds.length > 0) {
                    const { data } = await supabase
                        .from('knowledge_nodes')
                        .select('id, title, summary')
                        .in('id', connectedNodeIds);
                    connectedNodes = data || [];
                }

                // Get user goals
                const { data: goals } = await supabase
                    .from('user_goals')
                    .select('goal_text')
                    .eq('user_id', userId);

                // ── Generate Feynman analysis ──
                console.log('🎓 Generating Feynman analysis...');
                const feynman = await generateFeynmanAnalysis(savedNode, connectedNodes, goals || []);

                // ── Generate Feynman extras (challenge, gaps, moment) ──
                console.log('✦ Generating Feynman extras...');
                const connectedTitles = connectedNodes.map(n => n.title);
                let extras = {};
                try {
                    extras = await generateFeynmanExtras(savedNode, connectedTitles);
                } catch (extrasErr) {
                    console.error('⚠ Extras generation failed (non-blocking):', extrasErr.message);
                }

                // Merge extras into the feynman object
                const fullFeynman = {
                    ...feynman,
                    challenge_question: extras.challenge_question || null,
                    knowledge_gaps: extras.knowledge_gaps || [],
                    real_life_moment: extras.real_life_moment || null,
                    challenge_attempts: [],
                    teach_attempts: [],
                    feynman_certified: false,
                };

                // Update the node in the database
                await supabase
                    .from('knowledge_nodes')
                    .update({ feynman: fullFeynman })
                    .eq('id', nodeId);

                // Broadcast to frontend
                broadcast('feynman.ready', { node_id: nodeId, feynman: fullFeynman });
                console.log(`🎓 Feynman analysis + extras complete for "${savedNode.title}"`);

                // ── Belief extraction & evolution detection ──
                processBeliefForNode(savedNode, userId).catch(err =>
                    console.error('🧠 Belief processing failed:', err.message)
                );

            } catch (asyncErr) {
                console.error('❌ Async processing error:', asyncErr.message);
            }
        })();

    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/knowledge/all
// Returns ALL nodes with freshly calculated strength.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/all', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('user_id', req.user.uid)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const enriched = (data || []).map(enrichNodeWithStrength);
        res.json(enriched);
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/knowledge/fading
// Returns nodes with strength < 30, sorted weakest first.
// These are the memories slipping away — urgent review needed.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/fading', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('user_id', req.user.uid);

        if (error) throw error;

        const fading = (data || [])
            .map(enrichNodeWithStrength)
            .filter(n => n.current_strength < 30)
            .sort((a, b) => a.current_strength - b.current_strength);

        res.json(fading);
    } catch (err) {
        next(err);
    }
});



// ═══════════════════════════════════════════════════════════════════════════
// GET /api/knowledge/export
// Export all nodes as a JSON payload for vault/markdown generation.
// The frontend generates the actual .md files and ZIP.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/export', async (req, res, next) => {
    try {
        const userId = req.user.uid;

        // Fetch all nodes
        const { data: nodes, error: nodesError } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (nodesError) throw nodesError;

        // Fetch all edges
        const { data: edges, error: edgesError } = await supabase
            .from('connection_edges')
            .select('*')
            .eq('user_id', userId);

        if (edgesError) throw edgesError;

        // Fetch all personal notes
        const { data: notes } = await supabase
            .from('node_notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        // Fetch user goals
        const { data: goals } = await supabase
            .from('user_goals')
            .select('goal_text, created_at')
            .eq('user_id', userId);

        // Map notes to their nodes
        const notesByNode = {};
        (notes || []).forEach(note => {
            if (!notesByNode[note.node_id]) notesByNode[note.node_id] = [];
            notesByNode[note.node_id].push(note);
        });

        const enriched = (nodes || []).map(n => ({
            ...enrichNodeWithStrength(n),
            personal_notes: notesByNode[n.id] || [],
        }));

        res.json({
            exported_at: new Date().toISOString(),
            node_count: enriched.length,
            edge_count: (edges || []).length,
            nodes: enriched,
            edges: edges || [],
            goals: (goals || []).map(g => g.goal_text),
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/knowledge/:id
// Returns a single node with full details including Feynman analysis.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw error;
        }

        res.json(enrichNodeWithStrength(data));
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/knowledge/:id/connections
// Returns all edges connected to this node, with titles of connected nodes.
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:id/connections', async (req, res, next) => {
    try {
        const nodeId = req.params.id;

        // Fetch all edges where this node is source or target
        const { data: edges, error } = await supabase
            .from('connection_edges')
            .select('*')
            .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

        if (error) throw error;

        // Get titles of the OTHER node in each connection
        const otherNodeIds = (edges || []).map(e =>
            e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
        );

        let nodeMap = {};
        if (otherNodeIds.length > 0) {
            const { data: nodes } = await supabase
                .from('knowledge_nodes')
                .select('id, title')
                .in('id', otherNodeIds);

            nodeMap = (nodes || []).reduce((map, n) => {
                map[n.id] = n.title;
                return map;
            }, {});
        }

        const enrichedEdges = (edges || []).map(e => ({
            ...e,
            connected_node_id: e.source_node_id === nodeId ? e.target_node_id : e.source_node_id,
            connected_node_title: nodeMap[
                e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
            ] || 'Unknown',
        }));

        res.json(enrichedEdges);
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/knowledge/:id/review
// Review a node — resets strength to 100 and reduces decay rate by 10%.
// Each review makes the memory stickier, just like spaced repetition.
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:id/review', async (req, res, next) => {
    try {
        const nodeId = req.params.id;

        // Fetch the current node
        const { data: node, error: fetchError } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw fetchError;
        }

        // Review: reset the timer and make memory stickier
        const newDecayRate = reduceDecayRate(node.decay_rate);
        const now = new Date().toISOString();

        const { data: updated, error: updateError } = await supabase
            .from('knowledge_nodes')
            .update({
                last_reviewed_at: now,
                decay_rate: newDecayRate,
            })
            .eq('id', nodeId)
            .select()
            .single();

        if (updateError) throw updateError;

        const enriched = enrichNodeWithStrength(updated);
        broadcast('node.reviewed', enriched);

        console.log(`📖 Reviewed: "${enriched.title}" — strength reset to ${enriched.current_strength}, decay rate: ${newDecayRate}`);
        res.json(enriched);
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/knowledge/:id
// Edit a knowledge node's raw content. Re-runs AI analysis to update
// title, summary, tags, and brain_region to stay in sync.
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:id', async (req, res, next) => {
    try {
        const nodeId = req.params.id;
        const userId = req.user.uid;
        const { content } = req.body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Verify the node exists and belongs to this user
        const { data: existing, error: fetchError } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
            throw fetchError;
        }

        const rawContent = content.trim();

        // Re-run AI classification on the new content
        console.log(`✏️  Re-analyzing edited node "${existing.title}"...`);
        const analysis = await analyzeAndClassify(rawContent);

        // Update the node
        const { data: updated, error: updateError } = await supabase
            .from('knowledge_nodes')
            .update({
                raw_content: rawContent,
                title: analysis.title,
                summary: analysis.summary,
                topic_category: analysis.topic_category,
                brain_region: analysis.brain_region,
                tags: analysis.tags,
                decay_rate: analysis.decay_rate,
            })
            .eq('id', nodeId)
            .select()
            .single();

        if (updateError) throw updateError;

        const enriched = enrichNodeWithStrength(updated);
        broadcast('node.updated', enriched);

        console.log(`✅ Node edited: "${enriched.title}" [${enriched.brain_region}]`);
        res.json(enriched);

        // Async: Re-generate Feynman analysis for the updated content
        (async () => {
            try {
                const { data: edges } = await supabase
                    .from('connection_edges')
                    .select('target_node_id, source_node_id')
                    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

                const connectedNodeIds = (edges || []).map(e =>
                    e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
                );

                let connectedNodes = [];
                if (connectedNodeIds.length > 0) {
                    const { data } = await supabase
                        .from('knowledge_nodes')
                        .select('id, title, summary')
                        .in('id', connectedNodeIds);
                    connectedNodes = data || [];
                }

                const { data: goals } = await supabase
                    .from('user_goals')
                    .select('goal_text')
                    .eq('user_id', userId);

                const feynman = await generateFeynmanAnalysis(updated, connectedNodes, goals || []);
                const connectedTitles = connectedNodes.map(n => n.title);

                let extras = {};
                try {
                    extras = await generateFeynmanExtras(updated, connectedTitles);
                } catch (e) {
                    console.error('⚠ Extras failed (non-blocking):', e.message);
                }

                const fullFeynman = {
                    ...feynman,
                    challenge_question: extras.challenge_question || null,
                    knowledge_gaps: extras.knowledge_gaps || [],
                    real_life_moment: extras.real_life_moment || null,
                    challenge_attempts: existing.feynman?.challenge_attempts || [],
                    teach_attempts: existing.feynman?.teach_attempts || [],
                    feynman_certified: existing.feynman?.feynman_certified || false,
                    is_crucial: existing.feynman?.is_crucial || false,
                };

                await supabase
                    .from('knowledge_nodes')
                    .update({ feynman: fullFeynman })
                    .eq('id', nodeId);

                broadcast('feynman.ready', { node_id: nodeId, feynman: fullFeynman });
                console.log(`🎓 Feynman re-analysis complete for edited node "${updated.title}"`);
            } catch (err) {
                console.error('❌ Async re-analysis error:', err.message);
            }
        })();

    } catch (err) {
        next(err);
    }
});




// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/knowledge/:id
// Permanently remove a knowledge node and all its connections.
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:id', async (req, res, next) => {
    try {
        // ON DELETE CASCADE handles edge cleanup automatically
        const { error } = await supabase
            .from('knowledge_nodes')
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
// PATCH /api/knowledge/:id/crucial
// Toggle whether a node is marked as crucial by the user.
// ═══════════════════════════════════════════════════════════════════════════

router.patch('/:id/crucial', async (req, res, next) => {
    try {
        const nodeId = req.params.id;

        // Fetch current node
        const { data: node, error: fetchError } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', req.user.uid)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
            throw fetchError;
        }

        const feynman = node.feynman || {};
        const newValue = !feynman.is_crucial;

        const updatedFeynman = { ...feynman, is_crucial: newValue };

        const { data: updated, error: updateError } = await supabase
            .from('knowledge_nodes')
            .update({ feynman: updatedFeynman })
            .eq('id', nodeId)
            .select()
            .single();

        if (updateError) throw updateError;

        const enriched = enrichNodeWithStrength(updated);
        broadcast('node.updated', enriched);

        console.log(`${newValue ? '⭐' : '○'} Node "${enriched.title}" marked as ${newValue ? 'CRUCIAL' : 'normal'}`);
        res.json(enriched);
    } catch (err) {
        next(err);
    }
});


export default router;
