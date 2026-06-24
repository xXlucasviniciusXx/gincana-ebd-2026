-- ============================================================
-- 015 — Renumera as etapas do Escape (corrige order_number duplicado)
-- ============================================================
-- A edicao manual deixou duas etapas com order_number = 0, o que
-- empata a ordenacao e faz as setas ▲▼ do admin (que TROCAM valores)
-- nao terem efeito. Aqui reatribuimos 1..N unicos, preservando a
-- sequencia atual (desempate por titulo). Idempotente.
-- ============================================================

with ordered as (
  select id,
         row_number() over (order by order_number asc, title asc) as rn
  from public.escape_steps
)
update public.escape_steps s
set order_number = o.rn
from ordered o
where o.id = s.id;
