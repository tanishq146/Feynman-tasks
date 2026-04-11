// ─── Groq AI Client ─────────────────────────────────────────────────────────
// The intelligence layer — powers classification, connections, and Feynman analysis.
// Uses Groq with Llama 3.3 70B (blazing fast, generous free tier).
// Includes rate-limit resilience with automatic retry + fallback model.

import Groq from 'groq-sdk';
import { config } from '../config/env.js';

export const groq = new Groq({
    apiKey: config.GROQ_API_KEY,
});

// Primary model (high quality) and fallback (faster, cheaper)
export const GROQ_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

// Track if we're currently rate-limited to skip retries across calls
let rateLimitedUntil = 0;

/**
 * Resilient Groq completion with automatic retry on 429.
 * Falls back to a smaller model if the primary is rate-limited.
 * @param {object} params - Same params as groq.chat.completions.create
 * @param {object} opts - { maxRetries: 2, retryDelayMs: 1000 }
 * @returns {object} Groq chat completion response
 */
export async function groqComplete(params, opts = {}) {
    const { maxRetries = 1, retryDelayMs = 1500 } = opts;

    // If we know we're rate-limited, immediately use fallback
    if (Date.now() < rateLimitedUntil) {
        return groq.chat.completions.create({
            ...params,
            model: GROQ_FALLBACK_MODEL,
        });
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await groq.chat.completions.create(params);
        } catch (err) {
            const isRateLimit = err?.status === 429 || err?.error?.code === 'rate_limit_exceeded';
            if (!isRateLimit) throw err;

            // Parse retry-after from error message
            const retryMatch = err?.error?.message?.match(/(\d+)m([\d.]+)s/);
            if (retryMatch) {
                const waitMs = (parseInt(retryMatch[1]) * 60 + parseFloat(retryMatch[2])) * 1000;
                rateLimitedUntil = Date.now() + waitMs;
            } else {
                rateLimitedUntil = Date.now() + 60000; // Default 1 min cooldown
            }

            if (attempt < maxRetries) {
                console.warn(`🔄 Groq rate limited, retrying with fallback model in ${retryDelayMs}ms...`);
                await new Promise(r => setTimeout(r, retryDelayMs));
            }

            // Fall back to smaller model
            try {
                return await groq.chat.completions.create({
                    ...params,
                    model: GROQ_FALLBACK_MODEL,
                });
            } catch (fallbackErr) {
                if (attempt === maxRetries) throw fallbackErr;
            }
        }
    }
}
