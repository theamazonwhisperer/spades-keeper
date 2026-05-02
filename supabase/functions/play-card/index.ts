// Supabase Edge Function — server-authoritative play-card handler.
//
// Deploy with:
//   supabase functions deploy play-card --no-verify-jwt=false
//
// Expected schema (Postgres):
//
//   create table matches (
//     id uuid primary key default gen_random_uuid(),
//     created_at timestamptz default now(),
//     state jsonb not null,         -- ServerMatchState (includes hands)
//     version int not null default 0
//   );
//
//   create table match_seats (
//     match_id uuid references matches(id) on delete cascade,
//     seat int not null,
//     user_id uuid not null,
//     primary key (match_id, seat)
//   );
//
// RLS: only the authenticated user mapped to a seat can submit actions
// for that seat. Spectators read PublicView via a view that strips hands.

// @ts-expect-error — Deno runtime import resolved by Supabase Edge runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error — Supabase JS client for Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: This stub references the engine via relative path. In practice you
// would either (a) duplicate the engine into supabase/functions/_shared/,
// or (b) bundle it with `supabase functions deploy --import-map`.
// Both work; the engine is pure TypeScript with no DOM/Node deps.
import { reduce, toPrivateView, toPublicView } from '../_shared/engine/state.ts';
import type { Action, ServerMatchState } from '../_shared/engine/state.ts';

interface PlayCardRequest {
  matchId: string;
  action: Action;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(
    // @ts-expect-error — Deno.env is provided by the Edge runtime
    Deno.env.get('SUPABASE_URL')!,
    // @ts-expect-error — Deno.env is provided by the Edge runtime
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: PlayCardRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  // Load match + verify the caller actually occupies the seat they claim.
  const { data: match, error: loadErr } = await supabase
    .from('matches')
    .select('id, state, version')
    .eq('id', body.matchId)
    .single();
  if (loadErr || !match) return json({ error: 'match_not_found' }, 404);

  const { data: seatRow } = await supabase
    .from('match_seats')
    .select('seat')
    .eq('match_id', body.matchId)
    .eq('user_id', user.id)
    .single();
  if (!seatRow) return json({ error: 'not_seated' }, 403);
  if (seatRow.seat !== body.action.seat) {
    return json({ error: 'seat_mismatch' }, 403);
  }

  // Apply the action through the pure reducer.
  const state = match.state as ServerMatchState;
  const result = reduce(state, body.action);
  if (!result.ok) return json({ error: result.error }, 400);

  // Optimistic-concurrency upsert: only write if version is unchanged.
  const { error: writeErr } = await supabase
    .from('matches')
    .update({ state: result.state, version: match.version + 1 })
    .eq('id', body.matchId)
    .eq('version', match.version);
  if (writeErr) return json({ error: 'version_conflict' }, 409);

  // Broadcast PublicView to the realtime channel; the player who acted
  // also gets their PrivateView via a direct response.
  await supabase.channel(`match:${body.matchId}`).send({
    type: 'broadcast',
    event: 'state',
    payload: toPublicView(result.state),
  });

  return json({ ok: true, view: toPrivateView(result.state, body.action.seat) });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
