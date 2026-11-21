"use client";
// The life story's sound: soft music and a little sound design, synthesised live with the Web Audio API (no audio
// files, nothing to license, nothing to download). The score is in lib/storyScore.ts.
//   pad     three soft detuned voices per chord through a low-pass filter (dark in the struggle, open once solved)
//   pluck   a short plucked melody in the pentatonic, through a soft echo
//   rain    filtered noise; birds: short chirp sweeps once the sun is out
//   cues    a bell chime when Buddy appears, a whoosh on each chapter slate, coins, a soft warning tone
// Everything runs into one reverb and a compressor, then the master volume. It only makes sound after the visitor
// presses something (browsers require that), and it suspends whenever the story is paused or off screen.
import { BAR_SECONDS, BEATS_PER_BAR, chordAt, hz, melodyAt, mix } from "@/lib/storyScore";

export type StoryAudioState = { playing: boolean; mood: number; rain: number; epilogue: boolean; indoor: boolean };

export class StoryAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private fx: GainNode;
  private reverb: ConvolverNode;
  private padFilter: BiquadFilterNode;
  private padGain: GainNode;
  private pluckGain: GainNode;
  private rainGain: GainNode;
  private birdGain: GainNode;
  private echo: DelayNode;
  private timer: number | null = null;
  private nextBeat = 0;
  private beatIndex = 0;
  private state: StoryAudioState = { playing: false, mood: 0, rain: 0, epilogue: false, indoor: false };
  private nextBird = 0;

  constructor(volume: number) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.master = ctx.createGain(); this.master.gain.value = volume;
    comp.connect(this.master).connect(ctx.destination);

    // A small hall: two seconds of decaying noise as the impulse response.
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    this.reverb.connect(wet).connect(comp);

    this.music = ctx.createGain(); this.music.gain.value = 0.55;
    this.music.connect(comp); this.music.connect(this.reverb);
    this.fx = ctx.createGain(); this.fx.gain.value = 0.7;
    this.fx.connect(comp); this.fx.connect(this.reverb);

    this.padFilter = ctx.createBiquadFilter(); this.padFilter.type = "lowpass"; this.padFilter.frequency.value = 800; this.padFilter.Q.value = 0.5;
    this.padGain = ctx.createGain(); this.padGain.gain.value = 0.4;
    this.padFilter.connect(this.padGain).connect(this.music);

    this.echo = ctx.createDelay(1); this.echo.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    this.echo.connect(fb).connect(this.echo);
    this.pluckGain = ctx.createGain(); this.pluckGain.gain.value = 0.25;
    this.pluckGain.connect(this.music); this.pluckGain.connect(this.echo); this.echo.connect(this.music);

    // Rain: a looped noise buffer, band-limited so it sounds like rain on leaves and tin, not static.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const rainSrc = ctx.createBufferSource(); rainSrc.buffer = noise; rainSrc.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    rainSrc.connect(hp).connect(lp).connect(this.rainGain).connect(this.fx);
    rainSrc.start();
    this.birdGain = ctx.createGain(); this.birdGain.gain.value = 0;
    this.birdGain.connect(this.fx);
  }

  get running() { return this.ctx.state === "running"; }

  /** Must be called from a click or key press the first time (browser autoplay rules). */
  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume().catch(() => {});
    if (this.timer === null) {
      this.nextBeat = this.ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 100);
    }
  }

  suspend() {
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
    this.ctx.suspend().catch(() => {});
  }

  setVolume(v: number) { this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08); }

  /** Called from the story's frame loop: layer levels glide to the new state. */
  update(next: StoryAudioState) {
    const prev = this.state; this.state = next;
    if (!this.running) return;
    const m = mix(next), now = this.ctx.currentTime;
    if (Math.abs(prev.mood - next.mood) > 0.01 || prev.epilogue !== next.epilogue || prev.indoor !== next.indoor || Math.abs(prev.rain - next.rain) > 0.02) {
      this.padGain.gain.setTargetAtTime(m.pad * 0.5, now, 0.6);
      this.pluckGain.gain.setTargetAtTime(m.pluck * 0.5, now, 0.4);
      this.rainGain.gain.setTargetAtTime(m.rain * 0.16, now, 0.5);
      this.birdGain.gain.setTargetAtTime(m.birds * 0.5, now, 0.8);
      this.padFilter.frequency.setTargetAtTime(m.cutoff, now, 0.8);
    }
  }

  private schedule() {
    const ctx = this.ctx, beatLen = BAR_SECONDS / BEATS_PER_BAR;
    while (this.nextBeat < ctx.currentTime + 0.35) {
      const bar = Math.floor(this.beatIndex / BEATS_PER_BAR), beat = this.beatIndex % BEATS_PER_BAR;
      const { mood, epilogue } = this.state;
      if (beat === 0) this.padChord(bar, this.nextBeat);
      const n = melodyAt(bar, beat, mood, epilogue);
      if (n !== null) this.pluck(hz(n), this.nextBeat, 0.7 + (beat === 0 ? 0.2 : 0));
      this.nextBeat += beatLen; this.beatIndex++;
    }
    if (ctx.currentTime > this.nextBird && mix(this.state).birds > 0.05) {
      this.chirp(ctx.currentTime + 0.05);
      this.nextBird = ctx.currentTime + 1.4 + Math.random() * 3.2;
    }
  }

  private padChord(bar: number, at: number) {
    const ctx = this.ctx, chord = chordAt(bar, this.state.mood), dur = BAR_SECONDS + 1.6;
    for (const semis of chord.notes) {
      for (const [type, detune, level] of [["triangle", -6, 0.08], ["sine", 7, 0.07]] as const) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = hz(semis); o.detune.value = detune;
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(level, at + 1.4); // slow swell, no attack click
        g.gain.setTargetAtTime(0, at + BAR_SECONDS - 0.2, 0.7);
        o.connect(g).connect(this.padFilter);
        o.start(at); o.stop(at + dur + 2);
      }
    }
  }

  private pluck(freq: number, at: number, vel: number) {
    const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = freq;
    o2.type = "sine"; o2.frequency.value = freq * 2; // a soft overtone, like a plucked string
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    f.type = "lowpass"; f.frequency.setValueAtTime(freq * 6, at); f.frequency.exponentialRampToValueAtTime(freq * 1.5, at + 0.6);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.18 * vel, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 1.6);
    o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(this.pluckGain);
    o.start(at); o2.start(at); o.stop(at + 1.7); o2.stop(at + 1.7);
  }

  private chirp(at: number) {
    const ctx = this.ctx, notes = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1600;
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t0 = at + i * 0.11;
      o.type = "sine";
      o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t0 + 0.07);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.09);
      o.connect(g).connect(this.birdGain); o.start(t0); o.stop(t0 + 0.12);
    }
  }

  /** One-shot sound cues for story moments. */
  cue(kind: "chime" | "whoosh" | "coin" | "warn" | "rise") {
    if (!this.running) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const tone = (freq: number, at: number, len: number, level: number, type: OscillatorType = "sine") => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(level, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0005, at + len);
      o.connect(g).connect(this.fx); o.start(at); o.stop(at + len + 0.05);
    };
    if (kind === "chime") {
      // a small bell: a fundamental and its inharmonic partials, the sound of Buddy arriving
      for (const [k, l] of [[1, 0.09], [2.76, 0.035], [5.4, 0.018]] as const) tone(hz(15) * k, t, 2.2 / k + 0.4, l);
      tone(hz(19), t + 0.12, 1.6, 0.05);
    } else if (kind === "coin") {
      tone(hz(31), t, 0.25, 0.04, "triangle"); tone(hz(35), t + 0.06, 0.3, 0.03, "triangle");
    } else if (kind === "warn") {
      tone(hz(-5), t, 0.35, 0.07, "triangle"); tone(hz(-9), t + 0.22, 0.45, 0.07, "triangle");
    } else if (kind === "rise") {
      // the epilogue: a slow pentatonic arpeggio rising into the sunrise
      [-9, -5, -2, 0, 3, 7, 10, 12].forEach((s, i) => tone(hz(s + 12), t + i * 0.16, 2.4, 0.045, "triangle"));
    } else {
      // whoosh: noise swept through a band-pass, the chapter slate passing
      const len = 0.9, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; bp.type = "bandpass"; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.45); bp.frequency.exponentialRampToValueAtTime(600, t + len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0005, t + len);
      src.connect(bp).connect(g).connect(this.fx); src.start(t); src.stop(t + len);
    }
  }

  close() { this.suspend(); this.ctx.close().catch(() => {}); }
}
