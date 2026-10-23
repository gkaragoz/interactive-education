import { expect, test, type Page } from '@playwright/test';


async function open(page: Page, track = 'mitoz'): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  // modules are unreleased: the preview route needs ?demo
  await page.goto(`./?demo&level=ileri&quality=low#/modul/mitosis-meiosis/${track}`);
  await page.waitForFunction(() => document.body.dataset.moduleReady === 'mitosis-meiosis', null, { timeout: 80_000 });
  await page.waitForTimeout(500);
  return problems;
}

/** How much of the 3D picture is not the flat background (a cheap "something is drawn" check). */
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

test('mitosis-meiosis: plays, scrubs, switches tracks, answers a check, no console errors', async ({ page }) => {
  const problems = await open(page);
  expect(await drawn(page)).toBeGreaterThan(8);

  // play for a moment: the playhead advances
  await page.locator('[data-play]').click();
  await page.waitForTimeout(1500);
  const t = await page.evaluate(() => window.__bilimModules!.session.player.time);
  expect(t).toBeGreaterThan(0.3);
  await page.locator('[data-play]').click();

  // scrub to metaphase and anaphase: labels follow the phases and the picture stays alive
  for (const at of [23, 29, 41]) {
    await page.evaluate((x) => window.__bilimModules!.session.player.seek(x), at);
    await page.waitForTimeout(250);
    expect(await drawn(page)).toBeGreaterThan(8);
  }
  const labels = await page.evaluate(() => window.__bilimModules!.stage.moduleScene.labelsAt(23).map((l) => l.text));
  expect(labels.length).toBeGreaterThan(1);

  // answer a check from the question list
  await page.locator('[data-drawer]').click();
  await page.locator('[data-check]').first().click();
  await page.locator('.prompt .option').first().click();
  await expect(page.locator('.prompt .feedback')).toBeVisible();
  await page.locator('[data-continue]').click();

  // every track opens and draws
  for (const id of ['mayoz-1', 'mayoz-2', 'mayoz-1-ayrilmama']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForFunction((tid) => window.__bilimModules?.session?.track.id === tid, id, { timeout: 30_000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__bilimModules!.session.player.seek(window.__bilimModules!.session.track.duration * 0.55));
    await page.waitForTimeout(250);
    expect(await drawn(page), id).toBeGreaterThan(8);
  }
  expect(problems).toEqual([]);
});
