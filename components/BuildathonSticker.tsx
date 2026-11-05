import { existsSync } from "node:fs";
import path from "node:path";

// Required by the Ostad Presents YUNet AIgnite Buildathon 2026 rules: the official sticker must be
// clearly visible near the top of the page. Drop the organisers' file into /public under one of
// these names and it replaces the text badge automatically (checked at build time).
const CANDIDATES = ["buildathon-sticker.png", "buildathon-sticker.svg", "buildathon-sticker.webp", "buildathon-sticker.jpg"];
const LABEL = "Built For Ostad Presents YUNet AIgnite Buildathon 2026";

function stickerFile(): string | null {
  for (const f of CANDIDATES) {
    if (existsSync(path.join(process.cwd(), "public", f))) return `/${f}`;
  }
  return null;
}

export function BuildathonSticker() {
  const src = stickerFile();
  return (
    <div className="relative z-50 border-b border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 print:hidden" role="note" aria-label={LABEL}>
      <a
        href="https://yunet-aignite26.devpost.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={LABEL} className="h-8 w-auto sm:h-9" />
        ) : (
          <span className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border-2 border-amber-500 bg-white px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-900 shadow-sm sm:text-[12px]">
            <span aria-hidden>🏆</span> {LABEL}
          </span>
        )}
      </a>
    </div>
  );
}
