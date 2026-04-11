// ═══════════════════════════════════════════════════════════════════════════
// Mirror Report Service — Phase 5
// Generates intimate, narrative weekly reports from the user's journal data.
// Also manages node snapshots for temporal drift visualization.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabase.js';
import { groqComplete, GROQ_MODEL } from '../../lib/groq.js';
import { getAllAgentStates } from './agentMemory.js';

const TAG = '[MirrorReport]';


// ─── Helper: get Monday and Sunday of the current week ───────────────────────
function getWeekBounds(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
    };
}


// ═══════════════════════════════════════════════════════════════════════════
// takeWeeklySnapshot(userId)
// Records the current state of every node for temporal drift tracking.
// ═══════════════════════════════════════════════════════════════════════════

export async function takeWeeklySnapshot(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Check if snapshot already taken today
        const { data: existing } = await supabase
            .from('node_snapshots')
            .select('id')
            .eq('user_id', userId)
            .eq('snapshot_date', today)
            .limit(1);

        if (existing && existing.length > 0) {
            console.log(`${TAG} Snapshot already taken today for user ${userId}`);
            return { alreadyExists: true };
        }

        // Fetch all current nodes
        const { data: nodes, error: nodesErr } = await supabase
            .from('mind_nodes')
            .select('id, occurrence_count, strength, resolved')
            .eq('user_id', userId);

        if (nodesErr) {
            console.error(`${TAG} takeWeeklySnapshot nodes fetch error:`, nodesErr.message);
            return { error: nodesErr.message };
        }

        if (!nodes || nodes.length === 0) {
            console.log(`${TAG} No nodes to snapshot for user ${userId}`);
            return { count: 0 };
        }

        // Insert snapshot rows
        const rows = nodes.map(n => ({
            user_id: userId,
            node_id: n.id,
            snapshot_date: today,
            occurrence_count: n.occurrence_count || 0,
            strength: n.strength || 0,
            resolved: n.resolved || false,
        }));

        const { error: insertErr } = await supabase
            .from('node_snapshots')
            .insert(rows);

        if (insertErr) {
            console.error(`${TAG} takeWeeklySnapshot insert error:`, insertErr.message);
            return { error: insertErr.message };
        }

        console.log(`${TAG} Snapshot taken: ${rows.length} nodes for user ${userId}`);
        return { count: rows.length };
    } catch (err) {
        console.error(`${TAG} takeWeeklySnapshot exception:`, err.message);
        return { error: err.message };
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// calculateNodeTrajectories(userId)
// Compares current node state vs snapshot from ~7 days ago.
// ═══════════════════════════════════════════════════════════════════════════

export async function calculateNodeTrajectories(userId) {
    try {
        // Get current nodes
        const { data: currentNodes, error: nodesErr } = await supabase
            .from('mind_nodes')
            .select('*')
            .eq('user_id', userId);

        if (nodesErr || !currentNodes) {
            console.error(`${TAG} calculateNodeTrajectories nodes error:`, nodesErr?.message);
            return [];
        }

        // Get snapshot from ~7 days ago (find nearest)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

        const { data: snapshots } = await supabase
            .from('node_snapshots')
            .select('*')
            .eq('user_id', userId)
            .lte('snapshot_date', cutoffDate)
            .order('snapshot_date', { ascending: false })
            .limit(500);

        // Build a map: nodeId → most recent snapshot
        const snapshotMap = {};
        for (const s of (snapshots || [])) {
            if (!snapshotMap[s.node_id]) {
                snapshotMap[s.node_id] = s;
            }
        }

        // Calculate trajectories
        const trajectories = currentNodes.map(node => {
            const snap = snapshotMap[node.id];
            const currentOcc = node.occurrence_count || 0;
            const currentStr = node.strength || 0;

            let growthDelta = 0;
            let strengthDelta = 0;

            if (snap) {
                growthDelta = currentOcc - (snap.occurrence_count || 0);
                strengthDelta = currentStr - (snap.strength || 0);
            } else {
                // New node — no prior snapshot, mark as growing
                growthDelta = currentOcc;
                strengthDelta = currentStr;
            }

            let trajectory = 'stable';
            if (node.resolved) {
                trajectory = 'resolved';
            } else if (growthDelta > 2) {
                trajectory = 'growing';
            } else if (growthDelta < -1) {
                trajectory = 'fading';
            } else if (strengthDelta > 0.2) {
                trajectory = 'strengthening';
            }

            return {
                nodeId: node.id,
                label: node.label,
                type: node.type,
                trajectory,
                growthDelta,
                strengthDelta,
                occurrenceCount: currentOcc,
                strength: currentStr,
                resolved: node.resolved || false,
                firstSeenAt: node.first_seen_at,
                lastSeenAt: node.last_seen_at,
            };
        });

        return trajectories;
    } catch (err) {
        console.error(`${TAG} calculateNodeTrajectories exception:`, err.message);
        return [];
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// buildReportContext(userId, weekStart, weekEnd)
// Assembles all data needed for narrative generation.
// ═══════════════════════════════════════════════════════════════════════════

export async function buildReportContext(userId, weekStart, weekEnd) {
    try {
        const weekStartDate = `${weekStart}T00:00:00.000Z`;
        const weekEndDate = `${weekEnd}T23:59:59.999Z`;

        // 1. Journal entries this week
        const { data: journals } = await supabase
            .from('journal_entries')
            .select('id, content, word_count, created_at')
            .eq('user_id', userId)
            .gte('created_at', weekStartDate)
            .lte('created_at', weekEndDate)
            .order('created_at', { ascending: true });

        const journalEntries = journals || [];
        const journalCount = journalEntries.length;
        const totalWords = journalEntries.reduce((sum, e) => sum + (e.word_count || 0), 0);

        // 2. Calculate trajectories
        const trajectories = await calculateNodeTrajectories(userId);

        // 3. Top 5 growing nodes
        const growingNodes = trajectories
            .filter(t => t.trajectory === 'growing' || t.trajectory === 'strengthening')
            .sort((a, b) => b.growthDelta - a.growthDelta)
            .slice(0, 5)
            .map(t => ({
                id: t.nodeId, label: t.label, type: t.type,
                growth_delta: t.growthDelta, strength_delta: t.strengthDelta,
            }));

        // 4. Top 5 fading nodes (not resolved)
        const fadingNodes = trajectories
            .filter(t => t.trajectory === 'fading' && !t.resolved)
            .sort((a, b) => a.growthDelta - b.growthDelta)
            .slice(0, 5)
            .map(t => ({
                id: t.nodeId, label: t.label, type: t.type,
                decay_delta: t.growthDelta, lastSeen: t.lastSeenAt,
            }));

        // 5. All unresolved pressure points (occurrence >= 3, not resolved)
        const unresolvedNodes = trajectories
            .filter(t => t.occurrenceCount >= 3 && !t.resolved)
            .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
            .map(t => ({
                id: t.nodeId, label: t.label, type: t.type,
                occurrence_count: t.occurrenceCount,
            }));

        // 6. New contradiction edges this week
        const { data: contradictionEdges } = await supabase
            .from('mind_edges')
            .select('id, source_node_id, target_node_id, created_at')
            .eq('user_id', userId)
            .eq('relationship_type', 'contradiction')
            .gte('created_at', weekStartDate)
            .lte('created_at', weekEndDate);

        // Resolve contradiction labels
        const newContradictions = [];
        for (const edge of (contradictionEdges || [])) {
            const { data: srcNode } = await supabase
                .from('mind_nodes').select('label').eq('id', edge.source_node_id).single();
            const { data: tgtNode } = await supabase
                .from('mind_nodes').select('label').eq('id', edge.target_node_id).single();
            newContradictions.push({
                sourceLabel: srcNode?.label || '?',
                targetLabel: tgtNode?.label || '?',
            });
        }

        // 7. Nodes resolved this week
        const resolvedThisWeek = trajectories
            .filter(t => t.resolved)
            .map(t => ({ id: t.nodeId, label: t.label }));

        // 8. Agent dominance scores
        const agentStates = await getAllAgentStates(userId);
        const agentDominanceSnapshot = {};
        for (const [name, state] of Object.entries(agentStates)) {
            agentDominanceSnapshot[name] = {
                dominance_score: state.dominance_score || 0.5,
            };
        }

        // Find dominant and subdued agent
        const agentEntries = Object.entries(agentDominanceSnapshot);
        agentEntries.sort((a, b) => b[1].dominance_score - a[1].dominance_score);
        const dominantAgent = agentEntries[0]?.[0] || 'critic';
        const dominantScore = Math.round((agentEntries[0]?.[1]?.dominance_score || 0.5) * 100);
        const subduedAgent = agentEntries[agentEntries.length - 1]?.[0] || 'avoider';
        const subduedScore = Math.round((agentEntries[agentEntries.length - 1]?.[1]?.dominance_score || 0.1) * 100);

        // 9. Last week's theme
        const { data: lastReport } = await supabase
            .from('mirror_reports')
            .select('dominant_theme')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('week_start', { ascending: false })
            .limit(1)
            .single();

        const lastWeekTheme = lastReport?.dominant_theme || 'None — this is their first report';

        // 10. Previous week journal count for engagement delta
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(weekStart);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

        const { count: prevJournalCount } = await supabase
            .from('journal_entries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', prevWeekStart.toISOString())
            .lte('created_at', prevWeekEnd.toISOString());

        return {
            journalCount,
            totalWords,
            journalEntries,
            growingNodes,
            fadingNodes,
            unresolvedNodes,
            newContradictions,
            resolvedThisWeek,
            agentDominanceSnapshot,
            dominantAgent,
            dominantScore,
            subduedAgent,
            subduedScore,
            lastWeekTheme,
            prevJournalCount: prevJournalCount || 0,
            trajectories,
        };
    } catch (err) {
        console.error(`${TAG} buildReportContext exception:`, err.message);
        return null;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// determineEmotionalTone(context)
// Rule-based scoring — no extra Groq call.
// ═══════════════════════════════════════════════════════════════════════════

export function determineEmotionalTone(context) {
    if (!context) return 'dormant';

    const {
        journalCount = 0,
        newContradictions = [],
        growingNodes = [],
        unresolvedNodes = [],
        resolvedThisWeek = [],
    } = context;

    // Order matters — first match wins
    if (journalCount < 2) return 'dormant';
    if (resolvedThisWeek.length > 2) return 'transforming';
    if (newContradictions.length > 2 || growingNodes.filter(n => n.type === 'fear').length > 2) return 'turbulent';
    if (growingNodes.filter(n => n.type === 'goal').length > 3) return 'driven';
    if (unresolvedNodes.length > 5 && journalCount < 3) return 'stuck';
    if (journalCount > 5 && newContradictions.length <= 1) return 'reflective';

    return 'reflective';
}


// ═══════════════════════════════════════════════════════════════════════════
// generateMirrorNarrative(userId, context)
// Uses Groq to write the weekly narrative letter.
// ═══════════════════════════════════════════════════════════════════════════

export async function generateMirrorNarrative(userId, context) {
    try {
        const {
            journalCount, totalWords,
            growingNodes, fadingNodes, unresolvedNodes,
            newContradictions, resolvedThisWeek,
            dominantAgent, dominantScore,
            subduedAgent, subduedScore,
            lastWeekTheme,
        } = context;

        const AGENT_NAMES = {
            critic: 'The Critic',
            dreamer: 'The Dreamer',
            avoider: 'The Avoider',
            ambitious_self: 'The Ambitious Self',
            rationalist: 'The Rationalist',
            shadow: 'The Shadow',
        };

        const systemPrompt = `You are the Mirror — a deeply perceptive narrator who has read every word this person has ever written in their journal. You are not a therapist, not a coach, not an AI assistant. You are the voice of their own data speaking back to them. You write in second person ('you'). You write in flowing prose — never bullet points, never headers, never lists. You are warm but honest. You notice patterns the person themselves may not have noticed. You reference specific things from their journal (use the actual node labels and themes provided). You end every report with one single question — the most important question their data is asking them right now. The report should be 400-600 words. Do not start with 'This week' — start with something that immediately makes them feel seen.`;

        const growingStr = growingNodes.length > 0
            ? growingNodes.map(n => `- "${n.label}" (${n.type}) — appeared ${n.growth_delta} more times than last week`).join('\n')
            : '- Nothing notably growing this week';

        const fadingStr = fadingNodes.length > 0
            ? fadingNodes.map(n => `- "${n.label}" — losing strength, last appeared ${n.lastSeen ? new Date(n.lastSeen).toLocaleDateString() : 'recently'}`).join('\n')
            : '- Nothing notably fading';

        const unresolvedStr = unresolvedNodes.length > 0
            ? unresolvedNodes.map(n => `- "${n.label}" — has appeared ${n.occurrence_count} times, never resolved`).join('\n')
            : '- No unresolved pressure points';

        const contradStr = newContradictions.length > 0
            ? newContradictions.map(c => `- "${c.sourceLabel}" vs "${c.targetLabel}"`).join('\n')
            : '- No new contradictions';

        const resolvedStr = resolvedThisWeek.length > 0
            ? resolvedThisWeek.map(n => `- "${n.label}"`).join('\n')
            : '- Nothing resolved';

        const userPrompt = `Write this person's weekly Mirror Report.

Their name is not known — address them as 'you'.

THIS WEEK'S DATA:
Journal entries this week: ${journalCount} entries
Words written: ${totalWords}

GROWING in their mind this week:
${growingStr}

FADING from their mind:
${fadingStr}

UNRESOLVED — things they keep returning to:
${unresolvedStr}

NEW CONTRADICTIONS that appeared this week:
${contradStr}

THINGS THEY RESOLVED THIS WEEK:
${resolvedStr}

THE VOICES IN THEIR MIND RIGHT NOW (agent dominance):
Most dominant: ${AGENT_NAMES[dominantAgent] || dominantAgent} (${dominantScore}%)
Most subdued: ${AGENT_NAMES[subduedAgent] || subduedAgent} (${subduedScore}%)

LAST WEEK'S THEME: ${lastWeekTheme}

Now write their Mirror Report.`;

        const chatCompletion = await groqComplete({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            model: GROQ_MODEL,
            temperature: 0.8,
            max_tokens: 1200,
        });

        const narrative = chatCompletion.choices[0]?.message?.content?.trim() || '';

        if (!narrative || narrative.length < 50) {
            console.error(`${TAG} Narrative generation returned empty/short result`);
            return null;
        }

        // Determine dominant theme via Groq
        let dominantTheme = 'self-reflection';
        try {
            const themeCompletion = await groqComplete({
                messages: [
                    { role: 'system', content: 'Respond with valid JSON only. Extract the single most prominent theme from this narrative in 2-4 words.' },
                    { role: 'user', content: `Narrative:\n"${narrative.slice(0, 500)}"\n\nJSON: { "theme": "..." }` },
                ],
                model: GROQ_MODEL,
                temperature: 0.2,
                max_tokens: 50,
                response_format: { type: 'json_object' },
            });
            const parsed = JSON.parse(themeCompletion.choices[0]?.message?.content || '{}');
            if (parsed.theme) dominantTheme = parsed.theme;
        } catch (themeErr) {
            console.warn(`${TAG} Theme extraction failed (non-critical):`, themeErr.message);
        }

        const emotionalTone = determineEmotionalTone(context);
        const { weekStart, weekEnd } = getWeekBounds();

        // Save report
        const reportRow = {
            user_id: userId,
            week_start: weekStart,
            week_end: weekEnd,
            narrative,
            dominant_theme: dominantTheme,
            top_growing_nodes: growingNodes,
            top_fading_nodes: fadingNodes,
            unresolved_nodes: unresolvedNodes,
            new_contradictions: newContradictions,
            resolution_count: resolvedThisWeek.length,
            agent_dominance_snapshot: context.agentDominanceSnapshot,
            emotional_tone: emotionalTone,
        };

        const { data: savedReport, error: saveErr } = await supabase
            .from('mirror_reports')
            .insert(reportRow)
            .select()
            .single();

        if (saveErr) {
            console.error(`${TAG} Failed to save mirror report:`, saveErr.message);
            return null;
        }

        console.log(`${TAG} Mirror report saved: ${savedReport.id} — tone: ${emotionalTone}, theme: ${dominantTheme}`);
        return savedReport;
    } catch (err) {
        console.error(`${TAG} generateMirrorNarrative exception:`, err.message);
        return null;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// generateFullReport(userId)
// Full pipeline: snapshot → context → narrative.
// ═══════════════════════════════════════════════════════════════════════════

export async function generateFullReport(userId) {
    console.log(`${TAG} Generating full mirror report for user ${userId}...`);

    // Step 1: Take snapshot
    const snapResult = await takeWeeklySnapshot(userId);
    console.log(`${TAG} Snapshot result:`, snapResult);

    // Step 2: Build context
    const { weekStart, weekEnd } = getWeekBounds();
    const context = await buildReportContext(userId, weekStart, weekEnd);

    if (!context) {
        console.error(`${TAG} Failed to build report context`);
        return null;
    }

    // Step 3: Generate narrative
    const report = await generateMirrorNarrative(userId, context);
    return report;
}


// ═══════════════════════════════════════════════════════════════════════════
// checkAndTriggerWeeklyReport(userId)
// Lightweight check — called from the journal endpoint.
// Generates a report in the background if one is due.
// ═══════════════════════════════════════════════════════════════════════════

export async function checkAndTriggerWeeklyReport(userId) {
    try {
        // Get the most recent report
        const { data: lastReport } = await supabase
            .from('mirror_reports')
            .select('week_start, created_at')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const now = new Date();

        if (lastReport) {
            // Check if it's been 7+ days since last report
            const lastCreated = new Date(lastReport.created_at);
            const daysSince = (now - lastCreated) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) {
                return false; // Too soon
            }
        } else {
            // First report — check if user has been journaling for 7+ days
            const { data: firstJournal } = await supabase
                .from('journal_entries')
                .select('created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (!firstJournal) return false;

            const firstDate = new Date(firstJournal.created_at);
            const daysSinceFirst = (now - firstDate) / (1000 * 60 * 60 * 24);
            if (daysSinceFirst < 7) return false;
        }

        // Due — run in background
        console.log(`${TAG} Weekly report is due for user ${userId} — generating in background...`);
        generateFullReport(userId).catch(err =>
            console.error(`${TAG} Background report generation failed:`, err.message)
        );
        return true;
    } catch (err) {
        console.error(`${TAG} checkAndTriggerWeeklyReport error:`, err.message);
        return false;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getLatestReport(userId)
// ═══════════════════════════════════════════════════════════════════════════

export async function getLatestReport(userId) {
    try {
        const { data, error } = await supabase
            .from('mirror_reports')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error(`${TAG} getLatestReport error:`, error.message);
            return null;
        }

        return data || null;
    } catch (err) {
        console.error(`${TAG} getLatestReport exception:`, err.message);
        return null;
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getReportHistory(userId, limit = 12)
// ═══════════════════════════════════════════════════════════════════════════

export async function getReportHistory(userId, limit = 12) {
    try {
        const { data, error } = await supabase
            .from('mirror_reports')
            .select('id, week_start, week_end, dominant_theme, emotional_tone, resolution_count, narrative, created_at')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('week_start', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(`${TAG} getReportHistory error:`, error.message);
            return [];
        }

        return (data || []).map(r => ({
            id: r.id,
            week_start: r.week_start,
            week_end: r.week_end,
            dominant_theme: r.dominant_theme,
            emotional_tone: r.emotional_tone,
            resolution_count: r.resolution_count,
            excerpt: r.narrative ? r.narrative.slice(0, 120) + '…' : '',
            created_at: r.created_at,
        }));
    } catch (err) {
        console.error(`${TAG} getReportHistory exception:`, err.message);
        return [];
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// getNodeSnapshots(userId, weeks = 8)
// Returns snapshots grouped by date for temporal drift visualization.
// ═══════════════════════════════════════════════════════════════════════════

export async function getNodeSnapshots(userId, weeks = 8) {
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (weeks * 7));

        const { data, error } = await supabase
            .from('node_snapshots')
            .select('*')
            .eq('user_id', userId)
            .gte('snapshot_date', cutoff.toISOString().split('T')[0])
            .order('snapshot_date', { ascending: true });

        if (error) {
            console.error(`${TAG} getNodeSnapshots error:`, error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error(`${TAG} getNodeSnapshots exception:`, err.message);
        return [];
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// softDeleteReport(userId, reportId)
// ═══════════════════════════════════════════════════════════════════════════

export async function softDeleteReport(userId, reportId) {
    try {
        const { error } = await supabase
            .from('mirror_reports')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', reportId)
            .eq('user_id', userId);

        if (error) {
            console.error(`${TAG} softDeleteReport error:`, error.message);
            return false;
        }

        return true;
    } catch (err) {
        console.error(`${TAG} softDeleteReport exception:`, err.message);
        return false;
    }
}
