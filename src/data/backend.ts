import type { Role } from '../lib/types';

export type Unsubscribe = () => void;
export type DocData = Record<string, unknown>;

export interface CollectionSnapshot<T> {
  docs: Record<string, T>;
  /** True while this page's own writes have not reached the server yet. */
  pending: boolean;
  /** True when the data came from the offline cache and the server has not confirmed it. */
  fromCache: boolean;
}

export type WriteOp =
  | { type: 'set'; path: string; data: DocData }
  | { type: 'merge'; path: string; data: DocData }
  | { type: 'delete'; path: string };

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
}

/** Everything the app needs from a database. Paths look like "courses/c01". */
export interface Backend {
  kind: 'firebase' | 'memory';
  watchCollection<T>(col: string, next: (snap: CollectionSnapshot<T>) => void, error: (e: Error) => void): Unsubscribe;
  watchDoc<T>(path: string, next: (data: T | undefined) => void, error: (e: Error) => void): Unsubscribe;
  getDoc<T>(path: string): Promise<T | undefined>;
  /** Replace the whole document. */
  setDoc(path: string, data: DocData): Promise<void>;
  /** Create or deep-merge into the document (nested maps such as `records` are merged, not replaced). */
  mergeDoc(path: string, data: DocData): Promise<void>;
  deleteDoc(path: string): Promise<void>;
  /** Apply many writes; each chunk of up to 400 is atomic. */
  batch(ops: WriteOp[]): Promise<void>;
  uploadCourseImage(courseId: string, blob: Blob): Promise<string>;

  // auth
  onAuth(cb: (user: AuthUser | null) => void): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  sendSignInLink(email: string): Promise<void>;
  completeSignInLink(): Promise<boolean>;
  signOut(): Promise<void>;
  /** Demo only: switch between the admin and instructor views, or the screens before access. */
  setDemoRole?(view: DemoView): void;
}

export type DemoView = Role | 'signedOut' | 'noAccess';

export const isPermissionError = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && String((e as { code: unknown }).code).includes('permission');
