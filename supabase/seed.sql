-- Seed inicial — ajustar antes de rodar em produção
-- Executar APÓS rodar 001_initial_schema.sql e 002_rls_policies.sql

insert into public.competition_settings (competition_name, theme, status)
values ('Gincana EBD 2026', 'Tema da Gincana', 'open')
on conflict do nothing;

insert into public.teams (name, color, leader_name, bible_reference, theme_verse, war_cry)
values
  ('Equipe Azul',     '#1e40af', 'Líder Azul',     'Salmos 23',      '...', 'Azul vence!'),
  ('Equipe Vermelha', '#b91c1c', 'Líder Vermelha', 'Mateus 5',       '...', 'Vermelha unida!'),
  ('Equipe Verde',    '#15803d', 'Líder Verde',    'Filipenses 4:13','...', 'Verde firme!'),
  ('Equipe Amarela',  '#a16207', 'Líder Amarela',  'Romanos 8:28',   '...', 'Amarela brilha!')
on conflict do nothing;

insert into public.weeks (name, description, order_number, is_active)
values
  ('Semana 1', 'Abertura da gincana', 1, true),
  ('Semana 2', 'Atividades de equipe', 2, true),
  ('Semana 3', 'Atividades bíblicas',  3, true),
  ('Semana 4', 'Encerramento',         4, true)
on conflict do nothing;
