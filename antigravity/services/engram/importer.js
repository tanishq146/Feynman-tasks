// ─── Engram Chat Importer ───────────────────────────────────────────────────
// Parses export files from Claude, ChatGPT, and Gemini.
// Converts their native formats into normalized conversation objects
// ready for Engram's extraction pipeline.
//
// Supported formats:
//   - Claude: ZIP containing conversations.json (array of conversation objects)
//   - ChatGPT: ZIP containing conversations.json (tree-structured mapping)
//   - Gemini: Google Takeout HTML files
//   - Raw JSON: Direct conversations.json from any platform

import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';


/**
 * Detect which AI platform generated the export file.
 * Returns 'claude' | 'chatgpt' | 'gemini' | 'unknown'
 */
function detectPlatform(data) {
    if (!data || !Array.isArray(data)) return 'unknown';

    const sample = data[0];
    if (!sample) return 'unknown';

    // Claude: has chat_messages array with sender field
    if (sample.chat_messages && Array.isArray(sample.chat_messages)) {
        return 'claude';
    }

    // ChatGPT: has mapping object with tree structure
    if (sample.mapping && typeof sample.mapping === 'object') {
        return 'chatgpt';
    }

    // Gemini: has parts array at conversation level
    if (sample.parts || sample.textContent) {
        return 'gemini';
    }

    return 'unknown';
}


/**
 * Parse Claude export format.
 * Claude exports: [{ uuid, name, chat_messages: [{ text, sender, created_at }] }]
 */
function parseClaude(data) {
    return data
        .filter(conv => conv.chat_messages && conv.chat_messages.length > 0)
        .map(conv => {
            const messages = conv.chat_messages
                .filter(m => m.text && m.text.trim())
                .map(m => ({
                    role: m.sender === 'human' ? 'user' : 'assistant',
                    content: m.text.trim(),
                }));

            // Build raw conversation text
            const rawText = messages
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n\n');

            return {
                title: conv.name || 'Untitled Conversation',
                source: 'claude',
                created_at: conv.created_at || new Date().toISOString(),
                message_count: messages.length,
                raw_text: rawText,
                preview: rawText.substring(0, 200),
            };
        })
        .filter(c => c.raw_text.length > 50); // Filter out tiny conversations
}


/**
 * Parse ChatGPT export format.
 * ChatGPT exports: [{ title, mapping: { id: { message: { author, content } } } }]
 * The mapping is a tree — we need to traverse parent→children to get linear order.
 */
function parseChatGPT(data) {
    return data
        .filter(conv => conv.mapping && Object.keys(conv.mapping).length > 0)
        .map(conv => {
            // Find root node (parent is null)
            const nodes = conv.mapping;
            let rootId = null;
            for (const [id, node] of Object.entries(nodes)) {
                if (!node.parent) {
                    rootId = id;
                    break;
                }
            }

            // Traverse tree to get linear messages
            const messages = [];
            let currentId = rootId;
            const visited = new Set();

            while (currentId && !visited.has(currentId)) {
                visited.add(currentId);
                const node = nodes[currentId];
                if (!node) break;

                if (node.message) {
                    const msg = node.message;
                    const role = msg.author?.role;
                    const parts = msg.content?.parts || [];
                    const text = parts
                        .filter(p => typeof p === 'string')
                        .join('\n')
                        .trim();

                    if (text && (role === 'user' || role === 'assistant')) {
                        messages.push({
                            role: role,
                            content: text,
                        });
                    }
                }

                // Follow first child (main conversation branch)
                const children = node.children || [];
                currentId = children[children.length - 1] || null; // Take last child (most recent edit)
            }

            const rawText = messages
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n\n');

            return {
                title: conv.title || 'Untitled Conversation',
                source: 'chatgpt',
                created_at: conv.create_time
                    ? new Date(conv.create_time * 1000).toISOString()
                    : new Date().toISOString(),
                message_count: messages.length,
                raw_text: rawText,
                preview: rawText.substring(0, 200),
            };
        })
        .filter(c => c.raw_text.length > 50);
}


/**
 * Parse a generic/unknown JSON format.
 * Tries to be flexible with common conversation JSON shapes.
 */
function parseGeneric(data) {
    return data
        .filter(conv => {
            // Must have some text content
            const hasMessages = conv.messages || conv.chat_messages || conv.turns;
            const hasText = conv.text || conv.content || conv.raw_text;
            return hasMessages || hasText;
        })
        .map(conv => {
            let rawText = '';
            const title = conv.title || conv.name || 'Untitled';

            if (conv.messages && Array.isArray(conv.messages)) {
                rawText = conv.messages
                    .filter(m => m.content || m.text)
                    .map(m => {
                        const role = m.role === 'user' || m.sender === 'human' ? 'User' : 'Assistant';
                        return `${role}: ${m.content || m.text}`;
                    })
                    .join('\n\n');
            } else if (conv.text) {
                rawText = conv.text;
            } else if (conv.content) {
                rawText = typeof conv.content === 'string' ? conv.content : JSON.stringify(conv.content);
            }

            return {
                title,
                source: 'other',
                created_at: conv.created_at || conv.create_time || new Date().toISOString(),
                message_count: (conv.messages || []).length,
                raw_text: rawText,
                preview: rawText.substring(0, 200),
            };
        })
        .filter(c => c.raw_text.length > 50);
}


/**
 * Main import function — takes raw file content and returns normalized conversations.
 * @param {Buffer|string} fileContent - The raw file content (JSON string or Buffer)
 * @param {string} forcePlatform - Optional: force a specific platform parser
 * @returns {{ conversations: Array, platform: string, total: number }}
 */
export function parseExportFile(fileContent, forcePlatform = null) {
    let jsonStr = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');

    // Try to parse JSON
    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (err) {
        throw new Error('Invalid JSON file. Please upload a valid conversations.json file.');
    }

    // Ensure it's an array
    if (!Array.isArray(data)) {
        // Some exports wrap in an object
        if (data.conversations) data = data.conversations;
        else if (data.chats) data = data.chats;
        else if (data.data) data = data.data;
        else throw new Error('Could not find conversation array in the file.');
    }

    // Detect platform
    const platform = forcePlatform || detectPlatform(data);

    let conversations;
    switch (platform) {
        case 'claude':
            conversations = parseClaude(data);
            break;
        case 'chatgpt':
            conversations = parseChatGPT(data);
            break;
        default:
            conversations = parseGeneric(data);
    }

    // Sort by created_at (newest first)
    conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
        conversations,
        platform,
        total: conversations.length,
    };
}
