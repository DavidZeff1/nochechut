import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { dm, dmy } from '../../lib/dates';
import { fmtPhone, telHref } from '../../lib/format';
import { studentStats } from '../../lib/stats';
import { CourseImage } from '../../ui/CourseImage';
import { EnrollStudentDialog, StudentDialog } from './dialogs';
import { PctBar } from './shared';

export default function StudentPage() {
  const { sid = '' } = useParams();
  const { S, X } = useData();
  const [dlg, setDlg] = useState<'edit' | 'enroll' | null>(null);
  const s = S.students[sid];
  if (!s)
    return (
      <div className="empty">
        התלמיד/ה לא נמצא/ה.
        <br />
        <br />
        <Link className="btn ghost" to="/admin/students">
          לכל התלמידים
        </Link>
      </div>
    );
  const ens = X.enrollmentsByStudent[sid] || [];
  return (
    <>
      <div className="row">
        <Link className="btn ghost sm" to="/admin/students">
          → כל התלמידים
        </Link>
      </div>
      <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <div className="grow">
          <h1>{s.name}</h1>
          <div className="meta" style={{ fontSize: 15, marginTop: 6 }}>
            {s.mother && <span>אם: {s.mother}</span>}
            {s.phone && (
              <a className="tel" href={telHref(s.phone)}>
                {fmtPhone(s.phone)}
              </a>
            )}
            {s.age && <span>גיל {s.age}</span>}
            {s.birthDate && <span>נולד/ה {dmy(s.birthDate)}</span>}
          </div>
        </div>
        <div className="row">
          <button className="ghost" onClick={() => setDlg('edit')}>
            עריכת פרטים
          </button>
          <button className="ghost" onClick={() => setDlg('enroll')}>
            שיבוץ לחוג
          </button>
        </div>
      </div>
      <div className="scards">
        {ens.length ? (
          ens.map((e) => {
            const c = S.courses[e.courseId];
            const st = studentStats(X, e.courseId, sid);
            return (
              <div key={e.id} className="panel scard">
                {c && <CourseImage course={c} className="scard-art" sizes="(max-width: 600px) 100vw, 360px" />}
                <div className="row">
                  <h3 className="grow">
                    {c ? <Link to={`/admin/course/${e.courseId}`}>{c.name}</Link> : '(חוג שנמחק)'}
                  </h3>
                  {e.active ? (
                    <span className="tag">פעיל</span>
                  ) : (
                    <span className="tag red">הוסר {e.removedAt ? dmy(e.removedAt) : ''}</span>
                  )}
                </div>
                <div className="row small" style={{ margin: '10px 0', gap: 14 }}>
                  <span>
                    <b className="cv">{st.v}</b> הגיע/ה
                  </span>
                  <span>
                    <b className="cx">{st.x}</b> לא הגיע/ה
                  </span>
                  <span className="grow">
                    <PctBar pct={st.pct} />
                  </span>
                </div>
                <div className="chips">
                  {st.items.length ? (
                    st.items.map((i) => (
                      <span key={i.date} className={`chip ${i.s}`} title={i.n}>
                        {dm(i.date)} {i.s === 'v' ? '✓' : i.s === 'x' ? '✗' : '•'}
                      </span>
                    ))
                  ) : (
                    <span className="muted small">אין רישומי נוכחות</span>
                  )}
                </div>
                {st.items.some((i) => i.n) && (
                  <ul className="notes">
                    {st.items
                      .filter((i) => i.n)
                      .map((i) => (
                        <li key={i.date}>
                          <b>{dm(i.date)}</b>
                          {i.n}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          })
        ) : (
          <div className="quiet">לא משובץ/ת באף חוג.</div>
        )}
      </div>
      {dlg === 'edit' && <StudentDialog sid={sid} onClose={() => setDlg(null)} />}
      {dlg === 'enroll' && <EnrollStudentDialog sid={sid} onClose={() => setDlg(null)} />}
    </>
  );
}
