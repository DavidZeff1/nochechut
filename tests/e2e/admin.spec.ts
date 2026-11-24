import { expect, test } from '@playwright/test';
import { noHorizontalScroll, open } from './helpers';

test.describe('admin', () => {
  test('overview loads without horizontal page scroll', async ({ page }) => {
    await open(page, '/admin', 'admin');
    await expect(page.getByRole('heading', { name: 'מבט-על' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'זומבה' }).first()).toBeVisible();
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
    await page.getByRole('button', { name: 'פיצול חוג' }).click();
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
