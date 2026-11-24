import { useEffect, useState } from 'react';
import type { Backend } from '../data/backend';

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
      </div>
    </div>
  );
}

export function NoAccess({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="signin">
      <div className="panel signin-card">
        <img src="/logo.webp" alt="" className="signin-logo" />
        <h1>אין עדיין הרשאה</h1>
        <p>
          החשבון <b dir="ltr">{email}</b> עוד לא הוזמן לאפליקציה. בקשו מהמנהל/ת להוסיף אתכם במסך ההגדרות, ואז היכנסו
          שוב.
        </p>
        <button className="ghost" onClick={onSignOut}>
          יציאה והחלפת חשבון
        </button>
      </div>
    </div>
  );
}
