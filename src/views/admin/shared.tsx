import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActions } from '../../data/actions';
import { useData } from '../../data/DataContext';
import { compact, dayName, dm, formatTimestamp } from '../../lib/dates';
import { allNotes, type NoteRow } from '../../lib/stats';
import { ConfirmModal } from '../../ui/Modal';

export function PctBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="muted">–</span>;
  return (
    <div className="pct">
      <div className="bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}%</span>
    </div>
  );
}

export function NotesTable({ courseId, limit }: { courseId?: string; limit?: number }) {
  const { S } = useData();
  const actions = useActions();
  const [del, setDel] = useState<NoteRow | null>(null);
  let list = allNotes(S, courseId);
  if (limit) list = list.slice(0, limit);
  if (!list.length) return <div className="quiet">אין הערות{courseId ? ' בחוג הזה' : ''}.</div>;
  return (
    <>
      <div className="tblwrap">
        <table className="notetbl">
          <thead>
            <tr>
              <th>מפגש</th>
              {!courseId && <th>חוג</th>}
              <th>תלמיד/ה</th>
              <th>הערה</th>
              <th>נכתבה</th>
              {courseId && <th />}
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={`${x.id}|${x.sid}`}>
                <td>
                  <Link to={`/admin/session/${x.courseId}/${compact(x.date)}`}>{dm(x.date)}</Link>{' '}
                  <span className="muted small">{dayName(x.date)}</span>
                </td>
                {!courseId && (
                  <td>
                    <Link to={`/admin/course/${x.courseId}`}>{S.courses[x.courseId]?.name}</Link>
                  </td>
                )}
                <td>
                  {x.sid ? (
                    <>
                      <Link to={`/admin/student/${x.sid}`}>{S.students[x.sid]?.name || '?'}</Link>
                      {x.s === 'v' && <span className="tag">הגיע/ה</span>}
                      {x.s === 'x' && <span className="tag red">לא הגיע/ה</span>}
                    </>
                  ) : (
                    <span className="tag br">הערת מפגש</span>
                  )}
                </td>
                <td className="nt">{x.n}</td>
                <td className="muted small">{formatTimestamp(x.t)}</td>
                {/* Deleting is kept to a course's own register, away from the busy overview. */}
                {courseId && (
                  <td>
                    <button className="ghost sm" onClick={() => setDel(x)}>
                      מחיקה
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {del && (
        <ConfirmModal
          text={`למחוק את ההערה של ${del.sid ? S.students[del.sid]?.name || '' : 'המפגש'} מ-${dm(del.date)}?`}
          okText="מחיקה"
          danger
          onOk={() =>
            del.sid
              ? actions.setNote(del.courseId, del.date, del.sid, '')
              : actions.setSessionNote(del.courseId, del.date, '')
          }
          onClose={() => setDel(null)}
        />
      )}
    </>
  );
}
