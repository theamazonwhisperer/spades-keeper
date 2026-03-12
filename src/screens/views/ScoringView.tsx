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
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { formatScore } from '../../utils/scoring';
import RenameDialog from '../../components/RenameDialog';
import ScoreHistoryTable from '../../components/ScoreHistoryTable';
import { monoFont } from '../../theme';
import { haptic } from '../../utils/haptic';

export default function ScoringView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentGame, startNextRound, undoLastRound, editRound } = useGameStore();
  const [renameOpen, setRenameOpen] = useState(false);

  if (!currentGame) return null;

  const completedRounds = currentGame.rounds.filter(r => r.isComplete);
  const latestRound = completedRounds[completedRounds.length - 1];
  if (!latestRound) return null;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 12 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton onClick={() => navigate('/')} color="inherit" sx={{ width: 40, height: 40, mr: 0.5 }}>
            <HomeIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Round {latestRound.roundNumber} · Results</Typography>
          </Box>
          <Button
            startIcon={<UndoIcon />}
            size="small"
            onClick={() => { haptic('medium'); undoLastRound(); }}
            sx={{ fontSize: '0.75rem', mr: 0.5 }}
          >
            Undo
          </Button>
          <Button
            startIcon={<EditIcon />}
            size="small"
            onClick={() => setRenameOpen(true)}
            sx={{ fontSize: '0.75rem' }}
          >
            Rename
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 1.5, pt: 1 }}>
        {/* Round result cards */}
        <Box className="stagger-children" sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {latestRound.teamScores.map(ts => {
            const team = currentGame.teams.find(t => t.id === ts.teamId);
            const madeBid = ts.teamTricks >= ts.teamBid;
            const scoreColor = madeBid
              ? theme.palette.success.main
              : theme.palette.error.main;
            const roundPositive = ts.roundTotal >= 0;

            return (
              <Card
                key={ts.teamId}
                sx={{
                  flex: 1,
                  border: `1.5px solid ${alpha(scoreColor, 0.4)}`,
                  bgcolor: alpha(scoreColor, 0.04),
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography
                    variant="h6"
                    color="primary"
                    sx={{ textAlign: 'center', fontWeight: 700, mb: 1 }}
                  >
                    {team?.name}
                  </Typography>

                  {/* Contract result */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                    }}
                  >
                    {madeBid ? (
                      <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 14, color: 'error.main' }} />
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Bid {ts.teamBid}, took {ts.teamTricks}
                      {ts.isDouble && (
                        <Chip
                          label="×2"
                          size="small"
                          color="error"
                          sx={{ ml: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      )}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, fontFamily: monoFont, color: madeBid ? 'success.main' : 'error.main', mb: 0.5 }}
                  >
                    {formatScore(ts.contractScore)}
                    {ts.bags > 0 && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                        {' '}+{ts.bags} bag{ts.bags !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Typography>

                  {/* Nil bonuses */}
                  {ts.nilBonuses.map(nb => (
                    <Box key={nb.playerId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      {nb.made ? (
                        <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                      ) : (
                        <CancelIcon sx={{ fontSize: 12, color: 'error.main' }} />
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {nb.playerName} ({nb.nilType === 'blind_nil' ? 'Blind Nil' : 'Nil'}){' '}
                        <strong style={{ color: nb.score > 0 ? theme.palette.success.main : theme.palette.error.main, fontFamily: monoFont }}>
                          {formatScore(nb.score)}
                        </strong>
                      </Typography>
                    </Box>
                  ))}

                  {/* Bag penalty */}
                  {ts.bagPenalty > 0 && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontFamily: monoFont }}>
                      Bag penalty: -{ts.bagPenalty} ({ts.cumulativeBags} bags total)
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* Round total */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="caption" color="text.secondary">
                      This round:
                    </Typography>
                    <Typography
                      variant="h6"
                      className="animate-scale-in"
                      sx={{
                        fontWeight: 800,
                        fontFamily: monoFont,
                        color: roundPositive ? theme.palette.success.main : theme.palette.error.main,
                      }}
                    >
                      {formatScore(ts.roundTotal)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="caption" color="text.secondary">
                      Running total:
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: monoFont }} color="primary">
                      {ts.cumulativeScore}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Score history */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.25 }}>
          Round History
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: 'block' }}>
          Tap a round to edit it
        </Typography>
        <ScoreHistoryTable game={currentGame} onEditRound={editRound} />
      </Box>

      {/* Sticky Next Round */}
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
          onClick={() => { haptic('confirm'); startNextRound(); }}
          endIcon={<ArrowForwardIcon />}
          sx={{ py: 1.5, fontSize: '1.05rem', minHeight: 56 }}
        >
          Next Round
        </Button>
      </Box>

      <RenameDialog open={renameOpen} onClose={() => setRenameOpen(false)} />
    </Box>
  );
}
