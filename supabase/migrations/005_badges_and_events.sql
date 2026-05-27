-- Badges/Conquistas e Feed de Novidades

-- ========================================================
-- TEAM BADGES
-- ========================================================
create table if not exists public.team_badges (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  badge_code text not null,
  payload jsonb,
  earned_at timestamptz not null default now(),
  unique (team_id, badge_code)
);

create index if not exists team_badges_team_id_idx on public.team_badges(team_id);
create index if not exists team_badges_earned_at_idx on public.team_badges(earned_at desc);

alter table public.team_badges enable row level security;

drop policy if exists "team_badges_select_public" on public.team_badges;
create policy "team_badges_select_public" on public.team_badges
  for select using (true);

drop policy if exists "team_badges_write_authenticated" on public.team_badges;
create policy "team_badges_write_authenticated" on public.team_badges
  for all to authenticated using (true) with check (true);

-- ========================================================
-- EVENTS (feed de novidades)
-- ========================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'score' | 'badge' | 'week_started' | 'week_closed' | 'gincana_closed' | 'gincana_reopened'
  team_id uuid references public.teams(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx on public.events(created_at desc);
create index if not exists events_type_idx on public.events(type);
create index if not exists events_team_id_idx on public.events(team_id);

alter table public.events enable row level security;

drop policy if exists "events_select_public" on public.events;
create policy "events_select_public" on public.events
  for select using (true);

drop policy if exists "events_write_authenticated" on public.events;
create policy "events_write_authenticated" on public.events
  for all to authenticated using (true) with check (true);
