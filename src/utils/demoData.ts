import { v4 as uuidv4 } from 'uuid';
import { Game, GameSettings, Player, Round, PlayerRoundData, TeamRoundScore, NilBonus } from '../types';
import { useGameStore } from '../store/gameStore';
import { calculateRoundScores } from './scoring';

/**
 * Load a demo game with 4 rounds showcasing different scoring scenarios:
 *  Round 1: Normal bids, both teams make their contracts with bags
 *  Round 2: One team gets set (misses bid), other makes it
 *  Round 3: A nil bid that succeeds
 *  Round 4: A high bid (10+) that triggers double points (if enabled)
 */
export function loadDemoGame() {
  const teams = [
    { id: uuidv4(), name: 'Aces' },
    { id: uuidv4(), name: 'Kings' },
  ];

  const players: Player[] = [
    { id: uuidv4(), name: 'Alice', teamIndex: 0, playerIndex: 0 },
    { id: uuidv4(), name: 'Bob', teamIndex: 0, playerIndex: 1 },
    { id: uuidv4(), name: 'Carol', teamIndex: 1, playerIndex: 0 },
    { id: uuidv4(), name: 'Dave', teamIndex: 1, playerIndex: 1 },
  ];

  const settings: GameSettings = {
    winTarget: 500,
    maxRounds: null,
    nilValue: 100,
    blindNilValue: 200,
    doubleOn10: true,
    failedNilCountsAsBags: true,
    playerMode: '4-player',
  };

  // Helper to build a round and calculate scores
  const buildRound = (
    roundNumber: number,
    bids: { nilType: 'none' | 'nil' | 'blind_nil'; bid: number; tricks: number }[],
    previousRounds: Round[]
  ): Round => {
    const playerData: PlayerRoundData[] = players.map((p, i) => ({
      playerId: p.id,
      nilType: bids[i].nilType,
      bid: bids[i].nilType !== 'none' ? 0 : bids[i].bid,
      tricksTaken: bids[i].tricks,
    }));

    const gameForCalc: Game = {
      id: 'demo',
      createdAt: new Date().toISOString(),
      teams,
      players,
      settings,
      rounds: previousRounds,
      phase: 'scoring',
      currentRound: roundNumber,
    };

    const teamScores = calculateRoundScores(gameForCalc, playerData);

    return {
      roundNumber,
      playerData,
      teamScores,
      isComplete: true,
    };
  };

  // Round 1: Normal round — both teams make their bids with some bags
  // Aces: Alice bids 3 (takes 4), Bob bids 4 (takes 3) → team bid 7, took 7, 0 bags
  // Kings: Carol bids 4 (takes 4), Dave bids 3 (takes 2) → team bid 7, took 6, set!
  const round1 = buildRound(1, [
    { nilType: 'none', bid: 3, tricks: 4 },
    { nilType: 'none', bid: 4, tricks: 3 },
    { nilType: 'none', bid: 4, tricks: 4 },
    { nilType: 'none', bid: 3, tricks: 2 },
  ], []);

  // Round 2: Aces get set, Kings make with bags
  // Aces: Alice bids 5 (takes 3), Bob bids 4 (takes 2) → team bid 9, took 5, set!
  // Kings: Carol bids 3 (takes 4), Dave bids 5 (takes 4) → team bid 8, took 8, 0 bags
  const round2 = buildRound(2, [
    { nilType: 'none', bid: 5, tricks: 3 },
    { nilType: 'none', bid: 4, tricks: 2 },
    { nilType: 'none', bid: 3, tricks: 4 },
    { nilType: 'none', bid: 5, tricks: 4 },
  ], [round1]);

  // Round 3: Nil bid — Bob goes nil and makes it
  // Aces: Alice bids 6 (takes 7), Bob nil (takes 0) → team bid 6, took 7, +1 bag, nil bonus +100
  // Kings: Carol bids 3 (takes 3), Dave bids 3 (takes 3) → team bid 6, took 6, 0 bags
  const round3 = buildRound(3, [
    { nilType: 'none', bid: 6, tricks: 7 },
    { nilType: 'nil', bid: 0, tricks: 0 },
    { nilType: 'none', bid: 3, tricks: 3 },
    { nilType: 'none', bid: 3, tricks: 3 },
  ], [round1, round2]);

  // Round 4: High bid with double points
  // Aces: Alice bids 7 (takes 7), Bob bids 4 (takes 4) → team bid 11, took 11, ×2!
  // Kings: Carol bids 1 (takes 1), Dave bids 1 (takes 1) → team bid 2, took 2
  const round4 = buildRound(4, [
    { nilType: 'none', bid: 7, tricks: 7 },
    { nilType: 'none', bid: 4, tricks: 4 },
    { nilType: 'none', bid: 1, tricks: 1 },
    { nilType: 'none', bid: 1, tricks: 1 },
  ], [round1, round2, round3]);

  const game: Game = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    teams,
    players,
    settings,
    rounds: [round1, round2, round3, round4],
    phase: 'scoring',
    currentRound: 5,
  };

  useGameStore.setState({
    currentGame: game,
    editingRoundNumber: null,
    editSnapshot: null,
  });
}
