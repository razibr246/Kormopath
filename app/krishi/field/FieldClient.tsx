"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// FieldShift360 reads window, localStorage and Leaflet at import time, so it only ever renders in the browser.
const Field360App = dynamic(() => import("@/field360/src/Field360App"), {
  ssr: false,
  loading: () => <Opening />,
});

function Opening() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-[15px] text-slate-600" role="status">
      মাঠের তথ্য খোলা হচ্ছে… · Opening field tools…
    </div>
  );
}

/**
 * FieldShift360 brings its own global stylesheet (field360/src/f360.css: its Tailwind build, body and html rules).
 * It must never share a document with another KormoPath page, so this page always runs in a document of its own:
 * reached by client-side navigation (a next/link, the command palette, Buddy) it reloads before FieldShift360 or its
 * CSS loads, and left by client-side navigation it reloads the page being opened.
 */
export function FieldClient() {
  const [own, setOwn] = useState(false);
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const loadedHere = !nav || new URL(nav.name).pathname === window.location.pathname;
    if (!loadedHere) { window.location.reload(); return; }
    setOwn(true);
    const here = window.location.pathname;
    // Unmount with a new address = a client-side route change away (React's dev double-mount keeps the address).
    return () => { window.setTimeout(() => { if (window.location.pathname !== here) window.location.reload(); }, 0); };
  }, []);
  return own ? <Field360App /> : <Opening />;
}
