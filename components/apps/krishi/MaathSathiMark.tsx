/**
 * মাঠসাথী mark: a sun rising over paddy rows, with a young seedling in front.
 * Drawn to fill the 40 px AppHeader tile; the seedling sways gently (stops under reduced motion).
 */
export function MaathSathiMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="মাঠসাথী" className="ms-mark">
      <defs>
        <linearGradient id="ms-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="1" stopColor="#f6d58a" />
        </linearGradient>
        <linearGradient id="ms-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f8f4e" />
          <stop offset="1" stopColor="#1f5e36" />
        </linearGradient>
        <clipPath id="ms-tile"><rect width="40" height="40" rx="12" /></clipPath>
      </defs>
      <g clipPath="url(#ms-tile)">
        <rect width="40" height="40" fill="url(#ms-sky)" />
        <circle cx="27" cy="17" r="6.5" fill="#f2a93b" />
        <circle cx="27" cy="17" r="9.5" fill="#f2a93b" opacity=".18" />
        <path d="M0 22 C 10 18, 28 18, 40 21 L40 40 L0 40 Z" fill="url(#ms-land)" />
        {/* paddy rows converging to the horizon */}
        <path d="M2 40 L17 22.5 M11 40 L19 22.4 M21 40 L21.2 22.4 M31 40 L23.4 22.6 M40 37 L25.6 22.9" stroke="#8fd18a" strokeOpacity=".55" strokeWidth="1.1" fill="none" />
        <g className="ms-mark-sprout">
          <path d="M14 36 C 14 31, 14 28.5, 14.5 26" stroke="#e9f7d9" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M14.4 29 C 10.5 28.6, 8.6 26.4, 8.4 23.6 C 11.6 23.6, 13.8 25.6, 14.4 29 Z" fill="#c6ec9a" />
          <path d="M14.6 27.4 C 15.4 24, 18 22.2, 21 22.3 C 20.8 25.4, 18.2 27.6, 14.6 27.4 Z" fill="#e9f7d9" />
        </g>
      </g>
      <rect x=".5" y=".5" width="39" height="39" rx="11.5" fill="none" stroke="#ffffff" strokeOpacity=".45" />
    </svg>
  );
}
