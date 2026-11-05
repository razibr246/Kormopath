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
  // Integer cents, remainder goes to the last milestone so the parts always sum to the total.
  const cents = Math.round(valueUsd * 100);
  const parts = ms.map((m) => Math.floor((cents * m.pct) / 100));
  parts[parts.length - 1] += cents - parts.reduce((a, b) => a + b, 0);
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
