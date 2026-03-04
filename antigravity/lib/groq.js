// ─── Groq AI Client ─────────────────────────────────────────────────────────
// The intelligence layer — powers classification, connections, and Feynman analysis.
// Uses Groq with Llama 3.3 70B (blazing fast, generous free tier).

import Groq from 'groq-sdk';
import { config } from '../config/env.js';

export const groq = new Groq({
    apiKey: config.GROQ_API_KEY,
});

export const GROQ_MODEL = 'llama-3.3-70b-versatile';
