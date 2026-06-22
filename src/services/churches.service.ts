import { supabase } from '@/lib/supabase';
import type { Church, ChurchInsert, ChurchUpdate } from '@/lib/database.types';

export const churchesService = {
  async list(): Promise<Church[]> {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Church | null> {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: ChurchInsert): Promise<Church> {
    const { data, error } = await supabase
      .from('churches')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: ChurchUpdate): Promise<Church> {
    const { data, error } = await supabase
      .from('churches')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('churches').delete().eq('id', id);
    if (error) throw error;
  },
};
