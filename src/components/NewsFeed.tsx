import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventsService } from '@/services/events.service';
import type { EventRow } from '@/lib/database.types';

type Props = {
  limit?: number;
  className?: string;
  /** se true, atualiza automaticamente a cada 30s */
  live?: boolean;
};

const META: Record<string, { emoji: string; tone: string }> = {
  score: { emoji: '🎯', tone: 'bg-brand-teal/10 text-brand-teal' },
  badge: { emoji: '🏅', tone: 'bg-brand-yellow/20 text-amber-800' },
  badge_revoked: { emoji: '↩️', tone: 'bg-slate-100 text-slate-500' },
  week_started: { emoji: '🚀', tone: 'bg-emerald-100 text-emerald-800' },
  week_closed: { emoji: '🏁', tone: 'bg-slate-200 text-slate-700' },
  gincana_closed: { emoji: '🏆', tone: 'bg-amber-100 text-amber-900' },
  gincana_reopened: { emoji: '🔓', tone: 'bg-blue-100 text-blue-900' },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'agora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function describe(ev: EventRow): { text: string; emoji?: string } {
  const p = ev.payload ?? {};
  switch (ev.type) {
    case 'score': {
      const team = (p['team_name'] as string) ?? 'Equipe';
      const act = (p['activity_name'] as string) ?? 'atividade';
      const pts = Number(p['points'] ?? 0);
      const max = p['max_points'] as number | null;
      const suffix = max != null && pts === max ? ' (pontuação máxima!)' : '';
      return { text: `${team} marcou ${pts} pts em ${act}${suffix}` };
    }
    case 'badge': {
      const team = (p['team_name'] as string) ?? 'Equipe';
      const title = (p['badge_title'] as string) ?? 'conquista';
      const emoji = (p['badge_emoji'] as string) ?? '🏅';
      return { text: `${team} desbloqueou: ${title}`, emoji };
    }
    case 'badge_revoked': {
      const team = (p['team_name'] as string) ?? 'Equipe';
      const title = (p['badge_title'] as string) ?? 'conquista';
      return { text: `${team} não atende mais ao critério de "${title}" — badge removido.` };
    }
    case 'week_started':
      return { text: `${(p['week_name'] as string) ?? 'Semana'} começou!` };
    case 'week_closed':
      return { text: `${(p['week_name'] as string) ?? 'Semana'} foi encerrada.` };
    case 'gincana_closed':
      return p['has_tie']
        ? { text: 'Gincana encerrada com empate na liderança.' }
        : { text: 'Gincana encerrada! Equipe campeã definida.' };
    case 'gincana_reopened':
      return { text: 'Gincana reaberta — lançamentos liberados de novo.' };
    default:
      return { text: ev.type };
  }
}

export default function NewsFeed({ limit = 8, className = '', live = true }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await eventsService.list(limit);
        if (!cancelled) {
          setEvents(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    if (!live) return;
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit, live]);

  if (loading) {
    return <p className={`text-sm text-slate-500 ${className}`}>Carregando novidades...</p>;
  }
  if (events.length === 0) {
    return (
      <p className={`text-sm text-slate-500 ${className}`}>
        Nenhuma novidade por aqui ainda. Volte em breve!
      </p>
    );
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const m = META[ev.type] ?? { emoji: '✨', tone: 'bg-slate-100 text-slate-700' };
          const d = describe(ev);
          return (
            <motion.li
              key={ev.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${m.tone}`}
              >
                {d.emoji ?? m.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{d.text}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  {formatRelative(ev.created_at)}
                </p>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
