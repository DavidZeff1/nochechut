import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useActions } from '../../data/actions';
import { useData } from '../../data/DataContext';
import { downloadText } from '../../lib/csv';
import { today } from '../../lib/dates';
import { allInstructors } from '../../lib/stats';
import type { AccessRequest, Invite, Role, UserProfile } from '../../lib/types';
import { ConfirmModal } from '../../ui/Modal';

const ROLE_LABEL: Record<Role, string> = { admin: 'מנהל/ת', instructor: 'מדריך/ה' };

const when = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(+d)
    ? ''
    : `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function RequestRow({ req, users, me }: { req: AccessRequest; users: Record<string, UserProfile>; me: string }) {
  const actions = useActions();
  const [role, setRole] = useState<Role>(req.role);
  const existing = Object.values(users).find((u) => u.email?.toLowerCase() === req.email.toLowerCase());
  return (
    <li className="req" data-testid="access-request">
      <div className="req-who">
        <b>{req.name || req.email}</b>{' '}
        <span dir="ltr" className="muted small">
          {req.email}
        </span>
        <div className="small muted">
          מבקש/ת: {ROLE_LABEL[req.role]}
          {existing ? ` · כרגע ${ROLE_LABEL[existing.role]}` : ' · עוד אין גישה'}
          {req.instructorName ? ` · שם בחוגים: ${req.instructorName}` : ''} · {when(req.createdAt)}
        </div>
        {req.note && <div className="req-note">{req.note}</div>}
      </div>
      <div className="req-act">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          aria-label={`תפקיד לאישור עבור ${req.email}`}
        >
          <option value="instructor">{ROLE_LABEL.instructor}</option>
          <option value="admin">{ROLE_LABEL.admin}</option>
        </select>
        <button
          className="pri sm"
          onClick={() => actions.approveRequest(req, role, req.instructorName || '', users, me)}
        >
          אישור
        </button>
        <button className="ghost sm" onClick={() => actions.declineRequest(req.email, me)}>
          דחייה
        </button>
      </div>
    </li>
  );
}

function useCollection<T>(col: string) {
  const { backend } = useData();
  const [docs, setDocs] = useState<Record<string, T>>({});
  useEffect(
    () =>
      backend.watchCollection<T>(
        col,
        (s) => setDocs(s.docs),
        () => setDocs({}),
      ),
    [backend, col],
  );
  return docs;
}

export default function Settings() {
  const { S, backend } = useData();
  const auth = useAuth();
  const actions = useActions();
  const users = useCollection<UserProfile>('users');
  const invites = useCollection<Invite>('invites');
  const requests = useCollection<AccessRequest>('accessRequests');
  const pendingReqs = Object.values(requests)
    .filter((r) => r.status === 'pending')
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const decidedReqs = Object.values(requests)
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => (b.decidedAt || '').localeCompare(a.decidedAt || ''))
    .slice(0, 8);
  const me = auth.status === 'ready' ? auth.user.email : '';
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('instructor');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [removeInvite, setRemoveInvite] = useState<string | null>(null);
  const names = allInstructors(S);
  const myUid = auth.status === 'ready' ? auth.user.uid : '';

  return (
    <>
      <h1>הגדרות</h1>
      <div className="settings">
        <section className="panel" id="requests">
          <h2>בקשות גישה {pendingReqs.length > 0 && <span className="tag red">{pendingReqs.length} ממתינות</span>}</h2>
          <p className="small muted">
            מי שנכנס/ת בלי הזמנה, ומדריכים שמנסים לפתוח מסך מנהלים, יכולים לשלוח מכאן בקשה. אישור נותן את התפקיד שנבחר
            מיד: מי שכבר יש לו/ה חשבון מקבל/ת את התפקיד, ומי שאין לו/ה מקבל/ת הזמנה, והמסך אצלם מתעדכן לבד.
          </p>
          {pendingReqs.length ? (
            <ul className="reqs">
              {pendingReqs.map((r) => (
                <RequestRow key={r.email} req={r} users={users} me={me} />
              ))}
            </ul>
          ) : (
            <p className="small">אין בקשות שממתינות.</p>
          )}
          {decidedReqs.length > 0 && (
            <details>
              <summary className="small">בקשות אחרונות שטופלו ({decidedReqs.length})</summary>
              <ul className="reqs done">
                {decidedReqs.map((r) => (
                  <li key={r.email} className="small">
                    <span className={`tag ${r.status === 'approved' ? '' : 'red'}`}>
                      {r.status === 'approved' ? `אושרה · ${ROLE_LABEL[r.role]}` : 'נדחתה'}
                    </span>{' '}
                    {r.name} <span dir="ltr">{r.email}</span> · {when(r.decidedAt)}
                    {r.decidedBy ? ` · ע״י ${r.decidedBy}` : ''}{' '}
                    <button className="link small" onClick={() => actions.deleteRequest(r.email)}>
                      מחיקה מהרשימה
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
        <section className="panel">
          <h2>צוות והרשאות</h2>
          <p className="small muted">
            מזמינים לפי כתובת מייל. בכניסה הראשונה עם החשבון הזה (Google או קישור למייל) ההרשאה מופעלת. מדריכים יכולים
            לסמן נוכחות ולהוסיף תלמיד/ה שהגיע/ה; רק מנהלים עורכים חוגים, מוחקים ורואים את מסכי הניהול.
          </p>
          <form
            className="invite"
            onSubmit={(e) => {
              e.preventDefault();
              const em = email.trim().toLowerCase();
              if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setMsg('כתובת מייל לא תקינה');
              actions.invite(em, role, role === 'instructor' ? name.trim() : '');
              setEmail('');
              setName('');
              setMsg(`נשלחה הזמנה ל-${em}. שלחו לה/לו את כתובת האפליקציה.`);
            }}
          >
            <label className="fld">
              מייל
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <label className="fld">
              תפקיד
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="instructor">מדריך/ה</option>
                <option value="admin">מנהל/ת</option>
              </select>
            </label>
            {role === 'instructor' && (
              <label className="fld">
                שם כפי שמופיע בחוגים
                <input list="instructor-names" value={name} onChange={(e) => setName(e.target.value)} />
                <datalist id="instructor-names">
                  {names.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
            )}
            <button className="pri">הזמנה</button>
          </form>
          {msg && (
            <p className="small" role="status">
              {msg}
            </p>
          )}
          <div className="tblwrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>מייל</th>
                  <th>תפקיד</th>
                  <th>שם בחוגים</th>
                  <th>מצב</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Object.entries(users).map(([uid, u]) => (
                  <tr key={uid}>
                    <td dir="ltr" className="ph">
                      {u.email}
                    </td>
                    <td>
                      <select
                        value={u.role}
                        disabled={uid === myUid}
                        onChange={(e) => actions.updateUser(uid, { role: e.target.value as Role })}
                        aria-label={`תפקיד של ${u.email}`}
                      >
                        <option value="instructor">{ROLE_LABEL.instructor}</option>
                        <option value="admin">{ROLE_LABEL.admin}</option>
                      </select>
                    </td>
                    <td>{u.instructorName || <span className="muted">–</span>}</td>
                    <td>
                      <span className="tag">פעיל/ה</span>
                    </td>
                    <td />
                  </tr>
                ))}
                {Object.entries(invites)
                  .filter(([em]) => !Object.values(users).some((u) => u.email === em))
                  .map(([em, inv]) => (
                    <tr key={em}>
                      <td dir="ltr" className="ph">
                        {em}
                      </td>
                      <td>{ROLE_LABEL[inv.role]}</td>
                      <td>{inv.instructorName || <span className="muted">–</span>}</td>
                      <td>
                        <span className="tag br">ממתין/ה לכניסה</span>
                      </td>
                      <td>
                        <button className="ghost sm" onClick={() => setRemoveInvite(em)}>
                          ביטול הזמנה
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>נתונים</h2>
          <p className="small">
            {Object.keys(S.courses).length} חוגים · {Object.keys(S.students).length} תלמידים ·{' '}
            {Object.keys(S.enrollments).length} שיבוצים · {Object.keys(S.sessions).length} מפגשים רשומים
          </p>
          <button
            className="ghost"
            onClick={() =>
              downloadText(
                `גיבוי נוכחות ${today()}.json`,
                JSON.stringify(
                  {
                    courses: S.courses,
                    students: S.students,
                    enrollments: S.enrollments,
                    sessions: S.sessions,
                    config: S.config,
                  },
                  null,
                  1,
                ),
                'application/json',
              )
            }
          >
            הורדת גיבוי מלא (JSON)
          </button>
          <p className="small muted">הקובץ מתאים לסקריפט הייבוא (npm run import) לשחזור או להעברה לפרויקט אחר.</p>
          {backend.kind === 'firebase' && (
            <button className="ghost" onClick={() => backend.signOut()}>
              יציאה מהחשבון
            </button>
          )}
        </section>
      </div>
      {removeInvite && (
        <ConfirmModal
          text={`לבטל את ההזמנה של ${removeInvite}?`}
          okText="ביטול הזמנה"
          danger
          onOk={() => actions.deleteInvite(removeInvite)}
          onClose={() => setRemoveInvite(null)}
        />
      )}
    </>
  );
}
