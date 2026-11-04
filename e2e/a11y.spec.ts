import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { FemaResponse, FemaState } from '../src/fema/types';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const SDK_ASSETS = fileURLToPath(new URL('../node_modules/@arcgis/core/assets/', import.meta.url));

// Explicit synthetic fixtures: no live FEMA calls or event-validation claims in CI.
function fixture(request: { lat: number; lon: number; selectionId: number }, state: FemaState = 'classified_near_boundary'): FemaResponse {
  return {
    point: { lat: request.lat, lon: request.lon }, selectionId: request.selectionId,
    batchId: 'synthetic-browser-fixture', state, zones: state.startsWith('classified') ? [{ FLD_ZONE: 'AE', ZONE_SUBTY: 'COASTAL FLOODPLAIN', FLD_AR_ID: 'synthetic-ae', SFHA_TF: 'T', STATIC_BFE: 8, V_DATUM: 'NAVD88', LEN_UNIT: '' }] : [],
    nearbyZones: state === 'classified_near_boundary' ? [{ FLD_ZONE: 'X', ZONE_SUBTY: '0.2 PCT ANNUAL CHANCE FLOOD HAZARD' }] : [],
    sources: [{ name: 'exact', provider: 'FEMA', dataset: 'National Flood Hazard Layer', evidenceClass: 'regulatory_classification', sourceCrs: 'EPSG:4269', spatialRelation: 'point_intersection', layer: 28, queryUrl: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?f=json', retrievedAtUtc: '2026-11-03T12:00:00Z', status: 'ok', records: [] }],
    radiusMeters: 15, boundaryCheckAvailable: true, freshness: 'fresh', retrievedAtUtc: '2026-11-03T12:00:00Z', refreshFailures: [],
  };
}

// External map/data services are blocked so results don't depend on third-party uptime.
test.beforeEach(async ({ page }) => {
  await page.route(/(ca|ags)\.dep\.state\.fl\.us|tile\.openstreetmap\.org|arcgis\.com/, (r) => r.abort());
  // Localization/WASM belong to the installed SDK, not a live data source. Supply local pinned assets.
  await page.route('https://js.arcgis.com/5.1.27/@arcgis/core/assets/**', async (route) => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname.split('/assets/')[1]);
    const asset = resolve(SDK_ASSETS, relative);
    if (!asset.startsWith(resolve(SDK_ASSETS) + sep)) { await route.abort(); return; }
    await route.fulfill({ path: asset, ...(asset.endsWith('.wasm') ? { contentType: 'application/wasm' } : {}) });
  });
  await page.route('**/api/fema', (route) => route.fulfill({ json: fixture(route.request().postDataJSON()) }));
  await page.route('**/api/noaa', (route) => {
    const r = route.request().postDataJSON();
    return route.fulfill({ json: {
      point: { lat: r.lat, lon: r.lon }, selectionId: r.selectionId,
      window: { startDate: r.startDate, endDate: r.endDate, startUtc: '2026-10-25T04:00:00.000Z', endUtc: '2026-10-30T04:00:00.000Z', timeZone: 'America/New_York' },
      datum: r.datum, units: 'ft', retrievedAtUtc: '2026-11-04T12:00:00Z', state: 'ok', stations: [{
        id: '8722670', name: 'Lake Worth Pier, Atlantic Ocean', lat: 26.612778, lon: -80.034164, waterBody: 'Atlantic Ocean', distanceKm: 11.7, bearing: 'N', rationale: 'Synthetic fixture; observations apply only at the gauge.', metadataUrl: 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8722670.json',
        products: [{ product: 'water_level', state: 'ok', queryUrl: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter', retrievedAtUtc: '2026-11-04T12:00:00Z', rows: [{ timeUtc: '2026-10-25T12:00:00.000Z', value: 3.25, quality: 'preliminary', flags: '1,0,0,0' }] },
          { product: 'predictions', state: 'ok', queryUrl: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter', retrievedAtUtc: '2026-11-04T12:00:00Z', rows: [{ timeUtc: '2026-10-25T12:30:00.000Z', value: 3.1, kind: 'H' }] }],
        htf: { state: 'no_data', queryUrl: 'https://api.tidesandcurrents.noaa.gov/dpapi/prod/webapi/htf/htf_daily.json', retrievedAtUtc: '2026-11-04T12:00:00Z', datum: 'STND', units: 'ft', rows: [] },
      }],
    } });
  });
  await page.goto('/');
  await expect(page.getByRole('searchbox')).toBeVisible();
});

async function selectTyped(page: Page) {
  await page.getByRole('searchbox').fill('26.5089, -80.0522');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Pick a place to explore');
  await expect(page.getByRole('region', { name: 'FEMA flooding' })).toContainText('1% annual chance');
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('desktop start screen has no WCAG A/AA violations', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await axe(page);
});

test('NOAA panel separates preliminary measurements and predictions with accessible controls', async ({ page }) => {
  await selectTyped(page);
  const tides = page.getByRole('region', { name: 'NOAA tides nearby' });
  await expect(tides.getByRole('heading', { name: 'Lake Worth Pier, Atlantic Ocean' })).toBeVisible();
  await expect(tides).toContainText('Preliminary');
  await expect(tides.getByRole('img', { name: /tide chart/ })).toBeVisible();
  await tides.getByText('View tide times and values').click();
  await expect(tides.getByRole('heading', { name: 'Predicted high tides' })).toBeVisible();
  await expect(tides.getByLabel('Start date')).toHaveValue('2026-10-25');
  await tides.getByText('NOAA · Lake Worth Pier, Atlantic Ocean · Sources and details').click();
  await expect(tides).toContainText('no datum conversion');
  await axe(page);
});

test('FEMA sources are accessible by keyboard and expose unknown units without inventing feet', async ({ page }) => {
  await selectTyped(page);
  const details = page.getByText('FEMA flood map · Technical details and sources');
  await details.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText(/units: Not stated by source/)).toBeVisible();
  await axe(page);
});

test('FEMA coverage gap and failed coverage lookup have distinct accessible messages', async ({ page }) => {
  await page.route('**/api/fema', (r) => r.fulfill({ json: fixture(r.request().postDataJSON(), 'in_coverage_no_zone') }));
  await page.getByRole('searchbox').fill('26.5089, -80.0522');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('region', { name: 'FEMA flooding' })).toContainText("That's a gap in the map");
  await axe(page);
  await page.route('**/api/fema', (r) => r.fulfill({ json: fixture(r.request().postDataJSON(), 'coverage_unknown') }));
  await page.getByRole('button', { name: 'Retry FEMA lookup' }).click();
  await expect(page.getByRole('region', { name: 'FEMA flooding' })).toContainText('unavailable right now');
  await axe(page);
});

test('FEMA loading is announced and a delayed response from an old selection is discarded', async ({ page }) => {
  let releaseOld!: () => void;
  const old = new Promise<void>((resolve) => { releaseOld = resolve; });
  let firstStarted!: () => void;
  const started = new Promise<void>((resolve) => { firstStarted = resolve; });
  await page.route('**/api/fema', async (route) => {
    const input = route.request().postDataJSON();
    if (input.lat === 26.5089) {
      firstStarted();
      await old;
      try { await route.fulfill({ json: fixture(input) }); } catch { /* The old request may have been aborted. */ }
    } else await route.fulfill({ json: fixture(input, 'outside_nfhl_coverage') });
  });
  await page.getByRole('searchbox').fill('26.5089, -80.0522');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('region', { name: 'FEMA flooding' })).toContainText('Checking FEMA');
  await started;
  await page.getByRole('searchbox').fill('26.6, -80.1');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('region', { name: 'FEMA flooding' })).toContainText("doesn't cover this spot");
  releaseOld();
  await expect(page.getByRole('region', { name: 'FEMA flooding' })).not.toContainText('1% annual chance');
});

test('desktop place view has no WCAG A/AA violations and Ask stays in view', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await selectTyped(page);
  await expect(page.locator('.askfoot input')).toBeInViewport();
  await axe(page);
  await page.screenshot({ path: 'scripts/out/i2-desktop-synthetic.png' });
});

test('mobile place view has no WCAG A/AA violations and Ask stays in view', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await selectTyped(page);
  await expect(page.locator('.askfoot input')).toBeInViewport();
  await axe(page);
  await page.screenshot({ path: 'scripts/out/i2-mobile-synthetic.png' });
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

test('mobile layer list scrolls within the map without covering the selected-place panel', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await selectTyped(page);
  await page.getByRole('button', { name: 'Map layers', exact: true }).click();
  const list = await page.locator('.layers-float').boundingBox();
  const map = await page.locator('.mapwrap').boundingBox();
  expect(list).not.toBeNull(); expect(map).not.toBeNull();
  expect(list!.y + list!.height).toBeLessThanOrEqual(map!.y + map!.height);
  const flooding = page.getByRole('switch', { name: 'Show Flooding' });
  await flooding.scrollIntoViewIfNeeded();
  await flooding.check();
  await expect(flooding).toBeChecked();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.layers-float')).toHaveCount(0);
  await expect(page.locator('.askfoot input')).toBeInViewport();
});
