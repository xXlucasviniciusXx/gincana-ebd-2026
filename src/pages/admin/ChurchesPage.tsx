import { useEffect, useState } from 'react';
import { churchesService } from '@/services/churches.service';
import ImageUpload from '@/components/ImageUpload';
import type { Church, ChurchInsert } from '@/lib/database.types';

const emptyForm: ChurchInsert = {
  name: '',
  city: '',
  color: '#0b1f4d',
  logo_url: '',
  is_active: true,
};

export default function ChurchesPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [form, setForm] = useState<ChurchInsert>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setChurches(await churchesService.list());
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
      if (editingId) {
        await churchesService.update(editingId, form);
      } else {
        await churchesService.create(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function handleEdit(church: Church) {
    setEditingId(church.id);
    setForm({
      name: church.name,
      city: church.city ?? '',
      color: church.color,
      logo_url: church.logo_url ?? '',
      is_active: church.is_active,
    });
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir esta igreja? As equipes vinculadas perderão a associação.')) return;
    try {
      await churchesService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Igrejas</h1>
        <p className="text-sm text-slate-600">
          As igrejas agrupam equipes e aparecem no ranking por igreja.
        </p>
      </header>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">
          {editingId ? 'Editar igreja' : 'Nova igreja'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome da igreja">
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Cidade">
            <input
              className="input"
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
          <Field label="Cor representativa">
            <input
              type="color"
              className="h-10 w-full rounded-lg border border-slate-300"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </Field>
          <div>
            <ImageUpload
              label="Logo da igreja"
              folder="churches/logos"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
            />
          </div>
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
            {editingId ? 'Salvar alterações' : 'Criar igreja'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-ghost">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Igreja</th>
              <th className="px-4 py-2">Cidade</th>
              <th className="px-4 py-2">Ativa</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={4}>
                  Carregando...
                </td>
              </tr>
            )}
            {!loading &&
              churches.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="h-6 w-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                      )}
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.city ?? '—'}</td>
                  <td className="px-4 py-2">{c.is_active ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="text-brand-teal hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(c.id)}
                      className="text-brand-red hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && churches.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={4}>
                  Nenhuma igreja cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
