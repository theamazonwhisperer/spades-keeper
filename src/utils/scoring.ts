import { Game, PlayerRoundData, TeamRoundScore, NilBonus } from '../types';

/** Returns the number of tricks per round based on the game's player mode. */
export function getTricksPerRound(game: Game): number {
  return game.settings.playerMode === '3-player' ? 17 : 13;
}

/**
 * Calculate scores for a completed round.
 *
 * Team scoring rules:
 *  - Team bid = sum of non-nil player bids
 *  - Team tricks = ALL tricks taken by both players (including nil player's tricks)
 *  - Made contract (tricks >= bid): bid * 10 + bags  (doubled if bid >= 10)
 *  - Missed contract (tricks < bid): -(bid * 10)      (doubled if bid >= 10)
 *  - Bags = extra tricks beyond bid (only when contract is made)
 *  - Every 10 cumulative bags: -100 penalty
 *
 * Individual nil scoring (additive to team score):
 *  - Nil:       +100 if 0 tricks taken, -100 if any tricks taken
 *  - Blind Nil: +200 if 0 tricks taken, -200 if any tricks taken
 */
export function calculateRoundScores(
  game: Game,
  playerData: PlayerRoundData[]
): TeamRoundScore[] {
  const { teams, players, rounds } = game;
  const completedRounds = rounds.filter(r => r.isComplete);

  return teams.map((team, teamIdx) => {
    // Previous cumulative state
    const prevScore =
      completedRounds.length > 0
        ? (completedRounds[completedRounds.length - 1].teamScores[teamIdx]?.cumulativeScore ?? 0)
        : 0;
    const prevBags =
      completedRounds.length > 0
        ? (completedRounds[completedRounds.length - 1].teamScores[teamIdx]?.cumulativeBags ?? 0)
        : 0;

    const teamPlayers = players.filter(p => p.teamIndex === teamIdx);

    let teamBid = 0;
    let teamTricks = 0;
    let failedNilTricks = 0;
    const nilBonuses: NilBonus[] = [];
    const failedNilCountsAsBags = game.settings.failedNilCountsAsBags ?? false;

    for (const player of teamPlayers) {
      const pd = playerData.find(d => d.playerId === player.id);
      if (!pd) continue;

      const tricks = pd.tricksTaken ?? 0;
      teamTricks += tricks; // ALL tricks count toward team total

      if (pd.nilType !== 'none') {
        const nilValue =
          pd.nilType === 'blind_nil'
            ? (game.settings.blindNilValue ?? 200)
            : (game.settings.nilValue ?? 100);
        const made = tricks === 0;
        nilBonuses.push({
          playerId: player.id,
          playerName: player.name,
          nilType: pd.nilType,
          made,
          score: made ? nilValue : -nilValue,
        });
        // Track failed nil tricks separately for bags-only mode
        if (!made && failedNilCountsAsBags) {
          failedNilTricks += tricks;
        }
        // Nil bids contribute 0 to team bid
      } else {
        teamBid += pd.bid;
      }
    }

    const doubleOn10 = game.settings.doubleOn10 ?? true;
    const isDouble = doubleOn10 && teamBid >= 10;
    const multiplier = isDouble ? 2 : 1;

    let contractScore: number;
    let bags: number;

    // When failedNilCountsAsBags is true, broken nil tricks don't help
    // make the contract — only non-nil player tricks count for the contract,
    // and the broken nil tricks are added as pure bags.
    const contractTricks = failedNilCountsAsBags
      ? teamTricks - failedNilTricks
      : teamTricks;

    if (contractTricks >= teamBid) {
      contractScore = teamBid * 10 * multiplier;
      bags = teamTricks - teamBid; // total bags still includes all tricks
    } else {
      contractScore = -(teamBid * 10 * multiplier);
      bags = failedNilCountsAsBags ? failedNilTricks : 0; // failed nil tricks still become bags
    }

    const totalBags = prevBags + bags;
    // How many times did we cross a multiple of 10?
    const bagPenalty =
      (Math.floor(totalBags / 10) - Math.floor(prevBags / 10)) * 100;

    const nilTotal = nilBonuses.reduce((sum, nb) => sum + nb.score, 0);
    const roundTotal = contractScore + bags + nilTotal - bagPenalty;

    return {
      teamId: team.id,
      teamBid,
      teamTricks,
      contractScore,
      isDouble,
      bags,
      bagPenalty,
      nilBonuses,
      roundTotal,
      cumulativeScore: prevScore + roundTotal,
      cumulativeBags: totalBags,
    };
  });
}

export function checkGameOver(
  game: Game
): { isOver: boolean; winnerId?: string } {
  const { settings, rounds, teams } = game;
  const completedRounds = rounds.filter(r => r.isComplete);
  if (completedRounds.length === 0) return { isOver: false };

  const lastRound = completedRounds[completedRounds.length - 1];

  // Check max rounds limit first
  if (settings.maxRounds && completedRounds.length >= settings.maxRounds) {
    const sorted = [...lastRound.teamScores].sort(
      (a, b) => b.cumulativeScore - a.cumulativeScore
    );
    return { isOver: true, winnerId: sorted[0].teamId };
  }

  // Check if any team has reached the win target
  const overTarget = lastRound.teamScores.filter(
    ts => ts.cumulativeScore >= settings.winTarget
  );
  if (overTarget.length > 0) {
    overTarget.sort((a, b) => b.cumulativeScore - a.cumulativeScore);
    return { isOver: true, winnerId: overTarget[0].teamId };
  }

  return { isOver: false };
}

export function getTeamName(game: Game, teamId: string): string {
  return game.teams.find(t => t.id === teamId)?.name ?? 'Unknown';
}

export function getPlayerName(game: Game, playerId: string): string {
  return game.players.find(p => p.id === playerId)?.name ?? 'Unknown';
}

export function getLatestTeamScore(
  game: Game,
  teamId: string
): { score: number; bags: number } {
  const completedRounds = game.rounds.filter(r => r.isComplete);
  if (completedRounds.length === 0) return { score: 0, bags: 0 };
  const last = completedRounds[completedRounds.length - 1];
  const ts = last.teamScores.find(s => s.teamId === teamId);
  return { score: ts?.cumulativeScore ?? 0, bags: ts?.cumulativeBags ?? 0 };
}

export function formatScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}
