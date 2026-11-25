/**
 * Takes the screenshots for the in-app guide (/guide) from the demo build, so they only ever
 * show invented data. Writes public/guide/<name>.webp.
 *
 *   npm run guide:shots                 build the demo, serve it, take every screenshot
 *   CHROME_PATH=/path/to/chrome npm run guide:shots
 */
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';

const PORT = 4329;
const BASE = `http://localhost:${PORT}`;
const OUT = join(process.cwd(), 'public', 'guide');
type View = 'admin' | 'instructor' | 'signedOut' | 'noAccess';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 860 };

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
}

async function open(browser: Browser, view: View, path: string, phone: boolean): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: phone ? PHONE : DESKTOP,
    deviceScaleFactor: phone ? 2 : 1,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    colorScheme: 'light',
  });
  await ctx.addInitScript((v) => localStorage.setItem('demo-role', v), view);
  const page = await ctx.newPage();
  await page.goto(BASE + path);
  // The demo banner is not part of the real app.
  await page.addStyleTag({ content: '.demo-bar{display:none!important} *{caret-color:transparent!important}' });
  await page.waitForTimeout(700);
  return page;
}

async function shot(page: Page, name: string, opts: { fullPage?: boolean } = {}) {
  await page.waitForTimeout(400);
  const png = await page.screenshot({ fullPage: !!opts.fullPage, animations: 'disabled' });
  await sharp(png)
    .webp({ quality: 80, effort: 6 })
    .toFile(join(OUT, `${name}.webp`));
  console.log('✓', name);
  await page.context().close();
}

const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).first();
const rows = (page: Page) => page.getByTestId('student-row');

async function main() {
  mkdirSync(OUT, { recursive: true });
  execSync('npx vite build --mode demo --outDir dist-demo', { stdio: 'inherit' });
  const server = spawn(
    'npx',
    ['vite', 'preview', '--mode', 'demo', '--outDir', 'dist-demo', '--port', String(PORT), '--strictPort'],
    {
      stdio: 'ignore',
    },
  );
  try {
    await waitForServer();
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

    // ---- before access (phone) ----
    let p = await open(browser, 'signedOut', '/', true);
    await shot(p, 'signin');

    p = await open(browser, 'noAccess', '/', true);
    await p.getByLabel('שם מלא *').fill('נועה כהן');
    await p.getByLabel('הסבר קצר למנהל/ת (לא חובה)').fill('מדריכה חדשה בחוג קרמיקה');
    await shot(p, 'noaccess', { fullPage: true });

    // ---- instructors (phone) ----
    p = await open(browser, 'instructor', '/', true);
    await shot(p, 'home');

    p = await open(browser, 'instructor', '/course/c01', true);
    await shot(p, 'session');

    p = await open(browser, 'instructor', '/course/c01', true);
    for (const i of [0, 1, 2]) await rows(p).nth(i).getByRole('button', { name: 'הגיע/ה', exact: true }).click();
    await rows(p).nth(3).getByRole('button', { name: 'לא הגיע/ה', exact: true }).click();
    await rows(p).nth(0).scrollIntoViewIfNeeded();
    await p.mouse.wheel(0, -60);
    await shot(p, 'session-marked');

    p = await open(browser, 'instructor', '/course/c01', true);
    const row = rows(p).nth(1);
    await row.getByRole('button', { name: '+ הערה' }).click();
    await row.getByPlaceholder(/הערה למפגש/).fill('הגיע באיחור של רבע שעה');
    await row.scrollIntoViewIfNeeded();
    await p.mouse.wheel(0, -120);
    await shot(p, 'session-note');

    p = await open(browser, 'instructor', '/course/c01', true);
    await btn(p, /^סימון הנותרים/).click();
    await shot(p, 'session-rest');

    p = await open(browser, 'instructor', '/course/c01', true);
    await btn(p, 'תאריך אחר').click();
    await shot(p, 'session-dates');

    p = await open(browser, 'instructor', '/course/c01', true);
    await btn(p, '+ הוספת תלמיד/ה שלא ברשימה').click();
    await p.locator('.addbox').scrollIntoViewIfNeeded();
    await shot(p, 'walkin');

    p = await open(browser, 'instructor', '/course/c01', true);
    await p.mouse.wheel(0, 3000);
    await shot(p, 'session-summary', { fullPage: false });

    p = await open(browser, 'instructor', '/', true);
    await btn(p, 'בקשת הרשאת מנהל/ת').click();
    await shot(p, 'request-admin');

    p = await open(browser, 'instructor', '/admin', true);
    await shot(p, 'adminonly');

    // ---- admins (desktop) ----
    p = await open(browser, 'admin', '/admin', false);
    await shot(p, 'overview');

    p = await open(browser, 'admin', '/admin', false);
    await p
      .getByText(/תלמידים לא הגיעו|כל התלמידים הפעילים/)
      .first()
      .scrollIntoViewIfNeeded();
    await p.mouse.wheel(0, -80);
    await shot(p, 'overview-risk');

    p = await open(browser, 'admin', '/admin/course/c01', false);
    await shot(p, 'register');

    p = await open(browser, 'admin', '/admin/course/c01', false);
    await p.locator('[data-testid^="cell-"]').first().click();
    await shot(p, 'register-cell');

    p = await open(browser, 'admin', '/admin/course/c01', false);
    await btn(p, 'עריכת חוג ותמונה').click();
    await shot(p, 'course-edit');

    p = await open(browser, 'admin', '/admin/course/c01', false);
    await btn(p, 'פיצול חוג').click();
    await shot(p, 'course-split');

    p = await open(browser, 'admin', '/admin/course/c01', false);
    await btn(p, 'קישורים למדריך').click();
    await shot(p, 'course-links');

    p = await open(browser, 'admin', '/admin/students', false);
    await shot(p, 'students');

    p = await open(browser, 'admin', '/admin/students', false);
    await p.locator('main table tr.click').first().click();
    await p.waitForTimeout(500);
    await shot(p, 'student');

    // Demo "photos" are course illustrations, so no real person appears in the guide.
    const photo = (file: string) => ({
      name: 'photo.webp',
      mimeType: 'image/webp',
      buffer: readFileSync(join('public', 'courses', file)),
    });
    const fillProfile = async (page: Page, name: string, file: string, phone: string) => {
      await btn(page, `עריכת הפרטים של ${name}`).click();
      const d = page.getByRole('dialog');
      await d.getByLabel('קובץ תמונה').setInputFiles(photo(file));
      await d.getByLabel('הגדלה').fill('1.6');
      await d.getByLabel('טלפון').fill(phone);
    };
    p = await open(browser, 'admin', '/admin/instructors', false);
    await fillProfile(p, 'שרית', 'martial-arts-800.webp', '0541234567');
    await p.getByRole('dialog').getByRole('button', { name: 'שמירה' }).click();
    await fillProfile(p, 'אלון', 'surfing-800.webp', '0527654321');
    await p.getByRole('dialog').getByRole('button', { name: 'שמירה' }).click();
    await shot(p, 'instructors');

    p = await open(browser, 'admin', '/admin/instructors', false);
    await fillProfile(p, 'מיכל', 'theatre-800.webp', '0501112233');
    await p.getByRole('dialog').getByLabel('מייל').fill('michal@example.com');
    await shot(p, 'instructor-edit');

    p = await open(browser, 'admin', '/admin/settings', false);
    await shot(p, 'settings', { fullPage: true });

    await browser.close();
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
