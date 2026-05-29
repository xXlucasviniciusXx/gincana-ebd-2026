import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { rankingService } from '@/services/ranking.service';
import { competitionService } from '@/services/competition.service';
import { weeksService } from '@/services/weeks.service';
import Countdown from '@/components/Countdown';
import NewsFeed from '@/components/NewsFeed';
import ShareButtons from '@/components/ShareButtons';
import type {
  TeamRanking,
  CompetitionSettings,
  Week,
} from '@/lib/database.types';

type Mode = 'general' | 'weekly';

const medals: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '🥇', label: '1º lugar', color: 'from-amber-300 to-yellow-500' },
  2: { emoji: '🥈', label: '2º lugar', color: 'from-slate-200 to-slate-400' },
  3: { emoji: '🥉', label: '3º lugar', color: 'from-orange-300 to-orange-500' },
};

// Escolhe a semana mais relevante para o banner público:
// 1) a que está em andamento agora (today entre start e end)
// 2) a próxima que ainda vai começar
// 3) null
function pickRelevantWeek(weeks: Week[]):
  | { week: Week; phase: 'running' | 'upcoming' }
  | null {
  const today = new Date().toISOString().slice(0, 10);
  const open = weeks.filter((w) => w.is_active && !w.closed_at);

  const running = open.find(
    (w) => w.start_date && w.end_date && w.start_date <= today && today <= w.end_date,
  );
  if (running) return { week: running, phase: 'running' };

  const upcoming = open
    .filter((w) => w.start_date && w.start_date > today)
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))[0];
  if (upcoming) return { week: upcoming, phase: 'upcoming' };

  return null;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<TeamRanking[]>([]);
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekLeader, setWeekLeader] = useState<TeamRanking | null>(null);
  const [mode, setMode] = useState<Mode>('general');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [s, w] = await Promise.all([competitionService.get(), weeksService.list()]);
      setSettings(s);
      setWeeks(w);
      if (!selectedWeek && w.length > 0) {
        setSelectedWeek(w[w.length - 1].id);
      }

      const r =
        mode === 'general'
          ? await rankingService.list()
          : await rankingService.byWeek(selectedWeek || w[w.length - 1]?.id || '');
      setRanking(r);

      // "Equipe da semana" = líder da semana que está em andamento AGORA
      const relevant = pickRelevantWeek(w);
      if (relevant && relevant.phase === 'running') {
        const weekRank = await rankingService.byWeek(relevant.week.id);
        const leader =
          weekRank.find((row) => row.rank_position === 1 && row.total_points > 0) ?? null;
        setWeekLeader(leader);
      } else {
        setWeekLeader(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar ranking');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedWeek]);

  const podium = useMemo(() => ranking.slice(0, 3), [ranking]);
  const rest = useMemo(() => ranking.slice(3), [ranking]);
  const topPoints = ranking[0]?.total_points ?? 0;
  const relevantWeek = useMemo(() => pickRelevantWeek(weeks), [weeks]);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-teal text-white shadow-glow">
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-brand-yellow blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-brand-orange blur-3xl" />
        </div>
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest">
            {settings?.status === 'closed' ? 'Gincana encerrada' : 'Em andamento'}
          </p>
          <h1 className="mt-3 heading-display text-3xl md:text-5xl font-bold">
            {settings?.competition_name ?? 'Gincana EBD 2026'}
          </h1>
          {settings?.theme && (
            <p className="mt-2 text-lg md:text-xl text-white/90 italic">"{settings.theme}"</p>
          )}
          {settings?.general_verse && (
            <p className="mt-1 text-sm text-white/70">
              {settings.general_verse}
              {settings.general_bible_reference && ` — ${settings.general_bible_reference}`}
            </p>
          )}
        </div>
      </section>

      {/* Equipe da semana + Countdown */}
      {(weekLeader || relevantWeek) && (
        <section className="grid gap-3 md:grid-cols-2">
          {weekLeader && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="card flex items-center gap-3"
            >
              <div className="text-3xl">⭐</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Equipe da semana
                </p>
                <Link
                  to={`/equipes/${weekLeader.id}`}
                  className="heading-display text-lg font-bold text-brand-navy hover:underline truncate block"
                >
                  {weekLeader.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {weekLeader.total_points} pts nesta semana
                </p>
              </div>
              <span
                className="h-10 w-10 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: weekLeader.color }}
              />
            </motion.div>
          )}
          {relevantWeek && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Link
                to={`/semanas/${relevantWeek.week.id}`}
                className="card flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="text-3xl">
                  {relevantWeek.phase === 'running' ? '⏰' : '📅'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    {relevantWeek.phase === 'running'
                      ? 'Encerramento da semana'
                      : 'Próxima semana começa em'}
                  </p>
                  <p className="heading-display text-lg font-bold text-brand-navy truncate">
                    {relevantWeek.week.name}
                  </p>
                  <div className="mt-1">
                    <Countdown
                      target={
                        relevantWeek.phase === 'running'
                          ? `${relevantWeek.week.end_date}T23:59:59`
                          : `${relevantWeek.week.start_date}T00:00:00`
                      }
                    />
                  </div>
                  <p className="mt-2 text-xs text-brand-teal font-medium">
                    Ver atividades →
                  </p>
                </div>
              </Link>
            </motion.div>
          )}
        </section>
      )}

      {/* TABS Ranking geral / semanal */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-card">
          <button
            type="button"
            onClick={() => setMode('general')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              mode === 'general'
                ? 'bg-brand-navy text-white'
                : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            Geral
          </button>
          <button
            type="button"
            onClick={() => setMode('weekly')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              mode === 'weekly'
                ? 'bg-brand-navy text-white'
                : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            Por semana
          </button>
        </div>
        {mode === 'weekly' && (
          <select
            className="input max-w-xs"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* PODIUM */}
      {!loading && podium.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {podium.map((row, idx) => {
            const rank = row.rank_position;
            const m = medals[rank] ?? medals[3];
            return (
              <motion.article
                key={row.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, type: 'spring', stiffness: 130 }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${m.color} p-5 text-brand-navy shadow-card ${
                  rank === 1 ? 'md:scale-[1.03] animate-pulse-ring ring-2 ring-amber-400/60' : ''
                }`}
              >
                <div className="absolute top-3 right-3 text-3xl drop-shadow-sm">{m.emoji}</div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                  {m.label}
                </p>
                <Link
                  to={`/equipes/${row.id}`}
                  className="heading-display mt-1 block text-2xl font-bold leading-tight hover:underline"
                >
                  {row.name}
                </Link>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-extrabold">{row.total_points}</div>
                    <div className="text-xs opacity-70">pontos</div>
                  </div>
                  <span
                    className="h-8 w-8 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                </div>
              </motion.article>
            );
          })}
        </section>
      )}

      {/* RESTO DO RANKING */}
      <section>
        <h2 className="heading-display text-xl font-bold text-brand-navy mb-3">
          Classificação completa
        </h2>
        {loading && <p className="text-slate-500">Carregando...</p>}
        {error && <p className="text-brand-red">{error}</p>}

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {rest.map((row) => {
              const diff = topPoints - row.total_points;
              const percent = topPoints > 0 ? (row.total_points / topPoints) * 100 : 0;
              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                  className="card flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-right font-bold text-slate-400">
                      {row.rank_position}º
                    </span>
                    <span
                      className="h-5 w-5 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    <Link
                      to={`/equipes/${row.id}`}
                      className="font-semibold text-brand-navy hover:underline"
                    >
                      {row.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block w-40 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand-teal to-brand-yellow"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-brand-navy">
                        {row.total_points}
                      </div>
                      {diff > 0 && (
                        <div className="text-xs text-slate-500">
                          -{diff} do líder
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!loading && ranking.length === 0 && (
            <p className="text-slate-500">Nenhuma equipe cadastrada ainda.</p>
          )}
        </div>
      </section>

      {/* Feed de novidades */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="heading-display text-xl font-bold text-brand-navy">📰 Novidades</h2>
          <Link to="/novidades" className="text-sm text-brand-teal hover:underline">
            Ver todas →
          </Link>
        </div>
        <NewsFeed limit={8} />
      </section>

      {/* Compartilhar */}
      <section className="card text-center">
        <p className="text-sm text-slate-600 mb-3">Chama a galera pra acompanhar 👇</p>
        <ShareButtons
          title={settings?.competition_name ?? 'Gincana EBD 2026'}
          text={`Acompanhe a ${settings?.competition_name ?? 'Gincana EBD 2026'} ao vivo!`}
          className="justify-center"
        />
      </section>
    </div>
  );
}
