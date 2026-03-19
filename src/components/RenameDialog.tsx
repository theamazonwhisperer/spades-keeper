import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import { useGameStore } from '../store/gameStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RenameDialog({ open, onClose }: Props) {
  const theme = useTheme();
  const { currentGame, renamePlayer, renameTeam } = useGameStore();

  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  useEffect(() => {
    if (open && currentGame) {
      setTeamNames(currentGame.teams.map(t => t.name));
      setPlayerNames(currentGame.players.map(p => p.name));
    }
  }, [open, currentGame]);

  if (!currentGame) return null;

  const is3Player = currentGame.settings.playerMode === '3-player';

  const handleSave = () => {
    currentGame.teams.forEach((team, teamIdx) => {
      renameTeam(team.id, teamNames[teamIdx]);
    });
    currentGame.players.forEach((player, idx) => {
      if (playerNames[idx] !== player.name) {
        renamePlayer(player.id, playerNames[idx]);
      }
    });
    // In 3-player mode, team name mirrors the single player's name
    if (is3Player) {
      currentGame.teams.forEach((team, teamIdx) => {
        const teamPlayer = currentGame.players.find(p => p.teamIndex === teamIdx);
        if (teamPlayer) {
          renameTeam(team.id, playerNames[currentGame.players.indexOf(teamPlayer)]);
        }
      });
    }
    onClose();
  };

  const updateTeamName = (idx: number, value: string) => {
    setTeamNames(prev => { const next = [...prev]; next[idx] = value; return next; });
  };

  const updatePlayerName = (idx: number, value: string) => {
    setPlayerNames(prev => { const next = [...prev]; next[idx] = value; return next; });
  };

  const canSave = is3Player
    ? playerNames.every(n => n.trim())
    : teamNames.every(n => n.trim()) && playerNames.every(n => n.trim());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {is3Player ? 'Rename Players' : 'Rename Players & Teams'}
      </DialogTitle>
      <DialogContent dividers>
        {currentGame.teams.map((team, teamIdx) => {
          const teamPlayers = currentGame.players.filter(p => p.teamIndex === teamIdx);

          return (
            <Box key={team.id} sx={{ mb: teamIdx < currentGame.teams.length - 1 ? 2 : 0 }}>
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  display: 'block',
                  mb: 1,
                }}
              >
                {is3Player ? `Player ${teamIdx + 1}` : `Team ${teamIdx + 1}`}
              </Typography>

              {/* Team name field — hidden in 3-player (team name auto-mirrors player) */}
              {!is3Player && (
                <TextField
                  fullWidth
                  label="Team Name"
                  value={teamNames[teamIdx] ?? ''}
                  onChange={e => updateTeamName(teamIdx, e.target.value)}
                  size="medium"
                  sx={{
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                  inputProps={{ maxLength: 20 }}
                />
              )}

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {teamPlayers.map(player => {
                  const globalIdx = currentGame.players.indexOf(player);
                  return (
                    <TextField
                      key={player.id}
                      fullWidth
                      label={is3Player ? 'Name' : `Player ${globalIdx + 1}`}
                      value={playerNames[globalIdx] ?? ''}
                      onChange={e => updatePlayerName(globalIdx, e.target.value)}
                      size="medium"
                      inputProps={{ maxLength: 15 }}
                    />
                  );
                })}
              </Box>

              {teamIdx < currentGame.teams.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!canSave}
        >
          Save Names
        </Button>
      </DialogActions>
    </Dialog>
  );
}
