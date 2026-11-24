import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../data/DataContext';
import { byName, fmtPhone } from '../../lib/format';
import type { Table } from '../../lib/csv';
import { TableActions } from '../../ui/TableActions';

type Filter = 'all' | 'act' | 'none';

export default function Students() {
  const { S, X } = useData();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('all');
  const query = q.trim();
  const qd = query.replace(/\D/g, '');
  const encBy = X.enrollmentsByStudent;
  const all = Object.entries(S.students)
    .filter(([, s]) => s)
    .map(([id, s]) => ({ id, ...s }));
  const isAct = (id: string) =>
    (encBy[id] || []).some((e) => e.active && S.courses[e.courseId] && !S.courses[e.courseId].archived);
  const list = all
    .filter((s) => f === 'all' || (f === 'act' ? isAct(s.id) : !isAct(s.id)))
    .filter(
      (s) =>
        !query ||
        (s.name || '').includes(query) ||
        (s.mother || '').includes(query) ||
        (qd.length >= 3 && (s.phone || '').includes(qd)),
    )
    .sort(byName);
  const nAct = all.filter((s) => isAct(s.id)).length;
  const courseList = (id: string) =>
    (encBy[id] || []).map((e) => (S.courses[e.courseId]?.name || '') + (e.active ? '' : ' (הוסר)')).join(', ');
  const table = (): Table => ({
    name: 'תלמידים',
    head: ['שם', 'שם האם', 'טלפון', 'גיל', 'חוגים'],
    rows: list.map((s) => [s.name, s.mother || '', fmtPhone(s.phone), s.age || '', courseList(s.id)]),
  });
  const seg = (k: Filter, label: string) => (
    <button className={`ghost sm ${f === k ? 'on' : ''}`} aria-pressed={f === k} onClick={() => setF(k)}>
      {label}
    </button>
  );

  return (
    <>
      <div className="row">
        <h1 className="grow">תלמידים</h1>
        <span className="muted">
          {list.length} מתוך {all.length}
        </span>
      </div>
      <div className="toolbar">
        <input
          type="search"
          placeholder="חיפוש לפי שם, שם האם או טלפון"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="חיפוש תלמידים"
        />
        <div className="row" style={{ gap: 6 }}>
          {seg('all', 'כולם')}
          {seg('act', `משובצים (${nAct})`)}
          {seg('none', `ללא חוג פעיל (${all.length - nAct})`)}
        </div>
        <TableActions table={table} />
      </div>
      {list.length ? (
        <div className="tblwrap">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>שם האם</th>
                <th>טלפון</th>
                <th>גיל</th>
                <th>חוגים</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 500).map((s) => (
                <tr key={s.id} className="click" onClick={() => nav(`/admin/student/${s.id}`)}>
                  <td>
                    <b>{s.name}</b>
                  </td>
                  <td>{s.mother}</td>
                  <td className="ph">{fmtPhone(s.phone)}</td>
                  <td>{s.age}</td>
                  <td>
                    <div className="chips">
                      {(encBy[s.id] || []).map((e) => (
                        <span key={e.id} className={`chip ${e.active ? '' : 'x'}`}>
                          {S.courses[e.courseId]?.name || '?'}
                          {e.active ? '' : ' · הוסר'}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="quiet">לא נמצאו תלמידים.</div>
      )}
    </>
  );
}
