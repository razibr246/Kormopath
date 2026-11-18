"use client";
import { useState, useMemo } from "react";
import {
  Building2,
  Home,
  MapPin,
  Phone,
  Search,
  Filter,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Wifi,
  Flame,
  Utensils,
  Shield,
  Layers,
  Zap,
  Check,
  Share2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  FileText,
  Calculator,
} from "lucide-react";
import {
  type FlatMessListing,
  type ListingType,
  type GenderPreference,
  DEFAULT_FLAT_MESS_LISTINGS,
  LISTING_TYPES,
  GENDER_PREFERENCES,
  COMMON_FACILITIES,
  MAJOR_BANGLADESH_CITIES,
  filterListings,
  sanitizeListing,
} from "@/lib/flatMess";
import { bnDigits, takaText } from "@/lib/mess";

interface FlatMessDirectoryProps {
  userListings: FlatMessListing[];
  onAddUserListing: (listing: FlatMessListing) => void;
  onDeleteUserListing: (id: string) => void;
  onSelectForCalculator?: (rentPoisha: number, advancePoisha: number, title: string) => void;
  onSelectForAgreement?: (listing: FlatMessListing) => void;
  onOpenPostTab?: () => void;
}

export function FlatMessDirectory({
  userListings,
  onAddUserListing,
  onDeleteUserListing,
  onSelectForCalculator,
  onSelectForAgreement,
  onOpenPostTab,
}: FlatMessDirectoryProps) {
  const [cityFilter, setCityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<ListingType | "all">("all");
  const [genderFilter, setGenderFilter] = useState<GenderPreference | "all">("all");
  const [maxRentTaka, setMaxRentTaka] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Combine built-in starter listings with user-submitted community listings
  const allListings = useMemo(() => {
    return [...userListings, ...DEFAULT_FLAT_MESS_LISTINGS];
  }, [userListings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    const maxPoisha = maxRentTaka ? Number(maxRentTaka) * 100 : undefined;
    return filterListings(allListings, {
      city: cityFilter,
      type: typeFilter,
      gender: genderFilter,
      maxRentPoisha: maxPoisha,
      searchQuery,
      facilities: selectedFacilities,
    });
  }, [allListings, cityFilter, typeFilter, genderFilter, maxRentTaka, searchQuery, selectedFacilities]);

  const toggleFacility = (id: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCopyShare = async (item: FlatMessListing) => {
    const rentText = takaText(item.rentPoisha, true);
    const text = `🏠 ${item.title}\n📍 এলাকা: ${item.area}, ${item.city}\n📌 ল্যান্ডমার্ক: ${item.landmark}\n💰 ভাড়া: ${rentText}/মাস (অগ্রিম: ${takaText(item.advancePoisha, true)})\n📞 যোগাযোগ: ${item.contactName} (${item.contactPhone})\n— KormoPath সহজ বাজেট মেস ও ফ্ল্যাট সহায়ক`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const getFacilityIcon = (id: string) => {
    switch (id) {
      case "wifi":
        return <Wifi size={13} className="text-emerald-700" />;
      case "gas":
        return <Flame size={13} className="text-orange-600" />;
      case "meal":
        return <Utensils size={13} className="text-amber-700" />;
      case "lift":
        return <Layers size={13} className="text-blue-600" />;
      case "generator":
        return <Zap size={13} className="text-yellow-600" />;
      case "security":
        return <Shield size={13} className="text-purple-600" />;
      default:
        return <CheckCircle2 size={13} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="flat-mess-directory">
      {/* Top Banner & Quick Post CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-0.5 text-[12px] font-bold text-emerald-900">
            <Sparkles size={14} className="text-emerald-700" />
            <span>বাংলাদেশ মেস, সাবলেট ও ফ্ল্যাট ডিরেক্টরি</span>
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900">
            মেস সিট, সাবলেট রুম ও বাসা খুঁজুন অথবা পোস্ট করুন
          </h3>
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            ঢাকা, চট্টগ্রাম, রাজশাহী, সিলেট সহ প্রধান ক্যাম্পাস ও জব হাবের যাচাইকৃত মেস ও ফ্ল্যাটের তালিকা। যেকোনো সাধারণ ব্যবহারকারী নিজস্ব বাসা বা সিটের তথ্য পোস্ট করতে পারবেন।
          </p>
        </div>
        {onOpenPostTab && (
          <button
            type="button"
            onClick={onOpenPostTab}
            className="shrink-0 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-[14.5px] font-bold text-white shadow-sm hover:bg-emerald-900 active:scale-98 transition-all"
          >
            <Plus size={18} />
            <span>বাসা/সিট পোস্ট করুন</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Keyword Search */}
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="এলাকা, ভার্সিটি বা ল্যান্ডমার্ক খুঁজুন..."
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">সকল বিভাগ / শহর (All Cities)</option>
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

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ListingType | "all")}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">সব ধরনের বাসা/মেস (All Types)</option>
              {LISTING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.bn} ({t.en})
                </option>
              ))}
            </select>
          </div>

          {/* Max Rent Filter */}
          <div>
            <input
              type="number"
              value={maxRentTaka}
              onChange={(e) => setMaxRentTaka(e.target.value)}
              placeholder="সর্বোচ্চ বাজেট (যেমন ৫০০০)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-[14.5px] focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Gender Preference Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[13px] font-bold text-slate-700">কার জন্য:</span>
          <button
            type="button"
            onClick={() => setGenderFilter("all")}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
              genderFilter === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            সকল
          </button>
          {GENDER_PREFERENCES.filter((g) => g.id !== "any").map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGenderFilter(g.id)}
              className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
                genderFilter === g.id
                  ? "bg-emerald-800 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {g.bn}
            </button>
          ))}
        </div>

        {/* Facility Checkbox Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[13px] font-bold text-slate-700">প্রয়োজনীয় সুবিধা:</span>
          {COMMON_FACILITIES.slice(0, 6).map((fac) => {
            const active = selectedFacilities.includes(fac.id);
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => toggleFacility(fac.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "border border-emerald-500 bg-emerald-100 text-emerald-950 font-bold"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {active && <Check size={12} className="text-emerald-800" />}
                <span>{fac.bn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-[14px] text-slate-600 px-1">
        <span>
          পাওয়া গেছে: <strong>{bnDigits(filteredListings.length)}</strong> টি বাসা ও মেসের তালিকা
        </span>
        {(cityFilter !== "all" || typeFilter !== "all" || genderFilter !== "all" || maxRentTaka || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setCityFilter("all");
              setTypeFilter("all");
              setGenderFilter("all");
              setMaxRentTaka("");
              setSearchQuery("");
              setSelectedFacilities([]);
            }}
            className="text-[13px] font-bold text-emerald-800 hover:underline"
          >
            ফিল্টার রিসেট করুন
          </button>
        )}
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
            <Home size={24} />
          </div>
          <h4 className="text-[17px] font-bold text-slate-900">কোনো মেস বা বাসা পাওয়া যায়নি</h4>
          <p className="text-[14px] text-slate-600 max-w-md mx-auto">
            আপনার পছন্দের এলাকা বা ফিল্টার পরিবর্তন করে দেখুন অথবা আপনার জানা কোনো বাসা/মেস থাকলে নিজেই পোস্ট করুন।
          </p>
          {onOpenPostTab && (
            <button
              type="button"
              onClick={onOpenPostTab}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-[14px] font-bold text-white hover:bg-emerald-900"
            >
              <Plus size={16} /> নতুন পোস্ট তৈরি করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {filteredListings.map((item) => {
            const isUserItem = item.isUserPosted;
            const typeLabel = LISTING_TYPES.find((t) => t.id === item.type)?.bn || item.type;
            const genderLabel = GENDER_PREFERENCES.find((g) => g.id === item.gender)?.bn || item.gender;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all relative group"
              >
                {/* Header & Badges */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[12px] font-bold text-emerald-900 border border-emerald-200">
                        {typeLabel}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-slate-700">
                        {genderLabel}
                      </span>
                      {isUserItem && (
                        <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                          ইউজারের নিজস্ব পোস্ট
                        </span>
                      )}
                      {item.verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                          <CheckCircle2 size={12} className="text-sky-600" />
                          যাচাইকৃত
                        </span>
                      )}
                    </div>
                    {isUserItem && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("আপনি কি এই বিজ্ঞাপনটি মুছে ফেলতে চান?")) {
                            onDeleteUserListing(item.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-700 p-1"
                        title="পোস্ট মুছুন"
                        aria-label="Delete listing"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-[17px] font-bold leading-snug text-slate-900 group-hover:text-emerald-950">
                    {item.title}
                  </h4>

                  {/* Location & Landmark */}
                  <div className="space-y-1 text-[13.5px] text-slate-600">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      <MapPin size={15} className="shrink-0 text-emerald-700" />
                      <span>
                        {item.area}, {item.city}
                      </span>
                    </p>
                    {item.landmark && (
                      <p className="pl-5 text-[12.5px] text-slate-500">
                        নিকটবর্তী: <strong className="text-slate-700">{item.landmark}</strong>
                      </p>
                    )}
                  </div>

                  {/* Facilities */}
                  {item.facilities && item.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.facilities.slice(0, 5).map((facId) => {
                        const facName = COMMON_FACILITIES.find((f) => f.id === facId)?.bn || facId;
                        return (
                          <span
                            key={facId}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11.5px] font-medium text-slate-700 border border-slate-100"
                          >
                            {getFacilityIcon(facId)}
                            <span>{facName}</span>
                          </span>
                        );
                      })}
                      {item.facilities.length > 5 && (
                        <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                          +{bnDigits(item.facilities.length - 5)} আরও
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rules snippet */}
                  {item.rules && item.rules.length > 0 && (
                    <p className="text-[12px] text-amber-900/90 bg-amber-50/70 rounded-lg p-2 border border-amber-200/60 leading-relaxed">
                      💡 <strong>নিয়মাবলী:</strong> {item.rules.join(" · ")}
                    </p>
                  )}
                </div>

                {/* Pricing, Actions & Contact */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[12px] text-slate-500 block">মাসিক ভাড়া</span>
                      <strong className="text-[20px] font-extrabold text-emerald-900 font-mono">
                        {takaText(item.rentPoisha, true)}
                      </strong>
                      <span className="text-[12px] text-slate-600 font-medium">
                        {item.billsIncluded ? " (বিল অন্তর্ভুক্ত)" : " + আলাদা বিল"}
                      </span>
                    </div>
                    {item.advancePoisha > 0 && (
                      <div className="text-right">
                        <span className="text-[12px] text-slate-500 block">অগ্রিম জামানত</span>
                        <span className="text-[14px] font-bold text-slate-700 font-mono">
                          {takaText(item.advancePoisha, true)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info & Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`tel:${item.contactPhone}`}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[13.5px] font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      <Phone size={15} />
                      <span>কল করুন</span>
                    </a>
                    <a
                      href={`https://wa.me/88${item.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `হ্যালো ${item.contactName}, আমি KormoPath-এ আপনার "${item.title}"-এর বিজ্ঞাপনটি দেখেছি। বিস্তারিত জানতে চাই।`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13.5px] font-bold text-emerald-900 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageSquare size={15} className="text-emerald-700" />
                      <span>হোয়াটসঅ্যাপ</span>
                    </a>
                  </div>

                  {/* Utility helper links */}
                  <div className="flex flex-wrap items-center justify-between text-[12px] pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyShare(item)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-800 font-semibold"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={13} className="text-emerald-700" />
                          <span className="text-emerald-800">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={13} />
                          <span>শেয়ার কপি</span>
                        </>
                      )}
                    </button>

                    {onSelectForCalculator && (
                      <button
                        type="button"
                        onClick={() => onSelectForCalculator(item.rentPoisha, item.advancePoisha, item.title)}
                        className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-bold"
                      >
                        <Calculator size={13} />
                        <span>খরচ হিসাব করুন</span>
                      </button>
                    )}

                    {onSelectForAgreement && (
                      <button
                        type="button"
                        onClick={() => onSelectForAgreement(item)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-800 font-semibold"
                      >
                        <FileText size={13} />
                        <span>চুক্তিপত্র খসড়া</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
