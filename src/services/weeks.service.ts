import { supabase } from '@/lib/supabase';
import type { Week, WeekInsert, WeekUpdate } from '@/lib/database.types';

export const weeksService = {
  async list(): Promise<Week[]> {
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .order('order_number', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Week | null> {
    const { data, error } = await supabase.from('weeks').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: WeekInsert): Promise<Week> {
    const { data, error } = await supabase.from('weeks').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: WeekUpdate): Promise<Week> {
    const { data, error } = await supabase
      .from('weeks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async close(id: string): Promise<Week> {
    return this.update(id, { closed_at: new Date().toISOString(), is_active: false });
  },

  async reopen(id: string): Promise<Week> {
    return this.update(id, {
      closed_at: null,
      reopened_at: new Date().toISOString(),
      is_active: true,
    });
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('weeks').delete().eq('id', id);
    if (error) throw error;
  },
};
