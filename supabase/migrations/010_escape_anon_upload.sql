-- ============================================================
-- 010 — Upload anônimo para o Escape (sem login)
-- ============================================================
-- Decisao de seguranca: os participantes NAO fazem login. Usam o
-- papel `anon` (chave anonima), que NAO tem acesso de escrita as
-- tabelas (RLS so libera `authenticated` = admin). A unica coisa
-- que eles precisam escrever e o arquivo de foto no Storage —
-- liberado aqui APENAS na pasta `escape/`.
--
-- Com isso o login anonimo do Supabase pode (e deve) ficar
-- DESLIGADO: com ele ligado, qualquer visitante viraria
-- `authenticated` e, pelas policies atuais (`to authenticated
-- using(true)`), teria escrita em tudo.
-- Idempotente.
-- ============================================================

-- Substitui a policy de upload do Escape: agora aceita tambem `anon`,
-- restrito a pasta escape/.
drop policy if exists "gincana_escape_insert" on storage.objects;
create policy "gincana_escape_insert" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'gincana'
    and (storage.foldername(name))[1] = 'escape'
  );
