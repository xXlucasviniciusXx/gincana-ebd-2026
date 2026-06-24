-- ============================================================
-- 019 — Imagens mais dificeis (etapas 4, 11, 13)
-- ============================================================
-- Sobe novas imagens (nomes novos pois o anon nao sobrescreve):
--   etapa 4  -> quem-e-ele-EMANUEL.png  (so o nome do arquivo revela)
--   etapa 11 -> oculta2.png             (caca-palavra denso, GRACA escondida)
--   etapa 13 -> ceia-qr.png             (QR dentro da obra A Ultima Ceia)
-- Tambem ajusta enunciado/dica da etapa 4 (nao entrega mais a palavra)
-- e o enunciado da 13 (procurar o QR na arte). Idempotente.
-- ============================================================

begin;

update public.escape_steps set
  image_url = 'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/quem-e-ele-EMANUEL.png',
  prompt = $$🔍 **Baixe ou abra esta imagem** e leia o **nome do arquivo** — é nele que está escondida a palavra secreta. (No celular: segure a imagem → "abrir/baixar imagem".) Depois digite a palavra.$$,
  hint = $$É um nome de Jesus que significa "Deus conosco".$$
  where title ilike '%no arquivo%';

update public.escape_steps set
  image_url = 'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/oculta2.png'
  where title ilike '%escondida na imagem%';

update public.escape_steps set
  image_url = 'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/ceia-qr.png',
  prompt = $$🖼️ Há um **QR Code escondido nesta obra** (*A Última Ceia*). Encontre-o, **escaneie com a câmera** e digite a palavra revelada — o que Jesus nos chama a formar (Mt 28:19, no singular).$$
  where title ilike '%QR Code%';

commit;
