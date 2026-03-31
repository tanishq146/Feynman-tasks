// ═══════════════════════════════════════════════════════════════════════════
// NotesPanel — Rich notes for knowledge nodes with image upload + AI suggestions
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import api from '../../lib/api';

// ─── Styles ─────────────────────────────────────────────────────────────────

const panelStyle = {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '460px',
    maxWidth: '100vw',
    background: 'rgba(8, 8, 20, 0.96)',
    borderLeft: '1px solid rgba(139, 92, 246, 0.12)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    zIndex: 250,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    color: '#e8f4fd',
    overflow: 'hidden',
};

const headerStyle = {
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    flexShrink: 0,
};

const scrollStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
};

const composerStyle = {
    padding: '16px 24px 20px',
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
    flexShrink: 0,
};

// ─── Individual Note Card ───────────────────────────────────────────────────

function NoteCard({ note, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = note.content.length > 200;
    const displayContent = isLong && !expanded ? note.content.slice(0, 200) + '...' : note.content;

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            style={{
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '10px',
            }}
        >
            {/* Note content */}
            <div style={{
                fontSize: '13.5px',
                lineHeight: '1.65',
                color: 'rgba(232, 244, 253, 0.9)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {displayContent}
            </div>

            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#8b5cf6',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '4px 0 0',
                        letterSpacing: '0.5px',
                    }}
                >
                    {expanded ? '▲ Show less' : '▼ Read more'}
                </button>
            )}

            {/* Images */}
            {note.images && note.images.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {note.images.map((img, i) => (
                        <img
                            key={i}
                            src={img}
                            alt={`Note attachment ${i + 1}`}
                            style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid rgba(139, 92, 246, 0.15)',
                                cursor: 'pointer',
                            }}
                            onClick={() => window.open(img, '_blank')}
                        />
                    ))}
                </div>
            )}

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(139, 92, 246, 0.06)',
            }}>
                <span style={{ fontSize: '10px', color: 'rgba(232, 244, 253, 0.3)', letterSpacing: '0.5px' }}>
                    {timeAgo(note.created_at)}
                </span>
                <button
                    onClick={() => onDelete(note.id)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(244, 63, 94, 0.5)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.target.style.color = '#f43f5e'; e.target.style.background = 'rgba(244, 63, 94, 0.1)'; }}
                    onMouseLeave={(e) => { e.target.style.color = 'rgba(244, 63, 94, 0.5)'; e.target.style.background = 'none'; }}
                >
                    Delete
                </button>
            </div>
        </motion.div>
    );
}

// ─── AI Suggestion Card ─────────────────────────────────────────────────────

function SuggestionCard({ suggestion, onApprove, onDismiss, approving }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(6, 182, 212, 0.08))',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '8px',
            }}
        >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', marginBottom: '4px' }}>
                {suggestion.title}
            </div>
            <div style={{ fontSize: '11.5px', lineHeight: '1.55', color: 'rgba(232, 244, 253, 0.6)', marginBottom: '10px' }}>
                {suggestion.content}
            </div>
            <div style={{
                display: 'flex', gap: '8px',
                fontSize: '10px', letterSpacing: '0.5px',
            }}>
                <span style={{
                    padding: '3px 8px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    borderRadius: '6px',
                    color: '#a78bfa',
                }}>
                    {suggestion.category}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                    onClick={() => onApprove(suggestion)}
                    disabled={approving}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: approving
                            ? 'rgba(139, 92, 246, 0.15)'
                            : 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: approving ? 'wait' : 'pointer',
                        letterSpacing: '0.5px',
                        transition: 'all 0.2s',
                    }}
                >
                    {approving ? 'Creating...' : '✦ Add to Brain'}
                </button>
                <button
                    onClick={() => onDismiss(suggestion)}
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(244, 63, 94, 0.08)',
                        border: '1px solid rgba(244, 63, 94, 0.15)',
                        borderRadius: '8px',
                        color: 'rgba(244, 63, 94, 0.7)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    Skip
                </button>
            </div>
        </motion.div>
    );
}

// ─── Main Notes Panel ───────────────────────────────────────────────────────

export default function NotesPanel() {
    const isOpen = useBrainStore((s) => s.isNotesPanelOpen);
    const nodeId = useBrainStore((s) => s.notesPanelNodeId);
    const closePanel = useBrainStore((s) => s.closeNotesPanel);
    const getNodeById = useBrainStore((s) => s.getNodeById);

    const [notes, setNotes] = useState([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    // AI Suggestions
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [approvingId, setApprovingId] = useState(null);

    const textareaRef = useRef(null);

    const node = nodeId ? getNodeById(nodeId) : null;

    // Fetch notes when panel opens
    useEffect(() => {
        if (!isOpen || !nodeId) {
            setNotes([]);
            setSuggestions([]);
            return;
        }
        fetchNotes();
    }, [isOpen, nodeId]);

    const fetchNotes = async () => {
        setLoadingNotes(true);
        try {
            const res = await api.get(`/api/notes/${nodeId}`);
            setNotes(res.data.notes || []);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        }
        setLoadingNotes(false);
    };

    // Save a new note — text only for panel notes
    const handleSave = async () => {
        if (!content.trim()) return;
        setSaving(true);
        try {
            const res = await api.post(`/api/notes/${nodeId}`, {
                content: content.trim(),
                images: [],
            });
            setNotes((prev) => [res.data.note, ...prev]);
            setContent('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        } catch (err) {
            console.error('Failed to save note:', err);
        }
        setSaving(false);
    };

    // Delete a note
    const handleDelete = async (noteId) => {
        try {
            await api.delete(`/api/notes/${noteId}`);
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };


    // AI Suggestions
    const handleGetSuggestions = async () => {
        if (notes.length === 0) return;
        setLoadingSuggestions(true);
        setSuggestions([]);
        try {
            const res = await api.post(`/api/notes/${nodeId}/suggest`);
            setSuggestions(res.data.suggestions || []);
        } catch (err) {
            console.error('Failed to get suggestions:', err);
        }
        setLoadingSuggestions(false);
    };

    // Approve a suggestion — ingest it as a new node
    const handleApproveSuggestion = async (suggestion) => {
        setApprovingId(suggestion.title);
        try {
            await api.post('/api/knowledge/ingest', {
                content: `${suggestion.title}: ${suggestion.content}`,
            });
            setSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
        } catch (err) {
            console.error('Failed to create node from suggestion:', err);
        }
        setApprovingId(null);
    };

    // Dismiss a suggestion
    const handleDismissSuggestion = (suggestion) => {
        setSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
    };

    // Auto-resize textarea
    const handleTextareaInput = (e) => {
        setContent(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    // Ctrl+Enter to save
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    if (!isOpen || !node) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="notes-panel"
                initial={{ x: 460, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 460, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                style={panelStyle}
            >
                {/* ─── Header ─── */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                color: '#8b5cf6',
                                marginBottom: '6px',
                            }}>
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}><rect x="3" y="2" width="10" height="12" rx="1.5" stroke="#8b5cf6" strokeWidth="1.2"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke="#8b5cf6" strokeWidth="0.8" opacity="0.5"/><line x1="5.5" y1="7.5" x2="10.5" y2="7.5" stroke="#8b5cf6" strokeWidth="0.8" opacity="0.5"/><line x1="5.5" y1="10" x2="8.5" y2="10" stroke="#8b5cf6" strokeWidth="0.8" opacity="0.5"/></svg>NOTES
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e8f4fd', lineHeight: '1.3' }}>
                                {node.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(232, 244, 253, 0.4)', marginTop: '4px' }}>
                                {node.topic_category} · {notes.length} note{notes.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <button
                            onClick={closePanel}
                            style={{
                                width: '32px',
                                height: '32px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                color: 'rgba(232, 244, 253, 0.5)',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* ─── Notes List ─── */}
                <div style={scrollStyle}>
                    {loadingNotes ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(232, 244, 253, 0.3)' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                border: '2px solid rgba(139, 92, 246, 0.15)',
                                borderTop: '2px solid #8b5cf6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 12px',
                            }} />
                            Loading notes...
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : notes.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '50px 20px',
                            color: 'rgba(232, 244, 253, 0.3)',
                        }}>
                            <div style={{ marginBottom: '12px' }}><svg width="36" height="36" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1.5" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke="rgba(139,92,246,0.3)" strokeWidth="0.8"/><line x1="5.5" y1="7.5" x2="10.5" y2="7.5" stroke="rgba(139,92,246,0.3)" strokeWidth="0.8"/><line x1="5.5" y1="10" x2="8.5" y2="10" stroke="rgba(139,92,246,0.3)" strokeWidth="0.8"/></svg></div>
                            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'rgba(232, 244, 253, 0.5)' }}>
                                No notes yet
                            </div>
                            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                Add your thoughts, insights, and references about{' '}
                                <span style={{ color: '#a78bfa' }}>{node.title}</span>.
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {notes.map((note) => (
                                <NoteCard key={note.id} note={note} onDelete={handleDelete} />
                            ))}
                        </AnimatePresence>
                    )}

                    {/* ─── AI Suggestions Section ─── */}
                    {notes.length > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(139, 92, 246, 0.08)' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#06b6d4' }}>
                                    ✦ AI Suggestions
                                </div>
                                <button
                                    onClick={handleGetSuggestions}
                                    disabled={loadingSuggestions}
                                    style={{
                                        padding: '6px 14px',
                                        background: loadingSuggestions
                                            ? 'rgba(6, 182, 212, 0.1)'
                                            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15))',
                                        border: '1px solid rgba(6, 182, 212, 0.2)',
                                        borderRadius: '8px',
                                        color: '#67e8f9',
                                        fontSize: '10.5px',
                                        fontWeight: 600,
                                        cursor: loadingSuggestions ? 'wait' : 'pointer',
                                        letterSpacing: '0.5px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {loadingSuggestions ? 'Analyzing...' : '✦ Analyze Notes'}
                                </button>
                            </div>

                            {loadingSuggestions && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '20px',
                                    color: 'rgba(232, 244, 253, 0.3)',
                                    fontSize: '12px',
                                }}>
                                    AI is reading your notes and finding related topics...
                                </div>
                            )}

                            <AnimatePresence>
                                {suggestions.map((s) => (
                                    <SuggestionCard
                                        key={s.title}
                                        suggestion={s}
                                        onApprove={handleApproveSuggestion}
                                        onDismiss={handleDismissSuggestion}
                                        approving={approvingId === s.title}
                                    />
                                ))}
                            </AnimatePresence>

                            {suggestions.length > 0 && (
                                <div style={{
                                    fontSize: '10px',
                                    color: 'rgba(232, 244, 253, 0.25)',
                                    textAlign: 'center',
                                    padding: '8px 0',
                                    letterSpacing: '0.3px',
                                }}>
                                    Only approved suggestions become nodes — you're in control.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Composer ─── */}
                <div style={composerStyle}>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleTextareaInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a note..."
                            rows={1}
                            style={{
                                flex: 1,
                                background: 'rgba(139, 92, 246, 0.06)',
                                border: '1px solid rgba(139, 92, 246, 0.12)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                color: '#e8f4fd',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'inherit',
                                minHeight: '40px',
                                maxHeight: '200px',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(139, 92, 246, 0.35)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(139, 92, 246, 0.12)'; }}
                        />

                        {/* Save button */}
                        <button
                            onClick={handleSave}
                            disabled={saving || !content.trim()}
                            style={{
                                width: '38px',
                                height: '38px',
                                background: content.trim()
                                    ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                                    : 'rgba(139, 92, 246, 0.08)',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: content.trim() ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                                opacity: content.trim() ? 1 : 0.4,
                            }}
                            title="Save note (⌘+Enter)"
                        >
                            {saving ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{animation:'spin 1s linear infinite'}}><circle cx="8" cy="8" r="6" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5"/><path d="M8 2a6 6 0 0 1 6 6" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/></svg> : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 12V4M4 8l4-4 4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </button>
                    </div>

                    <div style={{ fontSize: '10px', color: 'rgba(232, 244, 253, 0.2)', marginTop: '8px', textAlign: 'right' }}>
                        ⌘+Enter to save
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
