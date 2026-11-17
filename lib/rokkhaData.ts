/*
 * Rokkha (রক্ষা) reference data. NO imports. Every helpline and link names the official page it was
 * read from and the date it was checked. A number that could not be confirmed on an official site
 * was left out on purpose — never add one from memory.
 *
 * Checked on 2026-11-17:
 *  - 999, 333, 109, 1098: the "জরুরি সেবা নম্বরসমূহ" list on bangladesh.gov.bd (read directly).
 *  - 16236 and the complaint steps: Bangladesh Bank CIPC procedure page (read directly).
 *  - 16247: bkash.com contact and anti-fraud pages (the site refuses automated fetches, so the text was
 *    read from the search index of bkash.com itself, not from a third-party site).
 *  - 16167: Nagad's own contact/FAQ pages (same method as bKash).
 *  - 16121: dncrp.gov.bd / dncrp.portal.gov.bd pages (certificate error on direct fetch; text read from the
 *    search index of the official domain).
 *  - PCSW hotline 01320000888: Bangladesh Police portal page (police.portal.gov.bd, same method).
 *  - 1090: Ministry of Disaster Management and Relief e-service page "দুর্যোগের আগাম বার্তার জন্য আইভিআর ১০৯০"
 *    (modmr.gov.bd, from the official domain's search index), rechecked 2026-11-17. Note: the bangladesh.gov.bd
 *    emergency list prints "১০২" next to this service (the fire-service number), so we cite the ministry
 *    that runs the IVR and tell people to use 999 in an emergency.
 *  - BMD and FFWC: home pages opened directly; we link to them, we do not repeat their warnings.
 *
 * Dropped: no separate number for BMD or FFWC was found on their sites, so none is shown.
 *
 * Preparedness checklist: IFRC "Public awareness and public education for disaster risk reduction:
 * key messages" — Tropical cyclones (pp. 93–96) and Floods (pp. 99–101), 2021 edition PDFs on ifrc.org.
 * Items are short Bangla renderings of those messages; nothing was added.
 */

export const ROKKHA_CHECKED = "2026-11-17";

export interface Source {
  label: string;
  url: string;
  checked: string;
}

export interface RokkhaHelpline {
  id: string;
  number: string;
  numberBn: string;
  nameBn: string;
  nameEn: string;
  forBn: string;
  forEn: string;
  /** Extra caution shown next to the number. */
  noteBn?: string;
  group: "emergency" | "money" | "disaster";
  source: Source;
}

const PORTAL: Source = { label: "বাংলাদেশ জাতীয় তথ্য বাতায়ন", url: "https://bangladesh.gov.bd", checked: ROKKHA_CHECKED };

export const ROKKHA_HELPLINES: RokkhaHelpline[] = [
  {
    id: "999", number: "999", numberBn: "৯৯৯", nameBn: "জাতীয় জরুরি সেবা", nameEn: "National emergency service",
    forBn: "পুলিশ, ফায়ার সার্ভিস, অ্যাম্বুলেন্স — জীবন বা নিরাপত্তার ঝুঁকি থাকলে এখনই।",
    forEn: "Police, fire, ambulance — call now if a life or safety is at risk.",
    group: "emergency", source: PORTAL,
  },
  {
    id: "109", number: "109", numberBn: "১০৯", nameBn: "নারী ও শিশু নির্যাতন প্রতিরোধ", nameEn: "Violence against women and children",
    forBn: "নারী বা শিশুর ওপর নির্যাতন, হুমকি বা ব্ল্যাকমেইল।", forEn: "Abuse, threats or blackmail against women or children.",
    group: "emergency", source: PORTAL,
  },
  {
    id: "1098", number: "1098", numberBn: "১০৯৮", nameBn: "শিশু সহায়তা লাইন", nameEn: "Child helpline",
    forBn: "বিপদে থাকা শিশুর জন্য সহায়তা।", forEn: "Help for a child in danger.",
    group: "emergency", source: PORTAL,
  },
  {
    id: "333", number: "333", numberBn: "৩৩৩", nameBn: "সরকারি তথ্য ও সেবা", nameEn: "Government information and services",
    forBn: "কোন অফিসে কী সেবা, কোথায় অভিযোগ — সরকারি তথ্য জানতে।", forEn: "Which office handles what, and where to complain.",
    group: "emergency", source: PORTAL,
  },
  {
    id: "pcsw", number: "01320000888", numberBn: "০১৩২০০০০৮৮৮", nameBn: "পুলিশ সাইবার সাপোর্ট ফর উইমেন (PCSW)", nameEn: "Police Cyber Support for Women",
    forBn: "অনলাইনে হয়রানি, ছবি দিয়ে ব্ল্যাকমেইল বা ভুয়া আইডির শিকার নারীদের জন্য।",
    forEn: "For women facing online harassment, image-based blackmail or fake accounts.",
    noteBn: "ইমেইল: cybersupport.women@police.gov.bd · ফেসবুক: PCSW.PHQ",
    group: "emergency",
    source: { label: "বাংলাদেশ পুলিশ (police.portal.gov.bd)", url: "https://police.portal.gov.bd/site/page/e0c99d75-d7fc-4ccd-9023-a69df169c483", checked: ROKKHA_CHECKED },
  },
  {
    id: "bkash", number: "16247", numberBn: "১৬২৪৭", nameBn: "বিকাশ হেল্পলাইন", nameEn: "bKash helpline",
    forBn: "ভুল লেনদেন, প্রতারণা বা অ্যাকাউন্ট বন্ধ করতে — শুধু এই নম্বরেই যোগাযোগ করুন।",
    forEn: "Wrong transaction, fraud or blocking your account — use only this number.",
    noteBn: "বিকাশ জানায়: যাচাইয়ের একমাত্র নির্ভরযোগ্য উৎস ১৬২৪৭।",
    group: "money",
    source: { label: "bKash (bkash.com)", url: "https://www.bkash.com/en/help/contact-us", checked: ROKKHA_CHECKED },
  },
  {
    id: "nagad", number: "16167", numberBn: "১৬১৬৭", nameBn: "নগদ হেল্পলাইন", nameEn: "Nagad helpline",
    forBn: "লেনদেন বিরোধ, পিন ব্লক বা সন্দেহজনক কল যাচাই।", forEn: "Transaction disputes, blocked PIN or checking a suspicious call.",
    noteBn: "দেশের বাইরে থেকে: ০৯৬ ০৯৬ ১৬১৬৭। নগদ জানায়, তারা শুধু এই নম্বর থেকেই গ্রাহকের সঙ্গে যোগাযোগ করে।",
    group: "money",
    source: { label: "Nagad (nagad.com.bd)", url: "https://nagad.com.bd", checked: ROKKHA_CHECKED },
  },
  {
    id: "bb", number: "16236", numberBn: "১৬২৩৬", nameBn: "বাংলাদেশ ব্যাংক — গ্রাহক স্বার্থ সংরক্ষণ কেন্দ্র (CIPC)", nameEn: "Bangladesh Bank CIPC",
    forBn: "ব্যাংক বা এমএফএস নিজে সমাধান না করলে অভিযোগ — অফিস সময়ে, কর্মদিবসে।",
    forEn: "Complaints a bank or MFS did not resolve — office hours, working days.",
    noteBn: "ইমেইল: bb.cipc@bb.org.bd",
    group: "money",
    source: { label: "বাংলাদেশ ব্যাংক (bb.org.bd)", url: "https://www.bb.org.bd/en/index.php/services/cipc_procedure", checked: ROKKHA_CHECKED },
  },
  {
    id: "dncrp", number: "16121", numberBn: "১৬১২১", nameBn: "জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তর", nameEn: "Consumer rights (DNCRP)",
    forBn: "ভুয়া পণ্য, প্রতারণা বা অতিরিক্ত দাম নিয়ে ভোক্তা অভিযোগ।", forEn: "Consumer complaints: fake goods, cheating, overpricing.",
    noteBn: "অভিযোগের ইমেইল: nccc@dncrp.gov.bd",
    group: "money",
    source: { label: "DNCRP (dncrp.gov.bd)", url: "https://dncrp.gov.bd", checked: ROKKHA_CHECKED },
  },
  {
    id: "1090", number: "1090", numberBn: "১০৯০", nameBn: "দুর্যোগের আগাম বার্তা (আইভিআর)", nameEn: "Disaster early-warning IVR",
    forBn: "রেকর্ড করা আবহাওয়া, ঘূর্ণিঝড় ও বন্যার বার্তা শুনতে, যেকোনো সময়।",
    forEn: "Recorded weather, cyclone and flood messages, any time.",
    noteBn: "এটি রেকর্ড করা বার্তা; বিপদে পড়লে ৯৯৯-এ ফোন করুন।",
    group: "disaster",
    source: { label: "দুর্যোগ ব্যবস্থাপনা ও ত্রাণ মন্ত্রণালয় (modmr.gov.bd)", url: "https://modmr.gov.bd/pages/files/694031d4a31054345f0d16a0", checked: ROKKHA_CHECKED },
  },
];

/** Official places to read warnings. We link out; we never restate a warning. */
export const WARNING_LINKS: Array<{ id: string; nameBn: string; whatBn: string; source: Source }> = [
  {
    id: "bmd", nameBn: "বাংলাদেশ আবহাওয়া অধিদপ্তর (BMD)", whatBn: "ঘূর্ণিঝড় সংকেত, ভারী বৃষ্টি, বজ্রপাত ও তাপপ্রবাহের অফিসিয়াল সতর্কবার্তা।",
    source: { label: "bmd.gov.bd", url: "https://bmd.gov.bd/", checked: ROKKHA_CHECKED },
  },
  {
    id: "ffwc", nameBn: "বন্যা পূর্বাভাস ও সতর্কীকরণ কেন্দ্র (FFWC, পাউবো)", whatBn: "নদীর পানি ও বন্যার অফিসিয়াল পূর্বাভাস।",
    source: { label: "ffwc.gov.bd", url: "https://www.ffwc.gov.bd/", checked: ROKKHA_CHECKED },
  },
];

/** "Already lost money?" steps. The order for bank/MFS complaints is Bangladesh Bank's published procedure. */
export const RECOVERY_STEPS: Array<{ id: string; bn: string; en: string; source?: Source }> = [
  { id: "call-provider", bn: "যে মাধ্যমে টাকা গেছে, এখনই সেই প্রতিষ্ঠানের অফিসিয়াল হেল্পলাইনে ফোন করুন (বিকাশ ১৬২৪৭, নগদ ১৬১৬৭, বা আপনার ব্যাংক) — লেনদেন আইডি হাতে রাখুন।", en: "Call the official helpline of the service the money left through now (bKash 16247, Nagad 16167, or your bank). Keep the transaction ID ready." },
  { id: "no-more", bn: "প্রতারক আবার ফোন করলে আর কোনো টাকা, ওটিপি বা পিন দেবেন না — \"টাকা ফেরত দেব\" বলে আরও টাকা চাওয়াও প্রতারণা।", en: "If they call again, send nothing more and share no OTP or PIN. Asking for more money \"to refund you\" is part of the scam." },
  { id: "proof", bn: "এসএমএস, কল লিস্ট, চ্যাট আর স্ক্রিনশট মুছবেন না — এগুলোই প্রমাণ।", en: "Do not delete the SMS, call log, chats or screenshots. They are your evidence." },
  { id: "gd", bn: "নিকটস্থ থানায় সাধারণ ডায়েরি (জিডি) করুন; নিচের রিপোর্টটি কপি করে নিয়ে যান। হুমকি বা বিপদ থাকলে ৯৯৯।", en: "File a General Diary (GD) at the nearest police station; take the report below. If you are threatened or in danger, call 999." },
  { id: "escalate", bn: "প্রতিষ্ঠান সমাধান না করলে: প্রথমে শাখা, তারপর তাদের অভিযোগ সেল, তারপর বাংলাদেশ ব্যাংকের CIPC (১৬২৩৬) — চূড়ান্ত উত্তরের চিঠি ও কাগজপত্রসহ।", en: "If it is not resolved: the branch first, then the provider's complaint cell, then Bangladesh Bank CIPC (16236) with their final reply and your documents.", source: { label: "বাংলাদেশ ব্যাংক CIPC প্রক্রিয়া", url: "https://www.bb.org.bd/en/index.php/services/cipc_procedure", checked: ROKKHA_CHECKED } },
  { id: "women", bn: "অনলাইনে ছবি বা তথ্য দিয়ে ব্ল্যাকমেইল হলে (নারী): পুলিশ সাইবার সাপোর্ট ফর উইমেন ০১৩২০০০০৮৮৮।", en: "Image or data blackmail online (women): Police Cyber Support for Women 01320000888." },
];

export interface PrepItem {
  id: string;
  bn: string;
  en: string;
  hazard: "cyclone" | "flood" | "both";
}

const IFRC_CYCLONE: Source = { label: "IFRC Key Messages · Tropical cyclones (pp. 93–96)", url: "https://www.ifrc.org/sites/default/files/2021-06/17-CYCLONES-HR.pdf", checked: ROKKHA_CHECKED };
const IFRC_FLOOD: Source = { label: "IFRC Key Messages · Floods (pp. 99–101)", url: "https://www.ifrc.org/sites/default/files/2021-06/18-FLOODS-HR.pdf", checked: ROKKHA_CHECKED };
export const PREP_SOURCES = [IFRC_CYCLONE, IFRC_FLOOD];

/** Household readiness ticks, each a plain rendering of an IFRC key message (see header). */
export const PREP_CHECKLIST: PrepItem[] = [
  { id: "shelter-route", hazard: "both", bn: "পরিবারের সবাই জানে কোন আশ্রয়কেন্দ্রে যাবে, কোন পথে, আর আলাদা হয়ে গেলে কোথায় মিলবে।", en: "Everyone knows the shelter, the route, and where to meet if separated." },
  { id: "papers-waterproof", hazard: "both", bn: "জরুরি কাগজপত্র পানিরোধী ব্যাগে, আর কপি অন্য এলাকায় কারও কাছে রাখা আছে।", en: "Important papers are in a waterproof bag, with copies kept outside your area." },
  { id: "valuables-high", hazard: "both", bn: "যন্ত্রপাতি, পশুখাদ্য ও দামি জিনিস বন্যার পানির নাগালের ওপরে রাখা।", en: "Equipment, feed and valuables are stored above likely flood water." },
  { id: "go-bag", hazard: "both", bn: "যাওয়ার ব্যাগ তৈরি: পানি, শুকনো উচ্চশক্তির খাবার ও জরুরি যোগাযোগের নম্বর।", en: "Go-bag ready: water, high-energy food and emergency contact numbers." },
  { id: "medicines", hazard: "both", bn: "নিয়মিত ওষুধসহ নিজের প্রয়োজনীয় জিনিস দেখে রাখা।", en: "Personal supplies checked, including prescription medicines." },
  { id: "phone-charged", hazard: "both", bn: "মোবাইল ফোন চার্জ দেওয়া; রেডিও/টিভিতে খবর শোনা হচ্ছে।", en: "Phones charged; listening to radio or TV for information." },
  { id: "water-stored", hazard: "cyclone", bn: "বোতলে খাবার পানি, আর বড় পাত্রে ব্যবহারের পানি ভরে রাখা।", en: "Drinking water in bottles; large containers filled for washing." },
  { id: "loose-items", hazard: "cyclone", bn: "উড়ে যেতে পারে এমন জিনিস ঘরে আনা বা বেঁধে রাখা।", en: "Loose items that could fly are brought in or tied down." },
  { id: "animals", hazard: "both", bn: "পশুপাখি নিয়ে কী করবেন ঠিক করা — সঙ্গে নেওয়া বা উঁচু জায়গায় রাখা।", en: "A plan for animals: take them with you or move them to high ground." },
  { id: "evacuate-early", hazard: "both", bn: "কাঁচা বা হালকা ঘরে থাকলে আগেভাগে সরে যাওয়া; কর্তৃপক্ষ বললে সঙ্গে সঙ্গে।", en: "In a light or temporary house, leave early; leave at once if authorities say so." },
  { id: "eye-calm", hazard: "cyclone", bn: "ঝড় হঠাৎ থেমে গেলে বাইরে যাবেন না — সেটা ঝড়ের চোখ হতে পারে, বাতাস আবার আসবে।", en: "If the storm suddenly goes calm, stay put: it may be the eye, and the wind will return." },
  { id: "rope-float", hazard: "flood", bn: "বন্যাপ্রবণ এলাকায় দড়ি, মই আর ভেসে থাকার ব্যবস্থা (যেমন মুখবন্ধ খালি বোতল) রাখা।", en: "In flood areas: rope, a ladder and something to float on (e.g. capped bottles)." },
];
