// ─── Engram Knowledge Compressor ────────────────────────────────────────────
// The final bridge. Takes your thinking graph and compresses it into an
// ultra-dense, token-efficient "knowledge packet" that any AI can parse
// to instantly understand your full context without wasting tokens on
// vague recollection.
//
// Two modes:
//   1. compressConversation — compress a single AI conversation into a packet
//   2. compressAll — compress your entire thinking graph into a master packet
//
// Format: FKPV1 (Feynman Knowledge Packet v1)
// - Structured headers for instant parsing
// - Semantic compression (concepts, not sentences)
// - Relationship encoding (not just facts, but how they connect)
// - Priority weighting (what matters most comes first)

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

async function callGroq(prompt, maxTokens = 4096) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'You are a precise AI that always responds with valid JSON. No preamble, no explanation — just the JSON.',
            },
            { role: 'user', content: prompt },
        ],
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
    });

    return chatCompletion.choices[0]?.message?.content || '{}';
}


/**
 * Compress a single AI conversation into a knowledge packet.
 * Extracts the core knowledge, strips the fluff, and formats it
 * so any AI can instantly reconstruct the full understanding.
 */
export async function compressConversation(rawConversation, sourceAi = 'unknown') {
    const prompt = `You are a knowledge compression engine. Your job is to take a raw AI conversation and compress it into the most TOKEN-EFFICIENT possible representation that would let any AI instantly understand everything discussed WITHOUT reading the original.

CRITICAL RULES:
- Compress MEANING, not just text. Remove all conversational fluff ("Can you help me", "Sure!", "Let me explain")
- Use dense notation: abbreviations, symbols, shorthand — as long as an AI can parse it
- Preserve RELATIONSHIPS between concepts (A→B means A leads to B, A⊥B means A contradicts B, A⊂B means A is part of B)
- Prioritize: INSIGHTS > FACTS > CONTEXT > META
- Use hierarchical structure: domains > concepts > details
- Include uncertainty markers: ✓ = confirmed, ~ = approximate, ? = uncertain, ✗ = disproven

Source AI: ${sourceAi}

Conversation (may be truncated):
"""
${rawConversation.slice(0, 15000)}
"""

Return a JSON object with:
{
  "packet_title": "short descriptive title",
  "domains": ["domain1", "domain2"],
  "core_insights": [
    {
      "concept": "name",
      "essence": "ultra-compressed insight (1-2 sentences max)",
      "confidence": "✓|~|?",
      "connections": ["relates to X", "contradicts Y"]
    }
  ],
  "key_facts": ["fact1", "fact2"],
  "open_questions": ["question1"],
  "compressed_text": "A single dense paragraph that encodes ALL knowledge from this conversation in the most token-efficient way possible. Use shorthand, symbols, and dense notation. This should be pasteable into any AI and give it full context."
}`;

    try {
        const responseText = await callGroq(prompt, 4096);
        const result = extractJSON(responseText);

        return {
            success: true,
            title: result.packet_title || 'Untitled Packet',
            domains: result.domains || [],
            insights: result.core_insights || [],
            facts: result.key_facts || [],
            questions: result.open_questions || [],
            compressed: result.compressed_text || '',
            format: 'FKPV1',
        };
    } catch (err) {
        console.error('❌ Engram compression failed:', err.message);
        return { success: false, error: err.message };
    }
}


/**
 * Compress the entire thinking graph into a master knowledge packet.
 * This is the big one — takes ALL thoughts, their relationships, and
 * distills them into a single pasteable block.
 */
export async function compressAllThoughts(thoughts, links) {
    if (!thoughts || thoughts.length === 0) {
        return {
            success: false,
            error: 'No thoughts to compress.',
        };
    }

    // Build domain groups
    const byDomain = {};
    thoughts.forEach(t => {
        const d = t.domain || 'general';
        if (!byDomain[d]) byDomain[d] = [];
        byDomain[d].push(t);
    });

    // Build link map
    const linkMap = {};
    (links || []).forEach(l => {
        if (!linkMap[l.source_id]) linkMap[l.source_id] = [];
        linkMap[l.source_id].push({
            target_id: l.target_id,
            type: l.link_type,
            strength: l.strength,
        });
    });

    // Build the thought summary for the AI
    const thoughtSummary = Object.entries(byDomain).map(([domain, items]) => {
        return `[${domain.toUpperCase()}]\n${items.map(t => {
            const outLinks = linkMap[t.id] || [];
            const linkStr = outLinks.length > 0
                ? ` {${outLinks.map(l => `${l.type}→${thoughts.find(x => x.id === l.target_id)?.title || '?'}`).join(', ')}}`
                : '';
            return `• "${t.title}" (${t.maturity || 'seed'}): ${t.essence}${linkStr}`;
        }).join('\n')}`;
    }).join('\n\n');

    const prompt = `You are a master knowledge compression engine. Your job is to take an entire knowledge graph of thoughts and compress it into the MOST TOKEN-EFFICIENT possible representation.

This compressed output will be PASTED into AI chats so the AI instantly understands everything the user knows WITHOUT wasting tokens. Every token saved here saves money and context window.

COMPRESSION RULES:
- Maximum density. Use symbols: → (leads to), ⊥ (contradicts), ⊂ (part of), ≈ (similar to), ∵ (because), ∴ (therefore)
- Group by domain, then by conceptual clusters
- Use hierarchical indentation for sub-concepts
- Mark maturity: 🌱seed 🌿sprouting 🌳growing 💎mature ⚡evolved
- Mark connections inline: [→TopicB] [⊥TopicC]
- Strip all conversational language — pure knowledge encoding
- Start with a one-line CONTEXT HEADER: who is this person, what do they know
- End with OPEN FRONTIERS: what questions remain unanswered

THE KNOWLEDGE GRAPH:
${thoughtSummary.slice(0, 14000)}

Total thoughts: ${thoughts.length}
Total links: ${(links || []).length}
Domains: ${Object.keys(byDomain).join(', ')}

Return a JSON object:
{
  "context_header": "One line describing this person's knowledge profile",
  "domain_count": ${Object.keys(byDomain).length},
  "thought_count": ${thoughts.length},
  "compressed_blocks": [
    {
      "domain": "domain_name",
      "compressed": "Ultra-dense encoding of all knowledge in this domain"
    }
  ],
  "cross_domain_connections": ["connection descriptions"],
  "open_frontiers": ["unanswered questions"],
  "master_packet": "THE FULL compressed knowledge packet as a single pasteable text block. This should start with '=== FEYNMAN KNOWLEDGE PACKET v1 ===' and encode EVERYTHING. Format it so any AI reading it instantly understands the user's complete knowledge landscape. Use dense shorthand, symbols, hierarchy. This is the thing the user copies and pastes."
}`;

    try {
        const responseText = await callGroq(prompt, 6000);
        const result = extractJSON(responseText);

        return {
            success: true,
            context: result.context_header || '',
            domainCount: result.domain_count || Object.keys(byDomain).length,
            thoughtCount: result.thought_count || thoughts.length,
            blocks: result.compressed_blocks || [],
            crossConnections: result.cross_domain_connections || [],
            frontiers: result.open_frontiers || [],
            masterPacket: result.master_packet || '',
            format: 'FKPV1',
            stats: {
                originalChars: thoughts.reduce((sum, t) => sum + (t.essence?.length || 0), 0),
                compressedChars: (result.master_packet || '').length,
                ratio: thoughts.reduce((sum, t) => sum + (t.essence?.length || 0), 0) > 0
                    ? ((result.master_packet || '').length / thoughts.reduce((sum, t) => sum + (t.essence?.length || 0), 0) * 100).toFixed(1) + '%'
                    : 'N/A',
            },
        };
    } catch (err) {
        console.error('❌ Engram master compression failed:', err.message);
        return { success: false, error: err.message };
    }
}
