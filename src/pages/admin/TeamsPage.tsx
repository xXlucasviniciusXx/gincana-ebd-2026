import { useEffect, useState } from 'react';
import { teamsService } from '@/services/teams.service';
import ImageUpload from '@/components/ImageUpload';
import type { Team, TeamInsert } from '@/lib/database.types';

const emptyForm: TeamInsert = {
  name: '',
  color: '#2ea3a5',
  leader_name: '',
  bible_reference: '',
  theme_verse: '',
  war_cry: '',
  bio: '',
  instagram_url: '',
  photo_url: '',
  banner_url: '',
  is_active: true,
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState<TeamInsert>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setTeams(await teamsService.list());
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
        await teamsService.update(editingId, form);
      } else {
        await teamsService.create(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function handleEdit(team: Team) {
    setEditingId(team.id);
    setForm({
      name: team.name,
      color: team.color,
      leader_name: team.leader_name ?? '',
      bible_reference: team.bible_reference ?? '',
      theme_verse: team.theme_verse ?? '',
      war_cry: team.war_cry ?? '',
      bio: team.bio ?? '',
      instagram_url: team.instagram_url ?? '',
      photo_url: team.photo_url ?? '',
      banner_url: team.banner_url ?? '',
      is_active: team.is_active,
    });
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir esta equipe? Integrantes e pontuações também serão removidos.')) {
      return;
    }
    try {
      await teamsService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Equipes</h1>
        <p className="text-sm text-slate-600">
          CRUD completo com perfil estendido. Fotos podem ser coladas como URL (upload via
          Storage virá na fase 2).
        </p>
      </header>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">
          {editingId ? 'Editar equipe' : 'Nova equipe'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome">
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Cor da equipe">
            <input
              type="color"
              className="h-10 w-full rounded-lg border border-slate-300"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </Field>
          <Field label="Líder">
            <input
              className="input"
              value={form.leader_name ?? ''}
              onChange={(e) => setForm({ ...form, leader_name: e.target.value })}
            />
          </Field>
          <Field label="Referência bíblica">
            <input
              className="input"
              value={form.bible_reference ?? ''}
              onChange={(e) => setForm({ ...form, bible_reference: e.target.value })}
            />
          </Field>
          <Field label="Versículo tema" className="md:col-span-2">
            <input
              className="input"
              value={form.theme_verse ?? ''}
              onChange={(e) => setForm({ ...form, theme_verse: e.target.value })}
            />
          </Field>
          <Field label="Grito de guerra" className="md:col-span-2">
            <input
              className="input"
              value={form.war_cry ?? ''}
              onChange={(e) => setForm({ ...form, war_cry: e.target.value })}
            />
          </Field>
          <Field label="Bio / apresentação" className="md:col-span-2">
            <textarea
              className="input min-h-[100px]"
              value={form.bio ?? ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </Field>
          <Field label="Instagram (URL completa)">
            <input
              type="url"
              className="input"
              placeholder="https://instagram.com/..."
              value={form.instagram_url ?? ''}
              onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
            />
          </Field>
          <div>
            <ImageUpload
              label="Foto/escudo"
              folder="teams/photos"
              value={form.photo_url}
              onChange={(url) => setForm({ ...form, photo_url: url })}
            />
          </div>
          <div className="md:col-span-2">
            <ImageUpload
              label="Banner"
              folder="teams/banners"
              aspect="banner"
              value={form.banner_url}
              onChange={(url) => setForm({ ...form, banner_url: url })}
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
            {editingId ? 'Salvar alterações' : 'Criar equipe'}
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
              <th className="px-4 py-2">Equipe</th>
              <th className="px-4 py-2">Líder</th>
              <th className="px-4 py-2">Instagram</th>
              <th className="px-4 py-2">Ativa</th>
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
              teams.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-4 py-2 flex items-center gap-2">
                    {t.photo_url ? (
                      <img
                        src={t.photo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="h-6 w-6 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                    )}
                    <span className="font-medium">{t.name}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{t.leader_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    {t.instagram_url ? (
                      <a
                        href={t.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal hover:underline"
                      >
                        ver
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">{t.is_active ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="text-brand-teal hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(t.id)}
                      className="text-brand-red hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && teams.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={5}>
                  Nenhuma equipe cadastrada.
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
