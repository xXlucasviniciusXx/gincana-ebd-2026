import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { rankingService } from '@/services/ranking.service';
import { competitionService } from '@/services/competition.service';
import { weeksService } from '@/services/weeks.service';
import { teamsService } from '@/services/teams.service';
import { churchesService } from '@/services/churches.service';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import Countdown from '@/components/Countdown';
import NewsFeed from '@/components/NewsFeed';
import ShareButtons from '@/components/ShareButtons';
import type {
  TeamRanking,
  CompetitionSettings,
  Week,
  Team,
  Church,
} from '@/lib/database.types';

type Mode = 'general' | 'weekly' | 'church';

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
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

      if (mode === 'church') {
        // Ranking por igreja: equipes competem dentro da propria igreja.
        // Buscamos o ranking geral (pontos por equipe) + equipes (church_id)
        // + igrejas, e agrupamos no cliente.
        const [r, t, c] = await Promise.all([
          rankingService.list(),
          teamsService.list(),
          churchesService.list(),
        ]);
        setRanking(r);
        setTeams(t);
        setChurches(c);
      } else {
        const r =
          mode === 'general'
            ? await rankingService.list()
            : await rankingService.byWeek(selectedWeek || w[w.length - 1]?.id || '');
        setRanking(r);
      }

      if (mode !== 'church') {
        const relevant = pickRelevantWeek(w);
        if (relevant && relevant.phase === 'running') {
          const weekRank = await rankingService.byWeek(relevant.week.id);
          const leader =
            weekRank.find((row) => row.rank_position === 1 && row.total_points > 0) ?? null;
          setWeekLeader(leader);
        } else {
          setWeekLeader(null);
        }
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

  // Realtime: recarrega ranking quando muda algum score ou estado de semana
  useRealtimeTable('scores', load);
  useRealtimeTable('weeks', load);
  useRealtimeTable('competition_settings', load);

  const podium = useMemo(() => ranking.slice(0, 3), [ranking]);
  const rest = useMemo(() => ranking.slice(3), [ranking]);
  const topPoints = ranking[0]?.total_points ?? 0;
  const relevantWeek = useMemo(() => pickRelevantWeek(weeks), [weeks]);

  // Para a aba "Por igreja": cada igreja ativa com suas equipes ranqueadas
  // internamente (1o, 2o, 3o... dentro da propria igreja).
  const churchGroups = useMemo(() => {
    if (mode !== 'church') return [];
    const pointsByTeam = new Map(ranking.map((r) => [r.id, r.total_points]));
    return churches
      .filter((c) => c.is_active)
      .map((church) => {
        const churchTeams = teams
          .filter((t) => t.is_active && t.church_id === church.id)
          .map((t) => ({ team: t, points: pointsByTeam.get(t.id) ?? 0 }))
          .sort((a, b) => b.points - a.points);
        const total = churchTeams.reduce((sum, x) => sum + x.points, 0);
        return { church, teams: churchTeams, total };
      });
  }, [mode, churches, teams, ranking]);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-teal text-white shadow-glow">
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-brand-yellow blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-brand-orange blur-3xl" />
        </div>
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest">
              {settings?.status === 'closed' ? 'Gincana encerrada' : 'Em andamento'}
            </p>
            {settings?.status !== 'closed' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Ao vivo
              </span>
            )}
          </div>
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
          <button
            type="button"
            onClick={() => setMode('church')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              mode === 'church'
                ? 'bg-brand-navy text-white'
                : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            Por igreja
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

      {/* RANKING POR IGREJA — cada igreja tem seu proprio ranking de equipes */}
      {mode === 'church' && (
        <div className="space-y-8">
          {loading && <p className="text-slate-500">Carregando...</p>}
          {error && <p className="text-brand-red">{error}</p>}

          {!loading &&
            churchGroups.map((group, gi) => (
              <motion.section
                key={group.church.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.06 }}
                className="rounded-3xl border-2 p-4 md:p-5"
                style={{ borderColor: `${group.church.color}33` }}
              >
                {/* Cabecalho da igreja */}
                <div
                  className="flex items-center gap-3 rounded-2xl p-3 text-white shadow-card"
                  style={{
                    background: `linear-gradient(135deg, ${group.church.color}, #0b1f4d)`,
                  }}
                >
                  {group.church.logo_url ? (
                    <img
                      src={group.church.logo_url}
                      alt={group.church.name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-white/40 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                      ⛪
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="heading-display text-xl font-bold truncate">
                      {group.church.name}
                    </h2>
                    <p className="text-xs opacity-80">
                      {group.church.city ? `${group.church.city} · ` : ''}
                      {group.teams.length} equipe{group.teams.length !== 1 ? 's' : ''} ·{' '}
                      {group.total} pts no total
                    </p>
                  </div>
                </div>

                {/* Ranking das equipes dentro da igreja */}
                <div className="mt-3 space-y-2">
                  {group.teams.map((row, idx) => {
                    const position = idx + 1;
                    const m = medals[position];
                    return (
                      <div
                        key={row.team.id}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                          m ? 'bg-gradient-to-r ' + m.color : 'bg-white shadow-card'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 text-center text-lg font-bold text-brand-navy">
                            {m ? m.emoji : `${position}º`}
                          </span>
                          <span
                            className="h-5 w-5 rounded-full border border-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: row.team.color }}
                            aria-hidden
                          />
                          <Link
                            to={`/equipes/${row.team.id}`}
                            className="font-semibold text-brand-navy hover:underline truncate"
                          >
                            {row.team.name}
                          </Link>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xl font-bold text-brand-navy">
                            {row.points}
                          </span>
                          <span className="text-xs text-brand-navy/70"> pts</span>
                        </div>
                      </div>
                    );
                  })}
                  {group.teams.length === 0 && (
                    <p className="text-sm text-slate-500 px-3 py-2">
                      Nenhuma equipe nesta igreja ainda.
                    </p>
                  )}
                </div>
              </motion.section>
            ))}

          {!loading && churchGroups.length === 0 && (
            <p className="text-slate-500">Nenhuma igreja cadastrada ainda.</p>
          )}
        </div>
      )}

      {/* PODIUM */}
      {mode !== 'church' && !loading && podium.length > 0 && (
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
      {mode !== 'church' && <section>
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
      </section>}

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
