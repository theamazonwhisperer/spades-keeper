import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useGameStore } from '../store/gameStore';
import { GameSettings } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GameSettingsDialog({ open, onClose }: Props) {
  const { currentGame, updateSettings } = useGameStore();

  const [settings, setSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    if (open && currentGame) {
      setSettings({ ...currentGame.settings });
    }
  }, [open, currentGame]);

  if (!settings) return null;

  const handleSave = () => {
    updateSettings(settings);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Game Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2.5, mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Winning Score
          </Typography>
          <ToggleButtonGroup
            value={settings.winTarget}
            exclusive
            onChange={(_, v) => v && setSettings(s => s ? { ...s, winTarget: v } : s)}
            fullWidth
            size="small"
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
            value={settings.maxRounds === null ? 'unlimited' : '10'}
            exclusive
            onChange={(_, v) => v && setSettings(s => s ? { ...s, maxRounds: v === '10' ? 10 : null } : s)}
            fullWidth
            size="small"
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
            value={settings.nilValue}
            exclusive
            onChange={(_, v) => v && setSettings(s => s ? { ...s, nilValue: v } : s)}
            fullWidth
            size="small"
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
            value={settings.blindNilValue}
            exclusive
            onChange={(_, v) => v && setSettings(s => s ? { ...s, blindNilValue: v } : s)}
            fullWidth
            size="small"
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
            value={settings.failedNilCountsAsBags}
            exclusive
            onChange={(_, v) => v !== null && setSettings(s => s ? { ...s, failedNilCountsAsBags: v } : s)}
            fullWidth
            size="small"
          >
            <ToggleButton value={false}>Count Toward Bid</ToggleButton>
            <ToggleButton value={true}>Count as Bags</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            10+ Bid Bonus
          </Typography>
          <ToggleButtonGroup
            value={settings.doubleOn10}
            exclusive
            onChange={(_, v) => v !== null && setSettings(s => s ? { ...s, doubleOn10: v } : s)}
            fullWidth
            size="small"
          >
            <ToggleButton value={true}>Double Points</ToggleButton>
            <ToggleButton value={false}>Normal Points</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
