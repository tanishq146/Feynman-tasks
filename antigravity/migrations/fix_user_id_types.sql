-- ═══════════════════════════════════════════════════════════════════════════
-- Fix user_id column types: UUID → TEXT
-- Firebase UIDs are NOT UUIDs (e.g. "Zz4QKVIGgWeKCykFtH4J00m411j2").
-- Phase 4 + Phase 5 tables incorrectly used UUID type.
-- Run this in Supabase Dashboard → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Phase 4: agent_states ───────────────────────────────────────────────────
ALTER TABLE agent_states ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ─── Phase 4: agent_memory ───────────────────────────────────────────────────
ALTER TABLE agent_memory ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ─── Phase 4: simulation_history ─────────────────────────────────────────────
ALTER TABLE simulation_history ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ─── Phase 5: mirror_reports ─────────────────────────────────────────────────
ALTER TABLE mirror_reports ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ─── Phase 5: node_snapshots ─────────────────────────────────────────────────
ALTER TABLE node_snapshots ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Done! All user_id columns are now TEXT, compatible with Firebase UIDs.
