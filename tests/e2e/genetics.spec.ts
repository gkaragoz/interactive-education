import { expect, test, type Page } from '@playwright/test';


async function open(page: Page, track = 'monohibrit', level = 'ileri'): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  // modules are unreleased: the preview route needs ?demo
  await page.goto(`./?demo&level=${level}&quality=low#/modul/genetics/${track}`);
  await page.waitForFunction(() => document.body.dataset.moduleReady === 'genetics', null, { timeout: 80_000 });
  await page.waitForTimeout(500);
  return problems;
}

/** How many distinct colours the 3D picture has (a cheap "something is drawn" check). */
async function drawn(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const blob = await window.__bilimModules!.stage.screenshot();
    if (!blob) return 0;
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 100;
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const set = new Set<number>();
    for (let i = 0; i < d.length; i += 4) set.add(((d[i]! >> 3) << 10) | ((d[i + 1]! >> 3) << 5) | (d[i + 2]! >> 3));
    return set.size;
  });
}

const seek = (page: Page, t: number): Promise<void> => page.evaluate((x) => window.__bilimModules!.session.player.seek(x), t);

test('genetics: plays, scrubs, changes the cross, answers a check, no console errors', async ({ page }) => {
  test.setTimeout(300_000); // four tracks with screenshots on the software renderer
  const problems = await open(page);
  expect(await drawn(page)).toBeGreaterThan(8);

  // play for a moment: the playhead advances
  await page.locator('[data-play]').click();
  // software rendering is slow: wait for the playhead instead of a fixed sleep
  await page.waitForFunction(() => window.__bilimModules!.session.player.time > 0.3, null, { timeout: 30_000 });
  await page.locator('[data-play]').click();

  // scrub forward and backward through gametes, the Punnett square and the tally
  for (const at of [8, 26, 34, 44, 50, 12, 3]) {
    await seek(page, at);
    await page.waitForTimeout(250);
    expect(await drawn(page), `t=${at}`).toBeGreaterThan(8);
  }

  // the chart counts the filled squares: 4 squares, 3 yellow and 1 green at the end of the fill
  const chart = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.chartAt(41));
  expect(chart).toMatchObject({ 'dolu-kare': 4, 'baskin-fenotip': 3, 'cekinik-fenotip': 1 });

  // a non-default cross changes the outcome and shows the note
  await page.locator('[data-option="cross-mono"]').selectOption('Aa-aa');
  await seek(page, 34);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ chart: window.__bilimModules!.stage.moduleScene.chartAt(41), labels: window.__bilimModules!.stage.moduleScene.labelsAt(34).map((l) => l.anchorId) }));
  expect(after.chart).toMatchObject({ 'dolu-kare': 4, 'baskin-fenotip': 2, 'cekinik-fenotip': 2 });
  expect(after.labels).toContain('warn');
  expect(await drawn(page)).toBeGreaterThan(8);

  // answer a check from the question list
  await page.locator('[data-drawer]').click();
  await page.locator('[data-check]').first().click();
  await page.locator('.prompt .option').first().click();
  await expect(page.locator('.prompt .feedback')).toBeVisible();
  await page.locator('[data-continue]').click();

  // every other track opens and draws (they are İleri tracks)
  for (const id of ['dihibrit', 'kan-gruplari', 'eseye-bagli']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForFunction((tid) => window.__bilimModules?.session?.track.id === tid, id, { timeout: 30_000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__bilimModules!.session.player.seek(window.__bilimModules!.session.track.duration * 0.72));
    await page.waitForTimeout(300);
    expect(await drawn(page), id).toBeGreaterThan(8);
  }
  expect(problems).toEqual([]);
});

test('genetics: Temel level offers the pea monohybrid track and draws', async ({ page }) => {
  const problems = await open(page, 'monohibrit', 'temel');
  for (const at of [4, 30, 48]) {
    await seek(page, at);
    await page.waitForTimeout(250);
    expect(await drawn(page), `t=${at}`).toBeGreaterThan(8);
  }
  expect(await page.locator('[data-track]').count()).toBe(1);
  expect(problems).toEqual([]);
});
