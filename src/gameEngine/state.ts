// Server-authoritative game state for an online spades match.
// The client never sees other players' hands; the server emits a
// per-player `PrivateView` and a shared `PublicView` after each play.

import { Card, Suit, deal } from './cards';
import { TrickState, TrickPlay, applyPlay, trickWinner, validatePlay, PlayError } from './trick';
import type { GameSettings, NilType, PlayerRoundData } from '../types';

export type PlayPhase = 'bidding' | 'playing' | 'scoring' | 'complete';

/** Bids submitted before play begins. Index = seat. */
export interface SeatBid {
  seat: number;
  nilType: NilType;
  bid: number; // 0 if nil/blind_nil
}

/** Server-authoritative round state. Includes all hands. */
export interface ServerRoundState {
  roundNumber: number;
  dealerSeat: number;
  leaderSeat: number;            // who leads the next trick
  hands: Card[][];               // hands[seat]
  bids: SeatBid[];
  currentTrick: TrickState;
  completedTricks: { winnerSeat: number; plays: TrickPlay[] }[];
  spadesBroken: boolean;
  phase: PlayPhase;
}

/** Server-authoritative match state — full secrets included. */
export interface ServerMatchState {
  matchId: string;
  seed: number;
  numPlayers: 3 | 4;
  settings: GameSettings;
  seats: { seat: number; userId: string; displayName: string }[];
  round: ServerRoundState;
  // History of completed rounds with their final PlayerRoundData rows
  // — feeds directly into the existing scoring engine.
  history: { roundNumber: number; playerData: PlayerRoundData[] }[];
}

/** What gets sent to a single player's client. */
export interface PrivateView {
  matchId: string;
  yourSeat: number;
  yourHand: Card[];
  public: PublicView;
}

/** Shared game state visible to everyone (including spectators). */
export interface PublicView {
  matchId: string;
  numPlayers: 3 | 4;
  seats: { seat: number; displayName: string; cardsRemaining: number }[];
  bids: SeatBid[];
  currentTrick: TrickState;
  completedTrickCount: number;
  lastTrick?: { winnerSeat: number; plays: TrickPlay[] };
  spadesBroken: boolean;
  phase: PlayPhase;
  expectedSeat: number;
  roundNumber: number;
}

// ─── Factories ──────────────────────────────────────────────

export function startRound(
  prev: ServerMatchState | null,
  base: Pick<ServerMatchState, 'matchId' | 'numPlayers' | 'settings' | 'seats' | 'seed'>,
  roundNumber: number
): ServerMatchState {
  const dealerSeat = (roundNumber - 1) % base.numPlayers;
  const leaderSeat = (dealerSeat + 1) % base.numPlayers;
  const hands = deal(base.seed + roundNumber, base.numPlayers);
  const round: ServerRoundState = {
    roundNumber,
    dealerSeat,
    leaderSeat,
    hands,
    bids: [],
    currentTrick: { leadSuit: null, plays: [] },
    completedTricks: [],
    spadesBroken: false,
    phase: 'bidding',
  };
  return { ...base, round, history: prev?.history ?? [] };
}

// ─── Reducer actions ────────────────────────────────────────

export type Action =
  | { type: 'SUBMIT_BID'; seat: number; bid: SeatBid }
  | { type: 'PLAY_CARD'; seat: number; card: Card };

export type ActionResult =
  | { ok: true; state: ServerMatchState }
  | { ok: false; error: PlayError | 'WRONG_PHASE' | 'BID_ALREADY_SUBMITTED' };

export function reduce(state: ServerMatchState, action: Action): ActionResult {
  const r = state.round;

  if (action.type === 'SUBMIT_BID') {
    if (r.phase !== 'bidding') return { ok: false, error: 'WRONG_PHASE' };
    if (r.bids.some(b => b.seat === action.seat)) {
      return { ok: false, error: 'BID_ALREADY_SUBMITTED' };
    }
    const bids = [...r.bids, action.bid].sort((a, b) => a.seat - b.seat);
    const allIn = bids.length === state.numPlayers;
    return {
      ok: true,
      state: {
        ...state,
        round: { ...r, bids, phase: allIn ? 'playing' : 'bidding' },
      },
    };
  }

  if (action.type === 'PLAY_CARD') {
    if (r.phase !== 'playing') return { ok: false, error: 'WRONG_PHASE' };
    const expectedSeat = expectedSeatToPlay(r);
    const err = validatePlay({
      hand: r.hands[action.seat],
      card: action.card,
      trick: r.currentTrick,
      spadesBroken: r.spadesBroken,
      isFirstTrick: r.completedTricks.length === 0,
      expectedSeat,
      actualSeat: action.seat,
      enforceTwoOfClubsLead: state.numPlayers === 4,
    });
    if (err) return { ok: false, error: err };

    const { trick, spadesBroken } = applyPlay(
      r.currentTrick,
      { seat: action.seat, card: action.card },
      r.spadesBroken
    );
    const newHands = r.hands.map((h, i) =>
      i === action.seat
        ? h.filter(c => !(c.suit === action.card.suit && c.rank === action.card.rank))
        : h
    );

    const tricksPerRound = state.numPlayers === 3 ? 17 : 13;
    if (trick.plays.length === state.numPlayers) {
      const winnerSeat = trickWinner(trick);
      const completed = [...r.completedTricks, { winnerSeat, plays: trick.plays }];
      const isLastTrick = completed.length === tricksPerRound;
      return {
        ok: true,
        state: {
          ...state,
          round: {
            ...r,
            hands: newHands,
            currentTrick: { leadSuit: null, plays: [] },
            completedTricks: completed,
            leaderSeat: winnerSeat,
            spadesBroken,
            phase: isLastTrick ? 'scoring' : 'playing',
          },
        },
      };
    }

    return {
      ok: true,
      state: {
        ...state,
        round: { ...r, hands: newHands, currentTrick: trick, spadesBroken },
      },
    };
  }

  return { ok: false, error: 'WRONG_PHASE' };
}

function expectedSeatToPlay(r: ServerRoundState): number {
  if (r.currentTrick.plays.length === 0) return r.leaderSeat;
  const last = r.currentTrick.plays[r.currentTrick.plays.length - 1];
  return (last.seat + 1) % r.hands.length;
}

// ─── Views ──────────────────────────────────────────────────

export function toPrivateView(state: ServerMatchState, seat: number): PrivateView {
  return {
    matchId: state.matchId,
    yourSeat: seat,
    yourHand: state.round.hands[seat],
    public: toPublicView(state),
  };
}

export function toPublicView(state: ServerMatchState): PublicView {
  const r = state.round;
  return {
    matchId: state.matchId,
    numPlayers: state.numPlayers,
    seats: state.seats.map(s => ({
      seat: s.seat,
      displayName: s.displayName,
      cardsRemaining: r.hands[s.seat].length,
    })),
    bids: r.bids,
    currentTrick: r.currentTrick,
    completedTrickCount: r.completedTricks.length,
    lastTrick: r.completedTricks[r.completedTricks.length - 1],
    spadesBroken: r.spadesBroken,
    phase: r.phase,
    expectedSeat: expectedSeatToPlay(r),
    roundNumber: r.roundNumber,
  };
}

// ─── Bridge to existing scoring engine ──────────────────────

/**
 * Convert a finished round's server state into the PlayerRoundData[]
 * shape that `src/utils/scoring.ts` already consumes. This is the seam
 * that lets us reuse the existing scoring math unchanged.
 */
export function roundToPlayerData(
  state: ServerMatchState,
  playerIdsBySeat: string[]
): PlayerRoundData[] {
  const r = state.round;
  const tricksTakenBySeat = new Array(state.numPlayers).fill(0);
  for (const t of r.completedTricks) tricksTakenBySeat[t.winnerSeat]++;
  return r.bids.map(b => ({
    playerId: playerIdsBySeat[b.seat],
    nilType: b.nilType,
    bid: b.bid,
    tricksTaken: tricksTakenBySeat[b.seat],
  }));
}
