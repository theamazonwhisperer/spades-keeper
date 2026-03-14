import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Snackbar,
  useTheme,
  alpha,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import HomeIcon from '@mui/icons-material/Home';
import { fetchSharedGameByLink } from '../lib/cloudSync';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import ScoreHistoryTable from '../components/ScoreHistoryTable';
import { monoFont } from '../theme';
import type { Game } from '../types';

export default function ImportGameScreen() {
  const { ownerId, gameId } = useParams<{ ownerId: string; gameId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore(s => s.user);
  const isGuest = useAuthStore(s => s.isGuest);
  const { completedGames, importGame } = useGameStore();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const alreadyInHistory = game ? completedGames.some(g => g.id === game.id) : false;

  useEffect(() => {
    if (!ownerId || !gameId) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    (async () => {
      const result = await fetchSharedGameByLink(ownerId, gameId);
      if (!result) {
        setError('Game not found. The owner may have disabled sharing.');
      } else {
        setGame(result);
      }
      setLoading(false);
    })();
  }, [ownerId, gameId]);

  const handleImport = () => {
    if (!game) return;
    importGame(game);
    setImported(true);
    setSnackMsg('Game added to your history!');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 3 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </Box>
    );
  }

  if (!game) return null;

  const completedRounds = game.rounds.filter(r => r.isComplete);
  const lastRound = completedRounds[completedRounds.length - 1];
  const winner = game.teams.find(t => t.id === game.winnerId);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        pb: 6,
        px: 2.5,
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', pt: 5, pb: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
          Shared Scorecard
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          {game.teams[0].name} vs {game.teams[1].name}
        </Typography>
        {winner && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <EmojiEventsIcon sx={{ color: '#F5A623', fontSize: 20 }} />
            <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
              {winner.name} Wins!
            </Typography>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
          {completedRounds.length} rounds played
        </Typography>
      </Box>

      {/* Final Scores */}
      {lastRound && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          {lastRound.teamScores.map(ts => {
            const team = game.teams.find(t => t.id === ts.teamId);
            const isWinner = ts.teamId === game.winnerId;
            return (
              <Card
                key={ts.teamId}
                sx={{
                  flex: 1,
                  border: isWinner
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  bgcolor: isWinner ? alpha(theme.palette.primary.main, 0.08) : undefined,
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  {isWinner && (
                    <Chip
                      icon={<EmojiEventsIcon sx={{ fontSize: '14px !important' }} />}
                      label="Winner"
                      size="small"
                      color="primary"
                      sx={{ mb: 1, fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {team?.name}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 900, fontFamily: monoFont }}
                    color={isWinner ? 'primary' : 'text.primary'}
                  >
                    {ts.cumulativeScore}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {game.players
                      .filter(p => p.teamIndex === game.teams.indexOf(team!))
                      .map(p => (
                        <Chip key={p.id} label={p.name} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ))}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Scorecard */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            Full Scorecard
          </Typography>
          <ScoreHistoryTable game={game} />
        </CardContent>
      </Card>

      {/* Actions */}
      {user && !isGuest ? (
        alreadyInHistory || imported ? (
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled
            sx={{ py: 1.8, minHeight: 56, mb: 1.5 }}
          >
            Already in Your History
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<AddCircleIcon />}
            onClick={handleImport}
            sx={{ py: 1.8, fontSize: '1.05rem', minHeight: 56, mb: 1.5 }}
          >
            Add to My History
          </Button>
        )
      ) : (
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate('/')}
          sx={{ py: 1.8, fontSize: '1.05rem', minHeight: 56, mb: 1.5 }}
        >
          Sign In to Save This Game
        </Button>
      )}

      <Button
        variant="text"
        fullWidth
        startIcon={<HomeIcon />}
        onClick={() => navigate('/')}
        sx={{ color: 'text.secondary' }}
      >
        Home
      </Button>

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
      />
    </Box>
  );
}
