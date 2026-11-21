import { test } from "node:test";
import assert from "node:assert/strict";
import { hz, note, chordAt, melodyAt, mix, PENTATONIC, PROGRESSIONS } from "../lib/storyScore.ts";

test("tuning: A4 is 440 Hz and C4 is middle C", () => {
  assert.equal(hz(note("A", 4)), 440);
  assert.ok(Math.abs(hz(note("C", 4)) - 261.63) < 0.01);
});

test("struggle is minor, solved is the relative major", () => {
  assert.equal(chordAt(0, 0).name, "Am");
  assert.equal(chordAt(0, 1).name, "C");
  assert.deepEqual(PROGRESSIONS.minor.map((c) => c.name), ["Am", "F", "C", "G"]);
});

test("every melody note is in the pentatonic, so it never clashes", () => {
  const pcs = new Set(PENTATONIC.map((n) => ((note(n, 4) % 12) + 12) % 12));
  let notes = 0;
  for (let bar = 0; bar < 64; bar++) for (let beat = 0; beat < 4; beat++) for (const [mood, epi] of [[0, false], [1, false], [1, true]] as const) {
    const m = melodyAt(bar, beat, mood, epi);
    if (m === null) continue;
    notes++;
    assert.ok(pcs.has(((m % 12) + 12) % 12), `bar ${bar} beat ${beat}: ${m}`);
  }
  assert.ok(notes > 40);
});

test("the melody is sparser in the struggle than once solved, and fullest in the epilogue", () => {
  const count = (mood: number, epi = false) => { let n = 0; for (let b = 0; b < 200; b++) for (let k = 0; k < 4; k++) if (melodyAt(b, k, mood, epi) !== null) n++; return n; };
  const sad = count(0), happy = count(1), epi = count(1, true);
  assert.ok(sad < happy && happy < epi, `${sad} < ${happy} < ${epi}`);
});

test("mix: rain is softer indoors, the music opens up as the mood lifts", () => {
  assert.ok(mix({ mood: 0, rain: 1, epilogue: false, indoor: true }).rain < mix({ mood: 0, rain: 1, epilogue: false, indoor: false }).rain);
  assert.ok(mix({ mood: 1, rain: 0, epilogue: false, indoor: false }).cutoff > mix({ mood: 0, rain: 1, epilogue: false, indoor: false }).cutoff);
  assert.equal(mix({ mood: 0, rain: 0, epilogue: false, indoor: false }).birds, 0);
});
