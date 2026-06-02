-- Avisos (banners/modais públicos configuráveis pelo admin)

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  variant text not null default 'info', -- 'info' | 'success' | 'warning' | 'urgent'
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_active_window_idx
  on public.announcements(is_active, starts_at, ends_at);

-- Trigger de updated_at (reutiliza função criada na migração 001)
drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- RLS
alter table public.announcements enable row level security;

drop policy if exists "announcements_select_public" on public.announcements;
create policy "announcements_select_public" on public.announcements
  for select using (true);

drop policy if exists "announcements_write_authenticated" on public.announcements;
create policy "announcements_write_authenticated" on public.announcements
  for all to authenticated using (true) with check (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;
