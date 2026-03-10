import { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useGameStore } from './store/gameStore';
import { lightTheme, darkTheme } from './theme';
import HomeScreen from './screens/HomeScreen';
import SetupScreen from './screens/SetupScreen';
import GameScreen from './screens/GameScreen';
import HistoryScreen from './screens/HistoryScreen';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  const darkMode = useGameStore(s => s.darkMode);
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/setup" element={<SetupScreen />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <InstallPrompt />
    </ThemeProvider>
  );
}
