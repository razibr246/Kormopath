// The upazila offices' land registry (parcels.json), with the bundled pictures of each field.
import registry from './fields/parcels.json';
import samples from './fields/sample_shapes.json';

// Every demo field is drawn by a shape: the sample outline (a real field's edge in the satellite photo near the pin,
// scripts/build/sample_field_shapes.mjs), labelled as a sample, until someone gives the field's real boundary.
export function sampleBoundary(id) {
  const s = samples.fields[id];
  return s?.ok ? { ...s.geometry, source: 'sample', at: samples.provenance.made, conf: s.conf } : null;
}

export const PARCELS = registry.parcels.map((p) => { const b = sampleBoundary(p.id); return b ? { ...p, boundary: b } : p; });

export const decToBigha = (dec) => dec / 33;
