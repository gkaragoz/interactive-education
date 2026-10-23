import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCOPE = 'https://example.org/atolye/';
type Handler = (event: Record<string, unknown>) => void;

/** Runs public/sw.js against a fake worker scope with an in-memory Cache API. */
function boot(online = true) {
  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
    .replace('__BUILD_ID__', 'v1')
    .replace('/* __SHELL__ */ []', JSON.stringify(['./', 'index.html', 'assets/app.js']))
    .replace('/* __EXTRA__ */ []', JSON.stringify(['models/organelles/a.glb', 'models/organelles/b.glb', 'textures/a/low/clay_albedo.ktx2']));
  const stores = new Map<string, Map<string, Response>>();
  const networkCalls: string[] = [];
  const state = { online };
  const key = (r: string | Request): string => (typeof r === 'string' ? r : r.url);
  const makeCache = (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      match: async (r: string | Request, opts?: { ignoreSearch?: boolean }) => {
        const k = opts?.ignoreSearch ? key(r).split('?')[0] : key(r);
        const hit = [...store.entries()].find(([u]) => (opts?.ignoreSearch ? u.split('?')[0] : u) === k);
        return hit?.[1].clone();
      },
      put: async (r: string | Request, res: Response) => void store.set(key(r), res),
      add: async (r: string) => {
        const res = await fetchFn(r);
        if (!res.ok) throw new Error('bad');
        store.set(r, res);
      },
      addAll: async (urls: string[]) => void (await Promise.all(urls.map((u) => makeCache(name).add(u)))),
    };
  };
  const caches = {
    open: async (name: string) => makeCache(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const fetchFn = async (r: string | Request): Promise<Response> => {
    networkCalls.push(key(r));
    if (!state.online) throw new TypeError('offline');
    return new Response('network:' + key(r), { status: 200 });
  };
  const handlers = new Map<string, Handler>();
  const self = {
    registration: { scope: SCOPE },
    clients: { claim: async () => undefined },
    addEventListener: (type: string, fn: Handler) => handlers.set(type, fn),
  };
  new Function('self', 'caches', 'fetch', 'URL', 'Response', source)(self, caches, fetchFn, URL, Response);
  const waitFor = async (type: string, extra: Record<string, unknown> = {}): Promise<void> => {
    let pending: Promise<unknown> = Promise.resolve();
    handlers.get(type)?.({ waitUntil: (p: Promise<unknown>) => (pending = p), ...extra });
    await pending;
  };
  const request = async (url: string, init: { method?: string; navigate?: boolean; range?: boolean } = {}) => {
    let answer: Promise<Response> | undefined;
    const req = Object.assign(new Request(url, { method: init.method ?? 'GET' }), {});
    const event = {
      request: { url: req.url, method: req.method, mode: init.navigate ? 'navigate' : 'cors', headers: new Headers(init.range ? { range: 'bytes=0-1' } : {}) },
      respondWith: (p: Promise<Response>) => (answer = p),
    };
    handlers.get('fetch')?.(event);
    return answer ? await answer : null;
  };
  return { stores, networkCalls, state, waitFor, request, handlers };
}

describe('service worker', () => {
  it('precaches the app shell on install, under a versioned cache name', async () => {
    const sw = boot();
    await sw.waitFor('install');
    expect([...sw.stores.keys()]).toEqual(['bilim-v1']);
    expect([...(sw.stores.get('bilim-v1') ?? new Map()).keys()].sort()).toEqual([SCOPE, SCOPE + 'assets/app.js', SCOPE + 'index.html'].sort());
  });

  it('removes only its own older caches when it activates', async () => {
    const sw = boot();
    sw.stores.set('bilim-old', new Map());
    sw.stores.set('other-app', new Map());
    await sw.waitFor('install');
    await sw.waitFor('activate');
    expect([...sw.stores.keys()].sort()).toEqual(['bilim-v1', 'other-app']);
  });

  it('precaches the extra files after the page asks, once, and tolerates failures', async () => {
    const sw = boot();
    await sw.waitFor('install');
    sw.networkCalls.length = 0;
    await sw.waitFor('message', { data: { type: 'precache-extra' } });
    expect(sw.networkCalls.sort()).toEqual([SCOPE + 'models/organelles/a.glb', SCOPE + 'models/organelles/b.glb', SCOPE + 'textures/a/low/clay_albedo.ktx2'].sort());
    sw.networkCalls.length = 0;
    await sw.waitFor('message', { data: { type: 'precache-extra' } });
    expect(sw.networkCalls).toEqual([]);
  });

  it('answers from the cache first and stores models and textures it fetches (medium and high tiers)', async () => {
    const sw = boot();
    await sw.waitFor('install');
    sw.networkCalls.length = 0;
    const shell = await sw.request(SCOPE + 'assets/app.js');
    expect(await shell?.text()).toBe('network:' + SCOPE + 'assets/app.js'); // cached at install by the fake network
    expect(sw.networkCalls).toEqual([]);
    const tex = SCOPE + 'textures/a/high/clay_albedo.ktx2';
    expect(await (await sw.request(tex))?.text()).toBe('network:' + tex);
    expect(sw.networkCalls).toEqual([tex]);
    await new Promise((r) => setTimeout(r, 0));
    sw.networkCalls.length = 0;
    await sw.request(tex);
    expect(sw.networkCalls).toEqual([]);
  });

  it('does not cache other kinds of files and ignores other origins, other methods and range requests', async () => {
    const sw = boot();
    await sw.waitFor('install');
    await sw.request(SCOPE + 'data/other.json');
    expect([...(sw.stores.get('bilim-v1') ?? new Map()).keys()]).not.toContain(SCOPE + 'data/other.json');
    expect(await sw.request('https://evil.example/models/organelles/x.glb')).toBeNull();
    expect(await sw.request(SCOPE + 'models/organelles/a.glb', { method: 'POST' })).toBeNull();
    expect(await sw.request(SCOPE + 'models/organelles/a.glb', { range: true })).toBeNull();
    expect(await sw.request('https://example.org/elsewhere/file.js')).toBeNull();
  });

  it('opens offline: navigations fall back to the cached page, online ones use the network', async () => {
    const sw = boot();
    await sw.waitFor('install');
    expect(await (await sw.request(SCOPE + '?cell=animal', { navigate: true }))?.text()).toBe('network:' + SCOPE + '?cell=animal');
    sw.state.online = false;
    const offline = await sw.request(SCOPE + '?cell=animal&level=ileri', { navigate: true });
    // The cached page for the same address (the scope root, ignoring the query) is served.
    expect(await offline?.text()).toBe('network:' + SCOPE);
  });
});
