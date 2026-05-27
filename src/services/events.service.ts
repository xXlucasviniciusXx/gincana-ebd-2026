import { supabase } from '@/lib/supabase';
import type { EventRow, EventInsert } from '@/lib/database.types';

export const eventsService = {
  async list(limit = 30): Promise<EventRow[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as EventRow[]) ?? [];
  },

  async log(payload: EventInsert): Promise<void> {
    // Falha silenciosa por design: o feed nunca deve quebrar a ação principal.
    try {
      const { error } = await supabase.from('events').insert(payload);
      if (error) console.warn('[events.log] falhou:', error.message);
    } catch (e) {
      console.warn('[events.log] exceção:', e);
    }
  },
};
