import { supabase } from './supabase';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

// The shape of game state we sync to the cloud
export interface SyncableState {
  currentGame: unknown;
  savedGames: unknown[];
  completedGames: unknown[];
  deletedGames: unknown[];
  playerStats: Record<string, unknown>;
  savedPlayerNames: string[];
  defaultSettings: unknown;
  darkMode: boolean;
}

/** Extract the syncable portion of game state */
function getSyncableState(): SyncableState {
  const s = useGameStore.getState();
  return {
    currentGame: s.currentGame,
    savedGames: s.savedGames,
    completedGames: s.completedGames,
    deletedGames: s.deletedGames,
    playerStats: s.playerStats,
    savedPlayerNames: s.savedPlayerNames,
    defaultSettings: s.defaultSettings,
    darkMode: s.darkMode,
  };
}

/** Load game state from Supabase for the current user */
export async function loadCloudState(userId: string): Promise<SyncableState | null> {
  const { data, error } = await supabase
    .from('spades_user_data')
    .select('game_state')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.game_state as SyncableState;
}

/** Save game state to Supabase for the current user */
async function saveCloudState(userId: string, state: SyncableState): Promise<void> {
  const { error } = await supabase
    .from('spades_user_data')
    .upsert(
      { user_id: userId, game_state: state },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Cloud sync save failed:', error.message);
  }
}

/** Apply cloud state to the local Zustand store */
export function applyCloudState(cloud: SyncableState) {
  useGameStore.setState({
    currentGame: cloud.currentGame as ReturnType<typeof useGameStore.getState>['currentGame'],
    savedGames: cloud.savedGames as ReturnType<typeof useGameStore.getState>['savedGames'],
    completedGames: cloud.completedGames as ReturnType<typeof useGameStore.getState>['completedGames'],
    deletedGames: cloud.deletedGames as ReturnType<typeof useGameStore.getState>['deletedGames'],
    playerStats: cloud.playerStats as ReturnType<typeof useGameStore.getState>['playerStats'],
    savedPlayerNames: cloud.savedPlayerNames ?? [],
    defaultSettings: (cloud.defaultSettings as ReturnType<typeof useGameStore.getState>['defaultSettings']) ?? useGameStore.getState().defaultSettings,
    darkMode: cloud.darkMode,
  });
}

/** Toggle sharing_enabled flag on the user's row */
export async function setSharingEnabled(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('spades_user_data')
    .update({ sharing_enabled: enabled })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to toggle sharing:', error.message);
  }
}

/** Load a shared game state (for spectator mode — no auth required) */
export async function loadSharedState(userId: string): Promise<SyncableState | null> {
  const { data, error } = await supabase
    .from('spades_user_data')
    .select('game_state')
    .eq('user_id', userId)
    .eq('sharing_enabled', true)
    .single();

  if (error || !data) return null;
  return data.game_state as SyncableState;
}

/** Subscribe to realtime changes on a shared game */
export function subscribeToSharedGame(
  userId: string,
  onUpdate: (state: SyncableState) => void
) {
  const channel = supabase
    .channel(`watch-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'spades_user_data',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { game_state: SyncableState; sharing_enabled: boolean };
        if (row.sharing_enabled && row.game_state) {
          onUpdate(row.game_state);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Debounced auto-save subscription
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function startCloudSync() {
  // Subscribe to game store changes and auto-save for logged-in users
  return useGameStore.subscribe(() => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCloudState(user.id, getSyncableState());
    }, 1500); // debounce 1.5s
  });
}
