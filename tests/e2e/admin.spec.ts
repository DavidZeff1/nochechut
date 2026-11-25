import { expect, test } from '@playwright/test';
import { noHorizontalScroll, open } from './helpers';

test.describe('admin', () => {
  test('overview loads without horizontal page scroll', async ({ page }) => {
    await open(page, '/admin', 'admin');
    await expect(page.getByRole('heading', { name: 'מבט-על' })).toBeVisible();
    await expect(page.getByRole('link', { name: /חוגים פעילים/ })).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('courses tab lists, searches and opens courses', async ({ page }) => {
    await open(page, '/admin', 'admin');
    await page.getByRole('link', { name: /חוגים פעילים/ }).click();
    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(page.getByRole('heading', { name: 'חוגים' })).toBeVisible();
    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(3);
    await page.getByLabel('חיפוש חוג').fill('זומבה');
    await expect(rows).toHaveCount(1);
    await page.getByRole('link', { name: 'זומבה' }).click();
    await expect(page).toHaveURL(/\/admin\/course\//);
    await noHorizontalScroll(page);
  });

  test('edits a register cell', async ({ page }) => {
    await open(page, '/admin/course/c01', 'admin');
    const cell = page.locator('[data-testid^="cell-"]').first();
    await cell.click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: '✗ לא הגיע/ה' }).click();
    await dlg.getByRole('textbox').fill('נבדק');
    await dlg.getByRole('button', { name: 'שמירה' }).click();
    await expect(dlg).toBeHidden();
    await expect(cell).toHaveClass(/\bx\b/);
    await expect(cell).toContainText('נבדק');
  });

  test('splits a course and opens the new one', async ({ page }) => {
    await open(page, '/admin/course/c03', 'admin');
    await page.getByText('עוד ▾').click();
    await page.getByRole('button', { name: 'פיצול חוג לשתי קבוצות' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('שם החוג החדש *').fill('זומבה מתקדמות');
    await dlg.getByRole('checkbox').first().check();
    await dlg.getByRole('checkbox').nth(1).check();
    await dlg.getByRole('button', { name: 'פיצול', exact: true }).click();
    await expect(page).not.toHaveURL(/\/admin\/course\/c03$/);
    await expect(page.getByRole('heading', { name: 'זומבה מתקדמות' })).toBeVisible();
    await expect(page.locator('table.reg tbody tr')).toHaveCount(2);
  });

  test('exports the register as CSV', async ({ page }) => {
    await open(page, '/admin/course/c01', 'admin');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'ייצוא CSV' }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const text = await (await download.createReadStream()).toArray();
    const csv = Buffer.concat(text).toString('utf8');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split('\r\n').length).toBeGreaterThan(3);
  });

  test('student search finds students', async ({ page }) => {
    await open(page, '/admin/students', 'admin');
    await page.getByPlaceholder('חיפוש לפי שם, שם האם או טלפון').fill('לוי');
    await expect(page.locator('tbody tr').first()).toContainText('לוי');
  });
});

test.describe('decluttered screens', () => {
  test('the course dialog no longer offers a picture upload', async ({ page }) => {
    await open(page, '/admin/course/c01', 'admin');
    await page.getByRole('button', { name: 'עריכת חוג' }).click();
    await expect(page.getByRole('dialog').getByText('החלפת תמונה')).toHaveCount(0);
  });

  test('an instructor linked to a name sees no instructor picker and no admin button in the header', async ({
    page,
  }) => {
    await open(page, '/', 'instructor');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('שלום, שרית');
    await expect(page.getByLabel('אני המדריך/ה')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'בקשת הרשאת מנהל/ת' })).toHaveCount(0);
  });
});
