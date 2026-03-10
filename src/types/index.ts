export type NilType = 'none' | 'nil' | 'blind_nil';

export interface Player {
  id: string;
  name: string;
  teamIndex: 0 | 1;
  playerIndex: 0 | 1;
}

export interface Team {
  id: string;
  name: string;
}

export interface GameSettings {
  winTarget: 300 | 500;
  maxRounds: number | null; // null = unlimited
}

export interface PlayerRoundData {
  playerId: string;
  nilType: NilType;
  bid: number; // the numeric bid (0 if nil/blind_nil)
  tricksTaken: number | null; // null until tricks entered
}

export interface NilBonus {
  playerId: string;
  playerName: string;
  nilType: NilType;
  made: boolean;
  score: number; // +100/-100 or +200/-200
}

export interface TeamRoundScore {
  teamId: string;
  teamBid: number;        // sum of non-nil bids
  teamTricks: number;     // all tricks taken by team members
  contractScore: number;  // bid * 10 (or * 20 if double) — positive or negative
  isDouble: boolean;      // true if teamBid >= 10
  bags: number;           // new bags this round (0 if set)
  bagPenalty: number;     // penalty points applied this round (multiple of 100)
  nilBonuses: NilBonus[];
  roundTotal: number;     // contractScore + bags + nilTotal - bagPenalty
  cumulativeScore: number;
  cumulativeBags: number;
}

export interface Round {
  roundNumber: number;
  playerData: PlayerRoundData[];
  teamScores: TeamRoundScore[];
  isComplete: boolean;
}

export type GamePhase = 'bidding' | 'tricks' | 'scoring' | 'complete';

export interface Game {
  id: string;
  createdAt: string;
  completedAt?: string;
  teams: Team[];
  players: Player[];
  settings: GameSettings;
  rounds: Round[];
  phase: GamePhase;
  currentRound: number; // 1-based
  winnerId?: string;
}
