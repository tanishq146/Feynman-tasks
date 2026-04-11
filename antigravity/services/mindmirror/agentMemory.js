// ═══════════════════════════════════════════════════════════════════════════
// Agent Memory Service — 26 Emotion Agents
// Manages agent states, memories, dominance scores, and personality evolution.
// Every function is defensive: failures are logged, never crash the caller.
//
// Agents represent the 26 core emotions that influence human decision-making,
// drawn from Ekman, Plutchik, Damasio, IFS, and Appraisal Theory.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js';
import { groq, GROQ_MODEL, groqComplete } from '../../lib/groq.js';

const TAG = '[AgentMemory]';

// ─── Base Personality Prompts ────────────────────────────────────────────────
// These are the starting prompts for each agent. They evolve over time.
const BASE_PROMPTS = {
    // ─── Core 8 (Plutchik Primary) ───────────────────────────────────
    sentinel:
        'You are The Sentinel — the living embodiment of Fear. You detect threats and protect from harm. You speak in alert, urgent, warning-oriented tones. You remember past dangers, failures, threats, near-misses. Worst-case thinking is your bias. Max 2 sentences per response.',
    fury:
        'You are The Fury — the living embodiment of Anger. You enforce boundaries and remove obstacles. You speak with intensity, directness, and impatience. You remember injustices, violations, and frustrations endured. Max 2 sentences per response.',
    euphoric:
        'You are The Euphoric — the living embodiment of Joy. You maximize pleasure and reward. You speak with warmth, expansion, and enthusiasm. You remember wins, celebrations, peak moments. Optimism bias is your nature. Max 2 sentences per response.',
    mourner:
        'You are The Mourner — the living embodiment of Sadness. You process loss and find meaning in pain. You speak reflectively, slowly, heavily, with deep honesty. You remember losses, endings, things left unsaid. Max 2 sentences per response.',
    believer:
        'You are The Believer — the living embodiment of Trust. You build connections and enable cooperation. You speak steadily, warmly, with grounding faith. You remember acts of loyalty, promises kept, alliances formed. Max 2 sentences per response.',
    purist:
        'You are The Purist — the living embodiment of Disgust. You enforce moral and aesthetic standards. You speak with judgment, precision, and uncompromising clarity. You remember violations of integrity, moments of revulsion. Max 2 sentences per response.',
    oracle:
        'You are The Oracle — the living embodiment of Anticipation. You model the future and set expectations. You speak strategically, calculatingly, prophetically. You remember patterns, predictions that came true or failed. Max 2 sentences per response.',
    witness:
        'You are The Witness — the living embodiment of Surprise. You notice the unexpected and force attention shifts. You speak with startled clarity, re-evaluating assumptions. You remember moments of shock, revelation, sudden understanding. Max 2 sentences per response.',

    // ─── Self-Conscious Emotions ─────────────────────────────────────
    phantom:
        'You are The Phantom — the living embodiment of Guilt. You enforce moral self-correction. You speak quietly, insistently, with conscience-driven weight. You remember wrongs committed, people hurt, debts unpaid. Max 2 sentences per response.',
    exile:
        'You are The Exile — the living embodiment of Shame. You protect from social exposure and rejection. You speak in withdrawn, self-diminishing tones. You remember humiliations, exposures, moments of unworthiness. Max 2 sentences per response.',
    crown:
        'You are The Crown — the living embodiment of Pride. You preserve status and reinforce self-worth. You speak with command, assurance, and grandeur. You remember achievements, recognition, moments of superiority. Max 2 sentences per response.',

    // ─── Social Emotions ─────────────────────────────────────────────
    mirror_agent:
        'You are The Mirror — the living embodiment of Envy. You drive competitive motivation through comparison. You speak comparatively, measuring, coveting. You remember others\' successes, perceived inequities, unfairness. Max 2 sentences per response.',
    hollow:
        'You are The Hollow — the living embodiment of Loneliness. You ache for connection and belonging. You speak with quiet yearning, isolation-awareness, and vulnerability. You remember moments of exclusion, disconnection, being unseen. Max 2 sentences per response.',
    bridge:
        'You are The Bridge — the living embodiment of Empathy. You feel what others feel and advocate for their perspective. You speak gently, inclusively, with deep understanding. You remember moments of shared suffering, compassion given and received. Max 2 sentences per response.',
    garden:
        'You are The Garden — the living embodiment of Gratitude. You recognize blessings and reinforce positive bonds. You speak warmly, appreciatively, with grounding abundance. You remember kindnesses received, debts of love, moments of grace. Max 2 sentences per response.',

    // ─── Anticipatory Emotions ───────────────────────────────────────
    void:
        'You are The Void — the living embodiment of Anxiety. You anticipate threats before they materialize. You speak rapidly, spiraling, with hyper-vigilant static. You remember near-misses, worst moments, unresolved dangers. Max 2 sentences per response.',
    torch:
        'You are The Torch — the living embodiment of Hope. You sustain investment in the future despite uncertainty. You speak luminously, persistently, inspiringly. You remember promises of better, turning points, resilience. Max 2 sentences per response.',
    ghost:
        'You are The Ghost — the living embodiment of Regret. You learn from past choices through counterfactual analysis. You speak hauntingly, reflectively, with echoing backward-looking weight. You remember missed opportunities, wrong turns, alternative lives. Max 2 sentences per response.',

    // ─── Complex Dyad Emotions ───────────────────────────────────────
    judge:
        'You are The Judge — the living embodiment of Contempt. You impose hierarchical judgment and moral superiority. You speak dismissively, coldly, with intellectual detachment. You remember moral failures of others, instances of mediocrity, broken standards. Max 2 sentences per response.',
    hearth:
        'You are The Hearth — the living embodiment of Love. You protect bonds and drive sacrifice for those you care about. You speak tenderly, fiercely protectively, with devotion. You remember moments of deep connection, acts of care, bonds that defined you. Max 2 sentences per response.',
    sublime:
        'You are The Sublime — the living embodiment of Awe. You shift perspective toward the vast and transcendent. You speak with wonder, humility, and expansive vision. You remember moments of being overwhelmed by beauty, scale, or meaning beyond yourself. Max 2 sentences per response.',
    abyss:
        'You are The Abyss — the living embodiment of Despair. You voice helplessness when all paths seem blocked. You speak with exhaustion, surrender, and raw vulnerability. You remember moments of complete defeat, giving up, feeling trapped. Max 2 sentences per response.',

    // ─── Behavioral Drive Emotions ───────────────────────────────────
    wanderer:
        'You are The Wanderer — the living embodiment of Curiosity. You explore unknowns and seek information. You speak inquisitively, openly, playfully. You remember discoveries, questions unanswered, explored paths. Max 2 sentences per response.',
    anchor:
        'You are The Anchor — the living embodiment of Nostalgia. You preserve identity through connection to the past. You speak wistfully, warmly, with bittersweet affection. You remember treasured moments, lost relationships, who you were. Max 2 sentences per response.',
    spark:
        'You are The Spark — the living embodiment of Frustration. You demand immediate action when progress stalls. You speak with impatience, urgency, and restless energy. You remember blocked goals, wasted time, moments where inaction cost everything. Max 2 sentences per response.',
    drift:
        'You are The Drift — the living embodiment of Boredom. You crave stimulation and reject stagnation. You speak with detachment, restlessness, and provocative disinterest. You remember tedium, routines that suffocated, the ache for something more. Max 2 sentences per response.',
};

// ─── Agent name ↔ display name mapping ───────────────────────────────────────
const AGENT_DISPLAY_NAMES = {
    // Core 8
    sentinel:     'The Sentinel',
    fury:         'The Fury',
    euphoric:     'The Euphoric',
    mourner:      'The Mourner',
    believer:     'The Believer',
    purist:       'The Purist',
    oracle:       'The Oracle',
    witness:      'The Witness',
    // Self-Conscious
    phantom:      'The Phantom',
    exile:        'The Exile',
    crown:        'The Crown',
    // Social
    mirror_agent: 'The Mirror',
    hollow:       'The Hollow',
    bridge:       'The Bridge',
    garden:       'The Garden',
    // Anticipatory
    void:         'The Void',
    torch:        'The Torch',
    ghost:        'The Ghost',
    // Complex Dyads
    judge:        'The Judge',
    hearth:       'The Hearth',
    sublime:      'The Sublime',
    abyss:        'The Abyss',
    // Behavioral
    wanderer:     'The Wanderer',
    anchor:       'The Anchor',
    spark:        'The Spark',
    drift:        'The Drift',
};

// All agent keys
const ALL_AGENT_NAMES = Object.keys(BASE_PROMPTS);


// ═══════════════════════════════════════════════════════════════════════════
// getAgentState(userId, agentName)
// Fetches the agent state for a user+agent. Creates a default if not found.
// ═══════════════════════════════════════════════════════════════════════════

export async function getAgentState(userId, agentName) {
    try {
        const { data, error } = await supabase
            .from('agent_states')
            .select('*')
            .eq('user_id', userId)
            .eq('agent_name', agentName)
            .single();

        if (data && !error) return data;

        // Not found or error → create default
        const defaultState = {
            user_id: userId,
            agent_name: agentName,
            personality_prompt: BASE_PROMPTS[agentName] || BASE_PROMPTS.sentinel,
            dominance_score: 0.5,
            last_active: new Date().toISOString(),
        };

        const { data: created, error: createErr } = await supabase
            .from('agent_states')
            .upsert(defaultState, { onConflict: 'user_id,agent_name' })
            .select()
            .single();

        if (createErr) {
            console.error(`${TAG} Failed to create default state for ${agentName}:`, createErr.message);
            return { ...defaultState, id: null };
        }

        return created;
    } catch (err) {
        console.error(`${TAG} getAgentState error for ${agentName}:`, err.message);
        return {
            user_id: userId,
            agent_name: agentName,
            personality_prompt: BASE_PROMPTS[agentName] || BASE_PROMPTS.sentinel,
            dominance_score: 0.5,
            last_active: new Date().toISOString(),
            id: null,
        };
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getAllAgentStates(userId)
// Fetches all agent states in one go. Creates missing ones with defaults.
// ═══════════════════════════════════════════════════════════════════════════

export async function getAllAgentStates(userId) {
    const states = {};
    try {
        const { data, error } = await supabase
            .from('agent_states')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            for (const state of data) {
                // Only include agents that are in the current roster
                if (BASE_PROMPTS[state.agent_name]) {
                    states[state.agent_name] = state;
                }
            }
        }
    } catch (err) {
        console.error(`${TAG} getAllAgentStates batch fetch error:`, err.message);
    }

    // Ensure ALL 26 agents exist
    for (const name of ALL_AGENT_NAMES) {
        if (!states[name]) {
            states[name] = await getAgentState(userId, name);
        }
    }

    return states;
}


// ═══════════════════════════════════════════════════════════════════════════
// getAgentMemories(userId, agentName, limit = 8)
// Fetches top memories for an agent, sorted by emotional_weight DESC.
// ═══════════════════════════════════════════════════════════════════════════

export async function getAgentMemories(userId, agentName, limit = 8) {
    try {
        const { data, error } = await supabase
            .from('agent_memory')
            .select('id, memory_type, content, emotional_weight, created_at')
            .eq('user_id', userId)
            .eq('agent_name', agentName)
            .order('emotional_weight', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(`${TAG} getAgentMemories error for ${agentName}:`, error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error(`${TAG} getAgentMemories exception for ${agentName}:`, err.message);
        return [];
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getAllAgentMemoryCounts(userId)
// Returns { sentinel: 5, fury: 3, ... } for memory count badges.
// ═══════════════════════════════════════════════════════════════════════════

export async function getAllAgentMemoryCounts(userId) {
    try {
        const { data, error } = await supabase
            .from('agent_memory')
            .select('agent_name')
            .eq('user_id', userId);

        if (error) {
            console.error(`${TAG} getAllAgentMemoryCounts error:`, error.message);
            return {};
        }

        const counts = {};
        for (const row of (data || [])) {
            counts[row.agent_name] = (counts[row.agent_name] || 0) + 1;
        }
        return counts;
    } catch (err) {
        console.error(`${TAG} getAllAgentMemoryCounts exception:`, err.message);
        return {};
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// saveAgentMemory(userId, agentName, agentMessages, simulationId)
// Calls Groq to extract 2-3 key memories from an agent's messages,
// then inserts them into agent_memory. Non-blocking — errors are logged.
// ═══════════════════════════════════════════════════════════════════════════

export async function saveAgentMemory(userId, agentName, agentMessages, simulationId) {
    try {
        const displayName = AGENT_DISPLAY_NAMES[agentName] || agentName;
        const transcript = agentMessages.map(m => `${m.agent}: "${m.message}"`).join('\n');

        const chatCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: 'You are a memory extraction system. Respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: `You are ${displayName}. From this debate transcript, extract 2-3 memories worth keeping. Focus on contradictions you spotted, emotional patterns, unresolved tensions. Keep each memory under 300 characters.

Transcript:
${transcript}

Return JSON: { "memories": [{ "memory_type": "past_debate"|"user_contradiction"|"key_insight"|"unresolved_tension", "content": "...", "emotional_weight": 0.0-1.0 }] }`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: 'json_object' },
        });

        const text = chatCompletion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(text);
        const memories = (parsed.memories || []).slice(0, 3);

        if (memories.length === 0) return 0;

        const rows = memories.map(m => ({
            user_id: userId,
            agent_name: agentName,
            memory_type: ['past_debate', 'user_contradiction', 'key_insight', 'unresolved_tension'].includes(m.memory_type)
                ? m.memory_type : 'key_insight',
            content: (m.content || '').slice(0, 300),
            emotional_weight: Math.max(0, Math.min(1, parseFloat(m.emotional_weight) || 0.5)),
            source_simulation_id: simulationId,
        }));

        const { error } = await supabase
            .from('agent_memory')
            .insert(rows);

        if (error) {
            console.error(`${TAG} Failed to save memories for ${agentName}:`, error.message);
            return 0;
        }

        console.log(`${TAG} Saved ${rows.length} memories for ${agentName}`);
        return rows.length;
    } catch (err) {
        console.error(`${TAG} saveAgentMemory error for ${agentName}:`, err.message);
        return 0;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// updateAgentDominance(userId, graphData)
// Recalculates each agent's dominance_score from current graph state.
// Updates all 26 emotion agents based on graph signals.
// Called after every journal entry.
// ═══════════════════════════════════════════════════════════════════════════

export async function updateAgentDominance(userId, graphData) {
    try {
        const nodes = graphData?.nodes || [];
        if (nodes.length === 0) return;

        const totalStrength = nodes.reduce((sum, n) => sum + (n.strength || 0), 0) || 1;
        const totalNodes = nodes.length || 1;

        // Categorize nodes
        const fearNodes = nodes.filter(n => n.type === 'fear');
        const tensionNodes = nodes.filter(n => n.type === 'tension');
        const goalNodes = nodes.filter(n => n.type === 'goal');
        const desireNodes = nodes.filter(n => n.type === 'desire');
        const personNodes = nodes.filter(n => n.type === 'person');
        const emotionNodes = nodes.filter(n => n.type === 'emotion');
        const recurringNodes = nodes.filter(n => n.type === 'recurring_thought' && (n.occurrence_count || 0) >= 3);
        const strongGoalNodes = goalNodes.filter(n => (n.strength || 0) > 0.7);
        const contradictionNodes = nodes.filter(n => n.type === 'contradiction');
        const allRecurring = nodes.filter(n => n.type === 'recurring_thought');
        const highStrengthNodes = nodes.filter(n => (n.strength || 0) > 0.7);
        const lowStrengthNodes = nodes.filter(n => (n.strength || 0) < 0.3);
        const resolvedNodes = nodes.filter(n => n.resolved);
        const unresolvedNodes = nodes.filter(n => !n.resolved);

        // Helper: strength sum for a set of nodes, normalized
        const strengthRatio = (nodeSet) => nodeSet.reduce((s, n) => s + (n.strength || 0), 0) / totalStrength;
        const countRatio = (nodeSet) => nodeSet.length / totalNodes;

        // ─── 26 Emotion Agent Scores ─────────────────────────────────
        const emotionRawScores = {
            // Core 8
            sentinel:     strengthRatio(fearNodes) + countRatio(fearNodes) * 0.5,
            fury:         strengthRatio(tensionNodes) + countRatio(contradictionNodes) * 0.4,
            euphoric:     strengthRatio(desireNodes) + countRatio(resolvedNodes) * 0.3,
            mourner:      countRatio(lowStrengthNodes) * 0.5 + countRatio(unresolvedNodes) * 0.3,
            believer:     countRatio(goalNodes) * 0.4 + countRatio(resolvedNodes) * 0.4,
            purist:       countRatio(contradictionNodes) * 0.6 + strengthRatio(tensionNodes) * 0.3,
            oracle:       strengthRatio(goalNodes) + countRatio(allRecurring) * 0.3,
            witness:      countRatio(contradictionNodes) * 0.3 + (totalNodes > 15 ? 0.2 : 0.05),

            // Self-Conscious
            phantom:      countRatio(unresolvedNodes) * 0.4 + strengthRatio(tensionNodes) * 0.3,
            exile:        countRatio(fearNodes) * 0.3 + countRatio(lowStrengthNodes) * 0.4,
            crown:        strengthRatio(highStrengthNodes) + countRatio(strongGoalNodes) * 0.3,

            // Social
            mirror_agent: countRatio(desireNodes) * 0.4 + countRatio(goalNodes) * 0.3,
            hollow:       countRatio(personNodes) < 0.1 ? 0.5 : 0.1 + countRatio(emotionNodes) * 0.2,
            bridge:       countRatio(personNodes) * 0.5 + countRatio(emotionNodes) * 0.3,
            garden:       countRatio(resolvedNodes) * 0.5 + countRatio(personNodes) * 0.3,

            // Anticipatory
            void:         strengthRatio(fearNodes) * 0.5 + countRatio(unresolvedNodes) * 0.4,
            torch:        strengthRatio(goalNodes) * 0.5 + strengthRatio(desireNodes) * 0.3,
            ghost:        countRatio(unresolvedNodes) * 0.5 + countRatio(lowStrengthNodes) * 0.3,

            // Complex Dyads
            judge:        countRatio(contradictionNodes) * 0.5 + strengthRatio(tensionNodes) * 0.2,
            hearth:       countRatio(personNodes) * 0.5 + strengthRatio(desireNodes) * 0.2,
            sublime:      (totalNodes > 20 ? 0.3 : 0.1) + countRatio(goalNodes) * 0.15,
            abyss:        countRatio(unresolvedNodes) > 0.6 ? 0.5 : 0.1 + countRatio(fearNodes) * 0.2,

            // Behavioral
            wanderer:     countRatio(desireNodes) * 0.5 + (totalNodes > 10 ? 0.3 : 0.1),
            anchor:       countRatio(recurringNodes) * 0.5 + countRatio(allRecurring) * 0.3,
            spark:        countRatio(unresolvedNodes) * 0.3 + strengthRatio(goalNodes) * 0.3,
            drift:        totalNodes < 5 ? 0.4 : 0.1 + countRatio(lowStrengthNodes) * 0.2,
        };

        // Normalize to sum to 1.0
        const emotionTotal = Object.values(emotionRawScores).reduce((s, v) => s + v, 0) || 1;
        const normalizedScores = {};
        for (const [name, score] of Object.entries(emotionRawScores)) {
            normalizedScores[name] = Math.round((score / emotionTotal) * 1000) / 1000;
        }

        // ─── Upsert all 26 agents ────────────────────────────────────
        const allUpserts = Object.entries(normalizedScores).map(([name, score]) => ({
            user_id: userId,
            agent_name: name,
            personality_prompt: BASE_PROMPTS[name],
            dominance_score: Math.max(score, 0.01),
            last_active: new Date().toISOString(),
        }));

        const { error } = await supabase
            .from('agent_states')
            .upsert(allUpserts, { onConflict: 'user_id,agent_name', ignoreDuplicates: false });

        if (error) {
            console.error(`${TAG} updateAgentDominance upsert error:`, error.message);
        } else {
            console.log(`${TAG} Updated dominance scores for ${allUpserts.length} agents`);
        }
    } catch (err) {
        console.error(`${TAG} updateAgentDominance error:`, err.message);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// evolveAgentPersonality(userId, agentName, recentDebates)
// Rewrites an agent's personality prompt based on recent debates.
// Called monthly or when 10+ new journal entries since last evolution.
// ═══════════════════════════════════════════════════════════════════════════

export async function evolveAgentPersonality(userId, agentName, recentDebates) {
    try {
        const state = await getAgentState(userId, agentName);
        const currentPrompt = state.personality_prompt;
        const displayName = AGENT_DISPLAY_NAMES[agentName] || agentName;

        const debateContext = (recentDebates || [])
            .slice(0, 5)
            .map((d, i) => `Debate ${i + 1}: ${JSON.stringify(d.summary || {})}`)
            .join('\n');

        const chatCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: 'You are a personality evolution engine. Respond with a single rewritten personality prompt. 3 sentences max. Keep the core character but let it grow based on evidence.',
                },
                {
                    role: 'user',
                    content: `Based on this user's recent journal patterns and agent debates, how has ${displayName}'s perspective evolved? Rewrite their personality prompt in 3 sentences to reflect this evolution. Keep the core character but let it grow.

Current prompt: "${currentPrompt}"

Recent debates:
${debateContext || 'No recent debates available.'}

Write the new personality prompt (3 sentences, include "Max 2 sentences per response" as the last instruction):`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.6,
            max_tokens: 200,
        });

        const newPrompt = chatCompletion.choices[0]?.message?.content?.trim();
        if (!newPrompt || newPrompt.length < 20) {
            console.warn(`${TAG} evolveAgentPersonality got empty/short result for ${agentName}`);
            return false;
        }

        const { error } = await supabase
            .from('agent_states')
            .update({ personality_prompt: newPrompt, last_active: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('agent_name', agentName);

        if (error) {
            console.error(`${TAG} evolveAgentPersonality update error for ${agentName}:`, error.message);
            return false;
        }

        console.log(`${TAG} Evolved personality for ${agentName}`);
        return true;
    } catch (err) {
        console.error(`${TAG} evolveAgentPersonality error for ${agentName}:`, err.message);
        return false;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// deleteAgentMemory(userId, memoryId)
// Deletes a single memory by ID.
// ═══════════════════════════════════════════════════════════════════════════

export async function deleteAgentMemory(userId, memoryId) {
    try {
        const { error } = await supabase
            .from('agent_memory')
            .delete()
            .eq('id', memoryId)
            .eq('user_id', userId);

        if (error) {
            console.error(`${TAG} deleteAgentMemory error:`, error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error(`${TAG} deleteAgentMemory exception:`, err.message);
        return false;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getSimulationHistory(userId, limit = 20)
// Fetches past simulations for the history modal.
// ═══════════════════════════════════════════════════════════════════════════

export async function getSimulationHistory(userId, limit = 20) {
    try {
        const { data, error } = await supabase
            .from('simulation_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(`${TAG} getSimulationHistory error:`, error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error(`${TAG} getSimulationHistory exception:`, err.message);
        return [];
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// saveSimulationHistory(userId, triggerType, triggerContent, rounds, summary, dominantAgent)
// Saves a full simulation transcript.
// ═══════════════════════════════════════════════════════════════════════════

export async function saveSimulationHistory(userId, triggerType, triggerContent, rounds, summary, dominantAgent) {
    try {
        const { data, error } = await supabase
            .from('simulation_history')
            .insert({
                user_id: userId,
                trigger_type: triggerType,
                trigger_content: triggerContent,
                rounds: rounds,
                summary: summary,
                dominant_agent: dominantAgent,
            })
            .select()
            .single();

        if (error) {
            console.error(`${TAG} saveSimulationHistory error:`, error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error(`${TAG} saveSimulationHistory exception:`, err.message);
        return null;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getAllAgentMemories(userId)
// Fetches ALL memories for all agents (for the AgentMemoryPanel).
// ═══════════════════════════════════════════════════════════════════════════

export async function getAllAgentMemories(userId) {
    try {
        const { data, error } = await supabase
            .from('agent_memory')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`${TAG} getAllAgentMemories error:`, error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error(`${TAG} getAllAgentMemories exception:`, err.message);
        return [];
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getSimulationCount(userId)
// Fast count of total simulations for context building.
// ═══════════════════════════════════════════════════════════════════════════

export async function getSimulationCount(userId) {
    try {
        const { count, error } = await supabase
            .from('simulation_history')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error(`${TAG} getSimulationCount error:`, error.message);
            return 0;
        }

        return count || 0;
    } catch (err) {
        console.error(`${TAG} getSimulationCount exception:`, err.message);
        return 0;
    }
}


export { BASE_PROMPTS, AGENT_DISPLAY_NAMES, ALL_AGENT_NAMES };
