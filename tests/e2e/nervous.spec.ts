import { expect, test, type Page } from '@playwright/test';

const TRACKS = ['refleks-yayi', 'aksiyon-potansiyeli', 'sinaps'];

async function open(page: Page, track: string, problems: string[]): Promise<void> {
  await page.goto(`./?demo&level=ileri&quality=low#/modul/nervous/${track}`);
  await page.waitForFunction((id) => document.body.dataset.moduleReady === 'nervous' && window.__bilimModules?.session?.track.id === id, track, { timeout: 80_000 });
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
}

/** Variance of the frame luminance (a blank canvas would be near zero). */
async function variance(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const blob = await window.__bilimModules!.stage.screenshot();
    if (!blob) return 0;
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = 120;
    c.height = 70;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3;
      sum += l;
      sq += l * l;
    }
    const n = d.length / 4;
    return sq / n - (sum / n) ** 2;
  });
}

for (const track of TRACKS) {
  test(`nervous ${track}: opens in preview, plays, scrubs back and forth, no console errors`, async ({ page }) => {
    test.setTimeout(120_000);
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    await open(page, track, problems);
    const duration = await page.evaluate(() => window.__bilimModules!.session.track.duration);
    for (const f of [0.1, 0.5, 0.9, 0.3]) {
      await page.evaluate((t) => window.__bilimModules!.session.player.seek(t), duration * f);
      await page.waitForTimeout(250);
      expect(await variance(page)).toBeGreaterThan(20);
    }
    await page.evaluate(() => {
      window.__bilimModules!.session.player.seek(1);
      window.__bilimModules!.session.player.play();
    });
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => window.__bilimModules!.session.player.time)).toBeGreaterThan(1);
    await page.evaluate(() => window.__bilimModules!.session.player.pause());
    expect(problems).toEqual([]);
  });
}

test('nervous: switching tracks keeps working and a check question can be answered', async ({ page }) => {
  test.setTimeout(150_000);
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await open(page, 'refleks-yayi', problems);
  await page.locator('[data-track="aksiyon-potansiyeli"]').click();
  await page.waitForFunction(() => window.__bilimModules?.session?.track.id === 'aksiyon-potansiyeli', null, { timeout: 60_000 });
  await page.locator('[data-track="sinaps"]').click();
  await page.waitForFunction(() => window.__bilimModules?.session?.track.id === 'sinaps', null, { timeout: 60_000 });
  // the "Kendini dene" list: open a check, answer it, continue
  await page.locator('[data-drawer]').click();
  await page.locator('[data-check]').first().click();
  await page.locator('.prompt .option').first().click();
  await expect(page.locator('.prompt .feedback')).toBeVisible();
  await page.locator('[data-continue]').click();
  expect(problems).toEqual([]);
});
