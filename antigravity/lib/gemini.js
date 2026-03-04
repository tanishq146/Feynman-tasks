// ─── Gemini AI Client ───────────────────────────────────────────────────────
// The intelligence layer — powers classification, connections, and Feynman analysis.
// Uses Google Gemini 1.5 Flash (free tier).

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export const gemini = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
        responseMimeType: 'application/json',
    },
});
