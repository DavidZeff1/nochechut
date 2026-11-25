import type { DataState, InstructorProfile } from './types';

/** Document id for an instructor's profile: the name, made safe for a Firestore id. */
export const instructorId = (name: string) => encodeURIComponent(name.trim());

export const profileFor = (S: Pick<DataState, 'instructors'>, name: string): InstructorProfile | undefined =>
  S.instructors?.[instructorId(name)];

/** One or two letters for an avatar without a photo: "שרה סולימן" → "שס". */
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('');

/** A stable colour per name, from the app's palette. */
export function avatarHue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['#1847a8', '#b5391d', '#8a5718', '#2e7d5b', '#6a3fa0', '#0f6e8c'][h % 6];
}
