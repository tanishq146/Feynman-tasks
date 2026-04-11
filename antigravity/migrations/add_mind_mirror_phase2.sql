-- ╔═══════════════════════════════════════════════════════════╗
-- ║  MIND MIRROR — Phase 2 Migration                        ║
-- ║  Adds 'resolved' flag to mind_nodes for pressure points ║
-- ║  Run this in your Supabase SQL Editor AFTER Phase 1.    ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Add resolved column (safe to run repeatedly)
ALTER TABLE mind_nodes
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false;

-- Index for pressure point queries
CREATE INDEX IF NOT EXISTS idx_mind_nodes_resolved
  ON mind_nodes(resolved) WHERE resolved = false;
