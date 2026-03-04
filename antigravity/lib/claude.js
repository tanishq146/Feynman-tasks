// ─── Claude AI Client ───────────────────────────────────────────────────────
// The intelligence layer — powers classification, connections, and Feynman analysis.

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env.js';

export const anthropic = new Anthropic({
    apiKey: config.ANTHROPIC_API_KEY,
});
