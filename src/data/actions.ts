import { useMemo } from 'react';
import { today } from '../lib/dates';
import { newId, normPhone } from '../lib/format';
import { sessId } from '../lib/stats';
import type {
  AccessRequest,
  AttendanceRecord,
  Course,
  DataState,
  Mark,
  Role,
  Student,
  UserProfile,
} from '../lib/types';
import { useToast } from '../ui/Toast';
import { isPermissionError, type WriteOp } from './backend';
import { useData } from './DataContext';

const nowIso = () => new Date().toISOString();

/**
 * All writes go through here. Writes are not awaited by the UI: the Firestore cache shows
 * them at once (also offline) and syncs later; failures surface as a toast.
 */
export function useActions() {
  const { backend, S } = useData();
  const toast = useToast();

  return useMemo(() => {
    const fail = (e: unknown) => {
      console.error(e);
      toast(isPermissionError(e) ? 'אין הרשאה לשמור – פנו למנהל/ת' : 'השמירה נכשלה, נסו שוב', { error: true });
    };
    const run = (p: Promise<void>) => {
      p.catch(fail);
      return p;
    };

    const sessionPatch = (courseId: string, date: string, records: Record<string, Partial<AttendanceRecord>>) => ({
      courseId,
      date,
      records,
      updatedAt: nowIso(),
    });

    const enrollOps = (S0: DataState, courseId: string, studentId: string): WriteOp => {
      const id = `${courseId}_${studentId}`;
      return S0.enrollments[id]
        ? { type: 'merge', path: `enrollments/${id}`, data: { active: true, removedAt: null } }
        : {
            type: 'set',
            path: `enrollments/${id}`,
            data: { courseId, studentId, active: true, addedAt: today(), removedAt: null, group: '', info: '' },
          };
    };

    return {
      setMark: (courseId: string, date: string, sid: string, s: Mark) =>
        run(backend.mergeDoc(`sessions/${sessId(courseId, date)}`, sessionPatch(courseId, date, { [sid]: { s } }))),

      setNote: (courseId: string, date: string, sid: string, n: string) =>
        run(
          backend.mergeDoc(
            `sessions/${sessId(courseId, date)}`,
            sessionPatch(courseId, date, { [sid]: { n, t: n ? nowIso() : '' } }),
          ),
        ),

      setRecord: (courseId: string, date: string, sid: string, rec: { s: Mark; n: string }) =>
        run(
          backend.mergeDoc(
            `sessions/${sessId(courseId, date)}`,
            sessionPatch(courseId, date, { [sid]: { ...rec, t: rec.n ? nowIso() : '' } }),
          ),
        ),

      setMany: (courseId: string, date: string, recs: Record<string, { s: Mark }>) =>
        run(backend.mergeDoc(`sessions/${sessId(courseId, date)}`, sessionPatch(courseId, date, recs))),

      setSessionNote: (courseId: string, date: string, note: string) =>
        run(
          backend.mergeDoc(`sessions/${sessId(courseId, date)}`, {
            courseId,
            date,
            note,
            noteT: note ? nowIso() : '',
            updatedAt: nowIso(),
          }),
        ),

      deleteSession: (id: string) => run(backend.deleteDoc(`sessions/${id}`)),

      saveCourse: (id: string | null, data: Omit<Course, 'order'>) => {
        const cid = id || newId('c');
        run(
          id
            ? backend.mergeDoc(`courses/${cid}`, { ...data })
            : backend.setDoc(`courses/${cid}`, { ...data, order: Date.now() }),
        );
        return cid;
      },

      setCourseImage: (id: string, url: string) => run(backend.mergeDoc(`courses/${id}`, { image: url })),

      saveStudent: (sid: string, data: Pick<Student, 'name' | 'mother' | 'phone' | 'age'>) =>
        run(backend.mergeDoc(`students/${sid}`, { ...data, phone: normPhone(data.phone) })),

      /** Create a student and enroll them; optionally mark them as arrived on `markDate`. */
      createStudent: (
        data: Pick<Student, 'name' | 'mother' | 'phone' | 'age'>,
        courseId: string,
        markDate?: string,
      ) => {
        const sid = newId('s');
        const ops: WriteOp[] = [
          {
            type: 'set',
            path: `students/${sid}`,
            data: { ...data, phone: normPhone(data.phone), birthDate: '', createdAt: today() },
          },
          enrollOps(S, courseId, sid),
        ];
        if (markDate)
          ops.push({
            type: 'merge',
            path: `sessions/${sessId(courseId, markDate)}`,
            data: sessionPatch(courseId, markDate, { [sid]: { s: 'v' } }),
          });
        run(backend.batch(ops));
        return sid;
      },

      enroll: (courseId: string, studentId: string) => run(backend.batch([enrollOps(S, courseId, studentId)])),
      removeEnrollment: (eid: string) =>
        run(backend.mergeDoc(`enrollments/${eid}`, { active: false, removedAt: today() })),
      restoreEnrollment: (eid: string) =>
        run(backend.mergeDoc(`enrollments/${eid}`, { active: true, removedAt: null })),

      /**
       * Move `moveSids` from course `src` into a new course, taking their past attendance and notes along.
       * Ported from the original app's splitCourse.
       */
      splitCourse: (
        src: string,
        course: Pick<Course, 'name' | 'time' | 'day' | 'instructors'>,
        moveSids: string[],
        renameSrc?: string,
      ) => {
        const nid = newId('c');
        const now = nowIso();
        const moveSet = new Set(moveSids);
        const ops: WriteOp[] = [
          { type: 'set', path: `courses/${nid}`, data: { ...course, archived: false, order: Date.now() } },
        ];
        for (const sid of moveSids) {
          const eid = `${src}_${sid}`;
          const e = S.enrollments[eid];
          if (!e) continue;
          ops.push({ type: 'set', path: `enrollments/${nid}_${sid}`, data: { ...e, courseId: nid } });
          ops.push({ type: 'delete', path: `enrollments/${eid}` });
        }
        for (const [id, se] of Object.entries(S.sessions)) {
          if (se.courseId !== src) continue;
          const moved: Record<string, AttendanceRecord> = {};
          const kept: Record<string, AttendanceRecord> = {};
          for (const [sid, r] of Object.entries(se.records || {})) (moveSet.has(sid) ? moved : kept)[sid] = r;
          const has = Object.keys(moved).length > 0;
          if (!has && !se.note) continue;
          ops.push({
            type: 'set',
            path: `sessions/${sessId(nid, se.date)}`,
            data: { courseId: nid, date: se.date, note: se.note || '', records: moved, updatedAt: now },
          });
          if (has) ops.push({ type: 'set', path: `sessions/${id}`, data: { ...se, records: kept, updatedAt: now } });
        }
        if (renameSrc) ops.push({ type: 'merge', path: `courses/${src}`, data: { name: renameSrc } });
        return backend.batch(ops).then(
          () => nid,
          (e) => {
            fail(e);
            throw e;
          },
        );
      },

      invite: (email: string, role: Role, instructorName: string) =>
        run(backend.setDoc(`invites/${email.trim().toLowerCase()}`, { role, instructorName, invitedAt: nowIso() })),
      deleteInvite: (email: string) => run(backend.deleteDoc(`invites/${email}`)),
      updateUser: (uid: string, data: { role?: Role; instructorName?: string }) =>
        run(backend.mergeDoc(`users/${uid}`, data)),

      /**
       * Approves an access request with the given role. Someone who already has a profile (an
       * instructor asking to be an admin) gets the new role at once; anyone else gets an invite,
       * which their open "no access" screen picks up by itself.
       */
      approveRequest: (
        req: AccessRequest,
        role: Role,
        instructorName: string,
        users: Record<string, UserProfile>,
        decidedBy: string,
      ) => {
        const email = req.email.trim().toLowerCase();
        const uid = Object.entries(users).find(([, u]) => u.email?.toLowerCase() === email)?.[0];
        const ops: WriteOp[] = [
          uid
            ? {
                type: 'merge',
                path: `users/${uid}`,
                data: instructorName ? { role, instructorName } : { role },
              }
            : { type: 'set', path: `invites/${email}`, data: { role, instructorName, invitedAt: nowIso() } },
          {
            type: 'merge',
            path: `accessRequests/${email}`,
            data: { status: 'approved', role, decidedAt: nowIso(), decidedBy },
          },
        ];
        return run(backend.batch(ops));
      },
      declineRequest: (email: string, decidedBy: string) =>
        run(backend.mergeDoc(`accessRequests/${email}`, { status: 'declined', decidedAt: nowIso(), decidedBy })),
      deleteRequest: (email: string) => run(backend.deleteDoc(`accessRequests/${email}`)),

      /** Instructor contact details live in config/app under `instructors`, keyed by the name used on courses. */
      setInstructorPhone: (name: string, phone: string) =>
        run(backend.mergeDoc('config/app', { instructors: { [name]: { phone: normPhone(phone) } } })),

      /**
       * Renames an instructor everywhere the name is used: on every course (also merging two
       * spellings of the same person), on app accounts and invites, and in the contact details.
       */
      renameInstructor: (
        from: string,
        to: string,
        users: Record<string, UserProfile>,
        invites: Record<string, { instructorName?: string; role: Role }>,
      ) => {
        const name = to.trim();
        if (!name || name === from) return Promise.resolve();
        const ops: WriteOp[] = [];
        for (const [cid, c] of Object.entries(S.courses)) {
          if (!c?.instructors?.includes(from)) continue;
          const next = [...new Set(c.instructors.map((n) => (n === from ? name : n)))];
          ops.push({ type: 'merge', path: `courses/${cid}`, data: { instructors: next } });
        }
        for (const [uid, u] of Object.entries(users))
          if (u.instructorName === from)
            ops.push({ type: 'merge', path: `users/${uid}`, data: { instructorName: name } });
        for (const [em, inv] of Object.entries(invites))
          if (inv.instructorName === from)
            ops.push({ type: 'merge', path: `invites/${em}`, data: { instructorName: name } });
        const contacts = (S.config.instructors || {}) as Record<string, { phone?: string }>;
        if (contacts[from]) {
          const merged = { ...contacts, [name]: { ...contacts[from], ...contacts[name] } };
          delete merged[from];
          ops.push({ type: 'set', path: 'config/app', data: { ...S.config, instructors: merged } });
        }
        return run(backend.batch(ops));
      },
    };
  }, [backend, S, toast]);
}

export type Actions = ReturnType<typeof useActions>;
