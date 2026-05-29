import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventsService } from '@/services/events.service';
import type { EventRow } from '@/lib/database.types';

const FILTERS: { key: string; label: string; emoji: string; types: string[] | null }[] = [
  { key: 'all', label: 'Tudo', emoji: '✨', types: null },
  { key: 'score', label: 'Pontuações', emoji: '🎯', types: ['score'] },
  { key: 'badge', label: 'Conquistas', emoji: '🏅', types: ['badge', 'badge_revoked'] },
  {
    key: 'week',
    label: 'Semanas',
    emoji: '📅',
    types: ['week_started', 'week_closed'],
  },
  {
    key: 'gincana',
    label: 'Gincana',
    emoji: '🏆',
    types: ['gincana_closed', 'gincana_reopened'],
  },
];

const META: Record<string, { emoji: string; tone: string }> = {
  score: { emoji: '🎯', tone: 'bg-brand-teal/10 text-brand-teal' },
  badge: { emoji: '🏅', tone: 'bg-brand-yellow/20 text-amber-800' },
  badge_revoked: { emoji: '↩️', tone: 'bg-slate-100 text-slate-500' },
  week_started: { emoji: '🚀', tone: 'bg-emerald-100 text-emerald-800' },
  week_closed: { emoji: '🏁', tone: 'bg-slate-200 text-slate-700' },
  gincana_closed: { emoji: '🏆', tone: 'bg-amber-100 text-amber-900' },
  gincana_reopened: { emoji: '🔓', tone: 'bg-blue-100 text-blue-900' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffMin < 60 * 24) return `há ${Math.floor(diffMin / 60)}h`;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const PAGE_SIZE = 30;

export default function NewsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filterKey, setFilterKey] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await eventsService.list(500);
        if (!cancelled) setEvents(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const filtered = useMemo(
    () =>
      filter.types === null
        ? events
        : events.filter((e) => filter.types!.includes(e.type as string)),
    [events, filter],
  );

  const shown = filtered.slice(0, visible);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of FILTERS) {
      m[f.key] =
        f.types === null
          ? events.length
          : events.filter((e) => f.types!.includes(e.type as string)).length;
    }
    return m;
  }, [events]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">📰 Novidades</h1>
        <p className="text-slate-600">
          Tudo o que está acontecendo na gincana em ordem cronológica.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilterKey(f.key);
              setVisible(PAGE_SIZE);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filterKey === f.key
                ? 'bg-brand-navy text-white shadow-card'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-navy'
            }`}
          >
            <span className="mr-1">{f.emoji}</span>
            {f.label}
            <span className="ml-1 text-xs opacity-70">({counts[f.key] ?? 0})</span>
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-500">Carregando...</p>}

      {!loading && shown.length === 0 && (
        <p className="text-slate-500">Nenhum evento ainda dessa categoria.</p>
      )}

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {shown.map((ev) => {
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
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${m.tone}`}
                >
                  {d.emoji ?? m.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{d.text}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {formatDateTime(ev.created_at)}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {visible < filtered.length && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="btn-ghost"
          >
            Carregar mais ({filtered.length - visible} restante(s))
          </button>
        </div>
      )}
    </div>
  );
}
