// Site-wide motion.
// 1. Scrolling is the browser's own: it follows the wheel, trackpad and finger with no added delay, and runs on the
//    compositor thread even while a page is busy. (A JavaScript smooth-scroller made every scroll trail the input.)
//    Programmatic scrolls use the browser's smooth scrolling.
// 2. Scroll reveals: anything marked data-reveal rises in as it nears the screen; on app pages, cards and sections that
//    start below the fold are marked automatically. Content already on screen when a page opens is never hidden, so
//    nothing flickers, and without JavaScript (or with reduced motion) everything simply shows.
// 3. Page transitions: each routed page eases in quickly when the address changes.
// 4. Back and Forward return to where you were on the page; a new page opens at the top.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';

const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const smoothOr = (smooth) => (smooth && !reducedMotion() ? 'smooth' : 'instant');

// Scroll helpers used everywhere instead of window.scrollTo.
export function scrollToTop(smooth = false) {
  window.scrollTo({ top: 0, behavior: smoothOr(smooth) });
}

export function scrollToBottom(smooth = false) {
  const max = typeof document !== 'undefined' ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight) : 0;
  window.scrollTo({ top: max, behavior: smoothOr(smooth) });
}

// An element's place in the page from its layout box, ignoring transforms: a card still waiting to rise into view
// sits a few pixels low, and measuring that would make the glide land short and then nudge.
export function pageTop(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
}
export function scrollToEl(el, offset = -96) {
  if (!el) return;
  const header = typeof document !== 'undefined' ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header')) || 72) : 72;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const finalOffset = offset === -96 ? -(header + 16) : offset;
  window.scrollTo({ top: Math.max(0, pageTop(el) + finalOffset - margin), behavior: smoothOr(true) });
}

// Subscribe to the scroll position, at most once per frame however fast the events arrive.
// Also marks document.body.is-scrolling during motion to pause hover recalculations for 60/120fps fluid scrolling.
let scrollTimeout = null;
let scrollListeners = 0;
export function onScroll(fn) {
  let raf = 0;
  let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
  scrollListeners += 1;
  const h = () => {
    if (typeof document !== 'undefined') {
      if (!document.body.classList.contains('is-scrolling')) {
        document.body.classList.add('is-scrolling');
      }
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        document.body.classList.remove('is-scrolling');
      }, 130);
    }
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const dir = y >= lastY ? 'down' : 'up';
        lastY = y;
        fn(y, dir);
      });
    }
  };
  window.addEventListener('scroll', h, { passive: true });
  return () => {
    window.removeEventListener('scroll', h);
    if (raf) cancelAnimationFrame(raf);
    scrollListeners = Math.max(0, scrollListeners - 1);
    if (scrollListeners === 0) {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
      if (typeof document !== 'undefined') {
        document.body.classList.remove('is-scrolling');
      }
    }
  };
}

// Where each visited page was scrolled to, by history entry, so Back and Forward land where you left off. One listener
// files every scroll under the entry on screen; the entry switches in the same commit that swaps the page, before the
// browser can report the jump caused by the new page's height, so an old entry's position is never overwritten.
const SAVED = new Map();
let current = null;
if (typeof window !== 'undefined') {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', () => { if (current) SAVED.set(current, window.scrollY); }, { passive: true });
}

// Call in a layout: a new page (link, menu) opens at the top; Back and Forward restore the old position once the
// page is tall enough to hold it (lazy pages and their data arrive a moment after the address changes).
// `skip`: the layout scrolls by itself this time (e.g. to a section).
export function useScrollOnNavigate({ skip = false } = {}) {
  const loc = useLocation();
  const type = useNavigationType();
  const path = useRef(null);
  useLayoutEffect(() => {
    current = loc.key;
    const samePage = path.current === loc.pathname;
    path.current = loc.pathname;
    // A filter or tab kept in the address (?y=2025) is the same page: stay put.
    if (skip || (samePage && type !== 'POP')) return undefined;
    const y = type === 'POP' ? SAVED.get(loc.key) : 0;
    if (!y) { if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' }); return undefined; } // at the top already: no forced layout
    let tries = 0, raf = 0;
    const restore = () => {
      if (document.documentElement.scrollHeight - window.innerHeight >= y || tries++ > 60) window.scrollTo({ top: y, behavior: 'instant' });
      else raf = requestAnimationFrame(restore);
    };
    restore();
    return () => cancelAnimationFrame(raf);
  }, [loc.pathname, loc.key]); // eslint-disable-line react-hooks/exhaustive-deps
}

const AUTO = 'main .surface-card, main section, main [data-reveal-children] > *, main [data-stagger] > *, main .stagger-grid > *';

// Route Prefetch Registry: warms up lazy-loaded chunks on link hover or idle for 0ms transitions.
const PREFETCHED = new Set();
const PREFETCHING = new Set();
const PREFETCH_MAP = {
  '/farmer': () => Promise.all([import('../layouts/FarmerLayout'), import('../pages/farmer/Dashboard')]),
  '/farmer/farm': () => import('../pages/farmer/MyFarm'),
  '/farmer/plan': () => import('../pages/farmer/Plan'),
  '/farmer/future': () => import('../pages/farmer/FieldFuture'),
  '/farmer/today': () => import('../pages/farmer/Today'),
  '/farmer/doctor': () => import('../pages/farmer/CropDoctor'),
  '/farmer/help': () => import('../pages/farmer/Help'),
  '/farmer/support': () => import('../pages/farmer/Support'),
  '/farmer/profile': () => import('../pages/farmer/Profile'),
  '/farmer/harvest': () => import('../pages/farmer/Harvest'),
  '/farmer/signals': () => import('../pages/farmer/Signals'),
  '/farmer/voice': () => import('../pages/farmer/Voice'),
  '/farmer/sms': () => import('../pages/farmer/SmsMode'),
  '/officer/radar': () => import('../pages/officer/Radar'),
};

export function prefetchRoute(to) {
  if (!to || typeof to !== 'string') return;
  let path = to.trim();
  if (path.startsWith('#/')) path = path.slice(1);
  if (path.startsWith('#')) path = path.slice(1);
  path = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (PREFETCHED.has(path)) return;
  const loadFn = PREFETCH_MAP[path];
  if (loadFn && !PREFETCHING.has(path)) {
    PREFETCHING.add(path);
    try {
      Promise.resolve(loadFn()).then(
        () => PREFETCHED.add(path),
        (error) => {
          PREFETCHING.delete(path);
          console.warn(`Route prefetch failed for ${path}:`, error);
        }
      ).finally(() => PREFETCHING.delete(path));
    } catch (error) {
      PREFETCHING.delete(path);
      console.warn(`Route prefetch failed for ${path}:`, error);
    }
  }
}

export function MotionManager() {
  const { pathname } = useLocation();

  // Instant hover & touch route prefetching across every navigation link
  useEffect(() => {
    const onPointerOver = (e) => {
      const anchor = e.target?.closest?.('a[href]');
      if (!anchor) return;
      let href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      prefetchRoute(href);
    };
    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('touchstart', onPointerOver, { passive: true });

    // Idle prefetching for adjacent frequent destinations
    const connection = navigator.connection;
    const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '') ||
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) ||
      (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2);
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200));
    const h = constrained ? null : idle(() => {
      if (pathname === '/') {
        ['/farmer/plan', '/farmer'].forEach(prefetchRoute);
      } else if (pathname.startsWith('/farmer')) {
        ['/farmer/plan', '/farmer/today'].forEach(prefetchRoute);
      } else if (pathname.startsWith('/officer')) {
        ['/officer/map', '/officer/requests'].forEach(prefetchRoute);
      }
    }, { timeout: 2500 });

    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('touchstart', onPointerOver);
      if (h != null) {
        if (window.cancelIdleCallback) window.cancelIdleCallback(h); else clearTimeout(h);
      }
    };
  }, [pathname]);

  // Interactive spotlight for cards on mouse movement (zero-reflow cached geometry)
  useEffect(() => {
    if (reducedMotion() || (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)) return undefined;
    let hovered = null;
    let hoveredRect = null;
    let raf = 0;
    let latestX = 0, latestY = 0;

    const onPointerMove = (e) => {
      const card = e.target?.closest?.('.spotlight-card, .lift, .surface-card');
      if (card !== hovered) {
        if (hovered) hovered.style.setProperty('--spotlight-opacity', '0');
        hovered = card;
        hoveredRect = hovered ? hovered.getBoundingClientRect() : null;
        if (hovered) hovered.style.setProperty('--spotlight-opacity', '1');
      }
      if (!hovered || !hoveredRect) return;
      latestX = e.clientX;
      latestY = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!hovered || !hoveredRect) return;
          hovered.style.setProperty('--mouse-x', `${latestX - hoveredRect.left}px`);
          hovered.style.setProperty('--mouse-y', `${latestY - hoveredRect.top}px`);
        });
      }
    };
    const onScroll = () => {
      if (!hoveredRect || !hovered || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        hoveredRect = hovered?.getBoundingClientRect() ?? null;
      });
    };
    const onResize = () => {
      if (hovered) hoveredRect = hovered.getBoundingClientRect();
    };
    const onPointerLeave = () => {
      if (hovered) {
        hovered.style.setProperty('--spotlight-opacity', '0');
        hovered = null;
        hoveredRect = null;
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mouseleave', onPointerLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    document.documentElement.classList.add('reveal-ready');
    // Reveal a little before an element reaches the screen, so a fast scroll never lands on empty space.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: '24% 0px 24% 0px', threshold: 0 }); // reveal well ahead of arrival whether scrolling up or down
    const seen = new WeakSet(); // checked once each, so later scans do not measure the whole page again
    const within = (root, selector) => [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
    const scan = (root) => {
      if (!root?.querySelectorAll) return;
      const fresh = within(root, AUTO).filter((el) => !seen.has(el));
      const fold = window.innerHeight;
      const tops = fresh.map((el) => el.getBoundingClientRect().top); // all reads first, then writes: one layout pass
      fresh.forEach((el, k) => {
        seen.add(el);
        if (el.hasAttribute('data-reveal') || el.parentElement?.closest('[data-reveal]') || el.closest('[data-no-reveal]')) return;
        if (tops[k] > fold) { el.setAttribute('data-reveal', ''); io.observe(el); }
      });
      // Stagger children of grid groups, [data-reveal-children] and [data-stagger]
      const groups = new Set(within(root, '[data-reveal-children], [data-stagger], .stagger-grid'));
      root.closest?.('[data-reveal-children], [data-stagger], .stagger-grid') && groups.add(root.closest('[data-reveal-children], [data-stagger], .stagger-grid'));
      groups.forEach((g) => {
        [...g.children].forEach((c, k) => {
          if (!c.style.getPropertyValue('--d')) c.style.setProperty('--d', `${(k % 5) * 30}ms`);
        });
      });
      within(root, '[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    };
    const main = document.querySelector('main') ?? document.body;
    scan(main);
    // Pages fill in after data arrives or a tab changes; pick up what appears, when the browser is idle.
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 60));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    let t = 0, h = 0;
    const pending = new Set();
    const mo = new MutationObserver((records) => {
      for (const node of records.flatMap((record) => [...record.addedNodes])) {
        if (node.nodeType === Node.ELEMENT_NODE) pending.add(node);
      }
      clearTimeout(t);
      t = setTimeout(() => {
        cancel(h);
        h = idle(() => { const roots = [...pending]; pending.clear(); roots.forEach(scan); }, { timeout: 300 });
      }, 80);
    });
    mo.observe(main, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(t); cancel(h); pending.clear(); };
  }, [pathname]);
  return null;
}

// The routed page, re-entering with a soft hardware-accelerated cross-fade and zero layout shift.
export function PageOutlet() {
  const { pathname } = useLocation();
  const [settledPath, setSettledPath] = useState(() => (reducedMotion() ? pathname : null));
  const settling = !reducedMotion() && settledPath !== pathname;

  useEffect(() => {
    if (!settling) return undefined;
    const t = setTimeout(() => setSettledPath(pathname), 260);
    return () => clearTimeout(t);
  }, [settling, pathname]);

  return (
    <div
      key={pathname}
      data-transition={settling ? 'entering' : 'settled'}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setSettledPath(pathname); }}
      className={`page-enter ${settling ? 'is-entering' : 'is-settled'}`}
    >
      <Outlet />
    </div>
  );
}

// A thin progress line under the header showing how far down the page you are.
// Scroll-driven CSS where the browser supports it (runs off the main thread), otherwise follows the scroll.
export function ScrollProgress() {
  useEffect(() => {
    if (CSS.supports?.('animation-timeline: scroll()')) return undefined;
    const bar = document.querySelector('.scroll-progress');
    return onScroll((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    });
  }, []);
  return <div className="scroll-progress" aria-hidden="true" />;
}

// Hook to animate a whole number up from 0 when it first appears, and from the old value to the new one when it changes
// (a new union, a request answered), instead of starting again from 0.
export function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(reducedMotion() ? target : 0);
  const shown = useRef(val);
  shown.current = val;
  useEffect(() => {
    if (reducedMotion()) {
      setVal(target);
      return undefined;
    }
    const start = shown.current;
    if (start === target) return undefined;
    let raf = 0;
    const startTime = performance.now();
    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // spring-like ease out
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(start + (target - start) * ease));
      if (progress < 1) {
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
