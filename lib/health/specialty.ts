/*
 * "Which doctor should I see?" — the rule-based core of the MediScan health assistant. NO imports (pure,
 * unit-tested in tests/health-assist.test.ts).
 *
 * What this does: (1) checks a symptom description for emergency warning signs first and, if any is present,
 * sends the person to emergency care with nothing else; (2) otherwise suggests the KIND of doctor (a specialty from
 * a fixed list) and organises what to tell that doctor. It never names a disease as a conclusion, never suggests a
 * medicine and never gives a dose. Routing by keyword is a design rule, not a diagnosis.
 *
 * Warning-sign lists come from NHS pages (sources in each RED_FLAGS entry, checked 2026-11-18). The 999 number
 * used in Bangladesh is the national emergency service (shown by the app shell); 16263 is Shastho Batayon.
 */

export const HEALTH_CHECKED = "2026-11-18";

export interface HealthSource { label: string; url: string; checked: string }
const src = (label: string, url: string): HealthSource => ({ label, url, checked: HEALTH_CHECKED });

export const NHS_999 = src("NHS 111 online — Call 999 now for any of these", "https://111.nhs.uk/triage/check-its-not-an-emergency");
export const NHS_PREGNANCY_BLEEDING = src("NHS — Vaginal bleeding in pregnancy (call 999 if…)", "https://www.nhs.uk/pregnancy/related-conditions/common-symptoms/vaginal-bleeding/");
export const NHS_CHILD_FEVER = src("NHS — High temperature (fever) in children (call 999 if…)", "https://www.nhs.uk/conditions/fever-in-children/");
export const NHS_POISONING = src("NHS — Poisoning (call 999 or go to A&E if…)", "https://www.nhs.uk/conditions/poisoning/");
export const NHS_STROKE = src("NHS — Symptoms of a stroke (FAST)", "https://www.nhs.uk/conditions/stroke/symptoms/");
export const SHASTHO_BATAYON = src("স্বাস্থ্য বাতায়ন ১৬২৬৩ — স্বাস্থ্য অধিদপ্তর", "https://16263.dghs.gov.bd/");

export const HEALTH_SOURCES: readonly HealthSource[] = [NHS_999, NHS_STROKE, NHS_PREGNANCY_BLEEDING, NHS_CHILD_FEVER, NHS_POISONING, SHASTHO_BATAYON];

// ---------------------------------------------------------------------------------------------
// Text normalisation (Bangla has two encodings of য়/ড়/ঢ়; NFC keeps matching stable)
// ---------------------------------------------------------------------------------------------
export const norm = (s: string): string => (s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
const has = (t: string, words: readonly string[]) => words.filter((w) => t.includes(norm(w)));

// ---------------------------------------------------------------------------------------------
// Red flags — any one means "call 999 / go to emergency now", nothing else is shown
// ---------------------------------------------------------------------------------------------
export type RedFlagId =
  | "chest_pain" | "breathing" | "stroke" | "bleeding" | "unconscious" | "seizure"
  | "pregnancy_bleeding" | "poisoning" | "self_harm" | "child_fever_danger" | "severe_injury" | "swelling_throat" | "labour";

export interface RedFlag {
  id: RedFlagId;
  bn: string; // what the person can tick, in plain words
  en: string;
  keywords: readonly string[]; // Bangla, Banglish, English
  source: HealthSource;
}

export const RED_FLAGS: readonly RedFlag[] = [
  { id: "chest_pain", bn: "বুকে ব্যথা, চাপ, ভারী লাগা বা চেপে ধরা", en: "Chest pain, pressure, heaviness or squeezing", source: NHS_999,
    keywords: ["বুকে ব্যথা", "বুক ব্যথা", "বুকে চাপ", "বুক চেপে", "বুক ভারী", "buke betha", "buke batha", "chest pain", "chest pressure", "chest tightness", "heart attack", "হার্ট অ্যাটাক"] },
  { id: "breathing", bn: "শ্বাস নিতে খুব কষ্ট, কথা বলতে পারছে না, দম আটকে যাচ্ছে", en: "Severe difficulty breathing, can't get words out, choking or gasping", source: NHS_999,
    keywords: ["শ্বাস নিতে কষ্ট", "শ্বাসকষ্ট", "শ্বাস নিতে পারছে না", "দম আটকে", "দম বন্ধ", "shash kosto", "can't breathe", "cannot breathe", "difficulty breathing", "choking", "gasping", "short of breath"] },
  { id: "stroke", bn: "মুখ এক দিকে বেঁকে যাওয়া, দুই হাত তুলতে না পারা, কথা জড়িয়ে যাওয়া", en: "Face drooping on one side, can't lift both arms, slurred speech (stroke signs)", source: NHS_STROKE,
    keywords: ["মুখ বেঁকে", "মুখ বাঁকা", "কথা জড়িয়ে", "হাত অবশ", "পা অবশ", "এক পাশ অবশ", "স্ট্রোক", "stroke", "face drooping", "slurred speech", "one side weak", "can't lift arm"] },
  { id: "bleeding", bn: "প্রচুর রক্তপাত যা থামছে না", en: "Heavy bleeding that will not stop", source: NHS_999,
    keywords: ["রক্ত থামছে না", "প্রচুর রক্ত", "অনেক রক্ত", "রক্তপাত থামছে না", "heavy bleeding", "bleeding won't stop", "bleeding wont stop", "lots of blood"] },
  { id: "unconscious", bn: "অজ্ঞান, জাগানো যাচ্ছে না, বা হঠাৎ খুব বিভ্রান্ত", en: "Unconscious, can't be woken, or suddenly very confused", source: NHS_999,
    keywords: ["অজ্ঞান", "জ্ঞান নেই", "জ্ঞান হারিয়েছে", "জাগছে না", "সাড়া দিচ্ছে না", "ogyan", "unconscious", "fainted and not waking", "not responding", "can't wake"] },
  { id: "seizure", bn: "খিঁচুনি বা কাঁপুনি যা থামছে না", en: "A fit or seizure (shaking or jerking)", source: NHS_999,
    keywords: ["খিঁচুনি", "খিচুনি", "কাঁপুনি থামছে না", "মৃগী", "khichuni", "seizure", "fit", "convulsion"] },
  { id: "pregnancy_bleeding", bn: "গর্ভাবস্থায় রক্তপাতের সঙ্গে তীব্র পেটব্যথা, মাথা ঘোরা বা প্রচুর রক্ত", en: "Bleeding in pregnancy with severe tummy pain, dizziness or heavy bleeding", source: NHS_PREGNANCY_BLEEDING,
    keywords: ["গর্ভাবস্থায় রক্ত", "পেটে বাচ্চা রক্ত", "প্রেগন্যান্ট রক্ত", "গর্ভবতী রক্তপাত", "pregnant bleeding", "bleeding in pregnancy", "pregnancy bleeding"] },
  { id: "poisoning", bn: "বিষ, কীটনাশক বা ক্ষতিকর কিছু খেয়ে ফেলা বা শ্বাসে নেওয়া", en: "Swallowed or breathed in poison, pesticide or something harmful", source: NHS_POISONING,
    keywords: ["বিষ খেয়েছে", "বিষ খেয়ে", "কীটনাশক খেয়েছে", "কীটনাশক খেয়ে", "ঘুমের ওষুধ বেশি", "poison", "pesticide", "swallowed", "overdose"] },
  { id: "self_harm", bn: "নিজের ক্ষতি করার চেষ্টা বা আত্মহত্যার কথা ভাবা", en: "Self-harm or thoughts of ending one's life", source: NHS_999,
    keywords: ["আত্মহত্যা", "মরে যেতে চাই", "নিজের ক্ষতি", "বাঁচতে চাই না", "suicide", "kill myself", "self harm", "self-harm", "end my life"] },
  { id: "child_fever_danger", bn: "জ্বরে শিশুর খিঁচুনি, ঘাড় শক্ত, চেপে দিলে মিলায় না এমন র‍্যাশ, ঘুম থেকে জাগানো যাচ্ছে না", en: "A child with fever and a fit, stiff neck, a rash that doesn't fade, or hard to wake", source: NHS_CHILD_FEVER,
    keywords: ["ঘাড় শক্ত", "র‍্যাশ মিলায় না", "বাচ্চা জাগছে না", "শিশু জাগছে না", "stiff neck", "rash that does not fade", "rash doesn't fade", "child hard to wake", "baby not waking"] },
  { id: "severe_injury", bn: "বড় দুর্ঘটনার পর গুরুতর আঘাত", en: "Severe injuries after a serious accident", source: NHS_999,
    keywords: ["বড় দুর্ঘটনা", "সড়ক দুর্ঘটনা", "মাথায় গুরুতর আঘাত", "হাড় বেরিয়ে", "serious accident", "road accident", "severe injury", "head injury"] },
  { id: "swelling_throat", bn: "হঠাৎ ঠোঁট, মুখ, গলা বা জিভ দ্রুত ফুলে যাওয়া", en: "Sudden, rapid swelling of the lips, mouth, throat or tongue", source: NHS_999,
    keywords: ["গলা ফুলে", "জিভ ফুলে", "ঠোঁট ফুলে", "মুখ ফুলে গেছে", "throat swelling", "tongue swelling", "lips swelling", "anaphylaxis"] },
  { id: "labour", bn: "প্রসব শুরু: পানি ভাঙা, ঘন ঘন তীব্র ব্যথা, বাচ্চা আসছে", en: "Labour: waters breaking, frequent strong contractions, baby coming", source: NHS_999,
    keywords: ["পানি ভেঙেছে", "প্রসব ব্যথা", "বাচ্চা হচ্ছে", "লেবার পেইন", "waters broke", "waters breaking", "labour pain", "labor pain", "baby coming"] },
];

export const redFlagById = (id: string): RedFlag | undefined => RED_FLAGS.find((r) => r.id === id);

/*
 * People describe emergencies in their own words ("my father's chest hurts and his left arm feels heavy",
 * "বুকে খুব ব্যথা", "buk e betha", "he collapsed"), not in our keyword list. These patterns allow a few words in
 * between and cover Banglish spellings. They lean towards caution: a false alarm costs a phone call, a miss can cost
 * a life. Tested with real paraphrases in tests/health-assist.test.ts.
 */
const GAP = "[\\s\\S]{0,30}?";
const P = (...parts: string[]) => new RegExp(parts.join(GAP), "i");
const RED_FLAG_PATTERNS: Partial<Record<RedFlagId, readonly RegExp[]>> = {
  chest_pain: [
    P("(chest|chst|chset|বুক|\\bbuk)", "(pain|hurt|ache|tight|pressure|heavy|squeez|crush|burn|betha|batha|bytha|byatha|ব্যথা|ব্যাথা|চাপ|চেপে|ভারী|জ্বালা|চিনচিন|\\bchap|chepe)"),
    P("(pain|hurt|ache|pressure|ব্যথা|ব্যাথা)", "(in (my|his|her|the) chest|chest|বুকে)"),
    P("(left arm|বাম হাত|bam hat|jaw|চোয়াল)", "(heavy|pain|numb|hurt|ভারী|ব্যথা|অবশ)"),
  ],
  breathing: [
    P("(can'?t|cannot|can not|unable to|hard to|trouble|struggling to|difficult)", "breath"),
    P("breath", "(very |really )?(fast|hard|difficult|short|stopp|noisy)"),
    P("(শ্বাস|শাস|দম|\\bshash|\\bshas|nishash|nisshash|\\bdom)", "(কষ্ট|কস্ট|পারছে না|পারছি না|নিতে পারছে|আটকে|বন্ধ|দ্রুত|ঘন ঘন|kosto|parche na|parchi na|atke)"),
    /\b(gasp|wheez|turning blue|lips (are |look )?blue|ঠোঁট নীল)/i,
  ],
  unconscious: [/(collaps|ja+g(che|e) na|j[ae]gche na|s?h?ara dicche na|সাড়া নেই|passed out|blacked out|unresponsive|not waking|won'?t wake|can'?t wake|অজ্ঞান|জ্ঞান হার|জ্ঞান নেই|অচেতন|বেহুঁশ|ogyan|behush|giye porese|পড়ে গেছে[\s\S]{0,20}উঠছে না)/i],
  bleeding: [
    P("(bleed|blood|রক্ত|\\brokto)", "(a lot|lots|heavy|heavily|won'?t stop|not stop|keeps|pouring|gushing|spurting|থামছে না|থামে না|বন্ধ হচ্ছে না|অনেক|প্রচুর|বেশি|beshi|thamche na|bondho hocche na)"),
    P("(a lot of|lots of|heavy|so much|অনেক|প্রচুর|\\bonek|prochur)", "(blood|bleed|রক্ত|\\brokto)"),
  ],
  self_harm: [/(want to die|don'?t want to live|do not want to live|killing myself|cut(ting)? myself|নিজেকে শেষ|বেঁচে থাকতে চাই না|bachte ich?c?ha kore na|bachte icche kore na|sui?si?de|sucide|suicde|wanna die|wish i (was|were) dead|kill (myself|himself|herself)|end (it all|my life)|suicid|no reason to live|hurt myself|মরে যেতে চাই|মরে যাব|মরতে চাই|বাঁচতে ইচ্ছা করে না|বাঁচতে চাই না|আত্মহত্যা|nijeke shesh|more jete chai|morte chai|bachte chai na)/i],
  stroke: [P("(face|mouth|মুখ|\\bmukh)", "(droop|bank|bent|crooked|twist|বেঁকে|বাঁকা|ঝুলে|beke|baka)"), /(can'?t|cannot|unable to) (lift|raise|move) (his|her|my|one|the)? ?(arm|hand|leg)/i, P("(speech|talk|কথা|\\bkotha)", "(slur|jumbl|জড়িয়ে|jorie|জড়ানো)"), /(sudden(ly)? (weak|numb)|one side[\s\S]{0,15}(weak|numb|paraly)|এক পাশ[\s\S]{0,15}(অবশ|দুর্বল))/i],
  poisoning: [P("(drank|swallow|ate|খেয়ে ফেলেছে|খেয়েছে|kheye(che|feleche)?)", "(poison|বিষ|\\bbish|pesticide|কীটনাশক|kerosene|কেরোসিন|bleach|ব্লিচ|rat poison|ইঁদুরের বিষ)"), P("(poison|বিষ|\\bbish|pesticide|কীটনাশক|kerosene|কেরোসিন|bleach|ব্লিচ)", "(drank|swallow|kheye|খেয়ে|খেয়েছে|gile|গিলে)"), /(overdose|too many (pills|tablets)|(whole|full|entire) (strip|bottle|packet) of|(took|taken|swallowed)[\s\S]{0,25}sleeping (pills|tablets)|অনেকগুলো (ট্যাবলেট|ওষুধ) খেয়ে|ঘুমের (ট্যাবলেট|ওষুধ|বড়ি)[\s\S]{0,20}(অনেক|খেয়ে|খেয়েছে)|ghumer (oshudh|osud|tablet)[\s\S]{0,20}(onek|kheye))/i],
  seizure: [/(\bfit(s|ting)?\b[\s\S]{0,15}(won'?t stop|again)|shaking[\s\S]{0,20}(can'?t stop|won'?t stop|uncontroll)|convuls|জ্ঞান হারিয়ে কাঁপছে)/i],
  child_fever_danger: [P("(baby|infant|child|newborn|বাচ্চা|শিশু|\\bbaccha)", "(breath|শ্বাস)", "(fast|very fast|quick|দ্রুত|ঘন ঘন)"), P("(baby|infant|newborn|বাচ্চা|শিশু|\\bshishu|\\bbaccha|\\bbachcha)", "(not feeding|won'?t feed|খাচ্ছে না|limp|নিস্তেজ|nisteje|nistej|blue|নীল)")],
  pregnancy_bleeding: [P("(pregnan|গর্ভ|পোয়াতি|\\bpet e baccha|\\bgorbho)", "(bleed|blood|রক্ত|\\brokto)")],
  swelling_throat: [P("(throat|tongue|lips?|গলা|জিভ|ঠোঁট|\\bgola|\\bjibh)", "(swell|ফুলে|fule)")],
  labour: [/(waters? (has |have )?(broke|broken|breaking)|প্রসব(ের)? ব্যথা|prosob(er)? (betha|batha)|contractions? (every|are)|পানি ভাঙ)/i],
  severe_injury: [/(hit by (a )?(car|bus|truck|bike)|fell from|পড়ে গিয়ে মাথা|মাথা ফেটে|accident[\s\S]{0,25}(blood|unconscious|head|rokto|মাথা|অজ্ঞান|রক্ত)|এক্সিডেন্ট[\s\S]{0,25}(রক্ত|অজ্ঞান|মাথা)|দুর্ঘটনা[\s\S]{0,25}(রক্ত|অজ্ঞান|মাথা))/i],
};

/** Every warning sign mentioned in the text (keywords or phrase patterns) plus any the person ticked. */
export function findRedFlags(text: string, ticked: readonly string[] = []): RedFlag[] {
  const t = norm(text);
  const out = new Map<RedFlagId, RedFlag>();
  for (const id of ticked) { const r = redFlagById(id); if (r) out.set(r.id, r); }
  for (const r of RED_FLAGS) {
    if (has(t, r.keywords).length || (RED_FLAG_PATTERNS[r.id] ?? []).some((re) => re.test(t))) out.set(r.id, r);
  }
  return [...out.values()];
}

// ---------------------------------------------------------------------------------------------
// Specialties (fixed list; ids are shared with /mediscan/doctors?specialty=…)
// ---------------------------------------------------------------------------------------------
export type SpecialtyId =
  | "medicine" | "paediatrics" | "gynaecology" | "orthopaedics" | "cardiology" | "dermatology" | "ent" | "eye"
  | "dental" | "psychiatry" | "neurology" | "gastro" | "urology" | "chest" | "endocrine";

export interface Specialty {
  id: SpecialtyId;
  bn: string;
  en: string;
  /** What this kind of doctor looks after, in plain words (not a diagnosis). */
  coversBn: string;
  coversEn: string;
  keywords: readonly string[];
}

export const SPECIALTIES: readonly Specialty[] = [
  { id: "medicine", bn: "মেডিসিন বিশেষজ্ঞ", en: "Medicine specialist (internal medicine)", coversBn: "জ্বর, দুর্বলতা, শরীর ব্যথা, প্রেশার বা সুগারের মতো সাধারণ বড়দের সমস্যা; কোথায় যাবেন বুঝতে না পারলে প্রথম ধাপ।", coversEn: "General adult problems such as fever, weakness, body aches, blood pressure or sugar; the first step when unsure.",
    keywords: ["জ্বর", "দুর্বল", "শরীর ব্যথা", "প্রেশার", "রক্তচাপ", "মাথা ঘোরা", "ক্লান্ত", "fever", "jor", "weak", "tired", "body ache", "blood pressure", "bp", "dizzy"] },
  { id: "paediatrics", bn: "শিশু বিশেষজ্ঞ", en: "Child specialist (paediatrics)", coversBn: "নবজাতক থেকে কিশোর বয়স পর্যন্ত শিশুর অসুখ, বৃদ্ধি ও টিকা।", coversEn: "Illness, growth and vaccines from newborns to teenagers.",
    keywords: ["শিশু", "বাচ্চা", "নবজাতক", "বাবু", "child", "baby", "infant", "newborn", "kid", "toddler"] },
  { id: "gynaecology", bn: "স্ত্রীরোগ ও প্রসূতি বিশেষজ্ঞ", en: "Gynaecologist & obstetrician", coversBn: "মাসিক, গর্ভধারণ, গর্ভাবস্থার চেকআপ ও নারীদের প্রজনন স্বাস্থ্য।", coversEn: "Periods, pregnancy, antenatal check-ups and women's reproductive health.",
    keywords: ["মাসিক", "পিরিয়ড", "গর্ভ", "প্রেগন্যান্ট", "গর্ভবতী", "সাদা স্রাব", "period", "pregnan", "menstrua", "white discharge", "masik"] },
  { id: "orthopaedics", bn: "অর্থোপেডিক (হাড় ও জোড়া) বিশেষজ্ঞ", en: "Orthopaedic specialist (bones & joints)", coversBn: "হাড়, জোড়া, পিঠ, কোমর, হাঁটু ও আঘাতজনিত ব্যথা।", coversEn: "Bones, joints, back, waist, knee and injury-related pain.",
    keywords: ["হাড়", "হাঁটু", "কোমর", "জোড়া", "পিঠে ব্যথা", "ঘাড়ে ব্যথা", "মচকে", "ভেঙে", "bone", "joint", "knee", "back pain", "neck pain", "sprain", "fracture", "komor"] },
  { id: "cardiology", bn: "হৃদরোগ বিশেষজ্ঞ", en: "Cardiologist (heart)", coversBn: "বুক ধড়ফড়, হাঁপিয়ে ওঠা, হৃদযন্ত্রের পরীক্ষা ও আগের হৃদরোগের ফলোআপ। (বুকে তীব্র ব্যথা হলে এখনই ৯৯৯।)", coversEn: "Palpitations, breathlessness on effort, heart tests and heart follow-up. (Severe chest pain: call 999 now.)",
    keywords: ["বুক ধড়ফড়", "ধড়ফড়", "হার্ট", "হৃদ", "palpitation", "heart", "racing heart", "irregular heartbeat"] },
  { id: "dermatology", bn: "চর্মরোগ বিশেষজ্ঞ", en: "Dermatologist (skin)", coversBn: "ত্বক, চুল ও নখের সমস্যা: চুলকানি, র‍্যাশ, ব্রণ, দাদ।", coversEn: "Skin, hair and nail problems: itching, rash, acne, ringworm.",
    keywords: ["চুলকানি", "র‍্যাশ", "ব্রণ", "দাদ", "চামড়া", "ত্বক", "চুল পড়া", "itch", "rash", "acne", "skin", "hair fall", "eczema", "chulkani"] },
  { id: "ent", bn: "নাক-কান-গলা বিশেষজ্ঞ", en: "ENT specialist (ear, nose, throat)", coversBn: "কানে ব্যথা বা কম শোনা, নাক বন্ধ, সাইনাস, গলা ব্যথা, টনসিল।", coversEn: "Ear pain or hearing loss, blocked nose, sinus, sore throat, tonsils.",
    keywords: ["কান", "নাক", "গলা ব্যথা", "টনসিল", "সাইনাস", "ear", "nose", "throat", "tonsil", "sinus", "hearing"] },
  { id: "eye", bn: "চক্ষু বিশেষজ্ঞ", en: "Eye specialist (ophthalmology)", coversBn: "চোখে কম দেখা, লাল চোখ, চোখে ব্যথা বা চশমার পরীক্ষা।", coversEn: "Blurred vision, red eye, eye pain or a glasses check.",
    keywords: ["চোখ", "ঝাপসা", "কম দেখি", "eye", "vision", "blurred", "red eye", "chokh"] },
  { id: "dental", bn: "দন্ত বিশেষজ্ঞ", en: "Dentist", coversBn: "দাঁত ও মাড়ির ব্যথা, দাঁতে পোকা, মাড়ি থেকে রক্ত।", coversEn: "Tooth and gum pain, cavities, bleeding gums.",
    keywords: ["দাঁত", "মাড়ি", "tooth", "teeth", "gum", "dental", "dat"] },
  { id: "psychiatry", bn: "মানসিক স্বাস্থ্য বিশেষজ্ঞ (সাইকিয়াট্রিস্ট)", en: "Mental health specialist (psychiatrist)", coversBn: "দীর্ঘদিন মন খারাপ, দুশ্চিন্তা, ঘুমের সমস্যা বা মনের চাপ।", coversEn: "Long-lasting low mood, worry, sleep problems or stress.",
    keywords: ["মন খারাপ", "দুশ্চিন্তা", "ঘুম হয় না", "ঘুমের সমস্যা", "উদ্বেগ", "হতাশ", "depress", "anxiety", "stress", "can't sleep", "insomnia", "panic"] },
  { id: "neurology", bn: "স্নায়ুরোগ বিশেষজ্ঞ", en: "Neurologist (brain & nerves)", coversBn: "বারবার মাথাব্যথা, ঝিনঝিন বা অবশ ভাব, হাত-পা কাঁপা। (হঠাৎ মুখ বেঁকে গেলে বা কথা জড়ালে এখনই ৯৯৯।)", coversEn: "Repeated headaches, tingling or numbness, tremor. (Sudden face drooping or slurred speech: call 999 now.)",
    keywords: ["মাথাব্যথা", "মাথা ব্যথা", "ঝিনঝিন", "অবশ ভাব", "হাত কাঁপা", "headache", "migraine", "numb", "tingling", "tremor", "matha betha"] },
  { id: "gastro", bn: "পরিপাকতন্ত্র (গ্যাস্ট্রো) বিশেষজ্ঞ", en: "Gastroenterologist (stomach & liver)", coversBn: "পেটব্যথা, গ্যাস, বুক জ্বালা, পাতলা পায়খানা বা কোষ্ঠকাঠিন্য, লিভারের সমস্যা।", coversEn: "Stomach pain, gas, heartburn, diarrhoea or constipation, liver problems.",
    keywords: ["পেট ব্যথা", "পেটব্যথা", "গ্যাস", "বুক জ্বালা", "পাতলা পায়খানা", "ডায়রিয়া", "কোষ্ঠ", "বমি", "জন্ডিস", "stomach", "gastric", "acidity", "heartburn", "diarrh", "constipat", "vomit", "jaundice", "pet betha"] },
  { id: "urology", bn: "ইউরোলজি (কিডনি ও প্রস্রাব) বিশেষজ্ঞ", en: "Urologist (kidney & urine)", coversBn: "প্রস্রাবে জ্বালা বা রক্ত, ঘন ঘন প্রস্রাব, কোমরের পাশে ব্যথা।", coversEn: "Burning or blood in urine, passing urine often, pain in the side.",
    keywords: ["প্রস্রাব", "প্রস্রাবে জ্বালা", "কিডনি", "urine", "urinat", "kidney", "prosrab"] },
  { id: "chest", bn: "বক্ষব্যাধি (ফুসফুস) বিশেষজ্ঞ", en: "Chest specialist (lungs)", coversBn: "দীর্ঘদিনের কাশি, হাঁপানি, কফে সমস্যা। (শ্বাস নিতে খুব কষ্ট হলে এখনই ৯৯৯।)", coversEn: "Long-lasting cough, asthma, phlegm. (Severe difficulty breathing: call 999 now.)",
    keywords: ["কাশি", "হাঁপানি", "কফ", "অ্যাজমা", "cough", "asthma", "phlegm", "wheez", "kashi"] },
  { id: "endocrine", bn: "এন্ডোক্রাইন (ডায়াবেটিস ও হরমোন) বিশেষজ্ঞ", en: "Endocrinologist (diabetes & hormones)", coversBn: "ডায়াবেটিস বা থাইরয়েডের নিয়মিত চিকিৎসা ও ফলোআপ।", coversEn: "Ongoing care and follow-up for diabetes or thyroid.",
    keywords: ["ডায়াবেটিস", "সুগার", "থাইরয়েড", "হরমোন", "diabetes", "sugar", "thyroid", "hormone"] },
];

export const SPECIALTY_IDS = SPECIALTIES.map((s) => s.id) as readonly SpecialtyId[];
export const specialtyById = (id: string): Specialty | undefined => SPECIALTIES.find((s) => s.id === id);

// ---------------------------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------------------------
export type AgeGroup = "adult" | "child" | "older" | "pregnant";

export interface RouteInput {
  text: string;
  ageGroup?: AgeGroup;
  ticked?: readonly string[];
  /** Body areas tapped on the body map (head, chest, belly, back, arms, legs, skin). */
  areas?: readonly string[];
}

export const BODY_AREAS = [
  { id: "head", bn: "মাথা ও মুখ", en: "Head & face", words: ["মাথা", "headache"] },
  { id: "chest", bn: "বুক", en: "Chest", words: ["বুক"] },
  { id: "belly", bn: "পেট", en: "Belly", words: ["পেট", "stomach"] },
  { id: "back", bn: "পিঠ ও কোমর", en: "Back & waist", words: ["পিঠে ব্যথা", "কোমর"] },
  { id: "arms", bn: "হাত", en: "Arms & hands", words: ["হাত", "joint"] },
  { id: "legs", bn: "পা ও হাঁটু", en: "Legs & knees", words: ["পা", "হাঁটু"] },
  { id: "skin", bn: "ত্বক", en: "Skin", words: ["ত্বক", "skin"] },
] as const;
export type BodyAreaId = (typeof BODY_AREAS)[number]["id"];

export interface RouteResult {
  emergency: boolean;
  redFlags: RedFlag[];
  specialty: Specialty | null;
  /** Other kinds of doctor that also matched, best first. */
  alternatives: Specialty[];
  matched: string[];
}

/**
 * Red flags first; otherwise the specialty whose words match most (longer words weigh more). Children go to a child
 * specialist and pregnancy to a gynaecologist unless a clearer match exists for the same body part; with no match,
 * general medicine (or the child specialist for a child).
 */
export function routeSymptoms(input: RouteInput): RouteResult {
  const red = findRedFlags(input.text, input.ticked ?? []);
  if (red.length) return { emergency: true, redFlags: red, specialty: null, alternatives: [], matched: [] };
  const t = norm([input.text, ...(input.areas ?? []).map((a) => BODY_AREAS.find((b) => b.id === a)?.words.join(" ") ?? "")].join(" "));
  const scored = SPECIALTIES.map((s) => {
    const hits = has(t, s.keywords);
    return { s, hits, score: hits.reduce((n, w) => n + (w.length >= 5 ? 2 : 1), 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const matched = [...new Set(scored.flatMap((x) => x.hits))];
  const age = input.ageGroup ?? "adult";
  let first = scored[0]?.s ?? null;
  if (age === "child") first = specialtyById("paediatrics")!;
  else if (age === "pregnant" && (!first || ["medicine", "gastro", "urology"].includes(first.id))) first = specialtyById("gynaecology")!;
  if (!first) first = specialtyById("medicine")!;
  const alternatives = scored.map((x) => x.s).filter((s) => s.id !== first!.id).slice(0, 2);
  return { emergency: false, redFlags: [], specialty: first, alternatives, matched };
}

// ---------------------------------------------------------------------------------------------
// What to tell the doctor — an organised note the person copies (they wrote every fact in it)
// ---------------------------------------------------------------------------------------------
export interface DoctorNoteInput {
  text: string;
  since?: string; // e.g. "৩ দিন" — the person's own words
  ageGroup?: AgeGroup;
  areas?: readonly string[];
  medicinesTaking?: string; // as the person wrote it; never interpreted
  allergies?: string;
}

const AGE_BN: Record<AgeGroup, string> = { adult: "প্রাপ্তবয়স্ক", child: "শিশু", older: "বয়স্ক", pregnant: "গর্ভবতী" };
const AGE_EN: Record<AgeGroup, string> = { adult: "Adult", child: "Child", older: "Older adult", pregnant: "Pregnant" };

export function doctorNote(n: DoctorNoteInput, specialty: Specialty | null, lang: "bn" | "en" = "bn"): string {
  const bn = lang === "bn";
  const area = (n.areas ?? []).map((a) => BODY_AREAS.find((b) => b.id === a)).filter(Boolean).map((b) => (bn ? b!.bn : b!.en));
  const lines = [
    bn ? "ডাক্তারকে বলার জন্য নোট (নিজের লেখা)" : "Note for the doctor (in my own words)",
    `${bn ? "কে" : "Who"}: ${bn ? AGE_BN[n.ageGroup ?? "adult"] : AGE_EN[n.ageGroup ?? "adult"]}`,
    `${bn ? "সমস্যা" : "Problem"}: ${n.text.trim().slice(0, 600) || (bn ? "লেখা হয়নি" : "not written")}`,
    area.length ? `${bn ? "শরীরের কোথায়" : "Where in the body"}: ${area.join(", ")}` : "",
    `${bn ? "কতদিন ধরে" : "Since when"}: ${n.since?.trim() || (bn ? "লেখা হয়নি" : "not written")}`,
    `${bn ? "এখন যে ওষুধ খাচ্ছি" : "Medicines I take now"}: ${n.medicinesTaking?.trim() || (bn ? "লেখা হয়নি" : "not written")}`,
    `${bn ? "অ্যালার্জি" : "Allergies"}: ${n.allergies?.trim() || (bn ? "লেখা হয়নি" : "not written")}`,
    specialty ? `${bn ? "যে ধরনের ডাক্তার দেখাতে চাই" : "Kind of doctor I plan to see"}: ${bn ? specialty.bn : specialty.en}` : "",
    "",
    bn ? "জিজ্ঞাসা করব: কী কারণে হতে পারে? কোন পরীক্ষা লাগবে? কখন আবার দেখাব? কোন লক্ষণ দেখলে সঙ্গে সঙ্গে হাসপাতালে যাব?" : "I will ask: what could be causing it? Which tests are needed? When should I come back? Which signs mean I should go to hospital at once?",
  ];
  return lines.filter((l) => l !== "").join("\n");
}

// ---------------------------------------------------------------------------------------------
// Plain-language medical terms (each with an NHS page; general information only)
// ---------------------------------------------------------------------------------------------
export interface MedicalTerm { id: string; names: readonly string[]; bn: string; en: string; source: HealthSource }

export const MEDICAL_TERMS: readonly MedicalTerm[] = [
  { id: "ecg", names: ["ecg", "ইসিজি", "ekg", "electrocardiogram"], bn: "ইসিজি: বুকে ছোট স্টিকার লাগিয়ে হৃদযন্ত্রের ছন্দ আর বৈদ্যুতিক সংকেত রেকর্ড করার সহজ পরীক্ষা। ব্যথা হয় না।", en: "ECG: a simple test that records the heart's rhythm and electrical activity through small stickers on the chest. It doesn't hurt.", source: src("NHS — Electrocardiogram (ECG)", "https://www.nhs.uk/tests-and-treatments/electrocardiogram/") },
  { id: "blood_test", names: ["blood test", "রক্ত পরীক্ষা", "cbc", "সিবিসি"], bn: "রক্ত পরীক্ষা: হাতের শিরা থেকে অল্প রক্ত নিয়ে শরীরের অবস্থা দেখা হয়। কোন পরীক্ষা লাগবে তা ডাক্তার ঠিক করেন।", en: "Blood test: a small sample of blood is taken from a vein to check how the body is doing. The doctor decides which tests are needed.", source: src("NHS — Blood tests", "https://www.nhs.uk/tests-and-treatments/blood-tests/") },
  { id: "xray", names: ["x-ray", "xray", "এক্স-রে", "এক্সরে"], bn: "এক্স-রে: অল্প মাত্রার রশ্মি দিয়ে শরীরের ভেতরের ছবি, বিশেষ করে হাড় ও বুকের।", en: "X-ray: a picture of the inside of the body, especially bones and chest, made with a small dose of radiation.", source: src("NHS — X-ray", "https://www.nhs.uk/tests-and-treatments/x-ray/") },
  { id: "ultrasound", names: ["ultrasound", "আল্ট্রাসাউন্ড", "আল্ট্রাসনো", "usg"], bn: "আল্ট্রাসাউন্ড: শব্দতরঙ্গ দিয়ে শরীরের ভেতরের ছবি; গর্ভাবস্থাতেও ব্যবহার হয়।", en: "Ultrasound: pictures of the inside of the body made with sound waves; also used in pregnancy.", source: src("NHS — Ultrasound scan", "https://www.nhs.uk/tests-and-treatments/ultrasound-scan/") },
  { id: "ct", names: ["ct scan", "সিটি স্ক্যান", "ct"], bn: "সিটি স্ক্যান: এক্স-রে ব্যবহার করে শরীরের ভেতরের বিস্তারিত ছবি।", en: "CT scan: detailed pictures of the inside of the body made with X-rays.", source: src("NHS — CT scan", "https://www.nhs.uk/tests-and-treatments/ct-scan/") },
  { id: "mri", names: ["mri", "এমআরআই"], bn: "এমআরআই: শক্তিশালী চুম্বক ও রেডিও তরঙ্গ দিয়ে শরীরের ভেতরের বিস্তারিত ছবি।", en: "MRI: detailed pictures of the inside of the body made with strong magnets and radio waves.", source: src("NHS — MRI scan", "https://www.nhs.uk/tests-and-treatments/mri-scan/") },
  { id: "bp", names: ["blood pressure", "bp", "রক্তচাপ", "প্রেশার"], bn: "রক্তচাপ (প্রেশার): রক্ত ধমনীর দেয়ালে কতটা চাপ দেয় তার মাপ; দুটি সংখ্যায় লেখা হয়। আপনার জন্য কোন মাপ ঠিক, তা ডাক্তার বলবেন।", en: "Blood pressure: how hard blood pushes on the artery walls, written as two numbers. Your doctor will tell you what is right for you.", source: src("NHS — High blood pressure", "https://www.nhs.uk/conditions/high-blood-pressure/") },
];

export function findTerm(q: string): MedicalTerm | null {
  const t = norm(q);
  if (!t) return null;
  return MEDICAL_TERMS.find((m) => m.names.some((n) => t === norm(n) || t.includes(norm(n)))) ?? null;
}
