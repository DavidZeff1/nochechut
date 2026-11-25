import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers';

const card = (page: Page, name: string) =>
  page.getByTestId('instructor').filter({ has: page.getByRole('heading', { name, exact: true }) });
const dialog = (page: Page) => page.getByRole('dialog');
// Any picture works as a stand-in photo; the course illustrations are in the repo.
const samplePhoto = () => ({
  name: 'photo.webp',
  mimeType: 'image/webp',
  buffer: readFileSync(join(process.cwd(), 'public', 'courses', 'music-800.webp')),
});

test.describe('instructors page', () => {
  test('lists instructors with their courses and app access', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    await expect(page.getByRole('heading', { name: 'מדריכים', level: 1 })).toBeVisible();
    await expect(card(page, 'אלון')).toContainText('גלישה');
    await expect(card(page, 'שרית')).toContainText('אומנויות לחימה · ראשון 17:00');
    await expect(card(page, 'שרית')).toContainText('2 חוגים');
    await expect(card(page, 'אלון')).toContainText('אין גישה לאפליקציה');
  });

  test('adds a photo, phone and email, and the photo shows on course cards', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    await card(page, 'שרית').getByRole('button', { name: 'עריכת הפרטים של שרית' }).click();
    await dialog(page).getByLabel('קובץ תמונה').setInputFiles(samplePhoto());
    await expect(dialog(page).getByLabel('תצוגה מקדימה של התמונה')).toBeVisible();
    await dialog(page).getByLabel('הגדלה').fill('2');
    await dialog(page).getByLabel('טלפון').fill('0541234567');
    await dialog(page).getByLabel('מייל').fill('sarit@example.com');
    await dialog(page).getByRole('button', { name: 'שמירה' }).click();

    const sarit = card(page, 'שרית');
    await expect(sarit.getByRole('img', { name: 'שרית' })).toHaveAttribute('src', /^data:image\/jpeg/);
    await expect(sarit.getByRole('link', { name: '054-123-4567' })).toBeVisible();
    await expect(sarit.getByRole('link', { name: 'sarit@example.com' })).toBeVisible();

    // The invite dialog starts from the saved email.
    await sarit.getByRole('button', { name: 'הזמנה' }).click();
    await expect(page.getByLabel('מייל של שרית')).toHaveValue('sarit@example.com');
    await page.keyboard.press('Escape');

    await page.goto('/');
    await expect(page.locator('.ccard, .tcard').getByRole('img', { name: 'שרית' }).first()).toBeVisible();
  });

  test('adds an instructor who has no course yet, and removes them', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    await page.getByRole('button', { name: '+ מדריך/ה חדש/ה' }).click();
    await dialog(page).getByLabel('שם (כפי שמופיע בחוגים) *').fill('דנה לוי');
    await dialog(page).getByLabel('טלפון').fill('052-999-8877');
    await dialog(page).getByRole('button', { name: 'שמירה' }).click();
    const dana = card(page, 'דנה לוי');
    await expect(dana).toContainText('אין חוגים כרגע');
    await expect(dana.getByRole('img', { name: 'דנה לוי' })).toHaveText('דל'); // initials without a photo
    await dana.getByRole('button', { name: 'הסרה מהרשימה' }).click();
    await dialog(page).getByRole('button', { name: 'הסרה' }).click();
    await expect(card(page, 'דנה לוי')).toHaveCount(0);
  });

  test('renames everywhere, and spots and merges two spellings of one person', async ({ page }) => {
    await open(page, '/admin/instructors', 'admin');
    await card(page, 'דוד').getByRole('button', { name: 'עריכת הפרטים של דוד' }).click();
    await dialog(page).getByLabel('שם (כפי שמופיע בחוגים) *').fill('שרית כהן');
    await dialog(page).getByRole('button', { name: 'שמירה' }).click();
    await expect(card(page, 'שרית כהן')).toContainText('שחמט');
    await expect(page.getByText(/נספרים כשני מדריכים/)).toBeVisible();

    await page.getByRole('button', { name: 'איחוד ל"שרית כהן"' }).click();
    await dialog(page).getByRole('button', { name: 'איחוד' }).click();
    await expect(card(page, 'שרית')).toHaveCount(0);
    await expect(card(page, 'שרית כהן')).toContainText('שחמט');
    await expect(card(page, 'שרית כהן')).toContainText('אומנויות לחימה');
  });
});
