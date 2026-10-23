import { expect, test, type Page } from '@playwright/test';

interface Bilim {
  stage: {
    screenshot(): Promise<Blob | null>;
    qualityLevel: string;
    debug: { cameraPosition(): [number, number, number]; screenPointOf(id: string): { x: number; y: number } | null };
  };
  store: { get(): { selectedId: string | null; cutPosition: number; viewMode: string; cellId: string; level: string; compareOn: boolean } };
  catalog: { data: { sources: unknown[]; micrographs: unknown[]; kazanimlar: unknown[] } };
}
declare global {
  interface Window {
    __bilim: Bilim;
  }
}

/** Opens the app, collects console errors and waits until the first cell is drawn. */
async function openApp(page: Page, query = '?perf'): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`./${query}`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 80_000 });
  await page.waitForTimeout(600);
  return problems;
}

/** Reads the rendered frame back and reports how much of it is not a flat colour. */
async function frameStats(page: Page): Promise<{ distinct: number; variance: number }> {
  return page.evaluate(async () => {
    const blob = await window.__bilim.stage.screenshot();
    if (!blob) return { distinct: 0, variance: 0 };
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 100;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const colours = new Set<number>();
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < data.length; i += 4) {
      colours.add(((data[i]! >> 3) << 10) | ((data[i + 1]! >> 3) << 5) | (data[i + 2]! >> 3));
      const l = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      sum += l;
      sumSq += l * l;
    }
    const n = data.length / 4;
    return { distinct: colours.size, variance: sumSq / n - (sum / n) ** 2 };
  });
}

test('page loads, draws a non-blank canvas and logs no errors', async ({ page }) => {
  const problems = await openApp(page);
  await expect(page).toHaveTitle('Bilim Atölyesi · Hücre');
  await expect(page.locator('h1')).toHaveText('Bilim Atölyesi · Hücre');
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
  const stats = await frameStats(page);
  expect(stats.distinct).toBeGreaterThan(60);
  expect(stats.variance).toBeGreaterThan(40);
  await page.screenshot({ path: 'test-results/smoke-default.png' });
  expect(problems).toEqual([]);
});

test('switching cell types changes the scene and keeps the page clean', async ({ page }) => {
  test.setTimeout(180_000);
  // The low preset keeps this loop affordable on the software renderer the CI uses.
  const problems = await openApp(page, '?perf&level=ileri&quality=low');
  const title = page.locator('#cell-title');
  await expect(title).toHaveText('Bitki hücresi');
  for (const [button, expected, id] of [
    ['Hayvan hücresi', 'Hayvan hücresi', 'animal'],
    ['Bakteri hücresi', 'Bakteri hücresi', 'bacterium'],
    ['Bitki hücresi', 'Bitki hücresi', 'plant'],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(button) }).first().click();
    await expect(title).toHaveText(expected);
    await expect.poll(() => page.evaluate(() => window.__bilim.store.get().cellId)).toBe(id);
    await page.waitForTimeout(1200);
    expect((await frameStats(page)).distinct).toBeGreaterThan(60);
  }
  expect(problems).toEqual([]);
});

test('the bacterium opens at the advanced level and the URL reflects the state', async ({ page }) => {
  const problems = await openApp(page, '?perf&cell=bacterium');
  await expect(page.locator('#cell-title')).toHaveText('Bakteri hücresi');
  expect(await page.evaluate(() => window.__bilim.store.get().level)).toBe('ileri');
  await expect(page.getByRole('button', { name: 'Temel' })).toBeDisabled();
  expect(page.url()).toContain('cell=bacterium');
  expect(problems).toEqual([]);
});

test('the cutaway slider cuts the cell and the picture changes', async ({ page }) => {
  const problems = await openApp(page);
  // The cut view is the default (a horizontal cut with the cell seen from above).
  const slider = page.locator('#cut-slider');
  await expect(slider).toBeVisible();
  await expect(page.locator('.stage-card')).toHaveAttribute('data-mode', 'cutaway');
  await page.getByRole('button', { name: 'Tam' }).click();
  await expect(slider).toBeHidden();
  await page.getByRole('button', { name: 'Kesit' }).click();
  await expect(slider).toBeVisible();
  await slider.fill('0.2');
  await page.waitForTimeout(900);
  const before = await page.locator('.stage-viewport').screenshot();
  await slider.fill('0.8');
  await page.waitForTimeout(900);
  const after = await page.locator('.stage-viewport').screenshot();
  expect(await page.evaluate(() => window.__bilim.store.get().cutPosition)).toBeCloseTo(0.8, 2);
  expect(before.equals(after)).toBe(false);
  await page.screenshot({ path: 'test-results/smoke-cutaway.png' });
  expect(problems).toEqual([]);
});

test('selecting an organelle shows its info card, from the list and by clicking the 3D model', async ({ page }) => {
  const problems = await openApp(page, '?perf&level=ileri');
  const card = page.locator('section[aria-labelledby="h-info"]');
  await page.locator('button.legend-select', { hasText: 'Mitokondri' }).click();
  await expect(card.locator('h3').first()).toHaveText('Mitokondri');
  await expect(card).toContainText('Kazanımlar');
  await expect(card).toContainText('Kaynaklar');
  await expect(page.locator('.stage-card')).toHaveAttribute('data-selected', 'mitochondrion');

  // Deselect with Escape on the canvas, then click the nucleus in the 3D view.
  await page.locator('canvas.stage-canvas').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.stage-card')).toHaveAttribute('data-selected', '');
  await page.getByRole('button', { name: 'Görünümü sıfırla' }).click();
  await page.waitForTimeout(1500);
  // Click an organelle that is visible in the cut view and not covered by an overlay.
  const point = await page.evaluate(() => {
    for (const id of ['mitochondrion', 'nucleus', 'vacuole', 'golgi', 'chloroplast', 'rough-er']) {
      const p = window.__bilim.stage.debug.screenPointOf(id);
      if (p && document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS') return p;
    }
    return null;
  });
  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
  await expect.poll(() => page.evaluate(() => window.__bilim.store.get().selectedId)).not.toBeNull();
  await page.screenshot({ path: 'test-results/smoke-selected.png' });
  expect(problems).toEqual([]);
});

test('quality: low preset loads cleanly, the default adapts and the overlay names the preset', async ({ page }) => {
  const problems = await openApp(page, '?perf&quality=low');
  await page.getByRole('button', { name: 'Tam' }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('.perf-overlay')).toContainText('[low]');
  expect((await frameStats(page)).distinct).toBeGreaterThan(40);
  expect(problems).toEqual([]);
  const page2 = await page.context().newPage();
  await openApp(page2, '?perf');
  expect(await page2.evaluate(() => window.__bilim.stage.qualityLevel)).toMatch(/low|medium/);
});

test('reduced motion: loads without fades or errors', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const problems = await openApp(page);
  await page.getByRole('button', { name: /Hayvan hücresi/ }).first().click();
  await expect(page.locator('#cell-title')).toHaveText('Hayvan hücresi');
  await page.waitForTimeout(800);
  expect((await frameStats(page)).distinct).toBeGreaterThan(40);
  // The layout fits a 1366x768 screen: nothing scrolls the page itself.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2)).toBe(true);
  expect(problems).toEqual([]);
  await context.close();
});

test('Temel level: only organelles with Temel text are listed, the card adapts, İleri adds more', async ({ page }) => {
  const problems = await openApp(page, '?perf&cell=animal&level=temel&quality=low');
  const expected = async (level: 'temel' | 'ileri'): Promise<string[]> =>
    page.evaluate((lv) => {
      const { catalog, store } = window.__bilim as unknown as {
        catalog: { cell(id: string): { shellOrganelleIds: string[]; placements: { organelleId: string }[] }; organelleById: Map<string, { nameTr: string; text: Record<string, unknown> }> };
        store: { get(): { cellId: string } };
      };
      const cell = catalog.cell(store.get().cellId);
      return [...new Set([...cell.shellOrganelleIds, ...cell.placements.map((p) => p.organelleId)])]
        .map((id) => catalog.organelleById.get(id))
        .filter((o) => o && o.text[lv])
        .map((o) => o!.nameTr.replace(/\s*\([^)]*\)\s*$/, ''));
    }, level);
  const listed = async (): Promise<string[]> => (await page.locator('button.legend-select').allInnerTexts()).map((t) => t.trim());
  const temel = await expected('temel');
  expect(await listed()).toEqual(temel);
  const ileriNames = await expected('ileri');
  expect(temel.length).toBeLessThan(ileriNames.length);
  // The info card shows the Temel text of the cell and marks the level.
  await expect(page.getByRole('button', { name: 'Temel', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const cardTemel = await page.locator('section[aria-labelledby="h-info"]').innerText();
  await page.getByRole('button', { name: 'İleri', exact: true }).click();
  await expect.poll(listed).toEqual(ileriNames);
  expect(await page.locator('section[aria-labelledby="h-info"]').innerText()).not.toBe(cardTemel);
  expect(problems).toEqual([]);
});

test('keyboard focus order follows the page: navigation, cell list, legend, stage, microscope, compare, info card', async ({ page }) => {
  await openApp(page, '?perf&quality=low');
  await page.keyboard.press('Tab'); // skip link
  const order: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const region = el.closest('nav, .cell-list, .legend, .stage-card, section[aria-labelledby="h-info"], section[aria-labelledby="h-micro"], section[aria-labelledby="h-compare"]');
        const cls = region?.matches('nav') ? 'nav' : region?.classList.contains('cell-list') ? 'cells' : region?.classList.contains('legend') ? 'legend' : region?.classList.contains('stage-card') ? 'stage' : (region?.getAttribute('aria-labelledby') ?? 'other');
        return `${cls}:${getComputedStyle(el).outlineStyle !== 'none' ? 'ring' : 'noring'}`;
      }),
    );
  }
  const regions = order.map((o) => o.split(':')[0]);
  const firstSeen = ['nav', 'cells', 'legend', 'stage', 'h-micro', 'h-compare', 'h-info'].map((r) => regions.indexOf(r)).filter((i) => i >= 0);
  expect(firstSeen).toEqual([...firstSeen].sort((a, b) => a - b));
  expect(regions).toContain('stage');
  expect(order.every((o) => o.endsWith(':ring'))).toBe(true);
});

test('level switch changes the explanation text', async ({ page }) => {
  await openApp(page, '?perf&cell=animal&level=temel');
  await page.locator('button.legend-select', { hasText: 'çekirdeği' }).click();
  const card = page.locator('section[aria-labelledby="h-info"]');
  const temel = await card.innerText();
  await page.getByRole('button', { name: 'İleri', exact: true }).click();
  await expect.poll(async () => card.innerText()).not.toBe(temel);
  await expect(page.getByRole('button', { name: 'İleri', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('hide others, isolate and the legend toggles work', async ({ page }) => {
  const problems = await openApp(page, '?perf&level=ileri');
  await page.locator('button.legend-select', { hasText: 'Kloroplast' }).click();
  await page.getByRole('button', { name: 'Yalıt' }).click();
  await expect(page.locator('.stage-card')).toHaveAttribute('data-mode', 'isolate');
  await page.waitForTimeout(1200);
  expect((await frameStats(page)).distinct).toBeGreaterThan(40);
  await page.getByRole('button', { name: 'Tam' }).click();
  await page.getByRole('button', { name: 'Diğerlerini gizle' }).click();
  await expect(page.getByRole('button', { name: 'Diğerlerini gizle' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Kloroplast göster veya gizle' }).click();
  await expect(page.getByRole('button', { name: 'Kloroplast göster veya gizle' })).toHaveAttribute('aria-pressed', 'false');
  expect(problems).toEqual([]);
});

test('keyboard: the canvas takes focus and arrow keys orbit the camera', async ({ page }) => {
  await openApp(page);
  await page.locator('canvas.stage-canvas').focus();
  const before = await page.evaluate(() => window.__bilim.stage.debug.cameraPosition());
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__bilim.stage.debug.cameraPosition());
  expect(after).not.toEqual(before);
  await page.keyboard.press('r');
  // Interactive controls show a visible focus ring.
  await page.getByRole('button', { name: 'Kesit' }).focus();
  const outline = await page.getByRole('button', { name: 'Kesit' }).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('labels toggle and compare view open without errors', async ({ page }) => {
  const problems = await openApp(page, '?perf&cell=animal&level=ileri');
  await page.getByRole('button', { name: 'Etiketler' }).click();
  await expect(page.locator('.leader-label:visible').first()).toBeVisible();
  await page.getByRole('button', { name: 'Etiketler' }).click();
  await page.getByRole('button', { name: 'Karşılaştırma görünümünü aç' }).click();
  await expect(page.getByRole('button', { name: 'Karşılaştırmayı kapat' })).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.locator('.compare-captions span').nth(1)).toHaveText('Bitki hücresi');
  expect((await frameStats(page)).distinct).toBeGreaterThan(60);
  await page.screenshot({ path: 'test-results/smoke-compare.png' });
  await page.getByRole('button', { name: 'Karşılaştırmayı kapat' }).click();
  await page.waitForTimeout(800);
  expect(problems).toEqual([]);
});

test('the screenshot button downloads a PNG', async ({ page }) => {
  await openApp(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ekran görüntüsü' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^bilim-atolyesi-.*\.png$/);
});

test('the Kaynakça page lists every source, micrograph and kazanım from the data', async ({ page }) => {
  const problems = await openApp(page);
  await page.getByRole('link', { name: 'Kaynakça' }).click();
  await expect(page.getByRole('heading', { name: 'Kaynakça', level: 2 })).toBeVisible();
  const counts = await page.evaluate(() => ({
    sources: window.__bilim.catalog.data.sources.length,
    micrographs: window.__bilim.catalog.data.micrographs.length,
    kazanimlar: window.__bilim.catalog.data.kazanimlar.length,
  }));
  await expect(page.locator('.src-item[data-source-id]')).toHaveCount(counts.sources);
  await expect(page.locator('.src-item[data-micrograph-id]')).toHaveCount(counts.micrographs);
  await expect(page.locator('.kaz-table tbody tr')).toHaveCount(counts.kazanimlar);
  await expect(page.locator('.src-item a[target="_blank"]').first()).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('.page')).toContainText('CC BY-SA');
  await expect(page.locator('.mg-item').first()).toContainText('Yazar:');
  // Every micrograph thumbnail actually loads.
  const broken = await page.locator('.mg-item img').evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).length);
  expect(broken).toBe(0);
  await page.screenshot({ path: 'test-results/smoke-kaynakca.png' });
  expect(problems).toEqual([]);
});

test('a source chip in the info card deep-links to its bibliography entry', async ({ page }) => {
  await openApp(page, '?perf&level=ileri');
  await page.locator('button.legend-select', { hasText: 'çekirdeği' }).click();
  await page.locator('section[aria-labelledby="h-info"] a.chip').first().click();
  await expect(page.getByRole('heading', { name: 'Kaynakça', level: 2 })).toBeVisible();
  await expect(page.locator('.src-item:focus')).toHaveCount(1);
});

test('the About page explains the levels', async ({ page }) => {
  await openApp(page);
  await page.getByRole('link', { name: 'Hakkında' }).click();
  await expect(page.getByRole('heading', { name: 'Seviyeler' })).toBeVisible();
  await expect(page.locator('.page')).toContainText('Temel');
  await expect(page.locator('.page')).toContainText('İleri');
  await page.getByRole('link', { name: 'Keşfet' }).click();
  await expect(page.locator('canvas.stage-canvas')).toBeVisible();
});

test('micrograph panel opens an enlarged image with author and licence', async ({ page }) => {
  await openApp(page);
  await page.locator('.micro-btn').first().click();
  const dialog = page.locator('dialog.lightbox');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Lisans:');
  await page.getByRole('button', { name: 'Kapat' }).click();
  await expect(dialog).toBeHidden();
});

test('the quality menu changes the preset, is remembered, and the URL overrides it', async ({ page, context }) => {
  const problems = await openApp(page, '?perf');
  await page.getByRole('button', { name: 'Ayarlar' }).click();
  await expect(page.getByRole('radio', { name: /Otomatik/ })).toBeChecked();
  await page.getByRole('radio', { name: /Düşük/ }).check();
  await expect.poll(() => page.evaluate(() => window.__bilim.stage.qualityLevel)).toBe('low');
  expect(await page.evaluate(() => localStorage.getItem('bilim.qualityMode'))).toBe('low');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-popover')).toBeHidden();
  // A new page in the same browser context starts with the saved choice.
  const again = await context.newPage();
  await openApp(again, '?perf');
  expect(await again.evaluate(() => window.__bilim.stage.qualityLevel)).toBe('low');
  await again.getByRole('button', { name: 'Ayarlar' }).click();
  await expect(again.getByRole('radio', { name: /Düşük/ })).toBeChecked();
  // ?quality= wins and locks the menu.
  const pinned = await context.newPage();
  await openApp(pinned, '?perf&quality=medium');
  expect(await pinned.evaluate(() => window.__bilim.stage.qualityLevel)).toBe('medium');
  await pinned.getByRole('button', { name: 'Ayarlar' }).click();
  await expect(pinned.getByRole('radio', { name: /Orta/ })).toBeChecked();
  await expect(pinned.getByRole('radio', { name: /Orta/ })).toBeDisabled();
  expect(problems).toEqual([]);
});

test('a lost WebGL context shows a message, then recovers and draws again', async ({ page }) => {
  const problems = await openApp(page, '?perf&quality=low');
  await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('canvas.stage-canvas')!.getContext('webgl2')!;
    const ext = gl.getExtension('WEBGL_lose_context')!;
    (window as unknown as { __lose: WEBGL_lose_context }).__lose = ext;
    ext.loseContext();
  });
  await expect(page.getByText('Grafik bağlantısı kesildi, yeniden bağlanıyor…')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext());
  await expect(page.getByText('Grafik bağlantısı kesildi, yeniden bağlanıyor…')).toBeHidden({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  const stats = await frameStats(page);
  expect(stats.distinct).toBeGreaterThan(60);
  expect(stats.variance).toBeGreaterThan(40);
  // Nothing in the stage is black after the restore.
  expect(await page.evaluate(async () => {
    const blob = await window.__bilim.stage.screenshot();
    const bmp = await createImageBitmap(blob!);
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 40;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, 64, 40);
    const d = ctx.getImageData(0, 0, 64, 40).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! < 30) dark++;
    return dark / (d.length / 4);
  })).toBeLessThan(0.05);
  expect(problems.filter((p) => /does not belong|INVALID_/.test(p))).toEqual([]);
});

test('a missing model file shows a toast and a simple shape instead', async ({ page }) => {
  await page.route('**/models/organelles/mitochondrion.glb', (route) => route.abort());
  await openApp(page, '?perf&cell=animal&quality=low');
  await expect(page.locator('.toast.show')).toContainText('Bazı modeller yüklenemedi; basit şekiller gösteriliyor');
  expect((await frameStats(page)).distinct).toBeGreaterThan(40);
});

test('the micrograph panel shows a +N tile that opens the whole set with next and previous', async ({ page }) => {
  await openApp(page, '?perf&cell=animal&quality=low');
  const total = await page.evaluate(() => {
    const { catalog, store } = window.__bilim as unknown as { catalog: { cell(id: string): { micrographIds: string[] } }; store: { get(): { cellId: string } } };
    return catalog.cell(store.get().cellId).micrographIds.length;
  });
  expect(total).toBeGreaterThan(4);
  await expect(page.locator('.micro-btn')).toHaveCount(4);
  await page.locator('.micro-more').click();
  const dialog = page.locator('dialog.lightbox');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.gallery-count')).toHaveText(`4 / ${total}`);
  await dialog.getByRole('button', { name: 'Sonraki görsel' }).click();
  await expect(dialog.locator('.gallery-count')).toHaveText(`5 / ${total}`);
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('.gallery-count')).toHaveText(`4 / ${total}`);
  await expect(dialog).toContainText('Lisans:');
});

test('at 1280 px the subtitle stays clear of the compact view panel, and labels stay inside the stage', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const problems = await openApp(page, '?perf&quality=low');
  const rects = await page.evaluate(() => {
    const r = (sel: string): { l: number; r: number; t: number; b: number } => {
      const b = document.querySelector(sel)!.getBoundingClientRect();
      return { l: b.left, r: b.right, t: b.top, b: b.bottom };
    };
    return { sub: r('.stage-head p'), panel: r('.view-panel'), stage: r('.stage-card') };
  });
  const apart = rects.sub.r <= rects.panel.l || rects.sub.b <= rects.panel.t;
  expect(apart).toBe(true);
  await page.getByRole('button', { name: 'Tam' }).click();
  await page.getByRole('button', { name: 'Etiketler' }).click();
  await page.waitForTimeout(1200);
  const outside = await page.evaluate(() => {
    const stage = document.querySelector('.stage-card')!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('.leader-label')]
      .filter((l) => l.style.display !== 'none')
      .map((l) => l.getBoundingClientRect())
      .filter((b) => b.left < stage.left - 1 || b.right > stage.right + 1 || b.top < stage.top - 1 || b.bottom > stage.bottom + 1).length;
  });
  expect(outside).toBe(0);
  expect(problems).toEqual([]);
  await context.close();
});

test('below 1100 px a friendly note replaces the layout, and a bare ?perf stays bare in the URL', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const page = await context.newPage();
  await openApp(page, '?perf&quality=low');
  await expect(page.getByText('Bu sürüm masaüstü ekranlar için tasarlandı')).toBeVisible();
  await expect(page.locator('.app')).toBeHidden();
  expect(page.url()).toMatch(/[?&]perf(&|#|$)/);
  expect(page.url()).not.toContain('perf=');
  await context.close();
});
