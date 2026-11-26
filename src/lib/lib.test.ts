import { describe, expect, it } from 'vitest';
import { addDays, compact, dm, fromCompact, isISODate, lastWeekday, weekStart, weekday } from './dates';
import { fmtPhone, normPhone, splitInstructors, telHref } from './format';
import { activitySlug, courseImage } from './images';
import { legacyHashToPath } from './legacy';
import { toCsv, toTsv, safeFileName } from './csv';
import {
  buildIndex,
  countMarks,
  courseStats,
  getRecord,
  heldDates,
  rosterFor,
  sessId,
  studentStats,
  weekBoard,
} from './stats';
import type { DataState } from './types';
import { parentText, reminderText, waHref, waNumber } from './whatsapp';

describe('dates', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('finds weekdays', () => {
    expect(weekday('2026-11-22')).toBe(0); // Sunday
    expect(weekStart('2026-11-26')).toBe('2026-11-22');
    expect(lastWeekday('2026-11-24', 0)).toBe('2026-11-22');
    expect(lastWeekday('2026-11-24', 2)).toBe('2026-11-24');
    expect(lastWeekday('2026-11-24', 3)).toBe('2026-11-18');
  });
  it('round-trips compact dates', () => {
    expect(compact('2026-11-24')).toBe('20261124');
    expect(fromCompact('20261124')).toBe('2026-11-24');
    expect(isISODate('2026-11-24')).toBe(true);
    expect(isISODate('20261124')).toBe(false);
    expect(dm('2026-03-05')).toMatch(/5.3/);
  });
});

describe('format', () => {
  it('normalises Israeli phone numbers', () => {
    expect(normPhone('+972 54-523-5567')).toBe('0545235567');
    expect(telHref('054-523 5567')).toBe('tel:0545235567');
    expect(fmtPhone('0545235567')).toBe('054-523-5567');
  });
  it('splits instructor lists', () => {
    expect(splitInstructors('שרית, מיכל ,  ')).toEqual(['שרית', 'מיכל']);
  });
});

describe('course images', () => {
  it('matches Hebrew course names to illustrations', () => {
    expect(activitySlug('אומנויות לחימה')).toBe('martial-arts');
    expect(activitySlug('תסרוקות לבנות')).toBe('hairstyling');
    expect(activitySlug('זומבה')).toBe('zumba');
    expect(activitySlug('תאטרון')).toBe('theatre');
    expect(activitySlug('ימימה')).toBe('womens-circle');
    expect(activitySlug('מחול יהודי')).toBe('jewish-dance');
    expect(activitySlug('גלישה')).toBe('surfing');
    expect(activitySlug('שחמט')).toBe('chess');
    expect(activitySlug('אומנות')).toBe('art');
  });
  it('does not match short words inside longer ones', () => {
    expect(activitySlug('חוג ילדים')).toBe('community');
    expect(activitySlug('')).toBe('community');
  });
  it('prefers an uploaded image', () => {
    expect(courseImage({ name: 'שחמט', image: 'https://x/y.webp' })).toMatchObject({
      src: 'https://x/y.webp',
      custom: true,
    });
    expect(courseImage({ name: 'שחמט' }).src).toBe('/courses/chess-800.webp');
  });
});

describe('legacy links', () => {
  it('maps old hash routes', () => {
    expect(legacyHashToPath('#course-c01')).toBe('/course/c01');
    expect(legacyHashToPath('#course-c01-20261124')).toBe('/course/c01/20261124');
    expect(legacyHashToPath('#admin-session-c01-20261124')).toBe('/admin/session/c01/20261124');
    expect(legacyHashToPath('#admin')).toBe('/admin');
    expect(legacyHashToPath('#nothing')).toBeNull();
  });
});

describe('csv', () => {
  const t = { name: 'x', head: ['שם', 'הערה'], rows: [['נועה', 'אמרה "שלום"\nושלום']] };
  it('escapes quotes and newlines and adds a BOM', () => {
    const csv = toCsv(t);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"אמרה ""שלום"" ושלום"');
  });
  it('builds TSV', () => {
    expect(toTsv(t).split('\n')).toHaveLength(2);
    expect(safeFileName('a/b:c')).toBe('a-b-c');
  });
});

describe('stats', () => {
  const S: DataState = {
    courses: { c1: { name: 'שחמט', day: 2, time: '17:00', instructors: ['דוד'], archived: false } },
    students: { a: { name: 'אביגיל' }, b: { name: 'בני' }, c: { name: 'גיל' } },
    enrollments: {
      c1_a: { courseId: 'c1', studentId: 'a', active: true },
      c1_b: { courseId: 'c1', studentId: 'b', active: true },
      c1_c: { courseId: 'c1', studentId: 'c', active: false, removedAt: '2026-11-15' },
    },
    sessions: {
      c1_20261110: {
        courseId: 'c1',
        date: '2026-11-10',
        records: { a: { s: 'v', n: '' }, b: { s: 'x', n: 'חולה' }, c: { s: 'v', n: '' } },
      },
      c1_20261117: { courseId: 'c1', date: '2026-11-17', records: { a: { s: 'v', n: '' }, b: { s: '', n: 'איחר' } } },
      c1_20261124: { courseId: 'c1', date: '2026-11-24', records: { a: { s: 'x', n: '' } } },
    },
    instructors: {},
    config: {},
  } as DataState;
  const X = buildIndex(S);

  it('builds session ids', () => expect(sessId('c1', '2026-11-24')).toBe('c1_20261124'));
  it('counts marks', () => expect(countMarks(S.sessions.c1_20261110.records)).toEqual({ v: 2, x: 1 }));
  it('returns empty records for unknown students', () => {
    expect(getRecord(S, 'c1', '2026-11-24', 'b')).toEqual({ s: '', n: '' });
    expect(getRecord(S, 'c1', '2026-11-17', 'b')).toEqual({ s: '', n: 'איחר' });
  });
  it('keeps removed students on rosters before they left', () => {
    expect(rosterFor(X, 'c1', '2026-11-10').map((e) => e.studentId)).toEqual(['a', 'b', 'c']);
    expect(rosterFor(X, 'c1', '2026-11-17').map((e) => e.studentId)).toEqual(['a', 'b']);
  });
  it('only counts a meeting as held when someone arrived', () => {
    expect(heldDates(X, 'c1').sort()).toEqual(['2026-11-10', '2026-11-17']);
  });
  it('computes course and student percentages', () => {
    expect(courseStats(X, 'c1')).toMatchObject({ v: 3, x: 2, held: 2, last: '2026-11-17', active: 2, pct: 60 });
    expect(studentStats(X, 'c1', 'a')).toMatchObject({ v: 2, x: 1, pct: 67 });
    expect(studentStats(X, 'c1', 'b').items).toHaveLength(2);
  });
});

describe('whatsapp links', () => {
  it('turns Israeli numbers into WhatsApp numbers', () => {
    expect(waNumber('054-123-4567')).toBe('972541234567');
    expect(waNumber('+972 54 123 4567')).toBe('972541234567');
    expect(waNumber('541234567')).toBe('972541234567');
    expect(waNumber('')).toBe('');
    expect(waNumber('123')).toBe('');
  });

  it('opens the chat with the message typed in, or lets you pick a contact', () => {
    expect(waHref('0541234567', 'שלום & תודה')).toBe(
      `https://wa.me/972541234567?text=${encodeURIComponent('שלום & תודה')}`,
    );
    expect(waHref(undefined, 'hi')).toBe('https://wa.me/?text=hi');
  });

  it('writes a reminder with a link to that session', () => {
    const t = reminderText('ליאת כהן', 'זומבה', 'c03', '2026-11-23', 'https://x.app');
    expect(t).toContain('היי ליאת,');
    expect(t).toContain('זומבה');
    expect(t).toContain('23/11');
    expect(t).toContain('https://x.app/course/c03/20261123');
  });

  it('writes a friendly note to a parent', () => {
    expect(parentText('סיגל לוי', 'נועה', 'תאטרון')).toMatch(/^שלום סיגל, .*נועה.*תאטרון/);
    expect(parentText(undefined, 'נועה', 'תאטרון')).toMatch(/^שלום, /);
  });
});

describe('week board', () => {
  const S = (time: string): DataState => ({
    courses: { c1: { name: 'אומנות', day: 3, time, instructors: [], archived: false } },
    students: {},
    enrollments: {},
    sessions: {},
    instructors: {},
    config: {},
  });
  const item = (time: string, now: string) => weekBoard(S(time), '2026-11-25', now);

  it("treats today's class as due only after it starts", () => {
    expect(item('16:30', '12:00').columns[0].items[0].state).toBe('up');
    expect(item('16:30', '12:00').due).toBe(0);
    expect(item('16:30', '16:31').columns[0].items[0].state).toBe('miss');
    expect(item('9:00', '10:00').columns[0].items[0].state).toBe('miss');
    expect(item('', '08:00').columns[0].items[0].state).toBe('miss');
  });
});
