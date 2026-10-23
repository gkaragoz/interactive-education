/* eslint-disable no-undef */
// Renders the home-page card stills: node tools/thumbs.mjs [moduleId ...]   (needs `npm run preview` on :4173)
// Default: the cell explorer. Other modules open on their first track at 40 % of the timeline (needs ?demo for previews).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['cell'];
const base = process.env.BASE ?? 'http://localhost:4173/';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const url = id === 'cell' ? `${base}?perf&cell=animal&level=ileri&quality=high#/modul/cell` : `${base}?demo&level=ileri&quality=high#/modul/${id}`;
  await page.goto(url);
  await page.waitForFunction(() => document.body.dataset.ready === 'true' || document.body.dataset.moduleReady, null, { timeout: 120000 });
  if (id !== 'cell') await page.evaluate(() => { const m = window.__bilimModules; m?.session.player.seek(m.session.track.duration * 0.4); });
  await page.waitForTimeout(6000);
  await page.addStyleTag({ content: '.floating,.topbar,.dock-bar,.toast,.stage-head,.hint,.perf-overlay,.note{visibility:hidden!important}' });
  await page.waitForTimeout(800);
  const png = await page.screenshot({ clip: id === 'cell' ? { x: 585, y: 250, width: 730, height: 540 } : { x: 330, y: 70, width: 940, height: 640 } });
  const b64 = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 720; c.height = 490;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.82).split(',')[1];
  }, png.toString('base64'));
  writeFileSync(`public/thumbs/${id}.webp`, Buffer.from(b64, 'base64'));
  console.log('wrote', id);
  await page.close();
}
await browser.close();
