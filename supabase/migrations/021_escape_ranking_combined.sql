-- ============================================================
-- 021 — (OPCIONAL / FUTURO) Ranking COMBINADO: tempo + erros
-- ============================================================
-- NÃO rode durante um evento sem QUERER trocar o critério.
--
-- Equilibra os dois extremos:
--   - 020 (atual): só acerto manda; 1 erro a mais derruba a equipe
--     mesmo que ela tenha terminado MUITO antes.
--   - antigo: só tempo; erros quase não contavam perto de dias.
--
-- Aqui: ordena por TEMPO EFETIVO = (fim - início) + penalidade × PESO.
--   PESO = 6  =>  1 erro (30min) ~ 3h ;  1 dica (15min) ~ 1.5h.
--   Aumente o PESO para erros pesarem mais; diminua para o tempo mandar.
-- Mesmas colunas da view atual (não quebra o app). Idempotente.
-- ============================================================

drop view if exists public.escape_ranking;

create view public.escape_ranking as
  select
    t.id, t.name, t.color, t.church_id,
    st.started_at, st.finished_at,
    coalesce(st.penalty_seconds, 0) as penalty_seconds,
    case when st.finished_at is not null
      then (extract(epoch from (st.finished_at - st.started_at)))::int + coalesce(st.penalty_seconds, 0) * 6
    end as duration_seconds,   -- tempo EFETIVO combinado (info + ordenação)
    count(p.step_id) as steps_done,
    (count(*) filter (where p.photo_review = 'rejected'))::int as rejected_photos,
    rank() over (
      order by
        (st.finished_at is null),                                   -- concluiu primeiro
        (case when st.finished_at is not null
          then (extract(epoch from (st.finished_at - st.started_at)))::int + coalesce(st.penalty_seconds, 0) * 6
        end) asc nulls last,                                        -- menor tempo efetivo (tempo + erros×6)
        (count(*) filter (where p.photo_review = 'rejected')) asc   -- desempate: menos fotos rejeitadas
    ) as rank_position
  from public.escape_team_state st
  join public.teams t on t.id = st.team_id
  left join public.escape_progress p on p.team_id = st.team_id
  group by t.id, t.name, t.color, t.church_id, st.started_at, st.finished_at, st.penalty_seconds
  order by
    (st.finished_at is null),
    (case when st.finished_at is not null
      then (extract(epoch from (st.finished_at - st.started_at)))::int + coalesce(st.penalty_seconds, 0) * 6
    end) asc nulls last,
    (count(*) filter (where p.photo_review = 'rejected')) asc;

grant select on public.escape_ranking to anon, authenticated;

-- Para VOLTAR ao critério por acerto (020), é só reaplicar a migration 020.
