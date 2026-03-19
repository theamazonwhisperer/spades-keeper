import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  AppBar,
  Toolbar,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ScienceIcon from '@mui/icons-material/Science';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { loadDemoGame } from '../utils/demoData';
import { getMyPlayerLinks, getPendingLinkRequests, acceptPlayerLink, declinePlayerLink, deletePlayerLink } from '../lib/cloudSync';
import { GameSettings, PlayerLink } from '../types';
import LinkPlayerDialog from '../components/LinkPlayerDialog';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    savedPlayerNames,
    addSavedPlayerName,
    removeSavedPlayerName,
    defaultSettings,
    updateDefaultSettings,
  } = useGameStore();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const currentGame = useGameStore(s => s.currentGame);

  const [newName, setNewName] = useState('');
  const [linkDialogName, setLinkDialogName] = useState<string | null>(null);
  const [playerLinks, setPlayerLinks] = useState<PlayerLink[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(PlayerLink & { ownerDisplayName: string })[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const loadLinks = async () => {
    if (!user) return;
    setLoadingLinks(true);
    const [links, requests] = await Promise.all([
      getMyPlayerLinks(user.id),
      getPendingLinkRequests(user.id),
    ]);
    setPlayerLinks(links);
    setPendingRequests(requests);
    setLoadingLinks(false);
  };

  useEffect(() => {
    loadLinks();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const getLinkForPlayer = (name: string) =>
    playerLinks.find(l => l.playerName.toLowerCase() === name.toLowerCase());

  const handleAcceptRequest = async (linkId: string) => {
    await acceptPlayerLink(linkId);
    loadLinks();
  };

  const handleDeclineRequest = async (linkId: string) => {
    await declinePlayerLink(linkId);
    loadLinks();
  };

  const handleUnlink = async (linkId: string) => {
    await deletePlayerLink(linkId);
    loadLinks();
  };

  const handleAddName = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addSavedPlayerName(trimmed);
    setNewName('');
  };

  const handleSettingChange = (key: keyof GameSettings, value: unknown) => {
    updateDefaultSettings({ ...defaultSettings, [key]: value });
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 6 }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/')}
            color="inherit"
            sx={{ width: 48, height: 48 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2.5, pt: 1 }}>
        {/* Saved Player Names */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
        >
          Saved Players
        </Typography>
        <Card sx={{ mb: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Add player name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddName(); }}
                inputProps={{ maxLength: 15 }}
              />
              <IconButton
                onClick={handleAddName}
                color="primary"
                disabled={!newName.trim()}
                sx={{ width: 40, height: 40 }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            {savedPlayerNames.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                No saved players yet. Names are also saved automatically when you start a game.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {savedPlayerNames.map(name => {
                  const link = getLinkForPlayer(name);
                  const linkIcon = link
                    ? link.status === 'confirmed'
                      ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      : <PendingIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    : undefined;

                  return (
                    <Chip
                      key={name}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {name}
                          {linkIcon}
                        </Box>
                      }
                      onDelete={() => removeSavedPlayerName(name)}
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (user && !link) {
                          setLinkDialogName(name);
                        } else if (link) {
                          handleUnlink(link.id);
                        }
                      }}
                      icon={user ? (link ? <LinkOffIcon /> : <LinkIcon />) : undefined}
                      sx={{
                        cursor: user ? 'pointer' : 'default',
                        borderColor: link?.status === 'confirmed'
                          ? alpha(theme.palette.success.main, 0.4)
                          : link?.status === 'pending'
                            ? alpha(theme.palette.warning.main, 0.4)
                            : undefined,
                      }}
                    />
                  );
                })}
              </Box>
            )}
            {user && (
              <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                Tap a player to link/unlink their account by email
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Pending Link Requests */}
        {pendingRequests.length > 0 && (
          <>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
            >
              Link Requests
            </Typography>
            <Card sx={{ mb: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}>
              <CardContent sx={{ p: 2 }}>
                {pendingRequests.map(req => (
                  <Box
                    key={req.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      '&:not(:last-child)': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` },
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {req.ownerDisplayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        wants to link you as "{req.playerName}"
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" variant="contained" color="success" onClick={() => handleAcceptRequest(req.id)}>
                        Accept
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDeclineRequest(req.id)}>
                        Decline
                      </Button>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Default Game Settings */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
        >
          Default Game Settings
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
          These defaults pre-fill when you create a new game. You can still change them per game.
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Winning Score
          </Typography>
          <ToggleButtonGroup
            value={defaultSettings.winTarget}
            exclusive
            onChange={(_, v) => v && handleSettingChange('winTarget', v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={200}>200</ToggleButton>
            <ToggleButton value={300}>300</ToggleButton>
            <ToggleButton value={500}>500</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Game Length
          </Typography>
          <ToggleButtonGroup
            value={defaultSettings.maxRounds === 10 ? '10' : 'unlimited'}
            exclusive
            onChange={(_, v) => v && handleSettingChange('maxRounds', v === '10' ? 10 : null)}
            fullWidth
            size="medium"
          >
            <ToggleButton value="10">10 Rounds Max</ToggleButton>
            <ToggleButton value="unlimited">Play Until Won</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Nil Value
          </Typography>
          <ToggleButtonGroup
            value={defaultSettings.nilValue}
            exclusive
            onChange={(_, v) => v && handleSettingChange('nilValue', v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={50}>±50 pts</ToggleButton>
            <ToggleButton value={100}>±100 pts</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Blind Nil Value
          </Typography>
          <ToggleButtonGroup
            value={defaultSettings.blindNilValue}
            exclusive
            onChange={(_, v) => v && handleSettingChange('blindNilValue', v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={100}>±100 pts</ToggleButton>
            <ToggleButton value={200}>±200 pts</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Failed Nil Tricks
          </Typography>
          <ToggleButtonGroup
            value={defaultSettings.failedNilCountsAsBags}
            exclusive
            onChange={(_, v) => v !== null && handleSettingChange('failedNilCountsAsBags', v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={false}>Count Toward Bid</ToggleButton>
            <ToggleButton value={true}>Count as Bags</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            10+ Bid Bonus
          </Typography>
          <ToggleButtonGroup
            value={defaultSettings.doubleOn10}
            exclusive
            onChange={(_, v) => v !== null && handleSettingChange('doubleOn10', v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={true}>Double Points</ToggleButton>
            <ToggleButton value={false}>Normal Points</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Button
          variant="outlined"
          fullWidth
          onClick={() => updateDefaultSettings({
            winTarget: 500,
            maxRounds: null,
            nilValue: 100,
            blindNilValue: 200,
            doubleOn10: true,
            failedNilCountsAsBags: true,
            playerMode: '4-player',
          })}
          sx={{ mb: 2 }}
        >
          Reset to Factory Defaults
        </Button>

        <Divider sx={{ my: 2 }} />

        {/* Account & Tools */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}
        >
          Account
        </Typography>

        {!currentGame && (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ScienceIcon />}
            onClick={() => { loadDemoGame(); navigate('/game'); }}
            sx={{ mb: 1.5 }}
          >
            Load Demo Game
          </Button>
        )}

        {user && ['alexpaynter26@gmail.com', 'alex@theamazonwhisperer.com'].includes(user.email ?? '') && (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AdminPanelSettingsIcon />}
            onClick={() => navigate('/admin')}
            color="warning"
            sx={{ mb: 1.5 }}
          >
            Admin Panel
          </Button>
        )}

        <Button
          variant="outlined"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={signOut}
          color="error"
          sx={{ mb: 2 }}
        >
          Sign Out
        </Button>
      </Box>

      {linkDialogName && (
        <LinkPlayerDialog
          open={!!linkDialogName}
          onClose={() => setLinkDialogName(null)}
          playerName={linkDialogName}
          onLinked={() => { setLinkDialogName(null); loadLinks(); }}
        />
      )}
    </Box>
  );
}
