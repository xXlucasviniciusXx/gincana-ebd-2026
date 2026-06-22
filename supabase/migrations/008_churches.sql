-- 008_churches.sql
-- Adiciona tabela de igrejas e vincula equipes a elas.
-- Rankings são calculados dinamicamente pela view church_rankings.

-- CHURCHES
create table if not exists public.churches (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  city       text,
  logo_url   text,
  color      text        not null default '#0b1f4d',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK em teams (nullable — equipes existentes ficam sem igreja até o admin atribuir)
alter table public.teams
  add column if not exists church_id uuid references public.churches(id) on delete set null;

create index if not exists teams_church_id_idx on public.teams(church_id);

-- VIEW de ranking por igreja (soma dos pontos de todas as equipes ativas da igreja)
create or replace view public.church_rankings as
select
  c.id,
  c.name,
  c.color,
  c.logo_url,
  c.city,
  c.is_active,
  coalesce(sum(s.points), 0)    as total_points,
  count(distinct t.id)          as team_count,
  rank() over (
    order by coalesce(sum(s.points), 0) desc
  )                             as rank_position
from public.churches c
left join public.teams  t on t.church_id = c.id and t.is_active = true
left join public.scores s on s.team_id = t.id
where c.is_active = true
group by c.id, c.name, c.color, c.logo_url, c.city, c.is_active
order by total_points desc;

-- Trigger updated_at
drop trigger if exists trg_churches_updated_at on public.churches;
create trigger trg_churches_updated_at
  before update on public.churches
  for each row execute function public.set_updated_at();

-- RLS
alter table public.churches enable row level security;

drop policy if exists "churches_select_public" on public.churches;
create policy "churches_select_public" on public.churches
  for select using (true);

drop policy if exists "churches_write_authenticated" on public.churches;
create policy "churches_write_authenticated" on public.churches
  for all to authenticated using (true) with check (true);

-- Grants
grant select on public.church_rankings to anon, authenticated;

-- Realtime
alter publication supabase_realtime add table public.churches;
