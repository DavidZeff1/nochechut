import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useActions } from '../../data/actions';
import { useData } from '../../data/DataContext';
import { compact, DAYS, dm, DSHORT, parseISO, today } from '../../lib/dates';
import { byName, fmtPhone, pctText } from '../../lib/format';
import type { Table } from '../../lib/csv';
import {
  countMarks,
  courseEnrollments,
  courseSessions,
  courseStats,
  getRecord,
  sessId,
  studentStats,
} from '../../lib/stats';
import type { EnrollmentRow } from '../../lib/types';
import { CourseImage } from '../../ui/CourseImage';
import { ConfirmModal } from '../../ui/Modal';
import { TableActions } from '../../ui/TableActions';
import { AddToCourseDialog, CellDialog, ColumnMenu, CourseDialog, LinksDialog, SplitDialog } from './dialogs';
import { NotesTable, PctBar } from './shared';

type Dlg =
  | { k: 'edit' }
  | { k: 'split' }
  | { k: 'links' }
  | { k: 'add' }
  | { k: 'cell'; date: string; sid: string }
  | { k: 'col'; date: string }
  | { k: 'remove'; e: EnrollmentRow }
  | null;

export default function CourseRegister() {
  const { cid = '' } = useParams();
  const { S, X } = useData();
  const actions = useActions();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [showRemoved, setShowRemoved] = useState(true);
  const [openDate, setOpenDate] = useState(today());
  const [dlg, setDlg] = useState<Dlg>(null);
  const c = S.courses[cid];
  // Open the register scrolled to the newest meetings (the far, left end in RTL).
  const wrapRef = useRef<HTMLDivElement>(null);
  const newest = courseSessions(X, cid).at(-1)?.date || '';
  useEffect(() => {
    wrapRef.current?.scrollTo({ left: -wrapRef.current.scrollWidth });
  }, [cid, newest]);
  if (!c)
    return (
      <div className="empty">
        החוג לא נמצא.
        <br />
        <br />
        <Link className="btn ghost" to="/admin">
          חזרה למבט-על
        </Link>
      </div>
    );

  const query = q.trim();
  const ensAll = courseEnrollments(X, cid)
    .slice()
    .sort(
      (a, b) =>
        (b.active ? 1 : 0) - (a.active ? 1 : 0) ||
        (a.group || '').localeCompare(b.group || '', 'he') ||
        byName(a.st, b.st),
    );
  const ens = ensAll.filter(
    (e) =>
      (showRemoved || e.active) && (!query || (e.st.name || '').includes(query) || (e.st.mother || '').includes(query)),
  );
  const dates = courseSessions(X, cid).map((s) => s.date);
  const st = courseStats(X, cid);
  const removedN = ensAll.filter((e) => !e.active).length;
  const counts = dates.map((d) => countMarks(S.sessions[sessId(cid, d)]?.records).v);

  const table = (): Table => ({
    name: c.name,
    head: ['שם התלמיד/ה', 'שם האם', 'טלפון', 'גיל', 'אחוז נוכחות', ...dates.map(dm)],
    rows: ens.map((e) => {
      const sum = studentStats(X, cid, e.studentId);
      return [
        e.st.name + (e.active ? '' : ' (הוסר)'),
        e.st.mother || '',
        fmtPhone(e.st.phone),
        e.st.age || '',
        sum.pct == null ? '' : `${sum.pct}%`,
        ...dates.map((d) => {
          const r = getRecord(S, cid, d, e.studentId);
          return (r.s === 'v' ? 'V' : r.s === 'x' ? 'X' : '') + (r.n ? `${r.s ? ' ' : ''}(${r.n})` : '');
        }),
      ];
    }),
  });

  return (
    <>
      <div className="row">
        <Link className="btn ghost sm" to="/admin">
          → מבט-על
        </Link>
      </div>
      <div className="course-hero">
        <CourseImage course={c} className="hero-art" sizes="(max-width: 900px) 100vw, 520px" eager />
        <div className="hero-text">
          <h1>{c.name}</h1>
          <div className="muted">
            {[
              c.day != null ? `יום ${DAYS[c.day]}` : '',
              c.time,
              c.instructors?.length ? `מדריכים: ${c.instructors.join(', ')}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            {c.archived && <span className="tag red">בארכיון</span>}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="ghost" onClick={() => setDlg({ k: 'edit' })}>
              עריכת חוג ותמונה
            </button>
            <button className="ghost" onClick={() => setDlg({ k: 'split' })}>
              פיצול חוג
            </button>
            <button className="ghost" onClick={() => setDlg({ k: 'links' })}>
              קישורים למדריך
            </button>
          </div>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <b>{st.active}</b>תלמידים פעילים
        </div>
        <div className="kpi">
          <b>{st.held}</b>מפגשים
        </div>
        <div className="kpi">
          <b>{pctText(st.pct)}</b>אחוז נוכחות
        </div>
        <div className="kpi">
          <b>{st.last ? dm(st.last) : '–'}</b>מפגש אחרון
        </div>
      </div>
      <div className="toolbar">
        <button className="pri sm" onClick={() => setDlg({ k: 'add' })}>
          + הוספת תלמיד/ה
        </button>
        <input
          type="date"
          className="date-sm"
          value={openDate}
          onChange={(e) => setOpenDate(e.target.value)}
          aria-label="תאריך מפגש"
        />
        <button className="ghost sm" onClick={() => nav(`/admin/session/${cid}/${compact(openDate || today())}`)}>
          פתיחת מפגש לעריכה
        </button>
        <span className="grow" />
        <TableActions table={table} />
      </div>
      <div className="toolbar" style={{ marginTop: 0 }}>
        <input
          type="search"
          placeholder="סינון לפי שם תלמיד/ה או אם"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="סינון"
        />
        {removedN > 0 && (
          <label className="chk">
            <input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} /> הצגת{' '}
            {removedN} שהוסרו
          </label>
        )}
      </div>
      <p className="muted small" style={{ margin: '0 0 8px' }}>
        לחיצה על משבצת מתקנת נוכחות או הערה (הערות מופיעות בחום מתחת לסימון). לחיצה על תאריך: עריכת המפגש, הערת מפגש או
        מחיקת העמודה.
      </p>
      {ens.length ? (
        <div className="tblwrap" ref={wrapRef}>
          <table className="reg">
            <thead>
              <tr>
                <th className="fix">שם התלמיד/ה</th>
                <th>שם האם</th>
                <th>טלפון</th>
                <th>גיל</th>
                <th>נוכחות</th>
                {dates.map((d) => {
                  const note = S.sessions[sessId(cid, d)]?.note;
                  return (
                    <th
                      key={d}
                      className={`d ${note ? 'hasnote' : ''}`}
                      title={note || ''}
                      tabIndex={0}
                      onClick={() => setDlg({ k: 'col', date: d })}
                      onKeyDown={(ev) => ev.key === 'Enter' && setDlg({ k: 'col', date: d })}
                    >
                      {dm(d)}
                      <small>
                        {DSHORT[parseISO(d).getDay()]}
                        {note ? ' · הערה' : ''}
                      </small>
                    </th>
                  );
                })}
                <th />
              </tr>
            </thead>
            <tbody>
              {ens.map((e) => {
                const sum = studentStats(X, cid, e.studentId);
                return (
                  <tr key={e.id} className={e.active ? '' : 'removed'}>
                    <td className="fix">
                      <Link to={`/admin/student/${e.studentId}`}>{e.st.name}</Link>
                      {e.group && <span className="muted small"> {e.group}</span>}
                      {!e.active && <span className="tag red">הוסר {e.removedAt ? dm(e.removedAt) : ''}</span>}
                    </td>
                    <td>{e.st.mother}</td>
                    <td className="ph">{fmtPhone(e.st.phone)}</td>
                    <td>{e.st.age}</td>
                    <td>
                      <PctBar pct={sum.pct} />
                    </td>
                    {dates.map((d) => {
                      if (!e.active && e.removedAt && d >= e.removedAt)
                        return (
                          <td key={d} className="c off" title="אחרי ההסרה">
                            ·
                          </td>
                        );
                      const r = getRecord(S, cid, d, e.studentId);
                      return (
                        <td
                          key={d}
                          className={`c ${r.s}`}
                          title={r.n}
                          tabIndex={0}
                          data-testid={`cell-${e.studentId}-${compact(d)}`}
                          onClick={() => setDlg({ k: 'cell', date: d, sid: e.studentId })}
                          onKeyDown={(ev) => ev.key === 'Enter' && setDlg({ k: 'cell', date: d, sid: e.studentId })}
                        >
                          {r.s === 'v' ? '✓' : r.s === 'x' ? '✗' : ''}
                          {r.n && <small>{r.n}</small>}
                        </td>
                      );
                    })}
                    <td>
                      {e.active ? (
                        <button className="ghost sm" onClick={() => setDlg({ k: 'remove', e })}>
                          הסרה
                        </button>
                      ) : (
                        <button className="ghost sm" onClick={() => actions.restoreEnrollment(e.id)}>
                          החזרה
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="fix">הגיעו</td>
                <td />
                <td />
                <td />
                <td />
                {counts.map((n, i) => (
                  <td key={dates[i]} style={{ textAlign: 'center' }}>
                    {n}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="quiet">{ensAll.length ? 'אין תלמידים שמתאימים לסינון.' : 'אין עדיין תלמידים בחוג.'}</div>
      )}
      <h2 className="sec">הערות בחוג</h2>
      <NotesTable courseId={cid} />

      {dlg?.k === 'edit' && <CourseDialog cid={cid} onClose={() => setDlg(null)} />}
      {dlg?.k === 'split' && <SplitDialog cid={cid} onClose={() => setDlg(null)} />}
      {dlg?.k === 'links' && <LinksDialog cid={cid} onClose={() => setDlg(null)} />}
      {dlg?.k === 'add' && <AddToCourseDialog cid={cid} onClose={() => setDlg(null)} />}
      {dlg?.k === 'cell' && <CellDialog cid={cid} date={dlg.date} sid={dlg.sid} onClose={() => setDlg(null)} />}
      {dlg?.k === 'col' && <ColumnMenu cid={cid} date={dlg.date} onClose={() => setDlg(null)} />}
      {dlg?.k === 'remove' && (
        <ConfirmModal
          text={`להסיר את ${dlg.e.st.name} מהחוג? ההיסטוריה והערות העבר יישמרו.`}
          okText="הסרה"
          danger
          onOk={() => actions.removeEnrollment(dlg.e.id)}
          onClose={() => setDlg(null)}
        />
      )}
    </>
  );
}
