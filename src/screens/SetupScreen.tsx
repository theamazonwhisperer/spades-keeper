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
  Autocomplete,
  useTheme,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { getConfirmedLinksForNames } from '../lib/cloudSync';
import { GameSettings } from '../types';

export default function SetupScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { startGame, savedPlayerNames, defaultSettings } = useGameStore();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [playerMode, setPlayerMode] = useState<'4-player' | '3-player'>(
    defaultSettings.playerMode ?? '4-player'
  );

  // 4-player fields
  const [teamName1, setTeamName1] = useState('');
  const [teamName2, setTeamName2] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [p4, setP4] = useState('');

  // 3-player fields
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [s3, setS3] = useState('');

  const [winTarget, setWinTarget] = useState<200 | 300 | 500>(defaultSettings.winTarget);
  const [maxRounds, setMaxRounds] = useState<'10' | 'unlimited'>(defaultSettings.maxRounds === 10 ? '10' : 'unlimited');
  const [nilValue, setNilValue] = useState<50 | 100>(defaultSettings.nilValue);
  const [blindNilValue, setBlindNilValue] = useState<100 | 200>(defaultSettings.blindNilValue);
  const [doubleOn10, setDoubleOn10] = useState(defaultSettings.doubleOn10);
  const [failedNilCountsAsBags, setFailedNilCountsAsBags] = useState(defaultSettings.failedNilCountsAsBags);

  const canStart4 =
    teamName1.trim() && teamName2.trim() && p1.trim() && p2.trim() && p3.trim() && p4.trim();
  const canStart3 = s1.trim() && s2.trim() && s3.trim();
  const canStart = playerMode === '3-player' ? canStart3 : canStart4;

  const user = useAuthStore(s => s.user);

  const handleStart = async () => {
    if (!canStart) return;
    const settings: GameSettings = {
      winTarget,
      maxRounds: maxRounds === '10' ? 10 : null,
      nilValue,
      blindNilValue,
      doubleOn10,
      failedNilCountsAsBags,
      playerMode,
    };

    if (playerMode === '3-player') {
      const names = [s1.trim(), s2.trim(), s3.trim()];
      let linkedUserMap: Map<string, string> | undefined;
      if (user) {
        linkedUserMap = await getConfirmedLinksForNames(user.id, names);
      }
      // Each player is their own team; team name = player name
      startGame(names, names.map(n => [n]), settings, linkedUserMap);
    } else {
      let linkedUserMap: Map<string, string> | undefined;
      if (user) {
        const names = [p1.trim(), p2.trim(), p3.trim(), p4.trim()];
        linkedUserMap = await getConfirmedLinksForNames(user.id, names);
      }
      startGame(
        [teamName1.trim(), teamName2.trim()],
        [[p1.trim(), p2.trim()], [p3.trim(), p4.trim()]],
        settings,
        linkedUserMap
      );
    }
    navigate('/game');
  };

  const teamCardSx = (color: string) => ({
    border: `2px solid ${alpha(color, 0.3)}`,
    bgcolor: alpha(color, 0.04),
    mb: 2,
  });

  // Palette colors for the 3 solo-player cards
  const soloColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success?.main ?? theme.palette.primary.light,
  ];

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

        {/* Player mode toggle */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Players
          </Typography>
          <ToggleButtonGroup
            value={playerMode}
            exclusive
            onChange={(_, v) => v && setPlayerMode(v)}
            fullWidth
            size="medium"
          >
            <ToggleButton value="4-player">4 Players (Teams)</ToggleButton>
            <ToggleButton value="3-player">3 Players (Solo)</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {playerMode === '4-player' ? (
          <>
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
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={savedPlayerNames.filter(n => n !== p2 && n !== p3 && n !== p4)}
                    inputValue={p1}
                    onInputChange={(_, v) => setP1(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Player 1" placeholder="Name" size="medium" inputProps={{ ...params.inputProps, maxLength: 15 }} />
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={savedPlayerNames.filter(n => n !== p1 && n !== p3 && n !== p4)}
                    inputValue={p2}
                    onInputChange={(_, v) => setP2(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Player 2" placeholder="Name" size="medium" inputProps={{ ...params.inputProps, maxLength: 15 }} />
                    )}
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
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={savedPlayerNames.filter(n => n !== p1 && n !== p2 && n !== p4)}
                    inputValue={p3}
                    onInputChange={(_, v) => setP3(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Player 3" placeholder="Name" size="medium" inputProps={{ ...params.inputProps, maxLength: 15 }} />
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={savedPlayerNames.filter(n => n !== p1 && n !== p2 && n !== p3)}
                    inputValue={p4}
                    onInputChange={(_, v) => setP4(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Player 4" placeholder="Name" size="medium" inputProps={{ ...params.inputProps, maxLength: 15 }} />
                    )}
                  />
                </Box>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* 3-player: one card per solo player */}
            {([s1, s2, s3] as const).map((val, idx) => {
              const setters = [setS1, setS2, setS3];
              const others = [s1, s2, s3].filter((_, i) => i !== idx);
              return (
                <Card key={idx} sx={teamCardSx(soloColors[idx])}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        color: soloColors[idx],
                        fontWeight: 700,
                        fontSize: '0.65rem',
                      }}
                    >
                      Player {idx + 1}
                    </Typography>
                    <Autocomplete
                      freeSolo
                      fullWidth
                      options={savedPlayerNames.filter(n => !others.includes(n))}
                      inputValue={val}
                      onInputChange={(_, v) => setters[idx](v)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Name"
                          placeholder="Player name"
                          size="medium"
                          sx={{ mt: 1 }}
                          inputProps={{ ...params.inputProps, maxLength: 15 }}
                          inputRef={idx === 0 ? firstFieldRef : undefined}
                          autoFocus={idx === 0}
                        />
                      )}
                    />
                  </CardContent>
                </Card>
              );
            })}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, mt: -1 }}>
              17 tricks per round · 2 of hearts removed · each player scores individually
            </Typography>
          </>
        )}

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

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}>
            Failed Nil Tricks
          </Typography>
          <ToggleButtonGroup
            value={failedNilCountsAsBags}
            exclusive
            onChange={(_, v) => v !== null && setFailedNilCountsAsBags(v)}
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
