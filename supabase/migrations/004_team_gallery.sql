-- Tabela de galeria por equipe
create table if not exists public.team_gallery (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  image_url text not null,
  caption text,
  order_number integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_gallery_team_id_idx
  on public.team_gallery(team_id);

alter table public.team_gallery enable row level security;

drop policy if exists "team_gallery_select_public" on public.team_gallery;
create policy "team_gallery_select_public" on public.team_gallery
  for select using (true);

drop policy if exists "team_gallery_write_authenticated" on public.team_gallery;
create policy "team_gallery_write_authenticated" on public.team_gallery
  for all to authenticated using (true) with check (true);
