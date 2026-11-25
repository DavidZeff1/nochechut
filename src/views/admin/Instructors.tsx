import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActions } from '../../data/actions';
import { useData } from '../../data/DataContext';
import { useCollection } from '../../data/useCollection';
import { DAYS } from '../../lib/dates';
import { fmtPhone, telHref } from '../../lib/format';
import { profileFor } from '../../lib/instructors';
import { avatarDataUrl, DEFAULT_CROP, drawCrop, loadImage, type Crop } from '../../lib/photo';
import { activeCourses, courseStats } from '../../lib/stats';
import type { CourseWithId, InstructorProfile, Invite, UserProfile } from '../../lib/types';
import { Avatar } from '../../ui/Avatar';
import { ConfirmModal, Modal } from '../../ui/Modal';
import { TableActions } from '../../ui/TableActions';

const when = (c: CourseWithId) => [c.day != null ? DAYS[c.day] : '', c.time].filter(Boolean).join(' ');
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Pairs of names where one is the other plus more words ("שרה" / "שרה סולימן"): maybe one person. */
function similarNames(names: string[]) {
  const pairs: Array<[string, string]> = [];
  for (const a of names)
    for (const b of names) {
      if (a === b) continue;
      const wa = a.split(/\s+/);
      const wb = b.split(/\s+/);
      if (wa.length < wb.length && wa.every((w) => wb.includes(w))) pairs.push([a, b]);
    }
  return pairs;
}

/** Choose a photo, then zoom and move it inside the circle. Calls onChange with a small JPEG. */
function PhotoPicker({ name, value, onChange }: { name: string; value: string; onChange: (url: string) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [err, setErr] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!img || !canvas.current) return;
    drawCrop(canvas.current, img, crop, 320);
    onChange(avatarDataUrl(img, crop));
    // onChange is a fresh function each render; the crop and image are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, crop]);

  const slider = (k: keyof Crop, label: string, min: number, max: number) => (
    <label className="fld crop-slider">
      {label}
      <input
        type="range"
        dir="ltr"
        min={min}
        max={max}
        step={0.01}
        value={crop[k]}
        onChange={(e) => setCrop({ ...crop, [k]: Number(e.target.value) })}
      />
    </label>
  );

  return (
    <div className="photopick">
      <div className="photopick-row">
        {img ? (
          <canvas ref={canvas} className="photopick-preview" aria-label="תצוגה מקדימה של התמונה" />
        ) : (
          <Avatar name={name || '?'} photo={value || undefined} size={120} />
        )}
        <div className="photopick-btns">
          <button type="button" className="ghost sm" onClick={() => file.current?.click()}>
            {value || img ? 'החלפת תמונה' : 'בחירת תמונה'}
          </button>
          {(value || img) && (
            <button
              type="button"
              className="link small"
              onClick={() => {
                setImg(null);
                onChange('');
              }}
            >
              הסרת התמונה
            </button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          aria-label="קובץ תמונה"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setErr('');
            try {
              setCrop(DEFAULT_CROP);
              setImg(await loadImage(f));
            } catch {
              setErr('לא הצלחנו לפתוח את הקובץ. נסו תמונה אחרת (JPG או PNG).');
            }
          }}
        />
      </div>
      {img && (
        <div className="photopick-sliders">
          {slider('zoom', 'הגדלה', 1, 4)}
          {slider('x', 'ימינה / שמאלה', 0, 1)}
          {slider('y', 'למעלה / למטה', 0, 1)}
        </div>
      )}
      {err && (
        <p className="small" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

function EditDialog({
  name,
  names,
  profile,
  users,
  invites,
  onClose,
}: {
  name: string | null;
  names: string[];
  profile?: InstructorProfile;
  users: Record<string, UserProfile>;
  invites: Record<string, Invite>;
  onClose: () => void;
}) {
  const actions = useActions();
  const [f, setF] = useState({
    name: name || '',
    phone: fmtPhone(profile?.phone || ''),
    email: profile?.email || '',
    photo: profile?.photo || '',
  });
  const [err, setErr] = useState('');
  const newName = f.name.trim();
  const merging = !!name && newName !== name && names.includes(newName);
  const taken = !name && names.includes(newName);
  return (
    <Modal title={name ? `פרטי ${name}` : 'מדריך/ה חדש/ה'} onClose={onClose}>
      <form
        className="iedit"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName) return setErr('כתבו שם');
          if (taken) return setErr('כבר יש מדריך/ה בשם הזה. פתחו את הכרטיס שלו/ה לעריכה.');
          if (f.email && !EMAIL_RE.test(f.email.trim())) return setErr('כתובת מייל לא תקינה');
          actions.saveInstructor(name, f, users, invites);
          onClose();
        }}
      >
        <PhotoPicker name={newName} value={f.photo} onChange={(photo) => setF((p) => ({ ...p, photo }))} />
        <label className="fld">
          שם (כפי שמופיע בחוגים) *
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="off" />
        </label>
        {name && newName !== name && (
          <p className="warn small">
            {merging
              ? `${name} יאוחד/תאוחד עם ${newName}: החוגים והפרטים יעברו אליו/ה.`
              : `השם יתעדכן בכל החוגים, בהזמנות ובחשבונות.`}
          </p>
        )}
        <div className="f2">
          <label className="fld">
            טלפון
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </label>
          <label className="fld">
            מייל
            <input
              type="email"
              dir="ltr"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="name@example.com"
            />
          </label>
        </div>
        {err && (
          <p className="small" role="alert">
            {err}
          </p>
        )}
        <div className="row end">
          <button type="button" className="ghost" onClick={onClose}>
            ביטול
          </button>
          <button className="pri">שמירה</button>
        </div>
      </form>
    </Modal>
  );
}

function InviteDialog({ name, email: initial, onClose }: { name: string; email: string; onClose: () => void }) {
  const actions = useActions();
  const [email, setEmail] = useState(initial);
  const [err, setErr] = useState('');
  return (
    <Modal title={`הזמנת ${name} לאפליקציה`} onClose={onClose}>
      <p className="small muted">
        {name} תוכל/יוכל לסמן נוכחות בחוגים שלה/שלו. אחרי ההזמנה שולחים את כתובת האפליקציה, ונכנסים עם המייל הזה.
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const em = email.trim().toLowerCase();
          if (!EMAIL_RE.test(em)) return setErr('כתובת מייל לא תקינה');
          actions.invite(em, 'instructor', name);
          onClose();
        }}
      >
        <input
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label={`מייל של ${name}`}
          autoFocus
        />
        <button className="pri">הזמנה</button>
      </form>
      {err && (
        <p className="small" role="alert">
          {err}
        </p>
      )}
    </Modal>
  );
}

function MergeDialog({
  from,
  to,
  users,
  invites,
  onClose,
}: {
  from: string;
  to: string;
  users: Record<string, UserProfile>;
  invites: Record<string, Invite>;
  onClose: () => void;
}) {
  const actions = useActions();
  return (
    <Modal title={`איחוד "${from}" עם "${to}"`} onClose={onClose}>
      <p>
        כל החוגים, ההזמנות והפרטים של &quot;{from}&quot; יעברו אל &quot;{to}&quot;, ויישאר מדריך/ה אחד/ת.
      </p>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          onClick={() => {
            actions.renameInstructor(from, to, users, invites);
            onClose();
          }}
        >
          איחוד
        </button>
      </div>
    </Modal>
  );
}

export default function Instructors() {
  const { S, X } = useData();
  const actions = useActions();
  const users = useCollection<UserProfile>('users');
  const invites = useCollection<Invite>('invites');
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<{ name: string | null } | null>(null);
  const [mergeFor, setMergeFor] = useState<[string, string] | null>(null);
  const [removeFor, setRemoveFor] = useState<string | null>(null);

  const courses = activeCourses(S);
  const byName = new Map<string, CourseWithId[]>();
  for (const c of courses) for (const n of c.instructors || []) byName.set(n, [...(byName.get(n) || []), c]);
  // Everyone named on a course, plus profiles of instructors without a course right now.
  for (const p of Object.values(S.instructors)) if (p?.name && !byName.has(p.name)) byName.set(p.name, []);
  const names = [...byName.keys()].sort((a, b) => a.localeCompare(b, 'he'));
  const noInstructor = courses.filter((c) => !(c.instructors || []).length);
  const similar = similarNames(names);

  const access = (name: string) => {
    const email = profileFor(S, name)?.email?.toLowerCase();
    const user = Object.values(users).find((u) => u.instructorName === name || (!!email && u.email === email));
    if (user) return { kind: 'active' as const, email: user.email, role: user.role };
    const inv = Object.entries(invites).find(([em, i]) => i.instructorName === name || em === email);
    if (inv) return { kind: 'invited' as const, email: inv[0], role: inv[1].role };
    return { kind: 'none' as const, email: '', role: null };
  };
  const students = (name: string) => (byName.get(name) || []).reduce((sum, c) => sum + courseStats(X, c.id).active, 0);

  const table = () => ({
    name: 'מדריכים',
    head: ['מדריך/ה', 'חוגים', 'תלמידים פעילים', 'טלפון', 'מייל', 'גישה לאפליקציה'],
    rows: names.map((n) => {
      const a = access(n);
      const p = profileFor(S, n);
      return [
        n,
        (byName.get(n) || []).map((c) => `${c.name} (${when(c) || 'ללא יום'})`).join(' · '),
        students(n),
        fmtPhone(p?.phone || ''),
        p?.email || '',
        a.kind === 'active' ? `פעיל/ה · ${a.email}` : a.kind === 'invited' ? `הוזמן/ה · ${a.email}` : 'אין גישה',
      ];
    }),
  });

  return (
    <>
      <div className="row">
        <h1 className="grow">מדריכים</h1>
        <button className="pri sm" onClick={() => setEditFor({ name: null })}>
          + מדריך/ה חדש/ה
        </button>
        <TableActions table={table} />
      </div>
      <p className="muted">
        {names.length} מדריכים ב-{courses.length} חוגים פעילים. השמות הם השמות שמופיעים בחוגים (עריכת חוג), וזה גם השם
        שמדריכים בוחרים ב&quot;אני המדריך/ה&quot;.
      </p>

      {(noInstructor.length > 0 || similar.length > 0) && (
        <div className="ichecks">
          {noInstructor.length > 0 && (
            <div className="warn">
              <b>חוגים בלי מדריך/ה:</b>{' '}
              {noInstructor.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <Link to={`/admin/course/${c.id}`}>{c.name}</Link>
                </span>
              ))}
              . מוסיפים מדריך/ה ב&quot;עריכת חוג ותמונה&quot;.
            </div>
          )}
          {similar.map(([a, b]) => (
            <div className="warn" key={`${a}|${b}`}>
              <b>אותו אדם?</b> &quot;{a}&quot; ו&quot;{b}&quot; נספרים כשני מדריכים.{' '}
              <button className="link" onClick={() => setMergeFor([a, b])}>
                איחוד ל&quot;{b}&quot;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="icards">
        {names.map((n) => {
          const a = access(n);
          const p = profileFor(S, n);
          const cs = byName.get(n) || [];
          return (
            <section className="icard panel" key={n} data-testid="instructor">
              <div className="icard-head">
                <Avatar name={n} photo={p?.photo} size={64} />
                <div className="icard-title">
                  <h2>{n}</h2>
                  <div className="small muted">
                    {cs.length
                      ? `${cs.length} ${cs.length === 1 ? 'חוג' : 'חוגים'} · ${students(n)} תלמידים`
                      : 'אין חוגים כרגע'}
                  </div>
                </div>
                <button
                  className="ghost sm"
                  onClick={() => setEditFor({ name: n })}
                  aria-label={`עריכת הפרטים של ${n}`}
                >
                  עריכה
                </button>
              </div>
              {cs.length > 0 && (
                <ul className="icourses">
                  {cs.map((c) => (
                    <li key={c.id}>
                      <Link to={`/admin/course/${c.id}`}>{c.name}</Link>
                      <span className="muted small"> · {when(c) || 'ללא יום קבוע'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="icontact small">
                {p?.phone ? (
                  <a className="tel" href={telHref(p.phone)} dir="ltr">
                    {fmtPhone(p.phone)}
                  </a>
                ) : (
                  <span className="muted">אין טלפון</span>
                )}
                {p?.email && (
                  <a href={`mailto:${p.email}`} dir="ltr">
                    {p.email}
                  </a>
                )}
              </div>
              <div className="iaccess">
                {a.kind === 'active' && (
                  <span className="tag">
                    {a.role === 'admin' ? 'מנהל/ת' : 'פעיל/ה'} באפליקציה · <span dir="ltr">{a.email}</span>
                  </span>
                )}
                {a.kind === 'invited' && (
                  <span className="tag br">
                    הוזמן/ה, עוד לא נכנס/ה · <span dir="ltr">{a.email}</span>
                  </span>
                )}
                {a.kind === 'none' && (
                  <>
                    <span className="tag red">אין גישה לאפליקציה</span>
                    <button className="ghost sm" onClick={() => setInviteFor(n)}>
                      הזמנה
                    </button>
                  </>
                )}
                {!cs.length && p && (
                  <button className="link small" onClick={() => setRemoveFor(n)}>
                    הסרה מהרשימה
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {!names.length && (
        <div className="empty">
          עוד אין מדריכים. מוסיפים עם &quot;+ מדריך/ה חדש/ה&quot; או ב&quot;עריכת חוג ותמונה&quot;.
        </div>
      )}

      {editFor && (
        <EditDialog
          name={editFor.name}
          names={names}
          profile={editFor.name ? profileFor(S, editFor.name) : undefined}
          users={users}
          invites={invites}
          onClose={() => setEditFor(null)}
        />
      )}
      {inviteFor && (
        <InviteDialog
          name={inviteFor}
          email={profileFor(S, inviteFor)?.email || ''}
          onClose={() => setInviteFor(null)}
        />
      )}
      {mergeFor && (
        <MergeDialog
          from={mergeFor[0]}
          to={mergeFor[1]}
          users={users}
          invites={invites}
          onClose={() => setMergeFor(null)}
        />
      )}
      {removeFor && (
        <ConfirmModal
          text={`להסיר את ${removeFor} מרשימת המדריכים? (אין לו/ה חוגים כרגע. הגישה לאפליקציה לא משתנה.)`}
          okText="הסרה"
          danger
          onOk={() => actions.deleteInstructorProfile(removeFor)}
          onClose={() => setRemoveFor(null)}
        />
      )}
    </>
  );
}
