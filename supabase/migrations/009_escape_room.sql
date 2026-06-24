-- ============================================================
-- 009 — Escape Bíblico Online
-- ============================================================
-- Modelo de seguranca (SPA estatico, sem backend):
--   - As RESPOSTAS, PISTAS e a SENHA FINAL ficam em tabelas SEM
--     leitura para anon (RLS bloqueia).
--   - O participante so interage via FUNCOES RPC `security definer`,
--     que rodam no banco, validam e devolvem apenas o veredito +
--     a recompensa. As respostas nunca chegam ao navegador.
--   - Views "_public" expoem apenas colunas nao-secretas ao anon,
--     com trava de horario no servidor.
--   - Identidade: codigo unico por equipe (escape_team_codes),
--     validado no servidor. Login anonimo do Supabase roda por baixo
--     so para liberar o upload de fotos (Storage exige authenticated).
-- Idempotente: pode ser reaplicada.
-- ============================================================

create extension if not exists unaccent;

-- Normalizacao de texto para comparar respostas (minusculo, sem
-- acento, sem espacos nas pontas e espacos internos colapsados).
create or replace function public.escape_norm(p text)
returns text language sql immutable as $$
  select regexp_replace(trim(lower(unaccent(coalesce(p, '')))), '\s+', ' ', 'g');
$$;

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------

-- Configuracao singleton do jogo
create table if not exists public.escape_settings (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Escape Bíblico',
  intro_text text,
  is_published boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  final_prompt text,
  final_password text,          -- SEGREDO (exposto so via RPC)
  final_success_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Etapas / desafios
create table if not exists public.escape_steps (
  id uuid primary key default gen_random_uuid(),
  order_number int not null default 0,
  title text not null,
  prompt text,                  -- rich text (descricao do desafio)
  type text not null default 'quiz'
    check (type in ('quiz', 'riddle', 'photo')),
  image_url text,
  options jsonb,                -- quiz: [{ "id": "a", "text": "..." }]
  answer text,                  -- SEGREDO (quiz: id da opcao; riddle: texto)
  reward_clue text,             -- SEGREDO (pista entregue ao acertar)
  hint text,                    -- dica publica (opcional)
  points int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists escape_steps_order_idx
  on public.escape_steps(order_number);

-- Codigo secreto por equipe (gerado no admin, enviado aos lideres)
create table if not exists public.escape_team_codes (
  team_id uuid primary key references public.teams(id) on delete cascade,
  code text not null unique,    -- SEGREDO (validado so via RPC)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Estado da equipe no jogo (uma linha por equipe que iniciou)
create table if not exists public.escape_team_state (
  team_id uuid primary key references public.teams(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Progresso: uma linha por (equipe, etapa) concluida
create table if not exists public.escape_progress (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  step_id uuid not null references public.escape_steps(id) on delete cascade,
  points_awarded int not null default 0,
  penalty_points int not null default 0,   -- aplicado ao rejeitar foto
  photo_url text,
  photo_review text not null default 'none'
    check (photo_review in ('none', 'pending', 'approved', 'rejected')),
  completed_at timestamptz not null default now(),
  unique (team_id, step_id)
);
create index if not exists escape_progress_team_idx
  on public.escape_progress(team_id);

-- ------------------------------------------------------------
-- RLS: tudo authenticated-only (admin). Anon so via views/RPC.
-- ------------------------------------------------------------
alter table public.escape_settings    enable row level security;
alter table public.escape_steps        enable row level security;
alter table public.escape_team_codes   enable row level security;
alter table public.escape_team_state   enable row level security;
alter table public.escape_progress      enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'escape_settings','escape_steps','escape_team_codes',
    'escape_team_state','escape_progress'
  ])
  loop
    execute format('drop policy if exists "%s_rw_auth" on public.%I', t, t);
    execute format(
      'create policy "%s_rw_auth" on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- Views publicas (somente colunas nao-secretas) + trava de horario
-- ------------------------------------------------------------

-- Settings: liberado sempre (a contagem regressiva precisa de opens_at)
create or replace view public.escape_settings_public as
  select id, title, intro_text, is_published, opens_at, closes_at,
         final_prompt, final_success_text
  from public.escape_settings;

-- Helper: o jogo esta aberto agora?
create or replace function public.escape_is_open()
returns boolean language sql stable as $$
  select coalesce(bool_or(
    is_published
    and (opens_at is null or now() >= opens_at)
    and (closes_at is null or now() <= closes_at)
  ), false)
  from public.escape_settings;
$$;

-- Etapas: SO aparecem quando o jogo esta aberto (gate no servidor)
create or replace view public.escape_steps_public as
  select id, order_number, title, prompt, type, image_url, options,
         hint, points
  from public.escape_steps
  where is_active = true and public.escape_is_open();

-- Ranking proprio do Escape (publico)
create or replace view public.escape_ranking as
  select
    t.id,
    t.name,
    t.color,
    t.church_id,
    coalesce(sum(p.points_awarded), 0) - coalesce(sum(p.penalty_points), 0) as net_points,
    count(p.step_id) as steps_done,
    st.finished_at,
    rank() over (
      order by
        (coalesce(sum(p.points_awarded), 0) - coalesce(sum(p.penalty_points), 0)) desc,
        st.finished_at asc nulls last
    ) as rank_position
  from public.escape_team_state st
  join public.teams t on t.id = st.team_id
  left join public.escape_progress p on p.team_id = st.team_id
  group by t.id, t.name, t.color, t.church_id, st.finished_at
  order by net_points desc, st.finished_at asc nulls last;

grant select on public.escape_settings_public to anon, authenticated;
grant select on public.escape_steps_public to anon, authenticated;
grant select on public.escape_ranking to anon, authenticated;

-- ------------------------------------------------------------
-- RPCs (security definer) — unica porta de entrada do participante
-- ------------------------------------------------------------

-- Resolve a equipe a partir do codigo (interno)
create or replace function public.escape_team_of(p_code text)
returns uuid language sql security definer set search_path = public as $$
  select team_id from public.escape_team_codes
  where code = p_code and is_active = true;
$$;

-- Login: valida codigo, garante estado e devolve dados da equipe
create or replace function public.escape_login(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team teams%rowtype;
begin
  select t.* into v_team
  from public.escape_team_codes c
  join public.teams t on t.id = c.team_id
  where c.code = p_code and c.is_active = true;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.escape_team_state (team_id)
  values (v_team.id)
  on conflict (team_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'team_id', v_team.id,
    'team_name', v_team.name,
    'color', v_team.color
  );
end;
$$;

-- Estado/retomada: etapas concluidas + pistas (so para a propria equipe)
create or replace function public.escape_state(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_steps jsonb;
  v_state escape_team_state%rowtype;
begin
  v_team := public.escape_team_of(p_code);
  if v_team is null then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_state from public.escape_team_state where team_id = v_team;

  select coalesce(jsonb_agg(jsonb_build_object(
           'step_id', p.step_id,
           'points_awarded', p.points_awarded,
           'penalty_points', p.penalty_points,
           'clue', s.reward_clue,
           'photo_url', p.photo_url,
           'photo_review', p.photo_review
         ) order by s.order_number), '[]'::jsonb)
  into v_steps
  from public.escape_progress p
  join public.escape_steps s on s.id = p.step_id
  where p.team_id = v_team;

  return jsonb_build_object(
    'ok', true,
    'team_id', v_team,
    'finished_at', v_state.finished_at,
    'is_open', public.escape_is_open(),
    'steps', v_steps
  );
end;
$$;

-- Verifica resposta de quiz/enigma
create or replace function public.escape_answer(
  p_code text, p_step_id uuid, p_attempt text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_step escape_steps%rowtype;
  v_ok boolean;
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

  v_ok := public.escape_norm(p_attempt) = public.escape_norm(v_step.answer);

  if not v_ok then
    return jsonb_build_object('ok', true, 'correct', false);
  end if;

  insert into public.escape_progress (team_id, step_id, points_awarded)
  values (v_team, v_step.id, v_step.points)
  on conflict (team_id, step_id) do nothing;

  return jsonb_build_object(
    'ok', true, 'correct', true,
    'clue', v_step.reward_clue, 'points', v_step.points
  );
end;
$$;

-- Envia foto (aceite automatico: pista sai na hora, fica 'pending')
create or replace function public.escape_submit_photo(
  p_code text, p_step_id uuid, p_url text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_step escape_steps%rowtype;
begin
  v_team := public.escape_team_of(p_code);
  if v_team is null then
    return jsonb_build_object('ok', false, 'reason', 'auth');
  end if;
  if not public.escape_is_open() then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  select * into v_step from public.escape_steps
  where id = p_step_id and is_active = true and type = 'photo';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_step');
  end if;

  insert into public.escape_progress
    (team_id, step_id, points_awarded, photo_url, photo_review)
  values (v_team, v_step.id, v_step.points, p_url, 'pending')
  on conflict (team_id, step_id) do update
    set photo_url = excluded.photo_url,
        photo_review = 'pending',
        points_awarded = v_step.points,
        penalty_points = 0,
        completed_at = now();

  return jsonb_build_object(
    'ok', true, 'clue', v_step.reward_clue, 'points', v_step.points
  );
end;
$$;

-- Senha final: exige todas as etapas ativas concluidas + senha correta
create or replace function public.escape_check_final(
  p_code text, p_attempt text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_total int;
  v_done int;
  v_password text;
  v_success text;
begin
  v_team := public.escape_team_of(p_code);
  if v_team is null then
    return jsonb_build_object('ok', false, 'reason', 'auth');
  end if;
  if not public.escape_is_open() then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  select count(*) into v_total from public.escape_steps where is_active = true;
  select count(*) into v_done from public.escape_progress where team_id = v_team;
  if v_done < v_total then
    return jsonb_build_object('ok', true, 'correct', false, 'reason', 'incomplete');
  end if;

  select final_password, final_success_text into v_password, v_success
  from public.escape_settings order by created_at limit 1;

  if public.escape_norm(p_attempt) <> public.escape_norm(v_password) then
    return jsonb_build_object('ok', true, 'correct', false);
  end if;

  update public.escape_team_state
    set finished_at = coalesce(finished_at, now())
  where team_id = v_team;

  return jsonb_build_object('ok', true, 'correct', true, 'success_text', v_success);
end;
$$;

grant execute on function public.escape_login(text) to anon, authenticated;
grant execute on function public.escape_state(text) to anon, authenticated;
grant execute on function public.escape_answer(text, uuid, text) to anon, authenticated;
grant execute on function public.escape_submit_photo(text, uuid, text) to anon, authenticated;
grant execute on function public.escape_check_final(text, text) to anon, authenticated;
-- escape_team_of fica interno (sem grant ao anon): so e chamada de dentro
-- das outras funcoes security definer.

-- ------------------------------------------------------------
-- Storage: permitir upload anonimo APENAS na pasta escape/uploads/
-- (login anonimo do Supabase => role authenticated ja cobre, mas
--  garantimos a pasta dedicada para nao misturar com o admin)
-- ------------------------------------------------------------
drop policy if exists "gincana_escape_insert" on storage.objects;
create policy "gincana_escape_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gincana' and (storage.foldername(name))[1] = 'escape');

-- ------------------------------------------------------------
-- Triggers updated_at
-- ------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array['escape_settings','escape_steps'])
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- Realtime (monitor admin + ranking ao vivo)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array['escape_progress','escape_team_state','escape_settings'])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- Seed: linha singleton de configuracao
-- ------------------------------------------------------------
insert into public.escape_settings (title, is_published)
select 'Escape Bíblico', false
where not exists (select 1 from public.escape_settings);
