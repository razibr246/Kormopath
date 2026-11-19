"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Check,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  Filter,
  ArrowUp,
  ArrowDown,
  Pin,
  PinOff,
} from "lucide-react";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import {
  ALL_DASHBOARD_APPS,
  DASHBOARD_PRESETS,
  DEFAULT_PINNED_APPS,
  sanitizePinnedApps,
  reorderPinnedApps,
  togglePinnedApp,
  type DashboardApp,
} from "@/lib/dashboard";

export type AppMeta = DashboardApp;

interface CustomizableDashboardProps {
  allApps?: DashboardApp[];
  lang?: "bn" | "en";
  activePersonaTier?: "free" | "partial" | "pro";
  onUpgradeClick?: (appId: string) => void;
}

export function CustomizableDashboard({
  allApps = ALL_DASHBOARD_APPS as unknown as DashboardApp[],
  lang = "bn",
  activePersonaTier = "free",
  onUpgradeClick,
}: CustomizableDashboardProps) {
  const router = useRouter();
  const bn = lang === "bn";
  const [isEditing, setIsEditing] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("all");
  const modalTitleId = useId();

  const [pinnedApps, setPinnedApps] = usePersistentState<string[]>(
    storageKey("dashboard", "pinned_apps"),
    DEFAULT_PINNED_APPS,
    sanitizePinnedApps
  );

  const handleToggle = (id: string) => {
    setActivePreset("custom");
    setPinnedApps((prev) => togglePinnedApp(prev, id));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setActivePreset("custom");
    setPinnedApps((prev) => reorderPinnedApps(prev, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    setActivePreset("custom");
    setPinnedApps((prev) => reorderPinnedApps(prev, index, index + 1));
  };

  const handleApplyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (presetKey in DASHBOARD_PRESETS) {
      setPinnedApps([...DASHBOARD_PRESETS[presetKey].appIds]);
    }
  };

  const handleReset = () => {
    setActivePreset("all");
    setPinnedApps([...DEFAULT_PINNED_APPS]);
  };

  // Map of apps by ID
  const appMap = new Map(ALL_DASHBOARD_APPS.map((a) => [a.id, a]));

  // Visible apps sorted according to pinnedApps order
  const visibleApps = pinnedApps
    .map((id) => appMap.get(id))
    .filter((a): a is DashboardApp => Boolean(a));

  return (
    <div className="mt-8">
      {/* Top Customizer Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 backdrop-blur shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 mr-1">
            <Filter size={15} className="text-emerald-700" />
            <span>{bn ? "প্রিসেট:" : "Presets:"}</span>
          </span>

          {Object.entries(DASHBOARD_PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key)}
              className={`rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition-all ${
                activePreset === key
                  ? "bg-emerald-800 text-white shadow-xs font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {bn ? p.labelBn : p.labelEn}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-medium text-slate-500">
            {bn
              ? `${ALL_DASHBOARD_APPS.length}টির মধ্যে ${visibleApps.length}টি পিন করা`
              : `${visibleApps.length} of ${ALL_DASHBOARD_APPS.length} pinned`}
          </span>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              isEditing
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>{isEditing ? (bn ? "সম্পন্ন" : "Done") : (bn ? "ড্যাশবোর্ড সাজান" : "Customize")}</span>
          </button>
        </div>
      </div>

      {/* Editing Drawer / Tray */}
      {isEditing && (
        <div
          role="region"
          aria-labelledby={modalTitleId}
          className="mt-3 rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-inner transition-all animate-in fade-in duration-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p id={modalTitleId} className="text-[13.5px] font-bold text-emerald-950">
                {bn
                  ? "ড্যাশবোর্ড কাস্টমাইজ করুন (পিন/আনপিন ও ক্রমানুসারে সাজান):"
                  : "Customize Dashboard (Pin/Unpin & Reorder Apps):"}
              </p>
              <p className="mt-0.5 text-[12px] text-emerald-800">
                {bn
                  ? "অ্যাপের পাশে টিক চিহ্ন দিয়ে পিন/আনপিন করুন এবং তীর চিহ্ন দিয়ে আগে-পরে সরান"
                  : "Check to pin/unpin apps and use arrows to move items up or down"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-800 hover:text-emerald-950 underline"
            >
              <RotateCcw size={12} />
              <span>{bn ? "সব ১২টি অ্যাপ দেখান" : "Reset to all 12"}</span>
            </button>
          </div>

          {/* Reordering & Toggle List */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {ALL_DASHBOARD_APPS.map((app) => {
              const isPinned = pinnedApps.includes(app.id);
              const pinIndex = pinnedApps.indexOf(app.id);

              return (
                <div
                  key={app.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                    isPinned
                      ? "border-emerald-600 bg-white text-slate-900 shadow-2xs font-semibold"
                      : "border-slate-200/80 bg-slate-50 text-slate-400 opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(app.id)}
                    className="flex flex-1 items-center gap-2 min-w-0 text-left text-[13px]"
                  >
                    <span className="text-base shrink-0">{app.icon}</span>
                    <span className="truncate">{bn ? app.nameBn : app.nameEn}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Up / Down Buttons for Pinned Apps */}
                    {isPinned && (
                      <div className="flex items-center gap-0.5 mr-1 border-r border-slate-200 pr-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(pinIndex)}
                          disabled={pinIndex <= 0}
                          className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          title={bn ? "আগে সরান" : "Move up"}
                          aria-label={bn ? "আগে সরান" : "Move up"}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(pinIndex)}
                          disabled={pinIndex >= pinnedApps.length - 1}
                          className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          title={bn ? "পরে সরান" : "Move down"}
                          aria-label={bn ? "পরে সরান" : "Move down"}
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    )}

                    {/* Toggle Pin Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(app.id)}
                      className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                        isPinned
                          ? "bg-emerald-700 text-white"
                          : "border border-slate-300 bg-white hover:border-emerald-500"
                      }`}
                      title={isPinned ? (bn ? "আনপিন করুন" : "Unpin") : (bn ? "পিন করুন" : "Pin")}
                      aria-label={isPinned ? (bn ? "আনপিন করুন" : "Unpin") : (bn ? "পিন করুন" : "Pin")}
                    >
                      {isPinned ? <Check size={14} /> : null}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Render Active Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleApps.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            prefetch={true}
            onPointerEnter={() => {
              if (tool.href.startsWith("/") && !tool.href.includes("#")) router.prefetch(tool.href);
            }}
            onTouchStart={() => {
              if (tool.href.startsWith("/") && !tool.href.includes("#")) router.prefetch(tool.href);
            }}
            className="kp-tool group relative flex flex-col justify-between"
          >
            <span className={`kp-tool-stripe bg-gradient-to-r ${tool.stripe || "from-emerald-500 to-teal-500"}`} aria-hidden="true" />
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${tool.tone || "ring-emerald-500/20 bg-emerald-50 text-emerald-800"} font-serif font-bold text-xl`}>
                  {tool.icon}
                </span>
                <span className="flex items-center gap-1">
                  {tool.isPro && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                      PRO
                    </span>
                  )}
                  <ArrowUpRight
                    size={18}
                    className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-800"
                    aria-hidden="true"
                  />
                </span>
              </div>

              <span className="mt-5 block font-display text-[21px] font-semibold text-slate-900">
                {bn ? tool.nameBn : tool.nameEn}
              </span>
              <span className="mt-0.5 block text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                {bn ? tool.nameEn : tool.nameBn}
              </span>
              <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600">
                {bn ? tool.descBn : (tool.descEn || tool.descBn)}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                {bn ? tool.tagBn : (tool.tagEn || tool.tagBn)}
              </span>
              <span className="text-[12px] font-semibold text-emerald-700 group-hover:underline">
                {bn ? "খুলুন →" : "Open →"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
