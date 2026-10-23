/* eslint-disable no-undef */
// Full-UI screenshots of every module at several window sizes (GPU): node tools/ui-shots.mjs [outDir] [sizes] [ids]
// Needs `npm run preview` on :4173 (or BASE=...). Example: node tools/ui-shots.mjs shots/v07 1366x768,1600x900
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots/ui';
const sizes = (process.argv[3] ?? '1366x768,1440x810,1600x900,1920x1080').split(',');
const ids = (process.argv[4] ?? 'membrane-transport,mitosis-meiosis,dna-protein,genetics,energy,muscle,nervous').split(',');
const base = process.env.BASE ?? 'http://localhost:4173/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  for (const id of ids) {
    await page.goto(`${base}?demo&level=ileri#/modul/${id}`);
    await page.reload();
    await page.waitForFunction((i) => document.body.dataset.moduleReady === i, id, { timeout: 150000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const s = window.__bilimModules.session; s.player.seek(s.track.duration * 0.45); });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${out}/${id}_${size}.png` });
    console.log('shot', id, size);
  }
  if (errors.length) console.log('ERRORS', size, errors.slice(0, 5));
  await page.close();
}
await browser.close();
