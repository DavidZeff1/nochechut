import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { DAYS, dmy } from '../../lib/dates';
import { pctText } from '../../lib/format';
import type { Table } from '../../lib/csv';
import { countMarks, courseSessions, courseStats } from '../../lib/stats';
import { InstructorNames } from '../../ui/Avatar';
import { CourseImage } from '../../ui/CourseImage';
import { TableActions } from '../../ui/TableActions';
import { CourseDialog } from './dialogs';
import { PctBar } from './shared';

/** Every course with its day, instructors, students and attendance. */
export default function Courses() {
  const { S, X } = useData();
  const nav = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState('');
  const [newCourse, setNewCourse] = useState(false);
  const query = q.trim();
  const archivedN = Object.values(S.courses).filter((c) => c.archived).length;
  const list = Object.entries(S.courses)
    .map(([id, c]) => ({ id, ...c }))
    .filter((c) => showArchived || !c.archived)
    .filter((c) => !query || c.name.includes(query) || (c.instructors || []).some((n) => n.includes(query)))
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
  const table = (): Table => ({
    name: 'חוגים',
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

  return (
    <>
      <div className="row">
        <h1 className="grow">חוגים</h1>
        <button className="pri" onClick={() => setNewCourse(true)}>
          + חוג חדש
        </button>
      </div>
      <p className="muted">
        {Object.values(S.courses).filter((c) => !c.archived).length} חוגים פעילים. לחיצה על חוג פותחת את רישום הנוכחות
        שלו.
      </p>
      <div className="toolbar">
        <input
          type="search"
          placeholder="חיפוש לפי שם חוג או מדריך/ה"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="חיפוש חוג"
        />
        {archivedN > 0 && (
          <label className="chk">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> הצגת{' '}
            {archivedN} בארכיון
          </label>
        )}
        <span className="grow" />
        <TableActions table={table} />
      </div>
      {rows.length ? (
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
                    <td>
                      {(c.instructors || []).length ? (
                        <InstructorNames names={c.instructors} size={22} />
                      ) : (
                        <span className="muted">–</span>
                      )}
                    </td>
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
      ) : (
        <div className="quiet">{query ? 'אין חוג שמתאים לחיפוש.' : 'עוד אין חוגים. מוסיפים עם "+ חוג חדש".'}</div>
      )}
      {newCourse && <CourseDialog cid={null} onClose={() => setNewCourse(false)} />}
    </>
  );
}
