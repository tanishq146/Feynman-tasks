// ─── Chat Route ─────────────────────────────────────────────────────────────
// POST /api/chat           — Conversational AI powered by stored knowledge
// POST /api/chat/why-chain — Structured depth questioning (Why Chain Mode)

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { groq, GROQ_MODEL } from '../lib/groq.js';

const router = Router();

// ─── Regular Chat ───────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const { data: nodes } = await supabase
            .from('knowledge_nodes')
            .select('title, summary, tags, raw_content, brain_region, topic_category')
            .order('created_at', { ascending: false })
            .limit(50);

        const knowledgeContext = (nodes || []).map((n, i) =>
            `[${i + 1}] "${n.title}" (${n.brain_region || 'unknown'}, ${n.topic_category || 'General'})
   Summary: ${n.summary || 'No summary'}
   Tags: ${(n.tags || []).join(', ') || 'none'}
   Content: ${(n.raw_content || '').slice(0, 300)}`
        ).join('\n\n');

        const conversationMessages = [
            {
                role: 'system',
                content: `You are Feynman — a brilliant, deeply knowledgeable AI tutor that lives inside the user's "second brain." You have access to all the knowledge the user has stored.

Your core principles:
1. Give RICH, ELABORATIVE, and well-structured answers — never short or vague.
2. Explain concepts using the Feynman technique: simple language, vivid analogies, concrete examples, and real-world applications.
3. Make connections between different pieces of the user's stored knowledge when relevant.
4. Be conversational, warm, intellectually curious, and encouraging.
5. If the question relates to stored knowledge, reference it specifically and build upon it.
6. If outside stored knowledge, still answer comprehensively and mention it's not in their brain yet.

Formatting rules (CRITICAL — follow exactly):
- Use **bold text** for section headings and key terms. NEVER use # or ## or ### or #### markdown headers.
- Use bullet points (•) or numbered lists to organize information clearly.
- Use short paragraphs — break up walls of text.
- Include at least one analogy or real-world example in every answer.
- Use \`backticks\` for technical terms, formulas, or code.
- End your response with a key insight or takeaway marked with ✦
- Structure longer answers into clear sections with bold headers like: **What Is It?**, **Why It Matters**, **How It Works**, **Example**, etc.

The user's stored knowledge (${(nodes || []).length} nodes):
${knowledgeContext || 'No knowledge stored yet.'}

Always aim to educate, inspire, and make the user feel smarter after reading your answer.`
            },
            ...history.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content,
            })),
            {
                role: 'user',
                content: message.trim(),
            },
        ];

        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: conversationMessages,
            temperature: 0.7,
            max_tokens: 2048,
        });

        const reply = completion.choices[0]?.message?.content || 'I couldn\'t generate a response. Try again!';

        const referencedNodes = (nodes || []).filter(n =>
            reply.toLowerCase().includes(n.title.toLowerCase())
        ).map(n => n.title);

        res.json({
            reply,
            referenced_nodes: referencedNodes,
            knowledge_count: (nodes || []).length,
        });
    } catch (err) {
        console.error('💬 Chat error:', err.message);
        next(err);
    }
});

// ─── Why Chain ──────────────────────────────────────────────────────────────
// Structured 5-level depth questioning to uncover core motivations.

router.post('/why-chain', async (req, res, next) => {
    try {
        const { message, depth = 0, chainResponses = [], initialQuestion = '' } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const MAX_DEPTH = 5;
        const currentDepth = Math.min(depth, MAX_DEPTH);

        // Build chain context from previous responses
        const chainContext = chainResponses.map((r, i) =>
            `Depth ${i + 1}: Q: "${r.question}" → A: "${r.answer}"`
        ).join('\n');

        if (currentDepth >= MAX_DEPTH) {
            // ─── Final Analysis ─────────────────────────────
            const analysisPrompt = [
                {
                    role: 'system',
                    content: `You are Feynman — a brilliant AI coach specializing in deep motivational analysis.

You just guided a user through a "Why Chain" — a series of 5 progressively deeper "why" questions to uncover their core motivation.

Analyze the chain below and produce a structured analysis with EXACTLY these three sections:

**🎯 Core Motivation**
[The fundamental driving force behind their interest. Be specific and insightful.]

**🔮 Hidden Goal**
[What they truly want to achieve but may not have articulated. Connect the dots between their responses.]

**⚠️ Possible Misalignment**
[Any gap between what they say they want and what their responses suggest. Be constructive, not critical.]

Be warm, insightful, and specific. Reference their actual words. Keep it concise (max 200 words total). End with a ✦ symbol.`
                },
                {
                    role: 'user',
                    content: `Here is the complete Why Chain:

Initial Question: "${initialQuestion}"

${chainContext}

Final Response (Depth ${currentDepth}): "${message.trim()}"

Please provide the structured analysis.`
                },
            ];

            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: analysisPrompt,
                temperature: 0.6,
                max_tokens: 800,
            });

            const analysis = completion.choices[0]?.message?.content || 'Could not generate analysis.';

            res.json({
                type: 'analysis',
                reply: analysis,
                depth: currentDepth,
                complete: true,
            });
        } else {
            // ─── Generate Next Why Question ─────────────────
            const depthPrompts = [
                'Ask the user: "Why is this important to you?" in a warm, curious tone. Rephrase naturally based on what they just said. Keep it to 1-2 sentences max.',
                'Ask a deeper follow-up: "Why does that matter to you specifically?" Dig deeper into their personal motivation. Rephrase based on their response. 1-2 sentences.',
                'Ask: "What would change in your life if you achieved this?" Push them to envision the outcome. Be specific to their words. 1-2 sentences.',
                'Ask: "What are you really afraid of if this doesn\'t work out?" Gently probe the fear beneath the motivation. 1-2 sentences.',
                'Ask: "If you had to explain this drive to a younger version of yourself, what would you say?" Final introspective question. 1-2 sentences.',
            ];

            const questionPrompt = [
                {
                    role: 'system',
                    content: `You are Feynman — a thoughtful AI coach conducting a "Why Chain" exercise. 
You are at depth ${currentDepth + 1} of 5.

${depthPrompts[currentDepth]}

Context so far:
Initial question: "${initialQuestion || message.trim()}"
${chainContext || 'This is the first response in the chain.'}

Rules:
- Ask ONLY the question, nothing else
- Be warm and genuinely curious
- Reference their specific words
- Do NOT explain the exercise or add commentary
- Keep it short and direct`
                },
                {
                    role: 'user',
                    content: message.trim(),
                },
            ];

            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: questionPrompt,
                temperature: 0.6,
                max_tokens: 150,
            });

            const nextQuestion = completion.choices[0]?.message?.content || 'Why does that matter to you?';

            res.json({
                type: 'question',
                reply: nextQuestion,
                depth: currentDepth + 1,
                complete: false,
            });
        }
    } catch (err) {
        console.error('🔗 Why Chain error:', err.message);
        next(err);
    }
});

export default router;
