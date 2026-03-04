# 🧠 FEYNMAN — Backend

Node.js/Express backend for the FEYNMAN AI second brain app.
Proxies requests to Anthropic's Claude API so your API key stays on the server, never exposed in the browser.

---

## Setup

### 1. Install dependencies
```bash
cd feynman-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Open `.env` and paste your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```
Get your key at: https://console.anthropic.com

### 3. Start the server
```bash
# Production
npm start

# Development (auto-restarts on file change)
npm run dev
```

Server runs at: **http://localhost:3001**

---

## API Endpoints

### `GET /api/health`
Check if the server is running.
```json
{ "status": "ok", "service": "FEYNMAN API" }
```

---

### `POST /api/chat`
Send a message and get a full response.

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "What is the Feynman technique?" }
  ],
  "systemPrompt": "Optional: override the default system prompt here"
}
```

**Response:**
```json
{
  "reply": "The Feynman technique is...",
  "usage": { "input_tokens": 42, "output_tokens": 120 }
}
```

---

### `POST /api/chat/stream`
Same as `/api/chat` but streams the response as Server-Sent Events (SSE).

Each chunk arrives as:
```
data: {"text": "partial response text..."}
```
Final chunk:
```
data: {"done": true, "usage": {...}}
```

---

## Frontend Integration

Update the `fetch` call in `feynman.html` from:
```js
fetch('https://api.anthropic.com/v1/messages', ...)
```
To:
```js
fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: conversationHistory })
})
```
And read the response as:
```js
const data = await response.json();
const reply = data.reply;
```

---

## Deployment

For production, deploy this to any Node.js host:
- **Railway** — `railway up`
- **Render** — connect GitHub repo, set env vars in dashboard
- **Fly.io** — `fly launch`
- **DigitalOcean App Platform**

Set `ALLOWED_ORIGIN` to your frontend domain in `.env` for production.

---

## Project Structure
```
feynman-backend/
├── server.js          # Main Express server
├── .env.example       # Environment variable template
├── .env               # Your actual keys (never commit this)
├── .gitignore
├── package.json
└── README.md
```
