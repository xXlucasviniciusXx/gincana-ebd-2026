# Gincana EBD 2026

Aplicação web para gerenciar a gincana da EBD: ranking público em tempo real, página de equipes, página da campeã e área administrativa para CRUD de equipes, integrantes, semanas, atividades e pontuações.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- React Router v6
- Supabase (PostgreSQL + Auth)

## Estrutura

```
src/
├── lib/
│   ├── supabase.ts          # cliente Supabase tipado
│   └── database.types.ts    # tipos das tabelas e da view
├── services/                # camada de acesso a dados (desacoplada da UI)
│   ├── teams.service.ts
│   ├── members.service.ts
│   ├── weeks.service.ts
│   ├── activities.service.ts
│   ├── scores.service.ts
│   ├── ranking.service.ts
│   └── competition.service.ts
├── contexts/AuthContext.tsx
├── components/              # layouts e rotas protegidas
├── pages/                   # páginas públicas
│   └── admin/               # páginas administrativas
└── App.tsx                  # rotas

supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_rls_policies.sql
└── seed.sql                 # dados iniciais (exemplo)
```

## Configuração

### 1. Criar projeto no Supabase

1. Acesse https://supabase.com e crie um novo projeto.
2. Em **Project Settings → API**, copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha as duas variáveis.

### 3. Aplicar o schema

No painel do Supabase, vá em **SQL Editor → New query** e execute, nesta ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_team_profiles_and_storage.sql` — adiciona bio/instagram/foto/banner nas equipes, foto nos integrantes, encerramento de semana e cria o bucket `gincana` no Storage com policies prontas para upload de imagens.
4. `supabase/migrations/004_team_gallery.sql` — cria a tabela `team_gallery` (galeria pública de fotos por equipe) com RLS.
5. (opcional) `supabase/seed.sql` para popular com equipes de exemplo

### 4. Criar usuário administrador

Em **Authentication → Users → Add user**, crie o e-mail e senha do admin. Esse usuário poderá fazer login em `/admin/login`.

> Como as policies de escrita liberam tudo para usuários `authenticated`, qualquer login válido é tratado como admin. Se quiser restringir, ajuste as policies em `002_rls_policies.sql` para filtrar por `auth.uid()` ou por uma claim/role.

### 5. Rodar localmente

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`.

## Rotas

| Rota                        | Acesso       | O que faz                                                  |
| --------------------------- | ------------ | ---------------------------------------------------------- |
| `/`                         | público      | Ranking ao vivo com Top 3 animado e podium                 |
| `/equipes`                  | público      | Grid de perfis de equipe com banner, foto, líder e pontos  |
| `/equipes/:teamId`          | público      | Perfil da equipe (bio, integrantes, histórico, instagram)  |
| `/campea`                   | público      | Campeã com confetti / empate / "gincana em andamento"      |
| `/admin/login`              | público      | Login do administrador                                     |
| `/admin`                    | autenticado  | Painel com KPIs + encerrar/reabrir gincana                 |
| `/admin/equipes`            | autenticado  | CRUD de equipes com perfil estendido                       |
| `/admin/integrantes`        | autenticado  | CRUD de integrantes + foto                                 |
| `/admin/semanas`            | autenticado  | CRUD de semanas + encerrar/reabrir semana                  |
| `/admin/atividades`         | autenticado  | CRUD de atividades                                         |
| `/admin/pontuacoes`         | autenticado  | Lançamento de pontuações (linha a linha)                   |
| `/admin/lancamento-rapido`  | autenticado  | Lançar todas as atividades de uma semana em lote           |

## Regras de negócio

- A pontuação total da equipe é a **soma** das linhas em `scores` (calculada na view `team_rankings`).
- O ranking é gerado dinamicamente — nunca persistido.
- Cada par `(team_id, activity_id)` é único: relançar substitui o valor anterior.
- Ao encerrar a gincana:
  - Se houver um único líder, ele vira `champion_team_id`.
  - Se houver empate no primeiro lugar, `has_tie = true` e `champion_team_id` fica nulo. Cadastre uma atividade do tipo `tiebreaker` e lance pontos.
- Ao reabrir, o estado de campeã e empate é limpo e os lançamentos voltam a ser livres.

## Scripts

```bash
npm run dev       # vite dev server
npm run build     # tsc + vite build (gera dist/)
npm run preview   # serve dist/ localmente
npm run lint      # checagem de tipos (tsc --noEmit)
```

## Migração futura

Toda escrita/leitura passa pela pasta `src/services/` — os componentes nunca falam direto com o Supabase. Para migrar para outro backend (REST próprio, Prisma + PostgreSQL, etc.), basta reescrever os services mantendo a mesma assinatura.
