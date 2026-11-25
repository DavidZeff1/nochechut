import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuthUser, Backend } from '../data/backend';
import type { AccessRequest, Role } from '../lib/types';
import { Modal } from '../ui/Modal';
import { requestPath, useMyRequest } from './requests';

const ROLE_LABEL: Record<Role, string> = { admin: 'מנהל/ת', instructor: 'מדריך/ה' };

function RequestStatus({ req, role }: { req: AccessRequest; role?: Role }) {
  if (req.status === 'pending' && (!role || req.role === role))
    return (
      <p className="reqstatus pending" role="status">
        הבקשה נשלחה ומחכה לאישור של מנהל/ת ({ROLE_LABEL[req.role]}). המסך יתעדכן לבד כשהיא תאושר.
      </p>
    );
  if (req.status === 'declined' && (!role || req.role === role))
    return (
      <p className="reqstatus declined" role="status">
        הבקשה האחרונה לא אושרה. אפשר לשלוח בקשה חדשה עם הסבר.
      </p>
    );
  return null;
}

/**
 * Lets a signed-in person ask the admins for access. With `role` given the role is fixed
 * (an instructor asking to become an admin); otherwise the person chooses.
 */
export function RequestAccessForm({
  backend,
  user,
  role: fixedRole,
  onSent,
}: {
  backend: Backend;
  user: AuthUser;
  role?: Role;
  onSent?: () => void;
}) {
  const req = useMyRequest(backend, user.email);
  const [name, setName] = useState(user.displayName || '');
  const [role, setRole] = useState<Role>(fixedRole || 'instructor');
  const [instructorName, setInstructorName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const waiting = req?.status === 'pending' && (!fixedRole || req.role === fixedRole);
  if (req === undefined) return <p className="small muted">טוען…</p>;
  if (waiting) return <RequestStatus req={req} />;

  return (
    <form
      className="reqform"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return setErr('כתבו את השם שלכם');
        setBusy(true);
        setErr('');
        const data: AccessRequest = {
          email: user.email.trim().toLowerCase(),
          uid: user.uid,
          name: name.trim(),
          role,
          instructorName: role === 'instructor' ? instructorName.trim() : '',
          note: note.trim(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        try {
          await backend.setDoc(requestPath(user.email), { ...data });
          onSent?.();
        } catch {
          setErr('שליחת הבקשה נכשלה. בדקו את החיבור ונסו שוב.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {req && <RequestStatus req={req} role={fixedRole} />}
      <label className="fld">
        שם מלא *
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      {!fixedRole && (
        <label className="fld">
          מבקש/ת גישה בתור
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="instructor">מדריך/ה – סימון נוכחות בחוגים שלי</option>
            <option value="admin">מנהל/ת – גישה מלאה לכל המסכים</option>
          </select>
        </label>
      )}
      {role === 'instructor' && !fixedRole && (
        <label className="fld">
          השם שלי כמדריך/ה בחוגים (לא חובה)
          <input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} />
        </label>
      )}
      <label className="fld">
        הסבר קצר למנהל/ת (לא חובה)
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={role === 'admin' ? 'למשל: אני רכזת החוגים' : 'למשל: מדריכת קרמיקה'}
        />
      </label>
      {err && (
        <p className="small" role="alert">
          {err}
        </p>
      )}
      <button className="pri wide" disabled={busy}>
        {busy ? 'שולח…' : 'שליחת בקשה למנהל/ת'}
      </button>
    </form>
  );
}

/** Shown to an instructor who opens an admin-only screen. */
export function AdminOnly({ backend, user }: { backend: Backend; user: AuthUser }) {
  return (
    <div className="adminonly panel">
      <h1>המסך הזה מיועד למנהלים</h1>
      <p>
        יש לך הרשאת מדריך/ה, שמאפשרת לסמן נוכחות ולהוסיף תלמיד/ה שהגיע/ה. כדי לערוך חוגים, לראות דוחות ולנהל צוות צריך
        הרשאת מנהל/ת. אפשר לבקש אותה כאן, והבקשה תגיע למנהלים.
      </p>
      <RequestAccessForm backend={backend} user={user} role="admin" />
      <Link className="btn ghost" to="/">
        → חזרה לחוגים
      </Link>
    </div>
  );
}

/** Header button for instructors: ask to become an admin. */
export function RequestAdminButton({ backend, user }: { backend: Backend; user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const req = useMyRequest(backend, user.email);
  const waiting = req?.status === 'pending' && req.role === 'admin';
  return (
    <>
      <button className="navbtn" onClick={() => setOpen(true)}>
        {waiting ? 'בקשה ממתינה' : 'בקשת הרשאת מנהל/ת'}
      </button>
      {open && (
        <Modal title="בקשת הרשאת מנהל/ת" onClose={() => setOpen(false)}>
          <p className="small muted">הבקשה תגיע לכל המנהלים במסך ההגדרות. כשהיא תאושר, תפריט הניהול יופיע אצלך לבד.</p>
          <RequestAccessForm backend={backend} user={user} role="admin" />
          <div className="row end">
            <button className="ghost" onClick={() => setOpen(false)}>
              סגירה
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
