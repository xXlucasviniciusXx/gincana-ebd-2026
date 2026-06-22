# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node is at `C:\Program Files\nodejs` and is NOT on the system PATH by default. Prefix all npm/node commands in PowerShell:

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"; npm run dev
$env:PATH = "C:\Program Files\nodejs;$env:PATH"; npm run build
$env:PATH = "C:\Program Files\nodejs;$env:PATH"; npm run lint   # runs tsc --noEmit
```

The dev server uses the preview tool via `.claude/launch.json` (config: `gincana-dev`, port 5173).  
**Never** run `npm run dev` as a background Bash process — use `preview_start` instead.

SQL migrations are applied manually by the user in the Supabase SQL Editor — never automate this.

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
- `PublicLayout` → public pages (`/`, `/equipes`, `/semanas`, `/campea`, `/novidades`)
- `AdminLayout` behind `ProtectedRoute` → `/admin/**`

`ProtectedRoute` reads `AuthContext` (Supabase session). Any authenticated Supabase user is treated as admin — there are no roles.

### Realtime
`useRealtimeTable(table, callback)` in `src/hooks/useRealtimeTable.ts` subscribes to `postgres_changes` for a table. Uses a `cbRef` pattern to keep the callback up-to-date without re-subscribing. Channel names include `Math.random()` to avoid conflicts. Tables in the Realtime publication: `scores`, `events`, `team_badges`, `competition_settings`, `weeks`, `announcements`.

### Ranking
`team_rankings` is a **Postgres view** (not a table). It does a `LEFT JOIN scores ON team_id` + `GROUP BY` + `RANK() OVER`. It is never written to — always computed on the fly. First call after DB inactivity (free tier cold-start) can take ~800ms; subsequent calls are ~200ms.

### Badge system (`badges.service.ts`)
`recalculate()` implements "current truth" reconciliation: builds a complete desired set of badges, compares with DB state, then inserts new ones and deletes stale ones in bulk. Badge codes for contextual badges (weekly leader, max score) embed the context ID: `weekly_leader:<week_id>`, `max_score:<activity_id>`. Tiebreaker cascade: total points → most max-scores → most activities → highest single score → unresolved.

### Competition lifecycle (`competition.service.ts`)
`competition_settings` is a singleton row. `close()` auto-detects tie vs. single winner. When closed, `badgesService.recalculate()` is fired and forgotten (`.catch(() => {})`). `resolveTiebreaker()` allows manual winner selection.

### Rich text rendering
`src/components/RichText.tsx` renders stored text with `whitespace-pre-line` for line breaks and inline `**bold**` / `*italic*` parsing. Use this component (not a plain `<p>`) wherever user-authored descriptions are displayed.

### Storage
Supabase Storage bucket: `gincana`. Path convention: `activities/photos/<filename>`, `members/photos/<filename>`, `teams/photos/<filename>`, `teams/banners/<filename>`, `gallery/<teamId>/<filename>`. `src/services/storage.service.ts` handles upload; `src/components/ImageUpload.tsx` is the reusable upload UI.

### CSS conventions
- Design tokens are in `tailwind.config.js` under `theme.extend.colors.brand` (navy, teal, yellow, orange, red, cream)
- Component utility classes (`.card`, `.btn`, `.input`, `.badge`, `.heading-display`) are defined in `src/index.css` via `@layer components`
- Font: Fredoka for display (`.heading-display`), Inter for body

### Migrations
Numbered sequentially in `supabase/migrations/`. Each file is idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.). RLS pattern: public SELECT for `anon + authenticated`, write only for `authenticated`. Every new table needs: RLS enabled, select policy, write policy, Realtime added (via `supabase_realtime` publication in `006_enable_realtime.sql`), and a type entry in `database.types.ts`.

### Champion page
`/campea` shows three states: gincana open, tie, or champion revealed. Add `?demo=1` to preview the champion UI using the current leader without closing the gincana. Celebration music stops automatically when navigating away (cleanup in `useEffect` return).
