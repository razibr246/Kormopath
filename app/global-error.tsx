"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="bn"><body style={{ margin: 0, background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, sans-serif" }}><main style={{ minHeight: "75vh", display: "grid", placeContent: "center", justifyItems: "center", padding: 24, textAlign: "center" }}><p style={{ maxWidth: 480 }}>KormoPath সাময়িকভাবে লোড হয়নি। আপনার ডিভাইসে রাখা তথ্য অক্ষত আছে।</p><button onClick={() => reset()} style={{ padding: "12px 18px", borderRadius: 12, border: 0, background: "#0f172a", color: "white", fontWeight: 700 }}>আবার চেষ্টা করুন</button></main></body></html>;
}
