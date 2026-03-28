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
import EditIcon from '@mui/icons-material/Edit';
import { Game } from '../types';
import { formatScore } from '../utils/scoring';
import { monoFont } from '../theme';

interface Props {
  game: Game;
  onEditRound?: (roundNumber: number) => void;
}

export default function ScoreHistoryTable({ game, onEditRound }: Props) {
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
  const teams = game.teams;

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
          {/* Team name row */}
          <TableRow>
            <TableCell sx={{ ...headerSx, width: 24 }}>#</TableCell>
            {teams.map(team => (
              <TableCell key={team.id} sx={headerSx} align="center" colSpan={3}>
                {team.name}
              </TableCell>
            ))}
          </TableRow>
          {/* Sub-header: Bid / Score / Bags per team */}
          <TableRow>
            <TableCell sx={{ ...cellSx, color: 'text.secondary' }} />
            {teams.map(team => (
              <>
                <TableCell key={`${team.id}-bid`} sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
                  Bid
                </TableCell>
                <TableCell key={`${team.id}-score`} sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
                  Score
                </TableCell>
                <TableCell key={`${team.id}-bags`} sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem' }} align="center">
                  Bags
                </TableCell>
              </>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {completedRounds.map(round => (
            <TableRow
              key={round.roundNumber}
              onClick={onEditRound ? () => onEditRound(round.roundNumber) : undefined}
              sx={{
                '&:nth-of-type(even)': {
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                },
                ...(onEditRound && {
                  cursor: 'pointer',
                  '&:active': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  },
                }),
              }}
            >
              <TableCell sx={{ ...cellSx, fontWeight: 600, color: 'text.secondary' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {round.roundNumber}
                  {onEditRound && (
                    <EditIcon sx={{ fontSize: '0.7rem', color: 'text.disabled' }} />
                  )}
                </Box>
              </TableCell>
              {teams.map(team => {
                const ts = round.teamScores.find(s => s.teamId === team.id);
                const positive = (ts?.roundTotal ?? 0) >= 0;
                return (
                  <>
                    <TableCell key={`${team.id}-bid`} sx={cellSx} align="center">
                      {ts?.teamBid}
                      {ts?.isDouble && <span style={{ color: theme.palette.error.main, fontSize: '0.6rem' }}>×2</span>}
                    </TableCell>
                    <TableCell
                      key={`${team.id}-score`}
                      sx={{
                        ...cellSx,
                        fontWeight: 700,
                        color: positive ? theme.palette.success.main : theme.palette.error.main,
                      }}
                      align="center"
                    >
                      {ts ? formatScore(ts.roundTotal) : '-'}
                      {ts?.bagPenalty ? (
                        <Typography
                          component="div"
                          sx={{ fontSize: '0.6rem', color: theme.palette.error.main, lineHeight: 1 }}
                        >
                          -{ts.bagPenalty}⚠
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell key={`${team.id}-bags`} sx={{ ...cellSx, color: 'text.secondary' }} align="center">
                      {ts?.bags ?? '-'}
                    </TableCell>
                  </>
                );
              })}
            </TableRow>
          ))}

          {/* Bag fine row */}
          {lastRound.teamScores.some(ts => ts.cumulativeBags >= 10) && (
            <TableRow>
              <TableCell
                sx={{ ...cellSx, color: 'text.secondary', fontSize: '0.65rem', fontStyle: 'italic' }}
              >
                Bags fine
              </TableCell>
              {teams.map(team => {
                const ts = lastRound.teamScores.find(s => s.teamId === team.id);
                return (
                  <>
                    <TableCell key={`${team.id}-bf1`} colSpan={2} />
                    <TableCell
                      key={`${team.id}-bf2`}
                      sx={{ ...cellSx, color: theme.palette.error.main, fontWeight: 700 }}
                      align="center"
                    >
                      {(ts?.cumulativeBags ?? 0) % 10}
                    </TableCell>
                  </>
                );
              })}
            </TableRow>
          )}

          {/* Totals rows */}
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
            <TableCell sx={{ ...cellSx, fontWeight: 800, fontSize: '0.75rem' }}>
              Total
            </TableCell>
            {teams.map(team => (
              <TableCell key={team.id} colSpan={3} />
            ))}
          </TableRow>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
            <TableCell sx={{ ...cellSx, fontWeight: 800 }} />
            {teams.map(team => {
              const ts = lastRound.teamScores.find(s => s.teamId === team.id);
              return (
                <TableCell
                  key={team.id}
                  colSpan={3}
                  sx={{ ...cellSx, fontWeight: 900, fontSize: '1rem' }}
                  align="center"
                >
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>
                    {ts?.cumulativeScore ?? 0}
                  </Typography>
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}
