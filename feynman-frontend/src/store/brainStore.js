import { create } from 'zustand';

const useBrainStore = create((set, get) => ({
    // ─── Nodes & Edges ────────────────────────────────────
    nodes: [],
    edges: [],
    loading: true,
    error: null,

    // ─── UI State ─────────────────────────────────────────
    selectedNodeId: null,
    selectedNode: null,
    hoveredNodeId: null,
    isFeynmanPanelOpen: false,
    highlightFading: false,
    isIngesting: false,
    isDraggingNode: false,

    // ─── Connection Thread Panel ──────────────────────
    selectedEdge: null,
    isConnectionPanelOpen: false,

    // ─── Node Dive (double-click to enter) ────────────
    diveNode: null,
    isDiving: false,

    // ─── Toasts ───────────────────────────────────────────
    toasts: [],

    // ─── Actions ──────────────────────────────────────────
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setBrainData: (nodes, edges) => set({ nodes, edges, loading: false }),

    setIngesting: (isIngesting) => set({ isIngesting }),

    setDraggingNode: (isDraggingNode) => set({ isDraggingNode }),

    selectNode: (nodeId) => {
        const { nodes } = get();
        const node = nodes.find((n) => n.id === nodeId) || null;
        set({
            selectedNodeId: nodeId,
            selectedNode: node,
            isFeynmanPanelOpen: !!node,
        });
    },

    clearSelection: () =>
        set({
            selectedNodeId: null,
            selectedNode: null,
            isFeynmanPanelOpen: false,
        }),

    setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

    selectEdge: (edge) => {
        set({
            selectedEdge: edge,
            isConnectionPanelOpen: !!edge,
            // Close node panel when opening edge panel
            selectedNodeId: null,
            selectedNode: null,
            isFeynmanPanelOpen: false,
        });
    },

    clearEdge: () =>
        set({
            selectedEdge: null,
            isConnectionPanelOpen: false,
        }),

    startDive: (node) => {
        set({
            diveNode: node,
            isDiving: true,
            // Close everything else
            selectedNodeId: null,
            selectedNode: null,
            isFeynmanPanelOpen: false,
            selectedEdge: null,
            isConnectionPanelOpen: false,
        });
    },

    exitDive: () =>
        set({
            diveNode: null,
            isDiving: false,
        }),

    toggleHighlightFading: () =>
        set((s) => ({ highlightFading: !s.highlightFading })),

    // ─── Node Mutations ────────────────────────────────────
    addNode: (node) =>
        set((state) => ({
            nodes: [
                ...state.nodes,
                {
                    id: node.id,
                    title: node.title,
                    summary: node.summary,
                    brain_region: node.brain_region,
                    topic_category: node.topic_category,
                    coordinates: node.coordinates || {
                        x: node.coord_x,
                        y: node.coord_y,
                        z: node.coord_z,
                    },
                    current_strength: node.current_strength,
                    status: node.status,
                    tags: node.tags,
                    created_at: node.created_at,
                    feynman: node.feynman || null,
                    raw_content: node.raw_content,
                    decay_rate: node.decay_rate,
                    last_reviewed_at: node.last_reviewed_at,
                },
            ],
        })),

    updateNode: (nodeId, updates) =>
        set((state) => {
            const nodes = state.nodes.map((n) =>
                n.id === nodeId ? { ...n, ...updates } : n
            );
            const selectedNode =
                state.selectedNodeId === nodeId
                    ? { ...state.selectedNode, ...updates }
                    : state.selectedNode;
            return { nodes, selectedNode };
        }),

    removeNode: (nodeId) =>
        set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== nodeId),
            edges: state.edges.filter(
                (e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId
            ),
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            selectedNode: state.selectedNodeId === nodeId ? null : state.selectedNode,
            isFeynmanPanelOpen:
                state.selectedNodeId === nodeId ? false : state.isFeynmanPanelOpen,
        })),

    addEdge: (edge) =>
        set((state) => ({
            edges: [...state.edges, edge],
        })),

    // ─── Toast System ──────────────────────────────────────
    addToast: (toast) => {
        const id = Date.now() + Math.random();
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));
        // Auto-dismiss
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, toast.duration || 4000);
    },

    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),

    // ─── Derived Data ──────────────────────────────────────
    getFadingNodes: () => {
        const { nodes } = get();
        return nodes.filter((n) => n.status === 'fading' || n.status === 'critical');
    },

    getNodeById: (id) => {
        const { nodes } = get();
        return nodes.find((n) => n.id === id) || null;
    },

    getConnectionsForNode: (nodeId) => {
        const { edges } = get();
        return edges.filter(
            (e) => e.source_node_id === nodeId || e.target_node_id === nodeId
        );
    },
}));

export default useBrainStore;
