// ═══════════════════════════════════════════════════════════════════════════
// extractEntities.js — Consciousness Analyst
//
// Uses Groq (Llama 3.3 70B) to extract emotional/cognitive entities from
// a journal entry. The GraphRAG approach, but pointed inward at a single
// consciousness instead of external world dynamics.
//
// Input:  raw journal text
// Output: { nodes: [{label, type, confidence}], relationships: [{source, target, type}] }
// ═══════════════════════════════════════════════════════════════════════════

import { groqComplete, GROQ_MODEL } from '../../lib/groq.js';

const MIND_ENTITY_TYPES = ['fear', 'goal', 'contradiction', 'desire', 'recurring_thought', 'tension'];

const SYSTEM_PROMPT = `You are a consciousness analyst. Your job is to read a human's raw journal entry and extract the psychological entities hidden within — both explicit and implied.

You extract six types of entities from the human mind:
1. **fear** — Anxieties, worries, things they're avoiding. Include both stated fears ("I'm scared of...") and implied fears (avoidance language, catastrophizing).
2. **goal** — Things they want to achieve, become, or work toward. Aspirations, plans, desired states.
3. **desire** — Wants that aren't necessarily goals. Cravings, yearnings, things they wish were different.
4. **contradiction** — Two beliefs or desires that are in tension. The person wants X but also Y, and X and Y conflict.
5. **recurring_thought** — A topic/theme that seems to occupy their mind frequently. Orbiting thoughts.
6. **tension** — Unresolved conflicts, dilemmas, or points of psychological pressure.

Rules:
- Extract 2-8 entities. Fewer is better than padding with low-confidence ones.
- Labels should be 3-8 words — concise but specific. Not "fear of failure" but "fear of being mediocre at career".
- Only include entities with confidence >= 0.5.
- For relationships: identify when two entities are related (e.g., a fear blocks a goal, a desire contradicts another desire).
- Relationship types: "blocks", "fuels", "contradicts", "amplifies", "suppresses", "enables".

You MUST respond with ONLY valid JSON matching this exact schema — no markdown, no explanation, no code fences:

{
  "nodes": [
    { "label": "concise entity description", "type": "fear|goal|contradiction|desire|recurring_thought|tension", "confidence": 0.0-1.0 }
  ],
  "relationships": [
    { "source": "exact label of source node", "target": "exact label of target node", "type": "blocks|fuels|contradicts|amplifies|suppresses|enables" }
  ]
}

If the entry is too short or too vague to extract anything meaningful, return: { "nodes": [], "relationships": [] }`;


/**
 * Extract psychological entities from a journal entry using Groq.
 *
 * @param {string} journalContent - The raw journal text
 * @returns {Promise<{nodes: Array, relationships: Array}>}
 */
export async function extractMindEntities(journalContent) {
    // Guard: skip very short entries
    if (!journalContent || journalContent.trim().length < 20) {
        console.log('🪞 Extract: Entry too short, skipping extraction');
        return { nodes: [], relationships: [] };
    }

    console.log(`🪞 Extract: Analyzing journal entry (${journalContent.length} chars)...`);

    try {
        const chatCompletion = await groqComplete({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Here is the journal entry to analyze:\n\n"""${journalContent}"""` },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
        });

        const text = chatCompletion.choices[0]?.message?.content || '';

        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (parseErr) {
            console.error('🪞 Extract: Failed to parse Groq response as JSON:', parseErr.message);
            console.error('🪞 Extract: Raw response:', text.substring(0, 300));
            return { nodes: [], relationships: [] };
        }

        // Validate structure
        const nodes = (parsed.nodes || []).filter(n =>
            n.label &&
            typeof n.label === 'string' &&
            MIND_ENTITY_TYPES.includes(n.type) &&
            typeof n.confidence === 'number' &&
            n.confidence >= 0.5
        );

        const relationships = (parsed.relationships || []).filter(r =>
            r.source && r.target && r.type &&
            typeof r.source === 'string' &&
            typeof r.target === 'string'
        );

        console.log(`🪞 Extract: Found ${nodes.length} entities, ${relationships.length} relationships`);
        return { nodes, relationships };

    } catch (err) {
        // API error — fail gracefully, don't break the journal save
        console.error('🪞 Extract: Groq API error:', err.message);
        return { nodes: [], relationships: [] };
    }
}
