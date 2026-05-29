import { useEffect, useMemo, useState } from 'react';
import { weeksService } from '@/services/weeks.service';
import { activitiesService } from '@/services/activities.service';
import { teamsService } from '@/services/teams.service';
import { scoresService } from '@/services/scores.service';
import { useAuth } from '@/contexts/AuthContext';
import { playSound } from '@/lib/sounds';
import type {
  Week,
  Activity,
  Team,
  Score,
  ScoreInsert,
} from '@/lib/database.types';

type DraftRow = {
  activity: Activity;
  points: string;
  observation: string;
  existingScoreId: string | null;
};

export default function QuickScoringPage() {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [weekId, setWeekId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Carga inicial
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [w, t] = await Promise.all([weeksService.list(), teamsService.list()]);
        if (cancelled) return;
        setWeeks(w);
        setTeams(t);
        if (w.length > 0) setWeekId(w[0].id);
        if (t.length > 0) setTeamId(t[0].id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Quando semana muda, recarrega atividades + pontuações da semana
  useEffect(() => {
    if (!weekId) return;
    let cancelled = false;
    async function load(id: string) {
      const [acts, weekScores] = await Promise.all([
        activitiesService.listByWeek(id),
        scoresService.listByWeek(id),
      ]);
      if (cancelled) return;
      setActivities(acts);
      setScores(weekScores);
    }
    load(weekId);
    return () => {
      cancelled = true;
    };
  }, [weekId]);

  // Reconstrói o draft toda vez que mudam atividades, scores ou time selecionado
  useEffect(() => {
    const rows: DraftRow[] = activities.map((act) => {
      const existing = scores.find(
        (s) => s.activity_id === act.id && s.team_id === teamId,
      );
      return {
        activity: act,
        points: existing ? String(existing.points) : '',
        observation: existing?.observation ?? '',
        existingScoreId: existing?.id ?? null,
      };
    });
    setDraft(rows);
  }, [activities, scores, teamId]);

  const week = useMemo(() => weeks.find((w) => w.id === weekId), [weeks, weekId]);
  const team = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);
  const draftTotal = draft.reduce((sum, r) => sum + Number(r.points || 0), 0);
  const maxTotal = draft.reduce((sum, r) => sum + Number(r.activity.max_points || 0), 0);

  function updateRow(idx: number, patch: Partial<DraftRow>) {
    setDraft((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function fillMax() {
    setDraft((prev) =>
      prev.map((row) => ({ ...row, points: String(row.activity.max_points ?? 0) })),
    );
  }

  function fillZero() {
    setDraft((prev) => prev.map((row) => ({ ...row, points: '0' })));
  }

  function clearAll() {
    setDraft((prev) => prev.map((row) => ({ ...row, points: '', observation: '' })));
  }

  async function saveAll(partial = false) {
    if (!teamId) return;
    setBusy(true);
    setMessage(null);
    try {
      const payloads: ScoreInsert[] = draft
        .filter((row) => {
          if (partial) return row.points !== '' && row.points !== null;
          return true;
        })
        .map((row) => ({
          team_id: teamId,
          activity_id: row.activity.id,
          points: Number(row.points || 0),
          observation: row.observation || null,
          registered_by: user?.id ?? null,
        }));

      if (payloads.length === 0) {
        setMessage({ kind: 'err', text: 'Nada para salvar.' });
        return;
      }

      await scoresService.upsertMany(payloads);
      // Recarrega scores da semana
      const fresh = await scoresService.listByWeek(weekId);
      setScores(fresh);
      playSound('score');
      setMessage({
        kind: 'ok',
        text: `${payloads.length} lançamento(s) salvo(s) para ${team?.name}.`,
      });
    } catch (e) {
      setMessage({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Erro ao salvar',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">
          Lançamento rápido
        </h1>
        <p className="text-sm text-slate-600">
          Selecione semana e equipe, ajuste pontos e salve em lote. Usa upsert por
          (equipe, atividade).
        </p>
      </header>

      {message && (
        <div
          className={`rounded-xl px-4 py-2 text-sm ${
            message.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="card grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Semana</span>
          <select className="input" value={weekId} onChange={(e) => setWeekId(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.closed_at ? '(encerrada)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Equipe</span>
          <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {week?.closed_at && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ⚠️ Esta semana está encerrada. Você ainda pode editar lançamentos enquanto a
          gincana estiver aberta.
        </div>
      )}

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-brand-navy">
              {team?.name} · {week?.name}
            </h2>
            <p className="text-xs text-slate-500">
              {draft.length} atividade(s) · Total parcial:{' '}
              <span className="font-bold text-brand-navy">{draftTotal}</span> / {maxTotal}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={fillMax} className="btn-accent">
              ⚡ Pontuação máxima
            </button>
            <button type="button" onClick={fillZero} className="btn-ghost">
              0 Zerar todas
            </button>
            <button type="button" onClick={clearAll} className="btn-ghost">
              Limpar
            </button>
          </div>
        </div>

        {draft.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Nenhuma atividade cadastrada para esta semana.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2">Atividade</th>
                  <th className="py-2 w-20">Máx</th>
                  <th className="py-2 w-24">Pontos</th>
                  <th className="py-2">Observação</th>
                  <th className="py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {draft.map((row, idx) => (
                  <tr key={row.activity.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium text-brand-navy">{row.activity.name}</div>
                      {row.activity.description && (
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {row.activity.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-slate-500">{row.activity.max_points}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        className="input py-1"
                        value={row.points}
                        onChange={(e) => updateRow(idx, { points: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input py-1"
                        placeholder="opcional"
                        value={row.observation}
                        onChange={(e) => updateRow(idx, { observation: e.target.value })}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-brand-teal hover:underline"
                        onClick={() =>
                          updateRow(idx, {
                            points: String(row.activity.max_points ?? 0),
                          })
                        }
                      >
                        máx
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {draft.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => saveAll(true)}
              disabled={busy}
              className="btn-ghost"
              title="Salva só as linhas com valor preenchido"
            >
              Salvar parcial
            </button>
            <button
              type="button"
              onClick={() => saveAll(false)}
              disabled={busy}
              className="btn-primary"
            >
              {busy ? 'Salvando...' : 'Salvar todos os lançamentos'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
