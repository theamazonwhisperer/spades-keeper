import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import { searchUsersByEmail, createPlayerLink } from '../lib/cloudSync';
import { useAuthStore } from '../store/authStore';
import type { UserProfile } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  playerName: string;
  onLinked: () => void;
}

export default function LinkPlayerDialog({ open, onClose, playerName, onLinked }: Props) {
  const theme = useTheme();
  const user = useAuthStore(s => s.user);
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searched, setSearched] = useState(false);
  const [linking, setLinking] = useState(false);
  const [done, setDone] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setSearched(false);
    const found = await searchUsersByEmail(email.trim());
    // Exclude the current user from results
    setResults(found.filter(p => p.userId !== user?.id));
    setSearched(true);
    setSearching(false);
  };

  const handleLink = async (profile: UserProfile) => {
    if (!user) return;
    setLinking(true);
    await createPlayerLink(user.id, playerName, profile.email, profile.userId);
    setLinking(false);
    setDone(true);
    onLinked();
  };

  const handleClose = () => {
    setEmail('');
    setResults([]);
    setSearched(false);
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Link "{playerName}" to Account
      </DialogTitle>
      <DialogContent>
        {done ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <LinkIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Link request sent!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              They'll need to accept the request in their Settings.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Search by email to link this player name to a SpadesKeeper account.
              Games will auto-sync to their history once they accept.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                disabled={searching}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={searching || !email.trim()}
                sx={{ minWidth: 80 }}
              >
                {searching ? <CircularProgress size={20} /> : 'Search'}
              </Button>
            </Box>

            {searched && results.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                No users found with that email.
              </Typography>
            )}

            {results.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {results.map(profile => (
                  <Box
                    key={profile.userId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    }}
                  >
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {profile.displayName || profile.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {profile.email}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleLink(profile)}
                      disabled={linking}
                    >
                      {linking ? <CircularProgress size={16} /> : 'Link'}
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{done ? 'Done' : 'Cancel'}</Button>
      </DialogActions>
    </Dialog>
  );
}
