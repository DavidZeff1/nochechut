import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../data/DataContext';

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Header() {
  const auth = useAuth();
  const { pending, backend } = useData();
  const online = useOnline();
  const isAdmin = auth.status === 'ready' && auth.profile.role === 'admin';
  const sync = !online ? (pending ? 'לא מקוון · יישמר בחיבור' : 'לא מקוון') : pending ? 'שומר…' : '';

  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link className="brand" to="/" aria-label="מסך הבית">
            <img src="/logo.webp" alt="לוגו גרעין אומץ" width={86} height={48} />
            <span>
              <b>נוכחות חוגים</b>
              <small>גרעין אומץ עכו</small>
            </span>
          </Link>
          {sync && (
            <span className={`sync ${!online ? 'off' : ''}`} role="status">
              {sync}
            </span>
          )}
          <nav>
            {isAdmin ? (
              <>
                <NavLink to="/admin" end>
                  מבט-על
                </NavLink>
                <NavLink to="/admin/students">תלמידים</NavLink>
                <NavLink to="/admin/settings">הגדרות</NavLink>
                <NavLink to="/" end>
                  מדריכים
                </NavLink>
              </>
            ) : (
              backend.kind === 'firebase' && (
                <button className="navbtn" onClick={() => backend.signOut()}>
                  יציאה
                </button>
              )
            )}
          </nav>
        </div>
      </header>
      {backend.setDemoRole && auth.status === 'ready' && (
        <div className="demo-bar">
          <span>מצב הדגמה · נתונים בדויים שנשמרים רק בדפדפן הזה</span>
          <select
            className="demo-role"
            aria-label="תצוגת הדגמה"
            value={auth.profile.role}
            onChange={(e) => backend.setDemoRole?.(e.target.value as 'admin' | 'instructor')}
          >
            <option value="admin">תצוגת מנהל/ת</option>
            <option value="instructor">תצוגת מדריך/ה</option>
          </select>
        </div>
      )}
    </>
  );
}
