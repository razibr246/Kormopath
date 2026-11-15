"use client";

import { useEffect, useRef } from "react";

/** A lightweight desktop pointer companion; touch and reduced-motion users keep the native pointer. */
export function CursorBuddy() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const ring = ringRef.current;
    const core = coreRef.current;
    if (!root || !ring || !core) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let targetX = -100;
    let targetY = -100;
    let ringX = targetX;
    let ringY = targetY;
    let coreX = targetX;
    let coreY = targetY;
    let frame = 0;
    let visible = false;
    let clickTimer: ReturnType<typeof setTimeout> | undefined;

    const place = (element: HTMLElement, x: number, y: number) => {
      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    const animate = () => {
      frame = 0;
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      coreX += (targetX - coreX) * 0.32;
      coreY += (targetY - coreY) * 0.32;
      place(ring, ringX, ringY);
      place(core, coreX, coreY);
      if (Math.abs(targetX - ringX) > 0.1 || Math.abs(targetY - ringY) > 0.1 || Math.abs(targetX - coreX) > 0.1 || Math.abs(targetY - coreY) > 0.1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    const setStateFromTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const interactive = target.closest("a,button,[role='button'],input,select,textarea,summary,[data-cursor='interactive']");
      const media = target.closest("img,video,canvas,[data-cursor='media']");
      const heading = target.closest("h1,h2,h3,[data-cursor='heading']");
      root.dataset.state = interactive ? "interactive" : media ? "media" : heading ? "heading" : "default";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        visible = true;
        ringX = coreX = targetX;
        ringY = coreY = targetY;
        root.dataset.visible = "true";
      }
      setStateFromTarget(event.target);
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        visible = false;
        root.dataset.visible = "false";
      }
    };
    const onPointerDown = () => {
      root.dataset.clicked = "true";
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { root.dataset.clicked = "false"; }, 260);
    };
    const onPointerUp = () => {
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { root.dataset.clicked = "false"; }, 140);
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        visible = false;
        root.dataset.visible = "false";
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frame) window.cancelAnimationFrame(frame);
      if (clickTimer) clearTimeout(clickTimer);
    };
  }, []);

  return (
    <div ref={rootRef} className="cursor-buddy" aria-hidden="true" data-visible="false" data-state="default" data-clicked="false">
      <span ref={ringRef} className="cursor-buddy-ring" />
      <span ref={coreRef} className="cursor-buddy-core">
        <span className="cursor-buddy-mark">✦</span>
      </span>
    </div>
  );
}
