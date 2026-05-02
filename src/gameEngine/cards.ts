// Pure card primitives. No I/O, no randomness besides the seeded shuffle.

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank; // 11=J, 12=Q, 13=K, 14=A
}

export const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function cardId(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
  return deck;
}

// Deterministic PRNG (mulberry32) so the server can deal reproducibly from a seed.
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal `handSize` cards to each of `numPlayers` players. */
export function deal(seed: number, numPlayers: 3 | 4): Card[][] {
  const handSize = numPlayers === 3 ? 17 : 13;
  const deck = shuffle(buildDeck(), mulberry32(seed));
  // For 3-player spades, the 2 of clubs is typically removed; here we
  // deal 17 each (51 cards) and discard the last card. Variants differ —
  // tweak to taste.
  const usable = numPlayers === 3 ? deck.slice(0, handSize * 3) : deck;
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < usable.length; i++) {
    hands[i % numPlayers].push(usable[i]);
  }
  return hands.map(sortHand);
}

const SUIT_ORDER: Record<Suit, number> = { C: 0, D: 1, H: 2, S: 3 };
export function sortHand(hand: Card[]): Card[] {
  return hand.slice().sort((a, b) =>
    SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.rank - b.rank
  );
}
