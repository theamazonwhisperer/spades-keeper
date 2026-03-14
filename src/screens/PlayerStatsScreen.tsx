import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  AppBar,
  Toolbar,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useGameStore } from '../store/gameStore';
import { monoFont } from '../theme';

export default function PlayerStatsScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { playerStats, deletePlayerStats, clearAllPlayerStats } = useGameStore();

  const players = Object.entries(playerStats)
    .map(([key, s]) => ({ key, ...s }))
    .filter(s => s.gamesPlayed >= 1)
    .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 4 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/')} color="inherit" sx={{ width: 48, height: 48 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
            Player Stats
          </Typography>
          {players.length > 0 && (
            <Button size="small" color="error" onClick={clearAllPlayerStats} sx={{ fontSize: '0.75rem' }}>
              Clear All
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2.5, pt: 1 }}>
        {players.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No player stats yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Complete a game to start tracking records
            </Typography>
          </Box>
        ) : (
          <>
            {/* Leaderboard */}
            {players.slice(0, 3).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
                >
                  Leaderboard
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {players.slice(0, 3).map((p, i) => {
                    const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
                    return (
                      <Card
                        key={p.key}
                        sx={{
                          flex: 1,
                          border: i === 0
                            ? `2px solid ${alpha(medals[0], 0.6)}`
                            : `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                          bgcolor: i === 0
                            ? alpha(medals[0], 0.06)
                            : undefined,
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 2, px: 1, '&:last-child': { pb: 2 } }}>
                          <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {p.name}
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: 900, fontFamily: monoFont, color: theme.palette.primary.main }}
                          >
                            {p.wins}W
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                            {p.gamesPlayed} game{p.gamesPlayed !== 1 ? 's' : ''}
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Full stats list */}
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
            >
              All Players
            </Typography>
            {players.map((p, i) => {
              const winRate = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
              return (
                <Card key={p.key} sx={{ mb: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ fontFamily: monoFont, fontWeight: 700, minWidth: 24, textAlign: 'center' }}
                      >
                        #{i + 1}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {p.name}
                          </Typography>
                          {i === 0 && players.length > 1 && (
                            <EmojiEventsIcon sx={{ fontSize: 16, color: '#FFD700' }} />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                            {p.wins}W – {p.losses}L
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                            {winRate}% win rate
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                            {p.gamesPlayed} game{p.gamesPlayed !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        {/* Win rate bar */}
                        <Box sx={{ mt: 0.75, height: 4, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${winRate}%`,
                              borderRadius: 2,
                              bgcolor: theme.palette.primary.main,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => deletePlayerStats(p.key)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </Box>
    </Box>
  );
}
