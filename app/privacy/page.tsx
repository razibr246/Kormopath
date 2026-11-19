import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "গোপনীয়তা — কী ফোনে থাকে, কী পাঠানো হয়",
  description: "What stays on your device, what is sent to Google when you use AI (store: false), how long anything is kept, and how to delete it.",
};

/*
 * Plain statement of what KormoPath does with data. Every claim here must stay true to the code:
 *  - device storage: lib/clientStore.ts (localStorage, keys kormopath:<app>:<name>), no accounts, no database
 *  - AI calls: lib/gemini.ts always sends store: false; legal and health assistants call structured(..., { cache: false })
 *  - delete: /settings (per app list, export, delete)
 * Change this page whenever one of those changes.
 */

const h2 = "text-[22px] font-semibold leading-snug text-slate-900";
const p = "max-w-[68ch] text-[15.5px] leading-[1.75] text-slate-700";
const en = "max-w-[68ch] text-[14px] leading-relaxed text-slate-500";
const card = "space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6";

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6" data-testid="privacy-page">
      <header className="space-y-2">
        <p className="kp-eyebrow">গোপনীয়তা · Privacy</p>
        <h1 className="text-[clamp(30px,5vw,44px)] font-semibold leading-tight text-slate-900">আপনার তথ্য কোথায় থাকে</h1>
        <p className={p}>কোনো অ্যাকাউন্ট নেই, কোনো ডাটাবেস নেই। আপনি যা সংরক্ষণ করেন তা আপনার এই ফোন বা কম্পিউটারেই থাকে।</p>
        <p className={en}>No accounts and no database. What you save stays on this phone or computer.</p>
      </header>

      <section className={card} aria-labelledby="pv-device">
        <h2 id="pv-device" className={h2}>১. যা শুধু এই ডিভাইসে থাকে</h2>
        <p className={p}>বাজেট ও হিসাব, প্রেসক্রিপশন ও ওষুধের সময়সূচি, ডাক্তারের বুকিং, মামলার টাইমলাইন ও আবেদনের খসড়া, চেকলিস্ট, খামারের খাতা — সবই এই ব্রাউজারের নিজস্ব জায়গায় (localStorage) থাকে। আমাদের সার্ভারে এগুলোর কোনো কপি যায় না। এক অ্যাপ অন্য অ্যাপের তথ্য পড়ে না।</p>
        <p className={en}>Budgets, prescriptions and medicine schedules, doctor bookings, case timelines and drafts, checklists and the farm book are kept in this browser&apos;s own storage. No copy goes to our server, and one app never reads another app&apos;s data.</p>
      </section>

      <section className={card} aria-labelledby="pv-ai">
        <h2 id="pv-ai" className={h2}>২. এআই ব্যবহার করলে Google-এ যা যায়</h2>
        <p className={p}>আইনি সহায়তা ও স্বাস্থ্য সহকারীতে প্রশ্ন পাঠালে <strong>শুধু সেই প্রশ্নের লেখা</strong> (আর আমাদের নির্দিষ্ট নির্দেশনা) আমাদের সার্ভার হয়ে Google-এর Gemini API-তে যায়। আপনার নাম, ফোন নম্বর বা সংরক্ষিত তথ্য যায় না। প্রতিটি অনুরোধ <code className="font-mono text-[14px]">store: false</code> দিয়ে পাঠানো হয়, অর্থাৎ Google-কে কথোপকথন জমিয়ে রাখতে বলা হয় না।</p>
        <p className={p}>কিছু ফিচারে আপনি নিজে বোতাম চাপলে ও সম্মতি দিলে তবেই ছবি বা ফাইল যায়: প্রেসক্রিপশনের ছবি পড়া (মেডিস্ক্যান), সিভি বা রসিদ যাচাই, ফসলের ছবি (মাঠসাথী)। মুখে বলে লেখার সময় আপনার ব্রাউজার নিজের সার্ভারে কণ্ঠ পাঠাতে পারে (যেমন Chrome পাঠায় Google-এ)।</p>
        <p className={p}>এআই চালু না থাকলে বা সংযোগ না পেলে উত্তর আসে ফোন বা সার্ভারের নির্দিষ্ট নিয়ম থেকে; তখন কিছুই Google-এ যায় না, আর উত্তরে লেখা থাকে <strong>“অফলাইন উত্তর”</strong>।</p>
        <p className={en}>In the legal and health assistants, only the text of your question (plus our fixed instructions) goes through our server to Google&apos;s Gemini API, never your name, number or saved data, and every request is sent with store: false. Photos or files go only when you press the button and agree (prescription reading, CV or receipt checks, crop photos). Voice typing may be processed by your browser&apos;s own provider. Without AI, answers come from fixed rules, nothing goes to Google, and the answer is labelled &ldquo;Offline answer&rdquo;.</p>
      </section>

      <section className={card} aria-labelledby="pv-keep">
        <h2 id="pv-keep" className={h2}>৩. কতদিন রাখা হয়</h2>
        <p className={p}>আইনি ও স্বাস্থ্য সহকারীর প্রশ্ন আমাদের সার্ভার কোথাও লিখে রাখে না, মেমরিতেও জমায় না। অন্য কিছু ফিচারে একই প্রশ্নের উত্তর অল্প সময়ের জন্য সার্ভারের মেমরিতে থাকতে পারে, যাতে বারবার এআই ডাকতে না হয়; সার্ভার নতুন করে চালু হলেই তা মুছে যায়। অতিরিক্ত অনুরোধ ঠেকাতে আপনার আইপি ঠিকানা সর্বোচ্চ প্রায় ১০ মিনিট সার্ভারের মেমরিতে গোনা হয়, কোথাও লেখা হয় না।</p>
        <p className={p}>Google-এর দিকে কী হয় তা Google-এর Gemini API শর্তাবলী ঠিক করে; অপব্যবহার ধরতে Google সীমিত সময়ের জন্য তথ্য রাখতে পারে। বিস্তারিত: <a className="font-semibold text-sky-800 underline underline-offset-2" href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">Gemini API শর্তাবলী</a>।</p>
        <p className={p}>আপনার ডিভাইসের তথ্য থাকে যতক্ষণ না আপনি মুছে দেন।</p>
        <p className={en}>Our server does not write down or keep questions from the legal and health assistants. Some other features keep an identical answer briefly in server memory to avoid repeat AI calls; it is gone when the server restarts. Your IP address is counted in server memory for up to about 10 minutes to stop abuse, and is never written down. What happens on Google&apos;s side is set by the Gemini API terms, which allow limited retention for abuse monitoring. Data on your device stays until you delete it.</p>
      </section>

      <section className={card} aria-labelledby="pv-delete">
        <h2 id="pv-delete" className={h2}>৪. কীভাবে মুছবেন</h2>
        <p className={p}><Link href="/settings" className="font-semibold text-sky-800 underline underline-offset-2" data-testid="privacy-settings-link">সেটিংস</Link> পাতায় প্রতিটি অ্যাপের সংরক্ষিত তথ্যের তালিকা আছে; সেখান থেকে প্রতিটি অ্যাপের তথ্য আলাদা করে মুছে দিতে পারবেন, আর চাইলে আগে একটি ব্যাকআপ ফাইল নামিয়ে রাখতে পারবেন। ব্রাউজারের &ldquo;সাইটের তথ্য মুছুন&rdquo; করলেও সব মুছে যায়।</p>
        <p className={en}>The <Link href="/settings" className="underline underline-offset-2">Settings</Link> page lists each app&apos;s saved data; delete it app by app, and download a backup first if you like. Clearing this site&apos;s data in your browser also removes everything.</p>
      </section>
    </main>
  );
}
