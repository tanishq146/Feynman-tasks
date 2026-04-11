// ═══════════════════════════════════════════════════════════════════════════
// graphBuilder.js — Mind Graph Builder
//
// Takes extracted entities and upserts them into the mind_nodes + mind_edges
// tables. Merges duplicates via fuzzy label matching, updates occurrence
// counts and strength, and creates/strengthens edges between co-occurring nodes.
//
// Strength formula:
//   strength = min(1, occurrenceCount * 0.15 + recencyBoost)
//   recencyBoost = 0.3 if seen in last 7 days, 0.1 if last 30, 0 otherwise
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js';
import { v4 as uuid } from 'uuid';

/**
 * Normalize a label for fuzzy matching.
 * Strips case, punctuation, extra whitespace.
 */
function normalizeLabel(label) {
    return label
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Simple fuzzy similarity check between two labels.
 * Uses word overlap ratio — good enough for short labels (3-8 words).
 * Returns 0-1 where 1 = identical.
 */
function labelSimilarity(a, b) {
    const wordsA = new Set(normalizeLabel(a).split(' '));
    const wordsB = new Set(normalizeLabel(b).split(' '));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }
    return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * Calculate recency boost based on last_seen_at.
 */
function recencyBoost(lastSeenAt) {
    const daysSince = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) return 0.3;
    if (daysSince <= 30) return 0.1;
    return 0;
}

/**
 * Calculate node strength from occurrence count and recency.
 */
function calculateStrength(occurrenceCount, lastSeenAt) {
    return Math.min(1, occurrenceCount * 0.15 + recencyBoost(lastSeenAt));
}


/**
 * Upsert extracted entities into the mind graph.
 *
 * @param {{nodes: Array, relationships: Array}} entities - Output from extractMindEntities
 * @param {string} userId
 * @param {string} entryId - The journal entry that produced these entities
 * @returns {Promise<{upsertedNodes: Array, createdEdges: Array}>}
 */
export async function updateMindGraph(entities, userId, entryId) {
    const { nodes: extractedNodes, relationships } = entities;

    if (!extractedNodes || extractedNodes.length === 0) {
        console.log('🪞 Graph: No entities to upsert');
        return { upsertedNodes: [], createdEdges: [] };
    }

    console.log(`🪞 Graph: Upserting ${extractedNodes.length} entities for user ${userId}...`);

    // 1. Fetch existing mind_nodes for this user
    const { data: existingNodes, error: fetchErr } = await supabase
        .from('mind_nodes')
        .select('*')
        .eq('user_id', userId);

    if (fetchErr) {
        console.error('🪞 Graph: Failed to fetch existing nodes:', fetchErr.message);
        throw fetchErr;
    }

    const existing = existingNodes || [];
    const now = new Date().toISOString();
    const upsertedNodes = [];
    const journalMaps = [];

    // 2. For each extracted node: find match or create new
    for (const extracted of extractedNodes) {
        // Find best matching existing node (same type + similar label)
        let bestMatch = null;
        let bestScore = 0;

        for (const ex of existing) {
            if (ex.type !== extracted.type) continue;
            const sim = labelSimilarity(extracted.label, ex.label);
            if (sim > bestScore && sim >= 0.6) {
                bestScore = sim;
                bestMatch = ex;
            }
        }

        if (bestMatch) {
            // ─── UPDATE existing node ──────────────────────────────
            const newCount = bestMatch.occurrence_count + 1;
            const newStrength = calculateStrength(newCount, now);

            const { data: updated, error: updateErr } = await supabase
                .from('mind_nodes')
                .update({
                    occurrence_count: newCount,
                    last_seen_at: now,
                    strength: newStrength,
                })
                .eq('id', bestMatch.id)
                .select()
                .single();

            if (updateErr) {
                console.error(`🪞 Graph: Failed to update node "${bestMatch.label}":`, updateErr.message);
                continue;
            }

            console.log(`  ↻ Updated: "${bestMatch.label}" (count: ${newCount}, strength: ${newStrength.toFixed(2)})`);
            upsertedNodes.push(updated);
            journalMaps.push({ id: uuid(), node_id: bestMatch.id, journal_entry_id: entryId });

        } else {
            // ─── CREATE new node ───────────────────────────────────
            const nodeId = uuid();
            const strength = calculateStrength(1, now);

            const newNode = {
                id: nodeId,
                user_id: userId,
                label: extracted.label,
                type: extracted.type,
                strength,
                first_seen_at: now,
                last_seen_at: now,
                occurrence_count: 1,
                resolved: false,
            };

            const { data: created, error: createErr } = await supabase
                .from('mind_nodes')
                .insert(newNode)
                .select()
                .single();

            if (createErr) {
                console.error(`🪞 Graph: Failed to create node "${extracted.label}":`, createErr.message);
                continue;
            }

            console.log(`  + Created: "${extracted.label}" (${extracted.type})`);
            upsertedNodes.push(created);
            existing.push(created); // Add to existing pool for subsequent matches
            journalMaps.push({ id: uuid(), node_id: nodeId, journal_entry_id: entryId });
        }
    }

    // 3. Save journal ↔ node mappings
    if (journalMaps.length > 0) {
        const { error: mapErr } = await supabase
            .from('node_journal_map')
            .insert(journalMaps);
        if (mapErr) {
            console.error('🪞 Graph: Failed to save journal-node mappings:', mapErr.message);
        }
    }

    // 4. Create/strengthen edges between co-occurring nodes
    const createdEdges = [];
    const nodesByLabel = {};
    for (const n of upsertedNodes) {
        nodesByLabel[normalizeLabel(n.label)] = n;
    }

    // Process explicit relationships from Claude
    for (const rel of relationships) {
        const sourceNode = findNodeByLabel(upsertedNodes, rel.source);
        const targetNode = findNodeByLabel(upsertedNodes, rel.target);

        if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) continue;

        const edge = await upsertEdge(userId, sourceNode.id, targetNode.id, rel.type);
        if (edge) createdEdges.push(edge);
    }

    // Also create "co_occurs" edges between all nodes from the same entry
    for (let i = 0; i < upsertedNodes.length; i++) {
        for (let j = i + 1; j < upsertedNodes.length; j++) {
            const a = upsertedNodes[i];
            const b = upsertedNodes[j];
            // Skip if an explicit relationship already exists
            const alreadyLinked = createdEdges.some(e =>
                (e.source_node_id === a.id && e.target_node_id === b.id) ||
                (e.source_node_id === b.id && e.target_node_id === a.id)
            );
            if (!alreadyLinked) {
                const edge = await upsertEdge(userId, a.id, b.id, 'co_occurs');
                if (edge) createdEdges.push(edge);
            }
        }
    }

    console.log(`🪞 Graph: Upserted ${upsertedNodes.length} nodes, ${createdEdges.length} edges`);
    return { upsertedNodes, createdEdges };
}


/**
 * Find a node in the list by fuzzy matching its label.
 */
function findNodeByLabel(nodes, label) {
    // Exact match first
    const exact = nodes.find(n => normalizeLabel(n.label) === normalizeLabel(label));
    if (exact) return exact;
    // Fuzzy match
    let best = null, bestScore = 0;
    for (const n of nodes) {
        const sim = labelSimilarity(n.label, label);
        if (sim > bestScore && sim >= 0.5) {
            bestScore = sim;
            best = n;
        }
    }
    return best;
}


/**
 * Create or strengthen an edge between two mind nodes.
 */
async function upsertEdge(userId, sourceId, targetId, relationshipType) {
    // Check if edge already exists (in either direction)
    const { data: existing } = await supabase
        .from('mind_edges')
        .select('*')
        .eq('user_id', userId)
        .or(
            `and(source_node_id.eq.${sourceId},target_node_id.eq.${targetId}),` +
            `and(source_node_id.eq.${targetId},target_node_id.eq.${sourceId})`
        )
        .limit(1)
        .single();

    if (existing) {
        // Strengthen existing edge
        const newWeight = Math.min(1, existing.weight + 0.1);
        const { data: updated, error } = await supabase
            .from('mind_edges')
            .update({ weight: newWeight })
            .eq('id', existing.id)
            .select()
            .single();
        if (error) {
            console.error(`🪞 Graph: Failed to update edge:`, error.message);
            return null;
        }
        return updated;
    } else {
        // Create new edge
        const edge = {
            id: uuid(),
            user_id: userId,
            source_node_id: sourceId,
            target_node_id: targetId,
            relationship_type: relationshipType,
            weight: 0.3,
            created_at: new Date().toISOString(),
        };
        const { data: created, error } = await supabase
            .from('mind_edges')
            .insert(edge)
            .select()
            .single();
        if (error) {
            console.error(`🪞 Graph: Failed to create edge:`, error.message);
            return null;
        }
        return created;
    }
}
