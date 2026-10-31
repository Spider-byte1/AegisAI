// Tiny Web Audio synth for the SOC sound effects: no audio files, nothing to download.
// Sound is OFF by default and only starts after the user switches it on (browsers also
// require a click before any audio may play).

export type SoundKind = "type" | "critical" | "alert" | "success" | "enable";

interface Beep {
  freq: number;
  start: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

export const SOUND_PATTERNS: Record<SoundKind, Beep[]> = {
  type: [{ freq: 1250, start: 0, duration: 0.022, type: "square", volume: 0.012 }],
  enable: [{ freq: 660, start: 0, duration: 0.09, type: "triangle", volume: 0.05 }],
  success: [
    { freq: 523, start: 0, duration: 0.1, type: "sine", volume: 0.06 },
    { freq: 784, start: 0.12, duration: 0.18, type: "sine", volume: 0.06 },
  ],
  alert: [
    { freq: 740, start: 0, duration: 0.12, type: "square", volume: 0.045 },
    { freq: 988, start: 0.16, duration: 0.16, type: "square", volume: 0.045 },
  ],
  critical: [
    { freq: 880, start: 0, duration: 0.14, type: "sawtooth", volume: 0.055 },
    { freq: 620, start: 0.18, duration: 0.14, type: "sawtooth", volume: 0.055 },
    { freq: 880, start: 0.36, duration: 0.14, type: "sawtooth", volume: 0.055 },
    { freq: 620, start: 0.54, duration: 0.22, type: "sawtooth", volume: 0.055 },
  ],
};

type AudioContextConstructor = typeof AudioContext;
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextConstructor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function playSound(kind: SoundKind): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const beep of SOUND_PATTERNS[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = beep.type;
    osc.frequency.value = beep.freq;
    const t0 = now + beep.start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(beep.volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + beep.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + beep.duration + 0.02);
  }
}

// --- the on/off preference, readable with useSyncExternalStore (no hydration mismatch) ---
const STORAGE_KEY = "aegisai_sound";
const listeners = new Set<() => void>();

export const soundStore = {
  getSnapshot(): boolean {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      return false;
    }
  },
  getServerSnapshot(): boolean {
    return false;
  },
  subscribe(callback: () => void): () => void {
    listeners.add(callback);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", onStorage);
    };
  },
  set(on: boolean): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      /* storage unavailable: the preference just won't persist */
    }
    listeners.forEach((l) => l());
  },
};
