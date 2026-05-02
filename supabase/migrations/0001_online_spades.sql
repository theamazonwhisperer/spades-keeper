-- Online spades schema. Apply with `supabase db push` or run via SQL editor.

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  state jsonb not null,
  version int not null default 0,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'complete'))
);

create table if not exists match_seats (
  match_id uuid not null references matches(id) on delete cascade,
  seat int not null check (seat >= 0 and seat < 4),
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (match_id, seat),
  unique (match_id, user_id)
);

-- Public view: strips secret fields (hands) so spectators can subscribe safely.
create or replace view match_public as
select
  id,
  status,
  version,
  created_at,
  jsonb_set(
    state,
    '{round,hands}',
    to_jsonb(array(select jsonb_array_length(h) from jsonb_array_elements(state->'round'->'hands') h))
  ) as public_state
from matches;

-- RLS
alter table matches enable row level security;
alter table match_seats enable row level security;

-- Anyone authenticated can read public match info via the view.
create policy "read own matches" on matches
  for select using (
    exists (select 1 from match_seats s where s.match_id = matches.id and s.user_id = auth.uid())
  );

-- Only edge functions (service role) write to matches.
create policy "service role writes" on matches
  for all using (auth.role() = 'service_role');

create policy "read own seats" on match_seats
  for select using (user_id = auth.uid());
