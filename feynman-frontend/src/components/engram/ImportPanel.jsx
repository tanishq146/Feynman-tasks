// ═══════════════════════════════════════════════════════════════════════════
// ImportPanel.jsx — Direct AI Chat Import
//
// Upload your Claude/ChatGPT/Gemini export file and Engram
// parses every conversation, lets you select which ones to ingest,
// and batch-processes them into your thinking graph.
//
// Three steps: Upload → Select → Processing
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

const font = "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const C = {
    bg: '#07080C',
    surface: 'rgba(255,255,255,0.02)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.05)',
    accent: '#00E5A0',
    accentDim: 'rgba(0, 229, 160, 0.08)',
    accentBorder: 'rgba(0, 229, 160, 0.15)',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
    danger: '#EF4444',
};

const PLATFORMS = {
    claude: {
        name: 'Claude',
        color: '#D4A574',
        icon: '◆',
        instructions: [
            'Open claude.ai in your browser',
            'Click your profile icon → Settings',
            'Go to Privacy → Export Data',
            'Download the ZIP and upload the conversations.json inside',
        ],
    },
    chatgpt: {
        name: 'ChatGPT',
        color: '#74AA9C',
        icon: '◇',
        instructions: [
            'Open chatgpt.com → Settings',
            'Go to Data Controls → Export Data',
            'Download the ZIP and upload the conversations.json inside',
        ],
    },
    gemini: {
        name: 'Gemini',
        color: '#4285F4',
        icon: '◈',
        instructions: [
            'Go to takeout.google.com',
            'Select "Gemini Apps" and export',
            'Upload the resulting JSON file',
        ],
    },
};


export default function ImportPanel({ isOpen, onClose, onComplete }) {
    const [step, setStep] = useState('upload'); // 'upload' | 'select' | 'processing' | 'done'
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [expandedPlatform, setExpandedPlatform] = useState(null);

    // Parse results
    const [importData, setImportData] = useState(null); // { import_id, platform, total, conversations }
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    // Processing state
    const [processResult, setProcessResult] = useState(null);
    const [processing, setProcessing] = useState(false);

    const fileInputRef = useRef(null);

    // ─── File handling ───────────────────────────────────────────────
    const handleFile = useCallback(async (file) => {
        setError(null);
        setParsing(true);

        // Validate file type
        const validTypes = ['application/json', 'text/plain', ''];
        const validExtensions = ['.json', '.txt'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
            setError('Please upload a .json file (conversations.json from your AI export)');
            setParsing(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/api/engram/import/parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000,
            });

            const data = res.data;
            if (!data.conversations || data.conversations.length === 0) {
                setError('No conversations found in the file. Make sure you uploaded conversations.json from your AI export.');
                setParsing(false);
                return;
            }

            setImportData(data);
            // Auto-select all by default
            setSelectedIndices(new Set(data.conversations.map(c => c.index)));
            setStep('select');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to parse export file');
        } finally {
            setParsing(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    // ─── Selection ───────────────────────────────────────────────────
    const toggleSelection = (index) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const selectAll = () => {
        if (importData) {
            setSelectedIndices(new Set(importData.conversations.map(c => c.index)));
        }
    };

    const deselectAll = () => setSelectedIndices(new Set());

    // ─── Ingest selected ─────────────────────────────────────────────
    const handleIngest = useCallback(async () => {
        if (!importData || selectedIndices.size === 0) return;

        setStep('processing');
        setProcessing(true);

        try {
            const res = await api.post('/api/engram/import/ingest', {
                import_id: importData.import_id,
                selected_indices: Array.from(selectedIndices),
            }, { timeout: 300000 }); // 5 min timeout for large imports

            setProcessResult(res.data);
            setStep('done');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Import failed');
            setStep('select');
        } finally {
            setProcessing(false);
        }
    }, [importData, selectedIndices]);

    // ─── Reset ───────────────────────────────────────────────────────
    const handleReset = () => {
        setStep('upload');
        setImportData(null);
        setSelectedIndices(new Set());
        setProcessResult(null);
        setError(null);
    };

    const handleDone = () => {
        onComplete?.();
        handleReset();
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1001,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 16 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                    style={{
                        width: '100%', maxWidth: step === 'select' ? '720px' : '580px',
                        maxHeight: '85vh',
                        background: 'linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,16,0.99))',
                        border: `1px solid ${C.border}`,
                        borderRadius: '20px',
                        overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '28px 32px 20px',
                        borderBottom: `1px solid ${C.border}`,
                    }}>
                        <div style={{
                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                            color: C.accent, letterSpacing: '3px', textTransform: 'uppercase',
                            marginBottom: '8px',
                        }}>
                            {step === 'upload' ? 'Import Conversations' :
                             step === 'select' ? 'Select Conversations' :
                             step === 'processing' ? 'Extracting Thoughts' :
                             'Import Complete'}
                        </div>
                        <div style={{
                            fontFamily: font, fontSize: '20px', fontWeight: 700,
                            color: C.text, letterSpacing: '-0.5px',
                        }}>
                            {step === 'upload' ? 'Upload your AI export' :
                             step === 'select' ? `${importData?.total || 0} conversations found` :
                             step === 'processing' ? 'Processing your conversations...' :
                             'Your thinking graph is growing'}
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
                        {/* ─── UPLOAD STEP ─────────────────────────────── */}
                        {step === 'upload' && (
                            <div>
                                {/* Drop zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        padding: '40px 24px',
                                        borderRadius: '16px',
                                        border: `2px dashed ${dragOver ? C.accent : C.border}`,
                                        background: dragOver ? C.accentDim : C.surface,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json,.txt"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFile(f);
                                        }}
                                        style={{ display: 'none' }}
                                    />

                                    {parsing ? (
                                        <div>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                                style={{
                                                    width: '32px', height: '32px', margin: '0 auto 14px',
                                                    border: '2px solid rgba(0,229,160,0.1)',
                                                    borderTop: `2px solid ${C.accent}`,
                                                    borderRadius: '50%',
                                                }}
                                            />
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '12px',
                                                color: C.accent, letterSpacing: '1px',
                                            }}>Parsing conversations...</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{
                                                width: '56px', height: '56px', margin: '0 auto 16px',
                                                borderRadius: '16px',
                                                background: C.accentDim,
                                                border: `1px solid ${C.accentBorder}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '24px',
                                            }}>↑</div>
                                            <div style={{
                                                fontFamily: font, fontSize: '16px', fontWeight: 600,
                                                color: C.text, marginBottom: '6px',
                                            }}>
                                                Drop your <span style={{ color: C.accent }}>conversations.json</span> here
                                            </div>
                                            <div style={{
                                                fontFamily: fontMono, fontSize: '11px',
                                                color: C.textDim, lineHeight: '1.6',
                                            }}>
                                                or click to browse • Supports Claude, ChatGPT, and Gemini exports
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <div style={{
                                        marginTop: '12px', padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(239,68,68,0.06)',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                        fontFamily: fontMono, fontSize: '11px',
                                        color: '#EF4444', lineHeight: '1.5',
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {/* Platform instructions */}
                                <div style={{ marginTop: '24px' }}>
                                    <div style={{
                                        fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                        color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                        marginBottom: '12px',
                                    }}>How to export your chats</div>

                                    {Object.entries(PLATFORMS).map(([key, platform]) => (
                                        <div
                                            key={key}
                                            onClick={() => setExpandedPlatform(expandedPlatform === key ? null : key)}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: `1px solid ${expandedPlatform === key ? platform.color + '30' : C.border}`,
                                                background: expandedPlatform === key ? platform.color + '06' : C.surface,
                                                marginBottom: '6px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                }}>
                                                    <span style={{ color: platform.color, fontSize: '14px' }}>{platform.icon}</span>
                                                    <span style={{
                                                        fontFamily: font, fontSize: '13px', fontWeight: 600,
                                                        color: C.text,
                                                    }}>{platform.name}</span>
                                                </div>
                                                <span style={{
                                                    fontFamily: fontMono, fontSize: '10px',
                                                    color: C.textDim,
                                                    transform: expandedPlatform === key ? 'rotate(180deg)' : 'none',
                                                    transition: 'transform 0.2s',
                                                }}>▾</span>
                                            </div>

                                            <AnimatePresence>
                                                {expandedPlatform === key && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        style={{ overflow: 'hidden' }}
                                                    >
                                                        <ol style={{
                                                            paddingLeft: '20px',
                                                            marginTop: '12px',
                                                            marginBottom: 0,
                                                        }}>
                                                            {platform.instructions.map((step, i) => (
                                                                <li key={i} style={{
                                                                    fontFamily: fontMono, fontSize: '11px',
                                                                    color: C.textMid, lineHeight: '1.8',
                                                                    marginBottom: '2px',
                                                                }}>{step}</li>
                                                            ))}
                                                        </ol>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── SELECT STEP ─────────────────────────────── */}
                        {step === 'select' && importData && (
                            <div>
                                {/* Platform detected badge */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    marginBottom: '16px',
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                    }}>
                                        <div style={{
                                            padding: '4px 12px', borderRadius: '6px',
                                            background: (PLATFORMS[importData.platform]?.color || '#9CA3AF') + '12',
                                            border: `1px solid ${(PLATFORMS[importData.platform]?.color || '#9CA3AF')}20`,
                                            fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                            color: PLATFORMS[importData.platform]?.color || '#9CA3AF',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {PLATFORMS[importData.platform]?.icon || '◆'} {PLATFORMS[importData.platform]?.name || importData.platform}
                                        </div>
                                        <span style={{
                                            fontFamily: fontMono, fontSize: '10px', color: C.textDim,
                                        }}>
                                            {selectedIndices.size} of {importData.total} selected
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={selectAll}
                                            style={{
                                                padding: '4px 10px', borderRadius: '6px',
                                                background: 'none', border: `1px solid ${C.border}`,
                                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                color: C.textMid, cursor: 'pointer',
                                                letterSpacing: '0.5px',
                                            }}
                                        >Select All</button>
                                        <button
                                            onClick={deselectAll}
                                            style={{
                                                padding: '4px 10px', borderRadius: '6px',
                                                background: 'none', border: `1px solid ${C.border}`,
                                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                color: C.textMid, cursor: 'pointer',
                                                letterSpacing: '0.5px',
                                            }}
                                        >Deselect All</button>
                                    </div>
                                </div>

                                {/* Conversation list */}
                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: '4px',
                                    maxHeight: '50vh', overflow: 'auto',
                                }}>
                                    {importData.conversations.map((conv) => {
                                        const isSelected = selectedIndices.has(conv.index);
                                        return (
                                            <div
                                                key={conv.index}
                                                onClick={() => toggleSelection(conv.index)}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: '10px',
                                                    border: `1px solid ${isSelected ? C.accentBorder : C.border}`,
                                                    background: isSelected ? C.accentDim : C.surface,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.12s',
                                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                }}
                                            >
                                                {/* Checkbox */}
                                                <div style={{
                                                    width: '18px', height: '18px', flexShrink: 0,
                                                    borderRadius: '5px', marginTop: '1px',
                                                    border: `1.5px solid ${isSelected ? C.accent : C.textDim}`,
                                                    background: isSelected ? C.accent : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.12s',
                                                }}>
                                                    {isSelected && (
                                                        <span style={{ color: '#050508', fontSize: '11px', fontWeight: 800 }}>✓</span>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontFamily: font, fontSize: '13px', fontWeight: 600,
                                                        color: C.text, marginBottom: '4px',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>{conv.title}</div>
                                                    <div style={{
                                                        fontFamily: fontMono, fontSize: '10px',
                                                        color: C.textDim, lineHeight: '1.5',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    }}>{conv.preview}</div>
                                                    <div style={{
                                                        display: 'flex', gap: '12px', marginTop: '6px',
                                                    }}>
                                                        <span style={{
                                                            fontFamily: fontMono, fontSize: '9px', color: C.textDim,
                                                        }}>{conv.message_count} messages</span>
                                                        <span style={{
                                                            fontFamily: fontMono, fontSize: '9px', color: C.textDim,
                                                        }}>{(conv.char_count / 1000).toFixed(1)}k chars</span>
                                                        {conv.created_at && (
                                                            <span style={{
                                                                fontFamily: fontMono, fontSize: '9px', color: C.textDim,
                                                            }}>{new Date(conv.created_at).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {error && (
                                    <div style={{
                                        marginTop: '12px', padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(239,68,68,0.06)',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                        fontFamily: fontMono, fontSize: '11px',
                                        color: '#EF4444',
                                    }}>{error}</div>
                                )}
                            </div>
                        )}

                        {/* ─── PROCESSING STEP ────────────────────────── */}
                        {step === 'processing' && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                    style={{
                                        width: '48px', height: '48px', margin: '0 auto 20px',
                                        border: '3px solid rgba(0,229,160,0.08)',
                                        borderTop: `3px solid ${C.accent}`,
                                        borderRadius: '50%',
                                    }}
                                />
                                <div style={{
                                    fontFamily: font, fontSize: '16px', fontWeight: 600,
                                    color: C.text, marginBottom: '8px',
                                }}>
                                    Extracting thoughts from {selectedIndices.size} conversation{selectedIndices.size !== 1 ? 's' : ''}...
                                </div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '11px',
                                    color: C.textDim, lineHeight: '1.6',
                                }}>
                                    This may take a minute for large imports.<br />
                                    Each conversation is analyzed for atomic thoughts.
                                </div>
                            </div>
                        )}

                        {/* ─── DONE STEP ──────────────────────────────── */}
                        {step === 'done' && processResult && (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div style={{
                                    width: '64px', height: '64px', margin: '0 auto 20px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(0,229,160,0.12), rgba(61,214,245,0.08))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '28px',
                                }}>✦</div>

                                <div style={{
                                    fontFamily: font, fontSize: '20px', fontWeight: 700,
                                    color: C.text, marginBottom: '6px',
                                }}>Import Complete</div>

                                {/* Stats grid */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '12px', margin: '24px 0',
                                }}>
                                    <StatCard
                                        label="Conversations"
                                        value={processResult.total_conversations}
                                        color={C.accent}
                                    />
                                    <StatCard
                                        label="New Thoughts"
                                        value={processResult.new_thoughts}
                                        color="#3DD6F5"
                                    />
                                    <StatCard
                                        label="Merged"
                                        value={processResult.merged_thoughts}
                                        color="#A78BFA"
                                    />
                                </div>

                                {/* Per-conversation results */}
                                {processResult.results && processResult.results.length > 0 && (
                                    <div style={{
                                        maxHeight: '200px', overflow: 'auto',
                                        marginTop: '16px', textAlign: 'left',
                                    }}>
                                        {processResult.results.map((r, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                background: i % 2 === 0 ? C.surface : 'transparent',
                                            }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: r.status === 'success' ? C.accent : C.danger,
                                                }}>{r.status === 'success' ? '●' : '✕'}</span>
                                                <span style={{
                                                    fontFamily: fontMono, fontSize: '11px',
                                                    color: C.text, flex: 1,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>{r.title}</span>
                                                <span style={{
                                                    fontFamily: fontMono, fontSize: '9px',
                                                    color: C.textDim,
                                                }}>{r.thoughts_extracted} thoughts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '16px 32px 20px',
                        borderTop: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        {step === 'upload' && (
                            <>
                                <div style={{ fontFamily: fontMono, fontSize: '9px', color: C.textDim }}>
                                    Your data stays local — none is stored beyond extraction
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '8px 20px', borderRadius: '8px',
                                        background: 'none', border: `1px solid ${C.border}`,
                                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                        color: C.textMid, cursor: 'pointer',
                                    }}
                                >Cancel</button>
                            </>
                        )}

                        {step === 'select' && (
                            <>
                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '8px 20px', borderRadius: '8px',
                                        background: 'none', border: `1px solid ${C.border}`,
                                        fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                        color: C.textMid, cursor: 'pointer',
                                    }}
                                >← Back</button>
                                <motion.button
                                    onClick={handleIngest}
                                    disabled={selectedIndices.size === 0}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: '10px 28px', borderRadius: '10px',
                                        border: 'none',
                                        background: selectedIndices.size > 0
                                            ? 'linear-gradient(135deg, #00E5A0, #3DD6F5)'
                                            : 'rgba(255,255,255,0.04)',
                                        color: selectedIndices.size > 0 ? '#050508' : C.textDim,
                                        fontFamily: fontMono, fontSize: '12px', fontWeight: 700,
                                        cursor: selectedIndices.size > 0 ? 'pointer' : 'not-allowed',
                                        letterSpacing: '0.3px',
                                    }}
                                >
                                    ◆ Extract from {selectedIndices.size} conversation{selectedIndices.size !== 1 ? 's' : ''}
                                </motion.button>
                            </>
                        )}

                        {step === 'processing' && (
                            <div style={{
                                width: '100%', textAlign: 'center',
                                fontFamily: fontMono, fontSize: '9px', color: C.textDim,
                            }}>
                                Processing with AI... please don't close this window
                            </div>
                        )}

                        {step === 'done' && (
                            <motion.button
                                onClick={handleDone}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%',
                                    padding: '12px 28px', borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #00E5A0, #3DD6F5)',
                                    color: '#050508',
                                    fontFamily: fontMono, fontSize: '13px', fontWeight: 700,
                                    cursor: 'pointer',
                                    letterSpacing: '0.3px',
                                }}
                            >
                                View Your Thinking Graph →
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Small stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
    return (
        <div style={{
            padding: '16px', borderRadius: '12px',
            background: color + '06',
            border: `1px solid ${color}15`,
            textAlign: 'center',
        }}>
            <div style={{
                fontFamily: font, fontSize: '28px', fontWeight: 700,
                color,
            }}>{value}</div>
            <div style={{
                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                color: C.textDim, letterSpacing: '1px', textTransform: 'uppercase',
                marginTop: '4px',
            }}>{label}</div>
        </div>
    );
}
