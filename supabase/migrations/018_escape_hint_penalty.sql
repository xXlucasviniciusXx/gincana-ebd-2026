-- ============================================================
-- 018 — Dica sob demanda com penalidade de tempo
-- ============================================================
-- A dica continua aparecendo de graca apos 2 erros. Mas o time pode
-- pedir a dica antes, pagando uma penalidade (padrao 900s = 15 min),
-- somada ao tempo. A penalidade so e cobrada UMA vez por (equipe,etapa).
-- Idempotente.
-- ============================================================

alter table public.escape_settings
  add column if not exists hint_penalty_seconds int not null default 900;

create table if not exists public.escape_hint_uses (
  team_id uuid not null references public.teams(id) on delete cascade,
  step_id uuid not null references public.escape_steps(id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (team_id, step_id)
);
alter table public.escape_hint_uses enable row level security;
drop policy if exists "escape_hint_uses_rw_auth" on public.escape_hint_uses;
create policy "escape_hint_uses_rw_auth" on public.escape_hint_uses
  for all to authenticated using (true) with check (true);

-- Expoe as penalidades na view publica (para a tela mostrar o custo)
create or replace view public.escape_settings_public as
  select id, title, intro_text, is_published, opens_at, closes_at,
         final_prompt, final_success_text,
         wrong_penalty_seconds, hint_penalty_seconds
  from public.escape_settings;
grant select on public.escape_settings_public to anon, authenticated;

-- RPC: pedir dica (aplica penalidade 1x por etapa) e devolve o texto
create or replace function public.escape_use_hint(p_code text, p_step_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_pen int := 0;
  v_added boolean := false;
  v_hint text;
begin
  v_team := public.escape_team_of(p_code);
  if v_team is null then
    return jsonb_build_object('ok', false, 'reason', 'auth');
  end if;

  select hint into v_hint from public.escape_steps
  where id = p_step_id and is_active = true;

  insert into public.escape_hint_uses (team_id, step_id)
  values (v_team, p_step_id)
  on conflict (team_id, step_id) do nothing;

  if found then  -- so cobra na primeira vez
    select coalesce(hint_penalty_seconds, 0) into v_pen
    from public.escape_settings order by created_at limit 1;
    update public.escape_team_state
      set penalty_seconds = penalty_seconds + v_pen
      where team_id = v_team;
    v_added := true;
  end if;

  return jsonb_build_object('ok', true,
    'penalty_seconds', case when v_added then v_pen else 0 end,
    'hint', v_hint);
end;
$$;

grant execute on function public.escape_use_hint(text, uuid) to anon, authenticated;
