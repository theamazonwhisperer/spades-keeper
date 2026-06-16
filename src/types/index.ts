export type NilType = 'none' | 'nil' | 'blind_nil';

export interface Player {
  id: string;
  name: string;
  teamIndex: 0 | 1;
  playerIndex: 0 | 1;
  linkedUserId?: string; // Supabase user ID if this player is a linked account
}

export interface Team {
  id: string;
  name: string;
}

export interface GameSettings {
  winTarget: 200 | 300 | 500;
  maxRounds: number | null; // null = unlimited
  nilValue: 50 | 100;        // points per nil (default 100)
  blindNilValue: 100 | 200;  // points per blind nil (default 200)
  doubleOn10: boolean;        // true = bids of 10+ score double points
  failedNilCountsAsBags: boolean; // true = broken nil tricks are overtricks/bags only; false = count toward team bid
}

export interface PlayerStats {
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
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
  note?: string;
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
  sharedBy?: string; // display name of user who shared this game
}

export interface PlayerLink {
  id: string;
  playerName: string;
  linkedEmail: string;
  linkedUserId?: string;
  status: 'pending' | 'confirmed';
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  discoverable: boolean;
}

export interface SpectatorInfo {
  spectatorUserId: string;
  displayName: string;
  isEditor: boolean;
  lastSeen: string; // ISO timestamp
}
