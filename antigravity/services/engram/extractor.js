// ─── Engram Thought Extractor ───────────────────────────────────────────────
// AI-powered extraction of atomic thoughts from raw AI conversations.
// Uses Groq (Llama 3.3 70B) — same engine as the rest of Antigravity.
//
// The key insight: a thought is not a conversation. It's a distilled
// understanding that may be fed by many conversations over time.

import { groq, GROQ_MODEL } from '../../lib/groq.js';


// ─── Helpers ────────────────────────────────────────────────────────────────

function extractJSON(text) {
    try { return JSON.parse(text); } catch { /* no-op */ }

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* no-op */ }
    }

    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[1]); } catch { /* no-op */ }
    }

    throw new Error(`Could not extract JSON from AI response: ${text.substring(0, 200)}`);
}

async function callGroq(prompt) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'You are a precise AI that always responds with valid JSON. No preamble, no explanation — just the JSON.',
            },
            { role: 'user', content: prompt },
        ],
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
    });

    return chatCompletion.choices[0]?.message?.content || '{}';
}


/**
 * Extract atomic thoughts from a raw AI conversation.
 * Returns an array of thought objects ready for insertion or merging.
 */
export async function extractThoughts(rawConversation, sourceAi) {
    const prompt = `You are a thought extraction engine. Analyze this AI conversation and extract the distinct, atomic THOUGHTS (not conversation topics — actual ideas, insights, understandings, questions being explored).

For each thought, provide:
- title: A concise name for this thought/understanding (e.g. "Stoic approach to anger", "How transformers use attention")
- essence: The core insight in 1-3 sentences — this is the distilled understanding, not a summary of the conversation
- domain: One of: philosophy, science, technology, psychology, health, creativity, career, relationships, finance, history, mathematics, language, art, music, general
- tags: 2-5 relevant tags (lowercase, no hashtags)
- sophistication: Rate 0.0-1.0 how sophisticated/deep this thought is (0.1 = basic "what is X?", 0.5 = intermediate understanding, 0.9 = expert-level nuance)
- key_quotes: 1-3 most important sentences from the conversation that capture this thought

Rules:
- Extract ONLY genuine insights/understandings, not meta-discussion ("help me with", "can you explain")
- Merge closely related points into single thoughts — don't fragment
- A single conversation might yield 1-8 thoughts typically
- Focus on what the USER learned or explored, not what the AI said generically
- If the conversation is about code, extract the conceptual understanding, not the code itself

AI Source: ${sourceAi}

Conversation:
"""
${rawConversation.slice(0, 12000)}
"""

Return a JSON object: {"thoughts": [...array of thought objects...]}`;

    try {
        const responseText = await callGroq(prompt);
        const parsed = extractJSON(responseText);
        const thoughts = parsed.thoughts || parsed.results || [];

        if (!Array.isArray(thoughts)) {
            console.error('⚠ Engram: AI returned non-array:', JSON.stringify(parsed).slice(0, 200));
            return [];
        }

        return thoughts.map(t => ({
            title: t.title || 'Untitled thought',
            essence: t.essence || '',
            domain: t.domain || 'general',
            tags: Array.isArray(t.tags) ? t.tags : [],
            sophistication: typeof t.sophistication === 'number' ? Math.min(Math.max(t.sophistication, 0), 1) : 0.3,
            key_quotes: Array.isArray(t.key_quotes) ? t.key_quotes : [],
        }));
    } catch (err) {
        console.error('❌ Engram extraction failed:', err.message);
        return [];
    }
}


/**
 * Find existing thoughts that match a new extracted thought.
 * Returns the best match (if any) with a similarity score.
 */
export async function findMatchingThought(newThought, existingThoughts) {
    if (!existingThoughts || existingThoughts.length === 0) return null;

    // Limit to 30 existing thoughts to keep prompt manageable
    const subset = existingThoughts.slice(0, 30);

    const prompt = `Given a NEW thought and a list of EXISTING thoughts, determine if the new thought is about the same core idea as any existing thought. This is about semantic similarity of the underlying concept, not just keyword overlap.

NEW THOUGHT:
Title: "${newThought.title}"
Essence: "${newThought.essence}"

EXISTING THOUGHTS:
${subset.map((t, i) => `[${i}] "${t.title}" — ${t.essence}`).join('\n')}

If there is a match (the new thought is exploring the SAME core idea as an existing one), return:
{ "match_index": <index>, "confidence": <0.0-1.0>, "merge_suggestion": "<how to update the existing thought>" }

If no match exists, return:
{ "match_index": -1, "confidence": 0 }

Be conservative — only match if they're genuinely about the same underlying concept.`;

    try {
        const responseText = await callGroq(prompt);
        const match = extractJSON(responseText);

        if (match.match_index >= 0 && match.confidence > 0.6 && match.match_index < subset.length) {
            return {
                existingThought: subset[match.match_index],
                confidence: match.confidence,
                mergeSuggestion: match.merge_suggestion || '',
            };
        }
        return null;
    } catch (err) {
        console.error('⚠ Engram match-finding failed:', err.message);
        return null;
    }
}


/**
 * Detect relationships between thoughts.
 * Given a thought and a list of other thoughts, returns connection suggestions.
 */
export async function detectThoughtLinks(thought, otherThoughts) {
    if (!otherThoughts || otherThoughts.length === 0) return [];

    const subset = otherThoughts.slice(0, 25);

    const prompt = `Analyze relationships between a FOCUS thought and OTHER thoughts. Detect meaningful conceptual connections.

FOCUS THOUGHT:
"${thought.title}" — ${thought.essence}

OTHER THOUGHTS:
${subset.map((t, i) => `[${i}] "${t.title}" — ${t.essence}`).join('\n')}

For each genuine connection found, return an object with:
- target_index: index of the connected thought
- link_type: one of "builds_on", "contradicts", "extends", "requires", "exemplifies", "generalizes", "questions", "resolves"
- strength: 0.0-1.0 (how strong is this connection)
- reason: 1-sentence explanation of the connection

Rules:
- Only return GENUINE connections — not every thought is connected
- "builds_on" = the focus thought is a deeper exploration of the target
- "contradicts" = they present conflicting information or perspectives
- "extends" = the focus thought adds new dimensions to the target
- "requires" = understanding the target is prerequisite to the focus thought
- Maximum 5 connections per thought

Return a JSON object: {"results": [...array of connection objects...]}`;

    try {
        const responseText = await callGroq(prompt);
        const parsed = extractJSON(responseText);
        const links = parsed.results || parsed;

        if (!Array.isArray(links)) return [];

        return links
            .filter(l => typeof l.target_index === 'number' && l.target_index >= 0 && l.target_index < subset.length)
            .map(l => ({
                targetThought: subset[l.target_index],
                linkType: l.link_type || 'extends',
                strength: typeof l.strength === 'number' ? Math.min(Math.max(l.strength, 0), 1) : 0.5,
                reason: l.reason || '',
            }));
    } catch (err) {
        console.error('⚠ Engram link detection failed:', err.message);
        return [];
    }
}
