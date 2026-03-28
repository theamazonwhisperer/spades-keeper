import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { logError } from '../utils/logError';
import type { PlayerLink, UserProfile, Game, SpectatorInfo } from '../types';

// ─── Types ──────────────────────────────────────────────────

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
  updatedAt?: string; // ISO timestamp — set on every cloud save
}

// ─── Helpers ────────────────────────────────────────────────

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

/** Count completed rounds in a game object */
function countCompletedRounds(game: unknown): number {
  if (!game || typeof game !== 'object') return 0;
  const g = game as { rounds?: { isComplete?: boolean }[] };
  return g.rounds?.filter(r => r.isComplete)?.length ?? 0;
}

/** Get the game ID from a game object (for deduplication) */
function getGameId(game: unknown): string | null {
  if (!game || typeof game !== 'object') return null;
  return (game as { id?: string }).id ?? null;
}

/** Compute a "data weight" score — higher means more data to preserve */
function computeDataWeight(state: SyncableState): number {
  return (
    countCompletedRounds(state.currentGame) * 100 + // active game rounds are most important
    (state.completedGames?.length ?? 0) * 50 +
    (state.savedGames?.length ?? 0) * 50 +
    (state.deletedGames?.length ?? 0) * 5 +
    Object.keys(state.playerStats ?? {}).length * 2 +
    (state.savedPlayerNames?.length ?? 0)
  );
}

// ─── Cloud Save (with retry) ────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

/** Save game state to Supabase with automatic retry on failure */
async function saveCloudState(userId: string, state: SyncableState): Promise<boolean> {
  const stamped: SyncableState = { ...state, updatedAt: new Date().toISOString() };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await supabase
      .from('spades_user_data')
      .upsert(
        { user_id: userId, game_state: stamped },
        { onConflict: 'user_id' }
      );

    if (!error) {
      // Track last successful save timestamp locally
      lastConfirmedSaveAt = stamped.updatedAt!;
      return true;
    }

    console.error(`Cloud sync save failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message);

    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
    } else {
      // All retries exhausted — log and queue for next opportunity
      await logError('cloud_sync_save_exhausted', error.message, {
        userId,
        attempts: attempt + 1,
        rounds: countCompletedRounds(state.currentGame),
      });
      pendingFailedSave = { userId, state: stamped };
    }
  }
  return false;
}

/** Track failed saves so they can be retried on next opportunity */
let pendingFailedSave: { userId: string; state: SyncableState } | null = null;

/** Timestamp of last confirmed successful save */
let lastConfirmedSaveAt: string | null = null;

/** Retry any previously failed save — called on visibility change, debounce, etc. */
async function retryFailedSave(): Promise<void> {
  if (!pendingFailedSave) return;
  const { userId, state } = pendingFailedSave;
  // Only retry if the pending state is still the most recent
  // (if a newer save succeeded, the failed one is obsolete)
  const currentState = getSyncableState();
  if (computeDataWeight(currentState) > computeDataWeight(state)) {
    // Current state is more complete — save that instead
    pendingFailedSave = null;
    await saveCloudState(userId, currentState);
  } else {
    pendingFailedSave = null;
    await saveCloudState(userId, state);
  }
}

// ─── Cloud Load ─────────────────────────────────────────────

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

// ─── Conflict Resolution ────────────────────────────────────

/**
 * Determine whether cloud state should replace local state.
 *
 * Strategy (in priority order):
 *   1. If the active game is the SAME game (same ID), keep the one with more
 *      completed rounds — that's the most up-to-date version.
 *   2. If the active games differ, use overall data weight to decide.
 *   3. If cloud has an updatedAt timestamp newer than our last confirmed save,
 *      prefer cloud (it was saved more recently by this or another session).
 *   4. Default: accept cloud on first load (local may be from an older session).
 */
function shouldApplyCloud(local: SyncableState, cloud: SyncableState): boolean {
  const localRounds = countCompletedRounds(local.currentGame);
  const cloudRounds = countCompletedRounds(cloud.currentGame);
  const localGameId = getGameId(local.currentGame);
  const cloudGameId = getGameId(cloud.currentGame);

  // Same active game — compare round counts directly
  if (localGameId && cloudGameId && localGameId === cloudGameId) {
    if (localRounds > cloudRounds) {
      logConflict('same_game_local_ahead', { localRounds, cloudRounds, gameId: localGameId });
      return false;
    }
    // Cloud has equal or more rounds — accept cloud
    return true;
  }

  // Different active games or one is null — use data weight
  const localWeight = computeDataWeight(local);
  const cloudWeight = computeDataWeight(cloud);

  // If local has significantly more data and cloud doesn't have a newer timestamp
  if (localWeight > cloudWeight) {
    // Check if cloud is genuinely newer (saved after our last confirmed save)
    if (cloud.updatedAt && lastConfirmedSaveAt && cloud.updatedAt > lastConfirmedSaveAt) {
      // Cloud is more recent even though it has less weight — this could be
      // a legitimate state change (e.g. game was completed and cleared).
      // Accept cloud.
      return true;
    }

    // Cloud has less data and isn't newer — local wins
    if (localRounds > 0 || (local.completedGames?.length ?? 0) > (cloud.completedGames?.length ?? 0)) {
      logConflict('local_heavier', { localWeight, cloudWeight, localRounds, cloudRounds });
      return false;
    }
  }

  // Default: accept cloud
  return true;
}

function logConflict(reason: string, details: Record<string, unknown>): void {
  console.warn(`Cloud sync conflict [${reason}]:`, details, '— keeping local state');
  logError('cloud_state_conflict', reason, details);
}

/** Apply cloud state to the local Zustand store (with conflict resolution) */
export function applyCloudState(cloud: SyncableState) {
  try {
    const local = getSyncableState();

    if (!shouldApplyCloud(local, cloud)) {
      // Local is authoritative — push it back to cloud to fix stale data
      const user = useAuthStore.getState().user;
      if (user) {
        saveCloudState(editingForUserId ?? user.id, local);
      }
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

    // Track that we accepted this cloud state's timestamp
    if (cloud.updatedAt) lastConfirmedSaveAt = cloud.updatedAt;
  } catch (e) {
    logError('cloud_state_apply', e, { hasCurrentGame: !!cloud.currentGame, completedCount: cloud.completedGames?.length });
  }
}

// ─── Sharing ────────────────────────────────────────────────

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

// ─── Cloud Sync Engine ──────────────────────────────────────

// When set, cloud saves target this user ID instead of the signed-in user (editor mode)
let editingForUserId: string | null = null;

export function setEditingForUser(userId: string | null) {
  editingForUserId = userId;
}

// Debounced auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Prevent concurrent saves from racing
let saveInFlight = false;
let saveQueued = false;

async function enqueueSave(userId: string): Promise<void> {
  if (saveInFlight) {
    // A save is already running — queue another one for when it finishes
    saveQueued = true;
    return;
  }

  saveInFlight = true;
  try {
    await saveCloudState(userId, getSyncableState());
  } finally {
    saveInFlight = false;
  }

  // If another save was queued while we were saving, run it now
  // (it will capture the latest state via getSyncableState)
  if (saveQueued) {
    saveQueued = false;
    await enqueueSave(userId);
  }
}

/**
 * Immediately save to cloud, bypassing the debounce timer.
 * After saving, verifies the save succeeded by reading back the round count.
 * If verification fails, retries the save.
 */
export async function immediateCloudSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const user = useAuthStore.getState().user;
  if (!user) return;

  const targetId = editingForUserId ?? user.id;
  const localState = getSyncableState();
  const localRounds = countCompletedRounds(localState.currentGame);

  await enqueueSave(targetId);

  // Verification: read back from cloud and confirm the data persisted
  try {
    const cloud = await loadCloudState(targetId);
    if (cloud) {
      const cloudRounds = countCompletedRounds(cloud.currentGame);
      if (localRounds > 0 && cloudRounds < localRounds) {
        console.warn(
          `Save verification failed: cloud has ${cloudRounds} rounds, local has ${localRounds}. Retrying...`
        );
        await logError('cloud_save_verification_failed', 'Round count mismatch after save', {
          localRounds,
          cloudRounds,
          targetId,
        });
        // Retry with fresh state
        await saveCloudState(targetId, getSyncableState());
      }
    }
  } catch {
    // Verification is best-effort — don't block on failure
  }
}

/** Best-effort save using fetch+keepalive for page unload scenarios */
function keepaliveSave(userId: string, state: SyncableState): void {
  try {
    const stamped = { ...state, updatedAt: new Date().toISOString() };
    const url = `${supabaseUrl}/rest/v1/spades_user_data?on_conflict=user_id`;
    const body = JSON.stringify({ user_id: userId, game_state: stamped });

    // Get the current session access token for auth
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
    const sessionStr = sessionStorage.getItem(storageKey)
      || localStorage.getItem(storageKey);
    let accessToken = supabaseAnonKey;
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        accessToken = session?.access_token || session?.currentSession?.access_token || accessToken;
      } catch { /* use fallback */ }
    }

    // fetch with keepalive survives page unload and supports auth headers
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Best effort — localStorage still has the data as fallback
  }
}

export function startCloudSync() {
  // Subscribe to game store changes and auto-save for logged-in users
  const unsubscribe = useGameStore.subscribe(() => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const targetId = editingForUserId ?? user.id;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      enqueueSave(targetId);
    }, 1500); // debounce 1.5s
  });

  // Flush pending save when user closes/refreshes the browser
  const handleUnload = () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    // Use fetch+keepalive for reliable delivery during page unload
    keepaliveSave(editingForUserId ?? user.id, getSyncableState());
  };

  // Save eagerly when app is backgrounded (critical on mobile)
  const handleVisibilityChange = () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    const targetId = editingForUserId ?? user.id;

    if (document.visibilityState === 'hidden') {
      // Flush any pending debounce immediately
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      // Use keepalive save (more reliable than async when being backgrounded)
      keepaliveSave(targetId, getSyncableState());
    } else {
      // App came back to foreground — retry any failed saves
      retryFailedSave();
    }
  };

  window.addEventListener('beforeunload', handleUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    unsubscribe();
    window.removeEventListener('beforeunload', handleUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
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
