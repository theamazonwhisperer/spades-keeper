import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GoogleIcon from '@mui/icons-material/Google';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { getLatestTeamScore } from '../utils/scoring';
import { loadDemoGame } from '../utils/demoData';
import { monoFont } from '../theme';
import { Game } from '../types';

export default function HomeScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    currentGame, savedGames,
    abandonGame, saveAndNewGame, resumeGame, deleteSavedGame,
    toggleDarkMode, darkMode,
  } = useGameStore();
  const { user, isGuest, signOut, signInWithGoogle } = useAuthStore();

  const handleNewGame = () => {
    if (currentGame) {
      // Save current game and go to setup
      saveAndNewGame();
    }
    navigate('/setup');
  };

  const handleResumeGame = (gameId: string) => {
    resumeGame(gameId);
    navigate('/game');
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(160deg, #0e1117 0%, #162230 50%, #0e1117 100%)`
            : `linear-gradient(160deg, #f0f3f6 0%, #d6eadf 50%, #f0f3f6 100%)`,
        display: 'flex',
        flexDirection: 'column',
        px: 2.5,
        pb: 4,
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pt: { xs: 6, sm: 4 },
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {!currentGame && (
            <Tooltip title="Load Demo Game">
              <IconButton
                onClick={() => { loadDemoGame(); navigate('/game'); }}
                color="primary"
                sx={{ width: 48, height: 48 }}
              >
                <ScienceIcon />
              </IconButton>
            </Tooltip>
          )}
          {user && (
            <Tooltip title={`Signed in as ${user.email}`}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                }}
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                      {(user.email?.[0] ?? '?').toUpperCase()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Player Stats">
            <IconButton
              onClick={() => navigate('/stats')}
              color="primary"
              sx={{ width: 48, height: 48 }}
            >
              <LeaderboardIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Game History">
            <IconButton
              onClick={() => navigate('/history')}
              color="primary"
              sx={{ width: 48, height: 48 }}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              onClick={() => navigate('/settings')}
              color="primary"
              sx={{ width: 48, height: 48 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
            <IconButton
              onClick={toggleDarkMode}
              color="primary"
              sx={{ width: 48, height: 48 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign Out">
            <IconButton
              onClick={signOut}
              color="primary"
              sx={{ width: 48, height: 48 }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Guest warning */}
      {isGuest && (
        <Card
          sx={{
            mb: 2,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20, mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.warning.main, mb: 0.5 }}>
                  Guest mode — data saved locally only
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  If you clear cookies or switch devices, your games will be lost.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={signInWithGoogle}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Sign in to sync
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Hero */}
      <Box className="animate-fade-in" sx={{ textAlign: 'center', py: 4 }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '4.5rem', sm: '5.5rem' },
            lineHeight: 1,
            mb: 1,
            filter: 'drop-shadow(0 4px 16px rgba(95, 189, 125, 0.3))',
          }}
        >
          ♠
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: theme.palette.primary.main, mb: 0.5, letterSpacing: '-0.02em' }}
        >
          SpadesKeeper
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Beautiful scorekeeper for Spades
        </Typography>
      </Box>

      {/* New Game Button */}
      <Box className="animate-slide-up" sx={{ animationDelay: '100ms' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleNewGame}
          fullWidth
          sx={{
            py: 1.8,
            fontSize: '1.1rem',
            minHeight: 56,
            mb: 3,
          }}
        >
          New Game
        </Button>
      </Box>

      {/* Continue Current Game */}
      {currentGame && currentGame.phase !== 'complete' && (
        <Box className="animate-slide-up" sx={{ mb: 3, animationDelay: '150ms' }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
          >
            Active Game
          </Typography>
          <GameCard game={currentGame} onClick={() => navigate('/game')} active />
        </Box>
      )}

      {/* Saved Games */}
      {savedGames.length > 0 && (
        <Box className="animate-slide-up" sx={{ mb: 3, animationDelay: '175ms' }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
          >
            Saved Games
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {savedGames.map(game => (
              <Box key={game.id} sx={{ position: 'relative' }}>
                <GameCard
                  game={game}
                  onClick={() => handleResumeGame(game.id)}
                />
                <IconButton
                  onClick={(e) => { e.stopPropagation(); deleteSavedGame(game.id); }}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main' },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Version */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ textAlign: 'center', display: 'block', mt: 4, mb: 1, fontSize: '0.65rem' }}
      >
        v1.4
      </Typography>

    </Box>
  );
}

function GameCard({ game, onClick, active }: { game: Game; onClick: () => void; active?: boolean }) {
  const theme = useTheme();
  return (
    <Card
      className={active ? 'animate-pulse-glow' : undefined}
      sx={{
        border: `2px solid ${alpha(theme.palette.primary.main, active ? 0.5 : 0.2)}`,
        bgcolor: alpha(theme.palette.primary.main, active ? 0.05 : 0.02),
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2, minHeight: 64 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {game.teams[0].name} vs {game.teams[1].name}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.3 }}>
              {game.players.filter(p => p.teamIndex === 0).map(p => p.name).join(' & ')}
              {' vs '}
              {game.players.filter(p => p.teamIndex === 1).map(p => p.name).join(' & ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Round {game.currentRound} · {game.phase === 'bidding' ? 'Bidding' : game.phase === 'tricks' ? 'Tricks' : game.phase === 'scoring' ? 'Scoring' : 'Complete'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              {game.teams.map(t => {
                const { score } = getLatestTeamScore(game, t.id);
                return (
                  <Typography key={t.id} variant="body2" color="text.secondary">
                    <strong style={{ color: theme.palette.primary.main }}>{t.name}</strong>{' '}
                    <span style={{ fontFamily: monoFont }}>{score}</span>
                  </Typography>
                );
              })}
            </Box>
          </Box>
          {active ? (
            <PlayArrowIcon color="primary" sx={{ fontSize: 28 }} />
          ) : (
            <SwapHorizIcon color="primary" sx={{ fontSize: 24 }} />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
}
