/** Old links from the single-page version used #course-ID-YYYYMMDD style hashes. */
export function legacyHashToPath(hash: string): string | null {
  const h = hash.replace(/^#/, '');
  let m: RegExpMatchArray | null;
  if ((m = h.match(/^course-([A-Za-z0-9]+)(?:-(\d{8}))?$/))) return `/course/${m[1]}${m[2] ? '/' + m[2] : ''}`;
  if ((m = h.match(/^admin-session-([A-Za-z0-9]+)-(\d{8})$/))) return `/admin/session/${m[1]}/${m[2]}`;
  if ((m = h.match(/^admin-course-([A-Za-z0-9]+)$/))) return `/admin/course/${m[1]}`;
  if ((m = h.match(/^admin-student-([A-Za-z0-9]+)$/))) return `/admin/student/${m[1]}`;
  if (h === 'admin-students') return '/admin/students';
  if (h === 'admin-settings') return '/admin/settings';
  if (h === 'admin') return '/admin';
  return null;
}
