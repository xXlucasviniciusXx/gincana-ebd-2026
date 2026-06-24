import { supabase } from '@/lib/supabase';
import type {
  EscapeSettings,
  EscapeSettingsUpdate,
  EscapeStep,
  EscapeStepInsert,
  EscapeStepUpdate,
  EscapeTeamCode,
  EscapeProgress,
  EscapeRanking,
} from '@/lib/database.types';

// Gera um codigo legivel de 6 caracteres (sem 0/O/1/I para evitar confusao).
export function generateEscapeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Servico ADMIN do Escape Bíblico (autoria + monitoramento).
 * Leitura completa das tabelas (inclui colunas secretas) — so funciona
 * para usuarios autenticados, conforme RLS.
 */
export const escapeService = {
  // --- Configuracoes (singleton) ---
  async getSettings(): Promise<EscapeSettings | null> {
    const { data, error } = await supabase
      .from('escape_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateSettings(
    id: string,
    payload: EscapeSettingsUpdate,
  ): Promise<EscapeSettings> {
    const { data, error } = await supabase
      .from('escape_settings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Etapas (CRUD) ---
  async listSteps(): Promise<EscapeStep[]> {
    const { data, error } = await supabase
      .from('escape_steps')
      .select('*')
      .order('order_number', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async createStep(payload: EscapeStepInsert): Promise<EscapeStep> {
    const { data, error } = await supabase
      .from('escape_steps')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStep(id: string, payload: EscapeStepUpdate): Promise<EscapeStep> {
    const { data, error } = await supabase
      .from('escape_steps')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeStep(id: string): Promise<void> {
    const { error } = await supabase.from('escape_steps').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Codigos por equipe ---
  async listCodes(): Promise<EscapeTeamCode[]> {
    const { data, error } = await supabase.from('escape_team_codes').select('*');
    if (error) throw error;
    return data ?? [];
  },

  async upsertCode(teamId: string, code: string): Promise<void> {
    const { error } = await supabase
      .from('escape_team_codes')
      .upsert({ team_id: teamId, code, is_active: true }, { onConflict: 'team_id' });
    if (error) throw error;
  },

  async removeCode(teamId: string): Promise<void> {
    const { error } = await supabase
      .from('escape_team_codes')
      .delete()
      .eq('team_id', teamId);
    if (error) throw error;
  },

  // --- Progresso / monitor ---
  async listProgress(): Promise<EscapeProgress[]> {
    const { data, error } = await supabase
      .from('escape_progress')
      .select('*')
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Revisao de foto: aprovar (sem penalidade) ou rejeitar (zera os pontos
  // da etapa, descontando no ranking do Escape).
  async reviewPhoto(progressId: string, approved: boolean): Promise<void> {
    if (approved) {
      const { error } = await supabase
        .from('escape_progress')
        .update({ photo_review: 'approved', penalty_points: 0 })
        .eq('id', progressId);
      if (error) throw error;
      return;
    }
    const { data: row, error: e1 } = await supabase
      .from('escape_progress')
      .select('points_awarded')
      .eq('id', progressId)
      .single();
    if (e1) throw e1;
    const { error } = await supabase
      .from('escape_progress')
      .update({ photo_review: 'rejected', penalty_points: row.points_awarded })
      .eq('id', progressId);
    if (error) throw error;
  },

  async ranking(): Promise<EscapeRanking[]> {
    const { data, error } = await supabase
      .from('escape_ranking')
      .select('*')
      .order('rank_position', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
