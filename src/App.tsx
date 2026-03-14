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
import PlayerStatsScreen from './screens/PlayerStatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import WatchScreen from './screens/WatchScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import InstallPrompt from './components/InstallPrompt';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading, init } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

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

  return <>{children}</>;
}

export default function App() {
  const darkMode = useGameStore(s => s.darkMode);
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public route — no auth required */}
          <Route path="/watch/:userId" element={<WatchScreen />} />

          {/* Auth-gated routes */}
          <Route path="/" element={<AuthGate><HomeScreen /></AuthGate>} />
          <Route path="/setup" element={<AuthGate><SetupScreen /></AuthGate>} />
          <Route path="/game" element={<AuthGate><GameScreen /></AuthGate>} />
          <Route path="/history" element={<AuthGate><HistoryScreen /></AuthGate>} />
          <Route path="/stats" element={<AuthGate><PlayerStatsScreen /></AuthGate>} />
          <Route path="/settings" element={<AuthGate><SettingsScreen /></AuthGate>} />
          <Route path="*" element={<AuthGate><Navigate to="/" replace /></AuthGate>} />
        </Routes>
        <InstallPrompt />
      </Router>
    </ThemeProvider>
  );
}
