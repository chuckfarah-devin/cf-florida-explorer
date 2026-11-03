// Captures desktop and mobile screenshots of a running preview (npm run build && npm run preview).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'http://localhost:4173';
const executablePath = process.env.CHROME_PATH ?? undefined;
const out = 'scripts/out';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath, channel: executablePath ? undefined : 'chrome' });
for (const [name, viewport] of [['desktop-1366x768', { width: 1366, height: 768 }], ['mobile-360x800', { width: 360, height: 800 }]]) {
  const page = await browser.newPage({ viewport });
  await page.goto(base);
  await page.waitForTimeout(4000);
  const query = process.env.SEARCH_QUERY ?? '26.50890, -80.05225';
  await page.getByRole('searchbox').fill(query);
  await page.getByRole('searchbox').press('Enter');
  if (!/^\s*-?\d/.test(query)) await page.getByRole('list', { name: 'Search results' }).getByRole('button').first().click();
  if (viewport.width >= 1024) {
    await page.getByRole('switch', { name: 'Show Conservation areas' }).check();
    await page.getByRole('switch', { name: 'Show Wetlands' }).check();
    await page.getByRole('switch', { name: 'Show Shoreline' }).check();
  }
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
}
await browser.close();
