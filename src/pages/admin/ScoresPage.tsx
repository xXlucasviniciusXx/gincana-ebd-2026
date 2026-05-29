import { useEffect, useState } from 'react';
import { scoresService } from '@/services/scores.service';
import { teamsService } from '@/services/teams.service';
import { activitiesService } from '@/services/activities.service';
import { useAuth } from '@/contexts/AuthContext';
import { playSound } from '@/lib/sounds';
import type { Score, Team, Activity } from '@/lib/database.types';

export default function ScoresPage() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Score[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamId, setTeamId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [points, setPoints] = useState<number>(0);
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [s, t, a] = await Promise.all([
        scoresService.list(),
        teamsService.list(),
        activitiesService.list(),
      ]);
      setScores(s);
      setTeams(t);
      setActivities(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!teamId || !activityId) {
      setError('Selecione equipe e atividade.');
      return;
    }
    try {
      await scoresService.upsert({
        team_id: teamId,
        activity_id: activityId,
        points,
        observation: observation || null,
        registered_by: user?.id ?? null,
      });
      playSound('score');
      setPoints(0);
      setObservation('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao lançar pontuação');
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir esta pontuação?')) return;
    try {
      await scoresService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
  const activityName = (id: string) => activities.find((a) => a.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Pontuações</h1>
        <p className="text-sm text-slate-600">
          Lançamentos são únicos por par (equipe, atividade) — relançar substitui o valor.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Lançar pontuação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Equipe</span>
            <select
              required
              className="input"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Atividade</span>
            <select
              required
              className="input"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Pontos</span>
            <input
              type="number"
              required
              className="input"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Observação</span>
            <input
              className="input"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Lançar
        </button>
      </form>

      <section className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Equipe</th>
              <th className="px-4 py-2">Atividade</th>
              <th className="px-4 py-2">Pontos</th>
              <th className="px-4 py-2">Observação</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={5}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading &&
              scores.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{teamName(s.team_id)}</td>
                  <td className="px-4 py-2 text-slate-600">{activityName(s.activity_id)}</td>
                  <td className="px-4 py-2 font-medium">{s.points}</td>
                  <td className="px-4 py-2 text-slate-600">{s.observation ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(s.id)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && scores.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={5}>
                  Nenhuma pontuação lançada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
