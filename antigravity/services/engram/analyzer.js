// ─── Engram Analyzer ────────────────────────────────────────────────────────
// The intelligence layer that sees what you can't.
//
// Three powers:
//   1. Velocity — How fast is your understanding deepening?
//   2. Contradictions — What do your AIs disagree on?
//   3. Gravity Wells — What core question are you circling without asking?
//
// Uses Groq (Llama 3.3 70B) — same engine as the rest of Antigravity.

import { groq, GROQ_MODEL } from '../../lib/groq.js';
import { supabase } from '../../lib/supabase.js';


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
 * Analyze velocity for a single thought.
 * Velocity = how fast understanding is deepening over time.
 */
export async function analyzeVelocity(thought, history) {
    if (!history || history.length < 2) {
        return {
            velocity_score: 0,
            trajectory: 'static',
            description: 'Not enough data points to measure velocity.',
        };
    }

    const prompt = `Analyze the evolution of understanding for this thought over time.

THOUGHT: "${thought.title}"
Current essence: "${thought.essence}"

EVOLUTION SNAPSHOTS (chronological):
${history.map((h, i) => `[${i + 1}] (${new Date(h.recorded_at).toLocaleDateString()}) Sophistication: ${h.sophistication || 0}
"${h.snapshot}"
Delta: ${h.delta_note || 'none'}`).join('\n\n')}

Return a JSON object with:
- velocity_score: 0.0-1.0 — How rapidly is understanding deepening?
- trajectory: One of "accelerating", "steady", "decelerating", "static", "breakthrough"
- description: One sentence describing the velocity pattern
- depth_shift: Describe the qualitative shift in understanding
- next_frontier: What question would represent the next level of understanding?`;

    try {
        const text = await callGroq(prompt);
        const analysis = extractJSON(text);

        return {
            velocity_score: typeof analysis.velocity_score === 'number'
                ? Math.min(Math.max(analysis.velocity_score, 0), 1) : 0,
            trajectory: analysis.trajectory || 'static',
            description: analysis.description || '',
            depth_shift: analysis.depth_shift || '',
            next_frontier: analysis.next_frontier || '',
        };
    } catch (err) {
        console.error('⚠ Engram velocity analysis failed:', err.message);
        return { velocity_score: 0, trajectory: 'static', description: 'Analysis failed.' };
    }
}


/**
 * Detect contradictions between thoughts.
 */
export async function detectContradictions(thoughts) {
    if (!thoughts || thoughts.length < 2) return [];

    const batches = [];
    for (let i = 0; i < thoughts.length; i += 10) {
        batches.push(thoughts.slice(i, i + 10));
    }

    const allContradictions = [];

    for (const batch of batches) {
        const prompt = `Examine these thought-nodes from a user's knowledge graph. Identify any GENUINE contradictions.

THOUGHTS:
${batch.map((t, i) => `[${i}] "${t.title}" (domain: ${t.domain})
Essence: "${t.essence}"`).join('\n\n')}

For each contradiction found, return an object with:
- thought_a_index: index of first thought
- thought_b_index: index of second thought
- nature: "direct" | "perspective" | "outdated"
- description: 1-2 sentences explaining the contradiction
- resolution_hint: Brief suggestion how to resolve
- severity: 0.0-1.0

Return JSON: {"contradictions": [...]}. Return {"contradictions": []} if none found.`;

        try {
            const text = await callGroq(prompt);
            const parsed = extractJSON(text);
            const contradictions = parsed.contradictions || [];

            if (Array.isArray(contradictions)) {
                for (const c of contradictions) {
                    if (c.thought_a_index >= 0 && c.thought_a_index < batch.length &&
                        c.thought_b_index >= 0 && c.thought_b_index < batch.length) {
                        allContradictions.push({
                            thought_a: batch[c.thought_a_index],
                            thought_b: batch[c.thought_b_index],
                            nature: c.nature || 'perspective',
                            description: c.description || '',
                            resolution_hint: c.resolution_hint || '',
                            severity: typeof c.severity === 'number' ? Math.min(Math.max(c.severity, 0), 1) : 0.5,
                        });
                    }
                }
            }
        } catch (err) {
            console.error('⚠ Engram contradiction detection failed:', err.message);
        }
    }

    return allContradictions;
}


/**
 * Detect gravity wells — the unasked core questions.
 */
export async function detectGravityWells(thoughts) {
    if (!thoughts || thoughts.length < 3) return [];

    const prompt = `Analyze this collection of thoughts from a user's knowledge graph. Detect "gravity wells" — deeper questions or core concepts that the user keeps approaching from different angles without directly addressing.

THOUGHTS:
${thoughts.slice(0, 30).map((t, i) => `[${i}] "${t.title}" (${t.domain})
"${t.essence}"`).join('\n\n')}

For each gravity well detected, return:
- core_question: The fundamental question being circled (phrased as a question)
- label: A short 2-4 word label
- orbiting_thought_indices: Array of indices of thoughts that orbit this well (min 3)
- pull_strength: 0.0-1.0
- insight: 1-2 sentences explaining why this is a gravity well
- suggested_exploration: A specific question the user could explore

Return JSON: {"gravity_wells": [...]}. Return {"gravity_wells": []} if none detected.`;

    try {
        const text = await callGroq(prompt);
        const parsed = extractJSON(text);
        const wells = parsed.gravity_wells || [];

        if (!Array.isArray(wells)) return [];

        return wells
            .filter(w => w.orbiting_thought_indices?.length >= 3)
            .map(w => ({
                core_question: w.core_question || '',
                label: w.label || 'Unnamed',
                orbiting_thoughts: (w.orbiting_thought_indices || [])
                    .filter(i => i >= 0 && i < thoughts.length)
                    .map(i => thoughts[i]),
                pull_strength: typeof w.pull_strength === 'number' ? Math.min(Math.max(w.pull_strength, 0), 1) : 0.5,
                insight: w.insight || '',
                suggested_exploration: w.suggested_exploration || '',
            }));
    } catch (err) {
        console.error('⚠ Engram gravity well detection failed:', err.message);
        return [];
    }
}


/**
 * Run full analysis on a user's thinking graph.
 */
export async function analyzeThinkingGraph(userId) {
    const { data: thoughts } = await supabase
        .from('engram_thoughts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (!thoughts || thoughts.length === 0) {
        return {
            velocity: [],
            contradictions: [],
            gravity_wells: [],
            summary: { total_thoughts: 0, avg_velocity: 0, contradiction_count: 0, gravity_well_count: 0 },
        };
    }

    // Fetch all history for velocity analysis
    const thoughtIds = thoughts.map(t => t.id);
    const { data: allHistory } = await supabase
        .from('engram_thought_history')
        .select('*')
        .in('thought_id', thoughtIds)
        .order('recorded_at', { ascending: true });

    // Group history by thought
    const historyByThought = {};
    (allHistory || []).forEach(h => {
        if (!historyByThought[h.thought_id]) historyByThought[h.thought_id] = [];
        historyByThought[h.thought_id].push(h);
    });

    // Analyze velocity for thoughts with enough history
    const velocityResults = [];
    for (const thought of thoughts) {
        const history = historyByThought[thought.id] || [];
        if (history.length >= 2) {
            const velocity = await analyzeVelocity(thought, history);
            velocityResults.push({
                thought_id: thought.id,
                thought_title: thought.title,
                ...velocity,
            });

            // Update the thought's velocity_score in DB
            await supabase
                .from('engram_thoughts')
                .update({ velocity_score: velocity.velocity_score })
                .eq('id', thought.id);
        }
    }

    // Detect contradictions
    const contradictions = await detectContradictions(thoughts);

    // Detect gravity wells
    const gravityWells = await detectGravityWells(thoughts);

    // Summary stats
    const avgVelocity = velocityResults.length > 0
        ? velocityResults.reduce((sum, v) => sum + v.velocity_score, 0) / velocityResults.length
        : 0;

    return {
        velocity: velocityResults,
        contradictions: contradictions.map(c => ({
            thought_a_id: c.thought_a.id,
            thought_a_title: c.thought_a.title,
            thought_b_id: c.thought_b.id,
            thought_b_title: c.thought_b.title,
            nature: c.nature,
            description: c.description,
            resolution_hint: c.resolution_hint,
            severity: c.severity,
        })),
        gravity_wells: gravityWells.map(w => ({
            core_question: w.core_question,
            label: w.label,
            orbiting_thoughts: w.orbiting_thoughts.map(t => ({ id: t.id, title: t.title })),
            pull_strength: w.pull_strength,
            insight: w.insight,
            suggested_exploration: w.suggested_exploration,
        })),
        summary: {
            total_thoughts: thoughts.length,
            avg_velocity: Math.round(avgVelocity * 100) / 100,
            contradiction_count: contradictions.length,
            gravity_well_count: gravityWells.length,
        },
    };
}
