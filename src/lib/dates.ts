export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DSHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

const pad = (n: number) => String(n).padStart(2, '0');

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());

export const parseISO = (s: string) => {
  const [y, m, d] = String(s || '')
    .split('-')
    .map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};

export const isISODate = (s: string | undefined | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** 2026-11-24 → "24/11" */
export const dm = (s: string) => {
  if (!s) return '';
  const [, m, d] = s.split('-');
  return `${+d}/${+m}`;
};
/** 2026-11-24 → "24/11/2026" */
export const dmy = (s: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
export const weekday = (s: string) => parseISO(s).getDay();
export const dayName = (s: string) => DAYS[weekday(s)];
export const longDate = (s: string) => {
  const d = parseISO(s);
  return `יום ${DAYS[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]}`;
};
export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** Sunday that starts the (Israeli) week containing s. */
export const weekStart = (s: string) => addDays(s, -weekday(s));
export const compact = (s: string) => s.replace(/-/g, '');
export const fromCompact = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

/** The most recent date (on or before `ref`) that falls on weekday `day`. */
export const lastWeekday = (ref: string, day: number) => addDays(ref, -((weekday(ref) - day + 7) % 7));

export const formatTimestamp = (t?: string) => {
  if (!t) return '';
  const d = new Date(t);
  return isNaN(d.getTime()) ? '' : `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
