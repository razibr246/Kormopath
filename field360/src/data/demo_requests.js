import { addDays } from '../engine/dates.js';

const aiGuess = (k1, k2 = 'unclear') => [
  { k: k1, p: 0.56 },
  ...(k2 && k2 !== k1 ? [{ k: k2, p: 0.24 }] : []),
  { k: 'unclear', p: 0.14 },
];

const buildReq = (farmer, id, season, today, daysAgo, patch) => ({
  id,
  farmerId: farmer.id,
  union: farmer.union,
  village: farmer.village,
  villageBn: farmer.villageBn,
  lat: farmer.lat,
  lon: farmer.lon,
  status: 'open',
  demo: true,
  season,
  type: 'crop_doctor',
  ai: null,
  priority: 'Medium',
  ...patch,
  created: addDays(today, -daysAgo),
});

const RABI_DEFAULT_SPECS = [
  ['Saidpur', 'DIDARUL', 0, 1, { crop: 'tomato', symptom: 'early_blight', type: 'crop_doctor', priority: 'High', ai: aiGuess('early_blight', 'septoria'), text: { bn: 'উপকূলের কুয়াশার পর টমেটোর নিচের পাতায় গোল কালচে-বাদামি দাগ বাড়ছে', en: 'Dark brown ringed spots are spreading on lower tomato leaves after coastal fog' } }],
  ['Saidpur', null, 1, 2, { crop: 'tomato', symptom: 'fruit_borer', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('pest', 'early_blight'), text: { bn: 'কচি টমেটোর গায়ে ছিদ্র করে পোকা ঢুকছে', en: 'Borers are drilling into young green tomatoes on the lower truss' } }],
  ['Saidpur', null, 2, 1, { crop: 'boro', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'পাহাড়ি ঝিরির পানি কমে গেছে, বোরোর জমিতে লবণ উঠছে কি না চিন্তা হচ্ছে', en: 'Hill stream flow has dropped; worried salinity may creep into the Boro plot' } }],
  ['Saidpur', null, 3, 3, { crop: 'tomato', symptom: 'wilt', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('nutrient', 'septoria'), text: { bn: 'কয়েকটা টমেটো গাছ দুপুরে নেতিয়ে পড়ছে, গোড়াও একটু কালচে', en: 'Several tomato plants wilt every midday and show darkened stems near the soil' } }],
  ['Saidpur', null, 4, 4, { crop: 'mustard', symptom: 'alternaria', type: 'crop_doctor', priority: 'Low', ai: aiGuess('alternaria', 'septoria'), text: { bn: 'সরিষার পাতায় ছোট কালো দাগ দেখা দিয়েছে', en: 'Small black spots are appearing on mustard leaves near the ridge' } }],
  ['Saidpur', null, 5, 5, { crop: 'boro', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'আগাম টমেটো তোলার পর একই জমিতে কোন বোরো বা মুগ দিলে ভালো হয়?', en: 'After early tomato harvest, should this plot go to short-duration Boro or mungbean?' } }],

  ['Tildanga', 'PRAHLAD', 0, 0, { crop: 'boro', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'খালের পানিতে লবণ বেড়েছে, পোল্ডারের স্লুইস গেট দিয়ে সেচ নেওয়া যাচ্ছে না', en: 'Canal salinity has risen; we cannot draw water through the polder sluice gate' } }],
  ['Tildanga', null, 1, 2, { crop: 'lentil', symptom: 'root_rot', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('nutrient', 'alternaria'), text: { bn: 'লোনা জমির এক কোণে মসুর গাছ গোড়া পচে হলদে হয়ে যাচ্ছে', en: 'Lentil plants in the low saline corner are yellowing and rotting at the collar' } }],
  ['Tildanga', null, 2, 1, { crop: 'mustard', symptom: 'alternaria', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('alternaria', 'pest'), text: { bn: 'সরিষার পাতা ও শুঁটিতে গোল কালচে দাগ পড়েছে', en: 'Round dark blotches are showing on mustard leaves and young pods' } }],
  ['Tildanga', null, 3, 3, { crop: 'lentil', symptom: 'stemphylium', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('septoria', 'alternaria'), text: { bn: 'কুয়াশার পর মসুরের ডগা ঝলসে শুকিয়ে যাচ্ছে', en: 'Lentil shoot tips are scorching back after heavy coastal fog' } }],
  ['Tildanga', null, 4, 4, { crop: 'boro', symptom: 'question', type: 'question', priority: 'High', ai: null, text: { bn: 'রিজার্ভ পুকুরের মিষ্টি পানিতে কত শতাংশ জমিতে বোরো টিকবে?', en: 'How much Boro area can our fresh rainwater pond sustain without salt stress?' } }],
  ['Tildanga', null, 5, 5, { crop: 'wheat', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'সোলার পাম্পের সেচের পালা কবে পাব, জমিতে ফাটল ধরতে শুরু করেছে', en: 'When is our solar-pump irrigation turn? Surface cracks are starting to form' } }],

  ['Garuria', 'KADER', 0, 1, { crop: 'boro', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'পূর্ণিমার জোয়ারে খাল উপচে নিচু বীজতলায় পানি উঠছে', en: 'Spring high tide is overtopping the creek into the low Boro seedbed' } }],
  ['Garuria', null, 1, 2, { crop: 'mustard', symptom: 'white_rust', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('alternaria', 'septoria'), text: { bn: 'সরিষার পাতার নিচে সাদা গুঁড়োর মতো ফোসকা উঠেছে', en: 'White chalky blisters are forming under the mustard leaves' } }],
  ['Garuria', null, 2, 3, { crop: 'lentil', symptom: 'lentil_rust', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('septoria', 'nutrient'), text: { bn: 'মসুরের পাতায় মরিচার মতো বাদামি ফোটা দেখা যাচ্ছে', en: 'Rust-coloured pinhead spots are appearing on lentil leaves' } }],
  ['Garuria', null, 3, 2, { crop: 'boro', symptom: 'stem_borer', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('stem_borer', 'pest'), text: { bn: 'বোরোর জমির মাঝে মাঝে কচি ডগা শুকিয়ে সাদা হচ্ছে', en: 'Scattered dead-heart shoots are showing in the middle of the Boro plot' } }],
  ['Garuria', null, 4, 5, { crop: 'lentil', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'জোয়ারের ঝুঁকি থাকা বিলে বোরো নাকি আগে মুগডাল বোনা নিরাপদ হবে?', en: 'On tidal-creek clay land, is late mungbean safer than Boro paddy?' } }],

  ['Kolkanda', 'MOFIZUL', 0, 0, { crop: 'wheat', symptom: 'wheat_blast', type: 'crop_doctor', priority: 'High', ai: aiGuess('blast', 'alternaria'), text: { bn: 'কুয়াশার পর গমের শীষের ডগা হঠাৎ সাদা হয়ে শুকিয়ে যাচ্ছে', en: 'Wheat spikes are bleaching white from the tip right after dense fog' } }],
  ['Kolkanda', null, 1, 1, { crop: 'tomato', symptom: 'late_blight', type: 'crop_doctor', priority: 'High', ai: aiGuess('early_blight', 'septoria'), text: { bn: 'তীব্র কুয়াশায় টমেটোর পাতা রাতারাতি কালো হয়ে পচছে', en: 'Tomato leaves turned black and water-soaked overnight in dense cold fog' } }],
  ['Kolkanda', null, 2, 2, { crop: 'boro', symptom: 'cold', type: 'crop_doctor', priority: 'High', ai: aiGuess('nutrient', 'unclear'), text: { bn: 'শৈত্যপ্রবাহে বোরোর চারা হলুদ হয়ে বাড়তে পারছে না', en: 'Boro seedlings are stunted and yellow after four days of cold wave' } }],
  ['Kolkanda', null, 3, 2, { crop: 'mustard', symptom: 'aphid', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('pest', 'alternaria'), text: { bn: 'সরিষার কচি ডগায় কালো জাব পোকা ঝাঁকে বসেছে', en: 'Clusters of black aphids have settled on the tender mustard flower tips' } }],
  ['Kolkanda', null, 4, 4, { crop: 'wheat', symptom: 'spot_blotch', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('alternaria', 'septoria'), text: { bn: 'চরের গমের পাতায় ডিম্বাকার বাদামি দাগ বাড়ছে', en: 'Oval brown lesions are spreading on the char-land wheat leaves' } }],
  ['Kolkanda', null, 5, 5, { crop: 'mustard', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'তিস্তার বেলে-দোআঁশ মাটিতে কুয়াশা কমলে কী সার উপরি প্রয়োগ করব?', en: 'On Teesta sandy loam, what top-dressing dose works once the fog lifts?' } }],

  ['Rustampur', 'RAHIMA', 0, 1, { crop: 'boro', symptom: 'blast', type: 'crop_doctor', priority: 'High', ai: aiGuess('blast', 'sheath_blight'), text: { bn: 'হাওরের বোরো ধানের পাতায় মাকু আকৃতির দাগ, টক মাটিতে ছড়াচ্ছে', en: 'Spindle-shaped blast spots are spreading on haor Boro leaves on acid soil' } }],
  ['Rustampur', null, 1, 1, { crop: 'boro', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'আগাম পাহাড়ি ঢল নামার আগে বোরো ধান নিরাপদে কাটার তারিখ দরকার', en: 'Need the safe harvest window before early upstream hill flash floods arrive' } }],
  ['Rustampur', null, 2, 3, { crop: 'tomato', symptom: 'early_blight', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('early_blight', 'septoria'), text: { bn: 'বাড়ির উঁচু ভিটায় টমেটোর পাতায় চাকা চাকা বাদামি দাগ', en: 'Concentric brown spots on homestead tomato leaves above the flood line' } }],
  ['Rustampur', null, 3, 4, { crop: 'mustard', symptom: 'orobanche', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('nutrient', 'pest'), text: { bn: 'সরিষা গাছের গোড়ায় পরজীবী আগাছা উঠে গাছ দুর্বল হচ্ছে', en: 'Broomrape shoots around mustard roots are weakening the crop stand' } }],
  ['Rustampur', null, 4, 5, { crop: 'boro', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'আমাদের জমির মাটি বেশ টক — জমিতে ডলোচুন কতটুকু আর কবে দেব?', en: 'Our haor soil is quite acidic — how much dolomite lime should go in and when?' } }],
];

const AMAN_DEFAULT_SPECS = [
  ['Saidpur', 'DIDARUL', 0, 1, { crop: 'aman', symptom: 'bacterial_blight', type: 'crop_doctor', priority: 'High', ai: aiGuess('blast', 'sheath_blight'), text: { bn: 'পাহাড়ি ঢলের ঝাপটার পর আমন ধানের পাতার কিনারা শুকিয়ে সাদা হচ্ছে', en: 'Aman leaf edges are drying white from the tips after heavy hill squalls' } }],
  ['Saidpur', null, 1, 2, { crop: 'aman', symptom: 'stem_borer', type: 'crop_doctor', priority: 'High', ai: aiGuess('stem_borer', 'pest'), text: { bn: 'ধানের মাইজগাছ শুকিয়ে সাদা হয়ে টান দিলেই উঠে আসছে', en: 'Central tillers have dried white and pull out easily in the Aman paddy' } }],
  ['Saidpur', null, 2, 1, { crop: 'aman', symptom: 'water', type: 'water_alert', priority: 'Medium', ai: null, text: { bn: 'উজানের বৃষ্টি জমে নিচু জমির আমনের আইল উপচে পড়ছে', en: 'Hillside runoff is pooling over the lower Aman paddy bunds' } }],
  ['Saidpur', null, 3, 3, { crop: 'aman', symptom: 'sheath_blight', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('sheath_blight', 'blast'), text: { bn: 'গোছার খোলে চিতি পড়া ধূসর-সবুজ দাগ ওপরের দিকে উঠছে', en: 'Mottled grey-green sheath lesions are climbing up the Aman clumps' } }],
  ['Saidpur', null, 4, 4, { crop: 'aman', symptom: 'rice_bug', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('pest', 'stem_borer'), text: { bn: 'দুধ আসার সময় জমিতে গান্ধী পোকার গন্ধ ও চিটা দানা দেখা যাচ্ছে', en: 'Rice bugs are active at the milky grain stage leaving chaffy spots' } }],
  ['Saidpur', null, 5, 5, { crop: 'aman', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'আমন ধান কাটার কত দিন পর পাহাড়ি জমিতে আগাম টমেটো বসানো যাবে?', en: 'How many days after Aman harvest can we transplant early tomatoes here?' } }],

  ['Tildanga', 'PRAHLAD', 0, 0, { crop: 'aman', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'জোয়ারের চাপে পোল্ডারের নিচু আমন জমিতে নোনা পানি ঢুকছে', en: 'High tide is pushing brackish water into the lower polder Aman plots' } }],
  ['Tildanga', null, 1, 2, { crop: 'aman', symptom: 'bph', type: 'crop_doctor', priority: 'High', ai: aiGuess('bph', 'pest'), text: { bn: 'ঘন আমনের গোড়ায় বাদামি কারেন্ট পোকা দেখা যাচ্ছে', en: 'Brown planthoppers are clustering near the base of dense Aman clumps' } }],
  ['Tildanga', null, 2, 1, { crop: 'aman', symptom: 'sheath_blight', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('sheath_blight', 'blast'), text: { bn: 'ভ্যাপসা গরমে আমনের খোলে সাপ-দাগের মতো ছোপ ছোপ দাগ', en: 'Cobra-skin blotches are forming on Aman leaf sheaths in humid weather' } }],
  ['Tildanga', null, 3, 3, { crop: 'aman', symptom: 'stem_borer', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('stem_borer', 'bph'), text: { bn: 'জমির এক পাশে কয়েকটা ধানের শীষ পুরো সাদা চিটা হয়ে আছে', en: 'Several white empty heads are standing near the eastern bund' } }],
  ['Tildanga', null, 4, 4, { crop: 'aman', symptom: 'rodent', type: 'question', priority: 'Medium', ai: null, text: { bn: 'খালের বাঁধের পাশের জমিতে ইঁদুর পাকা ছড়া কেটে নিচ্ছে', en: 'Rats along the embankment are cutting ripening Aman panicles at night' } }],
  ['Tildanga', null, 5, 5, { crop: 'aman', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'আমন তোলার পর লবণ সহনশীল কোন ডাল বা সরিষা বোনা ভালো হবে?', en: 'Which salt-tolerant pulse or oilseed fits best once Aman comes off?' } }],

  ['Garuria', 'KADER', 0, 1, { crop: 'aman', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'জোয়ারের পানিতে নিচু জমির আমন ডুবে ছিল, পানি নামতে দেরি হচ্ছে', en: 'Tidal water lingered in the low Aman block; slow drainage is stressing the crop' } }],
  ['Garuria', null, 1, 2, { crop: 'aman', symptom: 'false_smut', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('sheath_blight', 'unclear'), text: { bn: 'ধানের শীষে কমলা-সবুজ রঙের ফোলা গুটি (লক্ষ্মীর গু) দেখা যাচ্ছে', en: 'Orange-green velvety smut balls are appearing on scattered Aman grains' } }],
  ['Garuria', null, 2, 2, { crop: 'aman', symptom: 'rodent', type: 'question', priority: 'High', ai: null, text: { bn: 'খালের পাড়ের আমন জমিতে ইঁদুর গাছ কেটে গর্ত করছে', en: 'Field rats from the canal bank are cutting Aman stems every night' } }],
  ['Garuria', null, 3, 4, { crop: 'aman', symptom: 'rice_bug', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('pest', 'stem_borer'), text: { bn: 'নরম দানায় পোকা বসে কালো দাগ ও চিটা করছে', en: 'Stink bugs are puncturing soft Aman grains and leaving dark spots' } }],
  ['Garuria', null, 4, 5, { crop: 'aman', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'ভেজা কাদা জমি থেকে আমন কাটার পর কবে খেসারি বা মুগ বুনব?', en: 'When can we relay-sow lathyrus or wait for mungbean after wet Aman harvest?' } }],

  ['Kolkanda', 'MOFIZUL', 0, 0, { crop: 'aman', symptom: 'blast', type: 'crop_doctor', priority: 'High', ai: aiGuess('blast', 'sheath_blight'), text: { bn: 'শিশিরের পর ধানের শীষের গিঁট কালো হয়ে ঘাড় ভেঙে পড়ছে', en: 'Neck nodes of Aman panicles are turning black and snapping after heavy dew' } }],
  ['Kolkanda', null, 1, 1, { crop: 'aman', symptom: 'sheath_blight', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('sheath_blight', 'blast'), text: { bn: 'তিস্তার কাছের নিচু জমিতে ধানের খোলে খোলপচা দাগ উঠেছে', en: 'Sheath lesions are climbing up the stems on moist riverside Aman plots' } }],
  ['Kolkanda', null, 2, 2, { crop: 'aman', symptom: 'bph', type: 'crop_doctor', priority: 'High', ai: aiGuess('bph', 'pest'), text: { bn: 'জমির মাঝখানে ধানের গোছা লালচে হয়ে বসে যাচ্ছে', en: 'Circular hopperburn patches are drying down in the middle of the Aman field' } }],
  ['Kolkanda', null, 3, 2, { crop: 'aman', symptom: 'water', type: 'water_alert', priority: 'Medium', ai: null, text: { bn: 'চরের উঁচু জমিতে টানা রোদে মাটি শুকিয়ে গেছে, সম্পূরক সেচ দেব কি?', en: 'Sandy char soil is drying out during grain fill — should we run supplemental irrigation?' } }],
  ['Kolkanda', null, 4, 4, { crop: 'aman', symptom: 'stem_borer', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('stem_borer', 'pest'), text: { bn: 'পাকা ছড়ার মাঝে কয়েকটি সম্পূর্ণ সাদা চিটা শীষ দেখা যাচ্ছে', en: 'Scattered white empty panicles are standing among ripening Aman plants' } }],
  ['Kolkanda', null, 5, 5, { crop: 'aman', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'এই আগাম আমন কেটে কখন গম বুনলে নভেম্বর-ডিসেম্বরের সেরা সময় পাব?', en: 'If we harvest early Aman this week, when should wheat sowing follow for cool grain fill?' } }],

  ['Rustampur', 'RAHIMA', 0, 1, { crop: 'aman', symptom: 'blast', type: 'crop_doctor', priority: 'High', ai: aiGuess('blast', 'sheath_blight'), text: { bn: 'ধানের গলার কাছে কালো দাগ পড়ে শীষ ভেঙে ঝুলে পড়ছে', en: 'Black neck lesions are snapping the Aman panicles just before maturity' } }],
  ['Rustampur', null, 1, 1, { crop: 'aman', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'উজানের বৃষ্টির ঢলে নিচু বিলের পাড়ে পানি বেড়েছে, আগাম কাটা নিরাপদ হবে কি?', en: 'Upstream rain has raised water along the haor rim; is an early cut advisable?' } }],
  ['Rustampur', null, 2, 2, { crop: 'aman', symptom: 'bacterial_blight', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('blast', 'nutrient'), text: { bn: 'ঝোড়ো বৃষ্টির পর পাতার কিনারা ধরে হলদে-সাদা পোড়া দাগ নামছে', en: 'Wavy yellow-white streaks are moving down the Aman leaf margins after storms' } }],
  ['Rustampur', null, 3, 4, { crop: 'aman', symptom: 'false_smut', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('sheath_blight', 'unclear'), text: { bn: 'ধানের ছড়ায় হলদে-কালো ফোলা গুটি রোগ দেখা যাচ্ছে', en: 'Spore balls of false smut are swelling on individual grains in the lower plot' } }],
  ['Rustampur', null, 4, 5, { crop: 'aman', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'আমন কাটার পর হাওরের জমিতে চুন দিয়ে বোরো বীজতলা কবে শুরু করব?', en: 'After cutting Aman, when should we apply lime and start the Boro seedbed?' } }],
];

// Diverse fallback pool keeps top-ups agronomically valid and avoids spurious same-symptom DBSCAN clusters.
const RABI_POOL = [
  { crop: 'tomato', symptom: 'wilt', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('nutrient', 'septoria'), text: { bn: 'টমেটো গাছ দুপুরের দিকে নেতিয়ে পড়ছে, গোড়া পরীক্ষা দরকার', en: 'Tomato plants droop around midday; need a wilt check before watering' } },
  { crop: 'lentil', symptom: 'root_rot', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('nutrient', 'alternaria'), text: { bn: 'মসুরের চারা গুচ্ছ ধরে হলদে হয়ে শুকিয়ে যাচ্ছে', en: 'Patches of lentil seedlings are yellowing and drying from the collar' } },
  { crop: 'boro', symptom: 'water', type: 'water_alert', priority: 'High', ai: null, text: { bn: 'জমিতে মাটি শুকিয়ে আসছে — আজ সেচ লাগবে না কি ২ দিন অপেক্ষা করব?', en: 'Plot topsoil is drying out — should I irrigate today or hold two days?' } },
  { crop: 'wheat', symptom: 'spot_blotch', type: 'crop_doctor', priority: 'Low', ai: aiGuess('alternaria', 'septoria'), text: { bn: 'গমের পাতায় হালকা বাদামি দাগ দেখা যাচ্ছে', en: 'Light brown oblong lesions are showing on wheat foliage' } },
  { crop: 'mustard', symptom: 'white_rust', type: 'crop_doctor', priority: 'Low', ai: aiGuess('alternaria', 'pest'), text: { bn: 'সরিষার নিচের পাতায় সাদাটে ফোসকা পড়েছে', en: 'Small white pustules under lower mustard leaves' } },
  { crop: 'boro', symptom: 'stem_borer', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('stem_borer', 'pest'), text: { bn: 'বোরোর জমির কিনারায় কিছু কচি ডগা মরে সাদা হচ্ছে', en: 'A few central Boro tillers along the border have died white' } },
  { crop: 'lentil', symptom: 'stemphylium', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('septoria', 'alternaria'), text: { bn: 'ভোরের কুয়াশার পর মসুরের ডগায় পোড়া দাগ পড়ছে', en: 'Minor tip blight on lentil stems after morning fog' } },
  { crop: 'mustard', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'রবি ফসল তোলার পর আউশ নাকি পাট বুনলে জমি ও আয় দুটোই ভালো থাকবে?', en: 'After Rabi harvest, would Aus rice or jute keep soil moisture and margin balanced?' } },
];

const AMAN_POOL = [
  { crop: 'aman', symptom: 'stem_borer', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('stem_borer', 'pest'), text: { bn: 'আমন ক্ষেতের এক কোণে কয়েকটি শীষ সাদা চিটা হয়ে আছে', en: 'A few white dead-head panicles are visible along the outer Aman bund' } },
  { crop: 'aman', symptom: 'sheath_blight', type: 'crop_doctor', priority: 'Medium', ai: aiGuess('sheath_blight', 'blast'), text: { bn: 'গোছার খোলে হালকা বাদামি চিতি দাগ দেখা দিয়েছে', en: 'Pale oval sheath lesions are appearing low on crowded Aman tillers' } },
  { crop: 'aman', symptom: 'water', type: 'water_alert', priority: 'Medium', ai: null, text: { bn: 'দানা শক্ত হওয়ার সময়ে জমিতে কতটুকু পানি রাখা ঠিক হবে?', en: 'How much standing water should stay on the plot during grain hardening?' } },
  { crop: 'aman', symptom: 'rice_bug', type: 'crop_doctor', priority: 'Low', ai: aiGuess('pest', 'stem_borer'), text: { bn: 'ধানের দুধ-অবস্থায় ক্ষেতের আইলে গান্ধী পোকা দেখা যাচ্ছে', en: 'Scattered rice bugs spotted near the milky grain borders' } },
  { crop: 'aman', symptom: 'bacterial_blight', type: 'crop_doctor', priority: 'High', ai: aiGuess('blast', 'nutrient'), text: { bn: 'বৃষ্টির ঝাপটার পর পাতার ডগা হলদে হয়ে শুকিয়ে আসছে', en: 'Leaf tips are yellowing and drying down the margin after gusty rain' } },
  { crop: 'aman', symptom: 'false_smut', type: 'crop_doctor', priority: 'Low', ai: aiGuess('sheath_blight', 'unclear'), text: { bn: 'দুয়েকটা শীষে হলদে-সবুজ ফোলা দানা দেখা যাচ্ছে', en: 'Isolated velvety smut balls seen on single grains in a few hills' } },
  { crop: 'aman', symptom: 'rodent', type: 'question', priority: 'Medium', ai: null, text: { bn: 'পাকা ধানের জমির আইলে ইঁদুরের গর্ত বাড়ছে — কী ব্যবস্থা নেব?', en: 'Fresh rat burrows along the paddy bunds — which safe control works best?' } },
  { crop: 'aman', symptom: 'question', type: 'question', priority: 'Low', ai: null, text: { bn: 'আমন কাটার পর এই জমিতে মসুর না সরিষা বুনলে কম সেচে হবে?', en: 'Which zero-till Rabi crop fits here after Aman with minimal irrigation?' } },
];

function applySpecs({ farmers, season, today, specs, startId }) {
  const byUnion = new Map();
  for (const f of farmers) {
    if (!byUnion.has(f.union)) byUnion.set(f.union, []);
    byUnion.get(f.union).push(f);
  }
  const out = [];
  let seq = startId;
  for (const [unionId, farmerId, slot, daysAgo, patch] of specs) {
    const list = byUnion.get(unionId) || [];
    const farmer = farmerId ? farmers.find((f) => f.id === farmerId) : list.filter((f) => !f.hero)[slot];
    if (!farmer) continue;
    out.push(buildReq(farmer, `R${seq++}`, season, today, daysAgo, patch));
  }
  return out;
}

function topUpUnions({ farmers, existing, unions, today, season, pool, startId, targetCount = 5 }) {
  const countByUnion = new Map();
  const usedFarmers = new Set();
  for (const r of existing) {
    countByUnion.set(r.union, (countByUnion.get(r.union) || 0) + 1);
    usedFarmers.add(`${r.union}:${r.farmerId}`);
  }
  const byUnion = new Map();
  for (const f of farmers) {
    if (f.hero) continue; // preserve hero farmers' exact request counts
    if (!byUnion.has(f.union)) byUnion.set(f.union, []);
    byUnion.get(f.union).push(f);
  }
  const out = [];
  let seq = startId;
  unions.forEach((u, uIdx) => {
    const have = countByUnion.get(u.id) || 0;
    if (have >= 4) return;
    const need = targetCount - have;
    const candidates = (byUnion.get(u.id) || []).filter((f) => !usedFarmers.has(`${u.id}:${f.id}`));
    const fallback = byUnion.get(u.id) || [];
    for (let slot = 0; slot < need; slot++) {
      const farmer = candidates[slot] ?? fallback[(slot + have) % fallback.length];
      if (!farmer) continue;
      const tmpl = pool[(uIdx * 3 + slot * 2) % pool.length];
      out.push(buildReq(farmer, `R${seq++}`, season, today, (uIdx + slot) % 6, tmpl));
    }
  });
  return out;
}

export function regionalRabiRequests(farmers, existing, unions, today) {
  const crafted = applySpecs({ farmers, season: 'rabi', today, specs: RABI_DEFAULT_SPECS, startId: 600 });
  const topUps = topUpUnions({
    farmers,
    existing: [...existing, ...crafted],
    unions,
    today,
    season: 'rabi',
    pool: RABI_POOL,
    startId: 700,
    targetCount: 5,
  });
  return [...crafted, ...topUps];
}

export function regionalAmanRequests(farmers, existing, unions, today) {
  const crafted = applySpecs({ farmers, season: 'aman', today, specs: AMAN_DEFAULT_SPECS, startId: 1100 });
  const topUps = topUpUnions({
    farmers,
    existing: [...existing, ...crafted],
    unions,
    today,
    season: 'aman',
    pool: AMAN_POOL,
    startId: 1200,
    targetCount: 5,
  });
  return [...crafted, ...topUps];
}
