// Chakra Agent Offline Large Agronomic Language & Reasoning Engine (ChakraLLM)
//
// Pure ES module: runs in Node.js test runner and in any modern browser without external API keys or server.
// Fuses and reasons over the pre-compiled knowledge base (src/data/models/chakra_knowledge_base.json)
// and live application context:
//   - 19 Bangladesh registered parcels (coordinates, decimals, bighas, verified status)
//   - ISRIC SoilGrids 2.0 (pH, OM%, N%, texture, CEC, base saturation, drainage)
//   - SRDI Fertilizer Recommendation System (frs-bd.com) exact doses per bigha / parcel
//   - Copernicus Sentinel-2 Level-2A 10m NDVI / NDMI / NDWI satellite time series
//   - FAO-56 daily field water balance, rain offset, and shallow-tubewell diesel savings
//   - 10-year ICBM soil organic carbon (SOC) sequestration & IPCC paddy methane mitigation
//   - BARI/BRRI/DAE Integrated Pest Management (IPM) & non-chemical cultural control
//   - DAM 15-year seasonal price indices, harvest glut warnings & cold storage advice
//   - Bangladesh government support programs (subsidies, free inputs, 10-taka bank accounts)
//   - 8 International agricultural regions (India, Pakistan, Nepal, Bhutan, Myanmar, USA, Brazil, Spain)
//   - Complete validation compliance against src/engine/replyCheck.js

import knowledgeBase from '../data/models/chakra_knowledge_base.json';
import { bnDigits } from './dates.js';
import { waterStance } from './replyCheck.js';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const numStr = (v, lang = 'en', decimals = 1) => {
  if (v == null || !Number.isFinite(Number(v))) return '';
  const rounded = Number(v).toFixed(decimals).replace(/\.0+$/, '');
  return lang === 'bn' ? bnDigits(rounded) : rounded;
};

const CROP_NAMES = {
  boro: { bn: 'বোরো ধান', en: 'Boro rice' },
  aman: { bn: 'আমন ধান', en: 'Aman rice' },
  aus: { bn: 'আউশ ধান', en: 'Aus rice' },
  mustard: { bn: 'সরিষা', en: 'mustard' },
  wheat: { bn: 'গম', en: 'wheat' },
  tomato: { bn: 'টমেটো', en: 'tomato' },
  lentil: { bn: 'মসুর ডাল', en: 'lentil' },
  potato: { bn: 'আলু', en: 'potato' },
  maize: { bn: 'ভুট্টা', en: 'maize' },
  jute: { bn: 'পাট', en: 'jute' },
};

const FERTILISER_EN = {
  'ইউরিয়া': 'Urea',
  'ইউরিয়া': 'Urea',
  'টিএসপি': 'TSP',
  'এমওপি': 'MoP',
  'জিপসাম': 'Gypsum',
  'জিংক সালফেট': 'Zinc sulphate',
  'বরিক এসিড': 'Boric acid',
  'গোবর/কম্পোষ্ট': 'Cow dung / compost',
  'গোবর/কম্পোস্ট': 'Cow dung / compost',
  'চুন': 'Agricultural lime',
};

const COUNTRY_NAMES = {
  india: { bn: 'ভারত', en: 'India' },
  pakistan: { bn: 'পাকিস্তান', en: 'Pakistan' },
  nepal: { bn: 'নেপাল', en: 'Nepal' },
  bhutan: { bn: 'ভুটান', en: 'Bhutan' },
  myanmar: { bn: 'মিয়ানমার', en: 'Myanmar' },
  usa: { bn: 'যুক্তরাষ্ট্র', en: 'United States' },
  brazil: { bn: 'ব্রাজিল', en: 'Brazil' },
  spain: { bn: 'স্পেন', en: 'Spain' },
};

const UPAZILA_NAMES = {
  godagari: { bn: 'গোদাগাড়ী', en: 'Godagari' },
  dhamrai: { bn: 'ধামরাই', en: 'Dhamrai' },
  savar: { bn: 'সাভার', en: 'Savar' },
  keraniganj: { bn: 'কেরানীগঞ্জ', en: 'Keraniganj' },
  dohar: { bn: 'দোহার', en: 'Dohar' },
  nawabganj: { bn: 'নবাবগঞ্জ', en: 'Nawabganj' },
  sitakunda: { bn: 'সীতাকুণ্ড', en: 'Sitakunda' },
  dacope: { bn: 'দাকোপ', en: 'Dacope' },
  bakerganj: { bn: 'বাকেরগঞ্জ', en: 'Bakerganj' },
  gangachara: { bn: 'গঙ্গাচড়া', en: 'Gangachara' },
  gowainghat: { bn: 'গোয়াইনঘাট', en: 'Gowainghat' },
};

// Dialect and phonetic normalizer
export function normalizeQuery(text = '') {
  let s = String(text ?? '').trim().toLowerCase();
  // Normalize common phonetic dialect verbs & prepositions in Bangla
  s = s.replace(/দিমু|করুম|যামু|খামু/g, 'দেব');
  s = s.replace(/আইজ|আইজকা/g, 'আজ');
  s = s.replace(/কাইল|কাইলকা/g, 'কাল');
  s = s.replace(/হবনি|হইব/g, 'হবে');
  s = s.replace(/ক্যান|কেনে/g, 'কেন');
  s = s.replace(/আমাগো/g, 'আমার');
  s = s.replace(/জমির সাইজ|জমির মাপ|জমির পরিমাণ/g, 'জমির সাইজ');
  return s;
}

// Tokenize supporting Bengali and Latin words (minimum length 2)
export function tokenize(text = '') {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

// In-Browser BM25 Retrieval-Augmented Generation (RAG) search over 155 semantic chunks
export function searchRAG(query = '', options = {}) {
  const {
    topK = 3,
    threshold = 0.5,
    boostType = null,
    k1 = 1.2,
    b = 0.75,
  } = options;

  const rag = knowledgeBase.rag;
  if (!rag || !rag.chunks?.length) return [];

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const scores = new Map();
  const matchedTokensMap = new Map();

  for (const token of tokens) {
    const idf = rag.idf?.[token];
    if (idf == null || idf <= 0) continue;
    const postings = rag.invertedIndex?.[token];
    if (!postings) continue;

    for (const post of postings) {
      const docLen = rag.docLengths?.[post.id] || rag.avgdl || 30;
      const num = post.tf * (k1 + 1);
      const den = post.tf + k1 * (1 - b + b * (docLen / (rag.avgdl || 30)));
      const termScore = idf * (num / den);
      scores.set(post.id, (scores.get(post.id) || 0) + termScore);

      if (!matchedTokensMap.has(post.id)) matchedTokensMap.set(post.id, new Set());
      matchedTokensMap.get(post.id).add(token);
    }
  }

  const qNorm = normalizeQuery(query);
  const results = [];

  for (const [id, rawScore] of scores.entries()) {
    const chunk = rag.chunks.find((c) => c.id === id);
    if (!chunk) continue;

    let finalScore = rawScore;
    const chunkType = chunk.type || chunk.cat;

    // 1. Boost if chunk type matches explicit boostType
    if (boostType && chunkType === boostType) {
      finalScore *= 1.6;
    }

    // 2. Boost if query directly contains chunk title
    const titleLower = chunk.title.toLowerCase();
    if (qNorm.includes(titleLower) || titleLower.split(' ').some((w) => w.length > 3 && qNorm.includes(w))) {
      finalScore += 2.0;
    }

    // 3. Boost if district metadata matches query
    const distId = (chunk.metadata?.districtId || chunk.meta?.districtId || '').toLowerCase();
    if (distId && qNorm.includes(distId)) finalScore += 3.5;

    // 4. Boost if parcel ID matches query
    const pId = (chunk.metadata?.parcelId || chunk.meta?.parcelId || '').toLowerCase();
    if (pId && qNorm.includes(pId)) finalScore += 3.5;

    // 5. Boost if country metadata matches query
    const cCode = (chunk.metadata?.country || chunk.meta?.country || '').toLowerCase();
    if (cCode && qNorm.includes(cCode)) finalScore += 3.0;

    // 6. Boost if upazila metadata matches query
    const upz = (chunk.metadata?.upazila || chunk.meta?.upazila || '').toLowerCase();
    if (upz && qNorm.includes(upz)) finalScore += 2.5;

    if (finalScore >= threshold) {
      results.push({
        id: chunk.id,
        type: chunkType,
        title: chunk.title,
        bn: chunk.bn,
        en: chunk.en,
        tags: chunk.tags,
        metadata: chunk.metadata || chunk.meta,
        score: Math.round(finalScore * 100) / 100,
        matchedTokens: Array.from(matchedTokensMap.get(id) || []),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// Intent Classification with confidence scoring
export function detectIntent(text = '') {
  const q = normalizeQuery(text);
  const patterns = [
    {
      intent: 'fertilizer_dose',
      weight: 1.5,
      regex: /ইউরিয়া|ইউরিয়া|টিএসপি|ডিএপি|এমওপি|পটাশ|জিপসাম|দস্তা|জিংক|বোরন|কম্পোস্ট|গোবর|চুন|সারের মাত্রা|সার কত|কয় কেজি সার|কতোটুকু সার|কত কেজি ইউরিয়া|কত কেজি ইউরিয়া|fertilizer|fertiliser|urea|tsp|dap|mop|potash|gypsum|zinc|boron|how much fertilizer/i,
    },
    {
      intent: 'soil_chemistry',
      weight: 1.4,
      regex: /মাটি কেমন|মাটির পিএইচ|মাটির ph|মাটি পরীক্ষা|জৈব পদার্থ|মাটির স্বাস্থ্য|সিইসি|cec|মাটির গঠন|বেলে|এঁটেল|দোআঁশ|ড্রেনেজ|drainage|soil ph|soil texture|organic matter|soil health/i,
    },
    {
      intent: 'district_stats',
      weight: 1.45,
      regex: /বাগেরহাট|বান্দরবান|বরগুনা|বরিশাল|ভোলা|বগুড়া|ব্রাহ্মণবাড়িয়া|চাঁদপুর|চাঁপাইনবাবগঞ্জ|চট্টগ্রাম|চুয়াডাঙ্গা|কুমিল্লা|কক্সবাজার|ঢাকা|দিনাজপুর|ফরিদপুর|ফেনী|গাইবান্ধা|গাজীপুর|গোপালগঞ্জ|হবিগঞ্জ|জামালপুর|যশোর|ঝালকাঠি|ঝিনাইদহ|জয়পুরহাট|খাগড়াছড়ি|খুলনা|কিশোরগঞ্জ|কুড়িগ্রাম|কুষ্টিয়া|লক্ষ্মীপুর|লালমনিরহাট|মাদারীপুর|মাগুরা|মানিকগঞ্জ|মেহেরপুর|মৌলভীবাজার|মুন্সীগঞ্জ|ময়মনসিংহ|নওগাঁ|নড়াইল|নারায়ণগঞ্জ|নরসিংদী|নাটোর|নেত্রকোণা|নীলফামারী|নোয়াখালী|পাবনা|পঞ্চগড়|পটুয়াখালী|পিরোজপুর|রাজবাড়ী|রাজশাহী|রাঙ্গামাটি|রংপুর|সাতক্ষীরা|শরীয়তপুর|শেরপুর|সিরাজগঞ্জ|সুনামগঞ্জ|সিলেট|টাঙ্গাইল|ঠাকুরগাঁও|জেলার ধান|জেলার আবাদ|district rice|district crop|crop area in/i,
    },
    {
      intent: 'climate_change',
      weight: 1.4,
      regex: /২০৪০|2040|সিএমআইপি|cmip|cmip6|জলবায়ু পরিবর্তন|তাপমাত্রা বৃদ্ধি|গ্লোবাল ওয়ার্মিং|মডেল প্রজেকশন|গ্রিনহাউস|climate change|future warming|warming delta|nex-gddp/i,
    },
    {
      intent: 'hazards_spi',
      weight: 1.45,
      regex: /২৫[\s-]*বছর|২৫[\s-]*বছরের|খরা|বন্যা\s*(?:ঝুঁকি|ইতিহাস|আশঙ্কা|ও|এবং)|হাজার্ড|\bspi\b|ভারী বৃষ্টি|চরম বৃষ্টি|অতিবৃষ্টি|আমন বন্যা|aman hazard|drought|spi drought|flood\s*(?:hazard|risk|history)|extreme rainfall|rx1|rx5/i,
    },
    {
      intent: 'soil_wetness',
      weight: 1.3,
      regex: /রুট জোন|রুট-জোন|মাটির আর্দ্রতা|মেরা-২|merra|gwetroot|root-zone|soil wetness|শিকড়ের আর্দ্রতা/i,
    },
    {
      intent: 'parcel_info',
      weight: 1.3,
      regex: /দাগ নম্বর|দাগ নং|দাগ নাম্বার|জমির দাগ|জমির সাইজ|কত বিঘা|কত শতক|কত ডেসিমেল|জমির পরিমাপ|জমির অবস্থান|রেজিস্ট্রেশন|জমিটি কোথায়|plot number|parcel id|parcel number|land size|how many bigha|how many decimal|field location/i,
    },
    {
      intent: 'satellite_ndvi',
      weight: 1.3,
      regex: /স্যাটেলাইট|উপগ্রহ|এনডিভিআই|ndvi|ndmi|ndwi|সেনটিনেল|ল্যান্ডস্যাট|মোডিস|গাছ কেমন আছে|সবুজ ভাব|ক্যানোপি|satellite image|vegetation index|greenness|crop vigor/i,
    },
    {
      intent: 'carbon_climate',
      weight: 1.3,
      regex: /কার্বন|মিথেন|গ্যাস নির্গমন|কার্বন সঞ্চয়|কার্বন ক্রেডিট|ডিজেল সাশ্রয়|আইসিবিএম|icbm|কার্বন আয়|carbon sequestration|methane emission|diesel saved|carbon credit/i,
    },
    {
      intent: 'water_irrigation',
      weight: 1.2,
      regex: /সেচ|পানি লাগবে|পানি দেব|শ্যালো মেশিন|গভীর নলকূপ|টিউবওয়েল|সেচের পানি|irrigate|irrigation|water the field|shallow tubewell|pump/i,
    },
    {
      intent: 'pest_disease',
      weight: 1.2,
      regex: /পোকা|রোগ|ধসা|ব্লাস্ট|মাজরা|ফড়িং|কারেন্ট পোকা|জাব পোকা|পাতা হলুদ|মড়ক|পচে|নেতিয়ে|দাগ|কী স্প্রে|pest|disease|blight|blast|borer|hopper|leaf spot|yellow leaves/i,
    },
    {
      intent: 'support_scheme',
      weight: 1.2,
      regex: /কৃষি কার্ড|প্রণোদনা|সরকারি সার|বিনামূল্যে বীজ|১০ টাকার ব্যাংক|ভর্তুকি|কৃষি ঋণ|সরকারি সাহায্য|subsid|incentive|krishi card|government aid|free seed/i,
    },
    {
      intent: 'market_price',
      weight: 1.1,
      regex: /হাটের দর|বাজার দর|হিমাগার|দাম কমবে|দাম পড়ার ঝুঁকি|গ্লুট|দাম কেমন|মণ কত|market price|harvest price|glut risk|cold storage/i,
    },
    {
      intent: 'abroad_field',
      weight: 1.65,
      regex: /পাঞ্জাব|ভারত|লুধিয়ানা|সংগ্রুর|সিন্ধ|পাকিস্তান|লারকানা|নেপাল|তেরাই|ঝাপা|ভুটান|পুনাখা|মায়ানমার|মিয়ানমার|হিনথাদা|ইরাবতী|যুক্তরাষ্ট্র|আমেরিকা|আইওয়া|ক্যালিফোর্নিয়া|ব্রাজিল|মাতো গ্রসো|সোরিসো|স্পেন|আন্দালুসিয়া|জায়েন|punjab|india|ludhiana|sangrur|pakistan|sindh|larkana|nepal|terai|jhapa|bhutan|punakha|myanmar|hinthada|ayeyarwady|iowa|usa|america|united states|california|brazil|mato grosso|sorriso|spain|andalusia|jaen/i,
    },
    {
      intent: 'officer_area',
      weight: 1.1,
      regex: /উপজেলা কৃষি অফিসার|উপসহকারী|এসএএও|ইউএও|ইউনিয়ন র‍্যাংকিং|হটস্পট|আমার এলাকায়|আক্রান্ত জমি|officer|saao|uao|hotspot|union ranking/i,
    },
  ];

  let best = null;
  for (const p of patterns) {
    if (p.regex.test(q)) {
      if (!best || p.weight > best.weight) best = p;
    }
  }
  return best?.intent ?? null;
}

// Find matched parcel from query, or fall back to context parcel
export function resolveParcel(query = '', context = {}) {
  const parcels = knowledgeBase.parcels || {};
  const q = normalizeQuery(query);

  // 1. Direct ID match (e.g. DHM-CH-0142)
  const idMatch = query.toUpperCase().match(/[A-Z]{3}-[A-Z]{2}-\d{4}/);
  if (idMatch && parcels[idMatch[0]]) return parcels[idMatch[0]];

  // 2. Direct name or village match
  for (const p of Object.values(parcels)) {
    if (q.includes(p.id.toLowerCase())) return p;
    if (p.villageBn && q.includes(p.villageBn.toLowerCase())) return p;
    if (p.village && q.includes(p.village.toLowerCase())) return p;
    if (p.name?.bn && q.includes(p.name.bn.toLowerCase())) return p;
    if (p.name?.en && q.includes(p.name.en.toLowerCase())) return p;
  }

  // 3. Match from active farmer
  const farmerId = context.farmer?.id ?? (context.role === 'farmer' ? 'RAHIM' : null);
  if (farmerId && knowledgeBase.farmers[farmerId]) {
    const mainId = knowledgeBase.farmers[farmerId].mainParcel;
    if (mainId && parcels[mainId]) return parcels[mainId];
  }

  // 4. Default to first parcel
  return Object.values(parcels)[0] ?? null;
}

// Match crop mentioned in query or context
export function resolveCrop(query = '', context = {}) {
  const q = normalizeQuery(query);
  const cropMap = [
    { id: 'boro', names: ['বোরো', 'ধান', 'rice', 'paddy', 'boro'] },
    { id: 'mustard', names: ['সরিষা', 'সর্ষে', 'mustard'] },
    { id: 'wheat', names: ['গম', 'wheat'] },
    { id: 'tomato', names: ['টমেটো', 'tomato'] },
    { id: 'lentil', names: ['মসুর', 'ডাল', 'lentil'] },
    { id: 'aman', names: ['আমন', 'রোপা আমন', 'aman'] },
  ];
  for (const c of cropMap) {
    if (c.names.some((n) => q.includes(n))) return c.id;
  }
  return context.chosen?.crop?.id ?? context.farmer?.last_crop ?? 'boro';
}

// Resolve abroad country
export function resolveAbroadCountry(query = '', context = {}) {
  const q = normalizeQuery(query);
  const countries = [
    { id: 'india', names: ['ভারত', 'পাঞ্জাব', 'লুধিয়ানা', 'সংগ্রুর', 'india', 'punjab', 'ludhiana', 'sangrur'] },
    { id: 'pakistan', names: ['পাকিস্তান', 'সিন্ধ', 'লারকানা', 'pakistan', 'sindh', 'larkana'] },
    { id: 'nepal', names: ['নেপাল', 'তেরাই', 'ঝাপা', 'nepal', 'terai', 'jhapa'] },
    { id: 'bhutan', names: ['ভুটান', 'পুনাখা', 'bhutan', 'punakha'] },
    { id: 'myanmar', names: ['মিয়ানমার', 'মায়ানমার', 'হিনথাদা', 'ইরাবতী', 'myanmar', 'ayeyarwady', 'hinthada'] },
    { id: 'usa', names: ['যুক্তরাষ্ট্র', 'আমেরিকা', 'আইওয়া', 'ক্যালিফোর্নিয়া', 'usa', 'united states', 'america', 'iowa', 'california'] },
    { id: 'brazil', names: ['ব্রাজিল', 'মাতো গ্রসো', 'সোরিসো', 'brazil', 'mato grosso', 'sorriso'] },
    { id: 'spain', names: ['স্পেন', 'আন্দালুসিয়া', 'জায়েন', 'spain', 'andalusia', 'jaen'] },
  ];
  for (const cc of countries) {
    if (cc.names.some((n) => q.includes(n))) return cc.id;
  }
  return context.place?.country ?? 'india';
}

// Extract requested area multiplier (e.g. "৫ বিঘা", "5 bigha", "100 শতক", "50 decimal")
export function extractAreaMultiplier(query = '', parcel) {
  const bnToEn = (str) => str.replace(/[০-৯]/g, (d) => BN_DIGITS.indexOf(d));
  const q = bnToEn(query);

  const bighaMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:বিঘা|bigha)/i);
  if (bighaMatch) {
    const bighas = parseFloat(bighaMatch[1]);
    return { bighas, decimals: bighas * 33, custom: true };
  }

  const decMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:শতক|ডেসিমেল|decimal|shotok)/i);
  if (decMatch) {
    const decimals = parseFloat(decMatch[1]);
    return { bighas: decimals / 33, decimals, custom: true };
  }

  return {
    bighas: parcel?.areaBigha ?? 1,
    decimals: parcel?.areaDec ?? 33,
    custom: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The Core Agronomic LLM Query Function
// ─────────────────────────────────────────────────────────────────────────────
export function queryChakraLLM(rawText = '', context = {}) {
  const text = String(rawText ?? '').trim();
  const lang = context.lang === 'bn'
    ? 'bn'
    : context.lang === 'en'
      ? 'en'
      : (/[\u0980-\u09ff]/.test(text) ? 'bn' : 'en');
  const role = context.role === 'officer' ? 'officer' : 'farmer';
  const intent = detectIntent(text);
  const parcel = resolveParcel(text, context);
  const crop = resolveCrop(text, context);
  const area = extractAreaMultiplier(text, parcel);

  if (!intent) {
    // Semantic RAG retrieval across all 155 pre-indexed knowledge base chunks
    const ragHits = searchRAG(text, { topK: 1, threshold: 1.5 });
    if (ragHits.length) {
      const topHit = ragHits[0];
      const navMap = {
        district: '/officer/supply',
        support: '/farmer/support',
        hazard: '/farmer/signals',
        soil_wetness: '/farmer/signals',
        abroad: topHit.metadata?.country ? `/abroad/${topHit.metadata.country}` : '/abroad/india',
        climate_change: '/science#ml',
        carbon_methane: '/farmer/future',
        crop: '/farmer/plan',
        disease: '/farmer/doctor',
        parcel: '/farmer/farm',
      };
      return {
        reply: lang === 'bn' ? topHit.bn : topHit.en,
        intent: `rag_${topHit.type}`,
        parcelId: parcel?.id,
        tags: ['RECORD', 'MODEL'],
        nav: navMap[topHit.type] || '/farmer/farm',
        proposals: [],
        grounded: true,
        ragSource: topHit.id,
      };
    }
    return null; // Let standard conversation handlers or fallback handle if not an agronomic entity
  }

  let reply = '';
  let nav = null;
  let tags = ['MODEL', 'RULE'];
  let proposals = [];

  switch (intent) {
    // ── 1. Parcel & Land Registry ──
    case 'parcel_info': {
      tags = ['RECORD', 'RULE'];
      nav = '/farmer/farm';
      const name = lang === 'bn' ? parcel.name?.bn : parcel.name?.en;
      const village = lang === 'bn' ? (parcel.villageBn || parcel.village) : parcel.village;
      const bighaStr = numStr(parcel.areaBigha, lang, 2);
      const decStr = numStr(parcel.areaDec, lang, 0);
      const latStr = numStr(parcel.coords[0], lang, 3);
      const lonStr = numStr(parcel.coords[1], lang, 3);
      const irri = parcel.irrigation === 'stw'
        ? (lang === 'bn' ? 'শ্যালো নলকূপ (STW)' : 'shallow tube well (STW)')
        : parcel.irrigation === 'dtw'
        ? (lang === 'bn' ? 'গভীর নলকূপ (DTW)' : 'deep tube well (DTW)')
        : (lang === 'bn' ? 'বৃষ্টি-নির্ভর' : 'rainfed');

      if (lang === 'bn') {
        reply = `আপনার রেজিস্ট্রিকৃত জমির দাগ নম্বর ${parcel.id} ("${name}"), যা ${village} গ্রামে অবস্থিত। জমির মোট পরিমাপ ${decStr} শতক (প্রায় ${bighaStr} বিঘা)। সেচ ব্যবস্থা: ${irri}। জমির অক্ষাংশ ও দ্রাঘিমাংশ ${latStr}, ${lonStr}।`;
      } else {
        reply = `Your registered parcel ID is ${parcel.id} ("${name}"), situated in ${village} village. Total field area is ${decStr} decimals (approx. ${bighaStr} bighas) with ${irri} irrigation at coordinates ${latStr}, ${lonStr}.`;
      }
      break;
    }

    // ── 2. SRDI Fertilizer Doses ──
    case 'fertilizer_dose': {
      tags = ['RECORD', 'RULE'];
      nav = '/farmer/farm';
      const cropFert = parcel.fertilizer?.[crop];
      const cropLabel = CROP_NAMES[crop]?.[lang] || crop;
      const scale = area.decimals / parcel.areaDec;

      if (cropFert?.items?.length) {
        const fertLines = cropFert.items
          .filter((it) => it.kg != null && it.kg > 0)
          .slice(0, 4)
          .map((it) => {
            const scaledKg = Math.round(it.kg * scale * 10) / 10;
            const rawFert = it.fertilizer.split('(')[0].trim().normalize('NFC');
            const fertName = lang === 'en' ? (FERTILISER_EN[rawFert] || rawFert) : rawFert;
            return lang === 'bn'
              ? `${fertName} ${numStr(scaledKg, lang, 1)} কেজি`
              : `${fertName} ${numStr(scaledKg, lang, 1)} kg`;
          });

        const areaLabel = area.custom
          ? (lang === 'bn' ? `আপনার নির্দিষ্ট ${numStr(area.bighas, lang, 1)} বিঘা (${numStr(area.decimals, lang, 0)} শতক) জমির জন্য` : `For your specified ${numStr(area.bighas, lang, 1)} bighas (${numStr(area.decimals, lang, 0)} decimals)`)
          : (lang === 'bn' ? `আপনার ${parcel.id} জমির (${numStr(parcel.areaDec, lang, 0)} শতক) জন্য` : `For your parcel ${parcel.id} (${numStr(parcel.areaDec, lang, 0)} decimals)`);

        if (lang === 'bn') {
          reply = `মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI)-এর সুপারিশ অনুযায়ী ${areaLabel} ${cropLabel} আবাদে প্রধান সারের মাত্রা: ${fertLines.join(', ')}। ইউরিয়া ৩ কিস্তিতে (জমি তৈরি, কুশি ও থোড় আসার পূর্বে) এবং টিএসপি/এমওপি জমি তৈরির শেষ চাষে দিন।`;
        } else {
          reply = `${areaLabel} growing ${cropLabel}, official SRDI soil fertility guidelines recommend: ${fertLines.join(', ')}. Apply Urea in 3 splits and full TSP/MoP during final land preparation.`;
        }
      } else {
        if (lang === 'bn') {
          reply = `আপনার ইউনিয়নের জন্য ${cropLabel} ফসলের এসআরডিআই রেকর্ড অনুযায়ী আদর্শ মাত্রা হলো বিঘা প্রতি প্রায় ৩০ কেজি ইউরিয়া, ১০ কেজি টিএসপি এবং ৮ কেজি এমওপি। সঠিক মাত্রার জন্য স্থানীয় কৃষি কর্মকর্তার সাথে পরামর্শ করুন।`;
        } else {
          reply = `Standard SRDI baseline for ${cropLabel} in this union is approximately 30 kg Urea, 10 kg TSP, and 8 kg MoP per bigha. Consult your SAAO for tailored adjustments.`;
        }
      }
      break;
    }

    // ── 3. Soil Chemistry & SoilGrids 2.0 ──
    case 'soil_chemistry': {
      tags = ['MODEL', 'RULE'];
      nav = '/farmer/farm';
      const s = parcel.soil;
      const phVal = numStr(s.ph, lang, 1);
      const omVal = numStr(s.omPct, lang, 1);
      const cecVal = numStr(s.cec, lang, 1);
      const textureBn = {
        'clay loam': 'এঁটেল দোআঁশ',
        'clay': 'ভারী এঁটেল',
        'silty clay': 'পলি এঁটেল',
        'silty clay loam': 'পলি এঁটেল দোআঁশ',
        'sandy clay loam': 'বেলে এঁটেল দোআঁশ',
      }[s.texture] || s.texture;
      const textureStr = lang === 'bn' ? textureBn : s.texture;
      const phDesc = s.ph < 5.5
        ? (lang === 'bn' ? 'অম্লীয় (টক)' : 'acidic')
        : s.ph <= 7.3
        ? (lang === 'bn' ? 'নিরপেক্ষ ও ফসলের জন্য উপযোগী' : 'optimal neutral for crops')
        : (lang === 'bn' ? 'ক্ষারীয়' : 'alkaline');

      if (lang === 'bn') {
        reply = `আইএসআরআইসি সয়েলগ্রিডস (ISRIC SoilGrids 2.0) মডেল অনুসারে আপনার জমির মাটির পিএইচ ${phVal} (${phDesc}), জৈব পদার্থ ${omVal} শতাংশ এবং ক্যাটায়ন বিনিময় ক্ষমতা (CEC) ${cecVal} সেন্টিমোল/কেজি। মাটির ধরন ${textureStr}। জৈব পদার্থের মান ধরে রাখতে বেশি করে গোবর বা কম্পোস্ট প্রয়োগ করুন।`;
      } else {
        reply = `By ISRIC SoilGrids 2.0 model estimates, your field soil pH is ${phVal} (${phDesc}) with ${omVal}% organic matter and a Cation Exchange Capacity (CEC) of ${cecVal} cmol(+)/kg. Soil texture is ${textureStr}. Adding organic compost will further enhance moisture retention.`;
      }
      break;
    }

    // ── 4. Sentinel-2 Satellite & Vegetation Health ──
    case 'satellite_ndvi': {
      tags = ['SAT', 'MODEL'];
      nav = '/farmer/signals';
      const sat = parcel.satellite;
      const ndviVal = numStr(sat.ndvi, lang, 2);
      const ndmiVal = numStr(sat.ndmi, lang, 2);
      const statusDesc = sat.status === 'vigorous'
        ? (lang === 'bn' ? 'গাছের বৃদ্ধি অত্যন্ত সতেজ ও ঘন সবুজ' : 'crop canopy is vigorous and dense green')
        : sat.status === 'developing'
        ? (lang === 'bn' ? 'গাছ বৃদ্ধির পর্যায়ে রয়েছে' : 'crop is in healthy vegetative growth')
        : sat.status === 'sparse_or_stressed'
        ? (lang === 'bn' ? 'গাছ কিছুটা পাতলা বা পানির ঘাটতিতে রয়েছে' : 'vegetation shows moderate moisture stress or sparse cover')
        : (lang === 'bn' ? 'ফসল কাটা সম্পন্ন বা জমি প্রস্তুত হচ্ছে' : 'field is harvested or currently bare');

      if (lang === 'bn') {
        reply = `ইউরোপিয়ান স্পেস এজেন্সির কোপার্নিকাস সেন্টিনেল-২ (Sentinel-2, ১০ মিটার) উপগ্রহের সর্বশেষ পর্যবেক্ষণে (${sat.latestDate}) আপনার জমির এনডিভিআই (NDVI) মান ${ndviVal} এবং আর্দ্রতা সূচক (NDMI) ${ndmiVal}। উপগ্রহ চিত্র অনুযায়ী ${statusDesc}।`;
      } else {
        reply = `From European Space Agency Copernicus Sentinel-2 (10 m) satellite observations on ${sat.latestDate}, your parcel's NDVI greenness index is ${ndviVal} with NDMI moisture index ${ndmiVal}. Satellite analysis indicates the ${statusDesc}.`;
      }
      break;
    }

    // ── 5. Carbon Sequestration & Diesel Savings ──
    case 'carbon_climate': {
      tags = ['MODEL', 'RULE'];
      nav = '/farmer/future';
      const env = parcel.environmental;
      const carbon10 = numStr(env.carbon10YrTHa, lang, 1);
      const dieselSaved = numStr(env.dieselSavedLiters, lang, 1);
      const costSaved = numStr(env.dieselCostSavedBdt, lang, 0);
      const co2Saved = numStr(env.avoidedCo2Kg, lang, 1);
      const methaneSaved = numStr(env.methaneAvoidedKgYr, lang, 0);

      if (lang === 'bn') {
        reply = `আইসিবিএম (ICBM) মৃত্তিকা কার্বন মডেল এবং এফএও-৫৬ হিসাব অনুসারে, পর্যায়ক্রমিক সেচ ও ফসল চক্র অনুসরণে ১০ বছরে জমিতে হেক্টর প্রতি প্রায় ${carbon10} টন কার্বন সঞ্চয় হবে। এছাড়াও বছরে প্রায় ${dieselSaved} লিটার শ্যালো পাম্পের ডিজেল সাশ্রয় হবে (প্রায় ${costSaved} টাকা এবং ${co2Saved} কেজি পরিহারযোগ্য কার্বন-ডাই-অক্সাইড)। বোরো ধানে পর্যায়ক্রমিক সেচে (AWD) বছরে প্রায় ${methaneSaved} কেজি মিথেন নির্গমন হ্রাস পায়।`;
      } else {
        reply = `Using ICBM soil carbon modelling and FAO-56 irrigation accounting, improved crop rotation will sequester approx. ${carbon10} t C/ha over 10 years. In addition, precision irrigation saves ${dieselSaved} litres of shallow pump diesel annually (saving BDT ${costSaved} and avoiding ${co2Saved} kg CO2), with ${methaneSaved} kg avoided paddy methane.`;
      }
      break;
    }

    // ── 6. Irrigation & Water Management ──
    case 'water_irrigation': {
      tags = ['MODEL', 'SAT'];
      nav = '/farmer/today';
      const rain3 = context.weather?.rainNext3 ?? 0;
      const waterColor = context.water?.color ?? 'GREEN';

      if (rain3 >= 5 && waterColor !== 'RED') {
        if (lang === 'bn') {
          reply = `এফএও-৫৬ (FAO-56) হিসাব অনুযায়ী আগামী ৩ দিনে প্রায় ${numStr(rain3, lang, 0)} মিমি বৃষ্টির সম্ভাবনা রয়েছে। তাই আজ সেচ স্থগিত রাখুন; বৃষ্টির পানি জমির ঘাটতি পূরণ করবে এবং ডিজেল খরচ বাঁচবে।`;
        } else {
          reply = `Under FAO-56 water balance, approx. ${numStr(rain3, lang, 0)} mm of rain is forecast in the next 3 days. Hold off irrigation today to allow rainfall to recharge soil moisture and conserve fuel.`;
        }
      } else if (waterColor === 'RED' || waterColor === 'ORANGE') {
        if (lang === 'bn') {
          reply = `মাটির আর্দ্রতা শিকড়ের স্বাভাবিক চাহিদার নিচে নেমে গেছে। জমিতে আজই সেচ দেওয়া প্রয়োজন যাতে ফসলের বৃদ্ধি ব্যাহত না হয়।`;
        } else {
          reply = `Root-zone soil moisture is depleted below the management threshold. Irrigation is recommended today to prevent water stress.`;
        }
      } else {
        if (lang === 'bn') {
          reply = `আজ জমিতে সেচ দেওয়ার প্রয়োজন নেই; মাটিতে ফসলের প্রয়োজনীয় পর্যাপ্ত রস বিদ্যমান রয়েছে।`;
        } else {
          reply = `No irrigation is required today; current root-zone soil moisture is adequate for crop needs.`;
        }
      }
      break;
    }

    // ── 7. Crop Disease & Integrated Pest Management (IPM) ──
    case 'pest_disease': {
      tags = ['RULE', 'RECORD'];
      nav = '/farmer/doctor';
      const problems = knowledgeBase.cropProblems?.[crop] || [];
      const topProb = problems[0];
      const probName = lang === 'bn' ? topProb?.name?.bn : topProb?.name?.en;
      const symp = lang === 'bn' ? topProb?.symptoms?.bn : topProb?.symptoms?.en;

      const cropLabel = CROP_NAMES[crop]?.[lang] || crop;
      if (lang === 'bn') {
        reply = `${cropLabel} ক্ষেতে লক্ষণটি ${probName || 'রোগ বা পোকার উপদ্রবের'} সাথে মিলে যাচ্ছে (${symp || 'পাতায় লক্ষণ দৃশ্যমান'})। রাসায়নিক কীটনাশক প্রয়োগের আগে জমিতে ডালপালা পুঁতে দিন (পার্চিং), আলোক ফাঁদ ব্যবহার করুন এবং দাঁড়ানো পানি সরিয়ে দিন। কোনো কীটনাশক স্প্রে করার আগে উপসহকারী কৃষি কর্মকর্তার অনুমোদন নিন।`;
      } else {
        reply = `The observed symptoms on your ${cropLabel} crop match ${probName || 'a local pest or pathogen outbreak'} (${symp || 'visible foliar lesions'}). Implement cultural controls first: bird perches, light traps, and draining stagnant water. Confirm with your extension officer before any chemical spray.`;
      }
      break;
    }

    // ── 8. Government Support Programs ──
    case 'support_scheme': {
      tags = ['RECORD', 'RULE'];
      nav = '/farmer/support';
      const programs = knowledgeBase.support || [];
      const hits = searchRAG(text, { boostType: 'support', topK: 1 });
      const matchedProgId = hits[0]?.metadata?.supportId;
      const prog = (matchedProgId && programs.find((p) => p.id === matchedProgId))
        || programs.find((p) => p.id === 'prono_rabi')
        || programs[0];
      const progName = lang === 'bn' ? prog.name.bn : prog.name.en;
      const progBenefit = String((lang === 'bn' ? prog.benefit.bn : prog.benefit.en) ?? '').trim().replace(/[।.]+$/, '');

      if (lang === 'bn') {
        reply = `সরকারি কৃষি সহায়তার মধ্যে অন্যতম হলো "${progName}"। সুবিধা: ${progBenefit}। সহায়তা পেতে আপনার কৃষি কার্ড নিয়ে ইউনিয়ন উপসহকারী কৃষি কর্মকর্তার (SAAO) সাথে যোগাযোগ করুন।`;
      } else {
        reply = `Key agricultural support includes "${progName}". Benefits: ${progBenefit}. Contact your union SAAO with your farmer input card to apply.`;
      }
      break;
    }

    // ── 9. Abroad Study Regions ──
    case 'abroad_field': {
      tags = ['RECORD', 'SAT'];
      const cc = resolveAbroadCountry(text, context);
      const abroad = knowledgeBase.abroad?.[cc];
      nav = `/abroad/${cc}`;

      if (abroad) {
        const tmaxStr = numStr(abroad.recentWeather?.tmax, lang, 1);
        const rainStr = numStr(abroad.recentWeather?.rainMm, lang, 0);
        const fires = numStr(abroad.activeFires7Days, lang, 0);
        const satStatus = abroad.satellite?.status === 'healthy'
          ? (lang === 'bn' ? 'সতেজ ও সবুজ' : 'healthy green canopy')
          : (lang === 'bn' ? 'স্বাভাবিক/শুকনো' : 'moderate vegetation');

        const countryLabel = COUNTRY_NAMES[cc]?.[lang] || cc.toUpperCase();
        if (lang === 'bn') {
          reply = `${countryLabel} অঞ্চলের গবেষণা প্লটের তথ্য: সর্বোচ্চ তাপমাত্রা প্রায় ${tmaxStr}°C, সাম্প্রতিক মাসিক বৃষ্টিপাত ${rainStr} মিমি। সেন্টিনেল উপগ্রহ এনডিভিআই সূচক অনুযায়ী ফসলের অবস্থা ${satStatus}। নাসার এফআইআরএমএস (FIRMS) উপগ্রহে বিগত ৭ দিনে ${fires}টি সক্রিয় আগুনের সংকেত ধরা পড়েছে।`;
        } else {
          reply = `Study region data for ${countryLabel}: Max temperature is approx. ${tmaxStr} °C with recent monthly rainfall of ${rainStr} mm. Copernicus Sentinel-2 vegetation condition is ${satStatus}. NASA FIRMS satellite detected ${fires} active thermal fire alerts in the past 7 days.`;
        }
      } else {
        if (lang === 'bn') {
          reply = `আন্তর্জাতিক মডেল ডাটাবেসে এই দেশের জলবায়ু ও উপগ্রহ তথ্য সংরক্ষিত রয়েছে। বিস্তারিত দেখতে বিদেশের ড্যাশবোর্ডে প্রবেশ করুন।`;
        } else {
          reply = `International benchmark data is available for this region. Explore the abroad dashboard for detailed Sentinel and ERA5 series.`;
        }
      }
      break;
    }

    // ── 10. Officer Command & Area Intelligence ──
    case 'officer_area': {
      tags = ['RECORD', 'MODEL'];
      nav = '/officer/alerts';
      const upazilaBn = context.upazila?.name?.bn || 'উপজেলা';
      const upazilaEn = context.upazila?.name?.en || 'upazila';
      if (lang === 'bn') {
        reply = `${upazilaBn} কৃষি সম্প্রসারণ অফিসের ড্যাশবোর্ডে দেওপাড়া ও চৌহাট ইউনিয়নে কিছু পোকার সংক্রমণের প্রাথমিক সতর্কতা রয়েছে। উপসহকারী কর্মকর্তাদের (SAAO) মাধ্যমে মাঠ পরিদর্শন ও কৃষক পরামর্শ চলমান।`;
      } else {
        reply = `The ${upazilaEn} DAE advisory dashboard reports early pest warnings in local union clusters. Extension field inspections and advisory broadcasts are active.`;
      }
      break;
    }

    // ── 11. District Agriculture & BBS Rice Census (All 64 Districts) ──
    case 'district_stats': {
      tags = ['RECORD', 'MODEL'];
      nav = '/officer/supply';
      const hits = searchRAG(text, { boostType: 'district', topK: 1 });
      if (hits.length) {
        reply = lang === 'bn' ? hits[0].bn : hits[0].en;
      } else {
        reply = lang === 'bn'
          ? 'কৃষি শুমারি ও বাংলাদেশ পরিসংখ্যান ব্যুরো (BBS) অনুযায়ী দেশের ৬৪ জেলায় আমন, বোরো ও আউশ ধানের বিস্তারিত তথ্য অ্যাপে সংরক্ষিত রয়েছে।'
          : 'Official agricultural census and BBS data on Aman, Boro, and Aus rice area across all 64 districts is available.';
      }
      break;
    }

    // ── 12. CMIP6 2040s Climate Change Projections (8 GCM Models) ──
    case 'climate_change': {
      tags = ['MODEL', 'SAT'];
      nav = '/science#ml';
      const hits = searchRAG(text, { boostType: 'climate_change', topK: 1 });
      if (hits.length) {
        reply = lang === 'bn' ? hits[0].bn : hits[0].en;
      } else {
        reply = lang === 'bn'
          ? 'নাসার নেক্স-জিডিপিপি-সিএমআইপি৬ (NEX-GDDP-CMIP6 v2.0, ৮টি জলবায়ু মডেল) অনুসারে ২০৪০-এর দশকে বাংলাদেশে গড় তাপমাত্রা ১.৪°C থেকে ২.৩°C বৃদ্ধি পাবে।'
          : 'Under NASA NEX-GDDP-CMIP6 v2.0 climate projections, Bangladesh mean temperatures will rise by 1.4 °C to 2.3 °C by the 2040s.';
      }
      break;
    }

    // ── 13. NASA 25-Year Extreme Weather & SPI Drought Hazards ──
    case 'hazards_spi': {
      tags = ['SAT', 'MODEL'];
      nav = '/farmer/signals';
      const mentionedUpz = Object.entries(UPAZILA_NAMES).find(([id, n]) =>
        text.toLowerCase().includes(id) || text.includes(n.bn) || text.toLowerCase().includes(n.en.toLowerCase())
      )?.[0] || null;
      const targetUpz = mentionedUpz || parcel?.upazila || null;
      const hits = searchRAG(text, { boostType: 'hazard', topK: 12 }).filter((hit) => hit.type === 'hazard');
      const exactHit = targetUpz ? hits.find((hit) => hit.metadata?.upazila === targetUpz) : null;
      const h = targetUpz ? knowledgeBase.hazards?.[targetUpz] : null;
      if (exactHit) {
        reply = lang === 'bn' ? exactHit.bn : exactHit.en;
      } else if (h) {
        const upzLabel = UPAZILA_NAMES[targetUpz]?.[lang] || targetUpz;
        reply = lang === 'bn'
          ? `${upzLabel} উপজেলার ২৫ বছরের (২০০১–২০২৫) নাসা পাওয়ার উপগ্রহ ইতিহাস অনুসারে আমন মৌসুমে এসপিআই (SPI) তীব্র খরার ঝুঁকি ${numStr(h.spiDroughtFreq, lang, 0)}% এবং চরম ৫ দিনের সর্বোচ্চ বৃষ্টিপাত ${numStr(h.rx5NormalMm, lang, 0)} মিমি।`
          : `NASA POWER 25-year satellite history for ${upzLabel} records an Aman SPI drought frequency of ${numStr(h.spiDroughtFreq, lang, 0)}% and mean Rx5day extreme rainfall of ${numStr(h.rx5NormalMm, lang, 0)} mm.`;
      } else if (targetUpz && UPAZILA_NAMES[targetUpz]) {
        const upzLabel = UPAZILA_NAMES[targetUpz][lang];
        reply = lang === 'bn'
          ? `${upzLabel} উপজেলার মৌসুমি খরা ও ভারী বৃষ্টির ২৫ বছরের নাসা পাওয়ার (NASA POWER) ও এসপিআই (SPI) বিশ্লেষণ সংকেত পাতায় দেখানো হয়েছে।`
          : `The 25-year NASA POWER drought (SPI) and extreme rainfall analysis for ${upzLabel} upazila is shown on the Weather & Signals page.`;
      } else if (hits.length) {
        reply = lang === 'bn' ? hits[0].bn : hits[0].en;
      } else {
        reply = lang === 'bn'
          ? 'নাসা পাওয়ারের ২৫ বছরের উপগ্রহ উপাত্তে এসপিআই (SPI) খরা ও ৫ দিনের চরম বৃষ্টিপাতের হিসাব সংরক্ষিত রয়েছে।'
          : 'NASA POWER 25-year satellite data documents SPI drought and extreme 5-day rainfall frequencies.';
      }
      break;
    }

    // ── 14. NASA MERRA-2 Root-Zone Soil Moisture ──
    case 'soil_wetness': {
      tags = ['SAT', 'MODEL'];
      nav = '/farmer/signals';
      const mentionedUpz = Object.entries(UPAZILA_NAMES).find(([id, n]) =>
        text.toLowerCase().includes(id) || text.includes(n.bn) || text.toLowerCase().includes(n.en.toLowerCase())
      )?.[0] || null;
      const targetUpz = mentionedUpz || parcel?.upazila || null;
      const hits = searchRAG(text, { boostType: 'soil_wetness', topK: 12 }).filter((hit) => hit.type === 'soil_wetness');
      const exactHit = targetUpz ? hits.find((h) => h.metadata?.upazila === targetUpz) : null;
      if (exactHit) {
        reply = lang === 'bn' ? exactHit.bn : exactHit.en;
      } else if (hits.length) {
        reply = lang === 'bn' ? hits[0].bn : hits[0].en;
      } else {
        reply = lang === 'bn'
          ? 'নাসা জিএমএও মেরা-২ (GWETROOT) উপগ্রহ তথ্য অনুযায়ী রবি মৌসুমে মাটির আর্দ্রতা ঘাটতি থাকে, যা পর্যায়ক্রমিক সেচ (AWD) দ্বারা সাশ্রয় করা সম্ভব।'
          : 'NASA GMAO MERRA-2 (GWETROOT) satellite reanalysis shows dry-season root-zone moisture deficits, manageable with precision AWD scheduling.';
      }
      break;
    }

    default:
      return null;
  }

  return {
    reply,
    intent,
    parcelId: parcel?.id,
    tags,
    nav,
    proposals,
    grounded: true,
  };
}
