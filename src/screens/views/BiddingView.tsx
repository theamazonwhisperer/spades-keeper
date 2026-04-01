import { useState, useRef } from 'react';
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { NilType } from '../../types';
import { getLatestTeamScore, getTricksPerRound } from '../../utils/scoring';
import ScoreHistoryTable from '../../components/ScoreHistoryTable';
import RenameDialog from '../../components/RenameDialog';
import EndGameDialog from '../../components/EndGameDialog';
import GameSettingsDialog from '../../components/GameSettingsDialog';
import SpectatorListDialog from '../../components/SpectatorListDialog';
import { monoFont } from '../../theme';
import { haptic } from '../../utils/haptic';
import { shareScorecard } from '../../utils/shareScorecard';

interface BidState {
  nilType: NilType;
  amount: number;
}

export default function BiddingView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentGame, submitBids, editRound, editingRoundNumber, cancelEditRound } = useGameStore();
  const { user } = useAuthStore();
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [endGameOpen, setEndGameOpen] = useState(false);
  const [spectatorOpen, setSpectatorOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

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

  const tricksPerRound = getTricksPerRound(currentGame);
  const is3Player = currentGame.settings.playerMode === '3-player';

  const updateBid = (playerId: string, delta: number) => {
    setBids(prev => {
      const cur = prev[playerId];
      if (cur.nilType !== 'none') return prev;
      const next = Math.min(tricksPerRound, Math.max(0, cur.amount + delta));
      return { ...prev, [playerId]: { ...cur, amount: next } };
    });
  };

  const updateNilType = (playerId: string, nilType: NilType) => {
    setBids(prev => ({ ...prev, [playerId]: { ...prev[playerId], nilType } }));
  };

  const effectiveBid = (state: BidState) => (state.nilType !== 'none' ? 0 : state.amount);

  const teamBid = (teamIdx: number) =>
    currentGame.players
      .filter(p => p.teamIndex === teamIdx)
      .reduce((sum, p) => {
        const b = bids[p.id];
        return b?.nilType !== 'none' ? sum : sum + (b?.amount ?? 0);
      }, 0);

  const totalBids = currentGame.teams.reduce((sum, _, idx) => sum + teamBid(idx), 0);

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
          {!editingRoundNumber && (
            <IconButton onClick={() => navigate('/')} color="inherit" sx={{ width: 40, height: 40, mr: 0.5 }}>
              <HomeIcon fontSize="small" />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              Round {currentGame.currentRound} · Place Bids
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tricksPerRound} tricks in play
            </Typography>
          </Box>
          {!editingRoundNumber && (
            <IconButton
              onClick={e => setMenuAnchor(e.currentTarget)}
              color="primary"
              sx={{ width: 40, height: 40 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Overflow menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (scoreCardRef.current) shareScorecard({ element: scoreCardRef.current, isDark: theme.palette.mode === 'dark' });
          }}
          disabled={completedRounds.length === 0}
        >
          <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Share Scorecard</ListItemText>
        </MenuItem>
        {user && currentGame && (
          <MenuItem
            onClick={async () => {
              setMenuAnchor(null);
              const url = `${window.location.origin}/import-game/${user.id}/${currentGame.id}`;
              try {
                await navigator.clipboard.writeText(url);
                setSnackMsg('Game link copied!');
              } catch {
                setSnackMsg(url);
              }
              haptic('light');
            }}
          >
            <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Share Link</ListItemText>
          </MenuItem>
        )}
        {user && (
          <MenuItem onClick={() => { setMenuAnchor(null); setSpectatorOpen(true); }}>
            <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Spectators</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { setMenuAnchor(null); setRenameOpen(true); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Rename Teams</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setSettingsOpen(true); }}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Game Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setEndGameOpen(true); }}>
          <ListItemIcon><StopCircleIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>End Game</ListItemText>
        </MenuItem>
      </Menu>

      {/* Bidding section */}
      <Box sx={{ display: 'flex', px: is3Player ? 0.75 : 1.5, pt: 1, gap: is3Player ? 0.5 : 1 }}>
        {currentGame.teams.map((team, teamIdx) => {
          const teamPlayers = currentGame.players.filter(p => p.teamIndex === teamIdx);
          const tb = teamBid(teamIdx);
          const isDouble = (currentGame.settings.doubleOn10 ?? true) && tb >= 10;
          const { score, bags } = getLatestTeamScore(currentGame, team.id);
          const hasHistory = completedRounds.length > 0;
          const btnSize = is3Player ? 36 : 48;

          return (
            <Box key={team.id} sx={{ flex: 1, minWidth: 0 }}>
              {/* Merged team header */}
              <Box
                sx={{
                  textAlign: 'center',
                  py: is3Player ? 0.5 : 1,
                  px: is3Player ? 0.5 : 1,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Typography
                  variant={is3Player ? 'body2' : 'h6'}
                  color="primary"
                  sx={{ fontWeight: 800, lineHeight: 1.1 }}
                  noWrap
                >
                  {team.name}
                </Typography>
                {hasHistory && (
                  <>
                    <Typography
                      variant={is3Player ? 'h5' : 'h4'}
                      color="primary"
                      sx={{ fontWeight: 900, lineHeight: 1.1, fontFamily: monoFont }}
                    >
                      {score}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={bags >= 7 ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: bags >= 7 ? 700 : 400, display: 'block' }}
                    >
                      {bags >= 7 && '⚠ '}{bags} bag{bags !== 1 ? 's' : ''}
                    </Typography>
                  </>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: isDouble ? theme.palette.error.main : 'text.secondary',
                    fontWeight: isDouble ? 700 : 500,
                    fontFamily: monoFont,
                    display: 'block',
                    mt: hasHistory ? 0.25 : 0,
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
                    <CardContent sx={{ p: is3Player ? 1 : 1.5, '&:last-child': { pb: is3Player ? 1 : 1.5 } }}>
                      <Typography
                        variant={is3Player ? 'body2' : 'h6'}
                        sx={{ textAlign: 'center', fontWeight: 700, mb: 0.75 }}
                        noWrap
                      >
                        {player.name}
                      </Typography>

                      {/* Nil type selector */}
                      <ToggleButtonGroup
                        value={state.nilType === 'none' ? null : state.nilType}
                        exclusive
                        onChange={(_, v) => updateNilType(player.id, v ?? 'none')}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        <ToggleButton value="nil" sx={{ fontSize: is3Player ? '0.65rem' : '0.8rem', py: is3Player ? 0.5 : 0.75, minHeight: is3Player ? 32 : 40, fontWeight: 600, px: 0.5 }}>
                          Nil
                        </ToggleButton>
                        <ToggleButton value="blind_nil" sx={{ fontSize: is3Player ? '0.65rem' : '0.8rem', py: is3Player ? 0.5 : 0.75, minHeight: is3Player ? 32 : 40, fontWeight: 600, px: 0.5 }}>
                          {is3Player ? 'Blind' : 'Blind Nil'}
                        </ToggleButton>
                      </ToggleButtonGroup>

                      {/* Bid counter or nil label */}
                      {isNil ? (
                        <Box sx={{ textAlign: 'center', py: 0.25 }}>
                          <Chip
                            label={state.nilType === 'blind_nil' ? '+200/−200' : '+100/−100'}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: is3Player ? '0.6rem' : '0.75rem',
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
                            gap: is3Player ? 0.5 : 1,
                          }}
                        >
                          <IconButton
                            onClick={() => { haptic('light'); updateBid(player.id, -1); }}
                            disabled={state.amount <= 0}
                            sx={{
                              width: btnSize,
                              height: btnSize,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              borderRadius: 2,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                            }}
                          >
                            <RemoveIcon fontSize={is3Player ? 'small' : 'medium'} />
                          </IconButton>
                          <Typography
                            variant={is3Player ? 'h5' : 'h4'}
                            sx={{ fontWeight: 900, minWidth: is3Player ? 28 : 40, textAlign: 'center', fontFamily: monoFont }}
                          >
                            {state.amount}
                          </Typography>
                          <IconButton
                            onClick={() => { haptic('light'); updateBid(player.id, 1); }}
                            disabled={state.amount >= tricksPerRound}
                            sx={{
                              width: btnSize,
                              height: btnSize,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              borderRadius: 2,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                            }}
                          >
                            <AddIcon fontSize={is3Player ? 'small' : 'medium'} />
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
        <Box ref={scoreCardRef} sx={{ px: 1.5, mt: 3 }}>
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
          Confirm Bids · {totalBids}/{tricksPerRound}
        </Button>
      </Box>

      <RenameDialog open={renameOpen} onClose={() => setRenameOpen(false)} />
      <GameSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <EndGameDialog externalOpen={endGameOpen} onExternalClose={() => setEndGameOpen(false)} />
      <SpectatorListDialog open={spectatorOpen} onClose={() => setSpectatorOpen(false)} />
      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')} message={snackMsg} />
    </Box>
  );
}
