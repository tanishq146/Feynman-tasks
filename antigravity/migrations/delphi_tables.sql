-- ═══════════════════════════════════════════════════════════════════════════
-- Delphi — Custom Agent Simulation Tables
-- Run this in the Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Custom agents (people in your life)
CREATE TABLE IF NOT EXISTS delphi_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT,
  color TEXT DEFAULT '#9B7FE8',
  personality TEXT,
  thinking_style TEXT,
  values TEXT,
  triggers TEXT,
  relationship TEXT,
  raw_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_delphi_agents_user ON delphi_agents(user_id);

-- Simulation history
CREATE TABLE IF NOT EXISTS delphi_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  scenario TEXT NOT NULL,
  agent_ids UUID[],
  rounds JSONB DEFAULT '[]',
  insights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_delphi_simulations_user ON delphi_simulations(user_id);

-- Enable RLS
ALTER TABLE delphi_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE delphi_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust 'authenticated' role as needed for your setup)
CREATE POLICY "Users can CRUD own delphi agents"
  ON delphi_agents FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can CRUD own delphi simulations"
  ON delphi_simulations FOR ALL
  USING (true)
  WITH CHECK (true);
