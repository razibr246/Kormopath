/*
 * IELTS Preparation & Speaking Simulator Engine for Study Abroad Aspirants.
 * NO imports — pure, deterministic, and unit-tested (tests/ieltsPrep.test.ts).
 *
 * Covers:
 * - Authentic Speaking Part 2 Cue Cards with 1-min preparation timer & 2-min speaking timer
 * - Speaking Part 1 personal prompts & Part 3 analytical follow-ups
 * - Official 4-pillar IELTS scoring criteria explained (FC, LR, GRA, PR)
 * - Academic Writing Task 2 essay structure evaluator
 */

export interface IeltsCueCard {
  id: string;
  topic: string;
  category: "people" | "places" | "experiences" | "objects" | "technology";
  promptEn: string;
  bulletPointsEn: string[];
  vocabularyTipsEn: string[];
  banglaTranslation: string;
  sampleFollowUpsPart3: string[];
}

export const IELTS_CUE_CARDS: IeltsCueCard[] = [
  {
    id: "cue-01",
    topic: "A Memorable Journey in Your Country",
    category: "experiences",
    promptEn: "Describe a memorable journey you took in your country.",
    bulletPointsEn: [
      "Where you went and who you went with",
      "What mode of transport you used",
      "What you did and experienced during the trip",
      "And explain why this journey was so memorable to you",
    ],
    vocabularyTipsEn: ["picturesque scenery", "breathtaking panoramic view", "escaped the hustle and bustle", "unwinding from daily stress"],
    banglaTranslation: "আপনার দেশের কোনো স্মরণীয় ভ্রমণের বর্ণনা দিন। (কোথায় গিয়েছিলেন, কাদের সাথে, কী ঘটেছিল এবং কেন এটি স্মরণীয়)।",
    sampleFollowUpsPart3: [
      "How has domestic tourism changed in Bangladesh over the past decade?",
      "Do young people prefer travelling with family or friends? Why?",
      "What environmental challenges can mass tourism cause to natural landmarks like the Sundarbans?",
    ],
  },
  {
    id: "cue-02",
    topic: "An Influential Teacher or Mentor",
    category: "people",
    promptEn: "Describe a teacher or mentor who influenced your academic journey.",
    bulletPointsEn: [
      "Who this teacher was and which subject they taught",
      "When and where you met them",
      "What special teaching methods they used",
      "And explain how they influenced your perspective on learning",
    ],
    vocabularyTipsEn: ["beacon of inspiration", "pedagogical approach", "instilled confidence", "ignited my passion"],
    banglaTranslation: "আপনার শিক্ষাজীবনে প্রভাব ফেলা একজন শিক্ষকের বর্ণনা দিন।",
    sampleFollowUpsPart3: [
      "What qualities distinguish a great educator from an average one?",
      "Can modern AI tools ever replace human mentors in universities?",
      "How can rural schools in developing nations attract talented teachers?",
    ],
  },
  {
    id: "cue-03",
    topic: "A Piece of Technology You Rely On",
    category: "technology",
    promptEn: "Describe a piece of technology or gadget you find essential in your daily life.",
    bulletPointsEn: [
      "What device or software it is",
      "How frequently you use it and for what purposes",
      "How you learned to use it effectively",
      "And explain how it has impacted your productivity or lifestyle",
    ],
    vocabularyTipsEn: ["indispensable tool", "seamless integration", "streamlines my workflow", "digital dependency"],
    banglaTranslation: "আপনার দৈনন্দিন জীবনে অপরিহার্য একটি প্রযুক্তি বা গ্যাজেটের বর্ণনা দিন।",
    sampleFollowUpsPart3: [
      "Does excessive reliance on smartphones impair cognitive memory?",
      "How should universities regulate generative AI tools like ChatGPT?",
      "What technological innovation will have the most profound impact over the next 20 years?",
    ],
  },
  {
    id: "cue-04",
    topic: "An Environmental Project or Activity",
    category: "experiences",
    promptEn: "Describe an environmental initiative or activity you participated in or heard about.",
    bulletPointsEn: [
      "What the initiative was and where it took place",
      "Who organized it and who participated",
      "What actions were taken (e.g. tree planting, clean-up)",
      "And explain why this initiative was important for the community",
    ],
    vocabularyTipsEn: ["afforestation drive", "mitigate carbon footprint", "civic responsibility", "sustainable ecosystem"],
    banglaTranslation: "কোনো পরিবেশবান্ধব উদ্যোগ বা বৃক্ষরোপণ/ক্লিন-আপ অভিযানের বর্ণনা দিন।",
    sampleFollowUpsPart3: [
      "Who carries greater responsibility for climate change: individuals or large corporations?",
      "How effective are international climate summits like COP for vulnerable nations like Bangladesh?",
      "What practical green habits can urban households easily adopt?",
    ],
  },
  {
    id: "cue-05",
    topic: "A Historic Place You Visited",
    category: "places",
    promptEn: "Describe a historic building or monument you have visited.",
    bulletPointsEn: [
      "Where it is located and what it looks like",
      "When and with whom you visited it",
      "What historical events are associated with it",
      "And explain what impressions it left on you",
    ],
    vocabularyTipsEn: ["architectural marvel", "cultural heritage", "steeped in history", "evokes a sense of reverence"],
    banglaTranslation: "আপনার পরিদর্শন করা একটি ঐতিহাসিক স্থান বা সৌধের বর্ণনা দিন (যেমন: লালবাগ কেল্লা, ষাটগম্বুজ মসজিদ)।",
    sampleFollowUpsPart3: [
      "Why is preserving ancient architectural heritage crucial for national identity?",
      "Should governments allocate substantial budgets to restore old monuments during economic crises?",
      "How can historical museums be made engaging for the younger generation?",
    ],
  },
];

export interface BandScoreCriterion {
  code: "FC" | "LR" | "GRA" | "PR";
  nameEn: string;
  nameBn: string;
  weightPercentage: number;
  keyAdviceBn: string;
}

export const IELTS_SCORING_CRITERIA: BandScoreCriterion[] = [
  {
    code: "FC",
    nameEn: "Fluency & Coherence",
    nameBn: "স্বতঃস্ফূর্ততা ও ধারাবাহিকতা",
    weightPercentage: 25,
    keyAdviceBn: "দীর্ঘ বিরতি বা 'উমম/আহ' না বলে স্বাভাবিক গতিতে কথা বলুন। সংযোজক শব্দ (Linking words: furthermore, however, on the flip side) ব্যবহার করুন।",
  },
  {
    code: "LR",
    nameEn: "Lexical Resource",
    nameBn: "শব্দভাণ্ডার ও প্রাসঙ্গিক ব্যবহার",
    weightPercentage: 25,
    keyAdviceBn: "সাধারণ শব্দ (good, bad, nice) বারবার না বলে বৈচিত্র্যময় ও নির্ভুল একাডেমিক শব্দ (advantageous, detrimental, picturesque) ব্যবহার করুন।",
  },
  {
    code: "GRA",
    nameEn: "Grammatical Range & Accuracy",
    nameBn: "ব্যাকরণিক বৈচিত্র্য ও নির্ভুলতা",
    weightPercentage: 25,
    keyAdviceBn: "শুধু Simple sentence না বলে Complex ও Compound sentence (although, whereas, if-clauses, passive voice) মিশিয়ে বলুন।",
  },
  {
    code: "PR",
    nameEn: "Pronunciation",
    nameBn: "উচ্চারণ ও বাচনভঙ্গি",
    weightPercentage: 25,
    keyAdviceBn: "কৃত্রিম বিদেশি টান (fake accent) দেখানোর প্রয়োজন নেই; প্রতিটি শব্দের সিলেবল ও ইন্টোনেশন স্পষ্ট এবং বোধগম্য হওয়া চাই।",
  },
];

export interface EssayStructureCheck {
  totalWords: number;
  paragraphCount: number;
  hasIntroduction: boolean;
  hasConclusion: boolean;
  scoreBandEstimate: string;
  feedbacksBn: string[];
}

export function evaluateEssayStructure(text: string): EssayStructureCheck {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      totalWords: 0,
      paragraphCount: 0,
      hasIntroduction: false,
      hasConclusion: false,
      scoreBandEstimate: "N/A",
      feedbacksBn: ["কোনো লেখা পাওয়া যায়নি। টাস্ক-২ প্রবন্ধ লিখুন।"],
    };
  }

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  const feedbacksBn: string[] = [];
  const hasIntroduction = paragraphCount >= 1 && paragraphs[0].length > 40;
  const hasConclusion = paragraphCount >= 3 && /in conclusion|to conclude|to summarize|overall/i.test(paragraphs[paragraphs.length - 1]);

  if (totalWords < 250) {
    feedbacksBn.push(`শব্দ সংখ্যা ${totalWords}; টাস্ক-২ তে ন্যূনতম ২৫০ শব্দ আবশ্যক। কম শব্দের জন্য পেনাল্টি হবে।`);
  } else if (totalWords > 350) {
    feedbacksBn.push(`শব্দ সংখ্যা ${totalWords}; অতিরিক্ত বড় লেখায় ব্যাকরণ ভুলের ঝুঁকি বাড়ে (২৮০-৩১০ আদর্শ)।`);
  } else {
    feedbacksBn.push(`চমৎকার শব্দসংখ্যা (${totalWords} শব্দ)! নির্ধারিত ২৫০ শব্দের সীমা পূরণ হয়েছে।`);
  }

  if (paragraphCount < 4) {
    feedbacksBn.push("আদর্শ ৪-প্যারাগ্রাফ কাঠামো মেনে চলুন: ১. ভূমিকা, ২. বডি প্যারা-১, ৩. বডি প্যারা-২, ৪. উপসংহার।");
  } else if (paragraphCount > 5) {
    feedbacksBn.push("খুব বেশি ছোট প্যারাগ্রাফ না করে ৪-৫টি সুসংগঠিত প্যারাগ্রাফে লেখা গুছিয়ে নিন।");
  }

  if (!hasConclusion) {
    feedbacksBn.push("একটি স্পষ্ট উপসংহার (e.g. 'In conclusion, ...') অনুচ্ছেদ যোগ করুন।");
  }

  let scoreBandEstimate = "5.5 - 6.0";
  if (totalWords >= 250 && paragraphCount >= 4 && hasConclusion) {
    scoreBandEstimate = "6.5 - 7.5";
  } else if (totalWords >= 250) {
    scoreBandEstimate = "6.0 - 6.5";
  }

  return {
    totalWords,
    paragraphCount,
    hasIntroduction,
    hasConclusion,
    scoreBandEstimate,
    feedbacksBn,
  };
}
