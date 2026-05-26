import { supabase } from '@/lib/supabase';
import type { TeamRanking } from '@/lib/database.types';

type WeeklyRanking = TeamRanking;

export const rankingService = {
  async list(): Promise<TeamRanking[]> {
    const { data, error } = await supabase
      .from('team_rankings')
      .select('*')
      .order('rank_position', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async leaders(): Promise<TeamRanking[]> {
    const ranking = await this.list();
    if (ranking.length === 0) return [];
    const top = ranking[0].total_points;
    return ranking.filter((r) => r.total_points === top);
  },

  // Ranking calculado para uma semana específica (somando scores das atividades dessa semana).
  async byWeek(weekId: string): Promise<WeeklyRanking[]> {
    const [teamsRes, activitiesRes] = await Promise.all([
      supabase.from('teams').select('id, name, color, is_active').eq('is_active', true),
      supabase.from('activities').select('id').eq('week_id', weekId),
    ]);

    if (teamsRes.error) throw teamsRes.error;
    if (activitiesRes.error) throw activitiesRes.error;

    const teams = teamsRes.data ?? [];
    const activityIds = (activitiesRes.data ?? []).map((a) => a.id);

    if (activityIds.length === 0) {
      return teams.map((t, idx) => ({
        ...t,
        total_points: 0,
        scores_count: 0,
        rank_position: idx + 1,
      }));
    }

    const { data: scores, error } = await supabase
      .from('scores')
      .select('team_id, points')
      .in('activity_id', activityIds);
    if (error) throw error;

    const aggregated = teams.map((t) => {
      const teamScores = (scores ?? []).filter((s) => s.team_id === t.id);
      const total = teamScores.reduce((sum, s) => sum + Number(s.points), 0);
      return {
        ...t,
        total_points: total,
        scores_count: teamScores.length,
        rank_position: 0,
      };
    });

    aggregated.sort((a, b) => b.total_points - a.total_points);

    let lastPoints = Number.POSITIVE_INFINITY;
    let lastRank = 0;
    aggregated.forEach((row, idx) => {
      if (row.total_points < lastPoints) {
        lastRank = idx + 1;
        lastPoints = row.total_points;
      }
      row.rank_position = lastRank;
    });

    return aggregated;
  },
};
