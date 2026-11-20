// No "use client": this renders on the server inside the root layout. Keep it hook-free and import-free, so the
// layout never has to load it as a lazy client reference.
/**
 * KormoPathMark's gradients and clip, defined once per page (rendered by app/layout.tsx) under fixed ids. Every
 * KormoPathMark (components/brand/KormoPathLogo.tsx) refers to them, so the mark renders identical HTML on the server and the client wherever it sits in
 * the tree. (Per-instance generated ids changed whenever a parent rendered differently before hydration, which broke
 * hydration.) The holder is 0x0 but not display:none, because browsers skip gradients defined inside display:none.
 */
export function KormoPathMarkDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <linearGradient id="kp-mark-t" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15896a" />
          <stop offset=".55" stopColor="#0e6b4f" />
          <stop offset="1" stopColor="#08402f" />
        </linearGradient>
        <radialGradient id="kp-mark-s" cx=".38" cy=".34" r=".7">
          <stop offset="0" stopColor="#ffb08a" />
          <stop offset=".45" stopColor="#ec6a45" />
          <stop offset="1" stopColor="#c23d27" />
        </radialGradient>
        <linearGradient id="kp-mark-r" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff6e8" />
          <stop offset=".7" stopColor="#f6dfb8" />
          <stop offset="1" stopColor="#e9b864" />
        </linearGradient>
        <clipPath id="kp-mark-c">
          <rect width="64" height="64" rx="16" />
        </clipPath>
      </defs>
    </svg>
  );
}
