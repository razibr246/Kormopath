import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/** Decorative product preview that shows the app's main money comparison. */
export function HeroDevice() {
  return (
    <div className="hero-device-wrap" aria-hidden="true">
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />
      <div className="hero-device">
        <div className="hero-screen">
          <div className="hero-screen-top">
            <span className="hero-brand-dot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kormopath-logo.jpg"
                alt="KormoPath Logo"
                className="w-full h-full object-cover rounded-[5px]"
              />
            </span>
            <span>KormoPath <span className="hero-bn">কর্মপথ</span></span>
            <span className="hero-live"><i /> LIVE BENCHMARK</span>
          </div>
          <div className="hero-screen-content">
            <div className="hero-screen-heading">
              <span>YOUR MONTHLY TAKE HOME</span>
              <strong>৳১,১৭,৬০০</strong>
              <small>From $1,000 of direct client work</small>
            </div>
            <div className="hero-screen-chart">
              <div className="hero-chart-row"><span>Direct client</span><i><b style={{ width: "92%" }} /></i><strong>৳১১৭k</strong></div>
              <div className="hero-chart-row"><span>Fiverr</span><i><b className="hero-bar-leak" style={{ width: "73%" }} /></i><strong>৳৯৩k</strong></div>
              <div className="hero-chart-row"><span>Upwork</span><i><b className="hero-bar-gold" style={{ width: "81%" }} /></i><strong>৳১০৩k</strong></div>
            </div>
            <div className="hero-screen-footer"><span><ArrowUpRight size={14} /> Best route found</span><span><ArrowDownRight size={14} /> Fees itemized</span></div>
          </div>
        </div>
        <div className="hero-laptop-base"><span /></div>
      </div>
      <div className="hero-float-card hero-float-top"><span className="hero-float-icon">✦</span><span><b>Every taka, traced</b><small>Transparent fee breakdown</small></span></div>
      <div className="hero-float-card hero-float-bottom"><span className="hero-float-check">✓</span><span><b>Evidence verified</b><small>Skills backed by your profile</small></span></div>
    </div>
  );
}
