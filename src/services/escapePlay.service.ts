import { supabase } from '@/lib/supabase';
import { storageService } from './storage.service';
import type {
  EscapeSettingsPublic,
  EscapeStepPublic,
  EscapeRanking,
  EscapeLoginResult,
  EscapeStateResult,
  EscapeAnswerResult,
  EscapePhotoResult,
  EscapeFinalResult,
  EscapeHintResult,
} from '@/lib/database.types';

/**
 * Servico do PARTICIPANTE. Toda a logica sensivel (respostas, pistas,
 * senha) roda nas RPCs `security definer` do banco — aqui so chamamos.
 * O participante NAO faz login: usa o papel `anon` (sem acesso de
 * escrita as tabelas). O upload de fotos e liberado por uma policy
 * de Storage dedicada a pasta escape/ (migration 010).
 */
export const escapePlayService = {
  async getSettings(): Promise<EscapeSettingsPublic | null> {
    const { data, error } = await supabase
      .from('escape_settings_public')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listSteps(): Promise<EscapeStepPublic[]> {
    const { data, error } = await supabase
      .from('escape_steps_public')
      .select('*')
      .order('order_number', { ascending: true });
    if (error) throw error;
    return (data as EscapeStepPublic[]) ?? [];
  },

  async ranking(): Promise<EscapeRanking[]> {
    const { data, error } = await supabase
      .from('escape_ranking')
      .select('*')
      .order('rank_position', { ascending: true });
    if (error) throw error;
    return (data as EscapeRanking[]) ?? [];
  },

  async login(code: string): Promise<EscapeLoginResult> {
    const { data, error } = await supabase.rpc('escape_login', { p_code: code });
    if (error) throw error;
    return data as EscapeLoginResult;
  },

  async state(code: string): Promise<EscapeStateResult> {
    const { data, error } = await supabase.rpc('escape_state', { p_code: code });
    if (error) throw error;
    return data as EscapeStateResult;
  },

  async answer(
    code: string,
    stepId: string,
    attempt: string,
  ): Promise<EscapeAnswerResult> {
    const { data, error } = await supabase.rpc('escape_answer', {
      p_code: code,
      p_step_id: stepId,
      p_attempt: attempt,
    });
    if (error) throw error;
    return data as EscapeAnswerResult;
  },

  async submitPhoto(
    code: string,
    stepId: string,
    file: File,
  ): Promise<EscapePhotoResult> {
    const url = await storageService.upload(file, 'escape/uploads');
    const { data, error } = await supabase.rpc('escape_submit_photo', {
      p_code: code,
      p_step_id: stepId,
      p_url: url,
    });
    if (error) throw error;
    return data as EscapePhotoResult;
  },

  async checkFinal(code: string, attempt: string): Promise<EscapeFinalResult> {
    const { data, error } = await supabase.rpc('escape_check_final', {
      p_code: code,
      p_attempt: attempt,
    });
    if (error) throw error;
    return data as EscapeFinalResult;
  },

  async useHint(code: string, stepId: string): Promise<EscapeHintResult> {
    const { data, error } = await supabase.rpc('escape_use_hint', {
      p_code: code,
      p_step_id: stepId,
    });
    if (error) throw error;
    return data as EscapeHintResult;
  },
};
