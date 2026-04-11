// ═══════════════════════════════════════════════════════════════════════════
// contradictionDetector.js — Internal Contradiction Detector
//
// Fetches the user's mind nodes from the last 90 days and asks Groq to
// identify contradictions — cases where goals conflict with fears, desires
// conflict with stated values, or beliefs are in logical tension.
//
// Output: Array of contradiction edges with relationship_type = 'contradiction'
// ═══════════════════════════════════════════════════════════════════════════

import { groqComplete, GROQ_MODEL } from '../../lib/groq.js';
import { supabase } from '../../lib/supabase.js';
import { v4 as uuid } from 'uuid';

const CONTRADICTION_PROMPT = `You are a consciousness contradiction detector. You will receive a list of psychological entities (fears, goals, desires, tensions, recurring thoughts) extracted from a person's journal entries over time.

Your job: identify pairs of entities that CONTRADICT each other.

A contradiction is when:
- A goal directly conflicts with a fear (e.g., "goal: be more vulnerable" vs "fear: being judged by others")
- Two desires are mutually exclusive (e.g., "desire: total freedom" vs "desire: deep commitment")
- A belief is in tension with an action or aspiration
- A recurring thought undermines a stated goal

Rules:
- Only flag genuine, meaningful contradictions — not loose associations.
- Each contradiction must include a brief explanation (1 sentence).
- Only return contradictions where confidence >= 0.6.
- Return between 0-5 contradictions. Quality over quantity.

You MUST respond with ONLY valid JSON — no markdown, no explanation, no code fences:

{
  "contradictions": [
    {
      "node_a_label": "exact label of first node",
      "node_b_label": "exact label of second node",
      "explanation": "1-sentence explanation of why these contradict",
      "confidence": 0.0-1.0
    }
  ]
}

If no contradictions found, return: { "contradictions": [] }`;


/**
 * Detect contradictions in a user's mind graph.
 *
 * @param {string} userId
 * @returns {Promise<Array>} - Array of contradiction edge objects that were created/updated
 */
export async function detectContradictions(userId) {
    console.log(`🪞 Contradictions: Analyzing user ${userId}...`);

    // Fetch mind_nodes from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: nodes, error } = await supabase
        .from('mind_nodes')
        .select('*')
        .eq('user_id', userId)
        .gte('last_seen_at', ninetyDaysAgo)
        .order('strength', { ascending: false });

    if (error) {
        console.error('🪞 Contradictions: Failed to fetch nodes:', error.message);
        return [];
    }

    if (!nodes || nodes.length < 2) {
        console.log('🪞 Contradictions: Not enough nodes to analyze (need >= 2)');
        return [];
    }

    // Build the entity list for Groq
    const entityList = nodes.map(n =>
        `- [${n.type.toUpperCase()}] "${n.label}" (seen ${n.occurrence_count}x, strength: ${n.strength.toFixed(2)})`
    ).join('\n');

    try {
        const chatCompletion = await groqComplete({
            messages: [
                { role: 'system', content: CONTRADICTION_PROMPT },
                { role: 'user', content: `Here are the psychological entities from this person's recent journal entries:\n\n${entityList}` },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 512,
            response_format: { type: 'json_object' },
        });

        const text = chatCompletion.choices[0]?.message?.content || '';
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (parseErr) {
            console.error('🪞 Contradictions: Failed to parse Groq response:', parseErr.message);
            return [];
        }

        const contradictions = (parsed.contradictions || []).filter(c =>
            c.node_a_label && c.node_b_label && c.confidence >= 0.6
        );

        if (contradictions.length === 0) {
            console.log('🪞 Contradictions: None detected');
            return [];
        }

        // Create contradiction edges in the database
        const createdEdges = [];
        for (const c of contradictions) {
            const nodeA = findNodeByLabel(nodes, c.node_a_label);
            const nodeB = findNodeByLabel(nodes, c.node_b_label);

            if (!nodeA || !nodeB || nodeA.id === nodeB.id) continue;

            // Check if contradiction edge already exists
            const { data: existing } = await supabase
                .from('mind_edges')
                .select('id')
                .eq('user_id', userId)
                .eq('relationship_type', 'contradiction')
                .or(
                    `and(source_node_id.eq.${nodeA.id},target_node_id.eq.${nodeB.id}),` +
                    `and(source_node_id.eq.${nodeB.id},target_node_id.eq.${nodeA.id})`
                )
                .limit(1)
                .maybeSingle();

            if (existing) continue;

            const edge = {
                id: uuid(),
                user_id: userId,
                source_node_id: nodeA.id,
                target_node_id: nodeB.id,
                relationship_type: 'contradiction',
                weight: c.confidence,
                created_at: new Date().toISOString(),
            };

            const { data: created, error: insertErr } = await supabase
                .from('mind_edges')
                .insert(edge)
                .select()
                .single();

            if (insertErr) {
                console.error(`🪞 Contradictions: Failed to save edge:`, insertErr.message);
                continue;
            }

            console.log(`  ⚡ Contradiction: "${nodeA.label}" ↔ "${nodeB.label}" — ${c.explanation}`);
            createdEdges.push({ ...created, explanation: c.explanation });
        }

        console.log(`🪞 Contradictions: Found ${createdEdges.length} new contradiction(s)`);
        return createdEdges;

    } catch (err) {
        console.error('🪞 Contradictions: Groq API error:', err.message);
        return [];
    }
}


/**
 * Find a node by fuzzy label match.
 */
function findNodeByLabel(nodes, label) {
    const normalized = label.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    // Exact match first
    const exact = nodes.find(n =>
        n.label.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim() === normalized
    );
    if (exact) return exact;
    // Word overlap
    const targetWords = new Set(normalized.split(' '));
    let best = null, bestScore = 0;
    for (const n of nodes) {
        const nWords = new Set(n.label.toLowerCase().replace(/[^\w\s]/g, '').split(' '));
        let overlap = 0;
        for (const w of targetWords) if (nWords.has(w)) overlap++;
        const score = overlap / Math.max(targetWords.size, nWords.size);
        if (score > bestScore && score >= 0.5) {
            bestScore = score;
            best = n;
        }
    }
    return best;
}
