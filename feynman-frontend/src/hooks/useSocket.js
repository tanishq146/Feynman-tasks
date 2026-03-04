import { useEffect, useRef, useCallback } from 'react';
import useBrainStore from '../store/brainStore';

const WS_URL = import.meta.env.VITE_API_URL
    ? `wss://${import.meta.env.VITE_API_URL.replace('https://', '')}/ws`
    : `ws://${window.location.hostname}:3001/ws`;

export function useSocket() {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const {
        addNode,
        updateNode,
        addEdge,
        addToast,
    } = useBrainStore();

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('⚡ WebSocket connected to Antigravity');
        };

        ws.onmessage = (event) => {
            try {
                const { event: eventName, data } = JSON.parse(event.data);

                switch (eventName) {
                    case 'connected':
                        console.log('🧠', data.message);
                        break;

                    case 'node.created': {
                        const node = data;
                        addNode(node);
                        addToast({
                            type: 'success',
                            icon: '✦',
                            message: `New knowledge: "${node.title}"`,
                            duration: 4000,
                        });
                        break;
                    }

                    case 'feynman.ready': {
                        const { node_id, feynman } = data;
                        updateNode(node_id, { feynman });
                        addToast({
                            type: 'info',
                            icon: '✦',
                            message: 'Feynman analysis ready',
                            duration: 4000,
                        });
                        break;
                    }

                    case 'connection.formed': {
                        addEdge(data);
                        addToast({
                            type: 'connection',
                            icon: '🔗',
                            message: `Connected: ${data.source_title} → ${data.target_title}`,
                            duration: 4000,
                        });
                        break;
                    }

                    case 'node.fading': {
                        const { node_id, strength } = data;
                        updateNode(node_id, {
                            current_strength: strength,
                            status: 'fading',
                        });
                        addToast({
                            type: 'warning',
                            icon: '⏳',
                            message: 'A memory is fading...',
                            duration: 5000,
                        });
                        break;
                    }

                    case 'node.critical': {
                        const { node_id, strength } = data;
                        updateNode(node_id, {
                            current_strength: strength,
                            status: 'critical',
                        });
                        addToast({
                            type: 'danger',
                            icon: '⚠',
                            message: 'Review this before it\'s gone',
                            duration: 6000,
                        });
                        break;
                    }

                    case 'node.reviewed': {
                        updateNode(data.id, {
                            current_strength: data.current_strength,
                            status: data.status,
                            last_reviewed_at: data.last_reviewed_at,
                            decay_rate: data.decay_rate,
                        });
                        break;
                    }

                    default:
                        console.log('Unknown WS event:', eventName, data);
                }
            } catch (err) {
                console.error('WebSocket message parse error:', err);
            }
        };

        ws.onclose = () => {
            console.log('⚡ WebSocket disconnected — reconnecting in 3s...');
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            ws.close();
        };
    }, [addNode, updateNode, addEdge, addToast]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return wsRef;
}
