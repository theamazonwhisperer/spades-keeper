import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Game,
  GameSettings,
  GamePhase,
  Player,
  PlayerRoundData,
  PlayerStats,
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
  playerStats: Record<string, PlayerStats>;
  darkMode: boolean;

  // Game lifecycle
  startGame: (
    teamNames: [string, string],
    playerNames: [[string, string], [string, string]],
    settings: GameSettings
  ) => void;
  abandonGame: () => void;
  rematch: () => void;

  // Round flow
  submitBids: (bids: BidInput[]) => void;
  fixBids: () => void;
  submitTricks: (tricks: { playerId: string; tricksTaken: number }[]) => void;
  undoLastRound: () => void;
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
      playerStats: {},
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

        const fullSettings: GameSettings = {
          ...settings,
          nilValue: settings.nilValue ?? 100,
          blindNilValue: settings.blindNilValue ?? 200,
        };

        const game: Game = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          teams,
          players,
          settings: fullSettings,
          rounds: [],
          phase: 'bidding',
          currentRound: 1,
        };

        set({ currentGame: game });
      },

      abandonGame: () => {
        set({ currentGame: null });
      },

      rematch: () => {
        const game = get().currentGame;
        if (!game) return;
        get().startGame(
          [game.teams[0].name, game.teams[1].name],
          [
            [
              game.players.find(p => p.teamIndex === 0 && p.playerIndex === 0)!.name,
              game.players.find(p => p.teamIndex === 0 && p.playerIndex === 1)!.name,
            ],
            [
              game.players.find(p => p.teamIndex === 1 && p.playerIndex === 0)!.name,
              game.players.find(p => p.teamIndex === 1 && p.playerIndex === 1)!.name,
            ],
          ],
          game.settings
        );
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

          // Update player win/loss stats
          const newPlayerStats = { ...get().playerStats };
          finalGame.players.forEach(p => {
            const key = p.name.toLowerCase().trim();
            const existing = newPlayerStats[key] ?? { name: p.name, wins: 0, losses: 0, gamesPlayed: 0 };
            const won = finalGame.teams[p.teamIndex].id === finalGame.winnerId;
            newPlayerStats[key] = {
              ...existing,
              name: p.name,
              wins: existing.wins + (won ? 1 : 0),
              losses: existing.losses + (won ? 0 : 1),
              gamesPlayed: existing.gamesPlayed + 1,
            };
          });

          set({
            currentGame: finalGame,
            completedGames: [finalGame, ...get().completedGames],
            playerStats: newPlayerStats,
          });
        } else {
          set({ currentGame: updatedGame });
        }
      },

      undoLastRound: () => {
        const game = get().currentGame;
        if (!game) return;
        const completedRounds = game.rounds.filter(r => r.isComplete);
        if (completedRounds.length === 0) return;

        const lastCompleted = completedRounds[completedRounds.length - 1];
        // Remove current incomplete round (if any) and restore last completed as incomplete/tricks
        const updatedRounds = game.rounds
          .filter(r => r.roundNumber !== lastCompleted.roundNumber && r.isComplete)
          .concat({
            ...lastCompleted,
            isComplete: false,
            teamScores: [],
          });

        set({
          currentGame: {
            ...game,
            rounds: updatedRounds,
            currentRound: lastCompleted.roundNumber,
            phase: 'tricks' as GamePhase,
          },
        });
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
