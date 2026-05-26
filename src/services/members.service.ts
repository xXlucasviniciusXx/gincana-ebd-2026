import { supabase } from '@/lib/supabase';
import type { Member, MemberInsert, MemberUpdate } from '@/lib/database.types';

export const membersService = {
  async list(): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listByTeam(teamId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('team_id', teamId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: MemberInsert): Promise<Member> {
    const { data, error } = await supabase.from('members').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: MemberUpdate): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
  },
};
