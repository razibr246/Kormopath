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
  // Existing 13 districts
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

  // 24 New Agricultural Hub Districts
  // Rajshahi Division Hubs
  { id: "natore", nameBn: "নাটোর", lat: 24.41, lon: 89.00 },
  { id: "pabna", nameBn: "পাবনা", lat: 24.01, lon: 89.24 },
  { id: "naogaon", nameBn: "নওগাঁ", lat: 24.81, lon: 88.94 },
  { id: "chapainawabganj", nameBn: "চাঁপাইনবাবগঞ্জ", lat: 24.60, lon: 88.27 },
  { id: "sirajganj", nameBn: "সিরাজগঞ্জ", lat: 24.46, lon: 89.71 },

  // Khulna Division Hubs
  { id: "kushtia", nameBn: "কুষ্টিয়া", lat: 23.90, lon: 89.12 },
  { id: "meherpur", nameBn: "মেহেরপুর", lat: 23.77, lon: 88.63 },
  { id: "chuadanga", nameBn: "চুয়াডাঙ্গা", lat: 23.64, lon: 88.85 },
  { id: "satkhira", nameBn: "সাতক্ষীরা", lat: 22.72, lon: 89.07 },
  { id: "jhenaidah", nameBn: "ঝিনাইদহ", lat: 23.54, lon: 89.15 },

  // Rangpur Division Hubs
  { id: "gaibandha", nameBn: "গাইবান্ধা", lat: 25.33, lon: 89.54 },
  { id: "nilphamari", nameBn: "নীলফামারী", lat: 25.93, lon: 88.85 },
  { id: "kurigram", nameBn: "কুড়িগ্রাম", lat: 25.81, lon: 89.64 },
  { id: "panchagarh", nameBn: "পঞ্চগড়", lat: 26.33, lon: 88.55 },

  // Mymensingh Division Hubs
  { id: "jamalpur", nameBn: "জামালপুর", lat: 24.93, lon: 89.94 },
  { id: "netrokona", nameBn: "নেত্রকোণা", lat: 24.88, lon: 90.73 },

  // Dhaka Division Hubs
  { id: "kishoreganj", nameBn: "কিশোরগঞ্জ", lat: 24.43, lon: 90.78 },
  { id: "narsingdi", nameBn: "নরসিংদী", lat: 23.92, lon: 90.72 },
  { id: "tangail", nameBn: "টাঙ্গাইল", lat: 24.25, lon: 89.92 },
  { id: "munshiganj", nameBn: "মুন্সীগঞ্জ", lat: 23.54, lon: 90.53 },

  // Chattogram Division Hubs
  { id: "brahmanbaria", nameBn: "ব্রাহ্মণবাড়িয়া", lat: 23.96, lon: 91.11 },
  { id: "coxsbazar", nameBn: "কক্সবাজার", lat: 21.43, lon: 91.98 },
  { id: "noakhali", nameBn: "নোয়াখালী", lat: 22.87, lon: 91.10 },

  // Sylhet & Barishal Division Hubs
  { id: "habiganj", nameBn: "হবিগঞ্জ", lat: 24.38, lon: 91.42 },
  { id: "sunamganj", nameBn: "সুনামগঞ্জ", lat: 25.07, lon: 91.40 },
  { id: "bhola", nameBn: "ভোলা", lat: 22.69, lon: 90.65 },
  { id: "patuakhali", nameBn: "পটুয়াখালী", lat: 22.36, lon: 90.33 },
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
  {
    id: "tomato-bacterial-wilt",
    cropNameBn: "টমেটো",
    diseaseNameBn: "ব্যাকটেরিয়াজনিত ঢলে পড়া (ব্যাকটেরিয়াল উইল্ট)",
    symptomsBn: "সবুজ থাকা অবস্থাতেই গাছ হঠাৎ নিস্তেজ হয়ে ঢলে পড়ে; কাণ্ড কাটলে ভেতর বাদামি দেখায় এবং পরিষ্কার পানিতে কাণ্ড ডোবালে সাদা সুতার মতো ব্যাকটেরিয়ার ধারা (ওজ) বের হয়।",
    severity: "high",
    favouredByBn: "উচ্চ তাপমাত্রা (৩০–৩৫°C), অধিক আর্দ্রতা এবং জমিতে পানি জমে থাকা; নেমাটোড বা শিকড়ে আঘাত।",
    preventiveActionBn: "প্রতিরোধী জাত বা গ্রাফটিং করা চারা ব্যবহার, রোগমুক্ত প্রত্যয়িত বীজ, উঁচু বেড তৈরি এবং জমিতে উন্নত নিষ্কাশন ব্যবস্থা রাখা।",
    nonChemicalBn: "আক্রান্ত গাছ শিকড়সহ সাবধানে তুলে দূরে পুড়িয়ে বা মাটিতে পুঁতে ফেলা; আক্রান্ত জমিতে সোলানেসি গোত্রের ফসল বাদ দিয়ে ধান বা ভুট্টা দিয়ে শস্য পর্যায় (Crop Rotation) অনুসরণ করা; চুন বা জৈব সার প্রয়োগ।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
  {
    id: "onion-purple-blotch",
    cropNameBn: "পেঁয়াজ",
    diseaseNameBn: "পার্পল ব্লচ (বেগুনি দাগ রোগ)",
    symptomsBn: "পাতায় ও বীজের ডাঁটায় প্রথমে ছোট পানিভেজা দাগ, যা দ্রুত বড় হয়ে কেন্দ্রে বেগুনি বা বাদামি বর্ণ ধারণ করে এবং চারপাশে হলুদ বলয় তৈরি হয়; পাতা ভেঙে পড়ে।",
    severity: "high",
    favouredByBn: "উষ্ণ ও আর্দ্র আবহাওয়া (২৫–৩০°C), ঘন কুয়াশা, বৃষ্টি বা পাতায় দীর্ঘ সময় শিশির জমে থাকা; থ্রিপস পোকার আক্রমণ।",
    preventiveActionBn: "সুস্থ ও প্রত্যয়িত পেঁয়াজ কন্দ বা বীজ ব্যবহার, পরিমিত দূরত্বে রোপণ যাতে বাতাস চলাচল করে, অতিরিক্ত সেচ পরিহার এবং পরিচ্ছন্ন চাষ।",
    nonChemicalBn: "রোগাক্রান্ত পাতা ও অবশিষ্টাংশ সংগ্রহ করে ধ্বংস করা; থ্রিপস দমনে হলুদ আঠালো ফাঁদ ব্যবহার; পেঁয়াজ তোলার পর জমিতে গভীর চাষ দিয়ে রোদ লাগানো।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
  {
    id: "jute-stem-rot",
    cropNameBn: "পাট",
    diseaseNameBn: "কাণ্ড পচা রোগ (স্টেম রট)",
    symptomsBn: "গাছের কাণ্ডে বা পাতার সংযোগস্থলে কালচে বা বাদামি ক্ষতের দাগ, ক্ষতস্থান ফেটে যাওয়া এবং কাণ্ডের আঁশ কালো হয়ে পচে শুকিয়ে যাওয়া; গাছ সহজে ভেঙে পড়ে।",
    severity: "high",
    favouredByBn: "অতিবৃষ্টি, জলাবদ্ধতা, স্যাঁতসেঁতে মেঘলা আবহাওয়া এবং মাটিতে পটাশের ঘাটতি।",
    preventiveActionBn: "প্রমাণিত রোগমুক্ত বীজ বপন, সুষম সার ব্যবহার (বিশেষ করে পরিমিত পটাশ প্রয়োগ), দ্রুত পানি নিষ্কাশনের নালা রাখা।",
    nonChemicalBn: "আক্রান্ত গাছ দেখামাত্র তুলে সরিয়ে ফেলা; ফসল কাটার পর গোড়া ও শিকড় পুড়িয়ে ফেলা; জমিতে চুন প্রয়োগ এবং পাটের পর ধান বা ডাল জাতীয় ফসলের শস্য পর্যায় অবলম্বন।",
    chemicalNoteBn: CHEMICAL_NOTE,
  },
  {
    id: "rice-brown-planthopper",
    cropNameBn: "ধান",
    diseaseNameBn: "বাদামি গাছফড়িং (কারেন্ট পোকা / বিপিএইচ)",
    symptomsBn: "ধান গাছের গোড়ায় দলবদ্ধভাবে রস চুষে খায়; আক্রান্ত অংশের ধান গাছ গোল হয়ে দ্রুত পুড়ে যাওয়ার মতো শুকিয়ে মারা যায় (হপার বার্ন বা Hopper Burn)।",
    severity: "high",
    favouredByBn: "ঘন করে চারা রোপণ, জমিতে সার্বক্ষণিক দাঁড়িয়ে থাকা পানি, অতিরিক্ত ইউরিয়া সার প্রয়োগ এবং মেঘলা গুমোট আবহাওয়া।",
    preventiveActionBn: "বিপিএইচ প্রতিরোধী বা সহনশীল জাত চাষ, নির্দিষ্ট দূরত্ব বজায় রেখে চারা লাগানো, জমিতে ১০-১২ সারি পর পর ১ সারি ফাঁকা (বিলি/অ্যালি পদ্ধতি) রাখা যাতে আলো-বাতাস ঢোকে, সুষম ইউরিয়া প্রয়োগ।",
    nonChemicalBn: "আক্রমণ দেখা দিলে জমির পানি শুকিয়ে ২-৩ দিন শুকনা রাখা (পর্যায়ক্রমিক ভেজানো ও শুকানো - AWD); হাঁস ছেড়ে পোকা দমন; আলোক ফাঁদ (Light trap) ব্যবহার করে পোকার উপস্থিতি পর্যবেক্ষণ; মাকড়সা ও ড্রাগনফ্লাইয়ের মতো বন্ধু পোকা সংরক্ষণ।",
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

export interface SensitivityPoint {
  deltaPct: number; // e.g. -15, -10, -5, 0, 5, 10, 15
  adjustedWholesalePrice: number; // Wholesale price per kg after applying delta
  distantNet: number; // Net earnings at distant market
  extraVsLocal: number; // Net profit difference vs selling locally
  worthIt: boolean; // True if distant market earns more than local haat
}

export const DEFAULT_SENSITIVITY_DELTAS = [-15, -10, -5, 0, 5, 10, 15];

/**
 * Calculates net return and profit difference across wholesale price variations.
 * Pure and deterministic: models price fluctuations without guessing or forecasting.
 */
export function calculateSensitivityCurve(
  input: TripInput,
  deltas: number[] = DEFAULT_SENSITIVITY_DELTAS
): SensitivityPoint[] {
  return deltas.map((deltaPct) => {
    const factor = 1 + deltaPct / 100;
    const adjustedPrice = r2(Math.max(0, input.distantPricePerKg * factor));
    const res = tripMargin({
      ...input,
      distantPricePerKg: adjustedPrice,
    });
    return {
      deltaPct,
      adjustedWholesalePrice: adjustedPrice,
      distantNet: res.distantNet,
      extraVsLocal: res.extraVsLocal,
      worthIt: res.worthIt,
    };
  });
}
