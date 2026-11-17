// Saved Sentinel-2 readings are loaded only by the field, radar and science routes that display them.
import watch from './fields/field_watch.json';
import { PARCELS } from './parcels.js';
import { distanceKm } from '../engine/world.js';
import fw0 from '../assets/fields/BAK-GA-0301-ndvi.png';
import fw1 from '../assets/fields/BAK-GA-0301-tc.jpg';
import fw2 from '../assets/fields/BAK-GA-0302-ndvi.png';
import fw3 from '../assets/fields/BAK-GA-0302-tc.jpg';
import fw4 from '../assets/fields/BAK-GA-0303-ndvi.png';
import fw5 from '../assets/fields/BAK-GA-0303-tc.jpg';
import fw6 from '../assets/fields/BR-MT-0101-ndvi.png';
import fw7 from '../assets/fields/BR-MT-0101-tc.jpg';
import fw8 from '../assets/fields/BT-PN-0101-ndvi.png';
import fw9 from '../assets/fields/BT-PN-0101-tc.jpg';
import fw10 from '../assets/fields/DAC-TI-0201-ndvi.png';
import fw11 from '../assets/fields/DAC-TI-0201-tc.jpg';
import fw12 from '../assets/fields/DAC-TI-0202-ndvi.png';
import fw13 from '../assets/fields/DAC-TI-0202-tc.jpg';
import fw14 from '../assets/fields/DHM-BL-0218-ndvi.png';
import fw15 from '../assets/fields/DHM-BL-0218-tc.jpg';
import fw16 from '../assets/fields/DHM-CH-0142-ndvi.png';
import fw17 from '../assets/fields/DHM-CH-0142-tc.jpg';
import fw18 from '../assets/fields/DHM-CH-0377-ndvi.png';
import fw19 from '../assets/fields/DHM-CH-0377-tc.jpg';
import fw20 from '../assets/fields/DHM-JD-0093-ndvi.png';
import fw21 from '../assets/fields/DHM-JD-0093-tc.jpg';
import fw22 from '../assets/fields/ES-AN-0101-ndvi.png';
import fw23 from '../assets/fields/ES-AN-0101-tc.jpg';
import fw24 from '../assets/fields/GAN-KO-0401-ndvi.png';
import fw25 from '../assets/fields/GAN-KO-0401-tc.jpg';
import fw26 from '../assets/fields/GAN-KO-0402-ndvi.png';
import fw27 from '../assets/fields/GAN-KO-0402-tc.jpg';
import fw28 from '../assets/fields/GDG-CA-0062-ndvi.png';
import fw29 from '../assets/fields/GDG-CA-0062-tc.jpg';
import fw30 from '../assets/fields/GDG-DP-0311-ndvi.png';
import fw31 from '../assets/fields/GDG-DP-0311-tc.jpg';
import fw32 from '../assets/fields/GDG-DP-0587-ndvi.png';
import fw33 from '../assets/fields/GDG-DP-0587-tc.jpg';
import fw34 from '../assets/fields/GDG-GG-0144-ndvi.png';
import fw35 from '../assets/fields/GDG-GG-0144-tc.jpg';
import fw36 from '../assets/fields/GOW-RU-0501-ndvi.png';
import fw37 from '../assets/fields/GOW-RU-0501-tc.jpg';
import fw38 from '../assets/fields/GOW-RU-0502-ndvi.png';
import fw39 from '../assets/fields/GOW-RU-0502-tc.jpg';
import fw40 from '../assets/fields/IN-PB-0101-ndvi.png';
import fw41 from '../assets/fields/IN-PB-0101-tc.jpg';
import fw42 from '../assets/fields/MM-MG-0101-ndvi.png';
import fw43 from '../assets/fields/MM-MG-0101-tc.jpg';
import fw44 from '../assets/fields/NP-KL-0101-ndvi.png';
import fw45 from '../assets/fields/NP-KL-0101-tc.jpg';
import fw46 from '../assets/fields/PK-SD-0101-ndvi.png';
import fw47 from '../assets/fields/PK-SD-0101-tc.jpg';
import fw48 from '../assets/fields/SIT-SA-0101-ndvi.png';
import fw49 from '../assets/fields/SIT-SA-0101-tc.jpg';
import fw50 from '../assets/fields/SIT-SA-0102-ndvi.png';
import fw51 from '../assets/fields/SIT-SA-0102-tc.jpg';
import fw52 from '../assets/fields/US-NV-0101-ndvi.png';
import fw53 from '../assets/fields/US-NV-0101-tc.jpg';

export const WATCH = watch;
export const WATCH_PROV = watch.provenance;

const pics = {
  '../assets/fields/BAK-GA-0301-ndvi.png': fw0,
  '../assets/fields/BAK-GA-0301-tc.jpg': fw1,
  '../assets/fields/BAK-GA-0302-ndvi.png': fw2,
  '../assets/fields/BAK-GA-0302-tc.jpg': fw3,
  '../assets/fields/BAK-GA-0303-ndvi.png': fw4,
  '../assets/fields/BAK-GA-0303-tc.jpg': fw5,
  '../assets/fields/BR-MT-0101-ndvi.png': fw6,
  '../assets/fields/BR-MT-0101-tc.jpg': fw7,
  '../assets/fields/BT-PN-0101-ndvi.png': fw8,
  '../assets/fields/BT-PN-0101-tc.jpg': fw9,
  '../assets/fields/DAC-TI-0201-ndvi.png': fw10,
  '../assets/fields/DAC-TI-0201-tc.jpg': fw11,
  '../assets/fields/DAC-TI-0202-ndvi.png': fw12,
  '../assets/fields/DAC-TI-0202-tc.jpg': fw13,
  '../assets/fields/DHM-BL-0218-ndvi.png': fw14,
  '../assets/fields/DHM-BL-0218-tc.jpg': fw15,
  '../assets/fields/DHM-CH-0142-ndvi.png': fw16,
  '../assets/fields/DHM-CH-0142-tc.jpg': fw17,
  '../assets/fields/DHM-CH-0377-ndvi.png': fw18,
  '../assets/fields/DHM-CH-0377-tc.jpg': fw19,
  '../assets/fields/DHM-JD-0093-ndvi.png': fw20,
  '../assets/fields/DHM-JD-0093-tc.jpg': fw21,
  '../assets/fields/ES-AN-0101-ndvi.png': fw22,
  '../assets/fields/ES-AN-0101-tc.jpg': fw23,
  '../assets/fields/GAN-KO-0401-ndvi.png': fw24,
  '../assets/fields/GAN-KO-0401-tc.jpg': fw25,
  '../assets/fields/GAN-KO-0402-ndvi.png': fw26,
  '../assets/fields/GAN-KO-0402-tc.jpg': fw27,
  '../assets/fields/GDG-CA-0062-ndvi.png': fw28,
  '../assets/fields/GDG-CA-0062-tc.jpg': fw29,
  '../assets/fields/GDG-DP-0311-ndvi.png': fw30,
  '../assets/fields/GDG-DP-0311-tc.jpg': fw31,
  '../assets/fields/GDG-DP-0587-ndvi.png': fw32,
  '../assets/fields/GDG-DP-0587-tc.jpg': fw33,
  '../assets/fields/GDG-GG-0144-ndvi.png': fw34,
  '../assets/fields/GDG-GG-0144-tc.jpg': fw35,
  '../assets/fields/GOW-RU-0501-ndvi.png': fw36,
  '../assets/fields/GOW-RU-0501-tc.jpg': fw37,
  '../assets/fields/GOW-RU-0502-ndvi.png': fw38,
  '../assets/fields/GOW-RU-0502-tc.jpg': fw39,
  '../assets/fields/IN-PB-0101-ndvi.png': fw40,
  '../assets/fields/IN-PB-0101-tc.jpg': fw41,
  '../assets/fields/MM-MG-0101-ndvi.png': fw42,
  '../assets/fields/MM-MG-0101-tc.jpg': fw43,
  '../assets/fields/NP-KL-0101-ndvi.png': fw44,
  '../assets/fields/NP-KL-0101-tc.jpg': fw45,
  '../assets/fields/PK-SD-0101-ndvi.png': fw46,
  '../assets/fields/PK-SD-0101-tc.jpg': fw47,
  '../assets/fields/SIT-SA-0101-ndvi.png': fw48,
  '../assets/fields/SIT-SA-0101-tc.jpg': fw49,
  '../assets/fields/SIT-SA-0102-ndvi.png': fw50,
  '../assets/fields/SIT-SA-0102-tc.jpg': fw51,
  '../assets/fields/US-NV-0101-ndvi.png': fw52,
  '../assets/fields/US-NV-0101-tc.jpg': fw53,
};
const picOf = (id, kind) => pics[`../assets/fields/${id}-${kind}`];

// The saved reading for a parcel, only while the parcel is still where (and as big as) it was when it was read.
// The saved readings cover a window around the pin, so a field with a real boundary is read again over its boundary.
export function savedWatch(p) {
  const base = PARCELS.find((x) => x.id === p.id);
  const w = watch.parcels[p.id];
  if (!base || !w || (p.boundary && p.boundary.source !== 'sample') || base.area_dec !== p.area_dec || distanceKm(base, p) > 0.015) return null;
  return { ...w, pictures: { tc: picOf(p.id, 'tc.jpg'), ndvi: picOf(p.id, 'ndvi.png'), date: w.latest } };
}
