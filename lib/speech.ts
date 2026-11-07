// Probaho Coach: transparent, deterministic analysis of a spoken or typed answer.
// No imports, so it is unit-tested under `node --test`.
//
// What it measures and what it deliberately does not:
// - Content: which expected topics the answer covered (word-boundary matching with synonyms).
// - Structure: example given, conclusion, sentence length, repetition.
// - Delivery: filler words per 100 words, and pace only when real elapsed time is known.
// - It does NOT score pronunciation or accent. Browser speech-to-text is not reliable enough
//   for that, and accents are not errors.

export type Lang = "en" | "bn";

export interface Topic {
  id: string;
  label: string;
  terms: string[]; // any one of these counts as covering the topic
  followUp: string; // question to ask if the topic was missed
}

export interface Question {
  id: string;
  track: "technical" | "hr" | "academic" | "bangla";
  level: "beginner" | "intermediate" | "advanced";
  lang: Lang;
  prompt: string;
  targetSeconds: number;
  topics: Topic[];
  modelAnswer: string; // an example of a strong answer, shown after the attempt
}

export const QUESTIONS: Question[] = [
  {
    id: "tech-race",
    track: "technical",
    level: "advanced",
    lang: "en",
    prompt: "How do you prevent race conditions when a payment webhook updates a user's balance in PostgreSQL?",
    targetSeconds: 90,
    topics: [
      { id: "txn", label: "Database transaction", terms: ["transaction", "begin", "commit"], followUp: "Where exactly would the transaction begin and commit in your handler?" },
      { id: "lock", label: "Row locking or atomic update", terms: ["select for update", "row lock", "lock", "atomic update", "balance = balance +", "atomic"], followUp: "How would you stop two requests reading the same old balance at once?" },
      { id: "idem", label: "Idempotency for duplicate deliveries", terms: ["idempotent", "idempotency", "unique constraint", "dedupe", "deduplicate", "event id", "webhook id"], followUp: "The provider retries the same webhook three times. What stops you crediting it three times?" },
      { id: "verify", label: "Verifying the webhook signature", terms: ["signature", "hmac", "verify the webhook", "secret"], followUp: "How do you know the webhook really came from the payment provider?" },
    ],
    modelAnswer: "I wrap the update in a transaction and either lock the balance row with SELECT ... FOR UPDATE or use a single atomic UPDATE balance = balance + amount. Before applying it, I insert the provider's event ID into a table with a unique constraint, so a retried webhook fails the insert and is ignored. I also verify the webhook's HMAC signature first. For example, in a bKash sandbox project this stopped double credits when the provider retried. So: verify, deduplicate, then update atomically inside one transaction.",
  },
  {
    id: "tech-queue",
    track: "technical",
    level: "intermediate",
    lang: "en",
    prompt: "How would you design a background job queue that survives a server restart?",
    targetSeconds: 90,
    topics: [
      { id: "durable", label: "Durable storage of jobs", terms: ["durable", "persist", "persistent", "database", "redis", "rabbitmq", "broker"], followUp: "Where are the jobs stored while the server is down?" },
      { id: "ack", label: "Acknowledge only after success", terms: ["ack", "acks", "acknowledge", "acknowledges", "acknowledged", "acknowledgement", "visibility timeout"], followUp: "When does a worker tell the queue that a job is done?" },
      { id: "retry", label: "Retries with backoff", terms: ["retry", "retries", "backoff", "exponential"], followUp: "What happens when a job fails halfway?" },
      { id: "dlq", label: "Dead-letter queue", terms: ["dead letter", "dead-letter", "dlq", "poison"], followUp: "What do you do with a job that fails every time?" },
    ],
    modelAnswer: "I keep jobs in a durable broker or database table, not in memory. A worker acknowledges a job only after it finishes, so if the server restarts the job becomes visible again. Failed jobs are retried with exponential backoff, and after a few attempts they move to a dead-letter queue for a human to inspect. Jobs are idempotent so a retry is safe. For example, an email job records the message ID so a retry doesn't send twice.",
  },
  {
    id: "tech-react",
    track: "technical",
    level: "intermediate",
    lang: "en",
    prompt: "A React dashboard becomes slow over time. How do you find and fix the cause?",
    targetSeconds: 90,
    topics: [
      { id: "profile", label: "Measure first (profiler)", terms: ["profiler", "profiling", "devtools", "measure", "flamegraph", "performance tab"], followUp: "What tool would you open first, and what would you look for?" },
      { id: "memo", label: "Avoid unnecessary re-renders", terms: ["memo", "usememo", "usecallback", "re-render", "rerender", "react.memo"], followUp: "How do you stop a child re-rendering when its props didn't change?" },
      { id: "cleanup", label: "Clean up effects and subscriptions", terms: ["cleanup", "clean up", "unsubscribe", "removeeventlistener", "memory leak", "clearinterval"], followUp: "Why might the page get slower the longer it stays open?" },
      { id: "virtual", label: "Virtualise long lists", terms: ["virtualize", "virtualise", "virtualization", "windowing", "react-window", "pagination"], followUp: "The table has 10,000 rows. What would you change?" },
    ],
    modelAnswer: "I measure first with the React DevTools profiler and the browser performance tab to see which components re-render and how long they take. Then I memoise expensive values and callbacks so children don't re-render needlessly. Because it slows down over time, I check effects for missing cleanup, such as WebSocket subscriptions or intervals that are never cleared. For long tables I virtualise the list. Finally I measure again to confirm the fix.",
  },
  {
    id: "hr-intro",
    track: "hr",
    level: "beginner",
    lang: "en",
    prompt: "Tell me about yourself.",
    targetSeconds: 60,
    topics: [
      { id: "now", label: "Who you are now (role / study)", terms: ["i am", "i'm", "currently", "student", "studying", "work as", "working as", "developer", "engineer", "graduate"], followUp: "What do you do right now, in one sentence?" },
      { id: "proof", label: "One concrete achievement", terms: ["built", "led", "created", "won", "improved", "delivered", "launched", "project"], followUp: "What is one thing you built or achieved that you are proud of?" },
      { id: "why", label: "Why this role", terms: ["this role", "this position", "your company", "this job", "interested in", "excited", "apply"], followUp: "Why are you interested in this particular role?" },
    ],
    modelAnswer: "I'm a final-year CSE student at a university in Dhaka and I work part-time as a React developer. Last year I built a bKash-based fee collection app for my university club that 300 students now use. I enjoy turning messy processes into simple tools, which is why I'm excited about this role on your payments team.",
  },
  {
    id: "hr-weakness",
    track: "hr",
    level: "intermediate",
    lang: "en",
    prompt: "What is one weakness you are working on?",
    targetSeconds: 60,
    topics: [
      { id: "real", label: "A real, specific weakness", terms: ["weakness", "struggle", "difficult for me", "not good at", "i tend to", "used to"], followUp: "Can you name the weakness more specifically?" },
      { id: "action", label: "What you are doing about it", terms: ["working on", "practice", "practising", "practicing", "started", "now i", "course", "habit"], followUp: "What exactly are you doing to improve it?" },
      { id: "result", label: "Evidence of progress", terms: ["improved", "now", "since then", "result", "better"], followUp: "What has changed since you started working on it?" },
    ],
    modelAnswer: "I used to say yes to every request and then struggle with deadlines. I now keep a written list of commitments and estimate each task before agreeing. Since I started doing that three months ago, I've delivered my last two projects on time and I'm more comfortable saying when something needs more time.",
  },
  {
    id: "acad-project",
    track: "academic",
    level: "intermediate",
    lang: "en",
    prompt: "Explain your final-year project: the problem, your method, and your results.",
    targetSeconds: 120,
    topics: [
      { id: "problem", label: "The problem and why it matters", terms: ["problem", "issue", "challenge", "because", "matters", "important"], followUp: "Who has this problem, and why does it matter?" },
      { id: "method", label: "Your method", terms: ["method", "approach", "we used", "i used", "dataset", "model", "algorithm", "designed", "implemented"], followUp: "Walk me through your method step by step." },
      { id: "result", label: "Results with a number", terms: ["result", "accuracy", "percent", "%", "improved", "reduced", "compared"], followUp: "What was your main result, as a number?" },
      { id: "limit", label: "Limitations and future work", terms: ["limitation", "limited", "future work", "next step", "could improve", "weakness"], followUp: "What are the limitations of your work?" },
    ],
    modelAnswer: "Farmers in our district lose part of their tomato harvest to late blight because they notice it too late. We built an image classifier using 2,400 labelled leaf photos and a MobileNet model so it can run on a phone. It reached 91% accuracy on a held-out test set, compared with 78% for a baseline. Its main limitation is that photos were taken in daylight only, so next we want night and rain images.",
  },
  {
    id: "bn-intro",
    track: "bangla",
    level: "beginner",
    lang: "bn",
    prompt: "নিজের সম্পর্কে সংক্ষেপে বলুন (চাকরির ভাইভা)।",
    targetSeconds: 60,
    topics: [
      { id: "now", label: "বর্তমান পরিচয় (পড়াশোনা/কাজ)", terms: ["আমি", "পড়াশোনা", "অধ্যয়ন", "শিক্ষার্থী", "স্নাতক", "কাজ করছি", "চাকরি"], followUp: "এখন আপনি কী করছেন, এক বাক্যে বলুন।" },
      { id: "proof", label: "একটি নির্দিষ্ট অর্জন", terms: ["অর্জন", "করেছি", "তৈরি", "নেতৃত্ব", "পুরস্কার", "প্রকল্প", "প্রজেক্ট"], followUp: "এমন একটি কাজের কথা বলুন যা নিয়ে আপনি গর্বিত।" },
      { id: "why", label: "কেন এই পদ", terms: ["এই পদ", "এই চাকরি", "আগ্রহ", "কারণ", "প্রতিষ্ঠান"], followUp: "এই পদে কেন আগ্রহী?" },
    ],
    modelAnswer: "আমি ঢাকার একটি বিশ্ববিদ্যালয় থেকে হিসাববিজ্ঞানে স্নাতক শেষ করেছি। পড়াশোনার সময় একটি স্বেচ্ছাসেবী সংগঠনের তহবিলের হিসাব রেখেছি এবং ২০০ জন সদস্যের জন্য মাসিক রিপোর্ট তৈরি করেছি। হিসাব স্বচ্ছ রাখা আমার পছন্দের কাজ, তাই এই প্রতিষ্ঠানের হিসাব বিভাগের পদে আমি আগ্রহী।",
  },
  {
    id: "bn-current",
    track: "bangla",
    level: "intermediate",
    lang: "bn",
    prompt: "বাংলাদেশের তরুণদের কর্মসংস্থানের একটি বড় চ্যালেঞ্জ ও সম্ভাব্য সমাধান বলুন।",
    targetSeconds: 90,
    topics: [
      { id: "challenge", label: "চ্যালেঞ্জ স্পষ্টভাবে বলা", terms: ["চ্যালেঞ্জ", "সমস্যা", "বেকারত্ব", "দক্ষতার ঘাটতি", "অভাব"], followUp: "চ্যালেঞ্জটি ঠিক কী, এক বাক্যে বলুন।" },
      { id: "cause", label: "কারণ ব্যাখ্যা", terms: ["কারণ", "যেহেতু", "ফলে", "কেননা"], followUp: "এই সমস্যার মূল কারণ কী বলে মনে করেন?" },
      { id: "solution", label: "বাস্তবসম্মত সমাধান", terms: ["সমাধান", "প্রশিক্ষণ", "উদ্যোগ", "করা যেতে পারে", "প্রয়োজন", "উচিত"], followUp: "আপনার প্রস্তাবিত সমাধান কীভাবে বাস্তবায়ন হবে?" },
      { id: "example", label: "উদাহরণ বা তথ্য", terms: ["উদাহরণ", "যেমন", "শতাংশ", "জরিপ", "দেখা গেছে"], followUp: "আপনার বক্তব্যের পক্ষে একটি উদাহরণ দিন।" },
    ],
    modelAnswer: "বড় চ্যালেঞ্জ হলো পড়াশোনা ও চাকরির বাজারের দক্ষতার মধ্যে ফারাক। কারণ অনেক পাঠ্যক্রমে হাতে-কলমে কাজের সুযোগ কম। সমাধান হিসেবে বিশ্ববিদ্যালয় ও শিল্পপ্রতিষ্ঠান মিলে ইন্টার্নশিপ বাধ্যতামূলক করা যেতে পারে। যেমন, কিছু প্রকৌশল বিশ্ববিদ্যালয়ে শিল্প-সংযুক্তি চালুর পর শিক্ষার্থীদের চাকরি পাওয়া সহজ হয়েছে। তাই দক্ষতাভিত্তিক শিক্ষাই মূল উপায়।",
  },
  {
    id: "hr-conflict",
    track: "hr",
    level: "intermediate",
    lang: "en",
    prompt: "Tell me about a time you disagreed with a teammate. What did you do?",
    targetSeconds: 120,
    topics: [
      { id: "situation", label: "The situation and your role", terms: ["project", "team", "when i was", "during", "we were", "my role"], followUp: "Set the scene: what was the project and what was your role?" },
      { id: "disagree", label: "What the disagreement was", terms: ["disagreed", "disagreement", "different opinion", "conflict", "wanted to", "argued"], followUp: "What exactly did you disagree about?" },
      { id: "action", label: "What you personally did", terms: ["i suggested", "i proposed", "i listened", "i asked", "i talked", "i met", "i explained", "compromise"], followUp: "What did *you* do, step by step?" },
      { id: "result", label: "Outcome and what you learned", terms: ["result", "in the end", "finally", "learned", "outcome", "agreed", "delivered"], followUp: "How did it end, and what would you do differently?" },
    ],
    modelAnswer: "In my final-year project, my teammate wanted to rewrite our backend two weeks before the demo; I thought it was too risky, and my role was to keep the demo build stable. I asked him to list what the rewrite would fix, and we found that two of the three problems could be fixed with small changes. I proposed we make those fixes now and schedule the rewrite after the demo. In the end we delivered on time with no crashes, and I learned to argue with data rather than opinions.",
  },
];

const EN_FILLERS = ["um", "umm", "uh", "uhh", "erm", "hmm", "you know", "i mean", "kind of", "sort of", "basically", "actually", "literally"];
const BN_FILLERS = ["মানে", "আসলে", "ইয়ে", "আচ্ছা", "হুম", "উম", "তো মানে"];

const EXAMPLE_CUES = ["for example", "for instance", "such as", "in my project", "in one project", "last year", "e.g", "উদাহরণ", "যেমন", "আমার প্রজেক্টে"];
const CONCLUSION_CUES = ["so,", "so ", "therefore", "in summary", "overall", "to sum up", "that's why", "which is why", "finally", "তাই", "সুতরাং", "অতএব", "সবশেষে", "সংক্ষেপে"];

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "is", "it", "i", "we", "that", "this", "for", "with", "be", "as", "so", "my", "you", "are", "was", "at", "by", "if", "then", "but", "আমি", "এবং", "ও", "এই", "যে", "করে", "হয়", "থেকে", "জন্য", "একটি", "না", "কি"]);

function normalise(text: string) {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

/** Word-boundary match for Latin terms; substring match for Bangla (no reliable \b in JS). */
export function containsTerm(text: string, term: string): boolean {
  const t = normalise(text);
  const k = normalise(term);
  if (/[\u0980-\u09FF]/.test(k)) return t.includes(k);
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+").replace(/ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`, "i").test(t);
}

export function countFillers(text: string, lang: Lang): { word: string; count: number }[] {
  const t = ` ${normalise(text).replace(/[.!?।]/g, " , ")} `;
  const list = lang === "bn" ? BN_FILLERS : EN_FILLERS;
  const out: { word: string; count: number }[] = [];
  for (const f of list) {
    let count = 0;
    if (lang === "bn") {
      count = t.split(` ${f} `).length - 1;
    } else {
      const re = new RegExp(`(^|[^a-z])${f.replace(/ /g, "\\s+")}(?=[^a-z]|$)`, "g");
      count = (t.match(re) ?? []).length;
    }
    if (count) out.push({ word: f, count });
  }
  if (lang === "en") {
    // "like" only when used as a pause word: set off by commas or followed by another filler.
    const like = (t.match(/,\s*like\s*,|\blike,\s|\blike\s+(?:um|uh|you know)\b/g) ?? []).length;
    if (like) out.push({ word: "like", count: like });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function words(text: string): string[] {
  return normalise(text).replace(/[^\p{L}\p{N}'\s-]/gu, " ").split(/\s+/).filter(Boolean);
}

export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?।])\s+|\n+/).map((s) => s.trim()).filter((s) => words(s).length > 0);
}

export interface Analysis {
  wordCount: number;
  seconds: number | null;
  wpm: number | null; // null when no reliable elapsed time
  paceNote: string | null;
  fillers: { word: string; count: number }[];
  fillerPer100: number;
  covered: Topic[];
  missing: Topic[];
  hasExample: boolean;
  hasConclusion: boolean;
  sentenceCount: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  repeated: { word: string; count: number }[];
  timeNote: string | null;
  score: { content: number; structure: number; delivery: number; total: number };
  tips: string[];
  followUp: string | null;
}

/**
 * Analyse an answer. `seconds` is the real recording time, or null for typed answers.
 * The score is a transparent sum: content (0-50) + structure (0-20) + delivery (0-30).
 */
export function analyzeAnswer(text: string, q: Question, seconds: number | null): Analysis {
  const w = words(text);
  const wordCount = w.length;
  const lang = q.lang;
  const fillers = countFillers(text, lang);
  const fillerTotal = fillers.reduce((a, f) => a + f.count, 0);
  const fillerPer100 = wordCount ? Math.round((fillerTotal / wordCount) * 1000) / 10 : 0;

  const covered = q.topics.filter((tp) => tp.terms.some((term) => containsTerm(text, term)));
  const missing = q.topics.filter((tp) => !covered.includes(tp));

  const lower = ` ${normalise(text)} `;
  const hasExample = EXAMPLE_CUES.some((c) => lower.includes(c)) || /\b\d+(?:\.\d+)?\s?(?:%|percent|users|students|ms|seconds|days)\b/.test(lower) || /[০-৯]+/.test(text);
  const hasConclusion = CONCLUSION_CUES.some((c) => lower.includes(` ${c}`));
  const sents = sentences(text);
  const lens = sents.map((s) => words(s).length);
  const avgSentenceWords = lens.length ? Math.round((lens.reduce((a, b) => a + b, 0) / lens.length) * 10) / 10 : 0;
  const longestSentenceWords = lens.length ? Math.max(...lens) : 0;

  const freq = new Map<string, number>();
  for (const x of w) if (!STOP.has(x) && x.length > 2) freq.set(x, (freq.get(x) ?? 0) + 1);
  const repeated = [...freq.entries()].filter(([, c]) => c >= 4 && c / Math.max(1, wordCount) > 0.04).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 3);

  const reliableTime = seconds !== null && seconds >= 10;
  const wpm = reliableTime ? Math.round(wordCount / (seconds! / 60)) : null;
  // English conversational pace is often cited around 120–160 wpm; we only use it as a broad band.
  let paceNote: string | null = null;
  if (wpm !== null && lang === "en") {
    if (wpm < 100) paceNote = "Slower than typical conversation — fine if deliberate; try fewer long pauses.";
    else if (wpm > 170) paceNote = "Faster than typical conversation — slow down at key points so the examiner can follow.";
    else paceNote = "Within a typical conversational range.";
  } else if (wpm !== null) {
    paceNote = "বাংলা বক্তব্যের গতি শব্দ গণনায় সঠিকভাবে মাপা কঠিন — শুধু নিজের আগের চেষ্টার সাথে তুলনা করুন।";
  }

  let timeNote: string | null = null;
  if (reliableTime) {
    if (seconds! < q.targetSeconds * 0.4) timeNote = lang === "bn" ? "উত্তর খুব ছোট — আরেকটু ব্যাখ্যা ও উদাহরণ দিন।" : "Quite short for this question — add an explanation or example.";
    else if (seconds! > q.targetSeconds * 1.6) timeNote = lang === "bn" ? "সময়ের চেয়ে অনেক বড় — মূল কথাগুলো আগে বলুন।" : "Much longer than the target — lead with the key points.";
  }

  // Transparent score.
  const content = Math.round((covered.length / Math.max(1, q.topics.length)) * 50);
  const structure = (hasExample ? 8 : 0) + (hasConclusion ? 6 : 0) + (avgSentenceWords > 0 && avgSentenceWords <= 25 ? 6 : avgSentenceWords <= 35 ? 3 : 0);
  const fillerPts = fillerPer100 <= 1 ? 20 : fillerPer100 <= 3 ? 14 : fillerPer100 <= 6 ? 8 : 3;
  const pacePts = wpm === null ? 10 : lang === "en" ? (wpm >= 100 && wpm <= 170 ? 10 : 5) : 10;
  const lengthOk = wordCount >= 25;
  const delivery = lengthOk ? fillerPts + pacePts : Math.min(10, fillerPts);
  const total = Math.min(100, content + structure + delivery);

  const tips: string[] = [];
  const en = lang === "en";
  if (wordCount < 25) tips.push(en ? "Say at least three or four full sentences so there is something to assess." : "অন্তত তিন-চারটি পূর্ণ বাক্যে উত্তর দিন।");
  if (missing.length) tips.push(en ? `Not covered: ${missing.map((m) => m.label).join("; ")}.` : `বাদ পড়েছে: ${missing.map((m) => m.label).join("; ")}।`);
  if (!hasExample) tips.push(en ? "Add one concrete example or number from your own experience." : "নিজের অভিজ্ঞতা থেকে একটি নির্দিষ্ট উদাহরণ বা সংখ্যা যোগ করুন।");
  if (!hasConclusion) tips.push(en ? "Finish with a one-line summary (\"So, …\")." : "শেষে এক লাইনে সারসংক্ষেপ বলুন (\"তাই…\")।");
  if (fillerPer100 > 3) tips.push(en ? `Fillers: ${fillers.slice(0, 3).map((f) => `"${f.word}" ×${f.count}`).join(", ")}. Pause silently instead.` : `ফিলার শব্দ: ${fillers.slice(0, 3).map((f) => `"${f.word}" ×${f.count}`).join(", ")}। এর বদলে একটু থামুন।`);
  if (longestSentenceWords > 40) tips.push(en ? "One sentence ran over 40 words — split long thoughts into shorter sentences." : "একটি বাক্য অনেক লম্বা — ছোট ছোট বাক্যে ভাগ করুন।");
  if (repeated.length) tips.push(en ? `You repeated "${repeated[0].word}" ${repeated[0].count} times — vary your wording.` : `"${repeated[0].word}" শব্দটি ${repeated[0].count} বার বলেছেন।`);
  if (timeNote) tips.push(timeNote);

  return {
    wordCount, seconds, wpm, paceNote, fillers, fillerPer100, covered, missing, hasExample, hasConclusion,
    sentenceCount: sents.length, avgSentenceWords, longestSentenceWords, repeated, timeNote,
    score: { content, structure, delivery, total },
    tips,
    followUp: missing[0]?.followUp ?? null,
  };
}

export interface SessionRecord {
  id: string;
  questionId: string;
  date: string; // ISO
  total: number;
  content: number;
  structure: number;
  delivery: number;
  wordCount: number;
  wpm: number | null;
  fillerPer100: number;
  transcript?: string; // only if the user chose to keep it
  missedTopicIds?: string[];
}

export function practiceReviewQueue(records: SessionRecord[]) {
  const latest = new Map<string, SessionRecord>();
  for (const record of records) {
    const previous = latest.get(record.questionId);
    if (!previous || previous.date < record.date) latest.set(record.questionId, record);
  }

  return QUESTIONS.flatMap((question) => {
    const record = latest.get(question.id);
    if (!record) return [];
    const ids = record.missedTopicIds;
    const topics = Array.isArray(ids) ? question.topics.filter((topic) => ids.includes(topic.id)) : null;
    if (topics?.length === 0 || (topics === null && !(record.content < 50))) return [];
    return [{ question, record, topics }];
  }).sort((a, b) => a.record.content - b.record.content || b.record.date.localeCompare(a.record.date));
}

export function progressSummary(records: SessionRecord[]) {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const last5 = sorted.slice(-5);
  const first5 = sorted.slice(0, 5);
  const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  return {
    sessions: records.length,
    recentAvg: avg(last5.map((r) => r.total)),
    earlyAvg: avg(first5.map((r) => r.total)),
    recentFillers: avg(last5.map((r) => r.fillerPer100)),
    weakest: (["content", "structure", "delivery"] as const)
      .map((k) => ({ k, pct: avg(last5.map((r) => r[k])) / (k === "content" ? 50 : k === "structure" ? 20 : 30) }))
      .sort((a, b) => a.pct - b.pct)[0].k,
    daysPractised: new Set(records.map((r) => r.date.slice(0, 10))).size,
  };
}

export interface StarCheck {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  missing: ("situation" | "task" | "action" | "result")[];
}

const STAR_CUES = {
  situation: ["when i was", "at my", "in my", "during", "last year", "last semester", "we were", "there was", "the situation"],
  task: ["my role", "my job was", "i was responsible", "i had to", "my task", "the goal was", "i needed to", "we needed to"],
  action: ["i decided", "i suggested", "i proposed", "i built", "i wrote", "i asked", "i talked", "i organised", "i organized", "i created", "i led", "so i", "i started", "i explained", "i listened"],
  result: ["as a result", "in the end", "the result", "finally", "outcome", "we delivered", "i learned", "i learnt", "which led to", "it reduced", "it increased", "improved"],
} as const;

/**
 * STAR (Situation, Task, Action, Result) check for behavioural answers. A cue-word heuristic:
 * it tells the speaker which parts they may have skipped, it does not judge the story.
 */
export function starCheck(text: string): StarCheck {
  const t = ` ${normalise(text)} `;
  const has = (k: keyof typeof STAR_CUES) => STAR_CUES[k].some((c) => t.includes(` ${c}`));
  const r = { situation: has("situation"), task: has("task"), action: has("action"), result: has("result") };
  return { ...r, missing: (["situation", "task", "action", "result"] as const).filter((k) => !r[k]) };
}

/** Consecutive days practised ending today or yesterday (so the streak survives until tonight). */
export function practiceStreak(records: SessionRecord[], today: string): { current: number; best: number } {
  const days = [...new Set(records.map((r) => r.date.slice(0, 10)))].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!days.length) return { current: 0, best: 0 };
  const num = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 86_400_000);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = num(days[i]) - num(days[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const gap = num(today) - num(days[days.length - 1]);
  return { current: gap <= 1 ? run : 0, best };
}
