import { useState } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useGameStore } from '../store/gameStore';
import { GameSettings } from '../types';

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

  const [newName, setNewName] = useState('');

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
                {savedPlayerNames.map(name => (
                  <Chip
                    key={name}
                    label={name}
                    onDelete={() => removeSavedPlayerName(name)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

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
            failedNilCountsAsBags: false,
          })}
          sx={{ mb: 2 }}
        >
          Reset to Factory Defaults
        </Button>
      </Box>
    </Box>
  );
}
