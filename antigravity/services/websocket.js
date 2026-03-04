// ─── WebSocket Service ──────────────────────────────────────────────────────
// Real-time nervous system of Antigravity.
// Broadcasts events to all connected frontend clients.

import { WebSocketServer } from 'ws';

let wss = null;

/**
 * Initialize the WebSocket server on the same HTTP server.
 * @param {import('http').Server} server - The HTTP server instance
 * @returns {WebSocketServer}
 */
export function initWebSocket(server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log(`⚡ WebSocket client connected [${clientIp}]`);

        // Send welcome message
        ws.send(JSON.stringify({
            event: 'connected',
            data: {
                message: 'Antigravity online — your second brain is listening.',
                timestamp: new Date().toISOString(),
            },
        }));

        ws.on('close', () => {
            console.log(`⚡ WebSocket client disconnected [${clientIp}]`);
        });

        ws.on('error', (err) => {
            console.error('⚡ WebSocket error:', err.message);
        });
    });

    console.log('⚡ WebSocket server initialized on /ws');
    return wss;
}

/**
 * Broadcast an event to ALL connected WebSocket clients.
 * @param {string} event - The event name (e.g., 'node.created', 'feynman.ready')
 * @param {object} data - The event payload
 */
export function broadcast(event, data) {
    if (!wss) {
        console.warn('⚡ WebSocket not initialized — cannot broadcast');
        return;
    }

    const message = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
    });

    let clientCount = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
            clientCount++;
        }
    });

    if (clientCount > 0) {
        console.log(`⚡ Broadcast [${event}] → ${clientCount} client(s)`);
    }
}

/**
 * Get the count of currently connected clients.
 * @returns {number}
 */
export function getClientCount() {
    if (!wss) return 0;
    let count = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === 1) count++;
    });
    return count;
}
