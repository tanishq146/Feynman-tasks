-- ═══════════════════════════════════════════════════════════════════════════
-- Add 16 Emotion Constellation agents to agent_states constraint
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the old constraint that only allows 6 legacy agents
ALTER TABLE agent_states DROP CONSTRAINT IF EXISTS agent_states_agent_name_check;

-- Add new constraint allowing all 22 agents (6 legacy + 16 emotion)
ALTER TABLE agent_states ADD CONSTRAINT agent_states_agent_name_check
    CHECK (agent_name IN (
        -- Legacy 6 agents
        'critic', 'dreamer', 'avoider', 'ambitious_self', 'rationalist', 'shadow',
        -- Emotion Constellation — 16 agents
        'sentinel', 'fury', 'euphoric', 'mourner', 'believer', 'purist',
        'oracle', 'wanderer', 'phantom', 'exile', 'crown', 'mirror_agent',
        'anchor', 'torch', 'void', 'ghost'
    ));
