/* eslint-disable no-undef */
// Module performance: node tools/perf.mjs [--quality=medium,low] [--secs=8] [--modules=a,b] [--level=ileri] [--out=docs]  (npm run perf)
// Opens every module track with a real-GPU Chromium, plays at 1x and measures the cost of each drawn frame with
// gl.finish-synchronised timing (the stage's draw call is wrapped: render + gl.finish, so GPU time counts). It reports
// the median, p95 and p99 frame cost in ms, the achieved frame interval, the first-frame compile time (`prewarmMs`, the
// shader pre-warm behind the loading screen) and, once per module, the cold first frame without pre-warm (?noprewarm).
// Run it on a QUIET machine (no other GPU or CPU heavy programs), see docs/PERF.md.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const qualities = arg('quality', 'medium,low').split(',');
const secs = Number(arg('secs', '8'));
const only = arg('modules', '').split(',').filter(Boolean);
const outDir = arg('out', 'docs');
const level = arg('level', 'ileri');
const base = process.env.BASE ?? 'http://localhost:4173/';
const ALL = ['membrane-transport', 'mitosis-meiosis', 'dna-protein', 'genetics', 'energy', 'muscle', 'nervous'];

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0;
};
const r1 = (n) => Math.round(n * 10) / 10;

let server = null;
try {
  await fetch(base);
} catch {
  console.log('starting vite preview...');
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore', shell: true });
  for (let i = 0; i < 60; i++) {
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
const gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const e = gl?.getExtension('WEBGL_debug_renderer_info');
  return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log('GPU:', gpu);

async function openModule(id, track, quality, extra = '') {
  await page.goto(`${base}?demo&level=${level}&quality=${quality}${extra}#/modul/${id}${track ? `/${track}` : ''}`);
  await page.reload();
  await page.waitForFunction(
    (a) => document.body.dataset.moduleReady === a[0] && (!a[1] || window.__bilimModules?.session?.track?.id === a[1]),
    [id, track],
    { timeout: 180000 },
  );
}

const MEASURE = `(async (secs) => {
  const host = window.__bilimModules, stage = host.stage, gl = stage.renderer.getContext();
  const cost = [], gaps = [];
  let last = 0;
  const orig = stage.draw.bind(stage);
  stage.draw = () => { const a = performance.now(); orig(); gl.finish(); const b = performance.now(); cost.push(b - a); if (last) gaps.push(b - last); last = b; };
  const p = host.session.player;
  p.setLoop(true); p.setSpeed(1); p.seek(0); p.play();
  await new Promise((r) => setTimeout(r, secs * 1000));
  p.pause(); stage.draw = orig;
  return { cost, gaps, prewarmMs: stage.prewarmMs, track: host.session.track.id };
})`;

// Without pre-warm the first frames of playback pay for shader compiles: report the worst of the first 20 draws.
const COLD = `(async () => { const host = window.__bilimModules, s = host.stage, gl = s.renderer.getContext(); const cost = []; const orig = s.draw.bind(s); s.draw = () => { const a = performance.now(); orig(); gl.finish(); cost.push(performance.now() - a); }; host.session.player.seek(0); host.session.player.play(); await new Promise((r) => setTimeout(r, 1500)); host.session.player.pause(); s.draw = orig; return Math.max(...cost.slice(0, 20)); })()`;

const results = [];
for (const id of ALL.filter((i) => only.length === 0 || only.includes(i))) {
  for (const quality of qualities) {
    await openModule(id, '', quality);
    const tracks = await page.evaluate((lv) => window.__bilimModules.session.info.tracks.filter((t) => t.levels.includes(lv)).map((t) => t.id), level);
    for (const [index, track] of tracks.entries()) {
      if (index > 0) await openModule(id, track, quality);
      const data = await page.evaluate(`${MEASURE}(${secs})`);
      const row = {
        module: id, track: data.track, quality, frames: data.cost.length,
        medianMs: r1(pct(data.cost, 50)), p95Ms: r1(pct(data.cost, 95)), p99Ms: r1(pct(data.cost, 99)), maxMs: r1(Math.max(0, ...data.cost)),
        intervalMedianMs: r1(pct(data.gaps, 50)), fps: r1(1000 / Math.max(pct(data.gaps, 50), 0.01)),
        prewarmMs: r1(data.prewarmMs), coldFirstFrameMs: null,
      };
      if (index === 0 && quality === qualities[0]) {
        await openModule(id, track, quality, '&noprewarm');
        row.coldFirstFrameMs = r1(await page.evaluate(COLD));
      }
      results.push(row);
      console.log(`${id}/${row.track} ${quality}: median ${row.medianMs} ms, p95 ${row.p95Ms}, p99 ${row.p99Ms}, ${row.fps} fps, prewarm ${row.prewarmMs} ms${row.coldFirstFrameMs !== null ? `, cold worst of first 20 frames ${row.coldFirstFrameMs} ms` : ''}`);
    }
  }
}
await browser.close();
server?.kill();

const stamp = new Date().toISOString();
writeFileSync(`${outDir}/perf.json`, JSON.stringify({ generated: stamp, gpu, viewport: '1600x900', level, secondsPerTrack: secs, errors, results }, null, 2));
const rows = results.map((r) => `| ${r.module} | ${r.track} | ${r.quality} | ${r.medianMs} | ${r.p95Ms} | ${r.p99Ms} | ${r.maxMs} | ${r.fps} | ${r.prewarmMs} | ${r.coldFirstFrameMs ?? ''} |`).join('\n');
const over = results.filter((r) => r.p95Ms > 16.7).map((r) => `${r.module}/${r.track} (${r.quality}) p95 ${r.p95Ms} ms`);
const md = [
  '# Module performance',
  '',
  `Generated ${stamp} by \`npm run perf\` on **${gpu}** at 1600x900, level ${level}, ${secs} s of playback at 1x per track.`,
  '',
  'How to run: close other programs (browsers, games, Blender), plug a laptop in, then `npm run build && npm run perf`',
  '(it starts `vite preview` itself when nothing listens on :4173). Options: `--quality=medium,low`, `--secs=8`,',
  '`--modules=energy,muscle`, `--level=temel`, `--out=docs`. Frame cost is render + `gl.finish()` per drawn frame, so GPU',
  'time is included; the interval is the time between two finished frames. `prewarm` is the shader compile that runs',
  'behind the loading screen (`ModuleStage.prewarm`); `cold first frames` is the slowest of the first 20 frames of playback without it (`?noprewarm`), once per module.',
  '',
  '| module | track | quality | median ms | p95 ms | p99 ms | max ms | fps | prewarm ms | cold first frames ms |',
  '|---|---|---|---|---|---|---|---|---|---|',
  rows,
  '',
  `Over the 16.7 ms (60 fps) p95 budget: ${over.length ? over.join('; ') : 'none'}.`,
  errors.length ? `\nPage errors: ${errors.join(' | ')}` : '',
  '',
].join('\n');
writeFileSync(`${outDir}/PERF.md`, md);
console.log(`wrote ${outDir}/PERF.md and ${outDir}/perf.json`);
