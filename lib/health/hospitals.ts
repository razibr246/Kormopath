/*
 * Emergency hospital finder core (MediScan). NO imports — pure and unit-tested (tests/health-hospitals.test.ts).
 *
 * Data comes from OpenStreetMap through the Overpass API (app/api/health/hospitals/route.ts). OSM is community data:
 * it can be incomplete or out of date. So this module never says a facility is "available": a facility is either
 * "tagged" (an OSM tag says the hospital has it) or "unknown" (call the hospital to confirm). Nothing is invented —
 * no hospital, phone, coordinate or facility exists here unless it came from the map data.
 */

export const OSM_COPYRIGHT = { label: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" } as const;
export const OVERPASS_POLICY = {
  label: "Overpass API — fair use (about 10,000 requests and 1 GB a day per user)",
  url: "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
  checked: "2026-11-18",
} as const;
/** 999 connects callers to police, fire service and ambulance help; ambulances are not free. */
export const NINE_NINE_NINE = {
  label: "National Emergency Service 999 — police, fire service and ambulance (ambulance service is not free)",
  url: "https://patanusharup.moulvibazar.gov.bd/en/site/page/npQv-%E0%A6%AB%E0%A7%8B%E0%A6%A8%E0%A7%87-%E0%A6%AA%E0%A7%81%E0%A6%B2%E0%A6%BF%E0%A6%B6%E0%A6%BF-%E0%A6%B8%E0%A6%B9%E0%A6%BE%E0%A7%9F%E0%A6%A4%E0%A6%BE",
  checked: "2026-11-18",
} as const;

/** Bangladesh bounding box (generous), so the server never queries elsewhere. */
export const BD_BOUNDS = { minLat: 20.5, maxLat: 26.7, minLon: 88.0, maxLon: 92.7 } as const;
export const MAX_RADIUS_KM = 25;
export const inBangladesh = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && lat >= BD_BOUNDS.minLat && lat <= BD_BOUNDS.maxLat && lon >= BD_BOUNDS.minLon && lon <= BD_BOUNDS.maxLon;

// ---------------------------------------------------------------------------------------------
// Distance and a labelled travel-time estimate
// ---------------------------------------------------------------------------------------------

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371.0088, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Assumed average road speed for the rough estimate. Straight-line distance × 1.4 for roads, at 20 km/h city traffic. */
export const ESTIMATE_SPEED_KMH = 20;
export const ROAD_FACTOR = 1.4;
/** Approximate minutes by road. Always shown with the word "approximately" and the assumption. */
export const approxMinutes = (km: number) => Math.max(1, Math.round(((km * ROAD_FACTOR) / ESTIMATE_SPEED_KMH) * 60));

// ---------------------------------------------------------------------------------------------
// Emergency types and facilities
// ---------------------------------------------------------------------------------------------

export type EmergencyType = "heart" | "injury" | "breathing" | "pregnancy" | "child" | "burn" | "stroke" | "poisoning" | "other";

export const EMERGENCY_TYPES: { id: EmergencyType; bn: string; en: string; specialities: string[] }[] = [
  { id: "heart", bn: "বুকে ব্যথা / হার্ট", en: "Chest pain / heart", specialities: ["cardiology", "cardiac_surgery", "cardiothoracic_surgery"] },
  { id: "injury", bn: "দুর্ঘটনা / আঘাত", en: "Accident / injury", specialities: ["trauma", "orthopaedics", "emergency", "general_surgery", "neurosurgery"] },
  { id: "breathing", bn: "শ্বাসকষ্ট", en: "Breathing trouble", specialities: ["pulmonology", "chest", "respiratory", "intensive"] },
  { id: "pregnancy", bn: "গর্ভাবস্থা / প্রসব", en: "Pregnancy / delivery", specialities: ["obstetrics", "gynaecology", "maternity", "obstetrics_gynaecology"] },
  { id: "child", bn: "শিশুর জরুরি অবস্থা", en: "Child emergency", specialities: ["paediatrics", "pediatrics", "neonatology"] },
  { id: "burn", bn: "আগুনে পোড়া", en: "Burn", specialities: ["burn", "plastic_surgery"] },
  { id: "stroke", bn: "স্ট্রোক", en: "Stroke", specialities: ["neurology", "neurosurgery", "stroke"] },
  { id: "poisoning", bn: "বিষক্রিয়া", en: "Poisoning", specialities: ["toxicology", "emergency", "internal"] },
  { id: "other", bn: "অন্য জরুরি অবস্থা", en: "Other emergency", specialities: [] },
];

export type FacilityId = "icu" | "ccu" | "nicu" | "burn" | "blood_bank" | "oxygen" | "ct" | "mri" | "ambulance";

export const FACILITIES: { id: FacilityId; bn: string; en: string }[] = [
  { id: "icu", bn: "আইসিইউ", en: "ICU" },
  { id: "ccu", bn: "সিসিইউ", en: "CCU" },
  { id: "nicu", bn: "এনআইসিইউ (নবজাতক)", en: "NICU" },
  { id: "burn", bn: "বার্ন ইউনিট", en: "Burn unit" },
  { id: "blood_bank", bn: "ব্লাড ব্যাংক", en: "Blood bank" },
  { id: "oxygen", bn: "অক্সিজেন", en: "Oxygen" },
  { id: "ct", bn: "সিটি স্ক্যান", en: "CT scan" },
  { id: "mri", bn: "এমআরআই", en: "MRI" },
  { id: "ambulance", bn: "অ্যাম্বুলেন্স", en: "Ambulance" },
];

// ---------------------------------------------------------------------------------------------
// Parsing Overpass JSON
// ---------------------------------------------------------------------------------------------

export type PlaceKind = "hospital" | "clinic" | "ambulance_station";

export interface Place {
  id: string; // "node/123"
  kind: PlaceKind;
  name: string;
  nameBn: string | null;
  nameEn: string | null;
  lat: number;
  lon: number;
  address: string | null;
  phone: string | null; // only from the map data
  emergency: "yes" | "no" | "unknown";
  openingHours: string | null;
  open24x7: boolean; // only when opening_hours is exactly "24/7"
  specialities: string[];
  beds: number | null;
  facilities: FacilityId[]; // tagged in the map data only
  osmUrl: string;
}

type Raw = { type?: unknown; id?: unknown; lat?: unknown; lon?: unknown; center?: { lat?: unknown; lon?: unknown }; tags?: Record<string, unknown> };

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Bangladesh phone numbers from a tag value: keeps digits and a leading +, splits on ; , / */
export function cleanPhones(v: unknown): string[] {
  const s = str(v, 300);
  if (!s) return [];
  return s.split(/[;,/]|\bor\b/).map((p) => p.trim().replace(/[^\d+]/g, "")).filter((p) => /^\+?\d{3,15}$/.test(p) && (p.replace(/\D/g, "").length >= 5 || /^(999|333|16263)$/.test(p))).slice(0, 3);
}

const yes = (v: unknown) => typeof v === "string" && /^(yes|true|designated|24\/7)$/i.test(v.trim());

function facilitiesFrom(tags: Record<string, unknown>, specs: string[]): FacilityId[] {
  const out = new Set<FacilityId>();
  const t = (k: string) => tags[k];
  if (yes(t("healthcare:icu")) || yes(t("icu")) || specs.includes("intensive") || specs.includes("intensive_care")) out.add("icu");
  if (yes(t("healthcare:ccu")) || yes(t("ccu"))) out.add("ccu");
  if (yes(t("healthcare:nicu")) || yes(t("nicu")) || specs.includes("neonatology")) out.add("nicu");
  if (yes(t("healthcare:burn")) || specs.includes("burn")) out.add("burn");
  if (yes(t("healthcare:blood_bank")) || yes(t("blood_bank")) || yes(t("healthcare:blood_donation")) || t("healthcare") === "blood_bank") out.add("blood_bank");
  if (yes(t("healthcare:oxygen")) || yes(t("oxygen"))) out.add("oxygen");
  if (yes(t("healthcare:ct")) || yes(t("ct_scanner"))) out.add("ct");
  if (yes(t("healthcare:mri")) || yes(t("mri"))) out.add("mri");
  if (yes(t("emergency:ambulance")) || yes(t("ambulance")) || yes(t("healthcare:ambulance"))) out.add("ambulance");
  return [...out];
}

function kindOf(tags: Record<string, unknown>): PlaceKind | null {
  if (tags.emergency === "ambulance_station") return "ambulance_station";
  if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "hospital";
  if ((tags.amenity === "clinic" || tags.healthcare === "clinic") && tags.emergency === "yes") return "clinic";
  return null;
}

/**
 * Map data sometimes tags shops as hospitals (seen in Dhaka: "Meherun Homeo Pharmacy" with amenity=hospital and
 * emergency=yes). Someone in an emergency must never be sent to one, so places whose own name says pharmacy,
 * homeopathy, dispensary or outpatient-only are dropped, as are diagnostic centres that do not also say hospital.
 */
const NOT_EMERGENCY = /pharma|ফার্মে|ফার্মা|homeo|হোমিও|dispensary|ডিসপেনসারি|\boutdoor\b|আউটডোর|\bopd\b|\bchamber\b|চেম্বার|drug ?store|ওষুধের দোকান|optical|dental|ডেন্টাল/i;
const DIAGNOSTIC = /diagnostic|ডায়াগনস্টিক|ডায়াগনস্টিক/i;
const HOSPITAL_WORD = /hospital|হাসপাতাল|clinic|ক্লিনিক|medical college|মেডিকেল কলেজ/i;
export function notEmergencyCare(name: string): boolean {
  if (NOT_EMERGENCY.test(name)) return true;
  return DIAGNOSTIC.test(name) && !HOSPITAL_WORD.test(name);
}

/** Turn one Overpass element into a Place, or null if it lacks a position, a name or a relevant tag. */
export function parseElement(el: Raw): Place | null {
  if (!el || typeof el !== "object") return null;
  const tags = (el.tags && typeof el.tags === "object" ? el.tags : {}) as Record<string, unknown>;
  const kind = kindOf(tags);
  if (!kind) return null;
  const lat = typeof el.lat === "number" ? el.lat : typeof el.center?.lat === "number" ? el.center.lat : NaN;
  const lon = typeof el.lon === "number" ? el.lon : typeof el.center?.lon === "number" ? el.center.lon : NaN;
  if (!inBangladesh(lat, lon)) return null;
  const nameBn = str(tags["name:bn"]);
  const nameEn = str(tags["name:en"]);
  const rawName = str(tags.name) ?? nameBn ?? nameEn;
  if (!rawName) return null; // an unnamed point is not something to send a patient to
  // Some volunteers join several places in one name ("X Hospital;X Diagnostic Center"): show the first.
  const name = rawName.split(";")[0].trim() || rawName;
  if (kind !== "ambulance_station" && notEmergencyCare([name, nameBn, nameEn].filter(Boolean).join(" "))) return null;
  const type = typeof el.type === "string" && /^(node|way|relation)$/.test(el.type) ? el.type : "node";
  const id = typeof el.id === "number" || typeof el.id === "string" ? String(el.id) : "0";
  const specs = (str(tags["healthcare:speciality"], 400) ?? "").split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  const addr = str(tags["addr:full"]) ?? ([tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].map((v) => str(v, 80)).filter(Boolean).join(", ") || null);
  const phone = [...cleanPhones(tags.phone), ...cleanPhones(tags["contact:phone"]), ...cleanPhones(tags["emergency:phone"]), ...cleanPhones(tags["contact:mobile"])][0] ?? null;
  const em = tags.emergency === "yes" ? "yes" : tags.emergency === "no" ? "no" : "unknown";
  const hours = str(tags.opening_hours, 120);
  const bedsRaw = typeof tags.beds === "string" ? parseInt(tags.beds, 10) : NaN;
  return {
    id: `${type}/${id}`, kind, name, nameBn, nameEn, lat, lon, address: addr, phone,
    emergency: kind === "ambulance_station" ? "unknown" : em, openingHours: hours, open24x7: hours === "24/7",
    specialities: specs, beds: Number.isFinite(bedsRaw) && bedsRaw > 0 && bedsRaw < 10000 ? bedsRaw : null,
    facilities: facilitiesFrom(tags, specs), osmUrl: `https://www.openstreetmap.org/${type}/${id}`,
  };
}

/** Parse a whole Overpass response, dropping duplicates (same name within 150 m). */
export function parseOverpass(json: unknown): Place[] {
  const els = json && typeof json === "object" && Array.isArray((json as { elements?: unknown }).elements) ? (json as { elements: Raw[] }).elements : [];
  const out: Place[] = [];
  for (const el of els.slice(0, 2000)) {
    const p = parseElement(el);
    if (!p) continue;
    if (out.some((q) => q.name.toLowerCase() === p.name.toLowerCase() && distanceKm(q.lat, q.lon, p.lat, p.lon) < 0.15)) continue;
    out.push(p);
  }
  return out;
}

/** The Overpass QL query for a point and radius (metres). */
export function overpassQuery(lat: number, lon: number, radiusM: number): string {
  const a = `(around:${Math.round(radiusM)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  return `[out:json][timeout:25];(nwr["amenity"="hospital"]${a};nwr["healthcare"="hospital"]${a};nwr["amenity"="clinic"]["emergency"="yes"]${a};nwr["healthcare"="clinic"]["emergency"="yes"]${a};nwr["emergency"="ambulance_station"]${a};);out center tags 300;`;
}

// ---------------------------------------------------------------------------------------------
// Ranking: can it plausibly treat this emergency (from tags only) → emergency tag → distance
// ---------------------------------------------------------------------------------------------

export type Match = "tagged" | "unknown";

export interface Ranked extends Place {
  km: number;
  minutes: number; // approximate, see approxMinutes
  match: Match; // "tagged" only when a speciality tag fits the emergency type
}

export function specialityMatch(p: Place, type: EmergencyType): Match {
  const want = EMERGENCY_TYPES.find((t) => t.id === type)?.specialities ?? [];
  if (!want.length) return "unknown";
  return p.specialities.some((s) => want.some((w) => s.includes(w))) ? "tagged" : "unknown";
}

/** Hospitals and emergency clinics ranked for the emergency; ambulance stations are kept out (see ambulanceStations). */
export function rankHospitals(places: Place[], lat: number, lon: number, type: EmergencyType): Ranked[] {
  const score = (r: Ranked) => (r.match === "tagged" ? 0 : 1) * 1000 + (r.emergency === "yes" ? 0 : r.emergency === "unknown" ? 1 : 2) * 100 + Math.min(99, r.km);
  return places
    .filter((p) => p.kind !== "ambulance_station" && p.emergency !== "no")
    .map((p) => { const km = distanceKm(lat, lon, p.lat, p.lon); return { ...p, km, minutes: approxMinutes(km), match: specialityMatch(p, type) }; })
    .sort((a, b) => score(a) - score(b) || a.km - b.km);
}

export function ambulanceStations(places: Place[], lat: number, lon: number): Ranked[] {
  return places.filter((p) => p.kind === "ambulance_station")
    .map((p) => { const km = distanceKm(lat, lon, p.lat, p.lon); return { ...p, km, minutes: approxMinutes(km), match: "unknown" as Match }; })
    .sort((a, b) => a.km - b.km);
}

// ---------------------------------------------------------------------------------------------
// Links (no keys; nothing is sent by KormoPath)
// ---------------------------------------------------------------------------------------------

export const directionsUrl = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lon.toFixed(6)}`;
export const mapsPointUrl = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Rounds a position to ~1 km for the server cache key (the exact position is not kept). */
export const cacheKey = (lat: number, lon: number, radiusKm: number) => `${lat.toFixed(2)},${lon.toFixed(2)},${radiusKm}`;
