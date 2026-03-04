// ─── Brain Map Route ────────────────────────────────────────────────────────
// GET /api/brain/map
// Returns the complete 3D brain visualization data:
//   - All nodes with coordinates, strength, and status
//   - All connection edges
// This is the endpoint the frontend's 3D renderer calls.

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { enrichNodeWithStrength } from '../services/decay.js';

const router = Router();

router.get('/map', async (req, res, next) => {
    try {
        // Fetch all nodes (with timeout-safe error handling)
        let nodes = [];
        let edges = [];

        try {
            const { data: nodesData, error: nodesError } = await supabase
                .from('knowledge_nodes')
                .select('*');

            if (nodesError) {
                console.error('⚠️ Supabase nodes query error:', nodesError.message);
            } else {
                nodes = nodesData || [];
            }
        } catch (fetchErr) {
            console.error('⚠️ Supabase connection failed (nodes):', fetchErr.message);
            console.error('   → Is your Supabase project paused? Check https://supabase.com/dashboard');
        }

        try {
            const { data: edgesData, error: edgesError } = await supabase
                .from('connection_edges')
                .select('*');

            if (edgesError) {
                console.error('⚠️ Supabase edges query error:', edgesError.message);
            } else {
                edges = edgesData || [];
            }
        } catch (fetchErr) {
            console.error('⚠️ Supabase connection failed (edges):', fetchErr.message);
        }

        // Build node ID → title map for edge enrichment
        const titleMap = {};
        const enrichedNodes = nodes.map(node => {
            const enriched = enrichNodeWithStrength(node);
            titleMap[enriched.id] = enriched.title;

            return {
                id: enriched.id,
                title: enriched.title,
                summary: enriched.summary,
                brain_region: enriched.brain_region,
                topic_category: enriched.topic_category,
                coordinates: {
                    x: enriched.coord_x,
                    y: enriched.coord_y,
                    z: enriched.coord_z,
                },
                current_strength: enriched.current_strength,
                status: enriched.status,
                tags: enriched.tags,
                created_at: enriched.created_at,
                feynman: enriched.feynman,
                raw_content: enriched.raw_content,
                decay_rate: enriched.decay_rate,
                last_reviewed_at: enriched.last_reviewed_at,
            };
        });

        // Enrich edges with node titles
        const enrichedEdges = edges.map(edge => ({
            ...edge,
            source_title: titleMap[edge.source_node_id] || 'Unknown',
            target_title: titleMap[edge.target_node_id] || 'Unknown',
        }));

        res.json({
            nodes: enrichedNodes,
            edges: enrichedEdges,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
