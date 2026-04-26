import type { TeamRoundScore } from '../types';

type RoastTier = 'mild' | 'medium' | 'savage';

const MILD_ROASTS = [
  '{names}, the other team thanks you for your service.',
  "{names}, at least you're consistent. Consistently bad.",
  "{names}, bold strategy. Let's see if it pays off. (It won't.)",
];

const MEDIUM_ROASTS = [
  '{names}, you do know the point of the game is to GAIN points, right?',
  '{names}, seriously... what are you guys even doing?',
  "{names}, just fyi — the cards aren't the problem. It's the people holding them.",
  "{names}, even a broken clock is right twice a day. You're overdue.",
];

const SAVAGE_ROASTS = [
  '{names}, maybe you should just give up now?',
  "{names}, I think mother's calling. She says you're embarrassing yourself and it's past your bedtime.",
  "{names}, at this point you're not losing — you're donating.",
  "{names}, this isn't a game anymore, it's a charity event for the other team.",
  '{names}, respectfully... have you considered a different hobby?',
];

const ROAST_MAP: Record<RoastTier, string[]> = {
  mild: MILD_ROASTS,
  medium: MEDIUM_ROASTS,
  savage: SAVAGE_ROASTS,
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRoastTier(ts: TeamRoundScore): RoastTier | null {
  // Savage: cumulative score deeply negative
  if (ts.cumulativeScore <= -100) return 'savage';

  // Medium: just crossed into negative territory
  if (ts.cumulativeScore < 0) return 'medium';

  // Mild: lost points this round (negative round total)
  if (ts.roundTotal < 0) return 'mild';

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
  teamScores: TeamRoundScore[],
  teamPlayerNames: Map<string, string[]>
): Roast[] {
  const roasts: Roast[] = [];

  for (const ts of teamScores) {
    const tier = getRoastTier(ts);
    if (!tier) continue;

    const playerNames = teamPlayerNames.get(ts.teamId);
    if (!playerNames || playerNames.length === 0) continue;

    const names = playerNames.join(' & ');
    const template = pickRandom(ROAST_MAP[tier]);
    const message = template.replace('{names}', names);

    roasts.push({ teamId: ts.teamId, message, tier });
  }

  return roasts;
}
