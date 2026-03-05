// ─── Belief Extraction & Evolution Service ──────────────────────────────────
// Extracts structured beliefs from knowledge nodes, detects shifts over time.

import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL } from '../lib/groq.js';
import { broadcast } from './websocket.js';

/**
 * Extract a structured belief from a knowledge node's content.
 * @param {object} node - The knowledge node { id, title, raw_content, summary, tags }
 * @returns {object|null} - { belief_statement, confidence_score, category, topic_tag }
 */
export async function extractBelief(node) {
    try {
        const prompt = [
            {
                role: 'system',
                content: `You are a belief extraction engine. Given a piece of knowledge, extract the core belief expressed.

Return a JSON object with exactly these fields:
- "belief_statement": A concise 1-sentence belief the user holds based on this content (max 100 chars)
- "confidence_score": How confident the content sounds (0.0–1.0, where 1.0 = absolute certainty)
- "category": One of: "fact", "assumption", "hypothesis", "opinion"
- "topic_tag": A 1–3 word lowercase topic label (e.g. "machine learning", "sleep", "diet")

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- The belief statement should capture what the user believes, not what they're learning
- Be precise and concise`
            },
            {
                role: 'user',
                content: `Title: "${node.title}"
Content: "${(node.raw_content || node.summary || '').slice(0, 500)}"
Tags: ${(node.tags || []).join(', ') || 'none'}`,
            },
        ];

        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: prompt,
            temperature: 0.3,
            max_tokens: 200,
            response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) return null;

        const parsed = JSON.parse(raw);

        // Validate
        if (!parsed.belief_statement || !parsed.topic_tag) return null;

        return {
            belief_statement: String(parsed.belief_statement).slice(0, 200),
            confidence_score: Math.max(0, Math.min(1, parseFloat(parsed.confidence_score) || 0.5)),
            category: ['fact', 'assumption', 'hypothesis', 'opinion'].includes(parsed.category)
                ? parsed.category
                : 'opinion',
            topic_tag: String(parsed.topic_tag).toLowerCase().slice(0, 50),
        };
    } catch (err) {
        console.error('🧠 Belief extraction error:', err.message);
        return null;
    }
}

/**
 * Compare a new belief against existing beliefs with the same topic.
 * @param {object} newBelief - The newly created belief record
 * @param {object[]} oldBeliefs - Array of past belief records with same topic_tag
 * @returns {object|null} - { shift_type, insight_summary, old_belief_id }
 */
export async function compareBelief(newBelief, oldBeliefs) {
    if (!oldBeliefs || oldBeliefs.length === 0) return null;

    // Use the most recent past belief for comparison
    const mostRecent = oldBeliefs[0]; // already sorted by created_at DESC

    try {
        const prompt = [
            {
                role: 'system',
                content: `You are a belief evolution analyst. Compare two beliefs from the same person on the same topic and classify how their thinking has changed.

Return a JSON object with exactly:
- "shift_type": One of "reinforcement", "refinement", "contradiction", "evolution"
  - reinforcement: Same belief, same confidence
  - refinement: Same core idea but more nuanced or specific
  - contradiction: Directly opposes the previous belief
  - evolution: Fundamental shift in perspective or stance
- "insight_summary": A brief 1-sentence insight (max 120 chars) describing the shift
  Format: "Your thinking on [topic] has [shifted/deepened/reversed] from [A] to [B]."

Return ONLY valid JSON, no markdown.`
            },
            {
                role: 'user',
                content: `Topic: "${newBelief.topic_tag}"

Previous belief (${mostRecent.category}, confidence ${mostRecent.confidence_score}):
"${mostRecent.belief_statement}"

New belief (${newBelief.category}, confidence ${newBelief.confidence_score}):
"${newBelief.belief_statement}"`,
            },
        ];

        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: prompt,
            temperature: 0.3,
            max_tokens: 150,
            response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) return null;

        const parsed = JSON.parse(raw);

        if (!parsed.shift_type) return null;

        const validTypes = ['reinforcement', 'refinement', 'contradiction', 'evolution'];
        return {
            shift_type: validTypes.includes(parsed.shift_type) ? parsed.shift_type : 'reinforcement',
            insight_summary: String(parsed.insight_summary || '').slice(0, 200),
            old_belief_id: mostRecent.id,
        };
    } catch (err) {
        console.error('🧠 Belief comparison error:', err.message);
        return null;
    }
}

/**
 * Full pipeline: extract belief from a node, store it, compare, and record shifts.
 * Called asynchronously after knowledge ingestion.
 * @param {object} node - The saved knowledge node
 */
export async function processBeliefForNode(node, userId) {
    try {
        // Step 1: Extract belief
        const extracted = await extractBelief(node);
        if (!extracted) {
            console.log(`🧠 No belief extracted for "${node.title}"`);
            return;
        }

        // Step 2: Store the belief
        const beliefId = uuid();
        const belief = {
            id: beliefId,
            user_id: userId,
            node_id: node.id,
            belief_statement: extracted.belief_statement,
            confidence_score: extracted.confidence_score,
            category: extracted.category,
            topic_tag: extracted.topic_tag,
            created_at: new Date().toISOString(),
        };

        const { error: insertErr } = await supabase
            .from('beliefs')
            .insert(belief);

        if (insertErr) {
            console.error('🧠 Belief insert error:', insertErr.message);
            return;
        }

        console.log(`🧠 Belief stored: "${extracted.belief_statement}" [${extracted.category}, ${extracted.topic_tag}]`);

        // Step 3: Find past beliefs with same topic
        const { data: pastBeliefs } = await supabase
            .from('beliefs')
            .select('*')
            .eq('user_id', userId)
            .eq('topic_tag', extracted.topic_tag)
            .neq('id', beliefId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!pastBeliefs || pastBeliefs.length === 0) {
            console.log(`🧠 First belief on topic "${extracted.topic_tag}" — no comparison needed`);
            broadcast('belief.new', { belief, shift: null });
            return;
        }

        // Step 4: Compare
        const comparison = await compareBelief(belief, pastBeliefs);
        if (!comparison) {
            broadcast('belief.new', { belief, shift: null });
            return;
        }

        // Step 5: Store the shift record
        const shift = {
            id: uuid(),
            user_id: userId,
            old_belief_id: comparison.old_belief_id,
            new_belief_id: beliefId,
            shift_type: comparison.shift_type,
            insight_summary: comparison.insight_summary,
            created_at: new Date().toISOString(),
        };

        const { error: shiftErr } = await supabase
            .from('belief_shifts')
            .insert(shift);

        if (shiftErr) {
            console.error('🧠 Shift insert error:', shiftErr.message);
        } else {
            console.log(`🧠 Belief shift detected: ${comparison.shift_type} — ${comparison.insight_summary}`);
        }

        // Broadcast to frontend
        broadcast('belief.shift', { belief, shift });

    } catch (err) {
        console.error('🧠 Belief processing error:', err.message);
    }
}
