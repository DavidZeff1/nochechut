/**
 * Imports a JSON export into Firestore. Safe to run more than once: documents keep their
 * ids and are merged, so nothing is duplicated.
 *
 *   npm run import -- export.json --dry-run           show what would be written
 *   npm run import -- export.json --project my-proj   write to a real project
 *   npm run import -- export.json --emulator          write to the local emulator
 *
 * The file is either the backup from Settings → "הורדת גיבוי מלא", or any JSON of the form
 * { courses: {id: {...}}, students: {...}, enrollments: {...}, sessions: {...}, config: {...} }.
 * Arrays of documents with an "id" field are accepted too.
 */
import { readFileSync } from 'node:fs';
import { connect, parseArgs, writeAll } from './admin-sdk';

type Doc = Record<string, unknown>;
const COLLECTIONS = ['courses', 'students', 'enrollments', 'sessions'] as const;

function asMap(v: unknown): Record<string, Doc> {
  if (!v) return {};
  if (Array.isArray(v)) {
    const out: Record<string, Doc> = {};
    for (const d of v as Doc[]) {
      const { id, ...rest } = d;
      if (typeof id === 'string' && id) out[id] = rest;
    }
    return out;
  }
  return v as Record<string, Doc>;
}

const validId = (id: string) => !!id && !id.includes('/') && id !== '.' && id !== '..';

async function main() {
  const cli = parseArgs();
  const file = cli.args[0];
  if (!file) {
    console.error('Usage: npm run import -- <export.json> [--dry-run] [--emulator | --project <id>]');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const dryRun = cli.flags.has('dry-run');
  const writes: Array<[string, Doc]> = [];
  const problems: string[] = [];

  for (const col of COLLECTIONS) {
    for (const [id, doc] of Object.entries(asMap(data[col]))) {
      if (!validId(id)) problems.push(`${col}/${id}: invalid id`);
      else writes.push([`${col}/${id}`, doc]);
    }
  }
  const config = data.config?.app ?? data.config;
  if (config && typeof config === 'object' && Object.keys(config).length) writes.push(['config/app', config]);

  // Cross-checks: enrollments and sessions should point at courses/students that exist.
  const has = (col: string, id: string) => writes.some(([p]) => p === `${col}/${id}`);
  for (const [path, doc] of writes) {
    if (path.startsWith('enrollments/')) {
      if (!has('courses', String(doc.courseId))) problems.push(`${path}: unknown course ${doc.courseId}`);
      if (!has('students', String(doc.studentId))) problems.push(`${path}: unknown student ${doc.studentId}`);
    } else if (path.startsWith('sessions/') && !has('courses', String(doc.courseId))) {
      problems.push(`${path}: unknown course ${doc.courseId}`);
    }
  }

  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c, writes.filter(([p]) => p.startsWith(c + '/')).length]));
  console.log('Documents:', counts, config ? '+ config/app' : '');
  if (problems.length) {
    console.warn(`${problems.length} warning(s):`);
    for (const p of problems.slice(0, 20)) console.warn('  ' + p);
    if (problems.length > 20) console.warn(`  … and ${problems.length - 20} more`);
  }
  if (dryRun) {
    console.log('Dry run, nothing written.');
    return;
  }
  const { projectId, emulator, db } = connect(cli);
  console.log(`Writing ${writes.length} documents to ${emulator ? 'the emulator' : projectId}…`);
  await writeAll(db, writes, false);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
