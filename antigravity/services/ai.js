// ─── AI Service ─────────────────────────────────────────────────────────────
// The intelligence layer of Antigravity.
//
// Three core tasks:
//   Task A — Feynman Layer Generation (the WHY / HOW / WHAT analysis)
//   Task B — Connection Detection     (finding neural pathways between nodes)
//   Task C — Knowledge Classification (brain region + category + metadata)
//
// All calls use Groq with Llama 3.3 70B (blazing fast, generous free tier).

import { groq, GROQ_MODEL } from '../lib/groq.js';


// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Robustly extract JSON from an AI response, handling markdown code blocks,
 * preamble text, and other formatting issues.
 */
function extractJSON(text) {
    // Try direct parse first
    try {
        return JSON.parse(text);
    } catch {
        // no-op
    }

    // Try extracting from ```json ... ``` code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch {
            // no-op
        }
    }

    // Try finding the first JSON object or array in the text
    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        } catch {
            // no-op
        }
    }

    throw new Error(`Could not extract JSON from AI response: ${text.substring(0, 200)}`);
}

/**
 * Call Groq with a prompt and return the raw text response.
 * Uses Llama 3.3 70B with JSON response mode.
 */
async function callGroq(prompt) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'You are a precise AI that always responds with valid JSON. No preamble, no explanation — just the JSON.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    });

    return chatCompletion.choices[0]?.message?.content || '{}';
}

/**
 * Call Groq for array responses (connection detection).
 * Groq's json_object mode requires a top-level object, so we wrap arrays.
 */
async function callGroqArray(prompt) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'You are a precise AI. Respond with valid JSON. Wrap array responses in an object with a "results" key, e.g. {"results": [...]}',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    });

    const text = chatCompletion.choices[0]?.message?.content || '{"results": []}';
    const parsed = extractJSON(text);
    return parsed.results || parsed;
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK C + INITIAL ANALYSIS — Classify & Analyze Knowledge
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze raw knowledge content and classify it.
 * Returns title, summary, tags, topic_category, brain_region, and decay_rate.
 * This is the FIRST AI call made when a user submits new knowledge.
 *
 * @param {string} rawContent - The raw text the user submitted
 * @returns {Promise<{
 *   title: string,
 *   summary: string,
 *   tags: string[],
 *   topic_category: string,
 *   brain_region: string,
 *   decay_rate: number
 * }>}
 */
export async function analyzeAndClassify(rawContent) {
    const prompt = `You are Antigravity — a neuroscience-informed knowledge analyzer.
Your job is to analyze a piece of knowledge and classify it for storage in a 3D brain model.
Respond ONLY with valid JSON. No preamble, no explanation — just the JSON object.

Brain region mapping rules:
- Science facts, History facts → hippocampus (declarative/episodic memory)
- Philosophy reasoning, Logic/analysis → prefrontal_cortex (abstract reasoning)
- Emotion processing → amygdala (emotional processing)
- Skills, habits, procedures → cerebellum (procedural/motor memory)
- Language comprehension → wernickes_area (language processing)
- Social understanding → temporal_lobe (social cognition)

Decay rate rules:
- Lookupable facts (dates, names, formulas) → 0.12 (fades fast)
- Conceptual understanding (why something works) → 0.06 (fades medium)
- Deep skills, habits, procedures → 0.03 (fades slowly)

Analyze this knowledge:
"${rawContent}"

Respond with this exact JSON structure:
{
  "title": "3 to 6 word title summarizing the core idea",
  "summary": "One clear sentence summarizing what this knowledge is about",
  "tags": ["3", "to", "5", "single-word", "tags"],
  "topic_category": "Science|History|Philosophy|Skill|Language|Social|Emotion|Logic",
  "brain_region": "hippocampus|prefrontal_cortex|amygdala|cerebellum|wernickes_area|occipital_lobe|temporal_lobe",
  "decay_rate": 0.06
}`;

    const responseText = await callGroq(prompt);
    const result = extractJSON(responseText);

    // Validate and sanitize
    const validCategories = ['Science', 'History', 'Philosophy', 'Skill', 'Language', 'Social', 'Emotion', 'Logic'];
    const validRegions = ['hippocampus', 'prefrontal_cortex', 'amygdala', 'cerebellum', 'wernickes_area', 'occipital_lobe', 'temporal_lobe'];

    if (!validCategories.includes(result.topic_category)) {
        result.topic_category = 'Science';
        result.brain_region = 'hippocampus';
    }
    if (!validRegions.includes(result.brain_region)) {
        result.brain_region = 'hippocampus';
    }

    // Ensure decay_rate is within bounds
    result.decay_rate = Math.max(0.03, Math.min(0.15, result.decay_rate || 0.06));

    // Ensure tags is an array of strings
    if (!Array.isArray(result.tags)) {
        result.tags = [];
    }
    result.tags = result.tags.map(String).slice(0, 5);

    return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK B — Detect Connections Between Knowledge Nodes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compare a new node against all existing nodes to find relationships.
 * Returns only connections with strength >= 65.
 * Uses a single batched AI call for efficiency.
 *
 * @param {object} newNode - The newly created knowledge node
 * @param {object[]} existingNodes - All existing nodes (with id, title, summary, tags)
 * @returns {Promise<Array<{
 *   index: number,
 *   strength: number,
 *   connection_type: string,
 *   reason: string
 * }>>}
 */
export async function detectConnections(newNode, existingNodes) {
    if (!existingNodes || existingNodes.length === 0) return [];

    // Batch all existing nodes into a single prompt for efficiency
    const nodesList = existingNodes.map((n, i) =>
        `[${i}] "${n.title}" — ${n.summary || 'No summary'} — Tags: ${(n.tags || []).join(', ') || 'none'}`
    ).join('\n');

    const prompt = `You are a knowledge graph builder. Your job is to determine which existing knowledge nodes are related to a new node.
A connection must have a strength of at least 65 to be included.
If nothing is related, respond with: {"results": []}

New node: "${newNode.title}" — ${newNode.summary || 'No summary'} — Tags: ${(newNode.tags || []).join(', ') || 'none'}

Existing nodes:
${nodesList}

For each existing node that is related to the new node (strength >= 65), include it in the response.

Connection types:
- "supports" — Both ideas agree and reinforce each other
- "contradicts" — The ideas conflict or create tension
- "extends" — The new idea builds on the existing one
- "requires" — You need the existing knowledge to understand the new one
- "example_of" — The new idea is a specific instance of the existing concept

Respond with JSON:
{"results": [{"index": 0, "strength": 85, "connection_type": "extends", "reason": "one sentence explaining the relationship"}]}`;

    const connections = await callGroqArray(prompt);

    // Validate: ensure it's an array and filter valid entries
    if (!Array.isArray(connections)) return [];

    const validTypes = ['supports', 'contradicts', 'extends', 'requires', 'example_of'];

    return connections.filter(conn => {
        if (typeof conn.index !== 'number') return false;
        if (conn.index < 0 || conn.index >= existingNodes.length) return false;
        if (typeof conn.strength !== 'number' || conn.strength < 65) return false;
        if (!validTypes.includes(conn.connection_type)) return false;
        return true;
    });
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK A — Generate the Feynman Analysis Layer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the complete Feynman analysis for a knowledge node.
 * This is the "soul" of Antigravity — it explains WHY, HOW, and WHAT.
 *
 * @param {object} node - The knowledge node
 * @param {object[]} connectedNodes - Nodes connected to this one (with id, title, summary)
 * @param {object[]} goals - User goals (with goal_text)
 * @returns {Promise<{
 *   why_important: string,
 *   goal_alignment: string[],
 *   real_world_applications: string[],
 *   connected_to_existing: Array<{node_id: string, node_title: string, relationship: string}>,
 *   simple_explanation: string,
 *   open_questions: string[]
 * }>}
 */
export async function generateFeynmanAnalysis(node, connectedNodes, goals) {
    const goalsText = goals && goals.length > 0
        ? goals.map(g => g.goal_text).join(', ')
        : 'none set yet';

    const connectionsText = connectedNodes && connectedNodes.length > 0
        ? connectedNodes.map(cn =>
            `- "${cn.title}" (id: ${cn.id}) — ${cn.summary || 'No summary'}`
        ).join('\n')
        : 'none yet';

    const prompt = `You are Feynman — a brilliant, warm, and curious teacher named after Richard Feynman.
Your job is to help a person understand WHY the thing they just learned matters,
HOW it connects to what they already know, and WHAT they can do with it.
Be direct, warm, and never condescending.
Always respond ONLY with valid JSON matching the exact schema provided.
No preamble, no explanation outside the JSON.

New knowledge: ${node.raw_content}
Summary: ${node.summary || 'No summary yet'}
Tags: ${(node.tags || []).join(', ') || 'none'}
User's goals: ${goalsText}
Already connected to these nodes:
${connectionsText}

Generate the Feynman analysis JSON with this EXACT structure:
{
  "why_important": "One honest sentence about why a person would learn this",
  "goal_alignment": ["Name of a user goal this connects to, or empty array if no goals set"],
  "real_world_applications": [
    "Short, concrete real-world application example",
    "Another concrete example"
  ],
  "connected_to_existing": [
    { "node_id": "ID of connected node", "node_title": "Title", "relationship": "One sentence" }
  ],
  "simple_explanation": "Explain this in 2-3 sentences as if the user is 12 years old. No jargon.",
  "open_questions": [
    "A question this knowledge raises that the user hasn't answered yet",
    "A second question that would deepen their understanding"
  ]
}`;

    const responseText = await callGroq(prompt);
    const feynman = extractJSON(responseText);

    // Sanitize the response
    if (!feynman.why_important) feynman.why_important = '';
    if (!Array.isArray(feynman.goal_alignment)) feynman.goal_alignment = [];
    if (!Array.isArray(feynman.real_world_applications)) feynman.real_world_applications = [];
    if (!Array.isArray(feynman.connected_to_existing)) feynman.connected_to_existing = [];
    if (!feynman.simple_explanation) feynman.simple_explanation = '';
    if (!Array.isArray(feynman.open_questions)) feynman.open_questions = [];

    return feynman;
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK D — Generate Feynman Extras (Challenge, Gaps, Real Life Moment)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the extra Feynman features: challenge question, knowledge gaps,
 * and real-life moment. Called once as a follow-up after the main Feynman analysis.
 *
 * @param {object} node - The knowledge node
 * @param {string[]} connectedTitles - Titles of connected nodes
 * @returns {Promise<{challenge_question, knowledge_gaps, real_life_moment}>}
 */
export async function generateFeynmanExtras(node, connectedTitles = []) {
    const connectedText = connectedTitles.length > 0
        ? connectedTitles.join(', ')
        : 'none yet';

    const prompt = `You are Feynman — a brilliant teacher and knowledge cartographer.
You have THREE tasks for this knowledge node. Respond with valid JSON only.

Knowledge title: ${node.title}
Knowledge content: ${node.raw_content}
Summary: ${node.summary || 'No summary'}
Connected to: ${connectedText}

Generate this EXACT JSON structure:
{
  "challenge_question": "A single hard question that tests GENUINE UNDERSTANDING of this concept — not just recall. The question should be specific enough that a vague answer fails. It should require 2-3 sentences to answer properly. Cannot be answered by someone who only read the definition. Example: For Newton's First Law, ask 'A hockey puck slides on frictionless ice — you stop pushing. What happens and why, without using the word inertia?'",
  "knowledge_gaps": [
    {
      "title": "3-5 word concept name",
      "teaser": "One fascinating sentence that makes them WANT to know this",
      "why_it_matters": "One sentence on how it connects to what they already know",
      "difficulty": "beginner|intermediate|advanced"
    },
    {
      "title": "Another gap concept",
      "teaser": "Another fascinating sentence",
      "why_it_matters": "Connection to existing knowledge",
      "difficulty": "beginner|intermediate|advanced"
    },
    {
      "title": "Third gap concept",
      "teaser": "Third fascinating sentence",
      "why_it_matters": "Connection to existing knowledge",
      "difficulty": "beginner|intermediate|advanced"
    }
  ],
  "real_life_moment": "A hyper-specific scenario where this knowledge applies TODAY or this week. Must start with 'Right now...' or 'Next time...' or 'Today when...' or 'This week...'. Be extremely specific and concrete — not generic. Create a 'holy shit' moment of relevance. Two sentences maximum."
}`;

    const responseText = await callGroq(prompt);
    const result = extractJSON(responseText);

    // Sanitize
    if (!result.challenge_question || typeof result.challenge_question !== 'string') {
        result.challenge_question = `Explain ${node.title} to someone who has never heard of it, using only examples from everyday life.`;
    }

    if (!Array.isArray(result.knowledge_gaps)) {
        result.knowledge_gaps = [];
    }
    result.knowledge_gaps = result.knowledge_gaps.slice(0, 3).map(gap => ({
        title: gap.title || 'Unknown concept',
        teaser: gap.teaser || 'Something fascinating to discover',
        why_it_matters: gap.why_it_matters || 'Deepens your understanding',
        difficulty: ['beginner', 'intermediate', 'advanced'].includes(gap.difficulty) ? gap.difficulty : 'intermediate',
        filled: false,
    }));

    if (!result.real_life_moment || typeof result.real_life_moment !== 'string') {
        result.real_life_moment = `Next time you encounter ${node.title} in the real world, you'll understand exactly what's happening.`;
    }

    return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK E — Grade Feynman Challenge Answer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Grade a user's answer to the Feynman Challenge question.
 *
 * @param {string} question - The challenge question
 * @param {string} answer - The user's answer
 * @param {string} nodeContent - The raw content of the knowledge node
 * @returns {Promise<{score, verdict, feedback, the_key_insight}>}
 */
export async function gradeFeynmanChallenge(question, answer, nodeContent) {
    const prompt = `You are Feynman — a brilliant, honest teacher. A student just answered a challenge question about a concept they claim to know. Grade their answer ruthlessly but kindly.

The concept: ${nodeContent}
Challenge question: ${question}
Student's answer: ${answer}

Respond with JSON only:
{
  "score": 0-100,
  "verdict": "one of: Master | Understands | Partial | Memorized | Missing It",
  "feedback": "2-3 sentences of honest feedback — what they got right, what's missing, what the gap reveals about their understanding",
  "the_key_insight": "The one thing they needed to say to prove true understanding"
}`;

    const responseText = await callGroq(prompt);
    const result = extractJSON(responseText);

    // Sanitize
    result.score = Math.max(0, Math.min(100, parseInt(result.score) || 0));
    const validVerdicts = ['Master', 'Understands', 'Partial', 'Memorized', 'Missing It'];
    if (!validVerdicts.includes(result.verdict)) {
        if (result.score >= 90) result.verdict = 'Master';
        else if (result.score >= 70) result.verdict = 'Understands';
        else if (result.score >= 50) result.verdict = 'Partial';
        else if (result.score >= 30) result.verdict = 'Memorized';
        else result.verdict = 'Missing It';
    }
    if (!result.feedback) result.feedback = 'Review the material and try again.';
    if (!result.the_key_insight) result.the_key_insight = 'Think deeper about why this concept matters.';

    return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK F — Grade Teach-It Explanation (The Feynman Technique)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Grade a user's simple explanation of a concept (Feynman Technique test).
 *
 * @param {string} nodeTitle - The knowledge node title
 * @param {string} explanation - The user's simple explanation
 * @param {string} nodeContent - The raw content of the knowledge node
 * @returns {Promise<{clarity_score, simplicity_score, accuracy_score, overall, passed, feynman_says, simpler_version}>}
 */
export async function gradeTeachIt(nodeTitle, explanation, nodeContent) {
    const prompt = `You are Richard Feynman grading a student's ability to explain a concept simply. You believe complexity is the enemy of understanding. Grade ruthlessly.

User has tried to explain: ${nodeTitle}
Their explanation: ${explanation}
The actual concept: ${nodeContent}

Respond with JSON only:
{
  "clarity_score": 0-100,
  "simplicity_score": 0-100,
  "accuracy_score": 0-100,
  "overall": 0-100,
  "passed": true or false (true if overall > 75),
  "feynman_says": "2-3 sentences in Feynman's voice — direct, warm, honest. If they passed: celebrate what they got right. If failed: point out exactly where the jargon or confusion crept in.",
  "simpler_version": "How Feynman himself would explain it in 2 sentences to a child"
}`;

    const responseText = await callGroq(prompt);
    const result = extractJSON(responseText);

    // Sanitize
    result.clarity_score = Math.max(0, Math.min(100, parseInt(result.clarity_score) || 0));
    result.simplicity_score = Math.max(0, Math.min(100, parseInt(result.simplicity_score) || 0));
    result.accuracy_score = Math.max(0, Math.min(100, parseInt(result.accuracy_score) || 0));
    result.overall = Math.max(0, Math.min(100, parseInt(result.overall) || 0));
    result.passed = result.overall > 75;
    if (!result.feynman_says) result.feynman_says = 'Try again — simplicity takes more effort than complexity.';
    if (!result.simpler_version) result.simpler_version = 'Let me think of a simpler way to put this...';

    return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// TASK G — Generate a Fresh Real-Life Moment
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a new real-life moment for a knowledge node.
 *
 * @param {string} nodeTitle - Title of the knowledge node
 * @param {string} nodeSummary - Summary of the knowledge node
 * @returns {Promise<string>} The real-life moment text
 */
export async function generateRealLifeMoment(nodeTitle, nodeSummary) {
    const prompt = `You are brilliant at making abstract knowledge feel immediately relevant.

Knowledge: ${nodeTitle} — ${nodeSummary}

Generate ONE real-life moment that:
- Could happen TODAY or this week
- Is specific to a real scenario (not "in science..." but "when you...")
- Creates a 'holy shit' moment of relevance
- Is 2 sentences maximum
- Starts with "Right now..." or "Next time..." or "Today when..." or "This week..."

Return a JSON object with a single key: {"moment": "your two sentences here"}`;

    const responseText = await callGroq(prompt);
    const result = extractJSON(responseText);

    return result.moment || `Next time you encounter ${nodeTitle} in daily life, you'll see it differently.`;
}
