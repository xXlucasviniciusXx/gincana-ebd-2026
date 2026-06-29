import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { escapePlayService } from '@/services/escapePlay.service';
import { startCelebrationMusic, stopCelebrationMusic, playSound } from '@/lib/sounds';
import Fireworks from '@/components/Fireworks';
import Countdown from '@/components/Countdown';
import RichText from '@/components/RichText';
import type {
  EscapeSettingsPublic,
  EscapeStepPublic,
  EscapeStateStep,
  EscapeRanking,
} from '@/lib/database.types';

const CODE_KEY = 'escape:code';

function isOpen(s: EscapeSettingsPublic, now: number): boolean {
  if (!s.is_published) return false;
  if (s.opens_at && now < new Date(s.opens_at).getTime()) return false;
  if (s.closes_at && now > new Date(s.closes_at).getTime()) return false;
  return true;
}

type Session = { teamId: string; teamName: string; color: string };

export default function EscapePlayPage() {
  const [settings, setSettings] = useState<EscapeSettingsPublic | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [steps, setSteps] = useState<EscapeStepPublic[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [progress, setProgress] = useState<EscapeStateStep[]>([]);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const code = useRef<string>(localStorage.getItem(CODE_KEY) ?? '');
  const stepsLoaded = useRef(false);

  // relógio (para a contagem regressiva e abertura automática)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const open = useMemo(
    () => (settings ? isOpen(settings, now) : false),
    [settings, now],
  );

  // carrega configurações
  useEffect(() => {
    escapePlayService
      .getSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const refreshState = useCallback(async () => {
    if (!code.current) return;
    const st = await escapePlayService.state(code.current);
    if (st.ok) {
      setProgress(st.steps);
      setFinishedAt(st.finished_at);
    }
  }, []);

  // quando abre, carrega etapas e (se houver código salvo) retoma
  useEffect(() => {
    if (!open || stepsLoaded.current) return;
    stepsLoaded.current = true;
    (async () => {
      try {
        setSteps(await escapePlayService.listSteps());
        if (code.current) {
          const st = await escapePlayService.state(code.current);
          if (st.ok) {
            setSession((s) => s ?? { teamId: st.team_id, teamName: '', color: '#2ea3a5' });
            setProgress(st.steps);
            setFinishedAt(st.finished_at);
          } else {
            localStorage.removeItem(CODE_KEY);
            code.current = '';
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar etapas');
      }
    })();
  }, [open]);

  // música para na saída
  useEffect(() => () => stopCelebrationMusic(), []);

  async function handleLogin(input: string) {
    const res = await escapePlayService.login(input);
    if (!res.ok) throw new Error('Código inválido. Confira com o líder da equipe.');
    code.current = input;
    localStorage.setItem(CODE_KEY, input);
    setSession({ teamId: res.team_id, teamName: res.team_name, color: res.color });
    if (!stepsLoaded.current) {
      setSteps(await escapePlayService.listSteps());
      stepsLoaded.current = true;
    }
    await refreshState();
  }

  function logout() {
    localStorage.removeItem(CODE_KEY);
    code.current = '';
    setSession(null);
    setProgress([]);
    setFinishedAt(null);
  }

  // ----- estados de tela -----
  if (loading) {
    return <p className="text-center text-slate-500 py-20">Carregando...</p>;
  }

  if (!open) {
    return <ClosedScreen settings={settings} />;
  }

  if (!session) {
    return <CodeGate settings={settings} onLogin={handleLogin} />;
  }

  const completed = new Set(progress.map((p) => p.step_id));
  const clues = progress
    .map((p) => p.clue)
    .filter((c): c is string => Boolean(c));
  const orderedSteps = [...steps].sort((a, b) => a.order_number - b.order_number);
  const current = orderedSteps.find((s) => !completed.has(s.id)) ?? null;
  const allDone = orderedSteps.length > 0 && !current;
  const doneCount = orderedSteps.filter((s) => completed.has(s.id)).length;

  return (
    <div className="space-y-5">
      <Header
        title={settings?.title ?? 'Escape Bíblico'}
        teamName={session.teamName}
        doneCount={doneCount}
        total={orderedSteps.length}
        onLogout={logout}
      />

      <Backpack clues={clues} />

      {finishedAt ? (
        <Victory settings={settings} />
      ) : allDone ? (
        <FinalStep
          settings={settings}
          code={code.current}
          onSolved={async () => {
            await refreshState();
            startCelebrationMusic();
          }}
        />
      ) : current ? (
        <StepCard
          key={current.id}
          step={current}
          code={code.current}
          hintPenaltyMin={Math.round((settings?.hint_penalty_seconds ?? 0) / 60)}
          onSolved={refreshState}
        />
      ) : (
        <p className="card text-center text-slate-500">
          As etapas ainda não foram cadastradas. Volte em breve! 🙏
        </p>
      )}

      {error && <p className="text-center text-sm text-brand-red">{error}</p>}
    </div>
  );
}

/* ------------------------------- Telas ---------------------------------- */
function ClosedScreen({ settings }: { settings: EscapeSettingsPublic | null }) {
  const opensSoon = settings?.is_published && settings.opens_at;
  return (
    <div className="mx-auto max-w-xl">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-teal p-8 text-center text-white shadow-glow">
        <div className="text-6xl">🔐</div>
        <h1 className="heading-display mt-3 text-3xl font-bold">
          {settings?.title ?? 'Escape Bíblico'}
        </h1>
        {settings?.intro_text && (
          <RichText text={settings.intro_text} className="mt-3 text-white/90" />
        )}
        <div className="mt-6 flex flex-col items-center gap-2">
          {opensSoon ? (
            <>
              <p className="text-sm text-white/80">O jogo abre em:</p>
              <Countdown target={settings!.opens_at!} />
            </>
          ) : (
            <p className="rounded-full bg-white/10 px-4 py-2 text-sm">
              ⏳ Em breve. Aguarde a liberação!
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function CodeGate({
  settings,
  onLogin,
}: {
  settings: EscapeSettingsPublic | null;
  onLogin: (code: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onLogin(value.trim().toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <section className="card text-center space-y-4">
        <div className="text-5xl">🔐</div>
        <h1 className="heading-display text-2xl font-bold text-brand-navy">
          {settings?.title ?? 'Escape Bíblico'}
        </h1>
        {settings?.intro_text && (
          <RichText text={settings.intro_text} className="text-slate-600 text-sm" />
        )}
        <form onSubmit={submit} className="space-y-3">
          <input
            className="input text-center text-2xl font-mono tracking-widest uppercase"
            placeholder="CÓDIGO"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={8}
            autoFocus
          />
          {error && <p className="text-sm text-brand-red">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !value.trim()}>
            {busy ? 'Entrando...' : 'Entrar no jogo'}
          </button>
        </form>
        <p className="text-xs text-slate-400">
          O código foi enviado ao líder da sua equipe.
        </p>
      </section>
    </div>
  );
}

function Header({
  title,
  teamName,
  doneCount,
  total,
  onLogout,
}: {
  title: string;
  teamName: string;
  doneCount: number;
  total: number;
  onLogout: () => void;
}) {
  const pct = total > 0 ? (doneCount / total) * 100 : 0;
  return (
    <header className="card">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="heading-display text-lg font-bold text-brand-navy truncate">
            🔐 {title}
          </h1>
          {teamName && <p className="text-xs text-slate-500 truncate">Equipe {teamName}</p>}
        </div>
        <button type="button" onClick={onLogout} className="text-xs text-slate-400 hover:underline">
          Sair
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-teal to-brand-yellow"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {doneCount}/{total}
        </span>
      </div>
    </header>
  );
}

function Backpack({ clues }: { clues: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-glow"
      >
        🎒 Pistas
        <span className="rounded-full bg-brand-yellow px-2 text-brand-navy">{clues.length}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-5 shadow-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="heading-display text-lg font-bold text-brand-navy">
                  🎒 Suas pistas
                </h2>
                <button type="button" onClick={() => setOpen(false)} className="text-slate-400">
                  ✕
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {clues.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-xl border-l-4 border-brand-yellow bg-brand-yellow/10 px-3 py-2 text-sm text-brand-navy"
                  >
                    {c}
                  </li>
                ))}
                {clues.length === 0 && (
                  <li className="text-sm text-slate-500">
                    Nenhuma pista ainda. Conclua as etapas para coletá-las!
                  </li>
                )}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StepCard({
  step,
  code,
  hintPenaltyMin,
  onSolved,
}: {
  step: EscapeStepPublic;
  code: string;
  hintPenaltyMin: number;
  onSolved: () => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [reward, setReward] = useState<{ clue: string | null } | null>(null);

  async function revealHint() {
    setHintBusy(true);
    try {
      await escapePlayService.useHint(code, step.id);
      setShowHint(true);
    } catch {
      setShowHint(true); // mesmo se a cobranca falhar, mostra a dica
    } finally {
      setHintBusy(false);
    }
  }

  function win(clue: string | null) {
    playSound('success');
    setReward({ clue });
    // O progresso ja foi gravado no servidor. So atualizamos o estado do
    // pai (que troca de etapa e desmonta este cartao) quando o usuario
    // clicar em "Proxima etapa" — senao a tela de pista some na hora.
  }

  async function tryAnswer(attempt: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await escapePlayService.answer(code, step.id, attempt);
      if (!res.ok) {
        setError(res.reason === 'closed' ? 'O jogo está fechado.' : 'Não foi possível validar.');
      } else if (!res.correct) {
        setAttempts((a) => a + 1);
        const min = Math.round((res.penalty_seconds ?? 0) / 60);
        setError(
          min > 0
            ? `Resposta errada 🤔 +${min} min somados ao tempo da equipe! Pense bem antes de tentar de novo.`
            : 'Hmm, não foi dessa vez 🤔 Tente de novo!',
        );
      } else {
        await win(res.clue);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  async function sendPhoto() {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const res = await escapePlayService.submitPhoto(code, step.id, file);
      if (!res.ok) setError('Não foi possível enviar. Tente novamente.');
      else await win(res.clue);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar foto');
    } finally {
      setBusy(false);
    }
  }

  if (reward) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card text-center space-y-3 border-2 border-brand-yellow"
      >
        <div className="text-5xl animate-trophy-bounce">🎉</div>
        <h2 className="heading-display text-xl font-bold text-brand-navy">Desafio concluído!</h2>
        {reward.clue && (
          <div className="rounded-xl border-l-4 border-brand-yellow bg-brand-yellow/10 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nova pista 🎁
            </p>
            <p className="text-brand-navy font-medium">{reward.clue}</p>
          </div>
        )}
        <button
          type="button"
          className="btn-primary w-full"
          disabled={advancing}
          onClick={async () => {
            setAdvancing(true);
            await onSolved();
          }}
        >
          {advancing ? 'Avançando...' : 'Próxima etapa →'}
        </button>
      </motion.div>
    );
  }

  return (
    <article className="card space-y-4">
      <div className="flex items-center gap-2">
        <span className="badge bg-brand-teal/15 text-brand-teal">{labelType(step.type)}</span>
        <span className="text-xs text-slate-400">{step.points} pts</span>
      </div>
      <h2 className="heading-display text-xl font-bold text-brand-navy">{step.title}</h2>
      {step.image_url && (
        <img
          src={step.image_url}
          alt=""
          className="w-full rounded-2xl object-cover max-h-80"
        />
      )}
      {step.prompt && <RichText text={step.prompt} className="text-slate-700" />}

      {step.type !== 'photo' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          ⏱️ Pense bem: cada resposta errada soma tempo ao ranking da equipe.
        </p>
      )}

      {step.type === 'quiz' && (
        <div className="grid gap-2">
          {(step.options ?? []).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={busy}
              onClick={() => tryAnswer(opt.id)}
              className="rounded-xl border-2 border-slate-200 px-4 py-3 text-left font-medium text-brand-navy transition hover:border-brand-teal hover:bg-brand-teal/5 disabled:opacity-50"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {step.type === 'riddle' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) tryAnswer(text.trim());
          }}
          className="flex gap-2"
        >
          <input
            className="input flex-1"
            placeholder="Sua resposta"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
            Enviar
          </button>
        </form>
      )}

      {step.type === 'photo' && (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-white"
          />
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy || !file}
            onClick={sendPhoto}
          >
            {busy ? 'Enviando...' : 'Enviar foto'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-brand-red">{error}</p>}

      {step.hint &&
        (step.type === 'photo' || showHint || attempts >= 2 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            💡 {step.hint}
            {attempts < 2 && showHint && step.type !== 'photo' && hintPenaltyMin > 0 && (
              <span className="ml-1 font-semibold">(+{hintPenaltyMin} min)</span>
            )}
          </p>
        ) : (
          <button
            type="button"
            onClick={revealHint}
            disabled={hintBusy}
            className="text-sm font-medium text-brand-teal hover:underline disabled:opacity-50"
          >
            💡 Ver dica{hintPenaltyMin > 0 ? ` (+${hintPenaltyMin} min)` : ''}
          </button>
        ))}
    </article>
  );
}

function FinalStep({
  settings,
  code,
  onSolved,
}: {
  settings: EscapeSettingsPublic | null;
  code: string;
  onSolved: () => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await escapePlayService.checkFinal(code, value.trim());
      if (!res.ok) {
        setError('O jogo está fechado.');
      } else if (!res.correct) {
        setError(
          res.reason === 'incomplete'
            ? 'Conclua todas as etapas antes da senha final.'
            : 'Senha incorreta. Use suas pistas! 🔎',
        );
      } else {
        await onSolved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card space-y-4 border-2 border-brand-navy text-center">
      <div className="text-5xl">🗝️</div>
      <h2 className="heading-display text-2xl font-bold text-brand-navy">Senha final</h2>
      {settings?.final_prompt && (
        <RichText text={settings.final_prompt} className="text-slate-700" />
      )}
      <p className="text-sm text-slate-500">
        Junte todas as pistas da sua mochila 🎒 para descobrir a senha.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="input text-center text-xl font-mono"
          placeholder="Digite a senha"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !value.trim()}>
          {busy ? 'Verificando...' : 'Concluir Escape!'}
        </button>
      </form>
    </article>
  );
}

function Victory({ settings }: { settings: EscapeSettingsPublic | null }) {
  const [ranking, setRanking] = useState<EscapeRanking[]>([]);
  useEffect(() => {
    escapePlayService.ranking().then(setRanking).catch(() => {});
  }, []);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-teal p-8 text-center text-white shadow-glow">
      <Fireworks />
      <div className="relative">
        <div className="text-6xl animate-trophy-bounce">🏆</div>
        <h2 className="heading-display mt-3 text-3xl font-bold">Vocês escaparam! 🎉</h2>
        {settings?.final_success_text && (
          <RichText text={settings.final_success_text} className="mt-3 text-white/90" />
        )}
        {ranking.length > 0 && (
          <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-white/10 p-4 text-left">
            <p className="mb-2 text-center text-xs uppercase tracking-widest text-white/70">
              Ranking do Escape
            </p>
            <ol className="space-y-1">
              {ranking.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    {r.rank_position}º {r.name}
                    {r.finished_at ? ' ✅' : ''}
                    {r.rejected_photos > 0 ? ' ⚠️' : ''}
                  </span>
                  <span className="font-bold tabular-nums">
                    {r.finished_at ? fmtDuration(r.duration_seconds) : 'em jogo'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ helpers --------------------------------- */
function fmtDuration(secs: number | null): string {
  if (secs == null || secs < 0) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function labelType(t: string): string {
  if (t === 'quiz') return 'Quiz';
  if (t === 'riddle') return 'Enigma';
  if (t === 'photo') return 'Foto';
  return t;
}
