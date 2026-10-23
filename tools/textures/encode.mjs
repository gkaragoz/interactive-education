// Encode the baked PNG tiers (tools/blender/out/tex/<id>/<tier>/<mat>_<map>.png) to KTX2 / Basis Universal with the
// native `basisu` binary from the npm package `basis_universal`, write public/textures/<id>/<tier>/<mat>_<map>.ktx2 and
// add a `textures` block to public/models/organelles/<id>.meta.json.
//   node encode.mjs [--ids=a,b] [--tiers=low,medium,high] [--jobs=3] [--models=<dir holding <id>.meta.json>] [--src=<png tier root>] [--dst=<ktx2 root>]
//   modules: --src=tools/blender/out/tex_modules --dst=public/textures/modules --models=public/models/modules
// Codecs: albedo = ETC1S (sRGB), ORM = ETC1S (linear), normals = UASTC + RDO up to 1024 px and ETC1S normal-map mode above (UASTC at 2048+ is 2.5-10 MB per map and breaks the 120 MB budget).
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TIERS = ['low', 'medium', 'high'];
const BASISU = join(HERE, 'node_modules', 'basis_universal', 'bin', process.platform === 'win32' ? 'basisu.exe' : 'basisu');

function pngSize(file) {
  const b = readFileSync(file);
  return b.readUInt32BE(16);
}

function args(kind, size, png, out) {
  const common = ['-ktx2', '-mipmap', '-output_file', out];
  if (kind === 'albedo') return [...common, '-q', '200', '-comp_level', '2', png];
  if (kind === 'orm') return [...common, '-linear', '-q', '230', '-comp_level', '2', png];
  if (size > 1024) return [...common, "-linear", "-normal_map", "-q", "255", '-comp_level', '2', png];
  return [...common, '-linear', '-normal_map', '-uastc', '-uastc_level', '1', '-uastc_rdo_l', '4', png];
}

function run(file, out, kind) {
  const size = pngSize(file);
  mkdirSync(dirname(out), { recursive: true });
  const t = Date.now();
  return new Promise((ok, bad) =>
    execFile(BASISU, args(kind, size, file, out), { maxBuffer: 1 << 28 }, (err) => {
      if (err) return bad(err);
      const codec = kind === 'normal' && size <= 1024 ? 'UASTC' : 'ETC1S';
      ok({ size, bytes: statSync(out).size, codec, seconds: (Date.now() - t) / 1000 });
    }));
}

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split('=')[1];
const ids = arg('ids', '').split(',').filter(Boolean);
const tiers = arg('tiers', TIERS.join(',')).split(',');
const jobs = Number(arg('jobs', Math.max(1, Math.min(3, cpus().length >> 2))));
const MODELS = resolve(ROOT, arg('models', join('public', 'models', 'organelles')));
const SRC = resolve(ROOT, arg('src', join('tools', 'blender', 'out', 'tex')));
const DST = resolve(ROOT, arg('dst', join('public', 'textures')));
const all = ids.length ? ids : readdirSync(SRC).filter((d) => statSync(join(SRC, d)).isDirectory()).sort();

const tasks = [];
for (const id of all)
  for (const tier of tiers) {
    const dir = join(SRC, id, tier);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) {
      const m = /^(clay|gel)_(albedo|normal|orm)\.png$/.exec(f);
      if (m) tasks.push({ id, tier, mat: m[1], kind: m[2], file: join(dir, f) });
    }
  }
console.log(`${tasks.length} textures, ${jobs} parallel basisu jobs`);
const results = new Map();
let next = 0;
async function worker() {
  while (next < tasks.length) {
    const t = tasks[next++];
    const out = join(DST, t.id, t.tier, `${t.mat}_${t.kind}.ktx2`);
    const res = await run(t.file, out, t.kind);
    results.set(`${t.id}/${t.tier}/${t.mat}_${t.kind}.ktx2`, res);
    console.log(`${t.id}/${t.tier}/${t.mat}_${t.kind}  ${res.size}px  ${res.codec}  ${(res.bytes / 1024).toFixed(0)} KB  ${res.seconds}s`);
  }
}
await Promise.all(Array.from({ length: jobs }, worker));

for (const id of all) {                                  // meta.json: textures block (merged with earlier encodes)
  const mp = join(MODELS, `${id}.meta.json`);
  if (!existsSync(mp)) continue;
  const meta = JSON.parse(readFileSync(mp, 'utf8'));
  const old = meta.textures?.tiers ?? {};
  const tex = { format: 'KTX2', path: `${relative(join(ROOT, 'public'), DST).replaceAll('\\', '/')}/${id}/<tier>/<material>_<map>.ktx2`, tiers: {} };
  for (const tier of TIERS) {
    const dir = join(DST, id, tier);
    if (!existsSync(dir)) continue;
    const maps = [];
    let total = 0, size = 0;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ktx2')).sort()) {
      const bytes = statSync(join(dir, f)).size;
      const r = results.get(`${id}/${tier}/${f}`) ?? old[tier]?.maps.find((m) => m.name === f);
      maps.push({ name: f, size: r.size, bytes, codec: r.codec });
      total += bytes;
      size = Math.max(size, r.size);
    }
    tex.tiers[tier] = { bytes: total, size, maps };
  }
  meta.textures = tex;
  writeFileSync(mp, JSON.stringify(meta, null, 2) + '\n');
}
