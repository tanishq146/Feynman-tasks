// ─── AI Routes ──────────────────────────────────────────────────────────────
// POST /api/ai/feynman/:id           → Re-run the Feynman analysis for a specific node
// POST /api/ai/feynman/:id/challenge → Grade a Feynman Challenge answer
// POST /api/ai/feynman/:id/teach     → Grade a Teach-It explanation
// POST /api/ai/feynman/:id/moment    → Generate a new Real Life Moment
// POST /api/ai/feynman/:id/extras    → Generate extras (challenge, gaps, moment) if missing

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import {
    generateFeynmanAnalysis,
    generateFeynmanExtras,
    gradeFeynmanChallenge,
    gradeTeachIt,
    generateRealLifeMoment,
} from '../services/ai.js';
import { broadcast } from '../services/websocket.js';

const router = Router();


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ai/feynman/:id
// Re-run the Feynman analysis for a specific node
// ═══════════════════════════════════════════════════════════════════════════

router.post('/feynman/:id', async (req, res, next) => {
    try {
        const nodeId = req.params.id;

        // Fetch the node
        const { data: node, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw error;
        }

        // Return immediately — processing happens async
        res.json({ status: 'processing' });

        // Async: re-generate Feynman analysis
        (async () => {
            try {
                console.log(`🎓 Re-generating Feynman analysis for "${node.title}"...`);

                // Get connected nodes
                const { data: edges } = await supabase
                    .from('connection_edges')
                    .select('source_node_id, target_node_id')
                    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

                const connectedIds = (edges || []).map(e =>
                    e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
                );

                let connectedNodes = [];
                if (connectedIds.length > 0) {
                    const { data } = await supabase
                        .from('knowledge_nodes')
                        .select('id, title, summary')
                        .in('id', connectedIds);
                    connectedNodes = data || [];
                }

                // Get user goals
                const { data: goals } = await supabase
                    .from('user_goals')
                    .select('goal_text')
                    .eq('user_id', req.user.uid);

                // Generate the Feynman analysis
                const feynman = await generateFeynmanAnalysis(node, connectedNodes, goals || []);

                // Update in database
                await supabase
                    .from('knowledge_nodes')
                    .update({ feynman })
                    .eq('id', nodeId);

                // Broadcast to frontend
                broadcast('feynman.ready', { node_id: nodeId, feynman });
                console.log(`🎓 Feynman re-analysis complete for "${node.title}"`);

            } catch (asyncErr) {
                console.error('❌ Feynman re-generation error:', asyncErr.message);
            }
        })();

    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ai/feynman/:id/extras
// Generate Feynman extras (challenge, gaps, moment) if missing
// ═══════════════════════════════════════════════════════════════════════════

router.post('/feynman/:id/extras', async (req, res, next) => {
    try {
        const nodeId = req.params.id;

        const { data: node, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw error;
        }

        const feynman = node.feynman || {};

        // Check if extras already exist
        if (feynman.challenge_question && feynman.knowledge_gaps && feynman.real_life_moment) {
            return res.json({
                challenge_question: feynman.challenge_question,
                knowledge_gaps: feynman.knowledge_gaps,
                real_life_moment: feynman.real_life_moment,
                challenge_attempts: feynman.challenge_attempts || [],
                teach_attempts: feynman.teach_attempts || [],
                feynman_certified: feynman.feynman_certified || false,
            });
        }

        // Get connected node titles
        const { data: edges } = await supabase
            .from('connection_edges')
            .select('source_node_id, target_node_id')
            .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

        const connectedIds = (edges || []).map(e =>
            e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
        );

        let connectedTitles = [];
        if (connectedIds.length > 0) {
            const { data } = await supabase
                .from('knowledge_nodes')
                .select('title')
                .in('id', connectedIds);
            connectedTitles = (data || []).map(n => n.title);
        }

        // Generate extras
        console.log(`✦ Generating Feynman extras for "${node.title}"...`);
        const extras = await generateFeynmanExtras(node, connectedTitles);

        // Merge into existing feynman object
        const updatedFeynman = {
            ...feynman,
            challenge_question: feynman.challenge_question || extras.challenge_question,
            knowledge_gaps: feynman.knowledge_gaps || extras.knowledge_gaps,
            real_life_moment: feynman.real_life_moment || extras.real_life_moment,
            challenge_attempts: feynman.challenge_attempts || [],
            teach_attempts: feynman.teach_attempts || [],
            feynman_certified: feynman.feynman_certified || false,
        };

        // Update in database
        await supabase
            .from('knowledge_nodes')
            .update({ feynman: updatedFeynman })
            .eq('id', nodeId);

        // Broadcast update
        broadcast('feynman.ready', { node_id: nodeId, feynman: updatedFeynman });

        console.log(`✦ Feynman extras ready for "${node.title}"`);
        res.json({
            challenge_question: updatedFeynman.challenge_question,
            knowledge_gaps: updatedFeynman.knowledge_gaps,
            real_life_moment: updatedFeynman.real_life_moment,
            challenge_attempts: updatedFeynman.challenge_attempts,
            teach_attempts: updatedFeynman.teach_attempts,
            feynman_certified: updatedFeynman.feynman_certified,
        });

    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ai/feynman/:id/challenge
// Grade a Feynman Challenge answer
// ═══════════════════════════════════════════════════════════════════════════

router.post('/feynman/:id/challenge', async (req, res, next) => {
    try {
        const nodeId = req.params.id;
        const { answer } = req.body;

        if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
            return res.status(400).json({ error: 'Answer is required' });
        }

        const { data: node, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw error;
        }

        const feynman = node.feynman || {};
        const question = feynman.challenge_question;

        if (!question) {
            return res.status(400).json({ error: 'No challenge question exists for this node' });
        }

        // Grade the answer
        console.log(`🎯 Grading Feynman Challenge for "${node.title}"...`);
        const grade = await gradeFeynmanChallenge(question, answer.trim(), node.raw_content);

        // Store the attempt
        const attempt = {
            question,
            answer: answer.trim(),
            score: grade.score,
            verdict: grade.verdict,
            timestamp: new Date().toISOString(),
        };

        const attempts = [...(feynman.challenge_attempts || []), attempt];

        const updatedFeynman = {
            ...feynman,
            challenge_attempts: attempts,
        };

        await supabase
            .from('knowledge_nodes')
            .update({ feynman: updatedFeynman })
            .eq('id', nodeId);

        // Broadcast updated feynman
        broadcast('feynman.ready', { node_id: nodeId, feynman: updatedFeynman });

        console.log(`🎯 Challenge graded: ${grade.verdict} (${grade.score}%) for "${node.title}"`);
        res.json(grade);

    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ai/feynman/:id/teach
// Grade a Teach-It explanation (The Feynman Technique)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/feynman/:id/teach', async (req, res, next) => {
    try {
        const nodeId = req.params.id;
        const { explanation } = req.body;

        if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) {
            return res.status(400).json({ error: 'Explanation is required' });
        }

        const { data: node, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw error;
        }

        // Grade the explanation
        console.log(`✦ Grading Teach-It for "${node.title}"...`);
        const grade = await gradeTeachIt(node.title, explanation.trim(), node.raw_content);

        // Store the attempt
        const feynman = node.feynman || {};
        const attempt = {
            explanation: explanation.trim(),
            clarity_score: grade.clarity_score,
            simplicity_score: grade.simplicity_score,
            accuracy_score: grade.accuracy_score,
            overall: grade.overall,
            passed: grade.passed,
            timestamp: new Date().toISOString(),
        };

        const attempts = [...(feynman.teach_attempts || []), attempt];
        const updatedFeynman = {
            ...feynman,
            teach_attempts: attempts,
        };

        // If passed, mark as Feynman Certified and reduce decay rate
        if (grade.passed) {
            updatedFeynman.feynman_certified = true;

            // Reduce decay rate by 20%
            const newDecayRate = Math.max(0.005, node.decay_rate * 0.8);
            await supabase
                .from('knowledge_nodes')
                .update({
                    feynman: updatedFeynman,
                    decay_rate: newDecayRate,
                })
                .eq('id', nodeId);

            broadcast('node.reviewed', {
                id: nodeId,
                decay_rate: newDecayRate,
                feynman: updatedFeynman,
            });
        } else {
            await supabase
                .from('knowledge_nodes')
                .update({ feynman: updatedFeynman })
                .eq('id', nodeId);
        }

        broadcast('feynman.ready', { node_id: nodeId, feynman: updatedFeynman });

        console.log(`✦ Teach-It graded: ${grade.passed ? 'PASSED' : 'FAILED'} (${grade.overall}%) for "${node.title}"`);
        res.json(grade);

    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ai/feynman/:id/moment
// Generate a fresh Real Life Moment
// ═══════════════════════════════════════════════════════════════════════════

router.post('/feynman/:id/moment', async (req, res, next) => {
    try {
        const nodeId = req.params.id;

        const { data: node, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', req.user.uid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Knowledge node not found' });
            }
            throw error;
        }

        console.log(`⚡ Generating new Real Life Moment for "${node.title}"...`);
        const moment = await generateRealLifeMoment(node.title, node.summary || node.raw_content);

        // Update feynman object
        const feynman = node.feynman || {};
        const updatedFeynman = {
            ...feynman,
            real_life_moment: moment,
        };

        await supabase
            .from('knowledge_nodes')
            .update({ feynman: updatedFeynman })
            .eq('id', nodeId);

        broadcast('feynman.ready', { node_id: nodeId, feynman: updatedFeynman });

        console.log(`⚡ New Real Life Moment generated for "${node.title}"`);
        res.json({ moment });

    } catch (err) {
        next(err);
    }
});


export default router;

