import { supabase } from '@/lib/supabase';
import type { Activity, ActivityInsert, ActivityUpdate } from '@/lib/database.types';

export const activitiesService = {
  async list(): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('activity_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listByWeek(weekId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('week_id', weekId)
      .order('activity_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Activity | null> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: ActivityInsert): Promise<Activity> {
    const { data, error } = await supabase.from('activities').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: ActivityUpdate): Promise<Activity> {
    const { data, error } = await supabase
      .from('activities')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
  },
};
