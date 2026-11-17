// KormoPath entry for the FieldShift360 farmer app (MIT, razibr246/fieldshift360), mounted at /krishi/field.
// Mirrors FieldShift360's src/main.jsx + src/App.jsx for the farmer routes, plus the officer Ropon Radar at
// /farmer/radar. Hash routing keeps every FieldShift360 link working inside one Next.js page.
import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppError from './components/AppError';
import { StoreProvider, bootClimate, useStore } from './store';
import { WhyDrawer, DataInfo, Toast } from './components/Overlays';
import { MotionManager } from './components/Motion';
import '@fontsource-variable/noto-sans-bengali/index.css';
import 'leaflet/dist/leaflet.css';
import './f360.css';
import { FieldOpening } from '@/components/apps/krishi/FieldOpening';

const load = (f, pick) => lazy(() => f().then((m) => (pick ? { default: m[pick] } : m)));
const FarmerLayout = load(() => import('./layouts/FarmerLayout'));
const FarmerDashboard = load(() => import('./pages/farmer/Dashboard'));
const Plan = load(() => import('./pages/farmer/Plan'));
const Today = load(() => import('./pages/farmer/Today'));
const CropDoctor = load(() => import('./pages/farmer/CropDoctor'));
const Help = load(() => import('./pages/farmer/Help'));
const Support = load(() => import('./pages/farmer/Support'));
const Profile = load(() => import('./pages/farmer/Profile'));
const Harvest = load(() => import('./pages/farmer/Harvest'));
const FieldFuture = load(() => import('./pages/farmer/FieldFuture'));
const Signals = load(() => import('./pages/farmer/Signals'));
const MyFarm = load(() => import('./pages/farmer/MyFarm'));
const FarmerVoice = load(() => import('./pages/farmer/Voice'));
const SmsMode = load(() => import('./pages/farmer/SmsMode'));
const Radar = load(() => import('./pages/officer/Radar'));

// খামারের খাতা (tasks, livestock, costs) is MaathSathi's own page at /krishi. replace() keeps Back on the field app.
function FarmBook() {
  useEffect(() => { window.location.replace('/krishi'); }, []);
  return <FieldOpening step="page" />;
}

function PageLoading() {
  const store = useStore();
  const bn = store?.s?.lang === 'bn';
  return (
    <div className="page-shell page-loading-shell py-10" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{bn ? 'পাতা খোলা হচ্ছে' : 'Loading page'}</span>
      <div className="skeleton h-7 w-56" />
      <div className="skeleton mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)}</div>
    </div>
  );
}

class PageError extends Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error('FieldShift360 page error:', error, info?.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    const bn = document.documentElement.lang === 'bn';
    return (
      <div className="page-shell py-16 text-center" role="alert">
        <p className="text-[20px] font-bold">{bn ? 'এই পাতাটি খোলা গেল না' : 'This page could not be opened'}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-gloss mt-5 inline-flex h-11 items-center rounded-full px-6 text-[15px] font-semibold text-white">{bn ? 'আবার চেষ্টা করুন' : 'Try again'}</button>
      </div>
    );
  }
}
function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <PageError key={pathname}>{children}</PageError>;
}
const page = (el) => <RouteErrorBoundary><Suspense fallback={<PageLoading />}>{el}</Suspense></RouteErrorBoundary>;

function Routed() {
  return (
    <>
      <Routes>
        <Route path="/farmer" element={page(<FarmerLayout />)}>
          <Route index element={page(<FarmerDashboard />)} />
          <Route path="plan" element={page(<Plan />)} />
          <Route path="today" element={page(<Today />)} />
          <Route path="doctor" element={page(<CropDoctor />)} />
          <Route path="help" element={page(<Help />)} />
          <Route path="support" element={page(<Support />)} />
          <Route path="profile" element={page(<Profile />)} />
          <Route path="harvest" element={page(<Harvest />)} />
          <Route path="future" element={page(<FieldFuture />)} />
          <Route path="signals" element={page(<Signals />)} />
          <Route path="farm" element={page(<MyFarm />)} />
          <Route path="voice" element={page(<FarmerVoice />)} />
          <Route path="sms" element={page(<SmsMode />)} />
          <Route path="radar" element={page(<Radar />)} />
          <Route path="book" element={<FarmBook />} />
        </Route>
        {/* Officer links inside the farmer pages: the radar is ported, the rest of the officer app is not. */}
        <Route path="/officer/radar" element={<Navigate to="/farmer/radar" replace />} />
        <Route path="*" element={<Navigate to="/farmer" replace />} />
      </Routes>
      <MotionManager />
      <WhyDrawer />
      <DataInfo />
      <Toast />
    </>
  );
}

export default function Field360App() {
  // The default farmer's NASA climate (Godagari) must arrive before the store renders, as in FieldShift360's main.jsx.
  const [ready, setReady] = useState(false);
  useEffect(() => { bootClimate().then(() => setReady(true), () => setReady(true)); }, []);
  if (!ready) return <FieldOpening step="data" />;
  return (
    <div className="f360">
      <AppError>
        <HashRouter>
          <StoreProvider>
            <Routed />
          </StoreProvider>
        </HashRouter>
      </AppError>
    </div>
  );
}
