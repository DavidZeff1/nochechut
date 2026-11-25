import { addDays, compact, lastWeekday, today } from '../lib/dates';
import type { DocData } from './backend';

/** Invented sample data for the demo build and tests. Dates are relative to today. */
export function demoSeed(ref = today()): Record<string, DocData> {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const first = [
    'נועה',
    'יעל',
    'תמר',
    'מאיה',
    'אביגיל',
    'שירה',
    'הדס',
    'רוני',
    'ליאל',
    'אורי',
    'איתי',
    'יונתן',
    'דניאל',
    'אריאל',
    'עדי',
    'נגה',
    'הילה',
    'שחר',
    'אלה',
    'מיכל',
    'רחל',
    'שני',
    'טליה',
    'אגם',
  ];
  const last = ['כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אברהם', 'דהן', 'אזולאי', 'חדד', 'עמר', 'אוחיון', 'גבאי'];
  const moms = ['סיגל', 'אורית', 'מירב', 'ענבל', 'קרן', 'לימור', 'חן', 'רותי', 'דנה', 'איילת'];
  const courses: Array<[string, string, number | null, string, string[]]> = [
    ['c01', 'אומנויות לחימה', 0, '17:00', ['שרית']],
    ['c02', 'תאטרון', 0, '16:00', ['מיכל']],
    ['c03', 'זומבה', 1, '19:30', ['ליאת']],
    ['c04', 'מחול יהודי', 2, '17:30', ['רבקה']],
    ['c05', 'תסרוקות', 2, '17:00', ['שרית']],
    ['c06', 'אומנות', 3, '16:30', ['נעמה']],
    ['c07', 'גלישה', 4, '15:00', ['אלון']],
    ['c08', 'שחמט', null, '', ['דוד']],
  ];
  const out: Record<string, DocData> = {};
  let sn = 0;
  courses.forEach(([id, name, day, time, instructors], i) => {
    out[`courses/${id}`] = { name, day, time, instructors, archived: false, order: i };
    const n = 6 + Math.floor(rnd() * 10);
    const sids: string[] = [];
    for (let k = 0; k < n; k++) {
      const sid = `s${++sn}`;
      sids.push(sid);
      out[`students/${sid}`] = {
        name: `${pick(first)} ${pick(last)}`,
        mother: pick(moms),
        phone: '05' + String(Math.floor(rnd() * 1e8)).padStart(8, '0'),
        age: String(6 + Math.floor(rnd() * 10)),
        birthDate: '',
      };
      out[`enrollments/${id}_${sid}`] = {
        courseId: id,
        studentId: sid,
        active: k !== n - 1,
        addedAt: addDays(ref, -120),
        removedAt: k === n - 1 ? addDays(ref, -21) : null,
        group: id === 'c05' ? (k % 2 ? '17:00' : '18:00') : '',
        info: '',
      };
    }
    if (day == null) return;
    for (let w = 0; w < 10; w++) {
      const date = addDays(lastWeekday(ref, day), -7 * w);
      if (w === 0 && id === 'c03') continue; // one class not marked this week
      if (date === ref && rnd() < 0.5) continue;
      const records: DocData = {};
      sids.forEach((sid, k) => {
        const r = rnd();
        const s = k === 0 ? (rnd() < 0.5 ? 'x' : '') : r < 0.76 ? 'v' : r < 0.9 ? 'x' : '';
        records[sid] = { s, n: rnd() < 0.05 ? 'הגיע/ה באיחור' : '' };
      });
      out[`sessions/${id}_${compact(date)}`] = {
        courseId: id,
        date,
        note: rnd() < 0.08 ? 'מדריכה מחליפה' : '',
        records,
        updatedAt: '',
      };
    }
  });
  // One instructor with a (made-up) phone, so the WhatsApp reminder opens her chat directly.
  out[`instructors/${encodeURIComponent('ליאת')}`] = { name: 'ליאת', phone: '0501111111' };
  out['config/app'] = { plan_split_2026_11_22: true };
  // One waiting access request, so the admin's Settings screen shows how approving works.
  out['accessRequests/noa.demo@example.com'] = {
    email: 'noa.demo@example.com',
    uid: 'demo-noa',
    name: 'נועה (הדגמה)',
    role: 'instructor',
    instructorName: 'נועה',
    note: 'מדריכה חדשה בחוג קרמיקה',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  return out;
}
