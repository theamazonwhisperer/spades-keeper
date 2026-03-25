import { supabase } from './supabase';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { logError } from '../utils/logError';
import type { PlayerLink, UserProfile, Game, SpectatorInfo } from '../types';

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

  if (error) {
    await logError('cloud_state_load', error.message, { userId, code: error.code });
    return null;
  }
  if (!data) return null;
  return data.game_state as SyncableState;
}

/** Save game state to Supabase for the current user */
async function saveCloudState(userId: string, state: SyncableState): Promise<void> {
  // Validate before saving to prevent corruption at the source
  if (!isGameStateValid(state.currentGame)) {
    const localGame = state.currentGame as any;
    await logError('cloud_state_save_rejected_corruption', 'Preventing save of corrupted game state', {
      roundCount: localGame?.rounds?.length ?? 0,
      phase: localGame?.phase,
      reason: 'game state validation failed',
    });
    return;
  }

  const { error } = await supabase
    .from('spades_user_data')
    .upsert(
      { user_id: userId, game_state: state },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Cloud sync save failed:', error.message);
    await logError('cloud_sync_save', error.message, { userId });
  }
}

/** Validate game state to detect corruption (e.g., missing rounds) */
function isGameStateValid(game: unknown): boolean {
  if (!game || typeof game !== 'object') return true; // null/undefined is valid (no active game)

  const g = game as any;
  if (!Array.isArray(g.rounds)) return false;
  if (!Array.isArray(g.teams)) return false;
  if (!Array.isArray(g.players)) return false;
  if (typeof g.phase !== 'string') return false;

  // Check for suspiciously incomplete games:
  // If game is marked complete but has very few rounds (likely corruption)
  if (g.phase === 'complete' && g.rounds.length < 2) {
    return false;
  }

  // All rounds should have complete/incomplete status
  if (!g.rounds.every((r: any) => typeof r.isComplete === 'boolean')) {
    return false;
  }

  return true;
}

/** Apply cloud state to the local Zustand store, with validation against corruption */
export function applyCloudState(cloud: SyncableState) {
  try {
    // Validate that the cloud state doesn't look corrupted
    if (!isGameStateValid(cloud.currentGame)) {
      const localState = useGameStore.getState();
      const localGame = localState.currentGame;
      const localRoundCount = localGame?.rounds?.length ?? 0;
      const cloudRoundCount = (cloud.currentGame as any)?.rounds?.length ?? 0;
      const cloudPhase = (cloud.currentGame as any)?.phase;

      logError('cloud_state_rejected_corruption', 'Cloud game state appears corrupted', {
        cloudRounds: cloudRoundCount,
        cloudPhase,
        localRounds: localRoundCount,
        localPhase: localGame?.phase,
        reason: 'completed game with suspiciously few rounds',
      });

      // Don't apply corrupted state — keep local state
      return;
    }

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
  } catch (e) {
    logError('cloud_state_apply', e, { hasCurrentGame: !!cloud.currentGame, completedCount: cloud.completedGames?.length });
  }
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

// When set, cloud saves target this user ID instead of the signed-in user (editor mode)
let editingForUserId: string | null = null;

export function setEditingForUser(userId: string | null) {
  editingForUserId = userId;
}

// Debounced auto-save subscription
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Immediately save to cloud, bypassing the debounce timer. */
export async function immediateCloudSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const user = useAuthStore.getState().user;
  if (!user) return;
  await saveCloudState(editingForUserId ?? user.id, getSyncableState());
}

export function startCloudSync() {
  // Subscribe to game store changes and auto-save for logged-in users
  const unsubscribe = useGameStore.subscribe(() => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const targetId = editingForUserId ?? user.id;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCloudState(targetId, getSyncableState());
    }, 1500); // debounce 1.5s
  });

  // Flush pending save when user closes/refreshes the browser
  const handleUnload = () => {
    const user = useAuthStore.getState().user;
    if (!user || !saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    // Best-effort synchronous-style save via sendBeacon isn't possible here,
    // but we can at least trigger the async save (may not complete on hard close)
    saveCloudState(user.id, getSyncableState());
  };
  window.addEventListener('beforeunload', handleUnload);

  return () => {
    unsubscribe();
    window.removeEventListener('beforeunload', handleUnload);
  };
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

// ─── Spectator Sessions ──────────────────────────────────────

/** Register or refresh the current user as a spectator for a host's game */
export async function registerSpectator(hostUserId: string, fallbackName: string): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;

  // Prefer the user's profile display name over the email prefix
  let displayName = fallbackName;
  try {
    const profile = await getUserProfile(user.id);
    if (profile?.displayName) displayName = profile.displayName;
  } catch { /* keep fallback */ }

  await supabase.from('spectator_sessions').upsert(
    { host_user_id: hostUserId, spectator_user_id: user.id, display_name: displayName, last_seen: new Date().toISOString() },
    { onConflict: 'host_user_id,spectator_user_id' }
  );
}

/** Update last_seen heartbeat for the current spectator */
export async function updateSpectatorLastSeen(hostUserId: string): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  await supabase.from('spectator_sessions')
    .update({ last_seen: new Date().toISOString() })
    .eq('host_user_id', hostUserId)
    .eq('spectator_user_id', user.id);
}

/** Remove the current user's spectator session when leaving */
export async function unregisterSpectator(hostUserId: string): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  await supabase.from('spectator_sessions')
    .delete()
    .eq('host_user_id', hostUserId)
    .eq('spectator_user_id', user.id);
}

/** Get all spectators for a host (host-only) */
export async function getSpectators(hostUserId: string): Promise<SpectatorInfo[]> {
  const { data, error } = await supabase
    .from('spectator_sessions')
    .select('spectator_user_id, display_name, is_editor, last_seen')
    .eq('host_user_id', hostUserId)
    .order('last_seen', { ascending: false });

  if (error || !data) return [];
  return data.map(d => ({
    spectatorUserId: d.spectator_user_id,
    displayName: d.display_name,
    isEditor: d.is_editor,
    lastSeen: d.last_seen,
  }));
}

/** Grant or revoke editor access for a spectator (host-only) */
export async function setSpectatorEditorAccess(
  hostUserId: string,
  spectatorUserId: string,
  isEditor: boolean
): Promise<void> {
  const { error } = await supabase
    .from('spectator_sessions')
    .update({ is_editor: isEditor })
    .eq('host_user_id', hostUserId)
    .eq('spectator_user_id', spectatorUserId);

  if (error) console.error('Failed to set editor access:', error.message);
}

/** Subscribe to the spectator list for a host (realtime) */
export function subscribeToSpectators(
  hostUserId: string,
  onUpdate: (spectators: SpectatorInfo[]) => void
): () => void {
  const channel = supabase
    .channel(`spectators-${hostUserId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'spectator_sessions', filter: `host_user_id=eq.${hostUserId}` },
      () => { getSpectators(hostUserId).then(onUpdate); }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Subscribe to own editor status — fires when the host grants/revokes edit access */
export function subscribeToEditorStatus(
  hostUserId: string,
  spectatorUserId: string,
  onUpdate: (isEditor: boolean) => void
): () => void {
  const channel = supabase
    .channel(`editor-status-${hostUserId}-${spectatorUserId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'spectator_sessions', filter: `host_user_id=eq.${hostUserId}` },
      (payload) => {
        const row = payload.new as { spectator_user_id: string; is_editor: boolean };
        if (row.spectator_user_id === spectatorUserId) onUpdate(row.is_editor);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
