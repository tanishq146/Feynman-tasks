-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Change user_id columns from UUID to TEXT
-- Reason: Firebase UIDs are strings (e.g., "abc123xyz"), not UUIDs.
--         The UUID type rejects these with "invalid input syntax for type uuid".
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. agent_states
ALTER TABLE agent_states ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 2. agent_memory
ALTER TABLE agent_memory ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 3. simulation_history
ALTER TABLE simulation_history ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 4. journal_entries
ALTER TABLE journal_entries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 5. mind_nodes
ALTER TABLE mind_nodes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 6. mind_edges
ALTER TABLE mind_edges ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 7. node_journal_map (may not have user_id, check first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'node_journal_map' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'ALTER TABLE node_journal_map ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
  END IF;
END $$;

-- 8. mirror_reports
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mirror_reports' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'ALTER TABLE mirror_reports ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
  END IF;
END $$;

-- 9. node_snapshots
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'node_snapshots' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'ALTER TABLE node_snapshots ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT';
  END IF;
END $$;
