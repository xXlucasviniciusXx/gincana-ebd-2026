import { supabase } from '@/lib/supabase';
import type { TeamBadgeRow } from '@/lib/database.types';
import { eventsService } from './events.service';

// ----------------------------------------------------------
// CATÁLOGO de conquistas
// ----------------------------------------------------------
// O `code` no banco é o identificador único da combinação
// (team_id, badge). Para conquistas "por contexto" (semana,
// atividade) o code embute o id desse contexto.
// ----------------------------------------------------------

type BadgeMeta = {
  emoji: string;
  title: string;
  description: string;
  color: string; // classes Tailwind para o card
};

export const BADGE_CATALOG: Record<string, BadgeMeta> = {
  // --- Pontuação total ---
  first_blood: {
    emoji: '🌱',
    title: 'Primeira Pontuação',
    description: 'Marcou os primeiros pontos da gincana.',
    color: 'from-lime-300 to-emerald-500',
  },
  centurion: {
    emoji: '💯',
    title: 'Centena',
    description: 'Chegou a 100 pontos totais.',
    color: 'from-emerald-400 to-emerald-600',
  },
  triple_century: {
    emoji: '🔥',
    title: 'Trio de Centenas',
    description: 'Chegou a 300 pontos totais.',
    color: 'from-orange-400 to-red-500',
  },
  // --- Posição no ranking ---
  top_dog: {
    emoji: '👑',
    title: 'Líder Geral',
    description: 'Está em 1º lugar no ranking geral agora.',
    color: 'from-yellow-300 to-amber-500',
  },
  // --- Por atividade / semana ---
  max_score: {
    emoji: '🎯',
    title: 'Pontuação Máxima',
    description: 'Tirou a pontuação máxima de uma atividade.',
    color: 'from-brand-teal to-emerald-500',
  },
  weekly_leader: {
    emoji: '🌟',
    title: 'Líder da Semana',
    description: 'Terminou em 1º lugar em uma semana encerrada.',
    color: 'from-amber-300 to-yellow-500',
  },
  dominant_week: {
    emoji: '🎖️',
    title: 'Vitória Acachapante',
    description: 'Venceu uma semana com pelo menos 50% de vantagem sobre o 2º.',
    color: 'from-fuchsia-400 to-rose-500',
  },
  double_champ: {
    emoji: '🏅',
    title: 'Bicampeã',
    description: 'Foi 1º lugar em duas ou mais semanas encerradas.',
    color: 'from-cyan-400 to-blue-600',
  },
  unicorn: {
    emoji: '🦄',
    title: 'Mestre da Pontuação',
    description: 'Tirou a nota máxima em 5 ou mais atividades.',
    color: 'from-violet-400 to-purple-600',
  },
  // --- Equipe ---
  full_team: {
    emoji: '👥',
    title: 'Time Completo',
    description: 'Tem 8 ou mais integrantes ativos cadastrados.',
    color: 'from-sky-400 to-indigo-500',
  },
  // --- Gincana ---
  champion: {
    emoji: '🏆',
    title: 'Equipe Campeã',
    description: 'Conquistou o título da Gincana EBD 2026.',
    color: 'from-brand-yellow to-brand-orange',
  },
};

export type ResolvedBadge = TeamBadgeRow & { meta: BadgeMeta; rootCode: string };

// Quebra "weekly_leader:abc123" em rootCode "weekly_leader" + suffix "abc123"
function resolveCode(code: string): { root: string; suffix?: string } {
  const idx = code.indexOf(':');
  if (idx < 0) return { root: code };
  return { root: code.slice(0, idx), suffix: code.slice(idx + 1) };
}

export function decorateBadge(badge: TeamBadgeRow): ResolvedBadge | null {
  const { root } = resolveCode(badge.badge_code);
  const meta = BADGE_CATALOG[root];
  if (!meta) return null;
  return { ...badge, meta, rootCode: root };
}

// ----------------------------------------------------------
export const badgesService = {
  async list(): Promise<TeamBadgeRow[]> {
    const { data, error } = await supabase
      .from('team_badges')
      .select('*')
      .order('earned_at', { ascending: false });
    if (error) throw error;
    return (data as TeamBadgeRow[]) ?? [];
  },

  async listByTeam(teamId: string): Promise<TeamBadgeRow[]> {
    const { data, error } = await supabase
      .from('team_badges')
      .select('*')
      .eq('team_id', teamId)
      .order('earned_at', { ascending: false });
    if (error) throw error;
    return (data as TeamBadgeRow[]) ?? [];
  },

  // Sincroniza o estado dos badges com a verdade atual: concede o que
  // está faltando e revoga o que não atende mais ao critério.
  async recalculate(): Promise<{ granted: number; revoked: number }> {
    // ----------------- 1) Monta o set desejado --------------------
    type Desired = { team_id: string; badge_code: string; payload?: Record<string, unknown> };
    const desired: Desired[] = [];

    // (a) Pontuação total -> first_blood, centurion, triple_century
    const { data: rankings, error: rankErr } = await supabase
      .from('team_rankings')
      .select('id, total_points, rank_position');
    if (rankErr) throw rankErr;

    const rankingRows = rankings ?? [];
    for (const row of rankingRows) {
      const pts = Number(row.total_points);
      if (pts > 0) desired.push({ team_id: row.id, badge_code: 'first_blood' });
      if (pts >= 100) desired.push({ team_id: row.id, badge_code: 'centurion' });
      if (pts >= 300) desired.push({ team_id: row.id, badge_code: 'triple_century' });
      // top_dog: líder absoluto sem empate
      if (row.rank_position === 1 && pts > 0) {
        const others = rankingRows.filter((r) => r.id !== row.id);
        const allBelow = others.every((r) => Number(r.total_points) < pts);
        if (allBelow) desired.push({ team_id: row.id, badge_code: 'top_dog' });
      }
    }

    // (b) Pontuação máxima por atividade
    const { data: activities, error: actErr } = await supabase
      .from('activities')
      .select('id, max_points');
    if (actErr) throw actErr;

    const maxByTeam = new Map<string, number>(); // contagem pra unicorn
    for (const act of activities ?? []) {
      if (!act.max_points || act.max_points <= 0) continue;
      const { data: maxScores } = await supabase
        .from('scores')
        .select('team_id, points')
        .eq('activity_id', act.id)
        .eq('points', act.max_points);
      for (const s of maxScores ?? []) {
        desired.push({
          team_id: s.team_id,
          badge_code: `max_score:${act.id}`,
          payload: { activity_id: act.id },
        });
        maxByTeam.set(s.team_id, (maxByTeam.get(s.team_id) ?? 0) + 1);
      }
    }

    // unicorn: 5+ max_score em atividades distintas
    for (const [teamId, count] of maxByTeam) {
      if (count >= 5) {
        desired.push({
          team_id: teamId,
          badge_code: 'unicorn',
          payload: { activities_count: count },
        });
      }
    }

    // (c) Líder de semana encerrada + dominant_week + double_champ
    const { data: closedWeeks } = await supabase
      .from('weeks')
      .select('id, name, closed_at')
      .not('closed_at', 'is', null);

    const weeklyLeaderByTeam = new Map<string, number>();
    for (const w of closedWeeks ?? []) {
      const weekFull = await weekRankingFull(w.id);
      const top = weekFull[0];
      if (!top || top.total === 0) continue;
      const secondScore = weekFull[1]?.total ?? 0;
      const isDominant = secondScore === 0 || top.total >= secondScore * 1.5;

      // líderes (pode ter empate -> múltiplos)
      for (const leader of weekFull.filter((r) => r.total === top.total)) {
        desired.push({
          team_id: leader.team_id,
          badge_code: `weekly_leader:${w.id}`,
          payload: { week_id: w.id, week_name: w.name },
        });
        weeklyLeaderByTeam.set(
          leader.team_id,
          (weeklyLeaderByTeam.get(leader.team_id) ?? 0) + 1,
        );
      }

      // dominant_week só pra líder único e folga >= 1.5x
      if (isDominant && weekFull.filter((r) => r.total === top.total).length === 1) {
        desired.push({
          team_id: top.team_id,
          badge_code: `dominant_week:${w.id}`,
          payload: { week_id: w.id, week_name: w.name, margin: top.total - secondScore },
        });
      }
    }

    // double_champ: ganhou 2+ semanas
    for (const [teamId, count] of weeklyLeaderByTeam) {
      if (count >= 2) {
        desired.push({
          team_id: teamId,
          badge_code: 'double_champ',
          payload: { weeks_won: count },
        });
      }
    }

    // (d) Campeã da gincana
    const { data: settings } = await supabase
      .from('competition_settings')
      .select('id, champion_team_id, status')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (settings && settings.status === 'closed' && settings.champion_team_id) {
      desired.push({ team_id: settings.champion_team_id, badge_code: 'champion' });
    }

    // (e) Time completo: 5+ integrantes ativos
    const { data: memberCounts } = await supabase
      .from('members')
      .select('team_id')
      .eq('is_active', true);
    const memberCountByTeam = new Map<string, number>();
    for (const m of memberCounts ?? []) {
      memberCountByTeam.set(m.team_id, (memberCountByTeam.get(m.team_id) ?? 0) + 1);
    }
    for (const [teamId, count] of memberCountByTeam) {
      if (count >= 8) {
        desired.push({
          team_id: teamId,
          badge_code: 'full_team',
          payload: { members_count: count },
        });
      }
    }

    // --------------- 2) Compara com estado atual ------------------
    const current = await this.list();
    const keyOf = (b: { team_id: string; badge_code: string }) =>
      `${b.team_id}::${b.badge_code}`;

    const desiredByKey = new Map<string, Desired>(desired.map((d) => [keyOf(d), d]));
    const currentByKey = new Map<string, TeamBadgeRow>(current.map((c) => [keyOf(c), c]));

    const toGrant = desired.filter((d) => !currentByKey.has(keyOf(d)));
    const toRevoke = current.filter((c) => !desiredByKey.has(keyOf(c)));

    // ----------------- 3) Concede o que falta ---------------------
    let granted = 0;
    if (toGrant.length > 0) {
      const { data, error: insertErr } = await supabase
        .from('team_badges')
        .insert(
          toGrant.map((d) => ({
            team_id: d.team_id,
            badge_code: d.badge_code,
            payload: d.payload ?? null,
          })),
        )
        .select();
      if (insertErr) {
        console.warn('[badges.recalculate] insert:', insertErr.message);
      } else {
        granted = (data ?? []).length;
        for (const d of toGrant) {
          const { root } = resolveCode(d.badge_code);
          const meta = BADGE_CATALOG[root];
          const teamName = await teamNameOrNull(d.team_id);
          await eventsService.log({
            type: 'badge',
            team_id: d.team_id,
            payload: {
              badge_code: d.badge_code,
              badge_title: meta?.title ?? d.badge_code,
              badge_emoji: meta?.emoji ?? '🏅',
              team_name: teamName,
              ...(d.payload ?? {}),
            },
          });
        }
      }
    }

    // ----------------- 4) Revoga o que sobrou ---------------------
    let revoked = 0;
    if (toRevoke.length > 0) {
      const ids = toRevoke.map((b) => b.id);
      const { data, error: delErr } = await supabase
        .from('team_badges')
        .delete()
        .in('id', ids)
        .select();
      if (delErr) {
        console.warn('[badges.recalculate] delete:', delErr.message);
      } else {
        revoked = (data ?? []).length;
        for (const b of toRevoke) {
          const { root } = resolveCode(b.badge_code);
          const meta = BADGE_CATALOG[root];
          const teamName = await teamNameOrNull(b.team_id);
          await eventsService.log({
            type: 'badge_revoked',
            team_id: b.team_id,
            payload: {
              badge_code: b.badge_code,
              badge_title: meta?.title ?? b.badge_code,
              badge_emoji: meta?.emoji ?? '🏅',
              team_name: teamName,
            },
          });
        }
      }
    }

    return { granted, revoked };
  },
};

// Helpers privados
async function teamNameOrNull(teamId: string): Promise<string | null> {
  const { data } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .maybeSingle();
  return data?.name ?? null;
}

async function weekRankingFull(
  weekId: string,
): Promise<{ team_id: string; total: number }[]> {
  const { data: activityIds } = await supabase
    .from('activities')
    .select('id')
    .eq('week_id', weekId);
  const ids = (activityIds ?? []).map((a) => a.id);
  if (ids.length === 0) return [];

  const { data: scores } = await supabase
    .from('scores')
    .select('team_id, points')
    .in('activity_id', ids);

  const totals = new Map<string, number>();
  for (const s of scores ?? []) {
    totals.set(s.team_id, (totals.get(s.team_id) ?? 0) + Number(s.points));
  }
  return Array.from(totals.entries())
    .map(([team_id, total]) => ({ team_id, total }))
    .sort((a, b) => b.total - a.total);
}
