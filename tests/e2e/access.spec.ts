import { expect, test, type Page } from '@playwright/test';

/** Starts the demo in a given view (admin, instructor, signedOut, noAccess) with fresh data. */
async function openAs(page: Page, path: string, view: string) {
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear();
      localStorage.setItem('demo-role', v);
      sessionStorage.setItem('e2e-init', '1');
    }
  }, view);
  await page.goto(path);
}

const switchView = (page: Page, label: string) => page.getByLabel('תצוגת הדגמה').selectOption({ label });

test.describe('access requests', () => {
  test('an account without access asks, an admin approves, and it gets in', async ({ page }) => {
    await openAs(page, '/', 'noAccess');
    await expect(page.getByRole('heading', { name: 'אין עדיין הרשאה' })).toBeVisible();
    await page.getByLabel('שם מלא *').fill('נועה כהן');
    await page.getByLabel('מבקש/ת גישה בתור').selectOption('instructor');
    await page.getByLabel('הסבר קצר למנהל/ת (לא חובה)').fill('מדריכת קרמיקה');
    await page.getByRole('button', { name: 'שליחת בקשה למנהל/ת' }).click();
    await expect(page.getByText(/מחכה לאישור/)).toBeVisible();

    await switchView(page, 'תצוגת מנהל/ת');
    await expect(page.getByRole('link', { name: /הגדרות/ })).toContainText('2'); // the demo request + this one
    await page.getByRole('link', { name: /הגדרות/ }).click();
    const req = page.getByTestId('access-request').filter({ hasText: 'guest@demo.local' });
    await expect(req).toContainText('נועה כהן');
    await expect(req).toContainText('מדריכת קרמיקה');
    await req.getByRole('button', { name: 'אישור' }).click();
    await expect(page.getByTestId('access-request').filter({ hasText: 'guest@demo.local' })).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: 'guest@demo.local' })).toContainText('ממתין/ה לכניסה');

    await switchView(page, 'חשבון בלי הרשאה');
    // The invite is claimed on sign-in: the guest is now an instructor. Still on the settings
    // address, so they see the admin-only screen; the home screen greets them.
    await expect(page.getByRole('heading', { name: 'המסך הזה מיועד למנהלים' })).toBeVisible();
    await page.getByRole('link', { name: '→ חזרה לחוגים' }).click();
    // No instructor name was given, so the home screen shows the general title and all courses.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('נוכחות חוגים');
    await expect(page.getByText('אומנויות לחימה').first()).toBeVisible();
  });

  test('an instructor who opens an admin screen can ask to become an admin', async ({ page }) => {
    await openAs(page, '/admin/settings', 'instructor');
    await expect(page.getByRole('heading', { name: 'המסך הזה מיועד למנהלים' })).toBeVisible();
    await page.getByRole('button', { name: 'שליחת בקשה למנהל/ת' }).click();
    await expect(page.getByRole('status').first()).toContainText('מחכה לאישור');

    await switchView(page, 'תצוגת מנהל/ת');
    await page.goto('/admin/settings');
    const req = page.getByTestId('access-request').filter({ hasText: 'instructor@demo.local' });
    await expect(req).toContainText('כרגע מדריך/ה');
    await req.getByRole('button', { name: 'אישור' }).click();
    // An existing account gets the role at once.
    await expect(page.getByLabel('תפקיד של instructor@demo.local')).toHaveValue('admin');
  });

  test('a request can be declined', async ({ page }) => {
    await openAs(page, '/admin/settings', 'admin');
    const req = page.getByTestId('access-request').filter({ hasText: 'noa.demo@example.com' });
    await req.getByRole('button', { name: 'דחייה' }).click();
    await expect(page.getByText('אין בקשות שממתינות.')).toBeVisible();
    await page.getByText(/בקשות אחרונות שטופלו/).click();
    await expect(page.getByText('נדחתה')).toBeVisible();
  });
});

test('the guide opens without signing in and shows its screenshots', async ({ page }) => {
  await openAs(page, '/guide', 'signedOut');
  await expect(page.getByRole('heading', { name: 'מדריך שימוש' })).toBeVisible();
  const img = page.locator('img[src="/guide/session.webp"]');
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('link', { name: '→ לאפליקציה' }).click();
  await expect(page.getByRole('button', { name: 'כניסה עם Google' })).toBeVisible();
});
