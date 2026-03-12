import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  IconButton,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGameStore } from '../store/gameStore';
import { GameSettings } from '../types';

export default function SetupScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { startGame } = useGameStore();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [teamName1, setTeamName1] = useState('');
  const [teamName2, setTeamName2] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [p4, setP4] = useState('');
  const [winTarget, setWinTarget] = useState<200 | 300 | 500>(500);
  const [maxRounds, setMaxRounds] = useState<'10' | 'unlimited'>('unlimited');
  const [nilValue, setNilValue] = useState<50 | 100>(100);
  const [blindNilValue, setBlindNilValue] = useState<100 | 200>(200);
  const [doubleOn10, setDoubleOn10] = useState(true);

  const canStart =
    teamName1.trim() && teamName2.trim() && p1.trim() && p2.trim() && p3.trim() && p4.trim();

  const handleStart = () => {
    if (!canStart) return;
    const settings: GameSettings = {
      winTarget,
      maxRounds: maxRounds === '10' ? 10 : null,
      nilValue,
      blindNilValue,
      doubleOn10,
    };
    startGame(
      [teamName1.trim(), teamName2.trim()],
      [
        [p1.trim(), p2.trim()],
        [p3.trim(), p4.trim()],
      ],
      settings
    );
    navigate('/game');
  };

  const teamCardSx = (color: string) => ({
    border: `2px solid ${alpha(color, 0.3)}`,
    bgcolor: alpha(color, 0.04),
    mb: 2,
  });

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
            New Game
          </Typography>
        </Toolbar>
      </AppBar>

      <Box className="stagger-children" sx={{ px: 2.5, pt: 1 }}>
        {/* Team 1 */}
        <Card sx={teamCardSx(theme.palette.primary.main)}>
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                color: theme.palette.primary.main,
                fontWeight: 700,
                fontSize: '0.65rem',
              }}
            >
              Team 1
            </Typography>
            <TextField
              fullWidth
              label="Team Name"
              value={teamName1}
              onChange={e => setTeamName1(e.target.value)}
              variant="outlined"
              size="medium"
              sx={{ mt: 1, mb: 1.5 }}
              placeholder="e.g. MLK"
              inputProps={{ maxLength: 20 }}
              inputRef={firstFieldRef}
              autoFocus
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                label="Player 1"
                value={p1}
                onChange={e => setP1(e.target.value)}
                variant="outlined"
                size="medium"
                placeholder="Name"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                fullWidth
                label="Player 2"
                value={p2}
                onChange={e => setP2(e.target.value)}
                variant="outlined"
                size="medium"
                placeholder="Name"
                inputProps={{ maxLength: 15 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Team 2 */}
        <Card sx={teamCardSx(theme.palette.secondary.main)}>
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                color: theme.palette.secondary.main,
                fontWeight: 700,
                fontSize: '0.65rem',
              }}
            >
              Team 2
            </Typography>
            <TextField
              fullWidth
              label="Team Name"
              value={teamName2}
              onChange={e => setTeamName2(e.target.value)}
              variant="outlined"
              size="medium"
              sx={{ mt: 1, mb: 1.5 }}
              placeholder="e.g. JFK"
              inputProps={{ maxLength: 20 }}
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                label="Player 3"
                value={p3}
                onChange={e => setP3(e.target.value)}
                variant="outlined"
                size="medium"
                placeholder="Name"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                fullWidth
                label="Player 4"
                value={p4}
                onChange={e => setP4(e.target.value)}
                variant="outlined"
                size="medium"
                placeholder="Name"
                inputProps={{ maxLength: 15 }}
              />
            </Box>
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />

        {/* Settings */}
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Game Settings
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Winning Score
          </Typography>
          <ToggleButtonGroup
            value={winTarget}
            exclusive
            onChange={(_, v) => v && setWinTarget(v)}
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
            value={maxRounds}
            exclusive
            onChange={(_, v) => v && setMaxRounds(v)}
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
            value={nilValue}
            exclusive
            onChange={(_, v) => v && setNilValue(v)}
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
            value={blindNilValue}
            exclusive
            onChange={(_, v) => v && setBlindNilValue(v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={100}>±100 pts</ToggleButton>
            <ToggleButton value={200}>±200 pts</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            10+ Bid Bonus
          </Typography>
          <ToggleButtonGroup
            value={doubleOn10}
            exclusive
            onChange={(_, v) => v !== null && setDoubleOn10(v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value={true}>Double Points</ToggleButton>
            <ToggleButton value={false}>Normal Points</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleStart}
          disabled={!canStart}
          sx={{ py: 1.8, fontSize: '1.05rem', minHeight: 56 }}
        >
          Start Game ♠
        </Button>
      </Box>
    </Box>
  );
}
