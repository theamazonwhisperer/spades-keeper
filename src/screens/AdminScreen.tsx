import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Game } from '../types';
import ScoreHistoryTable from '../components/ScoreHistoryTable';
import { monoFont } from '../theme';

const ADMIN_EMAILS = ['alexpaynter26@gmail.com', 'alex@theamazonwhisperer.com'];

interface UserStat {
  out_user_id: string;
  out_email: string;
  out_created_at: string;
  out_last_sign_in_at: string | null;
  out_games_played: number;
  out_games_completed: number;
  out_active_game: boolean;
  out_sharing_enabled: boolean;
  out_player_names: string;
}

interface UserDetail {
  currentGame: Game | null;
  completedGames: Game[];
  savedGames: Game[];
}

export default function AdminScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore(s => s.user);
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [selectedUser, setSelectedUser] = useState<UserStat | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? '');

  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized');
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error: err } = await supabase.rpc('get_admin_user_stats');
      if (err) {
        setError(err.message);
      } else {
        setUsers(data as UserStat[]);
      }
      setLoading(false);
    })();
  }, [isAdmin]);

  const handleUserClick = async (u: UserStat) => {
    setSelectedUser(u);
    setDetailLoading(true);
    setUserDetail(null);

    const { data, error: err } = await supabase.rpc('get_admin_user_detail', {
      target_user_id: u.out_user_id,
    });

    if (err || !data || data.length === 0) {
      setUserDetail({ currentGame: null, completedGames: [], savedGames: [] });
    } else {
      const gs = data[0].out_game_state;
      setUserDetail({
        currentGame: (gs?.currentGame as Game) ?? null,
        completedGames: (gs?.completedGames as Game[]) ?? [],
        savedGames: (gs?.savedGames as Game[]) ?? [],
      });
    }
    setDetailLoading(false);
  };

  if (!isAdmin) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Typography color="error">Unauthorized</Typography>
      </Box>
    );
  }

  const totalGames = users.reduce((sum, u) => sum + u.out_games_completed, 0);
  const activeGames = users.filter(u => u.out_active_game).length;
  const totalUsers = users.length;

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatGameDate = (d: string) => {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Detail view for a selected user
  if (selectedUser) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 4 }}>
        <AppBar position="static" color="transparent" elevation={0}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setSelectedUser(null)} color="inherit" sx={{ width: 48, height: 48 }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ ml: 1, flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedUser.out_email}
              </Typography>
            </Box>
            <Chip label="Admin" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
          </Toolbar>
        </AppBar>

        {detailLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress />
          </Box>
        ) : !userDetail ? (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography color="text.secondary">No data found</Typography>
          </Box>
        ) : (
          <Box sx={{ px: 2.5, pt: 1 }}>
            {/* User summary */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Card sx={{ flex: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: monoFont }}>
                    {userDetail.completedGames.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Completed</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: monoFont }}>
                    {userDetail.savedGames.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Saved</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: monoFont, color: userDetail.currentGame ? theme.palette.success.main : 'text.disabled' }}>
                    {userDetail.currentGame ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Active Game</Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Active game scorecard */}
            {userDetail.currentGame && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
                  Active Game
                </Typography>
                <GameDetailCard game={userDetail.currentGame} theme={theme} />
              </Box>
            )}

            {/* Completed games */}
            {userDetail.completedGames.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
                  Completed Games ({userDetail.completedGames.length})
                </Typography>
                {userDetail.completedGames.map(game => (
                  <GameDetailCard key={game.id} game={game} theme={theme} />
                ))}
              </Box>
            )}

            {/* Saved / paused games */}
            {userDetail.savedGames.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
                  Saved Games ({userDetail.savedGames.length})
                </Typography>
                {userDetail.savedGames.map(game => (
                  <GameDetailCard key={game.id} game={game} theme={theme} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  }

  // Main user list view
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 4 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/')} color="inherit" sx={{ width: 48, height: 48 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
            Admin Dashboard
          </Typography>
          <Chip label="Admin" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
        </Toolbar>
      </AppBar>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', pt: 8 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2.5, pt: 1 }}>
          {/* Summary cards */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Card sx={{ flex: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <PeopleIcon sx={{ fontSize: 28, color: theme.palette.primary.main, mb: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: monoFont }}>
                  {totalUsers}
                </Typography>
                <Typography variant="caption" color="text.secondary">Users</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <SportsEsportsIcon sx={{ fontSize: 28, color: theme.palette.primary.main, mb: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: monoFont }}>
                  {totalGames}
                </Typography>
                <Typography variant="caption" color="text.secondary">Games</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                <VisibilityIcon sx={{ fontSize: 28, color: theme.palette.success.main, mb: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: monoFont }}>
                  {activeGames}
                </Typography>
                <Typography variant="caption" color="text.secondary">Active Now</Typography>
              </CardContent>
            </Card>
          </Box>

          {/* User list */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
          >
            All Users ({totalUsers})
          </Typography>
          {users.map((u, i) => {
            let playerNames: string[] = [];
            try {
              playerNames = JSON.parse(u.out_player_names);
            } catch { /* ignore */ }

            return (
              <Card
                key={u.out_user_id}
                sx={{
                  mb: 1,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  cursor: 'pointer',
                  '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3) },
                }}
              >
                <CardActionArea onClick={() => handleUserClick(u)} sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontFamily: monoFont, fontWeight: 700, minWidth: 24, textAlign: 'center' }}
                    >
                      #{i + 1}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.out_email}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                          {u.out_games_completed} game{u.out_games_completed !== 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Joined {formatDate(u.out_created_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Last seen {formatDate(u.out_last_sign_in_at)}
                        </Typography>
                      </Box>
                      {playerNames.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                          {playerNames.map(name => (
                            <Chip key={name} label={name} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      {u.out_active_game && (
                        <Chip label="Playing" size="small" color="success" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                      )}
                      {u.out_sharing_enabled && (
                        <Chip label="Live" size="small" color="info" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                      )}
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// Expandable game detail card with scorecard
function GameDetailCard({ game, theme }: { game: Game; theme: ReturnType<typeof useTheme> }) {
  const [expanded, setExpanded] = useState(false);
  const completedRounds = game.rounds.filter(r => r.isComplete);
  const lastRound = completedRounds[completedRounds.length - 1];
  const winner = game.teams.find(t => t.id === game.winnerId);

  return (
    <Card sx={{ mb: 1.5, border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
      <CardActionArea onClick={() => setExpanded(!expanded)} sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {game.teams[0].name} vs {game.teams[1].name}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', display: 'block' }}>
              {game.players.filter(p => p.teamIndex === 0).map(p => p.name).join(' & ')}
              {' vs '}
              {game.players.filter(p => p.teamIndex === 1).map(p => p.name).join(' & ')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
              {lastRound && lastRound.teamScores.map(ts => {
                const team = game.teams.find(t => t.id === ts.teamId);
                const isWinner = ts.teamId === game.winnerId;
                return (
                  <Typography key={ts.teamId} variant="body2" sx={{ fontFamily: monoFont, fontWeight: isWinner ? 900 : 400, color: isWinner ? theme.palette.primary.main : 'text.secondary' }}>
                    {team?.name}: {ts.cumulativeScore}
                  </Typography>
                );
              })}
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            {winner && (
              <Chip label={`${winner.name} wins`} size="small" color="primary" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 700, mb: 0.5 }} />
            )}
            {game.phase !== 'complete' && (
              <Chip label={`R${game.currentRound} · ${game.phase}`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />
            )}
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.55rem', mt: 0.5 }}>
              {completedRounds.length} round{completedRounds.length !== 1 ? 's' : ''}
              {game.completedAt && ` · ${new Date(game.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>

      {/* Expanded scorecard */}
      {expanded && completedRounds.length > 0 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <ScoreHistoryTable game={game} onEditRound={() => {}} />
          {/* Show round notes */}
          {completedRounds.some(r => r.note) && (
            <Box sx={{ mt: 1.5 }}>
              {completedRounds.filter(r => r.note).map(r => (
                <Typography key={r.roundNumber} variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}>
                  R{r.roundNumber}: {r.note}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
}
