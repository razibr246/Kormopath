"use client";
import React from "react";

export interface KormoPathLogoProps {
  variant?: "full" | "compact" | "mark";
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
  showSubtitle?: boolean;
}

/**
 * KormoPath mark: a road (the "path") rising in perspective toward the red sun of the
 * Bangladesh flag, on a Padma-green tile, with a small gold spark for what comes next.
 * Wordmark: "Kormo" in serif ink + "Path" in italic sunrise-to-gold, with কর্মপথ beneath.
 */
export function KormoPathMark({ className = "h-9 w-9", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g clipPath="url(#kp-mark-c)">
        <rect width="64" height="64" fill="url(#kp-mark-t)" />
        {/* horizon field band */}
        <path d="M0 40 C 16 36, 44 36, 64 40 L64 64 L0 64 Z" fill="#0a5640" opacity=".55" />
        {/* sun: the flag's red disc, set toward the hoist like the flag */}
        <circle className="kp-mark-sun" cx="27" cy="29" r="12.5" fill="url(#kp-mark-s)" />
        <circle className="kp-mark-sun-rim" cx="27" cy="29" r="12.5" fill="none" stroke="#ffd2b8" strokeOpacity=".35" strokeWidth="1" />
        {/* the path: wide near the viewer, narrowing as it climbs to the sun */}
        <path d="M9 64 C 15 55, 31 52, 27.5 45 C 26 42, 26.2 40.4, 26.6 39.6 L 28.2 39.6 C 29.4 41.2, 31.8 43.6, 35 46.5 C 41.5 52.4, 43 58, 42 64 Z" fill="url(#kp-mark-r)" />
        <path className="kp-mark-route" d="M24.5 64 C 25.5 58, 33 54, 30.6 48.2 C 29.6 45.6, 28.2 43, 27.5 41" fill="none" stroke="#c99041" strokeWidth="1.3" strokeDasharray="2.6 2.4" strokeLinecap="round" opacity=".9" />
        {/* gold spark */}
        <path className="kp-mark-spark" d="M49 10 C49 14.2 50.8 16 55 16 C50.8 16 49 17.8 49 22 C49 17.8 47.2 16 43 16 C47.2 16 49 14.2 49 10 Z" fill="#f4cf87" />
        {/* top gloss */}
        <rect width="64" height="30" fill="#fff" opacity=".06" />
      </g>
      <rect x=".5" y=".5" width="63" height="63" rx="15.5" fill="none" stroke="#fff" strokeOpacity=".18" />
    </svg>
  );
}

export function KormoPathLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  className = "",
  showSubtitle = true,
}: KormoPathLogoProps): React.JSX.Element {
  const markSizeCls = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const titleSizeCls = size === "sm" ? "text-[18px]" : size === "lg" ? "text-[26px]" : "text-[21px]";
  const subSizeCls = size === "sm" ? "text-[10.5px]" : size === "lg" ? "text-[13px]" : "text-[11.5px]";
  const dark = theme === "dark";

  const mark = <KormoPathMark className={`${markSizeCls} shrink-0 drop-shadow-[0_4px_10px_rgba(14,107,79,0.28)]`} />;

  if (variant === "mark") {
    return (
      <span className={`inline-flex ${className}`} role="img" aria-label="KormoPath">
        {mark}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`kp-wordmark ${titleSizeCls} ${dark ? "text-[#fbf3e8]" : "text-[#22180f]"}`}>
          Kormo<em className={dark ? "kp-wordmark-path-dark" : "kp-wordmark-path"}>Path</em>
        </span>
        {variant === "full" && showSubtitle && (
          <span className={`kp-wordmark-bn mt-1 ${subSizeCls} ${dark ? "text-[#e2d3c2]" : "text-[#6b5a4b]"}`}>
            কর্মপথ · কাজের পথে সঙ্গী
          </span>
        )}
      </span>
    </span>
  );
}
