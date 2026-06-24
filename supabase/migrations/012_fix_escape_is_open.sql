-- ============================================================
-- 012 — Fix: escape_is_open() precisa ser SECURITY DEFINER
-- ============================================================
-- A view publica escape_steps_public filtra por escape_is_open().
-- Como a funcao era SECURITY INVOKER (padrao), quando o visitante
-- ANONIMO a executava (atraves da view), ela tentava ler
-- escape_settings sob o RLS do anon — que nega — e retornava FALSE,
-- escondendo TODAS as etapas. Dentro das RPCs (security definer) ela
-- ja funcionava; o problema era so na view publica.
--
-- Fix: SECURITY DEFINER. A funcao continua devolvendo apenas um
-- booleano (aberto/fechado) — nao expoe nenhum dado de escape_settings.
-- Idempotente.
-- ============================================================

create or replace function public.escape_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(
    is_published
    and (opens_at is null or now() >= opens_at)
    and (closes_at is null or now() <= closes_at)
  ), false)
  from public.escape_settings;
$$;

grant execute on function public.escape_is_open() to anon, authenticated;
