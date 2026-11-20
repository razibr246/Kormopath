/**
 * Pure domain logic for MaathSathi Multimodal Crop & Leaf Vision
 * Strictly enforces the agricultural safety invariant:
 * NO chemical pesticide doses; always cite Krishi Call Centre 16123 and official product labels.
 * 
 * Zero external imports — unit-tested in tests/crop-vision.test.ts.
 */

export interface CropVisionAnalysis {
  cropIdentified: string;
  condition: "healthy" | "pest_infestation" | "fungal_or_bacterial" | "nutrient_deficiency" | "unclear";
  symptomsObserved: string[];
  possibleCausesBn: string[];
  safeRemediesBn: string[];
  warningNoticeBn: string;
}

const DOSE_REGEX = /(?:\d+(?:\.\d+)?\s*(?:ml|m\.l\.|drop|tsp|tbsp|kg)\b|\d+(?:\.\d+)?\s*(?:গ্রাম|মিলি|লিটার|কেজি)|\d+\s*(?:মিলি|গ্রাম)\s*[\/|\\]\s*লিটার)/gi;

/**
 * Enforces the agricultural no-dose safety guardrail.
 * If the model output inadvertently includes pesticide dosing numbers,
 * it sanitizes them and inserts the official helpline guidance.
 */
export function sanitizeCropAdvice(text: string): {
  cleanText: string;
  dosesRemoved: boolean;
} {
  if (!text) return { cleanText: "", dosesRemoved: false };

  const hadDoses = DOSE_REGEX.test(text);
  let cleanText = text.replace(DOSE_REGEX, "[অনুমোদিত মাত্রা প্যাকেটের লেবেল দেখে নিন]");

  if (hadDoses) {
    cleanText += "\n\n⚠️ কীটনাশকের সুনির্দিষ্ট মাত্রা বা ব্যবহারের জন্য নিকটস্থ কৃষি কর্মকর্তা অথবা কৃষি কল সেন্টার ১৬১২৩-এ যোগাযোগ করুন।";
  }

  return {
    cleanText,
    dosesRemoved: hadDoses,
  };
}

/** Prepares system instruction for crop leaf vision diagnosis */
export function buildCropVisionSystemPrompt(): string {
  return `You are MaathSathi Agricultural Vision Assistant, helping Bangladeshi farmers identify crop issues from leaf and plant photos.
Follow these STRICT SAFETY RULES:
1. Identify the crop and visible symptoms (blight, blast, stem borer, nutrient deficiency, or healthy).
2. DO NOT provide specific chemical dosages or ml/liter measurements. Always instruct the farmer to check the approved manufacturer packaging or call Krishi Call Centre 16123.
3. Suggest organic cultural practices first (water drainage, weeding, balanced urea/potash, neem extract).
4. Provide advice in clear, supportive Bangladeshi Bangla.
Return JSON matching the schema.`;
}
