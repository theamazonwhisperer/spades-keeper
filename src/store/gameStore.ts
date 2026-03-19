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
import { shareGameWithLinkedPlayers, getUserProfile, immediateCloudSave } from '../lib/cloudSync';
import { useAuthStore } from './authStore';

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
  deletedGames: Game[];      // soft-deleted games for recovery
  playerStats: Record<string, PlayerStats>;
  savedPlayerNames: string[];  // remembered player names for quick setup
  defaultSettings: GameSettings;
  darkMode: boolean;

  // Editing state
  editingRoundNumber: number | null;
  editSnapshot: EditSnapshot | null;

  // Game lifecycle
  startGame: (
    teamNames: string[],
    playerNames: string[][],
    settings: GameSettings,
    linkedUserMap?: Map<string, string>
  ) => void;
  abandonGame: () => void;
  saveAndNewGame: () => void;  // save current game, go to setup
  resumeGame: (gameId: string) => void;
  deleteSavedGame: (gameId: string) => void;
  rematch: () => void;

  // End game early
  endGameEarly: () => void;

  // Round flow
  submitBids: (bids: BidInput[]) => void;
  editBids: () => void;
  submitTricks: (tricks: { playerId: string; tricksTaken: number }[]) => void;
  undoLastRound: () => void;
  startNextRound: () => void;
  editRound: (roundNumber: number) => void;
  cancelEditRound: () => void;

  // Round notes
  addRoundNote: (roundNumber: number, note: string) => void;

  // Settings (allowed any time during active game)
  updateSettings: (settings: GameSettings) => void;

  // Renaming (allowed any time during active game)
  renamePlayer: (playerId: string, newName: string) => void;
  renameTeam: (teamId: string, newName: string) => void;

  // History
  deleteHistory: (gameId: string) => void;
  clearAllHistory: () => void;
  restoreDeletedGame: (gameId: string) => void;
  permanentlyDeleteGame: (gameId: string) => void;
  clearDeletedGames: () => void;

  // Import shared game
  importGame: (game: Game) => void;

  // Player stats
  deletePlayerStats: (key: string) => void;
  clearAllPlayerStats: () => void;

  // Saved player names
  addSavedPlayerName: (name: string) => void;
  removeSavedPlayerName: (name: string) => void;

  // Settings
  updateDefaultSettings: (settings: GameSettings) => void;
  toggleDarkMode: () => void;
}

/** Fire-and-forget: share completed game with linked players */
function autoShareWithLinkedPlayers(game: Game) {
  const hasLinkedPlayers = game.players.some(p => p.linkedUserId);
  if (!hasLinkedPlayers) return;

  const user = useAuthStore.getState().user;
  if (!user) return;

  getUserProfile(user.id).then(profile => {
    const displayName = profile?.displayName || user.email || 'Someone';
    shareGameWithLinkedPlayers(user.id, game, displayName).catch(e =>
      console.error('Failed to auto-share game:', e)
    );
  });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentGame: null,
      savedGames: [],
      completedGames: [],
      deletedGames: [],
      playerStats: {},
      savedPlayerNames: [],
      defaultSettings: {
        winTarget: 500,
        maxRounds: null,
        nilValue: 100,
        blindNilValue: 200,
        doubleOn10: true,
        failedNilCountsAsBags: true,
        playerMode: '4-player' as const,
      },
      darkMode: true, // default to dark mode for card game feel
      editingRoundNumber: null,
      editSnapshot: null,

      startGame: (teamNames, playerNames, settings, linkedUserMap) => {
        const teams = teamNames.map(name => ({ id: uuidv4(), name }));

        const makePlayer = (name: string, teamIndex: 0 | 1 | 2, playerIndex: 0 | 1 | 2): Player => ({
          id: uuidv4(),
          name,
          teamIndex,
          playerIndex,
          ...(linkedUserMap?.get(name) ? { linkedUserId: linkedUserMap.get(name) } : {}),
        });

        const players: Player[] = teamNames.flatMap((_, teamIdx) =>
          playerNames[teamIdx].map((name, playerIdx) =>
            makePlayer(name, teamIdx as 0 | 1 | 2, playerIdx as 0 | 1 | 2)
          )
        );

        const fullSettings: GameSettings = {
          ...settings,
          nilValue: settings.nilValue ?? 100,
          blindNilValue: settings.blindNilValue ?? 200,
          doubleOn10: settings.doubleOn10 ?? true,
          playerMode: settings.playerMode ?? '4-player',
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

        // Auto-save player names for future quick setup
        const allNames = players.map(p => p.name);
        const existing = get().savedPlayerNames;
        const merged = [...existing];
        allNames.forEach(n => {
          const trimmed = n.trim();
          if (trimmed && !merged.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
            merged.push(trimmed);
          }
        });
        merged.sort((a, b) => a.localeCompare(b));

        set({ currentGame: game, savedPlayerNames: merged });
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
        const playerNames = game.teams.map(t =>
          game.players
            .filter(p => p.teamIndex === game.teams.indexOf(t))
            .sort((a, b) => a.playerIndex - b.playerIndex)
            .map(p => p.name)
        );
        get().startGame(teamNames, playerNames, game.settings);
      },

      endGameEarly: () => {
        const game = get().currentGame;
        if (!game) return;

        const completedRounds = game.rounds.filter(r => r.isComplete);
        if (completedRounds.length === 0) {
          // No completed rounds — just abandon
          set({ currentGame: null, editingRoundNumber: null, editSnapshot: null });
          return;
        }

        const lastRound = completedRounds[completedRounds.length - 1];
        // Determine winner by highest cumulative score
        let winnerId: string | undefined;
        const sorted = [...lastRound.teamScores].sort((a, b) => b.cumulativeScore - a.cumulativeScore);
        if (sorted.length >= 2 && sorted[0].cumulativeScore !== sorted[1].cumulativeScore) {
          winnerId = sorted[0].teamId;
        }

        const finalGame: Game = {
          ...game,
          rounds: game.rounds.filter(r => r.isComplete),
          phase: 'complete' as GamePhase,
          completedAt: new Date().toISOString(),
          winnerId,
        };

        // Update player win/loss stats
        const newPlayerStats = { ...get().playerStats };
        finalGame.players.forEach(p => {
          const key = p.name.toLowerCase().trim();
          const existing = newPlayerStats[key] ?? { name: p.name, wins: 0, losses: 0, gamesPlayed: 0 };
          const won = winnerId ? finalGame.teams[p.teamIndex].id === winnerId : false;
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
        immediateCloudSave();
        autoShareWithLinkedPlayers(finalGame);
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
          immediateCloudSave();
          autoShareWithLinkedPlayers(finalGame);
        } else {
          set({ currentGame: updatedGame, editingRoundNumber: null, editSnapshot: null });
          immediateCloudSave();
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

        // If the game was complete, revert player stats and remove from completedGames
        let updatedPlayerStats = get().playerStats;
        let updatedCompletedGames = get().completedGames;
        if (game.phase === 'complete') {
          updatedPlayerStats = { ...updatedPlayerStats };
          game.players.forEach(p => {
            const key = p.name.toLowerCase().trim();
            const existing = updatedPlayerStats[key];
            if (!existing) return;
            const won = game.teams[p.teamIndex].id === game.winnerId;
            updatedPlayerStats[key] = {
              ...existing,
              wins: existing.wins - (won ? 1 : 0),
              losses: existing.losses - (won ? 0 : 1),
              gamesPlayed: existing.gamesPlayed - 1,
            };
          });
          updatedCompletedGames = updatedCompletedGames.filter(g => g.id !== game.id);
        }

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
          playerStats: updatedPlayerStats,
          completedGames: updatedCompletedGames,
          currentGame: {
            ...game,
            rounds: updatedRounds,
            currentRound: roundNumber,
            phase: 'bidding' as GamePhase,
            completedAt: undefined,
            winnerId: undefined,
          },
        });
      },

      cancelEditRound: () => {
        const game = get().currentGame;
        const snapshot = get().editSnapshot;
        if (!game || !snapshot) return;

        const restoredGame: Game = {
          ...game,
          rounds: snapshot.rounds,
          currentRound: snapshot.currentRound,
          phase: snapshot.phase,
        };

        // If we were editing a completed game, restore stats and completedGames
        let updatedPlayerStats = get().playerStats;
        let updatedCompletedGames = get().completedGames;
        if (snapshot.phase === 'complete') {
          // Re-determine winner from the snapshot rounds
          const { isOver, winnerId } = checkGameOver({ ...restoredGame, rounds: snapshot.rounds });
          restoredGame.winnerId = winnerId;
          restoredGame.completedAt = restoredGame.completedAt || new Date().toISOString();

          updatedPlayerStats = { ...updatedPlayerStats };
          game.players.forEach(p => {
            const key = p.name.toLowerCase().trim();
            const existing = updatedPlayerStats[key] ?? { name: p.name, wins: 0, losses: 0, gamesPlayed: 0 };
            const won = game.teams[p.teamIndex].id === winnerId;
            updatedPlayerStats[key] = {
              ...existing,
              name: p.name,
              wins: existing.wins + (won ? 1 : 0),
              losses: existing.losses + (won ? 0 : 1),
              gamesPlayed: existing.gamesPlayed + 1,
            };
          });
          updatedCompletedGames = [restoredGame, ...updatedCompletedGames];
        }

        set({
          editingRoundNumber: null,
          editSnapshot: null,
          playerStats: updatedPlayerStats,
          completedGames: updatedCompletedGames,
          currentGame: restoredGame,
        });
      },

      startNextRound: () => {
        const game = get().currentGame;
        if (!game || game.phase !== 'scoring') return;

        // currentRound was already advanced by submitTricks — just switch phase
        set({
          currentGame: {
            ...game,
            phase: 'bidding' as GamePhase,
          },
        });
      },

      addRoundNote: (roundNumber, note) => {
        const game = get().currentGame;
        if (!game) return;
        set({
          currentGame: {
            ...game,
            rounds: game.rounds.map(r =>
              r.roundNumber === roundNumber ? { ...r, note: note.trim() || undefined } : r
            ),
          },
        });
      },

      updateSettings: (settings) => {
        const game = get().currentGame;
        if (!game) return;
        set({ currentGame: { ...game, settings } });
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
        const game = get().completedGames.find(g => g.id === gameId);
        set({
          completedGames: get().completedGames.filter(g => g.id !== gameId),
          deletedGames: game ? [game, ...get().deletedGames] : get().deletedGames,
        });
      },

      clearAllHistory: () => {
        set({
          deletedGames: [...get().completedGames, ...get().deletedGames],
          completedGames: [],
        });
      },

      restoreDeletedGame: (gameId) => {
        const game = get().deletedGames.find(g => g.id === gameId);
        if (!game) return;
        set({
          deletedGames: get().deletedGames.filter(g => g.id !== gameId),
          completedGames: [game, ...get().completedGames],
        });
      },

      permanentlyDeleteGame: (gameId) => {
        set({
          deletedGames: get().deletedGames.filter(g => g.id !== gameId),
        });
      },

      clearDeletedGames: () => {
        set({ deletedGames: [] });
      },

      importGame: (game) => {
        const existing = get().completedGames;
        // Deduplicate by game.id
        if (existing.some(g => g.id === game.id)) return;
        set({ completedGames: [game, ...existing] });
      },

      deletePlayerStats: (key) => {
        const updated = { ...get().playerStats };
        delete updated[key];
        set({ playerStats: updated });
      },

      clearAllPlayerStats: () => {
        set({ playerStats: {} });
      },

      addSavedPlayerName: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const existing = get().savedPlayerNames;
        if (existing.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
        set({ savedPlayerNames: [...existing, trimmed].sort((a, b) => a.localeCompare(b)) });
      },

      removeSavedPlayerName: (name) => {
        set({ savedPlayerNames: get().savedPlayerNames.filter(n => n !== name) });
      },

      updateDefaultSettings: (settings) => {
        set({ defaultSettings: settings });
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
