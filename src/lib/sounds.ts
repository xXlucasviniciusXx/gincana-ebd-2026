// Sons sutis sintetizados via Web Audio API.
// Preferência persistida em localStorage, default DESLIGADO.

export type SoundType = 'score' | 'badge' | 'success' | 'tick';

const STORAGE_KEY = 'gincana:sounds_enabled';
const TOGGLE_EVENT = 'gincana:sound-toggle';

export function areSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function setSoundsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(TOGGLE_EVENT));
}

export function onSoundToggle(handler: () => void): () => void {
  window.addEventListener(TOGGLE_EVENT, handler);
  return () => window.removeEventListener(TOGGLE_EVENT, handler);
}

let audioContext: AudioContext | null = null;
function ctx(): AudioContext {
  if (!audioContext) {
    const W = window as Window & { webkitAudioContext?: typeof AudioContext };
    audioContext = new (window.AudioContext || W.webkitAudioContext!)();
  }
  // Browsers que iniciam o contexto em 'suspended' precisam de resume()
  // dentro de um gesto do usuário. Como playSound é sempre chamado em
  // resposta a uma ação, podemos chamar com segurança.
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      /* ignora */
    });
  }
  return audioContext;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.05,
  delay = 0,
) {
  setTimeout(() => {
    try {
      const c = ctx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(c.destination);
      const t0 = c.currentTime;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration);
    } catch {
      /* ignora */
    }
  }, delay);
}

export function playSound(type: SoundType): void {
  if (!areSoundsEnabled()) return;
  switch (type) {
    case 'score':
      // ding curto, dois tons
      tone(800, 0.12, 'sine', 0.06);
      tone(1000, 0.15, 'sine', 0.05, 80);
      break;
    case 'badge':
      // pequena fanfara C-E-G (acorde maior)
      tone(523.25, 0.1, 'triangle', 0.06);
      tone(659.26, 0.1, 'triangle', 0.06, 90);
      tone(783.99, 0.2, 'triangle', 0.06, 180);
      break;
    case 'success':
      tone(523.25, 0.1, 'sine', 0.05);
      tone(783.99, 0.2, 'sine', 0.05, 100);
      break;
    case 'tick':
      tone(1200, 0.05, 'square', 0.03);
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// Música de celebração (fanfarra triunfante em loop) — usada na
// tela da equipe campeã. Ignora a preferência global de sons,
// pois é sempre acionada por um clique explícito do usuário.
// ─────────────────────────────────────────────────────────────

const CELEBRATION_EVENT = 'gincana:celebration-toggle';
let celebrationStop: (() => void) | null = null;

export function isCelebrationPlaying(): boolean {
  return celebrationStop !== null;
}

export function onCelebrationToggle(handler: () => void): () => void {
  window.addEventListener(CELEBRATION_EVENT, handler);
  return () => window.removeEventListener(CELEBRATION_EVENT, handler);
}

function playNoteAt(
  c: AudioContext,
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType,
  volume: number,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

// Melodia em Dó maior, tempos (t) e durações (d) em segundos relativos ao loop.
const CELEBRATION_MELODY: Array<{ f: number; t: number; d: number; v?: number }> = [
  { f: 392.0, t: 0.0, d: 0.18 }, // G4
  { f: 523.25, t: 0.2, d: 0.18 }, // C5
  { f: 659.25, t: 0.4, d: 0.32 }, // E5
  { f: 587.33, t: 0.8, d: 0.18 }, // D5
  { f: 523.25, t: 1.0, d: 0.18 }, // C5
  { f: 587.33, t: 1.2, d: 0.32 }, // D5
  { f: 659.25, t: 1.6, d: 0.18 }, // E5
  { f: 783.99, t: 1.8, d: 0.5 }, // G5
  { f: 659.25, t: 2.4, d: 0.18 }, // E5
  { f: 783.99, t: 2.6, d: 0.18 }, // G5
  { f: 1046.5, t: 2.8, d: 0.6, v: 0.07 }, // C6
];
const CELEBRATION_BASS = [130.81, 196.0, 174.61, 196.0]; // C3 G3 F3 G3
const CELEBRATION_LOOP = 3.6; // duração de um ciclo, em segundos

function scheduleCelebrationLoop(c: AudioContext, t0: number) {
  CELEBRATION_BASS.forEach((f, i) => {
    playNoteAt(c, f, t0 + (i * CELEBRATION_LOOP) / 4, 0.7, 'triangle', 0.04);
  });
  CELEBRATION_MELODY.forEach((n) => {
    playNoteAt(c, n.f, t0 + n.t, n.d, 'sine', n.v ?? 0.055);
  });
}

export function startCelebrationMusic(): () => void {
  if (celebrationStop) return celebrationStop;
  let c: AudioContext;
  try {
    c = ctx();
  } catch {
    return () => {};
  }
  let nextTime = c.currentTime + 0.15;
  // Pré-agenda dois ciclos para criar um buffer e evitar falhas entre loops.
  scheduleCelebrationLoop(c, nextTime);
  nextTime += CELEBRATION_LOOP;
  scheduleCelebrationLoop(c, nextTime);
  nextTime += CELEBRATION_LOOP;
  const interval = window.setInterval(() => {
    scheduleCelebrationLoop(c, nextTime);
    nextTime += CELEBRATION_LOOP;
  }, CELEBRATION_LOOP * 1000);
  const stop = () => {
    window.clearInterval(interval);
    celebrationStop = null;
    window.dispatchEvent(new Event(CELEBRATION_EVENT));
  };
  celebrationStop = stop;
  window.dispatchEvent(new Event(CELEBRATION_EVENT));
  return stop;
}

export function stopCelebrationMusic(): void {
  if (celebrationStop) celebrationStop();
}
