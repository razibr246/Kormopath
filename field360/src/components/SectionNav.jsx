// Smoother long pages: a sticky bar of section pills that docks under the header on a solid strip, follows the scroll
// (the current section's pill is highlighted by a sliding thumb and kept in view) and glides to a section on tap; charts that mount only as they near the screen;
// a shimmering placeholder while data loads; and a back-to-top button.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Check, X } from 'lucide-react';
import { onScroll, pageTop, scrollToEl, scrollToTop, scrollToBottom } from './Motion';
import { useStore } from '../store';
import { num, bnDigits } from '../engine/dates';

// The bar docks right under the layout's sticky header, whatever its height (the farmer header has a second row of
// tabs and is taller than the officer one; on phones it changes again). The height is measured and kept in the CSS
// variable --app-header, which the bar's `top` reads, so it never slides under the header.
let HEADER = 76;
function getHeader() {
  if (typeof document === 'undefined') return HEADER;
  const val = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header'));
  if (val && !Number.isNaN(val) && val > 0) return val;
  const el = document.querySelector('header.sticky, header.fixed');
  if (el) {
    const h = Math.round(el.getBoundingClientRect().height);
    if (h > 0) return h;
  }
  return HEADER;
}

export function useHeaderHeight() {
  // The page's sticky or fixed header, found by its class and measured by a ResizeObserver (which reports the size
  // the browser has already worked out), so opening a long page does not force a layout before it first paints.
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('header.sticky, header.fixed');
      if (!el) return;
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0 && h !== HEADER) {
        HEADER = h;
        document.documentElement.style.setProperty('--app-header', `${h}px`);
      }
    };
    measure();
    const el = document.querySelector('header.sticky, header.fixed');
    if (!el) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
}

export function SectionNav({ sections, label, className = '' }) {
  useHeaderHeight();
  const { T, s } = useStore();
  const [active, setActive] = useState(sections[0]?.id);
  const currentId = sections.some((sec) => sec.id === active) ? active : sections[0]?.id;
  const nav = useRef(null);
  const bar = useRef(null);
  const menuRef = useRef(null);
  const [thumb, setThumb] = useState(null);
  const [stuck, setStuck] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (sections.length && !sections.some((sec) => sec.id === active)) {
      setActive(sections[0].id);
    }
  }, [active, sections]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    const away = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const esc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

  // Check scroll boundary state
  const checkScroll = useCallback(() => {
    const el = bar.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = bar.current;
    if (!el) return undefined;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkScroll) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      ro?.disconnect();
    };
  }, [checkScroll, sections.length]);

  const scrollByDirection = (dir) => {
    const el = bar.current;
    if (!el) return;
    const shift = Math.max(220, el.clientWidth * 0.45);
    const reduce = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    el.scrollBy({ left: dir === 'left' ? -shift : shift, behavior: reduce ? 'instant' : 'smooth' });
  };

  // While a tap's scroll is on its way, the highlight stays on the tapped section instead of stepping through every
  // section the page passes; the lock lifts when the scroll ends or the reader takes over.
  const lock = useRef(null);
  const lockTime = useRef(0);
  const landAt = () => getHeader() + (nav.current?.offsetHeight ?? 48) + 12; // where a section's top lands, under the bar

  // Release lock on any direct user scroll interaction or when smooth scroll settles after click
  useEffect(() => {
    const unlockNow = () => { lock.current = null; };
    const onScrollEnd = () => {
      if (lock.current && Date.now() - lockTime.current > 500) {
        lock.current = null;
      }
    };
    window.addEventListener('wheel', unlockNow, { passive: true });
    window.addEventListener('touchstart', unlockNow, { passive: true });
    window.addEventListener('keydown', unlockNow, { passive: true });
    window.addEventListener('scrollend', onScrollEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', unlockNow);
      window.removeEventListener('touchstart', unlockNow);
      window.removeEventListener('keydown', unlockNow);
      window.removeEventListener('scrollend', onScrollEnd);
    };
  }, []);

  // Pages pass a fresh array on every render; the spy only needs to start again when the sections themselves change.
  const secs = useRef(sections);
  secs.current = sections;
  const ids = sections.map((x) => x.id).join('|');
  useEffect(() => {
    const spy = () => {
      const sections = secs.current;
      if (!sections || !sections.length) return;
      const headerH = getHeader();
      const docked = !!nav.current && nav.current.getBoundingClientRect().top <= headerH + 2;
      setStuck((p) => (p === docked ? p : docked));

      // If user tapped a tab recently, hold lock across long smooth scrolls (up to 1.8s) until target settles
      if (lock.current) {
        const elapsed = Date.now() - lockTime.current;
        const targetEl = document.getElementById(lock.current);
        const curY = typeof window !== 'undefined' ? window.scrollY : 0;
        const rootEl = document.documentElement;
        const atBottom = curY > 0 && window.innerHeight + curY >= rootEl.scrollHeight - 24;
        const arrivedAtTarget = targetEl && Math.abs(targetEl.getBoundingClientRect().top - landAt()) < 40;
        if (elapsed > 1800 || (elapsed > 500 && (arrivedAtTarget || (lock.current === sections[sections.length - 1]?.id && atBottom)))) {
          lock.current = null;
        } else {
          return;
        }
      }

      const curScroll = typeof window !== 'undefined' ? window.scrollY : 0;
      // At the top of the page, first section is always active
      if (curScroll < 40) {
        setActive((p) => (p === sections[0]?.id ? p : sections[0]?.id));
        return;
      }

      // At the bottom of the page, last section is active
      const root = document.documentElement;
      if (curScroll > 0 && window.innerHeight + curScroll >= root.scrollHeight - 24) {
        const lastId = sections[sections.length - 1]?.id;
        if (lastId) {
          setActive((p) => (p === lastId ? p : lastId));
          return;
        }
      }

      const line = landAt() + 32;
      const found = [];
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el) found.push({ id: s.id, top: el.getBoundingClientRect().top });
      }
      // Sort by DOM top position to ensure natural reading order
      found.sort((a, b) => a.top - b.top);

      let cur = sections[0]?.id;
      for (const item of found) {
        if (item.top <= line) {
          cur = item.id;
        }
      }
      if (cur) {
        setActive((p) => (p === cur ? p : cur));
      }
    };
    // first look on the next frame, not in the middle of React's commit (measuring here forces a layout of the page)
    const first = requestAnimationFrame(spy);
    const off = onScroll(spy);
    return () => { cancelAnimationFrame(first); off(); };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    lock.current = id;
    lockTime.current = Date.now();
    scrollToEl(el, -landAt() + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0));
  };

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const box = bar.current;
      if (!box || !currentId) return;
      const b = box.querySelector(`[data-id="${currentId}"]`);
      if (!b || !b.offsetWidth) return;
      const boxRect = box.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const x = Number((bRect.left - (boxRect.left + box.clientLeft) + box.scrollLeft).toFixed(2));
      const w = Number(bRect.width.toFixed(2));
      setThumb((p) => {
        if (p && Math.abs(p.x - x) < 0.05 && Math.abs(p.w - w) < 0.05) return p;
        return { x, w, glide: !!p };
      });
    };
    measure();
    const box = bar.current;
    if (box && currentId) {
      const b = box.querySelector(`[data-id="${currentId}"]`);
      if (b) {
        // Smoothly center the active tab within the scrollable container so adjacent tabs are always visible
        const targetLeft = Math.max(0, b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2);
        const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        box.scrollTo({ left: targetLeft, behavior: reduce ? 'instant' : 'smooth' });
      }
    }
    const onResize = () => { if (!cancelled) measure(); };
    const ro = typeof ResizeObserver !== 'undefined' && box ? new ResizeObserver(onResize) : null;
    if (ro && box) {
      ro.observe(box);
      box.querySelectorAll('button[data-id]').forEach((btn) => ro.observe(btn));
    }
    document.fonts?.ready.then(onResize);
    document.fonts?.addEventListener?.('loadingdone', onResize);
    // Update boundary states
    const t = setTimeout(checkScroll, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
      document.fonts?.removeEventListener?.('loadingdone', onResize);
      ro?.disconnect();
    };
  }, [currentId, checkScroll, ids]);

  // Natural horizontal wheel scroll support for desktop users
  useEffect(() => {
    const el = bar.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 4) {
        const atStart = el.scrollLeft <= 0;
        const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
        if ((e.deltaY < 0 && !atStart) || (e.deltaY > 0 && !atEnd)) {
          e.preventDefault();
          el.scrollBy({ left: e.deltaY * 1.35, behavior: 'auto' });
        }
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <nav ref={nav} aria-label={label} data-stuck={stuck || undefined} className={`section-nav sticky top-[var(--app-header,76px)] z-30 mb-4 py-2 ${className}`}>
      <div className="flex items-center gap-1.5 max-w-full">
        {/* Left Arrow Button (placed outside pill bar so it never covers tab labels) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByDirection('left')}
            aria-label={T('বামে স্ক্রোল করুন', 'Scroll left')}
            className="shrink-0 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-primary-900 shadow-sm ring-1 ring-black/10 hover:bg-primary-50 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Scrollable Container with Subtle Edge Fades */}
        <div className="relative flex-1 min-w-0 max-w-full">
          {/* Left Fade Gradient */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-1 bottom-1 w-4 bg-gradient-to-r from-white/90 to-transparent z-10 rounded-l-2xl" />
          )}

          {/* The Scrollable Bar */}
          <div
            ref={bar}
            className="section-nav-glass hide-scrollbar flex w-full gap-1 overflow-x-auto rounded-2xl p-1.5 shadow-xs scroll-smooth"
          >
            {thumb && (
              <span
                aria-hidden="true"
                className="section-nav-thumb pointer-events-none absolute top-1.5 bottom-1.5 left-0 rounded-xl"
                style={{
                  width: '100px',
                  transform: `translate3d(${thumb.x}px, 0, 0) scaleX(${(thumb.w / 100).toFixed(4)})`,
                  transition: thumb.glide ? undefined : 'none',
                }}
              />
            )}
            {sections.map((s) => (
              <button
                key={s.id}
                data-id={s.id}
                type="button"
                aria-current={currentId === s.id ? 'true' : undefined}
                onClick={() => go(s.id)}
                className={`relative z-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-[13.5px] font-semibold transition-[color,background-color,transform] duration-200 ease-[var(--ease-spring)] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 cursor-pointer ${
                  currentId === s.id
                    ? `text-white font-bold ${!thumb ? 'bg-primary-800 shadow-xs' : ''}`
                    : 'text-ink/75 hover:bg-black/[.05] hover:text-ink'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Right Fade Gradient */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-1 bottom-1 w-5 bg-gradient-to-l from-white/90 to-transparent z-10 rounded-r-2xl" />
          )}
        </div>

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByDirection('right')}
            aria-label={T('ডানে স্ক্রোল করুন', 'Scroll right')}
            className="shrink-0 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-primary-900 shadow-sm ring-1 ring-black/10 hover:bg-primary-50 active:scale-95 transition-all cursor-pointer animate-pulse"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* All Sections (Dropdown Drawer) Button */}
        {sections.length >= 6 && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[13px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer ${
                menuOpen
                  ? 'border-primary-600 bg-primary-800 text-white shadow-sm'
                  : 'border-border/80 bg-white/95 text-primary-900 hover:bg-primary-50 hover:border-primary-300'
              }`}
              title={T('পাতার সকল অংশ ও ফিচারের তালিকা', 'List of all page sections & features')}
            >
              <LayoutGrid size={15} className={menuOpen ? 'text-emerald-400' : 'text-primary-700'} />
              <span className="hidden md:inline">{T('সকল অংশ', 'All sections')}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[11px] font-extrabold ${
                  menuOpen ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-800'
                }`}
              >
                {s.lang === 'bn' ? num(sections.length, 'bn') : sections.length}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-[min(340px,calc(100vw-32px))] max-h-[70vh] overflow-y-auto rounded-2xl border border-border/80 bg-white/98 p-3 shadow-xl backdrop-blur-md z-50 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                  <span className="text-[13.5px] font-bold text-ink flex items-center gap-1.5">
                    <LayoutGrid size={15} className="text-primary-700" />
                    {T('পাতার সকল অংশ ও ফিচার', 'All Page Sections & Features')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-black/5 cursor-pointer"
                    aria-label={T('বন্ধ করুন', 'Close')}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-1">
                  {sections.map((sec, idx) => {
                    const isAct = currentId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          go(sec.id);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors cursor-pointer ${
                          isAct
                            ? 'bg-primary-700 text-white font-bold shadow-2xs'
                            : 'text-ink hover:bg-primary-50'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className={`text-[11px] font-bold tabular w-5 shrink-0 ${isAct ? 'text-white/80' : 'text-muted'}`}>
                            {s.lang === 'bn' ? num(idx + 1, 'bn') : idx + 1}.
                          </span>
                          <span className="truncate">{sec.label}</span>
                        </span>
                        {isAct && <Check size={15} className="shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

// Renders children once they come within ~600 px of the screen; until then holds their height with a placeholder.
// `id`: the id the section inside will carry, put on the placeholder until then, so a SectionNav pill can glide to a
// section that has not mounted yet (the nav re-aims once it has).
// `idle`: for something heavy to start (a WebGL map): also wait until the browser has a quiet moment after the page
// has painted, so opening the page is not held up by it.
export function LazyMount({ height = 200, children, className = '', id, idle = false }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (on) return undefined;
    let io = null, h = 0;
    const go = () => {
      if (!idle) { setOn(true); return; }
      const ric = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 300));
      h = ric(() => setOn(true), { timeout: 1500 });
    };
    if (!('IntersectionObserver' in window)) { go(); return undefined; }
    io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '600px 0px 600px 0px' });
    if (ref.current) io.observe(ref.current);
    return () => { io?.disconnect(); if (h) (window.cancelIdleCallback ?? clearTimeout)(h); };
  }, [on, idle]);
  return <div ref={ref} id={on ? undefined : id} className={`${className} ${on ? '' : 'scroll-mt-40'}`} style={{ minHeight: height, containIntrinsicSize: `auto ${height}px` }}>{on ? <div className="swap-in">{children}</div> : <Skeleton height={height} className="mt-5" />}</div>;
}

export function Skeleton({ height = 160, className = '' }) {
  return <div aria-hidden="true" className={`skeleton rounded-2xl ${className}`} style={{ height }} />;
}

// Next-Gen Dynamic Scroll Navigator & Progress Meter
export function ScrollNavigator({ offset = 320, position = 'auto', className = '' }) {
  const { T, s } = useStore();
  const lang = s?.lang ?? 'en';
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);

  let location;
  try {
    location = useLocation();
  } catch {
    location = { pathname: '/' };
  }

  // Determine placement: Right corner on every page (Farmer, Officer, Abroad, Public)
  // When Chakra Agent floating orb is on the page (Farmer, Officer, Abroad),
  // ScrollNavigator sits directly vertically above the orb, horizontally center-aligned with it.
  // Orb is 58px wide, Scroll button is 40px wide.
  // Center alignment:
  // - mobile (< sm): orb is right-4 (16px), orb center = 16 + 29 = 45px -> button right = 45 - 20 = 25px (`right-[25px]`)
  // - sm+ (>= sm): orb is sm:right-6 (24px), orb center = 24 + 29 = 53px -> button right = 53 - 20 = 33px (`sm:right-[33px]`)
  //
  // Vertical position:
  // - Farmer mobile (< lg): orb is at bottom-[6.6rem] (~105px). Button sits at bottom-[11.1rem] (~177px).
  // - Farmer desktop (>= lg): orb is at bottom-6 (24px). Button sits at bottom-[6.1rem] (~98px).
  // - Officer & Abroad: orb is at bottom-6 (24px). Button sits at bottom-[6.1rem] (~98px).
  // - Public pages (no orb): button sits in the bottom-right corner at bottom-6 right-4 sm:right-6.
  const path = location?.pathname || '';
  const isFarmer = path.startsWith('/farmer');
  const isOfficer = path.startsWith('/officer');
  const isAbroad = path.startsWith('/abroad');

  let posClass;
  if (position !== 'auto') {
    posClass = position;
  } else if (isFarmer) {
    posClass = 'fixed right-[25px] sm:right-[33px] z-40 select-none bottom-[11.1rem] lg:bottom-[6.1rem]';
  } else if (isOfficer || isAbroad) {
    posClass = 'fixed right-[25px] sm:right-[33px] z-40 select-none bottom-[6.1rem]';
  } else {
    posClass = 'fixed right-4 sm:right-6 z-40 select-none bottom-6';
  }

  useEffect(() => {
    return onScroll((y) => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pct = Math.min(1, Math.max(0, y / max));
      setProgress(pct);
      setShow(y > offset);
    });
  }, [offset]);

  // Keyboard accessibility: Home key smoothly scrolls to top; End key to bottom
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'Home' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (window.scrollY > 80) {
          e.preventDefault();
          scrollToTop(true);
        }
      } else if (e.key === 'End' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (window.scrollY < max - 80) {
          e.preventDefault();
          scrollToBottom(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pct = Math.round(progress * 100);
  const radius = 15;
  const circumference = 2 * Math.PI * radius; // ~94.25
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <aside
      aria-label={T('স্ক্রোল সহায়ক', 'Scroll navigator')}
      className={`scroll-nav-control ${posClass} ${className}`}
    >
      <div
        className={`relative flex items-center gap-2 transition-all duration-400 ease-[cubic-bezier(.34,1.4,.64,1)] ${
          show ? 'translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-8 opacity-0 scale-75'
        }`}
      >
        {/* Tooltip pill on hover / focus: floats smoothly to the left of the button */}
        <div
          className={`pointer-events-none hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-950/90 px-2.5 py-1 text-[11.5px] font-bold text-white shadow-lg backdrop-blur-md transition-all duration-200 ease-out ${
            hovered ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-2 opacity-0 scale-90'
          }`}
        >
          <span>{T('উপরে যান', 'To Top')}</span>
          <span className="text-paddy-300">·</span>
          <span className="tabular text-primary-200">{num(pct, lang)}%</span>
        </div>

        <button
          type="button"
          onClick={() => scrollToTop(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-label={T(`পৃষ্ঠার শীর্ষে যান (${num(pct, 'bn')}%)`, `Scroll to top (${pct}%)`)}
          title={T(`পৃষ্ঠার শীর্ষে যান (${num(pct, 'bn')}%) · [Home] কী চাপুন`, `Scroll to top (${pct}%) · Press [Home] key`)}
          className="group relative grid h-10 w-10 place-items-center rounded-full bg-primary-800 text-white shadow-[0_8px_20px_-4px_rgba(21,58,29,0.5),0_3px_8px_rgba(0,0,0,0.12)] ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 hover:bg-primary-700 hover:scale-110 active:scale-95 cursor-pointer"
        >
          {/* Background circular track */}
          <svg className="absolute inset-0 -rotate-90 pointer-events-none" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="2" />
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke="#a9d8aa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.12s linear' }}
            />
          </svg>

          {/* Animated Arrow Icon */}
          <ArrowUp size={16} className="relative z-10 text-white drop-shadow transition-transform duration-300 group-hover:-translate-y-0.5 group-active:translate-y-0" />
        </button>
      </div>
    </aside>
  );
}

export const BackToTop = ScrollNavigator;
