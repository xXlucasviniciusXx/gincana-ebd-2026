import { supabase } from '@/lib/supabase';
import type {
  CompetitionSettings,
  CompetitionSettingsUpdate,
} from '@/lib/database.types';
import { rankingService } from './ranking.service';

export const competitionService = {
  async get(): Promise<CompetitionSettings | null> {
    const { data, error } = await supabase
      .from('competition_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: CompetitionSettingsUpdate): Promise<CompetitionSettings> {
    const { data, error } = await supabase
      .from('competition_settings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Encerra a gincana: define campeã se houver líder único, marca empate caso contrário.
  async close(): Promise<CompetitionSettings> {
    const settings = await this.get();
    if (!settings) throw new Error('Configurações da gincana não encontradas.');

    const leaders = await rankingService.leaders();
    const hasTie = leaders.length > 1;
    const championId = hasTie ? null : leaders[0]?.id ?? null;

    return this.update(settings.id, {
      status: 'closed',
      has_tie: hasTie,
      champion_team_id: championId,
      closed_at: new Date().toISOString(),
    });
  },

  async reopen(): Promise<CompetitionSettings> {
    const settings = await this.get();
    if (!settings) throw new Error('Configurações da gincana não encontradas.');

    return this.update(settings.id, {
      status: 'open',
      has_tie: false,
      champion_team_id: null,
      reopened_at: new Date().toISOString(),
    });
  },
};
