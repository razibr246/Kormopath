/**
 * The life story's score: soft music generated live in the browser (components/home/storyAudio.ts plays it).
 * Pure data and maths, no imports: tested in tests/story-score.test.ts.
 *
 * Harmony: the five notes C D E G A, a pentatonic shared by raga Bhupali and much Bengali folk tune, so no melody note
 * ever clashes with a chord. While Rafi struggles the progression leans minor (Am F C G) and sits low and dark; once it
 * is solved it turns to the relative major (C G Am F), opens up and brightens. The epilogue plays the major
 * progression with a fuller melody. One bar is four seconds (60 bpm): slow enough to stay under the voice lines.
 */

export const BAR_SECONDS = 4;
export const BEATS_PER_BAR = 4;

/** Semitones from A4 (440 Hz) → frequency. */
export const hz = (semisFromA4: number) => 440 * Math.pow(2, semisFromA4 / 12);

/** Note names to semitones from A4, octave 4 (C4 = -9). */
const NOTE: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
export const note = (name: string, octave = 4) => NOTE[name] + (octave - 4) * 12;

/** The melody's scale: C D E G A (pentatonic). */
export const PENTATONIC = ["C", "D", "E", "G", "A"] as const;

export type Chord = { name: string; notes: number[] };
const chord = (name: string, root: string, third: string, fifth: string, octave = 3): Chord => ({
  name,
  notes: [note(root, octave), note(third, octave + (NOTE[third] < NOTE[root] ? 1 : 0)), note(fifth, octave + (NOTE[fifth] < NOTE[root] ? 1 : 0))],
});
const Am = chord("Am", "A", "C", "E"), F = chord("F", "F", "A", "C"), C = chord("C", "C", "E", "G"), G = chord("G", "G", "B", "D");

/** Struggle: minor. Solved and the epilogue: the relative major. */
export const PROGRESSIONS = { minor: [Am, F, C, G], major: [C, G, Am, F] } as const;

/** Which chord plays in bar `bar` for a mood (0 = struggle … 1 = solved). */
export function chordAt(bar: number, mood: number): Chord {
  const prog = mood >= 0.5 ? PROGRESSIONS.major : PROGRESSIONS.minor;
  return prog[((bar % prog.length) + prog.length) % prog.length];
}

/** A small deterministic hash, so the melody is the same every time the film plays. */
const h = (n: number) => { const v = Math.sin(n * 91.345 + 47.853) * 43758.5453; return v - Math.floor(v); };

/**
 * The melody note on beat `beat` of bar `bar`, or null for a rest. Sparse while he struggles (a note every other bar
 * or so), more present once solved, fullest in the epilogue. Notes are chosen from the pentatonic near the chord's
 * root, stepping rather than leaping, in octave 5.
 */
export function melodyAt(bar: number, beat: number, mood: number, epilogue = false): number | null {
  const density = epilogue ? 0.72 : 0.18 + mood * 0.42;
  if (h(bar * 13 + beat * 7 + 1) > density) return null;
  if (beat === 3 && !epilogue && mood < 0.5) return null; // leave air at the bar's end while it is sad
  const root = chordAt(bar, mood).notes[0];
  const rootName = PENTATONIC.find((n) => (note(n, 3) - root) % 12 === 0) ?? "A";
  const start = PENTATONIC.indexOf(rootName as (typeof PENTATONIC)[number]);
  const step = Math.floor(h(bar * 5 + beat * 11 + 3) * 3) - 1 + (beat === 0 ? 0 : beat % 2); // -1 … +2 scale steps
  const idx = start + step + 2; // a third above the root, then wander
  const name = PENTATONIC[((idx % 5) + 5) % 5];
  return note(name, 5);
}

/** The target loudness of each layer (0..1) for the story's state. */
export function mix(state: { mood: number; rain: number; epilogue: boolean; indoor: boolean }) {
  const { mood, rain, epilogue, indoor } = state;
  return {
    pad: epilogue ? 0.62 : 0.42 + mood * 0.14,
    pluck: epilogue ? 0.5 : 0.22 + mood * 0.22,
    // rain on a roof sounds softer from inside a room
    rain: Math.max(0, Math.min(1, rain)) * (indoor ? 0.35 : 0.6),
    birds: epilogue ? 0.5 : Math.max(0, mood - 0.4) * (indoor ? 0.25 : 0.7),
    /** Low-pass cutoff of the pad, Hz: dark and muffled in the struggle, open once solved. */
    cutoff: epilogue ? 2600 : 700 + mood * 1500,
  };
}
