# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node is at `C:\Program Files\nodejs` and is NOT on the system PATH by default. Prefix all npm/node commands in PowerShell:

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"; npm run dev
$env:PATH = "C:\Program Files\nodejs;$env:PATH"; npm run build
$env:PATH = "C:\Program Files\nodejs;$env:PATH"; npm run lint   # runs tsc --noEmit
```

**Before pushing, always run the full `npm run build` (`tsc -b && vite build`).** It is STRICTER than `npm run lint` (`tsc --noEmit`) and matches what Vercel runs — a type error can pass lint but break the Vercel deploy.

The dev server uses the preview tool via `.claude/launch.json` (config: `gincana-dev`, port 5173).  
**Never** run `npm run dev` as a background Bash process — use `preview_start` instead.

SQL migrations are applied manually by the user in the Supabase SQL Editor — never automate this (only the anon key is available locally; it cannot run DDL). Provide copy-paste SQL.

## Architecture

### Stack
React 18 + Vite + TypeScript + Tailwind CSS + React Router v6. Backend is 100% Supabase (Postgres + Auth + Storage + Realtime). Deployed as a static SPA on Vercel — no serverless functions, so Vercel logs are empty for this app.

### Data flow rule
**Components never call Supabase directly.** All DB access goes through `src/services/*.service.ts`. This is the single most important convention. Each service file maps to one or two DB tables.

### `src/lib/`
- `supabase.ts` — typed client (`createClient<Database>`); requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `database.types.ts` — hand-maintained type file (not auto-generated). Add new table types here whenever a new migration is created
- `sounds.ts` — Web Audio API synth sounds. Regular sounds respect the `gincana:sounds_enabled` localStorage toggle. Celebration music (`startCelebrationMusic`) bypasses the toggle since it requires explicit user click

### Routing (`src/App.tsx`)
Two layout trees:
- `PublicLayout` → public pages (`/`, `/equipes`, `/semanas`, `/campea`, `/novidades`, `/escape`)
- `AdminLayout` behind `ProtectedRoute` → `/admin/**` (Painel, Igrejas, Equipes, Integrantes, Semanas, Atividades, Pontuações, Lançamento rápido, Galeria, **Escape Bíblico**, Avisos, Configurações)

`ProtectedRoute` reads `AuthContext` (Supabase session). Any authenticated Supabase user is treated as admin — there are no roles. Public pages run as the `anon` role (no login).

### Realtime
`useRealtimeTable(table, callback)` in `src/hooks/useRealtimeTable.ts` subscribes to `postgres_changes` for a table. Uses a `cbRef` pattern to keep the callback up-to-date without re-subscribing. Channel names include `Math.random()` to avoid conflicts. Tables in the Realtime publication: `scores`, `events`, `team_badges`, `competition_settings`, `weeks`, `announcements`, `escape_progress`, `escape_team_state`, `escape_settings`.

### Ranking
`team_rankings` is a **Postgres view** (not a table). It does a `LEFT JOIN scores ON team_id` + `GROUP BY` + `RANK() OVER`. It is never written to — always computed on the fly. First call after DB inactivity (free tier cold-start) can take ~800ms; subsequent calls are ~200ms.

### Badge system (`badges.service.ts`)
`recalculate()` implements "current truth" reconciliation: builds a complete desired set of badges, compares with DB state, then inserts new ones and deletes stale ones in bulk. Badge codes for contextual badges (weekly leader, max score) embed the context ID: `weekly_leader:<week_id>`, `max_score:<activity_id>`. Tiebreaker cascade: total points → most max-scores → most activities → highest single score → unresolved.

### Competition lifecycle (`competition.service.ts`)
`competition_settings` is a singleton row. `close()` auto-detects tie vs. single winner. When closed, `badgesService.recalculate()` is fired and forgotten (`.catch(() => {})`). `resolveTiebreaker()` allows manual winner selection.

### Rich text rendering
`src/components/RichText.tsx` renders stored text with `whitespace-pre-line` for line breaks and inline `**bold**` / `*italic*` parsing. Use this component (not a plain `<p>`) wherever user-authored descriptions are displayed.

### Storage
Supabase Storage bucket: `gincana`. Path convention: `activities/photos/`, `members/photos/`, `teams/photos/`, `teams/banners/`, `gallery/<teamId>/`, `churches/logos/`, `escape/images/` (admin step images), `escape/uploads/` (participant photos), `escape/fire.gif`. `src/services/storage.service.ts` handles upload (folder allow-list in the `UploadFolder` type); `src/components/ImageUpload.tsx` is the reusable upload UI. Upload/update/delete are `authenticated`-only **except** the `escape/` folder, which also allows `anon` INSERT (participants are not logged in). The anon key cannot delete/overwrite — Storage cleanup is manual in the dashboard.

### CSS conventions
- Design tokens are in `tailwind.config.js` under `theme.extend.colors.brand` (navy, teal, yellow, orange, red, cream)
- Component utility classes (`.card`, `.btn`, `.input`, `.badge`, `.heading-display`) are defined in `src/index.css` via `@layer components`
- Font: Fredoka for display (`.heading-display`), Inter for body

### Churches (igrejas)
Teams belong to a church via `teams.church_id` (mandatory in the admin form). `/admin/igrejas` (`churches.service.ts`) is the CRUD; churches have name, city, color, logo. The public RankingPage has a **"Por igreja"** tab that groups teams by `church_id` and ranks them **within each church** (own podium per church) — computed client-side from `teams` + `team_rankings` + `churches`, NOT an aggregate view. (Migration 008 also created a `church_rankings` aggregate view, but it is unused — the per-church team grouping replaced it.)

### Escape Bíblico (`/escape`)
A standalone, multi-step puzzle game (migrations 009–019). **This is the most security-sensitive subsystem — read this before touching it.**

- **Routes:** `/escape` (public player, `EscapePlayPage.tsx`), `/admin/escape` (`admin/EscapePage.tsx` — Configurações/Etapas/Códigos/Monitor tabs).
- **Security model (no backend!):** secrets — step `answer`, `reward_clue`, `final_password`, team `code` — live in tables with **NO anon SELECT policy**. Participants are pure `anon` (NO login; the Supabase "anonymous sign-ins" toggle MUST stay OFF, otherwise anon becomes `authenticated` and the `to authenticated using(true)` write policies would expose everything). All gameplay goes through **`SECURITY DEFINER` RPCs**: `escape_login`, `escape_state`, `escape_answer`, `escape_submit_photo`, `escape_check_final`, `escape_use_hint` (+ internal `escape_team_of`, and `escape_is_open` which **must be SECURITY DEFINER** so the public views can evaluate it as `anon`). Non-secret data is exposed via views granted to anon: `escape_steps_public` (filtered by `escape_is_open()`), `escape_settings_public`, `escape_ranking`.
- **Identity / progress:** a per-team secret **code** (`escape_team_codes`, admin-generated) is validated server-side; progress is keyed by team (`escape_progress`, `escape_team_state`), so a team resumes on any device by re-entering the code.
- **Services:** `escape.service.ts` (admin — reads full tables incl. secrets; needs auth) and `escapePlay.service.ts` (participant — wraps the RPCs + public-view reads).
- **Ranking (`escape_ranking` view):** by **accuracy**, not time (migration 020 — wall-clock is meaningless when teams play across days with long idle gaps). Lexicographic order: finished first → **lowest `penalty_seconds`** (fewest errors+hints) → fewest `rejected_photos` → earliest `finished_at` (tiebreak only). Penalties accumulate in `escape_team_state.penalty_seconds`: **+`wrong_penalty_seconds` (default 30 min) per wrong answer**, **+`hint_penalty_seconds` (default 15 min) per hint** (both configurable in admin Configurações). `duration_seconds` is still computed (elapsed + penalty) as info but no longer drives the order. Quiz/enigma steps gate progression (must be correct to advance); photo steps auto-accept (clue on upload) and are admin-reviewed — rejecting sets `photo_review='rejected'` (a ranking demerit). Image-puzzle types (answer in the filename, hidden word, QR) are just `riddle` steps with an `image_url`.
- **Flames effect:** `src/components/Flames.tsx` overlays an animated fire GIF (Storage `escape/fire.gif`, Nevit, CC BY-SA 3.0 — keep the credit) at the bottom of every public page **while the escape is open**; rendered from `PublicLayout` (which polls `escape_settings_public`). `?flames=1` forces a preview.
- **Resetting for an event:** run `delete from public.escape_progress; delete from public.escape_team_state;`. **Do NOT re-run the content migration (011)** after steps were edited in the admin — it deletes and recreates the original steps, wiping edits.

### Migrations
Numbered sequentially in `supabase/migrations/`. Each file is idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.). RLS pattern: public SELECT for `anon + authenticated`, write only for `authenticated`. Every new table needs: RLS enabled, select policy, write policy, Realtime added (via `supabase_realtime` publication in `006_enable_realtime.sql`), and a type entry in `database.types.ts`. **Exception:** tables holding secrets (the `escape_*` tables) have NO anon policy at all — they are `authenticated`-only, and anon reaches the safe subset through `_public` views + `SECURITY DEFINER` RPCs (see Escape Bíblico). When a public view must call a helper function that reads a non-anon-readable table, that function must be `SECURITY DEFINER`.

### Champion page
`/campea` shows three states: gincana open, tie, or champion revealed. Add `?demo=1` to preview the champion UI using the current leader without closing the gincana. Celebration music stops automatically when navigating away (cleanup in `useEffect` return).
