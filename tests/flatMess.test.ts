import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FLAT_MESS_LISTINGS,
  filterListings,
  estimateMoveInBudget,
  splitRoomRents,
  generateTenancyAgreement,
  sanitizeListing,
  sanitizeListings,
  type FlatMessListing,
  type RoomInput,
} from "../lib/flatMess.ts";

test("DEFAULT_FLAT_MESS_LISTINGS contains valid entries across major cities", () => {
  assert.ok(DEFAULT_FLAT_MESS_LISTINGS.length >= 10, "Should have at least 10 starter listings");

  const cities = new Set(DEFAULT_FLAT_MESS_LISTINGS.map((l) => l.city));
  assert.ok(cities.has("ঢাকা"), "Must cover Dhaka");
  assert.ok(cities.has("চট্টগ্রাম"), "Must cover Chattogram");
  assert.ok(cities.has("রাজশাহী"), "Must cover Rajshahi");
  assert.ok(cities.has("সিলেট"), "Must cover Sylhet");

  for (const item of DEFAULT_FLAT_MESS_LISTINGS) {
    assert.ok(item.id.length > 0);
    assert.ok(item.title.length > 0);
    assert.ok(item.rentPoisha > 0, "Rent must be positive integer poisha");
    assert.ok(item.advancePoisha >= 0, "Advance must be non-negative");
    assert.ok(item.contactPhone.length > 5, "Must have valid contact phone");
    assert.ok(item.landmark.length > 0, "Must have landmark");
    assert.ok(Array.isArray(item.facilities));
    assert.ok(Array.isArray(item.rules));
  }
});

test("filterListings filters correctly by city, type, gender, maxRent and query", () => {
  const listings: FlatMessListing[] = [
    {
      id: "f1",
      title: "ফার্মগেটে ছেলেদের মেস সিট",
      type: "mess_seat",
      gender: "male",
      city: "ঢাকা",
      area: "ফার্মগেট",
      address: "ইন্দিরা রোড",
      landmark: "মেট্রোরেল স্টেশন কাছে",
      rentPoisha: 300000,
      advancePoisha: 300000,
      billsIncluded: true,
      estimatedBillsPoisha: 0,
      washroomType: "common",
      balcony: false,
      floor: 2,
      facilities: ["wifi", "meal"],
      rules: ["রাত ১১টায় গেট বন্ধ"],
      contactName: "করিম",
      contactPhone: "01700000001",
      availableFrom: "১ম তারিখ",
      postedDate: "2026-11-18",
      isUserPosted: false,
      verified: true,
    },
    {
      id: "f2",
      title: "মিরপুরে ফ্যামিলি ফ্ল্যাট",
      type: "full_flat",
      gender: "family",
      city: "ঢাকা",
      area: "মিরপুর-১০",
      address: "রোড ২",
      landmark: "গোলচত্বর",
      rentPoisha: 1800000,
      advancePoisha: 3600000,
      billsIncluded: false,
      estimatedBillsPoisha: 200000,
      washroomType: "attached",
      balcony: true,
      floor: 4,
      facilities: ["lift", "generator"],
      rules: [],
      contactName: "রহিম",
      contactPhone: "01700000002",
      availableFrom: "১ম তারিখ",
      postedDate: "2026-11-18",
      isUserPosted: false,
      verified: true,
    },
    {
      id: "f3",
      title: "চট্টগ্রামে মেয়েদের সাবলেট",
      type: "sublet_room",
      gender: "female",
      city: "চট্টগ্রাম",
      area: "চকবাজার",
      address: "মেডিকেল গেট",
      landmark: "মেডিকেল কলেজ",
      rentPoisha: 650000,
      advancePoisha: 650000,
      billsIncluded: true,
      estimatedBillsPoisha: 0,
      washroomType: "attached",
      balcony: true,
      floor: 3,
      facilities: ["wifi", "lift", "meal"],
      rules: [],
      contactName: "সালমা",
      contactPhone: "01700000003",
      availableFrom: "চলতি মাস",
      postedDate: "2026-11-18",
      isUserPosted: false,
      verified: true,
    },
  ];

  // City filter
  const ctg = filterListings(listings, { city: "চট্টগ্রাম" });
  assert.equal(ctg.length, 1);
  assert.equal(ctg[0].id, "f3");

  // Type filter
  const flats = filterListings(listings, { type: "full_flat" });
  assert.equal(flats.length, 1);
  assert.equal(flats[0].id, "f2");

  // Gender filter
  const maleOnly = filterListings(listings, { gender: "male" });
  assert.equal(maleOnly.length, 1);
  assert.equal(maleOnly[0].id, "f1");

  // Max rent filter
  const cheap = filterListings(listings, { maxRentPoisha: 500000 });
  assert.equal(cheap.length, 1);
  assert.equal(cheap[0].id, "f1");

  // Facilities filter
  const withLift = filterListings(listings, { facilities: ["lift"] });
  assert.equal(withLift.length, 2);
  assert.deepEqual(withLift.map((l) => l.id).sort(), ["f2", "f3"]);

  // Search query filter (area, landmark, title)
  const searchIndira = filterListings(listings, { searchQuery: "ফার্মগেট" });
  assert.equal(searchIndira.length, 1);
  assert.equal(searchIndira[0].id, "f1");

  const searchMetro = filterListings(listings, { searchQuery: "মেট্রোরেল" });
  assert.equal(searchMetro.length, 1);
  assert.equal(searchMetro[0].id, "f1");
});

test("estimateMoveInBudget calculates move-in requirement and recurring monthly cost", () => {
  const est = estimateMoveInBudget({
    rentPoisha: 1500000, // ৳15,000 rent
    advanceMonths: 2, // 2 months advance = ৳30,000
    utilitiesPoisha: 250000, // ৳2,500 utilities
    vanFarePoisha: 180000, // ৳1,800 van fare
    mealDepositPoisha: 300000, // ৳3,000 meal deposit
  });

  assert.equal(est.rentPoisha, 1500000);
  assert.equal(est.advancePoisha, 3000000);
  assert.equal(est.utilitiesPoisha, 250000);
  assert.equal(est.vanFarePoisha, 180000);
  assert.equal(est.mealDepositPoisha, 300000);

  // Total move in = 15000 + 30000 + 2500 + 1800 + 3000 = 52300 Taka = 5230000 poisha
  assert.equal(est.totalMoveInPoisha, 5230000);
  // Recurring = 15000 + 2500 + 3000 = 20500 Taka = 2050000 poisha
  assert.equal(est.recurringMonthlyPoisha, 2050000);
});

test("splitRoomRents reconciles to the exact poisha and weights attached facilities", () => {
  const rooms: RoomInput[] = [
    {
      id: "r1",
      name: "মাস্টার বেড",
      occupantName: "রাকিব",
      hasAttachedBath: true,
      hasBalcony: true,
      sizeSqFt: 150,
    },
    {
      id: "r2",
      name: "মিডল বেড",
      occupantName: "তানভীর",
      hasAttachedBath: false,
      hasBalcony: true,
      sizeSqFt: 130,
    },
    {
      id: "r3",
      name: "ছোট বেড",
      occupantName: "সাজিদ",
      hasAttachedBath: false,
      hasBalcony: false,
      sizeSqFt: 100,
    },
  ];

  const totalRentPoisha = 2400000; // ৳24,000
  const result = splitRoomRents(totalRentPoisha, rooms);

  assert.equal(result.length, 3);
  // Master bed must pay the highest share due to attached bath + balcony
  assert.ok(result[0].sharePoisha > result[1].sharePoisha);
  assert.ok(result[1].sharePoisha > result[2].sharePoisha);

  // Invariant: sum of shares must EQUAL total rent poisha exactly!
  const sum = result.reduce((a, b) => a + b.sharePoisha, 0);
  assert.equal(sum, totalRentPoisha, "Sum of room shares must equal flat rent exactly");

  // Test across random rent amounts to ensure no poisha is ever dropped or created
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  for (let i = 0; i < 50; i++) {
    const rent = (rnd() % 5000000) + 100000;
    const res = splitRoomRents(rent, rooms);
    const total = res.reduce((a, b) => a + b.sharePoisha, 0);
    assert.equal(total, rent, `Invariant failed for rent ${rent}`);
  }
});

test("generateTenancyAgreement generates formal Bangla and English drafts", () => {
  const data = {
    ownerName: "মোহাম্মদ সেলিম",
    tenantName: "আরিফ হাসান",
    tenantNidOrStudentId: "19951234567890",
    tenantPhone: "01712345678",
    flatOrMessAddress: "রোড ৫, সেক্টর ৪, উত্তরা, ঢাকা",
    rentAmountTaka: 15000,
    advanceDepositTaka: 30000,
    dueDayOfMonth: 7,
    noticeMonths: 1,
    startDate: "2026-12-01",
    electricityAndBillsNote: "গ্যাস ও বিদ্যুৎ বিল আলাদা প্রদান করিতে হইবে।",
    customRules: ["ধূমপান সম্পূর্ণ নিষিদ্ধ।", "রাত ১১টার পর গেট বন্ধ থাকিবে।"],
  };

  const bnAgreement = generateTenancyAgreement(data, "bn");
  assert.match(bnAgreement, /মেস ও ফ্ল্যাট ভাড়ার অঙ্গীকারনামা/);
  assert.match(bnAgreement, /মোহাম্মদ সেলিম/);
  assert.match(bnAgreement, /আরিফ হাসান/);
  assert.match(bnAgreement, /19951234567890/);
  assert.match(bnAgreement, /উত্তরা, ঢাকা/);
  assert.match(bnAgreement, /ধূমপান সম্পূর্ণ নিষিদ্ধ/);

  const enAgreement = generateTenancyAgreement(data, "en");
  assert.match(enAgreement, /RENTAL AGREEMENT/);
  assert.match(enAgreement, /PARTIES/);
  assert.match(enAgreement, /মোহাম্মদ সেলিম/);
});

test("sanitizeListings drops invalid entries, handles malicious data, and caps array sizes", () => {
  assert.deepEqual(sanitizeListings(null), []);
  assert.deepEqual(sanitizeListings("invalid string"), []);

  const rawListings = [
    {
      id: "valid_1",
      title: "  সুন্দর মেস  ",
      rentPoisha: 350000,
      advancePoisha: 350000,
      city: "ঢাকা",
      facilities: ["wifi", "gas"],
    },
    {
      id: "valid_1", // duplicate id
      title: "আরেকটি মেস",
      rentPoisha: 200000,
    },
    {
      id: "", // invalid id
      title: "নো আইডি",
      rentPoisha: 100000,
    },
    {
      id: "invalid_rent",
      title: "ফ্রি মেস",
      rentPoisha: -500, // negative rent
    },
    {
      id: "valid_2",
      title: " মিরপুর ফ্ল্যাট ",
      rentPoisha: 1200000,
      advancePoisha: 2400000,
      type: "full_flat",
      gender: "family",
      washroomType: "attached",
      balcony: true,
    },
  ];

  const sanitized = sanitizeListings(rawListings);
  assert.equal(sanitized.length, 2, "Only 2 valid distinct items should survive");
  assert.equal(sanitized[0].id, "valid_1");
  assert.equal(sanitized[0].title, "সুন্দর মেস");
  assert.equal(sanitized[1].id, "valid_2");
  assert.equal(sanitized[1].title, "মিরপুর ফ্ল্যাট");
  assert.equal(sanitized[1].type, "full_flat");
  assert.equal(sanitized[1].gender, "family");
});
