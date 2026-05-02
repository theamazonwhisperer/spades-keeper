# Online Spades — Architecture & Cost

This is a scaffold to convert SpadesKeeper (a scorekeeper PWA) into a real
multiplayer online spades app. The card-playing layer is new; the scoring,
auth, and history layers come from the existing codebase.

## Scaffold map

```
src/gameEngine/
  cards.ts       deck, deterministic shuffle, deal (3- and 4-player)
  trick.ts       lead-suit / follow-suit / spades-broken validation,
                 trick-winner determination
  state.ts       ServerMatchState (full secrets), PublicView, PrivateView,
                 reducer (SUBMIT_BID, PLAY_CARD), bridge to existing
                 utils/scoring.ts via roundToPlayerData()
  index.ts       barrel

supabase/
  functions/
    play-card/         POST action -> validate -> reduce -> broadcast
    deal-round/        starts a fresh deal with a server-only seed
    _shared/engine/    mirror of src/gameEngine (kept in sync at deploy)
  migrations/
    0001_online_spades.sql   matches, match_seats, match_public view, RLS
```

## Trust model

- The **server is the only entity that sees full hands**. The `state.hands`
  field lives in `matches.state` (jsonb) and is only readable by the
  service role used by edge functions.
- Clients receive a `PrivateView` (their hand + public) on their own actions
  and `PublicView` (cards-remaining counts only) via realtime broadcast.
- Every action goes through `reduce()` server-side. The same reducer can
  also run in the browser as a *predictive* layer for instant feedback,
  with the server's `PublicView` as the source of truth.
- Optimistic concurrency on `matches.version` prevents double-plays from
  duplicate clicks or split-brain reconnects.

## Reusing what's already here

| Existing code | Role in online version |
|---|---|
| `src/utils/scoring.ts` | Unchanged. Round results convert via `roundToPlayerData()`. |
| `src/types/index.ts` | `Game`, `Round`, `GameSettings` reused; `PlayerRoundData` is now derived from server play, not user input. |
| `src/store/authStore.ts` | Same Supabase auth — no changes. |
| `src/lib/cloudSync.ts` | Still useful for personal history; multiplayer uses the new `matches` table. |
| `src/screens/views/BiddingView.tsx` | Reusable for the bidding phase; wire `submitBids` to the edge function. |
| `src/screens/HistoryScreen.tsx` etc. | Unchanged. |

## What's still missing (build list)

1. **Card UI** — hand fan, current trick area, play animations, turn indicator.
2. **Lobby & matchmaking** — invite links, join by code, fill with bots.
3. **Reconnect & disconnect** — grace timer, auto-bot takeover, resume.
4. **Bot AI** — even a simple heuristic (lead lowest, win cheapest, dump
   high non-spades when void) is enough for solo play.
5. **Anti-cheat hardening** — rate limit edge fn, audit log, RLS tests.
6. **Predictive client reducer** — import `gameEngine` and apply optimistically.

---

## Estimated runtime cost

Cost varies sharply with concurrency. Here's a realistic ladder.

### Tier 0 — Hobby / personal (≤ 100 daily actives, ~10 concurrent matches)

| Service | Plan | Monthly |
|---|---|---|
| Vercel (frontend hosting) | Hobby | **$0** |
| Supabase (auth + Postgres + Realtime + Edge Functions) | Free | **$0** |
| Domain | (one-off) | ~$12/yr |
| **Total** | | **~$0–1/mo** |

Free tier limits to watch:
- Supabase Free: 500 MB DB, 5 GB egress, 2 M edge fn invocations, 2 M
  Realtime messages, 50 K MAUs. A 4-player match generates ~60 plays
  + ~60 broadcasts per round; 10-round games = ~1,200 messages each.
  Free tier comfortably handles ~1,500 games/month.

### Tier 1 — Small community (~1,000 DAU, ~50 concurrent matches)

| Service | Plan | Monthly |
|---|---|---|
| Vercel | Hobby (or Pro $20 if team) | **$0–20** |
| Supabase Pro | $25 base + usage | **~$30–45** |
| Domain | | ~$1 |
| **Total** | | **~$30–65/mo** |

Supabase Pro includes 8 GB DB, 250 GB egress, 2 M edge fn, 5 M Realtime
messages. Beyond that: ~$2.50 per million Realtime msgs, $2 per million
edge fn invocations.

### Tier 2 — Growing app (~10,000 DAU, ~500 concurrent matches)

| Service | Plan | Monthly |
|---|---|---|
| Vercel Pro | | **$20** |
| Supabase Pro + usage | | **~$120–200** |
| Realtime overage (~50 M msg/mo) | | **~$110** |
| Edge function overage | | **~$15** |
| Egress (~500 GB) | | **~$25** |
| **Total** | | **~$300–400/mo** |

### Tier 3 — Real scale (100K+ DAU)

At this point the architecture should change: a dedicated game server
(Node + WebSockets on Fly.io / Railway / Cloudflare Durable Objects)
becomes cheaper per concurrent game than Supabase Realtime broadcasts.

| Service | Notes | Monthly |
|---|---|---|
| Frontend (Vercel/Cloudflare Pages) | | **$20–100** |
| Game servers (4–8x small VMs, e.g. Fly.io) | autoscale on connections | **$100–400** |
| Postgres (Supabase / Neon / RDS) | history + auth only | **$100–300** |
| Realtime / Pub-sub (Cloudflare Durable Objects or Ably) | | **$200–800** |
| Object storage (avatars, replays) | | **$10–30** |
| Monitoring / logs (Sentry, Logtail) | | **$30–60** |
| **Total** | | **~$500–1,700/mo** |

### Per-game economics (rough)

A 4-player, 10-round game on Supabase Pro tier costs roughly:
- Realtime broadcasts: ~1,200 messages × $2.50 / 1M = **$0.003**
- Edge function invocations: ~520 × $2 / 1M = **$0.001**
- DB writes: negligible
- Egress: ~50 KB × $0.09 / GB = **$0.0000045**

So **~$0.004 per full game** at scale — about 250 games per dollar.

### Costs to plan for that aren't infra

- App store fees if you ever wrap as native ($99/yr Apple, $25 once Google).
- Push notifications at scale (OneSignal free up to 10K subs, then ~$9–99/mo).
- Anti-cheat / abuse review time — non-trivial for any real-money mode.
- Customer support tooling (intercom-equivalents start ~$40/mo).

---

## Recommendation

**Start on Tier 0** (Supabase free + Vercel hobby). The architecture in this
scaffold scales cleanly to Tier 2 with no code changes — just plan upgrades.
Defer the dedicated-game-server rewrite until you actually have ~5K
concurrent matches; until then, Supabase Realtime + edge functions are
the cheapest, fastest path.
