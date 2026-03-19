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

// Snapshot of game state before editing, so we can cancel cleanly
interface EditSnapshot {
  rounds: Round[];
  currentRound: number;
  phase: GamePhase;
}

interface GameStore {
  currentGame: Game | null;
  savedGames: Game[];        // paused/in-progress games
  completedGames: Game[];
  playerStats: Record<string, PlayerStats>;
  darkMode: boolean;

  // Editing state
  editingRoundNumber: number | null;
  editSnapshot: EditSnapshot | null;

  // Game lifecycle
  startGame: (
    teamNames: string[],
    playerNames: string[][],
    settings: GameSettings
  ) => void;
  abandonGame: () => void;
  saveAndNewGame: () => void;  // save current game, go to setup
  resumeGame: (gameId: string) => void;
  deleteSavedGame: (gameId: string) => void;
  rematch: () => void;

  // Round flow
  submitBids: (bids: BidInput[]) => void;
  editBids: () => void;
  submitTricks: (tricks: { playerId: string; tricksTaken: number }[]) => void;
  undoLastRound: () => void;
  startNextRound: () => void;
  editRound: (roundNumber: number) => void;
  cancelEditRound: () => void;

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
      savedGames: [],
      completedGames: [],
      playerStats: {},
      darkMode: true, // default to dark mode for card game feel
      editingRoundNumber: null,
      editSnapshot: null,

      startGame: (teamNames, playerNames, settings) => {
        const teams = teamNames.map(name => ({ id: uuidv4(), name }));

        const players: Player[] = [];
        playerNames.forEach((teamPlayerNames, teamIdx) => {
          teamPlayerNames.forEach((name, playerIdx) => {
            players.push({
              id: uuidv4(),
              name,
              teamIndex: teamIdx,
              playerIndex: playerIdx,
            });
          });
        });

        const fullSettings: GameSettings = {
          ...settings,
          playerCount: settings.playerCount ?? 4,
          nilValue: settings.nilValue ?? 100,
          blindNilValue: settings.blindNilValue ?? 200,
          doubleOn10: settings.doubleOn10 ?? true,
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
        set({ currentGame: null, editingRoundNumber: null, editSnapshot: null });
      },

      saveAndNewGame: () => {
        const game = get().currentGame;
        if (!game) return;
        // Save current game to savedGames list
        set({
          savedGames: [game, ...get().savedGames.filter(g => g.id !== game.id)],
          currentGame: null,
          editingRoundNumber: null,
          editSnapshot: null,
        });
      },

      resumeGame: (gameId) => {
        const current = get().currentGame;
        const target = get().savedGames.find(g => g.id === gameId);
        if (!target) return;

        // If there's an active game, save it first
        let updatedSaved = get().savedGames.filter(g => g.id !== gameId);
        if (current) {
          updatedSaved = [current, ...updatedSaved.filter(g => g.id !== current.id)];
        }

        set({
          currentGame: target,
          savedGames: updatedSaved,
          editingRoundNumber: null,
          editSnapshot: null,
        });
      },

      deleteSavedGame: (gameId) => {
        set({ savedGames: get().savedGames.filter(g => g.id !== gameId) });
      },

      rematch: () => {
        const game = get().currentGame;
        if (!game) return;
        const teamNames = game.teams.map(t => t.name);
        const playerNames = game.teams.map((_, teamIdx) =>
          game.players
            .filter(p => p.teamIndex === teamIdx)
            .sort((a, b) => a.playerIndex - b.playerIndex)
            .map(p => p.name)
        );
        get().startGame(teamNames, playerNames, game.settings);
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

      editBids: () => {
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

        // Find the incomplete round being edited
        const editingIdx = game.rounds.findIndex(r => !r.isComplete);
        if (editingIdx < 0) return;
        const editingRound = game.rounds[editingIdx];

        const updatedPlayerData: PlayerRoundData[] = editingRound.playerData.map(pd => ({
          ...pd,
          tricksTaken: tricks.find(t => t.playerId === pd.playerId)?.tricksTaken ?? 0,
        }));

        // Build rounds list with the edited round completed
        const updatedRounds = [...game.rounds];
        updatedRounds[editingIdx] = {
          ...editingRound,
          playerData: updatedPlayerData,
          teamScores: [], // will be recalculated below
          isComplete: true,
        };

        // Recalculate scores for the edited round and all subsequent rounds
        // (cumulative bags/scores cascade forward)
        for (let i = editingIdx; i < updatedRounds.length; i++) {
          if (!updatedRounds[i].isComplete) continue;
          const gameForCalc: Game = {
            ...game,
            rounds: updatedRounds.slice(0, i).concat({ ...updatedRounds[i], isComplete: false }),
          };
          const teamScores = calculateRoundScores(gameForCalc, updatedRounds[i].playerData);
          updatedRounds[i] = { ...updatedRounds[i], teamScores };
        }

        // Determine which round to show in scoring view and what the next round should be
        const lastCompletedRound = updatedRounds.filter(r => r.isComplete).length;
        const updatedGame: Game = {
          ...game,
          rounds: updatedRounds,
          currentRound: lastCompletedRound + 1,
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
            editingRoundNumber: null,
            editSnapshot: null,
          });
        } else {
          set({ currentGame: updatedGame, editingRoundNumber: null, editSnapshot: null });
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

      editRound: (roundNumber) => {
        const game = get().currentGame;
        if (!game) return;

        const targetRound = game.rounds.find(r => r.roundNumber === roundNumber && r.isComplete);
        if (!targetRound) return;

        // Save snapshot so we can cancel and restore
        const snapshot: EditSnapshot = {
          rounds: game.rounds,
          currentRound: game.currentRound,
          phase: game.phase,
        };

        // Mark the target round as incomplete so it can be re-edited
        // Remove any existing incomplete round (current new round in progress)
        // but keep all completed rounds intact
        const updatedRounds = game.rounds
          .filter(r => r.isComplete)
          .map(r =>
            r.roundNumber === roundNumber
              ? { ...r, isComplete: false, teamScores: [] }
              : r
          );

        set({
          editingRoundNumber: roundNumber,
          editSnapshot: snapshot,
          currentGame: {
            ...game,
            rounds: updatedRounds,
            currentRound: roundNumber,
            phase: 'bidding' as GamePhase,
          },
        });
      },

      cancelEditRound: () => {
        const game = get().currentGame;
        const snapshot = get().editSnapshot;
        if (!game || !snapshot) return;

        // Restore the game to its pre-edit state
        set({
          editingRoundNumber: null,
          editSnapshot: null,
          currentGame: {
            ...game,
            rounds: snapshot.rounds,
            currentRound: snapshot.currentRound,
            phase: snapshot.phase,
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
