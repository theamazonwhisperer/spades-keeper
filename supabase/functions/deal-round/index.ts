// Supabase Edge Function — deal a fresh round.
// Called when all bids are in OR a new match starts. The seed is generated
// server-side and never leaves the database, so clients can't replay deals.

// @ts-expect-error — Deno runtime import resolved by Supabase Edge runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error — Supabase JS client for Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { startRound, toPublicView } from '../_shared/engine/state.ts';
import type { ServerMatchState } from '../_shared/engine/state.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabase = createClient(
    // @ts-expect-error — Deno.env is provided by the Edge runtime
    Deno.env.get('SUPABASE_URL')!,
    // @ts-expect-error — Deno.env is provided by the Edge runtime
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { matchId } = await req.json();

  const { data: match } = await supabase
    .from('matches')
    .select('id, state, version')
    .eq('id', matchId)
    .single();
  if (!match) return new Response('not found', { status: 404 });

  const prev = match.state as ServerMatchState;
  const nextRoundNumber = prev.history.length + 1;
  const fresh = startRound(prev, prev, nextRoundNumber);

  await supabase
    .from('matches')
    .update({ state: fresh, version: match.version + 1 })
    .eq('id', matchId)
    .eq('version', match.version);

  await supabase.channel(`match:${matchId}`).send({
    type: 'broadcast',
    event: 'state',
    payload: toPublicView(fresh),
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
});
