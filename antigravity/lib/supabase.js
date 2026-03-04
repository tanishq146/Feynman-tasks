// ─── Supabase Client ────────────────────────────────────────────────────────
// Connects to the PostgreSQL brain that holds all knowledge.

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
