import { expect, test, type Page } from '@playwright/test';


async function open(page: Page, track: string, level: 'temel' | 'ileri'): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  // modules are unreleased: the preview route needs ?demo
  await page.goto(`./?demo&level=${level}&quality=low#/modul/muscle/${track}`);
  await page.waitForFunction((id) => document.body.dataset.moduleReady === 'muscle' && window.__bilimModules?.session.track.id === id, track, { timeout: 80_000 });
  await page.waitForTimeout(500);
  return problems;
}

/** How many distinct colours the 3D picture has (a blank or flat canvas has very few). */
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

for (const level of ['ileri', 'temel'] as const) {
  test(`muscle (${level}): plays, scrubs, switches tracks, answers a check, no console errors`, async ({ page }) => {
    const problems = await open(page, 'kasilma', level);
    expect(await drawn(page)).toBeGreaterThan(8);

    // play for a moment: the playhead advances
    await page.locator('[data-play]').click();
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => window.__bilimModules!.session.player.time);
    expect(t).toBeGreaterThan(0.3);
    await page.locator('[data-play]').click();

    // scrub through the zoom, the contraction and the relaxation; the picture stays alive and the chart follows the model
    for (const at of [3, 7, 9.5, 14, 24.5, 31, 39]) {
      await page.evaluate((x) => window.__bilimModules!.session.player.seek(x), at);
      await page.waitForTimeout(250);
      expect(await drawn(page), `t=${at}`).toBeGreaterThan(8);
    }
    const chart = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.chartAt(24));
    expect(chart['sarkomer-boyu']).toBeCloseTo(2.0, 6);
    expect(chart['a-bandi']).toBeCloseTo(1.6, 6);
    const labels = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.labelsAt(14).map((l) => l.text));
    expect(labels.length).toBeGreaterThan(1);

    // answer a check from the question list
    await page.locator('[data-drawer]').click();
    await page.locator('[data-check]').first().click();
    await page.locator('.prompt .option').first().click();
    await expect(page.locator('.prompt .feedback')).toBeVisible();
    await page.locator('[data-continue]').click();

    // the other track opens and draws at several times
    await page.locator('[data-track="eklem-hareketi"]').click();
    await page.waitForFunction(() => window.__bilimModules?.session?.track.id === 'eklem-hareketi', null, { timeout: 30_000 });
    await page.waitForTimeout(600);
    for (const at of [0.5, 9, 16, 26, 34]) {
      await page.evaluate((x) => window.__bilimModules!.session.player.seek(x), at);
      await page.waitForTimeout(250);
      expect(await drawn(page), `eklem t=${at}`).toBeGreaterThan(8);
    }
    const arm = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.chartAt(10));
    expect(arm['biseps']).toBeGreaterThan(arm['triseps']!);
    await page.locator('[data-track="kasilma"]').click();
    await page.waitForFunction(() => window.__bilimModules?.session?.track.id === 'kasilma', null, { timeout: 30_000 });
    expect(problems).toEqual([]);
  });
}
