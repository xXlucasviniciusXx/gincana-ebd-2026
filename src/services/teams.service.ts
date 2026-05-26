import { supabase } from '@/lib/supabase';
import type { Team, TeamInsert, TeamUpdate } from '@/lib/database.types';

export const teamsService = {
  async list(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Team | null> {
    const { data, error } = await supabase.from('teams').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: TeamInsert): Promise<Team> {
    const { data, error } = await supabase.from('teams').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: TeamUpdate): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },
};
