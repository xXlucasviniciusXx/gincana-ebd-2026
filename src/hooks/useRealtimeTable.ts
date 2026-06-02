import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type Table =
  | 'scores'
  | 'events'
  | 'team_badges'
  | 'competition_settings'
  | 'weeks'
  | 'announcements';

/**
 * Inscreve um callback nas mudanças em tempo real de uma tabela.
 * Dispara em INSERT/UPDATE/DELETE. Em pratica, o callback eh chamado
 * para recarregar os dados localmente — nao processa o payload aqui
 * porque o ranking eh calculado a partir de outras consultas tambem.
 */
export function useRealtimeTable(table: Table, onChange: () => void): void {
  // Mantem a referencia mais recente sem reassinar o canal a cada render
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const channel = supabase
      .channel(`rt:${table}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        // o type do supabase-js varia entre versoes; cast para evitar atrito
        'postgres_changes' as never,
        { event: '*', schema: 'public', table } as never,
        () => {
          cbRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);
}
