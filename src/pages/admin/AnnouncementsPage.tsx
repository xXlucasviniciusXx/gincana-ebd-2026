import { useEffect, useState } from 'react';
import { announcementsService } from '@/services/announcements.service';
import { playSound } from '@/lib/sounds';
import type {
  AnnouncementRow,
  AnnouncementInsert,
  AnnouncementVariant,
} from '@/lib/database.types';

const VARIANTS: { key: AnnouncementVariant; emoji: string; label: string }[] = [
  { key: 'info', emoji: '📢', label: 'Informativo (azul)' },
  { key: 'success', emoji: '✅', label: 'Positivo (verde)' },
  { key: 'warning', emoji: '⚠️', label: 'Atenção (amarelo)' },
  { key: 'urgent', emoji: '🚨', label: 'Urgente (vermelho)' },
];

const empty: AnnouncementInsert = {
  title: '',
  body: '',
  variant: 'info',
  starts_at: null,
  ends_at: null,
  is_active: true,
};

// "2026-05-27T14:30:00.000Z" -> "2026-05-27T14:30" (datetime-local)
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const localMs = d.getTime() - off * 60_000;
  return new Date(localMs).toISOString().slice(0, 16);
}
function fromLocalInput(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

function classify(a: AnnouncementRow): {
  label: string;
  cls: string;
} {
  if (!a.is_active) return { label: '💤 Inativo', cls: 'bg-slate-100 text-slate-500' };
  const now = Date.now();
  if (a.starts_at && new Date(a.starts_at).getTime() > now)
    return { label: '📅 Agendado', cls: 'bg-blue-100 text-blue-800' };
  if (a.ends_at && new Date(a.ends_at).getTime() < now)
    return { label: '🏁 Expirado', cls: 'bg-slate-200 text-slate-600' };
  return { label: '🟢 Ativo', cls: 'bg-emerald-100 text-emerald-800' };
}

export default function AnnouncementsPage() {
  const [list, setList] = useState<AnnouncementRow[]>([]);
  const [form, setForm] = useState<AnnouncementInsert>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setList(await announcementsService.list());
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
    setForm(empty);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: AnnouncementInsert = {
        ...form,
        title: form.title.trim(),
        body: form.body?.trim() || null,
      };
      if (!payload.title) {
        setError('Título é obrigatório.');
        return;
      }
      if (editingId) {
        await announcementsService.update(editingId, payload);
      } else {
        await announcementsService.create(payload);
      }
      playSound('success');
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function handleEdit(a: AnnouncementRow) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body ?? '',
      variant: a.variant,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      is_active: a.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleToggle(a: AnnouncementRow) {
    try {
      await announcementsService.update(a.id, { is_active: !a.is_active });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Excluir este aviso? Esta ação é permanente.')) return;
    try {
      await announcementsService.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    }
  }

  const variantMeta = VARIANTS.find((v) => v.key === form.variant) ?? VARIANTS[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Avisos</h1>
        <p className="text-sm text-slate-600">
          Banner pop-up exibido quando alguém entra no site público. Configure
          título, mensagem, tipo visual e janela de exibição.
        </p>
      </header>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">
          {editingId ? 'Editar aviso' : 'Novo aviso'}
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Título</span>
            <input
              required
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={80}
            />
          </label>

          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Mensagem (opcional)</span>
            <textarea
              className="input min-h-[100px]"
              value={form.body ?? ''}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              maxLength={400}
            />
            <span className="block text-[11px] text-slate-500">
              Quebras de linha são respeitadas. Máx. 400 caracteres.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Tipo visual</span>
            <select
              className="input"
              value={form.variant}
              onChange={(e) =>
                setForm({ ...form, variant: e.target.value as AnnouncementVariant })
              }
            >
              {VARIANTS.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm self-end pb-2">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Ativo (mestre on/off)
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Início (opcional)</span>
            <input
              type="datetime-local"
              className="input"
              value={toLocalInput(form.starts_at ?? null)}
              onChange={(e) =>
                setForm({ ...form, starts_at: fromLocalInput(e.target.value) })
              }
            />
            <span className="block text-[11px] text-slate-500">
              Em branco = começa imediatamente.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Fim (opcional)</span>
            <input
              type="datetime-local"
              className="input"
              value={toLocalInput(form.ends_at ?? null)}
              onChange={(e) =>
                setForm({ ...form, ends_at: fromLocalInput(e.target.value) })
              }
            />
            <span className="block text-[11px] text-slate-500">
              Em branco = nunca expira.
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            {editingId ? 'Salvar alterações' : 'Criar aviso'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-ghost">
              Cancelar
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-slate-600 mb-2">Pré-visualização</p>
          <div className="mx-auto max-w-md rounded-3xl bg-white shadow-card ring-4 ring-brand-teal/20 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-brand-teal to-brand-navy-light" />
            <div className="px-6 pt-6 pb-5 space-y-3 text-center">
              <div className="text-5xl">{variantMeta.emoji}</div>
              <h3 className="heading-display text-xl font-bold text-brand-navy">
                {form.title || 'Título do aviso'}
              </h3>
              {(form.body ?? '').trim() && (
                <p className="text-slate-600 whitespace-pre-line">{form.body}</p>
              )}
            </div>
            <div className="border-t px-6 py-3 flex justify-center">
              <button type="button" className="btn-teal min-w-[140px]" disabled>
                Entendi
              </button>
            </div>
          </div>
        </div>
      </form>

      <section className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Aviso</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Janela</th>
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
              list.map((a) => {
                const st = classify(a);
                const v = VARIANTS.find((x) => x.key === a.variant) ?? VARIANTS[0];
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-2 align-top">
                      <div className="font-medium flex items-center gap-2">
                        <span>{v.emoji}</span>
                        <span>{a.title}</span>
                      </div>
                      {a.body && (
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-md">
                          {a.body}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {a.starts_at
                        ? new Date(a.starts_at).toLocaleString('pt-BR')
                        : 'desde já'}{' '}
                      →{' '}
                      {a.ends_at
                        ? new Date(a.ends_at).toLocaleString('pt-BR')
                        : 'sem prazo'}
                    </td>
                    <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(a)}
                        className="text-amber-700 hover:underline"
                      >
                        {a.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(a)}
                        className="text-brand-teal hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(a.id)}
                        className="text-brand-red hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!loading && list.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={4}>
                  Nenhum aviso cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
