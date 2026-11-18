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
  symptomTags: string[];
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
    symptomTags: ["পানিভেজা দাগ", "কালচে বাদামি", "সাদা ছত্রাক", "নাবি ধসা", "ডগা শুকানো", "লেইট ব্লাইট"],
  },
  {
    id: "potato-early-blight",
    cropNameBn: "আলু",
    diseaseNameBn: "আগাম ধসা (আর্লি ব্লাইট)",
    symptomsBn: "নিচের পাতায় ছোট ছোট বাদামি বা কালচে দাগ, দাগের ভেতরে বৃত্তাকার বলয় (টার্গেট বোর্ড বা গাছের বলয়ের মতো রিং); পাতা হলুদ হয়ে ঝরে পড়ে।",
    severity: "medium",
    favouredByBn: "উষ্ণ ও শুষ্ক দিনের পর শিশিরভেজা আর্দ্র রাত; গাছের বয়স বাড়ার সাথে সাথে দুর্বল গাছ।",
    preventiveActionBn: "প্রমাণিত সুস্থ বীজ ব্যবহার, মাটিতে পরিমিত জৈব ও সুষম সার প্রয়োগ, নিয়মিত সেচ ব্যবস্থাপনা।",
    nonChemicalBn: "আক্রান্ত পাতা হাত দিয়ে তুলে ধ্বংস করা; আলু তোলার পর জমির নাড়া ও অবশিষ্টাংশ পুড়িয়ে ফেলা বা গভীর চাষ দেওয়া।",
    chemicalNoteBn: CHEMICAL_NOTE,
    symptomTags: ["টার্গেট বোর্ড দাগ", "বৃত্তাকার বলয়", "নিচের পাতায় দাগ", "আগাম ধসা", "বাদামি রিং", "পাতা হলুদ"],
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
    symptomTags: ["ডগা নেতিয়ে পড়া", "ফল ছিদ্র", "ডগা ছিদ্র", "পোকার মল", "কচি ডগা শুকানো"],
  },
  {
    id: "brinjal-root-rot",
    cropNameBn: "বেগুন",
    diseaseNameBn: "গোড়াপচা ও রুট-নট নেমাটোড (শিকড় গিঁট)",
    symptomsBn: "গাছ খর্বাকৃতি ও ফ্যাকাশে হলুদ হয়ে যাওয়া, দুপুরে গাছ নেতিয়ে পড়া; শিকড় তুললে অসংখ্য ছোট-বড় গিঁট বা টিউমার দেখা যায়।",
    severity: "high",
    favouredByBn: "বেলে বা হালকা দোআঁশ মাটি, উচ্চ তাপমাত্রা এবং একই জমিতে বারবার বেগুন চাষ।",
    preventiveActionBn: "চারা লাগানোর আগে বীজতলায় ট্রাইকোডার্মা বা নিম খৈল মেশানো, সোলানেসি ফসল বাদ দিয়ে শস্য পর্যায় করা।",
    nonChemicalBn: "জমিতে পর্যাপ্ত পরিমাণে নিম খৈল, মুরগির বিষ্ঠা বা পচা গোবর প্রয়োগ; আক্রান্ত গাছ তুলে ধ্বংস করা; জমি রোদে ভালো করে শুকানো।",
    chemicalNoteBn: CHEMICAL_NOTE,
    symptomTags: ["শিকড়ে গিঁট", "গোড়া পচা", "গাছ হলুদ", "দুপুরে নেতিয়ে পড়া", "টিউমার", "খর্বাকৃতি"],
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
    symptomTags: ["চোখের মতো দাগ", "শীষ ভেঙে পড়া", "চিটা", "ব্লাস্ট", "কালো দাগ", "শীষ পচা"],
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
    symptomTags: ["গোড়ায় পোকা", "গাছ পুড়ে যাওয়া", "হপার বার্ন", "কারেন্ট পোকা", "বিপিএইচ", "গোল হয়ে মরা"],
  },
  {
    id: "rice-hispa",
    cropNameBn: "ধান",
    diseaseNameBn: "পামরি পোকা (রাইস হিসপা)",
    symptomsBn: "পাতার ওপরের সবুজ অংশ চেঁছে খাওয়া, পাতায় সাদা সমান্তরাল লম্বা দাগ বা রেখা, দূর থেকে ধানক্ষেত পোড়া বা সাদাটে দেখায়।",
    severity: "high",
    favouredByBn: "উষ্ণ ও আর্দ্র আবহাওয়া, অতিরিক্ত নাইট্রোজেন সার এবং ছায়াযুক্ত নিচু জমি।",
    preventiveActionBn: "সুষম সার ব্যবহার, আক্রান্ত পাতার ডগা ২-৩ ইঞ্চি কেটে ফেলা যাতে ডিম নষ্ট হয়, প্রতিরোধী জাত চাষ।",
    nonChemicalBn: "মশারির জাল বা গামছা টেনে পোকা ধরে কেরোসিন মিশ্রিত পানিতে ফেলে ধ্বংস করা; আলোক ফাঁদের সাহায্যে পোকা নিধন।",
    chemicalNoteBn: CHEMICAL_NOTE,
    symptomTags: ["সাদা দাগ", "পাতা চেঁছে খাওয়া", "সাদা রেখা", "পামরি", "পোড়া পাতা", "হিসপা"],
  },
  {
    id: "rice-sheath-blight",
    cropNameBn: "ধান",
    diseaseNameBn: "খোলপোড়া রোগ (শীথ ব্লাইট)",
    symptomsBn: "পানির উপরিভাগে ধান গাছের খোলে ডিম্বাকার সাপের চামড়ার মতো ধূসর-সবুজ দাগ, যা ক্রমশ ওপরের দিকে পাতার খোল ও পাতায় উঠে যায়।",
    severity: "high",
    favouredByBn: "উচ্চ তাপমাত্রা (২৮–৩২°C), অতি আর্দ্রতা (৮৫% বা বেশি), ঘন করে লাগানো গাছ ও অতিরিক্ত ইউরিয়া।",
    preventiveActionBn: "চারা রোপণের দূরত্ব বজায় রাখা, অতিরিক্ত ইউরিয়া পরিহার করে পরিমিত পটাশ সার ব্যবহার, জমির পানি নিষ্কাশন ব্যবস্থা।",
    nonChemicalBn: "আক্রমণ বেশি হলে জমির পানি শুকিয়ে ২-৩ দিন শুকনা রাখা; জমির আইল ও আগাছা পরিষ্কার পরিচ্ছন্ন রাখা।",
    chemicalNoteBn: CHEMICAL_NOTE,
    symptomTags: ["খোলপোড়া", "সাপের চামড়ার দাগ", "খোলে দাগ", "ধূসর দাগ", "পানির উপরিভাগে দাগ"],
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
    symptomTags: ["মুকুলে কালো দাগ", "কচি আমে দাগ", "মুকুল ঝরে যাওয়া", "কালো পচা দাগ"],
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
    symptomTags: ["হঠাৎ ঢলে পড়া", "সবুজ অবস্থায় মরা", "কাণ্ডে বাদামি", "ব্যাকটেরিয়াল উইল্ট", "পানি ডোবালে সাদা ধারা"],
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
    symptomTags: ["বেগুনি দাগ", "পার্পল ব্লচ", "হলুদ বলয়", "পাতা ভেঙে পড়া", "ডাঁটায় দাগ"],
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
    symptomTags: ["কাণ্ড পচা", "স্টেম রট", "আঁশ কালো হওয়া", "ক্ষতস্থান ফেটে যাওয়া", "গাছ ভেঙে পড়া"],
  },
];

export interface SymptomMatchResult {
  disease: CropDisease;
  matchScore: number; // 0 to 100
  matchedSymptoms: string[];
  urgency: "immediate" | "moderate" | "advisory";
}

export interface CropDiagnosticResult {
  cropNameBn: string;
  querySymptoms: string[];
  topMatch: SymptomMatchResult | null;
  alternatives: SymptomMatchResult[];
  ipmChecklistBn: string[];
  helpline: {
    name: string;
    number: string;
    note: string;
  };
  safetyDisclaimer: string;
}

/**
 * Deterministic symptom matching and IPM advisory engine for 6+ major Bangladeshi crops.
 * Strictly adheres to safety constraints: no chemical doses, directs to Krishi Call Centre 16123.
 */
export function diagnoseCropSymptom(
  cropNameOrId: string,
  userSymptoms: string[]
): CropDiagnosticResult {
  const norm = (s: string) => s.trim().toLowerCase().normalize("NFC");
  const cropQuery = norm(cropNameOrId);

  const cropMap: Record<string, string> = {
    rice: "ধান",
    paddy: "ধান",
    potato: "আলু",
    brinjal: "বেগুন",
    eggplant: "বেগুন",
    tomato: "টমেটো",
    onion: "পেঁয়াজ",
    jute: "পাট",
    mango: "আম",
    maize: "ভুট্টা",
    chilli: "মরিচ",
    cabbage: "বাঁধাকপি",
  };

  const resolvedCropBn = cropMap[cropQuery] || cropNameOrId;

  const candidates = CROP_DISEASES.filter(
    (d) => norm(d.cropNameBn) === norm(resolvedCropBn) || d.id.startsWith(cropQuery)
  );

  const cleanSymptoms = userSymptoms.map(norm).filter(Boolean);

  const scored: SymptomMatchResult[] = candidates.map((disease) => {
    if (cleanSymptoms.length === 0) {
      return {
        disease,
        matchScore: 0,
        matchedSymptoms: [],
        urgency: disease.severity === "high" ? "immediate" : "moderate",
      };
    }

    const matchedTerms: string[] = [];
    let matchHits = 0;

    for (const sym of cleanSymptoms) {
      const matchInSymptoms = disease.symptomsBn.toLowerCase().includes(sym);
      const matchInTags = disease.symptomTags.some((tag) => tag.toLowerCase().includes(sym) || sym.includes(tag.toLowerCase()));
      const matchInName = disease.diseaseNameBn.toLowerCase().includes(sym);

      if (matchInSymptoms || matchInTags || matchInName) {
        matchedTerms.push(sym);
        matchHits += 1;
      }
    }

    const matchScore = Math.min(100, Math.round((matchHits / cleanSymptoms.length) * 100));

    return {
      disease,
      matchScore,
      matchedSymptoms: matchedTerms,
      urgency: disease.severity === "high" ? "immediate" : "moderate",
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore || (b.disease.severity === "high" ? 1 : -1));

  const topMatch = scored.length > 0 && scored[0].matchScore > 0 ? scored[0] : null;
  const alternatives = topMatch ? scored.slice(1).filter((x) => x.matchScore > 0) : scored;

  const ipmChecklist: string[] = topMatch
    ? [topMatch.disease.preventiveActionBn, topMatch.disease.nonChemicalBn]
    : [
        "রোগমুক্ত প্রত্যয়িত বীজ বা চারা ব্যবহার করুন।",
        "জমি নিয়মিত পরিদর্শন করুন এবং আইল ও আগাছা পরিষ্কার রাখুন।",
        "কোনো অস্পষ্ট রোগ দেখা দিলে সরাসরি পাতা বা আক্রান্ত অংশের নমুনা নিয়ে উপজেলা কৃষি অফিসে যোগাযোগ করুন।",
      ];

  return {
    cropNameBn: resolvedCropBn,
    querySymptoms: userSymptoms,
    topMatch,
    alternatives,
    ipmChecklistBn: ipmChecklist,
    helpline: {
      name: "কৃষি কল সেন্টার (Krishi Call Centre)",
      number: "16123",
      // Hours and cost as published by the Agriculture Information Service (ais.gov.bd), checked 2026-11-17.
      note: "যেকোনো মোবাইল অপারেটর থেকে প্রতি মিনিট ২৫ পয়সায় (ভ্যাট ও সম্পূরক শুল্ক ছাড়া) কৃষি বিশেষজ্ঞের সঙ্গে কথা বলুন; সকাল ৮টা থেকে রাত ৮টা, শুক্র, শনি ও সরকারি ছুটির দিন বন্ধ।",
    },
    safetyDisclaimer:
      "সতর্কতা: KormoPath কোনো রাসায়নিক কীটনাশকের মাত্রা বা ডোজ নিজে নির্ধারণ করে না। কীটনাশকের মোড়ক/বোতলের সরকারি অনুমোদিত লেবেল পড়ুন এবং ব্যবহারের পূর্বে উপসহকারী কৃষি কর্মকর্তা (SAAO) বা ১৬১২৩-এ নিশ্চিত হন।",
  };
}

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

/* ------------------------------------------------------------------------------------------ */
/* LIVE MANDI HUBS, AGRICULTURAL TRANSIT CORRIDORS & CROP PRESETS                             */
/* ------------------------------------------------------------------------------------------ */

export interface MandiHub {
  id: string;
  nameBn: string;
  nameEn: string;
  districtId: string;
  districtBn: string;
  divisionBn: string;
  type: "haat" | "mokam" | "hub";
  lat: number;
  lon: number;
  primaryCropsBn: string[];
  descriptionBn: string;
}

export const MANDI_HUBS: MandiHub[] = [
  {
    id: "mahasthan",
    nameBn: "মহাস্থান হাট (বগুড়া)",
    nameEn: "Mahasthan Haat",
    districtId: "bogura",
    districtBn: "বগুড়া",
    divisionBn: "রাজশাহী",
    type: "haat",
    lat: 24.95,
    lon: 89.35,
    primaryCropsBn: ["আলু", "কাঁচা মরিচ", "বেগুন", "ফুলকপি"],
    descriptionBn: "উত্তরবঙ্গের বৃহত্তম আলু ও শীতকালীন সবজির প্রাথমিক সমাবেশ কেন্দ্র। প্রতিদিন ভোরে কয়েকশ ট্রাকে পণ্য লোড হয়।",
  },
  {
    id: "karwanbazar",
    nameBn: "কাওরান বাজার পাইকারি মোকাম (ঢাকা)",
    nameEn: "Karwan Bazar Wholesale Mokam",
    districtId: "dhaka",
    districtBn: "ঢাকা",
    divisionBn: "ঢাকা",
    type: "mokam",
    lat: 23.75,
    lon: 90.39,
    primaryCropsBn: ["সকল সবজি", "আলু", "পেঁয়াজ", "ফলমূল"],
    descriptionBn: "বাংলাদেশের বৃহত্তম পাইকারি মোকাম। মধ্যরাত থেকে ভোর পর্যন্ত শত শত আড়তে সরাসরি পাইকারি নিলাম চলে।",
  },
  {
    id: "shyambazar",
    nameBn: "শ্যামবাজার আড়ত (ঢাকা)",
    nameEn: "Shyambazar Wholesale Market",
    districtId: "dhaka",
    districtBn: "ঢাকা",
    divisionBn: "ঢাকা",
    type: "mokam",
    lat: 23.71,
    lon: 90.41,
    primaryCropsBn: ["পেঁয়াজ", "রসুন", "আলু", "আদা"],
    descriptionBn: "বুড়িগঙ্গা নদীর তীরে দেশের সর্ববৃহৎ কন্দাল ফসল (পেঁয়াজ-রসুন-আলু) ও মসলার পাইকারি বাণিজ্য কেন্দ্র।",
  },
  {
    id: "barobazar",
    nameBn: "বারোবাজার সবজি হাট (ঝিনাইদহ/যশোর)",
    nameEn: "Barobazar Vegetable Haat",
    districtId: "jashore",
    districtBn: "যশোর",
    divisionBn: "খুলনা",
    type: "haat",
    lat: 23.32,
    lon: 89.15,
    primaryCropsBn: ["বেগুন", "টমেটো", "পটল", "কাঁচামরিচ"],
    descriptionBn: "দক্ষিণ-পশ্চিমাঞ্চলের সবচেয়ে ব্যস্ত সবজির হাট। পদ্মা সেতু চালুর পর এখান থেকে ঢাকায় দ্রুত সরবরাহ পৌঁছায়।",
  },
  {
    id: "baneshwar",
    nameBn: "বানেশ্বর হাট (রাজশাহী)",
    nameEn: "Baneswar Haat",
    districtId: "rajshahi",
    districtBn: "রাজশাহী",
    divisionBn: "রাজশাহী",
    type: "haat",
    lat: 24.39,
    lon: 88.78,
    primaryCropsBn: ["আম", "পাট", "গুড়", "কলা"],
    descriptionBn: "উত্তরবঙ্গের ঐতিহ্যবাহী হাট; আম ও গুড়ের মৌসুমে এটি দেশের অন্যতম প্রধান সরবরাহ হাব।",
  },
  {
    id: "pahartali",
    nameBn: "পাহাড়তলী আড়ত (চট্টগ্রাম)",
    nameEn: "Pahartali Wholesale Market",
    districtId: "chattogram",
    districtBn: "চট্টগ্রাম",
    divisionBn: "চট্টগ্রাম",
    type: "mokam",
    lat: 22.36,
    lon: 91.80,
    primaryCropsBn: ["চাল", "সবজি", "আলু", "পেঁয়াজ"],
    descriptionBn: "বন্দরনগরী চট্টগ্রামের বৃহত্তম খাদ্যশস্য ও কৃষিপণ্য পাইকারি আড়ত।",
  },
  {
    id: "cityhaat-rangpur",
    nameBn: "রংপুর সিটি হাট (রংপুর)",
    nameEn: "Rangpur City Haat",
    districtId: "rangpur",
    districtBn: "রংপুর",
    divisionBn: "রংপুর",
    type: "haat",
    lat: 25.76,
    lon: 89.23,
    primaryCropsBn: ["ধান", "আলু", "ভুট্টা", "তামাক"],
    descriptionBn: "তিস্তা অববাহিকার প্রধান কৃষি বিনিময় কেন্দ্র ও উত্তরাঞ্চলের শস্য সমাবেশ বাজার।",
  },
  {
    id: "sreemangal",
    nameBn: "শ্রীমঙ্গল চশমা মার্কেট (মৌলভীবাজার)",
    nameEn: "Sreemangal Agro Market",
    districtId: "sylhet",
    districtBn: "সিলেট",
    divisionBn: "সিলেট",
    type: "haat",
    lat: 24.31,
    lon: 91.73,
    primaryCropsBn: ["আনারস", "লেবু", "নাগা মরিচ", "চা"],
    descriptionBn: "লেবুজাতীয় ফল ও আনারসের জন্য বিখ্যাত পাইকারি মোকাম; প্রতিদিন দেশের বিভিন্ন প্রান্তে পিকআপ ও ট্রাকে যায়।",
  },
  {
    id: "mechua",
    nameBn: "মেছুয়া বাজার (ময়মনসিংহ)",
    nameEn: "Mechua Bazar Mymensingh",
    districtId: "mymensingh",
    districtBn: "ময়মনসিংহ",
    divisionBn: "ময়মনসিংহ",
    type: "hub",
    lat: 24.76,
    lon: 90.40,
    primaryCropsBn: ["ধান", "সবজি", "মাছ", "সরিষা"],
    descriptionBn: "ব্রহ্মপুত্র নদের অববাহিকার কেন্দ্রীয় কৃষি ও মৎস্য সরবরাহ কেন্দ্র।",
  },
  {
    id: "chuadanga-krishi",
    nameBn: "চুয়াডাঙ্গা কৃষি পাইকারি বাজার",
    nameEn: "Chuadanga Krishi Bazar",
    districtId: "chuadanga",
    districtBn: "চুয়াডাঙ্গা",
    divisionBn: "খুলনা",
    type: "haat",
    lat: 23.64,
    lon: 88.85,
    primaryCropsBn: ["ভুট্টা", "পান", "সবজি", "পেঁয়াজ"],
    descriptionBn: "ভুট্টা ও শীতকালীন শাকসবজির প্রধান মোকাম; সীমান্ত অঞ্চলের সবচেয়ে সক্রিয় কৃষি কেন্দ্র।",
  },
];

export interface RouteWaypoint {
  nameBn: string;
  lat: number;
  lon: number;
  isToll?: boolean;
}

export interface TransitCorridor {
  id: string;
  nameBn: string;
  highwayCode: string;
  originHubId: string;
  destinationHubId: string;
  distanceKm: number;
  typicalDurationHours: number;
  tollBridgesBn: string[];
  waypoints: RouteWaypoint[];
  temperatureSensitivity: "high" | "medium" | "low";
}

export const TRANSIT_CORRIDORS: TransitCorridor[] = [
  {
    id: "n5-bogura-dhaka",
    nameBn: "উত্তরবঙ্গ-ঢাকা মহাসড়ক (N5)",
    highwayCode: "N5",
    originHubId: "mahasthan",
    destinationHubId: "karwanbazar",
    distanceKm: 195,
    typicalDurationHours: 5.5,
    tollBridgesBn: ["বঙ্গবন্ধু যমুনা সেতু (টোল ৳৮০০-১২০০)"],
    temperatureSensitivity: "medium",
    waypoints: [
      { nameBn: "মহাস্থান হাট (বগুড়া)", lat: 24.95, lon: 89.35 },
      { nameBn: "শেরপুর (বগুড়া)", lat: 24.68, lon: 89.43 },
      { nameBn: "সিরাজগঞ্জ গোলচত্বর", lat: 24.45, lon: 89.68 },
      { nameBn: "বঙ্গবন্ধু সেতু টোলপ্লাজা", lat: 24.40, lon: 89.78, isToll: true },
      { nameBn: "এলেঙ্গা / টাঙ্গাইল বাইপাস", lat: 24.33, lon: 89.92 },
      { nameBn: "চন্দ্রা মোড় (গাজীপুর)", lat: 24.04, lon: 90.24 },
      { nameBn: "গাবতলী / কাওরান বাজার (ঢাকা)", lat: 23.75, lon: 90.39 },
    ],
  },
  {
    id: "n8-jashore-dhaka",
    nameBn: "দক্ষিণ-পশ্চিমাঞ্চল এক্সপ্রেসওয়ে (N8/N7)",
    highwayCode: "N8",
    originHubId: "barobazar",
    destinationHubId: "shyambazar",
    distanceKm: 210,
    typicalDurationHours: 4.5,
    tollBridgesBn: ["পদ্মা সেতু (টোল ৳১২০০-১৬০০)"],
    temperatureSensitivity: "high",
    waypoints: [
      { nameBn: "বারোবাজার / যশোর আড়ত", lat: 23.32, lon: 89.15 },
      { nameBn: "মাগুরা বাইপাস", lat: 23.49, lon: 89.42 },
      { nameBn: "ফরিদপুর মোড়", lat: 23.60, lon: 89.83 },
      { nameBn: "ভাঙ্গা এক্সপ্রেসওয়ে জংশন", lat: 23.38, lon: 89.98 },
      { nameBn: "পদ্মা সেতু টোলপ্লাজা (জাজিরা)", lat: 23.44, lon: 90.26, isToll: true },
      { nameBn: "পোস্তগোলা / শ্যামবাজার (ঢাকা)", lat: 23.71, lon: 90.41 },
    ],
  },
  {
    id: "n1-dhaka-ctg",
    nameBn: "ঢাকা-চট্টগ্রাম করিডোর (N1)",
    highwayCode: "N1",
    originHubId: "karwanbazar",
    destinationHubId: "pahartali",
    distanceKm: 245,
    typicalDurationHours: 6.0,
    tollBridgesBn: ["মেঘনা সেতু", "গোমতী সেতু"],
    temperatureSensitivity: "medium",
    waypoints: [
      { nameBn: "কাওরান বাজার (ঢাকা)", lat: 23.75, lon: 90.39 },
      { nameBn: "কাঁচপুর / মেঘনা সেতু", lat: 23.68, lon: 90.58, isToll: true },
      { nameBn: "দাউদকান্দি গোমতী সেতু", lat: 23.53, lon: 90.72, isToll: true },
      { nameBn: "কুমিল্লা পদুয়ার বাজার", lat: 23.43, lon: 91.19 },
      { nameBn: "ফেনী বাইপাস", lat: 23.01, lon: 91.40 },
      { nameBn: "পাহাড়তলী আড়ত (চট্টগ্রাম)", lat: 22.36, lon: 91.80 },
    ],
  },
  {
    id: "n2-sylhet-dhaka",
    nameBn: "সিলেট-ঢাকা মহাসড়ক (N2)",
    highwayCode: "N2",
    originHubId: "sreemangal",
    destinationHubId: "karwanbazar",
    distanceKm: 180,
    typicalDurationHours: 5.0,
    tollBridgesBn: ["ভৈরব মেঘনা সেতু"],
    temperatureSensitivity: "high",
    waypoints: [
      { nameBn: "শ্রীমঙ্গল (মৌলভীবাজার)", lat: 24.31, lon: 91.73 },
      { nameBn: "শায়েস্তাগঞ্জ (হবিগঞ্জ)", lat: 24.27, lon: 91.48 },
      { nameBn: "ভৈরব মেঘনা সেতু", lat: 24.05, lon: 90.98, isToll: true },
      { nameBn: "নরসিংদী পাঁচদোনা", lat: 23.90, lon: 90.65 },
      { nameBn: "কাওরান বাজার (ঢাকা)", lat: 23.75, lon: 90.39 },
    ],
  },
];

export interface CropPreset {
  id: string;
  nameBn: string;
  nameEn: string;
  category: "grain" | "tuber" | "vegetable" | "cash_crop" | "fruit";
  defaultQuantityKg: number;
  benchmarkLocalPrice: number;
  benchmarkDistantPrice: number;
  benchmarkTransportPerMaund: number;
  benchmarkCommissionPct: number;
  benchmarkLabourPerMaund: number;
  benchmarkLossPct: number;
  benchmarkOtherCosts: number;
  shelfLifeDays: number;
  perishableAlertBn?: string;
}

export const CROP_PRESETS: CropPreset[] = [
  {
    id: "potato",
    nameBn: "আলু (কার্ডিনাল/গ্র্যানোলা)",
    nameEn: "Potato",
    category: "tuber",
    defaultQuantityKg: 2000,
    benchmarkLocalPrice: 30,
    benchmarkDistantPrice: 38,
    benchmarkTransportPerMaund: 55,
    benchmarkCommissionPct: 4,
    benchmarkLabourPerMaund: 8,
    benchmarkLossPct: 1.5,
    benchmarkOtherCosts: 400,
    shelfLifeDays: 30,
    perishableAlertBn: "আলুর বস্তা আর্দ্র বা ভেজা অবস্থায় ট্রাকে পাঠালে পচন বাড়তে পারে; শুকনা বস্তায় পরিবহন করুন।",
  },
  {
    id: "rice",
    nameBn: "বোরো ধান (ব্রি-২৮ / ২৯)",
    nameEn: "Boro Rice",
    category: "grain",
    defaultQuantityKg: 4000,
    benchmarkLocalPrice: 31,
    benchmarkDistantPrice: 37,
    benchmarkTransportPerMaund: 45,
    benchmarkCommissionPct: 3,
    benchmarkLabourPerMaund: 7,
    benchmarkLossPct: 0.5,
    benchmarkOtherCosts: 500,
    shelfLifeDays: 180,
    perishableAlertBn: "ধান আর্দ্রতামুক্ত (১৪% বা কম আর্দ্রতা) হলে পথে ঘাটতি ও ওজনের হেরফের ন্যূনতম হয়।",
  },
  {
    id: "onion",
    nameBn: "পেঁয়াজ (তাহেরপুরী / বারি-১)",
    nameEn: "Onion",
    category: "vegetable",
    defaultQuantityKg: 1200,
    benchmarkLocalPrice: 65,
    benchmarkDistantPrice: 78,
    benchmarkTransportPerMaund: 65,
    benchmarkCommissionPct: 5,
    benchmarkLabourPerMaund: 10,
    benchmarkLossPct: 3.5,
    benchmarkOtherCosts: 350,
    shelfLifeDays: 14,
    perishableAlertBn: "বৃষ্টি বা গরমের দিনে পেঁয়াজের ট্রাকে ত্রিপল পুরোপুরি ঢেকে দিলে গরমে পেঁয়াজ নষ্ট হয়; বাতাস চলাচলের জাল ব্যবহার করুন।",
  },
  {
    id: "tomato",
    nameBn: "টমেটো (উফশী / হাইব্রিড)",
    nameEn: "Tomato",
    category: "vegetable",
    defaultQuantityKg: 800,
    benchmarkLocalPrice: 24,
    benchmarkDistantPrice: 36,
    benchmarkTransportPerMaund: 80,
    benchmarkCommissionPct: 6,
    benchmarkLabourPerMaund: 12,
    benchmarkLossPct: 6.0,
    benchmarkOtherCosts: 300,
    shelfLifeDays: 4,
    perishableAlertBn: "অতি-পচনশীল পণ্য: প্লাস্টিক ক্রেটে সাজিয়ে পরিবহন করলে চাপজনিত ক্ষতি ৫০% কমে।",
  },
  {
    id: "brinjal",
    nameBn: "বেগুন (ইসলামপুরী / শিংনাথ)",
    nameEn: "Brinjal",
    category: "vegetable",
    defaultQuantityKg: 600,
    benchmarkLocalPrice: 34,
    benchmarkDistantPrice: 50,
    benchmarkTransportPerMaund: 75,
    benchmarkCommissionPct: 6,
    benchmarkLabourPerMaund: 12,
    benchmarkLossPct: 5.0,
    benchmarkOtherCosts: 250,
    shelfLifeDays: 3,
    perishableAlertBn: "রোদের গরমে বেগুনের গায়ের চকচকে ভাব কমে শুকিয়ে যায়; রাতে বা ভোরে পরিবহন করুন।",
  },
  {
    id: "jute",
    nameBn: "তোষা পাট",
    nameEn: "Tosha Jute",
    category: "cash_crop",
    defaultQuantityKg: 2000,
    benchmarkLocalPrice: 75,
    benchmarkDistantPrice: 86,
    benchmarkTransportPerMaund: 40,
    benchmarkCommissionPct: 3,
    benchmarkLabourPerMaund: 8,
    benchmarkLossPct: 0.2,
    benchmarkOtherCosts: 400,
    shelfLifeDays: 365,
    perishableAlertBn: "শুকনা পাট বেল বাঁধার পর বৃষ্টি থেকে সুরক্ষিত রাখতে ওয়াটারপ্রুফ ত্রিপল নিশ্চিত করুন।",
  },
];

export interface LiveTruckTrip {
  id: string;
  truckNo: string;
  corridorId: string;
  cropBn: string;
  loadMaunds: number;
  originBn: string;
  destinationBn: string;
  status: "loading" | "in_transit" | "toll_crossing" | "arrived";
  progressPct: number;
  currentWaypointBn: string;
  speedKmh: number;
  estimatedHoursLeft: number;
  conditionNoteBn: string;
}

export const INITIAL_LIVE_TRIPS: LiveTruckTrip[] = [
  {
    id: "trip-1",
    truckNo: "ঢাকা মেট্রো-ট ১১-৪২২১",
    corridorId: "n5-bogura-dhaka",
    cropBn: "আলু (৫০ মণ)",
    loadMaunds: 50,
    originBn: "মহাস্থান হাট (বগুড়া)",
    destinationBn: "কাওরান বাজার (ঢাকা)",
    status: "in_transit",
    progressPct: 62,
    currentWaypointBn: "বঙ্গবন্ধু যমুনা সেতু অতিক্রম করেছে",
    speedKmh: 48,
    estimatedHoursLeft: 2.1,
    conditionNoteBn: "আবহাওয়া শুষ্ক, রাস্তায় যান চলাচল স্বাভাবিক।",
  },
  {
    id: "trip-2",
    truckNo: "ঢাকা মেট্রো-ড ১৪-৮০১৯",
    corridorId: "n8-jashore-dhaka",
    cropBn: "বেগুন ও টমেটো (৩০ মণ)",
    loadMaunds: 30,
    originBn: "বারোবাজার (ঝিনাইদহ/যশোর)",
    destinationBn: "শ্যামবাজার (ঢাকা)",
    status: "in_transit",
    progressPct: 78,
    currentWaypointBn: "পদ্মা সেতু এক্সপ্রেসওয়ে (মাওয়া অতিক্রম)",
    speedKmh: 62,
    estimatedHoursLeft: 1.0,
    conditionNoteBn: "দ্রুতগতি লেন; রাতে তাপমাত্রা সহনশীল।",
  },
  {
    id: "trip-3",
    truckNo: "চট্ট মেট্রো-ট ১২-৩১০৫",
    corridorId: "n1-dhaka-ctg",
    cropBn: "পেঁয়াজ ও আদা (৪০ মণ)",
    loadMaunds: 40,
    originBn: "কাওরান বাজার (ঢাকা)",
    destinationBn: "পাহাড়তলী (চট্টগ্রাম)",
    status: "in_transit",
    progressPct: 45,
    currentWaypointBn: "কুমিল্লা পদুয়ার বাজার মোড়",
    speedKmh: 52,
    estimatedHoursLeft: 3.3,
    conditionNoteBn: "মেঘনা ও গোমতী সেতু পার হয়েছে।",
  },
  {
    id: "trip-4",
    truckNo: "সিলেট মেট্রো-উ ১১-০৮৭২",
    corridorId: "n2-sylhet-dhaka",
    cropBn: "লেবু ও আনারস (২৫ মণ)",
    loadMaunds: 25,
    originBn: "শ্রীমঙ্গল (মৌলভীবাজার)",
    destinationBn: "কাওরান বাজার (ঢাকা)",
    status: "in_transit",
    progressPct: 85,
    currentWaypointBn: "নরসিংদী পাঁচদোনা অতিক্রম",
    speedKmh: 50,
    estimatedHoursLeft: 0.8,
    conditionNoteBn: "ভোরের পাইকারি বাজারের জন্য সময়মতো পৌঁছাবে।",
  },
];

/**
 * Projects latitude and longitude coordinates into Bangladesh 2D SVG canvas.
 * Geographic bounding box for Bangladesh:
 * Latitude: 20.5 (St. Martin's) to 26.6 (Tetulia)
 * Longitude: 88.0 (Meherpur/Shibganj) to 92.7 (Bandarban)
 */
export function geoToSvg(
  lat: number,
  lon: number,
  width = 500,
  height = 650
): { x: number; y: number } {
  const padX = 25;
  const padY = 25;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const minLat = 20.5;
  const maxLat = 26.6;
  const minLon = 88.0;
  const maxLon = 92.7;

  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const clampedLon = Math.max(minLon, Math.min(maxLon, lon));

  const x = padX + ((clampedLon - minLon) / (maxLon - minLon)) * usableW;
  // Latitude is inverted in SVG coordinate space (top is high latitude)
  const y = padY + ((maxLat - clampedLat) / (maxLat - minLat)) * usableH;

  return { x: r2(x), y: r2(y) };
}

/**
 * Interpolates geographical position along route waypoints given a progress percentage.
 */
export function interpolateRoutePosition(
  waypoints: RouteWaypoint[],
  progressPct: number
): { lat: number; lon: number; currentWaypointBn: string } {
  if (waypoints.length === 0) return { lat: 23.81, lon: 90.41, currentWaypointBn: "অজ্ঞাত" };
  if (waypoints.length === 1 || progressPct <= 0) {
    return { lat: waypoints[0].lat, lon: waypoints[0].lon, currentWaypointBn: waypoints[0].nameBn };
  }
  if (progressPct >= 100) {
    const last = waypoints[waypoints.length - 1];
    return { lat: last.lat, lon: last.lon, currentWaypointBn: last.nameBn };
  }

  const totalSegments = waypoints.length - 1;
  const globalT = (Math.max(0, Math.min(100, progressPct)) / 100) * totalSegments;
  const segIndex = Math.min(totalSegments - 1, Math.floor(globalT));
  const segT = globalT - segIndex;

  const p1 = waypoints[segIndex];
  const p2 = waypoints[segIndex + 1];

  const lat = p1.lat + (p2.lat - p1.lat) * segT;
  const lon = p1.lon + (p2.lon - p1.lon) * segT;

  return {
    lat: r2(lat),
    lon: r2(lon),
    currentWaypointBn: segT < 0.5 ? p1.nameBn : p2.nameBn,
  };
}

/**
 * Evaluates transit spoilage and logistics risk based on temperature, duration and product type.
 * Deterministic and transparent: calculates risk index with actionable guidance.
 */
export function estimateRouteRisk(params: {
  temperatureC: number;
  rainProbability: number;
  durationHours: number;
  isPerishable: boolean;
}): {
  riskLevel: "low" | "medium" | "high";
  spoilageRiskScore: number; // 0 to 100
  adviceBn: string;
} {
  let score = 10;
  if (params.isPerishable) score += 25;
  if (params.temperatureC > 32) score += 25;
  else if (params.temperatureC > 27) score += 15;

  if (params.rainProbability > 50) score += 20;
  else if (params.rainProbability > 30) score += 10;

  if (params.durationHours > 6) score += 20;
  else if (params.durationHours > 4) score += 10;

  const spoilageRiskScore = Math.min(100, Math.max(0, score));
  let riskLevel: "low" | "medium" | "high" = "low";
  let adviceBn = "রাস্তায় ঝুঁকি কম; স্বাভাবিক সতর্কতায় পরিবহন করুন।";

  if (spoilageRiskScore >= 60) {
    riskLevel = "high";
    adviceBn = "উচ্চ ঝুঁকি: অতিরিক্ত গরম বা বৃষ্টিতে শাকসবজি দ্রুত নেতিয়ে যেতে পারে; ভেন্টিলেশন ও ত্রিপল তদারকি করুন।";
  } else if (spoilageRiskScore >= 35) {
    riskLevel = "medium";
    adviceBn = "মাঝারি ঝুঁকি: দীর্ঘ যাত্রায় মাঝে মাঝে মালের অবস্থা পরীক্ষা করুন এবং জ্যাম এড়াতে রাতের বেলা পরিবহন শ্রেয়।";
  }

  return { riskLevel, spoilageRiskScore, adviceBn };
}

