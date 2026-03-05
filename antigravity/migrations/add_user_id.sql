-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add user_id column to all tables for per-user data isolation
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add user_id to knowledge_nodes
ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Add user_id to connection_edges
ALTER TABLE connection_edges ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 3. Add user_id to user_goals
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 4. Add user_id to beliefs
ALTER TABLE beliefs ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 5. Add user_id to belief_shifts
ALTER TABLE belief_shifts ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 6. Create indexes for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user_id ON knowledge_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_edges_user_id ON connection_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_beliefs_user_id ON beliefs(user_id);
CREATE INDEX IF NOT EXISTS idx_belief_shifts_user_id ON belief_shifts(user_id);

-- 7. (Optional) Delete existing test data so it doesn't linger
-- Uncomment these lines if you want to wipe the test data:
-- DELETE FROM belief_shifts;
-- DELETE FROM beliefs;
-- DELETE FROM connection_edges;
-- DELETE FROM knowledge_nodes;
-- DELETE FROM user_goals;
