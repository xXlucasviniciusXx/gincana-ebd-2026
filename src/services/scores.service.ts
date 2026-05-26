import { supabase } from '@/lib/supabase';
import type { Score, ScoreInsert, ScoreUpdate } from '@/lib/database.types';

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
    return data;
  },

  async upsertMany(payloads: ScoreInsert[]): Promise<Score[]> {
    if (payloads.length === 0) return [];
    const { data, error } = await supabase
      .from('scores')
      .upsert(payloads, { onConflict: 'team_id,activity_id' })
      .select();
    if (error) throw error;
    return data ?? [];
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
