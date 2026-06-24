-- ============================================================
-- 016 — Ordem narrativa das etapas + desativa etapa incompleta
-- ============================================================
-- Substitui o 015. Define a ordem por sentido (missao -> comunhao ->
-- discipulado -> fidelidade -> amor), mantendo as pecas do codigo na
-- ordem da senha: IDE (2) < HONRA (9) < AMOR (16) = IDEHONRAAMOR.
-- A etapa "DESAFIO DE CRIPTOGRAFIA BIBLICA" esta com enunciado vazio
-- (so o titulo) -> desativada para nao travar o jogo. Preencha o
-- enunciado/resposta/pista no admin e reative quando quiser.
-- Idempotente.
-- ============================================================

begin;
update public.escape_steps set order_number=1  where title ilike '%miss%';
update public.escape_steps set order_number=2  where title ilike '%ordem que move%';
update public.escape_steps set order_number=3  where title ilike '%tulo e vers%';
update public.escape_steps set order_number=4  where title ilike '%no arquivo%';
update public.escape_steps set order_number=5  where title ilike '%Primitiva%';
update public.escape_steps set order_number=6  where title ilike '%criptografado%';
update public.escape_steps set order_number=7  where title ilike '%tesouro%';
update public.escape_steps set order_number=8  where title ilike '%maior no Reino%';
update public.escape_steps set order_number=9  where title ilike '%HONRANDO%';
update public.escape_steps set order_number=10 where title ilike '%Conflitos%';
update public.escape_steps set order_number=11 where title ilike '%escondida na imagem%';
update public.escape_steps set order_number=12 where title ilike '%o fim%';
update public.escape_steps set order_number=13 where title ilike '%QR Code%';
update public.escape_steps set order_number=14 where title ilike '%boa terra%';
update public.escape_steps set order_number=15 where title ilike '%recompensa%';
update public.escape_steps set order_number=16 where title ilike '%fundamento%';
update public.escape_steps set is_active=false, order_number=99 where title ilike '%DESAFIO DE CRIPTOGRAFIA%';
commit;
