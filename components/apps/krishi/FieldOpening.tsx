import { MaathSathiMark } from "./MaathSathiMark";

/** The one loading screen for MaathSathi's field app (/krishi/field): shown while the page and then the climate data load. */
export function FieldOpening({ step = "page" }: { step?: "page" | "data" }) {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-paper px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="animate-pulse"><MaathSathiMark size={64} /></span>
        <p className="text-[19px] font-semibold text-slate-900">মাঠসাথী খোলা হচ্ছে…</p>
        <p className="max-w-[34ch] text-[14px] leading-relaxed text-slate-600">
          {step === "page" ? "আপনার জমির পাতা তৈরি হচ্ছে" : "নাসার ২৫ মৌসুমের আবহাওয়ার তথ্য আসছে"}
        </p>
      </div>
    </div>
  );
}
