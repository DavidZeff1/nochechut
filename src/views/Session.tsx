import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useActions } from '../data/actions';
import { useData } from '../data/DataContext';
import {
  addDays,
  compact,
  DAYS,
  dayName,
  dm,
  DSHORT,
  fromCompact,
  isISODate,
  lastWeekday,
  longDate,
  parseISO,
  today,
} from '../lib/dates';
import { courseSessions, getRecord, heldDates, lastClassDay, rosterFor, sessId, sessionSummary } from '../lib/stats';
import type { Mark } from '../lib/types';
import { CourseImage } from '../ui/CourseImage';
import { CheckIcon, CrossIcon } from '../ui/Icons';
import { CopyFallbackModal, Modal } from '../ui/Modal';
import { copyToClipboard, useToast } from '../ui/Toast';

/** Date chosen per course during this visit, for undated links. */
const rememberedDate: Record<string, string> = {};

function DateChips({ cid, date, onPick }: { cid: string; date: string; onPick: (d: string) => void }) {
  const { S, X } = useData();
  const c = S.courses[cid];
  const t = today();
  const set = new Set([t, date]);
  for (const s of courseSessions(X, cid)) if (s.date >= addDays(t, -49) && s.date <= addDays(t, 7)) set.add(s.date);
  if (c?.day != null) {
    let d = lastWeekday(t, c.day);
    for (let i = 0; i < 5; i++) {
      set.add(d);
      d = addDays(d, -7);
    }
  }
  const ds = [...set].sort().reverse().slice(0, 10);
  if (!ds.includes(date)) ds.push(date);
  const has = new Set(
    courseSessions(X, cid)
      .filter((s) => Object.keys(s.records).length)
      .map((s) => s.date),
  );
  return (
    <div className="dates" aria-label="תאריכים אחרונים">
      {ds.map((d) => (
        <button
          key={d}
          className={`dchip ${d === date ? 'on' : ''} ${has.has(d) ? 'has' : ''}`}
          aria-pressed={d === date}
          onClick={() => onPick(d)}
        >
          <span>{d === t ? 'היום' : DSHORT[parseISO(d).getDay()]}</span>
          <small>{dm(d)}</small>
        </button>
      ))}
    </div>
  );
}

function NoteInput({
  cid,
  date,
  sid,
  value,
  disabled,
}: {
  cid: string;
  date: string;
  sid: string;
  value: string;
  disabled: boolean;
}) {
  const actions = useActions();
  const [v, setV] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(value);
  useEffect(() => {
    // Accept outside changes only while the user is not typing.
    if (document.activeElement?.id !== `n-${sid}`) setV(value);
    latest.current = value;
  }, [value, sid]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="note">
      <input
        id={`n-${sid}`}
        value={v}
        disabled={disabled}
        placeholder="הערה למפגש (למשל: הגיע באיחור)"
        onChange={(e) => {
          const nv = e.target.value;
          setV(nv);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            if (nv.trim() !== latest.current) actions.setNote(cid, date, sid, nv.trim());
          }, 800);
        }}
      />
    </div>
  );
}

function AddWalkIn({ cid, date, onDone }: { cid: string; date: string; onDone: () => void }) {
  const actions = useActions();
  const [f, setF] = useState({ name: '', mother: '', phone: '', age: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="addbox"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        actions.createStudent({ ...f, name: f.name.trim(), mother: f.mother.trim(), age: f.age.trim() }, cid, date);
        onDone();
      }}
    >
      <h3>תלמיד/ה חדש/ה שהגיע/ה למפגש</h3>
      <div className="f2">
        <label className="fld">
          שם התלמיד/ה *<input id="a-name" required autoComplete="off" autoFocus value={f.name} onChange={set('name')} />
        </label>
        <label className="fld">
          שם האם
          <input autoComplete="off" value={f.mother} onChange={set('mother')} />
        </label>
        <label className="fld">
          טלפון ליצירת קשר
          <input type="tel" inputMode="tel" autoComplete="off" value={f.phone} onChange={set('phone')} />
        </label>
        <label className="fld">
          גיל
          <input inputMode="decimal" autoComplete="off" value={f.age} onChange={set('age')} />
        </label>
      </div>
      <div className="row end">
        <button type="button" className="ghost" onClick={onDone}>
          ביטול
        </button>
        <button className="pri">הוספה וסימון כהגיע/ה</button>
      </div>
    </form>
  );
}

export function SessionView({ admin = false }: { admin?: boolean }) {
  const { cid = '', ymd } = useParams();
  const nav = useNavigate();
  const { S, X } = useData();
  const auth = useAuth();
  const actions = useActions();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [onlyUn, setOnlyUn] = useState(false);
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [noteDlg, setNoteDlg] = useState(false);
  const [copyText, setCopyText] = useState<string | null>(null);
  const c = S.courses[cid];

  const urlDate = ymd && /^\d{8}$/.test(ymd) ? fromCompact(ymd) : null;
  const [localDate, setLocalDate] = useState<string | null>(null);
  const date = urlDate || localDate || rememberedDate[cid] || lastClassDay(c);
  const t = today();

  useEffect(() => {
    setQ('');
    setOnlyUn(false);
    setAdding(false);
    setOpenNotes(new Set());
  }, [cid, date]);

  const roster = useMemo(() => rosterFor(X, cid, date), [X, cid, date]);
  const prev = useMemo(
    () =>
      heldDates(X, cid)
        .filter((d) => d < date)
        .slice(-5),
    [X, cid, date],
  );

  if (!c)
    return (
      <div className="empty">
        החוג לא נמצא.
        <br />
        <br />
        <Link className="btn ghost" to="/">
          חזרה לכל החוגים
        </Link>
      </div>
    );

  const readOnly = auth.status !== 'ready';
  const ses = S.sessions[sessId(cid, date)];
  const recs = Object.fromEntries(roster.map((e) => [e.studentId, getRecord(S, cid, date, e.studentId)]));
  let v = 0;
  let x = 0;
  for (const r of Object.values(recs)) {
    if (r.s === 'v') v++;
    else if (r.s === 'x') x++;
  }
  const n = roster.length;
  const un = n - v - x;
  const multi = new Set(roster.map((e) => e.group || '')).size > 1;
  const query = q.trim();
  const shown = roster.filter(
    (e) => (!query || (e.st.name || '').includes(query)) && (!onlyUn || !recs[e.studentId].s),
  );

  const pickDate = (d: string) => {
    if (!isISODate(d)) return;
    rememberedDate[cid] = d;
    if (admin) nav(`/admin/session/${cid}/${compact(d)}`);
    else if (urlDate) nav(`/course/${cid}/${compact(d)}`);
    else setLocalDate(d);
  };
  const mark = (sid: string, m: Mark) => actions.setMark(cid, date, sid, recs[sid].s === m ? '' : m);
  const markRest = () => {
    const ids = roster.filter((e) => !recs[e.studentId].s).map((e) => e.studentId);
    if (!ids.length) return;
    actions.setMany(cid, date, Object.fromEntries(ids.map((sid) => [sid, { s: 'v' as Mark }])));
    toast(ids.length === 1 ? 'תלמיד/ה אחד/ת סומן/ה כהגיע/ה' : `${ids.length} תלמידים סומנו כהגיעו`, {
      undo: () => actions.setMany(cid, date, Object.fromEntries(ids.map((sid) => [sid, { s: '' as Mark }]))),
    });
  };
  const copySummary = async () => {
    const text = sessionSummary(S, X, cid, date, `יום ${dayName(date)} ${dm(date)}`);
    if (await copyToClipboard(text)) toast('הסיכום הועתק');
    else setCopyText(text);
  };
  const pct = (k: number) => (n ? (100 * k) / n : 0);

  let lastGroup: string | null = null;
  const warnWeekday = c.day != null && parseISO(date).getDay() !== c.day ? lastWeekday(date, c.day) : null;

  return (
    <>
      <div className="sess-top">
        <div className="sess-head">
          <div className="sess-title">
            <div className="row">
              <Link className="btn ghost sm" to={admin ? `/admin/course/${cid}` : '/'}>
                → {admin ? 'לרישום החוג' : 'לכל החוגים'}
              </Link>
              {admin && <span className="tag br">עריכת מנהל</span>}
            </div>
            <h1>{c.name}</h1>
            <div className="sub">
              {[c.day != null ? `יום ${DAYS[c.day]}` : '', c.time, (c.instructors || []).join(', ')]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <CourseImage course={c} className="sess-art" sizes="(max-width: 600px) 40vw, 260px" eager />
        </div>
      </div>
      <div className="datebar">
        <div className="dnav">
          <button
            className="ghost"
            aria-label="שבוע קודם"
            title="שבוע קודם"
            onClick={() => pickDate(addDays(date, -7))}
          >
            »
          </button>
          <button className="ghost" aria-label="יום קודם" title="יום קודם" onClick={() => pickDate(addDays(date, -1))}>
            ›
          </button>
          <input type="date" value={date} aria-label="תאריך המפגש" onChange={(e) => pickDate(e.target.value)} />
          <button className="ghost" aria-label="יום הבא" title="יום הבא" onClick={() => pickDate(addDays(date, 1))}>
            ‹
          </button>
          <button className="ghost" aria-label="שבוע הבא" title="שבוע הבא" onClick={() => pickDate(addDays(date, 7))}>
            «
          </button>
        </div>
        <DateChips cid={cid} date={date} onPick={pickDate} />
        <p className="dlabel">
          {longDate(date)}
          {date === t ? ' · היום' : ''}
        </p>
        {warnWeekday && (
          <div className="warn">
            החוג מתקיים בימי {DAYS[c.day!]}, והתאריך שנבחר הוא יום {dayName(date)}.{' '}
            <button className="link" onClick={() => pickDate(warnWeekday)}>
              מעבר ליום {DAYS[c.day!]} {dm(warnWeekday)}
            </button>
          </div>
        )}
        {date > t && <div className="warn">זה תאריך עתידי.</div>}
      </div>

      <div className="sess">
        <aside className="tally" aria-label="סיכום המפגש">
          <div className="nums">
            <div className="nv">
              <b>{v}</b>הגיעו
            </div>
            <div className="nx">
              <b>{x}</b>לא הגיעו
            </div>
            <div className="nu">
              <b>{un}</b>לא סומנו
            </div>
          </div>
          <div className="segbar" role="img" aria-label={`${v} הגיעו, ${x} לא הגיעו, ${un} לא סומנו מתוך ${n}`}>
            <i className="bv" style={{ width: `${pct(v)}%` }} />
            <i className="bx" style={{ width: `${pct(x)}%` }} />
          </div>
          <div className="tact">
            {un > 0 && (
              <button className="pri" onClick={markRest} disabled={readOnly}>
                סימון {un} הנותרים כהגיעו
              </button>
            )}
            <button className="ghost" onClick={copySummary}>
              העתקת סיכום לוואטסאפ
            </button>
          </div>
          <div className="snote">
            {ses?.note && (
              <p>
                <b>הערה למפגש:</b> {ses.note}
              </p>
            )}
            <button className="link small" onClick={() => setNoteDlg(true)}>
              {ses?.note ? 'עריכת הערת המפגש' : '+ הערה למפגש כולו (למשל: בוטל, מחליפה)'}
            </button>
          </div>
        </aside>

        <section className="rost">
          {n > 8 && (
            <div className="sfilter">
              <input
                type="search"
                placeholder="חיפוש תלמיד/ה ברשימה"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
                aria-label="חיפוש תלמיד ברשימה"
              />
              <button
                className={`ghost sm ${onlyUn ? 'on' : ''}`}
                aria-pressed={onlyUn}
                onClick={() => setOnlyUn(!onlyUn)}
              >
                רק לא מסומנים ({un})
              </button>
            </div>
          )}
          <div className="list">
            {shown.map((e) => {
              const sid = e.studentId;
              const r = recs[sid];
              const showNote = !!r.n || openNotes.has(sid);
              const groupHead =
                multi && (e.group || '') !== lastGroup ? <div className="grp">{e.group || 'ללא קבוצה'}</div> : null;
              lastGroup = e.group || '';
              return (
                <div key={sid}>
                  {groupHead}
                  <div className={`stu ${r.s}`} data-testid="student-row">
                    <div>
                      <div className="nm">
                        {e.st.name}
                        {!e.active && <span className="tag red">הוסר</span>}
                      </div>
                      <div className="meta">
                        {e.st.age && <span>גיל {e.st.age}</span>}
                        {!multi && e.group && <span>{e.group}</span>}
                        {prev.length > 0 && (
                          <span className="dots" title="המפגשים הקודמים">
                            {prev.map((d) => {
                              const s = S.sessions[sessId(cid, d)]?.records?.[sid]?.s || '';
                              return (
                                <i
                                  key={d}
                                  className={`dot ${s}`}
                                  title={`${dm(d)}: ${s === 'v' ? 'הגיע' : s === 'x' ? 'לא הגיע' : 'לא סומן'}`}
                                />
                              );
                            })}
                          </span>
                        )}
                        {!showNote && (
                          <button className="link" onClick={() => setOpenNotes(new Set(openNotes).add(sid))}>
                            + הערה
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="marks">
                      <button
                        className={`mk v ${r.s === 'v' ? 'on' : ''}`}
                        aria-pressed={r.s === 'v'}
                        disabled={readOnly}
                        onClick={() => mark(sid, 'v')}
                      >
                        <CheckIcon />
                        הגיע/ה
                      </button>
                      <button
                        className={`mk x ${r.s === 'x' ? 'on' : ''}`}
                        aria-pressed={r.s === 'x'}
                        disabled={readOnly}
                        onClick={() => mark(sid, 'x')}
                      >
                        <CrossIcon />
                        לא הגיע/ה
                      </button>
                    </div>
                    {showNote && <NoteInput cid={cid} date={date} sid={sid} value={r.n} disabled={readOnly} />}
                  </div>
                </div>
              );
            })}
            {!shown.length && (
              <div className="quiet">
                {n
                  ? onlyUn && !query
                    ? 'כל התלמידים סומנו ✓'
                    : 'אין תלמידים שמתאימים לחיפוש.'
                  : 'אין עדיין תלמידים בחוג הזה. אפשר להוסיף תלמיד/ה שהגיע/ה:'}
              </div>
            )}
          </div>
          {adding ? (
            <AddWalkIn cid={cid} date={date} onDone={() => setAdding(false)} />
          ) : (
            <button className="ghost addbtn" onClick={() => setAdding(true)}>
              + הוספת תלמיד/ה שלא ברשימה
            </button>
          )}
        </section>
      </div>

      <div className="dock">
        <span className="dk">
          <b className="cv">{v}</b> הגיעו · <b className="cx">{x}</b> לא · <b>{un}</b> נותרו
        </span>
        {un > 0 ? (
          <button className="pri sm" onClick={markRest}>
            סימון הנותרים
          </button>
        ) : (
          n > 0 && <span className="ok">הכל סומן ✓</span>
        )}
      </div>

      {noteDlg && <SessionNoteModal cid={cid} date={date} onClose={() => setNoteDlg(false)} />}
      {copyText && <CopyFallbackModal text={copyText} onClose={() => setCopyText(null)} />}
    </>
  );
}

function SessionNoteModal({ cid, date, onClose }: { cid: string; date: string; onClose: () => void }) {
  const { S } = useData();
  const actions = useActions();
  const current = S.sessions[sessId(cid, date)]?.note || '';
  const [v, setV] = useState(current);
  return (
    <Modal title={`הערה למפגש ${dm(date)}`} onClose={onClose}>
      <label className="fld">
        ההערה תופיע למנהל/ת ולמדריכים (למשל: בוטל בגלל חג, מדריכה מחליפה)
        <textarea rows={3} value={v} onChange={(e) => setV(e.target.value)} />
      </label>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          onClick={() => {
            if (v.trim() !== current) actions.setSessionNote(cid, date, v.trim());
            onClose();
          }}
        >
          שמירה
        </button>
      </div>
    </Modal>
  );
}
