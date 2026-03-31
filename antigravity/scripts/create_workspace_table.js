// Quick script to create the workspace_notes table
// Run: node scripts/create_workspace_table.js

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Try creating via the PostgREST RPC endpoint
// This requires an exec_sql function to exist... which likely doesn't.
// Fallback: directly test if the table exists by inserting and then deleting.

async function main() {
    console.log('Checking workspace_notes table...');
    
    // Test if table exists
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/workspace_notes?select=id&limit=1`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });
    
    if (checkRes.ok) {
        console.log('✅ workspace_notes table already exists!');
        return;
    }
    
    console.log(`Table check returned ${checkRes.status}: ${await checkRes.text()}`);
    console.log('');
    console.log('❌ The workspace_notes table does NOT exist.');
    console.log('');
    console.log('You need to run this SQL in your Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/pyayaoxxxlikazgavrqx/sql/new');
    console.log('');
    console.log('--- COPY BELOW ---');
    console.log(`
CREATE TABLE IF NOT EXISTS workspace_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT 'Untitled',
  content      TEXT NOT NULL DEFAULT '',
  images       JSONB DEFAULT '[]',
  voice_urls   JSONB DEFAULT '[]',
  is_pinned    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_user ON workspace_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_updated ON workspace_notes(updated_at DESC);

ALTER TABLE workspace_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workspace notes" ON workspace_notes
  FOR ALL USING (true) WITH CHECK (true);
    `);
    console.log('--- END ---');
}

main().catch(console.error);
