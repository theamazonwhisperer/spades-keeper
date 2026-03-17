import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, alpha, useTheme } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import {
  loadCloudState,
  applyCloudState,
  setEditingForUser,
  loadSharedState,
  subscribeToSharedGame,
  SyncableState,
} from '../lib/cloudSync';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import BiddingView from './views/BiddingView';
import TricksView from './views/TricksView';
import ScoringView from './views/ScoringView';
import GameOverView from './views/GameOverView';

/**
 * Editor mode: loads the host's game state into the local store and routes all
 * cloud saves to the host's row. On exit, restores the editor's own game state.
 */
export default function EditGameScreen() {
  const { hostUserId } = useParams<{ hostUserId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuthStore();
  const currentGame = useGameStore(s => s.currentGame);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostName, setHostName] = useState('');
  // Capture the editor's own store state so we can restore it on exit
  const ownStateRef = useRef<ReturnType<typeof useGameStore.getState> | null>(null);

  useEffect(() => {
    if (!hostUserId || !user) return;

    let unsubGame: (() => void) | undefined;

    (async () => {
      // Snapshot editor's own full store state before overwriting
      ownStateRef.current = useGameStore.getState();

      // Target cloud saves at host's row BEFORE applying host state
      // (so the store subscription fires to the right row)
      setEditingForUser(hostUserId);

      const hostState = await loadCloudState(hostUserId);
      if (!hostState) {
        setError('Could not load host game. You may not have edit access.');
        setEditingForUser(null);
        setLoading(false);
        return;
      }

      applyCloudState(hostState);

      // Try to show host's display name
      const sharedState = await loadSharedState(hostUserId);
      if (sharedState) {
        const g = sharedState.currentGame as { teams?: { name: string }[] } | null;
        if (g?.teams?.[0] && g?.teams?.[1]) {
          setHostName(`${g.teams[0].name} vs ${g.teams[1].name}`);
        }
      }

      // Keep in sync with host's game changes from other editors
      unsubGame = subscribeToSharedGame(hostUserId, (updated: SyncableState) => {
        applyCloudState(updated);
      });

      setLoading(false);
    })();

    return () => {
      unsubGame?.();
      // Restore editor's own store state and stop targeting host's row
      setEditingForUser(null);
      if (ownStateRef.current) {
        useGameStore.setState(ownStateRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostUserId, user?.id]);

  const handleExit = () => {
    navigate(`/watch/${hostUserId}`);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">Loading game...</Typography>
      </Box>
    );
  }

  if (error || !currentGame) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.default', px: 3 }}>
        <Typography variant="h1" sx={{ fontSize: '3rem' }}>♠</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center' }}>
          {error || 'No active game to edit.'}
        </Typography>
        <Button onClick={handleExit} variant="outlined">Go Back</Button>
      </Box>
    );
  }

  const renderView = () => {
    switch (currentGame.phase) {
      case 'bidding': return <BiddingView />;
      case 'tricks': return <TricksView />;
      case 'scoring': return <ScoringView />;
      case 'complete': return <GameOverView />;
      default: return null;
    }
  };

  return (
    <Box>
      {/* Editor mode banner */}
      <Box
        sx={{
          px: 2,
          py: 0.75,
          bgcolor: alpha(theme.palette.primary.main, 0.15),
          borderBottom: `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <EditNoteIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: 'primary.main', fontSize: '0.7rem' }}>
          Editing{hostName ? `: ${hostName}` : ''}
        </Typography>
        <Button
          size="small"
          onClick={handleExit}
          sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'primary.main', py: 0.25, minHeight: 0 }}
        >
          Exit Edit Mode
        </Button>
      </Box>

      {renderView()}
    </Box>
  );
}
