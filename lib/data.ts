// Verified reference data. Every number the app shows comes from here or from live tools,
// never from a language model. Each entry carries its source and how sure we are.

export type Confidence = "official" | "reported" | "indicative" | "estimate";

export interface Source {
  label: string;
  url?: string;
  checked: string; // date we last checked
  confidence: Confidence;
}

export interface Track {
  id: string;
  name: string;
  rateUsd: [number, number];
  demand: string;
  keywords: string[]; // matched against extracted skills
  premium: string[]; // skills that push you to the top of the range
  aiRisk: number; // 0-100, heuristic exposure of entry-level work to AI automation
  source: Source;
}

const RATE_SOURCE: Source = {
  label: "Indicative 2026 Bangladesh freelance rate ranges, compiled from public freelancing guides",
  checked: "2026-10-29",
  confidence: "indicative",
};

export const TRACKS: Track[] = [
  {
    id: "fullstack",
    name: "Full-stack web development",
    rateUsd: [15, 50],
    demand: "Strong growth",
    keywords: ["react", "next.js", "node", "express", "django", "python", "typescript", "javascript", "postgres", "postgresql", "mongodb", "rest api", "laravel", "php", "vue", "tailwind", "docker", "sql", "fastapi", "graphql"],
    premium: ["typescript", "testing", "docker", "ci/cd", "postgresql", "system design", "next.js"],
    aiRisk: 45,
    source: RATE_SOURCE,
  },
  {
    id: "mobile",
    name: "Mobile app development",
    rateUsd: [20, 75],
    demand: "Strong growth",
    keywords: ["flutter", "dart", "react native", "android", "kotlin", "swift", "ios", "firebase", "jetpack"],
    premium: ["app store publishing", "testing", "state management", "ci/cd"],
    aiRisk: 35,
    source: RATE_SOURCE,
  },
  {
    id: "ai_automation",
    name: "AI agents and automation",
    rateUsd: [40, 100],
    demand: "High growth",
    keywords: ["n8n", "make.com", "zapier", "langchain", "llm", "openai", "gemini", "rag", "ai agents", "ai agent", "automation", "prompt engineering", "machine learning", "pytorch", "tensorflow", "web3", "solidity", "blockchain", "mcp"],
    premium: ["rag", "evaluation", "mcp", "python", "vector database"],
    aiRisk: 20,
    source: RATE_SOURCE,
  },
  {
    id: "cms_ecommerce",
    name: "WordPress, Shopify and CMS",
    rateUsd: [10, 35],
    demand: "Steady",
    keywords: ["wordpress", "woocommerce", "shopify", "liquid", "elementor", "wix", "webflow", "cms", "seo"],
    premium: ["liquid", "headless", "performance optimization", "custom apps", "core web vitals"],
    aiRisk: 65,
    source: RATE_SOURCE,
  },
  {
    id: "design",
    name: "UI/UX and product design",
    rateUsd: [15, 45],
    demand: "Steady",
    keywords: ["figma", "ux", "ui/ux", "prototyping", "wireframe", "user research", "design system", "adobe xd", "illustrator", "photoshop", "canva"],
    premium: ["design system", "user research", "prototyping", "accessibility"],
    aiRisk: 55,
    source: { ...RATE_SOURCE, confidence: "estimate" },
  },
];

export const MACRO_STATS_2026 = {
  activeFreelancers: "700,000–750,000",
  activeFreelancers2023: "500,000",
  annualEarnings: "$550M–$650M",
  avgMonthlyIncome: "$550–$800",
  partTimeStudents: "৳18,000–৳62,000 / mo (~$150–$500/mo)",
  youthParticipation: "75%–78%",
  unemployedYouthPool: "2.7 Million",
  marketplaceCommissionDrain: "10%–20%",
  postBlackoutIncomeDropRisk: "20%–30%",
  baseUsdBdt: 120.0,
  recommendedUpsBufferBdt: "৳8,000–৳15,000",
};

export const FX_FALLBACK = {
  usdBdt: 120.0,
  source: {
    label: "Bangladesh Bank / Market USD/BDT verified benchmark (2026)",
    url: "https://www.bb.org.bd",
    checked: "2026-10-29",
    confidence: "official",
  } as Source,
};

export interface FeeParam {
  id: string;
  label: string;
  value: number;
  unit: "%" | "USD";
  source: Source;
}

// Editable on screen. Defaults reflect what we could verify on 2026-10-29.
export const FEES: Record<string, FeeParam> = {
  fiverrFee: {
    id: "fiverrFee", label: "Fiverr seller service fee", value: 20, unit: "%",
    source: { label: "Fiverr Terms of Service: 20% on each completed transaction", url: "https://conductatlas.com/platform/fiverr/fiverr-terms-of-service/seller-revenue-commission-and-withdrawal-terms/", checked: "2026-10-29", confidence: "official" },
  },
  fiverrWithdraw: {
    id: "fiverrWithdraw", label: "Fiverr to Payoneer withdrawal fee", value: 3, unit: "USD",
    source: { label: "Fiverr withdrawal fee to a Payoneer account", url: "https://vaultleap.com/blog/fiverr-fees-explained-2026", checked: "2026-10-29", confidence: "reported" },
  },
  upworkFee: {
    id: "upworkFee", label: "Upwork freelancer service fee (variable 0–15%)", value: 10, unit: "%",
    source: { label: "Upwork variable service fee 0–15% since May 2025; ~10% is commonly reported", url: "https://www.jobbers.io/?p=57307", checked: "2026-10-29", confidence: "reported" },
  },
  upworkWithdraw: {
    id: "upworkWithdraw", label: "Upwork to Payoneer withdrawal fee", value: 2, unit: "USD",
    source: { label: "About $2 per Upwork withdrawal to Payoneer", url: "https://www.jobbers.io/upwork-fees-explained-hidden-costs-freelancers-dont-know-about/", checked: "2026-10-29", confidence: "reported" },
  },
  payoneerFx: {
    id: "payoneerFx", label: "Payoneer USD→BDT conversion markup (to bank)", value: 2, unit: "%",
    source: { label: "Payoneer exchange markup often around 2%", url: "https://vaultleap.com/blog/fiverr-fees-explained-2026", checked: "2026-10-29", confidence: "reported" },
  },
  payoneerBkashFx: {
    id: "payoneerBkashFx", label: "Payoneer→bKash conversion fee", value: 3, unit: "%",
    source: { label: "bKash: Payoneer charges 3% conversion fee + $1 per transaction", url: "https://www.bkash.com/en/products-services/payoneer", checked: "2026-10-29", confidence: "official" },
  },
  payoneerBkashFlat: {
    id: "payoneerBkashFlat", label: "Payoneer→bKash flat fee per withdrawal", value: 1, unit: "USD",
    source: { label: "bKash: $1 per transaction", url: "https://www.bkash.com/en/products-services/payoneer", checked: "2026-10-29", confidence: "official" },
  },
  wireFlat: {
    id: "wireFlat", label: "Direct bank wire: intermediary + receiving charges", value: 20, unit: "USD",
    source: { label: "Estimate. Ask your bank for its inward SWIFT charges", checked: "2026-10-29", confidence: "estimate" },
  },
  bankFx: {
    id: "bankFx", label: "Bank buying-rate spread vs mid-market", value: 0.8, unit: "%",
    source: { label: "Estimate. Compare your bank's posted TT buying rate", checked: "2026-10-29", confidence: "estimate" },
  },
  freelancerIncentive: {
    id: "freelancerIncentive", label: "Bangladesh Bank cash incentive, individual software/ITES freelancers", value: 2.5, unit: "%",
    source: { label: "Bangladesh Bank FY2026-27 export incentive circular: individual freelancers exporting software/ITES get 2.5%", url: "https://thefinancialexpress.com.bd/trade/bb-announces-export-incentives-for-43-sectors-for-fy26-27", checked: "2026-10-29", confidence: "official" },
  },
};

export const TAX_RULES = [
  {
    id: "ites-exemption",
    title: "IT / ITES income exemption",
    rule: "Income from IT and technology-based services earned 1 July 2024 – 30 June 2027 is exempt from income tax if the full amount is received through bank transfer.",
    bn: "১ জুলাই ২০২৪ – ৩০ জুন ২০২৭ পর্যন্ত আইটি/আইটিইএস সেবার আয় করমুক্ত, যদি পুরো অর্থ ব্যাংকিং চ্যানেলে আসে।",
    source: { label: "Finance Act 2024 (summary)", url: "https://www.nsave.com/bangladesh/income-tax", checked: "2026-10-29", confidence: "reported" } as Source,
  },
  {
    id: "fy27-proposal",
    title: "FY2026-27 budget proposal",
    rule: "The FY2026-27 budget speech proposed extending the exemption to all forms of freelancing income. Check whether the final Finance Act kept it.",
    bn: "২০২৬-২৭ বাজেটে সব ধরনের ফ্রিল্যান্সিং আয় করমুক্ত করার প্রস্তাব করা হয়েছে। চূড়ান্ত অর্থ আইনে আছে কি না যাচাই করুন।",
    source: { label: "The Financial Express, budget coverage, June 2026", url: "https://thefinancialexpress.com.bd/home/2027-budget-offers-tax-free-status-for-content-creators-startups-innovative-ventures", checked: "2026-10-29", confidence: "reported" } as Source,
  },
  {
    id: "wage-earner",
    title: "The 2.5% remittance incentive is not for freelancers",
    rule: "The well-known 2.5% wage-earner remittance incentive applies to expatriate workers' remittances only. Freelancers fall under the separate export incentive (2.5% for individual software/ITES freelancers in FY2026-27), claimed through your bank with documents. bKash notes the government incentive does not apply to Payoneer transfers.",
    bn: "প্রবাসী শ্রমিকদের ২.৫% রেমিট্যান্স প্রণোদনা ফ্রিল্যান্সারদের জন্য নয়। ফ্রিল্যান্সাররা আলাদা রপ্তানি প্রণোদনা পান (২০২৬-২৭ এ ২.৫%), যা ব্যাংকে কাগজপত্র দিয়ে দাবি করতে হয়।",
    source: { label: "Mutual Trust Bank incentive terms; bKash Payoneer page", url: "https://mutualtrustbank.com/?p=13223", checked: "2026-10-29", confidence: "official" } as Source,
  },
];

export const MACRO = {
  marketplaceWarning:
    "Moving a client you met on Fiverr or Upwork off the platform breaks their terms and can get your account banned. Direct contracts are for clients you find yourself: LinkedIn, referrals, cold outreach.",
};
