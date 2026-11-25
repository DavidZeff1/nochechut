import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildIndex } from '../lib/stats';
import type { DataIndex, DataState } from '../lib/types';
import type { Backend } from './backend';

type Col = 'courses' | 'students' | 'enrollments' | 'sessions' | 'instructors';
const COLS: Col[] = ['courses', 'students', 'enrollments', 'sessions', 'instructors'];

export interface DataContextValue {
  S: DataState;
  X: DataIndex;
  loaded: boolean;
  error: string;
  /** Own writes not yet confirmed by the server (e.g. offline). */
  pending: boolean;
  backend: Backend;
}

const Ctx = createContext<DataContextValue | null>(null);

const EMPTY: DataState = { courses: {}, students: {}, enrollments: {}, sessions: {}, instructors: {}, config: {} };

export function DataProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [S, setS] = useState<DataState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [pendingCols, setPendingCols] = useState<Record<string, boolean>>({});
  const loadedCols = useRef(new Set<string>());

  // Subscribe once per collection for the lifetime of the provider.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loadedCols.current.has('courses')) setError('לא ניתן להגיע לנתונים כרגע. בדקו את החיבור לאינטרנט.');
    }, 10000);
    const unsubs = COLS.map((col) =>
      backend.watchCollection<never>(
        col,
        (snap) => {
          setS((prev) => ({ ...prev, [col]: snap.docs }));
          setPendingCols((p) => (p[col] === snap.pending ? p : { ...p, [col]: snap.pending }));
          loadedCols.current.add(col);
          if (col === 'courses') {
            clearTimeout(timer);
            setError('');
            setLoaded(true);
          }
        },
        (e) => {
          clearTimeout(timer);
          setError(`שגיאה בטעינת הנתונים (${(e as { code?: string }).code || e.message}).`);
          setLoaded(true);
        },
      ),
    );
    const unsubConfig = backend.watchDoc<DataState['config']>(
      'config/app',
      (d) => setS((prev) => ({ ...prev, config: d || {} })),
      () => {},
    );
    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
      unsubConfig();
    };
  }, [backend]);

  const X = useMemo(() => buildIndex(S), [S]);
  const pending = Object.values(pendingCols).some(Boolean);
  const value = useMemo(() => ({ S, X, loaded, error, pending, backend }), [S, X, loaded, error, pending, backend]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
