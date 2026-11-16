"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { KormoPathMark } from "@/components/KormoPathLogo";

export type OrbitTool = { href: string; label: string; icon: LucideIcon; tone: string };

/**
 * Home hero visual: the KormoPath sun in a bronze ring, with every tool on a slowly turning
 * orbit. Each node is a real link, so the picture doubles as a launcher.
 */
export function HeroOrbit({ tools, caption }: { tools: OrbitTool[]; caption: { kept: string; voice: string } }) {
  return (
    <div className="kp-orbit">
      <div className="kp-orbit-glow" aria-hidden="true" />
      <div className="kp-orbit-ring kp-orbit-ring-outer" aria-hidden="true" />
      <div className="kp-orbit-ring kp-orbit-ring-inner" aria-hidden="true" />

      <div className="kp-orbit-sun" aria-hidden="true">
        <div className="kp-orbit-sun-inner">
          <KormoPathMark className="h-[62%] w-[62%] drop-shadow-[0_18px_30px_rgba(10,74,55,0.45)]" />
        </div>
      </div>

      <ul className="kp-orbit-track" aria-label="KormoPath tools">
        {tools.map((tool, i) => {
          const angle = (i / tools.length) * Math.PI * 2 - Math.PI / 2;
          const Icon = tool.icon;
          return (
            <li key={tool.href} className="kp-orbit-node" style={{ left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%` }}>
              <Link href={tool.href} className={`kp-orbit-chip ${tool.tone}`} aria-label={tool.label} title={tool.label}>
                <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="kp-orbit-card kp-orbit-card-top" aria-hidden="true">
        <span className="kp-orbit-card-icon bg-emerald-50 text-emerald-700">৳</span>
        <span>{caption.kept}</span>
      </div>
      <div className="kp-orbit-card kp-orbit-card-bottom" aria-hidden="true">
        <span className="kp-orbit-card-icon bg-orange-50 text-orange-700">অ</span>
        <span>{caption.voice}</span>
      </div>
    </div>
  );
}
