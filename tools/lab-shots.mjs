/* eslint-disable no-undef */
// GPU screenshots of the chemistry lab at several sizes: node tools/lab-shots.mjs [outDir] [sizes]
// Plays experiment 1 through the keyboard path (vinegar into the flask, baking soda on top) and shoots the screen.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots/lab';
const sizes = (process.argv[3] ?? '1366x768,1600x900').split(',');
const base = process.env.BASE ?? 'http://localhost:4173/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(`${base}?demo&level=ileri#/modul/chem-lab`);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.moduleReady === 'chem-lab', null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/lab_${size}_start.png` });
  await page.evaluate(() => {
    const lab = window.__bilimSim.scene.lab;
    lab.pour('vinegar', 'flask', 50);
    lab.add('nahco3', 'flask', 3, true);
  });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/lab_${size}_run.png` });
  console.log('shot', size, errors.slice(0, 3));
  await page.close();
}
await browser.close();
