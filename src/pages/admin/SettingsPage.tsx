import { useEffect, useState } from 'react';
import { competitionService } from '@/services/competition.service';
import { playSound } from '@/lib/sounds';
import type { CompetitionSettings } from '@/lib/database.types';

type FormState = {
  competition_name: string;
  theme: string;
  general_verse: string;
  general_bible_reference: string;
};

const empty: FormState = {
  competition_name: '',
  theme: '',
  general_verse: '',
  general_bible_reference: '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    competitionService
      .get()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        if (s) {
          setForm({
            competition_name: s.competition_name ?? '',
            theme: s.theme ?? '',
            general_verse: s.general_verse ?? '',
            general_bible_reference: s.general_bible_reference ?? '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await competitionService.update(settings.id, {
        competition_name: form.competition_name.trim() || 'Gincana EBD 2026',
        theme: form.theme.trim() || null,
        general_verse: form.general_verse.trim() || null,
        general_bible_reference: form.general_bible_reference.trim() || null,
      });
      setSettings(updated);
      playSound('success');
      setMsg({ kind: 'ok', text: 'Configurações salvas com sucesso.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>;
  if (!settings) {
    return (
      <p className="text-brand-red">
        Nenhuma linha em <code>competition_settings</code>. Rode o seed inicial no Supabase.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Configurações</h1>
        <p className="text-sm text-slate-600">
          Editar nome, tema e versículo da gincana. As mudanças aparecem imediatamente no site público.
        </p>
      </header>

      {msg && (
        <div
          className={`rounded-xl px-4 py-2 text-sm ${
            msg.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <Field
          label="Nome da gincana"
          hint="Aparece como título grande no hero da home pública."
        >
          <input
            required
            className="input"
            value={form.competition_name}
            onChange={(e) => setForm({ ...form, competition_name: e.target.value })}
          />
        </Field>

        <Field
          label="Tema"
          hint='Frase em itálico abaixo do título. Ex.: "Conhecendo a Palavra, Vivendo a Verdade"'
        >
          <input
            className="input"
            value={form.theme}
            onChange={(e) => setForm({ ...form, theme: e.target.value })}
          />
        </Field>

        <Field
          label="Versículo"
          hint="Texto do versículo que serve de base do tema."
        >
          <textarea
            className="input min-h-[80px]"
            value={form.general_verse}
            onChange={(e) => setForm({ ...form, general_verse: e.target.value })}
          />
        </Field>

        <Field
          label="Referência bíblica"
          hint="Ex.: Oseias 6:3"
        >
          <input
            className="input"
            value={form.general_bible_reference}
            onChange={(e) =>
              setForm({ ...form, general_bible_reference: e.target.value })
            }
          />
        </Field>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-slate-500">
            Status atual:{' '}
            <span
              className={
                settings.status === 'closed'
                  ? 'text-amber-700 font-semibold'
                  : 'text-emerald-700 font-semibold'
              }
            >
              {settings.status}
            </span>
            {settings.closed_at && (
              <> · encerrada em {new Date(settings.closed_at).toLocaleString('pt-BR')}</>
            )}
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      <section className="card">
        <h2 className="font-semibold text-brand-navy mb-2">Pré-visualização do hero</h2>
        <div className="rounded-2xl bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-teal p-6 text-white">
          <p className="text-xs uppercase tracking-widest opacity-80">
            {settings.status === 'closed' ? 'Gincana encerrada' : 'Em andamento'}
          </p>
          <h3 className="heading-display text-2xl md:text-3xl font-bold mt-2">
            {form.competition_name || 'Gincana EBD 2026'}
          </h3>
          {form.theme && <p className="mt-2 italic text-white/90">"{form.theme}"</p>}
          {form.general_verse && (
            <p className="mt-1 text-sm text-white/70">
              {form.general_verse}
              {form.general_bible_reference && ` — ${form.general_bible_reference}`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}
