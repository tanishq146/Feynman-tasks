require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Anthropic client ────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// CORS — allow your frontend origin
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', // set to your domain in production
  methods: ['GET', 'POST'],
}));

// Rate limiting — 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', limiter);

// ── Health check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'FEYNMAN API', timestamp: new Date().toISOString() });
});

// ── Main chat endpoint ──────────────────────────────────────────
// POST /api/chat
// Body: { messages: [{role, content}], systemPrompt?: string }
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  // Validate
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  // Each message must have role + content
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Each message must have role and content.' });
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({ error: 'Role must be "user" or "assistant".' });
    }
  }

  // Last message must be from user
  if (messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from the user.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt || process.env.DEFAULT_SYSTEM_PROMPT || 'You are FEYNMAN, an AI-powered second brain.',
      messages: messages,
    });

    const reply = response.content?.[0]?.text || '';

    return res.json({
      reply,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      },
    });

  } catch (err) {
    console.error('[FEYNMAN] Anthropic error:', err.message);

    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Check your .env file.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Anthropic rate limit hit. Try again shortly.' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: 'Bad request to Anthropic: ' + err.message });
    }

    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

// ── Streaming chat endpoint ─────────────────────────────────────
// POST /api/chat/stream  — streams response as SSE (server-sent events)
app.post('/api/chat/stream', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt || process.env.DEFAULT_SYSTEM_PROMPT || 'You are FEYNMAN, an AI-powered second brain.',
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    const finalMsg = await stream.finalMessage();
    res.write(`data: ${JSON.stringify({
      done: true,
      usage: {
        input_tokens: finalMsg.usage?.input_tokens,
        output_tokens: finalMsg.usage?.output_tokens,
      }
    })}\n\n`);

  } catch (err) {
    console.error('[FEYNMAN] Stream error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

// ── 404 catch-all ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🧠 FEYNMAN backend running on http://localhost:${PORT}`);
  console.log(`   Health:  GET  /api/health`);
  console.log(`   Chat:    POST /api/chat`);
  console.log(`   Stream:  POST /api/chat/stream\n`);
});
