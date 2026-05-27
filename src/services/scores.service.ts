import { supabase } from '@/lib/supabase';
import type { Score, ScoreInsert, ScoreUpdate } from '@/lib/database.types';
import { eventsService } from './events.service';
import { badgesService } from './badges.service';

async function logScoreEvents(scores: Score[]) {
  if (scores.length === 0) return;
  const teamIds = Array.from(new Set(scores.map((s) => s.team_id)));
  const activityIds = Array.from(new Set(scores.map((s) => s.activity_id)));

  const [teamsRes, actsRes] = await Promise.all([
    supabase.from('teams').select('id, name').in('id', teamIds),
    supabase.from('activities').select('id, name, max_points').in('id', activityIds),
  ]);
  const teamName = new Map((teamsRes.data ?? []).map((t) => [t.id, t.name]));
  const actData = new Map(
    (actsRes.data ?? []).map((a) => [a.id, { name: a.name, max: a.max_points }]),
  );

  for (const s of scores) {
    const act = actData.get(s.activity_id);
    await eventsService.log({
      type: 'score',
      team_id: s.team_id,
      payload: {
        team_name: teamName.get(s.team_id) ?? null,
        activity_name: act?.name ?? null,
        points: Number(s.points),
        max_points: act?.max ?? null,
        observation: s.observation,
      },
    });
  }

  // Após qualquer pontuação, dispara recálculo de badges em background.
  badgesService.recalculate().catch(() => {
    /* não bloqueia UI */
  });
}

export const scoresService = {
  async list(): Promise<Score[]> {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listByTeam(teamId: string): Promise<Score[]> {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listByActivity(activityId: string): Promise<Score[]> {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('activity_id', activityId);
    if (error) throw error;
    return data ?? [];
  },

  async listByWeek(weekId: string): Promise<Score[]> {
    const { data: activityIds, error: aErr } = await supabase
      .from('activities')
      .select('id')
      .eq('week_id', weekId);
    if (aErr) throw aErr;
    const ids = (activityIds ?? []).map((a) => a.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .in('activity_id', ids);
    if (error) throw error;
    return data ?? [];
  },

  async upsert(payload: ScoreInsert): Promise<Score> {
    const { data, error } = await supabase
      .from('scores')
      .upsert(payload, { onConflict: 'team_id,activity_id' })
      .select()
      .single();
    if (error) throw error;
    await logScoreEvents([data]);
    return data;
  },

  async upsertMany(payloads: ScoreInsert[]): Promise<Score[]> {
    if (payloads.length === 0) return [];
    const { data, error } = await supabase
      .from('scores')
      .upsert(payloads, { onConflict: 'team_id,activity_id' })
      .select();
    if (error) throw error;
    const result = data ?? [];
    await logScoreEvents(result);
    return result;
  },

  async update(id: string, payload: ScoreUpdate): Promise<Score> {
    const { data, error } = await supabase
      .from('scores')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('scores').delete().eq('id', id);
    if (error) throw error;
  },
};
