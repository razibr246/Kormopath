// The last safety net: if anything above the pages fails (the app's state, a layout), show a plain message
// in the active language with a way out instead of a blank screen. Each page also has its own (PageError in App.jsx).
import { Component } from 'react';
import { STORAGE_PREFIX } from '../config/brand';

function activeLang() {
  try {
    const docLang = typeof document !== 'undefined' ? document.documentElement.lang : '';
    if (docLang === 'bn' || docLang === 'en') return docLang;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_PREFIX}.lang`) : null;
    return saved === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

export default class AppError extends Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error('FieldShift 360 stopped:', err); } // eslint-disable-line no-console
  render() {
    if (!this.state.failed) return this.props.children;
    const bn = activeLang() === 'bn';
    const reset = () => {
      const msg = bn
        ? 'নমুনা তথ্য মুছে শুরু করবেন? আপনার সংরক্ষিত কাজও মুছে যাবে।'
        : 'Clear saved demo data and restart? Your saved work will also be deleted.';
      if (!window.confirm(msg)) return;
      try { Object.keys(localStorage).filter((k) => k.includes('.demo.')).forEach((k) => localStorage.removeItem(k)); } catch { /* storage unavailable */ }
      window.location.replace(window.location.pathname);
    };
    return (
      <div role="alert" style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 520, margin: '12vh auto', padding: 24, textAlign: 'center', lineHeight: 1.6 }}>
        <p style={{ fontSize: 22, fontWeight: 700 }}>{bn ? 'কিছু একটা ঠিকমতো চলেনি' : 'Something went wrong'}</p>
        <p style={{ color: '#55615a' }}>{bn ? 'পাতাটি আবার খুলুন। বারবার হলে নমুনা তথ্য শুরুর অবস্থায় ফিরিয়ে দিন।' : 'Reload the page. If this keeps happening, reset the demo data to the start.'}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.location.reload()} style={{ height: 44, padding: '0 22px', borderRadius: 999, border: 0, background: '#2f6b33', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{bn ? 'আবার খুলুন' : 'Reload page'}</button>
          <button type="button" onClick={reset} style={{ height: 44, padding: '0 22px', borderRadius: 999, border: '1px solid #c9d3cc', background: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>{bn ? 'নমুনা তথ্য মুছুন' : 'Reset demo data'}</button>
        </div>
      </div>
    );
  }
}
