import type { TeamRoundScore } from '../types';

type RoastTier = 'mild' | 'medium' | 'savage';

const MILD_ROASTS = [
  '{names}, the other team thanks you for your service.',
  "{names}, at least you're consistent. Consistently bad.",
  "{names}, bold strategy. Let's see if it pays off. (It won't.)",
  '{names}, come on now, this is just getting childish. Pull yourselves together.',
  '{names}, are you even trying?',
  '{names}, have you played this game before?',
  "{names}, I'd say it can only get better from here, but I don't want to lie.",
  "{names}, at least you're having fun... right? Right?",
];

const MEDIUM_ROASTS = [
  '{names}, you do know the point of the game is to GAIN points, right?',
  '{names}, seriously... what are you guys even doing?',
  "{names}, just fyi — the cards aren't the problem. It's the people holding them.",
  "{names}, even a broken clock is right twice a day. You're overdue.",
  "{names}, would a calculator help? Or maybe an abacus?",
  "{names}, plot twist: you're supposed to win tricks, not give them away.",
  "{names}, I've run the numbers. It's not looking good.",
  "{names}, fun fact: negative scores aren't a high score.",
  "{names}, you're making the other team look like professionals.",
];

const SAVAGE_ROASTS = [
  '{names}, maybe you should just give up now?',
  "{names}, I think mother's calling. She says you're embarrassing yourself and it's past your bedtime.",
  "{names}, at this point you're not losing — you're donating.",
  "{names}, this isn't a game anymore, it's a charity event for the other team.",
  '{names}, respectfully... have you considered a different hobby?',
  "{names}, this is painful to watch. And I'm just an app.",
  "{names}, your grandmother called. Even she's disappointed.",
  "{names}, you couldn't win a game of Go Fish right now.",
  "{names}, I'd offer advice, but I don't think it would help.",
];

const ROAST_MAP: Record<RoastTier, string[]> = {
  mild: MILD_ROASTS,
  medium: MEDIUM_ROASTS,
  savage: SAVAGE_ROASTS,
};

// Track used roasts per game+team so we never repeat within a game.
// Key: "gameId:teamId", Value: set of used template strings.
const usedRoasts = new Map<string, Set<string>>();

function pickUnused(arr: string[], key: string): string {
  let used = usedRoasts.get(key);
  if (!used) {
    used = new Set();
    usedRoasts.set(key, used);
  }

  const available = arr.filter(t => !used.has(t));
  // If all exhausted, reset and start fresh
  const pool = available.length > 0 ? available : arr;
  if (available.length === 0) used.clear();

  const pick = pool[Math.floor(Math.random() * pool.length)];
  used.add(pick);
  return pick;
}

/** Clear roast history (call when a new game starts) */
export function resetRoastHistory(): void {
  usedRoasts.clear();
}

function getRoastTier(ts: TeamRoundScore, maxOpponentScore: number): RoastTier | null {
  // Savage: cumulative score deeply negative — every round until they climb out
  if (ts.cumulativeScore <= -100) return 'savage';

  // Medium: in the negatives — every round until they climb out
  if (ts.cumulativeScore < 0) return 'medium';

  // Mild: lost points this round
  if (ts.roundTotal < 0) return 'mild';

  // Mild: way behind the leading team (100+ points)
  if (maxOpponentScore - ts.cumulativeScore >= 100) return 'mild';

  return null;
}

export interface Roast {
  teamId: string;
  message: string;
  tier: RoastTier;
}

/**
 * Generate roasts for teams that are struggling.
 * Returns one roast per qualifying team (or empty array if everyone is doing fine).
 */
export function generateRoasts(
  gameId: string,
  teamScores: TeamRoundScore[],
  teamPlayerNames: Map<string, string[]>
): Roast[] {
  const roasts: Roast[] = [];
  const maxScore = Math.max(...teamScores.map(ts => ts.cumulativeScore));

  for (const ts of teamScores) {
    const tier = getRoastTier(ts, maxScore);
    if (!tier) continue;

    const playerNames = teamPlayerNames.get(ts.teamId);
    if (!playerNames || playerNames.length === 0) continue;

    const key = `${gameId}:${ts.teamId}:${tier}`;
    const names = playerNames.join(' & ');
    const template = pickUnused(ROAST_MAP[tier], key);
    const message = template.replace('{names}', names);

    roasts.push({ teamId: ts.teamId, message, tier });
  }

  return roasts;
}
