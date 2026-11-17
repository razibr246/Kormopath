// Every game and play-to-learn page in one catalog: its name (Bangla and English, chosen to read well anywhere in the
// world and to be found by search), who it is for, how long it takes, and the line used as the page's title and
// description. The games hub (pages/public/Games.jsx), the search palette and each game's own page read their names
// from here, so a rename happens in one place. Routes never change with a name.
//
// Two sections: "Play as a farmer" (the 3D people games: the grown-ups' season and the children's dream, plus the
// character gallery that starts either) and "Stories and challenges" (decision games on real NASA weather).
export const SECTIONS = [
  { id: 'people', name: { bn: 'কৃষক হয়ে খেলুন', en: 'Play as a farmer' }, line: { bn: '৩D খামারে নিজে হাঁটুন, চাষ করুন, মৌসুম পার করুন: বড়দের জন্য একটি, ছোটদের জন্য একটি।', en: 'Walk a 3D farm yourself, plant and see a season through: one game for grown-ups, one for children.' } },
  { id: 'stories', name: { bn: 'গল্প আর চ্যালেঞ্জ', en: 'Stories and challenges' }, line: { bn: 'আসল নাসা আবহাওয়ার বছরে সিদ্ধান্ত নিন, ফল দেখুন: পাঁচ মিনিট থেকে এক সন্ধ্যা।', en: 'Make the calls in real NASA-weather years and see what follows: from five minutes to an evening.' } },
];

export const GAMES = {
  farm: {
    to: '/farm', section: 'people',
    name: { bn: 'ফসলের দিগন্ত', en: 'Harvest Horizon' },
    kind: { bn: 'বড়দের ৩D খামারের খেলা', en: '3D farming game for grown-ups' },
    audience: { bn: 'বড়দের জন্য', en: 'For grown-ups' }, time: { bn: '২০–৪০ মিনিট', en: '20–40 min' },
    seo: { en: 'Harvest Horizon: a 3D climate-smart farming game. Play one of 15 farmers from South Asia, the USA, Brazil and Spain, plant, water, beat pests and storms, and sell at market on real NASA weather.' },
  },
  kids: {
    to: '/kids', section: 'people',
    name: { bn: 'তারা আর স্বপ্নের মাঠ', en: 'Tara and the Dream Fields' },
    kind: { bn: 'ছোটদের ৩D স্বপ্ন-অভিযান · VR আর AR', en: 'A 3D dream adventure for children · VR and AR' },
    audience: { bn: 'ছোটদের জন্য (৬–১২ বছর)', en: 'For children (6–12)' }, time: { bn: '১০–১৫ মিনিট', en: '10–15 min' },
    seo: { en: 'Tara and the Dream Fields: a 3D, VR and AR dream adventure for children. Fly with Tara, a little NASA satellite, catch rain clouds, cool a heatwave and help a farm family through drought and flood.' },
  },
  people: {
    to: '/people', section: 'people',
    name: { bn: 'মাঠের মুখ', en: 'Faces of the Field' },
    kind: { bn: '৯ দেশের ১৫ জন কৃষক আর তাঁদের সন্তান · ৩D', en: '15 farmers and their children from 9 countries · 3D' },
    audience: { bn: 'সবার জন্য', en: 'For everyone' }, time: { bn: '২ মিনিট', en: '2 min' },
    seo: { en: 'Faces of the Field: 15 farmers and their children in 3D, from Bangladesh, five neighbouring countries, the USA, Brazil and Spain, and the weather each one fears.' },
  },
  saga: {
    to: '/saga', section: 'stories',
    name: { bn: 'দশ বছরের উত্তরাধিকার', en: 'The Ten-Year Inheritance' },
    kind: { bn: 'গল্পের অভিযান · ৩টি মৌসুম', en: 'Story campaign · 3 seasons' },
    audience: { bn: 'বড়দের জন্য', en: 'For grown-ups' }, time: { bn: '৩০–৬০ মিনিট', en: '30–60 min' },
    seo: { en: 'The Ten-Year Inheritance: a story campaign. Inherit two bigha in Dhamrai, Bangladesh, farm three seasons of real NASA weather and decide what your daughter inherits.' },
  },
  stories: {
    to: '/stories', section: 'stories',
    name: { bn: 'সাত মাঠের চ্যালেঞ্জ', en: 'Seven Fields Challenge' },
    kind: { bn: 'মিশনের খেলা · ৭টি স্তর', en: 'Mission game · 7 levels' },
    audience: { bn: 'সবার জন্য', en: 'For everyone' }, time: { bn: 'প্রতি স্তর ৫ মিনিট', en: '5 min a level' },
    seo: { en: 'Seven Fields Challenge: seven farmers, seven regions of Bangladesh, seven climate hazards (flash flood, salt, tide, fog blight, cloudburst) played on a real past year.' },
  },
  play: {
    to: '/play', section: 'stories',
    name: { bn: 'মৌসুমের লড়াই', en: 'Season Showdown' },
    kind: { bn: 'গল্পের খেলা · ৬টি অধ্যায়', en: 'Story game · 6 chapters' },
    audience: { bn: 'নতুনদের জন্য সেরা শুরু', en: 'Best first game' }, time: { bn: '৫ মিনিট', en: '5 min' },
    seo: { en: 'Season Showdown: six real problems in one winter (Rabi) season. Choose the old habit or the right FieldShift tool, and see the harvest.' },
  },
};

// The three ways in for someone who has just arrived.
export const START_HERE = [
  { game: 'play', why: { bn: 'প্রথমবার? ৫ মিনিটে বুঝে নিন', en: 'First time? Get it in 5 minutes' } },
  { game: 'farm', why: { bn: 'পুরো ৩D খামারে নামতে চান', en: 'Want the full 3D farm' } },
  { game: 'kids', why: { bn: 'সন্তানের সাথে খেলবেন', en: 'Playing with a child' } },
];
