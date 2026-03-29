-- ─── Workspace Notes ─────────────────────────────────────────
-- Standalone notes for the Notes Workspace (not tied to a node).
-- These can later be converted to knowledge nodes via AI analysis.
CREATE TABLE IF NOT EXISTS workspace_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT 'Untitled',
  content      TEXT NOT NULL DEFAULT '',
  images       JSONB DEFAULT '[]',
  voice_urls   JSONB DEFAULT '[]',
  is_pinned    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_notes_user ON workspace_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_updated ON workspace_notes(updated_at DESC);
