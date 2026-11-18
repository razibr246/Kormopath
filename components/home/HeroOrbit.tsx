"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { KormoPathMark } from "@/components/brand/KormoPathLogo";

export type OrbitTool = { href: string; label: string; icon: LucideIcon; tone: string };

/*
 * Home hero visual: the KormoPath sun in a bronze ring, with every tool on an orbit seen in perspective.
 * Tools in front come forward (bigger, brighter, above the sun); tools behind recede and pass behind it.
 * The orbit has momentum: hover or keyboard focus eases it to a stop and it eases back up again.
 * The sun floats and tilts toward the pointer (a slow sway on touch screens); light moves around the rim;
 * a few warm motes drift through the glow.
 *
 * Cost: one requestAnimationFrame loop touching 9 small elements (left/top/transform/opacity), paused when
 * the orbit is off screen or the tab is hidden. prefers-reduced-motion keeps the original still, flat layout.
 */

const RADIUS = 44; // % of the box
const TILT = 0.56; // ellipse height / width, i.e. how far the orbit plane leans back
const SPEED = (Math.PI * 2) / 70; // one turn in 70 s
const MOTES = [
  { l: 18, t: 70, d: 11, s: 0 }, { l: 30, t: 82, d: 14, s: -4 }, { l: 44, t: 76, d: 12, s: -8 }, { l: 62, t: 84, d: 15, s: -2 },
  { l: 74, t: 72, d: 10, s: -6 }, { l: 84, t: 60, d: 13, s: -9 }, { l: 24, t: 52, d: 16, s: -11 }, { l: 52, t: 64, d: 12, s: -3 },
  { l: 68, t: 50, d: 14, s: -7 }, { l: 36, t: 58, d: 11, s: -10 }, { l: 12, t: 40, d: 15, s: -5 }, { l: 88, t: 38, d: 13, s: -12 },
];

const place = (angle: number, tilt: number) => {
  const depth = Math.sin(angle); // +1 = nearest the viewer (bottom of the ellipse), -1 = farthest
  const near = (depth + 1) / 2;
  return {
    left: 50 + RADIUS * Math.cos(angle),
    top: 50 + RADIUS * tilt * Math.sin(angle),
    scale: tilt === 1 ? 1 : 0.74 + 0.4 * near,
    opacity: tilt === 1 ? 1 : 0.5 + 0.5 * near,
    z: depth > 0 ? 8 : 2,
  };
};

export function HeroOrbit({ tools, caption }: { tools: OrbitTool[]; caption: { kept: string; voice: string } }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLLIElement | null>>([]);
  const n = tools.length;
  const baseAngle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.dataset.live = "true";
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let raf = 0, last = 0, t = 0, angle = 0, speed = SPEED, target = SPEED;
    let visible = true, tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;

    const apply = (dt: number) => {
      speed += (target - speed) * Math.min(1, dt * 2.2); // ease toward the target speed: weight and momentum
      angle += speed * dt;
      t += dt;
      for (let i = 0; i < n; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;
        const p = place(baseAngle(i) + angle, TILT);
        el.style.left = `${p.left}%`;
        el.style.top = `${p.top}%`;
        el.style.opacity = String(p.opacity);
        el.style.zIndex = String(p.z);
        el.style.transform = `translate(-50%, -50%) scale(${p.scale.toFixed(3)})`;
      }
      if (!finePointer) { aimX = Math.sin(t * 0.35) * 4; aimY = Math.cos(t * 0.27) * 5; }
      tiltX += (aimX - tiltX) * Math.min(1, dt * 3);
      tiltY += (aimY - tiltY) * Math.min(1, dt * 3);
      if (sunRef.current) sunRef.current.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    };
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      apply(dt);
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }, { threshold: 0.05 });
    io.observe(root);
    const onVis = () => start();
    const slow = () => { target = 0; };
    const go = () => { if (!root.matches(":hover") && !root.contains(document.activeElement)) target = SPEED; };
    const onMove = (e: PointerEvent) => {
      if (!finePointer) return;
      const r = root.getBoundingClientRect();
      aimY = ((e.clientX - r.left) / r.width - 0.5) * 16;
      aimX = -((e.clientY - r.top) / r.height - 0.5) * 16;
    };
    const onLeave = () => { aimX = 0; aimY = 0; go(); };

    document.addEventListener("visibilitychange", onVis);
    root.addEventListener("pointerenter", slow);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("focusin", slow);
    root.addEventListener("focusout", () => window.setTimeout(go, 0));
    apply(0);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      root.removeEventListener("pointerenter", slow);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("focusin", slow);
      delete root.dataset.live;
    };
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="kp-orbit" ref={rootRef}>
      <div className="kp-orbit-glow" aria-hidden="true" />
      <div className="kp-orbit-rays" aria-hidden="true" />
      <div className="kp-orbit-motes" aria-hidden="true">
        {MOTES.map((m, i) => <i key={i} style={{ left: `${m.l}%`, top: `${m.t}%`, animationDuration: `${m.d}s`, animationDelay: `${m.s}s` }} />)}
      </div>

      {/* Orbit paths: a flat circle until the motion script runs, then the tilted ellipse (CSS swaps them). */}
      <svg className="kp-orbit-path" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
        <circle className="kp-orbit-path-flat" cx="50" cy="50" r={RADIUS} />
        <ellipse className="kp-orbit-path-tilt kp-orbit-path-back" cx="50" cy="50" rx={RADIUS} ry={RADIUS * TILT} />
        <ellipse className="kp-orbit-path-tilt kp-orbit-path-inner" cx="50" cy="50" rx={RADIUS * 0.72} ry={RADIUS * 0.72 * TILT} />
      </svg>

      <div className="kp-orbit-sun-float" aria-hidden="true">
        <div className="kp-orbit-sun" ref={sunRef}>
          <div className="kp-orbit-sheen" />
          <div className="kp-orbit-sun-inner">
            <KormoPathMark className="kp-orbit-mark h-[62%] w-[62%] drop-shadow-[0_18px_30px_rgba(10,74,55,0.45)]" />
          </div>
        </div>
        <div className="kp-orbit-shadow" />
      </div>

      <svg className="kp-orbit-path kp-orbit-path-front" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
        <path className="kp-orbit-path-tilt kp-orbit-path-back" d={`M ${50 - RADIUS} 50 A ${RADIUS} ${RADIUS * TILT} 0 0 0 ${50 + RADIUS} 50`} />
      </svg>

      <ul className="kp-orbit-track" aria-label="KormoPath tools">
        {tools.map((tool, i) => {
          const p = place(baseAngle(i), 1);
          const Icon = tool.icon;
          return (
            <li key={tool.href} ref={(el) => { nodeRefs.current[i] = el; }} className="kp-orbit-node" style={{ left: `${p.left}%`, top: `${p.top}%` }}>
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
