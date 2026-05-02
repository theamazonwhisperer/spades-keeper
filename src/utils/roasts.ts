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
  '{names}, was there really strategy behind that? I doubt it.',
  '{names}, you do realise the other team can see you, right?',
  "{names}, I've seen better decisions made by a coin flip.",
  '{names}, were you even looking at your cards?',
  '{names}, that round looked like you were playing different games.',
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
  "{names}, if this were a job, you'd be fired.",
  '{names}, this is what happens when confidence exceeds ability.',
  "{names}, the only thing you're winning right now is sympathy.",
  "{names}, I keep waiting for the turning point. I'll keep waiting.",
];

// This one only applies to 4-player games (2v2 with a partner to blame)
const MEDIUM_ROASTS_4P = [
  '{names}, at what point do you start blaming each other?',
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
  "{names}, congratulations, you've invented a new way to lose.",
  "{names}, I'd call this rock bottom, but you'd probably find a way to go lower.",
  "{names}, the cards aren't even your biggest problem at this point.",
  '{names}, if Spades was a participation sport, you\'d still be losing.',
  "{names}, I've been programmed to be supportive, but you're making it really difficult.",
  '{names}, the other team could play blindfolded at this point.',
  "{names}, I want to say something encouraging but I genuinely can't think of anything.",
];

/**
 * Shuffle an array using Fisher-Yates. Returns a new array.
 */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Pre-shuffled queues per game+team+tier. Each queue is a shuffled copy of
// the tier's roast pool. We pop from the end; when empty, reshuffle.
const roastQueues = new Map<string, string[]>();

function pickNext(pool: string[], key: string): string {
  let queue = roastQueues.get(key);
  if (!queue || queue.length === 0) {
    queue = shuffle(pool);
    roastQueues.set(key, queue);
  }
  return queue.pop()!;
}

/** Clear roast history (call when a new game starts) */
export function resetRoastHistory(): void {
  roastQueues.clear();
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
  teamPlayerNames: Map<string, string[]>,
  is4Player: boolean = true
): Roast[] {
  const roasts: Roast[] = [];
  const maxScore = Math.max(...teamScores.map(ts => ts.cumulativeScore));

  for (const ts of teamScores) {
    const tier = getRoastTier(ts, maxScore);
    if (!tier) continue;

    const playerNames = teamPlayerNames.get(ts.teamId);
    if (!playerNames || playerNames.length === 0) continue;

    // Build the pool for this tier, including 4-player-only roasts when applicable
    let pool: string[];
    if (tier === 'medium' && is4Player) {
      pool = [...MEDIUM_ROASTS, ...MEDIUM_ROASTS_4P];
    } else if (tier === 'medium') {
      pool = MEDIUM_ROASTS;
    } else if (tier === 'mild') {
      pool = MILD_ROASTS;
    } else {
      pool = SAVAGE_ROASTS;
    }

    const key = `${gameId}:${ts.teamId}:${tier}`;
    const names = playerNames.join(' & ');
    const template = pickNext(pool, key);
    const message = template.replace('{names}', names);

    roasts.push({ teamId: ts.teamId, message, tier });
  }

  return roasts;
}
