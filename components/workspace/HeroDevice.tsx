"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Award, Zap, Sparkles } from "lucide-react";
import { KormoPathLogo } from "@/components/brand/KormoPathLogo";

export type HeroDeviceTab = "finops" | "passport" | "contract";

/**
 * World-class 3D Interactive Laptop Device Showcase
 * Features dynamic perspective tilt, multi-app live previews,
 * screen sheen animations, and floating telemetry chips.
 */
export function HeroDevice() {
  const [activeTab, setActiveTab] = useState<HeroDeviceTab>("finops");
  const [tilt, setTilt] = useState({ x: 3, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Auto-cycle through features if not hovered
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev === "finops" ? "passport" : prev === "passport" ? "contract" : "finops"));
    }, 4500);
    return () => clearInterval(timer);
  }, [isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Map mouse position to subtle degree angles
    const rotX = -(y / (rect.height / 2)) * 8 + 3;
    const rotY = (x / (rect.width / 2)) * 10;
    setTilt({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 3, y: 0 });
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="hero-device-wrap relative py-2"
      aria-label="Interactive 3D preview of KormoPath applications"
    >
      {/* Background Cosmic Orbits */}
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />

      {/* 3D Floating Laptop Base & Screen */}
      <div
        className="hero-device transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? "scale3d(1.02, 1.02, 1.02)" : ""}`,
        }}
      >
        <div className="hero-screen shadow-2xl border border-white/20">
          {/* Top Window Bar */}
          <div className="hero-screen-top flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md overflow-hidden bg-[#070d1e] border border-white/20 p-0.5">
                <KormoPathLogo theme="dark" variant="mark" size="sm" />
              </div>
              <span className="font-bold text-[12px] text-white">
                KormoPath <span className="hero-bn font-normal text-slate-400">কর্মপথ</span>
              </span>
            </div>

            {/* Screen Tab Switcher */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("finops")}
                className={`inline-flex min-h-[44px] items-center px-2.5 text-[12px] font-semibold rounded transition-colors ${
                  activeTab === "finops" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                FinOps
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("passport")}
                className={`inline-flex min-h-[44px] items-center px-2.5 text-[12px] font-semibold rounded transition-colors ${
                  activeTab === "passport" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Passport
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("contract")}
                className={`inline-flex min-h-[44px] items-center px-2.5 text-[12px] font-semibold rounded transition-colors ${
                  activeTab === "contract" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Chukti
              </button>
            </div>

            <span className="hero-live text-[9px] font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Tab 1: FinOps Waterfall */}
          {activeTab === "finops" && (
            <div className="hero-screen-content animate-fadeIn">
              <div className="hero-screen-heading">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">YOUR MONTHLY TAKE HOME</span>
                <strong className="text-emerald-400 text-[26px] sm:text-[32px] font-extrabold tracking-tight">
                  ৳১,১৭,৬০০
                </strong>
                <small className="text-[10px] text-slate-400">From $1,000 of direct client work</small>
              </div>
              <div className="hero-screen-chart">
                <div className="hero-chart-row">
                  <span>Direct SWIFT</span>
                  <i><b style={{ width: "95%" }} /></i>
                  <strong>৳১১৭k</strong>
                </div>
                <div className="hero-chart-row">
                  <span>Fiverr</span>
                  <i><b className="hero-bar-leak" style={{ width: "74%" }} /></i>
                  <strong>৳৯৩k</strong>
                </div>
                <div className="hero-chart-row">
                  <span>Upwork</span>
                  <i><b className="hero-bar-gold" style={{ width: "82%" }} /></i>
                  <strong>৳১০৩k</strong>
                </div>
              </div>
              <div className="hero-screen-footer text-[9.5px] text-slate-300 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ArrowUpRight size={13} /> +৳২৪,০০০ Saved vs Fiverr
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <ArrowDownRight size={13} /> 2.5% Cash Incentive
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Skill Passport */}
          {activeTab === "passport" && (
            <div className="hero-screen-content animate-fadeIn">
              <div className="hero-screen-heading">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">CRYPTOGRAPHIC SKILL PASSPORT</span>
                <strong className="text-amber-400 text-[26px] sm:text-[30px] font-extrabold tracking-tight flex items-center gap-1.5">
                  <Award size={24} className="text-amber-400 shrink-0" />
                  Score: 88/100
                </strong>
                <small className="text-[10px] text-slate-400">HMAC-SHA256 signed tamper-proof credential</small>
              </div>
              <div className="hero-screen-chart">
                <div className="hero-chart-row">
                  <span>FullStack TS</span>
                  <i><b style={{ width: "92%" }} /></i>
                  <strong className="text-emerald-400">Verified</strong>
                </div>
                <div className="hero-chart-row">
                  <span>Next.js App</span>
                  <i><b style={{ width: "88%" }} /></i>
                  <strong className="text-emerald-400">Verified</strong>
                </div>
                <div className="hero-chart-row">
                  <span>AI Risk</span>
                  <i><b className="hero-bar-leak" style={{ width: "15%" }} /></i>
                  <strong className="text-sky-300">Low (15%)</strong>
                </div>
              </div>
              <div className="hero-screen-footer text-[9.5px] text-slate-300 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-amber-300 font-semibold">
                  <Sparkles size={13} /> Selective PII Share v2
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  Public verification link ready
                </span>
              </div>
            </div>
          )}

          {/* Tab 3: Outreach contract */}
          {activeTab === "contract" && (
            <div className="hero-screen-content animate-fadeIn">
              <div className="hero-screen-heading">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">CHUKTIGUARD LEGAL SHIELD</span>
                <strong className="text-sky-400 text-[24px] sm:text-[28px] font-extrabold tracking-tight flex items-center gap-1.5">
                  <ShieldCheck size={24} className="text-sky-400 shrink-0" />
                  Clause 4 Active
                </strong>
                <small className="text-[10px] text-slate-400">48h Internet Blackout Force-Majeure Shield</small>
              </div>
              <div className="hero-screen-chart">
                <div className="hero-chart-row">
                  <span>Disruption Protection</span>
                  <i><b style={{ width: "100%" }} /></i>
                  <strong className="text-emerald-400">48 Hours</strong>
                </div>
                <div className="hero-chart-row">
                  <span>NBR ITES Tax Notice</span>
                  <i><b style={{ width: "100%" }} /></i>
                  <strong className="text-emerald-400">Included</strong>
                </div>
                <div className="hero-chart-row">
                  <span>Bilingual Agreement</span>
                  <i><b className="hero-bar-gold" style={{ width: "100%" }} /></i>
                  <strong className="text-amber-300">English + বাংলা</strong>
                </div>
              </div>
              <div className="hero-screen-footer text-[9.5px] text-slate-300 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-sky-300 font-semibold">
                  <Zap size={13} /> Zero-Hallucination Template
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  Non-alterable legal terms
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Laptop Base Bezel */}
        <div className="hero-laptop-base">
          <span />
        </div>
      </div>

      {/* Floating Badges with Depth */}
      <div className="hero-float-card hero-float-top">
        <span className="hero-float-icon">✦</span>
        <span>
          <b>Every taka, traced</b>
          <small>Transparent fee breakdown</small>
        </span>
      </div>

      <div className="hero-float-card hero-float-bottom">
        <span className="hero-float-check">✓</span>
        <span>
          <b>Evidence verified</b>
          <small>Skills backed by your profile</small>
        </span>
      </div>
    </div>
  );
}
