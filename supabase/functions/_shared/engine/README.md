# Shared engine

This directory should mirror `src/gameEngine/` so the edge function and
the browser client share the exact same reducer and validators.

Two ways to keep them in sync:

1. **Symlink / copy at build time** — add a step to your deploy script
   that copies `src/gameEngine/*.ts` into `supabase/functions/_shared/engine/`
   before running `supabase functions deploy`.

2. **npm workspace package** — extract `gameEngine/` into its own
   package (e.g. `@spades/engine`) consumed by both sides.

Either is fine; the engine has zero runtime dependencies.
