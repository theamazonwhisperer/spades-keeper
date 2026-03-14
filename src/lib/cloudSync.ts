import { supabase } from './supabase';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import type { PlayerLink, UserProfile, Game } from '../types';

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

// ─── User Profiles ───────────────────────────────────────────

/** Upsert user profile on sign-in */
export async function upsertUserProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split('@')[0] ||
    'Unknown';

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      { user_id: user.id, email: user.email ?? '', display_name: displayName },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Failed to upsert user profile:', error.message);
  }
}

/** Search for users by email (exact or partial match) */
export async function searchUsersByEmail(email: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, display_name, discoverable')
    .ilike('email', `%${email}%`)
    .eq('discoverable', true)
    .limit(10);

  if (error || !data) return [];
  return data.map(d => ({
    userId: d.user_id,
    email: d.email,
    displayName: d.display_name ?? undefined,
    discoverable: d.discoverable,
  }));
}

/** Get current user's profile */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, email, display_name, discoverable')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return {
    userId: data.user_id,
    email: data.email,
    displayName: data.display_name ?? undefined,
    discoverable: data.discoverable,
  };
}

// ─── Player Links ────────────────────────────────────────────

/** Create a player link request */
export async function createPlayerLink(
  ownerUserId: string,
  playerName: string,
  linkedEmail: string,
  linkedUserId?: string
): Promise<PlayerLink | null> {
  const { data, error } = await supabase
    .from('player_links')
    .upsert(
      {
        owner_user_id: ownerUserId,
        player_name: playerName,
        linked_email: linkedEmail,
        linked_user_id: linkedUserId ?? null,
        status: 'pending',
      },
      { onConflict: 'owner_user_id,player_name' }
    )
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to create player link:', error?.message);
    return null;
  }
  return {
    id: data.id,
    playerName: data.player_name,
    linkedEmail: data.linked_email,
    linkedUserId: data.linked_user_id ?? undefined,
    status: data.status,
  };
}

/** Get all player links owned by the current user */
export async function getMyPlayerLinks(ownerUserId: string): Promise<PlayerLink[]> {
  const { data, error } = await supabase
    .from('player_links')
    .select('id, player_name, linked_email, linked_user_id, status')
    .eq('owner_user_id', ownerUserId);

  if (error || !data) return [];
  return data.map(d => ({
    id: d.id,
    playerName: d.player_name,
    linkedEmail: d.linked_email,
    linkedUserId: d.linked_user_id ?? undefined,
    status: d.status,
  }));
}

/** Get pending link requests targeting the current user */
export async function getPendingLinkRequests(userId: string): Promise<(PlayerLink & { ownerDisplayName: string })[]> {
  const { data, error } = await supabase
    .from('player_links')
    .select('id, player_name, linked_email, linked_user_id, status, owner_user_id')
    .eq('linked_user_id', userId)
    .eq('status', 'pending');

  if (error || !data) return [];

  // Fetch owner display names
  const ownerIds = [...new Set(data.map(d => d.owner_user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, email')
    .in('user_id', ownerIds);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.email]) ?? []);

  return data.map(d => ({
    id: d.id,
    playerName: d.player_name,
    linkedEmail: d.linked_email,
    linkedUserId: d.linked_user_id ?? undefined,
    status: d.status as 'pending' | 'confirmed',
    ownerDisplayName: profileMap.get(d.owner_user_id) ?? 'Unknown',
  }));
}

/** Accept a player link request */
export async function acceptPlayerLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('player_links')
    .update({ status: 'confirmed' })
    .eq('id', linkId);

  if (error) console.error('Failed to accept link:', error.message);
}

/** Decline (delete) a player link request */
export async function declinePlayerLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('player_links')
    .delete()
    .eq('id', linkId);

  if (error) console.error('Failed to decline link:', error.message);
}

/** Delete a player link (by owner) */
export async function deletePlayerLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('player_links')
    .delete()
    .eq('id', linkId);

  if (error) console.error('Failed to delete link:', error.message);
}

/** Get confirmed links for given player names (used at game start) */
export async function getConfirmedLinksForNames(
  ownerUserId: string,
  playerNames: string[]
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('player_links')
    .select('player_name, linked_user_id')
    .eq('owner_user_id', ownerUserId)
    .eq('status', 'confirmed')
    .in('player_name', playerNames)
    .not('linked_user_id', 'is', null);

  if (error || !data) return new Map();
  return new Map(data.map(d => [d.player_name, d.linked_user_id as string]));
}

// ─── Shared Games ────────────────────────────────────────────

/** Share a completed game with linked players */
export async function shareGameWithLinkedPlayers(
  ownerUserId: string,
  game: Game,
  ownerDisplayName: string
): Promise<void> {
  const linkedUserIds = game.players
    .map(p => p.linkedUserId)
    .filter((id): id is string => !!id && id !== ownerUserId);

  if (linkedUserIds.length === 0) return;

  const gameWithSharedBy = { ...game, sharedBy: ownerDisplayName };

  const rows = linkedUserIds.map(uid => ({
    game_id: game.id,
    owner_user_id: ownerUserId,
    shared_with_user_id: uid,
    game_data: gameWithSharedBy,
  }));

  const { error } = await supabase
    .from('shared_games')
    .upsert(rows, { onConflict: 'game_id,shared_with_user_id' });

  if (error) {
    console.error('Failed to share game with linked players:', error.message);
  }
}

/** Load shared games for the current user (games others shared with them) */
export async function loadSharedGames(userId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('shared_games')
    .select('game_id, game_data')
    .eq('shared_with_user_id', userId);

  if (error || !data) return [];
  return data.map(d => d.game_data as Game);
}

/** Mark shared games as consumed (delete from shared_games after importing) */
export async function clearSharedGames(userId: string, gameIds: string[]): Promise<void> {
  if (gameIds.length === 0) return;
  const { error } = await supabase
    .from('shared_games')
    .delete()
    .eq('shared_with_user_id', userId)
    .in('game_id', gameIds);

  if (error) console.error('Failed to clear shared games:', error.message);
}

/** Fetch a single shared game via RPC (for share-via-link) */
export async function fetchSharedGameByLink(ownerId: string, gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .rpc('get_shared_game', { p_owner_id: ownerId, p_game_id: gameId });

  if (error || !data) return null;
  return data as Game;
}
