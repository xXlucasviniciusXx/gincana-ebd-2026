-- ============================================================
-- 020 — Ranking do Escape por ACERTO (não por tempo)
-- ============================================================
-- Como as equipes levam DIAS (com longas pausas), o tempo efetivo
-- deixou de medir habilidade (med-se tempo parado). O criterio passa a
-- ser ACERTO:
--   1) quem concluiu primeiro;
--   2) MENOS penalidade (erros + dicas) — fator principal;
--   3) menos fotos rejeitadas;
--   4) desempate: quem concluiu antes.
-- duration_seconds (tempo + penalidade) fica como info, mas nao ordena.
-- Idempotente.
-- ============================================================

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
        coalesce(st.penalty_seconds, 0) asc,
        (count(*) filter (where p.photo_review = 'rejected')) asc,
        st.finished_at asc nulls last
    ) as rank_position
  from public.escape_team_state st
  join public.teams t on t.id = st.team_id
  left join public.escape_progress p on p.team_id = st.team_id
  group by t.id, t.name, t.color, t.church_id, st.started_at, st.finished_at, st.penalty_seconds
  order by
    (st.finished_at is null),
    coalesce(st.penalty_seconds, 0) asc,
    (count(*) filter (where p.photo_review = 'rejected')) asc,
    st.finished_at asc nulls last;

grant select on public.escape_ranking to anon, authenticated;
