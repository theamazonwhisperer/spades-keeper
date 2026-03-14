import { useMemo, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { useGameStore } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import { loadCloudState, applyCloudState, startCloudSync } from './lib/cloudSync';
import { lightTheme, darkTheme } from './theme';
import HomeScreen from './screens/HomeScreen';
import SetupScreen from './screens/SetupScreen';
import GameScreen from './screens/GameScreen';
import HistoryScreen from './screens/HistoryScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  const darkMode = useGameStore(s => s.darkMode);
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);
  const { user, isGuest, loading, init } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  // Initialise auth on mount
  useEffect(() => {
    init();
  }, [init]);

  // Load cloud state when user logs in, then start auto-sync
  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      setSyncing(true);
      try {
        const cloud = await loadCloudState(user.id);
        if (cloud) {
          applyCloudState(cloud);
        }
      } catch (e) {
        console.error('Failed to load cloud state:', e);
      }
      setSyncing(false);
      unsubscribe = startCloudSync();
    })();

    return () => {
      unsubscribe?.();
    };
  }, [user]);

  const isAuthenticated = !!user || isGuest;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {loading || syncing ? (
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
      ) : !isAuthenticated ? (
        <Router>
          <Routes>
            <Route path="*" element={<WelcomeScreen />} />
          </Routes>
        </Router>
      ) : (
        <Router>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/setup" element={<SetupScreen />} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <InstallPrompt />
        </Router>
      )}
    </ThemeProvider>
  );
}
