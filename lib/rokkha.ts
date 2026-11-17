/*
 * Rokkha (রক্ষা) domain logic. NO imports — pure, deterministic and unit-tested (tests/rokkha.test.ts).
 *
 * - checkMessage: rule-based scam-signal finder for Bangla, English and Banglish SMS, WhatsApp and call
 *   scripts. It quotes the exact text it matched. Finding nothing never means "safe".
 * - inspectLinks: explains link tricks (shorteners, number addresses, xn--, @, fake brand names). Never "safe".
 * - Call guard and Family Guardian: pause text, Bangladesh mobile-number checks and a zero-PII sms: alert.
 *   The ideas follow the BhashaShield design; a web page cannot see calls or SMS, so the user opens them.
 * - transferCheck: a cooling-off checklist before sending money. The pause length is a design choice
 *   (see PAUSE RULE below), not a statistic.
 * - incidentReport: plain-text report for an MFS helpline call and a police General Diary (GD).
 */

export interface Span {
  start: number;
  end: number;
  /** Exact text from the (NFC-normalised) input. */
  quote: string;
}

export interface SignalHit {
  id: SignalId;
  labelBn: string;
  labelEn: string;
  /** First matched span, quoted exactly. */
  quote: string;
  spans: Span[];
  whyBn: string;
  whyEn: string;
}

export interface MessageCheck {
  /** The NFC-normalised text that span offsets refer to. */
  text: string;
  hits: SignalHit[];
  summaryBn: string;
  summaryEn: string;
}

export type SignalId =
  | "otp_pin"
  | "mfs_refund"
  | "mfs_agent"
  | "lottery_prize"
  | "advance_fee"
  | "investment_task"
  | "impersonation"
  | "relative_trouble"
  | "suspicious_link"
  | "remote_access"
  | "pressure_secrecy"
  | "fine_bill";

interface Rule {
  id: SignalId;
  labelBn: string;
  labelEn: string;
  whyBn: string;
  whyEn: string;
  patterns: RegExp[];
}

// Bangla has no \b word boundary in JS regex, so Bangla alternatives are plain substrings.
const RULES: Rule[] = [
  {
    id: "otp_pin",
    labelBn: "ওটিপি / পিন / কোড চাওয়া",
    labelEn: "Asks for OTP, PIN or a code",
    whyBn: "ব্যাংক, বিকাশ, নগদ বা কোনো অফিস কখনো ওটিপি বা পিন চায় না। কোড দিলেই অ্যাকাউন্ট খালি হতে পারে।",
    whyEn: "Banks, bKash, Nagad and offices never ask for your OTP or PIN. Sharing it can empty your account.",
    patterns: [
      /\b(OTP|PIN|one[- ]time (?:password|code)|verification code|security code)\b/gi,
      /(ওটিপি|পিন নম্বর|পিন কোড|পিনটি|গোপন (?:নম্বর|কোড|পিন)|ভেরিফিকেশন কোড|কোডটি (?:দিন|বলুন|পাঠান)|কোড (?:দিন|বলুন|পাঠান))/g,
    ],
  },
  {
    id: "mfs_refund",
    labelBn: "\"ভুলে টাকা পাঠিয়েছি, ফেরত দিন\"",
    labelEn: "\"Sent by mistake, please return\"",
    whyBn: "ভুয়া এসএমএস দেখিয়ে টাকা ফেরত চাওয়া পরিচিত প্রতারণা। ব্যালেন্স নিজে দেখুন; সত্যিকারের ভুল লেনদেন হেল্পলাইন দিয়ে মেটান।",
    whyEn: "A fake 'money received' SMS followed by a refund request is a known trick. Check your real balance; settle real mistakes through the helpline.",
    patterns: [
      /\b(wrong(?:ly)? (?:sent|send|number|transaction)|sent (?:it )?by mistake|by mistake|return (?:the|my) money|send (?:it )?back|refund)\b/gi,
      /(ভুলে[^।\n]{0,40}(?:পাঠিয়ে|চলে গেছে|গেছে)|ভুল (?:নম্বরে|নাম্বারে|করে)|ভুলক্রমে|ফেরত (?:দিন|দেন|পাঠান|দিবেন))/g,
    ],
  },
  {
    id: "mfs_agent",
    labelBn: "বিকাশ/নগদ \"এজেন্ট\" বা \"অফিস\" পরিচয়",
    labelEn: "Claims to be a bKash/Nagad agent or office",
    whyBn: "প্রতারকেরা প্রায়ই এজেন্ট বা কাস্টমার কেয়ার সেজে ফোন করে। বিকাশ ১৬২৪৭ ও নগদ ১৬১৬৭ ছাড়া অন্য নম্বরকে বিশ্বাস করবেন না।",
    whyEn: "Scammers often pose as an agent or customer care. Trust only bKash 16247 and Nagad 16167.",
    patterns: [
      /\b(bkash|nagad|rocket|upay)\b[^.\n]{0,30}\b(agent|office|customer care|head ?office|officer)\b/gi,
      /(বিকাশ|নগদ|রকেট|উপায়)[^।\n]{0,30}(এজেন্ট|অফিস|কাস্টমার কেয়ার|হেড ?অফিস|কর্মকর্তা)/g,
    ],
  },
  {
    id: "lottery_prize",
    labelBn: "লটারি / পুরস্কার / উপহার",
    labelEn: "Lottery, prize or gift",
    whyBn: "যে লটারিতে আপনি অংশ নেননি, তার পুরস্কার হয় না। \"ফি দিয়ে পুরস্কার নিন\" মানেই প্রতারণার ঝুঁকি।",
    whyEn: "You cannot win a lottery you never entered. Paying a fee to claim a prize is a classic scam.",
    patterns: [
      /\b(lottery|jackpot|you (?:have )?won|winner|congratulations|lucky draw|prize|cash ?back offer)\b/gi,
      /(লটারি|পুরস্কার|জিতেছেন|বিজয়ী|লাকি ড্র|অভিনন্দন|উপহার পেয়েছেন)/g,
    ],
  },
  {
    id: "advance_fee",
    labelBn: "চাকরি / ভিসার জন্য অগ্রিম টাকা",
    labelEn: "Upfront fee for a job or visa",
    whyBn: "আগে টাকা জমা দিলে চাকরি বা ভিসা — এমন প্রস্তাবে টাকা দিয়ে প্রায়ই আর কিছু পাওয়া যায় না। নিয়োগকর্তা ও রিক্রুটিং এজেন্সি নিজে যাচাই করুন।",
    whyEn: "Pay-first job or visa offers often deliver nothing. Verify the employer or recruiting agency yourself.",
    patterns: [
      /\b(job|visa|work permit|employment|interview)\b[^.\n]{0,60}\b(fee|deposit|processing (?:fee|charge)|registration (?:fee|charge)|advance|pay)\b/gi,
      /(চাকরি|চাকুরি|ভিসা|ওয়ার্ক পারমিট|বিদেশ|নিয়োগ)[^।\n]{0,60}(ফি|জমা|প্রসেসিং|রেজিস্ট্রেশন|অগ্রিম|টাকা দিন|টাকা পাঠান)/g,
    ],
  },
  {
    id: "investment_task",
    labelBn: "টাকা দ্বিগুণ / \"টাস্ক\" করে আয় / বিনিয়োগ",
    labelEn: "Money doubling, 'task' earning or investment",
    whyBn: "নিশ্চিত লাভ বা প্রতিদিন আয়ের প্রতিশ্রুতি দিয়ে প্রথমে অল্প লাভ দেখায়, পরে বড় অঙ্ক নিয়ে উধাও হয়।",
    whyEn: "Promises of guaranteed or daily profit show small early payouts, then disappear with a large deposit.",
    patterns: [
      /\b(double your money|guaranteed (?:profit|return|income)|daily (?:profit|income|earning)|high return|crypto|usdt|binary trading|(?:online )?task[^.\n]{0,20}(?:commission|earn|income|profit))\b/gi,
      /(দ্বিগুণ|ডাবল|নিশ্চিত লাভ|প্রতিদিন[^।\n]{0,12}(?:আয়|লাভ|ইনকাম)|টাস্ক[^।\n]{0,20}(?:কমিশন|আয়|ইনকাম)|লাইক দিয়ে আয়|ক্রিপ্টো|বিনিয়োগ[^।\n]{0,20}লাভ)/g,
    ],
  },
  {
    id: "impersonation",
    labelBn: "পুলিশ / ব্যাংক / সরকারি পরিচয়",
    labelEn: "Claims police, bank or government authority",
    whyBn: "পরিচয় যাচাই না করে কথা মানবেন না। ফোন কেটে অফিসের অফিসিয়াল নম্বরে নিজে ফোন করুন। পুলিশ বা ব্যাংক ফোনে টাকা চায় না।",
    whyEn: "Do not act on a claimed identity. Hang up and call the office's official number yourself. Police and banks do not ask for money by phone.",
    patterns: [
      /\b(police|magistrate|court|customs|bangladesh bank|central bank|from (?:the|your) bank|tax office|NBR|RAB)\b/gi,
      /(পুলিশ|থানা থেকে|ডিবি অফিস|র‍্যাব|ম্যাজিস্ট্রেট|আদালত|কাস্টমস|বাংলাদেশ ব্যাংক|ব্যাংক থেকে বলছি|কর অফিস|সরকারি অফিস থেকে)/g,
    ],
  },
  {
    id: "relative_trouble",
    labelBn: "আত্মীয় বিপদে — জরুরি টাকা",
    labelEn: "Relative in trouble — urgent money",
    whyBn: "\"আপনার ছেলে দুর্ঘটনায়/থানায়\" বলে ভয় দেখিয়ে টাকা চাওয়া হয়। টাকা পাঠানোর আগে সেই আত্মীয়কে তাঁর পুরোনো নম্বরে ফোন করুন।",
    whyEn: "Fear ('your son had an accident / was arrested') is used to rush you. Call that relative on the number you already had first.",
    patterns: [
      /\b(your (?:son|daughter|brother|sister|husband|wife|mother|father)|accident|arrested|in hospital|hospitali[sz]ed)\b/gi,
      /(আপনার (?:ছেলে|মেয়ে|ভাই|বোন|স্বামী|স্ত্রী|বাবা|মা)|দুর্ঘটনা|হাসপাতালে|গ্রেফতার|গ্রেপ্তার|বিপদে আছে)/g,
    ],
  },
  {
    id: "suspicious_link",
    labelBn: "লিংক / ছোট করা লিংক",
    labelEn: "Link or shortened link",
    whyBn: "অচেনা লিংক নকল ওয়েবসাইটে নিয়ে পিন-পাসওয়ার্ড চুরি করতে পারে; ছোট করা লিংকে আসল ঠিকানা লুকানো থাকে। লিংকে না ঢুকে অফিসিয়াল অ্যাপ বা ওয়েবসাইট নিজে খুলুন।",
    whyEn: "Unknown links can lead to fake sites that steal PINs and passwords; shortened links hide the real address. Open the official app or site yourself instead.",
    patterns: [
      /\b(?:https?:\/\/|www\.)[^\s]+/gi,
      /\b(?:bit\.ly|tinyurl\.com|t\.me|wa\.me|goo\.gl|is\.gd|cutt\.ly|rb\.gy|ow\.ly|shorturl\.at)\/[^\s]*/gi,
    ],
  },
  {
    id: "remote_access",
    labelBn: "অ্যাপ ইনস্টল / স্ক্রিন শেয়ার করতে বলা",
    labelEn: "Asks you to install an app or share your screen",
    whyBn: "AnyDesk, TeamViewer বা অচেনা APK দিলে অন্য কেউ আপনার ফোন চালাতে ও ওটিপি দেখতে পারে।",
    whyEn: "AnyDesk, TeamViewer or an unknown APK lets someone else control your phone and read your OTPs.",
    patterns: [
      /\b(any ?desk|team ?viewer|rust ?desk|quick ?support|screen ?shar(?:e|ing)|install (?:this|the|an?)? ?app|\.apk|apk file)\b/gi,
      /(এনিডেস্ক|টিমভিউয়ার|স্ক্রিন শেয়ার|অ্যাপ(?:টি)? (?:ইনস্টল|ডাউনলোড) (?:করুন|করেন|দিন))/g,
    ],
  },
  {
    id: "pressure_secrecy",
    labelBn: "তাড়াহুড়া বা গোপন রাখতে চাপ",
    labelEn: "Pressure to hurry or keep it secret",
    whyBn: "\"এখনই\", \"কাউকে বলবেন না\" — ভাবার সময় না দেওয়াই প্রতারণার কৌশল। একটু থামুন, কাউকে জানান।",
    whyEn: "'Right now' and 'tell no one' are there to stop you thinking. Pause and tell someone.",
    patterns: [
      /\b(urgent(?:ly)?|immediately|right now|within (?:\d+|one|two|24) (?:minutes?|hours?)|don'?t tell (?:anyone|anybody)|keep (?:it|this) secret|last chance|account (?:will be )?(?:blocked|closed|suspended))\b/gi,
      /(এখনই|জরুরি ভিত্তিতে|তাড়াতাড়ি|কাউকে (?:বলবেন|জানাবেন) না|গোপন রাখুন|অ্যাকাউন্ট (?:বন্ধ|ব্লক) (?:হয়ে যাবে|হবে|করা হবে)|[০-৯\d]+ (?:মিনিটের|ঘণ্টার) মধ্যে)/g,
    ],
  },
  {
    id: "fine_bill",
    labelBn: "জরিমানা / বিল / পার্সেলের নামে টাকা",
    labelEn: "Pay a fine, bill or parcel fee",
    whyBn: "ট্রাফিক জরিমানা, বিদ্যুৎ বিল বা আটকে থাকা পার্সেলের কথা বলে লিংকে টাকা চাওয়া প্রতারণার পরিচিত কৌশল। এসএমএসের লিংকে টাকা দেবেন না; অফিসিয়াল অ্যাপ বা ওয়েবসাইট নিজে খুলে বকেয়া যাচাই করুন।",
    whyEn: "Messages about a traffic fine, a power bill or a held parcel that ask you to pay through a link are a known trick. Never pay through the SMS link; open the official app or website yourself to check what you owe.",
    patterns: [
      /\b(?:traffic\s+(?:fine|violation|case|challan)|e-?challan|unpaid\s+(?:fine|toll|bill)|(?:electricity|electric|gas|water)\s+(?:bill|connection|line)[^.\n]{0,40}\b(?:due|overdue|disconnect(?:ed|ion)?|cut)|parcel[^.\n]{0,40}\b(?:held|on hold|customs|delivery (?:fee|charge)))\b/gi,
      /(ট্রাফিক[^।\n]{0,10}(?:জরিমানা|মামলা)|জরিমানা[^।\n]{0,20}(?:পরিশোধ|দিন|জমা)|বিদ্যুৎ[^।\n]{0,30}(?:বিচ্ছিন্ন|কেটে দেওয়া|লাইন কাটা)|পার্সেল[^।\n]{0,30}(?:আটকে|কাস্টমস|ডেলিভারি চার্জ))/g,
    ],
  },
];

/*
 * Banglish: Bangla typed in English letters ("apnar account block hoye jabe, otp ta din").
 * Many scam texts are written this way. Each entry adds one pattern to the rule with the same id.
 * Spellings vary, so common variants are listed (v/bh, o/u). A match is a sign, never proof.
 */
const BANGLISH: Partial<Record<SignalId, RegExp>> = {
  otp_pin: /\b(?:(?:otp|pin|code|kod)\s*(?:ta|ti|number|nombor|nambar)?\s*(?:din|den|dao|diye\s+din|bolun|bolen|bolo|pathan|pathen|pathao|share\s+korun)|gopon\s+(?:code|number|nombor|pin))\b/gi,
  mfs_refund: /\b(?:(?:v|bh)ule|(?:v|bh)ul\s*kore|(?:v|bh)ul\s+(?:number|nambar|nombor)e?|(?:taka\s+)?ferot\s+(?:din|den|dao|diben|deben|pathan|pathen))\b/gi,
  mfs_agent: /\b(?:bkash|bikash|nagad|rocket|upay)\b[^.\n]{0,30}\btheke\s+(?:bolchi|bolsi|call\s+korchi)\b/gi,
  lottery_prize: /\b(?:lotari|puroskar|puraskar|jitechen|jitesen|bijoyi|obhinondon|abhinandan|gift\s+peyechen)\b/gi,
  advance_fee: /\b(?:chakri|chakuri|job|visa|bidesh)\b[^.\n]{0,60}\b(?:fee|joma|advance|agrim|registration|processing|taka\s+(?:din|den|pathan|pathen|lagbe))\b/gi,
  investment_task: /\b(?:taka\s+(?:double|dwigun|digun)|(?:double|dwigun|digun)\s+(?:hobe|korun|kore\s+din)|protidin\s+(?:\S+\s+){0,2}(?:aay|ay|income|inkam|lav|labh)|task\s+kore\s+(?:\S+\s+){0,2}(?:aay|ay|income|inkam)|nischit\s+(?:lav|labh|profit))\b/gi,
  impersonation: /\b(?:police|pulish|thana|db\s+office|rab|court|adalot|bangladesh\s+bank|bank)\s+(?:theke|thake)\s+(?:bolchi|bolsi|call\s+korchi)\b/gi,
  relative_trouble: /\b(?:apnar\s+(?:chele|meye|bhai|vai|bon|swami|shami|stri|bou|baba|abba|ma|amma)|durghotona|durghatona|griftar|greftar|hospital(?:e)?\s+(?:vorti|bhorti)|bipode)\b/gi,
  remote_access: /\b(?:(?:app|apk)\s*(?:ta|ti)?\s+(?:install|download)\s+(?:korun|koren|den|dao|kore\s+nin)|screen\s+share\s+(?:korun|koren|den))\b/gi,
  pressure_secrecy: /\b(?:ekhoni|ekhuni|akhoni|akhuni|taratari|(?:kauke|karo\s*ke)\s+(?:bolben|janaben)\s*na|gopon\s+rakh(?:un|en|ben)|account\s+(?:bondho|bondo|block)\s+(?:hoye\s+jabe|hobe|kora\s+hobe)|\d+\s+(?:minute|minit|ghonta|ghontar)\s+(?:er\s+)?(?:moddhe|modhe))\b/gi,
  fine_bill: /\b(?:jorimana|(?:bidyut|biddut|current)\s+(?:line\s+)?(?:kete|bichchinno)|line\s+kete\s+(?:dewa|deya|deoa)\s+hobe)\b/gi,
};

export const NO_HIT_BN = "পরিচিত কোনো প্রতারণার লক্ষণ পাওয়া যায়নি — এর মানে এই নয় যে বার্তাটি নিরাপদ। সন্দেহ হলে অফিসিয়াল নম্বরে নিজে ফোন করে যাচাই করুন।";
export const NO_HIT_EN = "No known signs found — this does NOT mean it is safe. If in doubt, call the official number yourself to check.";

export const MAX_MESSAGE_CHARS = 5000;

export function checkMessage(input: string): MessageCheck {
  const text = String(input ?? "").normalize("NFC").slice(0, MAX_MESSAGE_CHARS);
  const hits: SignalHit[] = [];
  for (const rule of RULES) {
    const spans: Span[] = [];
    const banglish = BANGLISH[rule.id];
    for (const pattern of banglish ? [...rule.patterns, banglish] : rule.patterns) {
      const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        const quote = m[0].replace(/[\s.,;:!?)\]।]+$/u, "");
        if (!quote) continue;
        if (!spans.some((s) => s.start === m!.index)) spans.push({ start: m.index, end: m.index + quote.length, quote });
        if (spans.length >= 5) break;
      }
    }
    if (spans.length) {
      spans.sort((a, b) => a.start - b.start);
      hits.push({ id: rule.id, labelBn: rule.labelBn, labelEn: rule.labelEn, quote: spans[0].quote, spans, whyBn: rule.whyBn, whyEn: rule.whyEn });
    }
  }
  const n = hits.length;
  return {
    text,
    hits,
    summaryBn: n ? `${toBnDigits(n)}টি প্রতারণার লক্ষণ পাওয়া গেছে। টাকা, ওটিপি বা পিন দেবেন না; অফিসিয়াল নম্বরে নিজে ফোন করে যাচাই করুন।` : NO_HIT_BN,
    summaryEn: n ? `${n} scam sign${n === 1 ? "" : "s"} found. Do not send money, OTP or PIN; call the official number yourself to check.` : NO_HIT_EN,
  };
}

/** Non-overlapping highlight segments for rendering the checked text. */
export function highlightSegments(check: MessageCheck): Array<{ text: string; ids: SignalId[] }> {
  const marks = check.hits.flatMap((h) => h.spans.map((s) => ({ ...s, id: h.id }))).sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Array<{ text: string; ids: SignalId[] }> = [];
  let pos = 0;
  for (const m of marks) {
    if (m.end <= pos) {
      const last = out[out.length - 1];
      if (last && last.ids.length && !last.ids.includes(m.id)) last.ids.push(m.id);
      continue;
    }
    const start = Math.max(m.start, pos);
    if (start > pos) out.push({ text: check.text.slice(pos, start), ids: [] });
    out.push({ text: check.text.slice(start, m.end), ids: [m.id] });
    pos = m.end;
  }
  if (pos < check.text.length) out.push({ text: check.text.slice(pos), ids: [] });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Link inspector. Reads each address in the text and explains what about it is risky.
// It never calls a link safe: even a real official address can be copied into a scam message.
// ---------------------------------------------------------------------------------------------

export type LinkFlag = "shortener" | "ip_address" | "lookalike_letters" | "brand_lookalike" | "hidden_destination" | "not_encrypted" | "app_download";

export interface LinkFinding {
  /** Exact text from the message. */
  url: string;
  host: string;
  flags: LinkFlag[];
  /** Brand whose name the address uses without being its official domain. */
  pretendsToBe?: string;
  /** Brand whose official domain this is (still not a promise that the message is real). */
  officialFor?: string;
}

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.me", "wa.me", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "ow.ly", "shorturl.at", "t.co", "tiny.cc", "s.id", "v.gd"];

/** Official domains checked on the brands' own sites (see lib/rokkhaData.ts sources). */
const BRANDS: Array<{ brand: string; domains: string[]; tokens: string[] }> = [
  { brand: "bKash", domains: ["bkash.com"], tokens: ["bkash", "bikash"] },
  { brand: "Nagad", domains: ["nagad.com.bd"], tokens: ["nagad"] },
  { brand: "Bangladesh Bank", domains: ["bb.org.bd"], tokens: ["bangladeshbank"] },
  { brand: "Government of Bangladesh", domains: ["gov.bd"], tokens: ["govbd"] },
];

const URL_RE = /\b(?:https?:\/\/[^\s<>"'(),]+|www\.[^\s<>"'(),]+|(?:[a-z0-9-]+\.)+(?:com|net|org|info|xyz|top|online|site|click|link|live|shop|app|io|me|cc|icu|buzz|club|bd|ly|gl|gd|at|co|id)(?:\/[^\s<>"'(),]*)?)/gi;

const isOfficial = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith("." + d));

export const LINK_FLAG_TEXT: Record<LinkFlag, { bn: string; en: string }> = {
  shortener: { bn: "ছোট করা লিংক — আসল ঠিকানা লুকানো।", en: "Shortened link — the real address is hidden." },
  ip_address: { bn: "নামের বদলে শুধু সংখ্যার ঠিকানা — বৈধ প্রতিষ্ঠান সাধারণত এমন লিংক পাঠায় না।", en: "A number instead of a name — real organisations rarely send links like this." },
  lookalike_letters: { bn: "অন্য ভাষার অক্ষর দিয়ে চেনা নামের মতো দেখানো হতে পারে (xn--)।", en: "May use letters from other alphabets to look like a familiar name (xn--)." },
  brand_lookalike: { bn: "নামটি ব্যবহার করছে, কিন্তু এটি তাদের অফিসিয়াল ঠিকানা নয়।", en: "Uses the name, but this is not their official address." },
  hidden_destination: { bn: "ঠিকানায় @ আছে — আসল গন্তব্য @-এর পরের অংশ।", en: "The address contains @ — the real destination is the part after it." },
  not_encrypted: { bn: "https নয় — তথ্য সুরক্ষিতভাবে যায় না। এখানে কিছু লিখবেন না।", en: "Not https — what you type is not protected. Do not enter anything here." },
  app_download: { bn: "লিংক থেকে অ্যাপ (APK) নামানো — অন্য কেউ আপনার ফোন চালাতে পারে।", en: "Downloads an app (APK) — it could let someone else control your phone." },
};

export function inspectLinks(input: string): LinkFinding[] {
  const text = String(input ?? "").normalize("NFC").slice(0, MAX_MESSAGE_CHARS);
  const out: LinkFinding[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?)\]।]+$/u, "");
    if (!url || out.some((o) => o.url === url)) continue;
    let rest = url.replace(/^https?:\/\//i, "");
    const authority = rest.split(/[/?#]/)[0];
    const flags: LinkFlag[] = [];
    if (authority.includes("@")) flags.push("hidden_destination");
    const host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d+$/, "").replace(/\.$/, "").toLowerCase();
    rest = rest.slice(authority.length);
    if (!host.includes(".")) continue;
    if (SHORTENERS.some((s) => host === s || host.endsWith("." + s))) flags.push("shortener");
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) flags.push("ip_address");
    if (host.split(".").some((label) => label.startsWith("xn--"))) flags.push("lookalike_letters");
    if (/^http:\/\//i.test(url)) flags.push("not_encrypted");
    if (/\.apk(?:$|[?#])/i.test(rest)) flags.push("app_download");
    // Undo common digit swaps (bk4sh, n4gad) and drop dots/dashes before looking for a brand name.
    const flat = host.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/[^a-z]/g, "");
    let pretendsToBe: string | undefined;
    let officialFor: string | undefined;
    for (const b of BRANDS) {
      if (isOfficial(host, b.domains)) { officialFor = b.brand; break; }
      if (b.tokens.some((t) => flat.includes(t))) { pretendsToBe = b.brand; flags.push("brand_lookalike"); break; }
    }
    out.push({ url, host, flags, ...(pretendsToBe ? { pretendsToBe } : {}), ...(officialFor ? { officialFor } : {}) });
    if (out.length >= 10) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Call guard and Family Guardian
// ---------------------------------------------------------------------------------------------

/** Cooling-off before "continue" in the call guard. A design choice (the BhashaShield design suggests
 * about 15 seconds to break the caller's urgency), not a measured value. */
export const CALL_GUARD_SECONDS = 15;

export const CALL_GUARD_POINTS: Array<{ bn: string; en: string }> = [
  { bn: "বিকাশ, নগদ, ব্যাংক বা পুলিশ কখনো ফোনে পিন বা ওটিপি চায় না।", en: "bKash, Nagad, banks and police never ask for your PIN or OTP on a call." },
  { bn: "ফোনে কথা বলতে বলতে কাউকে টাকা পাঠাবেন না।", en: "Do not send money while you are still on the call." },
  { bn: "কেউ অ্যাপ ইনস্টল বা স্ক্রিন শেয়ার করতে বললে করবেন না।", en: "Do not install an app or share your screen because a caller asked." },
  { bn: "ফোন কেটে দিন। তারপর অফিসিয়াল নম্বরে নিজে ফোন করে যাচাই করুন।", en: "Hang up. Then call the official number yourself to check." },
];

export interface Guardian { name: string; number: string }
export const MAX_GUARDIANS = 2;

/** Bangladesh mobile numbers: 01[3-9] plus 8 digits, with or without +88. Returns +8801XXXXXXXXX or null. */
export function normalizeBdMobile(raw: string): string | null {
  const digits = String(raw ?? "")
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/[\s\-().]/g, "")
    .replace(/^\+?88(?=01)/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? `+88${digits}` : null;
}

export function sanitizeGuardians(raw: unknown): Guardian[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Guardian[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    const number = typeof o.number === "string" ? normalizeBdMobile(o.number) : null;
    if (!number || out.some((x) => x.number === number)) continue;
    out.push({ name: typeof o.name === "string" ? clean(o.name, 40) : "", number });
    if (out.length >= MAX_GUARDIANS) break;
  }
  return out;
}

/** The alert names no amount, number or message text: it only asks the guardian to call. */
export const GUARDIAN_ALERT_BN = "রক্ষা সতর্কতা: কেউ ফোন বা মেসেজে আমার কাছে টাকা, ওটিপি বা পিন চাইছে। দয়া করে এখনই আমাকে ফোন করুন।";
export const GUARDIAN_ALERT_EN = "Rokkha alert: someone is asking me for money, an OTP or PIN by call or message. Please call me right now.";

/** Opens the phone's own SMS app with the alert filled in; the user still presses send. */
export function smsHref(numbers: string[], body: string): string {
  const to = numbers.map(normalizeBdMobile).filter((n): n is string => Boolean(n)).join(",");
  return `sms:${to}?body=${encodeURIComponent(body)}`;
}

// ---------------------------------------------------------------------------------------------
// Cooling-off check before a transfer
// ---------------------------------------------------------------------------------------------

export type Requester = "self" | "known_person" | "new_contact" | "official_claim" | "job_or_agent";
export type PayMethod = "bank" | "mfs_send" | "agent_cashout" | "gift_card" | "crypto" | "cash_handover" | "other";

export interface TransferInputs {
  amountTaka: number;
  requester: Requester;
  metInPerson: boolean;
  urgency: boolean;
  secrecy: boolean;
  method: PayMethod;
  viaNewNumber: boolean;
}

export interface TransferFlag {
  id: string;
  bn: string;
  en: string;
  minutes: number;
}

export interface TransferCheck {
  flags: TransferFlag[];
  pauseMinutes: number;
  level: "none" | "caution" | "high";
  stepsBn: string[];
  stepsEn: string[];
  ruleBn: string;
  ruleEn: string;
}

/*
 * PAUSE RULE (a design choice, not a statistic):
 *  - Each pressure flag adds minutes: secrecy 15, new number 15, urgency 10, not met in person 10,
 *    claims to be an official 15, job/agent asking for money 10, gift card / crypto 20,
 *    cash-out through an agent to someone else 10.
 *  - Amount adds 5 minutes at ৳10,000 and 10 at ৳50,000 or more, but only when at least one other flag is set.
 *  - The total is capped at 60 minutes. No flags → no pause.
 *  - Level: "high" at 3+ flags, or any flag combined with gift card/crypto or an "official" requester;
 *    otherwise "caution" when any flag is set.
 */
export const PAUSE_CAP_MINUTES = 60;
export const PAUSE_RULE_BN = "নিয়ম (আমাদের নকশা, পরিসংখ্যান নয়): প্রতিটি চাপের লক্ষণে কয়েক মিনিট যোগ হয় (গোপন রাখা ১৫, নতুন নম্বর ১৫, সরকারি পরিচয় ১৫, গিফট কার্ড/ক্রিপ্টো ২০, তাড়াহুড়া ১০, সামনাসামনি দেখা হয়নি ১০, চাকরি/এজেন্ট ১০, এজেন্ট ক্যাশ-আউট ১০); লক্ষণ থাকলে বড় অঙ্কে আরও ৫–১০; সর্বোচ্চ ৬০ মিনিট।";
export const PAUSE_RULE_EN = "Rule (our design choice, not a statistic): each pressure sign adds minutes (secrecy 15, new number 15, official claim 15, gift card/crypto 20, urgency 10, never met 10, job/agent 10, agent cash-out 10); large amounts add 5–10 when any sign is present; capped at 60 minutes.";

export function transferCheck(input: TransferInputs): TransferCheck {
  const amount = Number.isFinite(input.amountTaka) && input.amountTaka > 0 ? input.amountTaka : 0;
  const flags: TransferFlag[] = [];
  const add = (id: string, bn: string, en: string, minutes: number) => flags.push({ id, bn, en, minutes });

  if (input.secrecy) add("secrecy", "কাউকে না জানাতে বলেছে", "Told to keep it secret", 15);
  if (input.viaNewNumber) add("new_number", "অনুরোধ এসেছে নতুন/অচেনা নম্বর থেকে", "Request came from a new or unknown number", 15);
  if (input.urgency) add("urgency", "এখনই পাঠাতে চাপ দিচ্ছে", "Pressure to send right now", 10);
  if (input.requester !== "self" && !input.metInPerson) add("not_met", "যিনি চাইছেন তাঁর সঙ্গে কখনো সামনাসামনি দেখা হয়নি", "You have never met the person asking", 10);
  if (input.requester === "official_claim") add("official", "পুলিশ/ব্যাংক/অফিস পরিচয়ে টাকা চাইছে", "Someone claiming to be police, a bank or an office is asking for money", 15);
  if (input.requester === "job_or_agent") add("job_agent", "চাকরি, ভিসা বা এজেন্টের নামে অগ্রিম টাকা", "Upfront money for a job, visa or agent", 10);
  if (input.method === "gift_card" || input.method === "crypto") add("untraceable", input.method === "gift_card" ? "গিফট কার্ডে টাকা চাইছে — ফেরত পাওয়া প্রায় অসম্ভব" : "ক্রিপ্টোতে টাকা চাইছে — ফেরত পাওয়া প্রায় অসম্ভব", input.method === "gift_card" ? "Payment by gift card — almost impossible to get back" : "Payment by crypto — almost impossible to get back", 20);
  if (input.method === "agent_cashout" && input.requester !== "self") add("agent_cashout", "এজেন্ট দিয়ে অন্যের জন্য ক্যাশ-আউট", "Cash-out through an agent for someone else", 10);

  if (flags.length) {
    if (amount >= 50_000) add("large_amount", "বড় অঙ্ক (৳৫০,০০০ বা বেশি)", "Large amount (৳50,000 or more)", 10);
    else if (amount >= 10_000) add("medium_amount", "অঙ্ক ৳১০,০০০ বা বেশি", "Amount ৳10,000 or more", 5);
  }

  const pauseMinutes = Math.min(PAUSE_CAP_MINUTES, flags.reduce((n, f) => n + f.minutes, 0));
  const pressure = flags.filter((f) => f.id !== "large_amount" && f.id !== "medium_amount");
  const severe = flags.some((f) => f.id === "untraceable" || f.id === "official");
  const level: TransferCheck["level"] = pressure.length === 0 ? "none" : pressure.length >= 3 || severe ? "high" : "caution";

  const stepsBn = [
    "যিনি টাকা চাইছেন, তাঁকে আগে থেকে জানা নম্বরে নিজে ফোন করুন — যে নম্বর থেকে অনুরোধ এসেছে সেখানে নয়।",
    "একজন বিশ্বস্ত মানুষকে (পরিবার বা বন্ধু) বিষয়টি জানান, তারপর সিদ্ধান্ত নিন।",
    "কাউকে ওটিপি বা পিন বলবেন না — কোনো অবস্থাতেই।",
  ];
  const stepsEn = [
    "Call the person back on a number you already had — not the number the request came from.",
    "Tell one trusted person (family or a friend) before you decide.",
    "Never share your OTP or PIN with anyone.",
  ];
  if (input.requester === "official_claim") {
    stepsBn.push("ফোন কেটে অফিসের অফিসিয়াল নম্বরে (যেমন ৩৩৩ বা ৯৯৯) নিজে ফোন করে যাচাই করুন।");
    stepsEn.push("Hang up and verify through an official number yourself (for example 333 or 999).");
  }
  if (input.method === "gift_card" || input.method === "crypto") {
    stepsBn.push("সরকারি অফিস, পুলিশ বা ব্যাংক গিফট কার্ড বা ক্রিপ্টোতে টাকা নেয় না।");
    stepsEn.push("Government offices, police and banks do not take payment in gift cards or crypto.");
  }
  if (input.requester === "job_or_agent") {
    stepsBn.push("নিয়োগকর্তা বা রিক্রুটিং এজেন্সির নাম নিজে খুঁজে অফিসিয়ালভাবে যাচাই করুন।");
    stepsEn.push("Look up the employer or recruiting agency yourself and verify it officially.");
  }

  return { flags, pauseMinutes, level, stepsBn, stepsEn, ruleBn: PAUSE_RULE_BN, ruleEn: PAUSE_RULE_EN };
}

// ---------------------------------------------------------------------------------------------
// Incident report
// ---------------------------------------------------------------------------------------------

export interface IncidentFields {
  date?: string;
  time?: string;
  amountTaka?: number | null;
  method?: string;
  transactionId?: string;
  senderNumber?: string;
  receiverNumber?: string;
  yourName?: string;
  yourNumber?: string;
  /** Suspicious links from the message, one per line. */
  links?: string;
  whatHappened?: string;
}

export interface IncidentReport {
  helpline: string;
  gd: string;
}

const MISSING = "— (লিখুন)";

function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // Strip control characters except newline; keep the user's own text otherwise untouched.
  return v.normalize("NFC").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function formatTaka(n: number): string {
  const whole = Math.round(n);
  const s = String(Math.abs(whole));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `৳${whole < 0 ? "-" : ""}${rest ? rest + "," : ""}${last3}`;
}

export function incidentReport(f: IncidentFields): IncidentReport {
  const v = (x: unknown, max = 80) => clean(x, max) || MISSING;
  const amount = typeof f.amountTaka === "number" && Number.isFinite(f.amountTaka) && f.amountTaka > 0 ? formatTaka(f.amountTaka) : MISSING;
  const story = clean(f.whatHappened, 1500) || MISSING;
  const facts = [
    `তারিখ (Date): ${v(f.date, 20)}`,
    `সময় (Time): ${v(f.time, 20)}`,
    `টাকার পরিমাণ (Amount): ${amount}`,
    `মাধ্যম (Method): ${v(f.method, 40)}`,
    `লেনদেন আইডি (Transaction ID): ${v(f.transactionId, 40)}`,
    `যে নম্বর থেকে যোগাযোগ/টাকা চাওয়া হয়েছে (Sender number): ${v(f.senderNumber, 30)}`,
    `যে নম্বরে টাকা গেছে (Receiver number): ${v(f.receiverNumber, 30)}`,
    `সন্দেহজনক লিংক (Suspicious links): ${clean(f.links, 600).replace(/\n+/g, " , ") || MISSING}`,
  ];
  const me = [`নাম (Name): ${v(f.yourName, 60)}`, `আমার নম্বর (My number): ${v(f.yourNumber, 30)}`];

  const helpline = [
    "প্রতারণার অভিযোগ — হেল্পলাইনের জন্য",
    "Fraud report — for the MFS / bank helpline",
    "",
    ...me,
    ...facts,
    "",
    "কী ঘটেছে (What happened):",
    story,
    "",
    "অনুরোধ: লেনদেনটি যাচাই করুন এবং গ্রহণকারী অ্যাকাউন্টের বিষয়ে ব্যবস্থা নিন। অভিযোগ নম্বর দিন।",
    "Request: please investigate this transaction, act on the receiving account, and give me a complaint/reference number.",
  ].join("\n");

  const gd = [
    "বরাবর, ভারপ্রাপ্ত কর্মকর্তা, ____________ থানা",
    "বিষয়: প্রতারণার মাধ্যমে টাকা হারানোর বিষয়ে সাধারণ ডায়েরি (জিডি)",
    "Subject: General Diary (GD) about money lost to fraud",
    "",
    "জনাব,",
    "আমি নিচের ঘটনার বিষয়ে সাধারণ ডায়েরি করতে চাই।",
    "",
    ...me,
    ...facts,
    "",
    "ঘটনার বিবরণ (Details):",
    story,
    "",
    "সংযুক্তি: এসএমএস/কল লিস্টের স্ক্রিনশট, লেনদেনের রসিদ (যা আছে)।",
    "",
    "বিনীত,",
    clean(f.yourName, 60) || "____________",
  ].join("\n");

  return { helpline, gd };
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBnDigits(v: number | string): string {
  return String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}
