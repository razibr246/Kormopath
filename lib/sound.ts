"use client";

// Web Audio API harmonic sound generator (0 bytes external network overhead)
let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      try {
        ctx = new AudioCtx();
      } catch {
        // audio context blocked or unavailable
      }
    }
  }
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function playSuccessChime() {
  const c = getAudioContext();
  if (!c) return;

  try {
    const now = c.currentTime;
    // Two-tone rising harmonic chime (C5 -> E5 -> G5)
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(c.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch {
    // ignore
  }
}

export function playCoinSound() {
  const c = getAudioContext();
  if (!c) return;

  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // ignore
  }
}

export function playClick() {
  const c = getAudioContext();
  if (!c) return;

  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    // ignore
  }
}
