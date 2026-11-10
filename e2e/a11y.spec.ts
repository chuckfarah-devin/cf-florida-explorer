import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// External map/data services are blocked so results don't depend on third-party uptime.
test.beforeEach(async ({ page }) => {
  await page.route(/(ca|ags)\.dep\.state\.fl\.us|tile\.openstreetmap\.org|arcgis\.com/, (r) => r.abort());
  await page.goto('/');
  await expect(page.getByRole('searchbox')).toBeVisible();
});

async function selectTyped(page: Page) {
  await page.getByRole('searchbox').fill('26.5089, -80.0522');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Pick a place to explore');
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('desktop start screen has no WCAG A/AA violations', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await axe(page);
});

test('desktop place view has no WCAG A/AA violations and Ask stays in view', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await selectTyped(page);
  await expect(page.locator('.askfoot input')).toBeInViewport();
  await axe(page);
});

test('mobile place view has no WCAG A/AA violations and Ask stays in view', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await selectTyped(page);
  await expect(page.locator('.askfoot input')).toBeInViewport();
  await axe(page);
});

test('map is one named keyboard stop with a visible focus ring, and Enter selects the map center', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const map = page.getByRole('application', { name: /Map of Florida/ });
  await expect(map).toHaveCount(1);
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    if (await map.evaluate((el) => el === document.activeElement)) break;
  }
  await expect(map).toBeFocused();
  expect(await map.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Selected spot');
});
