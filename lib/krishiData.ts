/*
 * MaathSathi reference data. NO imports. Every entry names its official source and the date it was
 * checked; anything that could not be confirmed on an official site was left out on purpose.
 *
 * Helplines were read on 2026-11-17:
 *  - 16123 Krishi Call Centre: Agriculture Information Service (AIS) page "কৃষি কল সেন্টার"
 *  - 16358 Livestock call centre: Department of Livestock Services (DLS) home page notice
 *  - 333 and 999: the national helpline list embedded in the bangladesh.gov.bd portal pages (dae.gov.bd)
 * Support programmes come from FieldShift 360's data file (src/data/support/bd_support.js, checked
 * 2026-11-04). Only entries whose source is an official government or central-bank site are kept;
 * the official sites were re-opened on 2026-11-17. No amounts are shown because they change by season.
 */

export const KRISHI_CHECKED = "2026-11-17";

export interface Helpline {
  number: string;
  numberBn: string;
  nameBn: string;
  nameEn: string;
  forBn: string;
  hoursBn: string;
  costBn?: string;
  source: { label: string; url: string; checked: string };
}

export const HELPLINES: Helpline[] = [
  {
    number: "16123",
    numberBn: "১৬১২৩",
    nameBn: "কৃষি কল সেন্টার",
    nameEn: "Krishi Call Centre",
    forBn: "ফসল, রোগ-পোকা, সার ও ওষুধের মাত্রা — যেকোনো কৃষি প্রশ্ন বিশেষজ্ঞকে জিজ্ঞাসা করুন।",
    hoursBn: "সকাল ৮টা থেকে রাত ৮টা; শুক্র, শনি ও সরকারি ছুটির দিন বন্ধ",
    costBn: "যেকোনো অপারেটর থেকে প্রতি মিনিট ২৫ পয়সা (ভ্যাট ও সম্পূরক শুল্ক ছাড়া)",
    source: { label: "কৃষি তথ্য সার্ভিস (AIS)", url: "https://ais.gov.bd/pages/static-pages/6922df5e933eb65569e21833", checked: KRISHI_CHECKED },
  },
  {
    number: "16358",
    numberBn: "১৬৩৫৮",
    nameBn: "প্রাণিসম্পদ কল সেন্টার",
    nameEn: "Livestock call centre",
    forBn: "গরু, ছাগল, হাঁস-মুরগির অসুখ, টিকা ও খাবার নিয়ে পরামর্শ।",
    hoursBn: "শুধু অফিস চলাকালীন সময়ে",
    source: { label: "প্রাণিসম্পদ অধিদপ্তর (DLS)", url: "https://dls.gov.bd", checked: KRISHI_CHECKED },
  },
  {
    number: "333",
    numberBn: "৩৩৩",
    nameBn: "সরকারি তথ্য ও সেবা",
    nameEn: "Government information and services",
    forBn: "কোন অফিসে কী সেবা, কোথায় যেতে হবে — জানতে।",
    hoursBn: "জাতীয় হেল্পলাইন",
    source: { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন (dae.gov.bd-তে প্রদর্শিত)", url: "https://dae.gov.bd", checked: KRISHI_CHECKED },
  },
  {
    number: "999",
    numberBn: "৯৯৯",
    nameBn: "জরুরি সেবা",
    nameEn: "Emergency services",
    forBn: "দুর্ঘটনা, আগুন, বিষক্রিয়া বা জীবনের ঝুঁকি হলে।",
    hoursBn: "২৪ ঘণ্টা",
    source: { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন (dae.gov.bd-তে প্রদর্শিত)", url: "https://dae.gov.bd", checked: KRISHI_CHECKED },
  },
];

export interface SupportProgram {
  id: string;
  nameBn: string;
  byBn: string;
  benefitBn: string;
  whoBn: string;
  docsBn: string[];
  whereBn: string;
  rule: { needs?: string[]; maxDecimals?: number };
  source: { label: string; url: string; checked: string };
}

const FS_NOTE = "FieldShift 360 তথ্যভান্ডার, যাচাই ২০২৬-১১-০৪; অফিসিয়াল সাইট খোলা হয়েছে ২০২৬-১১-১৭";

export const SUPPORT: SupportProgram[] = [
  {
    id: "krishi_card",
    nameBn: "কৃষি উপকরণ সহায়তা কার্ড",
    byBn: "কৃষি সম্প্রসারণ অধিদপ্তর (DAE)",
    benefitBn: "সরকারি তালিকায় কৃষক হিসেবে নাম ওঠে। প্রণোদনা, ১০ টাকার ব্যাংক হিসাব আর অনেক সহায়তার আগে এটাই লাগে।",
    whoBn: "যিনি নিজে চাষ করেন: নিজের জমি, বর্গা বা লিজ",
    docsBn: ["জাতীয় পরিচয়পত্র", "ছবি", "জমির কাগজ, বা বর্গার কথা ইউনিয়নের কৃষি কর্মকর্তাকে জানান"],
    whereBn: "ইউনিয়নের উপসহকারী কৃষি কর্মকর্তা (SAAO) বা উপজেলা কৃষি অফিস",
    rule: {},
    source: { label: `DAE · ${FS_NOTE}`, url: "https://dae.gov.bd", checked: KRISHI_CHECKED },
  },
  {
    id: "ten_taka",
    nameBn: "১০ টাকার কৃষি ব্যাংক হিসাব",
    byBn: "বাংলাদেশ ব্যাংক ও তফসিলি ব্যাংক",
    benefitBn: "অল্প টাকা জমা দিয়ে ব্যাংক হিসাব। সরকারি সহায়তা আর কৃষিঋণ সরাসরি এখানে আসে।",
    whoBn: "কৃষি কার্ড আছে এমন কৃষক",
    docsBn: ["কৃষি কার্ড", "জাতীয় পরিচয়পত্র", "ছবি"],
    whereBn: "কাছের ব্যাংক শাখা বা এজেন্ট ব্যাংকিং কেন্দ্র",
    rule: { needs: ["krishi_card"] },
    source: { label: `বাংলাদেশ ব্যাংক · ${FS_NOTE}`, url: "https://www.bb.org.bd", checked: KRISHI_CHECKED },
  },
  {
    id: "soil_test",
    nameBn: "মাটি পরীক্ষা",
    byBn: "মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI)",
    benefitBn: "জমির মাটির নমুনা পরীক্ষা করে কোন সার কতটা লাগবে তার সুপারিশ। পরীক্ষার ফল “আমার জমি”-তে লিখে রাখতে পারেন।",
    whoBn: "যেকোনো কৃষক",
    docsBn: ["জমির কয়েক জায়গা থেকে নেওয়া মাটির নমুনা", "জমির অবস্থান ও আগের ফসলের নাম"],
    whereBn: "জেলার SRDI আঞ্চলিক গবেষণাগার, উপজেলা কৃষি অফিস বা ভ্রাম্যমাণ মাটি পরীক্ষা কর্মসূচি",
    rule: {},
    source: { label: `SRDI · ${FS_NOTE}`, url: "https://srdi.gov.bd", checked: KRISHI_CHECKED },
  },
  {
    id: "call_16123",
    nameBn: "কৃষি কল সেন্টারের পরামর্শ",
    byBn: "কৃষি তথ্য সার্ভিস (AIS)",
    benefitBn: "ফোনে কৃষি বিশেষজ্ঞের পরামর্শ, ওষুধ ও সারের মাত্রাসহ।",
    whoBn: "সবাই",
    docsBn: [],
    whereBn: "যেকোনো মোবাইল থেকে ১৬১২৩",
    rule: {},
    source: { label: "কৃষি তথ্য সার্ভিস (AIS)", url: "https://ais.gov.bd/pages/static-pages/6922df5e933eb65569e21833", checked: KRISHI_CHECKED },
  },
];

/** Agricultural holding classes (decimals) as used in Bangladesh census reporting. */
export const HOLDING_SOURCE = { label: "BBS কৃষি শুমারির খামার শ্রেণি (FieldShift 360 তথ্যভান্ডারের নোট)", url: "https://bbs.gov.bd", checked: "2026-11-04" };

/** General rotation principle shown next to the rotation check. */
export const ROTATION_SOURCE = { label: "FAO: Conservation Agriculture — crop rotation", url: "https://www.fao.org/conservation-agriculture/en/", checked: KRISHI_CHECKED };
