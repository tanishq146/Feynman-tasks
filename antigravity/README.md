# ⚛️ Antigravity Engine v1.0.0

> *Antigravity does not fight gravity — it makes knowledge weightless. It lifts ideas out of isolation, connects them across the mind, and keeps them bright until the human truly owns them.*

The living backend behind **Feynman Tasks** — a second brain where every piece of knowledge breathes, decays, connects, and is understood by AI.

---

## 🏗 Architecture

```
antigravity/
├── server.js              ← Main entry point (Express + WebSocket)
├── config/
│   └── env.js             ← Environment configuration
├── lib/
│   ├── supabase.js        ← Supabase client
│   ├── claude.js           ← Anthropic Claude client
│   └── coordinates.js      ← 3D brain coordinate generator
├── services/
│   ├── ai.js              ← AI intelligence layer (classify, connect, Feynman)
│   ├── decay.js           ← Ebbinghaus forgetting curve implementation
│   ├── websocket.js       ← Real-time event broadcasting
│   └── scheduler.js       ← Background decay-checking job
├── routes/
│   ├── knowledge.js       ← Knowledge CRUD + ingestion
│   ├── brain.js           ← 3D brain map data
│   ├── goals.js           ← User goals
│   └── ai.js              ← Manual Feynman re-analysis trigger
├── middleware/
│   └── errorHandler.js    ← Global error handler
└── db/
    └── schema.sql         ← Supabase PostgreSQL schema
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key

### 1. Set up Supabase
1. Create a new Supabase project
2. Go to **SQL Editor** and paste the contents of `db/schema.sql`
3. Click **Run** to create the tables

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
PORT=3001
```

### 3. Install & run
```bash
npm install
npm run dev
```

You'll see the Antigravity startup banner with all available endpoints.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/knowledge/ingest` | Ingest new knowledge into the brain |
| `GET` | `/api/knowledge/all` | Get all nodes with live strength |
| `GET` | `/api/knowledge/fading` | Get nodes with strength < 30 |
| `GET` | `/api/knowledge/:id` | Get a single node with Feynman analysis |
| `GET` | `/api/knowledge/:id/connections` | Get all connections for a node |
| `POST` | `/api/knowledge/:id/review` | Review a node (resets strength) |
| `DELETE` | `/api/knowledge/:id` | Delete a node |
| `GET` | `/api/brain/map` | Get 3D brain visualization data |
| `POST` | `/api/goals` | Create a new goal |
| `GET` | `/api/goals` | List all goals |
| `POST` | `/api/ai/feynman/:id` | Re-run Feynman analysis |
| `GET` | `/api/health` | Health check |

## ⚡ WebSocket Events

Connect to `ws://localhost:3001/ws` to receive real-time events:

| Event | When | Data |
|-------|------|------|
| `node.created` | Node is saved | Full node object |
| `feynman.ready` | AI analysis completes | `{ node_id, feynman }` |
| `connection.formed` | New edge is created | Edge + both titles |
| `node.fading` | Strength drops below 30 | `{ node_id, strength, title }` |
| `node.critical` | Strength drops below 10 | `{ node_id, strength, title }` |
| `node.reviewed` | Node is reviewed | Updated node |

## 🧪 Example: Ingest Knowledge

```bash
curl -X POST http://localhost:3001/api/knowledge/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Newton'\''s First Law of Motion states that an object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force."}'
```

---

## 🧠 The Five Laws of Antigravity

1. **Knowledge decays.** Nothing is permanent unless reviewed.
2. **Everything seeks connection.** Isolation is the exception.
3. **The AI explains, it does not just store.** The Feynman layer is what makes this a second brain.
4. **Goals give meaning.** Every analysis serves what the user is becoming.
5. **The brain is spatial.** Knowledge lives somewhere inside the 3D brain.
