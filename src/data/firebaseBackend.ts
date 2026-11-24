import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { connectStorageEmulator, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import type { Backend, DocData } from './backend';

const EMAIL_KEY = 'signin-email';

export function createFirebaseBackend(): Backend {
  const env = import.meta.env;
  const useEmulator = env.VITE_USE_EMULATOR === 'true';
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY || 'demo-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-nochechut',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-nochechut.appspot.com',
    appId: env.VITE_FIREBASE_APP_ID,
  });
  // Offline-first: marks made without signal are kept and synced later.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const auth = getAuth(app);
  auth.languageCode = 'he';
  const storage = getStorage(app);
  if (useEmulator) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }

  const chunks = <T>(arr: T[], n: number) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  return {
    kind: 'firebase',
    watchCollection(col, next, error) {
      return onSnapshot(
        collection(db, col),
        { includeMetadataChanges: true },
        (snap) => {
          const docs: Record<string, never> = {};
          snap.forEach((d) => {
            docs[d.id] = d.data() as never;
          });
          next({ docs, pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache });
        },
        error,
      );
    },
    watchDoc(path, next, error) {
      return onSnapshot(doc(db, path), (d) => next(d.exists() ? (d.data() as never) : undefined), error);
    },
    async getDoc(path) {
      const d = await getDoc(doc(db, path));
      return d.exists() ? (d.data() as never) : undefined;
    },
    setDoc: (path, data: DocData) => setDoc(doc(db, path), data),
    mergeDoc: (path, data: DocData) => setDoc(doc(db, path), data, { merge: true }),
    deleteDoc: (path) => deleteDoc(doc(db, path)),
    async batch(ops) {
      for (const chunk of chunks(ops, 400)) {
        const b = writeBatch(db);
        for (const op of chunk) {
          const r = doc(db, op.path);
          if (op.type === 'set') b.set(r, op.data);
          else if (op.type === 'merge') b.set(r, op.data, { merge: true });
          else b.delete(r);
        }
        await b.commit();
      }
    },
    async uploadCourseImage(courseId, blob) {
      const r = ref(storage, `courses/${courseId}-${Date.now()}.webp`);
      await uploadBytes(r, blob, { contentType: 'image/webp', cacheControl: 'public, max-age=31536000' });
      return getDownloadURL(r);
    },

    onAuth: (cb) =>
      onAuthStateChanged(auth, (u) =>
        cb(u ? { uid: u.uid, email: (u.email || '').toLowerCase(), displayName: u.displayName || undefined } : null),
      ),
    async signInWithGoogle() {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    async sendSignInLink(email) {
      await sendSignInLinkToEmail(auth, email, { url: window.location.origin + '/signin', handleCodeInApp: true });
      localStorage.setItem(EMAIL_KEY, email);
    },
    async completeSignInLink() {
      if (!isSignInWithEmailLink(auth, window.location.href)) return false;
      const email = localStorage.getItem(EMAIL_KEY) || window.prompt('לאימות, הקלידו שוב את כתובת המייל') || '';
      await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem(EMAIL_KEY);
      return true;
    },
    signOut: () => signOut(auth),
  };
}
