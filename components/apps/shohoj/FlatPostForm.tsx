"use client";
import { useState } from "react";
import {
  Plus,
  Home,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Phone,
  User,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  type FlatMessListing,
  type ListingType,
  type GenderPreference,
  type WashroomType,
  LISTING_TYPES,
  GENDER_PREFERENCES,
  COMMON_FACILITIES,
  MAJOR_BANGLADESH_CITIES,
} from "@/lib/flatMess";
import { parseTaka } from "@/lib/mess";

interface FlatPostFormProps {
  onAddListing: (listing: FlatMessListing) => void;
  onDone?: () => void;
}

export function FlatPostForm({ onAddListing, onDone }: FlatPostFormProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ListingType>("mess_seat");
  const [gender, setGender] = useState<GenderPreference>("male");
  const [city, setCity] = useState("ঢাকা");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [rentTaka, setRentTaka] = useState("");
  const [advanceTaka, setAdvanceTaka] = useState("");
  const [billsIncluded, setBillsIncluded] = useState(true);
  const [estimatedBillsTaka, setEstimatedBillsTaka] = useState("");
  const [seatCount, setSeatCount] = useState("1");
  const [roomCount, setRoomCount] = useState("1");
  const [washroomType, setWashroomType] = useState<WashroomType>("common");
  const [balcony, setBalcony] = useState(false);
  const [floor, setFloor] = useState("2");
  const [facilities, setFacilities] = useState<string[]>(["wifi", "gas", "meal"]);
  const [rules, setRules] = useState("রাত ১১টায় গেট বন্ধ, ধূমপান নিষিদ্ধ");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [availableFrom, setAvailableFrom] = useState("১ম তারিখ থেকে");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const toggleFacility = (id: string) => {
    setFacilities((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("একটি স্পষ্ট শিরোনাম দিন (যেমন: ফার্মগেটে ছেলেদের মেস সিট খালি)");
      return;
    }
    if (!area.trim()) {
      setError("এলাকা বা রাস্তার নাম দিন (যেমন: মিরপুর ১০, ইন্দিরা রোড)");
      return;
    }

    const rentPoisha = parseTaka(rentTaka);
    if (!rentPoisha || rentPoisha <= 0) {
      setError("সঠিক মাসিক ভাড়ার পরিমাণ লিখুন (যেমন: ৩০০০ বা ১৫০০০)");
      return;
    }

    const advancePoisha = advanceTaka ? parseTaka(advanceTaka) ?? 0 : 0;
    const estBillsPoisha = estimatedBillsTaka ? parseTaka(estimatedBillsTaka) ?? 0 : 0;

    const cleanPhone = contactPhone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError("যোগাযোগের জন্য সঠিক মোবাইল নম্বর দিন");
      return;
    }

    const splitRules = rules
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean);

    const newListing: FlatMessListing = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim().slice(0, 120),
      type,
      gender,
      city: city.trim().slice(0, 40),
      area: area.trim().slice(0, 60),
      address: address.trim().slice(0, 150),
      landmark: landmark.trim().slice(0, 100),
      rentPoisha,
      advancePoisha,
      billsIncluded,
      estimatedBillsPoisha: estBillsPoisha,
      seatCount: type === "mess_seat" ? Math.max(1, Number(seatCount) || 1) : undefined,
      roomCount: type === "full_flat" ? Math.max(1, Number(roomCount) || 1) : undefined,
      washroomType,
      balcony,
      floor: Number(floor) || 1,
      facilities,
      rules: splitRules,
      contactName: contactName.trim().slice(0, 50) || "বিজ্ঞাপনদাতা",
      contactPhone: cleanPhone,
      availableFrom: availableFrom.trim().slice(0, 40) || "চলতি মাস",
      postedDate: new Date().toISOString().slice(0, 10),
      isUserPosted: true,
      verified: false,
      sourceNote: "ব্যবহারকারীর নিজস্ব পোস্ট (User Listed)",
    };

    onAddListing(newListing);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      if (onDone) onDone();
    }, 1500);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-6" data-testid="flat-post-form">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[12px] font-bold text-emerald-950">
            <Plus size={14} className="text-emerald-700" />
            <span>নতুন বিজ্ঞাপন / পোস্ট</span>
          </div>
          <h3 className="mt-1 text-[20px] font-extrabold text-slate-900">
            মেস সিট, সাবলেট রুম বা ফ্ল্যাটের তথ্য পোস্ট করুন
          </h3>
          <p className="text-[14px] text-slate-600">
            আপনার বাসা বা মেসের অতিরিক্ত সিট/রুমের বিজ্ঞাপন দিন। তথ্য ব্রাউজারের লোকাল স্টোরেজে সংরক্ষিত থাকে এবং ডিরেক্টরিতে তাৎক্ষণিক প্রদর্শিত হয়।
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[14px] font-bold text-red-800 border border-red-200">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-[14px] font-bold text-emerald-900 border border-emerald-300">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-700" />
          <span>বিজ্ঞাপনটি সফলভাবে পোস্ট হয়েছে! ডিরেক্টরিতে যুক্ত করা হয়েছে।</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <label className="block text-[14px] font-bold text-slate-900">
            বিজ্ঞাপনের শিরোনাম <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="যেমন: ফার্মগেটে ইন্দিরা রোডে ছেলেদের মেস সিট খালি, আলো-বাতাসপূর্ণ"
            className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Type & Gender */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">বিজ্ঞাপনের ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ListingType)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            >
              {LISTING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.bn} ({t.en})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">কার জন্য প্রযোজ্য</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderPreference)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            >
              {GENDER_PREFERENCES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.bn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location: City, Area, Address, Landmark */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">শহর / বিভাগ</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            >
              {MAJOR_BANGLADESH_CITIES.map((c) => {
                const shortCity = c.split(" ")[0];
                return (
                  <option key={shortCity} value={shortCity}>
                    {c}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">
              এলাকা ও রোড <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="যেমন: ফার্মগেট (ইন্দিরা রোড) বা মিরপুর ১০"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">নিকটবর্তী স্থান / ল্যান্ডমার্ক</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="যেমন: মেট্রোরেল স্টেশন থেকে ২ মিনিট বা চবি গেট সংলগ্ন"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">বিস্তারিত ঠিকানা (ঐচ্ছিক)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="বাড়ি নং, রোড নং, ইত্যাদি"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Pricing: Rent & Advance */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">
              মাসিক ভাড়া (টাকা) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={rentTaka}
              onChange={(e) => setRentTaka(e.target.value)}
              placeholder="যেমন: ৩২০০ বা ১৫০০০"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] font-mono font-semibold focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">অগ্রিম জামানত (টাকা)</label>
            <input
              type="text"
              value={advanceTaka}
              onChange={(e) => setAdvanceTaka(e.target.value)}
              placeholder="যেমন: ৩২০০ বা ৩০০০০"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] font-mono focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">কবে থেকে খালি</label>
            <input
              type="text"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              placeholder="যেমন: চলতি মাস বা ১ তারিখ"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Bills Included */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer text-[14px] font-bold text-slate-800">
            <input
              type="checkbox"
              checked={billsIncluded}
              onChange={(e) => setBillsIncluded(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>ভাড়ার সাথে গ্যাস, পানি ও অন্যান্য বিল অন্তর্ভুক্ত</span>
          </label>
          {!billsIncluded && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-slate-600">আলাদা বিল আনুমানিক (টাকা):</span>
              <input
                type="text"
                value={estimatedBillsTaka}
                onChange={(e) => setEstimatedBillsTaka(e.target.value)}
                placeholder="যেমন: ১৫০০"
                className="w-28 min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 text-[13.5px] font-mono"
              />
            </div>
          )}
        </div>

        {/* Specs: Washroom, Balcony, Floor, Seat/Room count */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-[13.5px] font-bold text-slate-900">বাথরুম</label>
            <select
              value={washroomType}
              onChange={(e) => setWashroomType(e.target.value as WashroomType)}
              className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px]"
            >
              <option value="common">কমন বাথরুম</option>
              <option value="attached">অ্যাটাচড বাথরুম</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[13.5px] font-bold text-slate-900">বারান্দা</label>
            <select
              value={balcony ? "yes" : "no"}
              onChange={(e) => setBalcony(e.target.value === "yes")}
              className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px]"
            >
              <option value="no">বারান্দা নেই</option>
              <option value="yes">বারান্দা আছে</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[13.5px] font-bold text-slate-900">কত তলা</label>
            <input
              type="number"
              min="0"
              max="30"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[13.5px] font-bold text-slate-900">
              {type === "mess_seat" ? "সিট সংখ্যা" : "রুম সংখ্যা"}
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={type === "mess_seat" ? seatCount : roomCount}
              onChange={(e) =>
                type === "mess_seat" ? setSeatCount(e.target.value) : setRoomCount(e.target.value)
              }
              className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 text-[14px]"
            />
          </div>
        </div>

        {/* Facilities selection */}
        <div className="space-y-2">
          <label className="block text-[14px] font-bold text-slate-900">সুযোগ-সুবিধা নির্বাচন করুন</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMMON_FACILITIES.map((fac) => {
              const active = facilities.includes(fac.id);
              return (
                <button
                  key={fac.id}
                  type="button"
                  onClick={() => toggleFacility(fac.id)}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-[13px] border transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                      active ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300"
                    }`}
                  >
                    {active && <CheckCircle2 size={12} />}
                  </div>
                  <span>{fac.bn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-1">
          <label className="block text-[14px] font-bold text-slate-900">
            মেস বা বাসার প্রধান নিয়মাবলী (কমা দিয়ে লিখুন)
          </label>
          <input
            type="text"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="যেমন: রাত ১১টায় গেট বন্ধ, ধূমপান নিষেধ, গেস্ট নিয়ম"
            className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-[14px] focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Contact Info */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">যোগাযোগকারীর নাম</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="যেমন: রাকিব (মেস ম্যানেজার)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[14px] font-bold text-slate-900">
              মোবাইল নম্বর <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="যেমন: 01711XXXXXX"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-[14.5px] font-mono font-semibold focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full min-h-[48px] rounded-xl bg-emerald-800 px-6 text-[16px] font-extrabold text-white shadow-sm hover:bg-emerald-900 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={19} />
            <span>বিজ্ঞাপনটি পোস্ট করুন (Post Listing)</span>
          </button>
        </div>
      </form>
    </div>
  );
}
