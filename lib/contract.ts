// Contract text is a fixed, reviewed template. The AI never writes legal clauses;
// it only fills names, amounts and dates the user entered.

export interface ContractInput {
  freelancer: string;
  client: string;
  clientCountry: string;
  scope: string;
  valueUsd: number;
  milestones: { label: string; pct: number }[];
  deliveryDays: number;
  bufferHours: number;
  channel: string;
  date: string;
}

export interface Clause {
  heading: string;
  body: string;
  highlight?: boolean;
}

export function milestoneAmounts(valueUsd: number, ms: { pct: number }[]): number[] {
  if (!Array.isArray(ms) || ms.length === 0) return [];
  // Integer cents, remainder goes to the last milestone so the parts always sum to the total.
  const cents = Math.round(Math.max(0, Number(valueUsd) || 0) * 100);
  const parts = ms.map((m) => Math.floor((cents * (Number(m.pct) || 0)) / 100));
  const allocated = parts.reduce((a, b) => a + b, 0);
  parts[parts.length - 1] += cents - allocated;
  return parts.map((c) => c / 100);
}

export const bnDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export function buildContract(c: ContractInput, lang: "en" | "bn"): { title: string; clauses: Clause[] } {
  const amounts = milestoneAmounts(c.valueUsd, c.milestones);
  const usd = (n: number) => `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (lang === "en") {
    return {
      title: "Independent Contractor Service Agreement",
      clauses: [
        { heading: "Parties", body: `This agreement is made on ${c.date} between ${c.client || "[Client]"} of ${c.clientCountry || "[Country]"} ("Client") and ${c.freelancer || "[Freelancer]"}, an independent contractor resident in Bangladesh ("Contractor").` },
        { heading: "Scope of work", body: `${c.scope || "[Describe deliverables]"} Work outside this scope needs a written change request with its own price.` },
        { heading: "Fees and milestones", body: `Total fixed fee: ${usd(c.valueUsd)}. ` + c.milestones.map((m, i) => `Milestone ${i + 1}, ${m.label}: ${usd(amounts[i])} (${m.pct}%).`).join(" ") + ` Each milestone is paid within 7 days of written approval. Approval is deemed given if the Client raises no specific issue within 5 business days of delivery.` },
        { heading: "Payment channel", body: `Payments are made in US dollars via ${c.channel} into an account in the Contractor's name. The Contractor will receive funds through formal banking channels and may share remittance documents with their bank. Transfer fees charged by the sending side are paid by the Client.` },
        { heading: "Clause 4: Infrastructure Force-Majeure & Asynchronous Delivery Buffer (48-Hour Connectivity Outage Protection + UPS/Mobile Hotspot SLA)", highlight: true, body: `The parties recognise that nationwide internet shutdowns, telecom failures and grid outages outside the Contractor's control can occur in Bangladesh. During any such event: (a) all deadlines automatically extend by the length of the outage plus ${c.bufferHours} hours; (b) no late-delivery penalty, rating, refund or termination right arises from the delay; (c) the Contractor will notify the Client through any available channel (SMS, mobile data, a third party) as soon as reasonably possible; (d) the Contractor maintains a dedicated UPS hardware buffer (BDT 8,000–15,000) and a secondary 4G/5G mobile hotspot backup SLA, pushing code asynchronously to a shared repository at least daily so the Client can always see verified progress. If an outage lasts longer than 14 days, either party may pause the agreement; completed milestones remain payable.` },
        { heading: "Timeline and communication", body: `Target completion: ${c.deliveryDays} days from the start date, subject to clause 4. Updates are shared asynchronously at least every 2 business days. Calls are scheduled with at least 24 hours' notice across time zones.` },
        { heading: "Intellectual property", body: `Ownership of deliverables passes to the Client when the related milestone is paid in full. The Contractor may show non-confidential work in a portfolio unless the Client objects in writing.` },
        { heading: "Confidentiality", body: `Each party keeps the other's non-public information confidential during this agreement and for 2 years after it ends.` },
        { heading: "Termination", body: `Either party may end this agreement with 7 days' written notice. The Client pays for all approved milestones and a pro-rata share of the current milestone for work delivered.` },
        { heading: "Disputes", body: `The parties will first try to resolve any dispute by good-faith discussion for 14 days, then by mediation, before any other proceedings.` },
      ],
    };
  }
  return {
    title: "স্বাধীন ঠিকাদার সেবা চুক্তি",
    clauses: [
      { heading: "পক্ষসমূহ", body: `এই চুক্তি ${bnDigits(c.date)} তারিখে ${c.clientCountry || "[দেশ]"}-এর ${c.client || "[ক্লায়েন্ট]"} ("ক্লায়েন্ট") এবং বাংলাদেশে বসবাসরত স্বাধীন ঠিকাদার ${c.freelancer || "[ফ্রিল্যান্সার]"} ("ঠিকাদার")-এর মধ্যে সম্পাদিত হলো।` },
      { heading: "কাজের পরিধি", body: `${c.scope || "[কাজের বিবরণ]"} এই পরিধির বাইরের যেকোনো কাজের জন্য আলাদা মূল্যসহ লিখিত পরিবর্তন অনুরোধ লাগবে।` },
      { heading: "পারিশ্রমিক ও মাইলস্টোন", body: `মোট নির্ধারিত পারিশ্রমিক: ${bnDigits(usd(c.valueUsd))}। ` + c.milestones.map((m, i) => `মাইলস্টোন ${bnDigits(i + 1)}, ${m.label}: ${bnDigits(usd(amounts[i]))} (${bnDigits(m.pct)}%)।`).join(" ") + ` লিখিত অনুমোদনের ৭ দিনের মধ্যে প্রতিটি মাইলস্টোনের অর্থ পরিশোধ করা হবে। ডেলিভারির ৫ কর্মদিবসের মধ্যে ক্লায়েন্ট কোনো নির্দিষ্ট আপত্তি না জানালে কাজটি অনুমোদিত বলে গণ্য হবে।` },
      { heading: "অর্থপ্রদানের মাধ্যম", body: `অর্থ মার্কিন ডলারে ${c.channel}-এর মাধ্যমে ঠিকাদারের নিজ নামের অ্যাকাউন্টে পরিশোধ করা হবে। ঠিকাদার আনুষ্ঠানিক ব্যাংকিং চ্যানেলে অর্থ গ্রহণ করবেন এবং প্রয়োজনে ব্যাংকে রেমিট্যান্সের কাগজপত্র জমা দিতে পারবেন। প্রেরণকারী পক্ষের ট্রান্সফার ফি ক্লায়েন্ট বহন করবেন।` },
      { heading: "অনুচ্ছেদ ৪: অবকাঠামোগত বিভ্রাট সুরক্ষা ও ডেলিভারি বাফার (৪৮-ঘণ্টা ইন্টারনেট বিপর্যয় সুরক্ষা + ইউপিএস/হটস্পট এসএলএ)", highlight: true, body: `উভয় পক্ষ স্বীকার করেন যে বাংলাদেশে ঠিকাদারের নিয়ন্ত্রণের বাইরে দেশব্যাপী ইন্টারনেট বন্ধ, টেলিযোগাযোগ বিপর্যয় বা বিদ্যুৎ বিভ্রাট ঘটতে পারে। এমন যেকোনো ঘটনার সময়: (ক) সব সময়সীমা বিভ্রাটের সমান সময় এবং অতিরিক্ত ${bnDigits(c.bufferHours)} ঘণ্টা স্বয়ংক্রিয়ভাবে বাড়বে; (খ) এই বিলম্বের জন্য কোনো জরিমানা, রেটিং, অর্থ ফেরত বা চুক্তি বাতিলের অধিকার তৈরি হবে না; (গ) ঠিকাদার যত দ্রুত সম্ভব যেকোনো উপলভ্য মাধ্যমে (এসএমএস, মোবাইল ডেটা, তৃতীয় পক্ষ) ক্লায়েন্টকে জানাবেন; (ঘ) ঠিকাদার একটি ডেডিকেটেড ইউপিএস হার্ডওয়্যার বাফার (৳৮,০০০–১৫,০০০) ও বিকল্প ৪জি/৫জি মোবাইল হটস্পট এসএলএ রাখবেন এবং অন্তত প্রতিদিন একটি শেয়ার্ড রিপোজিটরিতে কোড জমা দেবেন, যাতে ক্লায়েন্ট সবসময় যাচাইকৃত অগ্রগতি দেখতে পান। বিভ্রাট ১৪ দিনের বেশি স্থায়ী হলে যেকোনো পক্ষ চুক্তি স্থগিত করতে পারবেন; সম্পন্ন মাইলস্টোনের অর্থ পরিশোধযোগ্য থাকবে।` },
      { heading: "সময়সূচি ও যোগাযোগ", body: `লক্ষ্য সমাপ্তি: শুরুর তারিখ থেকে ${bnDigits(c.deliveryDays)} দিন, ৪ নম্বর অনুচ্ছেদ সাপেক্ষে। অন্তত প্রতি ২ কর্মদিবসে অ্যাসিঙ্ক আপডেট দেওয়া হবে। ভিন্ন সময় অঞ্চলের কারণে কল অন্তত ২৪ ঘণ্টা আগে নির্ধারণ করা হবে।` },
      { heading: "মেধাস্বত্ব", body: `সংশ্লিষ্ট মাইলস্টোনের পূর্ণ অর্থ পরিশোধের পর ডেলিভারেবলের মালিকানা ক্লায়েন্টের কাছে হস্তান্তরিত হবে। ক্লায়েন্ট লিখিতভাবে আপত্তি না করলে ঠিকাদার গোপনীয় নয় এমন কাজ পোর্টফোলিওতে দেখাতে পারবেন।` },
      { heading: "গোপনীয়তা", body: `চুক্তি চলাকালীন এবং শেষ হওয়ার পর ২ বছর পর্যন্ত প্রত্যেক পক্ষ অপর পক্ষের অপ্রকাশিত তথ্য গোপন রাখবেন।` },
      { heading: "চুক্তি সমাপ্তি", body: `যেকোনো পক্ষ ৭ দিনের লিখিত নোটিশে এই চুক্তি শেষ করতে পারবেন। ক্লায়েন্ট সব অনুমোদিত মাইলস্টোন এবং চলমান মাইলস্টোনের সম্পন্ন কাজের আনুপাতিক অর্থ পরিশোধ করবেন।` },
      { heading: "বিরোধ নিষ্পত্তি", body: `যেকোনো বিরোধ প্রথমে ১৪ দিন সরল বিশ্বাসে আলোচনার মাধ্যমে, তারপর মধ্যস্থতার মাধ্যমে মীমাংসার চেষ্টা করা হবে, এর আগে অন্য কোনো আইনি প্রক্রিয়া নয়।` },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Consumer & Freelancer Dispute Protection (Statutory Grounding: Consumer Rights Protection Act 2009 & Contract Act 1872)
// Solves consumer fraud, unpaid freelance gigs, non-delivery, and deceptive merchant claims.

export interface DncrpPetitionInput {
  complainantName: string;
  complainantPhone: string;
  complainantAddress: string;
  complainantNid?: string;
  accusedParty: string;
  accusedPhone?: string;
  accusedAddress?: string;
  transactionDate: string;
  transactionChannel: string;
  transactionTrxId: string;
  claimedAmountBdt: number;
  productOrService: string;
  disputeSummary: string;
  remedySought: "full_refund" | "compensation" | "delivery" | "action";
}

export interface FreelancerDemandInput {
  freelancerName: string;
  freelancerEmail: string;
  freelancerCountry: string;
  clientName: string;
  clientCompany?: string;
  clientCountry: string;
  projectTitle: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountOwed: number; // in USD or BDT
  currency: "USD" | "BDT";
  milestoneDelivered: string;
  curePeriodDays: number; // e.g. 7 days
}

export interface DisputeNotice {
  title: string;
  statutoryReference: string;
  clauses: Clause[];
  submissionInstructions: {
    authority: string;
    email: string;
    hotline: string;
    portalUrl: string;
    address: string;
  };
}

export function buildDncrpPetition(input: DncrpPetitionInput, lang: "en" | "bn"): DisputeNotice {
  const bdt = (n: number) => `৳${Math.round(Math.max(0, n)).toLocaleString("en-US")}`;
  const remedyTextBn = {
    full_refund: "সম্পূর্ণ অর্থ ফেরত (রিফান্ড)",
    compensation: "ক্ষতিপূরণসহ সম্পূর্ণ অর্থ ফেরত",
    delivery: "প্রতিশ্রুত সেবা বা পণ্য অবিলম্বে সরবরাহ",
    action: "ভোক্তা অধিকার সংরক্ষণ আইন অনুযায়ী আইনগত শাস্তি ও প্রতিকার",
  }[input.remedySought];

  const remedyTextEn = {
    full_refund: "Full Refund of Claimed Amount",
    compensation: "Full Refund plus Statutory Compensation",
    delivery: "Immediate Delivery of Promised Product/Service",
    action: "Legal Enforcement under Consumer Rights Protection Act",
  }[input.remedySought];

  if (lang === "en") {
    return {
      title: "Formal Complaint Petition under Consumer Rights Protection Act, 2009",
      statutoryReference: "Sections 45 & 52, The Consumer Rights Protection Act, 2009 (Act No. 26 of 2009)",
      clauses: [
        {
          heading: "Addressee & Authority",
          body: "To: The Director General, Directorate of National Consumer Rights Protection (DNCRP), TCB Bhaban (8th Floor), 1 Karwan Bazar, Dhaka-1215, Bangladesh.",
        },
        {
          heading: "1. Complainant Details",
          body: `Name: ${input.complainantName || "[Complainant Name]"} | Mobile: ${input.complainantPhone || "[Phone]"} | Address: ${input.complainantAddress || "[Address]"}${input.complainantNid ? ` | NID: ${input.complainantNid}` : ""}`,
        },
        {
          heading: "2. Accused Merchant / Enterprise",
          body: `Party Name: ${input.accusedParty || "[Merchant Name]"} | Contact/Mobile: ${input.accusedPhone || "[Not Provided]"} | Address/Platform URL: ${input.accusedAddress || "[Not Provided]"}`,
        },
        {
          heading: "3. Transaction & Payment Record",
          body: `Date of Transaction: ${input.transactionDate || "[Date]"} | Payment Railway: ${input.transactionChannel || "[Channel]"} | Transaction ID (TrxID): ${input.transactionTrxId || "[TrxID]"} | Total Amount Paid: ${bdt(input.claimedAmountBdt)} | Product/Service: ${input.productOrService || "[Product/Service Name]"}`,
        },
        {
          heading: "4. Statement of Facts & Grievance",
          highlight: true,
          body: `${input.disputeSummary || "The accused party received payment but failed to deliver the promised goods/services, constituting an offense under the Consumer Rights Protection Act."} Despite repeated follow-ups, the accused party has engaged in deceptive trade practices.`,
        },
        {
          heading: "5. Statutory Infringement",
          body: "The acts committed by the accused violate Section 45 (failure to deliver promised products or services upon payment) and Section 52 (deceptive business practice) of the Consumer Rights Protection Act, 2009, punishable by fine and administrative penalty.",
        },
        {
          heading: "6. Remedy & Relief Prayed For",
          body: `The complainant respectfully prays for: (a) ${remedyTextEn}; (b) Statutory 25% reward allocated to the complainant from the administrative fine under Section 76(4) of the Act; (c) Immediate investigation and corrective action against the accused.`,
        },
        {
          heading: "7. List of Verified Evidence Attached",
          body: "(1) Verified digital payment receipt / TrxID confirmation SMS; (2) Screenshot logs of conversation/order confirmation; (3) Copy of Complainant NID/identity card.",
        },
      ],
      submissionInstructions: {
        authority: "Directorate of National Consumer Rights Protection (DNCRP)",
        email: "dg-dncrp@dncrp.gov.bd",
        hotline: "16121",
        portalUrl: "https://dncrp.portal.gov.bd",
        address: "TCB Bhaban (8th Floor), 1 Karwan Bazar, Dhaka-1215",
      },
    };
  }

  return {
    title: "ভোক্তা অধিকার সংরক্ষণ আইন, ২০০৯ অনুযায়ী আনুষ্ঠানিক অভিযোগপত্র",
    statutoryReference: "ভোক্তা অধিকার সংরক্ষণ আইন, ২০০৯ (২০০৯ সনের ২৬ নং আইন)-এর ধারা ৪৫ ও ৫২",
    clauses: [
      {
        heading: "বরাবর ও কার্যালয়",
        body: "বরাবর: মহাপরিচালক, জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তর, টিসিবি ভবন (৮ম তলা), ১ কারওয়ান বাজার, ঢাকা-১২১৫।",
      },
      {
        heading: "১. অভিযোগকারীর বিবরণ",
        body: `নাম: ${input.complainantName || "[অভিযোগকারীর নাম]"} | মোবাইল: ${bnDigits(input.complainantPhone || "[ফোন]")} | ঠিকানা: ${input.complainantAddress || "[ঠিকানা]"}${input.complainantNid ? ` | জাতীয় পরিচয়পত্র (এনআইডি): ${bnDigits(input.complainantNid)}` : ""}`,
      },
      {
        heading: "২. অভিযুক্ত প্রতিষ্ঠান / ব্যবসায়ীর বিবরণ",
        body: `প্রতিষ্ঠানের নাম: ${input.accusedParty || "[প্রতিষ্ঠান বা বিক্রেতার নাম]"} | যোগাযোগের নম্বর: ${bnDigits(input.accusedPhone || "[উপলব্ধ নেই]")} | ঠিকানা / অনলাইন পেজ: ${input.accusedAddress || "[উপলব্ধ নেই]"}`,
      },
      {
        heading: "৩. লেনদেন ও অর্থপ্রদানের বিবরণ",
        body: `লেনদেনের তারিখ: ${bnDigits(input.transactionDate || "[তারিখ]")} | পেমেন্ট চ্যানেল: ${input.transactionChannel || "[চ্যানেল]"} | ট্রানজেকশন আইডি (TrxID): ${input.transactionTrxId || "[TrxID]"} | মোট পরিশোধিত অর্থ: ${bnDigits(bdt(input.claimedAmountBdt))} | পণ্য বা সেবা: ${input.productOrService || "[পণ্য বা সেবার বিবরণ]"}`,
      },
      {
        heading: "৪. ঘটনার সারসংক্ষেপ ও প্রতারণার বিবরণ",
        highlight: true,
        body: `${input.disputeSummary || "অভিযুক্ত পক্ষ অর্থ গ্রহণ করা সত্ত্বেও প্রতিশ্রুতি অনুযায়ী পণ্য বা সেবা সরবরাহ করেনি।"} বারবার যোগাযোগ করা সত্ত্বেও কোনো সুরাহা প্রদান করা হয়নি, যা স্পষ্টত প্রতারণামূলক ব্যবসায়িক কর্মকাণ্ড।`,
      },
      {
        heading: "৫. আইনি বিধান ও আইন লঙ্ঘনের বিবরণ",
        body: "অভিযুক্তের এই কার্যক্রম ভোক্তা অধিকার সংরক্ষণ আইন, ২০০৯-এর ধারা ৪৫ (প্রতিশ্রুত পণ্য বা সেবা যথাযথভাবে প্রদান না করা) এবং ধারা ৫২ (প্রতারণামূলক কার্য ও মিথ্যা আশ্বাস)-এর স্পষ্ট লঙ্ঘন এবং দণ্ডনীয় অপরাধ।",
      },
      {
        heading: "৬. প্রার্থিত প্রতিকার",
        body: `অতএব, বিনীত প্রার্থনা এই যে: (ক) অভিযোগকারীকে ${remedyTextBn} প্রদানের আদেশ দান; (খ) আইনের ধারা ৭৬(৪) মোতাবেক আরোপিত জরিমানার ২৫% অংশ অভিযোগকারীকে প্রদানের ব্যবস্থা গ্রহণ; (গ) অভিযুক্ত প্রতিষ্ঠানের বিরুদ্ধে আইনি ব্যবস্থা গ্রহণ।`,
      },
      {
        heading: "৭. সংযুক্ত প্রমাণাদির তালিকা",
        body: "(১) বিকাশ/নগদ/ব্যাংক পেমেন্টের মূল ট্রানজেকশন আইডি ও এসএমএস কপি; (২) যোগাযোগের চ্যাট স্ক্রিনশট ও অর্ডারের প্রমাণ; (৩) অভিযোগকারীর এনআইডি কার্ডের অনুলিপি।",
      },
    ],
    submissionInstructions: {
      authority: "জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তর (DNCRP)",
      email: "dg-dncrp@dncrp.gov.bd",
      hotline: "১৬১২১",
      portalUrl: "https://dncrp.portal.gov.bd",
      address: "টিসিবি ভবন (৮ম তলা), ১ কারওয়ান বাজার, ঢাকা-১২১৫",
    },
  };
}

export function buildFreelancerPaymentDemand(input: FreelancerDemandInput, lang: "en" | "bn"): DisputeNotice {
  const amtStr = input.currency === "USD"
    ? `US$${input.amountOwed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `৳${Math.round(input.amountOwed).toLocaleString("en-US")}`;

  if (lang === "en") {
    return {
      title: "Formal Legal Notice for Unpaid Service Invoice & Demand for Payment",
      statutoryReference: "Section 73, Contract Act 1872 & International Cross-Border Commercial Customs",
      clauses: [
        {
          heading: "Notice Details",
          body: `Date: ${input.invoiceDate} | Demand to: ${input.clientName} (${input.clientCompany || "Client Organization"}), ${input.clientCountry} | From: ${input.freelancerName}, Independent Contractor (${input.freelancerCountry})`,
        },
        {
          heading: "Delivered Scope & Milestone",
          body: `Project: ${input.projectTitle} | Milestone Delivered: ${input.milestoneDelivered} | Invoice Ref: ${input.invoiceNumber} | Agreed Due Date: ${input.dueDate}`,
        },
        {
          heading: "Default & Unpaid Balance",
          highlight: true,
          body: `As of this notice date, the sum of ${amtStr} remains outstanding and in default for services rendered and delivered in good faith.`,
        },
        {
          heading: "Cure Period & Action",
          body: `You are hereby formally requested to cure this default within ${input.curePeriodDays} calendar days by releasing the outstanding balance of ${amtStr} into the Contractor's designated account. Failure to do so will result in: (a) Filing a non-payment dispute with the respective payment network and freelancing platform; (b) Escalation to commercial mediation and statutory registries; (c) Immediate revocation of all intellectual property licenses granted for the delivered deliverables under Clause 8.`,
        },
      ],
      submissionInstructions: {
        authority: "Freelancer Rights & Cross-Border Payment Dispute Registry",
        email: input.freelancerEmail,
        hotline: "N/A",
        portalUrl: "https://kormopath.org/chuktiguard",
        address: "Dhaka, Bangladesh",
      },
    };
  }

  return {
    title: "বকেয়া পারিশ্রমিক পরিশোধের আনুষ্ঠানিক দাবি নোটিশ (Payment Demand Notice)",
    statutoryReference: "চুক্তি আইন ১৮৭২ (Contract Act 1872)-এর ধারা ৭৩ ও আন্তর্জাতিক বাণিজ্যিক নীতি",
    clauses: [
      {
        heading: "নোটিশের তথ্য",
        body: `তারিখ: ${bnDigits(input.invoiceDate)} | প্রাপক: ${input.clientName} (${input.clientCompany || "ক্লায়েন্ট প্রতিষ্ঠান"}), ${input.clientCountry} | প্রেরক: ${input.freelancerName}, স্বাধীন ঠিকাদার (${input.freelancerCountry})`,
      },
      {
        heading: "সম্পন্ন কাজের বিবরণ",
        body: `প্রকল্প: ${input.projectTitle} | সম্পন্ন মাইলস্টোন: ${input.milestoneDelivered} | ইনভয়েস নং: ${input.invoiceNumber} | নির্ধারিত পরিশোধের তারিখ: ${bnDigits(input.dueDate)}`,
      },
      {
        heading: "বকেয়া অর্থের পরিমাণ",
        highlight: true,
        body: `আজকের তারিখ পর্যন্ত সম্পাদিত ও সরবরাহকৃত কাজের মোট ${bnDigits(amtStr)} অর্থ অপরিশোধিত ও বকেয়া রয়েছে।`,
      },
      {
        heading: "পরিশোধের সময়সীমা ও ব্যবস্থা",
        body: `এই নোটিশ জারির ${bnDigits(input.curePeriodDays)} দিনের মধ্যে বকেয়া ${bnDigits(amtStr)} অর্থ পরিশোধের জন্য অনুরোধ জানানো হচ্ছে। নির্ধারিত সময়ের মধ্যে পরিশোধে ব্যর্থ হলে: (ক) পেমেন্ট নেটওয়ার্ক ও প্ল্যাটফর্মে আনুষ্ঠানিক কমপ্লেইন দায়ের; (খ) আইনি বিরোধ নিষ্পত্তি ও মধ্যস্থতা উদ্যোগ; (গ) সরবরাহকৃত কাজের মেধাস্বত্ব লাইসেন্স স্বয়ংক্রিয়ভাবে প্রত্যাহার করা হবে।`,
      },
    ],
    submissionInstructions: {
      authority: "ফ্রিল্যান্সার কন্ট্রাক্ট ও পেমেন্ট প্রটেকশন শাখা (চুক্তিগার্ড)",
      email: input.freelancerEmail,
      hotline: "প্রযোজ্য নয়",
      portalUrl: "https://kormopath.org/chuktiguard",
      address: "ঢাকা, বাংলাদেশ",
    },
  };
}
