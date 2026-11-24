export const fmtPhone = (p?: string) =>
  p && /^0\d{9}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : p || '';

/** Normalise Israeli phone numbers to 05XXXXXXXX. */
export const normPhone = (p?: string) => {
  let s = String(p || '').replace(/\D/g, '');
  if (s.startsWith('972')) s = '0' + s.slice(3);
  if (s.length === 9 && s[0] === '5') s = '0' + s;
  return s;
};

export const telHref = (p?: string) => `tel:${String(p || '').replace(/[^\d+]/g, '')}`;

export const newId = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const byName = (a: { name?: string }, b: { name?: string }) => (a.name || '').localeCompare(b.name || '', 'he');

export const pctText = (p: number | null) => (p == null ? '–' : `${p}%`);

export const splitInstructors = (s: string) =>
  s
    .split(/[,،]/)
    .map((x) => x.trim())
    .filter(Boolean);
