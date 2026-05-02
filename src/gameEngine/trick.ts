import { Card, Suit, cardId } from './cards';

export interface TrickPlay {
  seat: number;     // 0..numPlayers-1
  card: Card;
}

export interface TrickState {
  leadSuit: Suit | null;
  plays: TrickPlay[];
}

/**
 * Validate whether `seat` can legally play `card` from `hand`,
 * given the current trick and whether spades have been broken.
 * Returns null if legal, otherwise an error code.
 */
export type PlayError =
  | 'NOT_IN_HAND'
  | 'MUST_FOLLOW_SUIT'
  | 'SPADES_NOT_BROKEN'
  | 'CANNOT_LEAD_SPADES'
  | 'OUT_OF_TURN';

export function validatePlay(args: {
  hand: Card[];
  card: Card;
  trick: TrickState;
  spadesBroken: boolean;
  isFirstTrick: boolean;
  expectedSeat: number;
  actualSeat: number;
  /** Standard rule: first trick must be led with 2 of clubs (4-player). */
  enforceTwoOfClubsLead?: boolean;
}): PlayError | null {
  const { hand, card, trick, spadesBroken, isFirstTrick, expectedSeat, actualSeat } = args;

  if (expectedSeat !== actualSeat) return 'OUT_OF_TURN';
  if (!hand.some(c => cardId(c) === cardId(card))) return 'NOT_IN_HAND';

  const isLeading = trick.plays.length === 0;

  if (isLeading) {
    if (args.enforceTwoOfClubsLead && isFirstTrick) {
      if (!(card.suit === 'C' && card.rank === 2)) return 'MUST_FOLLOW_SUIT';
      return null;
    }
    if (card.suit === 'S' && !spadesBroken) {
      // Allowed only if hand has nothing but spades
      const hasNonSpade = hand.some(c => c.suit !== 'S');
      if (hasNonSpade) return 'CANNOT_LEAD_SPADES';
    }
    return null;
  }

  // Following
  const lead = trick.leadSuit!;
  const hasLead = hand.some(c => c.suit === lead);
  if (hasLead && card.suit !== lead) return 'MUST_FOLLOW_SUIT';
  return null;
}

/** Returns the seat that wins the trick. */
export function trickWinner(trick: TrickState): number {
  if (trick.plays.length === 0 || trick.leadSuit == null) {
    throw new Error('Cannot determine winner of empty trick');
  }
  const spadePlays = trick.plays.filter(p => p.card.suit === 'S');
  const candidates = spadePlays.length > 0
    ? spadePlays
    : trick.plays.filter(p => p.card.suit === trick.leadSuit);
  candidates.sort((a, b) => b.card.rank - a.card.rank);
  return candidates[0].seat;
}

/** Apply a play; returns the next trick state and whether spades are now broken. */
export function applyPlay(
  trick: TrickState,
  play: TrickPlay,
  spadesBroken: boolean
): { trick: TrickState; spadesBroken: boolean } {
  const next: TrickState = {
    leadSuit: trick.leadSuit ?? play.card.suit,
    plays: [...trick.plays, play],
  };
  const broke = spadesBroken || play.card.suit === 'S';
  return { trick: next, spadesBroken: broke };
}
