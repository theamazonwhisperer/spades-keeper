import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Game,
  GameSettings,
  GamePhase,
  Player,
  PlayerRoundData,
  Round,
  NilType,
} from '../types';
import { calculateRoundScores, checkGameOver } from '../utils/scoring';

interface BidInput {
  playerId: string;
  nilType: NilType;
  bid: number;
}

interface GameStore {
  currentGame: Game | null;
  completedGames: Game[];
  darkMode: boolean;

  // Game lifecycle
  startGame: (
    teamNames: [string, string],
    playerNames: [[string, string], [string, string]],
    settings: GameSettings
  ) => void;
  abandonGame: () => void;

  // Round flow
  submitBids: (bids: BidInput[]) => void;
  fixBids: () => void; // Go back from tricks to bidding
  submitTricks: (tricks: { playerId: string; tricksTaken: number }[]) => void;
  startNextRound: () => void;

  // Renaming (allowed any time during active game)
  renamePlayer: (playerId: string, newName: string) => void;
  renameTeam: (teamId: string, newName: string) => void;

  // History
  deleteHistory: (gameId: string) => void;
  clearAllHistory: () => void;

  // Settings
  toggleDarkMode: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentGame: null,
      completedGames: [],
      darkMode: true, // default to dark mode for card game feel

      startGame: (teamNames, playerNames, settings) => {
        const teams = [
          { id: uuidv4(), name: teamNames[0] },
          { id: uuidv4(), name: teamNames[1] },
        ];

        const players: Player[] = [
          { id: uuidv4(), name: playerNames[0][0], teamIndex: 0, playerIndex: 0 },
          { id: uuidv4(), name: playerNames[0][1], teamIndex: 0, playerIndex: 1 },
          { id: uuidv4(), name: playerNames[1][0], teamIndex: 1, playerIndex: 0 },
          { id: uuidv4(), name: playerNames[1][1], teamIndex: 1, playerIndex: 1 },
        ];

        const game: Game = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          teams,
          players,
          settings,
          rounds: [],
          phase: 'bidding',
          currentRound: 1,
        };

        set({ currentGame: game });
      },

      abandonGame: () => {
        set({ currentGame: null });
      },

      submitBids: (bids) => {
        const game = get().currentGame;
        if (!game) return;

        const updatedPlayerData: PlayerRoundData[] = bids.map(b => ({
          playerId: b.playerId,
          nilType: b.nilType,
          bid: b.nilType !== 'none' ? 0 : b.bid,
          tricksTaken: null,
        }));

        // If a round already exists for this round number (Fix Bids case), update it
        const existingIdx = game.rounds.findIndex(
          r => r.roundNumber === game.currentRound && !r.isComplete
        );

        let updatedRounds: Round[];
        if (existingIdx >= 0) {
          updatedRounds = [...game.rounds];
          updatedRounds[existingIdx] = {
            ...updatedRounds[existingIdx],
            playerData: updatedPlayerData,
          };
        } else {
          updatedRounds = [
            ...game.rounds,
            { roundNumber: game.currentRound, playerData: updatedPlayerData, teamScores: [], isComplete: false },
          ];
        }

        set({
          currentGame: {
            ...game,
            rounds: updatedRounds,
            phase: 'tricks' as GamePhase,
          },
        });
      },

      fixBids: () => {
        const game = get().currentGame;
        if (!game || game.phase !== 'tricks') return;

        // Keep the existing round data — just go back to bidding so the user can tweak
        set({
          currentGame: {
            ...game,
            phase: 'bidding' as GamePhase,
          },
        });
      },

      submitTricks: (tricks) => {
        const game = get().currentGame;
        if (!game) return;

        const currentRoundIdx = game.rounds.length - 1;
        const currentRound = game.rounds[currentRoundIdx];

        const updatedPlayerData: PlayerRoundData[] = currentRound.playerData.map(pd => ({
          ...pd,
          tricksTaken: tricks.find(t => t.playerId === pd.playerId)?.tricksTaken ?? 0,
        }));

        const teamScores = calculateRoundScores(game, updatedPlayerData);

        const completedRound: Round = {
          ...currentRound,
          playerData: updatedPlayerData,
          teamScores,
          isComplete: true,
        };

        const updatedRounds = [...game.rounds];
        updatedRounds[currentRoundIdx] = completedRound;

        const updatedGame: Game = {
          ...game,
          rounds: updatedRounds,
          phase: 'scoring' as GamePhase,
        };

        const { isOver, winnerId } = checkGameOver(updatedGame);

        if (isOver) {
          const finalGame: Game = {
            ...updatedGame,
            phase: 'complete' as GamePhase,
            completedAt: new Date().toISOString(),
            winnerId,
          };
          set({
            currentGame: finalGame,
            completedGames: [finalGame, ...get().completedGames],
          });
        } else {
          set({ currentGame: updatedGame });
        }
      },

      startNextRound: () => {
        const game = get().currentGame;
        if (!game || game.phase !== 'scoring') return;

        set({
          currentGame: {
            ...game,
            phase: 'bidding' as GamePhase,
            currentRound: game.currentRound + 1,
          },
        });
      },

      renamePlayer: (playerId, newName) => {
        const game = get().currentGame;
        if (!game) return;

        set({
          currentGame: {
            ...game,
            players: game.players.map(p =>
              p.id === playerId ? { ...p, name: newName.trim() || p.name } : p
            ),
          },
        });
      },

      renameTeam: (teamId, newName) => {
        const game = get().currentGame;
        if (!game) return;

        set({
          currentGame: {
            ...game,
            teams: game.teams.map(t =>
              t.id === teamId ? { ...t, name: newName.trim() || t.name } : t
            ),
          },
        });
      },

      deleteHistory: (gameId) => {
        set({
          completedGames: get().completedGames.filter(g => g.id !== gameId),
        });
      },

      clearAllHistory: () => {
        set({ completedGames: [] });
      },

      toggleDarkMode: () => {
        set({ darkMode: !get().darkMode });
      },
    }),
    {
      name: 'spades-keeper-v1',
    }
  )
);
