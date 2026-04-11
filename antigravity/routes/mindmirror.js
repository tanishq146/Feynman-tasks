// ─── Mind Mirror Routes ─────────────────────────────────────────────────────
// Journal API for the Mind Mirror feature.
// POST   /api/mindmirror/journal           → Save entry + run AI pipeline + auto-trigger
// GET    /api/mindmirror/journal           → Get all journal entries for user
// DELETE /api/mindmirror/journal/:id       → Delete a journal entry
// GET    /api/mindmirror/graph             → Get full mind graph for user
// POST   /api/mindmirror/resolve/:id       → Mark a pressure point as resolved
// GET    /api/mindmirror/node/:id/appearances → Journal snippets where node appeared
// POST   /api/mindmirror/node/:id/insight  → AI insight about a node
// POST   /api/mindmirror/simulate-thought  → Run 26 emotion agent debate with persistent memory
// GET    /api/mindmirror/agent-states      → Get all agent states for user
// GET    /api/mindmirror/agent-memories    → Get all agent memories for user
// DELETE /api/mindmirror/agent-memory/:id  → Delete a single agent memory
// GET    /api/mindmirror/simulation-history → Get past simulations

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL, groqComplete } from '../lib/groq.js';
import { extractMindEntities } from '../services/mindmirror/extractEntities.js';
import { updateMindGraph } from '../services/mindmirror/graphBuilder.js';
import { detectContradictions } from '../services/mindmirror/contradictionDetector.js';
import { detectPressurePoints, resolvePressurePoint } from '../services/mindmirror/pressurePoints.js';
import {
    getAgentState,
    getAllAgentStates,
    getAgentMemories,
    getAllAgentMemoryCounts,
    saveAgentMemory,
    updateAgentDominance,
    deleteAgentMemory,
    getSimulationHistory,
    saveSimulationHistory,
    getAllAgentMemories,
    getSimulationCount,
    AGENT_DISPLAY_NAMES,
} from '../services/mindmirror/agentMemory.js';
import {
    checkAndTriggerWeeklyReport,
    generateFullReport,
    getLatestReport,
    getReportHistory,
    getNodeSnapshots,
    calculateNodeTrajectories,
    softDeleteReport,
} from '../services/mindmirror/mirrorReport.js';


const router = Router();

// ─── Verify tables exist on first use ────────────────────────────────────────
let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    const { error } = await supabase
        .from('journal_entries')
        .select('id')
        .limit(1);
    if (error && error.code === '42P01') {
        console.error('❌ journal_entries table does not exist. Run the migration:');
        console.error('   migrations/add_mind_mirror.sql');
        throw new Error('journal_entries table not found. Run the migration SQL in Supabase dashboard.');
    }
    if (error) {
        console.warn('⚠️ journal_entries check returned error:', error.message);
        return;
    }
    tableReady = true;
}


/**
 * Fetch the full mind graph state for a user.
 * Used both internally (after pipeline) and by the GET /graph endpoint.
 */
async function fetchGraphState(userId) {
    const [nodesResult, edgesResult] = await Promise.all([
        supabase
            .from('mind_nodes')
            .select('*')
            .eq('user_id', userId)
            .order('strength', { ascending: false }),
        supabase
            .from('mind_edges')
            .select('*')
            .eq('user_id', userId),
    ]);

    return {
        nodes: nodesResult.data || [],
        edges: edgesResult.data || [],
    };
}


// ─── Auto-trigger signal detection ───────────────────────────────────────────
const AUTO_TRIGGER_PATTERNS = [
    /\?/,
    /\bshould I\b/i,
    /\bI don'?t know\b/i,
    /\bwhat if\b/i,
    /\bI keep\b/i,
    /\bI can'?t\b/i,
];

function shouldAutoTrigger(content) {
    return AUTO_TRIGGER_PATTERNS.some(pattern => pattern.test(content));
}


// ─── Background simulation runner (for auto-trigger) ─────────────────────────
// Tracks if a background simulation just completed so GET /graph can notify
const pendingSimulations = new Map(); // userId → boolean

async function runBackgroundSimulation(userId, journalContent) {
    try {
        console.log(`🧠 [AutoTrigger] Starting background simulation for user ${userId}`);
        const result = await runSimulation(userId, journalContent, 'auto_journal');
        if (result) {
            pendingSimulations.set(userId, true);
            console.log(`🧠 [AutoTrigger] Background simulation complete for user ${userId}`);
        }
    } catch (err) {
        console.error(`🧠 [AutoTrigger] Background simulation failed:`, err.message);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/journal
// Save a new journal entry, then run the full AI pipeline:
//   1. extractMindEntities (Claude) → entity extraction
//   2. updateMindGraph (Supabase)   → upsert nodes + edges
//   3. detectContradictions (Claude) → find internal conflicts
//   4. detectPressurePoints (query)  → find recurring unresolved themes
//   5. Auto-trigger simulation if journal content matches signal patterns
// Returns: { entry, graph, contradictions, pressurePoints }
// ═══════════════════════════════════════════════════════════════════════════

router.post('/journal', async (req, res, next) => {
    try {
        await ensureTable();
        const userId = req.user.uid;
        const { content, mode } = req.body;

        // Validation
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'content is required and must be a non-empty string' });
        }

        const validModes = ['conscious', 'subconscious'];
        const entryMode = validModes.includes(mode) ? mode : 'conscious';

        // Count words
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

        const entryId = uuid();
        const now = new Date().toISOString();

        const entry = {
            id: entryId,
            user_id: userId,
            content: content.trim(),
            mode: entryMode,
            word_count: wordCount,
            created_at: now,
        };

        // Step 0: Save the raw journal entry
        const { data: savedEntry, error: saveErr } = await supabase
            .from('journal_entries')
            .insert(entry)
            .select()
            .single();

        if (saveErr) throw saveErr;
        console.log(`🪞 Mind Mirror: Journal entry saved [${entryMode}] (${wordCount} words)`);

        // Step 1: Extract psychological entities via Claude
        console.log('🪞 Pipeline: Step 1 — Entity extraction...');
        const entities = await extractMindEntities(content.trim());

        // Step 2: Upsert extracted entities into the graph
        console.log('🪞 Pipeline: Step 2 — Graph update...');
        const graphResult = await updateMindGraph(entities, userId, entryId);

        // Step 3: Detect contradictions (only if we have enough nodes)
        console.log('🪞 Pipeline: Step 3 — Contradiction detection...');
        const contradictions = await detectContradictions(userId);

        // Step 4: Detect pressure points
        console.log('🪞 Pipeline: Step 4 — Pressure point detection...');
        const pressurePoints = await detectPressurePoints(userId);

        // Step 5: Fetch full graph state for the client
        const graph = await fetchGraphState(userId);

        // Step 6: Update agent dominance scores based on new graph
        console.log('🪞 Pipeline: Step 6 — Agent dominance update...');
        updateAgentDominance(userId, graph).catch(err =>
            console.error('🪞 Agent dominance update failed (non-blocking):', err.message)
        );

        // Step 7: Auto-trigger simulation if content matches signal patterns
        if (shouldAutoTrigger(content.trim())) {
            console.log('🪞 Pipeline: Step 7 — Auto-triggering background simulation...');
            // Fire and forget — don't await, don't block the journal response
            runBackgroundSimulation(userId, content.trim());
        }

        // Step 8: Check if weekly mirror report is due (non-blocking)
        checkAndTriggerWeeklyReport(userId).catch(err =>
            console.error('🪞 Mirror report check failed (non-blocking):', err.message)
        );

        console.log(`🪞 Pipeline: Complete ✓ (${graphResult.upsertedNodes.length} nodes, ${graphResult.createdEdges.length} edges, ${contradictions.length} contradictions, ${pressurePoints.length} pressure points)`);

        res.status(201).json({
            entry: savedEntry,
            // AI analysis results
            extracted: entities,
            graphUpdate: {
                upsertedNodes: graphResult.upsertedNodes,
                createdEdges: graphResult.createdEdges,
            },
            contradictions,
            pressurePoints,
            // Full current graph state
            graph,
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/journal
// Get all journal entries for the authenticated user
// ═══════════════════════════════════════════════════════════════════════════

router.get('/journal', async (req, res, next) => {
    try {
        await ensureTable();
        const userId = req.user.uid;
        const { mode } = req.query;

        let query = supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Optional mode filter
        if (mode && ['conscious', 'subconscious'].includes(mode)) {
            query = query.eq('mode', mode);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ entries: data || [] });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/graph
// Get the full mind graph (nodes + edges) for the authenticated user
// Includes pendingSimulation flag if a background sim just completed
// ═══════════════════════════════════════════════════════════════════════════

router.get('/graph', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const graph = await fetchGraphState(userId);
        const pressurePoints = await detectPressurePoints(userId);

        // Check for pending background simulation
        const hasPending = pendingSimulations.get(userId) || false;
        if (hasPending) {
            pendingSimulations.delete(userId);
        }

        res.json({ ...graph, pressurePoints, pendingSimulation: hasPending });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/resolve/:id
// Mark a pressure point mind node as resolved
// ═══════════════════════════════════════════════════════════════════════════

router.post('/resolve/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const success = await resolvePressurePoint(userId, id);
        if (!success) {
            return res.status(500).json({ error: 'Failed to resolve pressure point' });
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/mindmirror/journal/:id
// Delete a journal entry
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/journal/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`🪞 Mind Mirror: Journal entry deleted: ${id}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/node/:id/appearances
// Get journal entry snippets where a specific node appeared
// ═══════════════════════════════════════════════════════════════════════════

router.get('/node/:id/appearances', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        const { data: maps, error: mapErr } = await supabase
            .from('node_journal_map')
            .select('journal_entry_id')
            .eq('node_id', id);

        if (mapErr) throw mapErr;

        if (!maps || maps.length === 0) {
            return res.json({ appearances: [] });
        }

        const entryIds = maps.map(m => m.journal_entry_id);
        const { data: entries, error: entryErr } = await supabase
            .from('journal_entries')
            .select('id, content, mode, created_at, word_count')
            .in('id', entryIds)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (entryErr) throw entryErr;

        // Return snippet (first 200 chars) for each appearance
        const appearances = (entries || []).map(e => ({
            id: e.id,
            snippet: e.content.length > 200 ? e.content.slice(0, 200) + '…' : e.content,
            mode: e.mode,
            created_at: e.created_at,
            word_count: e.word_count,
        }));

        res.json({ appearances });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/node/:id/insight
// Generates a 2-sentence AI insight about a specific mind node
// ═══════════════════════════════════════════════════════════════════════════

router.post('/node/:id/insight', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        // Get the node
        const { data: node, error: nodeErr } = await supabase
            .from('mind_nodes')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (nodeErr) throw nodeErr;

        // Get connected edges + nodes
        const { data: edges } = await supabase
            .from('mind_edges')
            .select('*')
            .eq('user_id', userId)
            .or(`source_node_id.eq.${id},target_node_id.eq.${id}`);

        const connectedIds = (edges || []).map(e =>
            e.source_node_id === id ? e.target_node_id : e.source_node_id
        ).filter(Boolean);

        let connectedNodes = [];
        if (connectedIds.length > 0) {
            const { data } = await supabase
                .from('mind_nodes')
                .select('label, type, strength')
                .in('id', connectedIds);
            connectedNodes = data || [];
        }

        const connectionsStr = connectedNodes.map(n => `${n.label} (${n.type})`).join(', ');
        const contradictionEdges = (edges || []).filter(e => e.relationship_type === 'contradiction');

        const chatCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: 'You are a consciousness analyst. Give exactly 2 concise sentences of insight. Be specific and psychologically perceptive. No platitudes.',
                },
                {
                    role: 'user',
                    content: `Analyze this mind node:\n- Label: "${node.label}"\n- Type: ${node.type}\n- Strength: ${node.strength.toFixed(2)}\n- Seen ${node.occurrence_count} times\n- Connected to: ${connectionsStr || 'nothing'}\n- Has ${contradictionEdges.length} contradiction(s)\n- Resolved: ${node.resolved}\n\nGive 2 sentences of psychological insight about what this node reveals about the person.`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.7,
            max_tokens: 120,
        });

        const insight = chatCompletion.choices[0]?.message?.content || 'Unable to generate insight.';
        res.json({ insight });
    } catch (err) {
        next(err);
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/node/:id/forecast
// Generates an emotional forecast — predictions, triggers, driving agents
// ═══════════════════════════════════════════════════════════════════════════

router.post('/node/:id/forecast', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const { timeHorizon = '7d' } = req.body;

        const { data: node, error: nodeErr } = await supabase
            .from('mind_nodes').select('*').eq('id', id).eq('user_id', userId).single();
        if (nodeErr) throw nodeErr;

        const { data: edges } = await supabase
            .from('mind_edges').select('*').eq('user_id', userId)
            .or(`source_node_id.eq.${id},target_node_id.eq.${id}`);

        const connectedIds = (edges || []).map(e =>
            e.source_node_id === id ? e.target_node_id : e.source_node_id
        ).filter(Boolean);

        let connectedNodes = [];
        if (connectedIds.length > 0) {
            const { data } = await supabase
                .from('mind_nodes').select('label, type, strength, occurrence_count, resolved')
                .in('id', connectedIds);
            connectedNodes = data || [];
        }

        const contradictionEdges = (edges || []).filter(e => e.relationship_type === 'contradiction');
        const connectionsStr = connectedNodes.map(n =>
            `${n.label} (${n.type}, str:${(n.strength || 0).toFixed(2)}, seen ${n.occurrence_count || 1}x)`
        ).join('; ');

        const { data: agentStatesRaw } = await supabase
            .from('agent_states').select('agent_key, dominance_score, mood').eq('user_id', userId);
        const topAgents = (agentStatesRaw || [])
            .sort((a, b) => (b.dominance_score || 0) - (a.dominance_score || 0))
            .slice(0, 8)
            .map(a => `${a.agent_key}(${(a.dominance_score || 0).toFixed(2)})`)
            .join(', ');

        const { count: journalCount } = await supabase
            .from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId);

        const horizonLabel = timeHorizon === '7d' ? '7 days' : timeHorizon === '30d' ? '30 days' : '90 days';

        const chatCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: `You are a cognitive pattern analyst. Generate an emotional forecast. Return ONLY valid JSON (no markdown fences):
{"predictions":[{"label":"string","description":"short","probability":0_to_100,"type":"negative|positive|neutral"}],"confidence":{"level":"Low|Medium|High","dataPoints":number},"reasoning":"1-2 sentences referencing specific connected nodes by name","drivingAgents":[{"name":"string","direction":"up|down|stable"}],"triggers":[{"action":"actionable thing user can do","effect":"describes probability change with arrow like 58% → 79%","type":"positive|negative"}]}
Generate exactly 4 predictions (descending probability). 4-6 driving agents. 3 triggers.`,
                },
                {
                    role: 'user',
                    content: `Forecast next ${horizonLabel}:\n- Node: "${node.label}" (${node.type}), strength: ${(node.strength || 0).toFixed(2)}, seen ${node.occurrence_count || 1}x\n- Connected: ${connectionsStr || 'nothing'}\n- ${contradictionEdges.length} contradiction(s)\n- Resolved: ${node.resolved}\n- Top agents: ${topAgents || 'none'}\n- Journal entries: ${journalCount || 0}`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.6,
            max_tokens: 600,
        });

        let forecast;
        try {
            const raw = chatCompletion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            forecast = JSON.parse(jsonMatch[1].trim());
        } catch (parseErr) {
            console.error('Forecast parse error:', parseErr);
            forecast = {
                predictions: [
                    { label: 'Strength grows', description: 'Continued journaling strengthens this thought', probability: 60, type: 'positive' },
                    { label: 'New connections', description: 'Related thoughts may emerge', probability: 45, type: 'neutral' },
                    { label: 'Tension builds', description: 'Unresolved contradictions create pressure', probability: 30, type: 'negative' },
                    { label: 'Resolution possible', description: 'Active engagement could resolve this', probability: 25, type: 'positive' },
                ],
                confidence: { level: 'Low', dataPoints: (journalCount || 0) + (node.occurrence_count || 1) },
                reasoning: 'Limited data for precise forecasting. Continue journaling to improve accuracy.',
                drivingAgents: [{ name: 'Oracle', direction: 'stable' }],
                triggers: [{ action: 'Journal about this topic', effect: 'Increases prediction accuracy', type: 'positive' }],
            };
        }
        res.json({ forecast });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/node/:id/roadmap
// Generates a resolution roadmap — steps, blockers, impact tags, payoff
// ═══════════════════════════════════════════════════════════════════════════

router.post('/node/:id/roadmap', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;

        const { data: node, error: nodeErr } = await supabase
            .from('mind_nodes').select('*').eq('id', id).eq('user_id', userId).single();
        if (nodeErr) throw nodeErr;

        const { data: edges } = await supabase
            .from('mind_edges').select('*').eq('user_id', userId)
            .or(`source_node_id.eq.${id},target_node_id.eq.${id}`);

        const connectedIds = (edges || []).map(e =>
            e.source_node_id === id ? e.target_node_id : e.source_node_id
        ).filter(Boolean);

        let connectedNodes = [];
        if (connectedIds.length > 0) {
            const { data } = await supabase
                .from('mind_nodes').select('id, label, type, strength, occurrence_count, resolved')
                .in('id', connectedIds);
            connectedNodes = data || [];
        }

        const contradictionEdges = (edges || []).filter(e => e.relationship_type === 'contradiction');
        const fearNodes = connectedNodes.filter(n => n.type === 'fear');
        const tensionNodes = connectedNodes.filter(n => n.type === 'tension');
        const connectionsStr = connectedNodes.map(n =>
            `"${n.label}" (${n.type}, str:${(n.strength || 0).toFixed(2)}, resolved:${n.resolved})`
        ).join('; ');

        const chatCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: `You are a cognitive resolution strategist. Generate a resolution roadmap. Return ONLY valid JSON (no markdown fences):
{"totalSteps":3_to_5,"steps":[{"title":"specific action","description":"1-2 sentences why and how","tags":["quantified impact like +34% strength","time like ~10 min","agent names like Fear, Courage agents"],"tagColors":["green","amber","blue"]}],"blockers":[{"label":"blocking node name","hops":number,"impact":"High impact|Contradiction|Low impact"}],"unlocksWhenResolved":"what changes, e.g. Desire → Active Goal"}
Order by highest leverage first (blocker node), not easiest. Last step = emotional payoff (category change).`,
                },
                {
                    role: 'user',
                    content: `Roadmap for: "${node.label}" (${node.type}), str:${(node.strength || 0).toFixed(2)}, seen ${node.occurrence_count || 1}x, resolved:${node.resolved}\n- Connected: ${connectionsStr || 'nothing'}\n- Fear nodes: ${fearNodes.map(n => `"${n.label}"`).join(', ') || 'none'}\n- Contradictions: ${contradictionEdges.length}\n- Tensions: ${tensionNodes.map(n => `"${n.label}"`).join(', ') || 'none'}`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.6,
            max_tokens: 700,
        });

        let roadmap;
        try {
            const raw = chatCompletion.choices[0]?.message?.content || '{}';
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            roadmap = JSON.parse(jsonMatch[1].trim());
        } catch (parseErr) {
            console.error('Roadmap parse error:', parseErr);
            roadmap = {
                totalSteps: 3,
                steps: [
                    { title: 'Journal about this thought', description: 'Write one entry specifically about this topic.', tags: ['+15% strength', '~5 min', 'Oracle agents'], tagColors: ['green', 'amber', 'blue'] },
                    { title: 'Address connected fears', description: 'Look at linked fear nodes and address them.', tags: ['removes blockers', '~10 min', 'Sentinel, Torch agents'], tagColors: ['green', 'amber', 'blue'] },
                    { title: 'Mark as resolved', description: 'Use the resolve button to complete.', tags: ['node resolved', 'instant', 'All agents re-score'], tagColors: ['green', 'amber', 'blue'] },
                ],
                blockers: [],
                unlocksWhenResolved: 'Thought → Processed Insight',
            };
        }
        res.json({ roadmap });
    } catch (err) {
        next(err);
    }
});



// Drawn from Ekman, Plutchik, Damasio, IFS, and Appraisal Theory.
// ═══════════════════════════════════════════════════════════════════════════

const AGENTS = [
    // ─── Core 8 (Plutchik Primary) ───────────────────────────────────
    { name: 'The Sentinel', key: 'sentinel',     color: '#E85D4A', temperature: 0.5,  derivedFrom: ['fear'],              keywords: ['afraid', 'scared', 'danger', 'risk', 'threat', 'worried', 'unsafe'] },
    { name: 'The Fury',     key: 'fury',         color: '#FF4136', temperature: 0.7,  derivedFrom: ['tension'],           keywords: ['angry', 'furious', 'unfair', 'injustice', 'rage', 'frustrated', 'hate'] },
    { name: 'The Euphoric', key: 'euphoric',     color: '#FFD700', temperature: 0.8,  derivedFrom: ['desire'],            keywords: ['happy', 'excited', 'joy', 'amazing', 'wonderful', 'love it', 'celebrate'] },
    { name: 'The Mourner',  key: 'mourner',      color: '#6B7B8D', temperature: 0.6,  derivedFrom: ['emotion'],           keywords: ['sad', 'loss', 'miss', 'gone', 'grief', 'crying', 'hurt', 'pain'] },
    { name: 'The Believer', key: 'believer',     color: '#2ECC71', temperature: 0.5,  derivedFrom: ['goal', 'person'],    keywords: ['trust', 'believe', 'faith', 'loyal', 'reliable', 'honest', 'together'] },
    { name: 'The Purist',   key: 'purist',       color: '#8B5CF6', temperature: 0.4,  derivedFrom: ['contradiction'],     keywords: ['wrong', 'disgust', 'immoral', 'unacceptable', 'standards', 'integrity'] },
    { name: 'The Oracle',   key: 'oracle',       color: '#F59E0B', temperature: 0.5,  derivedFrom: ['goal'],              keywords: ['future', 'plan', 'expect', 'predict', 'prepare', 'next', 'strategy'] },
    { name: 'The Witness',  key: 'witness',      color: '#FBBF24', temperature: 0.7,  derivedFrom: ['contradiction'],     keywords: ['surprised', 'shock', 'unexpected', 'sudden', 'realize', 'wait what'] },

    // ─── Self-Conscious Emotions ─────────────────────────────────────
    { name: 'The Phantom',  key: 'phantom',      color: '#A3A3A3', temperature: 0.5,  derivedFrom: ['tension'],           keywords: ['guilty', 'fault', 'sorry', 'should have', 'wrong of me', 'owe'] },
    { name: 'The Exile',    key: 'exile',        color: '#92400E', temperature: 0.6,  derivedFrom: ['fear'],              keywords: ['ashamed', 'embarrassed', 'humiliated', 'worthless', 'pathetic', 'exposed'] },
    { name: 'The Crown',    key: 'crown',        color: '#D4AF37', temperature: 0.6,  derivedFrom: ['goal'],              keywords: ['proud', 'achieved', 'best', 'won', 'superior', 'accomplished', 'deserve'] },

    // ─── Social Emotions ─────────────────────────────────────────────
    { name: 'The Mirror',   key: 'mirror_agent', color: '#10B981', temperature: 0.6,  derivedFrom: ['desire'],            keywords: ['jealous', 'envy', 'they have', 'unfair', 'comparison', 'better than me'] },
    { name: 'The Hollow',   key: 'hollow',       color: '#6366F1', temperature: 0.6,  derivedFrom: ['person', 'emotion'], keywords: ['lonely', 'alone', 'isolated', 'nobody', 'disconnected', 'abandoned'] },
    { name: 'The Bridge',   key: 'bridge',       color: '#14B8A6', temperature: 0.5,  derivedFrom: ['person', 'emotion'], keywords: ['empathy', 'understand', 'feel for', 'their pain', 'compassion', 'care about'] },
    { name: 'The Garden',   key: 'garden',       color: '#84CC16', temperature: 0.5,  derivedFrom: ['person'],            keywords: ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky', 'kind'] },

    // ─── Anticipatory Emotions ───────────────────────────────────────
    { name: 'The Void',     key: 'void',         color: '#EF4444', temperature: 0.7,  derivedFrom: ['fear'],              keywords: ['anxious', 'nervous', 'panic', 'dread', 'worry', 'what if', 'overthink'] },
    { name: 'The Torch',    key: 'torch',        color: '#3B82F6', temperature: 0.7,  derivedFrom: ['goal', 'desire'],    keywords: ['hope', 'maybe', 'possible', 'dream', 'wish', 'one day', 'believe'] },
    { name: 'The Ghost',    key: 'ghost',        color: '#9CA3AF', temperature: 0.6,  derivedFrom: ['recurring_thought'], keywords: ['regret', 'should have', 'if only', 'wish I had', 'missed', 'too late'] },

    // ─── Complex Dyad Emotions ───────────────────────────────────────
    { name: 'The Judge',    key: 'judge',        color: '#7C3AED', temperature: 0.4,  derivedFrom: ['contradiction', 'tension'], keywords: ['contempt', 'pathetic', 'beneath', 'dismiss', 'mediocre', 'incompetent'] },
    { name: 'The Hearth',   key: 'hearth',       color: '#EC4899', temperature: 0.7,  derivedFrom: ['person', 'desire'],  keywords: ['love', 'care', 'protect', 'family', 'partner', 'child', 'bond'] },
    { name: 'The Sublime',  key: 'sublime',      color: '#818CF8', temperature: 0.8,  derivedFrom: ['emotion'],           keywords: ['awe', 'wonder', 'beautiful', 'vast', 'transcend', 'meaning', 'universe'] },
    { name: 'The Abyss',    key: 'abyss',        color: '#374151', temperature: 0.6,  derivedFrom: ['fear', 'tension'],   keywords: ['hopeless', 'despair', 'give up', 'pointless', 'trapped', 'no way out'] },

    // ─── Behavioral Drive Emotions ───────────────────────────────────
    { name: 'The Wanderer', key: 'wanderer',     color: '#06B6D4', temperature: 0.85, derivedFrom: ['desire'],            keywords: ['curious', 'wonder', 'explore', 'what if', 'interesting', 'learn', 'discover'] },
    { name: 'The Anchor',   key: 'anchor',       color: '#D4678A', temperature: 0.6,  derivedFrom: ['recurring_thought'], keywords: ['remember', 'used to', 'back when', 'miss', 'nostalgia', 'childhood', 'old'] },
    { name: 'The Spark',    key: 'spark',        color: '#F97316', temperature: 0.7,  derivedFrom: ['goal', 'tension'],   keywords: ['frustrated', 'stuck', 'impatient', 'hurry', 'action', 'do something', 'enough'] },
    { name: 'The Drift',    key: 'drift',        color: '#78716C', temperature: 0.7,  derivedFrom: ['recurring_thought'], keywords: ['bored', 'stale', 'routine', 'meaningless', 'numb', 'meh', 'nothing'] },
];


// ─── Smart Agent Selection ──────────────────────────────────────────────────
// Picks 6-8 most relevant agents per thought instead of running all 26.
function selectActiveAgents(agents, thought, agentStatesMap, graphNodes) {
    const thoughtLower = thought.toLowerCase();
    const scores = new Map();

    for (const agent of agents) {
        let score = 0;

        // 1. Dominance score (0-1) — high dominance agents always tend to speak
        const state = agentStatesMap[agent.key] || {};
        const dominance = state.dominance_score || 0.5;
        score += dominance * 3;

        // 2. Keyword match — if the thought contains trigger words
        const keywordHits = (agent.keywords || []).filter(kw => thoughtLower.includes(kw)).length;
        score += keywordHits * 2;

        // 3. Graph-node type match — if the user's mind has nodes of this agent's type
        const derivedTypes = agent.derivedFrom || [];
        const nodeTypeCount = (graphNodes || []).filter(n => derivedTypes.includes(n.type)).length;
        score += Math.min(nodeTypeCount * 0.3, 2);

        // 4. Memory bonus — agents with memories have more to say
        const memCount = (agentStatesMap[agent.key]?.memory_count || 0);
        if (memCount > 0) score += 0.5;

        scores.set(agent.key, score);
    }

    // Sort by score descending, pick top 6
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const selectedKeys = new Set(sorted.slice(0, 6).map(([key]) => key));

    // Add 1-2 random wildcards from the remaining
    const remaining = sorted.slice(6).map(([key]) => key);
    for (let i = 0; i < 2 && remaining.length > 0; i++) {
        const idx = Math.floor(Math.random() * remaining.length);
        selectedKeys.add(remaining.splice(idx, 1)[0]);
    }

    return agents.filter(a => selectedKeys.has(a.key));
}


// ═══════════════════════════════════════════════════════════════════════════
// runSimulation(userId, thought, triggerType)
// Core simulation engine — 26 emotion agents with smart selection.
// Picks 6-8 most relevant agents, runs 3 rounds of debate.
// Returns { rounds, summary, agentStates, newMemoriesCreated, simulationId }
// ═══════════════════════════════════════════════════════════════════════════

async function runSimulation(userId, thought, triggerType = 'manual') {
    console.log(`🧠 Simulation: Starting for user ${userId} [${triggerType}]...`);
    console.log(`🧠 Thought: "${thought.substring(0, 80)}..."`);

    // ─── 1. Fetch all agent states + memories in parallel ────────────
    const [agentStatesMap, allMemoryCounts, totalPastSimulations] = await Promise.all([
        getAllAgentStates(userId),
        getAllAgentMemoryCounts(userId),
        getSimulationCount(userId),
    ]);

    // Attach memory counts to states for selection scoring
    for (const [name, state] of Object.entries(agentStatesMap)) {
        state.memory_count = allMemoryCounts[name] || 0;
    }

    // ─── 2. Fetch graph data for context ─────────────────────────────
    const { data: topNodes } = await supabase
        .from('mind_nodes')
        .select('*')
        .eq('user_id', userId)
        .order('occurrence_count', { ascending: false })
        .limit(15);

    const nodes = topNodes || [];

    // Build categorized summaries
    const byType = {};
    for (const n of nodes) {
        if (!byType[n.type]) byType[n.type] = [];
        byType[n.type].push(n);
    }

    const topFearNodes = (byType.fear || []).slice(0, 3).map(n => n.label).join(', ') || 'none';
    const topGoalNodes = (byType.goal || []).slice(0, 3).map(n => n.label).join(', ') || 'none';

    const pressurePoints = (byType.recurring_thought || [])
        .filter(n => (n.occurrence_count || 0) >= 3)
        .map(n => n.label)
        .slice(0, 3)
        .join(', ') || 'none';

    const { data: contradictionEdgesRaw } = await supabase
        .from('mind_edges')
        .select('*')
        .eq('user_id', userId)
        .eq('relationship_type', 'contradiction')
        .limit(5);

    const contradictionEdges = (contradictionEdgesRaw || []).map(e => {
        const srcNode = nodes.find(n => n.id === e.source_node_id);
        const tgtNode = nodes.find(n => n.id === e.target_node_id);
        return `"${srcNode?.label || '?'}" vs "${tgtNode?.label || '?'}"`;
    }).join('; ') || 'none';

    // ─── 3. Smart Agent Selection (6-8 out of 26) ────────────────────
    const activeAgents = selectActiveAgents(AGENTS, thought, agentStatesMap, nodes);
    console.log(`🧠 Selected ${activeAgents.length} agents: ${activeAgents.map(a => a.name).join(', ')}`);

    // Fetch memories for active agents only
    const agentMemoriesMap = {};
    await Promise.all(
        activeAgents.map(async (agent) => {
            agentMemoriesMap[agent.key] = await getAgentMemories(userId, agent.key, 8);
        })
    );

    // ─── 4. Build enriched system prompts ────────────────────────────
    const enrichedAgents = activeAgents.map(agent => {
        const state = agentStatesMap[agent.key] || {};
        const memories = agentMemoriesMap[agent.key] || [];
        const dominanceScore = state.dominance_score || 0.5;

        const memoryStr = memories.length > 0
            ? memories.map(m => `- ${m.content}`).join('\n')
            : '- No memories yet. This is your first session.';

        const systemPrompt = `${state.personality_prompt || AGENT_DISPLAY_NAMES[agent.key]}

YOUR MEMORY (what you remember from past sessions):
${memoryStr}

CURRENT STATE OF THIS PERSON'S MIND:
Dominant fears: ${topFearNodes}
Active goals: ${topGoalNodes}
Unresolved tensions: ${pressurePoints}
Key contradictions: ${contradictionEdges}

You have been in ${totalPastSimulations} debates with the other parts of this mind.
Your current dominance in this person's psyche: ${Math.round(dominanceScore * 100)}%

Rules: Respond in 1-2 sentences MAX. Stay in character. ${memories.length > 0 ? 'Reference your memories when relevant — say "I remember you said..." or "Last time..."' : ''} React to both the thought AND the other agents' comments. Be specific, not generic.`;

        return {
            ...agent,
            systemPrompt,
            dominanceScore,
            memoryCount: memories.length,
        };
    });

    // ─── 5. Run debate rounds ────────────────────────────────────────
    const rounds = [];
    let allMessages = [];
    const TOTAL_ROUNDS = 2;

    for (let round = 0; round < TOTAL_ROUNDS; round++) {
        console.log(`🧠 Round ${round + 1}/${TOTAL_ROUNDS}...`);
        const roundMessages = [];

        // Round 2: only top 4 most dominant agents get the final word
        let speakingAgents = enrichedAgents;
        if (round === 1) {
            speakingAgents = [...enrichedAgents]
                .sort((a, b) => b.dominanceScore - a.dominanceScore)
                .slice(0, 4);
        }

        // Build shared context for this round
        const previousContext = allMessages.length > 0
            ? `\n\nPrevious discussion:\n${allMessages.map(m => `${m.agent}: "${m.message}"`).join('\n')}`
            : '';

        // Parallel: fire all agents simultaneously per round
        const agentPromises = speakingAgents.map(async (agent) => {
            try {
                const chatCompletion = await groqComplete({
                    messages: [
                        {
                            role: 'system',
                            content: agent.systemPrompt,
                        },
                        {
                            role: 'user',
                            content: `The user injected this thought into the simulation: "${thought}"${previousContext}\n\nRespond as ${agent.name} (round ${round + 1}/${TOTAL_ROUNDS}). ${round > 0 ? 'React directly to what the other agents said. Address them by name if you disagree.' : 'Give your initial reaction.'}`,
                        },
                    ],
                    model: GROQ_MODEL,
                    temperature: agent.temperature,
                    max_tokens: 80,
                });

                const message = chatCompletion.choices[0]?.message?.content || '...';
                return {
                    agent: agent.name,
                    agentKey: agent.key,
                    color: agent.color,
                    message: message.trim(),
                    round: round + 1,
                    hasMemoryRef: /remember|last time|before|previously|you said|you wrote/i.test(message),
                };
            } catch (err) {
                console.error(`🧠 Agent "${agent.name}" failed: ${err.message}`);
                return {
                    agent: agent.name,
                    agentKey: agent.key,
                    color: agent.color,
                    message: `${agent.name} is silent this round.`,
                    round: round + 1,
                    hasMemoryRef: false,
                };
            }
        });

        const results = await Promise.all(agentPromises);
        roundMessages.push(...results);
        allMessages.push(...results);
        rounds.push(roundMessages);
    }

    // ─── 6. Generate summary ─────────────────────────────────────────
    console.log('🧠 Generating simulation summary...');
    let summary = {
        insights: ['The simulation revealed internal dynamics.'],
        dominantTension: '',
        winning_agent: '',
    };

    try {
        const agentList = activeAgents.map(a => a.name).join(', ');
        const summaryCompletion = await groqComplete({
            messages: [
                {
                    role: 'system',
                    content: 'You are a consciousness analyst. Respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: `Analyze this internal debate between ${activeAgents.length} emotion agents (${agentList}) responding to the thought "${thought}":\n\n${allMessages.filter(m => !m.message.includes('is silent')).map(m => `${m.agent}: "${m.message}"`).join('\n')}\n\nProvide:\n1. Three concise psychological insights (1 sentence each)\n2. Which two agents had the strongest disagreement and why (1 sentence)\n3. Which agent "won" or was most persuasive\n\nJSON format: {"insights": ["...", "...", "..."], "dominantTension": "Agent X vs Agent Y: reason", "winning_agent": "Agent Name"}`,
                },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: 'json_object' },
        });

        const parsed = JSON.parse(summaryCompletion.choices[0]?.message?.content || '{}');
        if (parsed.insights?.length) summary.insights = parsed.insights;
        if (parsed.dominantTension) summary.dominantTension = parsed.dominantTension;
        if (parsed.winning_agent) summary.winning_agent = parsed.winning_agent;
    } catch (err) {
        console.error('🧠 Summary generation failed:', err.message);
    }

    // ─── 7. Save simulation history ──────────────────────────────────
    const agentMessageCounts = {};
    for (const m of allMessages) {
        agentMessageCounts[m.agent] = (agentMessageCounts[m.agent] || 0) + 1;
    }
    const dominantAgent = Object.entries(agentMessageCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'The Sentinel';

    const savedSim = await saveSimulationHistory(
        userId, triggerType, thought, rounds, summary, dominantAgent
    );
    const simulationId = savedSim?.id || null;

    // ─── 8. Save memories in background (fire-and-forget) ────────────
    const saveMemoriesInBackground = async () => {
        let totalNewMemories = 0;
        try {
            for (const agent of activeAgents) {
                const agentMsgs = allMessages.filter(m => m.agentKey === agent.key);
                if (agentMsgs.length === 0) continue;
                const count = await saveAgentMemory(userId, agent.key, allMessages, simulationId);
                totalNewMemories += count;
                if (count > 0) await new Promise(r => setTimeout(r, 2000));
            }
            console.log(`🧠 Total new memories created: ${totalNewMemories}`);
        } catch (err) {
            console.error('🧠 Memory saving failed (non-blocking):', err.message);
        }
    };
    saveMemoriesInBackground();

    // ─── 9. Build agent states response ──────────────────────────────
    const agentStatesResponse = {};
    for (const agent of AGENTS) {
        const state = agentStatesMap[agent.key] || {};
        agentStatesResponse[agent.key] = {
            dominance_score: state.dominance_score || 0.5,
            memory_count: allMemoryCounts[agent.key] || 0,
            last_active: state.last_active,
        };
    }

    console.log(`🧠 Simulation complete: ${allMessages.length} messages across ${rounds.length} rounds (${activeAgents.length} active agents)`);

    return {
        rounds,
        summary,
        agentStates: agentStatesResponse,
        activeAgents: activeAgents.map(a => ({ name: a.name, key: a.key, color: a.color })),
        newMemoriesCreated: 0,
        simulationId,
    };
}


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/simulate-thought
// Runs the 26 emotion agent debate with smart selection + persistent memory
// ═══════════════════════════════════════════════════════════════════════════

router.post('/simulate-thought', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { thought } = req.body;

        if (!thought || typeof thought !== 'string' || thought.trim().length === 0) {
            return res.status(400).json({ error: 'thought is required' });
        }

        const result = await runSimulation(userId, thought.trim(), 'manual');
        res.json(result);
    } catch (err) {
        next(err);
    }
});





// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/agent-states
// Get all agent states for the user (dominance scores, personality prompts)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/agent-states', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const states = await getAllAgentStates(userId);
        const memoryCounts = await getAllAgentMemoryCounts(userId);

        // Attach memory counts to each state
        for (const [name, state] of Object.entries(states)) {
            state.memory_count = memoryCounts[name] || 0;
        }

        res.json({ agentStates: states });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/agent-memories
// Get all agent memories for the user (for AgentMemoryPanel)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/agent-memories', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const memories = await getAllAgentMemories(userId);
        res.json({ memories });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/mindmirror/agent-memory/:id
// Delete a single agent memory
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/agent-memory/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const success = await deleteAgentMemory(userId, id);
        if (!success) {
            return res.status(500).json({ error: 'Failed to delete memory' });
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/simulation-history
// Get past simulations for the history modal
// ═══════════════════════════════════════════════════════════════════════════

router.get('/simulation-history', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const history = await getSimulationHistory(userId, limit);
        res.json({ history });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/mirror-report/latest
// Returns the most recent mirror report + node trajectories
// ═══════════════════════════════════════════════════════════════════════════

router.get('/mirror-report/latest', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const report = await getLatestReport(userId);
        const nodeTrajectories = await calculateNodeTrajectories(userId);
        const history = await getReportHistory(userId, 1);

        res.json({
            report,
            nodeTrajectories,
            isFirstReport: history.length <= 1,
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/mirror-report/history
// Returns summary of past mirror reports (up to 12)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/mirror-report/history', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const history = await getReportHistory(userId, 12);
        res.json({ history });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/mindmirror/mirror-report/generate
// Manual trigger: generate report right now
// ═══════════════════════════════════════════════════════════════════════════

router.post('/mirror-report/generate', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const report = await generateFullReport(userId);

        if (!report) {
            return res.status(500).json({ error: 'Failed to generate mirror report. Try journaling more.' });
        }

        const nodeTrajectories = await calculateNodeTrajectories(userId);
        res.json({ report, nodeTrajectories });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/mindmirror/mirror-report/snapshots
// Returns node snapshots for the last 8 weeks (temporal drift visualization)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/mirror-report/snapshots', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const weeks = Math.min(parseInt(req.query.weeks) || 8, 16);
        const snapshots = await getNodeSnapshots(userId, weeks);
        res.json({ snapshots });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/mindmirror/mirror-report/:id
// Soft-delete a mirror report
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/mirror-report/:id', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const success = await softDeleteReport(userId, id);
        if (!success) {
            return res.status(500).json({ error: 'Failed to delete report' });
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


export default router;
