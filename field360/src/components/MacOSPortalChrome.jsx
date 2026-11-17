import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Gavel, Laptop, PanelBottomClose, Search, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { num } from '../engine/dates';
import { openCommandPalette } from './CommandPalette';
import ChakraLogo from './chakra/ChakraLogo';

// Module-level snapshot so header ChakraAgent instances and portal-level MacPortalDock
// stay in sync immediately across route changes without forcing extra global re-renders.
let dockSnapshot = {
  role: null,
  mode: 'manual',
  verdictsCount: 0,
  snoozedAll: false,
  minimizedVerdict: null,
  minimizedPanel: false,
  panelOpen: false,
};
const dockListeners = new Set();

export function publishChakraDockState(patch) {
  dockSnapshot = { ...dockSnapshot, ...patch };
  for (const fn of dockListeners) fn(dockSnapshot);
}

export function useChakraDockState() {
  const [state, setState] = useState(dockSnapshot);
  useEffect(() => {
    setState(dockSnapshot);
    dockListeners.add(setState);
    return () => { dockListeners.delete(setState); };
  }, []);
  return state;
}

export function triggerChakraDockCommand(name) {
  window.dispatchEvent(new CustomEvent(name));
}

/**
 * Authentic macOS Tahoe traffic-light window buttons (Red close / Yellow minimize / Green expand).
 * Visual dots match native macOS spacing while generous padding keeps touch/pointer targets accessible.
 */
export function MacTrafficLights({
  onClose,
  onMinimize,
  onExpand,
  expanded = false,
  closeLabel,
  minimizeLabel,
  expandLabel,
  decorative = false,
  className = '',
}) {
  const { T } = useStore();
  if (decorative) {
    return (
      <div className={`macos-traffic-group inline-flex items-center gap-2 ${className}`} aria-hidden="true">
        <span className="macos-traffic-dot macos-traffic-red" />
        <span className="macos-traffic-dot macos-traffic-yellow" />
        <span className="macos-traffic-dot macos-traffic-green" />
      </div>
    );
  }
  return (
    <div className={`macos-traffic-group inline-flex shrink-0 items-center ${className}`} role="group" aria-label={closeLabel || T('উইন্ডো নিয়ন্ত্রণ', 'Window controls')}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          title={closeLabel}
          aria-label={closeLabel}
          className="macos-traffic-hit"
        >
          <span className="macos-traffic-dot macos-traffic-red">
            <svg viewBox="0 0 10 10" className="macos-traffic-glyph" aria-hidden="true">
              <path d="M2.6 2.6L7.4 7.4M7.4 2.6L2.6 7.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      )}
      {onMinimize && (
        <button
          type="button"
          onClick={onMinimize}
          title={minimizeLabel}
          aria-label={minimizeLabel}
          className="macos-traffic-hit"
        >
          <span className="macos-traffic-dot macos-traffic-yellow">
            <svg viewBox="0 0 10 10" className="macos-traffic-glyph" aria-hidden="true">
              <path d="M2.2 5H7.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      )}
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          title={expandLabel}
          aria-label={expandLabel}
          aria-pressed={expanded}
          className="macos-traffic-hit"
        >
          <span className="macos-traffic-dot macos-traffic-green">
            {expanded ? (
              <svg viewBox="0 0 10 10" className="macos-traffic-glyph" aria-hidden="true">
                <path d="M2.5 5H7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 10 10" className="macos-traffic-glyph" aria-hidden="true">
                <path d="M2.8 7.2V3.8H6.2M7.2 2.8V6.2H3.8" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * macOS Tahoe frosted back/forward history capsule pill (< | >).
 */
export function MacNavPills({ className = '' }) {
  const { T } = useStore();
  const navigate = useNavigate();
  return (
    <div className={`macos-nav-capsule hidden xl:inline-flex shrink-0 items-center ${className}`} role="group" aria-label={T('ইতিহাস নেভিগেশন', 'History navigation')}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        title={T('আগের পাতা', 'Back')}
        aria-label={T('আগের পাতায় যান', 'Go back')}
        className="macos-nav-btn"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="macos-nav-sep" aria-hidden="true" />
      <button
        type="button"
        onClick={() => navigate(1)}
        title={T('পরের পাতা', 'Forward')}
        aria-label={T('পরের পাতায় যান', 'Go forward')}
        className="macos-nav-btn"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/**
 * Header pill to toggle macOS Liquid Glass Portal & floating Dock mode on/off.
 */
export function MacPortalToggle({ compact = false, className = '' }) {
  const { T, macosPortal, toggleMacosPortal, toast } = useStore();
  const onClick = () => {
    const next = !macosPortal;
    toggleMacosPortal();
    if (next) toast('macOS লিকুইড গ্লাস ডক চালু হয়েছে', 'macOS Liquid Glass Dock enabled');
    else toast('সাধারণ পোর্টাল মোডে ফিরে গেছেন', 'Switched to standard portal chrome');
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={macosPortal}
      title={macosPortal ? T('macOS লিকুইড গ্লাস ডক চালু — বন্ধ করতে চাপুন', 'macOS Liquid Glass Dock on — click to turn off') : T('macOS লিকুইড গ্লাস ডক চালু করুন', 'Enable macOS Liquid Glass Dock')}
      className={`${className || 'inline-flex'} shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[13px] font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer ${
        compact ? 'h-9' : 'h-9 sm:h-10'
      } ${
        macosPortal
          ? 'border-emerald-300/70 bg-gradient-to-b from-white/90 to-emerald-50/80 text-primary-950 shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_4px_14px_-6px_rgba(13,38,20,.28)]'
          : 'border-border bg-white text-ink/75 shadow-2xs hover:bg-primary-50'
      }`}
    >
      <Laptop size={15} className={macosPortal ? 'text-primary-700' : 'text-muted'} />
      <span className="hidden 2xl:inline">{T('গ্লাস ডক', 'Dock')}</span>
      {macosPortal && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,.8)]" aria-hidden="true" />}
    </button>
  );
}

/**
 * Fallback floating Liquid Glass minimized pill shown when a modal/panel is minimized via Yellow
 * on mobile viewports or when the desktop MacPortalDock is toggled off.
 */
export function MinimizedWindowPill({
  kind,
  title,
  count = 0,
  onRestore,
  onDismissAll,
  portalDockVisible = false,
  role = 'officer',
}) {
  const { s, T } = useStore();
  if (typeof document === 'undefined') return null;

  // On desktop when MacPortalDock is active, minimized items live inside the Dock itself so there is no duplicate pill.
  const responsiveVis = portalDockVisible
    ? (role === 'farmer' ? 'lg:hidden' : 'md:hidden')
    : '';
  const bottomPos = role === 'farmer' ? 'bottom-[5.6rem] lg:bottom-5' : 'bottom-4 sm:bottom-5';

  return createPortal(
    <div
      className={`fixed left-3 sm:left-5 ${bottomPos} z-[1300] flex items-center gap-2 rounded-2xl border border-white/60 bg-slate-900/82 px-3 py-2 text-white shadow-[0_18px_40px_-10px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.3)] backdrop-blur-xl ${responsiveVis}`}
      role="region"
      aria-label={title}
    >
      <MacTrafficLights
        onClose={onDismissAll}
        onExpand={onRestore}
        closeLabel={kind === 'verdict' ? T('সবগুলো বন্ধ করুন', 'Dismiss all') : T('বন্ধ করুন', 'Close')}
        expandLabel={T('আবার খুলুন', 'Restore window')}
      />
      <button
        type="button"
        onClick={onRestore}
        className="flex items-center gap-2 rounded-xl px-1.5 py-0.5 text-left text-[13px] font-semibold text-white/95 hover:bg-white/10"
      >
        {kind === 'verdict' ? <Gavel size={15} className="text-amber-300 shrink-0" /> : <Sparkles size={15} className="text-emerald-300 shrink-0" />}
        <span className="max-w-[170px] truncate">{title}</span>
        {count > 0 && (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold text-primary-950">
            {T(num(count, s.lang), String(count))}
          </span>
        )}
      </button>
    </div>,
    document.body
  );
}

/**
 * Floating macOS Tahoe Liquid Glass Dock at the bottom center of desktop portal views.
 */
export function MacPortalDock({ portal = 'officer', items = [] }) {
  const { s, T, L, macosPortal, toggleMacosPortal, toast } = useStore();
  const dock = useChakraDockState();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!macosPortal) return undefined;
    document.documentElement.dataset.macosDock = portal;
    return () => {
      if (document.documentElement.dataset.macosDock === portal) {
        delete document.documentElement.dataset.macosDock;
      }
    };
  }, [macosPortal, portal]);

  if (!macosPortal || typeof document === 'undefined') return null;

  const hasQueuedVerdicts = !!dock.minimizedVerdict || (dock.snoozedAll && dock.verdictsCount > 0);
  const visibilityClass = portal === 'farmer' ? 'hidden lg:flex' : 'hidden md:flex';

  const isRouteActive = (item) => {
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  };

  return createPortal(
    <nav
      aria-label={T('macOS পোর্টাল ডক', 'macOS Portal Dock')}
      className={`macos-dock-wrap fixed bottom-3 left-1/2 z-[1150] -translate-x-1/2 ${visibilityClass}`}
    >
      <div className="macos-dock flex items-end gap-1.5 px-2.5 py-2">
        {items.map((item) => {
          const active = isRouteActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className="macos-dock-item group relative flex flex-col items-center"
            >
              <span className="macos-dock-tooltip" role="tooltip">{item.label}</span>
              <span
                className={`macos-dock-tile ${active ? 'is-active' : ''}`}
                style={item.tone ? { '--dock-tone': item.tone } : undefined}
              >
                <item.icon size={20} strokeWidth={2} />
                {item.badge > 0 && (
                  <span className={`macos-dock-badge ${item.hot ? 'bg-red-600' : 'bg-amber-500'}`}>
                    {T(num(item.badge, s.lang), String(item.badge))}
                  </span>
                )}
              </span>
              <span className={`macos-dock-dot ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} aria-hidden="true" />
            </NavLink>
          );
        })}

        <span className="macos-dock-sep" aria-hidden="true" />

        <button
          type="button"
          onClick={openCommandPalette}
          aria-label={T('খুঁজুন (⌘K)', 'Spotlight (⌘K)')}
          className="macos-dock-item group relative flex flex-col items-center"
        >
          <span className="macos-dock-tooltip" role="tooltip">{T('খুঁজুন (⌘K)', 'Spotlight (⌘K)')}</span>
          <span className="macos-dock-tile macos-dock-tile-slate">
            <Search size={19} />
          </span>
          <span className="macos-dock-dot opacity-0 scale-50" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => triggerChakraDockCommand(dock.minimizedPanel ? 'chakra-dock-restore-panel' : 'open-chakra')}
          aria-label={T('চক্র এজেন্ট খুলুন', 'Open Chakra Agent')}
          className="macos-dock-item group relative flex flex-col items-center"
        >
          <span className="macos-dock-tooltip" role="tooltip">
            {dock.minimizedPanel ? T('চক্র (মিনিমাইজড)', 'Chakra (Minimized)') : T('চক্র এজেন্ট', 'Chakra Agent')}
          </span>
          <span className={`macos-dock-tile macos-dock-tile-chakra ${(dock.panelOpen || dock.minimizedPanel) ? 'is-active' : ''}`}>
            <ChakraLogo size={26} />
            {dock.verdictsCount > 0 && (
              <span className="macos-dock-badge bg-amber-500">
                {T(num(dock.verdictsCount, s.lang), String(dock.verdictsCount))}
              </span>
            )}
          </span>
          <span className={`macos-dock-dot ${(dock.panelOpen || dock.minimizedPanel) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} aria-hidden="true" />
        </button>

        {hasQueuedVerdicts && (
          <button
            type="button"
            onClick={() => triggerChakraDockCommand('chakra-dock-restore-verdict')}
            aria-label={T(`অপেক্ষমাণ অনুমোদন (${num(dock.verdictsCount, 'bn')}টি) খুলুন`, `Open ${dock.verdictsCount} queued approvals`)}
            className="macos-dock-item group relative flex flex-col items-center"
          >
            <span className="macos-dock-tooltip" role="tooltip">
              {dock.minimizedVerdict?.title ? L(dock.minimizedVerdict.title) : T('অনুমোদন পপআপ ফিরিয়ে আনুন', 'Restore approval window')}
            </span>
            <span className="macos-dock-tile macos-dock-tile-verdict is-active">
              <Gavel size={19} />
              <span className="macos-dock-badge bg-emerald-600">
                {T(num(dock.verdictsCount, s.lang), String(dock.verdictsCount))}
              </span>
            </span>
            <span className="macos-dock-dot opacity-100 scale-100" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            toggleMacosPortal();
            toast('ডক বন্ধ করা হয়েছে — হেডারের গ্লাস ডক বোতাম থেকে আবার চালু করতে পারবেন', 'Dock hidden — re-enable anytime from the header Dock button');
          }}
          aria-label={T('macOS ডক লুকান', 'Hide macOS Dock')}
          className="macos-dock-item group relative flex flex-col items-center"
        >
          <span className="macos-dock-tooltip" role="tooltip">{T('ডক লুকান', 'Hide Dock')}</span>
          <span className="macos-dock-tile macos-dock-tile-ghost">
            <PanelBottomClose size={18} />
          </span>
          <span className="macos-dock-dot opacity-0 scale-50" aria-hidden="true" />
        </button>
      </div>
    </nav>,
    document.body
  );
}
