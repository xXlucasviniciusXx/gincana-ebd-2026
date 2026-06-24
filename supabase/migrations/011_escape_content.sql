-- ============================================================
-- 011 — Conteúdo do Escape Bíblico (Reino de Cristo) — 15 etapas
-- ============================================================
-- Carga de conteudo (NAO e schema). Reaplicar RESETA as etapas e,
-- por cascata, o progresso das equipes — rode apenas ANTES de abrir.
-- 15 desafios = 100 pts. Senha final: IDEAMOR.
--
-- Tipos: quiz (multipla escolha), riddle (resposta de texto:
-- enigmas, cifras, imagem-com-pista, QR), photo (upload da equipe).
--
-- >>> ATENCAO: 3 etapas dependem de IMAGEM que o ADMIN anexa depois
--     (no /admin/escape -> Etapas -> editar -> enviar imagem):
--       • Etapa 4  (resposta no NOME do arquivo) -> suba uma imagem
--         renomeada para EMANUEL antes do upload.
--       • Etapa 9  (palavra ESCONDIDA na imagem) -> suba uma imagem
--         com a palavra GRACA camuflada nos detalhes.
--       • Etapa 12 (QR CODE) -> gere um QR que contenha a palavra
--         DISCIPULO e suba como imagem.
--
-- Anti-IA: 2 fotos obrigatorias + cifra + QR + imagem; a peca Nº2
-- (AMOR) so sai ao enviar a foto, e a senha final exige TODAS as
-- etapas concluidas. Vale por tempo (ranking).
-- ============================================================

begin;

-- 0) Reset do progresso (limpa testes; MANTEM os codigos das equipes
--    em escape_team_codes e as configuracoes). Rodar antes do evento
--    deixa todas as equipes zeradas.
delete from public.escape_progress;
delete from public.escape_team_state;

-- 1) Configuracoes do jogo
update public.escape_settings set
  title = 'Escape Bíblico — Reino de Cristo',
  intro_text =
    'Bem-vindos ao **Escape Bíblico**! Tema: *Reino de Cristo, Comunhão e Evangelização*. '
    || 'São 15 desafios: quizzes, enigmas, **versículo criptografado**, **QR Code**, imagens com pistas escondidas e **fotos da equipe**. '
    || 'Colete as **peças do código** e descubra a senha secreta final. ⏱️ Vale por tempo: quem concluir primeiro sobe no ranking!',
  final_prompt =
    'Você coletou a **PEÇA Nº1** e a **PEÇA Nº2** do código ao longo do caminho. '
    || 'Junte as duas **na ordem** (Nº1 + Nº2), **sem espaços**, e digite o código secreto.',
  final_password = 'IDEAMOR',
  final_success_text =
    '*"Portanto ide, fazei discípulos de todas as nações."* — Mateus 28:19. '
    || 'Que a comunhão, o amor e a missão de Cristo continuem guiando a sua equipe! 🙌'
where id = (select id from public.escape_settings order by created_at limit 1);

-- 2) Reset e recria etapas
delete from public.escape_steps;

insert into public.escape_steps
  (order_number, title, type, prompt, options, answer, reward_clue, hint, points, is_active)
values
-- 1 quiz
(1, 'A missão da Igreja', 'quiz',
 $$Segundo a **Grande Comissão**, qual é a missão central da Igreja?$$,
 $$[{"id":"a","text":"Promover grandes eventos"},{"id":"b","text":"Anunciar prosperidade material"},{"id":"c","text":"Fazer discípulos de todas as nações"},{"id":"d","text":"Construir grandes templos"}]$$::jsonb,
 'c', $$📖 "Ide e fazei discípulos..." (Mt 28:19). A missão começa com um chamado ao movimento!$$,
 'Mateus 28:19-20', 5, true),

-- 2 enigma (PECA Nº1 = IDE)
(2, 'A ordem que move a Igreja', 'riddle',
 $$Complete a palavra que falta (Marcos 16:15): "______ por todo o mundo e pregai o evangelho a toda criatura."$$,
 null, 'IDE',
 $$🔑 PEÇA Nº1 DO CÓDIGO: **IDE**. Guarde bem — vai precisar dela no final!$$,
 'Verbo de 3 letras, no imperativo: a ordem de "ir".', 7, true),

-- 3 quiz (ref exata)
(3, 'Capítulo e versículo', 'quiz',
 $$Em qual **referência exata** está "Ide por todo o mundo e pregai o evangelho a toda criatura"?$$,
 $$[{"id":"a","text":"Mateus 28:19"},{"id":"b","text":"Marcos 16:15"},{"id":"c","text":"Atos 1:8"},{"id":"d","text":"Lucas 24:47"}]$$::jsonb,
 'b', $$Isso! Marcos 16:15. As outras também falam de missão — por isso a pegadinha. 🔎$$,
 'Não é o "Ide... batizando" (esse é Mateus).', 5, true),

-- 4 IMAGEM: resposta no nome do arquivo (admin sobe imagem "EMANUEL")
(4, 'A palavra escondida no arquivo', 'riddle',
 $$🔍 **Olhe a imagem abaixo com atenção.** Baixe ou amplie a figura: o **nome do arquivo** revela uma palavra (um nome de Jesus). Digite-a. (Ignore os caracteres aleatórios — procure o nome legível.)$$,
 null, 'EMANUEL',
 $$"E lhe chamarás EMANUEL: Deus conosco" (Mt 1:23). 🔎$$,
 'É um nome de Jesus que significa "Deus conosco".', 8, true),

-- 5 quiz (Atos 2:42 qual NAO)
(5, 'A Igreja Primitiva', 'quiz',
 $$Em **Atos 2:42**, os primeiros cristãos perseveravam em quatro coisas. Qual **NÃO** está na lista?$$,
 $$[{"id":"a","text":"Doutrina dos apóstolos"},{"id":"b","text":"Comunhão (koinonia)"},{"id":"c","text":"Partir do pão e orações"},{"id":"d","text":"Cobrança de impostos no templo"}]$$::jsonb,
 'd', $$A marca da Igreja era a **comunhão** — unidade e partilha. 🔎$$,
 'A pergunta pede o que NÃO faz parte.', 5, true),

-- 6 enigma cifra (-> COMUNHAO)
(6, 'Versículo criptografado', 'riddle',
 $$🔐 **Decifre:** cada letra foi *adiantada uma posição* no alfabeto (A→B, B→C...). Volte uma letra e descubra a palavra-chave da Igreja primitiva: **DPNVOIBP**$$,
 null, 'COMUNHAO',
 $$Comunhão! "Perseveravam na comunhão" (At 2:42). 🔎$$,
 'D volta para C, P volta para O... 8 letras, começa com C.', 7, true),

-- 7 FOTO (caca ao objeto)
(7, 'Caça ao tesouro: a Palavra', 'photo',
 $$📸 **Tarefa em equipe:** encontrem uma **Bíblia aberta no livro de ATOS** e enviem uma foto da equipe segurando-a!$$,
 null, null,
 $$Recebido! "Examinai as Escrituras" (Jo 5:39). Sigam em frente!$$,
 'Vale Bíblia física ou app — mas a equipe precisa aparecer.', 9, true),

-- 8 quiz (servo)
(8, 'O maior no Reino', 'quiz',
 $$Segundo Jesus em **Marcos 10:43-44**, quem é o **maior** no Reino de Deus?$$,
 $$[{"id":"a","text":"O mais sábio e estudado"},{"id":"b","text":"Aquele que serve a todos"},{"id":"c","text":"O líder mais antigo"},{"id":"d","text":"Quem tem mais seguidores"}]$$::jsonb,
 'b', $$"Quem quiser ser grande, será servo." No Reino, servir é reinar. 🔎$$,
 null, 5, true),

-- 9 IMAGEM: palavra escondida (admin sobe imagem com "GRACA" camuflada)
(9, 'A pista escondida na imagem', 'riddle',
 $$🔍 **Observe bem a imagem abaixo.** Há uma **palavra camuflada** nos detalhes (5 letras). Encontre-a e digite.$$,
 null, 'GRACA',
 $$Graça! "Pela graça sois salvos, por meio da fé" (Ef 2:8). 🔎$$,
 '5 letras. "Pela ____ sois salvos" (Efésios 2:8).', 8, true),

-- 10 enigma (primeiro martir)
(10, 'Fiéis até o fim', 'riddle',
 $$Enigma: fui o **primeiro mártir cristão**; apedrejado, vi os céus abertos e orei pelos que me matavam (Atos 7). Quem sou eu?$$,
 null, 'ESTEVAO',
 $$Estêvão — fiel até a morte. "Senhor, não lhes imputes este pecado" (At 7:60). 🔎$$,
 'Começa com E; um dos sete diáconos de Atos 6.', 7, true),

-- 11 quiz (Mt 18)
(11, 'Conflitos entre irmãos', 'quiz',
 $$Quando um irmão peca contra você, qual o **primeiro passo** que Jesus ensina em **Mateus 18:15**?$$,
 $$[{"id":"a","text":"Expor o problema publicamente"},{"id":"b","text":"Repreendê-lo a sós, entre você e ele"},{"id":"c","text":"Levar direto ao pastor"},{"id":"d","text":"Ignorar até passar"}]$$::jsonb,
 'b', $$Primeiro a sós: o objetivo é **ganhar o irmão**, não expor. 🔎$$,
 'Mateus 18:15 — "repreende-o entre ti e ele só".', 5, true),

-- 12 IMAGEM: QR Code (admin gera QR contendo "DISCIPULO")
(12, 'O QR Code secreto', 'riddle',
 $$🔳 **Escaneie o QR Code abaixo** com a câmera do celular. Ele revela uma palavra — o que Jesus nos chama a formar (Mt 28:19). Digite-a (singular).$$,
 null, 'DISCIPULO',
 $$Discípulo! "Fazei discípulos de todas as nações" (Mt 28:19). 🔎$$,
 'No singular, 9 letras. "Fazei ____s de todas as nações."', 8, true),

-- 13 enigma (boa terra)
(13, 'A boa terra', 'riddle',
 $$Enigma (Parábola do Semeador — Lucas 8:15): a **boa terra** representa quem ouve a Palavra e a ______ (uma palavra). Qual é?$$,
 null, 'PRATICA',
 $$Pratica! "Ouvem a palavra, retêm-na e dão fruto" (Lc 8:15). 🔎$$,
 'Não basta ouvir; é preciso ____-la. 7 letras.', 7, true),

-- 14 quiz (recompensa)
(14, 'A recompensa dos fiéis', 'quiz',
 $$Qual a recompensa prometida aos que **permanecem fiéis até o fim** (Mt 24:13; Ap 2:10)?$$,
 $$[{"id":"a","text":"Prosperidade nesta vida"},{"id":"b","text":"Fama e reconhecimento"},{"id":"c","text":"A vida eterna (a coroa da vida)"},{"id":"d","text":"Poder e autoridade"}]$$::jsonb,
 'c', $$Vida eterna! Você já tem as DUAS peças do código? 🏁$$,
 null, 5, true),

-- 15 FOTO (PECA Nº2 = AMOR)
(15, 'O fundamento do Reino', 'photo',
 $$📸 **Tarefa final em equipe:** o Reino se sustenta no **AMOR**. Tirem uma foto de **toda a equipe junta formando um coração** e enviem.$$,
 null, null,
 $$🔑 PEÇA Nº2 DO CÓDIGO: **AMOR**. "Amai-vos uns aos outros" (Jo 13:34). Agora vá à senha final!$$,
 'Todos da equipe precisam aparecer.', 9, true);

-- 3) Imagens (ja enviadas ao Storage escape/images/) — etapas 4, 9 e 12
update public.escape_steps set image_url =
  'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/EMANUEL.png'
  where order_number = 4;
update public.escape_steps set image_url =
  'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/oculta.png'
  where order_number = 9;
update public.escape_steps set image_url =
  'https://dmvqnqjctlgxeacdnkoq.supabase.co/storage/v1/object/public/gincana/escape/images/qr.png'
  where order_number = 12;

commit;
