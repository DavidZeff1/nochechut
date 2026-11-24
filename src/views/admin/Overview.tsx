import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { compact, DAYS, dm, dmy, today } from '../../lib/dates';
import { fmtPhone, pctText, telHref } from '../../lib/format';
import type { Table } from '../../lib/csv';
import {
  allNotes,
  countMarks,
  courseSessions,
  courseStats,
  followUpList,
  weekBoard,
  weeklyTrend,
} from '../../lib/stats';
import { CourseImage } from '../../ui/CourseImage';
import { TableActions } from '../../ui/TableActions';
import { CourseDialog } from './dialogs';
import { PctBar, NotesTable } from './shared';

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
                <button
                  key={it.course.id}
                  className={`witem ${it.state}`}
                  onClick={() => nav(`/admin/session/${it.course.id}/${compact(it.date)}`)}
                >
                  <b>{it.course.name}</b>
                  <span>
                    {it.course.time ? `${it.course.time} · ` : ''}
                    {it.state === 'ok' ? `${it.v} הגיעו` : it.state === 'miss' ? 'לא סומן' : 'בהמשך השבוע'}
                  </span>
                </button>
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
                <a className="tel" href={telHref(r.enrollment.st.phone)}>
                  {fmtPhone(r.enrollment.st.phone)}
                </a>
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
  const nav = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [newCourse, setNewCourse] = useState(false);
  const list = Object.entries(S.courses)
    .map(([id, c]) => ({ id, ...c }))
    .filter((c) => showArchived || !c.archived)
    .sort(
      (a, b) =>
        (a.archived ? 1 : 0) - (b.archived ? 1 : 0) ||
        (a.day ?? 9) - (b.day ?? 9) ||
        (a.time || '').localeCompare(b.time || ''),
    );
  let tv = 0;
  let tx = 0;
  let ta = 0;
  let th = 0;
  const rows = list.map((c) => {
    const s = courseStats(X, c.id);
    if (!c.archived) {
      tv += s.v;
      tx += s.x;
      ta += s.active;
      th += s.held;
    }
    return { c, s };
  });
  const tp = tv + tx ? Math.round((100 * tv) / (tv + tx)) : null;
  const uniq = new Set(
    Object.values(S.enrollments)
      .filter((e) => e.active && S.courses[e.courseId] && !S.courses[e.courseId].archived)
      .map((e) => e.studentId),
  ).size;
  const table = (): Table => ({
    name: 'מבט-על',
    head: ['חוג', 'יום', 'שעה', 'מדריכים', 'תלמידים פעילים', 'מפגשים', 'אחוז נוכחות', 'מפגש אחרון'],
    rows: rows.map(({ c, s }) => [
      c.name,
      c.day != null ? DAYS[c.day] : '',
      c.time || '',
      (c.instructors || []).join(', '),
      s.active,
      s.held,
      s.pct == null ? '' : `${s.pct}%`,
      s.last ? dmy(s.last) : '',
    ]),
  });
  const notesCount = allNotes(S).length;

  return (
    <>
      <div className="row">
        <h1 className="grow">מבט-על</h1>
        <button className="pri" onClick={() => setNewCourse(true)}>
          + חוג חדש
        </button>
      </div>
      <div className="kpis">
        <div className="kpi">
          <b>{list.filter((c) => !c.archived).length}</b>חוגים פעילים
        </div>
        <div className="kpi">
          <b>{uniq}</b>משתתפים שונים
        </div>
        <div className="kpi">
          <b>{ta}</b>שיבוצים פעילים
        </div>
        <div className="kpi">
          <b>{th}</b>מפגשים שנרשמו
        </div>
        <div className="kpi">
          <b>{pctText(tp)}</b>נוכחות כוללת
        </div>
      </div>
      <WeekBoard />
      <div className="two" style={{ marginTop: 22 }}>
        <Trend />
        <FollowUp />
      </div>
      <h2 className="sec">כל החוגים</h2>
      <div className="toolbar" style={{ marginTop: 0 }}>
        <label className="chk">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> הצגת
          חוגים בארכיון
        </label>
        <span className="grow" />
        <TableActions table={table} />
      </div>
      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>חוג</th>
              <th>יום ושעה</th>
              <th>מדריכים</th>
              <th className="num">פעילים</th>
              <th className="num">מפגשים</th>
              <th>נוכחות</th>
              <th>8 מפגשים אחרונים</th>
              <th>מפגש אחרון</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, s }) => {
              const spark = courseSessions(X, c.id)
                .slice(-8)
                .map((se) => countMarks(se.records).v);
              const m = Math.max(1, ...spark);
              return (
                <tr key={c.id} className="click" onClick={() => nav(`/admin/course/${c.id}`)}>
                  <td>
                    <span className="cname">
                      <CourseImage course={c} className="thumb" sizes="64px" />
                      <Link to={`/admin/course/${c.id}`} onClick={(e) => e.stopPropagation()}>
                        <b>{c.name}</b>
                      </Link>
                      {c.archived && <span className="tag red">ארכיון</span>}
                    </span>
                  </td>
                  <td>
                    {c.day != null ? DAYS[c.day] : '–'}
                    {c.time ? ` ${c.time}` : ''}
                  </td>
                  <td>{(c.instructors || []).join(', ') || <span className="muted">–</span>}</td>
                  <td className="num">{s.active}</td>
                  <td className="num">{s.held}</td>
                  <td>
                    <PctBar pct={s.pct} />
                  </td>
                  <td>
                    {spark.length ? (
                      <span className="spark" title={`הגיעו ב-${spark.length} המפגשים האחרונים: ${spark.join(', ')}`}>
                        {spark.map((v, i) => (
                          <i key={i} style={{ height: `${Math.max(8, (100 * v) / m)}%` }} />
                        ))}
                      </span>
                    ) : (
                      <span className="muted">–</span>
                    )}
                  </td>
                  <td>{s.last ? dmy(s.last) : '–'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>סה״כ</td>
              <td />
              <td />
              <td className="num">{ta}</td>
              <td className="num">{th}</td>
              <td>{pctText(tp)}</td>
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <h2 className="sec">
        הערות אחרונות<span className="muted">מכל החוגים, החדשות למעלה</span>
      </h2>
      <NotesTable limit={showAllNotes ? 0 : 25} />
      {!showAllNotes && notesCount > 25 && (
        <button className="ghost sm" style={{ marginTop: 10 }} onClick={() => setShowAllNotes(true)}>
          הצגת כל ההערות
        </button>
      )}
      {newCourse && <CourseDialog cid={null} onClose={() => setNewCourse(false)} />}
    </>
  );
}
