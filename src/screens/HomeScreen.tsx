import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useGameStore } from '../store/gameStore';
import { getLatestTeamScore } from '../utils/scoring';
import { monoFont } from '../theme';

export default function HomeScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentGame, completedGames, playerStats, abandonGame, toggleDarkMode, darkMode } =
    useGameStore();
  const [abandonDialog, setAbandonDialog] = useState(false);

  const topPlayers = Object.values(playerStats)
    .filter(s => s.gamesPlayed >= 1)
    .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)
    .slice(0, 6);

  const handleNewGame = () => {
    if (currentGame) {
      setAbandonDialog(true);
    } else {
      navigate('/setup');
    }
  };

  const confirmAbandon = () => {
    abandonGame();
    setAbandonDialog(false);
    navigate('/setup');
  };

  const recentGames = completedGames.slice(0, 5);

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
        <Box />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Game History">
            <IconButton
              onClick={() => navigate('/history')}
              color="primary"
              sx={{ width: 48, height: 48 }}
            >
              <HistoryIcon />
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
        </Box>
      </Box>

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
      {currentGame && (
        <Box className="animate-slide-up" sx={{ mb: 3, animationDelay: '150ms' }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
          >
            Game in Progress
          </Typography>
          <Card
            className="animate-pulse-glow"
            sx={{
              border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <CardActionArea onClick={() => navigate('/game')} sx={{ p: 2, minHeight: 64 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Round {currentGame.currentRound}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    {currentGame.teams.map(t => {
                      const { score } = getLatestTeamScore(currentGame, t.id);
                      return (
                        <Typography key={t.id} variant="body2" color="text.secondary">
                          <strong style={{ color: theme.palette.primary.main }}>{t.name}</strong>{' '}
                          <span style={{ fontFamily: monoFont }}>{score}</span>
                        </Typography>
                      );
                    })}
                  </Box>
                </Box>
                <PlayArrowIcon color="primary" sx={{ fontSize: 28 }} />
              </Box>
            </CardActionArea>
          </Card>
        </Box>
      )}

      {/* Player Records */}
      {topPlayers.length > 0 && (
        <Box className="animate-slide-up" sx={{ mb: 3, animationDelay: '200ms' }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
          >
            Player Records
          </Typography>
          <Card>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {topPlayers.map(s => (
                  <Box
                    key={s.name}
                    sx={{
                      flex: '1 1 calc(33% - 8px)',
                      minWidth: 80,
                      textAlign: 'center',
                      py: 0.75,
                      px: 1,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                      {s.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: monoFont, fontWeight: 700, color: theme.palette.primary.main }}
                    >
                      {s.wins}W–{s.losses}L
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <Box className="animate-slide-up" sx={{ animationDelay: '200ms' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
            >
              Recent Games
            </Typography>
            <Button size="small" onClick={() => navigate('/history')} sx={{ fontSize: '0.75rem' }}>
              View All
            </Button>
          </Box>

          <Box className="stagger-children" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recentGames.map(game => {
              const winner = game.teams.find(t => t.id === game.winnerId);
              const date = new Date(game.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const lastRound = game.rounds.filter(r => r.isComplete).slice(-1)[0];
              return (
                <Card
                  key={game.id}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate('/history')}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {winner && (
                          <EmojiEventsIcon
                            sx={{ fontSize: 16, color: '#F5A623' }}
                          />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {game.teams[0].name} vs {game.teams[1].name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {date}
                      </Typography>
                    </Box>
                    {lastRound && (
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.25 }}>
                        {lastRound.teamScores.map(ts => {
                          const teamName = game.teams.find(t => t.id === ts.teamId)?.name;
                          return (
                            <Typography key={ts.teamId} variant="caption" color="text.secondary">
                              {teamName}: <strong style={{ fontFamily: monoFont }}>{ts.cumulativeScore}</strong>
                            </Typography>
                          );
                        })}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Abandon dialog */}
      <Dialog open={abandonDialog} onClose={() => setAbandonDialog(false)}>
        <DialogTitle>Abandon Current Game?</DialogTitle>
        <DialogContent>
          <Typography>
            Starting a new game will abandon the current one. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbandonDialog(false)}>Cancel</Button>
          <Button onClick={confirmAbandon} color="error" variant="contained">
            Abandon & Start New
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
