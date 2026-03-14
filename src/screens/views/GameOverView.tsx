import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import ReplayIcon from '@mui/icons-material/Replay';
import ShareIcon from '@mui/icons-material/Share';
import { toPng } from 'html-to-image';
import { useGameStore } from '../../store/gameStore';
import { formatScore } from '../../utils/scoring';
import ScoreHistoryTable from '../../components/ScoreHistoryTable';
import { monoFont } from '../../theme';
import { haptic } from '../../utils/haptic';

export default function GameOverView() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentGame, abandonGame, rematch, editRound } = useGameStore();
  const scorecardRef = useRef<HTMLDivElement>(null);

  if (!currentGame) return null;

  const winner = currentGame.teams.find(t => t.id === currentGame.winnerId);
  const completedRounds = currentGame.rounds.filter(r => r.isComplete);
  const lastRound = completedRounds[completedRounds.length - 1];

  const handleNewGame = () => {
    haptic('medium');
    abandonGame();
    navigate('/setup');
  };

  const handleRematch = () => {
    haptic('confirm');
    rematch();
    navigate('/game');
  };

  const handleHome = () => {
    navigate('/');
  };

  const handleShare = async () => {
    haptic('light');
    if (!scorecardRef.current) return;

    let blob: Blob | null = null;

    try {
      const el = scorecardRef.current;

      // Temporarily force the element to render at full size for capture
      // (prevents clipping from page scroll / viewport)
      const prevOverflow = el.style.overflow;
      const prevHeight = el.style.height;
      const prevPosition = el.style.position;
      el.style.overflow = 'visible';
      el.style.height = 'auto';
      el.style.position = 'relative';

      // Scroll to top to avoid offset issues
      window.scrollTo(0, 0);

      // Small delay to let browser re-layout
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await toPng(el, {
        backgroundColor: theme.palette.mode === 'dark' ? '#0e1117' : '#f0f3f6',
        pixelRatio: 2,
        style: {
          padding: '16px',
        },
      });

      // Restore original styles
      el.style.overflow = prevOverflow;
      el.style.height = prevHeight;
      el.style.position = prevPosition;

      const res = await fetch(dataUrl);
      blob = await res.blob();
    } catch {
      // Image capture failed — fall through to text fallback
    }

    if (blob) {
      // Try native share with image
      if (navigator.share) {
        const file = new File([blob], 'spades-scorecard.png', { type: 'image/png' });
        try {
          await navigator.share({
            title: 'SpadesKeeper',
            text: winner ? `${winner.name} wins!` : 'Game over!',
            files: [file],
          });
          return;
        } catch {
          // User cancelled or share failed — fall through to download
        }
      }

      // Fallback: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spades-scorecard.png';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Final fallback: share as text
    const scores = lastRound?.teamScores ?? [];
    const text = [
      `♠ SpadesKeeper`,
      `${currentGame.teams[0].name} vs ${currentGame.teams[1].name}`,
      ...scores.map(ts => {
        const team = currentGame.teams.find(t => t.id === ts.teamId);
        const flag = ts.teamId === currentGame.winnerId ? ' 🏆' : '';
        return `${team?.name}: ${ts.cumulativeScore}${flag}`;
      }),
      winner ? `${winner.name} wins!` : `Game over`,
    ].join('\n');
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(160deg, #0e1117 0%, #162230 50%, #0e1117 100%)`
            : `linear-gradient(160deg, #f0f3f6 0%, #d6eadf 50%, #f0f3f6 100%)`,
        pb: 6,
        px: 2.5,
      }}
    >
      {/* Shareable scorecard area */}
      <Box ref={scorecardRef}>
      {/* Trophy hero */}
      <Box className="animate-scale-in" sx={{ textAlign: 'center', pt: { xs: 6, sm: 8 }, pb: 3 }}>
        <Box sx={{ fontSize: '4.5rem', mb: 1, filter: 'drop-shadow(0 4px 12px rgba(245, 166, 35, 0.3))' }}>
          🏆
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
          Game Over!
        </Typography>
        {winner && (
          <Box className="animate-slide-up" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, animationDelay: '150ms' }}>
            <EmojiEventsIcon sx={{ color: '#F5A623' }} />
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
              {winner.name} Wins!
            </Typography>
            <EmojiEventsIcon sx={{ color: '#F5A623' }} />
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
          {completedRounds.length} rounds played
        </Typography>
      </Box>

      {/* Final scores */}
      {lastRound && (
        <Box className="stagger-children" sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          {lastRound.teamScores.map(ts => {
            const team = currentGame.teams.find(t => t.id === ts.teamId);
            const isWinner = ts.teamId === currentGame.winnerId;

            return (
              <Card
                key={ts.teamId}
                sx={{
                  flex: 1,
                  border: isWinner
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  bgcolor: isWinner
                    ? alpha(theme.palette.primary.main, 0.08)
                    : undefined,
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                  {isWinner && (
                    <Chip
                      icon={<EmojiEventsIcon sx={{ fontSize: '14px !important' }} />}
                      label="Winner"
                      size="small"
                      color="primary"
                      sx={{ mb: 1, fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {team?.name}
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 900, fontFamily: monoFont }}
                    color={isWinner ? 'primary' : 'text.primary'}
                  >
                    {ts.cumulativeScore}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>
                    {ts.cumulativeBags} total bags
                  </Typography>
                  {/* Players */}
                  <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {currentGame.players
                      .filter(p => p.teamIndex === currentGame.teams.indexOf(team!))
                      .map(p => (
                        <Chip
                          key={p.id}
                          label={p.name}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Full scorecard */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.25, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            Full Scorecard
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: 'block' }}>
            Tap a round to edit it
          </Typography>
          <ScoreHistoryTable game={currentGame} onEditRound={editRound} />
        </CardContent>
      </Card>
      </Box>{/* end scorecardRef */}

      {/* Round-by-round breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
            Round Highlights
          </Typography>
          {completedRounds.map(round => (
            <Box key={round.roundNumber} sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Round {round.roundNumber}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {round.teamScores.map(ts => {
                  const team = currentGame.teams.find(t => t.id === ts.teamId);
                  return (
                    <Box
                      key={ts.teamId}
                      sx={{
                        flex: 1,
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {team?.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontFamily: monoFont,
                          color:
                            ts.roundTotal >= 0 ? theme.palette.success.main : theme.palette.error.main,
                        }}
                      >
                        {formatScore(ts.roundTotal)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              {round.roundNumber < completedRounds.length && (
                <Divider sx={{ mt: 1.5 }} />
              )}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<ReplayIcon />}
        onClick={handleRematch}
        sx={{ py: 1.8, mb: 1.5, fontSize: '1.05rem', minHeight: 56 }}
      >
        Rematch
      </Button>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<ShareIcon />}
          onClick={handleShare}
          sx={{ py: 1.6, minHeight: 56 }}
        >
          Share
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleNewGame}
          sx={{ py: 1.6, minHeight: 56 }}
        >
          New Game
        </Button>
      </Box>
      <Button
        variant="text"
        size="large"
        fullWidth
        startIcon={<HomeIcon />}
        onClick={handleHome}
        sx={{ py: 1.2, minHeight: 48, color: 'text.secondary' }}
      >
        Home
      </Button>
    </Box>
  );
}
