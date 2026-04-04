-- ╔═══════════════════════════════════════════════════════════╗
-- ║  MIND MIRROR — Database Schema                          ║
-- ║  A journaling system that maps consciousness.           ║
-- ║  Run this in your Supabase SQL Editor.                  ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Enable UUID generation (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Journal Entries ────────────────────────────────────────
-- Raw journal text. Each entry is a single stream of thought.
CREATE TABLE IF NOT EXISTS journal_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  content     TEXT NOT NULL,
  mode        TEXT NOT NULL CHECK (mode IN ('conscious', 'subconscious')),
  word_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_user       ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_mode       ON journal_entries(mode);
CREATE INDEX IF NOT EXISTS idx_journal_created    ON journal_entries(created_at DESC);

-- ─── Mind Nodes ─────────────────────────────────────────────
-- Emotional/cognitive entities extracted from journal entries.
-- Each node represents a recurring pattern in the user's psyche.
CREATE TABLE IF NOT EXISTS mind_nodes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          TEXT NOT NULL,
  label            TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN (
    'fear', 'goal', 'contradiction', 'desire',
    'recurring_thought', 'tension'
  )),
  strength         FLOAT NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_mind_nodes_user    ON mind_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_nodes_type    ON mind_nodes(type);
CREATE INDEX IF NOT EXISTS idx_mind_nodes_str     ON mind_nodes(strength DESC);

-- ─── Mind Edges ─────────────────────────────────────────────
-- Relationships between mind nodes. The internal wiring of thought.
CREATE TABLE IF NOT EXISTS mind_edges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             TEXT NOT NULL,
  source_node_id      UUID NOT NULL REFERENCES mind_nodes(id) ON DELETE CASCADE,
  target_node_id      UUID NOT NULL REFERENCES mind_nodes(id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL,
  weight              FLOAT NOT NULL DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mind_edges_user    ON mind_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_edges_src     ON mind_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_mind_edges_tgt     ON mind_edges(target_node_id);

-- ─── Node ↔ Journal Map ────────────────────────────────────
-- Links which journal entries produced which mind nodes.
CREATE TABLE IF NOT EXISTS node_journal_map (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id           UUID NOT NULL REFERENCES mind_nodes(id) ON DELETE CASCADE,
  journal_entry_id  UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_njm_node     ON node_journal_map(node_id);
CREATE INDEX IF NOT EXISTS idx_njm_journal  ON node_journal_map(journal_entry_id);

-- ─── Agent Personas ─────────────────────────────────────────
-- Internal voices that respond to journal entries.
-- Phase 2 will assign agents to react to entries with commentary.
CREATE TABLE IF NOT EXISTS agent_personas (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        TEXT NOT NULL,
  name           TEXT NOT NULL,
  archetype      TEXT NOT NULL CHECK (archetype IN (
    'self_critic', 'optimist', 'procrastinator',
    'protector', 'dreamer'
  )),
  trait_summary   TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user  ON agent_personas(user_id);
