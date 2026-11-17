// চক্র এজেন্ট in the farmer and officer headers: the button, the floating orb, the assistant panel (talk, tasks,
// security) and, for the officer, the pop-up where a person approves what the agent drafted before it goes out.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Volume2, VolumeX, Keyboard, SendHorizontal, ShieldCheck, ShieldAlert, ListChecks, MessageCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Smartphone, Gavel, UsersRound, Route, Target, Brain, Layers } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { smsSplit } from '../../engine/text';
import { AGENT_NAME, POLICY, DAILY_AUTO_LIMIT, autoCountToday, nextAutoVerdict, dismissAllVerdicts, verdictQueueNav } from '../../engine/chakra';
import { useChakra } from './useChakra';
import { PROBLEM_PATH } from '../../engine/path';
import { cropName } from '../../engine/crops';
import { fmtDate } from '../../engine/dates';
import ChakraLogo from './ChakraLogo';
import AbroadChakraAgent from './AbroadChakraAgent';
import { MacTrafficLights, MinimizedWindowPill, publishChakraDockState } from '../MacOSPortalChrome';
import './chakra.css';

export function ChakraOrb({ phase = 'idle', size = 64, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="chakra-orb shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-primary-300/60 active:scale-95" data-phase={phase} style={{ width: size, height: size }}>
      <span className="chakra-orb-band" /><span className="chakra-orb-gloss" />
    </button>
  );
}

const GATE = {
  auto: { bn: 'এজেন্ট নিজে করবে', en: 'Agent does it' },
  confirm: { bn: 'আপনার হ্যাঁ লাগবে', en: 'Needs your yes' },
  verdict: { bn: 'কর্মকর্তার অনুমোদন লাগবে', en: 'Needs officer approval' },
};
const ACTION = { notify: ['জানানো', 'Shown in demo'], addRequest: ['ডেমোতে অনুরোধ রাখা', 'Request saved in demo'], followUp: ['ডেমোতে মনে করানো', 'Demo follow-up saved'], addAdvisory: ['ডেমো বার্তা রাখা', 'Demo message saved'], updateRequest: ['অনুরোধের অবস্থা', 'Request status'], escalate: ['ডেমোতে নথিভুক্ত', 'Recorded in demo'], reject: ['বাতিল', 'Rejected'], dismiss: ['দেখা হয়েছে', 'Seen'], decline: ['পাঠানো হয়নি', 'Not sent'] };

// No SMS gateway is connected, so the message opens in the phone's own SMS app, filled in, for one tap on Send.
const smsHref = (mobile, text) => `sms:+88${mobile}?&body=${encodeURIComponent(text)}`;

function TaskCard({ c, task, compact }) {
  const { T, L, s, profile } = useStore();
  const phone = profile.mobile;
  const sms = c.role === 'farmer' ? smsSplit(`${L(task.title)}: ${L(task.body)}`) : null;
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[.06] p-3.5">
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.risk === 'high' ? 'bg-red-400' : task.risk === 'medium' ? 'bg-amber-300' : 'bg-emerald-300'}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-snug">{L(task.title)}</div>
          <p className="mt-1 text-[13.5px] leading-6 text-white/80">{L(task.body)}</p>
          {!compact && <p className="mt-1 text-[12px] text-white/50">{T('কেন: ', 'Why: ')}{L(task.why)}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold text-white/85">{L(GATE[task.gate])}</span>
            <span className="[&_*]:!text-[11px]"><Tags list={task.tags} /></span>
          </div>
          {sms && !compact && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/50"><Smartphone size={13} />{T(`বাটন ফোনে এসএমএস: ${num(sms.length, 'bn')} ভাগ`, `To a button phone by SMS: ${sms.length} part(s)`)}
              {phone ? <> → {s.lang === 'bn' ? bnDigits(phone) : phone} <a href={smsHref(phone, sms.join(' '))} className="chakra-chip rounded-full px-2 py-0.5 font-semibold text-white/85">{T('ফোন থেকে পাঠান', 'Send from phone')}</a></> : T(' (মোবাইল নম্বর দেওয়া নেই)', ' (no mobile number yet)')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {task.gate === 'verdict' && <button type="button" onClick={() => c.openVerdict(task)} className="inline-flex items-center gap-1.5 rounded-full bg-paddy-300 px-3.5 py-1.5 text-[13px] font-bold text-primary-950"><Gavel size={14} />{T('দেখে অনুমোদন দিন', 'Review & approve')}</button>}
        {task.gate === 'confirm' && task.effects.some((e) => e.type !== 'notify') && <button type="button" onClick={() => c.act(task)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold text-primary-950"><SendHorizontal size={14} />{T('হ্যাঁ, ডেমোতে রাখুন', 'Yes, save in demo')}</button>}
        {task.nav && <Link to={task.nav} onClick={c.close} className="chakra-chip inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold">{T('দেখুন', 'Open')}<ChevronRight size={14} /></Link>}
        {!s.chakra.handled.includes(task.id) && <button type="button" onClick={() => (task.gate === 'verdict' ? c.reject(task) : c.dismiss(task))} className="chakra-chip rounded-full px-3 py-1.5 text-[13px] font-semibold text-white/75">{task.gate === 'verdict' ? T('বাতিল', 'Reject') : T('দেখেছি', 'Got it')}</button>}
      </div>
    </div>
  );
}

// চক্র দল (engine/crew.js): who worked on the answer, what each read and found, most important first.
function CrewRun({ run, compact }) {
  const { T, L, s } = useStore();
  if (compact) return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/55"><UsersRound size={13} />{T('দলের কাজ:', 'Crew:')}
      {run.trace.filter((t) => t.asked).map((t) => <span key={t.member} className="chakra-chip rounded-full px-2 py-0.5">{L(t.name)}{t.notes ? ` · ${num(t.notes, s.lang)}` : ''}</span>)}
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-5 text-white/60">{T('চক্র দলের প্রত্যেক সদস্যের একটাই কাজ। আগের জনের খবর পরের জন পড়ে, আর সমন্বয়ক সবচেয়ে জরুরি তিনটি কথা বেছে বলে। দল নিজে কিছু পাঠাতে পারে না; কাজ হয় কাজের তালিকা থেকে, অনুমতি মেনে।', 'Each crew member has one job. Each reads what the one before found, and the coordinator picks the three most important points to say. The crew cannot send anything itself; actions go through the task list and its permissions.')}</p>
      {run.trace.map((t) => (
        <div key={t.member} className={`rounded-2xl border p-3 ${t.asked ? 'border-white/12 bg-white/[.06]' : 'border-white/5 bg-white/[.02] opacity-70'}`}>
          <div className="flex items-center justify-between gap-2"><span className="text-[14.5px] font-bold">{L(t.name)}</span><span className="text-[11px] text-white/45">{t.error ? T('সমস্যা হয়েছে', 'failed') : !t.asked ? T('শুধু তথ্য দিয়েছে', 'facts only') : T(`${num(t.notes, s.lang)}টি কথা`, `${t.notes} note(s)`)}</span></div>
          {t.goal && <p className="mt-0.5 text-[12.5px] text-white/60">{L(t.goal)}</p>}
          {t.reads && <p className="mt-1 text-[11px] text-white/40">{T('পড়েছে: ', 'Read: ')}{L(t.reads)}</p>}
          <ul className="mt-1.5 space-y-1">{run.notes.filter((n) => n.member === t.member).map((n) => <li key={n.key} className={`text-[13px] leading-6 ${run.top.includes(n) ? 'text-white' : 'text-white/60'}`}>{run.top.includes(n) ? '★ ' : '· '}{L(n.text)}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

// চক্র পথ (engine/path.js): each problem's steps, done, waiting (for whom) or still ahead.
const PATH_ORDER = ['reported', 'first_look', 'officer', 'advised', 'check_back', 'solved'];
function PathView({ c }) {
  const { T, L, s } = useStore();
  if (!c.caseList.length) return <p className="py-10 text-center text-[14px] text-white/55">{T('কোনো সমস্যা জানানো হয়নি।', 'No problems reported.')}</p>;
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-5 text-white/60">{T('প্রতিটি সমস্যা একই পথে চলে: জানানো, কর্মকর্তার উত্তর, তারপর আপনার কথা যে মিটেছে। যেখানে মানুষের সিদ্ধান্ত লাগে, পথ সেখানে থেমে অপেক্ষা করে।', 'Every problem follows the same path: reported, the officer’s answer, then your word that it is solved. Where a person must decide, the path stops and waits.')}</p>
      {c.caseList.slice(0, 8).map((k) => {
        const done = new Set(k.trail.map((t) => t.node));
        return (
          <div key={k.id} className="rounded-2xl border border-white/12 bg-white/[.06] p-3">
            <div className="flex items-center justify-between gap-2 text-[14px] font-bold"><span className="truncate">{cropName(k.crop, s.lang)} · {L(k.text) || k.symptom}</span><span className="shrink-0 text-[11px] font-semibold text-white/45">{fmtDate(k.created, s.lang)}</span></div>
            <ol className="mt-2 space-y-1">
              {PATH_ORDER.filter((id) => id !== 'first_look' || done.has(id)).map((id) => {
                const n = PROBLEM_PATH.nodes[id];
                const here = k.waiting?.node === id || (id === 'officer' && k.waiting?.node === 'more_info');
                const state = done.has(id) ? 'done' : here ? 'wait' : 'next';
                return (
                  <li key={id} className="flex items-start gap-2 text-[13px] leading-5">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${state === 'done' ? 'bg-emerald-300' : state === 'wait' ? 'animate-pulse bg-amber-300' : 'bg-white/15'}`} />
                    <span className={state === 'next' ? 'text-white/40' : 'text-white/90'}>{L(n.name)}{state === 'wait' && k.waiting?.ask ? <span className="block text-[12px] text-amber-100/80">{L(k.waiting.ask)} · {k.waiting.who === 'officer' ? T('কর্মকর্তার পালা', 'officer’s turn') : T('আপনার পালা', 'your turn')}</span> : null}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

// চক্র লক্ষ্য (engine/goal.js): the steps the goal loop took, and where it was careful.
function GoalRun({ goal }) {
  const { T, L } = useStore();
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[.06] p-3">
      <div className="flex items-center gap-1.5 text-[13px] font-bold"><Target size={14} />{T('লক্ষ্য: ', 'Goal: ')}{L(goal.goal.name)}</div>
      <ol className="mt-1.5 space-y-1">{goal.steps.map((st, i) => <li key={i} className="text-[12.5px] leading-5 text-white/75"><span className={st.ok ? 'text-emerald-300' : 'text-amber-300'}>{st.ok ? '✓' : '!'}</span> <b className="font-semibold text-white/90">{L(st.name)}:</b> {L(st.result)}</li>)}</ol>
    </div>
  );
}

function Panel({ c, onClose, onMinimize }) {
  const { s, T, L, today } = useStore();
  const [tab, setTab] = useState('talk');
  const [big, setBig] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const end = useRef(null);
  const box = useRef(null);
  useEffect(() => { c.start(); box.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [c.messages.length, c.interim, tab]);
  const submit = (e) => { e.preventDefault(); c.send(text); setText(''); };
  const talk = () => (c.phase === 'listening' || c.phase === 'speaking' ? c.stopAll() : c.listen());
  const used = autoCountToday(c.audit, c.role, today);
  const tabs = [['talk', MessageCircle, T('কথা', 'Talk')], ['tasks', ListChecks, T(`কাজ ${c.tasks.length ? num(c.tasks.length, s.lang) : ''}`, `Tasks ${c.tasks.length || ''}`)], ['crew', UsersRound, T('দল', 'Crew')], ['path', Route, T('পথ', 'Path')], ['safe', ShieldCheck, T('নিরাপত্তা', 'Security')]];
  return (
    <div className="fixed inset-0 z-[1700]" role="dialog" aria-modal="true" aria-label={L(AGENT_NAME)} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="sheet-fade absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onMinimize || onClose} />
      <div ref={box} tabIndex={-1} className={`chakra-panel chakra-pop absolute inset-x-2 bottom-2 top-[6vh] flex flex-col overflow-hidden rounded-[28px] outline-none sm:inset-x-auto sm:right-5 sm:bottom-5 sm:top-auto sm:h-[min(760px,88vh)] ${big ? 'sm:w-[min(820px,94vw)]' : 'sm:w-[430px]'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[.04] px-4 py-3.5">
          <MacTrafficLights
            onClose={onClose}
            onMinimize={onMinimize}
            onExpand={() => setBig((v) => !v)}
            expanded={big}
            closeLabel={T('বন্ধ করুন', 'Close Chakra')}
            minimizeLabel={T('ডকে মিনিমাইজ করুন', 'Minimize to Dock')}
            expandLabel={big ? T('ছোট করুন', 'Smaller') : T('বড় করুন', 'Larger')}
          />
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <ChakraLogo size={28} spin={c.phase === 'thinking'} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15.5px] font-bold">{L(AGENT_NAME)}</div>
              <div className="truncate text-[11px] text-white/60">{c.role === 'farmer' ? T('আপনার জমির সহকারী', 'Your field assistant') : T('অফিসের সহকারী', 'Office assistant')}{c.ai === 'on' ? ' · AI' : ''}</div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-full border border-white/15 bg-white/[.07] px-2 py-0.5 text-[10.5px] font-semibold text-white/75">
            {c.mode === 'agent' ? T('এজেন্ট', 'Agent') : T('ম্যানুয়াল', 'Manual')}
          </span>
        </div>

        {/* Manual or agent: who acts. */}
        <div className="mx-4 mt-3 grid grid-cols-2 rounded-full bg-white/8 p-1 text-[13.5px] font-bold" role="radiogroup" aria-label={T('কাজের ধরন', 'Mode')}>
          {[['manual', T('ম্যানুয়াল', 'Manual')], ['agent', T('এজেন্ট', 'Agent')]].map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={c.mode === m} onClick={() => c.setMode(m)} className={`rounded-full py-2 transition-colors ${c.mode === m ? 'bg-white text-primary-950 shadow' : 'text-white/70 hover:text-white'}`}>{label}</button>
          ))}
        </div>
        <p className="mx-5 mt-1.5 text-center text-[11.5px] leading-5 text-white/55">
          {c.mode === 'agent'
            ? (c.role === 'farmer' ? T('এজেন্ট নিজে থেকে আপনার সমস্যা অফিসে পাঠাবে, উত্তর না এলে মনে করাবে আর পরামর্শ জানাবে।', 'The agent reports your problems to the office, chases late replies and tells you what to do, on its own.') : T('এজেন্ট উত্তর আর পরামর্শের খসড়া করবে; পাঠানোর আগে আপনার অনুমোদন চাইবে।', 'The agent drafts replies and advice, and asks your approval before anything goes out.'))
            : T('এজেন্ট শুধু পরামর্শ দেবে; প্রতিটি কাজ আপনি নিজে করবেন।', 'The agent only suggests; you do every step yourself.')}
        </p>
        {/* গভীর ভাবনা: every AI question goes to the largest model and thinks hard (slower, and only when the AI is on). */}
        <button type="button" onClick={() => c.setDeepOn(!c.deepOn)} aria-pressed={c.deepOn}
          className={`mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${c.deepOn ? 'bg-paddy-300 text-primary-950' : 'chakra-chip text-white/75'}`}>
          <Brain size={13} />{c.deepOn ? T('গভীর ভাবনা চালু: সবচেয়ে বড় মডেল', 'Deep thinking on: the largest model') : T('গভীর ভাবনা', 'Deep thinking')}
        </button>

        <div className="mx-4 mt-2 flex gap-1 border-b border-white/10">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-[13px] font-semibold ${tab === id ? 'border-paddy-300 text-white' : 'border-transparent text-white/55 hover:text-white/80'}`}><Icon size={15} />{label}</button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
          {tab === 'talk' && (
            <div className="space-y-4">
              {c.messages.map((m) => (m.who === 'user' ? (
                <div key={m.id} className="flex justify-end"><span className="chakra-bubble-user max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 text-[15px]">{m.text}</span></div>
              ) : m.who === 'task' ? (
                <TaskCard key={m.id} c={c} task={m.task} compact />
              ) : m.who === 'goal' ? (
                <GoalRun key={m.id} goal={m.goal} />
              ) : m.who === 'crew' ? (
                <CrewRun key={m.id} run={m.crew} compact />
              ) : (
                <div key={m.id}>
                  <p className="text-[17px] leading-8 text-white/95">{m.text}</p>
                  {m.tags && <span className="mt-1 inline-flex flex-wrap items-center gap-1.5 [&_*]:!text-[11px]"><Tags list={m.tags} />{m.model && <span className="text-white/40">{m.deep ? T('গভীর ভাবনা · ', 'Deep · ') : ''}{m.model}</span>}</span>}
                  {!!m.sources?.length && <div className="mt-1.5 flex flex-wrap gap-1.5">{m.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="chakra-chip max-w-[220px] truncate rounded-full px-2.5 py-1 text-[11.5px] text-white/70">{x.title}</a>)}</div>}
                  {(m.chips?.length || m.nav) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.nav && <Link to={m.nav} onClick={onClose} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-primary-950">{T('পাতাটি খুলুন', 'Open the page')}<ChevronRight size={14} /></Link>}
                      {m.chips?.map((ch) => <button key={ch} type="button" onClick={() => c.send(ch)} className="chakra-chip rounded-full px-3 py-1.5 text-[13px] font-semibold">{ch}</button>)}
                    </div>
                  )}
                </div>
              )))}
              {c.interim && <p className="text-[17px] italic text-white/50">{c.interim}…</p>}
              {c.phase === 'thinking' && <p className="text-[14px] text-white/50">{c.thinkingDeep ? T('গভীরভাবে ভাবছি, সব তথ্য মিলিয়ে দেখছি… (এক মিনিট পর্যন্ত লাগতে পারে)', 'Thinking deeply over all the data… (can take up to a minute)') : T('ভাবছি…', 'Thinking…')}</p>}
            </div>
          )}
          {tab === 'tasks' && (
            <div className="space-y-3">
              {!c.tasks.length && <p className="py-10 text-center text-[14px] text-white/55"><CheckCircle2 className="mx-auto mb-2 text-emerald-300" />{T('এখন কোনো কাজ বাকি নেই।', 'Nothing waiting right now.')}</p>}
              {c.tasks.map((t) => <TaskCard key={t.id} c={c} task={t} />)}
            </div>
          )}
          {tab === 'crew' && <CrewRun run={c.crew} />}
          {tab === 'path' && <PathView c={c} />}
          {tab === 'safe' && (
            <div className="space-y-4 text-[13.5px] leading-6">
              <div className={`flex items-center gap-2 rounded-2xl p-3 ${c.auditOk.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/15 text-red-200'}`}>
                {c.auditOk.ok ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                <span>{c.auditOk.ok ? T(`কাজের খাতা অক্ষত: ${num(c.audit.length, 'bn')}টি লেখা, প্রতিটি আগেরটির সঙ্গে হ্যাশে বাঁধা।`, `Activity log intact: ${c.audit.length} entries, each hash-linked to the one before.`) : T(`কাজের খাতায় ${num(c.auditOk.brokenAt, 'bn')} নম্বরে পরিবর্তন ধরা পড়েছে।`, `The log was changed at entry ${c.auditOk.brokenAt}.`)}</span>
              </div>
              <div>
                <div className="font-bold">{T('এজেন্ট নিজে যা পারে', 'What the agent may do alone')}</div>
                <p className="text-white/70">{POLICY[c.role].auto.map((a) => T(ACTION[a][0], ACTION[a][1])).join(', ')}. {T(`দিনে সর্বোচ্চ ${num(DAILY_AUTO_LIMIT, 'bn')}টি (আজ ${num(used, 'bn')}টি)।`, `At most ${DAILY_AUTO_LIMIT} a day (${used} today).`)}</p>
                {!!POLICY[c.role].verdict.length && <><div className="mt-2 font-bold">{T('মানুষের অনুমোদন ছাড়া কখনো নয়', 'Never without a person’s approval')}</div><p className="text-white/70">{POLICY[c.role].verdict.map((a) => T(ACTION[a][0], ACTION[a][1])).join(', ')}.</p></>}
                <p className="mt-2 text-white/55">{c.role === 'farmer' ? T('শুধু আপনার নিজের জমি আর অনুরোধ নিয়েই কাজ করে।', 'It acts only on your own field and requests.') : T('শুধু আপনার উপজেলার ইউনিয়নের অনুরোধ নিয়েই কাজ করে।', 'It acts only on requests from your own upazila’s unions.')} {T('AI শুধু প্রস্তাব দেয়, নিজে কিছু পাঠাতে পারে না; চাবি সার্ভারে থাকে, ব্রাউজারে আসে না।', 'The AI can only propose, never send; its key stays on the server, never in the browser.')}</p>
              </div>
              <div>
                <div className="mb-1 font-bold">{T('সাম্প্রতিক কাজ', 'Recent activity')}</div>
                {!c.audit.length && <p className="text-white/55">{T('এখনো কিছু হয়নি।', 'Nothing yet.')}</p>}
                <ol className="space-y-1">
                  {c.audit.filter((e) => e.role === c.role).slice(-14).reverse().map((e) => (
                    <li key={e.seq} className="flex gap-2 text-[12.5px] text-white/70">
                      <span className="w-12 shrink-0 text-white/40">#{num(e.seq, s.lang)}</span>
                      <span className="min-w-0 flex-1 truncate">{e.action.split('+').map((a) => (ACTION[a] ? T(ACTION[a][0], ACTION[a][1]) : a)).join(' + ')} · {e.gate === 'auto' ? T('এজেন্ট', 'agent') : T('মানুষ', 'person')} · {e.result}</span>
                      <code className="shrink-0 text-white/30">{e.hash.slice(0, 6)}</code>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          <div ref={end} />
        </div>

        {typing && tab === 'talk' && (
          <form onSubmit={submit} className="mx-4 mb-2 flex items-center gap-2 rounded-full bg-white/10 pl-4 pr-1.5">
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={600} className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40" placeholder={c.role === 'farmer' ? T('যেমন: ধানে পোকা লেগেছে', 'e.g. insects on my rice') : T('যেমন: আজকের অবস্থা', 'e.g. today’s briefing')} aria-label={T('লিখে বলুন', 'Type to the agent')} />
            <button type="submit" className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary-950" aria-label={T('পাঠান', 'Send')}><SendHorizontal size={17} /></button>
          </form>
        )}
        <div className="relative z-10 flex items-center justify-between px-6 pb-5 pt-1">
          <button type="button" onClick={() => { c.setVoiceOn(!c.voiceOn); if (c.voiceOn) c.stopAll(); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-pressed={c.voiceOn} aria-label={c.voiceOn ? T('কথা বলা বন্ধ', 'Mute voice') : T('কথা বলা চালু', 'Turn voice on')}>{c.voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
          <div className="flex flex-col items-center gap-1">
            <ChakraOrb phase={c.phase} size={76} onClick={talk} label={c.phase === 'listening' ? T('শোনা থামান', 'Stop listening') : T('কথা বলুন', 'Talk')} />
            <span className="text-[11.5px] text-white/50">{{ listening: T('শুনছি…', 'Listening…'), thinking: T('ভাবছি…', 'Thinking…'), speaking: T('বলছি… থামাতে ছুঁয়ে দিন', 'Speaking… tap to stop') }[c.phase] ?? T('ছুঁয়ে কথা বলুন', 'Tap and speak')}</span>
            {c.voiceNote && <span className="max-w-[200px] text-center text-[10.5px] leading-4 text-amber-200/80">{c.voiceNote === 'quota' ? T('আজকের স্বাভাবিক কণ্ঠের সীমা শেষ; কাল আবার ফিরবে। এখন ডিভাইসের কণ্ঠ।', 'Today’s natural-voice limit is used; it is back tomorrow. Device voice for now.') : T('স্বাভাবিক কণ্ঠ চালু নেই; ডিভাইসের কণ্ঠ বলছে।', 'Natural voice is off; the device voice speaks.')}</span>}
          </div>
          <button type="button" onClick={() => { setTyping(!typing); setTab('talk'); }} className={`grid h-12 w-12 place-items-center rounded-full ${typing ? 'bg-white text-primary-950' : 'bg-white/10 hover:bg-white/20'}`} aria-pressed={typing} aria-label={T('লিখে বলুন', 'Type instead')}><Keyboard size={20} /></button>
        </div>
      </div>
    </div>
  );
}

// The officer's verdict: what the agent drafted, the request and the crop doctor's first look, editable, then approve
// or reject. Nothing is sent in the office's name without this.
function Verdict({
  c,
  task,
  expanded,
  onToggleExpand,
  onMinimize,
  onDismissAll,
  onSelectTask,
  onClose,
}) {
  const { s, T, L, farmerOf } = useStore();
  const adv = task.effects.find((e) => e.type === 'addAdvisory')?.adv;
  const one = adv?.to.length === 1 ? farmerOf(adv.to[0]) : null; // a reply to one farmer can also go to their phone
  const oneMobile = one && (s.profiles[one.id]?.mobile || one.mobile);
  const [text, setText] = useState(adv?.text ?? '');
  const [queueMenu, setQueueMenu] = useState(false);
  const activeRowRef = useRef(null);
  useEffect(() => { setText(adv?.text ?? ''); setQueueMenu(false); }, [task.id, adv?.text]);
  useEffect(() => {
    if (expanded) activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [expanded, task.id]);
  const req = task.request ? s.requests.find((r) => r.id === task.request) : null;
  const top = task.look?.findings?.[0];
  const q = verdictQueueNav(c.verdicts, task.id);
  return (
    <div
      className="fixed inset-0 z-[1750] flex items-end justify-center p-2.5 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chakra-verdict"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          if (queueMenu) { setQueueMenu(false); return; }
          (q.total > 1 ? onMinimize(task) : onDismissAll(task));
          return;
        }
        if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        if (e.key === 'ArrowLeft' && q.prev) { e.preventDefault(); onSelectTask(q.prev); }
        if (e.key === 'ArrowRight' && q.next) { e.preventDefault(); onSelectTask(q.next); }
      }}
    >
      <div className="sheet-fade absolute inset-0 bg-primary-950/50 backdrop-blur-[5px]" onClick={() => (q.total > 1 ? onMinimize(task) : onDismissAll(task))} />
      <div className={`macos-glass-window sheet-up relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] transition-[max-width] duration-250 ${expanded ? 'max-w-4xl' : 'max-w-lg'}`}>
        {/* macOS Liquid Glass Titlebar */}
        <div className="macos-verdict-titlebar text-white">
          <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 sm:px-5">
            <MacTrafficLights
              onClose={() => onDismissAll(task)}
              onMinimize={() => onMinimize(task)}
              onExpand={onToggleExpand}
              expanded={expanded}
              closeLabel={q.total > 1 ? T('সব পপআপ একবারে বন্ধ করুন (পরে দেখুন)', 'Close all remaining popups (snooze)') : T('বন্ধ করুন', 'Close')}
              minimizeLabel={T('ডকে মিনিমাইজ করুন', 'Minimize to Dock')}
              expandLabel={expanded ? T('ছোট মাপ', 'Compact view') : T('বড় করে সবগুলো দেখুন', 'Expand queue view')}
            />
            <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
              <ChakraLogo size={30} />
              <div className="min-w-0 flex-1">
                <h2 id="chakra-verdict" className="truncate text-[15px] font-bold leading-tight sm:text-[16.5px]">{T('চক্র এজেন্ট আপনার অনুমোদন চাইছে', 'Chakra Agent needs your approval')}</h2>
                {q.total <= 1 && <p className="truncate text-[12px] text-white/75">{L(task.title)}</p>}
              </div>
            </div>
            {q.total > 1 && (
              <button
                type="button"
                onClick={() => onDismissAll(task)}
                title={T('বাকি সব পপআপ একবারে বন্ধ করে পরে দেখুন', 'Dismiss all remaining popups for now')}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/22 bg-white/12 px-2.5 py-1 text-[11.5px] font-semibold text-white/90 transition hover:bg-white/22 active:scale-95 cursor-pointer"
              >
                <Layers size={12} />
                <span className="hidden sm:inline">{T('সব পরে', 'Later')}</span>
                <span>({T(num(q.total, 'bn'), String(q.total))})</span>
              </button>
            )}
          </div>

          {q.total > 1 && (
            <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/12 bg-white/[0.06] px-4 py-2 sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${task.risk === 'high' ? 'bg-red-400' : 'bg-amber-300'}`} />
                <span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-bold tabular text-emerald-100">
                  #{T(num(q.position, 'bn'), String(q.position))}
                </span>
                <span className="truncate text-[12.5px] font-semibold text-white/95">{L(task.title)}</span>
              </div>

              <div className="relative shrink-0">
                <div className="macos-queue-capsule" role="group" aria-label={T('অনুরোধের তালিকা আগে-পরে দেখুন', 'Navigate queued requests')}>
                  <button
                    type="button"
                    data-verdict-nav="prev"
                    disabled={!q.prev}
                    onClick={() => q.prev && onSelectTask(q.prev)}
                    title={T(`আগে যান · বামে ${num(q.left, 'bn')}টি`, `Previous request · ${q.left} on left`)}
                    aria-label={T(`আগের অনুরোধ, বামে ${num(q.left, 'bn')}টি`, `Previous request, ${q.left} on left`)}
                    className="macos-queue-btn"
                  >
                    <ChevronLeft size={14} className="shrink-0" />
                    <span>{T(num(q.left, 'bn'), String(q.left))}</span>
                  </button>
                  <span className="h-3.5 w-px bg-white/20" aria-hidden="true" />
                  <button
                    type="button"
                    data-verdict-nav="index"
                    aria-expanded={queueMenu}
                    aria-label={T(`মোট ${num(q.total, 'bn')}টির মধ্যে ${num(q.position, 'bn')} নম্বর অনুরোধ, তালিকা খুলতে চাপুন`, `Request ${q.position} of ${q.total}, click to pick from queue`)}
                    onClick={() => setQueueMenu((v) => !v)}
                    className="macos-queue-btn !px-2 text-emerald-100"
                  >
                    <span>{T(`${num(q.position, 'bn')} / ${num(q.total, 'bn')}`, `${q.position} / ${q.total}`)}</span>
                    <ChevronDown size={12} className={`transition-transform duration-150 ${queueMenu ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="h-3.5 w-px bg-white/20" aria-hidden="true" />
                  <button
                    type="button"
                    data-verdict-nav="next"
                    disabled={!q.next}
                    onClick={() => q.next && onSelectTask(q.next)}
                    title={T(`পরে যান · ডানে ${num(q.right, 'bn')}টি`, `Next request · ${q.right} on right`)}
                    aria-label={T(`পরের অনুরোধ, ডানে ${num(q.right, 'bn')}টি`, `Next request, ${q.right} on right`)}
                    className="macos-queue-btn"
                  >
                    <span>{T(num(q.right, 'bn'), String(q.right))}</span>
                    <ChevronRight size={14} className="shrink-0" />
                  </button>
                </div>

                {queueMenu && (
                  <div className="macos-queue-menu absolute right-0 top-[calc(100%+8px)] z-30 w-72 overflow-hidden rounded-2xl p-2 text-white">
                    <div className="mb-1.5 flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-emerald-200/85">
                      <span>{T(`অপেক্ষমাণ অনুরোধ (${num(q.total, 'bn')}টি)`, `Pending drafts (${q.total})`)}</span>
                      <span className="tabular text-white/65">{T(`বামে ${num(q.left, 'bn')} · ডানে ${num(q.right, 'bn')}`, `Left ${q.left} · Right ${q.right}`)}</span>
                    </div>
                    <div className="max-h-56 space-y-1 overflow-y-auto pr-0.5">
                      {c.verdicts.map((v, i) => {
                        const active = v.id === task.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => { onSelectTask(v); setQueueMenu(false); }}
                            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] transition cursor-pointer ${
                              active ? 'bg-white/20 font-bold text-white' : 'text-white/80 hover:bg-white/10'
                            }`}
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${v.risk === 'high' ? 'bg-red-400' : 'bg-amber-300'}`} />
                            <span className="shrink-0 tabular text-emerald-200">#{num(i + 1, s.lang)}</span>
                            <span className="min-w-0 flex-1 truncate">{L(v.title)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Body: either single frosted pane or macOS System Settings dual-pane split when expanded */}
        <div className={`min-h-0 flex-1 overflow-y-auto ${expanded && q.total > 1 ? 'md:grid md:grid-cols-[260px_1fr] md:overflow-hidden' : ''}`}>
          {expanded && q.total > 1 && (
            <aside className="macos-verdict-sidebar flex max-h-48 flex-col overflow-y-auto p-3 text-white md:max-h-full">
              <div className="mb-2 flex items-center justify-between px-2 text-[11.5px] font-bold uppercase tracking-wide text-emerald-200/80">
                <span>{T(`অপেক্ষমাণ তালিকা (${num(q.total, 'bn')})`, `Pending Queue (${q.total})`)}</span>
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
                {c.verdicts.map((v, i) => {
                  const active = v.id === task.id;
                  return (
                    <button
                      key={v.id}
                      ref={active ? activeRowRef : null}
                      type="button"
                      onClick={() => onSelectTask(v)}
                      className={`w-full rounded-xl px-2.5 py-2 text-left transition cursor-pointer ${
                        active
                          ? 'border border-white/25 bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3)]'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[12.5px] font-bold">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${v.risk === 'high' ? 'bg-red-400' : 'bg-amber-300'}`} />
                        <span className="truncate">{L(v.title)}</span>
                      </div>
                      <div className="mt-0.5 truncate pl-3.5 text-[11px] text-white/55">#{num(i + 1, s.lang)} · {L(v.why)}</div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => onDismissAll(task)}
                className="mt-2 w-full rounded-xl border border-white/18 bg-white/10 px-3 py-2 text-center text-[12.5px] font-semibold text-white/90 hover:bg-white/20 cursor-pointer"
              >
                {T('সবগুলো পরে দেখব', 'Close all popups for now')}
              </button>
            </aside>
          )}
          <div className="space-y-3 overflow-y-auto p-4 text-[14px] sm:p-5">
            <p className="text-muted">{T('কেন: ', 'Why: ')}{L(task.why)} <Tags list={task.tags} /></p>
            {req && <div className="macos-verdict-card rounded-2xl !bg-primary-50/80 p-3.5"><div className="text-[12px] font-semibold text-primary-800">{T('কৃষকের কথা', 'The farmer wrote')}</div><p className="mt-0.5">{L(req.text)}</p></div>}
            {top && <div className="macos-verdict-card rounded-2xl p-3.5"><div className="text-[12px] font-semibold text-muted">{T('কৃষকের কথার সঙ্গে ফসলের সমস্যা-তালিকার মিল (ছবির পরীক্ষা নয়)', 'Match from the farmer’s words to the crop problem list (no photo checked)')}</div><p className="mt-0.5 font-semibold">{T(top.name_bn, top.name_en)}</p><p className="text-muted">{task.look.actions_now?.[0]}</p></div>}
            {adv ? (
              <label className="block">
                <span className="text-[12.5px] font-semibold">{T(`যা পাঠানো হবে (${num(adv.to.length, 'bn')} জন কৃষককে)`, `What will be sent (to ${adv.to.length} farmer(s))`)}</span>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={600} className="mt-1 w-full rounded-2xl border border-border bg-white/90 p-3 text-[14.5px] leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
              </label>
            ) : <p className="macos-verdict-card rounded-2xl !bg-amber-50/90 p-3.5">{L(task.body)}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => { c.approve(task, adv ? text.trim() : undefined); onClose(true, q.next); }} disabled={adv && !text.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-3 font-bold text-white shadow-sm hover:bg-primary-800 disabled:opacity-40 cursor-pointer"><CheckCircle2 size={18} />{T('অনুমোদন দিয়ে পাঠান', 'Approve and send')}</button>
              <button type="button" onClick={() => { c.reject(task); onClose(true, q.next); }} className="rounded-xl border border-border bg-white/80 px-4 py-3 font-semibold text-ink hover:bg-red-50 hover:text-red-700 cursor-pointer">{T('বাতিল', 'Reject')}</button>
            </div>
            {oneMobile && adv && (
              <a href={smsHref(oneMobile, text.trim())} onClick={() => { c.approve(task, text.trim()); setTimeout(() => onClose(true, q.next), 300); }}
                className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50/85 px-4 py-2.5 text-[14px] font-semibold text-primary-800 hover:bg-primary-100">
                <Smartphone size={17} />{T(`অনুমোদন দিন ও ${L(one.name)}-এর ফোনে এসএমএস করুন (${bnDigits(oneMobile)})`, `Approve and SMS ${L(one.name)}’s phone (${oneMobile})`)}
              </a>
            )}
            <p className="text-[12px] text-muted">{T('সিদ্ধান্তটি আপনার নামে কাজের খাতায় লেখা থাকবে।', 'Your decision is recorded in the activity log under your name.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BangladeshChakraAgent({ role }) {
  const { T, L, macosPortal, toast } = useStore();
  const c = useChakra(role);
  const [open, setOpen] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [later, setLater] = useState(() => new Set()); // verdicts the officer put off this visit
  const [snoozedAll, setSnoozedAll] = useState(false);
  const [verdictMinimized, setVerdictMinimized] = useState(false);
  const [verdictExpanded, setVerdictExpanded] = useState(false);
  // A link elsewhere in the app (the home page's quick jump) can arrive with { chakra: true } to open the agent.
  const loc = useLocation();
  useEffect(() => { if (loc.state?.chakra) { setPanelMinimized(false); setOpen(true); } }, [loc.key, loc.state]);
  c.openVerdict = (t) => { setVerdictMinimized(false); setVerdict(t); };
  c.close = () => { c.stopAll(); setPanelMinimized(false); setOpen(false); };

  // Agent mode on the officer side: the next draft pops up for a verdict unless snoozed or minimized.
  const next = nextAutoVerdict(c.verdicts, {
    mode: c.mode,
    panelOpen: open,
    snoozedAll,
    minimized: verdictMinimized,
    later,
  });
  const activeVerdict = verdict ? (c.verdicts.find((v) => v.id === verdict.id) ?? null) : null;
  const shown = verdictMinimized ? null : (activeVerdict ?? next);
  const minimizedTarget = verdictMinimized ? (activeVerdict ?? c.verdicts.find((t) => !later.has(t.id)) ?? c.verdicts[0] ?? null) : null;

  const closeVerdict = (decided, nextTask = null) => {
    if (!decided && shown) setLater((x) => new Set([...x, shown.id]));
    setVerdict(decided && nextTask ? nextTask : null);
    setVerdictMinimized(false);
  };
  const dismissAll = (taskObj) => {
    const res = dismissAllVerdicts(later, taskObj?.id ?? minimizedTarget?.id);
    setLater(res.later);
    setSnoozedAll(true);
    setVerdictMinimized(false);
    setVerdict(null);
    toast('সবগুলো অনুমোদন পরে দেখার জন্য রাখা হয়েছে — ডক বা চক্র বোতাম থেকে খুলতে পারবেন', 'All remaining popups snoozed — reopen anytime from Dock or Chakra');
  };
  const minimizeVerdict = (taskObj) => {
    if (taskObj) setVerdict(taskObj);
    setVerdictMinimized(true);
  };
  const restoreVerdict = () => {
    setVerdictMinimized(false);
    setSnoozedAll(false);
    setOpen(false);
    setVerdict((prev) => {
      if (prev && c.verdicts.some((v) => v.id === prev.id)) return prev;
      const candidate = c.verdicts.find((v) => !later.has(v.id)) ?? c.verdicts[0] ?? null;
      if (!candidate && c.verdicts.length) setLater(new Set());
      return candidate;
    });
  };
  const openPanel = () => { setPanelMinimized(false); setOpen(true); };
  const closePanel = () => { c.stopAll(); setPanelMinimized(false); setOpen(false); };
  const minimizePanel = () => { c.stopAll(); setOpen(false); setPanelMinimized(true); };

  const badge = role === 'officer' ? c.verdicts.length : c.tasks.filter((t) => t.gate !== 'auto' || t.kind === 'water' || t.kind === 'weather').length;

  useEffect(() => {
    publishChakraDockState({
      role,
      mode: c.mode,
      verdictsCount: c.verdicts.length,
      snoozedAll,
      minimizedVerdict: minimizedTarget,
      minimizedPanel: panelMinimized,
      panelOpen: open,
    });
  }, [role, c.mode, c.verdicts.length, snoozedAll, minimizedTarget, panelMinimized, open]);

  useEffect(() => () => publishChakraDockState({
    role: null,
    verdictsCount: 0,
    snoozedAll: false,
    minimizedVerdict: null,
    minimizedPanel: false,
    panelOpen: false,
  }), []);

  // Ctrl/⌘ + K opens the agent, and macOS Dock icons restore minimized/snoozed windows.
  useEffect(() => {
    const k = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k' || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      setPanelMinimized(false);
      setOpen((o) => !o);
    };
    const onOpen = () => { setPanelMinimized(false); setOpen(true); };
    const onRestorePanel = () => { setPanelMinimized(false); setOpen(true); };
    const onRestoreVerdict = () => restoreVerdict();
    window.addEventListener('keydown', k);
    window.addEventListener('open-chakra', onOpen);
    window.addEventListener('chakra-dock-restore-panel', onRestorePanel);
    window.addEventListener('chakra-dock-restore-verdict', onRestoreVerdict);
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('open-chakra', onOpen);
      window.removeEventListener('chakra-dock-restore-panel', onRestorePanel);
      window.removeEventListener('chakra-dock-restore-verdict', onRestoreVerdict);
    };
  }); // latest restoreVerdict closure avoids stale verdicts list

  const headerVerdictAction = role === 'officer' && (snoozedAll || verdictMinimized) && c.verdicts.length > 0;
  return (
    <>
      <button type="button" onClick={headerVerdictAction ? restoreVerdict : openPanel} data-tour="chakra"
        className={`relative hidden h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-2 text-[14px] font-semibold shadow-2xs transition-all duration-200 hover:scale-105 active:scale-95 sm:inline-flex sm:px-2.5 shrink-0 ${c.mode === 'agent' ? 'border-primary-700 bg-primary-950 text-white' : 'border-border bg-white text-ink hover:bg-primary-50'}`}
        aria-label={headerVerdictAction ? T(`অপেক্ষমাণ ${num(c.verdicts.length, 'bn')}টি অনুমোদন খুলুন`, `Open ${c.verdicts.length} pending approvals`) : `${L(AGENT_NAME)}, ${c.mode === 'agent' ? T('এজেন্ট চালু', 'agent on') : T('ম্যানুয়াল', 'manual')}`}
        title={headerVerdictAction ? T('অপেক্ষমাণ অনুমোদন পপআপ খুলুন', 'Restore queued approval popups') : `${L(AGENT_NAME)} (Ctrl+K)`}>
        <ChakraLogo size={26} spin={c.phase === 'thinking'} />
        <span className="hidden md:inline">{T('চক্র', 'Chakra')}</span>
        {c.mode === 'agent' && <span className="hidden rounded-md bg-paddy-300 px-1 text-[10.5px] font-bold uppercase text-primary-950 md:inline">{T('চালু', 'on')}</span>}
        {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-extrabold text-white shadow-xs ml-1 shrink-0">{T(num(badge, 'bn'), String(badge))}</span>}
      </button>
      {/* In a portal: the header's backdrop-filter would otherwise make it the box these fixed layers sit in. */}
      {createPortal(<>
      {!open && (
        <div className={`fixed right-4 sm:right-6 z-40 ${role === 'farmer' ? 'bottom-[6.6rem] lg:bottom-6' : 'bottom-6'}`}>
          <ChakraOrb phase={c.phase} size={58} onClick={openPanel} label={`${L(AGENT_NAME)}: ${T('কথা বলুন', 'talk')}`} />
        </div>
      )}
      {open && <Panel c={c} onClose={closePanel} onMinimize={minimizePanel} />}
      {shown && (
        <Verdict
          key={shown.id}
          c={c}
          task={shown}
          expanded={verdictExpanded}
          onToggleExpand={() => setVerdictExpanded((v) => !v)}
          onMinimize={minimizeVerdict}
          onDismissAll={dismissAll}
          onSelectTask={(t) => setVerdict(t)}
          onClose={closeVerdict}
        />
      )}
      {!shown && verdictMinimized && c.verdicts.length > 0 && (
        <MinimizedWindowPill
          kind="verdict"
          title={T('অনুমোদন পপআপ', 'Approval queue')}
          count={c.verdicts.length}
          onRestore={restoreVerdict}
          onDismissAll={() => dismissAll(minimizedTarget)}
          portalDockVisible={macosPortal}
          role={role}
        />
      )}
      {!open && !verdictMinimized && panelMinimized && (
        <MinimizedWindowPill
          kind="panel"
          title={L(AGENT_NAME)}
          count={badge}
          onRestore={openPanel}
          onDismissAll={closePanel}
          portalDockVisible={macosPortal}
          role={role}
        />
      )}
      </>, document.body)}
    </>
  );
}

export default function ChakraAgent(props) {
  if (props.abroad) {
    return <AbroadChakraAgent role={props.role} context={props.abroad} />;
  }
  return <BangladeshChakraAgent role={props.role} />;
}
