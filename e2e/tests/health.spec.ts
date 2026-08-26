import { expect, test } from '@playwright/test';

test('shell shows backend health status via the proxy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Triage Memory' })).toBeVisible();
  await expect(page.getByTestId('health-status')).toHaveText('ok');
});
