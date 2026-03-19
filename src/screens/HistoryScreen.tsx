import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardContent,
  Chip,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RestoreIcon from '@mui/icons-material/Restore';
import PeopleIcon from '@mui/icons-material/People';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { loadSharedGames, clearSharedGames } from '../lib/cloudSync';
import ScoreHistoryTable from '../components/ScoreHistoryTable';
import { monoFont } from '../theme';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    completedGames, deleteHistory, clearAllHistory,
    deletedGames, restoreDeletedGame, permanentlyDeleteGame, clearDeletedGames,
    importGame,
  } = useGameStore();
  const user = useAuthStore(s => s.user);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clearDialog, setClearDialog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 80;

  const handleRefresh = useCallback(async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      const sharedGames = await loadSharedGames(user.id);
      if (sharedGames.length > 0) {
        const existingIds = new Set(completedGames.map(g => g.id));
        const newGames = sharedGames.filter(g => !existingIds.has(g.id));
        newGames.forEach(g => importGame(g));
        if (sharedGames.length > 0) {
          await clearSharedGames(user.id, sharedGames.map(g => g.id));
        }
      }
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    setRefreshing(false);
    setPullDistance(0);
  }, [user, refreshing, completedGames, importGame]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current || refreshing) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= PULL_THRESHOLD) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  };

  return (
    <Box
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 4 }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: refreshing ? 48 : pullDistance,
            overflow: 'hidden',
            transition: refreshing ? 'height 0.2s ease' : 'none',
          }}
        >
          <CircularProgress
            size={24}
            thickness={5}
            variant={refreshing ? 'indeterminate' : 'determinate'}
            value={Math.min(100, (pullDistance / PULL_THRESHOLD) * 100)}
            sx={{ opacity: Math.min(1, pullDistance / (PULL_THRESHOLD * 0.5)) }}
          />
        </Box>
      )}

      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/')} color="inherit" sx={{ width: 48, height: 48 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
            Game History
          </Typography>
          {completedGames.length > 0 && (
            <IconButton color="error" onClick={() => setClearDialog(true)} sx={{ width: 48, height: 48 }}>
              <DeleteSweepIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2, pt: 1 }}>
        {completedGames.length === 0 && deletedGames.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography variant="h3" sx={{ mb: 1 }}>♠</Typography>
            <Typography color="text.secondary">No games yet.</Typography>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/setup')}>
              Start First Game
            </Button>
          </Box>
        ) : (
          <>
            {completedGames.length === 0 && (
              <Box sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
                <Typography color="text.secondary">No completed games.</Typography>
              </Box>
            )}
            {completedGames.map(game => {
              const isExpanded = expanded === game.id;
              const winner = game.teams.find(t => t.id === game.winnerId);
              const completedRounds = game.rounds.filter(r => r.isComplete);
              const lastRound = completedRounds.slice(-1)[0];
              const date = new Date(game.createdAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <Card key={game.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    {/* Header row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1">
                            {game.teams.map(t => t.name).join(' vs ')}
                          </Typography>
                          {winner && (
                            <Chip
                              icon={<EmojiEventsIcon sx={{ fontSize: '14px !important' }} />}
                              label={`${winner.name} wins`}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                          {game.sharedBy && (
                            <Chip
                              icon={<PeopleIcon sx={{ fontSize: '14px !important' }} />}
                              label={`From ${game.sharedBy}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 500, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {date} · {completedRounds.length} rounds · Target: {game.settings.winTarget}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={e => {
                            e.stopPropagation();
                            deleteHistory(game.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Final scores */}
                    {lastRound && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 2,
                          mt: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                        }}
                      >
                        {lastRound.teamScores.map(ts => {
                          const teamName = game.teams.find(t => t.id === ts.teamId)?.name;
                          const isWinner = ts.teamId === game.winnerId;
                          return (
                            <Box key={ts.teamId} sx={{ flex: 1, textAlign: 'center' }}>
                              <Typography
                                variant="caption"
                                color={isWinner ? 'primary' : 'text.secondary'}
                                sx={{ fontWeight: isWinner ? 700 : 400 }}
                              >
                                {teamName}
                                {isWinner && ' 🏆'}
                              </Typography>
                              <Typography
                                variant="h6"
                                color={isWinner ? 'primary' : 'text.primary'}
                                sx={{ fontFamily: monoFont }}
                              >
                                {ts.cumulativeScore}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    {/* Expand/collapse */}
                    <Button
                      fullWidth
                      size="small"
                      endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => setExpanded(isExpanded ? null : game.id)}
                      sx={{ mt: 1, color: 'text.secondary' }}
                    >
                      {isExpanded ? 'Hide Scorecard' : 'View Scorecard'}
                    </Button>
                  </CardContent>

                  <Collapse in={isExpanded} unmountOnExit>
                    <Box sx={{ px: 1, pb: 2 }}>
                      <ScoreHistoryTable game={game} />
                    </Box>
                  </Collapse>
                </Card>
              );
            })}

            {/* Recently Deleted Section */}
            {deletedGames.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  size="small"
                  startIcon={<RestoreIcon />}
                  endIcon={showDeleted ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowDeleted(!showDeleted)}
                  sx={{ color: 'text.secondary', mb: 1 }}
                >
                  Recently Deleted ({deletedGames.length})
                </Button>

                <Collapse in={showDeleted}>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      color="error"
                      onClick={clearDeletedGames}
                      sx={{ fontSize: '0.7rem', mb: 1 }}
                    >
                      Permanently Delete All
                    </Button>
                  </Box>

                  {deletedGames.map(game => {
                    const winner = game.teams.find(t => t.id === game.winnerId);
                    const completedRounds = game.rounds.filter(r => r.isComplete);
                    const lastRound = completedRounds.slice(-1)[0];
                    const date = new Date(game.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <Card
                        key={game.id}
                        sx={{
                          mb: 1.5,
                          opacity: 0.7,
                          border: `1px dashed ${alpha(theme.palette.text.secondary, 0.3)}`,
                        }}
                      >
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {game.teams.map(t => t.name).join(' vs ')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {date} · {completedRounds.length} rounds
                                {winner && ` · ${winner.name} won`}
                              </Typography>
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
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => restoreDeletedGame(game.id)}
                                title="Restore"
                              >
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => permanentlyDeleteGame(game.id)}
                                title="Delete permanently"
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Collapse>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Clear all dialog */}
      <Dialog open={clearDialog} onClose={() => setClearDialog(false)}>
        <DialogTitle>Clear All History?</DialogTitle>
        <DialogContent>
          <Typography>
            This will delete all {completedGames.length} saved games. They can be recovered from the "Recently Deleted" section.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialog(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              clearAllHistory();
              setClearDialog(false);
            }}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
