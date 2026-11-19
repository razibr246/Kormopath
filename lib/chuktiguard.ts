/**
 * ChuktiGuard — B2B Direct Freelance Invoicing & Outage Defense Contract Studio
 * Benchmark: Contra, Deel, Bonsai, and Freelancers Union.
 *
 * Provides:
 * 1. A sourced tax note for invoices (information only; the bank and a tax adviser decide)
 * 2. Clause 4 Internet Blackout Shield (Force Majeure defense against ISP/telecom blackouts)
 * 3. Deterministic milestone progress & FinOps disbursement engine with 2.5% Bangladesh Bank incentive
 */

export { milestoneAmounts } from "./contract.ts";

export { fmtBdt, calculateInvoiceFinOps, type PaymentRail, type InvoiceFinOpsResult } from "./finops.ts";

export interface InvoiceMilestone {
  id: string;
  title: string;
  amountUsd: number;
  dueDate: string;
  status: "pending" | "in_progress" | "delivered" | "approved" | "paid";
}

export interface ChuktiInvoice {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  contractor: {
    name: string;
    designation: string;
    organization?: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    tin?: string;
  };
  client: {
    name: string;
    company: string;
    email: string;
    country: string;
    address: string;
  };
  serviceCategory: string;
  milestones: InvoiceMilestone[];
  notes?: string;
  paymentRail: "swift" | "payoneer" | "wise" | "bkash_remit";
  paymentDetails: {
    bankName?: string;
    accountHolder?: string;
    accountNumber?: string;
    swiftBic?: string;
    routingNumber?: string;
    payoneerEmail?: string;
    iban?: string;
    bkashWallet?: string;
  };
  includeClause4Shield: boolean;
  includeNbrExemption: boolean;
}

/**
 * Tax note for invoices: information, not a statutory notice. No section, paragraph, SRO or circular numbers,
 * because none could be read on an official NBR or Bangladesh Bank page (see lib/finops.ts AIT sources, checked
 * 2026-11-19: Bangladesh Bank via TBS, the Sixth Schedule exemption via The Daily Star). The bank and a tax
 * adviser decide; this text never says a payment is exempt.
 */
export const NBR_ITES_DECLARATION = {
  en: `TAX NOTE (information, not tax advice):
Bangladesh Bank has said that no source tax should be deducted from freelancing remittances, and freelancing income is reported to be exempt under the Sixth Schedule of the Income Tax Act 2023 (sources: Bangladesh Bank as reported by The Business Standard; The Daily Star). Rules change: confirm with your bank or a tax adviser before relying on this.
Whether a payment qualifies for the Bangladesh Bank cash incentive for freelancers is decided by the receiving bank.`,
  bn: `কর বিষয়ক তথ্য (কর পরামর্শ নয়):
বাংলাদেশ ব্যাংক জানিয়েছে ফ্রিল্যান্সিং রেমিট্যান্স থেকে উৎসে কর কাটা যাবে না, এবং আয়কর আইন ২০২৩-এর ষষ্ঠ তফসিলে ফ্রিল্যান্সিং আয় করমুক্ত বলে প্রকাশিত হয়েছে (সূত্র: দ্য বিজনেস স্ট্যান্ডার্ডে প্রকাশিত বাংলাদেশ ব্যাংকের বক্তব্য; দ্য ডেইলি স্টার)। নিয়ম বদলায়: নির্ভর করার আগে আপনার ব্যাংক বা কর পরামর্শকের সঙ্গে নিশ্চিত হোন।
ফ্রিল্যান্সারদের নগদ প্রণোদনা কোনো পেমেন্টে প্রযোজ্য কি না, তা গ্রহণকারী ব্যাংক ঠিক করে।`,
};

/**
 * Clause 4: Telecommunication & Internet Infrastructure Blackout Shield
 * Protects freelancers during national or regional Internet shutdowns.
 */
export function generateClause4Text(options?: {
  freelancerName?: string;
  clientCompany?: string;
  gracePeriodHours?: number;
}): { en: string; bn: string } {
  const name = options?.freelancerName || "The Contractor";
  const client = options?.clientCompany || "The Client";
  const hours = options?.gracePeriodHours || 72;

  const en = `CLAUSE 4: TELECOMMUNICATION & INFRASTRUCTURE DISRUPTION SHIELD (FORCE MAJEURE)

4.1 Uncontrollable Infrastructure Events:
In the event that ${name} experiences an involuntary nationwide, regional, or grid-level telecommunication, undersea cable (SEA-ME-WE 4/5), or internet service provider (ISP) blackout officially documented by global internet monitoring authorities (e.g., Cloudflare Radar, NetBlocks, or IODA), such occurrence shall be recognized as a valid Force Majeure event.

4.2 Automatic Grace Period & Dispute Moratorium:
Upon the verifiable resumption of full internet access, ${name} shall automatically receive an operational grace buffer of ${hours} hours to submit any pending deliverables or milestones without incurring any contractual breach penalty, deadline default charge, dispute escrow freeze, or adverse reputation rating.

4.3 Mutual Good Faith:
${client} agrees that delays resulting from infrastructure-level disruptions outside the direct physical control of ${name} shall not constitute grounds for project termination without compensation for previously completed milestones.`;

  const bn = `ধারা ৪: টেলিযোগাযোগ ও ইন্টারনেট ব্ল্যাকআউট নিরাপত্তা ঢাল (ফোর্স মেজর)

৪.১ নিয়ন্ত্রণহীন অবকাঠামোগত বিঘ্ন:
যদি ${name} কোনো জাতীয়, আঞ্চলিক, সাবমেরিন কেবল (SEA-ME-WE ৪/৫) অথবা ইন্টারনেট সেবা প্রদানকারী (আইএসপি) ব্ল্যাকআউটের শিকার হন যা আন্তর্জাতিক ইন্টারনেট ট্র্যাকার (যেমন: ক্লাউডফ্লেয়ার রাডার বা নেটব্লকস) দ্বারা স্বীকৃত, তবে তা একটি বৈধ 'ফোর্স মেজর' বা নিয়ন্ত্রণহীন পরিস্থিতি হিসেবে গণ্য হবে।

৪.২ স্বয়ংক্রিয় গ্রেস পিরিয়ড ও বিরোধ স্থগিতকরণ:
ইন্টারনেট সংযোগ স্বাভাবিক হওয়ার পর থেকে ${name} যেকোনো পেন্ডিং ডেলিভারেবলের জন্য কোনো বিলম্ব জরিমানা, চুক্তি লঙ্ঘন, এসক্রো বাতিল বা নেগেটিভ ফিডব্যাক ছাড়াই অতিরিক্ত ${hours} ঘণ্টার গ্রেস পিরিয়ড পাবেন।

৪.৩ পারস্পরিক আস্থা:
${client} একমত পোষণ করছেন যে, অবকাঠামোগত ইন্টারনেট বা জাতীয় বিদ্যুৎ বিঘ্নজনিত কারণে হওয়া সাময়িক বিলম্বের জন্য চুক্তি বাতিল বা পূর্ববর্তী মাইলেস্টোনের পেমেন্ট প্রত্যাহার করা যাবে না।`;

  return { en, bn };
}



/**
 * Sample contracts for instant demonstration
 */
export const SAMPLE_CHUKTI_PRESETS: ChuktiInvoice[] = [
  {
    invoiceNumber: "INV-2025-089",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    contractor: {
      name: "Tanvir Ahmed",
      designation: "Principal Next.js & Full-Stack Architect",
      organization: "Dhaka Code Labs",
      email: "tanvir@dhakacodelabs.com",
      phone: "+880 1712-345678",
      country: "Bangladesh",
      city: "Dhaka",
      tin: "182947291038",
    },
    client: {
      name: "David Miller",
      company: "Apex Digital Solutions Inc.",
      email: "billing@apexdigital.io",
      country: "United States",
      address: "500 Howard Street, Suite 400, San Francisco, CA 94105",
    },
    serviceCategory: "Full-Stack Web App Development & Cloud Migration",
    milestones: [
      {
        id: "m-1",
        title: "Sprint 1: Architecture, DB Schema & Next.js 15 App Shell",
        amountUsd: 1200,
        dueDate: "2025-11-15",
        status: "approved",
      },
      {
        id: "m-2",
        title: "Sprint 2: FinOps Multi-Currency Engine & Authentication",
        amountUsd: 1500,
        dueDate: "2025-11-25",
        status: "in_progress",
      },
      {
        id: "m-3",
        title: "Sprint 3: End-to-End Testing, CI/CD Pipeline & Handover",
        amountUsd: 800,
        dueDate: "2025-12-05",
        status: "pending",
      },
    ],
    notes: "Payment due within 14 calendar days upon milestone delivery confirmation.",
    paymentRail: "swift",
    paymentDetails: {
      bankName: "BRAC Bank PLC",
      accountHolder: "Tanvir Ahmed",
      accountNumber: "1501204928172001",
      swiftBic: "BRAKBDDH",
      routingNumber: "060260421",
    },
    includeClause4Shield: true,
    includeNbrExemption: true,
  },
  {
    invoiceNumber: "INV-2025-104",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    contractor: {
      name: "Farhana Yasmin",
      designation: "Senior UI/UX & Mobile Product Designer",
      organization: "PixelMotion Studio",
      email: "farhana@pixelmotion.design",
      phone: "+880 1819-987654",
      country: "Bangladesh",
      city: "Chattogram",
    },
    client: {
      name: "Marcus Aurel",
      company: "Nordic Tech Labs Oy",
      email: "accounting@nordictech.fi",
      country: "Finland",
      address: "Mannerheimintie 12, 00100 Helsinki, Finland",
    },
    serviceCategory: "Mobile Design System & Interactive Prototypes",
    milestones: [
      {
        id: "m-101",
        title: "Figma Design Tokens & 30+ Mobile Screen Specs",
        amountUsd: 950,
        dueDate: "2025-11-20",
        status: "delivered",
      },
      {
        id: "m-102",
        title: "Micro-Interactions, SVG Vector Assets & Developer Handoff",
        amountUsd: 650,
        dueDate: "2025-11-30",
        status: "pending",
      },
    ],
    notes: "Direct Wise or Payoneer business wire preferred.",
    paymentRail: "payoneer",
    paymentDetails: {
      payoneerEmail: "farhana.payoneer@pixelmotion.design",
      accountHolder: "Farhana Yasmin",
    },
    includeClause4Shield: true,
    includeNbrExemption: true,
  },
];
