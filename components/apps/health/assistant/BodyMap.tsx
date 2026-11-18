"use client";
import { useState, type KeyboardEvent } from "react";
import { RotateCw } from "lucide-react";
import { BODY_AREAS, type BodyAreaId } from "@/lib/health/specialty";
import "./assistant.css";

/**
 * A stylised figure that turns in 3D between front and back. Tapping an area (or pressing Enter/Space on it) adds
 * it to the description; skin is a separate toggle. Purely a way to describe where it hurts — it decides nothing.
 */
export function BodyMap({ areas, onToggle, bn }: { areas: BodyAreaId[]; onToggle: (id: BodyAreaId) => void; bn: boolean }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const on = (id: BodyAreaId) => areas.includes(id);
  const label = (id: BodyAreaId) => { const a = BODY_AREAS.find((x) => x.id === id)!; return bn ? a.bn : a.en; };
  const part = (id: BodyAreaId, shape: React.ReactNode) => (
    <g role="button" tabIndex={0} aria-pressed={on(id)} aria-label={label(id)}
      onClick={() => onToggle(id)}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(id); } }}>
      <title>{label(id)}</title>
      {shape}
    </g>
  );
  const P = (id: BodyAreaId) => ({ className: "hb-part", "data-on": on(id) ? "true" : "false" } as const);

  const limbs = (
    <>
      {part("arms", <><rect {...P("arms")} x="14" y="58" width="18" height="78" rx="9" /><rect {...P("arms")} x="88" y="58" width="18" height="78" rx="9" /></>)}
      {part("legs", <><rect {...P("legs")} x="36" y="140" width="22" height="88" rx="10" /><rect {...P("legs")} x="62" y="140" width="22" height="88" rx="10" /></>)}
      {part("head", <circle {...P("head")} cx="60" cy="26" r="20" />)}
    </>
  );

  return (
    <div className="space-y-2">
      <div className="hb-stage mx-auto w-[170px]">
        <div className="hb-flip" data-side={side}>
          <svg className="hb-face hb-idle" viewBox="0 0 120 240" aria-label={bn ? "শরীরের সামনের দিক" : "Front of the body"}>
            <ellipse className="hb-shadow" cx="60" cy="234" rx="34" ry="5" />
            {part("chest", <rect {...P("chest")} x="34" y="50" width="52" height="42" rx="14" />)}
            {part("belly", <rect {...P("belly")} x="36" y="94" width="48" height="44" rx="14" />)}
            {limbs}
          </svg>
          <svg className="hb-face hb-face-back hb-idle" viewBox="0 0 120 240" aria-label={bn ? "শরীরের পেছনের দিক" : "Back of the body"}>
            <ellipse className="hb-shadow" cx="60" cy="234" rx="34" ry="5" />
            {part("back", <rect {...P("back")} x="34" y="50" width="52" height="88" rx="16" />)}
            {limbs}
          </svg>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => setSide(side === "front" ? "back" : "front")} className="kp-chip !min-h-[44px] !text-[13.5px]" data-testid="bodymap-turn">
          <RotateCw size={15} aria-hidden /> {side === "front" ? (bn ? "পেছন দিক দেখুন" : "Show back") : (bn ? "সামনের দিক দেখুন" : "Show front")}
        </button>
        <button type="button" aria-pressed={on("skin")} onClick={() => onToggle("skin")} className={`kp-chip !min-h-[44px] !text-[13.5px] ${on("skin") ? "kp-chip-on" : ""}`}>
          {label("skin")}
        </button>
      </div>
      {areas.length > 0 && (
        <p className="text-center text-[13.5px] text-slate-600" aria-live="polite">{bn ? "বাছাই: " : "Selected: "}{areas.map(label).join(", ")}</p>
      )}
    </div>
  );
}
