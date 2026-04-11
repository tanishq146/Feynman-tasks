// Quick script to run Delphi migration via Supabase REST API
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const clean = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined;
const url = clean(process.env.SUPABASE_URL);
const key = clean(process.env.SUPABASE_ANON_KEY);

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    console.log('Creating delphi_agents table...');
    const { error: e1 } = await supabase.rpc('exec_sql', {
        query: `
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
        `
    });

    if (e1) {
        console.log('RPC not available, trying direct table creation via insert test...');
        // Tables might already exist or need to be created via Supabase dashboard
        // Let's test if they exist by trying a select
        const { error: selectErr1 } = await supabase.from('delphi_agents').select('id').limit(1);
        if (selectErr1) {
            console.error('❌ delphi_agents table does not exist. Error:', selectErr1.message);
            console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n');
            console.log(`
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

CREATE INDEX IF NOT EXISTS idx_delphi_agents_user ON delphi_agents(user_id);

CREATE TABLE IF NOT EXISTS delphi_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    scenario TEXT NOT NULL,
    agent_ids UUID[],
    rounds JSONB DEFAULT '[]',
    insights JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delphi_simulations_user ON delphi_simulations(user_id);

ALTER TABLE delphi_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE delphi_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delphi_agents_all" ON delphi_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "delphi_simulations_all" ON delphi_simulations FOR ALL USING (true) WITH CHECK (true);
            `);
            return;
        } else {
            console.log('✅ delphi_agents table already exists');
        }

        const { error: selectErr2 } = await supabase.from('delphi_simulations').select('id').limit(1);
        if (selectErr2) {
            console.error('❌ delphi_simulations table does not exist. Error:', selectErr2.message);
        } else {
            console.log('✅ delphi_simulations table already exists');
        }
    } else {
        console.log('✅ Tables created via RPC');
    }

    console.log('\nDone!');
}

run().catch(console.error);
