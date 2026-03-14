import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { haptic } from '../utils/haptic';

export default function EndGameDialog() {
  const navigate = useNavigate();
  const { currentGame, endGameEarly } = useGameStore();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!currentGame || currentGame.phase === 'complete') return null;

  const completedRounds = currentGame.rounds.filter(r => r.isComplete).length;

  const handleFirstConfirm = () => {
    setConfirmed(true);
  };

  const handleFinalConfirm = () => {
    haptic('medium');
    endGameEarly();
    setOpen(false);
    setConfirmed(false);
    navigate('/game');
  };

  const handleClose = () => {
    setOpen(false);
    setConfirmed(false);
  };

  return (
    <>
      <Button
        startIcon={<StopIcon />}
        size="small"
        color="error"
        onClick={() => setOpen(true)}
        sx={{ fontSize: '0.75rem' }}
      >
        End
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {confirmed ? 'Are you really sure?' : 'End Game Early?'}
        </DialogTitle>
        <DialogContent>
          {confirmed ? (
            <Typography>
              This will finalize the game with the current scores after {completedRounds} round{completedRounds !== 1 ? 's' : ''}.
              The team with the higher score will be declared the winner.
            </Typography>
          ) : (
            <Typography>
              {completedRounds === 0
                ? 'No rounds have been completed. The game will be discarded.'
                : `The game will end after ${completedRounds} round${completedRounds !== 1 ? 's' : ''} and scores will be saved.`}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {confirmed ? (
            <Button
              color="error"
              variant="contained"
              onClick={handleFinalConfirm}
            >
              Yes, End Game
            </Button>
          ) : (
            <Button
              color="error"
              variant="outlined"
              onClick={handleFirstConfirm}
            >
              End Game
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
