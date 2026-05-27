import { supabase } from '@/lib/supabase';
import type {
  CompetitionSettings,
  CompetitionSettingsUpdate,
} from '@/lib/database.types';
import { rankingService } from './ranking.service';
import { eventsService } from './events.service';
import { badgesService } from './badges.service';

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

    const result = await this.update(settings.id, {
      status: 'closed',
      has_tie: hasTie,
      champion_team_id: championId,
      closed_at: new Date().toISOString(),
    });
    await eventsService.log({
      type: 'gincana_closed',
      team_id: championId,
      payload: { has_tie: hasTie, champion_team_id: championId },
    });
    badgesService.recalculate().catch(() => {
      /* ignora */
    });
    return result;
  },

  // Resolução manual de empate: admin escolhe a campeã + nota.
  async resolveTiebreaker(
    settingsId: string,
    championTeamId: string,
    note: string | null,
  ): Promise<CompetitionSettings> {
    const result = await this.update(settingsId, {
      champion_team_id: championTeamId,
      has_tie: false,
      tiebreaker_note: note,
    });
    await eventsService.log({
      type: 'gincana_closed',
      team_id: championTeamId,
      payload: { tiebreaker_resolved_manually: true, tiebreaker_note: note },
    });
    badgesService.recalculate().catch(() => {
      /* ignora */
    });
    return result;
  },

  async reopen(): Promise<CompetitionSettings> {
    const settings = await this.get();
    if (!settings) throw new Error('Configurações da gincana não encontradas.');

    const result = await this.update(settings.id, {
      status: 'open',
      has_tie: false,
      champion_team_id: null,
      reopened_at: new Date().toISOString(),
    });
    await eventsService.log({ type: 'gincana_reopened' });
    return result;
  },
};
