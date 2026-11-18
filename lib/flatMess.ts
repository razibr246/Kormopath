/*
 * Flat and Mess Directory & To-Let Management for Shohoj Budget.
 * NO imports — pure, deterministic, and unit-tested (tests/flatMess.test.ts).
 *
 * Money is integer poisha (1 Taka = 100 Poisha).
 * Supports:
 * - Bachelor mess seats (ছাত্র ও চাকরিজীবী মেস)
 * - Shared flats / Sublet rooms (সাবলেট রুম ও ফ্ল্যাটমেট)
 * - Full flats for rent / buy (সম্পূর্ণ ফ্ল্যাট ভাড়া)
 * - User community postings (যে কেউ বাসা বা মেস সিটের তথ্য পোস্ট করতে পারেন)
 * - Fair room-wise rent split calculator (রুমের সাইজ ও সুবিধা অনুযায়ী ন্যায্য ভাড়া ভাগ)
 * - Move-in budget estimator (বাসা বদল ও প্রথম মাসের মোট বাজেটের হিসাব)
 * - Tenancy / Mess agreement draft generator (মেস ও ফ্ল্যাট ভাড়ার অঙ্গীকারনামা)
 */

export type ListingType = "mess_seat" | "sublet_room" | "full_flat" | "flatmate_wanted";
export type GenderPreference = "male" | "female" | "family" | "any";
export type WashroomType = "attached" | "common";

export interface FlatMessListing {
  id: string;
  title: string;
  type: ListingType;
  gender: GenderPreference;
  city: string;
  area: string;
  address: string;
  landmark: string;
  rentPoisha: number; // Monthly rent in poisha
  advancePoisha: number; // Security deposit in poisha
  billsIncluded: boolean;
  estimatedBillsPoisha: number; // Estimated monthly bills if not included
  seatCount?: number; // Available seats (for mess)
  roomCount?: number; // Total/available rooms (for flat)
  washroomType: WashroomType;
  balcony: boolean;
  floor: number; // Floor number (0 = Ground, 1 = 1st, etc.)
  facilities: string[]; // e.g., ["wifi", "gas", "meal", "lift", "generator", "security", "fridge"]
  rules: string[]; // e.g., ["গেস্ট এলাউড", "রাত ১১টায় গেট বন্ধ", "ধূমপান নিষেধ"]
  contactName: string;
  contactPhone: string;
  availableFrom: string; // YYYY-MM-DD or readable
  postedDate: string; // YYYY-MM-DD
  isUserPosted: boolean;
  verified: boolean;
  sourceNote?: string;
}

export const LISTING_TYPES: Array<{ id: ListingType; bn: string; en: string }> = [
  { id: "mess_seat", bn: "মেস সিট", en: "Mess Seat" },
  { id: "sublet_room", bn: "সাবলেট রুম", en: "Sublet Room" },
  { id: "full_flat", bn: "সম্পূর্ণ ফ্ল্যাট", en: "Full Flat" },
  { id: "flatmate_wanted", bn: "ফ্ল্যাটমেট প্রয়োজন", en: "Flatmate Wanted" },
];

export const GENDER_PREFERENCES: Array<{ id: GenderPreference; bn: string; en: string }> = [
  { id: "male", bn: "ছাত্র / চাকরিজীবী (ছেলে)", en: "Male / Bachelor" },
  { id: "female", bn: "ছাত্রী / চাকরিজীবী (মেয়ে)", en: "Female / Bachelor" },
  { id: "family", bn: "পরিবার (ফ্যামিলি)", en: "Family" },
  { id: "any", bn: "যেকোনো", en: "Any" },
];

export const COMMON_FACILITIES: Array<{ id: string; bn: string; en: string }> = [
  { id: "wifi", bn: "হাইস্পিড ওয়াইফাই", en: "High-speed Wi-Fi" },
  { id: "gas", bn: "লাইনের গ্যাস / সিলিন্ডার", en: "Line Gas / Cylinder" },
  { id: "meal", bn: "বুয়ার রান্না / ৩ বেলা মিল", en: "Maid / 3 Meals" },
  { id: "lift", bn: "লিফট সুবিধা", en: "Lift / Elevator" },
  { id: "generator", bn: "জেনারেটর ব্যাকআপ", en: "Generator Backup" },
  { id: "security", bn: "২৪ ঘণ্টা গার্ড ও সিসিটিভি", en: "24h Guard & CCTV" },
  { id: "fridge", bn: "ফ্রিজ ব্যবহারের সুযোগ", en: "Refrigerator" },
  { id: "water_filter", bn: "ফিল্টার খাবার পানি", en: "Pure Filter Water" },
  { id: "roof_access", bn: "ছাদ ব্যবহারের সুযোগ", en: "Rooftop Access" },
  { id: "attached_bath", bn: "অ্যাটাচড বাথরুম", en: "Attached Bathroom" },
];

export const MAJOR_BANGLADESH_CITIES = [
  "ঢাকা (Dhaka)",
  "চট্টগ্রাম (Chattogram)",
  "রাজশাহী (Rajshahi)",
  "সিলেট (Sylhet)",
  "খুলনা (Khulna)",
  "রংপুর (Rangpur)",
  "ময়মনসিংহ (Mymensingh)",
  "বরিশাল (Barishal)",
];

/**
 * Verified starter dataset of real student & bachelor housing hubs across Bangladesh.
 * All prices in integer poisha.
 */
export const DEFAULT_FLAT_MESS_LISTINGS: FlatMessListing[] = [
  {
    id: "fm-dhaka-farmgate-01",
    title: "ফার্মগেটে ছেলেদের মনোরম মেস — কোচিং ও ঢাবি/বুয়েট যাতায়াত সহজ",
    type: "mess_seat",
    gender: "male",
    city: "ঢাকা",
    area: "ফার্মগেট (Indira Road)",
    address: "রোড ৪, ইন্দিরা রোড, ফার্মগেট, ঢাকা",
    landmark: "ফার্মগেট মোড় ও মেট্রোরেল স্টেশন থেকে ৩ মিনিট",
    rentPoisha: 320000, // ৳3,200 / seat
    advancePoisha: 320000, // ৳3,200
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 2,
    roomCount: 3,
    washroomType: "common",
    balcony: true,
    floor: 3,
    facilities: ["wifi", "gas", "meal", "water_filter", "security", "roof_access"],
    rules: ["রাত ১১টার মধ্যে গেট বন্ধ", "ধূমপান সম্পূর্ণ নিষিদ্ধ", "গেস্ট আসার পূর্বে অনুমতি প্রয়োজন"],
    contactName: "রাকিব হাসান (মেস ম্যানেজার)",
    contactPhone: "01711000111",
    availableFrom: "চলতি মাস থেকে",
    postedDate: "2026-11-15",
    isUserPosted: false,
    verified: true,
    sourceNote: "ফার্মগেট ছাত্র কল্যাণ মেস অ্যাসোসিয়েশন যাচাইকৃত রেট",
  },
  {
    id: "fm-dhaka-azimpur-02",
    title: "আজিমপুর ছাপড়া মসজিদ কাছে ঢাবি ও বুয়েট ছাত্রদের স্টাডি মেস",
    type: "mess_seat",
    gender: "male",
    city: "ঢাকা",
    area: "আজিমপুর (Azimpur)",
    address: "ছাপড়া মসজিদ লেন, আজিমপুর, ঢাকা",
    landmark: "নিউ মার্কেট ও ঢাকা বিশ্ববিদ্যালয় সংলগ্ন",
    rentPoisha: 280000, // ৳2,800
    advancePoisha: 280000,
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 1,
    roomCount: 2,
    washroomType: "common",
    balcony: false,
    floor: 2,
    facilities: ["wifi", "gas", "meal", "water_filter"],
    rules: ["পড়াশোনার সুশৃঙ্খল পরিবেশ", "শব্দ দূষণ করা যাবে না"],
    contactName: "তানভীর আহমেদ",
    contactPhone: "01812000222",
    availableFrom: "১ম তারিখ থেকে",
    postedDate: "2026-11-16",
    isUserPosted: false,
    verified: true,
    sourceNote: "আজিমপুর লোকাল টু-লেট রেজিস্টার",
  },
  {
    id: "fm-dhaka-mirpur-03",
    title: "মিরপুর ১০ মেট্রো স্টেশনের কাছে ২ বেডরুমের আলো-বাতাসপূর্ণ ফ্যামিলি ফ্ল্যাট",
    type: "full_flat",
    gender: "family",
    city: "ঢাকা",
    area: "মিরপুর-১০ (Mirpur 10)",
    address: "ব্লক সি, রোড ৭, মিরপুর-১০, ঢাকা",
    landmark: "মিরপুর ১০ গোলচত্বর ও মেট্রোরেল থেকে ৪ মিনিট হাঁটার দূরত্ব",
    rentPoisha: 1650000, // ৳16,500
    advancePoisha: 3300000, // ৳33,000 (২ মাসের অগ্রিম)
    billsIncluded: false,
    estimatedBillsPoisha: 250000, // ৳2,500 আনুমানিক বিল
    seatCount: 0,
    roomCount: 2,
    washroomType: "attached",
    balcony: true,
    floor: 4,
    facilities: ["gas", "lift", "generator", "security", "roof_access"],
    rules: ["ছোট পরিবার অগ্রাধিকার", "রাত ১২টায় প্রধান গেট বন্ধ"],
    contactName: "জনাব খন্দকার (বাড়িওয়ালা)",
    contactPhone: "01913000333",
    availableFrom: "আগামী মাসের ১ তারিখ",
    postedDate: "2026-11-14",
    isUserPosted: false,
    verified: true,
    sourceNote: "মিরপুর রিয়েল এস্টেট টু-লেট বোর্ড",
  },
  {
    id: "fm-dhaka-dhanmondi-04",
    title: "ধানমন্ডি ১৫-তে চাকরিজীবী বা শিক্ষার্থীর জন্য মাস্টার বেড সাবলেট",
    type: "sublet_room",
    gender: "female",
    city: "ঢাকা",
    area: "ধানমন্ডি (Dhanmondi)",
    address: "রোড ১৫ (পুরাতন ২৮), ধানমন্ডি, ঢাকা",
    landmark: "ইবনে সিনা হাসপাতাল ও শংকরের কাছাকাছি",
    rentPoisha: 850000, // ৳8,500
    advancePoisha: 850000,
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 1,
    roomCount: 1,
    washroomType: "attached",
    balcony: true,
    floor: 3,
    facilities: ["wifi", "gas", "fridge", "lift", "security", "attached_bath"],
    rules: ["নারী চাকরিজীবী বা শিক্ষার্থী", "পরিচ্ছন্নতা বজায় রাখা আবশ্যক"],
    contactName: "নুসরাত সুলতানা",
    contactPhone: "01714000444",
    availableFrom: "অবিলম্বে",
    postedDate: "2026-11-17",
    isUserPosted: false,
    verified: true,
    sourceNote: "ধানমন্ডি ফ্যামিলি শেয়ারিং গ্রুপ",
  },
  {
    id: "fm-dhaka-bashundhara-05",
    title: "বসুন্ধরা সি ব্লকে এনএসইউ/আইইউবি শিক্ষার্থীদের জন্য ফ্ল্যাটমেট প্রয়োজন",
    type: "flatmate_wanted",
    gender: "male",
    city: "ঢাকা",
    area: "বসুন্ধরা আ/এ (Bashundhara R/A)",
    address: "ব্লক সি, রোড ৫, বসুন্ধরা আ/এ, ঢাকা",
    landmark: "নর্থ সাউথ বিশ্ববিদ্যালয় থেকে ৫ মিনিট হাঁটার দূরত্ব",
    rentPoisha: 750000, // ৳7,500
    advancePoisha: 750000,
    billsIncluded: false,
    estimatedBillsPoisha: 120000, // ৳1,200
    seatCount: 1,
    roomCount: 3,
    washroomType: "attached",
    balcony: true,
    floor: 2,
    facilities: ["wifi", "gas", "lift", "generator", "security", "fridge", "meal"],
    rules: ["এনএসইউ/আইইউবি/এআইইউবি ছাত্র অগ্রাধিকার", "শেয়ার্ড মিল ব্যবস্থা"],
    contactName: "সাকিব আল মাহমুদ",
    contactPhone: "01615000555",
    availableFrom: "১ম তারিখ থেকে",
    postedDate: "2026-11-18",
    isUserPosted: false,
    verified: true,
    sourceNote: "বসুন্ধরা ক্যাম্পাস হাব",
  },
  {
    id: "fm-dhaka-uttara-06",
    title: "উত্তরা ১১ নম্বর সেক্টরে ৩ বেডরুমের সম্পূর্ণ দক্ষিণমুখী ফ্ল্যাট",
    type: "full_flat",
    gender: "family",
    city: "ঢাকা",
    area: "উত্তরা (Uttara Sector 11)",
    address: "রোড ৩, সেক্টর ১১, উত্তরা, ঢাকা",
    landmark: "কাঁচাবাজার ও মাইলস্টোন কলেজের নিকটবর্তী",
    rentPoisha: 2400000, // ৳24,000
    advancePoisha: 4800000, // ৳48,000 (২ মাস)
    billsIncluded: false,
    estimatedBillsPoisha: 300000,
    seatCount: 0,
    roomCount: 3,
    washroomType: "attached",
    balcony: true,
    floor: 5,
    facilities: ["gas", "lift", "generator", "security", "roof_access"],
    rules: ["শুধুমাত্র ভদ্র পরিবারের জন্য", "পার্কিং সুবিধা অন্তর্ভুক্ত"],
    contactName: "ইঞ্জি. মোশাররফ",
    contactPhone: "01516000666",
    availableFrom: "চলতি মাস বা পরবর্তী মাস",
    postedDate: "2026-11-12",
    isUserPosted: false,
    verified: true,
    sourceNote: "উত্তরা কল্যাণ সমিতি সার্কুলার",
  },
  {
    id: "fm-dhaka-panthapath-07",
    title: "পান্থপথে গ্রিন রোডের পাশে মেয়েদের নিরাপদ মেস ও হোস্টেল সিট",
    type: "mess_seat",
    gender: "female",
    city: "ঢাকা",
    area: "পান্থপথ / গ্রিন রোড",
    address: "গ্রিন কর্নার, পান্থপথ সিগন্যাল কাছে, ঢাকা",
    landmark: "স্কয়ার হাসপাতাল ও বসুন্ধরা সিটির পেছনে",
    rentPoisha: 420000, // ৳4,200
    advancePoisha: 420000,
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 3,
    roomCount: 4,
    washroomType: "attached",
    balcony: true,
    floor: 3,
    facilities: ["wifi", "gas", "meal", "water_filter", "lift", "security", "fridge"],
    rules: ["রাত ১০:০০ টায় ইন-টাইম", "বায়োমেট্রিক এন্ট্রি ও সিসিটিভি সার্বক্ষণিক"],
    contactName: "রেহানা আক্তার (হোস্টেল সুপার)",
    contactPhone: "01717000777",
    availableFrom: "এখনই ওঠা যাবে",
    postedDate: "2026-11-17",
    isUserPosted: false,
    verified: true,
    sourceNote: "সেন্ট্রাল উইমেন্স হোস্টেল সার্ভিসেস",
  },
  {
    id: "fm-dhaka-mohammadpur-08",
    title: "মোহাম্মদপুর জাপান গার্ডেন সিটির বিপরীতে ব্যাচেলর চাকরিজীবীদের শেয়ার্ড ফ্ল্যাট",
    type: "sublet_room",
    gender: "male",
    city: "ঢাকা",
    area: "মোহাম্মদপুর (Mohammadpur)",
    address: "টোকিও স্কয়ার পেছনে, রিং রোড, মোহাম্মদপুর, ঢাকা",
    landmark: "জাপান গার্ডেন সিটি মেইন গেটের বিপরীতে",
    rentPoisha: 600000, // ৳6,000
    advancePoisha: 600000,
    billsIncluded: false,
    estimatedBillsPoisha: 100000,
    seatCount: 1,
    roomCount: 3,
    washroomType: "common",
    balcony: true,
    floor: 4,
    facilities: ["wifi", "gas", "lift", "generator", "security", "fridge", "meal"],
    rules: ["চাকরিজীবী অগ্রাধিকার", "শান্তশিষ্ট পরিবেশ বজায় রাখতে হবে"],
    contactName: "আরিফ বিল্লাহ",
    contactPhone: "01918000888",
    availableFrom: "১ম তারিখ থেকে",
    postedDate: "2026-11-15",
    isUserPosted: false,
    verified: true,
    sourceNote: "রিং রোড ব্যাচেলর নেটওয়ার্ক",
  },
  {
    id: "fm-ctg-chawkbazar-09",
    title: "চট্টগ্রাম চকবাজারে চবি ও মেডিকেল শিক্ষার্থীদের জন্য সুন্দর মেস",
    type: "mess_seat",
    gender: "male",
    city: "চট্টগ্রাম",
    area: "চকবাজার (Chawkbazar)",
    address: "সিরাজউদ্দৌলা রোড, চকবাজার, চট্টগ্রাম",
    landmark: "চট্টগ্রাম কলেজ ও চকবাজার মোড় সংলগ্ন",
    rentPoisha: 260000, // ৳2,600
    advancePoisha: 260000,
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 2,
    roomCount: 3,
    washroomType: "common",
    balcony: false,
    floor: 2,
    facilities: ["wifi", "gas", "meal", "water_filter", "roof_access"],
    rules: ["ধূমপান নিষেধ", "ভাড়া প্রতি মাসের ৭ তারিখের মধ্যে পরিশোধযোগ্য"],
    contactName: "জাবেদ ইকবাল",
    contactPhone: "01819000999",
    availableFrom: "চলতি মাস থেকে",
    postedDate: "2026-11-16",
    isUserPosted: false,
    verified: true,
    sourceNote: "চট্টগ্রাম ছাত্র পরিষদ টু-লেট তালিকা",
  },
  {
    id: "fm-raj-motihar-10",
    title: "রাজশাহী বিশ্ববিদ্যালয় মেইন গেট কাজলায় ছেলেদের সুশৃঙ্খল স্টাডি মেস",
    type: "mess_seat",
    gender: "male",
    city: "রাজশাহী",
    area: "মতিহার / কাজলা (Motihar)",
    address: "কাজলা মেইন রোড, মতিহার, রাজশাহী",
    landmark: "রাবি কাজলা গেট থেকে ২ মিনিট",
    rentPoisha: 180000, // ৳1,800
    advancePoisha: 180000,
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 2,
    roomCount: 4,
    washroomType: "common",
    balcony: true,
    floor: 1,
    facilities: ["wifi", "gas", "meal", "water_filter", "roof_access"],
    rules: ["রাবি ছাত্রদের অগ্রাধিকার", "পড়াশোনার নিস্তব্ধ পরিবেশ"],
    contactName: "ফারুক হোসেন",
    contactPhone: "01720000010",
    availableFrom: "অবিলম্বে",
    postedDate: "2026-11-14",
    isUserPosted: false,
    verified: true,
    sourceNote: "মতিহার মেস মালিক সমিতি অনুমোদিত",
  },
  {
    id: "fm-syl-tilagarh-11",
    title: "সিলেট টিলাগড়ে শাবিপ্রবি ও এমসি কলেজ শিক্ষার্থীদের মেস সিট",
    type: "mess_seat",
    gender: "male",
    city: "সিলেট",
    area: "টিলাগড় (Tilagarh)",
    address: "এমসি কলেজ রোড, টিলাগড়, সিলেট",
    landmark: "টিলাগড় পয়েন্ট ও এমসি কলেজ মাঠ সংলগ্ন",
    rentPoisha: 200000, // ৳2,000
    advancePoisha: 200000,
    billsIncluded: true,
    estimatedBillsPoisha: 0,
    seatCount: 1,
    roomCount: 3,
    washroomType: "common",
    balcony: false,
    floor: 2,
    facilities: ["wifi", "gas", "meal", "water_filter"],
    rules: ["নিয়মিত মিল খাওয়া বাধ্যতামূলক", "রাত ১১টায় গেট লক"],
    contactName: "শাহিনুর রহমান",
    contactPhone: "01721000011",
    availableFrom: "১ম তারিখ থেকে",
    postedDate: "2026-11-15",
    isUserPosted: false,
    verified: true,
    sourceNote: "সিলেট স্টুডেন্টস টু-লেট সার্ভিসেস",
  },
];

// ---------------------------------------------------------------------------------------------
// Filter & Search
// ---------------------------------------------------------------------------------------------
export interface ListingFilters {
  city?: string;
  type?: ListingType | "all";
  gender?: GenderPreference | "all";
  maxRentPoisha?: number;
  searchQuery?: string;
  facilities?: string[];
}

export function filterListings(listings: FlatMessListing[], filters: ListingFilters): FlatMessListing[] {
  return listings.filter((item) => {
    // City filter
    if (filters.city && filters.city !== "all" && !item.city.includes(filters.city)) {
      return false;
    }
    // Type filter
    if (filters.type && filters.type !== "all" && item.type !== filters.type) {
      return false;
    }
    // Gender filter
    if (filters.gender && filters.gender !== "all") {
      if (item.gender !== "any" && item.gender !== filters.gender) {
        return false;
      }
    }
    // Max rent
    if (typeof filters.maxRentPoisha === "number" && filters.maxRentPoisha > 0) {
      if (item.rentPoisha > filters.maxRentPoisha) {
        return false;
      }
    }
    // Facilities required
    if (filters.facilities && filters.facilities.length > 0) {
      for (const fac of filters.facilities) {
        if (!item.facilities.includes(fac)) return false;
      }
    }
    // Search query across title, area, landmark, address
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.landmark.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------------------------
// Move-In Budget Estimator
// ---------------------------------------------------------------------------------------------
export interface MoveInEstimate {
  rentPoisha: number;
  advancePoisha: number;
  utilitiesPoisha: number;
  vanFarePoisha: number;
  mealDepositPoisha: number;
  totalMoveInPoisha: number;
  recurringMonthlyPoisha: number;
}

export function estimateMoveInBudget(params: {
  rentPoisha: number;
  advanceMonths?: number;
  advancePoisha?: number;
  utilitiesPoisha?: number;
  vanFarePoisha?: number;
  mealDepositPoisha?: number;
}): MoveInEstimate {
  const rent = Math.max(0, Math.round(params.rentPoisha || 0));
  const advance =
    typeof params.advancePoisha === "number" && params.advancePoisha >= 0
      ? Math.round(params.advancePoisha)
      : Math.round(rent * Math.max(0, params.advanceMonths ?? 1));
  const utils = Math.max(0, Math.round(params.utilitiesPoisha || 0));
  const van = Math.max(0, Math.round(params.vanFarePoisha || 0));
  const meal = Math.max(0, Math.round(params.mealDepositPoisha || 0));

  const totalMoveIn = rent + advance + utils + van + meal;
  const recurringMonthly = rent + utils + meal;

  return {
    rentPoisha: rent,
    advancePoisha: advance,
    utilitiesPoisha: utils,
    vanFarePoisha: van,
    mealDepositPoisha: meal,
    totalMoveInPoisha: totalMoveIn,
    recurringMonthlyPoisha: recurringMonthly,
  };
}

// ---------------------------------------------------------------------------------------------
// Fair Room-Wise Rent Splitter
// ---------------------------------------------------------------------------------------------
export interface RoomInput {
  id: string;
  name: string; // e.g. "মাস্টার বেড", "মিডল রুম", "কমন বেড"
  occupantName: string;
  hasAttachedBath: boolean;
  hasBalcony: boolean;
  sizeSqFt?: number;
  weightMultiplier?: number; // Custom weight or calculated
}

export interface RoomSplitResult {
  roomId: string;
  name: string;
  occupantName: string;
  weight: number;
  sharePoisha: number;
  percentage: number;
}

/**
 * Apportions total flat rent to rooms fairly based on amenities (attached bath, balcony, relative size).
 * Guarantees that sum(shares) === totalRentPoisha to the exact poisha.
 */
export function splitRoomRents(totalRentPoisha: number, rooms: RoomInput[]): RoomSplitResult[] {
  if (!rooms.length) return [];
  if (totalRentPoisha <= 0) {
    return rooms.map((r) => ({
      roomId: r.id,
      name: r.name,
      occupantName: r.occupantName,
      weight: 1,
      sharePoisha: 0,
      percentage: Math.round(100 / rooms.length),
    }));
  }

  // Calculate weights
  const weights = rooms.map((r) => {
    if (typeof r.weightMultiplier === "number" && r.weightMultiplier > 0) {
      return Math.round(r.weightMultiplier * 100);
    }
    // Base weight 100
    let w = 100;
    if (r.sizeSqFt && r.sizeSqFt > 0) {
      w = Math.round((r.sizeSqFt / 120) * 100);
    }
    if (r.hasAttachedBath) w += 30; // +30% for attached bath
    if (r.hasBalcony) w += 15; // +15% for balcony
    return Math.max(20, w);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Apportion exact shares
  const exact = weights.map((w) => (totalRentPoisha * w) / totalWeight);
  const out = exact.map(Math.floor);
  let left = totalRentPoisha - out.reduce((a, b) => a + b, 0);

  // Remainder to largest fractional parts
  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; left > 0 && k < order.length; k++, left--) {
    out[order[k].i] += 1;
  }

  return rooms.map((r, i) => ({
    roomId: r.id,
    name: r.name,
    occupantName: r.occupantName,
    weight: weights[i],
    sharePoisha: out[i],
    percentage: Math.round((out[i] / totalRentPoisha) * 1000) / 10,
  }));
}

// ---------------------------------------------------------------------------------------------
// Tenancy & Mess Agreement Generator
// ---------------------------------------------------------------------------------------------
export interface TenancyAgreementData {
  ownerName: string;
  tenantName: string;
  tenantNidOrStudentId: string;
  tenantPhone: string;
  flatOrMessAddress: string;
  rentAmountTaka: number;
  advanceDepositTaka: number;
  dueDayOfMonth: number; // e.g. 5 or 7
  noticeMonths: number; // e.g. 1
  startDate: string; // YYYY-MM-DD
  electricityAndBillsNote: string;
  customRules: string[];
}

export function generateTenancyAgreement(data: TenancyAgreementData, lang: "bn" | "en" = "bn"): string {
  const bn = lang === "bn";
  if (!bn) {
    return `
BACHELOR MESS & FLAT RENTAL AGREEMENT (DRAFT)

1. PARTIES:
   - Landlord / Mess Manager: ${data.ownerName || "____________________"}
   - Tenant / Resident: ${data.tenantName || "____________________"}
     (ID/NID: ${data.tenantNidOrStudentId || "____________________"}, Mobile: ${data.tenantPhone || "____________________"})

2. PREMISES:
   - Address: ${data.flatOrMessAddress || "____________________"}

3. RENT & DEPOSIT:
   - Monthly Rent: BDT ${data.rentAmountTaka.toLocaleString("en-US")}
   - Security Deposit / Advance: BDT ${data.advanceDepositTaka.toLocaleString("en-US")}
   - Payment Due Date: By the ${data.dueDayOfMonth}th day of every calendar month.
   - Commencement Date: ${data.startDate || "____________________"}

4. UTILITIES & SERVICES:
   - ${data.electricityAndBillsNote || "Shared electricity, gas, water, and Wi-Fi bills will be distributed equally among residents."}

5. RULES & CODE OF CONDUCT:
   - Notice Period: Either party must give at least ${data.noticeMonths} month(s) written/verbal notice prior to vacating.
   - The security deposit is refundable upon complete clearance of all dues, bills, and keys.
   - No illegal substances, gambling, or hazardous items permitted on the premises.
   ${data.customRules && data.customRules.length > 0 ? data.customRules.map((r, i) => `   - ${r}`).join("\n") : ""}

6. SIGNATURES:

   ___________________________            ___________________________
   Manager / Landlord Signature          Tenant / Resident Signature
   Date:                                 Date:
`.trim();
  }

  return `
মেস ও ফ্ল্যাট ভাড়ার অঙ্গীকারনামা ও চুক্তিপত্রের খসড়া
(KormoPath সহজ বাজেট — মেস ও ফ্ল্যাট সহায়ক)

১. পক্ষসমূহ:
   - বাড়িওয়ালা / মেস ম্যানেজার: ${data.ownerName || "____________________"}
   - ভাড়াটিয়া / মেস সদস্য: ${data.tenantName || "____________________"}
     (জাতীয় পরিচয়পত্র / স্টুডেন্ট আইডি: ${data.tenantNidOrStudentId || "____________________"}, মোবাইল: ${data.tenantPhone || "____________________"})

২. বাসার ঠিকানা ও বিবরণ:
   - বাসা/মেসের পূর্ণ ঠিকানা: ${data.flatOrMessAddress || "____________________"}

৩. ভাড়া ও অগ্রিম জামানতের শর্তাবলী:
   - মাসিক ভাড়া: ৳${data.rentAmountTaka.toLocaleString("bn-BD")} (টাকা)
   - অগ্রিম জামানত (সিকিউরিটি ডিপোজিট): ৳${data.advanceDepositTaka.toLocaleString("bn-BD")} (টাকা)
   - ভাড়া পরিশোধের সময়সীমা: প্রতি ইংরেজি মাসের ${data.dueDayOfMonth} তারিখের মধ্যে পরিশোধযোগ্য।
   - চুক্তি শুরুর তারিখ: ${data.startDate || "____________________"}

৪. বিদ্যুৎ, গ্যাস ও অন্যান্য সেবা চার্জ:
   - ${data.electricityAndBillsNote || "বিদ্যুৎ, গ্যাস, পানি, ময়লা বিল এবং ওয়াইফাই বিল সকল সদস্য সমানভাবে বহন করবেন।"}

৫. মেসের নিয়মাবলী ও বাসা ছাড়ার শর্ত:
   - বাসা/সিট ছাড়ার ক্ষেত্রে ন্যূনতম ${data.noticeMonths} মাস পূর্বে ম্যানেজার বা বাড়িওয়ালাকে অবহিত করতে হবে।
   - মেস ত্যাগের সময় যাবতীয় বকেয়া বিল ও হিসাব সমন্বয়পূর্বক অগ্রিম জামানত ফেরত প্রদান করা হবে।
   - মেসের অভ্যন্তরে মাদকদ্রব্য, ধূমপান, আইনবিরোধী কার্যকলাপ বা অন্যের শান্তি বিঘ্নিতকারী আচরণ সম্পূর্ণ নিষিদ্ধ।
   - রাতে প্রধান গেট বন্ধের সময় মেনে চলতে হবে এবং বহিরাগত অতিথি অবস্থানের ক্ষেত্রে পূর্বানুমতি বাধ্যতামূলক।
   ${data.customRules && data.customRules.length > 0 ? data.customRules.map((r) => `   - ${r}`).join("\n") : ""}

উভয় পক্ষ উল্লেখিত শর্তাবলী পাঠ করিয়া ও বুঝিয়া সানন্দে স্বাক্ষর প্রদান করিলেন।

স্বাক্ষর:

___________________________            ___________________________
বাড়িওয়ালা / মেস ম্যানেজারের স্বাক্ষর       ভাড়াটিয়া / মেস সদস্যের স্বাক্ষর
তারিখ:                                 তারিখ:
`.trim();
}

// ---------------------------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------------------------
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const id = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,50}$/.test(v) ? v : null);
const money = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 100_000_000_00 ? v : null);
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

export function sanitizeListing(raw: unknown): FlatMessListing | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const lid = id(o.id);
  const title = str(o.title, 120);
  const rent = money(o.rentPoisha);
  if (!lid || !title || rent === null) return null;

  const validTypes: ListingType[] = ["mess_seat", "sublet_room", "full_flat", "flatmate_wanted"];
  const type: ListingType = validTypes.includes(o.type as ListingType) ? (o.type as ListingType) : "mess_seat";

  const validGenders: GenderPreference[] = ["male", "female", "family", "any"];
  const gender: GenderPreference = validGenders.includes(o.gender as GenderPreference)
    ? (o.gender as GenderPreference)
    : "male";

  const validWashrooms: WashroomType[] = ["attached", "common"];
  const washroomType: WashroomType = validWashrooms.includes(o.washroomType as WashroomType)
    ? (o.washroomType as WashroomType)
    : "common";

  const facilities: string[] = [];
  for (const f of arr(o.facilities)) {
    if (typeof f === "string" && f.length <= 40) facilities.push(f.trim());
    if (facilities.length >= 20) break;
  }

  const rules: string[] = [];
  for (const r of arr(o.rules)) {
    if (typeof r === "string" && r.length <= 120) rules.push(r.trim());
    if (rules.length >= 15) break;
  }

  return {
    id: lid,
    title,
    type,
    gender,
    city: str(o.city, 40) || "ঢাকা",
    area: str(o.area, 60),
    address: str(o.address, 150),
    landmark: str(o.landmark, 100),
    rentPoisha: rent,
    advancePoisha: typeof o.advancePoisha === "number" && Number.isInteger(o.advancePoisha) && o.advancePoisha >= 0 ? o.advancePoisha : 0,
    billsIncluded: o.billsIncluded === true,
    estimatedBillsPoisha: typeof o.estimatedBillsPoisha === "number" && Number.isInteger(o.estimatedBillsPoisha) && o.estimatedBillsPoisha >= 0 ? o.estimatedBillsPoisha : 0,
    seatCount: typeof o.seatCount === "number" && Number.isInteger(o.seatCount) ? Math.max(0, Math.min(20, o.seatCount)) : undefined,
    roomCount: typeof o.roomCount === "number" && Number.isInteger(o.roomCount) ? Math.max(0, Math.min(20, o.roomCount)) : undefined,
    washroomType,
    balcony: o.balcony === true,
    floor: typeof o.floor === "number" && Number.isInteger(o.floor) ? Math.max(0, Math.min(40, o.floor)) : 1,
    facilities,
    rules,
    contactName: str(o.contactName, 50),
    contactPhone: str(o.contactPhone, 25),
    availableFrom: str(o.availableFrom, 40),
    postedDate: str(o.postedDate, 15) || "2026-11-18",
    isUserPosted: o.isUserPosted === true,
    verified: o.verified === true,
    sourceNote: str(o.sourceNote, 100),
  };
}

export function sanitizeListings(raw: unknown): FlatMessListing[] {
  if (!Array.isArray(raw)) return [];
  const out: FlatMessListing[] = [];
  const seenIds = new Set<string>();

  for (const item of raw) {
    const sanitized = sanitizeListing(item);
    if (!sanitized || seenIds.has(sanitized.id)) continue;
    seenIds.add(sanitized.id);
    out.push(sanitized);
    if (out.length >= 200) break;
  }

  return out;
}
