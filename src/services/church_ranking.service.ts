import { supabase } from '@/lib/supabase';
import type { ChurchRanking } from '@/lib/database.types';

export const churchRankingService = {
  async list(): Promise<ChurchRanking[]> {
    const { data, error } = await supabase
      .from('church_rankings')
      .select('*')
      .order('rank_position', { ascending: true });
    if (error) throw error;
    return (data as ChurchRanking[]) ?? [];
  },
};
