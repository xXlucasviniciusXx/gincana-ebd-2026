import { useEffect, useMemo, useState } from 'react';
import { escapeService, generateEscapeCode } from '@/services/escape.service';
import { teamsService } from '@/services/teams.service';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import ImageUpload from '@/components/ImageUpload';
import RichText from '@/components/RichText';
import type {
  EscapeSettings,
  EscapeStep,
  EscapeStepInsert,
  EscapeQuizOption,
  EscapeTeamCode,
  EscapeProgress,
  EscapeRanking,
  Team,
} from '@/lib/database.types';

function fmtDur(secs: number | null): string {
  if (secs == null || secs < 0) return '—';
  const m = Math.floor(secs / 60);
  return `${m}:${String(secs % 60).padStart(2, '0')}`;
}

type Tab = 'config' | 'steps' | 'codes' | 'monitor';

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export default function EscapePage() {
  const [tab, setTab] = useState<Tab>('config');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">
          🔐 Escape Bíblico
        </h1>
        <p className="text-sm text-slate-600">
          Monte o jogo, gere os códigos das equipes e acompanhe as conclusões.
        </p>
      </header>

      <div className="inline-flex flex-wrap rounded-full bg-white p-1 shadow-card">
        {(
          [
            ['config', 'Configurações'],
            ['steps', 'Etapas'],
            ['codes', 'Códigos'],
            ['monitor', 'Monitor'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === key ? 'bg-brand-navy text-white' : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigTab />}
      {tab === 'steps' && <StepsTab />}
      {tab === 'codes' && <CodesTab />}
      {tab === 'monitor' && <MonitorTab />}
    </div>
  );
}

/* ----------------------------- Configurações ---------------------------- */
function ConfigTab() {
  const [settings, setSettings] = useState<EscapeSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    escapeService.getSettings().then(setSettings).catch((e) =>
      setError(e instanceof Error ? e.message : 'Erro ao carregar'),
    );
  }, []);

  function set<K extends keyof EscapeSettings>(key: K, value: EscapeSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setOk(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await escapeService.updateSettings(settings.id, {
        title: settings.title,
        intro_text: settings.intro_text,
        is_published: settings.is_published,
        opens_at: settings.opens_at,
        closes_at: settings.closes_at,
        final_prompt: settings.final_prompt,
        final_password: settings.final_password,
        final_success_text: settings.final_success_text,
        wrong_penalty_seconds: settings.wrong_penalty_seconds,
        hint_penalty_seconds: settings.hint_penalty_seconds,
      });
      setSettings(updated);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <p className="text-slate-500">{error ?? 'Carregando...'}</p>;
  }

  return (
    <div className="card space-y-4">
      {error && <p className="text-sm text-brand-red">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">Salvo!</p>}

      <label
        className={`flex items-center gap-3 rounded-xl p-3 ${
          settings.is_published ? 'bg-emerald-50' : 'bg-amber-50'
        }`}
      >
        <input
          type="checkbox"
          checked={settings.is_published}
          onChange={(e) => set('is_published', e.target.checked)}
          className="h-5 w-5"
        />
        <span className="text-sm font-semibold text-brand-navy">
          {settings.is_published
            ? 'Publicado (visível conforme o horário de abertura)'
            : 'Despublicado (oculto para os participantes)'}
        </span>
      </label>

      <Field label="Título">
        <input
          className="input"
          value={settings.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </Field>

      <Field label="Texto de introdução (aceita **negrito** e *itálico*)">
        <textarea
          className="input min-h-[90px]"
          value={settings.intro_text ?? ''}
          onChange={(e) => set('intro_text', e.target.value)}
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Penalidade por resposta errada (min)">
          <input
            type="number"
            min={0}
            className="input max-w-[160px]"
            value={Math.round((settings.wrong_penalty_seconds ?? 0) / 60)}
            onChange={(e) => set('wrong_penalty_seconds', Math.max(0, Number(e.target.value)) * 60)}
          />
        </Field>
        <Field label="Penalidade por pedir dica (min)">
          <input
            type="number"
            min={0}
            className="input max-w-[160px]"
            value={Math.round((settings.hint_penalty_seconds ?? 0) / 60)}
            onChange={(e) => set('hint_penalty_seconds', Math.max(0, Number(e.target.value)) * 60)}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Abre em">
          <input
            type="datetime-local"
            className="input"
            value={toLocalInput(settings.opens_at)}
            onChange={(e) => set('opens_at', fromLocalInput(e.target.value))}
          />
        </Field>
        <Field label="Fecha em (opcional)">
          <input
            type="datetime-local"
            className="input"
            value={toLocalInput(settings.closes_at)}
            onChange={(e) => set('closes_at', fromLocalInput(e.target.value))}
          />
        </Field>
      </div>

      <hr />
      <h3 className="font-semibold text-brand-navy">Etapa final (senha)</h3>
      <Field label="Enunciado da etapa final">
        <textarea
          className="input min-h-[70px]"
          value={settings.final_prompt ?? ''}
          onChange={(e) => set('final_prompt', e.target.value)}
        />
      </Field>
      <Field label="🔑 Senha final (secreta)">
        <input
          className="input font-mono"
          value={settings.final_password ?? ''}
          onChange={(e) => set('final_password', e.target.value)}
          placeholder="A resposta combinando todas as pistas"
        />
      </Field>
      <Field label="Mensagem de vitória">
        <textarea
          className="input min-h-[70px]"
          value={settings.final_success_text ?? ''}
          onChange={(e) => set('final_success_text', e.target.value)}
        />
      </Field>

      <button type="button" className="btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}

/* -------------------------------- Etapas -------------------------------- */
const emptyStep: EscapeStepInsert = {
  title: '',
  type: 'quiz',
  prompt: '',
  order_number: 0,
  points: 10,
  options: [],
  answer: '',
  reward_clue: '',
  hint: '',
  image_url: '',
  is_active: true,
};

function StepsTab() {
  const [steps, setSteps] = useState<EscapeStep[]>([]);
  const [form, setForm] = useState<EscapeStepInsert>(emptyStep);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setSteps(await escapeService.listSteps());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function reset() {
    setForm({ ...emptyStep, order_number: steps.length });
    setEditingId(null);
  }

  function edit(s: EscapeStep) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      type: s.type,
      prompt: s.prompt ?? '',
      order_number: s.order_number,
      points: s.points,
      options: s.options ?? [],
      answer: s.answer ?? '',
      reward_clue: s.reward_clue ?? '',
      hint: s.hint ?? '',
      image_url: s.image_url ?? '',
      is_active: s.is_active,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: EscapeStepInsert = {
        ...form,
        options: form.type === 'quiz' ? form.options ?? [] : null,
        answer: form.type === 'photo' ? null : form.answer,
      };
      if (editingId) await escapeService.updateStep(editingId, payload);
      else await escapeService.createStep(payload);
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta etapa?')) return;
    await escapeService.removeStep(id);
    await load();
  }

  async function move(s: EscapeStep, dir: -1 | 1) {
    const sorted = [...steps].sort(
      (a, b) => a.order_number - b.order_number || a.title.localeCompare(b.title),
    );
    const i = sorted.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    // Regrava ordem sequencial (1..N) em todos que mudaram — robusto a
    // empates (nao depende de trocar dois valores iguais).
    await Promise.all(
      sorted
        .map((step, idx) => ({ id: step.id, order: idx + 1, prev: step.order_number }))
        .filter((x) => x.order !== x.prev)
        .map((x) => escapeService.updateStep(x.id, { order_number: x.order })),
    );
    await load();
  }

  const options = form.options ?? [];
  function setOptions(next: EscapeQuizOption[]) {
    setForm((f) => ({ ...f, options: next }));
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-brand-red">{error}</p>}

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">
          {editingId ? 'Editar etapa' : 'Nova etapa'}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Título">
            <input
              required
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="quiz">Quiz (múltipla escolha)</option>
              <option value="riddle">Enigma (resposta de texto)</option>
              <option value="photo">Foto (upload comprova)</option>
            </select>
          </Field>
          <Field label="Pontos">
            <input
              type="number"
              className="input"
              value={form.points ?? 10}
              onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ordem">
            <input
              type="number"
              className="input"
              value={form.order_number ?? 0}
              onChange={(e) => setForm({ ...form, order_number: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Enunciado (aceita **negrito** e *itálico*)">
          <textarea
            className="input min-h-[90px]"
            value={form.prompt ?? ''}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          />
        </Field>

        <ImageUpload
          label="Imagem do desafio (opcional)"
          folder="escape/images"
          value={form.image_url}
          onChange={(url) => setForm({ ...form, image_url: url })}
        />

        {form.type === 'quiz' && (
          <div className="rounded-xl bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">
              Alternativas (marque a correta)
            </p>
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={form.answer === opt.id}
                  onChange={() => setForm({ ...form, answer: opt.id })}
                />
                <input
                  className="input flex-1"
                  value={opt.text}
                  placeholder={`Alternativa ${i + 1}`}
                  onChange={(e) =>
                    setOptions(
                      options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-brand-red text-sm"
                  onClick={() => setOptions(options.filter((o) => o.id !== opt.id))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() =>
                setOptions([...options, { id: crypto.randomUUID().slice(0, 8), text: '' }])
              }
            >
              + Alternativa
            </button>
          </div>
        )}

        {form.type === 'riddle' && (
          <Field label="Resposta esperada (sem distinguir acento/maiúscula)">
            <input
              className="input"
              value={form.answer ?? ''}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
            />
          </Field>
        )}

        {form.type === 'photo' && (
          <p className="text-xs text-slate-500">
            Nesta etapa o participante envia uma foto; o envio libera a pista
            automaticamente (você revisa depois na aba Monitor).
          </p>
        )}

        <Field label="🎁 Pista de recompensa (secreta — entregue ao concluir)">
          <input
            className="input"
            value={form.reward_clue ?? ''}
            onChange={(e) => setForm({ ...form, reward_clue: e.target.value })}
          />
        </Field>
        <Field label="Dica (opcional, pública)">
          <input
            className="input"
            value={form.hint ?? ''}
            onChange={(e) => setForm({ ...form, hint: e.target.value })}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Ativa
        </label>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            {editingId ? 'Salvar etapa' : 'Criar etapa'}
          </button>
          <button type="button" className="btn-ghost" onClick={reset}>
            {editingId ? 'Cancelar' : 'Limpar'}
          </button>
        </div>
      </form>

      <section className="space-y-2">
        {loading && <p className="text-slate-500">Carregando...</p>}
        {steps.map((s, i) => (
          <div key={s.id} className="card flex items-start gap-3">
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={() => move(s, -1)} disabled={i === 0}>
                ▲
              </button>
              <span className="text-xs font-bold text-slate-400">{s.order_number}</span>
              <button
                type="button"
                onClick={() => move(s, 1)}
                disabled={i === steps.length - 1}
              >
                ▼
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="badge bg-brand-teal/15 text-brand-teal">{s.type}</span>
                <span className="font-semibold text-brand-navy">{s.title}</span>
                {!s.is_active && (
                  <span className="badge bg-slate-200 text-slate-500">inativa</span>
                )}
                <span className="text-xs text-slate-400">{s.points} pts</span>
              </div>
              {s.prompt && (
                <RichText text={s.prompt} className="mt-1 text-sm text-slate-600 line-clamp-2" />
              )}
            </div>
            <div className="space-x-3 text-sm">
              <button type="button" className="text-brand-teal" onClick={() => edit(s)}>
                Editar
              </button>
              <button type="button" className="text-brand-red" onClick={() => remove(s.id)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
        {!loading && steps.length === 0 && (
          <p className="text-slate-500">Nenhuma etapa cadastrada.</p>
        )}
      </section>
    </div>
  );
}

/* -------------------------------- Códigos ------------------------------- */
function CodesTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [codes, setCodes] = useState<EscapeTeamCode[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [t, c] = await Promise.all([teamsService.list(), escapeService.listCodes()]);
      setTeams(t);
      setCodes(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }
  useEffect(() => {
    load();
  }, []);

  const codeByTeam = useMemo(
    () => new Map(codes.map((c) => [c.team_id, c.code])),
    [codes],
  );

  async function gen(teamId: string) {
    await escapeService.upsertCode(teamId, generateEscapeCode());
    await load();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <p className="text-sm text-slate-600">
        Gere um código por equipe e envie ao líder. Com ele, a equipe entra no jogo
        e retoma de onde parou em qualquer aparelho.
      </p>
      <div className="card divide-y p-0">
        {teams.map((t) => {
          const code = codeByTeam.get(t.id);
          return (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="font-medium text-brand-navy">{t.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {code ? (
                  <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm">
                    {code}
                  </code>
                ) : (
                  <span className="text-xs text-slate-400">sem código</span>
                )}
                {code && (
                  <button
                    type="button"
                    className="text-xs text-brand-teal"
                    onClick={() => navigator.clipboard?.writeText(code)}
                  >
                    copiar
                  </button>
                )}
                <button type="button" className="btn-ghost text-xs" onClick={() => gen(t.id)}>
                  {code ? 'Regerar' : 'Gerar'}
                </button>
              </div>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="px-4 py-3 text-slate-500">Cadastre equipes primeiro.</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Monitor ------------------------------- */
function MonitorTab() {
  const [progress, setProgress] = useState<EscapeProgress[]>([]);
  const [steps, setSteps] = useState<EscapeStep[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [ranking, setRanking] = useState<EscapeRanking[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [p, s, t, r] = await Promise.all([
        escapeService.listProgress(),
        escapeService.listSteps(),
        teamsService.list(),
        escapeService.ranking(),
      ]);
      setProgress(p);
      setSteps(s);
      setTeams(t);
      setRanking(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }
  useEffect(() => {
    load();
  }, []);
  useRealtimeTable('escape_progress', load);
  useRealtimeTable('escape_team_state', load);

  const stepById = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const photos = progress.filter((p) => p.photo_url);

  async function review(id: string, approved: boolean) {
    await escapeService.reviewPhoto(id, approved);
    await load();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-brand-red">{error}</p>}

      <h2 className="font-semibold text-brand-navy">🏁 Ranking (tempo · fotos válidas)</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Equipe</th>
              <th className="px-4 py-2">Tempo (c/ penal.)</th>
              <th className="px-4 py-2">Penalidade</th>
              <th className="px-4 py-2">Etapas</th>
              <th className="px-4 py-2">Fotos rejeitadas</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-bold text-slate-500">{r.rank_position}</td>
                <td className="px-4 py-2 font-medium text-brand-navy">
                  {r.name} {r.finished_at ? '✅' : ''}
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {r.finished_at ? fmtDur(r.duration_seconds) : 'em jogo'}
                </td>
                <td className={`px-4 py-2 ${r.penalty_seconds > 0 ? 'text-brand-orange font-semibold' : 'text-slate-400'}`}>
                  {r.penalty_seconds > 0 ? `+${Math.round(r.penalty_seconds / 60)} min` : '—'}
                </td>
                <td className="px-4 py-2">{r.steps_done}</td>
                <td className={`px-4 py-2 ${r.rejected_photos > 0 ? 'text-brand-red font-semibold' : ''}`}>
                  {r.rejected_photos > 0 ? `⚠️ ${r.rejected_photos}` : '0'}
                </td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={6}>
                  Nenhuma equipe iniciou ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold text-brand-navy">Fotos enviadas</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => {
          const step = stepById.get(p.step_id);
          const team = teamById.get(p.team_id);
          return (
            <figure key={p.id} className="card p-2">
              <img
                src={p.photo_url!}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
              <figcaption className="mt-2 text-xs">
                <div className="font-semibold text-brand-navy">{team?.name ?? '—'}</div>
                <div className="text-slate-500">{step?.title ?? 'Etapa'}</div>
                <span
                  className={`badge mt-1 ${
                    p.photo_review === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.photo_review === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {p.photo_review}
                </span>
              </figcaption>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn-teal flex-1 text-xs py-1"
                  onClick={() => review(p.id, true)}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full bg-brand-red/10 text-brand-red text-xs py-1 font-semibold"
                  onClick={() => review(p.id, false)}
                >
                  Rejeitar foto
                </button>
              </div>
            </figure>
          );
        })}
        {photos.length === 0 && (
          <p className="text-slate-500">Nenhuma foto enviada ainda.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- helpers -------------------------------- */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
