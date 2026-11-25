import { expect, test } from '@playwright/test';
import { open } from './helpers';

const card = (page: import('@playwright/test').Page, name: string) =>
  page.getByTestId('instructor').filter({ has: page.getByRole('heading', { name, exact: true }) });

test.describe('instructors page', () => {
  test('lists instructors with their courses and app access', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    await expect(page.getByRole('heading', { name: 'מדריכים', level: 1 })).toBeVisible();
    await expect(card(page, 'אלון')).toContainText('גלישה');
    // An instructor with two courses gets both, with day and time.
    await expect(card(page, 'שרית')).toContainText('אומנויות לחימה · ראשון 17:00');
    await expect(card(page, 'שרית')).toContainText('2 חוגים');
    await expect(card(page, 'אלון')).toContainText('אין גישה לאפליקציה');
  });

  test('saves a phone number and invites an instructor', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    const alon = card(page, 'אלון');
    await alon.getByRole('button', { name: 'עריכת הטלפון של אלון' }).click();
    await alon.getByLabel('הטלפון של אלון').fill('0541234567');
    await alon.getByRole('button', { name: 'שמירה' }).click();
    await expect(alon.getByRole('link', { name: '054-123-4567' })).toBeVisible();

    await alon.getByRole('button', { name: 'הזמנה' }).click();
    await page.getByLabel('מייל של אלון').fill('alon@example.com');
    await page.getByRole('dialog').getByRole('button', { name: 'הזמנה' }).click();
    await expect(alon).toContainText('הוזמן/ה, עוד לא נכנס/ה');
  });

  test('spots two spellings of one person and merges them', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    // Make a second spelling: rename דוד to "שרית כהן".
    await card(page, 'דוד').getByRole('button', { name: 'שינוי שם' }).click();
    await page.getByLabel('שם חדש').fill('שרית כהן');
    await page.getByRole('dialog').getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByText(/נספרים כשני מדריכים/)).toBeVisible();

    await page.getByRole('button', { name: 'איחוד ל"שרית כהן"' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'איחוד' }).click();
    await expect(card(page, 'שרית')).toHaveCount(0);
    await expect(card(page, 'שרית כהן')).toContainText('שחמט');
    await expect(card(page, 'שרית כהן')).toContainText('אומנויות לחימה');
  });
});
