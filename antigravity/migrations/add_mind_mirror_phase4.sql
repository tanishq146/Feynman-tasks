-- ═══════════════════════════════════════════════════════════════════════════
-- Mind Mirror Phase 4: Persistent Agent Memory
-- Adds: agent_states, agent_memory, simulation_history
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─── Agent States ──────────────────────────────────────────────────────────
-- Stores the current personality prompt and dominance score for each agent.
-- Each user has exactly 6 agent_state rows (one per agent archetype).
CREATE TABLE IF NOT EXISTS agent_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    agent_name TEXT NOT NULL CHECK (agent_name IN ('critic', 'dreamer', 'avoider', 'ambitious_self', 'rationalist', 'shadow')),
    personality_prompt TEXT,
    dominance_score FLOAT DEFAULT 0.5,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, agent_name)
);


-- ─── Agent Memory ──────────────────────────────────────────────────────────
-- Memories extracted from simulations. Each agent accumulates memories
-- that persist across sessions and influence future debates.
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    agent_name TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('past_debate', 'user_contradiction', 'key_insight', 'unresolved_tension')),
    content TEXT NOT NULL,
    emotional_weight FLOAT DEFAULT 0.5,
    source_simulation_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── Simulation History ───────────────────────────────────────────────────
-- Full transcript of every simulation that has been run, including
-- auto-triggered simulations from journal entries.
CREATE TABLE IF NOT EXISTS simulation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'auto_journal', 'scheduled')),
    trigger_content TEXT,
    rounds JSONB,
    summary JSONB,
    dominant_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── Indexes ───────────────────────────────────────────────────────────────
-- Fast retrieval of top emotional memories per agent
CREATE INDEX IF NOT EXISTS idx_agent_memory_lookup
    ON agent_memory (user_id, agent_name, emotional_weight DESC);

-- Fast lookup of agent states by user
CREATE INDEX IF NOT EXISTS idx_agent_states_user
    ON agent_states (user_id);

-- Simulation history by user, newest first
CREATE INDEX IF NOT EXISTS idx_simulation_history_user
    ON simulation_history (user_id, created_at DESC);


-- ─── RLS Policies ──────────────────────────────────────────────────────────
-- We use service-role key on the backend, but add RLS for safety.
ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service key)
CREATE POLICY "Service role full access on agent_states"
    ON agent_states FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on agent_memory"
    ON agent_memory FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on simulation_history"
    ON simulation_history FOR ALL
    USING (true)
    WITH CHECK (true);
