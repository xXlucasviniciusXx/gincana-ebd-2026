-- ============================================================
-- 014 — Ranking do Escape por TEMPO (e fotos válidas)
-- ============================================================
-- Como quiz/enigma/cifra/imagem travam a passagem (so avanca quem
-- acerta), os pontos nao diferenciam quem conclui. O ranking passa a
-- ser:
--   1) quem CONCLUIU vem primeiro;
--   2) entre eles, quem tem MENOS fotos rejeitadas;
--   3) desempate pelo MENOR TEMPO de conclusao.
-- Inclui duration_seconds (tempo da equipe) e rejected_photos.
-- Idempotente.
-- ============================================================

-- A view antiga tinha colunas diferentes (net_points...); create or
-- replace nao permite renomear colunas, entao dropamos antes.
drop view if exists public.escape_ranking;

create view public.escape_ranking as
  select
    t.id,
    t.name,
    t.color,
    t.church_id,
    st.started_at,
    st.finished_at,
    case when st.finished_at is not null
      then (extract(epoch from (st.finished_at - st.started_at)))::int
    end as duration_seconds,
    count(p.step_id) as steps_done,
    (count(*) filter (where p.photo_review = 'rejected'))::int as rejected_photos,
    rank() over (
      order by
        (st.finished_at is null),                                   -- concluidos primeiro
        (count(*) filter (where p.photo_review = 'rejected')) asc,  -- menos fotos rejeitadas
        st.finished_at asc nulls last                               -- menor tempo (mais cedo)
    ) as rank_position
  from public.escape_team_state st
  join public.teams t on t.id = st.team_id
  left join public.escape_progress p on p.team_id = st.team_id
  group by t.id, t.name, t.color, t.church_id, st.started_at, st.finished_at
  order by
    (st.finished_at is null),
    (count(*) filter (where p.photo_review = 'rejected')) asc,
    st.finished_at asc nulls last;

grant select on public.escape_ranking to anon, authenticated;
