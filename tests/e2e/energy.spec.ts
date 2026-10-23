import { expect, test, type Page } from '@playwright/test';


async function open(page: Page, track = 'fotosentez', level = 'ileri'): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  // modules are unreleased: the preview route needs ?demo
  await page.goto(`./?demo&level=${level}&quality=low#/modul/energy/${track}`);
  await page.waitForFunction(() => document.body.dataset.moduleReady === 'energy', null, { timeout: 90_000 });
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

test('energy: plays, scrubs, switches tracks, changes an option, answers a check, no console errors', async ({ page }) => {
  test.setTimeout(240_000);
  const problems = await open(page);
  expect(await drawn(page)).toBeGreaterThan(8);

  // play for a moment: the playhead advances
  await page.locator('[data-play]').click();
  await page.waitForTimeout(1500);
  const t = await page.evaluate(() => window.__bilimModules!.session.player.time);
  expect(t).toBeGreaterThan(0.3);
  await page.locator('[data-play]').click();

  // scrub through the stages: the picture stays alive and the labels follow
  for (const at of [9, 18, 33, 47, 55]) {
    await page.evaluate((x) => window.__bilimModules!.session.player.seek(x), at);
    await page.waitForTimeout(300);
    expect(await drawn(page), `t=${at}`).toBeGreaterThan(8);
  }
  const labels = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.labelsAt(18).map((l) => l.text));
  expect(labels.length).toBeGreaterThan(1);

  // an option changes the chart: low light halves the oxygen at the end
  await page.evaluate(() => window.__bilimModules!.session.player.seek(58));
  const before = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.chartAt(58)['o2-miktari']);
  await page.locator('[data-option="light-intensity"]').selectOption('low');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.chartAt(58)['o2-miktari']);
  expect(before).toBeGreaterThan(95);
  expect(after).toBeLessThan(60);
  expect(await drawn(page)).toBeGreaterThan(8);

  // answer a check from the question list
  await page.locator('[data-drawer]').click();
  await page.locator('[data-check]').first().click();
  await page.locator('.prompt .option').first().click();
  await expect(page.locator('.prompt .feedback')).toBeVisible();
  await page.locator('[data-continue]').click();

  // every other track opens and draws
  for (const id of ['hucresel-solunum', 'fermantasyon', 'kemosentez']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForFunction((tid) => window.__bilimModules?.session?.track.id === tid, id, { timeout: 60_000 });
    await page.waitForTimeout(700);
    for (const f of [0.2, 0.5, 0.85]) {
      await page.evaluate((x) => window.__bilimModules!.session.player.seek(window.__bilimModules!.session.track.duration * x), f);
      await page.waitForTimeout(300);
      expect(await drawn(page), `${id} ${f}`).toBeGreaterThan(8);
    }
  }
  expect(problems).toEqual([]);
});

test('energy: the Temel level opens photosynthesis and respiration with their coarse flows', async ({ page }) => {
  test.setTimeout(120_000);
  const problems = await open(page, 'fotosentez', 'temel');
  for (const at of [3, 20, 44, 56]) {
    await page.evaluate((x) => window.__bilimModules!.session.player.seek(x), at);
    await page.waitForTimeout(300);
    expect(await drawn(page), `t=${at}`).toBeGreaterThan(8);
  }
  await page.locator('[data-track="hucresel-solunum"]').click();
  await page.waitForFunction(() => window.__bilimModules?.session?.track.id === 'hucresel-solunum', null, { timeout: 60_000 });
  await page.waitForTimeout(600);
  for (const at of [2, 30, 62]) {
    await page.evaluate((x) => window.__bilimModules!.session.player.seek(x), at);
    await page.waitForTimeout(300);
    expect(await drawn(page), `t=${at}`).toBeGreaterThan(8);
  }
  expect(problems).toEqual([]);
});
