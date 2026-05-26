-- Campos extras de equipe + controle de semana + bucket de Storage

-- TEAMS: bio, redes, fotos
alter table public.teams
  add column if not exists bio text,
  add column if not exists instagram_url text,
  add column if not exists photo_url text,
  add column if not exists banner_url text;

-- MEMBERS: foto individual
alter table public.members
  add column if not exists photo_url text;

-- WEEKS: status de encerramento (mantemos is_active para "visível", adicionamos closed_at)
alter table public.weeks
  add column if not exists closed_at timestamptz,
  add column if not exists reopened_at timestamptz;

-- COMPETITION SETTINGS: critério manual de desempate
alter table public.competition_settings
  add column if not exists tiebreaker_note text;

-- ACTIVITIES: imagem ilustrativa (uso futuro)
alter table public.activities
  add column if not exists photo_url text;

-- ----------------------------------------------------------
-- Storage bucket: "gincana"
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gincana',
  'gincana',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Policies do bucket: leitura pública, upload/update/delete só para authenticated
drop policy if exists "gincana_read_public" on storage.objects;
create policy "gincana_read_public" on storage.objects
  for select using (bucket_id = 'gincana');

drop policy if exists "gincana_insert_authenticated" on storage.objects;
create policy "gincana_insert_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gincana');

drop policy if exists "gincana_update_authenticated" on storage.objects;
create policy "gincana_update_authenticated" on storage.objects
  for update to authenticated
  using (bucket_id = 'gincana');

drop policy if exists "gincana_delete_authenticated" on storage.objects;
create policy "gincana_delete_authenticated" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gincana');
