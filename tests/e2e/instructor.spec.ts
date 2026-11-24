import { expect, test } from '@playwright/test';
import { noHorizontalScroll, open, rows } from './helpers';

test.describe('instructor', () => {
  test('home lists today’s classes and the page is right-to-left', async ({ page }) => {
    await open(page, '/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('שלום');
    await expect(page.locator('.ccard, .tcard').first()).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('marks attendance and undoes "mark the rest"', async ({ page }) => {
    await open(page, '/course/c03');
    const first = rows(page).first();
    const arrived = first.getByRole('button', { name: 'הגיע/ה', exact: true });
    await arrived.click();
    await expect(arrived).toHaveAttribute('aria-pressed', 'true');
    await arrived.click();
    await expect(arrived).toHaveAttribute('aria-pressed', 'false');

    await first.getByRole('button', { name: 'לא הגיע/ה', exact: true }).click();
    const unmarked = page.locator('.stu:not(.v):not(.x)');
    const arrivedBefore = await page.locator('.stu.v').count();
    const left = await unmarked.count();
    await page
      .getByRole('button', { name: /^סימון.*הנותרים/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(unmarked).toHaveCount(0);
    await expect(page.locator('.stu.v')).toHaveCount(arrivedBefore + left);
    await page.locator('.toast').getByRole('button', { name: 'ביטול' }).click();
    await expect(unmarked).toHaveCount(left);
    await expect(first).toHaveClass(/\bx\b/);
    await noHorizontalScroll(page);
  });

  test('saves a note automatically and keeps it after reload', async ({ page }) => {
    await open(page, '/course/c03');
    const row = rows(page).nth(1);
    await row.getByRole('button', { name: '+ הערה' }).click();
    await row.getByPlaceholder(/הערה למפגש/).fill('הגיעה עם אחותה');
    await page.waitForTimeout(1200);
    await page.reload();
    await expect(
      rows(page)
        .nth(1)
        .getByPlaceholder(/הערה למפגש/),
    ).toHaveValue('הגיעה עם אחותה');
  });

  test('adds a walk-in student who is marked as arrived', async ({ page }) => {
    await open(page, '/course/c06');
    const before = await rows(page).count();
    await page.getByRole('button', { name: '+ הוספת תלמיד/ה שלא ברשימה' }).click();
    await page.getByLabel('שם התלמיד/ה *').fill('תלמידה חדשה');
    await page.getByLabel('טלפון ליצירת קשר').fill('050-1234567');
    await page.getByRole('button', { name: 'הוספה וסימון כהגיע/ה' }).click();
    await expect(rows(page)).toHaveCount(before + 1);
    const added = rows(page).filter({ hasText: 'תלמידה חדשה' });
    await expect(added.getByRole('button', { name: 'הגיע/ה', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('moves between dates', async ({ page }) => {
    await open(page, '/course/c01');
    // On phones the full date controls are folded behind a chip at the end of the recent dates.
    const more = page.getByRole('button', { name: 'תאריך אחר' });
    if (await more.isVisible()) await more.click();
    const date = page.getByLabel('תאריך המפגש');
    const start = await date.inputValue();
    await page.getByRole('button', { name: 'שבוע קודם' }).click();
    const prev = await date.inputValue();
    expect(new Date(start).getTime() - new Date(prev).getTime()).toBe(7 * 864e5);
    await page.getByRole('button', { name: 'יום הבא' }).click();
    expect(new Date(await date.inputValue()).getTime() - new Date(prev).getTime()).toBe(864e5);
  });

  test('fits a student on one line on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only');
    await open(page, '/course/c01');
    // A row with a saved note also shows the note field, so measure one without.
    const plain = rows(page)
      .filter({ hasNot: page.getByRole('textbox') })
      .first();
    const box = await plain.boundingBox();
    expect(box!.height).toBeLessThan(90);
    await expect(page.getByLabel('תאריך המפגש')).toBeHidden();
  });

  test('old hash links still work', async ({ page }) => {
    await open(page, '/#course-c02');
    await expect(page).toHaveURL(/\/course\/c02$/);
    await expect(page.getByRole('heading', { name: 'תאטרון' })).toBeVisible();
  });
});
