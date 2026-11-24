/**
 * Fills the local Firestore emulator with the invented demo data and two invites:
 *   admin@example.com       admin
 *   madricha@example.com    instructor (שרית)
 * Sign in with either address through the emulator's Google popup ("Add new account").
 *
 *   npm run emulators            (in one terminal)
 *   npm run seed:emulator        (in another)
 */
import { demoSeed } from '../src/data/demoSeed';
import { connect, parseArgs, writeAll } from './admin-sdk';

async function main() {
  const cli = parseArgs();
  cli.flags.add('emulator');
  const { db } = connect(cli);
  const docs = demoSeed();
  const now = new Date().toISOString();
  const writes: Array<[string, Record<string, unknown>]> = [
    ...Object.entries(docs).map(([p, d]) => [p, d] as [string, Record<string, unknown>]),
    ['invites/admin@example.com', { role: 'admin', invitedAt: now }],
    ['invites/madricha@example.com', { role: 'instructor', instructorName: 'שרית', invitedAt: now }],
  ];
  await writeAll(db, writes, false);
  console.log(`Seeded ${writes.length} documents into the emulator.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
