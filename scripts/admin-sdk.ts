/** Shared firebase-admin setup for the command-line scripts. */
import { initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';

export interface Cli {
  flags: Set<string>;
  opts: Record<string, string>;
  args: string[];
}

export function parseArgs(argv = process.argv.slice(2)): Cli {
  const flags = new Set<string>();
  const opts: Record<string, string> = {};
  const args: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=', 2);
      if (v !== undefined) opts[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--') && ['project', 'credentials'].includes(k))
        opts[k] = argv[++i];
      else flags.add(k);
    } else args.push(a);
  }
  return { flags, opts, args };
}

function projectFromRc(): string | undefined {
  if (!existsSync('.firebaserc')) return undefined;
  const id = JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default;
  return id && !String(id).startsWith('YOUR-') ? id : undefined;
}

/**
 * --emulator          use the local emulator (project demo-nochechut)
 * --project <id>      Firebase project id (default: .firebaserc)
 * --credentials <f>   service-account JSON (default: GOOGLE_APPLICATION_CREDENTIALS / gcloud login)
 */
export function connect(cli: Cli): { app: App; db: Firestore; projectId: string; emulator: boolean } {
  const emulator = cli.flags.has('emulator') || !!process.env.FIRESTORE_EMULATOR_HOST;
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
  }
  const projectId = cli.opts.project || (emulator ? 'demo-nochechut' : projectFromRc());
  if (!projectId) {
    console.error('No project id. Pass --project <id>, set it in .firebaserc, or use --emulator.');
    process.exit(1);
  }
  const credential = emulator
    ? undefined
    : cli.opts.credentials
      ? cert(JSON.parse(readFileSync(cli.opts.credentials, 'utf8')))
      : applicationDefault();
  const app = initializeApp({ projectId, ...(credential ? { credential } : {}) });
  return { app, db: getFirestore(app), projectId, emulator };
}

type Doc = Record<string, unknown>;

/** Writes docs in batches of 400 (Firestore's limit is 500). Merges into existing docs. */
export async function writeAll(db: Firestore, writes: Array<[string, Doc]>, dryRun: boolean) {
  if (dryRun) return writes.length;
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [path, data] of writes.slice(i, i + 400)) batch.set(db.doc(path), data, { merge: true });
    await batch.commit();
    process.stdout.write(`  ${Math.min(i + 400, writes.length)}/${writes.length}\r`);
  }
  process.stdout.write('\n');
  return writes.length;
}
