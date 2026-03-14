import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { loadSharedState, subscribeToSharedGame, SyncableState } from '../lib/cloudSync';
import { Game } from '../types';
import ScoreHistoryTable from '../components/ScoreHistoryTable';
import { monoFont } from '../theme';

export default function WatchScreen() {
  const { userId } = useParams<{ userId: string }>();
  const theme = useTheme();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const state = await loadSharedState(userId);
      if (!state) {
        setError('Game not found or sharing is disabled.');
        setLoading(false);
        return;
      }
      setGame(state.currentGame as Game | null);
      setLastUpdated(new Date());
      setLoading(false);

      // Subscribe to realtime updates
      unsubscribe = subscribeToSharedGame(userId, (updated: SyncableState) => {
        setGame(updated.currentGame as Game | null);
        setLastUpdated(new Date());
      });
    })();

    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">Loading live scorecard...</Typography>
      </Box>
    );
  }

  if (error || !game) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.default', px: 3 }}>
        <Typography variant="h1" sx={{ fontSize: '3rem' }}>♠</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center' }}>
          {error || 'No active game right now.'}
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center' }}>
          Ask the scorekeeper to enable live sharing.
        </Typography>
      </Box>
    );
  }

  const completedRounds = game.rounds.filter(r => r.isComplete);
  const lastRound = completedRounds[completedRounds.length - 1];

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: { xs: 5, sm: 3 }, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            Live Spectator View
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={game.phase === 'complete' ? 'Final' : `Round ${game.currentRound} · ${game.phase === 'bidding' ? 'Bidding' : game.phase === 'tricks' ? 'Tricks' : 'Scoring'}`}
              size="small"
              color={game.phase === 'complete' ? 'success' : 'primary'}
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          {game.teams[0].name} vs {game.teams[1].name}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {game.players.filter(p => p.teamIndex === 0).map(p => p.name).join(' & ')}
          {' vs '}
          {game.players.filter(p => p.teamIndex === 1).map(p => p.name).join(' & ')}
        </Typography>
      </Box>

      {/* Current scores */}
      {lastRound && (
        <Box sx={{ px: 2.5, mb: 2, display: 'flex', gap: 1.5 }}>
          {lastRound.teamScores.map(ts => {
            const team = game.teams.find(t => t.id === ts.teamId);
            const isWinner = game.phase === 'complete' && ts.teamId === game.winnerId;
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
                <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                  {isWinner && (
                    <Chip label="Winner" size="small" color="primary" sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.65rem' }} />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {team?.name}
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 900, fontFamily: monoFont }}
                    color={isWinner ? 'primary' : 'text.primary'}
                  >
                    {ts.cumulativeScore}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                    {ts.cumulativeBags} bags
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Score history table */}
      {completedRounds.length > 0 && (
        <Box sx={{ px: 2.5, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            Round History
          </Typography>
          <ScoreHistoryTable game={game} onEditRound={() => {}} />
        </Box>
      )}

      {/* Round notes */}
      {completedRounds.some(r => r.note) && (
        <Box sx={{ px: 2.5, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            Game Notes
          </Typography>
          {completedRounds.filter(r => r.note).map(r => (
            <Box key={r.roundNumber} sx={{ mb: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Round {r.roundNumber}
              </Typography>
              <Typography variant="body2">{r.note}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3, fontSize: '0.6rem' }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
      )}

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: '0.6rem' }}>
        ♠ SpadesKeeper
      </Typography>
    </Box>
  );
}
