import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../data/DataContext';
import { DAYS, dm, longDate, parseISO, today } from '../lib/dates';
import { activeCourses, allInstructors, countMarks, courseStats, getRecord, rosterFor, sessId } from '../lib/stats';
import type { CourseWithId } from '../lib/types';
import { InstructorNames } from '../ui/Avatar';
import { CourseImage } from '../ui/CourseImage';

const ME_KEY = 'instructor';
const readMe = () => {
  try {
    return localStorage.getItem(ME_KEY) || '';
  } catch {
    return '';
  }
};

function TodayCard({ c }: { c: CourseWithId }) {
  const { S, X } = useData();
  const t = today();
  const ros = rosterFor(X, c.id, t);
  let v = 0;
  let x = 0;
  for (const e of ros) {
    const s = getRecord(S, c.id, t, e.studentId).s;
    if (s === 'v') v++;
    else if (s === 'x') x++;
  }
  const n = ros.length;
  const done = v + x;
  return (
    <Link className="tcard" to={`/course/${c.id}`}>
      <CourseImage course={c} sizes="(max-width: 600px) 100vw, 420px" eager />
      <span className="tcard-body">
        <span className="t1">
          <span>{c.time || 'היום'}</span>
          <span>{n} תלמידים</span>
        </span>
        <b>{c.name}</b>
        {c.instructors?.length > 0 && <InstructorNames names={c.instructors} />}
        <span className="tb">
          <i style={{ width: `${n ? Math.round((100 * done) / n) : 0}%` }} />
        </span>
        <span className="go">
          <span>{done ? `סומנו ${done} מתוך ${n} · ${v} הגיעו` : 'טרם סומנה נוכחות'}</span>
          <span className="go-btn">{done >= n && n ? 'צפייה ועריכה' : 'לסימון ←'}</span>
        </span>
      </span>
    </Link>
  );
}

function CourseCard({ c }: { c: CourseWithId }) {
  const { S, X } = useData();
  const st = courseStats(X, c.id);
  const lastV = st.last ? countMarks(S.sessions[sessId(c.id, st.last)]?.records).v : 0;
  return (
    <Link className="ccard" to={`/course/${c.id}`}>
      <CourseImage course={c} sizes="(max-width: 600px) 100vw, 300px" />
      <span className="ccard-body">
        <span className="c1">
          <b>{c.name}</b>
          {c.time && <span className="time">{c.time}</span>}
        </span>
        <span className="muted small">{st.active} תלמידים</span>
        {c.instructors?.length > 0 && <InstructorNames names={c.instructors} size={20} />}
        <span className="small">{st.last ? `מפגש אחרון ${dm(st.last)} · ${lastV} הגיעו` : 'עוד לא נרשמה נוכחות'}</span>
      </span>
    </Link>
  );
}

export function Home() {
  const { S } = useData();
  const auth = useAuth();
  const profileName = auth.status === 'ready' ? auth.profile.instructorName || '' : '';
  const [me, setMe] = useState(() => readMe() || profileName);
  const [showAll, setShowAll] = useState(false);
  const names = allInstructors(S);
  const all = activeCourses(S);
  const mine = me ? all.filter((c) => (c.instructors || []).includes(me)) : [];
  const useMine = !!(me && mine.length && !showAll);
  const list = useMine ? mine : all;
  const t = today();
  const tDay = parseISO(t).getDay();
  const tod = list.filter((c) => c.day === tDay);
  const ord = (d: number | null) => (d == null ? 99 : (d - tDay + 7) % 7);
  const rest = list
    .filter((c) => c.day !== tDay)
    .sort((a, b) => ord(a.day) - ord(b.day) || (a.time || '').localeCompare(b.time || ''));
  const groups: Array<{ day: number | null; items: CourseWithId[] }> = [];
  for (const c of rest) {
    const g = groups[groups.length - 1];
    if (g && g.day === c.day) g.items.push(c);
    else groups.push({ day: c.day, items: [c] });
  }

  if (!all.length)
    return (
      <>
        <section className="intro">
          <div>
            <h1>נוכחות חוגים</h1>
            <p className="lead">{longDate(t)}</p>
          </div>
        </section>
        <div className="quiet" style={{ marginTop: 24 }}>
          עדיין אין חוגים. המנהל/ת מוסיפ/ה חוגים ממסך מבט-על.
        </div>
      </>
    );

  return (
    <>
      <section className="intro">
        <div>
          <h1>{useMine ? `שלום, ${me}` : 'נוכחות חוגים'}</h1>
          <p className="lead">{longDate(t)}</p>
        </div>
        <label className="fld me">
          אני המדריך/ה
          <select
            id="meSel"
            value={me}
            onChange={(e) => {
              setMe(e.target.value);
              setShowAll(false);
              try {
                localStorage.setItem(ME_KEY, e.target.value);
              } catch {
                /* ignore */
              }
            }}
          >
            <option value="">כל החוגים</option>
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </section>
      {me && mine.length > 0 && (
        <p className="muted small" style={{ marginTop: 10 }}>
          {useMine ? `מוצגים החוגים של ${me} · ` : 'מוצגים כל החוגים · '}
          <button className="link" onClick={() => setShowAll(!showAll)}>
            {useMine ? 'הצגת כל החוגים' : 'רק החוגים שלי'}
          </button>
        </p>
      )}
      {me && !mine.length && (
        <p className="muted small" style={{ marginTop: 10 }}>
          לא נמצאו חוגים המשויכים ל{me}, לכן מוצגים כל החוגים.
        </p>
      )}
      <h2 className="sec">
        היום<span className="muted">{tod.length ? (tod.length === 1 ? 'חוג אחד' : `${tod.length} חוגים`) : ''}</span>
      </h2>
      {tod.length ? (
        <div className="tgrid">
          {tod.map((c) => (
            <TodayCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="quiet">
          אין {useMine ? 'לך ' : ''}חוגים היום. אפשר לבחור חוג מהרשימה ולסמן נוכחות לכל תאריך.
        </div>
      )}
      {groups.map((g) => (
        <section key={String(g.day)}>
          <div className="daylbl">
            {g.day == null ? 'ללא יום קבוע' : `יום ${DAYS[g.day]}`}
            {ord(g.day) === 1 && <small>מחר</small>}
          </div>
          <div className="cgrid">
            {g.items.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
