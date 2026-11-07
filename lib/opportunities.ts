export type PathId = "freelance" | "study" | "farm" | "home";

export interface PathAction {
  id: string;
  title: string;
  description: string;
  app: string;
  href: string;
}

export const PATHS: { id: PathId; title: string; description: string; queryLabel: string; queryPlaceholder: string; actions: PathAction[] }[] = [
  {
    id: "freelance",
    title: "ফ্রিল্যান্স কাজ ও ক্যারিয়ার",
    description: "দক্ষতার প্রমাণ তৈরি করুন, কাজ খুঁজুন, অফার ও পেমেন্টের প্রস্তুতি নিন।",
    queryLabel: "চাকরি, গিগ বা প্রশিক্ষণ খুঁজুন",
    queryPlaceholder: "যেমন: বাংলাদেশি junior frontend remote internship",
    actions: [
      { id: "audit", title: "দক্ষতার প্রমাণ তৈরি", description: "CV ও কাজের নমুনা থেকে যাচাইযোগ্য skill বের করুন।", app: "KormoPath Workspace", href: "/workspace" },
      { id: "practice", title: "চ্যালেঞ্জ ও ভাইভা অনুশীলন", description: "সমস্যা সমাধান করে Passport-এর জন্য প্রমাণ তৈরি করুন।", app: "KormoPath Workspace", href: "/workspace" },
      { id: "packages", title: "Service Pack তৈরি", description: "কাজের scope, deliverable ও timeline গুছিয়ে client-ready offer করুন।", app: "ChuktiGuard", href: "/chuktiguard" },
      { id: "payout", title: "পেমেন্ট ও ফি তুলনা", description: "চ্যানেলভিত্তিক fee ও net amount-এর deterministic হিসাব দেখুন।", app: "FeeGuard BD", href: "/feeguard" },
    ],
  },
  {
    id: "study",
    title: "বিশ্ববিদ্যালয় ও পড়াশোনা",
    description: "নিজের যোগ্যতা মেলান, official circular যাচাই করুন, আবেদন ও interview প্রস্তুতি নিন।",
    queryLabel: "ভর্তি, বৃত্তি বা internship খুঁজুন",
    queryPlaceholder: "যেমন: Bangladesh undergraduate engineering scholarship 2026",
    actions: [
      { id: "admission", title: "ভর্তি পরিকল্পনা", description: "প্রোফাইল ও official circular দিয়ে shortlist এবং checklist সাজান।", app: "AdmitBuddy", href: "/admitbuddy" },
      { id: "interview", title: "ভাইভা অনুশীলন", description: "উত্তর দিন, feedback নিন, অনুশীলনের অগ্রগতি রাখুন।", app: "Probaho Coach", href: "/probaho" },
      { id: "passport", title: "কাজের নমুনা ও skill proof", description: "নিজের প্রমাণভিত্তিক কাজ গুছিয়ে শেয়ারের প্রস্তুতি নিন।", app: "KormoPath Workspace", href: "/workspace" },
    ],
  },
  {
    id: "farm",
    title: "কৃষি ও বাজার",
    description: "নিজের শোনা দাম দিয়ে লাভ হিসাব করুন, আবহাওয়া ও কৃষি সহায়তা দেখুন।",
    queryLabel: "কৃষি প্রশিক্ষণ, সরকারি সহায়তা বা বাজার তথ্য খুঁজুন",
    queryPlaceholder: "যেমন: Bangladesh farmer training government 2026",
    actions: [
      { id: "margin", title: "হাট বনাম মোকাম হিসাব", description: "পরিবহন, কমিশন ও ঘাটতি বাদ দিয়ে নিজের সংখ্যায় হিসাব করুন।", app: "HaatBazar AI", href: "/haatbazar" },
      { id: "weather", title: "আবহাওয়া ও স্প্রে সময়", description: "নির্বাচিত জেলার পূর্বাভাস দেখে স্প্রে-উপযোগী সময় যাচাই করুন।", app: "HaatBazar AI", href: "/haatbazar" },
      { id: "call", title: "কৃষি সহায়তা", description: "ফসলের রোগ ও ব্যবহারবিধি কৃষি কর্মকর্তার সাথে যাচাই করুন।", app: "কৃষি কল সেন্টার", href: "tel:16123" },
    ],
  },
  {
    id: "home",
    title: "ঘরের হিসাব ও স্বাস্থ্য",
    description: "বাজেট, পণ্য কেনা এবং প্রেসক্রিপশনের লেখা আলাদা ও নিরাপদভাবে সামলান।",
    queryLabel: "কোন পণ্য বা মডেল কিনতে চান?",
    queryPlaceholder: "যেমন: rice cooker 1.8L Bangladesh",
    actions: [
      { id: "budget", title: "মাসিক বাজেট গুছান", description: "লেনদেন যাচাই করে সংরক্ষণ করুন; আয়-ব্যয়ের সারাংশ দেখুন।", app: "Shohoj Budget", href: "/shohoj-budget" },
      { id: "product", title: "পণ্যের দাম তুলনা", description: "ওয়েবে পাওয়া অফার ও সূত্র দেখুন; বিক্রেতার সাইটে দাম মিলিয়ে নিন।", app: "Shohoj Budget", href: "/shohoj-budget" },
      { id: "prescription", title: "প্রেসক্রিপশন বুঝুন", description: "লেখা মিলিয়ে পড়ুন; রোগ নির্ণয় বা ওষুধ পরিবর্তনের জন্য নয়।", app: "MediScan BD", href: "/mediscan" },
      { id: "healthline", title: "স্বাস্থ্য সহায়তা", description: "জরুরি অবস্থায় 999; স্বাস্থ্য বাতায়ন 16263।", app: "স্বাস্থ্যসেবা", href: "tel:16263" },
    ],
  },
];

export const OPPORTUNITY_STATUSES = {
  saved: "সংরক্ষিত",
  applied: "আবেদন করেছি",
  response: "উত্তর পেয়েছি",
  accepted: "নির্বাচিত হয়েছি",
  closed: "বন্ধ",
} as const;

export type OpportunityStatus = keyof typeof OPPORTUNITY_STATUSES;

export interface OpportunityProgress {
  status: OpportunityStatus;
  followUp: string;
  note: string;
}

export const MAX_SAVED_OPPORTUNITIES = 100;
export const OPPORTUNITY_TITLE_LIMIT = 160;
export const OPPORTUNITY_NOTE_LIMIT = 500;

export interface SavedOpportunity extends OpportunityProgress {
  id: string;
  title: string;
  url: string;
  track: PathId;
  savedAt: string;
}

export interface OpportunityBoardState {
  path: PathId;
  completedByPath: Partial<Record<PathId, string[]>>;
  saved: SavedOpportunity[];
}

export const EMPTY_BOARD: OpportunityBoardState = { path: "freelance", completedByPath: {}, saved: [] };

export function normalizeOpportunityUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) return url.href;
  } catch {
    // An opportunity must link to an external web page.
  }
  return null;
}

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return typeof value === "string" && Object.hasOwn(OPPORTUNITY_STATUSES, value);
}

export function isFollowUpDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isFollowUpDue(item: OpportunityProgress, today: string): boolean {
  return Boolean(item.followUp) && item.followUp <= today && item.status !== "accepted" && item.status !== "closed";
}

export function opportunitiesToCsv(items: SavedOpportunity[]): string {
  const headers = ["title", "url", "path", "status", "follow_up_date", "note", "saved_at"];
  const rows = items.map((item) => [item.title, item.url, item.track, item.status, item.followUp, item.note, item.savedAt]);
  return [headers, ...rows].map((row) => row.map((value) => {
    // Quote all cells and neutralize spreadsheet formulas, including after whitespace.
    const safe = /^[\s]*[=+\-@＝＋－＠]|^[\t\r\n]/u.test(value) ? "'" + value : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function sanitizeOpportunityBoard(raw: unknown): OpportunityBoardState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const path = PATHS.some((item) => item.id === value.path) ? value.path as PathId : null;
  if (!path) return null;
  const completedByPath: Partial<Record<PathId, string[]>> = {};
  for (const candidate of PATHS) {
    const rawIds = (value.completedByPath as Record<string, unknown> | undefined)?.[candidate.id];
    if (Array.isArray(rawIds)) completedByPath[candidate.id] = [...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length <= 50))].slice(0, 50);
  }
  const saved = Array.isArray(value.saved)
    ? value.saved.flatMap((item): SavedOpportunity[] => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.url !== "string" || typeof row.savedAt !== "string" || !PATHS.some((candidate) => candidate.id === row.track)) return [];
        const url = normalizeOpportunityUrl(row.url);
        if (!url) return [];
        return [{
          id: row.id.slice(0, 80),
          title: row.title.trim().slice(0, OPPORTUNITY_TITLE_LIMIT) || new URL(url).hostname,
          url,
          track: row.track as PathId,
          savedAt: row.savedAt.slice(0, 40),
          status: isOpportunityStatus(row.status) ? row.status : "saved",
          followUp: typeof row.followUp === "string" && isFollowUpDate(row.followUp) ? row.followUp : "",
          note: typeof row.note === "string" ? row.note.slice(0, OPPORTUNITY_NOTE_LIMIT) : "",
        }];
      }).slice(0, MAX_SAVED_OPPORTUNITIES)
    : [];
  return { path, completedByPath, saved };
}
