// ─── Study Mode Routes ──────────────────────────────────────────────────────
// Adaptive flashcard system: question generation, answer grading, fading alerts.

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL } from '../lib/groq.js';
import { enrichNodeWithStrength } from '../services/decay.js';

const router = Router();

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

async function callGroq(systemPrompt, userPrompt) {
    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content || '{}';
}

function getDifficulty(studyAttempts, currentDifficulty) {
    if (!studyAttempts || studyAttempts.length === 0) return 'easy';

    const recent = studyAttempts.slice(-5);
    const avgScore = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length;

    if (currentDifficulty === 'easy' && avgScore > 70) {
        const goodAtEasy = recent.filter(a => a.difficulty === 'easy' && a.score > 70).length;
        if (goodAtEasy >= 2) return 'medium';
    }
    if (currentDifficulty === 'medium' && avgScore > 70) {
        const goodAtMedium = recent.filter(a => a.difficulty === 'medium' && a.score > 70).length;
        if (goodAtMedium >= 2) return 'hard';
    }
    if (currentDifficulty === 'hard' && avgScore < 40) {
        return 'medium';
    }
    return currentDifficulty || 'easy';
}


// ═══════════════════════════════════════════════════════════════════════════
// GET /api/study/fading — Get all fading nodes (strength < 60%)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/fading', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { data, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        // Compute strength on-the-fly and filter fading nodes
        const enriched = (data || []).map(enrichNodeWithStrength);
        const fading = enriched
            .filter(n => n.current_strength < 60)
            .sort((a, b) => a.current_strength - b.current_strength);

        res.json({ nodes: fading });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/study/generate-questions — Generate adaptive quiz questions
// ═══════════════════════════════════════════════════════════════════════════

router.post('/generate-questions', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { nodeIds, count = 5 } = req.body;

        if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
            return res.status(400).json({ error: 'nodeIds array is required' });
        }

        // Fetch nodes from DB
        const { data: rawNodes, error } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('user_id', userId)
            .in('id', nodeIds);

        if (error) throw error;
        if (!rawNodes || rawNodes.length === 0) {
            return res.status(404).json({ error: 'No nodes found' });
        }

        // Compute strength on-the-fly, sort weakest first, and limit
        const nodes = rawNodes.map(enrichNodeWithStrength);
        const sorted = nodes
            .sort((a, b) => (a.current_strength || 0) - (b.current_strength || 0))
            .slice(0, count);

        // Generate questions in parallel
        const questions = await Promise.all(sorted.map(async (node) => {
            const difficulty = getDifficulty(node.study_attempts, node.current_difficulty);

            const prompt = `Generate ONE quiz question for this knowledge node.

Node title: ${node.title}
Node summary: ${node.summary || 'No summary'}
Node content: ${node.raw_content || 'No content'}
Difficulty level: ${difficulty}
Previous attempts: ${(node.study_attempts || []).length}

Difficulty rules:
- Easy (first time or score < 50): "What is [concept]?" or "Define [concept] in your own words"
- Medium (score 50-75): "How does [concept] apply to [real scenario]?" or "Explain the relationship between [concept] and something practical"
- Hard (score > 75): "Connect [concept] to a deeper principle and explain why they're related" or "What would happen if [concept] didn't exist?"

Respond with JSON only:
{
  "question": "The question text — keep it SHORT and specific",
  "difficulty": "${difficulty}",
  "hint": "A subtle hint that doesn't give away the answer",
  "key_concepts": ["concept1", "concept2"],
  "ideal_answer_points": ["point1", "point2", "point3"]
}`;

            try {
                const responseText = await callGroq(
                    'You are Feynman generating adaptive quiz questions. Always respond with valid JSON only.',
                    prompt
                );
                const result = extractJSON(responseText);
                return {
                    nodeId: node.id,
                    nodeTitle: node.title,
                    nodeStrength: node.current_strength,
                    question: result.question || `Explain ${node.title} in your own words.`,
                    difficulty: result.difficulty || difficulty,
                    hint: result.hint || 'Think about the core concept.',
                    key_concepts: result.key_concepts || [],
                    ideal_answer_points: result.ideal_answer_points || [],
                };
            } catch (err) {
                console.error(`Failed to generate question for node ${node.id}:`, err.message);
                return {
                    nodeId: node.id,
                    nodeTitle: node.title,
                    nodeStrength: node.current_strength,
                    question: `Explain ${node.title} in your own words, as if explaining to someone who has never heard of it.`,
                    difficulty: 'easy',
                    hint: 'Start with the basics — what is it, and why does it matter?',
                    key_concepts: [node.title],
                    ideal_answer_points: ['Core definition', 'Why it matters', 'A concrete example'],
                };
            }
        }));

        res.json({ questions });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/study/grade-answer — Grade a user's answer with Feynman feedback
// ═══════════════════════════════════════════════════════════════════════════

router.post('/grade-answer', async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { nodeId, question, userAnswer, keyConcepts, idealPoints, difficulty } = req.body;

        if (!nodeId || !question || !userAnswer) {
            return res.status(400).json({ error: 'nodeId, question, and userAnswer are required' });
        }

        // Grade the answer
        const gradePrompt = `Grade this student's answer. Be honest but encouraging.

Question: ${question}
Key concepts that should appear: ${(keyConcepts || []).join(', ')}
Ideal answer points: ${(idealPoints || []).join(', ')}
Student's answer: ${userAnswer}

Respond with JSON only:
{
  "score": 0-100,
  "verdict": "Excellent | Good | Partial | Needs Work | Try Again",
  "what_you_got_right": "Specific things they said correctly",
  "what_was_missing": "Specific concepts they missed (or 'Nothing — great job!' if perfect)",
  "feynman_explains": "2-3 sentences in Feynman's voice explaining the correct answer simply. Start with 'Here\\'s the thing...' or 'Think of it this way...'",
  "memory_tip": "One memorable analogy or trick to remember this better"
}`;

        const responseText = await callGroq(
            'You are Feynman grading a student\'s answer. Be honest but warm and encouraging. Always respond with valid JSON only.',
            gradePrompt
        );
        const grade = extractJSON(responseText);

        // Sanitize
        grade.score = Math.max(0, Math.min(100, parseInt(grade.score) || 0));
        const validVerdicts = ['Excellent', 'Good', 'Partial', 'Needs Work', 'Try Again'];
        if (!validVerdicts.includes(grade.verdict)) {
            if (grade.score >= 85) grade.verdict = 'Excellent';
            else if (grade.score >= 70) grade.verdict = 'Good';
            else if (grade.score >= 50) grade.verdict = 'Partial';
            else if (grade.score >= 30) grade.verdict = 'Needs Work';
            else grade.verdict = 'Try Again';
        }
        if (!grade.what_you_got_right) grade.what_you_got_right = 'Review the material and try again.';
        if (!grade.what_was_missing) grade.what_was_missing = 'Several key concepts were not covered.';
        if (!grade.feynman_explains) grade.feynman_explains = 'Think about the core principle behind this concept.';
        if (!grade.memory_tip) grade.memory_tip = 'Try creating a vivid mental picture of this concept.';

        // Fetch node and compute current strength
        const { data: rawNode, error: fetchErr } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .eq('id', nodeId)
            .eq('user_id', userId)
            .single();

        if (fetchErr) throw fetchErr;

        const node = enrichNodeWithStrength(rawNode);
        const attempts = node.study_attempts || [];
        attempts.push({
            score: grade.score,
            difficulty: difficulty || 'easy',
            timestamp: new Date().toISOString(),
        });

        // For good scores, reset last_reviewed_at to reset the decay curve
        // Score > 80: full reset (like a review), Score 60-80: partial reset
        const currentStrength = node.current_strength;
        let newLastReviewedAt = node.last_reviewed_at;
        if (grade.score > 80) {
            newLastReviewedAt = new Date().toISOString(); // Reset to now = 100% strength
        } else if (grade.score >= 60) {
            // Shift last_reviewed_at forward to simulate a strength boost
            const boostMs = 12 * 60 * 60 * 1000; // 12 hours forward
            const current = new Date(node.last_reviewed_at).getTime();
            newLastReviewedAt = new Date(current + boostMs).toISOString();
        }

        // Calculate new difficulty
        const newDifficulty = getDifficulty(attempts, node.current_difficulty || 'easy');

        // Compute what the new strength will be
        const newStrength = grade.score > 80 ? 100 : grade.score >= 60 ? Math.min(100, currentStrength + 20) : currentStrength;

        const { error: updateErr } = await supabase
            .from('knowledge_nodes')
            .update({
                study_attempts: attempts,
                current_difficulty: newDifficulty,
                last_studied_at: new Date().toISOString(),
                last_reviewed_at: newLastReviewedAt,
            })
            .eq('id', nodeId)
            .eq('user_id', userId);

        if (updateErr) throw updateErr;

        res.json({
            ...grade,
            strengthBefore: node.current_strength,
            strengthAfter: newStrength,
            newDifficulty,
        });
    } catch (err) {
        next(err);
    }
});


// ═══════════════════════════════════════════════════════════════════════════
// POST /api/study/session-summary — Generate an AI session summary
// ═══════════════════════════════════════════════════════════════════════════

router.post('/session-summary', async (req, res, next) => {
    try {
        const { results } = req.body;
        if (!results || !Array.isArray(results) || results.length === 0) {
            return res.json({
                feynman_says: "Great effort! Keep studying to strengthen your knowledge.",
            });
        }

        const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
        const nodeNames = results.map(r => `${r.nodeTitle} (${r.score}%)`).join(', ');

        const prompt = `A student just finished a study session. Generate a brief, encouraging summary.

Results: ${nodeNames}
Average score: ${avgScore}%
Questions answered: ${results.length}
Nodes strengthened: ${results.filter(r => r.score > 60).length}
Nodes needing review: ${results.filter(r => r.score <= 60).length}

Respond with JSON:
{
  "feynman_says": "2-3 sentences in Feynman's voice — warm, direct. Highlight what went well and what needs focus next. Be specific about which topics."
}`;

        const responseText = await callGroq(
            'You are Feynman giving a study session summary. Be warm, specific, and encouraging. Always respond with valid JSON only.',
            prompt
        );
        const result = extractJSON(responseText);

        res.json({
            feynman_says: result.feynman_says || "Good session! Keep at it — regular practice makes knowledge stick.",
        });
    } catch (err) {
        next(err);
    }
});

export default router;
