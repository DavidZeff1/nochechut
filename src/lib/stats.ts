import { addDays, compact, lastWeekday, today, weekStart } from './dates';
import { byName } from './format';
import type {
  AttendanceRecord,
  Course,
  CourseWithId,
  DataIndex,
  DataState,
  EnrollmentRow,
  Mark,
  SessionRow,
} from './types';

export const sessId = (courseId: string, date: string) => `${courseId}_${compact(date)}`;

const MISSING_STUDENT = { name: '(תלמיד לא נמצא)' };

export function buildIndex(S: DataState): DataIndex {
  const sessionsByCourse: Record<string, SessionRow[]> = {};
  const enrollmentsByCourse: Record<string, EnrollmentRow[]> = {};
  const enrollmentsByStudent: Record<string, EnrollmentRow[]> = {};
  for (const [id, s] of Object.entries(S.sessions)) {
    if (!s || !s.courseId || !s.date) continue;
    (sessionsByCourse[s.courseId] ||= []).push({ id, date: s.date, records: s.records || {}, note: s.note || '' });
  }
  for (const list of Object.values(sessionsByCourse)) list.sort((a, b) => a.date.localeCompare(b.date));
  for (const [id, e] of Object.entries(S.enrollments)) {
    if (!e) continue;
    const row: EnrollmentRow = { id, ...e, st: S.students[e.studentId] || MISSING_STUDENT };
    (enrollmentsByCourse[e.courseId] ||= []).push(row);
    (enrollmentsByStudent[e.studentId] ||= []).push(row);
  }
  return { sessionsByCourse, enrollmentsByCourse, enrollmentsByStudent };
}

export const countMarks = (records?: Record<string, AttendanceRecord>) => {
  let v = 0;
  let x = 0;
  for (const r of Object.values(records || {})) {
    if (r?.s === 'v') v++;
    else if (r?.s === 'x') x++;
  }
  return { v, x };
};

export const getRecord = (S: DataState, courseId: string, date: string, sid: string): AttendanceRecord => {
  const r: Partial<AttendanceRecord> = S.sessions[sessId(courseId, date)]?.records?.[sid] ?? {};
  return { ...r, s: r.s ?? '', n: r.n ?? '' };
};

export const courseSessions = (X: DataIndex, courseId: string) => X.sessionsByCourse[courseId] || [];
export const courseEnrollments = (X: DataIndex, courseId: string) => X.enrollmentsByCourse[courseId] || [];

/** Students who belong on the roster for `date`: active ones, plus those removed after that date. */
export function rosterFor(X: DataIndex, courseId: string, date: string): EnrollmentRow[] {
  return courseEnrollments(X, courseId)
    .filter((e) => e.active || (!!e.removedAt && e.removedAt > date))
    .sort((a, b) => (a.group || '').localeCompare(b.group || '', 'he') || byName(a.st, b.st));
}

/** Dates on which at least one student was marked as arrived. */
export const heldDates = (X: DataIndex, courseId: string) =>
  courseSessions(X, courseId)
    .filter((s) => countMarks(s.records).v > 0)
    .map((s) => s.date);

export interface CourseStats {
  v: number;
  x: number;
  held: number;
  last: string;
  active: number;
  pct: number | null;
}

export function courseStats(X: DataIndex, courseId: string): CourseStats {
  let v = 0;
  let x = 0;
  let held = 0;
  let last = '';
  for (const s of courseSessions(X, courseId)) {
    const c = countMarks(s.records);
    if (c.v) {
      held++;
      if (s.date > last) last = s.date;
    }
    v += c.v;
    x += c.x;
  }
  const active = courseEnrollments(X, courseId).filter((e) => e.active).length;
  return { v, x, held, last, active, pct: v + x ? Math.round((100 * v) / (v + x)) : null };
}

export interface StudentStats {
  v: number;
  x: number;
  pct: number | null;
  items: Array<AttendanceRecord & { date: string }>;
}

export function studentStats(X: DataIndex, courseId: string, sid: string): StudentStats {
  let v = 0;
  let x = 0;
  const items: StudentStats['items'] = [];
  for (const s of courseSessions(X, courseId)) {
    const r = s.records[sid];
    if (!r) continue;
    if (r.s === 'v') v++;
    if (r.s === 'x') x++;
    if (r.s || r.n) items.push({ date: s.date, ...r });
  }
  return { v, x, items, pct: v + x ? Math.round((100 * v) / (v + x)) : null };
}

export const activeCourses = (S: DataState): CourseWithId[] =>
  Object.entries(S.courses)
    .filter(([, c]) => c && !c.archived)
    .map(([id, c]) => ({ id, ...c }))
    .sort(
      (a, b) =>
        (a.day ?? 9) - (b.day ?? 9) || (a.time || '').localeCompare(b.time || '') || (a.order || 0) - (b.order || 0),
    );

export const allInstructors = (S: DataState) =>
  [...new Set(Object.values(S.courses).flatMap((c) => (c && !c.archived ? c.instructors || [] : [])))].sort((a, b) =>
    a.localeCompare(b, 'he'),
  );

/** The date an undated course link should open on: the course's most recent meeting day. */
export const lastClassDay = (course: Course | undefined, ref = today()) =>
  course && course.day != null ? lastWeekday(ref, course.day) : ref;

export interface WeekItem {
  course: CourseWithId;
  date: string;
  state: 'ok' | 'miss' | 'up';
  v: number;
}

export function weekBoard(S: DataState, ref = today()) {
  const ws = weekStart(ref);
  const act = activeCourses(S);
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => act.some((c) => c.day === d));
  let due = 0;
  let done = 0;
  const columns = days.map((d) => {
    const date = addDays(ws, d);
    const items: WeekItem[] = act
      .filter((c) => c.day === d)
      .map((course) => {
        const cv = countMarks(S.sessions[sessId(course.id, date)]?.records);
        const future = date > ref;
        const state: WeekItem['state'] = future ? 'up' : cv.v + cv.x ? 'ok' : 'miss';
        if (!future) {
          due++;
          if (state === 'ok') done++;
        }
        return { course, date, state, v: cv.v };
      });
    return { day: d, date, items };
  });
  return { columns, due, done };
}

export function weeklyTrend(S: DataState, weeks = 12, ref = today()) {
  const ws = weekStart(ref);
  const starts: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) starts.push(addDays(ws, -7 * i));
  const sums: Record<string, number> = Object.fromEntries(starts.map((w) => [w, 0]));
  for (const s of Object.values(S.sessions)) {
    if (!s?.date || !S.courses[s.courseId]) continue;
    const w = weekStart(s.date);
    if (w in sums) sums[w] += countMarks(s.records).v;
  }
  return starts.map((w) => ({ week: w, arrived: sums[w] }));
}

export interface RiskRow {
  course: CourseWithId;
  enrollment: EnrollmentRow;
  dates: string[];
  marks: Mark[];
}

/** Active students with no "arrived" in any of their course's last 3 held sessions. */
export function followUpList(S: DataState, X: DataIndex): RiskRow[] {
  const out: RiskRow[] = [];
  for (const course of activeCourses(S)) {
    const dates = heldDates(X, course.id).slice(-3);
    if (dates.length < 3) continue;
    for (const e of courseEnrollments(X, course.id)) {
      if (!e.active || (e.addedAt && e.addedAt > dates[0])) continue;
      const marks = dates.map((d) => (S.sessions[sessId(course.id, d)]?.records?.[e.studentId]?.s || '') as Mark);
      if (marks.every((m) => m !== 'v')) out.push({ course, enrollment: e, dates, marks });
    }
  }
  return out;
}

export interface NoteRow {
  id: string;
  courseId: string;
  date: string;
  sid: string | null;
  n: string;
  t: string;
  s?: Mark;
}

export function allNotes(S: DataState, courseId?: string): NoteRow[] {
  const out: NoteRow[] = [];
  for (const [id, se] of Object.entries(S.sessions)) {
    if (!se || !se.date || (courseId && se.courseId !== courseId) || !S.courses[se.courseId]) continue;
    if (se.note) out.push({ id, courseId: se.courseId, date: se.date, sid: null, n: se.note, t: se.noteT || '' });
    for (const [sid, r] of Object.entries(se.records || {})) {
      if (r?.n) out.push({ id, courseId: se.courseId, date: se.date, sid, n: r.n, t: r.t || '', s: r.s });
    }
  }
  return out.sort((a, b) => (b.t || b.date).localeCompare(a.t || a.date) || b.date.localeCompare(a.date));
}

/** Text summary of a session for WhatsApp. */
export function sessionSummary(S: DataState, X: DataIndex, courseId: string, date: string, dayLabel: string) {
  const ro = rosterFor(X, courseId, date);
  const rec = (sid: string) => getRecord(S, courseId, date, sid);
  const yes = ro.filter((e) => rec(e.studentId).s === 'v').map((e) => e.st.name);
  const no = ro.filter((e) => rec(e.studentId).s === 'x').map((e) => e.st.name);
  const notes = ro.filter((e) => rec(e.studentId).n).map((e) => `${e.st.name}: ${rec(e.studentId).n}`);
  const sn = S.sessions[sessId(courseId, date)]?.note;
  return [
    `${S.courses[courseId]?.name} – ${dayLabel}`,
    sn ? `הערה: ${sn}` : '',
    `הגיעו (${yes.length}): ${yes.join(', ')}`,
    `לא הגיעו (${no.length}): ${no.join(', ')}`,
    notes.length ? `הערות:\n${notes.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
