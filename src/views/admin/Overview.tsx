import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { compact, DAYS, dm, today } from '../../lib/dates';
import { fmtPhone, pctText, telHref } from '../../lib/format';
import type { Table } from '../../lib/csv';
import { allNotes, courseStats, followUpList, weekBoard, weeklyTrend } from '../../lib/stats';
import { profileFor } from '../../lib/instructors';
import type { CourseWithId } from '../../lib/types';
import { parentText, reminderText, waHref, waNumber } from '../../lib/whatsapp';
import { TableActions } from '../../ui/TableActions';
import { NotesTable } from './shared';

/** WhatsApp reminder links for a session nobody marked: one per instructor of the course. */
function Remind({ course, date }: { course: CourseWithId; date: string }) {
  const { S } = useData();
  const names = course.instructors?.length ? course.instructors : [''];
  return (
    <span className="wa-row">
      {names.map((n) => {
        const phone = n ? profileFor(S, n)?.phone : undefined;
        const has = !!waNumber(phone);
        return (
          <a
            key={n || '-'}
            className="wa"
            href={waHref(phone, reminderText(n, course.name, course.id, date, window.location.origin))}
            target="_blank"
            rel="noopener noreferrer"
            title={has ? `שליחת תזכורת ל${n} בוואטסאפ` : 'אין טלפון שמור – בוואטסאפ בוחרים למי לשלוח'}
          >
            תזכורת{n ? ` ל${n}` : ''}
          </a>
        );
      })}
    </span>
  );
}

function WeekBoard() {
  const { S } = useData();
  const nav = useNavigate();
  const t = today();
  const { columns, due, done } = weekBoard(S, t);
  return (
    <>
      <h2 className="sec">
        {due ? `השבוע סומנו ${done} מתוך ${due} מפגשים שכבר התקיימו` : 'השבוע עוד לא התקיימו מפגשים'}
        <span className="muted">לחיצה על מפגש פותחת אותו לעריכה</span>
      </h2>
      {columns.length ? (
        <div className="week">
          {columns.map((col) => (
            <div key={col.day} className={`wday ${col.date === t ? 'is-today' : ''}`}>
              <div className="wh">
                <b>{DAYS[col.day]}</b>
                <span>
                  {dm(col.date)}
                  {col.date === t ? ' · היום' : ''}
                </span>
              </div>
              {col.items.map((it) => (
                <div key={it.course.id} className="wslot">
                  <button
                    className={`witem ${it.state}`}
                    onClick={() => nav(`/admin/session/${it.course.id}/${compact(it.date)}`)}
                  >
                    <b>{it.course.name}</b>
                    <span>
                      {it.course.time ? `${it.course.time} · ` : ''}
                      {it.state === 'ok'
                        ? `${it.v} הגיעו`
                        : it.state === 'miss'
                          ? 'לא סומן'
                          : it.date === t
                            ? 'בהמשך היום'
                            : 'בהמשך השבוע'}
                    </span>
                  </button>
                  {it.state === 'miss' && <Remind course={it.course} date={it.date} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="quiet">אין חוגים עם יום קבוע.</div>
      )}
    </>
  );
}

function Trend() {
  const { S } = useData();
  const weeks = weeklyTrend(S, 12);
  const max = Math.max(1, ...weeks.map((w) => w.arrived));
  const last = weeks[10].arrived;
  const prev = weeks[9].arrived;
  const diff = last - prev;
  const head =
    last || prev
      ? `בשבוע שעבר נרשמו ${last} נוכחויות${prev ? `, ${diff === 0 ? 'כמו ב' : diff > 0 ? `${diff} יותר מ` : `${-diff} פחות מ`}שבוע שלפניו` : ''}`
      : 'נוכחויות לפי שבוע';
  return (
    <div className="panel">
      <h2>{head}</h2>
      <p className="muted small" style={{ marginTop: 4 }}>
        סך סימוני ״הגיע״ בכל החוגים, 12 השבועות האחרונים. העמודה הבהירה היא השבוע הנוכחי.
      </p>
      <div className="trend" role="img" aria-label={weeks.map((w) => `${dm(w.week)}: ${w.arrived}`).join(', ')}>
        {weeks.map((w, i) => (
          <div key={w.week} className={`tcol ${i === weeks.length - 1 ? 'cur' : ''}`}>
            <div className="tbx">
              <i style={{ height: `${((86 * w.arrived) / max).toFixed(1)}%` }}>
                <span>{w.arrived || ''}</span>
              </i>
            </div>
            <span className="tl">{dm(w.week)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowUp() {
  const { S, X } = useData();
  const [all, setAll] = useState(false);
  const list = followUpList(S, X);
  const shown = all ? list : list.slice(0, 7);
  const table = (): Table => ({
    name: 'לא הגיעו לאחרונה',
    head: ['תלמיד/ה', 'חוג', 'שם האם', 'טלפון', 'מפגשים אחרונים'],
    rows: list.map((r) => [
      r.enrollment.st.name,
      r.course.name,
      r.enrollment.st.mother || '',
      fmtPhone(r.enrollment.st.phone),
      r.dates.map((d, i) => dm(d) + (r.marks[i] === 'x' ? ' X' : ' –')).join(', '),
    ]),
  });
  return (
    <div className="panel">
      <div className="row">
        <h2 className="grow">
          {list.length
            ? `${list.length} תלמידים לא הגיעו ל-3 המפגשים האחרונים`
            : 'כל התלמידים הפעילים הגיעו לפחות פעם אחת לאחרונה'}
        </h2>
        {list.length > 0 && <TableActions table={table} copyLabel="העתקה" />}
      </div>
      <p className="muted small" style={{ marginTop: 4 }}>
        תלמידים פעילים בלי סימון ״הגיע״ באף אחד משלושת המפגשים האחרונים של החוג. כדאי ליצור קשר.
      </p>
      {list.length > 0 && (
        <div className="risk">
          {shown.map((r) => (
            <div key={r.enrollment.id} className="rk">
              <span>
                <Link to={`/admin/student/${r.enrollment.studentId}`}>
                  <b>{r.enrollment.st.name}</b>
                </Link>{' '}
                <span className="muted small">· {r.course.name}</span>
              </span>
              {r.enrollment.st.phone ? (
                <span className="rk-contact">
                  <a className="tel" href={telHref(r.enrollment.st.phone)}>
                    {fmtPhone(r.enrollment.st.phone)}
                  </a>
                  {waNumber(r.enrollment.st.phone) && (
                    <a
                      className="wa"
                      href={waHref(
                        r.enrollment.st.phone,
                        parentText(r.enrollment.st.mother, r.enrollment.st.name, r.course.name),
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`הודעה בוואטסאפ ל${r.enrollment.st.mother || 'הורים'}`}
                    >
                      וואטסאפ
                    </a>
                  )}
                </span>
              ) : (
                <span className="muted small">אין טלפון</span>
              )}
              <span className="meta">
                {r.enrollment.st.mother && <span>אם: {r.enrollment.st.mother}</span>}
                <span className="dots">
                  {r.marks.map((m, i) => (
                    <i key={i} className={`dot ${m}`} title={dm(r.dates[i])} />
                  ))}
                </span>
                <span>{r.dates.map(dm).join(' · ')}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {list.length > 7 && (
        <button className="link" style={{ marginTop: 8 }} onClick={() => setAll(!all)}>
          {all ? 'הצגת פחות' : `הצגת כל ה-${list.length}`}
        </button>
      )}
    </div>
  );
}

export default function Overview() {
  const { S, X } = useData();
  const [showAllNotes, setShowAllNotes] = useState(false);
  const active = Object.entries(S.courses).filter(([, c]) => c && !c.archived);
  let tv = 0;
  let tx = 0;
  for (const [id] of active) {
    const s = courseStats(X, id);
    tv += s.v;
    tx += s.x;
  }
  const tp = tv + tx ? Math.round((100 * tv) / (tv + tx)) : null;
  const uniq = new Set(
    Object.values(S.enrollments)
      .filter((e) => e.active && S.courses[e.courseId] && !S.courses[e.courseId].archived)
      .map((e) => e.studentId),
  ).size;
  const notesCount = allNotes(S).length;

  return (
    <>
      <h1>מבט-על</h1>
      <div className="kpis">
        <Link className="kpi kpi-link" to="/admin/courses">
          <b>{active.length}</b>חוגים פעילים ←
        </Link>
        <Link className="kpi kpi-link" to="/admin/students">
          <b>{uniq}</b>תלמידים פעילים ←
        </Link>
        <div className="kpi">
          <b>{pctText(tp)}</b>נוכחות כוללת
        </div>
      </div>
      <WeekBoard />
      <div style={{ marginTop: 22 }}>
        <FollowUp />
      </div>
      <details className="fold">
        <summary>גרף נוכחויות לפי שבוע (12 השבועות האחרונים)</summary>
        <Trend />
      </details>
      <h2 className="sec">
        הערות אחרונות<span className="muted">מכל החוגים, החדשות למעלה</span>
      </h2>
      <NotesTable limit={showAllNotes ? 0 : 25} />
      {!showAllNotes && notesCount > 25 && (
        <button className="ghost sm" style={{ marginTop: 10 }} onClick={() => setShowAllNotes(true)}>
          הצגת כל ההערות
        </button>
      )}
    </>
  );
}
