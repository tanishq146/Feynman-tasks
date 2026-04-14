-- ╔═══════════════════════════════════════════════════════════╗
-- ║  ENGRAM — The Living Thinking Graph                     ║
-- ║  Thoughts, not conversations. Understanding, not data.  ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ─── Thought Nodes ──────────────────────────────────────────
-- The atomic units of understanding. Not "my chat on April 3rd"
-- but "my evolving understanding of stoicism."
CREATE TABLE IF NOT EXISTS engram_thoughts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    essence         TEXT NOT NULL,
    full_context    TEXT DEFAULT '',
    domain          TEXT DEFAULT 'general',
    tags            TEXT[] DEFAULT '{}',
    maturity        TEXT DEFAULT 'seed' CHECK (maturity IN ('seed', 'sprouting', 'growing', 'mature', 'evolved')),
    velocity_score  FLOAT DEFAULT 0,
    last_enriched   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Source Conversations ───────────────────────────────────
-- Raw material from any AI. Gets processed into thoughts.
CREATE TABLE IF NOT EXISTS engram_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         TEXT NOT NULL,
    source_ai       TEXT NOT NULL CHECK (source_ai IN ('claude', 'chatgpt', 'gemini', 'copilot', 'other')),
    title           TEXT DEFAULT '',
    raw_content     TEXT NOT NULL,
    extracted       BOOLEAN DEFAULT FALSE,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Thought Links ──────────────────────────────────────────
-- Neural connections between thoughts.
CREATE TABLE IF NOT EXISTS engram_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES engram_thoughts(id) ON DELETE CASCADE,
    target_id       UUID NOT NULL REFERENCES engram_thoughts(id) ON DELETE CASCADE,
    link_type       TEXT NOT NULL CHECK (link_type IN (
        'builds_on', 'contradicts', 'extends', 'requires',
        'exemplifies', 'generalizes', 'questions', 'resolves'
    )),
    strength        FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    reason          TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Thought History ────────────────────────────────────────
-- Evolution log. Tracks how understanding deepens over time.
CREATE TABLE IF NOT EXISTS engram_thought_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thought_id      UUID NOT NULL REFERENCES engram_thoughts(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES engram_conversations(id) ON DELETE SET NULL,
    snapshot        TEXT NOT NULL,
    sophistication  FLOAT DEFAULT 0,
    delta_note      TEXT DEFAULT '',
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Performance Indexes ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_engram_thoughts_user ON engram_thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_engram_thoughts_domain ON engram_thoughts(domain);
CREATE INDEX IF NOT EXISTS idx_engram_thoughts_maturity ON engram_thoughts(maturity);
CREATE INDEX IF NOT EXISTS idx_engram_convos_user ON engram_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_engram_convos_extracted ON engram_conversations(extracted);
CREATE INDEX IF NOT EXISTS idx_engram_links_source ON engram_links(source_id);
CREATE INDEX IF NOT EXISTS idx_engram_links_target ON engram_links(target_id);
CREATE INDEX IF NOT EXISTS idx_engram_links_type ON engram_links(link_type);
CREATE INDEX IF NOT EXISTS idx_engram_history_thought ON engram_thought_history(thought_id);
CREATE INDEX IF NOT EXISTS idx_engram_history_recorded ON engram_thought_history(recorded_at DESC);
