-- ============================================================
-- 013 — Correções pós-edição do conteúdo
-- ============================================================
-- 1) Religa as imagens (os arquivos continuam no Storage; as etapas
--    perderam o image_url). Casamos por TITULO (robusto a mudanca de
--    ordem). Ajuste os ilike se voce renomeou os titulos.
-- 2) Padroniza as 3 pecas do codigo e grava a senha final nova.
-- Idempotente.
-- ============================================================

begin;

-- 1) Religar imagens por titulo
update public.escape_steps
  set image_url = 'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/EMANUEL.png'
  where title ilike '%no arquivo%';

update public.escape_steps
  set image_url = 'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/oculta.png'
  where title ilike '%escondida na imagem%';

update public.escape_steps
  set image_url = 'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/qr.png'
  where title ilike '%QR Code%';

-- 2) Pecas do codigo (clues numeradas, na ordem da senha) + senha final
update public.escape_steps
  set reward_clue = $$🔑 PEÇA Nº1 DO CÓDIGO: IDE$$
  where title ilike '%ordem que move%';

update public.escape_steps
  set reward_clue = $$🔑 PEÇA Nº2 DO CÓDIGO: HONRA$$
  where title ilike '%HONRANDO%';

update public.escape_steps
  set reward_clue = $$🔑 PEÇA Nº3 DO CÓDIGO: AMOR$$
  where title ilike '%fundamento do Reino%';

update public.escape_settings set
  final_password = 'IDEHONRAAMOR',
  final_prompt = $$Você coletou 3 PEÇAS do código: Nº1, Nº2 e Nº3. Junte-as na ordem, sem espaços, e digite a senha secreta final.$$
  where id = (select id from public.escape_settings order by created_at limit 1);

commit;

-- ATENCAO:
--  • A etapa "A ordem que move a Igreja" (riddle) deve ter answer = IDE.
--  • As etapas HONRA e AMOR sao do tipo 'photo' (sem answer; a foto
--    libera a peca). Confirme no admin.
--  • Conferir a ORDEM: ha duas etapas com order_number 0 — ajuste no
--    admin (botoes ▲▼) para a sequencia desejada.
