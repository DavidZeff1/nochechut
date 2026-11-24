import type { Role } from '../lib/types';
import type { AuthUser, Backend, DocData } from './backend';
import { demoSeed } from './demoSeed';

const STORE_KEY = 'demo-db-v1';
const ROLE_KEY = 'demo-role';

type Store = Record<string, DocData>;

const isObj = (v: unknown): v is DocData => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function deepMerge(target: DocData, src: DocData): DocData {
  for (const [k, v] of Object.entries(src)) {
    if (isObj(v) && isObj(target[k])) deepMerge(target[k] as DocData, v);
    else target[k] = clone(v);
  }
  return target;
}

/**
 * An in-browser database with the same behaviour as Firestore, used for the demo build
 * (`npm run dev:demo`) and for end-to-end tests. Data persists in localStorage.
 */
export function createMemoryBackend(opts: { seed?: Store; persist?: boolean } = {}): Backend {
  const persist = opts.persist ?? true;
  let store: Store;
  try {
    const saved = persist ? localStorage.getItem(STORE_KEY) : null;
    store = saved ? JSON.parse(saved) : clone(opts.seed ?? demoSeed());
  } catch {
    store = clone(opts.seed ?? demoSeed());
  }
  const listeners = new Set<() => void>();
  const authListeners = new Set<(u: AuthUser | null) => void>();
  let role: Role = ((typeof localStorage !== 'undefined' && localStorage.getItem(ROLE_KEY)) as Role) || 'admin';

  const save = () => {
    if (!persist) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* storage full or unavailable: keep working in memory */
    }
  };
  const emit = () => {
    save();
    queueMicrotask(() => listeners.forEach((l) => l()));
  };
  const collectionDocs = (col: string) => {
    const docs: Record<string, DocData> = {};
    for (const [path, data] of Object.entries(store)) {
      const i = path.lastIndexOf('/');
      if (path.slice(0, i) === col) docs[path.slice(i + 1)] = data;
    }
    return docs;
  };
  const demoUser = (): AuthUser => ({
    uid: `demo-${role}`,
    email: `${role}@demo.local`,
    displayName: role === 'admin' ? 'מנהלת (הדגמה)' : 'שרית',
  });
  const ensureProfile = () => {
    store[`users/demo-${role}`] = {
      role,
      email: `${role}@demo.local`,
      instructorName: role === 'instructor' ? 'שרית' : '',
    };
  };
  ensureProfile();

  return {
    kind: 'memory',
    watchCollection(col, next) {
      const fire = () => next({ docs: clone(collectionDocs(col)) as never, pending: false, fromCache: false });
      listeners.add(fire);
      queueMicrotask(fire);
      return () => listeners.delete(fire);
    },
    watchDoc(path, next) {
      const fire = () => next(store[path] ? (clone(store[path]) as never) : undefined);
      listeners.add(fire);
      queueMicrotask(fire);
      return () => listeners.delete(fire);
    },
    async getDoc(path) {
      return store[path] ? (clone(store[path]) as never) : undefined;
    },
    async setDoc(path, data) {
      store[path] = clone(data);
      emit();
    },
    async mergeDoc(path, data) {
      store[path] = deepMerge(store[path] || {}, data);
      emit();
    },
    async deleteDoc(path) {
      delete store[path];
      emit();
    },
    async batch(ops) {
      for (const op of ops) {
        if (op.type === 'set') store[op.path] = clone(op.data);
        else if (op.type === 'merge') store[op.path] = deepMerge(store[op.path] || {}, op.data);
        else delete store[op.path];
      }
      emit();
    },
    async uploadCourseImage(_courseId, blob) {
      return await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(blob);
      });
    },

    onAuth(cb) {
      authListeners.add(cb);
      queueMicrotask(() => cb(demoUser()));
      return () => authListeners.delete(cb);
    },
    async signInWithGoogle() {},
    async sendSignInLink() {},
    async completeSignInLink() {
      return false;
    },
    async signOut() {},
    setDemoRole(next) {
      role = next;
      try {
        localStorage.setItem(ROLE_KEY, next);
      } catch {
        /* ignore */
      }
      ensureProfile();
      emit();
      authListeners.forEach((cb) => cb(demoUser()));
    },
  };
}
