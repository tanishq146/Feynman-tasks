import { useEffect } from 'react';
import axios from 'axios';
import useBrainStore from '../store/brainStore';

const API = 'http://localhost:3001';

export function useBrainData() {
    const { setBrainData, setLoading, setError } = useBrainStore();

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API}/api/brain/map`);
                if (!cancelled) {
                    setBrainData(data.nodes || [], data.edges || []);
                }
            } catch (err) {
                console.error('Failed to fetch brain map:', err);
                if (!cancelled) {
                    setError(err.message);
                    setBrainData([], []);
                }
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [setBrainData, setLoading, setError]);
}

export async function ingestKnowledge(content) {
    const res = await axios.post(`${API}/api/knowledge/ingest`, { content });
    return res.data;
}

export async function reviewNode(nodeId) {
    const res = await axios.post(`${API}/api/knowledge/${nodeId}/review`);
    return res.data;
}

export async function getNodeDetails(nodeId) {
    const res = await axios.get(`${API}/api/knowledge/${nodeId}`);
    return res.data;
}

export async function getNodeConnections(nodeId) {
    const res = await axios.get(`${API}/api/knowledge/${nodeId}/connections`);
    return res.data;
}

export async function getFadingNodes() {
    const res = await axios.get(`${API}/api/knowledge/fading`);
    return res.data;
}

export async function deleteNode(nodeId) {
    const res = await axios.delete(`${API}/api/knowledge/${nodeId}`);
    return res.data;
}

// ─── Feynman Features API ───────────────────────────────────────────────────

export async function fetchFeynmanExtras(nodeId) {
    const res = await axios.post(`${API}/api/ai/feynman/${nodeId}/extras`);
    return res.data;
}

export async function gradeChallenge(nodeId, answer) {
    const res = await axios.post(`${API}/api/ai/feynman/${nodeId}/challenge`, { answer });
    return res.data;
}

export async function gradeTeach(nodeId, explanation) {
    const res = await axios.post(`${API}/api/ai/feynman/${nodeId}/teach`, { explanation });
    return res.data;
}

export async function generateMoment(nodeId) {
    const res = await axios.post(`${API}/api/ai/feynman/${nodeId}/moment`);
    return res.data;
}

export async function fillKnowledgeGap(content) {
    const res = await axios.post(`${API}/api/knowledge/ingest`, { content });
    return res.data;
}
