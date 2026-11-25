import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActions } from '../../data/actions';
import { useData } from '../../data/DataContext';
import { useCollection } from '../../data/useCollection';
import { DAYS } from '../../lib/dates';
import { fmtPhone, telHref } from '../../lib/format';
import { activeCourses, courseStats } from '../../lib/stats';
import type { CourseWithId, Invite, UserProfile } from '../../lib/types';
import { Modal } from '../../ui/Modal';
import { TableActions } from '../../ui/TableActions';

type Contacts = Record<string, { phone?: string }>;

const when = (c: CourseWithId) => [c.day != null ? DAYS[c.day] : '', c.time].filter(Boolean).join(' ');

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

function InviteDialog({ name, onClose }: { name: string; onClose: () => void }) {
  const actions = useActions();
  const [email, setEmail] = useState('');
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
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setErr('כתובת מייל לא תקינה');
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

function RenameDialog({
  name,
  initialTo,
  names,
  users,
  invites,
  onClose,
}: {
  name: string;
  initialTo?: string;
  names: string[];
  users: Record<string, UserProfile>;
  invites: Record<string, Invite>;
  onClose: () => void;
}) {
  const actions = useActions();
  const [to, setTo] = useState(initialTo || name);
  const merging = to.trim() !== name && names.includes(to.trim());
  return (
    <Modal title={`שינוי השם "${name}"`} onClose={onClose}>
      <p className="small muted">
        השם מתעדכן בכל החוגים, בהזמנות ובחשבונות. כדי לאחד שני כתיבים של אותו אדם, בוחרים את השם השני מהרשימה.
      </p>
      <label className="fld">
        שם חדש
        <input list="instructor-names-all" value={to} onChange={(e) => setTo(e.target.value)} />
        <datalist id="instructor-names-all">
          {names
            .filter((n) => n !== name)
            .map((n) => (
              <option key={n} value={n} />
            ))}
        </datalist>
      </label>
      {merging && (
        <p className="warn small">
          החוגים של {name} יעברו אל {to.trim()}, ושני השמות יהפכו לאחד.
        </p>
      )}
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className="pri"
          disabled={!to.trim() || to.trim() === name}
          onClick={() => {
            actions.renameInstructor(name, to, users, invites);
            onClose();
          }}
        >
          {merging ? 'איחוד' : 'שמירה'}
        </button>
      </div>
    </Modal>
  );
}

function PhoneField({ name, phone }: { name: string; phone: string }) {
  const actions = useActions();
  const [v, setV] = useState(fmtPhone(phone));
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <span className="iphone">
        {phone ? (
          <a className="tel" href={telHref(phone)} dir="ltr">
            {fmtPhone(phone)}
          </a>
        ) : (
          <span className="muted">אין טלפון</span>
        )}{' '}
        <button className="link small" onClick={() => setEditing(true)} aria-label={`עריכת הטלפון של ${name}`}>
          {phone ? 'עריכה' : '+ הוספה'}
        </button>
      </span>
    );
  return (
    <form
      className="iphone row"
      onSubmit={(e) => {
        e.preventDefault();
        actions.setInstructorPhone(name, v);
        setEditing(false);
      }}
    >
      <input
        type="tel"
        inputMode="tel"
        dir="ltr"
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label={`הטלפון של ${name}`}
        autoFocus
      />
      <button className="pri sm">שמירה</button>
    </form>
  );
}

export default function Instructors() {
  const { S, X } = useData();
  const users = useCollection<UserProfile>('users');
  const invites = useCollection<Invite>('invites');
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<{ name: string; to?: string } | null>(null);
  const contacts = (S.config.instructors || {}) as Contacts;

  const courses = activeCourses(S);
  const byName = new Map<string, CourseWithId[]>();
  for (const c of courses) for (const n of c.instructors || []) byName.set(n, [...(byName.get(n) || []), c]);
  const names = [...byName.keys()].sort((a, b) => a.localeCompare(b, 'he'));
  const noInstructor = courses.filter((c) => !(c.instructors || []).length);
  const similar = similarNames(names);

  const access = (name: string) => {
    const user = Object.values(users).find((u) => u.instructorName === name);
    if (user) return { kind: 'active' as const, email: user.email };
    const inv = Object.entries(invites).find(([, i]) => i.instructorName === name);
    if (inv) return { kind: 'invited' as const, email: inv[0] };
    return { kind: 'none' as const, email: '' };
  };
  const students = (name: string) => (byName.get(name) || []).reduce((sum, c) => sum + courseStats(X, c.id).active, 0);

  const table = () => ({
    name: 'מדריכים',
    head: ['מדריך/ה', 'חוגים', 'תלמידים פעילים', 'טלפון', 'גישה לאפליקציה'],
    rows: names.map((n) => {
      const a = access(n);
      return [
        n,
        (byName.get(n) || []).map((c) => `${c.name} (${when(c) || 'ללא יום'})`).join(' · '),
        students(n),
        fmtPhone(contacts[n]?.phone || ''),
        a.kind === 'active' ? `פעיל/ה · ${a.email}` : a.kind === 'invited' ? `הוזמן/ה · ${a.email}` : 'אין גישה',
      ];
    }),
  });

  return (
    <>
      <div className="row">
        <h1 className="grow">מדריכים</h1>
        <TableActions table={table} />
      </div>
      <p className="muted">
        {names.length} מדריכים ב-{courses.length} חוגים פעילים. השמות כאן הם השמות שמופיעים בחוגים (עריכת חוג), וזה גם
        השם שמדריכים בוחרים ב&quot;אני המדריך/ה&quot;.
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
              <button className="link" onClick={() => setRenameFor({ name: a, to: b })}>
                איחוד ל&quot;{b}&quot;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="icards">
        {names.map((n) => {
          const a = access(n);
          const cs = byName.get(n) || [];
          return (
            <section className="icard panel" key={n} data-testid="instructor">
              <div className="icard-head">
                <h2>{n}</h2>
                <button className="link small" onClick={() => setRenameFor({ name: n })}>
                  שינוי שם
                </button>
              </div>
              <ul className="icourses">
                {cs.map((c) => (
                  <li key={c.id}>
                    <Link to={`/admin/course/${c.id}`}>{c.name}</Link>
                    <span className="muted small"> · {when(c) || 'ללא יום קבוע'}</span>
                  </li>
                ))}
              </ul>
              <div className="small">
                {cs.length} {cs.length === 1 ? 'חוג' : 'חוגים'} · {students(n)} תלמידים פעילים
              </div>
              <PhoneField name={n} phone={contacts[n]?.phone || ''} />
              <div className="iaccess">
                {a.kind === 'active' && (
                  <span className="tag">
                    פעיל/ה באפליקציה · <span dir="ltr">{a.email}</span>
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
              </div>
            </section>
          );
        })}
      </div>
      {!names.length && (
        <div className="empty">עוד אין מדריכים בחוגים. מוסיפים אותם ב&quot;עריכת חוג ותמונה&quot;.</div>
      )}

      {inviteFor && <InviteDialog name={inviteFor} onClose={() => setInviteFor(null)} />}
      {renameFor && (
        <RenameDialog
          name={renameFor.name}
          initialTo={renameFor.to}
          names={names}
          users={users}
          invites={invites}
          onClose={() => setRenameFor(null)}
        />
      )}
    </>
  );
}
