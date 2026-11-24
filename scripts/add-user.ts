/**
 * Invites a user (creates invites/<email>). They get access the first time they sign in
 * with that email. Use it once to create the first admin; after that, admins invite people
 * from Settings in the app.
 *
 *   npm run add-user -- someone@gmail.com                       admin
 *   npm run add-user -- someone@gmail.com --role instructor --name שרית
 *   add --emulator or --project <id> as in the import script
 */
import { connect, parseArgs } from './admin-sdk';

async function main() {
  const argv = process.argv.slice(2);
  // --role and --name take a value
  const opts: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--role' || argv[i] === '--name') opts[argv[i].slice(2)] = argv[++i] ?? '';
    else rest.push(argv[i]);
  }
  const cli = parseArgs(rest);
  const email = (cli.args[0] || '').trim().toLowerCase();
  const role = opts.role || 'admin';
  if (!email.includes('@') || !['admin', 'instructor'].includes(role)) {
    console.error('Usage: npm run add-user -- <email> [--role admin|instructor] [--name <instructor name>]');
    process.exit(1);
  }
  const { db, projectId, emulator } = connect(cli);
  const invite: Record<string, string> = { role, invitedAt: new Date().toISOString() };
  if (opts.name) invite.instructorName = opts.name;
  await db.doc(`invites/${email}`).set(invite);
  console.log(`Invited ${email} as ${role} on ${emulator ? 'the emulator' : projectId}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
