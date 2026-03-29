// ─── Study Mode ─────────────────────────────────────────────────────────────
// Adaptive flashcard system with AI-generated questions, grading, and feedback.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';
import {
    generateStudyQuestions,
    gradeStudyAnswer,
    getSessionSummary,
} from '../../hooks/useBrainData';

// ─── Streak Helpers ─────────────────────────────────────────────────────────

function getStreak() {
    const raw = localStorage.getItem('feynman_study_streak');
    if (!raw) return { count: 0, lastDate: null };
    try { return JSON.parse(raw); } catch { return { count: 0, lastDate: null }; }
}

function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const streak = getStreak();
    if (streak.lastDate === today) return streak.count;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
    localStorage.setItem('feynman_study_streak', JSON.stringify({ count: newCount, lastDate: today }));
    return newCount;
}


// ─── Sub-Components ────────────────────────────────────────────────────────

const font = "'SF Pro Display', -apple-system, sans-serif";
const fontMono = "'SF Pro Text', -apple-system, sans-serif";

const glassCard = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
};

function ProgressBar({ value, max, color = '#00d4ff' }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: '3px', background: `linear-gradient(90deg, ${color}, ${color}88)` }}
            />
        </div>
    );
}

function ScoreBar({ score }) {
    const color = score >= 80 ? '#00ff88' : score >= 60 ? '#ffaa00' : '#ff4466';
    return (
        <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                style={{ height: '100%', borderRadius: '5px', background: `linear-gradient(90deg, ${color}, ${color}88)` }}
            />
        </div>
    );
}

function DifficultyBadge({ difficulty }) {
    const colors = {
        easy: { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.2)', text: '#00ff88' },
        medium: { bg: 'rgba(255,170,0,0.1)', border: 'rgba(255,170,0,0.2)', text: '#ffaa00' },
        hard: { bg: 'rgba(255,68,102,0.1)', border: 'rgba(255,68,102,0.2)', text: '#ff4466' },
    };
    const c = colors[difficulty] || colors.easy;
    return (
        <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: '8px',
            background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            fontFamily: fontMono, fontSize: '11px', fontWeight: 600,
            letterSpacing: '1px', textTransform: 'uppercase',
        }}>
            {difficulty}
        </span>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// SESSION SETUP SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function StudySetup({ nodes, fadingNodes, onStart, onClose }) {
    const [mode, setMode] = useState(fadingNodes.length > 0 ? 'fading' : 'all');
    const [count, setCount] = useState(5);

    const targetNodes = mode === 'fading' ? fadingNodes : nodes;
    const available = targetNodes.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px' }}
        >
            <span style={{ fontSize: '40px', marginBottom: '16px' }}>📚</span>
            <h2 style={{ fontFamily: font, fontSize: '28px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Study Mode
            </h2>
            <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#4a9eba', marginBottom: '40px', textAlign: 'center', maxWidth: '400px' }}>
                Test your knowledge with adaptive flashcards. Feynman will quiz you and explain what you missed.
            </p>

            {/* Mode selector */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
                <button
                    onClick={() => setMode('all')}
                    style={{
                        ...glassCard, padding: '14px 24px', cursor: 'pointer',
                        background: mode === 'all' ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${mode === 'all' ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: mode === 'all' ? '#00d4ff' : '#7a8a9e',
                        fontFamily: fontMono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px',
                        transition: 'all 0.2s',
                    }}
                >
                    All nodes ({nodes.length})
                </button>
                <button
                    onClick={() => setMode('fading')}
                    disabled={fadingNodes.length === 0}
                    style={{
                        ...glassCard, padding: '14px 24px', cursor: fadingNodes.length > 0 ? 'pointer' : 'not-allowed',
                        background: mode === 'fading' ? 'rgba(255,68,102,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${mode === 'fading' ? 'rgba(255,68,102,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: mode === 'fading' ? '#ff4466' : '#7a8a9e',
                        fontFamily: fontMono, fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px',
                        opacity: fadingNodes.length > 0 ? 1 : 0.4,
                        transition: 'all 0.2s',
                    }}
                >
                    🔴 Fading only ({fadingNodes.length})
                </button>
            </div>

            {/* Question count */}
            <div style={{ marginBottom: '36px' }}>
                <p style={{ fontFamily: fontMono, fontSize: '11px', color: '#4a9eba', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
                    Questions
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {[5, 10, 20].map(n => (
                        <button
                            key={n}
                            onClick={() => setCount(Math.min(n, available))}
                            disabled={available < 1}
                            style={{
                                width: '52px', height: '52px', borderRadius: '12px',
                                background: count === Math.min(n, available) && n <= available ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${count === Math.min(n, available) && n <= available ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                color: count === Math.min(n, available) && n <= available ? '#00d4ff' : '#7a8a9e',
                                fontFamily: font, fontSize: '18px', fontWeight: 700,
                                cursor: available >= 1 ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                            }}
                        >
                            {Math.min(n, available)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Start button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStart(mode, Math.min(count, available))}
                disabled={available < 1}
                style={{
                    padding: '16px 48px', borderRadius: '14px',
                    background: available >= 1 ? 'linear-gradient(135deg, #00d4ff, #0088cc)' : 'rgba(255,255,255,0.06)',
                    border: 'none', cursor: available >= 1 ? 'pointer' : 'not-allowed',
                    color: '#fff', fontFamily: font, fontSize: '16px', fontWeight: 700,
                    letterSpacing: '2px', textTransform: 'uppercase',
                    boxShadow: available >= 1 ? '0 4px 30px rgba(0,212,255,0.3)' : 'none',
                }}
            >
                {available >= 1 ? 'Start Studying →' : 'No nodes to study'}
            </motion.button>
        </motion.div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// FLASHCARD SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function FlashCard({ question, index, total, streak, onSubmit }) {
    const [answer, setAnswer] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!answer.trim() || submitting) return;
        setSubmitting(true);
        await onSubmit(answer.trim());
        setSubmitting(false);
        setAnswer('');
        setShowHint(false);
    };

    return (
        <motion.div
            key={question.nodeId + index}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', maxWidth: '700px', margin: '0 auto', width: '100%' }}
        >
            {/* Stats bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontFamily: fontMono, fontSize: '12px', color: '#4a9eba', letterSpacing: '0.5px' }}>
                    Question {index + 1} of {total}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {streak > 0 && (
                        <span style={{ fontFamily: fontMono, fontSize: '12px', color: '#ffaa00' }}>
                            🔥 {streak} day streak
                        </span>
                    )}
                    <DifficultyBadge difficulty={question.difficulty} />
                </div>
            </div>

            <ProgressBar value={index} max={total} />

            {/* Question card */}
            <motion.div
                initial={{ rotateX: -5 }}
                animate={{ rotateX: 0 }}
                style={{
                    ...glassCard, padding: '32px', marginTop: '28px', textAlign: 'center',
                    background: 'rgba(0,212,255,0.03)',
                    border: '1px solid rgba(0,212,255,0.1)',
                }}
            >
                <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#00d4ff', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
                    {question.nodeTitle}
                </p>
                <p style={{ fontFamily: font, fontSize: '20px', fontWeight: 600, color: '#e8f4fd', lineHeight: 1.5 }}>
                    {question.question}
                </p>
            </motion.div>

            {/* Hint */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                {showHint ? (
                    <motion.p
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ fontFamily: fontMono, fontSize: '13px', color: '#7c3aed', fontStyle: 'italic' }}
                    >
                        💡 {question.hint}
                    </motion.p>
                ) : (
                    <button
                        onClick={() => setShowHint(true)}
                        style={{ background: 'none', border: 'none', color: '#4a9eba', fontFamily: fontMono, fontSize: '12px', cursor: 'pointer', opacity: 0.7 }}
                    >
                        Show hint
                    </button>
                )}
            </div>

            {/* Answer input */}
            <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                style={{
                    marginTop: '24px', padding: '16px 20px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e8f4fd', fontFamily: fontMono, fontSize: '14px',
                    resize: 'vertical', minHeight: '100px', outline: 'none',
                    transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.3)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />

            {/* Submit */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!answer.trim() || submitting}
                style={{
                    marginTop: '16px', padding: '14px 32px', borderRadius: '12px',
                    background: answer.trim() && !submitting ? 'linear-gradient(135deg, #00d4ff, #0088cc)' : 'rgba(255,255,255,0.06)',
                    border: 'none', color: '#fff', fontFamily: font, fontSize: '14px',
                    fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                    cursor: answer.trim() && !submitting ? 'pointer' : 'not-allowed',
                    boxShadow: answer.trim() && !submitting ? '0 4px 20px rgba(0,212,255,0.25)' : 'none',
                    alignSelf: 'center',
                }}
            >
                {submitting ? 'Feynman is grading...' : 'Submit Answer →'}
            </motion.button>
        </motion.div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// GRADE RESULT SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function GradeResult({ result, onNext, isLast }) {
    const verdictColors = {
        'Excellent': '#00ff88', 'Good': '#00d4ff', 'Partial': '#ffaa00',
        'Needs Work': '#ff8844', 'Try Again': '#ff4466',
    };
    const color = verdictColors[result.verdict] || '#4a9eba';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px', maxWidth: '700px', margin: '0 auto', width: '100%', overflowY: 'auto' }}
        >
            {/* Score header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    style={{ fontSize: '48px', fontFamily: font, fontWeight: 800, color, marginBottom: '4px' }}
                >
                    {result.score}
                </motion.p>
                <span style={{
                    display: 'inline-block', padding: '4px 16px', borderRadius: '10px',
                    background: `${color}18`, border: `1px solid ${color}33`, color,
                    fontFamily: fontMono, fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                    {result.verdict}
                </span>
            </div>

            <ScoreBar score={result.score} />

            {/* Strength change */}
            {result.strengthAfter !== undefined && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <span style={{ fontFamily: fontMono, fontSize: '11px', color: '#4a9eba' }}>
                        Strength: {Math.round(result.strengthBefore || 0)}% → {Math.round(result.strengthAfter)}%
                        {result.strengthAfter > result.strengthBefore ? ' ↑' : result.strengthAfter < result.strengthBefore ? ' ↓' : ' →'}
                    </span>
                </div>
            )}

            {/* Feedback sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                {/* What you got right */}
                <div style={{ ...glassCard, padding: '18px 20px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.08)' }}>
                    <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#00ff88', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                        ✓ What you got right
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#c8e6c8', lineHeight: 1.6 }}>
                        {result.what_you_got_right}
                    </p>
                </div>

                {/* What was missing */}
                <div style={{ ...glassCard, padding: '18px 20px', background: 'rgba(255,68,102,0.03)', border: '1px solid rgba(255,68,102,0.08)' }}>
                    <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#ff4466', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                        ✗ What was missing
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#e8c8c8', lineHeight: 1.6 }}>
                        {result.what_was_missing}
                    </p>
                </div>

                {/* Feynman explains */}
                <div style={{ ...glassCard, padding: '18px 20px', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}>
                    <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#00d4ff', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                        💡 Feynman explains
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#c8e0f0', lineHeight: 1.6, fontStyle: 'italic' }}>
                        "{result.feynman_explains}"
                    </p>
                </div>

                {/* Memory tip */}
                <div style={{ ...glassCard, padding: '18px 20px', background: 'rgba(124,58,237,0.03)', border: '1px solid rgba(124,58,237,0.08)' }}>
                    <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#7c3aed', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                        🧠 Memory tip
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#d0c8f0', lineHeight: 1.6 }}>
                        "{result.memory_tip}"
                    </p>
                </div>
            </div>

            {/* Next button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNext}
                style={{
                    marginTop: '24px', padding: '14px 36px', borderRadius: '12px', alignSelf: 'center',
                    background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
                    border: 'none', color: '#fff', fontFamily: font, fontSize: '14px',
                    fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,212,255,0.25)',
                }}
            >
                {isLast ? 'View Results →' : 'Next Question →'}
            </motion.button>
        </motion.div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// SESSION COMPLETE SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function SessionComplete({ results, streak, feynmanSummary, onStudyAgain, onClose }) {
    const avgScore = results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
        : 0;
    const strengthened = results.filter(r => r.score > 60).length;
    const needsReview = results.filter(r => r.score <= 60).length;

    const avgColor = avgScore >= 80 ? '#00ff88' : avgScore >= 60 ? '#ffaa00' : '#ff4466';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '30px 20px', overflowY: 'auto', maxWidth: '600px', margin: '0 auto', width: '100%' }}
        >
            <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                style={{ fontSize: '14px', color: '#00d4ff', marginBottom: '8px' }}
            >✦</motion.span>
            <h2 style={{ fontFamily: font, fontSize: '24px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Session Complete
            </h2>

            {streak > 1 && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ fontFamily: fontMono, fontSize: '16px', color: '#ffaa00', marginBottom: '4px' }}
                >
                    🔥 {streak} day streak!
                </motion.p>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                    { label: 'Questions', value: results.length, color: '#4a9eba' },
                    { label: 'Avg Score', value: `${avgScore}%`, color: avgColor },
                    { label: 'Strengthened', value: strengthened, color: '#00ff88' },
                    { label: 'Need Review', value: needsReview, color: '#ff4466' },
                ].map(stat => (
                    <div key={stat.label} style={{ ...glassCard, padding: '14px 20px', textAlign: 'center', minWidth: '100px' }}>
                        <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#4a9eba', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                            {stat.label}
                        </p>
                        <p style={{ fontFamily: font, fontSize: '22px', fontWeight: 700, color: stat.color }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Per-node breakdown */}
            <div style={{ width: '100%', marginBottom: '24px' }}>
                <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#4a9eba', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Performance Breakdown
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.map((r, i) => {
                        const c = r.score >= 80 ? '#00ff88' : r.score >= 60 ? '#ffaa00' : '#ff4466';
                        const arrow = r.strengthAfter > r.strengthBefore ? '↑' : r.strengthAfter < r.strengthBefore ? '↓' : '→';
                        return (
                            <div key={i} style={{ ...glassCard, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontFamily: fontMono, fontSize: '12px', color: '#e8f4fd', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.nodeTitle}
                                </span>
                                <div style={{ width: '100px' }}>
                                    <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                        <div style={{ width: `${r.score}%`, height: '100%', borderRadius: '2px', background: c }} />
                                    </div>
                                </div>
                                <span style={{ fontFamily: fontMono, fontSize: '12px', fontWeight: 600, color: c, minWidth: '40px', textAlign: 'right' }}>
                                    {r.score}%
                                </span>
                                <span style={{ fontFamily: fontMono, fontSize: '12px', color: '#4a9eba' }}>{arrow}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Feynman summary */}
            {feynmanSummary && (
                <div style={{ ...glassCard, padding: '18px 20px', width: '100%', marginBottom: '24px', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}>
                    <p style={{ fontFamily: fontMono, fontSize: '10px', color: '#00d4ff', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Feynman says
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: '13px', color: '#c8e0f0', lineHeight: 1.6, fontStyle: 'italic' }}>
                        "{feynmanSummary}"
                    </p>
                </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStudyAgain}
                    style={{
                        padding: '14px 28px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
                        border: 'none', color: '#fff', fontFamily: font, fontSize: '13px',
                        fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                        cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,212,255,0.25)',
                    }}
                >
                    Study Again
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    style={{
                        padding: '14px 28px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)', color: '#4a9eba',
                        fontFamily: font, fontSize: '13px', fontWeight: 700,
                        letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
                    }}
                >
                    Back to Brain
                </motion.button>
            </div>
        </motion.div>
    );
}


// ═════════════════════════════════════════════════════════════════════════════
// MAIN STUDY MODE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function StudyMode({ isOpen, onClose, prefilteredNodeIds }) {
    const nodes = useBrainStore(s => s.nodes);
    const updateNode = useBrainStore(s => s.updateNode);

    const [screen, setScreen] = useState('setup'); // 'setup' | 'loading' | 'question' | 'result' | 'complete'
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentResult, setCurrentResult] = useState(null);
    const [sessionResults, setSessionResults] = useState([]);
    const [feynmanSummary, setFeynmanSummary] = useState('');
    const [streak, setStreak] = useState(getStreak().count);

    const fadingNodes = nodes.filter(n => (n.current_strength || 100) < 60);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setScreen('setup');
            setQuestions([]);
            setCurrentIndex(0);
            setCurrentResult(null);
            setSessionResults([]);
            setFeynmanSummary('');
            setStreak(getStreak().count);
        }
    }, [isOpen]);

    // Auto-start if prefiltered
    useEffect(() => {
        if (isOpen && prefilteredNodeIds && prefilteredNodeIds.length > 0) {
            handleStart('prefiltered', Math.min(prefilteredNodeIds.length, 10));
        }
    }, [isOpen, prefilteredNodeIds]);

    const handleStart = useCallback(async (mode, count) => {
        setScreen('loading');
        try {
            let targetIds;
            if (mode === 'prefiltered' && prefilteredNodeIds) {
                targetIds = prefilteredNodeIds;
            } else if (mode === 'fading') {
                targetIds = fadingNodes.map(n => n.id);
            } else {
                targetIds = nodes.map(n => n.id);
            }

            const { questions: qs } = await generateStudyQuestions(targetIds, count);
            if (qs && qs.length > 0) {
                setQuestions(qs);
                setCurrentIndex(0);
                setSessionResults([]);
                setScreen('question');
            } else {
                setScreen('setup');
            }
        } catch (err) {
            console.error('Failed to generate questions:', err);
            setScreen('setup');
        }
    }, [nodes, fadingNodes, prefilteredNodeIds]);

    const handleSubmitAnswer = useCallback(async (answer) => {
        const q = questions[currentIndex];
        try {
            const result = await gradeStudyAnswer({
                nodeId: q.nodeId,
                question: q.question,
                userAnswer: answer,
                keyConcepts: q.key_concepts,
                idealPoints: q.ideal_answer_points,
                difficulty: q.difficulty,
            });

            // Update the node in the store
            updateNode(q.nodeId, {
                current_strength: result.strengthAfter,
                status: result.strengthAfter >= 60 ? 'active' : result.strengthAfter >= 30 ? 'fading' : 'critical',
            });

            setCurrentResult({ ...result, nodeTitle: q.nodeTitle });
            setScreen('result');
        } catch (err) {
            console.error('Failed to grade answer:', err);
        }
    }, [questions, currentIndex, updateNode]);

    const handleNext = useCallback(async () => {
        const newResults = [...sessionResults, currentResult];
        setSessionResults(newResults);
        setCurrentResult(null);

        if (currentIndex + 1 >= questions.length) {
            // Session complete
            const newStreak = updateStreak();
            setStreak(newStreak);

            // Get AI summary
            try {
                const { feynman_says } = await getSessionSummary(newResults);
                setFeynmanSummary(feynman_says);
            } catch { /* no-op */ }

            setScreen('complete');
        } else {
            setCurrentIndex(currentIndex + 1);
            setScreen('question');
        }
    }, [sessionResults, currentResult, currentIndex, questions.length]);

    const handleStudyAgain = useCallback(() => {
        setScreen('setup');
        setQuestions([]);
        setCurrentIndex(0);
        setCurrentResult(null);
        setSessionResults([]);
        setFeynmanSummary('');
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(2,8,20,0.98)',
                    backdropFilter: 'blur(30px)',
                    display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Top bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Back button */}
                        <motion.button
                            onClick={screen === 'question' || screen === 'result' ? handleStudyAgain : onClose}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={screen === 'question' || screen === 'result' ? 'Back to setup' : 'Back to Brain'}
                            style={{
                                width: '32px', height: '32px', borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: '#4a9eba', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'; e.currentTarget.style.color = '#00d4ff'; e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#4a9eba'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </motion.button>
                        <span style={{ color: '#00d4ff', fontSize: '14px' }}>✦</span>
                        <h2 style={{ fontFamily: font, fontSize: '16px', fontWeight: 700, color: '#e8f4fd', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
                            Study Mode
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {screen === 'question' && questions.length > 0 && (
                            <span style={{ fontFamily: fontMono, fontSize: '12px', color: '#4a9eba' }}>
                                {currentIndex + 1}/{questions.length}
                            </span>
                        )}
                        <motion.button
                            onClick={onClose}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Close Study Mode"
                            style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#4a9eba',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)'; e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#4a9eba'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        </motion.button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <AnimatePresence mode="wait">
                        {screen === 'setup' && (
                            <StudySetup
                                key="setup"
                                nodes={nodes}
                                fadingNodes={fadingNodes}
                                onStart={handleStart}
                                onClose={onClose}
                            />
                        )}

                        {screen === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}
                            >
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                    style={{ fontSize: '28px' }}
                                >⚛️</motion.span>
                                <p style={{ fontFamily: fontMono, fontSize: '14px', color: '#4a9eba', letterSpacing: '0.5px' }}>
                                    Feynman is crafting your questions...
                                </p>
                            </motion.div>
                        )}

                        {screen === 'question' && questions[currentIndex] && (
                            <FlashCard
                                key={`q-${currentIndex}`}
                                question={questions[currentIndex]}
                                index={currentIndex}
                                total={questions.length}
                                streak={streak}
                                onSubmit={handleSubmitAnswer}
                            />
                        )}

                        {screen === 'result' && currentResult && (
                            <GradeResult
                                key="result"
                                result={currentResult}
                                onNext={handleNext}
                                isLast={currentIndex + 1 >= questions.length}
                            />
                        )}

                        {screen === 'complete' && (
                            <SessionComplete
                                key="complete"
                                results={sessionResults}
                                streak={streak}
                                feynmanSummary={feynmanSummary}
                                onStudyAgain={handleStudyAgain}
                                onClose={onClose}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
