import { useMemo, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography, Snackbar } from '@mui/material';
import { useGameStore } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import { loadCloudState, applyCloudState, startCloudSync, loadSharedGames, clearSharedGames } from './lib/cloudSync';
import { lightTheme, darkTheme } from './theme';
import HomeScreen from './screens/HomeScreen';
import SetupScreen from './screens/SetupScreen';
import GameScreen from './screens/GameScreen';
import HistoryScreen from './screens/HistoryScreen';
import PlayerStatsScreen from './screens/PlayerStatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import WatchScreen from './screens/WatchScreen';
import EditGameScreen from './screens/EditGameScreen';
import ImportGameScreen from './screens/ImportGameScreen';
import AdminScreen from './screens/AdminScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import InstallPrompt from './components/InstallPrompt';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading, init } = useAuthStore();
  const [syncing, setSyncing] = useState(false);
  const [sharedSnack, setSharedSnack] = useState('');

  useEffect(() => {
    init();
  }, [init]);

  // Track the user ID so we only run cloud sync setup when the actual user
  // changes (sign-in / sign-out), NOT on Supabase token refreshes which create
  // a new user object reference with the same id.
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      setSyncing(true);
      try {
        const cloud = await loadCloudState(userId);
        if (cloud && !cancelled) {
          applyCloudState(cloud);
        }
      } catch (e) {
        console.error('Failed to load cloud state:', e);
      }

      if (cancelled) return;

      // Import shared games from linked players
      try {
        const sharedGames = await loadSharedGames(userId);
        if (sharedGames.length > 0 && !cancelled) {
          const { completedGames, importGame } = useGameStore.getState();
          const existingIds = new Set(completedGames.map(g => g.id));
          const newGames = sharedGames.filter(g => !existingIds.has(g.id));
          newGames.forEach(g => importGame(g));
          if (newGames.length > 0) {
            setSharedSnack(`${newGames.length} game${newGames.length > 1 ? 's' : ''} added from linked players`);
          }
          // Clear consumed shared games
          await clearSharedGames(userId, sharedGames.map(g => g.id));
        }
      } catch (e) {
        console.error('Failed to load shared games:', e);
      }

      if (cancelled) return;
      setSyncing(false);
      unsubscribe = startCloudSync();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [userId]);

  const isAuthenticated = !!user || isGuest;

  if (loading || syncing) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          {syncing ? 'Loading your games...' : 'Loading...'}
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <WelcomeScreen />;
  }

  return (
    <>
      {children}
      <Snackbar
        open={!!sharedSnack}
        autoHideDuration={4000}
        onClose={() => setSharedSnack('')}
        message={sharedSnack}
      />
    </>
  );
}

export default function App() {
  const darkMode = useGameStore(s => s.darkMode);
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/watch/:userId" element={<WatchScreen />} />
          <Route path="/import-game/:ownerId/:gameId" element={<ImportGameScreen />} />

          {/* Auth-gated editor route */}
          <Route path="/edit/:hostUserId" element={<AuthGate><EditGameScreen /></AuthGate>} />

          {/* Auth-gated routes */}
          <Route path="/" element={<AuthGate><HomeScreen /></AuthGate>} />
          <Route path="/setup" element={<AuthGate><SetupScreen /></AuthGate>} />
          <Route path="/game" element={<AuthGate><GameScreen /></AuthGate>} />
          <Route path="/history" element={<AuthGate><HistoryScreen /></AuthGate>} />
          <Route path="/stats" element={<AuthGate><PlayerStatsScreen /></AuthGate>} />
          <Route path="/settings" element={<AuthGate><SettingsScreen /></AuthGate>} />
          <Route path="/admin" element={<AuthGate><AdminScreen /></AuthGate>} />
          <Route path="*" element={<AuthGate><Navigate to="/" replace /></AuthGate>} />
        </Routes>
        <InstallPrompt />
      </Router>
    </ThemeProvider>
  );
}
