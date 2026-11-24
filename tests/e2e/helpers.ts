import { expect, type Page } from '@playwright/test';

/** Starts the demo app as the given role, with fresh demo data. */
export async function open(page: Page, path: string, role: 'admin' | 'instructor' = 'instructor') {
  await page.addInitScript((r) => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear();
      localStorage.setItem('demo-role', r);
      sessionStorage.setItem('e2e-init', '1');
    }
  }, role);
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
}

export const rows = (page: Page) => page.getByTestId('student-row');

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
