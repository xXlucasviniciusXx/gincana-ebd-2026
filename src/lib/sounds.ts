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
