-- ╔═══════════════════════════════════════════════════════════╗
-- ║  ANTIGRAVITY DATABASE SCHEMA                             ║
-- ║  Run this in your Supabase SQL Editor                    ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Knowledge Nodes ────────────────────────────────────────
-- Each row is a single memory — one idea, one fact, one concept.
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  raw_content      TEXT NOT NULL,
  summary          TEXT,
  topic_category   TEXT CHECK (topic_category IN (
    'Science', 'History', 'Philosophy', 'Skill',
    'Language', 'Social', 'Emotion', 'Logic'
  )),
  brain_region     TEXT CHECK (brain_region IN (
    'hippocampus', 'prefrontal_cortex', 'amygdala',
    'cerebellum', 'wernickes_area', 'occipital_lobe', 'temporal_lobe'
  )),
  coord_x          FLOAT NOT NULL,
  coord_y          FLOAT NOT NULL,
  coord_z          FLOAT NOT NULL,
  decay_rate       FLOAT NOT NULL DEFAULT 0.06,
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags             TEXT[] DEFAULT '{}',
  feynman          JSONB
);

-- ─── Connection Edges ───────────────────────────────────────
-- Neural pathways between knowledge nodes.
CREATE TABLE IF NOT EXISTS connection_edges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_node_id      UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id      UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  connection_type     TEXT CHECK (connection_type IN (
    'supports', 'contradicts', 'extends', 'requires', 'example_of'
  )),
  connection_strength INTEGER CHECK (connection_strength >= 0 AND connection_strength <= 100),
  reason              TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User Goals ─────────────────────────────────────────────
-- What the human is trying to become. Gives meaning to everything.
CREATE TABLE IF NOT EXISTS user_goals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_text    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Performance Indexes ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_knowledge_brain_region ON knowledge_nodes(brain_region);
CREATE INDEX IF NOT EXISTS idx_knowledge_topic        ON knowledge_nodes(topic_category);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at   ON knowledge_nodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edges_source           ON connection_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target           ON connection_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_type             ON connection_edges(connection_type);

-- ─── Beliefs ────────────────────────────────────────────────
-- Structured belief objects extracted from each memory.
CREATE TABLE IF NOT EXISTS beliefs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id           UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  belief_statement  TEXT NOT NULL,
  confidence_score  FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  category          TEXT CHECK (category IN ('fact', 'assumption', 'hypothesis', 'opinion')),
  topic_tag         TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Belief Shifts ──────────────────────────────────────────
-- Detected changes between beliefs over time.
CREATE TABLE IF NOT EXISTS belief_shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  old_belief_id     UUID NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
  new_belief_id     UUID NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
  shift_type        TEXT CHECK (shift_type IN ('reinforcement', 'refinement', 'contradiction', 'evolution')),
  insight_summary   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beliefs_node     ON beliefs(node_id);
CREATE INDEX IF NOT EXISTS idx_beliefs_topic    ON beliefs(topic_tag);
CREATE INDEX IF NOT EXISTS idx_beliefs_created  ON beliefs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_type      ON belief_shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_shifts_created   ON belief_shifts(created_at DESC);

-- ─── Node Notes ─────────────────────────────────────────────
-- Rich text notes attached to knowledge nodes, with image support.
CREATE TABLE IF NOT EXISTS node_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id      UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  content      TEXT NOT NULL,
  images       JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_node       ON node_notes(node_id);
CREATE INDEX IF NOT EXISTS idx_notes_user       ON node_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created    ON node_notes(created_at DESC);
