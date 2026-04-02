// ─── Command Menu ──────────────────────────────────────────────────────────
// Single floating button that expands into a vertical menu with all tools.
// Replaces the scattered floating buttons with one clean access point.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import { exportVault } from '../../hooks/useBrainData';
import { generateVaultZip } from '../../lib/vaultExport';
import VaultImportModal from './VaultImportModal';
import { useResponsive } from '../../hooks/useResponsive';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const menuItems = [
    {
        id: 'chat',
        icon: '💬',
        label: 'Chat',
        description: 'Talk to Feynman',
        color: '#00d4ff',
        colorBg: 'rgba(0, 212, 255, 0.08)',
        colorBorder: 'rgba(0, 212, 255, 0.15)',
    },
    {
        id: 'beliefs',
        icon: '🧬',
        label: 'Beliefs',
        description: 'Belief Evolution',
        color: '#00d4ff',
        colorBg: 'rgba(0, 212, 255, 0.08)',
        colorBorder: 'rgba(0, 212, 255, 0.15)',
    },
    {
        id: 'study',
        icon: '📚',
        label: 'Study',
        description: 'Study Mode',
        color: '#7c3aed',
        colorBg: 'rgba(124, 58, 237, 0.08)',
        colorBorder: 'rgba(124, 58, 237, 0.15)',
    },
    {
        id: 'notes',
        icon: '📓',
        label: 'Notes',
        description: 'Full Workspace',
        color: '#f59e0b',
        colorBg: 'rgba(245, 158, 11, 0.08)',
        colorBorder: 'rgba(245, 158, 11, 0.15)',
    },
    {
        id: 'vault',
        icon: '📦',
        label: 'Vault',
        description: 'Export as Markdown',
        color: '#00ff88',
        colorBg: 'rgba(0, 255, 136, 0.08)',
        colorBorder: 'rgba(0, 255, 136, 0.15)',
    },
    {
        id: 'import',
        icon: '📥',
        label: 'Import',
        description: 'Import Markdown / Obsidian',
        color: '#a78bfa',
        colorBg: 'rgba(167, 139, 250, 0.08)',
        colorBorder: 'rgba(167, 139, 250, 0.15)',
    },
];

export default function CommandMenu({ onSelect, activePanel }) {
    const [isOpen, setIsOpen] = useState(false);
    const [vaultExporting, setVaultExporting] = useState(false);
    const [vaultDone, setVaultDone] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const menuRef = useRef(null);
    const nodes = useBrainStore(s => s.nodes);
    const addToast = useBrainStore(s => s.addToast);
    const fadingCount = nodes.filter(n => (n.current_strength || 100) < 60).length;
    const { isMobile, isTouchDevice } = useResponsive();

    // Vault sync tracking — detect if vault is out of date
    const lastSyncStr = typeof window !== 'undefined' ? localStorage.getItem('feynman_vault_last_sync') : null;
    const lastSyncData = lastSyncStr ? JSON.parse(lastSyncStr) : null;
    const vaultOutOfSync = lastSyncData
        ? nodes.length !== lastSyncData.nodeCount || Date.now() - lastSyncData.timestamp > 24 * 60 * 60 * 1000
        : false;

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKey);
            return () => document.removeEventListener('keydown', handleKey);
        }
    }, [isOpen]);

    const handleVaultExport = async () => {
        if (vaultExporting) return;
        setVaultExporting(true);
        try {
            console.log('📦 Vault: Fetching export data...');
            const data = await exportVault();
            if (!data.nodes || data.nodes.length === 0) {
                addToast({ type: 'danger', icon: '✕', message: 'No knowledge nodes to export', duration: 3000 });
                setVaultExporting(false);
                return;
            }
            console.log(`📦 Vault: Got ${data.nodes.length} nodes, ${data.edges?.length || 0} edges. Generating ZIP...`);
            const result = await generateVaultZip(data);
            setVaultDone(true);
            console.log(`📦 Vault: Export complete! ${result.nodeCount} nodes exported.`);
            // Save sync state
            localStorage.setItem('feynman_vault_last_sync', JSON.stringify({
                timestamp: Date.now(),
                nodeCount: result.nodeCount,
            }));
            addToast({ type: 'success', icon: '✦', message: `Exported ${result.nodeCount} nodes as Markdown vault`, duration: 4000 });
            setTimeout(() => setVaultDone(false), 3000);
        } catch (err) {
            console.error('📦 Vault export error:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Export failed — ' + (err?.message || 'Unknown error'), duration: 4000 });
        } finally {
            setVaultExporting(false);
        }
    };

    const handleItemClick = (id) => {
        if (id === 'vault') {
            handleVaultExport();
            return; // Don't close menu — show loading state
        }
        if (id === 'import') {
            setIsOpen(false);
            setShowImportModal(true);
            return;
        }
        setIsOpen(false);
        onSelect(id);
    };

    return (
        <>
        <VaultImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
        />
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                left: isMobile ? 'auto' : '20px',
                right: isMobile ? '16px' : 'auto',
                bottom: isMobile ? '80px' : '100px',
                zIndex: 65,
            }}
        >
            {/* Expanded Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'absolute',
                            bottom: '56px',
                            left: isMobile ? 'auto' : 0,
                            right: isMobile ? 0 : 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: isMobile ? '8px' : '10px',
                            borderRadius: '16px',
                            background: 'rgba(2, 8, 20, 0.95)',
                            backdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                            WebkitBackdropFilter: isTouchDevice ? 'blur(16px)' : 'blur(30px)',
                            border: '1px solid rgba(0, 212, 255, 0.1)',
                            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(0, 212, 255, 0.03)',
                            minWidth: isMobile ? '170px' : '180px',
                        }}
                    >
                        {/* Menu header */}
                        <div style={{
                            padding: '4px 8px 8px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            marginBottom: '2px',
                        }}>
                            <span style={{
                                fontFamily: fontMono,
                                fontSize: '9px',
                                fontWeight: 600,
                                color: 'rgba(0, 212, 255, 0.4)',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                            }}>
                                Tools
                            </span>
                        </div>

                        {/* Menu items */}
                        {menuItems.map((item, index) => {
                            const isActive = activePanel === item.id;
                            return (
                                <motion.button
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.2 }}
                                    onClick={() => handleItemClick(item.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: `1px solid ${isActive ? item.colorBorder : 'transparent'}`,
                                        background: isActive ? item.colorBg : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                            e.currentTarget.style.border = `1px solid rgba(255, 255, 255, 0.06)`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.border = '1px solid transparent';
                                        }
                                    }}
                                >
                                    {/* Icon */}
                                    <span style={{ fontSize: '18px', lineHeight: 1 }}>
                                        {item.icon}
                                    </span>

                                    {/* Text */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
                                        <span style={{
                                            fontFamily: font,
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: isActive ? item.color : '#e8f4fd',
                                            letterSpacing: '0.3px',
                                        }}>
                                            {item.label}
                                        </span>
                                        <span style={{
                                            fontFamily: fontMono,
                                            fontSize: '10px',
                                            color: '#4a9eba',
                                            opacity: 0.6,
                                        }}>
                                            {item.description}
                                        </span>
                                    </div>

                                    {/* Study mode badge */}
                                    {item.id === 'study' && fadingCount > 0 && (
                                        <div style={{
                                            marginLeft: 'auto',
                                            minWidth: '18px',
                                            height: '18px',
                                            borderRadius: '9px',
                                            background: '#ff4466',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            color: '#fff',
                                            fontFamily: fontMono,
                                            padding: '0 4px',
                                        }}>
                                            {fadingCount > 9 ? '9+' : fadingCount}
                                        </div>
                                    )}

                                    {/* Vault export status */}
                                    {item.id === 'vault' && vaultExporting && (
                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                style={{ width: '14px', height: '14px', border: '2px solid rgba(0,255,136,0.15)', borderTop: '2px solid #00ff88', borderRadius: '50%' }}
                                            />
                                        </div>
                                    )}
                                    {item.id === 'vault' && vaultDone && !vaultExporting && (
                                        <motion.div
                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            style={{ marginLeft: 'auto', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,255,136,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <span style={{ color: '#00ff88', fontSize: '10px', fontWeight: 700 }}>✓</span>
                                        </motion.div>
                                    )}
                                    {/* Vault out-of-sync indicator */}
                                    {item.id === 'vault' && vaultOutOfSync && !vaultExporting && !vaultDone && (
                                        <div style={{
                                            marginLeft: 'auto',
                                            fontFamily: fontMono,
                                            fontSize: '8px',
                                            fontWeight: 700,
                                            color: '#ffaa00',
                                            background: 'rgba(255, 170, 0, 0.1)',
                                            padding: '2px 5px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 170, 0, 0.2)',
                                            letterSpacing: '0.5px',
                                        }}>
                                            SYNC
                                        </div>
                                    )}

                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            style={{
                                                marginLeft: item.id === 'study' && fadingCount > 0 ? '4px' : 'auto',
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: item.color,
                                                boxShadow: `0 0 8px ${item.color}80`,
                                            }}
                                        />
                                    )}
                                </motion.button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trigger Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                style={{
                    width: isMobile ? '52px' : '48px',
                    height: isMobile ? '52px' : '48px',
                    borderRadius: '14px',
                    background: isOpen
                        ? 'rgba(0, 212, 255, 0.12)'
                        : 'rgba(2, 8, 20, 0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isOpen
                        ? 'rgba(0, 212, 255, 0.3)'
                        : 'rgba(0, 212, 255, 0.15)'}`,
                    color: '#00d4ff',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isOpen
                        ? '0 4px 30px rgba(0, 212, 255, 0.15)'
                        : '0 4px 20px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                }}
            >
                <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: font,
                        fontWeight: 300,
                        fontSize: isOpen ? '20px' : '16px',
                    }}
                >
                    {isOpen ? '+' : '✦'}
                </motion.span>

                {/* Notification dot — shows if fading nodes exist */}
                {!isOpen && fadingCount > 0 && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#ff4466',
                            border: '2px solid #020408',
                        }}
                    />
                )}
            </motion.button>
        </div>
        </>
    );
}
