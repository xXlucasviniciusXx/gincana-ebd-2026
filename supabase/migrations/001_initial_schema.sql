-- Gincana EBD 2026 — schema inicial

create extension if not exists "pgcrypto";

-- TEAMS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  leader_name text,
  bible_reference text,
  theme_verse text,
  war_cry text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MEMBERS
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_team_id_idx on public.members(team_id);

-- WEEKS
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date,
  end_date date,
  order_number integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists weeks_order_number_idx on public.weeks(order_number);

-- ACTIVITIES
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  name text not null,
  description text,
  type text not null default 'normal',
  max_points integer not null default 0,
  activity_date date,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activities_week_id_idx on public.activities(week_id);

-- SCORES
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  points numeric not null default 0,
  observation text,
  registered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, activity_id)
);

create index if not exists scores_team_id_idx on public.scores(team_id);
create index if not exists scores_activity_id_idx on public.scores(activity_id);

-- COMPETITION SETTINGS (singleton)
create table if not exists public.competition_settings (
  id uuid primary key default gen_random_uuid(),
  competition_name text not null,
  theme text,
  general_bible_reference text,
  general_verse text,
  status text not null default 'open', -- 'open' | 'closed'
  champion_team_id uuid references public.teams(id) on delete set null,
  has_tie boolean not null default false,
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- VIEW de ranking calculado dinamicamente
create or replace view public.team_rankings as
select
  t.id,
  t.name,
  t.color,
  t.is_active,
  coalesce(sum(s.points), 0) as total_points,
  count(s.id) as scores_count,
  rank() over (order by coalesce(sum(s.points), 0) desc) as rank_position
from public.teams t
left join public.scores s on s.team_id = t.id
where t.is_active = true
group by t.id, t.name, t.color, t.is_active
order by total_points desc;

-- Trigger genérico para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array['teams','members','weeks','activities','scores','competition_settings'])
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;
