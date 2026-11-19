// Bangla versions of the English practice questions in lib/speech.ts, shown first so a
// Bangla speaker understands the question before answering. The English original stays
// one tap away, because the scoring terms and real interviews are in English.
// Custom (user-written) questions have no entry here and show as written.
export const PROMPT_BN: Record<string, string> = {
  "tech-race": "পেমেন্ট ওয়েবহুক যখন PostgreSQL-এ কোনো ইউজারের ব্যালান্স আপডেট করে, তখন রেস কন্ডিশন কীভাবে ঠেকাবেন?",
  "tech-queue": "সার্ভার রিস্টার্ট হলেও টিকে থাকে, এমন একটি ব্যাকগ্রাউন্ড জব কিউ কীভাবে ডিজাইন করবেন?",
  "tech-react": "একটি React ড্যাশবোর্ড সময়ের সঙ্গে ধীর হয়ে যাচ্ছে। কারণটা কীভাবে খুঁজবেন আর ঠিক করবেন?",
  "hr-intro": "আপনার নিজের সম্পর্কে বলুন।",
  "hr-weakness": "আপনার এমন একটি দুর্বলতা বলুন, যেটা নিয়ে আপনি কাজ করছেন।",
  "acad-project": "আপনার ফাইনাল ইয়ার প্রজেক্টটি ব্যাখ্যা করুন: সমস্যা কী ছিল, কোন পদ্ধতিতে কাজ করেছেন, আর ফলাফল কী।",
  "hr-conflict": "এমন একটি ঘটনা বলুন যখন টিমের কারও সঙ্গে আপনার মতের অমিল হয়েছিল। আপনি কী করেছিলেন?",
  "tech-rest-graphql": "REST আর GraphQL আর্কিটেকচারের তুলনা করুন। প্রোডাকশন সিস্টেমে কখন কোনটা বেছে নেবেন?",
  "tech-db-index": "ডেটাবেস ইনডেক্স ভেতরে কীভাবে কাজ করে, আর PostgreSQL-এ একটি ধীর কোয়েরি কীভাবে দ্রুত করবেন?",
  "tech-microservices": "একটি ইঞ্জিনিয়ারিং টিমের কখন মনোলিথিক আর্কিটেকচার থেকে মাইক্রোসার্ভিসে যাওয়া উচিত, আর কোন কোন ট্রেড-অফ সামলাতে হয়?",
  "acad-methodology": "থিসিস বা পেপারের জন্য লিটারেচার রিভিউ কীভাবে করেছেন, আর গবেষণা পদ্ধতি কীভাবে বেছে নিয়েছেন?",
  "acad-reviewer-feedback": "একজন পিয়ার রিভিউয়ার আপনার রিসার্চ পেপারের নতুনত্ব আর পরীক্ষামূলক যাচাই নিয়ে কড়া প্রশ্ন তুলেছেন। আপনি কীভাবে উত্তর দেবেন?",
  "hr-setback": "কোনো প্রজেক্টে বড় একটা টেকনিক্যাল বাধা বা অপ্রত্যাশিত সমস্যার কথা বলুন। STAR কাঠামো ধরে বলুন, কীভাবে সামলেছিলেন।",
};

export const LEVEL_BN: Record<string, string> = {
  beginner: "শুরুর স্তর",
  intermediate: "মাঝারি",
  advanced: "উন্নত",
};
