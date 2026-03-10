import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  AppBar,
  Toolbar,
  Chip,
  useTheme,
  alpha,
  Divider,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import BuildIcon from '@mui/icons-material/Build';
import { useGameStore } from '../../store/gameStore';
import { NilType } from '../../types';
import { getLatestTeamScore } from '../../utils/scoring';
import ScoreHistoryTable from '../../components/ScoreHistoryTable';
import { monoFont } from '../../theme';

const nilLabel: Record<NilType, string | null> = {
  none: null,
  nil: 'NIL',
  blind_nil: 'BLIND NIL',
};

export default function TricksView() {
  const theme = useTheme();
  const { currentGame, submitTricks, fixBids } = useGameStore();

  // useState must come before any early return (Rules of Hooks)
  const [tricks, setTricks] = useState<Record<string, number>>(() => {
    if (!currentGame) return {};
    const initial: Record<string, number> = {};
    currentGame.players.forEach(p => { initial[p.id] = 0; });
    return initial;
  });

  if (!currentGame) return null;

  const currentRound = currentGame.rounds[currentGame.rounds.length - 1];
  if (!currentRound) return null;

  const getPlayerBid = (playerId: string) =>
    currentRound.playerData.find(d => d.playerId === playerId);

  const updateTricks = (playerId: string, delta: number) => {
    setTricks(prev => {
      const next = Math.max(0, Math.min(13, prev[playerId] + delta));
      return { ...prev, [playerId]: next };
    });
  };

  const totalTricks = Object.values(tricks).reduce((a, b) => a + b, 0);
  const isValid = totalTricks === 13;

  const handleConfirm = () => {
    submitTricks(
      currentGame.players.map(p => ({ playerId: p.id, tricksTaken: tricks[p.id] }))
    );
  };

  const progressColor = totalTricks > 13 ? 'error' : totalTricks === 13 ? 'success' : 'primary';
  const completedRounds = currentGame.rounds.filter(r => r.isComplete);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 12 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ minHeight: 56 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Round {currentGame.currentRound} · Enter Tricks
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Assign all 13 tricks
            </Typography>
          </Box>
          <Button
            startIcon={<BuildIcon />}
            size="small"
            variant="outlined"
            onClick={fixBids}
            sx={{ fontSize: '0.75rem', mr: 0.5 }}
          >
            Fix Bids
          </Button>
        </Toolbar>
      </AppBar>

      {/* Running team scores */}
      {completedRounds.length > 0 && (
        <Box className="animate-fade-in" sx={{ display: 'flex', px: 1.5, pt: 1, gap: 1 }}>
          {currentGame.teams.map(team => {
            const { score, bags } = getLatestTeamScore(currentGame, team.id);
            return (
              <Box
                key={team.id}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.07),
                }}
              >
                <Typography variant="body1" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  {team.name}
                </Typography>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 900, lineHeight: 1.1, fontFamily: monoFont }}>
                  {score}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {bags} bags
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Progress bar */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Tricks assigned
          </Typography>
          <Typography
            variant="caption"
            color={totalTricks > 13 ? 'error' : totalTricks === 13 ? 'success.main' : 'text.secondary'}
            sx={{ fontWeight: 700, fontFamily: monoFont }}
          >
            {totalTricks} / 13
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, (totalTricks / 13) * 100)}
          color={progressColor}
          sx={{ borderRadius: 4, height: 8, transition: 'all 0.3s ease' }}
        />
      </Box>

      {/* Two-column player layout */}
      <Box sx={{ display: 'flex', px: 1.5, pt: 1.5, gap: 1 }}>
        {currentGame.teams.map((team, teamIdx) => {
          const teamPlayers = currentGame.players.filter(p => p.teamIndex === teamIdx);
          const teamTricks = teamPlayers.reduce((sum, p) => sum + (tricks[p.id] ?? 0), 0);
          const teamBidVal = currentRound.playerData
            .filter(d => {
              const player = currentGame.players.find(p => p.id === d.playerId);
              return player?.teamIndex === teamIdx && d.nilType === 'none';
            })
            .reduce((sum, d) => sum + d.bid, 0);
          const isDouble = teamBidVal >= 10;
          const teamMade = teamTricks >= teamBidVal;

          return (
            <Box key={team.id} sx={{ flex: 1 }}>
              {/* Team header */}
              <Box
                sx={{
                  textAlign: 'center',
                  py: 0.75,
                  px: 1,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
                  {team.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontFamily: monoFont, fontSize: '0.9rem' }}>
                  Bid{' '}
                  <strong style={{ color: isDouble ? theme.palette.error.main : undefined }}>
                    {teamBidVal}
                  </strong>
                  {' · '}Took{' '}
                  <strong style={{ color: teamMade ? theme.palette.success.main : theme.palette.error.main }}>
                    {teamTricks}
                  </strong>
                </Typography>
              </Box>

              {teamPlayers.map(player => {
                const bidData = getPlayerBid(player.id);
                const isNil = bidData?.nilType !== 'none';
                const nilTag = bidData ? nilLabel[bidData.nilType] : null;
                const trickCount = tricks[player.id] ?? 0;
                const nilBroken = isNil && trickCount > 0;

                return (
                  <Card
                    key={player.id}
                    sx={{
                      mb: 1,
                      border: `1.5px solid ${
                        nilBroken
                          ? alpha(theme.palette.error.main, 0.6)
                          : alpha(theme.palette.primary.main, 0.2)
                      }`,
                      bgcolor: nilBroken ? alpha(theme.palette.error.main, 0.04) : undefined,
                      transition: 'border-color 0.2s ease, background-color 0.2s ease',
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          mb: nilBroken ? 0.5 : 1,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {player.name}
                        </Typography>
                        {nilTag && (
                          <Chip
                            label={nilTag}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              bgcolor: alpha(
                                bidData?.nilType === 'blind_nil'
                                  ? theme.palette.error.main
                                  : (theme.palette.warning?.main ?? '#F5A623'),
                                0.15
                              ),
                              color:
                                bidData?.nilType === 'blind_nil'
                                  ? theme.palette.error.main
                                  : (theme.palette.warning?.main ?? '#F5A623'),
                            }}
                          />
                        )}
                      </Box>

                      {nilBroken && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ display: 'block', textAlign: 'center', mb: 0.75, fontWeight: 600 }}
                        >
                          Nil broken!
                        </Typography>
                      )}

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <IconButton
                          onClick={() => updateTricks(player.id, -1)}
                          disabled={trickCount <= 0}
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            borderRadius: 2,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 900,
                            minWidth: 40,
                            textAlign: 'center',
                            fontFamily: monoFont,
                            color: nilBroken ? theme.palette.error.main : undefined,
                          }}
                        >
                          {trickCount}
                        </Typography>
                        <IconButton
                          onClick={() => updateTricks(player.id, 1)}
                          disabled={totalTricks >= 13}
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            borderRadius: 2,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>

                      {!isNil && bidData && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontFamily: monoFont }}
                        >
                          Bid: {bidData.bid}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {/* Historical scorecard */}
      {completedRounds.length > 0 && (
        <Box sx={{ px: 1.5, mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              fontSize: '0.65rem',
              color: 'text.secondary',
              fontWeight: 700,
              display: 'block',
              mb: 1,
            }}
          >
            Round History
          </Typography>
          <ScoreHistoryTable game={currentGame} />
        </Box>
      )}

      {/* Sticky Confirm */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          px: 2,
          py: 1.5,
          pb: 'max(1.5rem, env(safe-area-inset-bottom))',
          bgcolor: alpha(theme.palette.background.default, 0.95),
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          zIndex: 10,
        }}
      >
        {totalTricks !== 13 && (
          <Typography
            variant="body2"
            color={totalTricks > 13 ? 'error' : 'text.secondary'}
            sx={{ textAlign: 'center', mb: 1, fontWeight: 600 }}
          >
            {totalTricks > 13
              ? `${totalTricks - 13} too many`
              : `${13 - totalTricks} more trick${13 - totalTricks !== 1 ? 's' : ''} needed`}
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleConfirm}
          disabled={!isValid}
          sx={{ py: 1.5, fontSize: '1.05rem', fontWeight: 700, minHeight: 56 }}
        >
          Confirm Tricks
        </Button>
      </Box>
    </Box>
  );
}
