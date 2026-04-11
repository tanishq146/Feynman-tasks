-- ═══════════════════════════════════════════════════════════════════════════
-- Mind Mirror Phase 5: The Mirror Report + Temporal Drift
-- Adds: mirror_reports, node_snapshots
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─── Mirror Reports ──────────────────────────────────────────────────────────
-- Weekly narrative reports generated from the user's journal data.
-- Each report is an intimate, AI-generated letter from their own data.
CREATE TABLE IF NOT EXISTS mirror_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    narrative TEXT,
    dominant_theme TEXT,
    top_growing_nodes JSONB DEFAULT '[]'::jsonb,
    top_fading_nodes JSONB DEFAULT '[]'::jsonb,
    unresolved_nodes JSONB DEFAULT '[]'::jsonb,
    new_contradictions JSONB DEFAULT '[]'::jsonb,
    resolution_count INT DEFAULT 0,
    agent_dominance_snapshot JSONB DEFAULT '{}'::jsonb,
    emotional_tone TEXT DEFAULT 'reflective' CHECK (emotional_tone IN (
        'turbulent', 'reflective', 'driven', 'stuck', 'transforming', 'dormant'
    )),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── Node Snapshots ──────────────────────────────────────────────────────────
-- Weekly snapshot of every node's state.
-- Enables temporal drift visualization on the mind graph.
CREATE TABLE IF NOT EXISTS node_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    node_id UUID NOT NULL REFERENCES mind_nodes(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    occurrence_count INT DEFAULT 0,
    strength FLOAT DEFAULT 0.5,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mirror_reports_user_week
    ON mirror_reports (user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_node_snapshots_user_date
    ON node_snapshots (user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_node_snapshots_node
    ON node_snapshots (node_id, snapshot_date DESC);


-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE mirror_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on mirror_reports"
    ON mirror_reports FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on node_snapshots"
    ON node_snapshots FOR ALL
    USING (true)
    WITH CHECK (true);
