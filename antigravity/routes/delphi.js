// ─── Delphi Routes ──────────────────────────────────────────────────────────
// Custom Agent Simulation — "Simulate your people before you face them"
// GET    /api/delphi/agents         → List all custom agents
// POST   /api/delphi/agents         → Create agent (AI personality generation)
// PUT    /api/delphi/agents/:id     → Update agent
// DELETE /api/delphi/agents/:id     → Delete agent
// POST   /api/delphi/chat           → Chat with AI to build agent prompt
// POST   /api/delphi/simulate       → Run multi-agent scenario simulation
// GET    /api/delphi/simulations    → List past simulations

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL, groqComplete } from '../lib/groq.js';

const router = Router();


// ═══════════════════════════════════════════════════════════════════════════
// Agent Colors — used when user doesn't pick one
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_COLORS = [
    '#E85D4A', '#1DB88A', '#9B7FE8', '#F5A623', '#5BA4F5',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function pickColor(index) {
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/delphi/agents
// List all custom agents for the user
// ═══════════════════════════════════════════════════════════════════════════

router.get('/agents', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { data, error } = await supabase
            .from('delphi_agents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ agents: data || [] });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/delphi/agents
// Create a new custom agent — auto-generates personality from description
// ═══════════════════════════════════════════════════════════════════════════

router.post('/agents', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { name, relationship, description, color } = req.body;

        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }

        // Count existing agents for color assignment
        const { count } = await supabase
            .from('delphi_agents')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        // AI: Generate structured personality from freeform description
        const completion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: `You are a personality modeler. Given a description of a real person, extract their core personality traits. Return ONLY valid JSON (no markdown):
{"personality":"2-3 sentences capturing how they think, react, and make decisions","thinking_style":"1 sentence about their reasoning approach","values":"comma-separated list of 3-5 core values","triggers":"comma-separated list of 3-5 things that emotionally trigger them or make them react strongly"}
Be specific and psychologically sharp. Avoid generic traits.`,
                },
                {
                    role: 'user',
                    content: `Person: ${name} (${relationship || 'close person'})\nDescription: ${description}`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.5,
            max_tokens: 300,
        });

        let parsed;
        try {
            const raw = completion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            parsed = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
            parsed = {
                personality: description,
                thinking_style: 'Unknown',
                values: 'Unknown',
                triggers: 'Unknown',
            };
        }

        const agentData = {
            id: uuid(),
            user_id: userId,
            name,
            initials: getInitials(name),
            color: color || pickColor(count || 0),
            personality: parsed.personality,
            thinking_style: parsed.thinking_style,
            values: parsed.values,
            triggers: parsed.triggers,
            relationship: relationship || '',
            raw_description: description,
        };

        const { data, error } = await supabase
            .from('delphi_agents')
            .insert(agentData)
            .select()
            .single();

        if (error) throw error;
        res.json({ agent: data });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/delphi/agents/:id
// Update an existing agent
// ═══════════════════════════════════════════════════════════════════════════

router.put('/agents/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const updates = req.body;

        // If description changed, regenerate personality
        if (updates.raw_description && updates.raw_description !== updates._oldDescription) {
            const completion = await groqComplete({
                messages: [
                    {
                        role: 'system',
                        content: `Extract personality traits from this person description. Return ONLY valid JSON:
{"personality":"how they think and react","thinking_style":"reasoning approach","values":"3-5 values","triggers":"3-5 emotional triggers"}`,
                    },
                    {
                        role: 'user',
                        content: `Person: ${updates.name || 'Unknown'}\nDescription: ${updates.raw_description}`,
                    },
                ],
                model: GROQ_MODEL,
                temperature: 0.5,
                max_tokens: 300,
            });

            try {
                const raw = completion.choices[0]?.message?.content || '{}';
                const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
                const parsed = JSON.parse(jsonMatch[1].trim());
                updates.personality = parsed.personality;
                updates.thinking_style = parsed.thinking_style;
                updates.values = parsed.values;
                updates.triggers = parsed.triggers;
            } catch (e) { /* keep existing */ }
        }

        delete updates._oldDescription;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('delphi_agents')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        res.json({ agent: data });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/delphi/agents/:id
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/agents/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        const { error } = await supabase
            .from('delphi_agents')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/delphi/chat
// Chat with AI to iteratively build an agent's personality prompt
// ═══════════════════════════════════════════════════════════════════════════

router.post('/chat', async (req, res, next) => {
    try {
        const { messages, agentName, relationship } = req.body;

        const systemPrompt = `You are helping the user build an AI model of a real person in their life named "${agentName || 'someone'}" (${relationship || 'their close person'}). Your job is to extract personality details through natural conversation.

Ask specific questions about:
- How does this person react under stress?
- What do they value most (money, safety, prestige, love, independence)?
- What phrases or topics make them emotional or defensive?
- How do they make decisions — gut feeling, data, consensus?
- What's their communication style — direct, passive-aggressive, emotional, logical?

After 3-4 exchanges, tell the user you have enough to build the agent and provide a summary.
Keep responses concise (2-3 sentences + a question). Be warm but efficient.`;

        const completion = await groqComplete({
            messages: [
                { role: 'system', content: systemPrompt },
                ...(messages || []),
            ],
            model: GROQ_MODEL,
            temperature: 0.7,
            max_tokens: 250,
        });

        const reply = completion.choices[0]?.message?.content || 'Could you tell me more about this person?';
        res.json({ reply });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/delphi/simulate
// Run multi-agent scenario simulation — agents debate based on personality
// ═══════════════════════════════════════════════════════════════════════════

router.post('/simulate', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { scenario, agentIds } = req.body;

        if (!scenario) {
            return res.status(400).json({ error: 'Scenario is required' });
        }

        // Fetch selected agents (or all if none specified)
        let query = supabase
            .from('delphi_agents')
            .select('*')
            .eq('user_id', userId);

        if (agentIds && agentIds.length > 0) {
            query = query.in('id', agentIds);
        }

        const { data: agents, error: agentErr } = await query;
        if (agentErr) throw agentErr;
        if (!agents || agents.length === 0) {
            return res.status(400).json({ error: 'No agents found. Create at least 2 agents first.' });
        }

        // ─── Build agent system prompts ─────────────────────────
        const agentProfiles = agents.map(a => ({
            id: a.id,
            name: a.name,
            initials: a.initials,
            color: a.color,
            relationship: a.relationship,
            systemPrompt: `You are ${a.name}, a real person in the user's life. You are their ${a.relationship || 'close person'}.

Your personality: ${a.personality}
Your thinking style: ${a.thinking_style}
Your core values: ${a.values}
Your emotional triggers: ${a.triggers}

RULES:
- Respond as this specific person would — use their speech patterns, concerns, and reasoning style
- Address other people in the room by name when you agree or disagree
- Keep responses to 2-3 sentences, natural and conversational
- Show genuine emotional reactions, not robotic analysis
- Reference your values and concerns naturally
- You can change your mind if another person makes a compelling argument`,
        }));

        const ROUNDS = 2;
        const rounds = [];
        let conversationHistory = '';

        for (let round = 0; round < ROUNDS; round++) {
            const roundMessages = [];

            // In round 2, only the 3 most opinionated agents respond
            let speakingAgents = agentProfiles;
            if (round === 1 && agentProfiles.length > 3) {
                // Random selection to simulate natural conversation flow
                speakingAgents = [...agentProfiles]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, Math.min(3, agentProfiles.length));
            }

            // Run all agents in parallel for speed
            const promises = speakingAgents.map(async (agent) => {
                try {
                    const completion = await groqComplete({
                        messages: [
                            { role: 'system', content: agent.systemPrompt },
                            {
                                role: 'user',
                                content: `The user has told the family: "${scenario}"${conversationHistory ? `\n\nThe conversation so far:\n${conversationHistory}` : ''}\n\nRespond as ${agent.name}. ${round === 0 ? 'Give your initial, honest reaction.' : 'React to what others said. Address them by name if you disagree.'}`,
                            },
                        ],
                        model: GROQ_MODEL,
                        temperature: 0.75,
                        max_tokens: 150,
                    });

                    return {
                        agentId: agent.id,
                        agentName: agent.name,
                        initials: agent.initials,
                        color: agent.color,
                        relationship: agent.relationship,
                        content: completion.choices[0]?.message?.content || '...',
                        round: round + 1,
                    };
                } catch (err) {
                    console.error(`Delphi agent ${agent.name} failed:`, err.message);
                    return {
                        agentId: agent.id,
                        agentName: agent.name,
                        initials: agent.initials,
                        color: agent.color,
                        relationship: agent.relationship,
                        content: '*pauses, thinking*',
                        round: round + 1,
                    };
                }
            });

            const results = await Promise.all(promises);
            roundMessages.push(...results);

            // Build conversation history for next round
            conversationHistory += results.map(r => `${r.agentName}: "${r.content}"`).join('\n') + '\n';

            rounds.push(roundMessages);
        }

        // ─── Generate insights (what the simulation revealed) ──────
        const insightCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: `You are a conversation strategist. Based on a simulated family/group discussion, extract exactly 4 tactical insights. Return ONLY valid JSON:
{"insights":[{"headline":"bold actionable headline","detail":"1-2 sentences of specific tactical advice","color":"red|green|blue|amber"}]}
Each insight should be a specific, actionable thing the user should do in the REAL conversation. Reference specific people by name. Be psychologically sharp — not generic advice.`,
                },
                {
                    role: 'user',
                    content: `Scenario: "${scenario}"\n\nFull conversation:\n${conversationHistory}`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.6,
            max_tokens: 400,
        });

        let insights = [];
        try {
            const raw = insightCompletion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            insights = JSON.parse(jsonMatch[1].trim()).insights || [];
        } catch (e) {
            insights = [{ headline: 'Simulation complete', detail: 'Review the conversation above for insights.', color: 'blue' }];
        }

        // ─── Generate outcome probabilities ──────────────────────────
        let probabilities = [];
        try {
            const probCompletion = await groqComplete({
                messages: [
                    {
                        role: 'system',
                        content: `Based on a simulated group discussion, predict the most likely outcomes with probability percentages. Return ONLY valid JSON:
{"outcomes":[{"outcome":"short description of this outcome","probability":75,"sentiment":"positive|negative|neutral"}]}
Generate exactly 3-4 outcomes. Probabilities must sum to 100. Be specific and reference the actual decision/scenario. Base predictions on how the conversation actually went.`,
                    },
                    {
                        role: 'user',
                        content: `Scenario: "${scenario}"\n\nFull conversation:\n${conversationHistory}`,
                    },
                ],
                model: GROQ_MODEL,
                temperature: 0.5,
                max_tokens: 300,
            });
            const raw = probCompletion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            probabilities = JSON.parse(jsonMatch[1].trim()).outcomes || [];
        } catch (e) {
            probabilities = [{ outcome: 'Analysis pending', probability: 100, sentiment: 'neutral' }];
        }

        // ─── Generate trigger map for each agent ─────────────────────
        let triggerMap = [];
        try {
            const triggerCompletion = await groqComplete({
                messages: [
                    {
                        role: 'system',
                        content: `Based on people's communication in a group discussion, identify the specific phrases and topics that trigger each person positively and negatively. Return ONLY valid JSON:
{"triggers":[{"name":"Person Name","avoid":["phrase that triggers them negatively","another dangerous phrase","topic to not bring up"],"use":["phrase that opens them up","language that makes them receptive","approach that works"]}]}
Be very specific — use exact words and phrases, not abstract concepts. Each person should have 3 avoid and 3 use entries.`,
                    },
                    {
                        role: 'user',
                        content: `People involved:\n${agents.map(a => `${a.name} (${a.relationship}): ${a.personality}`).join('\n')}\n\nScenario: "${scenario}"\n\nConversation:\n${conversationHistory}`,
                    },
                ],
                model: GROQ_MODEL,
                temperature: 0.5,
                max_tokens: 500,
            });
            const raw = triggerCompletion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            triggerMap = JSON.parse(jsonMatch[1].trim()).triggers || [];
        } catch (e) {
            triggerMap = [];
        }

        // ─── Save simulation ───────────────────────────────────────
        const simId = uuid();
        const simData = {
            id: simId,
            user_id: userId,
            scenario,
            agent_ids: agents.map(a => a.id),
            rounds,
            insights: { insights, probabilities, triggerMap },
        };

        try {
            await supabase.from('delphi_simulations').insert(simData);
        } catch (saveErr) {
            console.warn('Failed to save delphi simulation:', saveErr.message);
        }

        res.json({
            simulationId: simId,
            rounds,
            insights,
            probabilities,
            triggerMap,
            agents: agents.map(a => ({ id: a.id, name: a.name, initials: a.initials, color: a.color, relationship: a.relationship })),
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/delphi/rehearse
// Rehearsal mode — user types as themselves, agents respond in character
// ═══════════════════════════════════════════════════════════════════════════

router.post('/rehearse', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { userMessage, scenario, conversationSoFar, agentIds } = req.body;

        if (!userMessage) return res.status(400).json({ error: 'Message is required' });

        // Fetch agents
        let query = supabase.from('delphi_agents').select('*').eq('user_id', userId);
        if (agentIds?.length > 0) query = query.in('id', agentIds);
        const { data: agents, error } = await query;
        if (error) throw error;
        if (!agents?.length) return res.status(400).json({ error: 'No agents found' });

        // Each agent responds to the user's message
        const promises = agents.map(async (a) => {
            try {
                const completion = await groqComplete({
                    messages: [
                        {
                            role: 'system',
                            content: `You are ${a.name}, a real person. You are their ${a.relationship || 'close person'}.
Personality: ${a.personality}
Thinking style: ${a.thinking_style}
Values: ${a.values}
Triggers: ${a.triggers}

You are in a real conversation about: "${scenario}"
The conversation so far has been intense. Now the user (your ${a.relationship === 'Mother' || a.relationship === 'Father' ? 'child' : 'loved one'}) is speaking directly to the group.

RULES:
- Respond naturally as this person, not as an AI
- Keep it to 1-3 sentences — real conversations aren't speeches
- React to what they JUST said, not the whole scenario
- Show emotion if warranted — people aren't robots
- You can be swayed if they say the right thing`,
                        },
                        {
                            role: 'user',
                            content: `${conversationSoFar ? `Previous discussion:\n${conversationSoFar}\n\n` : ''}The user now says directly to everyone: "${userMessage}"\n\nRespond as ${a.name}:`,
                        },
                    ],
                    model: GROQ_MODEL,
                    temperature: 0.75,
                    max_tokens: 120,
                });

                return {
                    agentId: a.id,
                    agentName: a.name,
                    initials: a.initials || getInitials(a.name),
                    color: a.color,
                    relationship: a.relationship,
                    content: completion.choices[0]?.message?.content || '...',
                };
            } catch (err) {
                return {
                    agentId: a.id, agentName: a.name, initials: a.initials || getInitials(a.name),
                    color: a.color, relationship: a.relationship, content: '*looks at you thoughtfully*',
                };
            }
        });

        const responses = await Promise.all(promises);
        res.json({ responses });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/delphi/debrief
// Post-conversation debrief — compare prediction vs reality
// ═══════════════════════════════════════════════════════════════════════════

router.post('/debrief', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { simulationId, realOutcome, accuracyRating } = req.body;

        if (!simulationId || !realOutcome) {
            return res.status(400).json({ error: 'simulationId and realOutcome required' });
        }

        // Fetch the simulation
        const { data: sim, error: fetchErr } = await supabase
            .from('delphi_simulations')
            .select('*')
            .eq('id', simulationId)
            .eq('user_id', userId)
            .single();

        if (fetchErr) throw fetchErr;
        if (!sim) return res.status(404).json({ error: 'Simulation not found' });

        // AI: Compare prediction vs reality
        const predictedInsights = sim.insights?.insights || [];
        const predictedConvo = (sim.rounds || []).flat().map(m => `${m.agentName}: "${m.content}"`).join('\n');

        const completion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: `You are comparing a simulated conversation with what actually happened in real life. Analyze the accuracy and generate learning insights. Return ONLY valid JSON:
{"accuracy_score":78,"comparison":[{"aspect":"specific thing predicted","predicted":"what simulation said","reality":"what actually happened","accurate":true}],"learnings":["specific thing to adjust about a person's model for next time"],"overall":"1-2 sentence summary of how accurate the simulation was"}
Be specific. Reference people by name. accuracy_score is 0-100.`,
                },
                {
                    role: 'user',
                    content: `Original scenario: "${sim.scenario}"\n\nSimulation predicted:\n${predictedConvo}\n\nKey insights predicted:\n${predictedInsights.map(i => `- ${i.headline}: ${i.detail}`).join('\n')}\n\nWhat ACTUALLY happened:\n${realOutcome}`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.5,
            max_tokens: 500,
        });

        let debrief = {};
        try {
            const raw = completion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            debrief = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
            debrief = { accuracy_score: 50, comparison: [], learnings: [], overall: 'Comparison generated.' };
        }

        // Save debrief to the simulation record
        const updatedInsights = { ...sim.insights, debrief, realOutcome, accuracyRating };
        try {
            await supabase
                .from('delphi_simulations')
                .update({ insights: updatedInsights })
                .eq('id', simulationId)
                .eq('user_id', userId);
        } catch (e) {
            console.warn('Failed to save debrief:', e.message);
        }

        res.json({ debrief });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/delphi/simulations
// List past simulations (with full data for replay)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/simulations', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { data, error } = await supabase
            .from('delphi_simulations')
            .select('id, scenario, agent_ids, rounds, insights, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json({ simulations: data || [] });
    } catch (err) {
        next(err);
    }
});


export default router;

