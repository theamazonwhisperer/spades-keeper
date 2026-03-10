import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { Game } from '../types';
import { formatScore } from '../utils/scoring';
import { monoFont } from '../theme';

interface Props {
  game: Game;
}

export default function ScoreHistoryTable({ game }: Props) {
  const theme = useTheme();
  const completedRounds = game.rounds.filter(r => r.isComplete);

  if (completedRounds.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No rounds completed yet.
      </Typography>
    );
  }

  const lastRound = completedRounds[completedRounds.length - 1];
  const team0 = game.teams[0];
  const team1 = game.teams[1];

  const cellSx = {
    py: 0.75,
    px: 1,
    fontSize: '0.75rem',
    fontFamily: monoFont,
    borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  };

  const headerSx = {
    ...cellSx,
    fontWeight: 700,
    color: theme.palette.primary.main,
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 280 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headerSx, width: 24 }}>#</TableCell>
            {/* Team 0 */}
            <TableCell sx={headerSx} align="center" colSpan={3}>
              {team0.name}
            </TableCell>
            {/* Team 1 */}
            <TableCell sx={headerSx} align="center" colSpan={3}>
              {team1.name}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ ...cellSx, color: 'text.secondary' }} />
            <TableCell sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
              Bid
            </TableCell>
            <TableCell sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
              Score
            </TableCell>
            <TableCell sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
              Bags
            </TableCell>
            <TableCell sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
              Bid
            </TableCell>
            <TableCell sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
              Score
            </TableCell>
            <TableCell sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
              Bags
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {completedRounds.map(round => {
            const ts0 = round.teamScores.find(ts => ts.teamId === team0.id);
            const ts1 = round.teamScores.find(ts => ts.teamId === team1.id);
            const s0Positive = (ts0?.roundTotal ?? 0) >= 0;
            const s1Positive = (ts1?.roundTotal ?? 0) >= 0;

            return (
              <TableRow
                key={round.roundNumber}
                sx={{
                  '&:nth-of-type(even)': {
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  },
                }}
              >
                <TableCell sx={{ ...cellSx, fontWeight: 600, color: 'text.secondary' }}>
                  {round.roundNumber}
                </TableCell>
                {/* Team 0 */}
                <TableCell sx={cellSx} align="center">
                  {ts0?.teamBid}
                  {ts0?.isDouble && <span style={{ color: theme.palette.error.main, fontSize: '0.6rem' }}>×2</span>}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: 700,
                    color: s0Positive ? theme.palette.success.main : theme.palette.error.main,
                  }}
                  align="center"
                >
                  {ts0 ? formatScore(ts0.roundTotal) : '-'}
                  {ts0?.bagPenalty ? (
                    <Typography
                      component="div"
                      sx={{ fontSize: '0.6rem', color: theme.palette.error.main, lineHeight: 1 }}
                    >
                      -{ts0.bagPenalty}⚠
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell sx={{ ...cellSx, color: 'text.secondary' }} align="center">
                  {ts0?.bags ?? '-'}
                </TableCell>
                {/* Team 1 */}
                <TableCell sx={cellSx} align="center">
                  {ts1?.teamBid}
                  {ts1?.isDouble && <span style={{ color: theme.palette.error.main, fontSize: '0.6rem' }}>×2</span>}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellSx,
                    fontWeight: 700,
                    color: s1Positive ? theme.palette.success.main : theme.palette.error.main,
                  }}
                  align="center"
                >
                  {ts1 ? formatScore(ts1.roundTotal) : '-'}
                  {ts1?.bagPenalty ? (
                    <Typography
                      component="div"
                      sx={{ fontSize: '0.6rem', color: theme.palette.error.main, lineHeight: 1 }}
                    >
                      -{ts1.bagPenalty}⚠
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell sx={{ ...cellSx, color: 'text.secondary' }} align="center">
                  {ts1?.bags ?? '-'}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Bag fine rows if applicable */}
          {lastRound.teamScores.some(ts => ts.cumulativeBags >= 10) && (
            <TableRow>
              <TableCell
                sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem', fontStyle: 'italic' }}
                colSpan={1}
              >
                Bags fine
              </TableCell>
              <TableCell colSpan={2} />
              <TableCell sx={{ ...cellSx, color: theme.palette.error.main, fontWeight: 700 }} align="center">
                {lastRound.teamScores.find(ts => ts.teamId === team0.id)?.cumulativeBags ?? 0}
              </TableCell>
              <TableCell colSpan={2} />
              <TableCell sx={{ ...cellSx, color: theme.palette.error.main, fontWeight: 700 }} align="center">
                {lastRound.teamScores.find(ts => ts.teamId === team1.id)?.cumulativeBags ?? 0}
              </TableCell>
            </TableRow>
          )}

          {/* Totals row */}
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
            <TableCell sx={{ ...cellSx, fontWeight: 800, fontSize: '0.75rem' }}>
              Total
            </TableCell>
            <TableCell colSpan={2} />
            <TableCell colSpan={1} />
            <TableCell colSpan={2} />
            <TableCell colSpan={1} />
          </TableRow>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
            <TableCell sx={{ ...cellSx, fontWeight: 800 }} colSpan={1} />
            <TableCell
              colSpan={3}
              sx={{ ...cellSx, fontWeight: 900, fontSize: '1rem' }}
              align="center"
            >
              <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>
                {lastRound.teamScores.find(ts => ts.teamId === team0.id)?.cumulativeScore ?? 0}
              </Typography>
            </TableCell>
            <TableCell
              colSpan={3}
              sx={{ ...cellSx, fontWeight: 900, fontSize: '1rem' }}
              align="center"
            >
              <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>
                {lastRound.teamScores.find(ts => ts.teamId === team1.id)?.cumulativeScore ?? 0}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}
