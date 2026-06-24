-- ============================================================
-- 017 — Penalidade de tempo por resposta errada
-- ============================================================
-- Cada resposta ERRADA de quiz/enigma soma uma penalidade (padrao
-- 1800s = 30 min) ao TEMPO EFETIVO do time. Sem cooldown: o time
-- continua jogando, mas o erro piora a posicao (ranking por tempo).
-- Nao penaliza etapa ja concluida nem a senha final.
-- Idempotente.
-- ============================================================

-- 1) Colunas
alter table public.escape_team_state
  add column if not exists penalty_seconds int not null default 0;

alter table public.escape_settings
  add column if not exists wrong_penalty_seconds int not null default 1800;

-- 2) escape_answer: aplica penalidade no erro
create or replace function public.escape_answer(
  p_code text, p_step_id uuid, p_attempt text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_step public.escape_steps%rowtype;
  v_pen int := 0;
begin
  v_team := public.escape_team_of(p_code);
  if v_team is null then
    return jsonb_build_object('ok', false, 'reason', 'auth');
  end if;
  if not public.escape_is_open() then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  select * into v_step from public.escape_steps
  where id = p_step_id and is_active = true;
  if not found or v_step.type = 'photo' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_step');
  end if;

  if public.escape_norm(p_attempt) = public.escape_norm(v_step.answer) then
    insert into public.escape_progress (team_id, step_id, points_awarded)
    values (v_team, v_step.id, v_step.points)
    on conflict (team_id, step_id) do nothing;
    return jsonb_build_object('ok', true, 'correct', true,
      'clue', v_step.reward_clue, 'points', v_step.points);
  end if;

  -- ERROU: penaliza apenas se a etapa ainda nao foi concluida
  if not exists (
    select 1 from public.escape_progress
    where team_id = v_team and step_id = v_step.id
  ) then
    select coalesce(wrong_penalty_seconds, 0) into v_pen
    from public.escape_settings order by created_at limit 1;
    update public.escape_team_state
      set penalty_seconds = penalty_seconds + v_pen
      where team_id = v_team;
  end if;

  return jsonb_build_object('ok', true, 'correct', false, 'penalty_seconds', v_pen);
end;
$$;

grant execute on function public.escape_answer(text, uuid, text) to anon, authenticated;

-- 3) Ranking: tempo EFETIVO = (fim - inicio) + penalidade
drop view if exists public.escape_ranking;

create view public.escape_ranking as
  select
    t.id, t.name, t.color, t.church_id,
    st.started_at, st.finished_at,
    coalesce(st.penalty_seconds, 0) as penalty_seconds,
    case when st.finished_at is not null
      then (extract(epoch from (st.finished_at - st.started_at)))::int + coalesce(st.penalty_seconds, 0)
    end as duration_seconds,
    count(p.step_id) as steps_done,
    (count(*) filter (where p.photo_review = 'rejected'))::int as rejected_photos,
    rank() over (
      order by
        (st.finished_at is null),
        (count(*) filter (where p.photo_review = 'rejected')) asc,
        (case when st.finished_at is not null
          then (extract(epoch from (st.finished_at - st.started_at)))::int + coalesce(st.penalty_seconds, 0)
        end) asc nulls last
    ) as rank_position
  from public.escape_team_state st
  join public.teams t on t.id = st.team_id
  left join public.escape_progress p on p.team_id = st.team_id
  group by t.id, t.name, t.color, t.church_id, st.started_at, st.finished_at, st.penalty_seconds
  order by
    (st.finished_at is null),
    (count(*) filter (where p.photo_review = 'rejected')) asc,
    (case when st.finished_at is not null
      then (extract(epoch from (st.finished_at - st.started_at)))::int + coalesce(st.penalty_seconds, 0)
    end) asc nulls last;

grant select on public.escape_ranking to anon, authenticated;
