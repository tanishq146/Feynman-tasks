import { useState } from 'react';
import { motion } from 'framer-motion';
import BrainScene from './components/Brain/BrainScene';
import InputBar from './components/UI/InputBar';
import TopBar from './components/UI/TopBar';
import FeynmanPanel from './components/UI/FeynmanPanel';
import ChatPanel from './components/UI/ChatPanel';
import BeliefEvolutionPanel from './components/UI/BeliefEvolutionPanel';
import Toast from './components/UI/Toast';
import { useBrainData } from './hooks/useBrainData';
import { useSocket } from './hooks/useSocket';
import { useDecayTicker } from './hooks/useDecayTicker';

export default function App() {
  // Initialize data fetching and WebSocket connection
  useBrainData();
  useSocket();

  // Real-time decay: recalculates all node strengths every 10 seconds
  useDecayTicker(10000);

  const [beliefPanelOpen, setBeliefPanelOpen] = useState(false);

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
          bottom: '100px',
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

      <Toast />
    </div>
  );
}

