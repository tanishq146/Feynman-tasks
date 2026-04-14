// ═══════════════════════════════════════════════════════════════════════════
// QuickCapture.jsx — Frictionless AI Chat Capture
//
// The easy alternative to downloading JSON exports.
// Three methods, zero friction:
//   1. Open AI → Select All → Copy → Paste here (simplest)
//   2. Browser console snippet (extracts clean text automatically)
//   3. Bookmarklet (one-click extraction from any AI chat page)
//
// Supports: Claude, ChatGPT, Gemini, and any AI that shows text
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    cyan: '#3DD6F5',
    cyanDim: 'rgba(61, 214, 245, 0.08)',
    purple: '#A78BFA',
    text: '#E8F0F8',
    textMid: 'rgba(232,240,248,0.55)',
    textDim: 'rgba(232,240,248,0.2)',
};

const AI_PLATFORMS = [
    {
        key: 'claude',
        name: 'Claude',
        color: '#D4A574',
        icon: '◆',
        url: 'https://claude.ai',
        consoleSnippet: `// Run this in your browser console on claude.ai
// It copies the current conversation to your clipboard
(function(){
  const msgs = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"], .font-claude-message, .font-user-message, .whitespace-pre-wrap');
  if(msgs.length === 0) {
    // Fallback: grab all readable text from the conversation area
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    navigator.clipboard.writeText(main.innerText).then(() => alert('✓ Conversation copied! Paste it into Engram.'));
    return;
  }
  let text = '';
  msgs.forEach(m => {
    const role = m.closest('[data-testid="user-message"]') ? 'Human' : 'Assistant';
    text += role + ': ' + m.innerText + '\\n\\n';
  });
  navigator.clipboard.writeText(text).then(() => alert('✓ Conversation copied! Paste it into Engram.'));
})();`,
        steps: [
            'Open your Claude conversation',
            'Press F12 or ⌘+Option+J to open Console',
            'Paste the snippet below and press Enter',
            'Come back here and paste (⌘V)',
        ],
    },
    {
        key: 'chatgpt',
        name: 'ChatGPT',
        color: '#74AA9C',
        icon: '◇',
        url: 'https://chatgpt.com',
        consoleSnippet: `// Run this in your browser console on chatgpt.com
// It copies the current conversation to your clipboard
(function(){
  const msgs = document.querySelectorAll('[data-message-author-role]');
  if(msgs.length === 0) {
    const main = document.querySelector('main') || document.body;
    navigator.clipboard.writeText(main.innerText).then(() => alert('✓ Conversation copied! Paste it into Engram.'));
    return;
  }
  let text = '';
  msgs.forEach(m => {
    const role = m.getAttribute('data-message-author-role') === 'user' ? 'Human' : 'Assistant';
    text += role + ': ' + m.innerText + '\\n\\n';
  });
  navigator.clipboard.writeText(text).then(() => alert('✓ Conversation copied! Paste it into Engram.'));
})();`,
        steps: [
            'Open your ChatGPT conversation',
            'Press F12 or ⌘+Option+J to open Console',
            'Paste the snippet below and press Enter',
            'Come back here and paste (⌘V)',
        ],
    },
    {
        key: 'gemini',
        name: 'Gemini',
        color: '#4285F4',
        icon: '◈',
        url: 'https://gemini.google.com',
        consoleSnippet: `// Run this in your browser console on gemini.google.com
// It copies the current conversation to your clipboard
(function(){
  const turns = document.querySelectorAll('message-content, .model-response-text, .query-text, .response-container');
  if(turns.length === 0) {
    const main = document.querySelector('main') || document.querySelector('.conversation-container') || document.body;
    navigator.clipboard.writeText(main.innerText).then(() => alert('✓ Conversation copied! Paste it into Engram.'));
    return;
  }
  let text = '';
  turns.forEach((t, i) => {
    const role = i % 2 === 0 ? 'Human' : 'Assistant';
    text += role + ': ' + t.innerText + '\\n\\n';
  });
  navigator.clipboard.writeText(text).then(() => alert('✓ Conversation copied! Paste it into Engram.'));
})();`,
        steps: [
            'Open your Gemini conversation',
            'Press F12 or ⌘+Option+J to open Console',
            'Paste the snippet below and press Enter',
            'Come back here and paste (⌘V)',
        ],
    },
];


export default function QuickCapture({ isOpen, onClose, onCapture }) {
    const [selectedPlatform, setSelectedPlatform] = useState(null);
    const [capturedText, setCapturedText] = useState('');
    const [snippetCopied, setSnippetCopied] = useState(false);
    const [step, setStep] = useState('choose'); // 'choose' | 'capture' | 'ready'
    const textareaRef = useRef(null);

    // Auto-detect when user pastes content
    const handlePaste = useCallback((e) => {
        const text = e.clipboardData?.getData('text') || '';
        if (text.trim().length > 30) {
            setCapturedText(text.trim());
            setStep('ready');
        }
    }, []);

    // Listen for paste globally when panel is open
    useEffect(() => {
        if (!isOpen || step !== 'capture') return;
        const handler = (e) => {
            // Only intercept if not focused on textarea
            if (document.activeElement !== textareaRef.current) {
                handlePaste(e);
            }
        };
        window.addEventListener('paste', handler);
        return () => window.removeEventListener('paste', handler);
    }, [isOpen, step, handlePaste]);

    const copySnippet = useCallback(async (snippet) => {
        try {
            await navigator.clipboard.writeText(snippet);
            setSnippetCopied(true);
            setTimeout(() => setSnippetCopied(false), 2500);
        } catch { /* */ }
    }, []);

    const handleSubmit = useCallback(() => {
        if (!capturedText.trim() || !selectedPlatform) return;
        onCapture?.({
            content: capturedText.trim(),
            source_ai: selectedPlatform.key,
            title: '',
        });
        // Reset
        setCapturedText('');
        setStep('choose');
        setSelectedPlatform(null);
    }, [capturedText, selectedPlatform, onCapture]);

    const handleReset = () => {
        setStep('choose');
        setSelectedPlatform(null);
        setCapturedText('');
        setSnippetCopied(false);
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
                        width: '100%', maxWidth: '620px',
                        maxHeight: '85vh',
                        background: 'linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,16,0.99))',
                        border: `1px solid ${C.accentBorder}`,
                        borderRadius: '22px',
                        overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 60px rgba(0, 229, 160, 0.04)',
                    }}
                >
                    {/* ═══ Header ═══ */}
                    <div style={{
                        padding: '28px 32px 20px',
                        borderBottom: `1px solid ${C.border}`,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '6px',
                        }}>
                            <span style={{ fontSize: '14px', fontFamily: "'SF Mono', monospace", color: C.accent }}>⇗</span>
                            <span style={{
                                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                color: C.accent, letterSpacing: '3px', textTransform: 'uppercase',
                            }}>Quick Capture</span>
                        </div>
                        <div style={{
                            fontFamily: font, fontSize: '20px', fontWeight: 700,
                            color: C.text, letterSpacing: '-0.5px',
                        }}>
                            {step === 'choose' ? 'Grab from your AI' :
                             step === 'capture' ? `Capture from ${selectedPlatform?.name}` :
                             'Ready to extract'}
                        </div>
                        <div style={{
                            fontFamily: fontMono, fontSize: '11px', color: C.textMid,
                            marginTop: '4px',
                        }}>
                            {step === 'choose' ? 'No file downloads — grab conversations directly' :
                             step === 'capture' ? 'Follow the steps below, then paste the result here' :
                             `${capturedText.length.toLocaleString()} characters captured`}
                        </div>
                    </div>

                    {/* ═══ Content ═══ */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>

                        {/* ─── STEP 1: Choose Platform ─── */}
                        {step === 'choose' && (
                            <div>
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                    marginBottom: '12px',
                                }}>Choose your AI</div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {AI_PLATFORMS.map(platform => (
                                        <motion.button
                                            key={platform.key}
                                            onClick={() => {
                                                setSelectedPlatform(platform);
                                                setStep('capture');
                                            }}
                                            whileHover={{ scale: 1.01, x: 4 }}
                                            whileTap={{ scale: 0.99 }}
                                            style={{
                                                padding: '18px 20px',
                                                borderRadius: '14px',
                                                border: `1px solid ${platform.color}20`,
                                                background: `${platform.color}06`,
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '14px',
                                                textAlign: 'left',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{
                                                width: '42px', height: '42px',
                                                borderRadius: '12px',
                                                background: `${platform.color}15`,
                                                border: `1px solid ${platform.color}25`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '18px', color: platform.color,
                                                flexShrink: 0,
                                            }}>{platform.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontFamily: font, fontSize: '15px', fontWeight: 600,
                                                    color: C.text, marginBottom: '2px',
                                                }}>{platform.name}</div>
                                                <div style={{
                                                    fontFamily: fontMono, fontSize: '10px',
                                                    color: C.textDim,
                                                }}>Open → Extract → Paste — 30 seconds</div>
                                            </div>
                                            <span style={{
                                                fontFamily: fontMono, fontSize: '14px',
                                                color: platform.color, opacity: 0.5,
                                            }}>→</span>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Quick paste alternative */}
                                <div style={{
                                    marginTop: '20px', padding: '14px 18px',
                                    borderRadius: '12px',
                                    border: `1px dashed ${C.border}`,
                                    background: C.surface,
                                    textAlign: 'center',
                                }}>
                                    <div style={{
                                        fontFamily: fontMono, fontSize: '10px',
                                        color: C.textDim, lineHeight: '1.6',
                                    }}>
                                        <strong style={{ color: C.textMid }}>Even simpler:</strong> Just go to your AI chat,
                                        press <span style={{ color: C.accent }}>⌘A</span> (select all) then <span style={{ color: C.accent }}>⌘C</span> (copy),
                                        come back here and use <strong style={{ color: C.textMid }}>Paste Conversation</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── STEP 2: Capture ─── */}
                        {step === 'capture' && selectedPlatform && (
                            <div>
                                {/* Open in new tab button */}
                                <motion.a
                                    href={selectedPlatform.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '14px 20px',
                                        borderRadius: '12px',
                                        background: `${selectedPlatform.color}10`,
                                        border: `1px solid ${selectedPlatform.color}30`,
                                        textDecoration: 'none',
                                        marginBottom: '20px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span style={{
                                        fontFamily: font, fontSize: '14px', fontWeight: 600,
                                        color: selectedPlatform.color,
                                    }}>Open {selectedPlatform.name} →</span>
                                    <span style={{
                                        fontFamily: fontMono, fontSize: '10px',
                                        color: C.textDim, marginLeft: 'auto',
                                    }}>Opens in new tab</span>
                                </motion.a>

                                {/* Method tabs */}
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                    marginBottom: '10px',
                                }}>Method 1: Quick Select & Copy</div>

                                <div style={{
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: C.surface,
                                    border: `1px solid ${C.border}`,
                                    marginBottom: '16px',
                                }}>
                                    <ol style={{
                                        paddingLeft: '20px', margin: 0,
                                    }}>
                                        {[
                                            `Open your ${selectedPlatform.name} conversation`,
                                            'Press ⌘A (select all text on the page)',
                                            'Press ⌘C (copy)',
                                            'Come back here and paste below (⌘V)',
                                        ].map((s, i) => (
                                            <li key={i} style={{
                                                fontFamily: fontMono, fontSize: '11px',
                                                color: C.textMid, lineHeight: '2',
                                            }}>{s}</li>
                                        ))}
                                    </ol>
                                </div>

                                {/* Console snippet method */}
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: C.textDim, letterSpacing: '2px', textTransform: 'uppercase',
                                    marginBottom: '10px',
                                }}>Method 2: Console Snippet (Cleaner Extraction)</div>

                                <div style={{
                                    borderRadius: '12px',
                                    background: 'rgba(0,0,0,0.4)',
                                    border: `1px solid ${C.border}`,
                                    overflow: 'hidden',
                                    marginBottom: '16px',
                                }}>
                                    <div style={{
                                        padding: '10px 14px',
                                        borderBottom: `1px solid ${C.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <span style={{
                                            fontFamily: fontMono, fontSize: '9px',
                                            color: C.textDim, letterSpacing: '1px',
                                        }}>BROWSER CONSOLE SNIPPET</span>
                                        <motion.button
                                            onClick={() => copySnippet(selectedPlatform.consoleSnippet)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                padding: '4px 12px', borderRadius: '6px',
                                                border: 'none',
                                                background: snippetCopied ? C.accentDim : `${selectedPlatform.color}15`,
                                                fontFamily: fontMono, fontSize: '10px', fontWeight: 600,
                                                color: snippetCopied ? C.accent : selectedPlatform.color,
                                                cursor: 'pointer',
                                            }}
                                        >{snippetCopied ? '✓ Copied!' : '⎘ Copy Snippet'}</motion.button>
                                    </div>
                                    <pre style={{
                                        padding: '12px 14px',
                                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                                        fontSize: '10px', color: C.textMid,
                                        lineHeight: '1.6',
                                        overflow: 'auto', maxHeight: '120px',
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                    }}>{selectedPlatform.consoleSnippet}</pre>
                                </div>

                                {/* Steps for console method */}
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: C.accentDim,
                                    border: `1px solid ${C.accentBorder}`,
                                    marginBottom: '16px',
                                }}>
                                    <ol style={{ paddingLeft: '18px', margin: 0 }}>
                                        {selectedPlatform.steps.map((s, i) => (
                                            <li key={i} style={{
                                                fontFamily: fontMono, fontSize: '10px',
                                                color: C.textMid, lineHeight: '1.8',
                                            }}>{s}</li>
                                        ))}
                                    </ol>
                                </div>

                                {/* Paste area */}
                                <div style={{
                                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                    color: C.accent, letterSpacing: '2px', textTransform: 'uppercase',
                                    marginBottom: '8px',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    <motion.span
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >●</motion.span>
                                    Paste captured text here
                                </div>

                                <textarea
                                    ref={textareaRef}
                                    value={capturedText}
                                    onChange={e => {
                                        setCapturedText(e.target.value);
                                        if (e.target.value.trim().length > 30) setStep('ready');
                                    }}
                                    onPaste={(e) => {
                                        const text = e.clipboardData?.getData('text') || '';
                                        if (text.trim().length > 30) {
                                            setCapturedText(text.trim());
                                            setTimeout(() => setStep('ready'), 100);
                                        }
                                    }}
                                    placeholder={`Paste your ${selectedPlatform.name} conversation here...\n\n⌘V to paste`}
                                    style={{
                                        width: '100%', height: '100px',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: C.surface,
                                        border: `1px solid ${C.accentBorder}`,
                                        color: C.text,
                                        fontFamily: fontMono, fontSize: '12px',
                                        lineHeight: '1.6', outline: 'none',
                                        resize: 'none',
                                    }}
                                />
                            </div>
                        )}

                        {/* ─── STEP 3: Ready ─── */}
                        {step === 'ready' && (
                            <div>
                                {/* Success state */}
                                <div style={{
                                    textAlign: 'center', padding: '16px 0 20px',
                                }}>
                                    <div style={{
                                        width: '64px', height: '64px', margin: '0 auto 16px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(0,229,160,0.12), rgba(61,214,245,0.08))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '28px',
                                    }}>✓</div>

                                    <div style={{
                                        fontFamily: font, fontSize: '18px', fontWeight: 700,
                                        color: C.text, marginBottom: '6px',
                                    }}>Conversation Captured!</div>

                                    <div style={{
                                        fontFamily: fontMono, fontSize: '11px',
                                        color: C.textMid, lineHeight: '1.6',
                                    }}>
                                        <strong style={{ color: C.accent }}>{capturedText.length.toLocaleString()}</strong> characters
                                        from <strong style={{ color: selectedPlatform?.color || C.cyan }}>{selectedPlatform?.name || 'AI'}</strong>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div style={{
                                    padding: '14px',
                                    borderRadius: '12px',
                                    background: C.surface,
                                    border: `1px solid ${C.border}`,
                                    marginBottom: '16px',
                                    maxHeight: '120px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}>
                                    <div style={{
                                        fontFamily: fontMono, fontSize: '11px',
                                        color: C.textMid, lineHeight: '1.6',
                                        whiteSpace: 'pre-wrap',
                                    }}>
                                        {capturedText.slice(0, 500)}
                                        {capturedText.length > 500 && '...'}
                                    </div>
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        height: '40px',
                                        background: 'linear-gradient(transparent, rgba(10,12,16,1))',
                                    }} />
                                </div>

                                {/* Action info */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    background: C.accentDim,
                                    border: `1px solid ${C.accentBorder}`,
                                }}>
                                    <div style={{
                                        fontFamily: fontMono, fontSize: '11px',
                                        color: C.textMid, lineHeight: '1.6',
                                    }}>
                                        Clicking <strong style={{ color: C.accent }}>Extract Thoughts</strong> will analyze this conversation
                                        and add the insights to your thinking graph as living nodes.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ Footer ═══ */}
                    <div style={{
                        padding: '16px 32px 20px',
                        borderTop: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <button
                            onClick={step === 'choose' ? onClose : handleReset}
                            style={{
                                padding: '8px 18px', borderRadius: '8px',
                                background: 'none', border: `1px solid ${C.border}`,
                                fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                                color: C.textMid, cursor: 'pointer',
                            }}
                        >{step === 'choose' ? 'Cancel' : '← Back'}</button>

                        {step === 'ready' && (
                            <motion.button
                                onClick={handleSubmit}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    padding: '10px 28px', borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #00E5A0, #3DD6F5)',
                                    color: '#050508',
                                    fontFamily: fontMono, fontSize: '13px', fontWeight: 700,
                                    cursor: 'pointer',
                                    letterSpacing: '0.3px',
                                    boxShadow: '0 4px 24px rgba(0, 229, 160, 0.25)',
                                }}
                            >
                                ◆ Extract Thoughts
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
