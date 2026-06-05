import { useEffect, useState } from 'react';
import { activitiesService } from '@/services/activities.service';
import { weeksService } from '@/services/weeks.service';
import ImageUpload from '@/components/ImageUpload';
import type { Activity, ActivityInsert, Week } from '@/lib/database.types';

const emptyForm: ActivityInsert = {
  week_id: '',
  name: '',
  description: '',
  type: 'normal',
  max_points: 100,
  activity_date: null,
  status: 'pending',
  photo_url: null,
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [form, setForm] = useState<ActivityInsert>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [a, w] = await Promise.all([activitiesService.list(), weeksService.list()]);
      setActivities(a);
      setWeeks(w);
      if (!form.week_id && w.length > 0) {
        setForm((f) => ({ ...f, week_id: w[0].id }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm({ ...emptyForm, week_id: weeks[0]?.id ?? '' });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: ActivityInsert = {
        ...form,
        activity_date: form.activity_date || null,
      };
      if (editingId) {
        await activitiesService.update(editingId, payload);
      } else {
        await activitiesService.create(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function handleEdit(a: Activity) {
    setEditingId(a.id);
    setForm({
      week_id: a.week_id,
      name: a.name,
      description: a.description ?? '',
      type: a.type,
      max_points: a.max_points,
      activity_date: a.activity_date,
      status: a.status,
      photo_url: a.photo_url,
    });
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir esta atividade? Pontuações associadas serão removidas.')) return;
    try {
      await activitiesService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  const weekName = (id: string) => weeks.find((w) => w.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Atividades</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold">{editingId ? 'Editar atividade' : 'Nova atividade'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Semana</span>
            <select
              required
              className="input"
              value={form.week_id}
              onChange={(e) => setForm({ ...form, week_id: e.target.value })}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Nome</span>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Tipo</span>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="tiebreaker">Desempate</option>
              <option value="special">Especial</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Pontos máximos</span>
            <input
              type="number"
              className="input"
              value={form.max_points}
              onChange={(e) => setForm({ ...form, max_points: Number(e.target.value) })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Data</span>
            <input
              type="date"
              className="input"
              value={form.activity_date ?? ''}
              onChange={(e) => setForm({ ...form, activity_date: e.target.value || null })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Status</span>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="pending">Pendente</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluída</option>
            </select>
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Descrição</span>
            <textarea
              className="input min-h-[80px]"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <span className="text-[11px] text-slate-400">
              Dica: as quebras de linha são respeitadas. Use{' '}
              <code className="rounded bg-slate-100 px-1">**texto**</code> para{' '}
              <strong>negrito</strong> e{' '}
              <code className="rounded bg-slate-100 px-1">*texto*</code> para{' '}
              <em>itálico</em>.
            </span>
          </label>
          <div className="md:col-span-2 md:w-1/2">
            <ImageUpload
              label="Foto da atividade"
              folder="activities/photos"
              value={form.photo_url}
              onChange={(url) => setForm({ ...form, photo_url: url })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {editingId ? 'Salvar' : 'Criar atividade'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border px-4 py-2 text-sm hover:bg-slate-100"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Atividade</th>
              <th className="px-4 py-2">Semana</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={6}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading &&
              activities.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2 text-slate-600">{weekName(a.week_id)}</td>
                  <td className="px-4 py-2 text-slate-600">{a.type}</td>
                  <td className="px-4 py-2 text-slate-600">{a.status}</td>
                  <td className="px-4 py-2 text-slate-600">{a.activity_date ?? '—'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(a)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(a.id)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && activities.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={6}>
                  Nenhuma atividade cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
