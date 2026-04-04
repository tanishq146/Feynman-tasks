// ═══════════════════════════════════════════════════════════════════════════
// NotesWorkspace — Full-screen note-taking workspace
// Like Obsidian, but built into Feynman. Write freely, then let AI
// extract knowledge nodes from your notes.
//
// Features:
//   - Unlimited notes with sidebar navigation
//   - Rich text editing with markdown-style formatting
//   - Image upload (drag-and-drop + button)
//   - Voice recording (Web Audio API)
//   - AI analysis → suggests knowledge nodes
//   - Download notes as markdown
//   - Pin/unpin notes
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import useBrainStore from '../../store/brainStore';
import { useResponsive } from '../../hooks/useResponsive';

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

// ─── Voice Recorder Hook ────────────────────────────────────────────────────

function useVoiceRecorder() {
    const [recording, setRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);
    const timer = useRef(null);
    const startTime = useRef(null);

    const start = useCallback(async () => {
        try {
            // Request high-quality audio with voice optimization
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,     // normalizes volume so voice is clear
                    sampleRate: 48000,          // high sample rate for clarity
                    channelCount: 1,            // mono for voice
                },
            });

            // Pick best supported codec for quality + compatibility
            const mimeType = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
            ].find(m => MediaRecorder.isTypeSupported(m)) || '';

            const options = { audioBitsPerSecond: 128000 };
            if (mimeType) options.mimeType = mimeType;

            const recorder = new MediaRecorder(stream, options);
            chunks.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };
            // Do NOT use timeslice — record continuously for clean, unfragmented audio
            recorder.start();
            mediaRecorder.current = recorder;
            startTime.current = Date.now();
            setRecording(true);
            setDuration(0);
            timer.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime.current) / 1000));
            }, 500);
        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }, []);

    const stop = useCallback(() => {
        return new Promise((resolve) => {
            if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
                resolve(null);
                return;
            }
            clearInterval(timer.current);
            // Request any remaining data before stopping
            mediaRecorder.current.requestData();
            mediaRecorder.current.onstop = () => {
                const mimeType = mediaRecorder.current.mimeType || 'audio/webm';
                const blob = new Blob(chunks.current, { type: mimeType });
                // Stop all mic tracks to release the microphone
                mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
                setRecording(false);
                const dur = Math.floor((Date.now() - startTime.current) / 1000);
                setDuration(dur);
                resolve({ blob, duration: dur, mimeType });
            };
            mediaRecorder.current.stop();
        });
    }, []);

    return { recording, duration, start, stop };
}

// ─── Note Card (Sidebar) ────────────────────────────────────────────────────

function SidebarNote({ note, isActive, onClick }) {
    const preview = (note.content || '').replace(/[#*_\n]/g, ' ').slice(0, 80);
    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `${days}d`;
    };

    return (
        <div
            onClick={onClick}
            style={{
                padding: '12px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isActive ? 'rgba(0, 212, 255, 0.06)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(0, 212, 255, 0.15)' : 'transparent'}`,
                marginBottom: '2px',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                {note.is_pinned && <span style={{ fontSize: '10px', display: 'inline-flex' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="#ffaa00" stroke="#ffaa00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg></span>}
                <div style={{
                    fontFamily: font, fontSize: '13px', fontWeight: 600,
                    color: isActive ? '#e8f4fd' : 'rgba(232, 244, 253, 0.8)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                }}>
                    {note.title || 'Untitled'}
                </div>
                <span style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232, 244, 253, 0.2)', flexShrink: 0 }}>
                    {timeAgo(note.updated_at)}
                </span>
            </div>
            <div style={{
                fontFamily: fontMono, fontSize: '11px',
                color: 'rgba(232, 244, 253, 0.3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {preview || 'Empty note'}
            </div>
            {(note.images?.length > 0 || note.voice_urls?.length > 0) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {note.images?.length > 0 && (
                        <span style={{ fontSize: '9px', color: 'rgba(139, 92, 246, 0.5)' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg> {note.images.length}
                        </span>
                    )}
                    {note.voice_urls?.length > 0 && (
                        <span style={{ fontSize: '9px', color: 'rgba(0, 212, 255, 0.5)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" /></svg>
                            {note.voice_urls.length}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── AI Suggestion Card ─────────────────────────────────────────────────────

function AISuggestion({ suggestion, onApprove, onDismiss, approving }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.06), rgba(139, 92, 246, 0.06))',
                border: '1px solid rgba(0, 212, 255, 0.12)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '8px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: font, fontSize: '13px', fontWeight: 600, color: '#e8f4fd' }}>
                    {suggestion.title}
                </div>
                <span style={{
                    fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                    color: '#00d4ff', background: 'rgba(0, 212, 255, 0.08)',
                    padding: '2px 6px', borderRadius: '4px',
                }}>
                    {suggestion.category}
                </span>
            </div>
            <div style={{
                fontFamily: fontMono, fontSize: '11.5px', lineHeight: '1.55',
                color: 'rgba(232, 244, 253, 0.55)', margin: '6px 0 10px',
            }}>
                {suggestion.content}
            </div>
            {suggestion.source_note_title && (
                <div style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(232, 244, 253, 0.2)', marginBottom: '8px' }}>
                    From: {suggestion.source_note_title}
                </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => onApprove(suggestion)}
                    disabled={approving}
                    style={{
                        flex: 1, padding: '8px 12px',
                        background: approving ? 'rgba(0, 212, 255, 0.1)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                        border: 'none', borderRadius: '8px',
                        color: '#fff', fontSize: '11px', fontWeight: 600, fontFamily: font,
                        cursor: approving ? 'wait' : 'pointer', transition: 'all 0.2s',
                    }}
                >
                    {approving ? 'Creating...' : '✦ Add to Brain'}
                </button>
                <button
                    onClick={() => onDismiss(suggestion)}
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px', color: 'rgba(232, 244, 253, 0.4)',
                        fontSize: '11px', fontFamily: font, cursor: 'pointer',
                    }}
                >
                    Skip
                </button>
            </div>
        </motion.div>
    );
}

// ─── Inline Note Image (resizable, flows in document like Obsidian) ──────────

function InlineNoteImage({ src, width, onResize, onRemove }) {
    const [w, setW] = useState(width || 400);
    const resizing = useRef(false);
    const startRef = useRef({ mx: 0, ow: 0 });

    const startResize = (e) => {
        e.preventDefault();
        resizing.current = true;
        startRef.current = { mx: e.clientX, ow: w };
        const onMove = (ev) => {
            if (!resizing.current) return;
            const nw = Math.max(80, Math.min(800, startRef.current.ow + (ev.clientX - startRef.current.mx)));
            setW(nw);
        };
        const onUp = () => {
            resizing.current = false;
            if (onResize) onResize(w);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div style={{
            position: 'relative', display: 'inline-block', margin: '6px 0',
            borderRadius: '10px', overflow: 'visible', userSelect: 'none',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            background: 'rgba(139, 92, 246, 0.03)',
            transition: 'box-shadow 0.2s',
        }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 16px rgba(139,92,246,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
            <img src={src} alt="" draggable={false}
                style={{ width: w, maxWidth: '100%', display: 'block', borderRadius: '10px', cursor: 'zoom-in' }}
                onClick={() => window.open(src, '_blank')}
            />
            {/* Remove */}
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
                style={{
                    position: 'absolute', top: -6, right: -6, width: '20px', height: '20px', borderRadius: '50%',
                    background: 'rgba(244,63,94,0.85)', border: '2px solid #020814', color: '#fff',
                    fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.15s', zIndex: 5,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                ref={el => {
                    if (!el) return;
                    const parent = el.parentElement;
                    parent.addEventListener('mouseenter', () => el.style.opacity = '1');
                    parent.addEventListener('mouseleave', () => el.style.opacity = '0');
                }}
            >✕</button>
            {/* Resize handle */}
            <div onMouseDown={startResize}
                style={{
                    position: 'absolute', bottom: 2, right: 2, width: '12px', height: '12px',
                    cursor: 'ew-resize', borderRadius: '3px',
                    background: 'rgba(139,92,246,0.5)', opacity: 0, transition: 'opacity 0.15s',
                }}
                ref={el => {
                    if (!el) return;
                    const parent = el.parentElement;
                    parent.addEventListener('mouseenter', () => el.style.opacity = '1');
                    parent.addEventListener('mouseleave', () => el.style.opacity = '0');
                }}
            />
        </div>
    );
}

// ─── Helper: normalize voice entry → { url, name, id } ─────────────────────
function normalizeVoice(entry, index) {
    if (typeof entry === 'string') {
        return { url: entry, name: `Voice Note ${index + 1}`, id: `v-${index}-${entry.slice(-12)}` };
    }
    return {
        url: entry.url || entry,
        name: entry.name || `Voice Note ${index + 1}`,
        id: entry.id || `v-${index}-${(entry.url || '').slice(-12)}`,
    };
}

// ─── Audio Panel (dedicated voice notes section) ─────────────────────────────
// Production-ready voice player. All three historical bugs fixed:
//   Bug 1 (duration 0:00): Imperative loadedmetadata/durationchange listeners
//          + readyState check on mount, so duration is never missed.
//   Bug 2 (100% progress on load): Bulletproof NaN/Infinity guard everywhere;
//          progress clamped to [0,100] before touching DOM.
//   Bug 3 (UI freeze): Zero React re-renders during playback. Progress bar
//          and time display updated exclusively via direct DOM refs. Only
//          play/pause state triggers a React render.

function VoicePlayer({ voiceEntry, index, onRemove, onRename }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [volume, setVolume] = useState(1.0);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(voiceEntry.name);
    const animRef = useRef(null);
    const gainNodeRef = useRef(null);
    const audioCtxRef = useRef(null);
    const sourceConnected = useRef(false);
    const nameInputRef = useRef(null);
    // Direct DOM refs — progress bar + time text are NEVER driven by React state
    const progressBarRef = useRef(null);
    const timeDisplayRef = useRef(null);
    const durationRef = useRef(0);
    const volumeRef = useRef(volume);
    const mountedRef = useRef(true);

    const url = voiceEntry.url;

    // Keep volumeRef in sync (avoids stale closure in setupAudioContext)
    useEffect(() => { volumeRef.current = volume; }, [volume]);

    // ── Object URL lifecycle ─────────────────────────────────────────────
    const [objectUrl, setObjectUrl] = useState(null);
    useEffect(() => {
        let revoke = null;
        if (url && url.startsWith('data:')) {
            try {
                const [header, b64] = url.split(',');
                const mime = header.match(/data:(.*?);/)?.[1] || 'audio/webm';
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: mime });
                const objUrl = URL.createObjectURL(blob);
                setObjectUrl(objUrl);
                revoke = objUrl;
            } catch (e) {
                console.error('Failed to create audio blob URL:', e);
                setObjectUrl(url);
            }
        } else {
            setObjectUrl(url);
        }
        return () => { if (revoke) URL.revokeObjectURL(revoke); };
    }, [url]);

    // ── Web Audio API gain node (volume boost) ───────────────────────────
    const setupAudioContext = useCallback(() => {
        if (!audioRef.current || sourceConnected.current) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaElementSource(audioRef.current);
            const gain = ctx.createGain();
            source.connect(gain);
            gain.connect(ctx.destination);
            gainNodeRef.current = gain;
            gain.gain.value = volumeRef.current * 1.5;
            sourceConnected.current = true;
        } catch (e) {
            if (audioRef.current) audioRef.current.volume = Math.min(1, volumeRef.current);
        }
    }, []);

    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = volume * 1.5;
        } else if (audioRef.current) {
            audioRef.current.volume = Math.min(1, volume);
        }
    }, [volume]);

    // ── Helpers ──────────────────────────────────────────────────────────
    const fmtTime = (s) => {
        if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Bulletproof progress updater — clamps to [0, 100], never allows NaN/Infinity
    const updateProgressDOM = useCallback((currentTime) => {
        const dur = durationRef.current;
        const time = isFinite(currentTime) ? currentTime : 0;
        // Guard: if duration is 0, NaN, or Infinity → progress is 0%
        let pct = (isFinite(dur) && dur > 0) ? (time / dur) * 100 : 0;
        // Clamp to valid range
        if (!isFinite(pct)) pct = 0;
        pct = Math.max(0, Math.min(100, pct));
        if (progressBarRef.current) {
            progressBarRef.current.style.width = `${pct}%`;
        }
        if (timeDisplayRef.current) {
            if (isFinite(dur) && dur > 0) {
                timeDisplayRef.current.textContent = `${fmtTime(time)} / ${fmtTime(dur)}`;
            } else {
                timeDisplayRef.current.textContent = '--:--';
            }
        }
    }, []);

    // rAF tick — writes to DOM only, never calls setState
    const tick = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            updateProgressDOM(audioRef.current.currentTime);
            animRef.current = requestAnimationFrame(tick);
        }
    }, [updateProgressDOM]);

    // ── Imperative audio event listeners (Bug 1 + Bug 3 fix) ─────────────
    // Using addEventListener instead of React's onLoadedMetadata/onEnded
    // guarantees we catch metadata even on cached/instant-load blob audio,
    // and avoids React's synthetic event overhead during playback.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onDurationReady = () => {
            const dur = audio.duration;
            if (isFinite(dur) && dur > 0) {
                durationRef.current = dur;
                if (mountedRef.current) setAudioDuration(dur);
                // Reset progress bar to 0% now that we have a valid duration
                updateProgressDOM(0);
            }
        };

        const onEnded = () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            updateProgressDOM(0);
            if (mountedRef.current) setPlaying(false);
        };

        // Listen for both loadedmetadata AND durationchange:
        // - loadedmetadata: standard path, fires when metadata first loads
        // - durationchange: fallback for Safari/WebKit where duration can
        //   initially be Infinity on blob/data URLs, then corrects later
        audio.addEventListener('loadedmetadata', onDurationReady);
        audio.addEventListener('durationchange', onDurationReady);
        audio.addEventListener('ended', onEnded);

        // If metadata is already loaded (cached audio, fast blob), read it now.
        // readyState >= 1 (HAVE_METADATA) means duration is available.
        if (audio.readyState >= 1 && isFinite(audio.duration) && audio.duration > 0) {
            onDurationReady();
        }

        return () => {
            audio.removeEventListener('loadedmetadata', onDurationReady);
            audio.removeEventListener('durationchange', onDurationReady);
            audio.removeEventListener('ended', onEnded);
        };
    }, [objectUrl, updateProgressDOM]);

    // ── Full cleanup on unmount ──────────────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeAttribute('src');
                audioRef.current.load();
            }
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    // ── Playback controls ───────────────────────────────────────────────
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (!sourceConnected.current) setupAudioContext();
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
        if (playing) {
            audioRef.current.pause();
            cancelAnimationFrame(animRef.current);
            setPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setPlaying(true);
                animRef.current = requestAnimationFrame(tick);
            }).catch((err) => console.error('Playback failed:', err));
        }
    };

    const seek = (e) => {
        const dur = durationRef.current;
        if (!audioRef.current || !isFinite(dur) || dur <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioRef.current.currentTime = pct * dur;
        updateProgressDOM(audioRef.current.currentTime);
    };

    // ── Rename logic ────────────────────────────────────────────────────
    const commitRename = () => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== voiceEntry.name) {
            onRename(index, trimmed);
        } else {
            setEditName(voiceEntry.name);
        }
        setEditing(false);
    };

    useEffect(() => { setEditName(voiceEntry.name); }, [voiceEntry.name]);
    useEffect(() => {
        if (editing && nameInputRef.current) nameInputRef.current.focus();
    }, [editing]);

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', borderRadius: '10px',
            background: 'rgba(0, 212, 255, 0.03)', border: '1px solid rgba(0, 212, 255, 0.08)', transition: 'background 0.2s',
        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.06)'}
           onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.03)'}>
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '20px' }}>
                {editing ? (
                    <input
                        ref={nameInputRef}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditName(voiceEntry.name); setEditing(false); } }}
                        style={{
                            flex: 1, padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                            fontFamily: fontMono, fontWeight: 600, color: '#e8f4fd',
                            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                            outline: 'none',
                        }}
                    />
                ) : (
                    <span
                        onClick={() => setEditing(true)}
                        title="Click to rename"
                        style={{
                            flex: 1, fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
                            color: 'rgba(0,212,255,0.7)', cursor: 'text',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            padding: '2px 0', borderBottom: '1px dashed transparent',
                            transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        {voiceEntry.name}
                    </span>
                )}
                {!editing && (
                    <button onClick={() => setEditing(true)} title="Rename voice note"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                            color: 'rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center',
                            transition: 'color 0.15s', flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,212,255,0.7)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,212,255,0.25)'}
                    >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                )}
                <button onClick={() => onRemove(index)} title="Remove voice note"
                    style={{
                        background: 'none', border: 'none', color: 'rgba(244, 63, 94, 0.3)', fontSize: '10px',
                        cursor: 'pointer', padding: '2px', flexShrink: 0, transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(244, 63, 94, 0.3)'}
                >✕</button>
            </div>
            {/* Player controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Audio element — no React event handlers, all imperative */}
                <audio ref={audioRef} src={objectUrl} preload="auto" style={{ display: 'none' }} />
                {/* Play/Pause */}
                <button onClick={togglePlay} style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: playing ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff',
                    transition: 'all 0.15s',
                }}>
                    {playing ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#00d4ff"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#00d4ff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                </button>
                {/* Progress bar — direct DOM ref, zero re-renders during playback */}
                <div onClick={seek} style={{
                    flex: 1, height: '5px', background: 'rgba(0,212,255,0.08)', borderRadius: '3px',
                    cursor: 'pointer', position: 'relative', minWidth: 0,
                }}>
                    <div ref={progressBarRef} style={{
                        width: '0%',
                        height: '100%', borderRadius: '3px',
                        background: 'linear-gradient(90deg, #00d4ff, #8b5cf6)',
                        willChange: 'width',
                    }} />
                </div>
                {/* Time display — direct DOM ref, zero re-renders during playback */}
                <span ref={timeDisplayRef} style={{ fontFamily: fontMono, fontSize: '9px', color: 'rgba(0,212,255,0.4)', flexShrink: 0 }}>
                    {audioDuration > 0 ? `0:00 / ${fmtTime(audioDuration)}` : '--:--'}
                </span>
                {/* Volume */}
                <input type="range" min="0" max="2" step="0.1" value={volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    title={`Volume: ${Math.round(volume * 100)}%`}
                    style={{ width: '40px', accentColor: '#00d4ff', flexShrink: 0 }} />
            </div>
        </div>
    );
}

export default function NotesWorkspace({ isOpen, onClose }) {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAI, setShowAI] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [approvingTitle, setApprovingTitle] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [showAudioPanel, setShowAudioPanel] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { isMobile, isTouchDevice } = useResponsive();

    const addToast = useBrainStore(s => s.addToast);
    const editorRef = useRef(null);
    const saveTimerRef = useRef(null);
    const fileInputRef = useRef(null);
    const notesRef = useRef(notes);
    notesRef.current = notes;
    const activeNoteIdRef = useRef(activeNoteId);
    activeNoteIdRef.current = activeNoteId;
    const { recording, duration, start: startRecording, stop: stopRecording } = useVoiceRecorder();

    const activeNote = notes.find(n => n.id === activeNoteId) || null;

    // ─── Fetch Notes ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        fetchNotes();
    }, [isOpen]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/workspace/notes');
            const fetched = res.data.notes || [];
            setNotes(fetched);
            if (fetched.length > 0 && !activeNoteId) {
                setActiveNoteId(fetched[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch workspace notes:', err);
        }
        setLoading(false);
    };

    // ─── Auto-save on content change ────────────────────────────────────
    const saveNote = useCallback(async (noteId, updates) => {
        // Don't try to save notes that haven't been persisted to server yet
        if (!noteId || String(noteId).startsWith('temp-')) return;
        setSaving(true);
        try {
            const res = await api.put(`/api/workspace/notes/${noteId}`, updates);
            const serverNote = res.data.note;
            // Merge only the saved fields from server into local note.
            // This prevents overwriting unsaved local text when saving images/voice.
            setNotes(prev => prev.map(n => {
                if (n.id !== noteId) return n;
                const merged = { ...n };
                // Always take server's updated_at
                merged.updated_at = serverNote.updated_at;
                // Only overwrite fields that were actually in the updates payload
                if (updates.title !== undefined) merged.title = serverNote.title;
                if (updates.content !== undefined) merged.content = serverNote.content;
                if (updates.images !== undefined) merged.images = serverNote.images;
                if (updates.voice_urls !== undefined) merged.voice_urls = serverNote.voice_urls;
                if (updates.is_pinned !== undefined) merged.is_pinned = serverNote.is_pinned;
                return merged;
            }));
        } catch (err) {
            console.error('Auto-save failed:', err);
        }
        setSaving(false);
    }, []);

    const handleContentChange = useCallback((e) => {
        const newContent = e.target.value;
        setNotes(prev => prev.map(n =>
            n.id === activeNoteId ? { ...n, content: newContent, updated_at: new Date().toISOString() } : n
        ));
        // Debounced auto-save
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveNote(activeNoteId, { content: newContent });
        }, 1000);
    }, [activeNoteId, saveNote]);

    const handleTitleChange = useCallback((e) => {
        const newTitle = e.target.value;
        setNotes(prev => prev.map(n =>
            n.id === activeNoteId ? { ...n, title: newTitle, updated_at: new Date().toISOString() } : n
        ));
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveNote(activeNoteId, { title: newTitle });
        }, 1000);
    }, [activeNoteId, saveNote]);

    // ─── Create Note ────────────────────────────────────────────────────
    const handleNewNote = async () => {
        // Optimistic: add note to UI immediately with temp ID
        const tempId = `temp-${Date.now()}`;
        const now = new Date().toISOString();
        const tempNote = {
            id: tempId,
            title: 'Untitled',
            content: '',
            images: [],
            voice_urls: [],
            is_pinned: false,
            created_at: now,
            updated_at: now,
        };
        setNotes(prev => [tempNote, ...prev]);
        setActiveNoteId(tempId);

        try {
            const res = await api.post('/api/workspace/notes', {
                title: 'Untitled',
                content: '',
            });
            const newNote = res.data.note;
            // Replace temp note with real note from server
            setNotes(prev => prev.map(n => n.id === tempId ? newNote : n));
            setActiveNoteId(newNote.id);
        } catch (err) {
            console.error('Failed to create note:', err?.response?.data || err);
            // Keep the temp note — user can still write locally
            // It just won't be saved to server until connectivity is restored
        }
    };

    // ─── Delete Note ────────────────────────────────────────────────────
    const handleDeleteNote = async (noteId) => {
        try {
            await api.delete(`/api/workspace/notes/${noteId}`);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            if (activeNoteId === noteId) {
                const remaining = notes.filter(n => n.id !== noteId);
                setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
            }
            addToast({ type: 'success', icon: '✓', message: 'Note deleted', duration: 2000 });
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    // ─── Pin/Unpin ──────────────────────────────────────────────────────
    const handleTogglePin = async (noteId) => {
        try {
            const res = await api.post(`/api/workspace/notes/${noteId}/pin`);
            setNotes(prev => {
                const updated = prev.map(n => n.id === noteId ? res.data.note : n);
                return updated.sort((a, b) => {
                    if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
                    return new Date(b.updated_at) - new Date(a.updated_at);
                });
            });
        } catch (err) {
            console.error('Failed to toggle pin:', err);
        }
    };

    // ─── Image Upload ───────────────────────────────────────────────────
    const uploadImage = async (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const mimeType = file.type || 'image/png';
                    const res = await api.post('/api/workspace/upload/image', {
                        base64: e.target.result,
                        mimeType,
                    });
                    resolve(res.data.url);
                } catch (err) {
                    console.error('Image upload failed:', err);
                    resolve(null);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || e.dataTransfer?.files || []);
        const currentNoteId = activeNoteIdRef.current;
        if (!currentNoteId || String(currentNoteId).startsWith('temp-')) {
            addToast({ type: 'danger', icon: '✕', message: 'Save the note first before adding images', duration: 3000 });
            return;
        }
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                addToast({ type: 'danger', icon: '✕', message: 'Image too large (max 5MB)', duration: 3000 });
                continue;
            }
            if (!file.type.startsWith('image/')) continue;
            const url = await uploadImage(file);
            if (url) {
                const latestNote = notesRef.current.find(n => n.id === currentNoteId);
                const existingImages = latestNote?.images || [];
                const imgIndex = existingImages.length;
                const newImages = [...existingImages, url];
                // Insert image marker at cursor position in content
                const cursorPos = editorRef.current?.selectionStart ?? (latestNote?.content || '').length;
                const content = latestNote?.content || '';
                const marker = `\n![img:${imgIndex}]\n`;
                const newContent = content.slice(0, cursorPos) + marker + content.slice(cursorPos);
                await saveNote(currentNoteId, { images: newImages, content: newContent });
                addToast({ type: 'success', icon: '✓', message: 'Image added', duration: 2000 });
            } else {
                addToast({ type: 'danger', icon: '✕', message: 'Image upload failed', duration: 3000 });
            }
        }
        if (e.target?.value) e.target.value = '';
    };

    const handleRemoveImage = async (imgIndex) => {
        const currentNoteId = activeNoteIdRef.current;
        if (!currentNoteId) return;
        const latestNote = notesRef.current.find(n => n.id === currentNoteId);
        if (!latestNote) return;
        // Remove the image and its marker from content
        const newImages = (latestNote.images || []).filter((_, i) => i !== imgIndex);
        let newContent = (latestNote.content || '').replace(new RegExp(`\\n?!\\[img:${imgIndex}\\]\\n?`, 'g'), '\n');
        // Reindex remaining markers
        for (let i = imgIndex + 1; i <= (latestNote.images || []).length; i++) {
            newContent = newContent.replace(new RegExp(`!\\[img:${i}\\]`, 'g'), `![img:${i - 1}]`);
        }
        await saveNote(currentNoteId, { images: newImages, content: newContent.trim() });
    };

    // ─── Voice Recording ────────────────────────────────────────────────
    const handleVoiceToggle = async () => {
        if (recording) {
            const result = await stopRecording();
            const currentNoteId = activeNoteIdRef.current;
            if (result && currentNoteId && !String(currentNoteId).startsWith('temp-')) {
                // Upload voice note
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const res = await api.post('/api/workspace/upload/voice', {
                            base64: e.target.result,
                            mimeType: result.mimeType,
                            duration: result.duration,
                        });
                        // Use ref to get latest note state (avoid stale closure)
                        const latestNote = notesRef.current.find(n => n.id === currentNoteId);
                        const existingVoice = (latestNote?.voice_urls || []).map((v, i) => normalizeVoice(v, i));
                        const newEntry = {
                            url: res.data.url,
                            name: `Voice Note ${existingVoice.length + 1}`,
                            id: `v-${Date.now()}`,
                        };
                        const newVoice = [...existingVoice, newEntry];
                        await saveNote(currentNoteId, { voice_urls: newVoice });
                        setShowAudioPanel(true);
                        addToast({ type: 'success', icon: '◉', message: `Voice note saved (${result.duration}s)`, duration: 3000 });
                    } catch (err) {
                        console.error('Voice upload failed:', err);
                        addToast({ type: 'danger', icon: '✕', message: 'Voice upload failed', duration: 3000 });
                    }
                };
                reader.readAsDataURL(result.blob);
            }
        } else {
            startRecording();
        }
    };

    const handleRemoveVoice = async (index) => {
        const currentNoteId = activeNoteIdRef.current;
        if (!currentNoteId) return;
        const latestNote = notesRef.current.find(n => n.id === currentNoteId);
        if (!latestNote) return;
        const normalized = (latestNote.voice_urls || []).map((v, i) => normalizeVoice(v, i));
        const newVoice = normalized.filter((_, i) => i !== index);
        await saveNote(currentNoteId, { voice_urls: newVoice });
    };

    const handleRenameVoice = async (index, newName) => {
        const currentNoteId = activeNoteIdRef.current;
        if (!currentNoteId) return;
        const latestNote = notesRef.current.find(n => n.id === currentNoteId);
        if (!latestNote) return;
        const normalized = (latestNote.voice_urls || []).map((v, i) => normalizeVoice(v, i));
        normalized[index] = { ...normalized[index], name: newName };
        await saveNote(currentNoteId, { voice_urls: normalized });
    };

    // ─── Drop Handler ───────────────────────────────────────────────────
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleImageUpload(e);
    }, [activeNoteId, notes]);

    // ─── AI Analysis ────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        setAnalyzing(true);
        setSuggestions([]);
        setShowAI(true);
        try {
            const res = await api.post('/api/workspace/analyze', {
                noteIds: activeNoteId ? [activeNoteId] : [],
            });
            setSuggestions(res.data.suggestions || []);
        } catch (err) {
            console.error('AI analysis failed:', err);
            addToast({ type: 'danger', icon: '✕', message: 'Analysis failed', duration: 3000 });
        }
        setAnalyzing(false);
    };

    const handleAnalyzeAll = async () => {
        setAnalyzing(true);
        setSuggestions([]);
        setShowAI(true);
        try {
            const res = await api.post('/api/workspace/analyze', {});
            setSuggestions(res.data.suggestions || []);
        } catch (err) {
            console.error('AI analysis failed:', err);
        }
        setAnalyzing(false);
    };

    const handleApproveSuggestion = async (suggestion) => {
        setApprovingTitle(suggestion.title);
        try {
            await api.post('/api/knowledge/ingest', {
                content: `${suggestion.title}: ${suggestion.content}`,
            });
            setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
            addToast({ type: 'success', icon: '✦', message: `"${suggestion.title}" added to brain`, duration: 3000 });
        } catch (err) {
            console.error('Failed to create node:', err);
        }
        setApprovingTitle(null);
    };

    // ─── Download Note ──────────────────────────────────────────────────
    const handleDownload = () => {
        if (!activeNote) return;
        const markdown = `# ${activeNote.title}\n\n${activeNote.content}`;
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(activeNote.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Search Filter ──────────────────────────────────────────────────
    const filteredNotes = searchQuery
        ? notes.filter(n =>
            (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (n.content || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : notes;

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: '#020814',
                display: 'flex',
                fontFamily: font,
                animation: 'notesWorkspaceFadeIn 0.3s ease',
            }}
        >
            {/* ═══ SIDEBAR OVERLAY BACKDROP (mobile only) ═══ */}
            {isMobile && sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 301,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                />
            )}

            {/* ═══ SIDEBAR ═══════════════════════════════════════════════════ */}
            <div style={{
                width: isMobile ? '280px' : '280px',
                flexShrink: 0,
                background: 'rgba(2, 8, 20, 0.98)',
                borderRight: '1px solid rgba(0, 212, 255, 0.06)',
                display: 'flex', flexDirection: 'column',
                // Mobile: overlay sidebar
                ...(isMobile ? {
                    position: 'fixed',
                    top: 0,
                    bottom: 0,
                    left: sidebarOpen ? 0 : '-290px',
                    zIndex: 302,
                    transition: 'left 0.3s cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: sidebarOpen ? '4px 0 30px rgba(0,0,0,0.5)' : 'none',
                } : {}),
            }}>
                {/* Sidebar Header */}
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{
                            fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                            color: 'rgba(0, 212, 255, 0.4)', letterSpacing: '2px', textTransform: 'uppercase',
                        }}>
                            NOTES
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '8px', width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(232, 244, 253, 0.4)', fontSize: '12px', cursor: 'pointer',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Search */}
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                        style={{
                            width: '100%', padding: '8px 12px',
                            background: 'rgba(0, 212, 255, 0.03)',
                            border: '1px solid rgba(0, 212, 255, 0.06)',
                            borderRadius: '8px', color: '#e8f4fd',
                            fontSize: '12px', fontFamily: fontMono,
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />

                    {/* New Note Button */}
                    <button
                        onClick={handleNewNote}
                        style={{
                            width: '100%', marginTop: '8px', padding: '10px',
                            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(139, 92, 246, 0.08))',
                            border: '1px solid rgba(0, 212, 255, 0.1)',
                            borderRadius: '10px', color: '#00d4ff',
                            fontSize: '12px', fontWeight: 600, fontFamily: font,
                            cursor: 'pointer', transition: 'all 0.2s',
                            letterSpacing: '0.5px',
                        }}
                    >
                        + New Note
                    </button>
                </div>

                {/* Notes List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(232, 244, 253, 0.2)', fontSize: '12px' }}>
                            Loading...
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(232, 244, 253, 0.2)' }}>
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', opacity: 0.3 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M8 3v4h8V3"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg></div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                {searchQuery ? 'No matching notes' : 'No notes yet'}
                            </div>
                            <div style={{ fontSize: '11px', marginTop: '4px', fontFamily: fontMono }}>
                                {searchQuery ? 'Try a different search' : 'Click "+ New Note" to start'}
                            </div>
                        </div>
                    ) : (
                        filteredNotes.map(note => (
                            <SidebarNote
                                key={note.id}
                                note={note}
                                isActive={note.id === activeNoteId}
                                onClick={() => {
                                    setActiveNoteId(note.id);
                                    if (isMobile) setSidebarOpen(false);
                                }}
                            />
                        ))
                    )}
                </div>

                {/* Sidebar Footer — AI Analyze All */}
                {notes.length > 0 && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                            onClick={handleAnalyzeAll}
                            disabled={analyzing}
                            style={{
                                width: '100%', padding: '10px',
                                background: analyzing
                                    ? 'rgba(0, 212, 255, 0.06)'
                                    : 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(139, 92, 246, 0.1))',
                                border: '1px solid rgba(0, 212, 255, 0.12)',
                                borderRadius: '10px', color: '#67e8f9',
                                fontSize: '11px', fontWeight: 600, fontFamily: font,
                                cursor: analyzing ? 'wait' : 'pointer',
                                transition: 'all 0.2s', letterSpacing: '0.5px',
                            }}
                        >
                            {analyzing ? '✦ Analyzing...' : '✦ Feynman Analyze All'}
                        </button>
                    </div>
                )}
            </div>

            {/* ═══ EDITOR ════════════════════════════════════════════════════ */}
            <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                {/* Drop overlay */}
                {dragOver && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        background: 'rgba(0, 212, 255, 0.06)',
                        border: '2px dashed rgba(0, 212, 255, 0.3)',
                        borderRadius: '0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', color: '#00d4ff', fontWeight: 600,
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg> Drop image here
                    </div>
                )}

                {activeNote ? (
                    <>
                        {/* Editor Toolbar */}
                        <div style={{
                            padding: isMobile ? '10px 12px' : '12px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            flexShrink: 0,
                            flexWrap: isMobile ? 'wrap' : 'nowrap',
                        }}>
                            {/* Sidebar toggle (mobile only) */}
                            {isMobile && (
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    title="Open sidebar"
                                    style={{
                                        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)',
                                        borderRadius: '8px', width: '32px', height: '32px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: '#00d4ff', flexShrink: 0,
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <line x1="3" y1="6" x2="21" y2="6"/>
                                        <line x1="3" y1="12" x2="21" y2="12"/>
                                        <line x1="3" y1="18" x2="21" y2="18"/>
                                    </svg>
                                </button>
                            )}
                            {/* Pin */}
                            <button
                                onClick={() => handleTogglePin(activeNoteId)}
                                title={activeNote.is_pinned ? 'Unpin' : 'Pin'}
                                style={{
                                    background: activeNote.is_pinned ? 'rgba(255, 170, 0, 0.1)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${activeNote.is_pinned ? 'rgba(255,170,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                    borderRadius: '8px', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', cursor: 'pointer',
                                }}
                            ><svg width="13" height="13" viewBox="0 0 24 24" fill={activeNote.is_pinned ? '#ffaa00' : 'none'} stroke={activeNote.is_pinned ? '#ffaa00' : 'rgba(232,244,253,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg></button>

                            {/* Image upload */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                title="Add image"
                                style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '8px', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', cursor: 'pointer', color: '#8b5cf6',
                                }}
                            ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg></button>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple
                                onChange={handleImageUpload} style={{ display: 'none' }} />

                            {/* Voice record */}
                            <button
                                onClick={handleVoiceToggle}
                                title={recording ? 'Stop recording' : 'Record voice note'}
                                style={{
                                    background: recording ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${recording ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                                    borderRadius: '8px', width: recording ? 'auto' : '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    fontSize: '13px', cursor: 'pointer', padding: recording ? '0 12px' : '0',
                                    color: recording ? '#f43f5e' : '#00d4ff',
                                }}
                            >
                                {recording ? (
                                    <>
                                        <motion.div
                                            animate={{ opacity: [1, 0.3, 1] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                            style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }}
                                        />
                                        <span style={{ fontFamily: fontMono, fontSize: '11px', fontWeight: 600 }}>
                                            {duration}s
                                        </span>
                                    </>
                                ) : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" /></svg>}
                            </button>

                            {/* AI Analyze */}
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                title="AI: Extract knowledge"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.06), rgba(139, 92, 246, 0.06))',
                                    border: '1px solid rgba(0, 212, 255, 0.1)',
                                    borderRadius: '8px', height: '32px', padding: '0 12px',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '11px', fontWeight: 600, fontFamily: font,
                                    color: '#67e8f9', cursor: analyzing ? 'wait' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                ✦ {analyzing ? 'Analyzing...' : 'Feynman Analyze'}
                            </button>

                            <div style={{ flex: 1 }} />

                            {/* Download */}
                            <button
                                onClick={handleDownload}
                                title="Download as .md"
                                style={{
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '8px', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', cursor: 'pointer',
                                }}
                            ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(232,244,253,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>

                            {/* Delete */}
                            <button
                                onClick={() => handleDeleteNote(activeNoteId)}
                                title="Delete note"
                                style={{
                                    background: 'rgba(244, 63, 94, 0.04)', border: '1px solid rgba(244, 63, 94, 0.1)',
                                    borderRadius: '8px', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', cursor: 'pointer',
                                }}
                            ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,63,94,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>

                            {/* Save indicator */}
                            <span style={{
                                fontFamily: fontMono, fontSize: '9px',
                                color: saving ? '#ffaa00' : 'rgba(0, 255, 136, 0.4)',
                                letterSpacing: '0.5px',
                            }}>
                                {saving ? 'saving...' : 'saved'}
                            </span>
                        </div>

                        {/* Editor Content Area */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Main Editor */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* Title */}
                                <input
                                    value={activeNote.title || ''}
                                    onChange={handleTitleChange}
                                    placeholder="Note title..."
                                    style={{
                                        padding: isMobile ? '16px 16px 6px' : '24px 40px 8px',
                                        background: 'none', border: 'none', outline: 'none',
                                        fontFamily: font, fontSize: isMobile ? '22px' : '28px', fontWeight: 700,
                                        color: '#e8f4fd', letterSpacing: '-0.5px',
                                    }}
                                />

                                {/* ═══ BLOCK EDITOR — text + inline images like Obsidian ═══ */}
                                <div style={{ flex: 1, minHeight: 0, padding: isMobile ? '6px 16px 24px' : '8px 40px 40px', overflowY: 'auto' }}>
                                    {(() => {
                                        const content = activeNote.content || '';
                                        const images = activeNote.images || [];
                                        // Split content by ![img:N] markers
                                        const parts = content.split(/(\!\[img:\d+\])/);
                                        if (parts.length <= 1 && images.length === 0) {
                                            // No images — render simple textarea
                                            return (
                                                <textarea
                                                    ref={editorRef}
                                                    value={content}
                                                    onChange={handleContentChange}
                                                    placeholder={"Start writing your thoughts...\n\nFeynman can extract knowledge nodes from your notes using AI."}
                                                    style={{
                                                        width: '100%', minHeight: '300px', height: '100%',
                                                        background: 'none', border: 'none', outline: 'none',
                                                        resize: 'none',
                                                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                                        fontSize: '15px', lineHeight: '1.75',
                                                        color: 'rgba(232, 244, 253, 0.85)',
                                                        letterSpacing: '0.2px',
                                                    }}
                                                />
                                            );
                                        }
                                        // Render blocks: text segments + inline images
                                        return parts.map((part, pi) => {
                                            const imgMatch = part.match(/^\!\[img:(\d+)\]$/);
                                            if (imgMatch) {
                                                const idx = parseInt(imgMatch[1]);
                                                const imgUrl = typeof images[idx] === 'object' ? images[idx]?.url : images[idx];
                                                if (!imgUrl) return null;
                                                return (
                                                    <div key={`img-${idx}`} style={{ padding: '4px 0' }}>
                                                        <InlineNoteImage
                                                            src={imgUrl}
                                                            width={400}
                                                            onRemove={() => handleRemoveImage(idx)}
                                                        />
                                                    </div>
                                                );
                                            }
                                            // Text segment — use a textarea
                                            return (
                                                <textarea
                                                    key={`text-${pi}`}
                                                    ref={pi === 0 ? editorRef : undefined}
                                                    value={part}
                                                    onChange={(e) => {
                                                        // Rebuild content from all parts
                                                        const newParts = [...parts];
                                                        newParts[pi] = e.target.value;
                                                        const newContent = newParts.join('');
                                                        setNotes(prev => prev.map(n =>
                                                            n.id === activeNoteId ? { ...n, content: newContent, updated_at: new Date().toISOString() } : n
                                                        ));
                                                        clearTimeout(saveTimerRef.current);
                                                        saveTimerRef.current = setTimeout(() => {
                                                            saveNote(activeNoteId, { content: newContent });
                                                        }, 1000);
                                                    }}
                                                    placeholder={pi === 0 ? "Start writing your thoughts..." : ""}
                                                    style={{
                                                        width: '100%', minHeight: part.trim() ? undefined : '60px',
                                                        height: part ? `${Math.max(40, (part.split('\n').length + 1) * 26)}px` : '60px',
                                                        background: 'none', border: 'none', outline: 'none',
                                                        resize: 'none',
                                                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                                                        fontSize: '15px', lineHeight: '1.75',
                                                        color: 'rgba(232, 244, 253, 0.85)',
                                                        letterSpacing: '0.2px', display: 'block',
                                                    }}
                                                />
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* AI Suggestions Panel */}
                            <AnimatePresence>
                                {showAI && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 320, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        style={{
                                            borderLeft: '1px solid rgba(0, 212, 255, 0.06)',
                                            background: 'rgba(2, 8, 20, 0.5)',
                                            overflow: 'hidden',
                                            display: 'flex', flexDirection: 'column',
                                        }}
                                    >
                                        <div style={{
                                            padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <span style={{
                                                fontFamily: fontMono, fontSize: '9px', fontWeight: 600,
                                                color: 'rgba(0, 212, 255, 0.5)', letterSpacing: '2px',
                                            }}>
                                                ✦ AI EXTRACTION
                                            </span>
                                            <button
                                                onClick={() => setShowAI(false)}
                                                style={{
                                                    background: 'none', border: 'none', color: 'rgba(232,244,253,0.3)',
                                                    fontSize: '12px', cursor: 'pointer',
                                                }}
                                            >✕</button>
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                            {analyzing ? (
                                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(232,244,253,0.3)', fontSize: '12px' }}>
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                                        style={{
                                                            width: '24px', height: '24px',
                                                            border: '2px solid rgba(0, 212, 255, 0.1)',
                                                            borderTop: '2px solid #00d4ff',
                                                            borderRadius: '50%', margin: '0 auto 12px',
                                                        }}
                                                    />
                                                    Reading your notes...
                                                </div>
                                            ) : suggestions.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(232,244,253,0.25)', fontSize: '12px' }}>
                                                    No knowledge topics extracted yet. Write some notes and click "Extract Knowledge".
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{
                                                        fontFamily: fontMono, fontSize: '10px',
                                                        color: 'rgba(232, 244, 253, 0.3)', marginBottom: '12px',
                                                    }}>
                                                        {suggestions.length} topic{suggestions.length !== 1 ? 's' : ''} found — approve to add to your brain
                                                    </div>
                                                    <AnimatePresence>
                                                        {suggestions.map(s => (
                                                            <AISuggestion
                                                                key={s.title}
                                                                suggestion={s}
                                                                onApprove={handleApproveSuggestion}
                                                                onDismiss={s => setSuggestions(prev => prev.filter(x => x.title !== s.title))}
                                                                approving={approvingTitle === s.title}
                                                            />
                                                        ))}
                                                    </AnimatePresence>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ═══ VOICE NOTES PANEL — sits cleanly below editor+AI row, never overlaps ═══ */}
                        {activeNote.voice_urls?.length > 0 && (
                            <div style={{
                                borderTop: '1px solid rgba(0, 212, 255, 0.08)',
                                background: 'rgba(0, 212, 255, 0.02)',
                                flexShrink: 0,
                            }}>
                                {/* Toggle header */}
                                <button onClick={() => setShowAudioPanel(prev => !prev)} style={{
                                    width: '100%', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" />
                                    </svg>
                                    <span style={{ fontFamily: fontMono, fontSize: '10px', fontWeight: 600, color: 'rgba(0,212,255,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                        Voice Notes ({activeNote.voice_urls.length})
                                    </span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ marginLeft: 'auto', transform: showAudioPanel ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                                {/* Expanded panel */}
                                {showAudioPanel && (
                                    <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                                        {activeNote.voice_urls.map((entry, i) => {
                                            const normalized = normalizeVoice(entry, i);
                                            return (
                                                <VoicePlayer
                                                    key={normalized.id}
                                                    voiceEntry={normalized}
                                                    index={i}
                                                    onRemove={handleRemoveVoice}
                                                    onRename={handleRenameVoice}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty state */
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: '12px',
                    }}>
                        <div style={{ opacity: 0.3, display: 'flex', justifyContent: 'center' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M8 3v4h8V3"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg></div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(232, 244, 253, 0.3)' }}>
                            {notes.length > 0 ? 'Select a note' : 'Create your first note'}
                        </div>
                        {notes.length === 0 && (
                            <button
                                onClick={handleNewNote}
                                style={{
                                    padding: '12px 24px', marginTop: '8px',
                                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                                    border: 'none', borderRadius: '12px',
                                    color: '#fff', fontSize: '14px', fontWeight: 600,
                                    cursor: 'pointer', fontFamily: font,
                                }}
                            >
                                + New Note
                            </button>
                        )}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes notesWorkspaceFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
