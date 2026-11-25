import { expect, test, type Page } from '@playwright/test';
import { noHorizontalScroll, open, rows } from './helpers';

/** Collects uncaught errors and console errors (including failed image/script loads). */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test.describe('every screen', () => {
  test('admin screens load without errors or sideways scrolling', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/admin', 'admin');
    const screens: [string, string | null][] = [
      ['/admin', 'מבט-על'],
      ['/admin/courses', 'חוגים'],
      ['/admin/students', 'תלמידים'],
      ['/admin/instructors', 'מדריכים'],
      ['/admin/settings', 'הגדרות'],
      ['/admin/course/c01', null],
      ['/admin/session/c01/20261122', null],
      ['/guide', 'מדריך שימוש'],
      ['/', null],
    ];
    for (const [path, heading] of screens) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      if (heading) await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await noHorizontalScroll(page);
    }
    await page.goto('/admin/students');
    await page.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/\/admin\/student\//);
    await noHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
});

test.describe('end-to-end flows', () => {
  test('attendance an instructor marks shows up for the admin', async ({ page }) => {
    await open(page, '/course/c03');
    const date = await page.getByLabel('תאריך המפגש').inputValue();
    const first = rows(page).first();
    const name = (await first.locator('.nm').innerText()).trim();
    await first.getByRole('button', { name: 'לא הגיע/ה', exact: true }).click();
    await expect(first).toHaveClass(/\bx\b/);

    await page.evaluate(() => localStorage.setItem('demo-role', 'admin'));
    await page.goto('/admin/course/c03');
    const href = await page.getByRole('link', { name, exact: true }).first().getAttribute('href');
    const sid = href!.split('/').pop();
    await expect(page.getByTestId(`cell-${sid}-${date.replace(/-/g, '')}`)).toHaveClass(/\bx\b/);
  });

  test('creates a course, adds a new student, removes and restores them', async ({ page }) => {
    await open(page, '/admin/courses', 'admin');
    await page.getByRole('button', { name: '+ חוג חדש' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('שם החוג *').fill('קרמיקה לבנות');
    await dlg.locator('select').first().selectOption({ label: 'רביעי' });
    await dlg.getByLabel('שעה', { exact: true }).fill('18:00');
    await dlg.getByLabel('מדריכים (מופרדים בפסיק)').fill('מיכל');
    await dlg.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'קרמיקה לבנות' })).toBeVisible();
    await expect(page.getByText('אין עדיין תלמידים בחוג.')).toBeVisible();

    await page.getByRole('button', { name: '+ הוספת תלמיד/ה' }).click();
    await dlg.getByText('או: תלמיד/ה חדש/ה').click();
    await dlg.getByLabel('שם *', { exact: true }).fill('נועה בדיקה');
    await dlg.getByLabel('טלפון', { exact: true }).fill('0501234567');
    await dlg.getByRole('button', { name: 'יצירה ושיבוץ' }).click();
    await expect(dlg).toBeHidden();
    const row = page.locator('table.reg tbody tr', { hasText: 'נועה בדיקה' });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'הסרה' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'הסרה' }).click();
    await expect(row).toHaveClass(/removed/);
    await expect(row.locator('.tag.red')).toContainText('הוסר');
    await page.getByLabel(/הצגת 1 שהוסרו/).uncheck();
    await expect(row).toHaveCount(0);
    await page.getByLabel(/הצגת 1 שהוסרו/).check();
    await row.getByRole('button', { name: 'החזרה' }).click();
    await expect(row).not.toHaveClass(/removed/);
    await expect(row.getByRole('button', { name: 'הסרה' })).toBeVisible();

    await page.goto('/admin/courses');
    await page.getByLabel('חיפוש חוג').fill('קרמיקה');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toContainText('רביעי 18:00');
    await expect(page.locator('tbody tr')).toContainText('מיכל');
  });

  test('archiving a course hides it from the courses tab until asked', async ({ page }) => {
    await open(page, '/admin/course/c01', 'admin');
    const name = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    await page.getByRole('button', { name: 'עריכת חוג' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel(/העברה לארכיון/).check();
    await dlg.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.locator('.tag.red', { hasText: 'בארכיון' })).toBeVisible();

    await page.goto('/admin/courses');
    const link = page.locator('tbody').getByRole('link', { name, exact: true });
    await expect(link).toHaveCount(0);
    await page.getByLabel(/הצגת 1 בארכיון/).check();
    await expect(link).toBeVisible();
  });

  test('edits a student and enrolls them in another course', async ({ page }) => {
    await open(page, '/admin/students', 'admin');
    await page.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/\/admin\/student\//);
    const cards = page.locator('.scard');
    const before = await cards.count();

    await page.getByRole('button', { name: 'עריכת פרטים' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('טלפון', { exact: true }).fill('0529998877');
    await dlg.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.locator('a.tel')).toHaveAttribute('href', /0529998877|529998877/);

    await page.getByRole('button', { name: 'שיבוץ לחוג' }).click();
    await dlg.getByRole('button', { name: 'שיבוץ', exact: true }).click();
    await expect(cards).toHaveCount(before + 1);
  });

  test('notes a whole session and deletes a session column', async ({ page }) => {
    await open(page, '/admin/course/c01', 'admin');
    const cols = page.locator('table.reg thead th.d');
    await expect(cols.first()).toBeVisible();
    const n = await cols.count();
    const firstDate = (await cols.first().innerText()).split('\n')[0];
    await cols.first().click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel(/הערה למפגש כולו/).fill('מדריכה מחליפה');
    await dlg.getByRole('button', { name: 'שמירת הערת המפגש' }).click();
    await expect(cols.first()).toContainText('הערה');

    await cols.first().click();
    await dlg.getByRole('button', { name: /מחיקת העמודה/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'מחיקת העמודה', exact: true }).click();
    await expect(cols).toHaveCount(n - 1);
    await expect(cols.first()).not.toContainText(firstDate);
  });

  test('invites a team member, cancels the invite, and downloads a backup', async ({ page }) => {
    await open(page, '/admin/settings', 'admin');
    await page.getByLabel('מייל', { exact: true }).fill('new.instructor@example.com');
    await page.getByLabel('שם כפי שמופיע בחוגים').fill('מיכל');
    await page.getByRole('button', { name: 'הזמנה', exact: true }).click();
    await expect(page.getByText(/נשלחה הזמנה ל-new\.instructor@example\.com/)).toBeVisible();
    const row = page.locator('tr', { hasText: 'new.instructor@example.com' });
    await expect(row).toContainText('ממתין/ה לכניסה');
    await row.getByRole('button', { name: 'ביטול הזמנה' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ביטול הזמנה' }).click();
    await expect(row).toHaveCount(0);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'הורדת גיבוי מלא (JSON)' }).click(),
    ]);
    const text = Buffer.concat(await (await download.createReadStream()).toArray()).toString('utf8');
    const data = JSON.parse(text);
    expect(Object.keys(data.courses).length).toBeGreaterThan(3);
    expect(Object.keys(data.students).length).toBeGreaterThan(10);
    expect(Object.keys(data.sessions).length).toBeGreaterThan(10);
  });
});
