import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { monoFont } from '../theme';

const ADMIN_EMAILS = ['alexpaynter26@gmail.com', 'alex@theamazonwhisperer.com'];

interface UserStat {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  games_played: number;
  games_completed: number;
  active_game: boolean;
  sharing_enabled: boolean;
  player_names: string;
}

export default function AdminScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore(s => s.user);
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (!isAdmin) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Typography color="error">Unauthorized</Typography>
      </Box>
    );
  }

  const totalGames = users.reduce((sum, u) => sum + u.games_completed, 0);
  const activeGames = users.filter(u => u.active_game).length;
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
              playerNames = JSON.parse(u.player_names);
            } catch { /* ignore */ }

            return (
              <Card
                key={u.user_id}
                sx={{
                  mb: 1,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
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
                        {u.email}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                          {u.games_completed} game{u.games_completed !== 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Joined {formatDate(u.created_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Last seen {formatDate(u.last_sign_in_at)}
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
                      {u.active_game && (
                        <Chip label="Playing" size="small" color="success" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                      )}
                      {u.sharing_enabled && (
                        <Chip label="Live" size="small" color="info" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
