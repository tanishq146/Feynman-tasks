// ─── Vault Import Modal ─────────────────────────────────────────────────────
// Full-screen modal for importing Obsidian markdown files into Feynman.
// Supports drag-and-drop of .md files and .zip archives.

import { useState, useRef, useCallback } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { motion, AnimatePresence } from 'framer-motion';
import { parseImportFiles, importToFeynman } from '../../lib/vaultImport';
import { ingestKnowledge } from '../../hooks/useBrainData';
import useBrainStore from '../../store/brainStore';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

export default function VaultImportModal({ isOpen, onClose }) {
    const [dragOver, setDragOver] = useState(false);
    const [parsedNodes, setParsedNodes] = useState(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(null);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);
    const addToast = useBrainStore(s => s.addToast);
    const { isMobile, isTouchDevice } = useResponsive();

    const handleFiles = useCallback(async (files) => {
        try {
            const nodes = await parseImportFiles(files);
            if (nodes.length === 0) {
                addToast({ type: 'danger', icon: '✕', message: 'No valid .md files found', duration: 3000 });
                return;
            }
            setParsedNodes(nodes);
        } catch (err) {
            console.error('Parse error:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Failed to parse files: ' + err.message, duration: 4000 });
        }
    }, [addToast]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleFileInput = useCallback((e) => {
        if (e.target.files?.length > 0) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    const handleImport = async () => {
        if (!parsedNodes || importing) return;
        setImporting(true);
        setProgress({ current: 0, total: parsedNodes.length, title: '' });

        try {
            const results = await importToFeynman(parsedNodes, ingestKnowledge, (p) => {
                setProgress(p);
            });
            setResults(results);
            if (results.imported > 0) {
                addToast({
                    type: 'success',
                    icon: '✦',
                    message: `Imported ${results.imported} knowledge nodes!`,
                    duration: 5000,
                });
            }
        } catch (err) {
            console.error('Import error:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Import failed: ' + err.message, duration: 4000 });
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        if (importing) return;
        setParsedNodes(null);
        setResults(null);
        setProgress(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 200,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: isMobile ? '95vw' : '520px',
                        maxHeight: isMobile ? '90vh' : '80vh',
                        background: 'rgba(2, 8, 20, 0.97)',
                        border: '1px solid rgba(0, 212, 255, 0.12)',
                        borderRadius: isMobile ? '16px' : '20px',
                        padding: isMobile ? '20px 16px' : '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isMobile ? '16px' : '20px',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 80px rgba(0, 212, 255, 0.04)',
                        overflowY: 'auto',
                        backdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                        WebkitBackdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{
                                fontFamily: font,
                                fontSize: '18px',
                                fontWeight: 700,
                                color: '#e8f4fd',
                                margin: 0,
                                letterSpacing: '0.5px',
                            }}>
                                ▽ Import to Brain
                            </h2>
                            <p style={{
                                fontFamily: fontMono,
                                fontSize: '11px',
                                color: '#4a9eba',
                                margin: '4px 0 0 0',
                                opacity: 0.7,
                            }}>
                                Drag Obsidian .md files or a vault .zip
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={importing}
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '10px',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: importing ? 'not-allowed' : 'pointer',
                                color: '#4a9eba',
                                fontSize: '14px',
                                fontFamily: font,
                                transition: 'all 0.2s',
                                opacity: importing ? 0.3 : 1,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Results view */}
                    {results ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                padding: '24px',
                                borderRadius: '14px',
                                background: 'rgba(0, 255, 136, 0.04)',
                                border: '1px solid rgba(0, 255, 136, 0.12)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                                    {results.imported > 0 ? '✦' : '□'}
                                </div>
                                <div style={{
                                    fontFamily: font,
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: '#e8f4fd',
                                    marginBottom: '4px',
                                }}>
                                    {results.imported > 0 ? `${results.imported} Nodes Imported` : 'No Nodes Imported'}
                                </div>
                                <div style={{
                                    fontFamily: fontMono,
                                    fontSize: '12px',
                                    color: '#4a9eba',
                                    opacity: 0.7,
                                }}>
                                    {results.skipped > 0 && `${results.skipped} skipped · `}
                                    {results.errors.length > 0 && `${results.errors.length} errors`}
                                    {results.skipped === 0 && results.errors.length === 0 && 'All nodes processed successfully'}
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div style={{
                                    padding: '14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 68, 102, 0.06)',
                                    border: '1px solid rgba(255, 68, 102, 0.15)',
                                }}>
                                    <div style={{ fontFamily: font, fontSize: '12px', fontWeight: 600, color: '#ff4466', marginBottom: '8px' }}>
                                        Errors
                                    </div>
                                    {results.errors.map((err, i) => (
                                        <div key={i} style={{ fontFamily: fontMono, fontSize: '11px', color: '#4a9eba', padding: '2px 0' }}>
                                            • {err.title}: {err.error}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                style={{
                                    fontFamily: font,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#020814',
                                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Done
                            </button>
                        </div>
                    ) : importing ? (
                        /* Progress view */
                        <div style={{
                            padding: '32px 24px',
                            borderRadius: '14px',
                            background: 'rgba(0, 212, 255, 0.03)',
                            border: '1px solid rgba(0, 212, 255, 0.08)',
                            textAlign: 'center',
                        }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    border: '3px solid rgba(0, 212, 255, 0.1)',
                                    borderTop: '3px solid #00d4ff',
                                    borderRadius: '50%',
                                    margin: '0 auto 16px',
                                }}
                            />
                            <div style={{ fontFamily: font, fontSize: '15px', fontWeight: 600, color: '#e8f4fd', marginBottom: '6px' }}>
                                Importing {progress?.current}/{progress?.total}
                            </div>
                            <div style={{ fontFamily: fontMono, fontSize: '11px', color: '#4a9eba', opacity: 0.7 }}>
                                {progress?.title || 'Processing...'}
                            </div>
                            {/* Progress bar */}
                            <div style={{
                                marginTop: '16px',
                                height: '4px',
                                borderRadius: '2px',
                                background: 'rgba(0, 212, 255, 0.08)',
                                overflow: 'hidden',
                            }}>
                                <motion.div
                                    animate={{ width: `${((progress?.current || 0) / (progress?.total || 1)) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        height: '100%',
                                        borderRadius: '2px',
                                        background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
                                    }}
                                />
                            </div>
                        </div>
                    ) : parsedNodes ? (
                        /* Preview parsed nodes */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{
                                fontFamily: fontMono,
                                fontSize: '11px',
                                color: '#4a9eba',
                                padding: '8px 12px',
                                background: 'rgba(0, 212, 255, 0.04)',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 212, 255, 0.06)',
                            }}>
                                Found <strong style={{ color: '#00d4ff' }}>{parsedNodes.length}</strong> markdown file{parsedNodes.length !== 1 ? 's' : ''} to import
                            </div>

                            <div style={{
                                maxHeight: '280px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                            }}>
                                {parsedNodes.map((node, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.04)',
                                    }}>
                                        <span style={{ fontSize: '14px' }}>
                                            {node.fromFeynman ? '✦' : '▤'}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: font,
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                color: '#e8f4fd',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {node.title}
                                            </div>
                                            <div style={{
                                                fontFamily: fontMono,
                                                fontSize: '10px',
                                                color: '#4a9eba',
                                                opacity: 0.6,
                                            }}>
                                                {node.raw_content?.length || 0} chars
                                                {node.brain_region && ` · ${node.brain_region}`}
                                                {node.tags?.length > 0 && ` · ${node.tags.length} tags`}
                                            </div>
                                        </div>
                                        {node.fromFeynman && (
                                            <span style={{
                                                fontFamily: fontMono,
                                                fontSize: '9px',
                                                fontWeight: 600,
                                                color: '#00ff88',
                                                background: 'rgba(0, 255, 136, 0.08)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                            }}>
                                                FEYNMAN
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setParsedNodes(null)}
                                    style={{
                                        flex: 1,
                                        fontFamily: font,
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#4a9eba',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    style={{
                                        flex: 2,
                                        fontFamily: font,
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: '#020814',
                                        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '12px 24px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Import {parsedNodes.length} Node{parsedNodes.length !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Drop zone */
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '48px 24px',
                                borderRadius: '16px',
                                border: `2px dashed ${dragOver ? '#00d4ff' : 'rgba(0, 212, 255, 0.15)'}`,
                                background: dragOver
                                    ? 'rgba(0, 212, 255, 0.06)'
                                    : 'rgba(0, 212, 255, 0.02)',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".md,.zip"
                                multiple
                                onChange={handleFileInput}
                                style={{ display: 'none' }}
                            />
                            <motion.div
                                animate={{ y: dragOver ? -5 : 0 }}
                                style={{ fontSize: '36px', marginBottom: '12px' }}
                            >
                                {dragOver ? '▽' : '▣'}
                            </motion.div>
                            <div style={{
                                fontFamily: font,
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#e8f4fd',
                                marginBottom: '6px',
                            }}>
                                Drop files here or click to browse
                            </div>
                            <div style={{
                                fontFamily: fontMono,
                                fontSize: '11px',
                                color: '#4a9eba',
                                opacity: 0.6,
                            }}>
                                Supports .md files and .zip vault archives
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    {!parsedNodes && !importing && !results && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '14px',
                            borderRadius: '12px',
                            background: 'rgba(124, 58, 237, 0.04)',
                            border: '1px solid rgba(124, 58, 237, 0.1)',
                        }}>
                            <span style={{ fontSize: '14px' }}>○</span>
                            <div style={{
                                fontFamily: fontMono,
                                fontSize: '11px',
                                color: '#4a9eba',
                                lineHeight: '1.5',
                            }}>
                                Each imported file will be re-analyzed by Feynman's AI to generate summaries, connections, and challenge questions.
                                Files exported from Feynman are automatically recognized.
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
