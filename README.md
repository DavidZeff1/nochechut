# נוכחות חוגים · גרעין אומץ עכו

Attendance app for the גרעין אומץ עכו after-school classes. Instructors mark who came on their phone; the admin sees registers, trends, notes and who needs a call. Hebrew, right-to-left, works offline and installs as an app (PWA).

**Stack:** Vite + React + TypeScript, Firebase (Firestore with offline cache, Auth, Storage, Hosting).

## Quick look, no setup

```bash
npm install
npm run dev:demo
```

Opens on http://localhost:5173 with invented data kept in the browser (`localStorage`). The bar under the header switches between the admin and instructor views. "Reset" = clear the site's storage.

## Screens

| Who        | Path                                    | What                                                                                                             |
| ---------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Instructor | `/`                                     | Today's classes first, then the week. "אני המדריך/ה" filters to your own classes.                                |
| Instructor | `/course/:id/:yyyymmdd?`                | Mark ✓ / ✗, per-student notes (auto-saved), session note, walk-ins, "mark the rest" with undo, WhatsApp summary. |
| Admin      | `/admin`                                | KPIs, this week's board, 12-week trend, students who missed the last 3 meetings, all courses, recent notes.      |
| Admin      | `/admin/course/:id`                     | Full register (click a cell to fix it), students, split course, links for instructors, CSV / copy-to-Excel.      |
| Admin      | `/admin/session/:id/:yyyymmdd`          | Same marking screen, for any date.                                                                               |
| Admin      | `/admin/students`, `/admin/student/:id` | Search, per-student history across courses, enrol in more courses.                                               |
| Admin      | `/admin/settings`                       | Invite instructors/admins, change roles, download a full JSON backup.                                            |

Old `#course-…` links from the previous version redirect to the new paths.

## Data model

Same shape as the previous version, so existing data imports as is:

```
courses/{id}                    name, day (0=Sunday | null), time, instructors[], archived, order, image?
students/{id}                   name, mother, phone, age, birthDate, createdAt
enrollments/{courseId_studentId} courseId, studentId, active, addedAt, removedAt, group, info
sessions/{courseId_YYYYMMDD}    courseId, date, note, noteT, records{studentId: {s: 'v'|'x'|'', n, t}}, updatedAt
config/app
users/{uid}                     role 'admin'|'instructor', email, name, instructorName
invites/{email}                 role, instructorName
```

Writes are merges, so two instructors marking the same session at once don't overwrite each other. Marking works without a connection; the header shows "לא מקוון" / "שומר…" until it syncs.

## Setting up Firebase

1. **Create a project** at https://console.firebase.google.com (Analytics not needed).
2. **Firestore:** Build → Firestore Database → Create, location `eur3` or `me-west1` (Tel Aviv), production mode.
3. **Authentication:** Build → Authentication → Get started → enable **Google** and **Email/Password → Email link (passwordless)**. Under Settings → Authorized domains add your hosting domain if you use a custom one.
4. **Storage** (for uploaded course pictures): Build → Storage → Get started. Needs the Blaze plan on new projects; without it everything works except uploading custom course pictures.
5. **Web app config:** Project settings → Your apps → Add app → Web. Copy the values into `.env.local`:
   ```bash
   cp .env.example .env.local   # then fill in VITE_FIREBASE_*
   ```
6. **Project id:** put it in `.firebaserc` instead of `YOUR-FIREBASE-PROJECT-ID`.
7. **Deploy rules and the site:**
   ```bash
   npx firebase-tools login
   npm run build
   npx firebase-tools deploy
   ```
8. **First admin.** Access is by invitation. Create a service-account key (Project settings → Service accounts → Generate new private key, keep it out of git) and run:
   ```bash
   npm run add-user -- you@gmail.com --credentials path/to/key.json
   ```
   Then sign in with that address. Everyone else you invite from Settings in the app (instructors get `--role instructor --name שרית` style entries, which tie them to their classes).

### Moving the current data over

Export the data from the current version as JSON (`{courses, students, enrollments, sessions, config}`, each a map of id → document; the backup button in Settings produces exactly this) and run:

```bash
npm run import -- export.json --dry-run                              # checks and counts, writes nothing
npm run import -- export.json --credentials path/to/key.json         # writes
```

Running it again is safe: ids are kept and documents are merged.

### Automatic deploys

`.github/workflows/deploy.yml` deploys on every push to `main` once these repository secrets exist: `FIREBASE_SERVICE_ACCOUNT` (the key JSON) and the five `VITE_FIREBASE_*` values. Until then it is skipped. `ci.yml` runs lint, type checks, unit tests, the build and the browser tests on every push and PR.

## Local Firebase emulators

Needs Java 11+.

```bash
npm run emulators          # Auth, Firestore, Storage + UI on http://localhost:4000
npm run seed:emulator      # demo data + invites for admin@example.com / madricha@example.com
VITE_USE_EMULATOR=true npm run dev
```

Sign in with Google → "Add new account" in the emulator popup → use one of the invited addresses.

## Course pictures

Each card shows a hand-painted illustration chosen from the course name (Hebrew keywords in `src/lib/images.ts`, e.g. a name containing "שחמט" gets the chess picture; anything unmatched gets the community-center picture). An admin can upload a custom picture per course from "עריכת חוג ותמונה"; it is cropped to 16:10 and stored in Firebase Storage.

The 13 illustrations were generated with ElevenLabs. To add them to the repo:

1. Open the flow https://elevenlabs.io/app/flows/cBP7Yr4iaxvFZy7XiTd6 and download each image into `art/raw/` (any name containing the generation id works, or rename to `<slug>.png`, e.g. `chess.png`).
2. `npm run images` → writes `public/courses/<slug>-800.webp` and `-1280.webp`.
3. Commit `public/courses/`.

Prompts, slugs and the shared style are in `docs/image-prompts.md` and `art/images.json`. Until the files are there, cards simply show no picture.

## Scripts

|                                                 |                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev` / `dev:demo`                      | Dev server (Firebase / in-browser demo data)                                                                                               |
| `npm run build`                                 | Type check + production build into `dist/`                                                                                                 |
| `npm run lint` · `typecheck` · `format`         | Code checks                                                                                                                                |
| `npm test`                                      | Unit tests (Vitest)                                                                                                                        |
| `npm run test:e2e`                              | Browser tests (Playwright) against the demo build, phone and desktop sizes. `CHROME_PATH=/usr/bin/google-chrome` uses an installed Chrome. |
| `npm run images`                                | Process `art/raw` into the course pictures                                                                                                 |
| `npm run import` · `add-user` · `seed:emulator` | Data scripts (firebase-admin)                                                                                                              |

The previous single-file version is kept in `legacy/index.html` for reference.
