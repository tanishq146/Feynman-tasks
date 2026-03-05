// ─── Environment Configuration ──────────────────────────────────────────────
// Single source of truth for all environment variables.

import dotenv from 'dotenv';
dotenv.config();

// Helper: clean env vars (strip quotes, newlines, whitespace)
const clean = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined;

export const config = {
  // Supabase
  SUPABASE_URL: clean(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY: clean(process.env.SUPABASE_ANON_KEY),

  // Groq (Llama 3.3 70B)
  GROQ_API_KEY: clean(process.env.GROQ_API_KEY),

  // Server
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: (process.env.NODE_ENV || 'development').trim(),
};

// Validate critical env vars on startup
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GROQ_API_KEY'];
for (const key of required) {
  if (!config[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error(`   Copy .env.example → .env and fill in your values.`);
    process.exit(1);
  }
}
