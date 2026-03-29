import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import BrainScene from './components/Brain/BrainScene';
import InputBar from './components/UI/InputBar';
import TopBar from './components/UI/TopBar';
import FeynmanPanel from './components/UI/FeynmanPanel';
import ChatPanel from './components/UI/ChatPanel';
import BeliefEvolutionPanel from './components/UI/BeliefEvolutionPanel';
import StudyMode from './components/UI/StudyMode';
import FadingWarning from './components/UI/FadingWarning';
import CommandMenu from './components/UI/CommandMenu';
import ConnectionPanel from './components/UI/ConnectionPanel';
import NodeDive from './components/UI/NodeDive';
import LobeView from './components/UI/LobeView';
import LobeDiveTransition from './components/UI/LobeDiveTransition';
import NotesPanel from './components/UI/NotesPanel';
import NotesWorkspace from './components/UI/NotesWorkspace';
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

  // Connection panel state from store
  const isConnectionPanelOpen = useBrainStore((s) => s.isConnectionPanelOpen);
  const clearEdge = useBrainStore((s) => s.clearEdge);
  const isLobeView = useBrainStore((s) => s.isLobeView);
  const isNotesPanelOpen = useBrainStore((s) => s.isNotesPanelOpen);
  const closeNotesPanel = useBrainStore((s) => s.closeNotesPanel);

  // Panel states — all managed here, toggled via CommandMenu
  const [chatOpen, setChatOpen] = useState(false);
  const [beliefPanelOpen, setBeliefPanelOpen] = useState(false);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [studyPrefilteredIds, setStudyPrefilteredIds] = useState(null);
  const [notesWorkspaceOpen, setNotesWorkspaceOpen] = useState(false);

  // Track which panel is currently active for the menu indicator
  const activePanel = chatOpen ? 'chat' : beliefPanelOpen ? 'beliefs' : studyModeOpen ? 'study' : notesWorkspaceOpen ? 'notes' : null;

  const handleStudyFromWarning = useCallback((nodeIds) => {
    setStudyPrefilteredIds(nodeIds);
    setStudyModeOpen(true);
  }, []);

  const handleCloseStudy = useCallback(() => {
    setStudyModeOpen(false);
    setStudyPrefilteredIds(null);
  }, []);

  // Handle menu selection — toggle the selected panel
  const handleMenuSelect = useCallback((id) => {
    if (id === 'chat') {
      setChatOpen(prev => !prev);
      setBeliefPanelOpen(false);
      setStudyModeOpen(false);
      setNotesWorkspaceOpen(false);
    } else if (id === 'beliefs') {
      setBeliefPanelOpen(prev => !prev);
      setChatOpen(false);
      setStudyModeOpen(false);
      setNotesWorkspaceOpen(false);
    } else if (id === 'study') {
      setStudyPrefilteredIds(null);
      setStudyModeOpen(prev => !prev);
      setChatOpen(false);
      setBeliefPanelOpen(false);
      setNotesWorkspaceOpen(false);
    } else if (id === 'notes') {
      setNotesWorkspaceOpen(prev => !prev);
      setChatOpen(false);
      setBeliefPanelOpen(false);
      setStudyModeOpen(false);
    }
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

      {/* UI Overlays — hidden when LobeView is active */}
      {!isLobeView && <TopBar />}
      {!isLobeView && <InputBar />}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <BeliefEvolutionPanel
        isOpen={beliefPanelOpen}
        onClose={() => setBeliefPanelOpen(false)}
      />

      {/* Connection Thread Panel */}
      {isConnectionPanelOpen && (
        <div
          onClick={clearEdge}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}
      <ConnectionPanel />

      {/* Fading Warning Banner */}
      <FadingWarning onStudyNow={handleStudyFromWarning} />

      {/* ✦ Command Menu — single access point for all tools */}
      {!isLobeView && <CommandMenu onSelect={handleMenuSelect} activePanel={activePanel} />}

      {/* Study Mode Overlay */}
      <StudyMode
        isOpen={studyModeOpen}
        onClose={handleCloseStudy}
        prefilteredNodeIds={studyPrefilteredIds}
      />

      <Toast />

      {/* Node Dive — full screen, above everything */}
      <NodeDive />

      {/* Lobe Dive Transition — cinematic entry animation */}
      <LobeDiveTransition />

      {/* Lobe View — immersive lobe exploration */}
      <LobeView />

      {/* Feynman Panel — highest z-index so it works above LobeView too */}
      <FeynmanPanel />

      {/* Notes Panel — slides in from the right */}
      {isNotesPanelOpen && (
        <div
          onClick={closeNotesPanel}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 245,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}
      <NotesPanel />

      {/* Notes Workspace — full screen */}
      <AnimatePresence>
        {notesWorkspaceOpen && (
          <NotesWorkspace isOpen={notesWorkspaceOpen} onClose={() => setNotesWorkspaceOpen(false)} />
        )}
      </AnimatePresence>



      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
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
