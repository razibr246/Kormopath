"use client";
import React, { useId } from "react";

export interface KormoPathLogoProps {
  variant?: "full" | "compact" | "mark";
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Unified, responsive vector brand logo for KormoPath.
 * Preserves 1:1 aspect ratio vector mark with zero distortion,
 * supporting dark & light themes, and full, compact, or mark-only variants.
 */
export function KormoPathLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  className = "",
  showSubtitle = true,
}: KormoPathLogoProps): React.JSX.Element {
  const reactId = useId().replace(/:/g, "");
  const bgGradId = `kp-bg-${reactId}`;
  const arrowGradId = `kp-arrow-${reactId}`;
  const blueGradId = `kp-blue-${reactId}`;

  // Sizing tokens
  const markSizeCls =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";

  const titleSizeCls =
    size === "sm"
      ? "text-[16px]"
      : size === "lg"
        ? "text-[23px]"
        : "text-[19px]";

  const subSizeCls =
    size === "sm"
      ? "text-[9.5px]"
      : size === "lg"
        ? "text-[11.5px]"
        : "text-[10px]";

  // Theming tokens
  const kormoTextCls = theme === "dark" ? "text-white" : "text-slate-900";
  const pathGradCls =
    theme === "dark"
      ? "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 bg-clip-text text-transparent"
      : "bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent";
  const subTextCls = theme === "dark" ? "text-slate-400" : "text-slate-500";

  // Vector mark SVG based on public/favicon.svg
  const vectorMark = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${markSizeCls} shrink-0 aspect-square rounded-xl shadow-xs transition-transform group-hover:scale-105`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1226" />
          <stop offset="100%" stopColor="#050813" />
        </linearGradient>

        <linearGradient id={arrowGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>

        <linearGradient id={blueGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Deep Cosmic Midnight Rounded Square */}
      <rect width="64" height="64" rx="16" fill={`url(#${bgGradId})`} />
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="15.5"
        stroke="#1e293b"
        strokeWidth="1"
      />

      {/* Left Blue Vertical Stem of K */}
      <rect
        x="11"
        y="24"
        width="7"
        height="23"
        rx="2"
        fill={`url(#${blueGradId})`}
      />

      {/* Open Book at the bottom (White) */}
      <path
        d="M 12 49 Q 22 44 32 48 Q 42 44 52 49 L 50 46 Q 41 42 32 45 Q 23 42 14 46 Z"
        fill="#ffffff"
        opacity="0.95"
      />
      <path
        d="M 15 50 Q 23 46 32 49 Q 41 46 49 50"
        stroke="#007aff"
        strokeWidth="1.2"
        fill="none"
        opacity="0.5"
      />

      {/* Ascending Road Path & Arrow (Orange / Amber) */}
      <path
        d="M 16 46 C 24 38 28 34 33 30 C 37 36 43 43 51 47 L 46 47 C 40 43 36 38 32 33 C 28 37 23 41 16 46 Z"
        fill={`url(#${arrowGradId})`}
      />

      <path
        d="M 18 43 C 25 36 29 28 36 21 L 43 14 L 38 12 L 53 11 L 51 26 L 47 21 L 39 27 C 32 33 27 39 20 45 Z"
        fill={`url(#${arrowGradId})`}
      />

      {/* Road Center Dashes */}
      <path
        d="M 23 41 C 28 34 32 28 39 22"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="2.5 2"
        strokeLinecap="round"
      />

      {/* Brain & Intelligence Node on Top Left */}
      <g transform="translate(18, 11) scale(0.65)">
        <path
          d="M 10 18 C 6 18 3 15 3 11 C 3 8 5 6 8 5 C 9 2 13 1 16 3 C 18 1 23 2 24 5 C 27 6 29 8 29 11 C 29 15 26 18 22 18 Z"
          fill="#ffffff"
        />
        <path
          d="M 16 7 L 16 16"
          stroke="#007aff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 10 12 Q 13 10 16 12 Q 19 10 22 12"
          stroke="#007aff"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Glowing Mind Rays (Sunburst Orange) */}
      <line
        x1="39"
        y1="12"
        x2="43"
        y2="8"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="43"
        y1="16"
        x2="47"
        y2="14"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        {vectorMark}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {vectorMark}
      <div className="flex flex-col whitespace-nowrap leading-none">
        <span
          className={`display font-extrabold tracking-tight ${titleSizeCls} leading-none`}
        >
          <span className={kormoTextCls}>Kormo</span>
          <span className={pathGradCls}>Path</span>
        </span>
        {variant === "full" && showSubtitle && (
          <span
            className={`font-semibold ${subTextCls} ${subSizeCls} leading-tight mt-1 hidden xs:block`}
          >
            কর্মপথ • Autonomous AI
          </span>
        )}
      </div>
    </div>
  );
}
