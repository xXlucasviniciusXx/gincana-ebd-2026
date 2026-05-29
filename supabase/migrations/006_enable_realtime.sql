-- Habilita Supabase Realtime para as tabelas que o frontend
-- escuta. Idempotente: se a tabela já estiver na publicação,
-- ignora o erro.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'scores',
      'events',
      'team_badges',
      'competition_settings',
      'weeks'
    ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
