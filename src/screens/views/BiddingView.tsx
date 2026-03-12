import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  AppBar,
  Toolbar,
  Chip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGameStore } from '../../store/gameStore';
import { NilType } from '../../types';
import { getLatestTeamScore } from '../../utils/scoring';
import ScoreHistoryTable from '../../components/ScoreHistoryTable';
import RenameDialog from '../../components/RenameDialog';
import { monoFont } from '../../theme';
import { haptic } from '../../utils/haptic';

interface BidState {
  nilType: NilType;
  amount: number;
}

export default function BiddingView() {
  const theme = useTheme();
  const { currentGame, submitBids, editRound, editingRoundNumber, cancelEditRound } = useGameStore();
  const [renameOpen, setRenameOpen] = useState(false);

  // Initialize from existing round data if we came back via Fix Bids
  const [bids, setBids] = useState<Record<string, BidState>>(() => {
    if (!currentGame) return {};
    const existingRound = currentGame.rounds.find(
      r => r.roundNumber === currentGame.currentRound && !r.isComplete
    );
    const initial: Record<string, BidState> = {};
    currentGame.players.forEach(p => {
      if (existingRound) {
        const pd = existingRound.playerData.find(d => d.playerId === p.id);
        if (pd) {
          initial[p.id] = { nilType: pd.nilType, amount: pd.bid };
          return;
        }
      }
      initial[p.id] = { nilType: 'none', amount: 0 };
    });
    return initial;
  });

  if (!currentGame) return null;

  const updateBid = (playerId: string, delta: number) => {
    setBids(prev => {
      const cur = prev[playerId];
      if (cur.nilType !== 'none') return prev;
      const next = Math.min(13, Math.max(0, cur.amount + delta));
      return { ...prev, [playerId]: { ...cur, amount: next } };
    });
  };

  const updateNilType = (playerId: string, nilType: NilType) => {
    setBids(prev => ({ ...prev, [playerId]: { ...prev[playerId], nilType } }));
  };

  const effectiveBid = (state: BidState) => (state.nilType !== 'none' ? 0 : state.amount);

  const teamBid = (teamIdx: 0 | 1) =>
    currentGame.players
      .filter(p => p.teamIndex === teamIdx)
      .reduce((sum, p) => {
        const b = bids[p.id];
        return b?.nilType !== 'none' ? sum : sum + (b?.amount ?? 0);
      }, 0);

  const totalBids = teamBid(0) + teamBid(1);

  const handleConfirm = () => {
    haptic('confirm');
    submitBids(
      currentGame.players.map(p => ({
        playerId: p.id,
        nilType: bids[p.id]?.nilType ?? 'none',
        bid: effectiveBid(bids[p.id] ?? { nilType: 'none', amount: 0 }),
      }))
    );
  };

  const completedRounds = currentGame.rounds.filter(r => r.isComplete);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 12 }}>
      {/* Editing banner */}
      {editingRoundNumber && (
        <Box
          sx={{
            bgcolor: alpha(theme.palette.warning.main, 0.15),
            borderBottom: `2px solid ${alpha(theme.palette.warning.main, 0.4)}`,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton
            onClick={cancelEditRound}
            size="small"
            sx={{ color: theme.palette.warning.main }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.warning.main, flex: 1 }}>
            Editing Round {editingRoundNumber}
          </Typography>
          <Button
            size="small"
            onClick={cancelEditRound}
            sx={{ color: theme.palette.warning.main, fontWeight: 600, fontSize: '0.75rem' }}
          >
            Cancel
          </Button>
        </Box>
      )}

      {/* Header */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ minHeight: 56 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Round {currentGame.currentRound} · Place Bids
            </Typography>
            <Typography variant="caption" color="text.secondary">
              13 tricks in play
            </Typography>
          </Box>
          {!editingRoundNumber && (
            <IconButton onClick={() => setRenameOpen(true)} color="primary" sx={{ width: 48, height: 48 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Bidding section */}
      <Box sx={{ display: 'flex', px: 1.5, pt: 1, gap: 1 }}>
        {currentGame.teams.map((team, teamIdx) => {
          const teamPlayers = currentGame.players.filter(p => p.teamIndex === teamIdx);
          const tb = teamBid(teamIdx as 0 | 1);
          const isDouble = (currentGame.settings.doubleOn10 ?? true) && tb >= 10;
          const { score, bags } = getLatestTeamScore(currentGame, team.id);
          const hasHistory = completedRounds.length > 0;

          return (
            <Box key={team.id} sx={{ flex: 1 }}>
              {/* Merged team header */}
              <Box
                sx={{
                  textAlign: 'center',
                  py: 1,
                  px: 1,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Typography variant="h6" color="primary" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  {team.name}
                </Typography>
                {hasHistory && (
                  <>
                    <Typography
                      variant="h4"
                      color="primary"
                      sx={{ fontWeight: 900, lineHeight: 1.1, fontFamily: monoFont }}
                    >
                      {score}
                    </Typography>
                    <Typography
                      variant="body2"
                      color={bags >= 7 ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: bags >= 7 ? 700 : 400 }}
                    >
                      {bags >= 7 && '⚠ '}{bags} bag{bags !== 1 ? 's' : ''}
                    </Typography>
                  </>
                )}
                <Typography
                  variant="body1"
                  sx={{
                    color: isDouble ? theme.palette.error.main : 'text.secondary',
                    fontWeight: isDouble ? 700 : 500,
                    fontFamily: monoFont,
                    mt: hasHistory ? 0.5 : 0,
                  }}
                >
                  Bid: {tb}{isDouble && ' ×2'}
                </Typography>
              </Box>

              {teamPlayers.map(player => {
                const state = bids[player.id] ?? { nilType: 'none', amount: 0 };
                const isNil = state.nilType !== 'none';

                return (
                  <Card
                    key={player.id}
                    className="animate-scale-in"
                    sx={{
                      mb: 1,
                      border: `1.5px solid ${alpha(
                        isNil
                          ? state.nilType === 'blind_nil'
                            ? theme.palette.error.main
                            : (theme.palette.warning?.main ?? '#F5A623')
                          : theme.palette.primary.main,
                        0.3
                      )}`,
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography
                        variant="h6"
                        sx={{ textAlign: 'center', fontWeight: 700, mb: 1 }}
                      >
                        {player.name}
                      </Typography>

                      {/* Nil type selector — Nil / Blind only; neither = regular */}
                      <ToggleButtonGroup
                        value={state.nilType === 'none' ? null : state.nilType}
                        exclusive
                        onChange={(_, v) => updateNilType(player.id, v ?? 'none')}
                        size="small"
                        fullWidth
                        sx={{ mb: 1.5 }}
                      >
                        <ToggleButton value="nil" sx={{ fontSize: '0.8rem', py: 0.75, minHeight: 40, fontWeight: 600 }}>
                          Nil
                        </ToggleButton>
                        <ToggleButton value="blind_nil" sx={{ fontSize: '0.8rem', py: 0.75, minHeight: 40, fontWeight: 600 }}>
                          Blind Nil
                        </ToggleButton>
                      </ToggleButtonGroup>

                      {/* Bid counter or nil label */}
                      {isNil ? (
                        <Box sx={{ textAlign: 'center', py: 0.5 }}>
                          <Chip
                            label={state.nilType === 'blind_nil' ? '+200/−200' : '+100/−100'}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              fontFamily: monoFont,
                              bgcolor: alpha(
                                state.nilType === 'blind_nil'
                                  ? theme.palette.error.main
                                  : (theme.palette.warning?.main ?? '#F5A623'),
                                0.15
                              ),
                              color:
                                state.nilType === 'blind_nil'
                                  ? theme.palette.error.main
                                  : (theme.palette.warning?.main ?? '#F5A623'),
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                          }}
                        >
                          <IconButton
                            onClick={() => { haptic('light'); updateBid(player.id, -1); }}
                            disabled={state.amount <= 0}
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
                            sx={{ fontWeight: 900, minWidth: 40, textAlign: 'center', fontFamily: monoFont }}
                          >
                            {state.amount}
                          </Typography>
                          <IconButton
                            onClick={() => { haptic('light'); updateBid(player.id, 1); }}
                            disabled={state.amount >= 13}
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
          <ScoreHistoryTable game={currentGame} onEditRound={editingRoundNumber ? undefined : editRound} />
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
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleConfirm}
          sx={{ py: 1.5, fontSize: '1.05rem', fontWeight: 700, minHeight: 56 }}
        >
          Confirm Bids · {totalBids}/13
        </Button>
      </Box>

      <RenameDialog open={renameOpen} onClose={() => setRenameOpen(false)} />
    </Box>
  );
}
