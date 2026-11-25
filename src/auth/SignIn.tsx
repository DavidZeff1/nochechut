import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuthUser, Backend, DemoView } from '../data/backend';
import type { Invite } from '../lib/types';
import { RequestAccessForm } from './AccessRequest';

/** Demo build only: switch views from the screens that have no header. */
export function DemoSwitch({ backend, value }: { backend: Backend; value: DemoView }) {
  if (!backend.setDemoRole) return null;
  return (
    <div className="demo-bar signin-demo">
      <span>מצב הדגמה</span>
      <select
        className="demo-role"
        aria-label="תצוגת הדגמה"
        value={value}
        onChange={(e) => backend.setDemoRole?.(e.target.value as DemoView)}
      >
        <option value="admin">תצוגת מנהל/ת</option>
        <option value="instructor">תצוגת מדריך/ה</option>
        <option value="signedOut">מסך כניסה</option>
        <option value="noAccess">חשבון בלי הרשאה</option>
      </select>
    </div>
  );
}

export function SignIn({ backend }: { backend: Backend }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.completeSignInLink().catch(() => setMsg('הקישור פג תוקף או כבר נוצל. בקשו קישור חדש.'));
  }, [backend]);

  return (
    <div className="signin">
      <div className="panel signin-card">
        <img src="/logo.webp" alt="לוגו גרעין אומץ" className="signin-logo" />
        <h1>נוכחות חוגים</h1>
        <p className="muted">כניסה למדריכים ולצוות גרעין אומץ עכו</p>
        <button
          className="pri wide"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg('');
            try {
              await backend.signInWithGoogle();
            } catch {
              setMsg('הכניסה עם Google לא הושלמה. נסו שוב.');
            } finally {
              setBusy(false);
            }
          }}
        >
          כניסה עם Google
        </button>
        <div className="or">או קישור כניסה למייל</div>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.includes('@')) return setMsg('הקלידו כתובת מייל תקינה');
            setBusy(true);
            try {
              await backend.sendSignInLink(email.trim().toLowerCase());
              setMsg(`שלחנו קישור כניסה אל ${email}. פתחו אותו מהטלפון הזה.`);
            } catch {
              setMsg('שליחת הקישור נכשלה. נסו שוב.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="כתובת מייל"
            dir="ltr"
          />
          <button className="ghost" disabled={busy}>
            שליחת קישור
          </button>
        </form>
        {msg && (
          <p className="small" role="status">
            {msg}
          </p>
        )}
        <Link className="small" to="/guide">
          איך משתמשים באפליקציה? למדריך המלא
        </Link>
      </div>
      <DemoSwitch backend={backend} value="signedOut" />
    </div>
  );
}

export function NoAccess({ backend, user }: { backend: Backend; user: AuthUser }) {
  // Once an admin approves, an invite appears for this email; reload so the first-sign-in
  // step turns it into a profile. Only when it appears while waiting here: if one was already
  // there, claiming it failed for another reason and reloading would loop.
  useEffect(() => {
    let first = true;
    return backend.watchDoc<Invite>(
      `invites/${user.email.trim().toLowerCase()}`,
      (inv) => {
        if (inv && !first) window.location.reload();
        first = false;
      },
      () => {},
    );
  }, [backend, user.email]);
  return (
    <div className="signin">
      <div className="panel signin-card">
        <img src="/logo.webp" alt="" className="signin-logo" />
        <h1>אין עדיין הרשאה</h1>
        <p>
          החשבון <b dir="ltr">{user.email}</b> עוד לא הוזמן לאפליקציה. אפשר לבקש גישה כאן, והבקשה תגיע למנהלים.
        </p>
        <RequestAccessForm backend={backend} user={user} />
        <button className="ghost" onClick={() => backend.signOut()}>
          יציאה והחלפת חשבון
        </button>
        <Link className="small" to="/guide">
          איך משתמשים באפליקציה? למדריך המלא
        </Link>
      </div>
      <DemoSwitch backend={backend} value="noAccess" />
    </div>
  );
}
