import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { weeksService } from '@/services/weeks.service';
import { activitiesService } from '@/services/activities.service';
import { teamsService } from '@/services/teams.service';
import { scoresService } from '@/services/scores.service';
import Countdown from '@/components/Countdown';
import RichText from '@/components/RichText';
import type { Week, Activity, Team, Score } from '@/lib/database.types';

const ACTIVITY_TYPE_LABEL: Record<string, { emoji: string; label: string; cls: string }> = {
  normal: { emoji: '📘', label: 'Normal', cls: 'bg-slate-100 text-slate-700' },
  tiebreaker: { emoji: '⚖️', label: 'Desempate', cls: 'bg-amber-100 text-amber-800' },
  special: { emoji: '✨', label: 'Especial', cls: 'bg-fuchsia-100 text-fuchsia-800' },
};

const STATUS_LABEL: Record<string, { emoji: string; label: string; cls: string }> = {
  pending: { emoji: '🕒', label: 'Pendente', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { emoji: '🟢', label: 'Em andamento', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { emoji: '✅', label: 'Concluída', cls: 'bg-blue-100 text-blue-700' },
};

export default function WeekDetailPage() {
  const { weekId } = useParams<{ weekId: string }>();
  const [week, setWeek] = useState<Week | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weekId) return;
    let cancelled = false;
    async function load(id: string) {
      try {
        setLoading(true);
        const [w, a, t, s] = await Promise.all([
          weeksService.getById(id),
          activitiesService.listByWeek(id),
          teamsService.list(),
          scoresService.listByWeek(id),
        ]);
        if (cancelled) return;
        setWeek(w);
        setActivities(a);
        setTeams(t);
        setScores(s);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load(weekId);
    return () => {
      cancelled = true;
    };
  }, [weekId]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const scoresByActivity = useMemo(() => {
    const m = new Map<string, Score[]>();
    for (const s of scores) {
      const list = m.get(s.activity_id) ?? [];
      list.push(s);
      m.set(s.activity_id, list);
    }
    return m;
  }, [scores]);

  if (loading) return <p className="text-slate-500">Carregando...</p>;
  if (error) return <p className="text-brand-red">{error}</p>;
  if (!week) {
    return (
      <div className="card text-center space-y-2">
        <p>Semana não encontrada.</p>
        <Link to="/semanas" className="text-brand-teal hover:underline">
          Ver todas as semanas
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const isRunning =
    !week.closed_at &&
    week.start_date != null &&
    week.end_date != null &&
    week.start_date <= today &&
    today <= week.end_date;
  const isUpcoming =
    !week.closed_at && week.start_date != null && week.start_date > today;

  return (
    <div className="space-y-6">
      <Link to="/semanas" className="text-sm text-brand-teal hover:underline">
        ← Todas as semanas
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-teal p-6 md:p-10 text-white shadow-glow"
      >
        <p className="text-xs uppercase tracking-widest opacity-80">
          Semana {week.order_number}
        </p>
        <h1 className="heading-display text-3xl md:text-4xl font-bold mt-1">{week.name}</h1>
        {week.description && (
          <RichText
            text={week.description}
            className="mt-2 text-white/85 max-w-3xl"
          />
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
            {week.start_date ?? '—'} → {week.end_date ?? '—'}
          </span>
          {week.closed_at && (
            <span className="rounded-full bg-amber-300/20 px-3 py-1 text-xs">
              🏁 Encerrada
            </span>
          )}
          {isRunning && week.end_date && (
            <Countdown target={`${week.end_date}T23:59:59`} label="termina em" />
          )}
          {isUpcoming && week.start_date && (
            <Countdown target={`${week.start_date}T00:00:00`} label="começa em" />
          )}
        </div>
      </motion.section>

      <section>
        <h2 className="heading-display text-xl font-bold text-brand-navy mb-3">
          Atividades ({activities.length})
        </h2>

        {activities.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Nenhuma atividade cadastrada para esta semana.
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((a, i) => {
              const typeMeta = ACTIVITY_TYPE_LABEL[a.type] ?? ACTIVITY_TYPE_LABEL.normal;
              const statusMeta = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
              const scoresHere = (scoresByActivity.get(a.id) ?? []).slice().sort(
                (x, y) => Number(y.points) - Number(x.points),
              );
              return (
                <motion.article
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card overflow-hidden"
                >
                  <div className="flex flex-col gap-4 md:flex-row">
                    {a.photo_url && (
                      <img
                        src={a.photo_url}
                        alt=""
                        className="h-32 w-full md:w-48 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="heading-display text-lg font-bold text-brand-navy">
                          {a.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className={`badge ${typeMeta.cls}`}>
                            {typeMeta.emoji} {typeMeta.label}
                          </span>
                          <span className={`badge ${statusMeta.cls}`}>
                            {statusMeta.emoji} {statusMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span>📅 {a.activity_date ?? 'Sem data'}</span>
                        <span>🎯 Máx: {a.max_points} pts</span>
                      </div>

                      {a.description && (
                        <RichText
                          text={a.description}
                          className="mt-2 text-sm text-slate-600"
                        />
                      )}

                      {scoresHere.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                            Pontuações lançadas
                          </p>
                          <ul className="space-y-1">
                            {scoresHere.map((s) => {
                              const team = teamById.get(s.team_id);
                              const isMax = a.max_points > 0 && Number(s.points) === a.max_points;
                              return (
                                <li
                                  key={s.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-sm"
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="h-3 w-3 rounded-full shrink-0"
                                      style={{ backgroundColor: team?.color ?? '#94a3b8' }}
                                    />
                                    <Link
                                      to={`/equipes/${s.team_id}`}
                                      className="truncate text-slate-700 hover:underline"
                                    >
                                      {team?.name ?? 'Equipe'}
                                    </Link>
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      isMax ? 'text-brand-orange' : 'text-brand-navy'
                                    }`}
                                  >
                                    {s.points} pts {isMax && '🎯'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
