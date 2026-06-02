import { supabase } from '@/lib/supabase';
import type {
  AnnouncementRow,
  AnnouncementInsert,
  AnnouncementUpdate,
} from '@/lib/database.types';

export const announcementsService = {
  async list(): Promise<AnnouncementRow[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as AnnouncementRow[]) ?? [];
  },

  // Retorna o aviso mais recente dentro da janela ativa, ou null.
  async getActive(): Promise<AnnouncementRow | null> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as AnnouncementRow) ?? null;
  },

  async create(payload: AnnouncementInsert): Promise<AnnouncementRow> {
    const { data, error } = await supabase
      .from('announcements')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AnnouncementRow;
  },

  async update(id: string, payload: AnnouncementUpdate): Promise<AnnouncementRow> {
    const { data, error } = await supabase
      .from('announcements')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AnnouncementRow;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  },
};
