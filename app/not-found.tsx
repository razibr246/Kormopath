import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return <main id="main" className="mx-auto flex min-h-[75dvh] max-w-xl flex-col items-center justify-center px-5 text-center">
    <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-bold text-orange-800">পৃষ্ঠা পাওয়া যায়নি · 404</div>
    <h1 className="display mt-5 text-4xl font-extrabold tracking-tight text-slate-950">এই ঠিকানায় কোনো পৃষ্ঠা নেই</h1>
    <p className="mt-3 text-slate-600">লিংকটি পুরোনো বা ভুল হতে পারে। হোমপেজ থেকে অ্যাপ বেছে নিন অথবা দ্রুত খোঁজ খুলুন।</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white"><Home size={17}/>হোমপেজ</Link><Link href="/opportunities" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800">আমার পথ</Link><Link href="/haatbazar" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800">হাটবাজার</Link><Link href="/shohoj-budget" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800">সহজ বাজেট</Link></div>
  </main>;
}
