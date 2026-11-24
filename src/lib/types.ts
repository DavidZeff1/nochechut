export type Mark = 'v' | 'x' | '';

export interface Course {
  name: string;
  day: number | null; // 0 = Sunday
  time: string;
  instructors: string[];
  archived: boolean;
  order?: number;
  image?: string;
}

export interface Student {
  name: string;
  mother?: string;
  phone?: string;
  age?: string;
  birthDate?: string;
  createdAt?: string;
}

export interface Enrollment {
  courseId: string;
  studentId: string;
  active: boolean;
  addedAt?: string;
  removedAt?: string | null;
  group?: string;
  info?: string;
}

export interface AttendanceRecord {
  s: Mark;
  n: string;
  t?: string;
}

export interface Session {
  courseId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  noteT?: string;
  records: Record<string, AttendanceRecord>;
  updatedAt?: string;
}

export interface AppConfig {
  codeHash?: string;
  [key: string]: unknown;
}

export type Role = 'admin' | 'instructor';

export interface UserProfile {
  role: Role;
  email: string;
  name?: string;
  instructorName?: string;
}

export interface Invite {
  role: Role;
  instructorName?: string;
  invitedAt?: string;
}

export interface DataState {
  courses: Record<string, Course>;
  students: Record<string, Student>;
  enrollments: Record<string, Enrollment>;
  sessions: Record<string, Session>;
  config: AppConfig;
}

/** An enrollment joined with its id and student. */
export interface EnrollmentRow extends Enrollment {
  id: string;
  st: Student;
}

export interface SessionRow {
  id: string;
  date: string;
  records: Record<string, AttendanceRecord>;
  note: string;
}

export interface DataIndex {
  sessionsByCourse: Record<string, SessionRow[]>;
  enrollmentsByCourse: Record<string, EnrollmentRow[]>;
  enrollmentsByStudent: Record<string, EnrollmentRow[]>;
}

export type CourseWithId = Course & { id: string };
