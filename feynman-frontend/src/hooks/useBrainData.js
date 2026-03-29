import { useEffect } from 'react';
import api from '../lib/api';
import useBrainStore from '../store/brainStore';

export function useBrainData() {
    const { setBrainData, setLoading, setError } = useBrainStore();

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/api/brain/map');
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

export async function ingestKnowledge(content, brain_region) {
    const body = { content };
    if (brain_region) body.brain_region = brain_region;
    const res = await api.post('/api/knowledge/ingest', body);
    return res.data;
}

export async function reviewNode(nodeId) {
    const res = await api.post(`/api/knowledge/${nodeId}/review`);
    return res.data;
}

export async function getNodeDetails(nodeId) {
    const res = await api.get(`/api/knowledge/${nodeId}`);
    return res.data;
}

export async function getNodeConnections(nodeId) {
    const res = await api.get(`/api/knowledge/${nodeId}/connections`);
    return res.data;
}

export async function getFadingNodes() {
    const res = await api.get('/api/knowledge/fading');
    return res.data;
}

export async function deleteNode(nodeId) {
    const res = await api.delete(`/api/knowledge/${nodeId}`);
    return res.data;
}

export async function toggleCrucial(nodeId) {
    const res = await api.patch(`/api/knowledge/${nodeId}/crucial`);
    return res.data;
}

export async function updateNodeContent(nodeId, content) {
    const res = await api.put(`/api/knowledge/${nodeId}`, { content });
    return res.data;
}

export async function exportVault() {
    const res = await api.get('/api/knowledge/export');
    return res.data;
}

// ─── Feynman Features API ───────────────────────────────────────────────────

export async function fetchFeynmanExtras(nodeId) {
    const res = await api.post(`/api/ai/feynman/${nodeId}/extras`);
    return res.data;
}

export async function gradeChallenge(nodeId, answer) {
    const res = await api.post(`/api/ai/feynman/${nodeId}/challenge`, { answer });
    return res.data;
}

export async function gradeTeach(nodeId, explanation) {
    const res = await api.post(`/api/ai/feynman/${nodeId}/teach`, { explanation });
    return res.data;
}

export async function generateMoment(nodeId) {
    const res = await api.post(`/api/ai/feynman/${nodeId}/moment`);
    return res.data;
}

export async function fillKnowledgeGap(content) {
    const res = await api.post('/api/knowledge/ingest', { content });
    return res.data;
}

// ─── Study Mode API ────────────────────────────────────────────────────────

export async function fetchFadingNodes() {
    const res = await api.get('/api/study/fading');
    return res.data;
}

export async function generateStudyQuestions(nodeIds, count = 5) {
    const res = await api.post('/api/study/generate-questions', { nodeIds, count });
    return res.data;
}

export async function gradeStudyAnswer({ nodeId, question, userAnswer, keyConcepts, idealPoints, difficulty }) {
    const res = await api.post('/api/study/grade-answer', {
        nodeId, question, userAnswer, keyConcepts, idealPoints, difficulty,
    });
    return res.data;
}

export async function getSessionSummary(results) {
    const res = await api.post('/api/study/session-summary', { results });
    return res.data;
}
