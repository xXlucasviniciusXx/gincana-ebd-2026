import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { weeksService } from '@/services/weeks.service';
import { activitiesService } from '@/services/activities.service';
import type { Week, Activity } from '@/lib/database.types';

type WeekStatus = 'running' | 'closed' | 'upcoming' | 'idle';

function classifyWeek(w: Week): WeekStatus {
  if (w.closed_at) return 'closed';
  const today = new Date().toISOString().slice(0, 10);
  if (w.start_date && w.end_date) {
    if (today < w.start_date) return 'upcoming';
    if (today > w.end_date) return 'closed';
    return 'running';
  }
  return 'idle';
}

const STATUS_META: Record<WeekStatus, { label: string; cls: string }> = {
  running: { label: '🟢 Em andamento', cls: 'bg-emerald-100 text-emerald-800' },
  closed: { label: '🏁 Encerrada', cls: 'bg-slate-200 text-slate-700' },
  upcoming: { label: '⏳ Em breve', cls: 'bg-blue-100 text-blue-800' },
  idle: { label: 'Sem datas', cls: 'bg-slate-100 text-slate-500' },
};

export default function WeeksListPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [w, a] = await Promise.all([weeksService.list(), activitiesService.list()]);
        if (cancelled) return;
        setWeeks(w);
        setActivities(a);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const countActivities = (weekId: string) =>
    activities.filter((a) => a.week_id === weekId).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Semanas</h1>
        <p className="text-slate-600">
          Confira o que está sendo cobrado em cada semana da Gincana EBD 2026.
        </p>
      </header>

      {loading && <p className="text-slate-500">Carregando...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {weeks.map((w, i) => {
          const status = classifyWeek(w);
          const meta = STATUS_META[status];
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/semanas/${w.id}`}
                className="card group block transition hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Semana {w.order_number}
                    </p>
                    <h2 className="heading-display text-lg font-bold text-brand-navy">
                      {w.name}
                    </h2>
                  </div>
                  <span className={`badge ${meta.cls}`}>{meta.label}</span>
                </div>

                {w.description && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{w.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {w.start_date ?? '—'} → {w.end_date ?? '—'}
                  </span>
                  <span className="font-medium text-brand-teal">
                    {countActivities(w.id)} atividade(s)
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {!loading && weeks.length === 0 && (
          <p className="col-span-full text-slate-500">Nenhuma semana cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
