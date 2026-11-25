import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActions } from '../../data/actions';
import { useData } from '../../data/DataContext';
import { compact, DAYS, dayName, dm, today } from '../../lib/dates';
import { fmtPhone, splitInstructors } from '../../lib/format';
import { courseImage } from '../../lib/images';
import { getRecord, rosterFor, sessId } from '../../lib/stats';
import type { Course, Mark } from '../../lib/types';
import { ConfirmModal, CopyFallbackModal, Modal } from '../../ui/Modal';
import { copyToClipboard, useToast } from '../../ui/Toast';

export function CourseDialog({ cid, onClose }: { cid: string | null; onClose: () => void }) {
  const { S } = useData();
  const actions = useActions();
  const nav = useNavigate();
  const c: Course = (cid && S.courses[cid]) || { name: '', day: null, time: '', instructors: [], archived: false };
  const [name, setName] = useState(c.name);
  const [day, setDay] = useState(c.day == null ? '' : String(c.day));
  const [time, setTime] = useState(c.time || '');
  const [ins, setIns] = useState((c.instructors || []).join(', '));
  const [archived, setArchived] = useState(!!c.archived);
  const [image, setImage] = useState(c.image || '');
  const preview = courseImage({ name: name || c.name, image });

  return (
    <Modal title={cid ? 'עריכת חוג' : 'חוג חדש'} onClose={onClose}>
      <img className="dlg-art" src={preview.src} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      {image && (
        <div className="row">
          <button className="link small" onClick={() => setImage('')}>
            חזרה לאיור לפי סוג החוג
          </button>
        </div>
      )}
      <label className="fld">
        שם החוג *<input id="cName" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="f2">
        <label className="fld">
          יום
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">ללא</option>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          שעה
          <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="17:30" inputMode="numeric" />
        </label>
      </div>
      <label className="fld">
        מדריכים (מופרדים בפסיק)
        <input value={ins} onChange={(e) => setIns(e.target.value)} />
      </label>
      {cid && (
        <label className="chk">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          העברה לארכיון (החוג יוסתר מהמדריכים, ההיסטוריה נשמרת)
        </label>
      )}
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          onClick={() => {
            if (!name.trim()) return;
            const id = actions.saveCourse(cid, {
              name: name.trim(),
              day: day === '' ? null : +day,
              time: time.trim(),
              instructors: splitInstructors(ins),
              archived,
              image,
            });
            onClose();
            if (!cid) nav(`/admin/course/${id}`);
          }}
        >
          שמירה
        </button>
      </div>
    </Modal>
  );
}

export function CellDialog({
  cid,
  date,
  sid,
  onClose,
}: {
  cid: string;
  date: string;
  sid: string;
  onClose: () => void;
}) {
  const { S } = useData();
  const actions = useActions();
  const r = getRecord(S, cid, date, sid);
  const [s, setS] = useState<Mark>(r.s);
  const [n, setN] = useState(r.n);
  return (
    <Modal title={`${S.students[sid]?.name || ''} · ${dm(date)} (${dayName(date)})`} onClose={onClose}>
      <div className="seg">
        {(
          [
            ['v', '✓ הגיע/ה'],
            ['x', '✗ לא הגיע/ה'],
            ['', 'לא סומן'],
          ] as Array<[Mark, string]>
        ).map(([k, label]) => (
          <button key={k || 'n'} className={`${k || 'n'} ${s === k ? 'on' : ''}`} onClick={() => setS(k)}>
            {label}
          </button>
        ))}
      </div>
      <label className="fld">
        הערה
        <textarea rows={3} value={n} onChange={(e) => setN(e.target.value)} />
      </label>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          onClick={() => {
            if (s !== r.s || n.trim() !== r.n) actions.setRecord(cid, date, sid, { s, n: n.trim() });
            onClose();
          }}
        >
          שמירה
        </button>
      </div>
    </Modal>
  );
}

export function ColumnMenu({ cid, date, onClose }: { cid: string; date: string; onClose: () => void }) {
  const { S } = useData();
  const actions = useActions();
  const nav = useNavigate();
  const id = sessId(cid, date);
  const se = S.sessions[id];
  const [note, setNote] = useState(se?.note || '');
  const [confirm, setConfirm] = useState(false);
  const count = Object.values(se?.records || {}).filter((r) => r.s || r.n).length;
  if (confirm)
    return (
      <ConfirmModal
        text={`למחוק את המפגש ${dm(date)}? כל סימוני הנוכחות וההערות של התאריך הזה יימחקו לצמיתות.`}
        okText="מחיקת העמודה"
        danger
        onOk={() => actions.deleteSession(id)}
        onClose={onClose}
      />
    );
  return (
    <Modal title={`מפגש ${dm(date)} (יום ${dayName(date)})`} onClose={onClose}>
      <button className="pri" onClick={() => nav(`/admin/session/${cid}/${compact(date)}`)}>
        פתיחת המפגש לעריכה
      </button>
      <label className="fld">
        הערה למפגש כולו (למשל: בוטל, מדריכה מחליפה)
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button
        className="ghost"
        onClick={() => {
          actions.setSessionNote(cid, date, note.trim());
          onClose();
        }}
      >
        שמירת הערת המפגש
      </button>
      <hr className="sep" />
      <button className="danger" onClick={() => setConfirm(true)}>
        מחיקת העמודה ({count} רישומים)
      </button>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          סגירה
        </button>
      </div>
    </Modal>
  );
}

export function StudentDialog({ sid, onClose }: { sid: string; onClose: () => void }) {
  const { S } = useData();
  const actions = useActions();
  const s = S.students[sid] || { name: '' };
  const [f, setF] = useState({ name: s.name || '', mother: s.mother || '', phone: s.phone || '', age: s.age || '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="עריכת פרטי תלמיד/ה" onClose={onClose}>
      <div className="f2">
        <label className="fld">
          שם
          <input value={f.name} onChange={set('name')} />
        </label>
        <label className="fld">
          שם האם
          <input value={f.mother} onChange={set('mother')} />
        </label>
        <label className="fld">
          טלפון
          <input type="tel" value={f.phone} onChange={set('phone')} />
        </label>
        <label className="fld">
          גיל
          <input value={f.age} onChange={set('age')} />
        </label>
      </div>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          onClick={() => {
            if (!f.name.trim()) return;
            actions.saveStudent(sid, { ...f, name: f.name.trim(), mother: f.mother.trim(), age: f.age.trim() });
            onClose();
          }}
        >
          שמירה
        </button>
      </div>
    </Modal>
  );
}

/** Add a student to a course: search existing students or create a new one. */
export function AddToCourseDialog({ cid, onClose }: { cid: string; onClose: () => void }) {
  const { S } = useData();
  const actions = useActions();
  const [q, setQ] = useState('');
  const [f, setF] = useState({ name: '', mother: '', phone: '', age: '' });
  const inCourse = new Set(
    Object.values(S.enrollments)
      .filter((e) => e.courseId === cid && e.active)
      .map((e) => e.studentId),
  );
  const t = q.trim();
  const td = t.replace(/\D/g, '');
  const hits =
    t.length < 2
      ? []
      : Object.entries(S.students)
          .filter(
            ([, s]) =>
              (s.name || '').includes(t) ||
              (s.mother || '').includes(t) ||
              (td.length >= 3 && (s.phone || '').includes(td)),
          )
          .slice(0, 8);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={`הוספת תלמיד/ה ל${S.courses[cid]?.name || ''}`} onClose={onClose}>
      <label className="fld">
        חיפוש תלמיד/ה קיים/ת
        <input type="search" placeholder="שם, שם האם או טלפון" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {t.length >= 2 && (
        <div className="pick-list">
          {hits.map(([id, s]) => (
            <div key={id} className="row pick-row">
              <span className="grow">
                <b>{s.name}</b>{' '}
                <span className="muted small">
                  {s.mother} {fmtPhone(s.phone)}
                </span>
              </span>
              {inCourse.has(id) ? (
                <span className="tag">כבר בחוג</span>
              ) : (
                <button
                  className="pri sm"
                  onClick={() => {
                    actions.enroll(cid, id);
                    onClose();
                  }}
                >
                  שיבוץ
                </button>
              )}
            </div>
          ))}
          {!hits.length && <span className="muted small">לא נמצאו תלמידים</span>}
        </div>
      )}
      <details>
        <summary>או: תלמיד/ה חדש/ה</summary>
        <div className="f2" style={{ marginTop: 8 }}>
          <label className="fld">
            שם *<input value={f.name} onChange={set('name')} />
          </label>
          <label className="fld">
            שם האם
            <input value={f.mother} onChange={set('mother')} />
          </label>
          <label className="fld">
            טלפון
            <input type="tel" value={f.phone} onChange={set('phone')} />
          </label>
          <label className="fld">
            גיל
            <input value={f.age} onChange={set('age')} />
          </label>
        </div>
        <div className="row end" style={{ marginTop: 10 }}>
          <button
            className="pri"
            onClick={() => {
              if (!f.name.trim()) return;
              actions.createStudent({ ...f, name: f.name.trim() }, cid);
              onClose();
            }}
          >
            יצירה ושיבוץ
          </button>
        </div>
      </details>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          סגירה
        </button>
      </div>
    </Modal>
  );
}

export function EnrollStudentDialog({ sid, onClose }: { sid: string; onClose: () => void }) {
  const { S } = useData();
  const actions = useActions();
  const have = new Set(
    Object.values(S.enrollments)
      .filter((e) => e.studentId === sid && e.active)
      .map((e) => e.courseId),
  );
  const opts = Object.entries(S.courses).filter(([id, c]) => !c.archived && !have.has(id));
  const [pick, setPick] = useState(opts[0]?.[0] || '');
  return (
    <Modal title={`שיבוץ ${S.students[sid]?.name || ''} לחוג`} onClose={onClose}>
      <label className="fld">
        חוג
        <select value={pick} onChange={(e) => setPick(e.target.value)}>
          {opts.map(([id, c]) => (
            <option key={id} value={id}>
              {c.name}
              {c.day != null ? ` · ${DAYS[c.day]}` : ''}
              {c.time ? ` ${c.time}` : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          disabled={!pick}
          onClick={() => {
            actions.enroll(pick, sid);
            onClose();
          }}
        >
          שיבוץ
        </button>
      </div>
    </Modal>
  );
}

export function SplitDialog({ cid, onClose }: { cid: string; onClose: () => void }) {
  const { S, X } = useData();
  const actions = useActions();
  const nav = useNavigate();
  const c = S.courses[cid];
  const ros = rosterFor(X, cid, today());
  const groups = [...new Set(ros.map((e) => e.group || ''))];
  const [name, setName] = useState(`${c.name} – קבוצה ב`);
  const [time, setTime] = useState(c.time || '');
  const [day, setDay] = useState(c.day == null ? '' : String(c.day));
  const [ins, setIns] = useState((c.instructors || []).join(', '));
  const [rename, setRename] = useState(c.name);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (sid: string) => {
    const s = new Set(sel);
    if (s.has(sid)) s.delete(sid);
    else s.add(sid);
    setSel(s);
  };
  return (
    <Modal title={`פיצול ${c.name} לשני חוגים`} onClose={onClose}>
      <p className="small muted">מסמנים את התלמידים שעוברים לחוג החדש. הנוכחות וההערות שלהם מהעבר עוברות איתם.</p>
      <div className="f2">
        <label className="fld">
          שם החוג החדש *<input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="fld">
          שעה
          <input value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <div className="f2">
        <label className="fld">
          יום
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">ללא</option>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          מדריכים
          <input value={ins} onChange={(e) => setIns(e.target.value)} />
        </label>
      </div>
      <label className="fld">
        שם חדש לחוג הנוכחי (לא חובה)
        <input value={rename} onChange={(e) => setRename(e.target.value)} />
      </label>
      <div className="pick">
        {groups.map((g) => (
          <div key={g}>
            <div className="row" style={{ margin: '8px 0 4px' }}>
              <b className="grow">{g || 'ללא קבוצה'}</b>
              <button
                type="button"
                className="ghost sm"
                onClick={() =>
                  setSel(new Set([...sel, ...ros.filter((e) => (e.group || '') === g).map((e) => e.studentId)]))
                }
              >
                סימון הקבוצה
              </button>
            </div>
            {ros
              .filter((e) => (e.group || '') === g)
              .map((e) => (
                <label key={e.studentId} className="chk">
                  <input type="checkbox" checked={sel.has(e.studentId)} onChange={() => toggle(e.studentId)} />{' '}
                  {e.st.name}
                </label>
              ))}
          </div>
        ))}
      </div>
      {msg && (
        <div className="small" role="status">
          {msg}
        </div>
      )}
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          disabled={busy}
          onClick={async () => {
            if (!name.trim()) return;
            if (!sel.size) return setMsg('לא סומנו תלמידים');
            setBusy(true);
            setMsg('מפצל…');
            try {
              const nid = await actions.splitCourse(
                cid,
                {
                  name: name.trim(),
                  time: time.trim(),
                  day: day === '' ? null : +day,
                  instructors: splitInstructors(ins),
                },
                [...sel],
                rename.trim() && rename.trim() !== c.name ? rename.trim() : undefined,
              );
              onClose();
              nav(`/admin/course/${nid}`);
            } catch {
              setMsg('הפיצול נכשל – נסו שוב');
              setBusy(false);
            }
          }}
        >
          פיצול
        </button>
      </div>
    </Modal>
  );
}

export function LinksDialog({ cid, onClose }: { cid: string; onClose: () => void }) {
  const { S } = useData();
  const toast = useToast();
  const c = S.courses[cid];
  const [date, setDate] = useState(today());
  const [fallback, setFallback] = useState<string | null>(null);
  const base = window.location.origin;
  const L = (d?: string) => `${base}/course/${cid}${d ? '/' + compact(d) : ''}`;
  const copy = async (text: string, msg: string) => {
    if (await copyToClipboard(text)) toast(msg);
    else setFallback(text);
  };
  if (fallback) return <CopyFallbackModal text={fallback} onClose={() => setFallback(null)} />;
  return (
    <Modal title={`קישורים למדריך – ${c.name}`} onClose={onClose}>
      <label className="fld">
        קישור קבוע לחוג (נפתח על המפגש האחרון של החוג)
        <div className="linkbox">{L()}</div>
      </label>
      <div className="row">
        <button className="ghost grow" onClick={() => copy(L(), 'הקישור הועתק')}>
          העתקת הקישור
        </button>
        <button
          className="pri grow"
          onClick={() =>
            copy(`שלום לך, זה הקישור הקבוע למילוי נוכחות בחוג ${c.name}. בהצלחה!\n${L()}`, 'ההודעה הועתקה')
          }
        >
          העתקת הודעה עם הקישור
        </button>
      </div>
      <label className="fld">
        קישור לתאריך מסוים
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="linkbox">{L(date)}</div>
      <div className="row">
        <button className="ghost grow" onClick={() => copy(L(date), 'הקישור הועתק')}>
          העתקת הקישור לתאריך
        </button>
        <button
          className="pri grow"
          onClick={() =>
            copy(
              `היי, זה הקישור למילוי נוכחות בחוג ${c.name} ליום ${dayName(date)} ${dm(date)}:\n${L(date)}`,
              'ההודעה הועתקה',
            )
          }
        >
          העתקת הודעה לוואטסאפ
        </button>
      </div>
      <p className="muted small">המדריך/ה צריך/ה להיות מוזמן/ת באפליקציה (מסך הגדרות) כדי לשמור נוכחות.</p>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          סגירה
        </button>
      </div>
    </Modal>
  );
}
