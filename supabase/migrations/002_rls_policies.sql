-- Row Level Security
-- Estratégia:
--   - Leitura pública (anon + authenticated) em todas as tabelas de domínio
--   - Escrita apenas para usuários autenticados (admin loga via Supabase Auth)

alter table public.teams                 enable row level security;
alter table public.members               enable row level security;
alter table public.weeks                 enable row level security;
alter table public.activities            enable row level security;
alter table public.scores                enable row level security;
alter table public.competition_settings  enable row level security;

-- TEAMS
drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public" on public.teams
  for select using (true);

drop policy if exists "teams_write_authenticated" on public.teams;
create policy "teams_write_authenticated" on public.teams
  for all to authenticated using (true) with check (true);

-- MEMBERS
drop policy if exists "members_select_public" on public.members;
create policy "members_select_public" on public.members
  for select using (true);

drop policy if exists "members_write_authenticated" on public.members;
create policy "members_write_authenticated" on public.members
  for all to authenticated using (true) with check (true);

-- WEEKS
drop policy if exists "weeks_select_public" on public.weeks;
create policy "weeks_select_public" on public.weeks
  for select using (true);

drop policy if exists "weeks_write_authenticated" on public.weeks;
create policy "weeks_write_authenticated" on public.weeks
  for all to authenticated using (true) with check (true);

-- ACTIVITIES
drop policy if exists "activities_select_public" on public.activities;
create policy "activities_select_public" on public.activities
  for select using (true);

drop policy if exists "activities_write_authenticated" on public.activities;
create policy "activities_write_authenticated" on public.activities
  for all to authenticated using (true) with check (true);

-- SCORES
drop policy if exists "scores_select_public" on public.scores;
create policy "scores_select_public" on public.scores
  for select using (true);

drop policy if exists "scores_write_authenticated" on public.scores;
create policy "scores_write_authenticated" on public.scores
  for all to authenticated using (true) with check (true);

-- COMPETITION SETTINGS
drop policy if exists "competition_settings_select_public" on public.competition_settings;
create policy "competition_settings_select_public" on public.competition_settings
  for select using (true);

drop policy if exists "competition_settings_write_authenticated" on public.competition_settings;
create policy "competition_settings_write_authenticated" on public.competition_settings
  for all to authenticated using (true) with check (true);

-- Grants para a view de ranking
grant select on public.team_rankings to anon, authenticated;
