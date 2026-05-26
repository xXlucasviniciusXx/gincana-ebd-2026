import { useEffect, useState } from 'react';
import { membersService } from '@/services/members.service';
import { teamsService } from '@/services/teams.service';
import ImageUpload from '@/components/ImageUpload';
import type { Member, MemberInsert, Team } from '@/lib/database.types';

const emptyForm: MemberInsert = {
  team_id: '',
  name: '',
  role: '',
  photo_url: '',
  is_active: true,
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState<MemberInsert>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [m, t] = await Promise.all([membersService.list(), teamsService.list()]);
      setMembers(m);
      setTeams(t);
      if (!form.team_id && t.length > 0) {
        setForm((f) => ({ ...f, team_id: t[0].id }));
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
    setForm({ ...emptyForm, team_id: teams[0]?.id ?? '' });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await membersService.update(editingId, form);
      } else {
        await membersService.create(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function handleEdit(m: Member) {
    setEditingId(m.id);
    setForm({
      team_id: m.team_id,
      name: m.name,
      role: m.role ?? '',
      photo_url: m.photo_url ?? '',
      is_active: m.is_active,
    });
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir este integrante?')) return;
    try {
      await membersService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Integrantes</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold">{editingId ? 'Editar integrante' : 'Novo integrante'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Equipe</span>
            <select
              required
              className="input"
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
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
            <span className="text-xs font-medium text-slate-600">Nome</span>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Papel</span>
            <input
              className="input"
              value={form.role ?? ''}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </label>
          <div className="md:col-span-2 md:w-1/2">
            <ImageUpload
              label="Foto"
              folder="members/photos"
              value={form.photo_url}
              onChange={(url) => setForm({ ...form, photo_url: url })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Ativo
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {editingId ? 'Salvar' : 'Adicionar'}
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
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Equipe</th>
              <th className="px-4 py-2">Papel</th>
              <th className="px-4 py-2">Ativo</th>
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
              members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2 text-slate-600">{teamName(m.team_id)}</td>
                  <td className="px-4 py-2 text-slate-600">{m.role ?? '—'}</td>
                  <td className="px-4 py-2">{m.is_active ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(m)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && members.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={5}>
                  Nenhum integrante cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
