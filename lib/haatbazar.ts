/**
 * HaatBazar AI — farmer-side tools. Pure and deterministic (no imports) so it is unit-tested.
 *
 * Rules this module follows:
 * - It never invents market prices. Prices are entered by the user (with where/when they
 *   heard them) or shown as clearly-labelled examples.
 * - It never gives pesticide doses. Disease notes name the problem, prevention and IPM
 *   steps, and send the farmer to the product label and the Upazila Agriculture Office /
 *   Krishi Call Centre 16123 for chemical control.
 * - Profit figures are arithmetic on the user's own numbers, never a forecast.
 */

export const KG_PER_MAUND = 40; // 1 মণ = 40 kg (standard maund used in Bangladeshi markets)

export interface TripInput {
  quantityKg: number;
  localPricePerKg: number; // what the local haat/arot would pay today
  distantPricePerKg: number; // WHOLESALE price at the distant market (not retail)
  transportPerMaund: number;
  commissionPct: number; // arotdar commission at the distant market
  labourPerMaund: number; // loading/unloading, bags
  lossPct: number; // weight loss / spoilage in transit
  otherCosts: number; // tolls, market fees, food, etc. (flat BDT)
}

export interface TripResult {
  maunds: number;
  sellableKg: number;
  localRevenue: number;
  distantRevenue: number;
  commission: number;
  transport: number;
  labour: number;
  otherCosts: number;
  distantNet: number;
  extraVsLocal: number; // positive = taking it to the distant market earns more
  breakEvenDistantPrice: number; // distant wholesale price per kg needed just to match selling locally
  worthIt: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function tripMargin(i: TripInput): TripResult {
  const q = Math.max(0, i.quantityKg);
  const maunds = q / KG_PER_MAUND;
  const lossPct = Math.min(100, Math.max(0, i.lossPct));
  const sellableKg = q * (1 - lossPct / 100);
  const localRevenue = q * Math.max(0, i.localPricePerKg);
  const distantRevenue = sellableKg * Math.max(0, i.distantPricePerKg);
  const commission = distantRevenue * (Math.min(100, Math.max(0, i.commissionPct)) / 100);
  const transport = maunds * Math.max(0, i.transportPerMaund);
  const labour = maunds * Math.max(0, i.labourPerMaund);
  const other = Math.max(0, i.otherCosts);
  const distantNet = distantRevenue - commission - transport - labour - other;
  const fixed = transport + labour + other;
  const perKgFactor = sellableKg * (1 - Math.min(100, Math.max(0, i.commissionPct)) / 100);
  const breakEven = perKgFactor > 0 ? (localRevenue + fixed) / perKgFactor : Infinity;
  return {
    maunds: r2(maunds),
    sellableKg: r2(sellableKg),
    localRevenue: r2(localRevenue),
    distantRevenue: r2(distantRevenue),
    commission: r2(commission),
    transport: r2(transport),
    labour: r2(labour),
    otherCosts: r2(other),
    distantNet: r2(distantNet),
    extraVsLocal: r2(distantNet - localRevenue),
    // Rounded UP to the next paisa: it is a minimum price, so rounding down would understate it.
    breakEvenDistantPrice: Number.isFinite(breakEven) ? Math.ceil(breakEven * 100 - 1e-9) / 100 : Infinity,
    worthIt: distantNet > localRevenue,
  };
}

/** Split one truck's fare among farmers in proportion to the maunds each sends. */
export function shareTruck(truckFare: number, maundsByFarmer: number[]): number[] {
  const total = maundsByFarmer.reduce((a, b) => a + Math.max(0, b), 0);
  if (!(total > 0) || !(truckFare > 0)) return maundsByFarmer.map(() => 0);
  const raw = maundsByFarmer.map((m) => (Math.max(0, m) / total) * truckFare);
  // Round to whole taka and give any rounding remainder to the largest sender so it sums exactly.
  const rounded = raw.map((x) => Math.floor(x));
  let rem = Math.round(truckFare) - rounded.reduce((a, b) => a + b, 0);
  const order = raw.map((x, idx) => ({ idx, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; rem > 0 && k < order.length; k++, rem--) rounded[order[k].idx] += 1;
  return rounded;
}

export interface PriceNote {
  cropId: string;
  market: string;
  pricePerKg: number;
  kind: "farmgate" | "wholesale" | "retail";
  heardFrom: string; // e.g. "আজকের হাট", "DAM ওয়েবসাইট", "আড়তদার"
  date: string; // YYYY-MM-DD
}

/** Days since a price was noted; prices older than 3 days are flagged as stale in the UI. */
export function priceAgeDays(date: string, today: string): number {
  const a = Date.parse(date + "T00:00:00Z");
  const b = Date.parse(today + "T00:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.round((b - a) / 86_400_000);
}

export interface Season {
  id: string;
  nameBn: string;
  monthsBn: string;
  months: number[]; // 1-12, months that fall mostly inside the season
  cropsBn: string;
}

// Season boundaries differ slightly between sources; these follow the broad definitions in
// Banglapedia ("Crop") and the UN CC:Learn glossary. See docs/haatbazar-ai-research-and-plan.md.
export const SEASONS: Season[] = [
  { id: "rabi", nameBn: "রবি মৌসুম", monthsBn: "মোটামুটি অক্টোবর/নভেম্বর – মার্চ", months: [11, 12, 1, 2, 3], cropsBn: "বোরো ধান, গম, আলু, সরিষা, ডাল, শীতকালীন সবজি" },
  { id: "kharif1", nameBn: "খরিফ-১ (প্রাক-খরিফ)", monthsBn: "মোটামুটি মার্চের শেষ – জুন", months: [4, 5, 6], cropsBn: "আউশ ধান, পাট, গ্রীষ্মকালীন সবজি" },
  { id: "kharif2", nameBn: "খরিফ-২", monthsBn: "মোটামুটি জুলাই – অক্টোবর", months: [7, 8, 9, 10], cropsBn: "রোপা আমন ধান, বর্ষাকালীন সবজি" },
];

export interface RiceSeason {
  nameBn: string;
  plantBn: string;
  harvestBn: string;
}

export const RICE_SEASONS: RiceSeason[] = [
  { nameBn: "আউশ", plantBn: "মার্চ – এপ্রিল", harvestBn: "জুলাই – আগস্ট" },
  { nameBn: "রোপা আমন", plantBn: "জুলাই – আগস্ট", harvestBn: "নভেম্বর – ডিসেম্বর" },
  { nameBn: "বোরো", plantBn: "ডিসেম্বর – ফেব্রুয়ারি", harvestBn: "এপ্রিল – জুন" },
];

export function seasonForMonth(month: number): Season {
  return SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[0];
}

export interface WeatherHour {
  time: string; // ISO local
  precipProbability: number; // %
  precipitationMm: number;
  windKmh: number;
  temperatureC: number;
}

export interface SprayWindow {
  ok: boolean;
  reasonBn: string;
}

/**
 * General spray-timing check from the forecast: avoid spraying when rain is likely within the
 * next 6 hours or wind is strong. This is a common label instruction, not product-specific advice.
 */
export function sprayWindow(next: WeatherHour[]): SprayWindow {
  const six = next.slice(0, 6);
  if (six.length < 6 || six.some((h) => ![h.precipProbability, h.precipitationMm, h.windKmh, h.temperatureC].every(Number.isFinite) || h.precipProbability < 0 || h.precipProbability > 100 || h.precipitationMm < 0 || h.windKmh < 0)) return { ok: false, reasonBn: "আগামী ৬ ঘণ্টার সম্পূর্ণ আবহাওয়ার তথ্য নেই। স্প্রে করার সিদ্ধান্তের আগে পূর্বাভাস যাচাই করুন।" };
  const maxRain = Math.max(...six.map((h) => h.precipProbability));
  const rainMm = six.reduce((a, h) => a + h.precipitationMm, 0);
  const maxWind = Math.max(...six.map((h) => h.windKmh));
  if (maxRain >= 50 || rainMm >= 1) return { ok: false, reasonBn: `আগামী ৬ ঘণ্টায় বৃষ্টির সম্ভাবনা ${maxRain}% — স্প্রে ধুয়ে যেতে পারে, অপেক্ষা করুন।` };
  if (maxWind >= 15) return { ok: false, reasonBn: `বাতাস ঘণ্টায় ${Math.round(maxWind)} কিমি পর্যন্ত — স্প্রে উড়ে অন্য জমি, পানি বা মানুষের গায়ে যেতে পারে।` };
  return { ok: true, reasonBn: `আগামী ৬ ঘণ্টায় বৃষ্টির সম্ভাবনা সর্বোচ্চ ${maxRain}%, বাতাস ${Math.round(maxWind)} কিমি/ঘণ্টা — সাধারণভাবে স্প্রের উপযোগী। পণ্যের লেবেল অনুসরণ করুন।` };
}

export interface DistrictPoint {
  id: string;
  nameBn: string;
  lat: number;
  lon: number;
}

// Approximate district-town coordinates, used only to fetch a forecast.
export const DISTRICTS: DistrictPoint[] = [
  { id: "bogura", nameBn: "বগুড়া", lat: 24.85, lon: 89.37 },
  { id: "jashore", nameBn: "যশোর", lat: 23.17, lon: 89.21 },
  { id: "rajshahi", nameBn: "রাজশাহী", lat: 24.37, lon: 88.6 },
  { id: "rangpur", nameBn: "রংপুর", lat: 25.75, lon: 89.25 },
  { id: "dinajpur", nameBn: "দিনাজপুর", lat: 25.63, lon: 88.64 },
  { id: "faridpur", nameBn: "ফরিদপুর", lat: 23.61, lon: 89.84 },
  { id: "mymensingh", nameBn: "ময়মনসিংহ", lat: 24.75, lon: 90.41 },
  { id: "cumilla", nameBn: "কুমিল্লা", lat: 23.46, lon: 91.18 },
  { id: "sylhet", nameBn: "সিলেট", lat: 24.9, lon: 91.87 },
  { id: "barishal", nameBn: "বরিশাল", lat: 22.7, lon: 90.37 },
  { id: "khulna", nameBn: "খুলনা", lat: 22.82, lon: 89.55 },
  { id: "chattogram", nameBn: "চট্টগ্রাম", lat: 22.36, lon: 91.78 },
  { id: "dhaka", nameBn: "ঢাকা", lat: 23.81, lon: 90.41 },
];

export interface CropDisease {
  id: string;
  cropNameBn: string;
  diseaseNameBn: string;
  symptomsBn: string;
  severity: "high" | "medium" | "low";
  favouredByBn: string; // weather/conditions that make it worse
  preventiveActionBn: string;
  nonChemicalBn: string;
  chemicalNoteBn: string; // no doses: points to label + extension officer
}

const CHEMICAL_NOTE =
  "রাসায়নিক দমন দরকার হলে কোন ওষুধ, কত মাত্রায় ও কখন — তা উপজেলা কৃষি অফিস বা কৃষি কল সেন্টার ১৬১২৩-এ জেনে নিন এবং পণ্যের লেবেল হুবহু মানুন। মাস্ক, গ্লাভস পরুন; লেবেলে লেখা ফসল তোলার আগের অপেক্ষার সময় (PHI) মানুন।";

export const CROP_DISEASES: CropDisease[] = [
  {
    id: "potato-late-blight",
    cropNameBn: "আলু",
    diseaseNameBn: "নাবি ধসা / লেইট ব্লাইট",
    symptomsBn: "পাতার ডগা ও কিনারায় পানিভেজা কালচে-বাদামি দাগ, সকালে পাতার নিচে সাদা ছত্রাকের আস্তরণ; দ্রুত পুরো গাছে ছড়ায়।",
    severity: "high",
    favouredByBn: "কুয়াশা, মেঘলা ও ঠান্ডা-আর্দ্র আবহাওয়া (সাধারণত ডিসেম্বর–জানুয়ারি)।",
    preventiveActionBn: "রোগমুক্ত প্রত্যয়িত বীজ, জমিতে পানি জমতে না দেওয়া, কুয়াশার পূর্বাভাসে নিয়মিত জমি পরিদর্শন।",
    nonChemicalBn: "আক্রান্ত গাছ তুলে জমি থেকে দূরে নষ্ট করুন; আক্রান্ত জমিতে সেচ সাময়িক বন্ধ রাখুন।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
  {
    id: "brinjal-borer",
    cropNameBn: "বেগুন",
    diseaseNameBn: "ডগা ও ফল ছিদ্রকারী পোকা",
    symptomsBn: "কচি ডগা নেতিয়ে শুকিয়ে যায়, বেগুনের গায়ে ছিদ্র, ভেতরে পোকা ও মল।",
    severity: "high",
    favouredByBn: "গরম-আর্দ্র আবহাওয়া; একই জমিতে বারবার বেগুন চাষ।",
    preventiveActionBn: "আক্রান্ত ডগা ও ফল নিয়মিত তুলে নষ্ট করা, পরিচ্ছন্ন চাষ, ফসল পর্যায়ক্রম।",
    nonChemicalBn: "সেক্স ফেরোমন ফাঁদ ব্যবহার (সংখ্যা ও স্থাপন কৃষি অফিস থেকে জেনে নিন)।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
  {
    id: "rice-blast",
    cropNameBn: "ধান",
    diseaseNameBn: "ব্লাস্ট (পাতা ও শীষ)",
    symptomsBn: "পাতায় চোখের মতো দাগ; শীষের গোড়ায় কালো দাগ হয়ে শীষ ভেঙে পড়া ও চিটা হওয়া।",
    severity: "high",
    favouredByBn: "রাতে ঠান্ডা, দিনে গরম, শিশির ও অতিরিক্ত ইউরিয়া।",
    preventiveActionBn: "সুষম সার, অতিরিক্ত ইউরিয়া পরিহার, জমিতে পানি ধরে রাখা, প্রতিরোধী জাত।",
    nonChemicalBn: "শুরুতে লক্ষণ দেখলেই কৃষি অফিসকে জানান; আক্রান্ত খড় পুড়িয়ে না রেখে সরিয়ে ফেলুন।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
  {
    id: "mango-anthracnose",
    cropNameBn: "আম",
    diseaseNameBn: "অ্যানথ্রাকনোজ",
    symptomsBn: "মুকুল ও কচি আমে কালো দাগ, মুকুল ঝরে যাওয়া, পাকা আমে কালো পচা দাগ।",
    severity: "medium",
    favouredByBn: "মুকুল আসার সময় বৃষ্টি ও কুয়াশা।",
    preventiveActionBn: "মরা ডাল ছাঁটাই, গাছের নিচ পরিষ্কার রাখা, ঝরা পাতা-মুকুল সরিয়ে ফেলা।",
    nonChemicalBn: "ফল সংগ্রহের পর সঠিক পদ্ধতিতে গরম পানিতে শোধন — তাপমাত্রা ও সময় কৃষি অফিস থেকে জেনে নিন।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
];

export interface CropOption {
  id: string;
  nameBn: string;
}

export const CROPS: CropOption[] = [
  { id: "potato", nameBn: "আলু" },
  { id: "onion", nameBn: "পেঁয়াজ" },
  { id: "chilli", nameBn: "কাঁচা মরিচ" },
  { id: "brinjal", nameBn: "বেগুন" },
  { id: "tomato", nameBn: "টমেটো" },
  { id: "cabbage", nameBn: "বাঁধাকপি" },
  { id: "rice", nameBn: "ধান" },
  { id: "jute", nameBn: "পাট" },
  { id: "mango", nameBn: "আম" },
  { id: "maize", nameBn: "ভুট্টা" },
];
