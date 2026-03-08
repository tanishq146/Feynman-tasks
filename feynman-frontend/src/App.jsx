import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import BrainScene from './components/Brain/BrainScene';
import InputBar from './components/UI/InputBar';
import TopBar from './components/UI/TopBar';
import FeynmanPanel from './components/UI/FeynmanPanel';
import ChatPanel from './components/UI/ChatPanel';
import BeliefEvolutionPanel from './components/UI/BeliefEvolutionPanel';
import StudyMode from './components/UI/StudyMode';
import FadingWarning from './components/UI/FadingWarning';
import Toast from './components/UI/Toast';
import AuthScreen from './components/UI/AuthScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useBrainData } from './hooks/useBrainData';
import { useSocket } from './hooks/useSocket';
import { useDecayTicker } from './hooks/useDecayTicker';
import useBrainStore from './store/brainStore';

function FeynmanApp() {
  // Initialize data fetching and WebSocket connection
  useBrainData();
  useSocket();

  // Real-time decay: recalculates all node strengths every 10 seconds
  useDecayTicker(10000);

  const [beliefPanelOpen, setBeliefPanelOpen] = useState(false);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [studyPrefilteredIds, setStudyPrefilteredIds] = useState(null);
  const nodes = useBrainStore(s => s.nodes);
  const fadingCount = nodes.filter(n => (n.current_strength || 100) < 60).length;

  const handleStudyFromWarning = useCallback((nodeIds) => {
    setStudyPrefilteredIds(nodeIds);
    setStudyModeOpen(true);
  }, []);

  const handleCloseStudy = useCallback(() => {
    setStudyModeOpen(false);
    setStudyPrefilteredIds(null);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#020408',
      }}
    >
      {/* 3D Brain Scene (fills entire viewport) */}
      <BrainScene />

      {/* UI Overlays */}
      <TopBar />
      <InputBar />
      <FeynmanPanel />
      <ChatPanel />
      <BeliefEvolutionPanel
        isOpen={beliefPanelOpen}
        onClose={() => setBeliefPanelOpen(false)}
      />

      {/* Fading Warning Banner */}
      <FadingWarning onStudyNow={handleStudyFromWarning} />

      {/* Belief Evolution Toggle Button — draggable */}
      <motion.button
        onClick={() => setBeliefPanelOpen(!beliefPanelOpen)}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={beliefPanelOpen ? 'Close Beliefs' : 'Belief Evolution'}
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '156px',
          zIndex: 60,
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: beliefPanelOpen
            ? 'rgba(0, 212, 255, 0.12)'
            : 'rgba(2, 8, 20, 0.9)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${beliefPanelOpen
            ? 'rgba(0, 212, 255, 0.3)'
            : 'rgba(0, 212, 255, 0.2)'}`,
          color: '#00d4ff',
          fontSize: '18px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          touchAction: 'none',
        }}
      >
        {beliefPanelOpen ? '✕' : '🧬'}
      </motion.button>

      {/* Study Mode Toggle Button — draggable */}
      <motion.button
        onClick={() => { setStudyPrefilteredIds(null); setStudyModeOpen(true); }}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Study Mode"
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '100px',
          zIndex: 60,
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: studyModeOpen
            ? 'rgba(124, 58, 237, 0.15)'
            : 'rgba(2, 8, 20, 0.9)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${studyModeOpen
            ? 'rgba(124, 58, 237, 0.3)'
            : 'rgba(124, 58, 237, 0.2)'}`,
          color: '#7c3aed',
          fontSize: '18px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          touchAction: 'none',
        }}
      >
        📚
        {/* Red notification dot for fading nodes */}
        {fadingCount > 0 && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              position: 'absolute', top: '-3px', right: '-3px',
              width: '14px', height: '14px', borderRadius: '50%',
              background: '#ff4466', border: '2px solid #020408',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '8px', fontWeight: 700, color: '#fff',
              fontFamily: "'SF Pro Text', sans-serif",
            }}
          >
            {fadingCount > 9 ? '9+' : fadingCount}
          </motion.div>
        )}
      </motion.button>

      {/* Study Mode Overlay */}
      <StudyMode
        isOpen={studyModeOpen}
        onClose={handleCloseStudy}
        prefilteredNodeIds={studyPrefilteredIds}
      />

      <Toast />
    </div>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#020408', color: '#4a9eba',
        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
        fontSize: '14px', letterSpacing: '2px',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <FeynmanApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
