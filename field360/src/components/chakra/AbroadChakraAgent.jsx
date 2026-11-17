import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Send, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import ChakraLogo from './ChakraLogo';
import { queryChakraLLM } from '../../engine/chakraLLM';
import { MacTrafficLights, MinimizedWindowPill, publishChakraDockState } from '../MacOSPortalChrome';
import './chakra.css';

function offlineAnswer(context, message, lang, T, role) {
  const llm = queryChakraLLM(message, { role, lang, place: context?.place });
  if (llm?.reply) return llm.reply;

  const p = context.place;
  const q = message.toLowerCase();
  const soil = p.soil;
  if (/soil|মাটি|ph|জৈব পদার্থ/.test(q) && soil) {
    const facts = [soil.ph != null ? (lang === 'bn' ? `পিএইচ ${soil.ph}` : `pH ${soil.ph}`) : null, soil.om_pct != null ? (lang === 'bn' ? `${soil.om_pct}% জৈব পদার্থ` : `${soil.om_pct}% organic matter`) : null].filter(Boolean);
    if (facts.length) return lang === 'bn'
      ? `অ্যাপের মাটির রেকর্ডে ${facts.join(' এবং ')} আছে। ${soil.tested ? 'এটি আপনার মাটি পরীক্ষার ফল।' : 'এটি মডেলের অনুমান, মাটি পরীক্ষা নয়।'}`
      : `The app’s soil record shows ${facts.join(' and ')}. ${soil.tested ? 'This is your soil test.' : 'This is a model estimate, not a soil test.'}`;
  }
  if (/rain|weather|বৃষ্টি|আবহাওয়া|forecast/.test(q)) {
    const days = p.forecast?.days ?? [];
    const rain = days.map((d) => d.rainMm ?? d.rain ?? d.precipitation).filter((v) => Number.isFinite(v));
    if (rain.length) return lang === 'bn' ? `আগামী ${rain.length} দিনের পূর্বাভাসে বৃষ্টির পরিমাণ ${rain.join(', ')} মিমি।` : `The forecast lists ${rain.join(', ')} mm of rain over the next ${rain.length} days.`;
    const recent = p.climate?.recent?.rain30;
    if (recent?.rain != null) return lang === 'bn' ? `অ্যাপের সাম্প্রতিক রেকর্ডে ৩০ দিনে ${recent.rain} মিমি বৃষ্টি আছে; এটি আগামী দিনের পূর্বাভাস নয়।` : `The recent app record shows ${recent.rain} mm over 30 days; that is not a forecast.`;
  }
  if (role === 'officer' && /request|অনুরোধ|কৃষক/.test(q)) {
    const open = (p.requests ?? []).filter((r) => !r.reply);
    return lang === 'bn' ? `এই দেশের বোর্ডে ${open.length}টি অনুত্তরিত নমুনা অনুরোধ আছে। পাঠানোর আগে অনুরোধের পাতায় নিজে দেখে নিন।` : `The country board has ${open.length} unanswered sample request(s). Review each on the requests page before replying.`;
  }
  if (p.field?.lat != null) return lang === 'bn'
    ? `এই নমুনা খেতের অবস্থান ${p.field.lat.toFixed(3)}, ${p.field.lon.toFixed(3)}। ${p.sources?.field ?? 'খেতের তথ্য'}। এই প্রশ্নের জন্য অ্যাপে আর নির্দিষ্ট তথ্য নেই।`
    : `This sample field is at ${p.field.lat.toFixed(3)}, ${p.field.lon.toFixed(3)}. Source: ${p.sources?.field ?? 'field record'}. The app has no more specific data for this question.`;
  return T('এখন এজেন্ট সার্ভার পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।', 'The agent service is unavailable right now. Please try again later.');
}

export default function AbroadChakraAgent({ role, context }) {
  const { T, L, s, macosPortal } = useStore();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [big, setBig] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState([]);
  const country = context?.c;
  const base = `/abroad/${country?.id}`;
  useEffect(() => {
    publishChakraDockState({ role, mode: 'manual', verdictsCount: 0, snoozedAll: false, minimizedVerdict: null, minimizedPanel: minimized, panelOpen: open });
  }, [role, minimized, open]);
  useEffect(() => () => publishChakraDockState({ role: null, verdictsCount: 0, snoozedAll: false, minimizedVerdict: null, minimizedPanel: false, panelOpen: false }), []);
  useEffect(() => {
    const onOpen = () => { setMinimized(false); setOpen(true); };
    const onRestore = () => { setMinimized(false); setOpen(true); };
    window.addEventListener('open-chakra', onOpen);
    window.addEventListener('chakra-dock-restore-panel', onRestore);
    return () => {
      window.removeEventListener('open-chakra', onOpen);
      window.removeEventListener('chakra-dock-restore-panel', onRestore);
    };
  }, []);
  const ask = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    const history = turns.slice(-8).map(({ who, text }) => ({ who, text }));
    setTurns((old) => [...old, { who: 'user', text: message }]);
    setDraft(''); setBusy(true);
    try {
      const response = await fetch('/api/field360/agent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, lang: s.lang, message, history, data: { place_context: context.place } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Agent unavailable');
      const nav = result.proposals?.find((p) => p.action === 'navigate' && typeof p.target === 'string' && p.target.startsWith(`${base}/`))?.target;
      setTurns((old) => [...old, { who: 'agent', text: result.reply || T('এই তথ্য দিয়ে উত্তর তৈরি করা যায়নি।', 'I could not form an answer from this data.'), nav, sources: result.sources || [] }]);
    } catch {
      setTurns((old) => [...old, { who: 'agent', text: offlineAnswer(context, message, s.lang, T, role) }]);
    } finally { setBusy(false); }
  };
  if (!country || !context.place) return null;
  const openPanel = () => { setMinimized(false); setOpen(true); };
  const closePanel = () => { setMinimized(false); setOpen(false); };
  const minimizePanel = () => { setOpen(false); setMinimized(true); };
  return <>
    <button type="button" onClick={openPanel} data-tour="chakra" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-2 text-sm font-semibold text-ink hover:bg-primary-50" aria-label={T('চক্র এজেন্ট', 'Chakra Agent')}><ChakraLogo size={25} /><span>{T('চক্র', 'Chakra')}</span></button>
    {createPortal(<>
      {!open && <div className="fixed bottom-6 right-4 lg:right-20 z-40"><button type="button" onClick={openPanel} aria-label={T('চক্র এজেন্ট খুলুন', 'Open Chakra Agent')} className="chakra-orb h-14 w-14 outline-none focus-visible:ring-4 focus-visible:ring-primary-300/60"><span className="chakra-orb-band" /><span className="chakra-orb-gloss" /></button></div>}
      {open && <div className="fixed inset-0 z-[1700]" role="dialog" aria-modal="true" aria-label={T('চক্র এজেন্ট', 'Chakra Agent')} onKeyDown={(e) => e.key === 'Escape' && closePanel()}>
        <button type="button" aria-label={T('বন্ধ করুন', 'Close')} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={minimizePanel} />
        <section className={`chakra-panel chakra-pop absolute inset-x-2 bottom-2 top-[6vh] flex flex-col overflow-hidden rounded-[28px] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(700px,88vh)] ${big ? 'sm:w-[min(800px,94vw)]' : 'sm:w-[430px]'}`}>
          <header className="flex items-center gap-3 border-b border-white/10 bg-white/[.04] px-4 py-3.5">
            <MacTrafficLights
              onClose={closePanel}
              onMinimize={minimizePanel}
              onExpand={() => setBig((v) => !v)}
              expanded={big}
              closeLabel={T('বন্ধ করুন', 'Close')}
              minimizeLabel={T('ডকে মিনিমাইজ করুন', 'Minimize to Dock')}
              expandLabel={big ? T('ছোট করুন', 'Smaller') : T('বড় করুন', 'Larger')}
            />
            <ChakraLogo size={28} />
            <div className="min-w-0 flex-1"><b>{T('চক্র এজেন্ট', 'Chakra Agent')}</b><p className="text-xs text-white/60">{L(country.name)} · {role === 'officer' ? T('কৃষি কর্মকর্তা', 'Agriculture officer') : T('কৃষক', 'Farmer')}</p></div>
          </header>
          <div className="mx-4 mt-3 rounded-xl border border-white/15 bg-white/5 p-3 text-xs leading-5 text-white/65">{T('শুধু এই দেশের খেতের তথ্য ব্যবহার হয়। স্থানীয় নিয়ম বা অনুপস্থিত তথ্য অনুমান করা হয় না। এজেন্ট কোনো রেকর্ড বা বার্তা পাঠাতে পারে না।', 'Uses only this country’s farm data. It does not guess local rules or missing facts, and cannot send messages or change records.')}</div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {!turns.length && <p className="text-sm text-white/70">{T('এই জমি, মাটি বা অ্যাপে থাকা আবহাওয়ার তথ্য নিয়ে জিজ্ঞেস করুন।', 'Ask about this field, soil, or weather information available in the app.')}</p>}
            {turns.map((turn, i) => <div key={i} className={turn.who === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-white/15 p-3' : 'max-w-[95%]'}><p className="whitespace-pre-wrap text-[15px] leading-7">{turn.text}</p>{turn.nav && <Link to={turn.nav} onClick={closePanel} className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-primary-950">{T('পাতাটি খুলুন', 'Open page')}<ChevronRight size={15} /></Link>}{turn.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-2 mr-2 inline-block text-xs underline">{source.title}</a>)}</div>)}
            {busy && <p className="text-sm text-white/60">{T('তথ্য মিলিয়ে দেখছি…', 'Checking the available data…')}</p>}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t border-white/10 p-3"><label className="sr-only" htmlFor="abroad-chakra-input">{T('আপনার প্রশ্ন', 'Your question')}</label><input id="abroad-chakra-input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={600} placeholder={T('প্রশ্ন লিখুন…', 'Ask a question…')} className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/45" /><button disabled={busy || !draft.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-paddy-300 text-primary-950 disabled:opacity-40" aria-label={T('পাঠান', 'Send')}><Send size={17} /></button></form>
        </section>
      </div>}
      {!open && minimized && (
        <MinimizedWindowPill
          kind="panel"
          title={T('চক্র এজেন্ট', 'Chakra Agent')}
          onRestore={openPanel}
          onDismissAll={closePanel}
          portalDockVisible={macosPortal}
          role={role}
        />
      )}
    </>, document.body)}
  </>;
}
