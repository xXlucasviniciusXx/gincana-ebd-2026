import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { competitionService } from '@/services/competition.service';
import { rankingService } from '@/services/ranking.service';
import { teamsService } from '@/services/teams.service';
import { weeksService } from '@/services/weeks.service';
import { activitiesService } from '@/services/activities.service';
import { badgesService } from '@/services/badges.service';
import NewsFeed from '@/components/NewsFeed';
import { playSound } from '@/lib/sounds';
import type {
  CompetitionSettings,
  TeamRanking,
  Team,
  Week,
  Activity,
} from '@/lib/database.types';

export default function DashboardPage() {
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [ranking, setRanking] = useState<TeamRanking[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [s, r, t, w, a] = await Promise.all([
        competitionService.get(),
        rankingService.list(),
        teamsService.list(),
        weeksService.list(),
        activitiesService.list(),
      ]);
      setSettings(s);
      setRanking(r);
      setTeams(t);
      setWeeks(w);
      setActivities(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleClose() {
    if (!confirm('Tem certeza que deseja encerrar a gincana?')) return;
    setBusy(true);
    try {
      const updated = await competitionService.close();
      setSettings(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao encerrar');
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    if (!confirm('Reabrir a gincana? O lançamento de pontos será liberado novamente.'))
      return;
    setBusy(true);
    try {
      const updated = await competitionService.reopen();
      setSettings(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reabrir');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>;

  const stats = [
    { label: 'Equipes', value: teams.length, color: 'from-brand-teal to-emerald-500' },
    { label: 'Semanas', value: weeks.length, color: 'from-brand-yellow to-amber-500' },
    { label: 'Atividades', value: activities.length, color: 'from-brand-orange to-red-400' },
    { label: 'Lançamentos', value: ranking.reduce((sum, r) => sum + r.scores_count, 0), color: 'from-brand-navy to-brand-navy-light' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Painel</h1>
        <p className="text-sm text-slate-600">
          {settings?.competition_name ?? 'Gincana EBD 2026'} —{' '}
          <span
            className={
              settings?.status === 'closed'
                ? 'text-amber-700 font-semibold'
                : 'text-emerald-700 font-semibold'
            }
          >
            {settings?.status === 'closed' ? 'encerrada' : 'aberta'}
          </span>
        </p>
      </header>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl bg-gradient-to-br ${s.color} p-4 text-white shadow-card`}
          >
            <div className="text-xs uppercase tracking-wider opacity-80">{s.label}</div>
            <div className="text-3xl font-extrabold">{s.value}</div>
          </motion.div>
        ))}
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-navy">Ranking atual</h2>
          <Link to="/admin/lancamento-rapido" className="text-sm text-brand-teal hover:underline">
            ⚡ Lançar pontos
          </Link>
        </div>
        <ol className="space-y-1 text-sm">
          {ranking.slice(0, 5).map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between border-b py-2 last:border-0"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono w-6 text-right text-slate-400">
                  {row.rank_position}º
                </span>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.name}
              </span>
              <span className="font-bold text-brand-navy">{row.total_points} pts</span>
            </li>
          ))}
          {ranking.length === 0 && (
            <li className="text-slate-500">Nenhuma equipe no ranking.</li>
          )}
        </ol>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">Conquistas</h2>
        <p className="text-xs text-slate-500">
          O recálculo é automático após qualquer lançamento de pontos. Use o botão se
          quiser forçar uma varredura completa.
        </p>
        <RecalcBadgesButton />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">Feed recente</h2>
        <NewsFeed limit={10} live={false} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">Estado da gincana</h2>
        {settings?.status === 'open' ? (
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="btn-danger"
          >
            🏁 Encerrar gincana
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReopen}
            disabled={busy}
            className="btn-teal"
          >
            🔓 Reabrir gincana
          </button>
        )}

        {settings?.has_tie && (
          <TiebreakerPanel
            ranking={ranking}
            settings={settings}
            onResolved={load}
          />
        )}
      </section>
    </div>
  );
}

function RecalcBadgesButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setMsg(null);
    try {
      const { granted, revoked, unresolved_weeks } = await badgesService.recalculate();
      const parts: string[] = [];
      if (granted) parts.push(`${granted} concedida(s)`);
      if (revoked) parts.push(`${revoked} revogada(s)`);
      if (unresolved_weeks)
        parts.push(`⚠️ ${unresolved_weeks} semana(s) com empate não resolvido pela cascata`);
      setMsg(parts.length === 0 ? 'Tudo em dia — nada a alterar.' : parts.join(' · '));
      if (granted > 0) playSound('badge');
      else if (revoked > 0 || unresolved_weeks > 0) playSound('success');
      else playSound('tick'); // "tudo em dia" — feedback discreto de que rodou
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erro ao recalcular');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handle} disabled={busy} className="btn-accent">
        {busy ? 'Recalculando...' : '🏅 Recalcular conquistas'}
      </button>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}

function TiebreakerPanel({
  ranking,
  settings,
  onResolved,
}: {
  ranking: TeamRanking[];
  settings: CompetitionSettings;
  onResolved: () => Promise<void>;
}) {
  const topPoints = ranking[0]?.total_points ?? 0;
  const leaders = ranking.filter((r) => r.total_points === topPoints && topPoints > 0);
  const [selected, setSelected] = useState<string>(settings.champion_team_id ?? '');
  const [note, setNote] = useState(settings.tiebreaker_note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve() {
    if (!selected) {
      setError('Selecione a equipe campeã.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await competitionService.resolveTiebreaker(settings.id, selected, note || null);
      await onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao resolver desempate');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-xl">⚖️</span>
        <div>
          <h3 className="font-semibold text-amber-900">Empate no primeiro lugar</h3>
          <p className="text-xs text-amber-800">
            {leaders.length} equipes empatadas com {topPoints} pts. Você pode cadastrar uma
            atividade de desempate, ou definir a campeã manualmente abaixo.
          </p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-amber-900">Definir campeã manualmente</span>
        <select
          className="input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecione...</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.total_points} pts
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-amber-900">
          Critério usado (opcional, exibido na página da campeã)
        </span>
        <input
          className="input"
          placeholder="Ex.: Vencedora do desafio bíblico relâmpago"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <button
        type="button"
        onClick={handleResolve}
        disabled={busy}
        className="btn-accent"
      >
        {busy ? 'Salvando...' : '👑 Confirmar campeã'}
      </button>
    </div>
  );
}
