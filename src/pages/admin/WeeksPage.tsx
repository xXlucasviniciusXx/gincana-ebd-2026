import { useEffect, useState } from 'react';
import { weeksService } from '@/services/weeks.service';
import type { Week, WeekInsert } from '@/lib/database.types';

const emptyForm: WeekInsert = {
  name: '',
  description: '',
  start_date: null,
  end_date: null,
  order_number: 1,
  is_active: true,
};

export default function WeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [form, setForm] = useState<WeekInsert>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setWeeks(await weeksService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: WeekInsert = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editingId) {
        await weeksService.update(editingId, payload);
      } else {
        await weeksService.create(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function handleEdit(w: Week) {
    setEditingId(w.id);
    setForm({
      name: w.name,
      description: w.description ?? '',
      start_date: w.start_date,
      end_date: w.end_date,
      order_number: w.order_number,
      is_active: w.is_active,
    });
  }

  async function handleClose(id: string) {
    if (!confirm('Encerrar esta semana? Você ainda pode reabrir depois.')) return;
    await weeksService.close(id);
    await load();
  }

  async function handleReopen(id: string) {
    await weeksService.reopen(id);
    await load();
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir esta semana? Atividades e pontuações associadas serão removidas.'))
      return;
    try {
      await weeksService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Semanas</h1>
        <p className="text-sm text-slate-600">
          Cada semana agrupa atividades. Você pode encerrar uma semana sem encerrar a
          gincana inteira.
        </p>
      </header>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">
          {editingId ? 'Editar semana' : 'Nova semana'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <span className="text-xs font-medium text-slate-600">Ordem</span>
            <input
              type="number"
              required
              className="input"
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: Number(e.target.value) })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Início</span>
            <input
              type="date"
              className="input"
              value={form.start_date ?? ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Fim</span>
            <input
              type="date"
              className="input"
              value={form.end_date ?? ''}
              onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
            />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Descrição</span>
            <textarea
              className="input min-h-[80px]"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Ativa
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            {editingId ? 'Salvar' : 'Criar semana'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-ghost">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Período</th>
              <th className="px-4 py-2">Status</th>
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
              weeks.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{w.order_number}</td>
                  <td className="px-4 py-2 font-medium">{w.name}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {w.start_date ?? '—'} → {w.end_date ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    {w.closed_at ? (
                      <span className="badge bg-amber-100 text-amber-800">Encerrada</span>
                    ) : w.is_active ? (
                      <span className="badge bg-emerald-100 text-emerald-800">Aberta</span>
                    ) : (
                      <span className="badge bg-slate-200 text-slate-600">Inativa</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-3">
                    {w.closed_at ? (
                      <button
                        type="button"
                        onClick={() => handleReopen(w.id)}
                        className="text-emerald-700 hover:underline"
                      >
                        Reabrir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClose(w.id)}
                        className="text-amber-700 hover:underline"
                      >
                        Encerrar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(w)}
                      className="text-brand-teal hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(w.id)}
                      className="text-brand-red hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && weeks.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={5}>
                  Nenhuma semana cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
