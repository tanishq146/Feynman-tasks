// ═══════════════════════════════════════════════════════════════════════════
//
//     ⚛️  ANTIGRAVITY ENGINE v1.0.0
//     🧠 The living backend behind Feynman Tasks
//
//     Antigravity does not fight gravity — it makes knowledge weightless.
//     It lifts ideas out of isolation, connects them across the mind,
//     and keeps them bright until the human truly owns them.
//
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import { config } from './config/env.js';
import { initWebSocket } from './services/websocket.js';
import { startScheduler } from './services/scheduler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { initFirebaseAdmin } from './lib/firebaseAdmin.js';

// Initialize Firebase Admin SDK (for auth token verification)
initFirebaseAdmin();

// Routes
import knowledgeRoutes from './routes/knowledge.js';
import brainRoutes from './routes/brain.js';
import goalRoutes from './routes/goals.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';
import beliefRoutes from './routes/beliefs.js';


// ─── Express App ────────────────────────────────────────────────────────────

const app = express();
const server = createServer(app);


// ─── Middleware ─────────────────────────────────────────────────────────────

app.use(cors({
    origin: '*', // In production, restrict to your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
    if (req.path !== '/api/health') {
        console.log(`→ ${req.method} ${req.path}`);
    }
    next();
});


// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'online',
        engine: 'Antigravity',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});


// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/knowledge', requireAuth, knowledgeRoutes);
app.use('/api/brain', requireAuth, brainRoutes);
app.use('/api/goals', requireAuth, goalRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/beliefs', requireAuth, beliefRoutes);


// ─── 404 Catch-all ──────────────────────────────────────────────────────────

app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


// ─── Error Handler ──────────────────────────────────────────────────────────

app.use(errorHandler);


// ─── Start ──────────────────────────────────────────────────────────────────

// Initialize WebSocket on the same server
initWebSocket(server);

// Start the decay-checking background job
startScheduler();

// Launch
server.listen(config.PORT, '0.0.0.0', () => {
    console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║     ⚛️  ANTIGRAVITY ENGINE v1.0.0                          ║
  ║     🧠  Feynman Tasks Backend                              ║
  ║                                                            ║
  ║     🚀  REST API    →  http://localhost:${String(config.PORT).padEnd(21)}║
  ║     ⚡  WebSocket   →  ws://localhost:${String(config.PORT).padEnd(14)}/ws     ║
  ║     💚  Health      →  /api/health                         ║
  ║                                                            ║
  ║     📡 Endpoints:                                          ║
  ║        POST   /api/knowledge/ingest                        ║
  ║        GET    /api/knowledge/all                            ║
  ║        GET    /api/knowledge/fading                         ║
  ║        GET    /api/knowledge/:id                            ║
  ║        GET    /api/knowledge/:id/connections                ║
  ║        POST   /api/knowledge/:id/review                    ║
  ║        DELETE /api/knowledge/:id                            ║
  ║        GET    /api/brain/map                                ║
  ║        POST   /api/goals                                    ║
  ║        GET    /api/goals                                    ║
  ║        POST   /api/chat                                   ║
  ║        POST   /api/chat/why-chain                          ║
  ║        GET    /api/beliefs/evolution                       ║
  ║        GET    /api/beliefs/all                              ║
  ║        POST   /api/ai/feynman/:id                          ║
  ║        POST   /api/ai/feynman/:id/extras                   ║
  ║        POST   /api/ai/feynman/:id/challenge                ║
  ║        POST   /api/ai/feynman/:id/teach                    ║
  ║        POST   /api/ai/feynman/:id/moment                   ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});


export default app;
