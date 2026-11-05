import { firebaseConfig, OWNER_UID, EMAIL_DOMAIN } from './config.js?v=9';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, setPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, collection, query, where, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ========== Firebase ========== */
const app = initializeApp(firebaseConfig);
// الجلسة محفوظة على الجهاز (تذكرني) لحد ما المستخدم يسجّل خروج
let auth;
try { auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }); }
catch (e) { auth = getAuth(app); }
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(app, {}); }

/* ========== constants ========== */
const COMPANY = 'شركة سعد مفرح الشمراني للاستشارات الهندسية';
const DEPTS = ['المساحة', 'المعماري', 'الإنشائي', 'السلامة', 'الثلاثي الأبعاد', 'المحاسب', 'الإشراف'];
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
// مواعيد العمل الافتراضية (المالك يقدر يغيّرها من الإعدادات)
const DEF_SCHED = {
  0: { on: true, s1: 540, e1: 780, s2: 960, e2: 1200 },
  1: { on: true, s1: 540, e1: 780, s2: 960, e2: 1200 },
  2: { on: true, s1: 540, e1: 780, s2: 960, e2: 1200 },
  3: { on: true, s1: 540, e1: 780, s2: 960, e2: 1200 },
  4: { on: true, s1: 540, e1: 1020 },
  5: { on: false },
  6: { on: true, s1: 660, e1: 780, s2: 840, e2: 1200 }
};
const DEF_GRACE = 10;
const ALL = ['in', 'out1', 'in2', 'out'];
const FMAP = { in: 'p1', out1: 'p2', in2: 'p3', out: 'p4' };
const FL = { in: 'الحضور', out1: 'خروج البريك', in2: 'العودة', out: 'الانصراف' };
const ACT = { in: 'تسجيل حضور', out1: 'خروج للبريك', in2: 'عودة من البريك', out: 'تسجيل انصراف' };
const STL = { present: 'حاضر', late: 'متأخر', half: 'نصف يوم', absent: 'غائب', missing: 'لم يسجّل', pending: 'بانتظار الحضور', off: 'إجازة', future: '', none: '', break: 'في البريك', done: 'انصرف', inactive: 'موقوف' };
const I = {
  check: "M5 12l5 5L20 7",
  face: "M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0",
  finger: "M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6M12 11v2a14 14 0 0 0 2.5 8M8 15a18 18 0 0 0 1.8 6M4.9 19a22 22 0 0 1-.9-7v-1a8 8 0 0 1 12-6.95",
  bell: "M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1",
  clock: "M12 7v5l3 3M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0",
  coffee: "M3 10h14v5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6zM16.75 12a2.5 2.5 0 0 1 0 5M8 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2M12 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2",
  login: "M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M21 12H8l3-3M11 15l-3-3",
  logout: "M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M9 12h12l-3-3M18 15l3-3",
  alert: "M12 9v4M12 16h.01M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0",
  userplus: "M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M16 19h6M19 16v6M6 21v-2a4 4 0 0 1 4-4h4",
  x: "M18 6L6 18M6 6l12 12",
  right: "M9 6l6 6-6 6", left: "M15 6l-6 6 6 6",
  camera: "M5 7h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2M9 13a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
  pin: "M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0M17.66 16.66L13.41 20.9a2 2 0 0 1-2.83 0l-4.24-4.24a8 8 0 1 1 11.32 0",
  lock: "M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 11V7a4 4 0 1 1 8 0v4",
  device: "M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM11 4h2M12 17v.01",
  home: "M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6",
  map: "M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13",
  live: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14",
  chat: "M8 9h8M8 13h6M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z",
  gear: "M10.33 4.32c.43-1.76 2.92-1.76 3.35 0a1.72 1.72 0 0 0 2.57 1.07c1.54-.94 3.3.82 2.37 2.37a1.72 1.72 0 0 0 1.06 2.57c1.76.43 1.76 2.92 0 3.35a1.72 1.72 0 0 0-1.07 2.57c.94 1.54-.82 3.3-2.37 2.37a1.72 1.72 0 0 0-2.57 1.06c-.43 1.76-2.92 1.76-3.35 0a1.72 1.72 0 0 0-2.57-1.07c-1.54.94-3.3-.82-2.37-2.37a1.72 1.72 0 0 0-1.06-2.57c-1.76-.43-1.76-2.92 0-3.35a1.72 1.72 0 0 0 1.07-2.57c-.94-1.54.82-3.3 2.37-2.37c1 .61 2.3.07 2.57-1.06M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
  send: "M10 14L21 3M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1z",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
  plus: "M12 5v14M5 12h14",
  mic: "M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0zM5 10a7 7 0 0 0 14 0M8 21h8M12 17v4",
  clip: "M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3L18 10a3 3 0 0 0-6-6l-6.5 6.5a4.5 4.5 0 0 0 9 9L21 13",
  file: "M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zM9 13h6M9 17h4",
  download: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12",
  image: "M15 8h.01M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM3 16l5-5c.93-.9 2.07-.9 3 0l5 5M14 14l1-1c.93-.9 2.07-.9 3 0l3 3",
  play: "M7 4v16l13-8z",
  pause: "M6 5h4v14H6zM14 5h4v14h-4z"
};
const ic = (n, s = 20, w = 1.8) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[n]}"/></svg>`;
const MI = { face: ['face', 'الوجه'], finger: ['finger', 'البصمة'] };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

/* ========== formatting + Riyadh time ========== */
const nf = new Intl.NumberFormat('ar-SA'), nf2 = new Intl.NumberFormat('ar-SA', { minimumIntegerDigits: 2 });
const ar = n => nf.format(n);
const tm = m => { if (m == null) return '—'; m = Math.floor(m); const h = Math.floor(m / 60), mm = m % 60; return ar(h % 12 || 12) + ':' + nf2.format(mm) + ' ' + (h < 12 ? 'ص' : 'م'); };
const dur = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), x = m % 60; return h ? ar(h) + ' س ' + ar(x) + ' د' : ar(x) + ' د'; };
const pad = n => String(n).padStart(2, '0');
const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const fromHHMM = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const OFF = 10800000, DAY = 86400000;
const dayIdx = ms => Math.floor((ms + OFF) / DAY);
const riyMin = ms => Math.floor(((ms + OFF) % DAY) / 60000);
const nowMin = () => ((Date.now() + OFF) % DAY) / 60000;
const keyOfIdx = i => { const d = new Date(i * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
const idxOfKey = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
const todayIdx = () => dayIdx(Date.now());
const todayKey = () => keyOfIdx(todayIdx());
const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const today0 = () => fromKey(todayKey());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isToday = k => k === todayKey();
const RZ = { timeZone: 'Asia/Riyadh' };
const gNow = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...RZ });
const hNow = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric', ...RZ });
const mFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { month: 'long', year: 'numeric' });
const msFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { month: 'short' });
const hmFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { month: 'long', year: 'numeric' });
const dFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { weekday: 'long', day: 'numeric', month: 'long' });
const clockFmt = new Intl.DateTimeFormat('ar-SA', { hour: 'numeric', minute: '2-digit', ...RZ });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const initials = n => String(n || '؟').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'الآن' : m < 60 ? 'منذ ' + ar(m) + ' د' : 'منذ ' + dur(m); };
const toEn = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

/* ========== state ========== */
let me = null, meEmp = null, isOwner = false, isViewer = false, viewerName = '', view = null, busy = false;
const canSee = () => isOwner || isViewer;
let emps = [];
let recs = {};
let settings = {};
let lives = {};
let msgs = [];
let unsubs = [];
let firstDays = true;
let deptFilter = 'all';
// التنبيهات اللي اتبعتت النهارده، محفوظة عشان ما تتكررش كل ما التطبيق يتفتح
const notified = (() => {
  const k = 'sh-notified-' + keyOfIdx(Math.floor((Date.now() + 10800000) / 86400000)); let set;
  try { Object.keys(localStorage).forEach(x => { if (x.startsWith('sh-notified-') && x !== k) localStorage.removeItem(x); }); set = new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch (e) { set = new Set(); }
  return { has: x => set.has(x), add: x => { set.add(x); try { localStorage.setItem(k, JSON.stringify([...set])); } catch (e) { } } };
})();

const empById = id => emps.find(e => e.id === id) || (meEmp && meEmp.id === id ? meEmp : null);
const getRec = (emp, key) => (recs[emp.id] && recs[emp.id][key]) || null;
const grace = () => Number.isFinite(+settings.grace) ? +settings.grace : DEF_GRACE;
const sites = () => Array.isArray(settings.sites) ? settings.sites : [];

/* ========== schedule ========== */
function dayCfg(dow) { const s = settings.sched && settings.sched[dow]; return s && typeof s === 'object' ? s : DEF_SCHED[dow]; }
// خطة اليوم: الفترات، خانات البصمة، ونافذة كل بصمة
function planOf(dow) {
  const c = dayCfg(dow);
  if (!c || !c.on || c.s1 == null || c.e1 == null) return { off: true, shifts: [], fields: [], W: {}, start: null, end: null };
  if (c.s2 != null && c.e2 != null && c.s2 > c.e1) {
    const o1end = (c.s2 - c.e1) <= 60 ? c.s2 - 1 : c.e1 + 60;
    const W = { in: [c.s1 - 30, c.e1 - 1], out1: [c.e1, o1end], in2: [Math.max(o1end + 1, c.s2 - 60), c.e2 - 1], out: [c.e2, 1439] };
    return { off: false, two: true, shifts: [[c.s1, c.e1], [c.s2, c.e2]], fields: ALL, W, start: c.s1, end: c.e2, b1: c.e1, b2: c.s2 };
  }
  return { off: false, two: false, shifts: [[c.s1, c.e1]], fields: ['in', 'out'], W: { in: [c.s1 - 30, c.e1 - 1], out: [c.e1, 1439] }, start: c.s1, end: c.e1 };
}
const planKey = k => planOf(fromKey(k).getDay());
const todayPlan = () => planKey(todayKey());

function docToRec(d) {
  const r = { m: {}, ph: {}, geo: {} };
  for (const f of ALL) {
    const k = FMAP[f], v = d[k];
    if (v && v.toMillis) { r[f] = riyMin(v.toMillis()); r.m[f] = d[k + '_m']; if (d[k + '_ph']) r.ph[f] = d[k + '_ph']; if (d[k + '_geo']) r.geo[f] = d[k + '_geo']; }
  }
  return (r.in == null && r.in2 == null && r.out == null) ? null : r;
}
function empFromDoc(s) {
  const d = s.data();
  const created = d.createdAt && d.createdAt.toMillis ? keyOfIdx(dayIdx(d.createdAt.toMillis())) : todayKey();
  return { id: s.id, name: d.name || '', num: d.num || '', dept: d.dept || '', active: d.active !== false, cred: d.cred || null, mustChange: !!d.mustChange, start: d.start || created, geo: d.geo || { mode: 'sites' } };
}

/* ========== day logic ========== */
const earlyBy = (r, P) => (r && r.in != null && !P.off && r.in < P.start) ? P.start - r.in : 0;
const isLate = (r, P) => (r.in != null && r.in > P.start + grace()) || (P.two && r.in2 != null && r.in2 > P.b2 + grace());
function status(emp, key) {
  const d = fromKey(key), t = today0();
  if (key < emp.start) return 'none';
  if (d > t) return 'future';
  const P = planKey(key);
  if (P.off) return 'off';
  const r = getRec(emp, key), isT = isToday(key), n = nowMin();
  if (!r) { if (isT) return n > P.start + grace() ? 'missing' : 'pending'; return 'absent'; }
  if (r.in == null) return 'half';
  if (P.two && !isT && r.in2 == null) return 'half';
  return isLate(r, P) ? 'late' : 'present';
}
function liveStatus(emp) {
  if (!emp.active) return 'inactive';
  const key = todayKey(), st = status(emp, key);
  if (['off', 'missing', 'pending', 'none'].includes(st)) return st === 'none' ? 'pending' : st;
  const r = getRec(emp, key), P = todayPlan();
  if (r.out != null) return 'done';
  if (P.two && r.out1 != null && r.in2 == null) return 'break';
  return st;
}
function worked(r, key) {
  if (!r) return 0; const isT = isToday(key), n = nowMin(), P = planKey(key);
  if (P.off) { return r.in != null && r.out != null ? Math.max(0, r.out - r.in) : 0; }
  const cap = e => isT ? Math.min(n, e) : e;
  if (!P.two) return r.in != null ? Math.max(0, (r.out != null ? r.out : cap(P.end)) - r.in) : 0;
  let a = 0, b = 0;
  if (r.in != null) a = (r.out1 != null ? r.out1 : cap(P.b1)) - r.in;
  if (r.in2 != null) b = (r.out != null ? r.out : cap(P.end)) - r.in2;
  return Math.max(0, a) + Math.max(0, b);
}
function nextField(r, P) { for (const f of P.fields) if (!(r && r[f] != null)) return f; return null; }
function nextTxt(r, n, P) { for (const f of P.fields) { if (P.W[f][0] > n && !(r && r[f] != null)) return FL[f] + ' يفتح الساعة ' + tm(P.W[f][0]); } return ''; }
function allowed(r, n, P) {
  n = Math.floor(n);
  if (P.off) return { f: null, msg: 'اليوم إجازة', sub: 'لا يوجد دوام اليوم' };
  const nx = nextTxt(r, n, P);
  for (const f of P.fields) {
    if (n < P.W[f][0] || n > P.W[f][1]) continue;
    if (r && r[f] != null) return { f: null, msg: 'تم ' + FL[f] + ' الساعة ' + tm(r[f]), sub: 'لا يمكن تسجيل ' + FL[f] + ' مرة أخرى' + (nx ? ' · ' + nx : '') };
    if (f === 'out1' && !(r && r.in != null)) return { f: null, msg: 'لا يوجد حضور مسجّل اليوم', sub: 'خروج البريك يحتاج حضوراً مسجّلاً' + (nx ? ' · ' + nx : '') };
    if (f === 'out' && !(r && (r.in != null || r.in2 != null))) return { f: null, msg: 'لا يوجد حضور مسجّل اليوم', sub: 'لا يمكن الانصراف بدون حضور' };
    return { f };
  }
  return { f: null, msg: 'التسجيل مغلق الآن', sub: nx || 'انتهت أوقات التسجيل لليوم' };
}
function stats(emp, from, to) {
  const t = today0(), end = to < t ? to : t; const o = { att: 0, abs: 0, late: 0, half: 0, hrs: 0, days: 0 };
  for (let d = new Date(from); d <= end; d = addDays(d, 1)) {
    const k = keyOf(d), s = status(emp, k);
    if (s === 'present' || s === 'late' || s === 'half') { o.att++; o.hrs += worked(getRec(emp, k), k); }
    if (s === 'late') o.late++; if (s === 'half') o.half++;
    if (s === 'absent' || s === 'missing') o.abs++;
    if (['present', 'late', 'half', 'absent', 'missing'].includes(s)) o.days++;
  }
  o.pct = o.days ? Math.round(o.att / o.days * 100) : 0; o.hrs = Math.round(o.hrs / 60); return o;
}
function periodRange(p) {
  const t = today0();
  if (p === 'week') { const s = addDays(t, -((t.getDay() + 1) % 7)); return [s, addDays(s, 6), 'الأسبوع الحالي · من ' + dFmt.format(s)]; }
  if (p === 'month') return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0), mFmt.format(t) + ' · ' + hmFmt.format(t)];
  return [new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31), 'سنة ' + ar(t.getFullYear()).replace(/٬/g, '') + ' حتى اليوم'];
}

/* ========== motion helpers ========== */
function countTo(el, to, fmt = ar, d0 = 900) {
  if (!el) return; const from = +(el.dataset.v || 0); el.dataset.v = to;
  if (RM) { el.textContent = fmt(to); return; }
  const s = performance.now();
  (function f(t) { const k = Math.min((t - s) / d0, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(f); })(s);
}
function movePill(seg) { const p = seg && seg.querySelector('.pill'), b = seg && seg.querySelector('[aria-pressed="true"]'); if (!p || !b) return; p.style.width = b.offsetWidth + 'px'; p.style.left = b.offsetLeft + 'px'; }
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } }

/* ========== toasts + system notifications ========== */
const TAB_OF = { chat: 'vChat', live: 'vMap' };
function toast(kind, title, body, who, go) {
  const box = $('toasts'); const el = document.createElement('div'); el.className = 'toast' + (kind === 'chat' ? ' chatmsg' : '');
  const icn = { ok: 'check', bad: 'alert', warn: 'bell', info: 'coffee', gold: 'bell', live: 'live', chat: 'chat' }[kind] || 'bell';
  const cls = { live: 'info', chat: 'gold' }[kind] || kind;
  if (kind === 'chat') {
    el.innerHTML = `<div class="av">${esc(initials(title.split(' · ')[0]))}</div><div class="tx"><small>${ic('chat', 12)} رسالة جديدة · الشات الداخلي</small><b>${esc(title)}</b><span class="bubble">${esc(body)}</span></div>`;
  } else el.innerHTML = `<div class="ico i-${cls}">${ic(icn, 18)}</div><div class="tx"><small>الشمراني · ${esc(who || 'الآن')}</small><b>${esc(title)}</b>${body ? esc(body) : ''}</div>`;
  const target = go || TAB_OF[kind];
  if (target) { el.classList.add('tap'); el.onclick = () => { el.remove(); goTo(target); }; }
  box.prepend(el); vibrate(kind === 'bad' ? [60, 40, 60] : kind === 'chat' ? [30, 40, 30] : 40);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => { el.classList.add('leave'); setTimeout(() => el.remove(), 400); }, kind === 'chat' ? 7000 : 5600);
}
async function sysNotify(title, body, tag, go) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    const opt = { body, icon: 'logo-192.png', badge: 'badge-96.png', lang: 'ar', dir: 'rtl', tag: tag || (title + body), renotify: !!tag, vibrate: [80, 40, 80], data: { go: go || '' } };
    if (reg) reg.showNotification(title, opt); else new Notification(title, opt);
  } catch (e) { }
}
function alertBoth(kind, title, body, who, tag, go) { toast(kind, title, body, who, go); sysNotify(title, body, tag, go || TAB_OF[kind]); }
// فتح صفحة معيّنة من إشعار (داخل التطبيق أو من إشعار الجوال)
function goTo(target) {
  if (!target || !me) return;
  const [tab, id] = String(target).split(':');
  const ok = isOwner ? ['vOwn', 'vMap', 'vChat', 'vSet'] : isViewer ? ['vOwn', 'vMap', 'vChat'] : ['vEmp', 'vLive', 'vChat'];
  if (!ok.includes(tab)) return;
  if (view !== tab) openTab(tab);
  if (tab === 'vMap' && id && canSee()) setTimeout(() => openLiveSheet(id), 400);
}
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.go) goTo(e.data.go); });
let pendingGo = (location.hash || '').replace('#go=', '').replace('#', '') || null;
function setBadge() { try { const n = unread(); if (navigator.setAppBadge) { n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } } catch (e) { } }
function askNotify() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(() => refresh()); } catch (e) { } }

/* ========== clock ========== */
function tickClock() { $('bigClock').textContent = new Date().toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit', second: '2-digit', ...RZ }); }
function setDates() { const d = new Date(); $('gDate').textContent = gNow.format(d); $('hDate').textContent = hNow.format(d) + ' هـ'; }

/* ========== views + tab bar ========== */
const VIEWS = ['vLogin', 'vPass', 'vMsg', 'vEmp', 'vOwn', 'vLive', 'vMap', 'vChat', 'vSet'];
const TABS_EMP = [['vEmp', 'finger', 'البصمة'], ['vLive', 'live', 'موقعي المباشر'], ['vChat', 'chat', 'الشات']];
const TABS_VIEW = [['vOwn', 'home', 'الحضور'], ['vMap', 'map', 'الخريطة'], ['vChat', 'chat', 'الشات']];
const TABS_OWN = [['vOwn', 'home', 'الرئيسية'], ['vMap', 'map', 'الخريطة'], ['vChat', 'chat', 'الشات'], ['vSet', 'gear', 'الإعدادات']];
function show(id) {
  if (id !== 'vChat' && typeof rec !== 'undefined' && rec) stopRec(false);
  if (id !== 'vChat' && typeof curAudio !== 'undefined' && curAudio) { curAudio.pause(); }
  VIEWS.forEach(v => { $(v).hidden = v !== id; });
  view = id;
  $('chrome').hidden = id === 'vLogin';
  const tabbed = ['vEmp', 'vOwn', 'vLive', 'vMap', 'vChat', 'vSet'].includes(id);
  $('tabbar').hidden = !tabbed; document.body.classList.toggle('has-tabs', tabbed);
  if (tabbed) paintTabs();
  if (id === 'vChat') { markChatRead(); }
}
let introShown = false;
function tabIntro() {
  if (introShown) return; introShown = true;
  let n = 0; try { n = +(localStorage.getItem('sh-tab-intro') || 0); localStorage.setItem('sh-tab-intro', String(n + 1)); } catch (e) { }
  const tb = $('tabbar'); tb.classList.add('intro');
  if (n < 5) { const tip = document.createElement('div'); tip.className = 'tbtip'; tip.textContent = isOwner ? 'من هنا: الرئيسية، الخريطة، الشات، والإعدادات' : isViewer ? 'من هنا: الحضور، الخريطة، والشات' : 'من هنا: البصمة، موقعي المباشر، والشات'; tb.querySelector('.tb-in').appendChild(tip); setTimeout(() => { tip.classList.add('out'); setTimeout(() => tip.remove(), 500); }, 6000); }
  setTimeout(() => tb.classList.remove('intro'), 5500);
}
function paintTabs() {
  const tabs = isOwner ? TABS_OWN : isViewer ? TABS_VIEW : TABS_EMP, tb = $('tabbar');
  const extra = v => (v === 'vChat' && unread() ? `<i class="badge">${ar(Math.min(unread(), 99))}</i>` : '') + (v === 'vLive' && liveOn ? '<i class="livedot"></i>' : '');
  const btns = tb.querySelectorAll('[data-tab]');
  // تحديث في مكانه عشان الحركة ما تتعادش مع كل رسالة جديدة
  if (btns.length === tabs.length && [...btns].every((b, i) => b.dataset.tab === tabs[i][0])) {
    btns.forEach((b, i) => { const v = tabs[i][0]; b.setAttribute('aria-current', view === v ? 'page' : 'false'); b.querySelectorAll('.badge,.livedot').forEach(x => x.remove()); b.insertAdjacentHTML('beforeend', extra(v)); });
  } else {
    tb.innerHTML = `<div class="tb-in">` + tabs.map(([v, icn, l]) => `<button data-tab="${v}" aria-current="${view === v ? 'page' : 'false'}">${ic(icn, 25, 1.9)}<span>${l}</span>${extra(v)}</button>`).join('') + `</div>`;
  }
  tabIntro();
}
$('tabbar').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; vibrate(10); openTab(b.dataset.tab); };
function openTab(v) {
  if (v === view) return;
  if (v === 'vEmp') renderEmp(); else if (v === 'vOwn') renderOwner(); else if (v === 'vLive') renderLive(); else if (v === 'vMap') renderMap(); else if (v === 'vChat') renderChat(); else if (v === 'vSet') renderSet();
  scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
}

/* ----- login ----- */
function renderLogin() {
  show('vLogin');
  const f = $('loginForm'), u = $('lgUser'), p = $('lgPass'), er = $('lgErr'), b = $('lgBtn'), rm = $('lgRemember');
  u.oninput = p.oninput = () => er.textContent = '';
  try { rm.checked = localStorage.getItem('sh-remember') !== '0'; if (rm.checked && !u.value) u.value = localStorage.getItem('sh-user') || ''; } catch (e) { }
  f.onsubmit = async e => {
    e.preventDefault();
    const user = u.value.trim(), pass = p.value;
    if (!user) { er.textContent = 'اكتب اسم المستخدم أو إيميلك'; u.focus(); return; }
    if (!pass) { er.textContent = 'اكتب كلمة السر'; p.focus(); return; }
    const email = user.includes('@') ? user : toEmail(user);
    b.disabled = true; b.textContent = 'جارٍ الدخول…';
    try {
      try { await setPersistence(auth, rm.checked ? indexedDBLocalPersistence : browserSessionPersistence); } catch (e) { }
      await signInWithEmailAndPassword(auth, email, pass); p.value = '';
      try { localStorage.setItem('sh-remember', rm.checked ? '1' : '0'); if (rm.checked) localStorage.setItem('sh-user', user); else localStorage.removeItem('sh-user'); } catch (e) { }
      justLoggedIn = true;
    }
    catch (err) { er.textContent = authMsg(err); }
    finally { b.disabled = false; b.textContent = 'دخول'; }
  };
}
let justLoggedIn = false;
/* اسم المستخدم: حروف عربي أو إنجليزي وأرقام، يتحوّل لإيميل داخلي ثابت (العربي بـ Punycode) */
const normUser = s => toEn(String(s ?? ''))
  .replace(/[ً-ْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[\s_.\-]+/g, '').toLowerCase();
const USER_OK = /^[a-z0-9ء-ي]{2,24}$/;
function toEmail(user) {
  const n = normUser(user);
  if (/^[a-z0-9]+$/.test(n)) return n + '@' + EMAIL_DOMAIN;
  let host = n; try { host = new URL('http://' + n + '.x').hostname.slice(0, -2); } catch (e) { }
  return 'u.' + host.replace(/^xn--/, '') + '@' + EMAIL_DOMAIN;
}
function authMsg(e) {
  const c = e && e.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-email')) return 'اسم المستخدم أو كلمة السر غير صحيحة';
  if (c.includes('too-many-requests')) return 'محاولات كثيرة، انتظر دقائق ثم حاول مرة أخرى';
  if (c.includes('network')) return 'لا يوجد اتصال بالإنترنت';
  if (c.includes('weak-password')) return 'كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل';
  if (c.includes('email-already-in-use')) return 'اسم المستخدم مستخدم بالفعل';
  if (c.includes('requires-recent-login')) return 'سجّل خروج وادخل مرة أخرى ثم غيّر كلمة السر';
  return 'حدث خطأ، حاول مرة أخرى';
}

/* ----- first-login password change ----- */
function renderPass() {
  show('vPass');
  $('psName').textContent = meEmp.name;
  const f = $('passForm'), a = $('psNew'), b = $('psNew2'), er = $('psErr'), btn = $('psBtn');
  a.oninput = b.oninput = () => er.textContent = '';
  f.onsubmit = async e => {
    e.preventDefault();
    if (a.value.length < 6) { er.textContent = 'كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل'; a.focus(); return; }
    if (a.value !== b.value) { er.textContent = 'كلمتا السر غير متطابقتين'; b.focus(); return; }
    btn.disabled = true;
    try { await updatePassword(auth.currentUser, a.value); await updateDoc(doc(db, 'employees', me.uid), { mustChange: false }); toast('ok', 'تم حفظ كلمة السر الجديدة', '', 'حسابك'); }
    catch (err) { er.textContent = authMsg(err); }
    finally { btn.disabled = false; }
  };
}
function renderMsg(title, body) { show('vMsg'); $('msgTitle').textContent = title; $('msgBody').textContent = body; document.querySelector('#vMsg .loader').hidden = !title.startsWith('جارٍ'); }

/* ----- welcome ----- */
function welcome(name) {
  const w = $('welcome'); if (!w) return;
  $('wName').textContent = name;
  w.hidden = false; requestAnimationFrame(() => w.classList.add('on'));
  setTimeout(() => { w.classList.remove('on'); setTimeout(() => w.hidden = true, 600); }, RM ? 1200 : 2600);
}

/* ----- shift band ----- */
function bandHTML(P) {
  if (P.off) return `<div class="band"><div class="bar"><div class="offday" style="flex:1">اليوم إجازة · لا يوجد دوام</div></div></div>`;
  const A = P.start, B = P.end, pos = v => ((v - A) / (B - A) * 100);
  const bars = P.two
    ? `<div class="w1" style="flex:${P.b1 - A}">الفترة الأولى</div><div class="bk" style="flex:${P.b2 - P.b1}">${ic('coffee', 14)} بريك</div><div class="w2" style="flex:${B - P.b2}">الفترة الثانية</div>`
    : `<div class="w1" style="flex:1">دوام متصل</div>`;
  const ticks = P.two
    ? `<span style="right:0;transform:none">${tm(A)}</span><span style="right:${pos(P.b1)}%">${tm(P.b1)}</span><span style="right:${pos(P.b2)}%">${tm(P.b2)}</span><span style="right:auto;left:0;transform:none">${tm(B)}</span>`
    : `<span style="right:0;transform:none">${tm(A)}</span><span style="right:auto;left:0;transform:none">${tm(B)}</span>`;
  return `<div class="band"><div class="now" data-now data-a="${A}" data-b="${B}"><span></span></div><div class="bar">${bars}</div><div class="ticks">${ticks}</div></div>`;
}
function updateBands() {
  const n = nowMin();
  document.querySelectorAll('[data-now]').forEach(el => { const A = +el.dataset.a, B = +el.dataset.b; const p = Math.min(Math.max((n - A) / (B - A), 0), 1) * 100; el.style.right = p + '%'; el.querySelector('span').textContent = 'الآن ' + tm(n); });
}

/* ----- profile: stats + calendar + year ----- */
function mountProfile(root, emp, withPhotos) {
  const t = today0(); const st = { p: 'month', y: t.getFullYear(), m: t.getMonth(), sel: null };
  root.innerHTML = `
   <div class="tabs" role="group" aria-label="الفترة"><span class="pill"></span>
    <button data-p="week" aria-pressed="false">أسبوع</button><button data-p="month" aria-pressed="true">شهر</button><button data-p="year" aria-pressed="false">سنة</button></div>
   <div class="statrow">
    <div class="donut"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="50"/><circle class="fg" cx="60" cy="60" r="50" pathLength="100"/></svg>
     <div class="c"><b class="num" data-k="pct">٠٪</b><span>الالتزام</span></div></div>
    <div class="kpis">
     <div class="kpi"><div class="l"><i style="background:var(--ok)"></i>أيام الحضور</div><b class="num" data-k="att">٠</b></div>
     <div class="kpi"><div class="l"><i style="background:var(--bad)"></i>أيام الغياب</div><b class="num" data-k="abs">٠</b></div>
     <div class="kpi"><div class="l"><i style="background:var(--warn)"></i>مرات التأخير</div><b class="num" data-k="late">٠</b></div>
     <div class="kpi"><div class="l">${ic('clock', 13)}ساعات العمل</div><b class="num" data-k="hrs">٠</b></div>
    </div></div>
   <div class="period" data-k="per"></div>
   <div class="calhead"><button class="navb" data-nav="1" aria-label="الشهر السابق">${ic('right', 16)}</button>
     <div style="text-align:center"><b data-k="mon"></b><span class="hj" data-k="hmon"></span></div>
     <button class="navb" data-nav="-1" aria-label="الشهر التالي">${ic('left', 16)}</button></div>
   <div class="cal" data-k="cal"></div>
   <div class="legend"><span><i style="background:var(--ok)"></i>حضور</span><span><i style="background:var(--warn)"></i>تأخير</span><span><i style="background:var(--half)"></i>نصف يوم</span><span><i style="background:var(--bad)"></i>غياب</span><span><i style="border:1px dashed var(--muted)"></i>إجازة</span></div>
   <div class="daydetail" data-k="det"><span class="muted">اضغط على أي يوم لعرض أوقات البصمة</span></div>
   <div class="calhead" style="margin-top:22px"><b>الالتزام خلال السنة</b><span class="muted small">نسبة الحضور لكل شهر</span></div>
   <div class="yearbars" data-k="year"></div>`;
  const q = k => root.querySelector(`[data-k="${k}"]`);
  const tabs = root.querySelector('.tabs');
  function renderStats() {
    const [a, b, label] = periodRange(st.p), o = stats(emp, a, b);
    countTo(q('att'), o.att); countTo(q('abs'), o.abs); countTo(q('late'), o.late); countTo(q('hrs'), o.hrs);
    countTo(q('pct'), o.pct, v => ar(v) + '٪');
    const fg = root.querySelector('.donut .fg'); fg.style.stroke = o.pct >= 90 ? 'var(--ok)' : o.pct >= 75 ? 'var(--warn)' : 'var(--bad)';
    fg.style.strokeDashoffset = 100; requestAnimationFrame(() => requestAnimationFrame(() => fg.style.strokeDashoffset = 100 - o.pct));
    q('per').textContent = label + (o.half ? ' · نصف يوم: ' + ar(o.half) : '');
    movePill(tabs);
  }
  function renderCal() {
    const first = new Date(st.y, st.m, 1), last = new Date(st.y, st.m + 1, 0);
    q('mon').textContent = mFmt.format(first);
    q('hmon').textContent = hmFmt.format(first) === hmFmt.format(last) ? hmFmt.format(first) : hmFmt.format(first).split(' ')[0] + ' – ' + hmFmt.format(last);
    let h = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(x => `<span class="wd">${x}</span>`).join('');
    for (let i = 0; i < first.getDay(); i++) h += '<span></span>';
    let k = 0;
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(st.y, st.m, d), key = keyOf(dt), s = status(emp, key);
      const cls = 'day ' + s + (isToday(key) ? ' today' : '') + (st.sel === key ? ' sel' : '');
      const tip = STL[s] ? `${dFmt.format(dt)} · ${STL[s]}` : dFmt.format(dt);
      h += `<button class="${cls}" data-day="${key}" aria-label="${tip}" style="animation-delay:${RM ? 0 : k++ * 22}ms">${ar(d)}</button>`;
    }
    q('cal').innerHTML = h;
    root.querySelector('[data-nav="1"]').disabled = keyOf(new Date(st.y, st.m, 0)) < emp.start;
    root.querySelector('[data-nav="-1"]').disabled = st.y === t.getFullYear() && st.m === t.getMonth();
  }
  function renderDet() {
    if (!st.sel) return; const s = status(emp, st.sel), r = getRec(emp, st.sel), d = fromKey(st.sel), P = planKey(st.sel);
    let h = `<b>${dFmt.format(d)}</b> · <span class="chip c-${s}">${STL[s] || '—'}</span>`;
    if (r) {
      const fs = P.off ? ALL.filter(f => r[f] != null) : P.fields;
      h += `<div class="muted small" style="margin-top:4px">` + fs.map(f => `${FL[f]} ${tm(r[f])}`).join(' · ') + ` · صافي ${dur(worked(r, st.sel))}</div>`;
      if (withPhotos) {
        const ph = ALL.filter(f => r.ph[f]);
        if (ph.length) h += `<div class="photos">` + ph.map(f => `<figure><img src="${r.ph[f]}" alt="صورة ${FL[f]}"><figcaption>${FL[f]}</figcaption></figure>`).join('') + `</div>`;
        const gs = ALL.filter(f => r.geo[f]);
        if (gs.length) h += `<div class="muted small" style="margin-top:6px">` + gs.map(f => `<a class="lnk" target="_blank" rel="noopener" href="https://maps.google.com/?q=${r.geo[f].lat},${r.geo[f].lng}">${ic('pin', 12)} موقع ${FL[f]}</a>`).join(' · ') + `</div>`;
      }
    }
    else if (s === 'off') h += `<div class="muted small">إجازة · لا يوجد دوام في هذا اليوم</div>`;
    else if (s === 'absent') h += `<div class="muted small">لا توجد بصمة في هذا اليوم</div>`;
    q('det').innerHTML = h;
  }
  function renderYear() {
    const y = t.getFullYear(); let h = '';
    for (let m = 0; m < 12; m++) {
      const a = new Date(y, m, 1), b = new Date(y, m + 1, 0);
      const fut = a > t || keyOf(b) < emp.start; const o = fut ? null : stats(emp, a, b);
      const has = o && o.days; const pct = has ? o.pct : 0; const hh = has ? Math.max(6, pct) : 6;
      const c = !has ? 'empty' : pct >= 90 ? '' : pct >= 75 ? 'mid' : 'low';
      h += `<div class="yb" title="${msFmt.format(a)}"><em>${has ? ar(pct) + '٪' : ''}</em><div class="b ${c}" style="height:${hh}%;animation-delay:${RM ? 0 : m * 60}ms"></div><span>${msFmt.format(a)}</span></div>`;
    }
    q('year').innerHTML = h;
  }
  root.onclick = e => {
    const pb = e.target.closest('[data-p]');
    if (pb) { tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === pb)); st.p = pb.dataset.p; renderStats(); return; }
    const nb = e.target.closest('[data-nav]');
    if (nb && !nb.disabled) { const d = new Date(st.y, st.m - (+nb.dataset.nav), 1); st.y = d.getFullYear(); st.m = d.getMonth(); renderCal(); return; }
    const db_ = e.target.closest('[data-day]');
    if (db_) { st.sel = db_.dataset.day; root.querySelectorAll('.day.sel').forEach(x => x.classList.remove('sel')); db_.classList.add('sel'); renderDet(); }
  };
  renderStats(); renderCal(); renderYear();
  root._refresh = () => { renderStats(); renderCal(); renderDet(); renderYear(); };
}

/* ========== employee ========== */
function geoRuleText(emp) {
  const g = emp.geo || { mode: 'sites' };
  if (g.mode === 'any') return 'مسموح لك تسجّل الحضور من أي مكان';
  const list = allowedSites(emp);
  if (!sites().length) return 'لم يحدد المالك موقع عمل بعد';
  if (!list.length) return 'لم يُحدَّد لك موقع للتسجيل، تواصل مع المالك';
  return 'التسجيل مسموح من: ' + list.map(s => s.name).join('، ');
}
function renderEmp() {
  show('vEmp');
  const emp = meEmp; const v = $('vEmp'); const P = todayPlan();
  v.innerHTML = `<div class="grid two">
   <section class="card reveal">
    <div class="greet" id="greet"></div>
    <div class="muted small" style="margin-bottom:6px">${emp.dept ? 'قسم ' + esc(emp.dept) + ' · ' : ''}${esc(COMPANY)}</div>
    <div class="phase" id="phase"></div>
    ${bandHTML(P)}
    <div class="stage" style="margin-top:22px">
     <div class="scan" id="scan">
      <svg class="ring" viewBox="0 0 208 208"><circle class="track" cx="104" cy="104" r="98"/><circle class="orbit" cx="104" cy="104" r="98" pathLength="100"/><circle class="prog" id="prog" cx="104" cy="104" r="98" pathLength="100"/></svg>
      <div class="core" id="core"><span class="face">${ic('face', 70, 1.2)}</span></div>
      <div class="laser"></div>
      <div class="tick"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path pathLength="30" d="M5 12l5 5L20 7"/></svg></div>
     </div>
     <div class="next-label" id="nextLbl"></div>
     <div class="hint" id="hint"></div>
     <div class="actions">
      <button class="btn primary" id="bFace">${ic('camera', 18)} بصمة الوجه</button>
      <button class="btn ghost" id="bFp"${window.__bio ? '' : ' hidden'}>${ic('finger', 18)} بصمة الإصبع</button>
     </div>
     <div class="devline" id="devline"></div>
     <div class="devline">${ic('pin', 13)} ${esc(geoRuleText(emp))}</div>
     <button class="livecta ${liveOn ? 'on' : ''}" id="liveCta" type="button"><span class="lc-ic">${ic('live', 22)}</span><span class="lc-tx"><b>${liveOn ? 'اللايف لوكيشن شغّال' : 'ابدأ لايف لوكيشن'}</b><small>${liveOn ? 'المالك شايف مكانك الآن · اضغط للتفاصيل' : 'شارك مكانك المباشر مع المالك'}</small></span>${ic('left', 18)}</button>
     <div class="slots" id="slots" style="grid-template-columns:repeat(${P.off ? 4 : P.fields.length},minmax(0,1fr))"></div>
     <div class="timer"><span class="muted small">مدة العمل اليوم</span><b class="num" id="wt">٠٠:٠٠:٠٠</b></div>
     ${notifCta()}
    </div>
   </section>
   <section class="card reveal" style="animation-delay:.12s">
    <h2>سجلّي <span class="muted small" style="font-family:var(--f-body)">${esc(emp.name)} · ${esc(emp.num)}</span></h2>
    <div id="myProf"></div>
   </section></div>`;
  mountProfile($('myProf'), emp, false);
  bindScan(); bindNotifCta(); updateEmpLive(true); updateBands();
  $('liveCta').onclick = () => { vibrate(15); openTab('vLive'); if (!liveOn) startLive(); };
}
function notifCta() {
  const p = ('Notification' in window) ? Notification.permission : 'unsupported';
  if (p === 'default') return `<button class="btn ghost" id="notifBtn" style="max-width:380px;width:100%">${ic('bell', 16)} فعّل الإشعارات عشان توصلك التنبيهات</button>`;
  if (p === 'denied') return `<p class="muted small" style="text-align:center">الإشعارات مقفولة، فعّلها من إعدادات المتصفح عشان توصلك التنبيهات</p>`;
  return '';
}
function bindNotifCta() { const nb = $('notifBtn'); if (nb) nb.onclick = async () => { try { await Notification.requestPermission(); } catch (e) { } nb.remove(); }; }
const myRec = () => getRec(meEmp, todayKey());
function updateEmpLive(full) {
  if (view !== 'vEmp' || !meEmp) return;
  const emp = meEmp, r = myRec(), n = nowMin(), key = todayKey(), P = todayPlan();
  const hr = Math.floor(n / 60);
  const g = $('greet'); if (!g) return;
  g.textContent = (hr < 12 ? 'صباح الخير' : 'مساء الخير') + '، ' + emp.name.split(' ')[0];
  const nf0 = nextField(r, P);
  let txt, col; const left = x => dur(x - n); const G = grace();
  if (P.off) { txt = 'اليوم إجازة'; col = 'var(--muted)'; }
  else if (!r) {
    if (n < P.start) { txt = 'الدوام يبدأ بعد ' + left(P.start); col = 'var(--muted)'; }
    else if (n <= P.start + G) { txt = 'سجّل حضورك الآن · فترة السماح تنتهي بعد ' + left(P.start + G); col = 'var(--warn)'; }
    else if (n < P.W.in[1]) { txt = 'متأخر عن الحضور منذ ' + dur(n - P.start); col = 'var(--bad)'; }
    else if (P.two && n < P.b2) { txt = 'فاتك تسجيل الحضور · العودة تفتح ' + tm(P.W.in2[0]); col = 'var(--bad)'; }
    else { txt = 'لم تسجّل اليوم'; col = 'var(--bad)'; }
  }
  else if (!P.two) {
    if (r.out == null) { txt = n < P.end ? 'أنت في الدوام · الانصراف بعد ' + left(P.end) : 'انتهى وقت الدوام · سجّل انصرافك'; col = n < P.end ? 'var(--ok)' : 'var(--warn)'; }
    else { txt = 'انتهى دوامك · صافي ' + dur(worked(r, key)); col = 'var(--gold)'; }
  }
  else if (r.in != null && r.out1 == null && r.in2 == null) { txt = 'أنت في الفترة الأولى · البريك بعد ' + left(P.b1); col = 'var(--ok)'; if (n >= P.b1) { txt = 'حان وقت البريك · سجّل خروج البريك'; col = 'var(--warn)'; } }
  else if (r.in2 == null) { if (n < P.b2) { txt = 'أنت في البريك · العودة بعد ' + left(P.b2); col = 'var(--info)'; } else { txt = 'متأخر عن العودة منذ ' + dur(n - P.b2); col = 'var(--bad)'; } }
  else if (r.out == null) { txt = n < P.end ? 'الفترة الثانية · الانصراف بعد ' + left(P.end) : 'انتهى وقت الدوام · سجّل انصرافك'; col = n < P.end ? 'var(--ok)' : 'var(--warn)'; }
  else { txt = 'انتهى دوامك · صافي ' + dur(worked(r, key)); col = 'var(--gold)'; }
  const ph = $('phase'); ph.style.color = col; ph.innerHTML = `<span class="dot"></span><span>${txt}</span>`;
  if (full && !busy) {
    const A = allowed(r, n, P), all = !P.off && !nf0;
    $('nextLbl').textContent = P.off ? 'لا يوجد دوام اليوم' : all ? 'اكتمل تسجيل اليوم' : A.f ? ACT[A.f] : A.msg;
    $('hint').textContent = P.off ? '' : all ? 'تم تسجيل كل البصمات' : A.f ? ACT[A.f] + ' متاح حتى ' + tm(P.W[A.f][1]) : A.sub;
    ['bFace', 'bFp'].forEach(id => $(id).disabled = !A.f);
    $('scan').classList.toggle('locked', !A.f);
    $('devline').innerHTML = window.__bio ? (emp.cred ? `${ic('device', 13)} بصمة جهازك مربوطة بحسابك` : `${ic('device', 13)} أول بصمة إصبع هتربط هذا الجوال بحسابك`) : `${ic('device', 13)} بصمة الإصبع غير متاحة على هذا الجهاز`;
    const fs = P.off ? [] : P.fields;
    $('slots').innerHTML = fs.map(f => {
      const v = r && r[f] != null; const late = v && ((f === 'in' && r.in > P.start + G) || (f === 'in2' && r.in2 > P.b2 + G));
      const missed = !v && n > P.W[f][1];
      const m = v && r.m[f] ? MI[r.m[f]] : null;
      const cls = v ? (late ? 'late' : 'done') : missed ? 'missed' : (f === A.f ? 'next' : '');
      return `<div class="slot ${cls}" data-slot="${f}"><div class="l">${FL[f]}</div><div class="v num">${v ? tm(r[f]) : missed ? 'فات' : '—'}</div><div class="m">${m ? ic(m[0], 11) + m[1] : v ? '' : 'من ' + tm(P.W[f][0])}</div></div>`;
    }).join('');
  }
  const wtEl = $('wt');
  if (wtEl) { let s = Math.max(0, Math.floor(worked(r, key) * 60)); wtEl.textContent = nf2.format(Math.floor(s / 3600)) + ':' + nf2.format(Math.floor(s % 3600 / 60)) + ':' + nf2.format(s % 60); }
}

function bindScan() {
  const bFace = $('bFace'), bFp = $('bFp'), cam = $('cam');
  bFace.onclick = () => {
    if (busy) return; const A = allowed(myRec(), nowMin(), todayPlan()); if (!A.f) { runFail(A.msg); return; }
    cam.value = ''; cam.click();
  };
  cam.onchange = async () => {
    const f = cam.files && cam.files[0]; if (!f) return;
    let thumb = null;
    try {
      const url = URL.createObjectURL(f); const img = new Image(); img.src = url; await img.decode();
      const c = document.createElement('canvas'), s = 200; c.width = c.height = s; const x = c.getContext('2d');
      const k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k; x.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
      thumb = c.toDataURL('image/jpeg', .7); URL.revokeObjectURL(url);
    } catch (e) { runFail('تعذّر قراءة الصورة، حاول مرة أخرى'); return; }
    $('core').innerHTML = `<img src="${thumb}" alt="">`;
    doPunch('face', thumb, 'جارٍ التحقق من الوجه…');
  };
  bFp.onclick = async () => {
    if (busy || bFp.disabled) return;
    const A = allowed(myRec(), nowMin(), todayPlan()); if (!A.f) { runFail(A.msg); return; }
    busy = true; $('scan').classList.add('busy'); $('hint').textContent = 'ضع إصبعك على حساس الجوال أو استخدم Face ID…';
    const ok = await bioVerify(); busy = false;
    if (ok === true) doPunch('finger', null, 'جارٍ التسجيل…');
    else { $('scan').classList.remove('busy'); runFail(ok === 'other' ? 'هذا الجهاز غير مسجّل لحسابك، تواصل مع المالك' : 'لم يتم التحقق من البصمة'); }
  };
}
async function doPunch(method, thumb, label) {
  busy = true; const scan = $('scan'), prog = $('prog');
  scan.classList.remove('ok', 'fail', 'locked'); scan.classList.add('busy'); $('hint').textContent = label;
  const t0 = performance.now(); let done = false;
  (function f(t) { if (done) return; const k = Math.min((t - t0) / 1600, .92); prog.style.strokeDashoffset = 100 - k * 100; requestAnimationFrame(f); })(t0);
  const [res] = await Promise.all([punch(method, thumb), new Promise(r => setTimeout(r, RM ? 0 : 1300))]);
  done = true;
  if (res.ok) {
    prog.style.strokeDashoffset = 0;
    scan.classList.remove('busy'); scan.classList.add('ok'); vibrate([30, 50, 90]);
    const P = todayPlan();
    $('hint').textContent = `تم ${FL[res.f]} ${tm(res.t)}` + (res.late ? ' · تأخير ' + dur(res.t - (res.f === 'in' ? P.start : P.b2)) : '');
    toast(res.late ? 'warn' : 'ok', `${FL[res.f]} ${tm(res.t)}`, `تم التحقق ب${MI[method][1]} · وصل إشعار للمالك`, 'تسجيلك');
    setTimeout(() => { scan.classList.remove('ok'); prog.style.strokeDashoffset = 100; $('core').innerHTML = `<span class="face">${ic('face', 70, 1.2)}</span>`; busy = false; updateEmpLive(true); const sl = document.querySelector(`[data-slot="${res.f}"]`); sl && sl.classList.add('flash'); }, 1700);
  } else { busy = false; runFail(res.msg); setTimeout(() => { $('core').innerHTML = `<span class="face">${ic('face', 70, 1.2)}</span>`; updateEmpLive(true); }, 800); }
}
function runFail(msg) {
  const scan = $('scan'); if (!scan) return; scan.classList.remove('busy'); scan.classList.add('fail'); vibrate([60, 40, 60]);
  $('hint').textContent = msg;
  setTimeout(() => { scan.classList.remove('fail'); $('prog').style.strokeDashoffset = 100; }, 700);
}
function getGeo() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('nogeo'));
    navigator.geolocation.getCurrentPosition(p => res({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }), rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  });
}
function distM(a, b) {
  const R = 6371000, t = x => x * Math.PI / 180; const dl = t(b.lat - a.lat), dg = t(b.lng - a.lng);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// المواقع المسموح للموظف يسجّل منها
function allowedSites(emp) {
  const g = emp.geo || { mode: 'sites' }, all = sites();
  if (g.mode === 'any') return null;
  return Array.isArray(g.ids) ? all.filter(s => g.ids.includes(s.id)) : all;
}
const siteAt = (pt, list) => { let best = null; (list || sites()).forEach(s => { const d = distM(pt, s); if (d - Math.min(pt.acc || 0, 100) <= s.r && (!best || d < best.d)) best = { s, d }; }); return best; };
async function punch(method, thumb) {
  const r = myRec(), P = todayPlan(); const A = allowed(r, nowMin(), P);
  if (!A.f) return { ok: false, msg: A.msg };
  if (!navigator.onLine) return { ok: false, msg: 'لا يوجد اتصال بالإنترنت' };
  const list = allowedSites(meEmp), fenced = list !== null && sites().length > 0;
  if (fenced && !list.length) return { ok: false, msg: 'لم يُحدَّد لك موقع للتسجيل، تواصل مع المالك' };
  let geo = null;
  try { geo = await getGeo(); } catch (e) { if (fenced) return { ok: false, msg: 'فعّل الموقع (GPS) واسمح للتطبيق باستخدامه' }; }
  if (fenced && geo && !siteAt(geo, list)) {
    const near = list.map(s => ({ s, d: distM(geo, s) })).sort((a, b) => a.d - b.d)[0];
    return { ok: false, msg: 'أنت خارج موقع العمل · أقرب موقع ' + near.s.name + ' على بعد ' + ar(Math.round(near.d)) + ' م' };
  }
  const k = FMAP[A.f]; const data = { [k]: serverTimestamp(), [k + '_m']: method };
  if (thumb) data[k + '_ph'] = thumb; if (geo) data[k + '_geo'] = geo;
  const ref = doc(db, 'days', me.uid + '_' + todayIdx());
  const timeout = new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 15000));
  try {
    if (r) await Promise.race([updateDoc(ref, data), timeout]);
    else await Promise.race([setDoc(ref, { uid: me.uid, day: todayIdx(), ...data }), timeout]);
  } catch (e) {
    const c = e && e.code || '';
    if (c.includes('permission-denied')) return { ok: false, msg: 'التسجيل غير مسموح الآن، تأكد من الوقت أو تواصل مع المالك' };
    if (c === 'timeout' || c.includes('unavailable')) return { ok: false, msg: 'الاتصال ضعيف، حاول مرة أخرى' };
    return { ok: false, msg: 'تعذّر الحفظ، حاول مرة أخرى' };
  }
  const t = Math.floor(nowMin());
  const late = (A.f === 'in' && t > P.start + grace()) || (A.f === 'in2' && t > P.b2 + grace());
  return { ok: true, f: A.f, t, late };
}

/* ----- device biometrics (WebAuthn) ----- */
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function bioVerify() {
  const ch = crypto.getRandomValues(new Uint8Array(32));
  try {
    if (!meEmp.cred) {
      const c = await navigator.credentials.create({
        publicKey: {
          challenge: ch, rp: { name: 'الشمراني للاستشارات الهندسية' },
          user: { id: new TextEncoder().encode(me.uid), name: meEmp.num || me.uid, displayName: meEmp.name },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000
        }
      });
      await updateDoc(doc(db, 'employees', me.uid), { cred: b64(c.rawId) });
      toast('ok', 'تم ربط بصمتك بهذا الجوال', 'البصمات القادمة ستُطابق عليها', 'الأمان');
      return true;
    }
    await navigator.credentials.get({ publicKey: { challenge: ch, allowCredentials: [{ type: 'public-key', id: unb64(meEmp.cred) }], userVerification: 'required', timeout: 60000 } });
    return true;
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return false;
    return meEmp.cred ? 'other' : false;
  }
}

/* ----- employee reminders: حضور، بريك، عودة، انصراف ----- */
function checkEmpReminders() {
  if (!meEmp || isOwner || !meEmp.active) return;
  const key = todayKey(), P = todayPlan(); if (P.off || key < meEmp.start) return;
  const n = nowMin(), r = myRec(), G = grace();
  const rule = (id, cond, fn) => { const k = key + id; if (cond && !notified.has(k)) { notified.add(k); fn(); } };
  const noIn = !r || r.in == null;
  // الحضور: من أول دقيقة، وبعد ٥ دقائق، وعند نهاية فترة السماح
  rule('in1', noIn && n >= P.start + 1 && n < P.start + 5, () => alertBoth('warn', 'لازم تسجّل حضورك', 'الدوام بدأ الساعة ' + tm(P.start) + ' · فترة السماح ' + ar(G) + ' دقائق', 'تنبيه لك', 'rem-in'));
  rule('in5', noIn && n >= P.start + 5 && n < P.start + G, () => alertBoth('bad', 'سجّل حضورك الآن', 'باقي ' + ar(Math.max(1, Math.ceil(P.start + G - n))) + ' دقائق على نهاية فترة السماح', 'تنبيه لك', 'rem-in'));
  rule('inG', noIn && n >= P.start + G && n < P.start + G + 30, () => alertBoth('bad', 'انتهت فترة السماح', 'سجّل حضورك فوراً، هيتحسب تأخير', 'تنبيه لك', 'rem-in'));
  if (P.two) {
    const inShift1 = r && r.in != null && r.out1 == null;
    rule('b-5', inShift1 && n >= P.b1 - 5 && n < P.b1, () => alertBoth('info', 'البريك بعد ٥ دقائق', 'موعد البريك الساعة ' + tm(P.b1), 'تنبيه لك', 'rem-b'));
    rule('b0', inShift1 && n >= P.b1 && n < P.b1 + 15, () => alertBoth('info', 'حان موعد البريك', 'سجّل خروج البريك · العودة الساعة ' + tm(P.b2), 'تنبيه لك', 'rem-b'));
    const noBack = !r || r.in2 == null;
    rule('r-5', noBack && n >= P.b2 - 5 && n < P.b2, () => alertBoth('info', 'العودة من البريك بعد ٥ دقائق', 'لا تنسَ تسجيل بصمة العودة الساعة ' + tm(P.b2), 'تنبيه لك', 'rem-r'));
    rule('r1', noBack && n >= P.b2 + 1 && n < P.b2 + 5, () => alertBoth('warn', 'لازم تسجّل عودتك', 'الفترة الثانية بدأت الساعة ' + tm(P.b2), 'تنبيه لك', 'rem-r'));
    rule('r5', noBack && n >= P.b2 + 5 && n < P.b2 + G, () => alertBoth('bad', 'سجّل عودتك الآن', 'باقي ' + ar(Math.max(1, Math.ceil(P.b2 + G - n))) + ' دقائق على نهاية فترة السماح', 'تنبيه لك', 'rem-r'));
  }
  const working = r && (r.in != null || r.in2 != null) && r.out == null;
  rule('o-5', working && n >= P.end - 5 && n < P.end, () => alertBoth('gold', 'الانصراف بعد ٥ دقائق', 'موعد الانصراف الساعة ' + tm(P.end), 'تنبيه لك', 'rem-o'));
  rule('o0', working && n >= P.end && n < P.end + 30, () => alertBoth('gold', 'حان موعد الانصراف', 'سجّل بصمة الانصراف قبل ما تمشي', 'تنبيه لك', 'rem-o'));
}

/* ========== live location: employee ========== */
let liveOn = false, watchId = null, lastSent = null, lastSentAt = 0, livePath = [], wakeLock = null, myMap = null, myMarker = null, myLine = null, lastFix = null;
function renderLive() {
  show('vLive');
  const v = $('vLive');
  v.innerHTML = `<section class="card reveal">
    <h2>موقعي المباشر <span class="chip ${liveOn ? 'c-present' : 'c-off'}" id="lvChip">${liveOn ? 'المشاركة شغالة' : 'متوقف'}</span></h2>
    <p class="muted small" style="margin:0 0 12px">لما تشغّل المشاركة، المالك يشوف مكانك على الخريطة لحظة بلحظة، ويوصله إشعار بكل تحديث.</p>
    <div class="map" id="myMap"></div>
    <div class="livestats"><div><span>آخر تحديث</span><b id="lvAt">—</b></div><div><span>دقة الموقع</span><b id="lvAcc">—</b></div><div><span>المكان</span><b id="lvPlace">—</b></div></div>
    <button class="btn ${liveOn ? 'ghost' : 'primary'} big" id="lvBtn">${ic('live', 20)} ${liveOn ? 'إيقاف مشاركة الموقع' : 'ابدأ لايف لوكيشن'}</button>
    <div class="err" id="lvErr" style="text-align:center"></div>
    <ul class="tips">
      <li>خلّي التطبيق مفتوح والشاشة شغالة أثناء المشاركة. الجوال بيوقف الموقع لو التطبيق اتقفل أو الشاشة طفت.</li>
      <li>لو قفلت التطبيق وفتحته تاني، المشاركة بترجع تشتغل لوحدها.</li>
    </ul>
  </section>`;
  $('lvBtn').onclick = () => { vibrate(20); liveOn ? stopLive(true) : startLive(); };
  loadLeaflet().then(L => {
    if (view !== 'vLive') return;
    myMap = L.map('myMap', { zoomControl: true, attributionControl: true }).setView(lastFix ? [lastFix.lat, lastFix.lng] : [24.7136, 46.6753], lastFix ? 16 : 11);
    tiles(L).addTo(myMap);
    sites().forEach(s => L.circle([s.lat, s.lng], { radius: s.r, color: '#e3262b', weight: 1, fillOpacity: .08 }).addTo(myMap).bindTooltip(s.name));
    myLine = L.polyline(livePath.map(p => [p.lat, p.lng]), { color: '#e3262b', weight: 4, opacity: .6 }).addTo(myMap);
    if (lastFix) placeMe(lastFix);
  }).catch(() => { $('myMap').innerHTML = '<p class="muted small" style="padding:20px;text-align:center">تعذّر تحميل الخريطة، تأكد من الإنترنت</p>'; });
  paintLiveStats();
}
function paintLiveStats() {
  if (view !== 'vLive') return;
  $('lvAt').textContent = lastSentAt ? ago(lastSentAt) : '—';
  $('lvAcc').textContent = lastFix ? '±' + ar(lastFix.acc) + ' م' : '—';
  const s = lastFix && siteAt(lastFix); $('lvPlace').textContent = lastFix ? (s ? s.s.name : 'خارج المواقع') : '—';
}
function placeMe(p) {
  if (!myMap || !window.L) return;
  const L = window.L;
  if (!myMarker) myMarker = L.marker([p.lat, p.lng], { icon: pinIcon(initials(meEmp ? meEmp.name : ''), true) }).addTo(myMap);
  else myMarker.setLatLng([p.lat, p.lng]);
  if (myLine) myLine.setLatLngs(livePath.map(x => [x.lat, x.lng]));
  myMap.setView([p.lat, p.lng], Math.max(myMap.getZoom(), 16), { animate: !RM });
}
async function startLive() {
  const er = $('lvErr'); if (er) er.textContent = '';
  if (!navigator.geolocation) { if (er) er.textContent = 'الجوال لا يدعم تحديد الموقع'; return; }
  let g0;
  try { g0 = await getGeo(); } catch (e) { if (er) er.textContent = 'اسمح للتطبيق باستخدام الموقع (GPS) من إعدادات الجوال'; return; }
  liveOn = true; try { localStorage.setItem('sh-live', '1'); } catch (e) { }
  try { await setDoc(doc(db, 'live', me.uid), { uid: me.uid, name: meEmp.name, dept: meEmp.dept || '', on: true, startedAt: serverTimestamp(), at: serverTimestamp() }, { merge: true }); } catch (e) { }
  watchId = navigator.geolocation.watchPosition(onFix, onFixErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  keepAwake(); toast('live', 'بدأت مشاركة موقعك', 'المالك يقدر يشوف مكانك الآن', 'موقعي المباشر');
  if (view === 'vLive') renderLive(); paintTabs();
  onFix({ coords: { latitude: g0.lat, longitude: g0.lng, accuracy: g0.acc, speed: null } });
}
async function stopLive(user) {
  if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; liveOn = false;
  if (user) { try { localStorage.removeItem('sh-live'); } catch (e) { } }
  try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { }
  if (me && meEmp && !canSee()) { try { await setDoc(doc(db, 'live', me.uid), { on: false, at: serverTimestamp() }, { merge: true }); } catch (e) { } }
  if (user) toast('info', 'تم إيقاف مشاركة الموقع', '', 'موقعي المباشر');
  if (view === 'vLive') renderLive(); paintTabs();
}
async function onFix(pos) {
  const p = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6), acc: Math.round(pos.coords.accuracy), spd: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null, t: Date.now() };
  lastFix = p;
  const moved = lastSent ? distM(lastSent, p) : Infinity, since = Date.now() - lastSentAt;
  if (moved >= 20 || since >= 30000) {
    lastSent = p; lastSentAt = Date.now();
    if (moved >= 15 || !livePath.length) { livePath.push({ lat: p.lat, lng: p.lng, t: p.t }); if (livePath.length > 120) livePath = livePath.slice(-120); }
    try { await setDoc(doc(db, 'live', me.uid), { uid: me.uid, name: meEmp.name, dept: meEmp.dept || '', on: true, lat: p.lat, lng: p.lng, acc: p.acc, spd: p.spd, at: serverTimestamp(), path: livePath }, { merge: true }); } catch (e) { }
  }
  if (view === 'vLive') { placeMe(p); paintLiveStats(); }
}
function onFixErr(e) { const er = $('lvErr'); if (er && e && e.code === 1) er.textContent = 'الموقع مرفوض، اسمح للتطبيق باستخدامه من الإعدادات'; }
async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { } }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (view === 'vChat') markChatRead();
    if (liveOn) { keepAwake(); if (watchId == null && navigator.geolocation) watchId = navigator.geolocation.watchPosition(onFix, onFixErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }); }
    checkEmpReminders(); checkOwnerAlerts();
  }
});
function resumeLive() { let want = false; try { want = localStorage.getItem('sh-live') === '1'; } catch (e) { } if (want && !liveOn && meEmp && meEmp.active) startLive(); }

/* ----- Leaflet (الخريطة) ----- */
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => res(window.L); s.onerror = () => { leafletP = null; rej(new Error('leaflet')); }; document.head.appendChild(s);
  });
  return leafletP;
}
const tiles = L => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
const pinIcon = (txt, on) => window.L.divIcon({ className: '', html: `<div class="mpin ${on ? 'on' : ''}"><span>${esc(txt)}</span></div>`, iconSize: [40, 48], iconAnchor: [20, 46] });

/* ========== live location: owner ========== */
let ownMap = null, ownMarks = {}, ownLines = {}, liveFirst = true, liveNotifAt = {};
const fresh = l => l && l.on && l.atMs && (Date.now() - l.atMs) < 3 * 60000;
function onLive(snap) {
  const prev = {};
  snap.docChanges().forEach(c => { prev[c.doc.id] = lives[c.doc.id]; });
  snap.docChanges().forEach(c => {
    if (c.type === 'removed') { delete lives[c.doc.id]; return; }
    const d = c.doc.data(); lives[c.doc.id] = { ...d, id: c.doc.id, atMs: d.at && d.at.toMillis ? d.at.toMillis() : Date.now() };
  });
  if (!liveFirst && canSee()) {
    snap.docChanges().forEach(c => {
      if (c.type === 'removed') return;
      const now = lives[c.doc.id], was = prev[c.doc.id], name = now.name || 'موظف';
      if (now.on && !(was && was.on)) { alertBoth('live', name + ' بدأ مشاركة موقعه', 'اضغط لعرضه على الخريطة', 'الموقع المباشر', 'live-' + c.doc.id, 'vMap:' + c.doc.id); return; }
      if (!now.on && was && was.on) { alertBoth('info', name + ' أوقف مشاركة موقعه', now.lat ? 'آخر مكان: ' + placeName(now) : '', 'الموقع المباشر', 'live-' + c.doc.id, 'vMap:' + c.doc.id); return; }
      if (now.on && now.lat != null && (!was || was.lat !== now.lat || was.lng !== now.lng)) {
        const wasSite = was && was.lat != null ? siteAt(was) : null, nowSite = siteAt(now);
        if (was && was.lat != null && ((wasSite && wasSite.s.id) !== (nowSite && nowSite.s.id))) {
          alertBoth('live', nowSite ? name + ' وصل ' + nowSite.s.name : name + ' خرج من ' + wasSite.s.name, tm(nowMin()), 'الموقع المباشر', 'live-' + c.doc.id, 'vMap:' + c.doc.id);
          liveNotifAt[c.doc.id] = Date.now(); return;
        }
        if (liveEvery() && Date.now() - (liveNotifAt[c.doc.id] || 0) >= 60000) {
          liveNotifAt[c.doc.id] = Date.now();
          const mv = was && was.lat != null ? ' · تحرك ' + ar(Math.round(distM(was, now))) + ' م' : '';
          alertBoth('live', name + ' · تحديث الموقع', placeName(now) + mv, 'الموقع المباشر', 'live-' + c.doc.id, 'vMap:' + c.doc.id);
        }
      }
    });
  }
  liveFirst = false;
  if (view === 'vMap') paintMap();
}
const placeName = l => { const s = siteAt(l); return s ? 'في ' + s.s.name : 'خارج مواقع العمل'; };
// بيتحرك ولا واقف: من السرعة أو من آخر نقطتين في المسار
function motion(l) {
  if (!fresh(l)) return l.on ? { txt: 'منقطع', cls: 'c-missing', moving: false } : { txt: 'متوقف', cls: 'c-off', moving: false };
  let moving = l.spd != null && l.spd >= 4, speed = l.spd;
  const p = Array.isArray(l.path) ? l.path : [];
  if (!moving && p.length >= 2) {
    const a = p[p.length - 1], b = p[p.length - 2];
    if (a.t && b.t && a.t - b.t < 3 * 60000 && Date.now() - a.t < 2 * 60000) { const d = distM(a, b); if (d >= 40) { moving = true; if (speed == null) speed = Math.round(d / ((a.t - b.t) / 1000) * 3.6); } }
  }
  return moving ? { txt: 'بيتحرك', cls: 'c-break', moving: true, speed } : { txt: 'واقف', cls: 'c-present', moving: false, speed: 0 };
}
const dirUrl = l => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}&travelmode=driving`;
let liveSheetId = null;
function openLiveSheet(id) {
  const l = lives[id]; if (!l) return; liveSheetId = id; sheetEmp = null;
  const sh = $('sheet'), sc = $('scrim');
  paintLiveSheet();
  sh.hidden = false; sc.hidden = false;
  requestAnimationFrame(() => { sh.classList.add('on'); sc.classList.add('on'); });
  sc.onclick = closeSheet;
  if (ownMap && l.lat != null) ownMap.setView([l.lat, l.lng], 17, { animate: !RM });
}
function paintLiveSheet() {
  const l = lives[liveSheetId], inner = $('sheetInner'); if (!l || !inner) return;
  if (l.lat == null) { inner.innerHTML = `<div class="sh-head"><div class="av">${esc(initials(l.name))}</div><b>${esc(l.name)}</b><button class="navb" id="shClose" aria-label="إغلاق">${ic('x', 16)}</button></div><p class="muted" style="text-align:center;padding:20px">بدأ المشاركة، ومكانه هيظهر خلال ثواني…</p>`; $('shClose').onclick = closeSheet; return; }
  const e = empById(l.id), st = motion(l), s = siteAt(l);
  const near = sites().map(x => ({ x, d: distM(l, x) })).sort((a, b) => a.d - b.d)[0];
  const started = l.startedAt && l.startedAt.toMillis ? l.startedAt.toMillis() : null;
  const pth = Array.isArray(l.path) ? l.path : []; let km = 0; for (let i = 1; i < pth.length; i++) km += distM(pth[i - 1], pth[i]);
  inner.innerHTML = `<div class="sh-head"><div class="av ${fresh(l) ? 'liveav' : ''}">${esc(initials(l.name))}</div><b>${esc(l.name)} <span class="muted small">${esc((e && e.dept) || l.dept || '')}</span></b>
    <button class="navb" id="shClose" aria-label="إغلاق">${ic('x', 16)}</button></div>
    <div class="lvstate ${st.moving ? 'mv' : ''}"><span class="pulse"></span><b>${st.txt}</b>${st.moving && st.speed ? `<span>· ${ar(st.speed)} كم/س</span>` : ''}<small>${fresh(l) ? 'لايف الآن' : 'آخر تحديث ' + ago(l.atMs)}</small></div>
    <div class="lvgrid">
     <div><span>المكان</span><b>${s ? esc(s.s.name) : 'خارج مواقع العمل'}</b></div>
     <div><span>أقرب موقع عمل</span><b>${near ? esc(near.x.name) + ' · ' + (near.d >= 1000 ? ar(+(near.d / 1000).toFixed(1)) + ' كم' : ar(Math.round(near.d)) + ' م') : '—'}</b></div>
     <div><span>آخر تحديث</span><b>${ago(l.atMs)} · ${clockFmt.format(new Date(l.atMs))}</b></div>
     <div><span>دقة الموقع</span><b>±${ar(l.acc || 0)} م</b></div>
     <div><span>بدأ المشاركة</span><b>${started ? clockFmt.format(new Date(started)) : '—'}</b></div>
     <div><span>المسافة المقطوعة</span><b>${km >= 1000 ? ar(+(km / 1000).toFixed(1)) + ' كم' : ar(Math.round(km)) + ' م'}</b></div>
     <div class="wide"><span>الإحداثيات</span><b dir="ltr">${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}</b></div>
    </div>
    <div class="lvbtns">
     <a class="btn primary" href="${dirUrl(l)}" target="_blank" rel="noopener">${ic('send', 18)} الاتجاهات للوصول إليه</a>
     <a class="btn ghost" href="https://maps.google.com/?q=${l.lat},${l.lng}" target="_blank" rel="noopener">${ic('pin', 18)} فتح في خرائط جوجل</a>
     <button class="btn ghost" id="lvFocus" type="button">${ic('map', 18)} عرضه على الخريطة</button>
    </div>`;
  $('shClose').onclick = closeSheet;
  $('lvFocus').onclick = () => { closeSheet(); if (ownMap) { ownMap.setView([l.lat, l.lng], 18, { animate: !RM }); ownMarks[l.id] && ownMarks[l.id].openPopup && ownMarks[l.id].openPopup(); } };
}
const liveEvery = () => { try { return localStorage.getItem('sh-live-every') !== '0'; } catch (e) { return true; } };
function renderMap() {
  show('vMap');
  const v = $('vMap');
  v.innerHTML = `<section class="card reveal">
    <h2>الخريطة المباشرة <span class="muted small" id="mpCount" style="font-family:var(--f-body)"></span></h2>
    <div class="map tall" id="ownMap"></div>
    <label class="switch"><input type="checkbox" id="mpEvery" ${liveEvery() ? 'checked' : ''}><span>إشعار مع كل تحديث في اللايف (مرة كل دقيقة بحد أقصى لكل موظف)</span></label>
    <div class="lvhead"><b>اللي شغّالين لايف لوكيشن</b><span class="muted small">اضغط على أي اسم لتفاصيل مكانه والاتجاهات</span></div>
    <div id="mpList" class="lvtable"></div>
  </section>`;
  $('mpEvery').onchange = e => { try { localStorage.setItem('sh-live-every', e.target.checked ? '1' : '0'); } catch (x) { } askNotify(); };
  $('mpList').onclick = e => { const b = e.target.closest('[data-focus]'); if (!b) return; openLiveSheet(b.dataset.focus); };
  ownMarks = {}; ownLines = {}; ownMap = null;
  loadLeaflet().then(L => {
    if (view !== 'vMap') return;
    ownMap = L.map('ownMap').setView([24.7136, 46.6753], 11);
    tiles(L).addTo(ownMap);
    sites().forEach(s => L.circle([s.lat, s.lng], { radius: s.r, color: '#e3262b', weight: 1, fillOpacity: .08 }).addTo(ownMap).bindTooltip(s.name, { permanent: false }));
    paintMap(true);
  }).catch(() => { $('ownMap').innerHTML = '<p class="muted small" style="padding:20px;text-align:center">تعذّر تحميل الخريطة، تأكد من الإنترنت</p>'; });
  paintMap();
}
function paintMap(fit) {
  if (view !== 'vMap') return;
  const arr = Object.values(lives).filter(l => l.lat != null).sort((a, b) => (fresh(b) - fresh(a)) || (b.atMs - a.atMs));
  const onCount = arr.filter(fresh).length;
  $('mpCount').textContent = ar(onCount) + ' يشارك الآن';
  $('mpList').innerHTML = arr.length ? `<div class="lvrow lvth"><span>الموظف</span><span>الحالة</span><span>المكان</span><span>آخر تحديث</span></div>` + arr.map(l => {
    const e = empById(l.id), st = motion(l);
    return `<button class="lvrow" data-focus="${l.id}"><span class="who"><i class="av ${fresh(l) ? 'liveav' : ''}">${esc(initials(l.name))}</i><span><b>${esc(l.name)}</b><small>${esc((e && e.dept) || l.dept || '')}</small></span></span><span><em class="chip ${st.cls}">${st.txt}</em></span><span class="pl">${placeName(l)}</span><span class="muted">${ago(l.atMs)}</span></button>`;
  }).join('') : `<div class="empty">${ic('live', 28, 1.4)}<b>لا يوجد موظف يشارك موقعه</b><span>لما الموظف يفتح «موقعي المباشر» ويدوس «ابدأ مشاركة موقعي»، هيظهر هنا وعلى الخريطة.</span></div>`;
  if (liveSheetId && !$('sheet').hidden) paintLiveSheet();
  if (!ownMap || !window.L) return;
  const L = window.L, pts = [];
  arr.forEach(l => {
    const on = fresh(l), ll = [l.lat, l.lng]; pts.push(ll);
    if (!ownMarks[l.id]) { ownMarks[l.id] = L.marker(ll, { icon: pinIcon(initials(l.name), on) }).addTo(ownMap).bindPopup(''); if (ownMarks[l.id].on) ownMarks[l.id].on('click', () => markerClick(l.id)); }
    else { ownMarks[l.id].setLatLng(ll); ownMarks[l.id].setIcon(pinIcon(initials(l.name), on)); }
    ownMarks[l.id].setPopupContent(`<b>${esc(l.name)}</b><br>${motion(l).txt} · ${placeName(l)}<br>${ago(l.atMs)}<br><a target="_blank" rel="noopener" href="${dirUrl(l)}">الاتجاهات للوصول إليه</a>`);
    const path = Array.isArray(l.path) ? l.path.map(p => [p.lat, p.lng]) : [];
    if (!ownLines[l.id]) ownLines[l.id] = L.polyline(path, { color: on ? '#e3262b' : '#8a8d91', weight: 4, opacity: .55 }).addTo(ownMap);
    else { ownLines[l.id].setLatLngs(path); ownLines[l.id].setStyle({ color: on ? '#e3262b' : '#8a8d91' }); }
  });
  if (fit && pts.length) ownMap.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
}
function markerClick(id) { openLiveSheet(id); }

/* ========== chat ========== */
let chatFirst = true;
let remoteRead = 0, readSaved = 0;
const lastRead = () => { let l = 0; try { l = +(localStorage.getItem('sh-chat-read-' + (me && me.uid)) || 0); } catch (e) { } return Math.max(l, remoteRead); };
// آخر قراية للشات محفوظة أونلاين، عشان لما تخرج وتدخل أو تفتح من جهاز تاني الإشعار مايرجعش
function onReads(s) { const v = s.exists() ? +(s.data().chat || 0) : 0; if (v > remoteRead) { remoteRead = v; readSaved = Math.max(readSaved, v); if (!$('tabbar').hidden) paintTabs(); setBadge(); } }
function clearChatNotifs() { try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications ? r.getNotifications({ tag: 'chat' }) : []).then(ns => ns.forEach(n => n.close())).catch(() => { }); } catch (e) { } }
const unread = () => { const lr = lastRead(); return msgs.filter(m => m.atMs > lr && m.uid !== (me && me.uid)).length; };
function markChatRead() {
  if (!me) return;
  const t = Math.max(Date.now(), msgs.length ? Math.max(...msgs.map(m => m.atMs)) : 0, lastRead());
  try { localStorage.setItem('sh-chat-read-' + me.uid, String(t)); } catch (e) { }
  if (t - readSaved > 3000) { readSaved = t; remoteRead = Math.max(remoteRead, t); setDoc(doc(db, 'reads', me.uid), { chat: t }, { merge: true }).catch(() => { readSaved = 0; }); }
  clearChatNotifs(); setBadge(); if (!$('tabbar').hidden) paintTabs();
}
function onChat(snap) {
  const added = [];
  snap.docChanges().forEach(c => { if (c.type === 'added' && !c.doc.metadata.hasPendingWrites) added.push(c.doc); });
  msgs = snap.docs.map(d => { const x = d.data(); return { id: d.id, ...x, atMs: x.at && x.at.toMillis ? x.at.toMillis() : Date.now() }; }).sort((a, b) => a.atMs - b.atMs);
  if (!chatFirst) {
    added.forEach(d => {
      const m = d.data(); if (m.uid === me.uid) return;
      const who = m.name + (m.dept ? ' · ' + m.dept : ''), txt = (m.kind === 'img' ? '📷 صورة' + (m.text ? ' · ' : '') : m.kind === 'voice' ? '🎤 رسالة صوتية ' + fmtDur(m.dur || 0) : m.kind === 'file' ? '📎 ' + (m.fname || 'ملف') + (m.text ? ' · ' : '') : '') + String(m.text || '').slice(0, 140);
      if (view !== 'vChat') toast('chat', who, txt, 'الشات الداخلي');
      if (view !== 'vChat' || document.hidden) sysNotify('💬 ' + who, txt, 'chat', 'vChat');
      else vibrate(20);
    });
  }
  chatFirst = false;
  if (view === 'vChat') { paintChat(); if (!document.hidden) markChatRead(); }
  if (!$('tabbar').hidden) paintTabs();
  setBadge();
}
function renderChat() {
  show('vChat');
  const v = $('vChat');
  v.innerHTML = `<section class="card chatcard reveal">
    <h2>الشات الداخلي <span class="muted small" style="font-family:var(--f-body)">لكل موظفي الشركة</span></h2>
    ${chatNotifCta()}
    <div class="msgs" id="msgs"></div>
    <form class="composer" id="chatForm">
     <button class="cbtn" id="chatImg" type="button" aria-label="إرفاق صورة أو ملف">${ic('clip', 21)}</button>
     <textarea id="chatIn" rows="1" maxlength="1000" placeholder="اكتب رسالة…" aria-label="رسالة"></textarea>
     <button class="btn primary" id="chatSend" type="submit" aria-label="إرسال" hidden>${ic('send', 18)}</button>
     <button class="btn primary" id="chatMic" type="button" aria-label="تسجيل رسالة صوتية">${ic('mic', 20)}</button>
     <div class="recbar" id="recBar" hidden><button type="button" class="cbtn" id="recCancel" aria-label="إلغاء التسجيل">${ic('trash', 19)}</button><span class="recdot"></span><b class="num" id="recT">0:00</b><span class="muted small">جارٍ التسجيل…</span><button type="button" class="btn primary" id="recSend" aria-label="إرسال الرسالة الصوتية">${ic('send', 18)}</button></div>
    <div class="attmenu" id="attMenu" hidden><button type="button" data-att="img">${ic('image', 18)} صورة</button><button type="button" data-att="file">${ic('file', 18)} ملف <small>لحد ${FILE_MAX_TXT}</small></button></div>
    </form>
    <input type="file" id="chatFile" accept="image/*" hidden>
    <input type="file" id="chatDoc" hidden>
  </section>`;
  const ta = $('chatIn');
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; const has = !!ta.value.trim(); $('chatSend').hidden = !has; $('chatMic').hidden = has; };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); $('chatForm').requestSubmit(); } };
  $('chatForm').onsubmit = async e => {
    e.preventDefault(); const text = ta.value.trim(); if (!text) return;
    ta.value = ''; ta.oninput();
    try { await addDoc(collection(db, 'chat'), { uid: me.uid, name: isOwner ? 'الإدارة' : isViewer ? viewerName : meEmp.name, dept: isOwner ? '' : isViewer ? 'متابعة' : (meEmp.dept || ''), owner: isOwner, text, at: serverTimestamp() }); }
    catch (err) { toast('bad', 'لم تُرسل الرسالة', 'تأكد من الإنترنت وحاول مرة أخرى', 'الشات'); ta.value = text; }
  };
  $('msgs').onclick = async e => {
    const pl = e.target.closest('[data-voice]'); if (pl) { playVoice(pl); return; }
    const im = e.target.closest('[data-media] img'); if (im && im.dataset.full) { openViewer(im.src); return; }
    const fl = e.target.closest('[data-file]'); if (fl) { openFile(fl); return; }
    const b = e.target.closest('[data-del]'); if (!b || !isOwner) return;
    const m = msgs.find(x => x.id === b.dataset.del);
    try { await deleteDoc(doc(db, 'chat', b.dataset.del)); if (m && m.media) deleteDoc(doc(db, 'media', m.media)).catch(() => { }); } catch (x) { toast('bad', 'تعذّر الحذف', '', 'الشات'); }
  };
  // صورة
  const am = $('attMenu');
  $('chatImg').onclick = e => { e.stopPropagation(); am.hidden = !am.hidden; };
  document.addEventListener('click', ev => { if (am && !am.hidden && !am.contains(ev.target)) am.hidden = true; });
  am.onclick = e => { const b = e.target.closest('[data-att]'); if (!b) return; am.hidden = true; const inp = b.dataset.att === 'img' ? $('chatFile') : $('chatDoc'); inp.value = ''; inp.click(); };
  $('chatDoc').onchange = async () => {
    const f = $('chatDoc').files && $('chatDoc').files[0]; if (!f) return;
    if (f.type.startsWith('image/')) { $('chatFile').files = $('chatDoc').files; $('chatFile').onchange(); return; }
    if (f.size > FILE_MAX) { toast('bad', 'الملف كبير', `الحد ${FILE_MAX_TXT} · الملف ده ${fmtSize(f.size)}. ابعته واتساب أو إيميل`, 'الشات'); return; }
    const cap = ta.value.trim(); ta.value = ''; ta.oninput();
    toast('info', 'جارٍ إرسال الملف…', f.name, 'الشات');
    try { const data = await readURL(f); await sendMedia('file', data, { text: cap, fname: f.name.slice(0, 120), size: f.size }); }
    catch (x) { toast('bad', 'لم يُرسل الملف', errWhy(x), 'الشات'); }
  };
  $('chatFile').onchange = async () => {
    const f = $('chatFile').files && $('chatFile').files[0]; if (!f) return;
    const cap = ta.value.trim(); ta.value = ''; ta.oninput();
    toast('info', 'جارٍ إرسال الصورة…', '', 'الشات');
    try { const im = await packImage(f); await sendMedia('img', im.data, { w: im.w, h: im.h, thumb: im.thumb, text: cap }); }
    catch (x) { toast('bad', 'لم تُرسل الصورة', x && x.message === 'big' ? 'الصورة كبيرة جداً' : errWhy(x), 'الشات'); }
  };
  // رسالة صوتية
  $('chatMic').onclick = startRec;
  $('recCancel').onclick = () => stopRec(false);
  $('recSend').onclick = () => stopRec(true);
  const cb = $('chatNotif'); if (cb) cb.onclick = async () => { try { await Notification.requestPermission(); } catch (e) { } renderChat(); };
  paintChat(true); markChatRead(); paintTabs();
}
function chatNotifCta() {
  const p = ('Notification' in window) ? Notification.permission : 'unsupported';
  if (p === 'default') return `<button class="btn ghost" id="chatNotif" style="margin-bottom:10px">${ic('bell', 16)} فعّل الإشعارات عشان توصلك الرسايل على الجوال</button>`;
  if (p === 'denied') return `<p class="muted small" style="margin:0 0 8px">إشعارات الجوال مقفولة، فعّلها من إعدادات المتصفح عشان توصلك الرسايل</p>`;
  return '';
}
function paintChat(jump) {
  const box = $('msgs'); if (!box) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  let lastDay = '', h = '';
  msgs.forEach(m => {
    const dk = keyOfIdx(dayIdx(m.atMs)); if (dk !== lastDay) { lastDay = dk; h += `<div class="dsep"><span>${isToday(dk) ? 'اليوم' : dFmt.format(fromKey(dk))}</span></div>`; }
    const mine = m.uid === me.uid;
    h += `<div class="msg ${mine ? 'mine' : ''} ${m.owner ? 'boss' : ''}">${mine ? '' : `<div class="who">${esc(m.name)}${m.dept ? ' · ' + esc(m.dept) : ''}${m.owner ? ' <i>المالك</i>' : ''}</div>`}${mediaHTML(m)}${m.text ? `<div class="txt">${esc(m.text).replace(/\n/g, '<br>')}</div>` : ''}<div class="at">${clockFmt.format(new Date(m.atMs))}${isOwner ? ` <button data-del="${m.id}" aria-label="حذف الرسالة">${ic('trash', 12)}</button>` : ''}</div></div>`;
  });
  box.innerHTML = h || `<div class="empty">${ic('chat', 28, 1.4)}<b>ابدأ المحادثة</b><span>الرسائل هنا يشوفها كل موظفي الشركة والمالك، وتقدر تبعت صور ورسايل صوتية.</span></div>`;
  if (jump || atBottom) box.scrollTop = box.scrollHeight;
  hydrateImages(box);
}

/* ----- الصور والرسايل الصوتية: محفوظة في media/{id} وتتحمّل عند العرض بس ----- */
const fmtDur = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const mediaCache = {};
async function loadMedia(id) {
  if (mediaCache[id]) return mediaCache[id];
  const p = getDoc(doc(db, 'media', id)).then(s => s.exists() ? s.data().data : null);
  mediaCache[id] = p; const v = await p; if (!v) delete mediaCache[id]; return v;
}
function mediaHTML(m) {
  if (m.kind === 'img') return `<div class="mimg" data-media="${esc(m.media)}" style="aspect-ratio:${m.w || 4}/${m.h || 3}"><img alt="صورة" src="${m.thumb || ''}"></div>`;
  if (m.kind === 'file') return `<button type="button" class="mfile" data-file="${esc(m.media)}" data-name="${esc(m.fname || 'ملف')}" aria-label="فتح الملف ${esc(m.fname || '')}"><span class="fi">${ic('file', 20)}<em>${esc(extOf(m.fname))}</em></span><span class="fn"><b>${esc(m.fname || 'ملف')}</b><small>${fmtSize(m.size || 0)}</small></span><span class="dl">${ic('download', 18)}</span></button>`;
  if (m.kind === 'voice') return `<button type="button" class="mvoice" data-voice="${esc(m.media)}" data-dur="${m.dur || 0}" aria-label="تشغيل الرسالة الصوتية"><span class="pp">${ic('play', 16)}</span><span class="wave"><i style="width:0%"></i></span><span class="num dur">${fmtDur(m.dur || 0)}</span></button>`;
  return '';
}
const FILE_MAX = 700 * 1024, FILE_MAX_TXT = '٧٠٠ كيلو';
const fmtSize = b => b < 1024 ? ar(b) + ' بايت' : b < 1048576 ? ar(Math.round(b / 1024)) + ' كيلو' : ar((b / 1048576).toFixed(1)) + ' ميجا';
const extOf = n => { const m = /\.([a-z0-9]{1,5})$/i.exec(n || ''); return m ? m[1].toUpperCase() : 'FILE'; };
async function openFile(btn) {
  btn.classList.add('loading');
  const src = await loadMedia(btn.dataset.file).catch(() => null); btn.classList.remove('loading');
  if (!src) { toast('bad', 'تعذّر فتح الملف', 'ربما اتحذف أو الإنترنت ضعيف', 'الشات'); return; }
  try {
    const blob = await (await fetch(src)).blob(), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = btn.dataset.name; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { toast('bad', 'تعذّر فتح الملف', '', 'الشات'); }
}
const errWhy = e => { const c = (e && (e.code || e.name || e.message)) || ''; if (String(c).includes('permission')) return 'قواعد الحماية في Firebase محتاجة تتحدّث (permission-denied)'; if (String(c).includes('unavailable') || String(c).includes('network')) return 'تأكد من الإنترنت وحاول مرة أخرى'; return 'حاول مرة أخرى' + (c ? ' · ' + c : ''); };
const voiceReady = {};
function hydrateVoices(box) {
  box.querySelectorAll('[data-voice]').forEach(b => {
    const id = b.dataset.voice; if (voiceReady[id]) return;
    loadMedia(id).then(src => { if (src) voiceReady[id] = src; else b.classList.add('gone'); }).catch(e => { b.classList.add('gone'); b.dataset.err = errWhy(e); });
  });
}
function hydrateImages(box) {
  hydrateVoices(box);
  box.querySelectorAll('[data-media]').forEach(el => {
    const img = el.querySelector('img'); if (!img || img.dataset.full) return;
    loadMedia(el.dataset.media).then(src => { if (src) { img.src = src; img.dataset.full = '1'; el.classList.add('ok'); } else el.classList.add('gone'); }).catch(() => { });
  });
}
let curAudio = null, curBtn = null;
async function playVoice(btn) {
  if (curBtn === btn && curAudio) { if (curAudio.paused) curAudio.play(); else curAudio.pause(); return; }
  if (curAudio) { curAudio.pause(); curBtn && curBtn.classList.remove('playing'); }
  curBtn = btn;
  let src = voiceReady[btn.dataset.voice];
  if (!src) { btn.classList.add('loading'); src = await loadMedia(btn.dataset.voice).catch(e => { btn.dataset.err = errWhy(e); return null; }); btn.classList.remove('loading'); if (src) voiceReady[btn.dataset.voice] = src; }
  if (!src) { toast('bad', 'تعذّر تشغيل الرسالة', btn.dataset.err || 'ربما اتحذفت أو الإنترنت ضعيف', 'الشات'); return; }
  const a = new Audio(); a.preload = 'auto'; a.src = src; curAudio = a;
  const bar = btn.querySelector('.wave i'), d = btn.querySelector('.dur'), pp = btn.querySelector('.pp'), total = +btn.dataset.dur || 0;
  a.ontimeupdate = () => { const T = isFinite(a.duration) && a.duration > 0 ? a.duration : total || 1; bar.style.width = Math.min(100, a.currentTime / T * 100) + '%'; d.textContent = fmtDur(a.currentTime); };
  a.onplay = () => { btn.classList.add('playing'); pp.innerHTML = ic('pause', 16); };
  a.onpause = () => { btn.classList.remove('playing'); pp.innerHTML = ic('play', 16); };
  a.onended = () => { bar.style.width = '0%'; d.textContent = fmtDur(total); curAudio = null; curBtn = null; };
  a.play().catch(e => toast('bad', 'تعذّر تشغيل الصوت', (e && e.name === 'NotSupportedError') ? 'الجهاز ده مش بيدعم صيغة التسجيل دي' : 'اضغط تشغيل مرة تانية', 'الشات'));
}
function openViewer(src) {
  const v = document.createElement('div'); v.className = 'viewer';
  v.innerHTML = `<img src="${src}" alt="صورة"><button class="iconbtn" aria-label="إغلاق">${ic('x', 20)}</button>`;
  v.onclick = () => { v.classList.remove('on'); setTimeout(() => v.remove(), 300); };
  document.body.appendChild(v); requestAnimationFrame(() => v.classList.add('on'));
}
const readURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
async function packImage(file) {
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
  const draw = (max, q) => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return { data: c.toDataURL('image/jpeg', q), w: c.width, h: c.height }; };
  let out = null;
  for (const [mx, q] of [[1600, .8], [1400, .72], [1200, .65], [1000, .6], [800, .55]]) { out = draw(mx, q); if (out.data.length < 700000) break; }
  const thumb = draw(48, .5).data; URL.revokeObjectURL(url);
  if (out.data.length > 900000) throw new Error('big');
  return { ...out, thumb };
}
async function sendMedia(kind, data, extra) {
  const ref = await addDoc(collection(db, 'media'), { uid: me.uid, kind, data, at: serverTimestamp() });
  mediaCache[ref.id] = Promise.resolve(data);
  await addDoc(collection(db, 'chat'), { uid: me.uid, name: isOwner ? 'الإدارة' : isViewer ? viewerName : meEmp.name, dept: isOwner ? '' : isViewer ? 'متابعة' : (meEmp.dept || ''), owner: isOwner, kind, media: ref.id, text: extra.text || '', w: extra.w || null, h: extra.h || null, thumb: extra.thumb || null, dur: extra.dur || null, fname: extra.fname || null, size: extra.size || null, at: serverTimestamp() });
}
const REC_MAX = 120;
let rec = null;
async function startRec() {
  if (rec) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('bad', 'التسجيل غير مدعوم على هذا الجهاز', '', 'الشات'); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { toast('bad', 'اسمح للتطبيق باستخدام المايك', 'من إعدادات المتصفح أو الجوال', 'الشات'); return; }
  const type = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
  rec = { mr, stream, chunks: [], t0: Date.now(), send: false, timer: null };
  mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
  mr.onstop = async () => {
    const r = rec; rec = null; clearInterval(r.timer); r.stream.getTracks().forEach(t => t.stop());
    $('recBar') && ($('recBar').hidden = true); const ta = $('chatIn'); if (ta) { ta.hidden = false; ta.oninput(); } if ($('chatImg')) $('chatImg').hidden = false;
    const dur = (Date.now() - r.t0) / 1000;
    if (!r.send) return;
    if (dur < 1) { toast('warn', 'الرسالة قصيرة جداً', 'اضغط على المايك وكلّم، وبعدين دوس إرسال', 'الشات'); return; }
    try {
      const blob = new Blob(r.chunks, { type: r.mr.mimeType || type || 'audio/webm' });
      const data = await readURL(blob);
      if (data.length > 950000) { toast('bad', 'الرسالة الصوتية طويلة جداً', 'الحد الأقصى دقيقتين', 'الشات'); return; }
      await sendMedia('voice', data, { dur: Math.round(dur) });
    } catch (e) { toast('bad', 'لم تُرسل الرسالة الصوتية', errWhy(e), 'الشات'); }
  };
  mr.start(1000); vibrate(30);
  $('chatIn').hidden = true; $('chatMic').hidden = true; $('chatSend').hidden = true; $('chatImg').hidden = true; $('recBar').hidden = false;
  const tick = () => { const s = (Date.now() - rec.t0) / 1000; const el = $('recT'); if (el) el.textContent = fmtDur(s); if (s >= REC_MAX) stopRec(true); };
  tick(); rec.timer = setInterval(() => rec && tick(), 250);
}
function stopRec(send) { if (!rec) return; rec.send = send; vibrate(send ? 30 : [20, 30, 20]); try { rec.mr.stop(); } catch (e) { } }

/* ========== owner ========== */
function ownerEvents() {
  const key = todayKey(), n = nowMin(), list = [], P = todayPlan(), G = grace();
  emps.filter(e => e.active && inDept(e)).forEach(e => {
    const r = getRec(e, key);
    if (r) ALL.forEach(f => { if (r[f] != null) { const late = (f === 'in' && !P.off && r.in > P.start + G) || (f === 'in2' && P.two && r.in2 > P.b2 + G); list.push({ emp: e.id, f, t: r[f], method: r.m[f], late }); } });
    if (!P.off && !r && n > P.start + G && key >= e.start) list.push({ emp: e.id, miss: 'in', t: P.start + G });
    if (P.two && r && r.out1 != null && r.in2 == null && n > P.b2 + G) list.push({ emp: e.id, miss: 'in2', t: P.b2 + G });
  });
  return list.sort((a, b) => b.t - a.t);
}
function evHTML(x, isNew) {
  const e = empById(x.emp); if (!e) return '';
  if (x.miss) return `<div class="ev${isNew ? ' new' : ''}"><div class="ico i-bad">${ic('alert', 16)}</div><div class="tx">${esc(e.name)} ${x.miss === 'in' ? 'لم يسجّل حضور' : 'لم يعد من البريك'}<small>${tm(x.t)}${e.dept ? ' · ' + esc(e.dept) : ''}</small></div></div>`;
  const kind = x.late ? 'warn' : x.f === 'out1' || x.f === 'in2' ? 'info' : x.f === 'out' ? 'gold' : 'ok';
  const icon = x.f === 'in' ? 'login' : x.f === 'out' ? 'logout' : 'coffee';
  const m = x.method && MI[x.method] ? MI[x.method][1] : '';
  const P0 = todayPlan(), early = x.f === 'in' && !P0.off && x.t < P0.start;
  return `<div class="ev${isNew ? ' new' : ''}"><div class="ico i-${kind}">${ic(icon, 16)}</div><div class="tx">${esc(e.name)} · ${FL[x.f]}${x.late ? ' متأخر' : early ? ' بدري' : ''}<small>${tm(x.t)}${m ? ' · بصمة ' + m : ''}${e.dept ? ' · ' + esc(e.dept) : ''}</small></div></div>`;
}
function renderFeed(isNew) {
  const el = $('feed'); if (!el) return;
  const l = ownerEvents();
  el.innerHTML = l.length ? l.map((x, i) => evHTML(x, isNew && i === 0)).join('') : '<p class="muted">لا توجد إشعارات اليوم بعد.</p>';
}
const inDept = e => deptFilter === 'all' || e.dept === deptFilter;
function renderOwner() {
  show('vOwn');
  const v = $('vOwn'); const key = todayKey(); const P = todayPlan();
  const list = emps.filter(inDept).sort((a, b) => (b.active - a.active) || String(a.dept).localeCompare(String(b.dept), 'ar') || String(a.name).localeCompare(String(b.name), 'ar'));
  const act = list.filter(e => e.active); const ls = act.map(liveStatus);
  const cnt = s => ls.filter(x => s.includes(x)).length;
  const [ma, mb] = periodRange('month');
  const notif = ('Notification' in window) ? Notification.permission : 'unsupported';
  const dCount = d => emps.filter(e => e.dept === d && e.active).length;
  const liveCount = Object.values(lives).filter(fresh).length;
  v.innerHTML = `
  <div class="hello reveal"><b>${isViewer ? 'متابعة الحضور والانصراف' : 'أهلاً بك في لوحة التحكم'}</b><span>${isViewer ? 'حساب مشاهدة فقط · ' : ''}${esc(COMPANY)}</span></div>
  <div class="okpis reveal">
   <div class="okpi g"><div class="l">${ic('login', 14)}حاضر الآن</div><b class="num" data-c="${cnt(['present', 'late'])}">٠</b></div>
   <div class="okpi r"><div class="l">${ic('alert', 14)}لم يسجّل</div><b class="num" data-c="${cnt(['missing'])}">٠</b></div>
   <div class="okpi a"><div class="l">${ic('clock', 14)}متأخر</div><b class="num" data-c="${cnt(['late'])}">٠</b></div>
   <div class="okpi e"><div class="l">${ic('check', 14)}حضر بدري</div><b class="num" data-c="${act.filter(e => earlyBy(getRec(e, key), P) > 0).length}">٠</b></div>
   <div class="okpi i"><div class="l">${ic('live', 14)}موقع مباشر</div><b class="num" data-c="${liveCount}">٠</b></div>
  </div>
  <div class="card reveal" style="margin-bottom:16px;animation-delay:.06s"><h2>دوام اليوم <span class="muted small" style="font-family:var(--f-body)">${DAYS[fromKey(key).getDay()]} · فترة السماح ${ar(grace())} د</span></h2>${bandHTML(P)}</div>
  <div class="depts reveal" role="group" aria-label="الأقسام">
   <button data-dept="all" aria-pressed="${deptFilter === 'all'}">الكل <i>${ar(emps.filter(e => e.active).length)}</i></button>
   ${DEPTS.map(d => `<button data-dept="${d}" aria-pressed="${deptFilter === d}">${d} <i>${ar(dCount(d))}</i></button>`).join('')}
  </div>
  <div class="grid two">
   <section class="card reveal" style="animation-delay:.1s">
    <h2>الموظفون <span class="muted small" style="font-family:var(--f-body)">${deptFilter === 'all' ? 'كل الأقسام' : 'قسم ' + deptFilter} · التزام الشهر</span></h2>
    <div id="empList">${list.length ? list.map(e => {
      const s = liveStatus(e), r = getRec(e, key), o = stats(e, ma, mb);
      const eb = earlyBy(r, P), lb = r && r.in != null && !P.off && r.in > P.start + grace() ? r.in - P.start : 0;
      const line = (!e.active ? 'الحساب موقوف' : r ? ALL.filter(f => r[f] != null).map(f => FL[f] + ' ' + tm(r[f])).join(' · ') : (s === 'off' ? 'إجازة' : 'لا توجد بصمة اليوم')) + (eb ? ` · <em class="early">بدري ${dur(eb)}</em>` : lb ? ` · <em class="lateby">متأخر ${dur(lb)}</em>` : '');
      const av = r && ALL.map(f => r.ph[f]).filter(Boolean).pop(); const lv = fresh(lives[e.id]);
      return `<button class="emp" data-emp="${e.id}"><div class="av ${lv ? 'liveav' : ''}">${av ? `<img src="${av}" alt="">` : esc(initials(e.name))}</div><div class="info"><b>${esc(e.name)} <span class="muted small">${esc(e.dept || 'بدون قسم')}</span></b><span>${line}</span></div><span class="chip c-${s}">${STL[s]}</span><div class="mini"><small class="num">${o.days ? ar(o.pct) + '٪' : '—'}</small><div class="t"><div data-w="${o.pct}" style="background:${o.pct >= 90 ? 'var(--ok)' : o.pct >= 75 ? 'var(--warn)' : 'var(--bad)'}"></div></div></div></button>`;
    }).join('') : `<div class="empty">${ic('userplus', 28, 1.4)}<b>${emps.length ? 'لا يوجد موظفون في هذا القسم' : isViewer ? 'لا يوجد موظفون بعد' : 'أضف أول موظف'}</b><span>اكتب الاسم واسم المستخدم والقسم وكلمة سر مؤقتة، وابعتها للموظف مع رابط التطبيق.</span></div>`}</div>
    ${isViewer ? '' : `<form class="form addform" id="addForm" novalidate>
     <div class="fl"><label for="nName">اسم الموظف</label><input id="nName" autocomplete="off" placeholder="أحمد محمد"></div>
     <div class="fl"><label for="nNum">اسم المستخدم (حروف وأرقام)</label><input id="nNum" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ahmed1 أو أحمد1"></div>
     <div class="fl"><label for="nDept">القسم</label><select id="nDept"><option value="">اختر القسم</option>${DEPTS.map(d => `<option ${deptFilter === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
     <div class="fl"><label for="nPass">كلمة سر مؤقتة</label><input id="nPass" autocomplete="new-password" placeholder="٦ أرقام على الأقل"></div>
     <button class="btn primary" type="submit" id="addBtn">${ic('userplus', 16)} إضافة موظف</button>
     <div class="err" id="addErr"></div>
    </form>`}
   </section>
   <section class="card reveal" style="animation-delay:.16s">
    <h2>الإشعارات <span style="color:var(--gold)">${ic('bell', 18)}</span></h2>
    <div class="feed" id="feed"></div>
    <div class="row-btns">${notif === 'default' ? `<button class="btn ghost" id="notifBtn">${ic('bell', 14)} تفعيل إشعارات الجوال</button>` : notif === 'granted' ? `<span class="muted small">${ic('check', 14)} إشعارات الجوال مفعّلة</span>` : notif === 'denied' ? `<span class="muted small">الإشعارات مرفوضة، فعّلها من إعدادات المتصفح</span>` : ''}</div>
   </section>
  </div>`;
  v.querySelectorAll('[data-c]').forEach(b => countTo(b, +b.dataset.c));
  requestAnimationFrame(() => requestAnimationFrame(() => v.querySelectorAll('[data-w]').forEach(d => d.style.transform = `scaleX(${d.dataset.w / 100})`)));
  renderFeed(false); updateBands();
  $('empList').onclick = e => { const b = e.target.closest('[data-emp]'); if (b) openSheet(b.dataset.emp); };
  v.querySelector('.depts').onclick = e => { const b = e.target.closest('[data-dept]'); if (!b) return; deptFilter = b.dataset.dept; renderOwner(); };
  const nb = $('notifBtn'); if (nb) nb.onclick = async () => { try { await Notification.requestPermission(); } catch (e) { } renderOwner(); };
  if (!isViewer) bindAdd();
}
function bindAdd() {
  const n = $('nName'), u = $('nNum'), dp = $('nDept'), p = $('nPass'), er = $('addErr'), btn = $('addBtn');
  [n, u, p].forEach(x => x.oninput = () => er.textContent = ''); dp.onchange = () => er.textContent = '';
  $('addForm').onsubmit = async e => {
    e.preventDefault();
    const name = n.value.trim(), num = toEn(u.value.trim().replace(/\s+/g, ' ')), dept = dp.value, pass = p.value;
    if (name.length < 2) { er.textContent = 'اكتب اسم الموظف'; n.focus(); return; }
    if (!USER_OK.test(normUser(num))) { er.textContent = 'اسم المستخدم من ٢ لـ ٢٤ حرف: حروف عربي أو إنجليزي وأرقام فقط'; u.focus(); return; }
    if (emps.some(x => normUser(x.num) === normUser(num))) { er.textContent = 'اسم المستخدم مستخدم بالفعل'; u.focus(); return; }
    if (!dept) { er.textContent = 'اختر قسم الموظف'; dp.focus(); return; }
    if (pass.length < 6) { er.textContent = 'كلمة السر المؤقتة ٦ حروف أو أرقام على الأقل'; p.focus(); return; }
    btn.disabled = true; btn.textContent = 'جارٍ الإضافة…';
    try {
      const sec = getSecondary();
      const cred = await createUserWithEmailAndPassword(sec.auth, toEmail(num), pass);
      await setDoc(doc(db, 'employees', cred.user.uid), { name, num, dept, active: true, mustChange: true, cred: null, createdAt: serverTimestamp(), start: todayKey(), geo: { mode: 'sites' } });
      await signOut(sec.auth);
      toast('ok', 'تمت إضافة ' + name, 'قسم ' + dept + ' · يدخل باسم المستخدم «' + num + '» وكلمة السر المؤقتة', 'الإدارة');
      n.value = u.value = p.value = '';
    } catch (err) { er.textContent = authMsg(err); }
    finally { btn.disabled = false; btn.innerHTML = `${ic('userplus', 16)} إضافة موظف`; }
  };
}
let secondary = null;
function getSecondary() { if (!secondary) { const a = initializeApp(firebaseConfig, 'secondary'); secondary = { app: a, auth: getAuth(a) }; } return secondary; }
function checkOwnerAlerts() {
  if (!canSee()) return;
  const key = todayKey(), P = todayPlan(); if (P.off) return;
  const n = nowMin(), G = grace();
  emps.filter(e => e.active && e.start <= key).forEach(e => {
    const r = getRec(e, key);
    const k1 = key + e.id + 'miss-in', k2 = key + e.id + 'miss-back';
    if (!r && n >= P.start + G && n < P.W.in[1] && !notified.has(k1)) { notified.add(k1); alertBoth('bad', e.name + ' لم يسجّل حضور', (e.dept ? 'قسم ' + e.dept + ' · ' : '') + 'تجاوز ' + tm(P.start + G), 'إشعار للمالك'); }
    if (P.two && r && r.out1 != null && r.in2 == null && n >= P.b2 + G && n < P.W.in2[1] && !notified.has(k2)) { notified.add(k2); alertBoth('warn', e.name + ' لم يعد من البريك', 'تجاوز ' + tm(P.b2 + G), 'إشعار للمالك'); }
  });
}

/* ----- owner: employee sheet ----- */
let sheetEmp = null;
function openSheet(id) {
  const emp = empById(id); if (!emp) return; sheetEmp = id; liveSheetId = null;
  if (isViewer) {
    const sh = $('sheet'), sc = $('scrim'), inner = $('sheetInner'), r = getRec(emp, todayKey()), av = r && ALL.map(f => r.ph[f]).filter(Boolean).pop();
    inner.innerHTML = `<div class="sh-head"><div class="av">${av ? `<img src="${av}" alt="">` : esc(initials(emp.name))}</div><b>${esc(emp.name)} <span class="muted small">${esc(emp.dept || '')}</span></b><button class="navb" id="shClose" aria-label="إغلاق">${ic('x', 16)}</button></div><div class="card" style="padding:16px"><div id="shProf"></div></div>`;
    sh.hidden = false; sc.hidden = false; requestAnimationFrame(() => { sh.classList.add('on'); sc.classList.add('on'); });
    mountProfile($('shProf'), emp, true); $('shClose').onclick = closeSheet; sc.onclick = closeSheet; return;
  }
  const sh = $('sheet'), sc = $('scrim'), inner = $('sheetInner');
  const r = getRec(emp, todayKey()); const av = r && ALL.map(f => r.ph[f]).filter(Boolean).pop();
  const g = emp.geo || { mode: 'sites' }, ids = Array.isArray(g.ids) ? g.ids : sites().map(s => s.id);
  const lv = lives[emp.id];
  inner.innerHTML = `<div class="sh-head"><div class="av">${av ? `<img src="${av}" alt="">` : esc(initials(emp.name))}</div><b>${esc(emp.name)} <span class="muted small">${esc(emp.num)}</span></b>
    <button class="navb" id="shClose" aria-label="إغلاق">${ic('x', 16)}</button></div>
    <div class="shgrid">
     <div class="fl"><label for="shDept">القسم</label><select id="shDept">${DEPTS.map(d => `<option ${emp.dept === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
     ${lv && lv.lat != null ? `<div class="fl"><label>الموقع المباشر</label><button class="btn ghost" id="shLive" type="button">${ic('map', 14)} ${fresh(lv) ? 'مباشر الآن' : 'آخر مكان'} · ${ago(lv.atMs)}</button></div>` : ''}
    </div>
    <div class="card geobox" style="padding:14px;margin:12px 0">
     <b class="gt">${ic('pin', 16)} صلاحية مكان تسجيل الحضور</b>
     <label class="radio"><input type="radio" name="gm" value="sites" ${g.mode !== 'any' ? 'checked' : ''}><span>من مواقع محددة فقط</span></label>
     <div class="sitechecks" id="shSites" ${g.mode === 'any' ? 'hidden' : ''}>${sites().length ? sites().map(s => `<label class="chk"><input type="checkbox" value="${s.id}" ${ids.includes(s.id) ? 'checked' : ''}><span>${esc(s.name)} <small class="muted">${ar(s.r)} م</small></span></label>`).join('') : `<span class="muted small">لا توجد مواقع بعد، أضفها من الإعدادات. لحد ما تضيف، التسجيل مسموح من أي مكان.</span>`}</div>
     <label class="radio"><input type="radio" name="gm" value="any" ${g.mode === 'any' ? 'checked' : ''}><span>من أي مكان</span></label>
     <button class="btn primary" id="shGeoSave" type="button" style="margin-top:10px">حفظ الصلاحية</button>
    </div>
    <div class="row-btns" style="margin:-4px 0 14px">
      <button class="btn ghost" id="shActive">${emp.active ? 'إيقاف الحساب' : 'تفعيل الحساب'}</button>
      ${emp.cred ? `<button class="btn ghost" id="shDev">${ic('device', 14)} إلغاء ربط الجهاز</button>` : `<span class="muted small" style="align-self:center">${ic('device', 13)} لم يربط جهازاً بعد</span>`}
    </div>
    <div class="err" id="shErr"></div>
    <div class="card" style="padding:16px"><div id="shProf"></div></div>`;
  sh.hidden = false; sc.hidden = false;
  requestAnimationFrame(() => { sh.classList.add('on'); sc.classList.add('on'); });
  mountProfile($('shProf'), emp, true);
  $('shClose').onclick = closeSheet; sc.onclick = closeSheet; $('shClose').focus();
  inner.querySelectorAll('input[name="gm"]').forEach(x => x.onchange = () => { $('shSites').hidden = inner.querySelector('input[name="gm"]:checked').value === 'any'; });
  $('shDept').onchange = async e => { try { await updateDoc(doc(db, 'employees', emp.id), { dept: e.target.value }); toast('ok', 'تم نقل ' + emp.name + ' لقسم ' + e.target.value, '', 'الإدارة'); } catch (x) { $('shErr').textContent = 'تعذّر الحفظ'; } };
  $('shGeoSave').onclick = async () => {
    const mode = inner.querySelector('input[name="gm"]:checked').value;
    const sel = [...inner.querySelectorAll('#shSites input:checked')].map(x => x.value);
    if (mode === 'sites' && sites().length && !sel.length) { $('shErr').textContent = 'اختر موقعاً واحداً على الأقل أو اختر «من أي مكان»'; return; }
    try { await updateDoc(doc(db, 'employees', emp.id), { geo: mode === 'any' ? { mode: 'any' } : { mode: 'sites', ids: sel } }); toast('ok', 'تم حفظ صلاحية المكان', mode === 'any' ? emp.name + ' يقدر يسجّل من أي مكان' : emp.name + ' يسجّل من ' + ar(sel.length) + ' موقع', 'الإدارة'); $('shErr').textContent = ''; }
    catch (x) { $('shErr').textContent = 'تعذّر الحفظ'; }
  };
  const sl = $('shLive'); if (sl) sl.onclick = () => { closeSheet(); renderMap(); setTimeout(() => { const l = lives[emp.id]; if (ownMap && l) ownMap.setView([l.lat, l.lng], 17); }, 900); };
  $('shActive').onclick = async () => { try { await updateDoc(doc(db, 'employees', emp.id), { active: !emp.active }); closeSheet(); toast('ok', emp.active ? 'تم إيقاف حساب ' + emp.name : 'تم تفعيل حساب ' + emp.name, '', 'الإدارة'); } catch (e) { $('shErr').textContent = 'تعذّر الحفظ'; } };
  const dv = $('shDev'); if (dv) dv.onclick = async () => { try { await updateDoc(doc(db, 'employees', emp.id), { cred: null }); toast('ok', 'تم إلغاء ربط جهاز ' + emp.name, 'أول بصمة قادمة ستربط جهازه الجديد', 'الإدارة'); closeSheet(); } catch (e) { $('shErr').textContent = 'تعذّر الحفظ'; } };
}
function closeSheet() {
  const sh = $('sheet'), sc = $('scrim'); sheetEmp = null; liveSheetId = null;
  sh.classList.remove('on'); sc.classList.remove('on'); setTimeout(() => { sh.hidden = true; sc.hidden = true; }, 450);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });

/* ----- owner: settings (مواعيد العمل، فترة السماح، المواقع) ----- */
function parseLatLng(s) {
  s = toEn(String(s || '')).replace(/،/g, ',');
  const pats = [/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&](?:q|ll|query|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/];
  for (const p of pats) { const m = p.exec(s); if (m) { const lat = +m[1], lng = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }; } }
  return null;
}
function renderSet() {
  show('vSet');
  const v = $('vSet');
  const row = d => {
    const c = dayCfg(d) || { on: false }; const two = c.s2 != null && c.e2 != null;
    return `<div class="sday ${c.on ? '' : 'isoff'}" data-d="${d}">
      <div class="sdh"><b>${DAYS[d]}</b><label class="switch sm"><input type="checkbox" data-k="on" ${c.on ? 'checked' : ''}><span>يوم عمل</span></label></div>
      <div class="sdb">
       <div class="tp"><label>الفترة الأولى</label><div><input type="time" data-k="s1" value="${c.s1 != null ? hhmm(c.s1) : '09:00'}"><span>إلى</span><input type="time" data-k="e1" value="${c.e1 != null ? hhmm(c.e1) : '13:00'}"></div></div>
       <label class="switch sm"><input type="checkbox" data-k="two" ${two ? 'checked' : ''}><span>فترة ثانية (بعد البريك)</span></label>
       <div class="tp" data-two ${two ? '' : 'hidden'}><label>الفترة الثانية</label><div><input type="time" data-k="s2" value="${two ? hhmm(c.s2) : '16:00'}"><span>إلى</span><input type="time" data-k="e2" value="${two ? hhmm(c.e2) : '20:00'}"></div></div>
      </div></div>`;
  };
  v.innerHTML = `
  <section class="card reveal">
   <h2>فترة السماح</h2>
   <p class="muted small" style="margin:0 0 10px">الدقائق المسموحة بعد بداية الدوام قبل ما يتحسب تأخير. تقدر تغيّرها في أي وقت.</p>
   <form class="form" id="gForm"><div class="fl" style="flex:0 1 180px"><label for="gMin">فترة السماح بالدقائق</label><input id="gMin" inputmode="numeric" value="${grace()}"></div><button class="btn primary" type="submit" style="flex:0 0 auto;align-self:flex-end">حفظ</button><div class="err" id="gErr"></div></form>
  </section>
  <section class="card reveal" style="margin-top:16px;animation-delay:.05s">
   <h2>مواعيد العمل <button class="btn ghost" id="schReset" type="button" style="flex:0 0 auto;padding:6px 12px;font-size:12px">المواعيد الافتراضية</button></h2>
   <div class="sched" id="sched">${DAY_ORDER.map(row).join('')}</div>
   <button class="btn primary" id="schSave" type="button" style="margin-top:14px;width:100%">حفظ مواعيد العمل</button>
   <div class="err" id="schErr"></div>
  </section>
  <section class="card reveal" style="margin-top:16px;animation-delay:.08s">
   <h2>حسابات المتابعة <span class="muted small" style="font-family:var(--f-body)">مشاهدة فقط</span></h2>
   <p class="muted small" style="margin:0 0 10px">حساب يشوف الحضور والانصراف: مين جه بدري ومين اتأخر، والخريطة، والشات، من غير ما يقدر يعدّل أي حاجة.</p>
   <div id="viewerList"><p class="muted small">جارٍ التحميل…</p></div>
   <form class="form addform" id="vwForm" novalidate>
    <div class="fl"><label for="vwName">الاسم</label><input id="vwName" autocomplete="off" placeholder="مدير المكتب"></div>
    <div class="fl"><label for="vwUser">اسم المستخدم</label><input id="vwUser" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="manager1"></div>
    <div class="fl"><label for="vwPass">كلمة السر</label><input id="vwPass" autocomplete="new-password" placeholder="٦ أحرف على الأقل"></div>
    <button class="btn primary" type="submit" id="vwBtn">${ic('userplus', 16)} إضافة حساب متابعة</button>
    <div class="err" id="vwErr"></div>
   </form>
  </section>
  <section class="card reveal" style="margin-top:16px;animation-delay:.1s">
   <h2>مواقع العمل</h2>
   <p class="muted small" style="margin:0 0 10px">الفروع ومواقع المشاريع اللي مسموح التسجيل منها. من صفحة كل موظف تحدد هو يسجّل من أنهي موقع، أو من أي مكان.</p>
   <div id="siteList">${sites().length ? sites().map(s => `<div class="site"><div class="ico i-gold">${ic('pin', 16)}</div><div class="tx"><b>${esc(s.name)}</b><small>نطاق ${ar(s.r)} م · <a class="lnk" target="_blank" rel="noopener" href="https://maps.google.com/?q=${s.lat},${s.lng}">عرض على الخريطة</a></small></div><button class="navb" data-delsite="${s.id}" aria-label="حذف ${esc(s.name)}">${ic('trash', 15)}</button></div>`).join('') : '<p class="muted small">لا توجد مواقع بعد. التسجيل مسموح من أي مكان لحد ما تضيف موقع.</p>'}</div>
   <form class="form addform" id="siteForm" novalidate>
    <div class="fl"><label for="sName">اسم الموقع</label><input id="sName" placeholder="الفرع الأول – العارض"></div>
    <div class="fl" style="flex:0 1 120px;min-width:100px"><label for="sR">النطاق بالمتر</label><input id="sR" inputmode="numeric" value="150"></div>
    <div class="fl" style="flex-basis:100%"><label for="sLL">رابط خرائط جوجل أو الإحداثيات (اختياري)</label><input id="sLL" dir="ltr" placeholder="https://maps.google.com/... أو 24.79, 46.62"></div>
    <button class="btn primary" type="submit" id="sAdd">${ic('plus', 16)} إضافة الموقع</button>
    <button class="btn ghost" type="button" id="sHere">${ic('pin', 16)} موقعي الحالي</button>
    <div class="err" id="sErr"></div>
   </form>
  </section>`;
  bindViewers();
  // grace
  $('gForm').onsubmit = async e => {
    e.preventDefault(); const g = parseInt(toEn($('gMin').value), 10);
    if (!(g >= 0 && g <= 120)) { $('gErr').textContent = 'اكتب رقماً من ٠ إلى ١٢٠'; return; }
    try { await setDoc(doc(db, 'settings', 'main'), { grace: g }, { merge: true }); $('gErr').textContent = ''; toast('ok', 'فترة السماح الآن ' + ar(g) + ' دقيقة', 'تطبّق على الجميع فوراً', 'الإعدادات'); }
    catch (x) { $('gErr').textContent = 'تعذّر الحفظ'; }
  };
  // schedule
  const sch = $('sched');
  sch.onchange = e => {
    const d = e.target.closest('.sday'); if (!d) return;
    if (e.target.dataset.k === 'on') d.classList.toggle('isoff', !e.target.checked);
    if (e.target.dataset.k === 'two') d.querySelector('[data-two]').hidden = !e.target.checked;
  };
  $('schReset').onclick = async () => { try { await setDoc(doc(db, 'settings', 'main'), { sched: DEF_SCHED }, { merge: true }); toast('ok', 'رجعت المواعيد الافتراضية', '', 'الإعدادات'); renderSet(); } catch (x) { $('schErr').textContent = 'تعذّر الحفظ'; } };
  $('schSave').onclick = async () => {
    const out = {}; let bad = '';
    sch.querySelectorAll('.sday').forEach(el => {
      const d = el.dataset.d, q = k => el.querySelector(`[data-k="${k}"]`);
      if (!q('on').checked) { out[d] = { on: false }; return; }
      const s1 = fromHHMM(q('s1').value), e1 = fromHHMM(q('e1').value);
      if (s1 == null || e1 == null || e1 <= s1) { bad = bad || 'راجع مواعيد ' + DAYS[d] + ': نهاية الفترة لازم تكون بعد بدايتها'; return; }
      const o = { on: true, s1, e1 };
      if (q('two').checked) {
        const s2 = fromHHMM(q('s2').value), e2 = fromHHMM(q('e2').value);
        if (s2 == null || e2 == null || s2 <= e1 || e2 <= s2) { bad = bad || 'راجع الفترة الثانية يوم ' + DAYS[d] + ': لازم تبدأ بعد الفترة الأولى'; return; }
        o.s2 = s2; o.e2 = e2;
      }
      if (s1 < 30) { bad = bad || 'بداية الدوام يوم ' + DAYS[d] + ' لازم تكون بعد ١٢:٣٠ ص'; return; }
      out[d] = o;
    });
    if (bad) { $('schErr').textContent = bad; return; }
    try { await setDoc(doc(db, 'settings', 'main'), { sched: out }, { merge: true }); $('schErr').textContent = ''; toast('ok', 'تم حفظ مواعيد العمل', 'وصلت لكل الموظفين فوراً', 'الإعدادات'); }
    catch (x) { $('schErr').textContent = 'تعذّر الحفظ'; }
  };
  // sites
  const addSite = async (name, ll, r) => {
    const s = { id: 's' + Date.now().toString(36), name, lat: ll.lat, lng: ll.lng, r };
    await setDoc(doc(db, 'settings', 'main'), { sites: [...sites(), s] }, { merge: true });
    toast('ok', 'تمت إضافة ' + name, 'نطاق ' + ar(r) + ' متر', 'الإعدادات');
  };
  const readForm = () => {
    const name = $('sName').value.trim(), r = parseInt(toEn($('sR').value), 10);
    if (name.length < 2) { $('sErr').textContent = 'اكتب اسم الموقع'; $('sName').focus(); return null; }
    if (!(r >= 20 && r <= 5000)) { $('sErr').textContent = 'النطاق من ٢٠ إلى ٥٠٠٠ متر'; return null; }
    return { name, r };
  };
  $('siteForm').onsubmit = async e => {
    e.preventDefault(); const f = readForm(); if (!f) return;
    const ll = parseLatLng($('sLL').value);
    if (!ll) { $('sErr').textContent = 'الصق رابط خرائط جوجل أو الإحداثيات، أو دوس «موقعي الحالي» وانت في الموقع'; return; }
    try { await addSite(f.name, ll, f.r); $('sErr').textContent = ''; } catch (x) { $('sErr').textContent = 'تعذّر الحفظ'; }
  };
  $('sHere').onclick = async () => {
    const f = readForm(); if (!f) return; $('sErr').textContent = 'جارٍ تحديد موقعك…';
    try { const g = await getGeo(); await addSite(f.name, g, f.r); $('sErr').textContent = ''; }
    catch (x) { $('sErr').textContent = 'تعذّر تحديد الموقع، فعّل GPS واسمح للتطبيق'; }
  };
  $('siteList').onclick = async e => {
    const b = e.target.closest('[data-delsite]'); if (!b) return;
    const s = sites().find(x => x.id === b.dataset.delsite); if (!s) return;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.classList.add('danger'); b.title = 'اضغط مرة ثانية للتأكيد'; toast('warn', 'اضغط مرة ثانية لحذف ' + s.name, '', 'الإعدادات'); setTimeout(() => { b.dataset.sure = ''; b.classList.remove('danger'); }, 3500); return; }
    try { await setDoc(doc(db, 'settings', 'main'), { sites: sites().filter(x => x.id !== s.id) }, { merge: true }); toast('ok', 'تم حذف ' + s.name, '', 'الإعدادات'); } catch (x) { toast('bad', 'تعذّر الحذف', '', 'الإعدادات'); }
  };
}

let viewers = [];
function paintViewers() {
  const el = $('viewerList'); if (!el) return;
  el.innerHTML = viewers.length ? viewers.map(v => `<div class="site"><div class="ico i-info">${ic('lock', 16)}</div><div class="tx"><b>${esc(v.name)}</b><small>اسم المستخدم: ${esc(v.num)} · مشاهدة فقط</small></div><button class="navb" data-delvw="${v.id}" aria-label="حذف ${esc(v.name)}">${ic('trash', 15)}</button></div>`).join('') : '<p class="muted small">لا توجد حسابات متابعة بعد.</p>';
}
function bindViewers() {
  paintViewers();
  const n = $('vwName'), u = $('vwUser'), p = $('vwPass'), er = $('vwErr'), btn = $('vwBtn');
  [n, u, p].forEach(x => x.oninput = () => er.textContent = '');
  $('vwForm').onsubmit = async e => {
    e.preventDefault();
    const name = n.value.trim(), num = toEn(u.value.trim()), pass = p.value;
    if (name.length < 2) { er.textContent = 'اكتب الاسم'; n.focus(); return; }
    if (!USER_OK.test(normUser(num))) { er.textContent = 'اسم المستخدم من ٢ لـ ٢٤ حرف: حروف وأرقام فقط'; u.focus(); return; }
    if (emps.some(x => normUser(x.num) === normUser(num)) || viewers.some(x => normUser(x.num) === normUser(num))) { er.textContent = 'اسم المستخدم مستخدم بالفعل'; u.focus(); return; }
    if (pass.length < 6) { er.textContent = 'كلمة السر ٦ أحرف أو أرقام على الأقل'; p.focus(); return; }
    btn.disabled = true;
    try {
      const sec = getSecondary(); const cred = await createUserWithEmailAndPassword(sec.auth, toEmail(num), pass);
      await setDoc(doc(db, 'viewers', cred.user.uid), { name, num, createdAt: serverTimestamp() }); await signOut(sec.auth);
      toast('ok', 'تمت إضافة حساب متابعة', name + ' · يدخل باسم المستخدم «' + num + '»', 'الإعدادات'); n.value = u.value = p.value = '';
    } catch (x) { er.textContent = authMsg(x); } finally { btn.disabled = false; }
  };
  $('viewerList').onclick = async e => {
    const b = e.target.closest('[data-delvw]'); if (!b) return;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.classList.add('danger'); toast('warn', 'اضغط مرة ثانية لحذف الحساب', '', 'الإعدادات'); setTimeout(() => { b.dataset.sure = ''; b.classList.remove('danger'); }, 3500); return; }
    try { await deleteDoc(doc(db, 'viewers', b.dataset.delvw)); toast('ok', 'تم حذف حساب المتابعة', 'مش هيقدر يدخل تاني', 'الإعدادات'); } catch (x) { toast('bad', 'تعذّر الحذف', '', 'الإعدادات'); }
  };
}

/* ========== data wiring ========== */
function stopAll() { unsubs.forEach(f => { try { f(); } catch (e) { } }); unsubs = []; emps = []; recs = {}; meEmp = null; settings = {}; lives = {}; msgs = []; firstDays = true; liveFirst = true; chatFirst = true; remoteRead = 0; readSaved = 0; }
function onDays(snap) {
  const changes = firstDays ? [] : snap.docChanges();
  const prev = {};
  changes.forEach(c => { const d = c.doc.data(); const k = keyOfIdx(d.day); prev[c.doc.id] = (recs[d.uid] && recs[d.uid][k]) || null; });
  snap.docChanges().forEach(c => {
    const d = c.doc.data(); const k = keyOfIdx(d.day);
    recs[d.uid] = recs[d.uid] || {};
    if (c.type === 'removed') delete recs[d.uid][k]; else recs[d.uid][k] = docToRec(d);
  });
  if (canSee() && !firstDays) {
    const P = todayPlan(), G = grace();
    changes.forEach(c => {
      if (c.type === 'removed') return; const d = c.doc.data(); if (d.day !== todayIdx()) return;
      const now = recs[d.uid][keyOfIdx(d.day)], was = prev[c.doc.id], e = empById(d.uid); if (!now || !e) return;
      ALL.forEach(f => {
        if (now[f] != null && (!was || was[f] == null) && now[f] >= nowMin() - 10) {
          const late = (f === 'in' && !P.off && now.in > P.start + G) || (f === 'in2' && P.two && now.in2 > P.b2 + G);
          alertBoth(late ? 'warn' : 'ok', `${e.name} · ${FL[f]}${late ? ' متأخر' : ''}`, `${tm(now[f])} · بصمة ${MI[now.m[f]] ? MI[now.m[f]][1] : ''}${e.dept ? ' · ' + e.dept : ''}`, 'إشعار للمالك');
        }
      });
    });
  }
  firstDays = false;
  refresh();
}
let refreshT = null;
function refresh() {
  clearTimeout(refreshT);
  refreshT = setTimeout(() => {
    const typing = document.activeElement && document.activeElement.closest && document.activeElement.closest('form,.form,.sched,.geobox');
    if (view === 'vOwn') { if (typing) renderFeed(true); else renderOwner(); if (sheetEmp) { const p = $('shProf'); p && p._refresh && p._refresh(); } }
    else if (view === 'vEmp') { updateEmpLive(true); const p = $('myProf'); p && p._refresh && p._refresh(); }
    else if (view === 'vSet') { if (!typing) renderSet(); }
    else if (view === 'vMap') paintMap();
  }, 120);
}

onAuthStateChanged(auth, u => {
  const wasLive = liveOn; if (wasLive) { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; liveOn = false; }
  stopAll();
  if (!u) { me = null; isOwner = false; isViewer = false; renderLogin(); return; }
  me = u; isOwner = u.uid === OWNER_UID; isViewer = false;
  $('userChip').textContent = isOwner ? 'المالك' : '';
  if (!isOwner) {
    renderMsg('جارٍ تحميل حسابك…', '');
    getDoc(doc(db, 'viewers', u.uid)).then(v => { if (me !== u) return; if (v.exists()) { isViewer = true; viewerName = v.data().name || 'متابع'; } startSession(u); }).catch(() => { if (me === u) startSession(u); });
    return;
  }
  startSession(u);
});
function startSession(u) {
  if (isViewer) $('userChip').textContent = viewerName + ' · متابعة';
  unsubs.push(onSnapshot(doc(db, 'settings', 'main'), s => { settings = s.exists() ? s.data() : {}; refresh(); }, () => { }));
  unsubs.push(onSnapshot(query(collection(db, 'chat'), orderBy('at', 'desc'), limit(300)), onChat, () => { }));
  const yearStart = idxOfKey(today0().getFullYear() + '-01-01');
  unsubs.push(onSnapshot(doc(db, 'reads', u.uid), onReads, () => { }));
  if (canSee()) {
    renderMsg('جارٍ تحميل البيانات…', '');
    let gotEmps = false;
    unsubs.push(onSnapshot(collection(db, 'employees'), s => {
      emps = s.docs.map(empFromDoc); if (!gotEmps) { gotEmps = true; renderOwner(); if (justLoggedIn) { justLoggedIn = false; welcome(isViewer ? viewerName.split(' ')[0] : 'المالك'); } if (pendingGo) { const g = pendingGo; pendingGo = null; history.replaceState(null, '', location.pathname); setTimeout(() => goTo(g), 600); } } else refresh();
    }, err => renderMsg('تعذّر تحميل الموظفين', 'تأكد من لصق قواعد الحماية في Firebase وأن رقم المالك صحيح.')));
    unsubs.push(onSnapshot(query(collection(db, 'days'), where('day', '>=', yearStart)), onDays, () => { }));
    unsubs.push(onSnapshot(collection(db, 'live'), onLive, () => { }));
    if (isOwner) unsubs.push(onSnapshot(collection(db, 'viewers'), s => { viewers = s.docs.map(d => ({ id: d.id, ...d.data() })); paintViewers(); }, () => { }));
  } else {
    renderMsg('جارٍ تحميل حسابك…', '');
    let first = true;
    unsubs.push(onSnapshot(doc(db, 'employees', u.uid), s => {
      if (!s.exists()) { renderMsg('حسابك غير مسجّل كموظف', 'تواصل مع المالك لتفعيل حسابك.'); return; }
      meEmp = empFromDoc(s); emps = [meEmp];
      $('userChip').textContent = meEmp.name;
      if (!meEmp.active) { if (liveOn) stopLive(false); renderMsg('حسابك موقوف', 'تواصل مع المالك لإعادة تفعيله.'); first = true; return; }
      if (meEmp.mustChange) { renderPass(); first = true; return; }
      if (first || !['vEmp', 'vLive', 'vChat'].includes(view)) { first = false; renderEmp(); if (justLoggedIn) { justLoggedIn = false; welcome(meEmp.name.split(' ')[0]); } resumeLive(); if (pendingGo) { const g = pendingGo; pendingGo = null; history.replaceState(null, '', location.pathname); setTimeout(() => goTo(g), 400); } }
      else if (view === 'vEmp') updateEmpLive(true);
    }, () => renderMsg('تعذّر تحميل حسابك', 'تأكد من الاتصال بالإنترنت ثم أعد فتح التطبيق.')));
    unsubs.push(onSnapshot(query(collection(db, 'days'), where('uid', '==', u.uid)), onDays, () => { }));
  }
}
$('logoutBtn').onclick = async () => { closeSheetIfOpen(); if (liveOn) await stopLive(true); await signOut(auth); };
function closeSheetIfOpen() { if (!$('sheet').hidden) closeSheet(); }
addEventListener('resize', () => document.querySelectorAll('.tabs').forEach(movePill));

/* ========== light / dark (الفاتح هو الأساسي) ========== */
const SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 12h1M12 3v1M20 12h1M12 20v1M5.6 5.6l.7.7M18.4 5.6l-.7.7M17.7 17.7l.7.7M6.3 17.7l-.7.7"/></svg>';
const MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3h.39a7.5 7.5 0 0 0 7.92 12.45A9 9 0 1 1 12 3z"/></svg>';
const curTheme = () => document.documentElement.getAttribute('data-theme') || 'light';
function paintThemeBtns() {
  const t = curTheme();
  document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.innerHTML = t === 'dark' ? SUN : MOON; b.setAttribute('aria-label', t === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'); });
  const m = $('themeColor'); if (m) m.setAttribute('content', t === 'dark' ? '#141414' : '#f5f4f2');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-theme-toggle]'); if (!b) return;
  const next = curTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('sh-theme', next); } catch (err) { }
  paintThemeBtns(); vibrate(15);
});
paintThemeBtns();
(() => { let n = 0; try { n = +(localStorage.getItem('sh-theme-hint') || 0); localStorage.setItem('sh-theme-hint', String(n + 1)); } catch (e) { }
  if (n < 6) { document.documentElement.classList.add('theme-hint'); setTimeout(() => document.documentElement.classList.remove('theme-hint'), 9000); } })();

/* ----- تنبيه: افتح التطبيق من الهوم سكرين عشان يفضل مسجّل ويشتغل أحسن ----- */
(() => {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  let hide = false; try { hide = sessionStorage.getItem('sh-inst-hide') === '1'; } catch (e) { }
  if (standalone || !mobile || hide) return;
  const ios = /iPhone|iPad/i.test(navigator.userAgent), inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(navigator.userAgent);
  const bar = document.createElement('div'); bar.className = 'instbar';
  bar.innerHTML = `<div><b>${inApp ? 'افتح الرابط في المتصفح' : 'ثبّت التطبيق على الشاشة الرئيسية'}</b><span>${inApp ? 'من داخل الواتساب تسجيل الدخول بيتمسح. افتحه في ' + (ios ? 'Safari' : 'Chrome') + ' وثبّته على الشاشة الرئيسية.' : ios ? 'من Safari العادي (مش الخاص): زرار المشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية». كده هيفضل مسجّل دخول والإشعارات توصلك.' : 'من Chrome: النقط الثلاث ⋮ ثم «إضافة إلى الشاشة الرئيسية». كده هيفضل مسجّل دخول والإشعارات توصلك.'}</span></div><button aria-label="إخفاء">${ic('x', 16)}</button>`;
  bar.querySelector('button').onclick = () => { bar.remove(); try { sessionStorage.setItem('sh-inst-hide', '1'); } catch (e) { } };
  document.body.appendChild(bar);
})();

/* ========== boot ========== */
(async () => { try { if (window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) { window.__bio = true; if (view === 'vEmp' && !busy) renderEmp(); } } catch (e) { } })();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
setDates(); tickClock();
setInterval(() => { tickClock(); if (view === 'vEmp') updateEmpLive(false); }, 1000);
setInterval(() => { checkEmpReminders(); checkOwnerAlerts(); }, 15000);
setInterval(() => { setDates(); updateBands(); if (view === 'vEmp' && !busy) updateEmpLive(true); if (view === 'vOwn') renderFeed(false); if (view === 'vLive') paintLiveStats(); }, 20000);
setInterval(() => { if (view === 'vMap') paintMap(); }, 10000);
setTimeout(() => { const s = $('splash'); if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 700); } checkEmpReminders(); checkOwnerAlerts(); }, RM ? 300 : 3000);
