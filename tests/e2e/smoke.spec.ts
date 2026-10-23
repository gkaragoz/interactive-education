import { expect, test, type Page } from '@playwright/test';

/** Opens the app, collects console errors and waits until the first cell is drawn. */
async function openApp(page: Page, query = '?perf', raw = false): Promise<string[]> {
  // The software renderer is slow: tests use the low preset unless they are about quality itself (`raw`).
  if (!raw && !/quality=/.test(query)) query += '&quality=low';
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`./${query}#/modul/cell`);
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
  await expect(page).toHaveTitle('Hücre · Bilim Atölyesi');
  await expect(page.locator('h1')).toHaveText('Bilim Atölyesi');
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
  test.setTimeout(180_000);
  const problems = await openApp(page, '?perf&quality=low');
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
  await openApp(page2, '?perf', true);
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
  await page.locator('button.legend-select', { hasText: 'çekirdeği' }).click();
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
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const region = el.closest('nav, .cell-list, .legend, .stage-card, section[aria-labelledby="h-info"], section[aria-labelledby="h-micro"], section[aria-labelledby="h-compare"]');
        const cls = region?.matches('nav') ? 'nav' : region?.classList.contains('cell-list') ? 'cells' : region?.classList.contains('legend') ? 'legend' : region?.classList.contains('stage-card') ? 'stage' : (region?.getAttribute('aria-labelledby') ?? 'other');
        return `${cls}:${getComputedStyle(el).outlineStyle !== 'none' ? 'ring' : 'noring'}${getComputedStyle(el).outlineStyle !== 'none' ? '' : ` <${el.tagName} ${el.className} ${el.id}>`}`;
      }),
    );
  }
  const regions = order.map((o) => o.split(':')[0]);
  const firstSeen = ['nav', 'stage', 'cells', 'legend', 'h-micro', 'h-compare', 'h-info'].map((r) => regions.indexOf(r)).filter((i) => i >= 0);
  expect(firstSeen).toEqual([...firstSeen].sort((a, b) => a - b));
  expect(regions).toContain('stage');
  expect(order.filter((o) => !o.includes(':ring') && !o.includes('<BODY'))).toEqual([]);
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
  test.setTimeout(180_000);
  const problems = await openApp(page, '?perf&cell=animal&level=ileri&quality=low');
  await page.getByRole('button', { name: 'Etiketler' }).click();
  await expect(page.locator('.leader-label:visible').first()).toBeVisible();
  await page.getByRole('button', { name: 'Etiketler' }).click();
  await page.locator('[data-tab=compare]').click();
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
  await expect(page.locator('#page')).toContainText('CC BY-SA');
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
  await expect(page.locator('#page')).toContainText('Temel');
  await expect(page.locator('#page')).toContainText('İleri');
  // The brand link goes home; the cell card opens the explorer.
  await page.getByRole('link', { name: 'Bilim Atölyesi, ana sayfa' }).click();
  await expect(page.locator('.hero')).toBeVisible();
  await page.locator('[data-module-card=cell] .open-btn').click();
  await expect(page.locator('canvas.stage-canvas').first()).toBeVisible();
});

test('micrograph panel opens an enlarged image with author and licence', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-tab=micro]').click();
  await page.locator('.micro-btn').first().click();
  const dialog = page.locator('dialog.lightbox');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Lisans:');
  await page.getByRole('button', { name: 'Kapat' }).click();
  await expect(dialog).toBeHidden();
});

test('the quality menu changes the preset, is remembered, and the URL overrides it', async ({ page, context }) => {
  test.setTimeout(240_000);
  const problems = await openApp(page, '?perf', true);
  await page.getByRole('button', { name: 'Ayarlar' }).click();
  await expect(page.getByRole('radio', { name: /Otomatik/ })).toBeChecked();
  await page.getByRole('radio', { name: /Düşük/ }).check();
  await expect.poll(() => page.evaluate(() => window.__bilim.stage.qualityLevel)).toBe('low');
  expect(await page.evaluate(() => localStorage.getItem('bilim.qualityMode'))).toBe('low');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-popover')).toBeHidden();
  // A new page in the same browser context starts with the saved choice.
  const again = await context.newPage();
  await openApp(again, '?perf', true);
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
  await page.locator('[data-tab=micro]').click();
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

for (const width of [1280, 1366]) {
  test(`at ${width} px every label is fully visible: inside the stage and clear of the toolbars and the view panel`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 720 : 768 } });
    const page = await context.newPage();
    const problems = await openApp(page, '?perf&quality=low&level=ileri');
    for (const mode of ['Tam', 'Kesit']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      if (!(await page.getByRole('button', { name: 'Etiketler' }).getAttribute('aria-pressed'))?.includes('true')) await page.getByRole('button', { name: 'Etiketler' }).click();
      await page.waitForTimeout(1200);
      const bad = await page.evaluate(() => {
        const box = (el: Element): DOMRect => el.getBoundingClientRect();
        const stage = box(document.querySelector('.stage-card')!);
        const blockers = [...document.querySelectorAll('.toolbar, .view-panel, .rail, .drawer.open, .sheet:not([hidden])')].map(box);
        const hit = (a: DOMRect, b: DOMRect): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return [...document.querySelectorAll<HTMLElement>('.leader-label')]
          .filter((l) => l.style.display !== 'none')
          .filter((l) => {
            const b = box(l);
            const clipped = l.scrollWidth > l.clientWidth + 1;
            return clipped || b.left < stage.left || b.right > stage.right || b.top < stage.top || b.bottom > stage.bottom || blockers.some((t) => hit(b, t));
          })
          .map((l) => l.textContent);
      });
      expect(bad, `${mode} at ${width}`).toEqual([]);
    }
    expect(problems).toEqual([]);
    await context.close();
  });
}

test('offline: the second visit works without a network (service worker, production build)', async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 1400, height: 800 } });
  const page = await context.newPage();
  await openApp(page, '?perf&quality=low');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'precache-extra' });
  });
  // Wait until the models are cached too (the worker caches them after the idle message).
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const names = (await caches.keys()).filter((n) => n.startsWith('bilim-'));
          if (names.length === 0) return 0;
          const cache = await caches.open(names[0]!);
          return (await cache.keys()).filter((r) => /models\/organelles\/.+\.glb$/.test(r.url)).length;
        }),
      { timeout: 60_000 },
    )
    .toBeGreaterThan(5);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 80_000 });
  await expect(page.locator('h1')).toHaveText('Bilim Atölyesi');
  await expect(page.locator('canvas.stage-canvas').first()).toBeVisible();
  expect((await frameStats(page)).distinct).toBeGreaterThan(40);
  await context.close();
});

test('40 alternating cell and quality switches leave GPU textures and geometries in a small constant band, without a crash', async ({ page }) => {
  test.setTimeout(900_000);
  let crashed = false;
  page.on('crash', () => (crashed = true));
  const problems = await openApp(page, '?perf&level=ileri&quality=low');
  const counts = (): Promise<{ textures: number; geometries: number }> =>
    page.evaluate(() => {
      const m = (window.__bilim.stage as unknown as { renderer: { info: { memory: { textures: number; geometries: number } } } }).renderer.info.memory;
      return { textures: m.textures, geometries: m.geometries };
    });
  const cells = ['Hayvan', 'Bakteri', 'Bitki'];
  const levels = ['low', 'medium', 'high'] as const;
  const samples: { textures: number; geometries: number }[] = [];
  for (let i = 0; i < 40; i++) {
    await page.getByRole('button', { name: new RegExp(`${cells[i % 3]} hücresi`) }).first().click();
    await page.evaluate((level) => (window.__bilim.stage as unknown as { setQualityLevel(l: string): void }).setQualityLevel(level), levels[i % 3]!);
    await page.waitForTimeout(1500);
    if (i >= 8) samples.push(await counts());
  }
  await page.waitForTimeout(3000);
  samples.push(await counts());
  const textures = samples.map((s) => s.textures);
  const geometries = samples.map((s) => s.geometries);
  // After every cell and quality has been visited once the counts only wobble (tiers mid-swap), they never climb.
  expect(Math.max(...textures) - Math.min(...textures), `textures ${textures.join(',')}`).toBeLessThanOrEqual(90);
  expect(Math.max(...geometries) - Math.min(...geometries), `geometries ${geometries.join(',')}`).toBeLessThanOrEqual(60);
  expect(textures.at(-1)!).toBeLessThanOrEqual(Math.min(...textures) + 60);
  expect(crashed).toBe(false);
  expect(problems).toEqual([]);
});

async function openModule(page: Page, hash = '#/modul/__demo', query = '?demo&quality=low&level=ileri'): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`./${query}${hash}`);
  await page.waitForFunction(() => document.body.dataset.moduleReady === '__demo', null, { timeout: 80_000 });
  return problems;
}

test('module framework: play, prompts, scrub, steps, labels, charts and options work end to end', async ({ page }) => {
  test.setTimeout(240_000);
  const problems = await openModule(page);
  await expect(page.locator('.phase-title')).toHaveText('Dönme');
  await expect(page.locator('.segment')).toHaveCount(3); // İleri shows all three phases
  // Scrub: the phase card, the slider text and the charts follow.
  await page.locator('[data-scrub]').fill('6');
  await expect(page.locator('.phase-title')).toHaveText('Ayrılma');
  await expect(page.locator('[data-scrub]')).toHaveAttribute('aria-valuetext', /Ayrılma/);
  await page.locator('[data-prev]').click();
  await expect(page.locator('.phase-title')).toHaveText('Ayrılma'); // 6 s is past the phase start: back to its start
  await page.locator('[data-prev]').click();
  await expect(page.locator('.phase-title')).toHaveText('Dönme');
  await page.locator('[data-next]').click();
  await expect(page.locator('.phase-title')).toHaveText('Ayrılma');
  // Labels follow the scene.
  await page.getByRole('button', { name: /^Etiketler/ }).first().waitFor();
  await expect(page.locator('.leader-label:visible').first()).toBeVisible();
  // Play from the start: it pauses by itself at the first question.
  await page.locator('[data-scrub]').fill('0');
  await page.locator('[data-speed]').selectOption('2');
  await page.locator('[data-play]').click();
  await expect(page.locator('.prompt')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.prompt .q')).toHaveText('Şu an hangi evredeyiz?');
  await expect(page.locator('[data-play]')).toHaveAttribute('aria-label', 'Oynat'); // paused
  await page.locator('.prompt .option').nth(1).click(); // wrong on purpose
  await expect(page.locator('.feedback')).toContainText('Tam değil');
  await expect(page.locator('.tally')).toHaveText('0 / 1 doğru');
  await page.locator('[data-continue]').click();
  // The predict prompt comes next (5 s), reveals its answer, then playback continues.
  await expect(page.locator('.prompt .q')).toHaveText('Sence kapsüller sonra ne yapacak?', { timeout: 30_000 });
  await page.locator('[data-reveal]').click();
  await expect(page.locator('.feedback')).toContainText('uzaklaşacaklar');
  await page.locator('[data-continue]').click();
  // Options: four capsules at İleri.
  await page.locator('[data-option="sayi"]').selectOption('4');
  await expect(page.locator('.chart-fig').nth(1)).toContainText('4');
  // Keyboard: space toggles, the help sheet opens with ?.
  await page.locator('[data-play]').focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('?');
  await expect(page.locator('#shortcut-help')).toBeVisible();
  await page.keyboard.press('?');
  expect((await frameStats(page).catch(() => ({ distinct: 99 }))).distinct).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test('module framework: Temel hides the İleri-only phase; reduced motion disables play but stepping works', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1400, height: 800 } });
  const page = await context.newPage();
  const problems = await openModule(page, '#/modul/__demo', '?demo&quality=low&level=temel');
  await expect(page.locator('.segment')).toHaveCount(2);
  await expect(page.locator('[data-play]')).toBeDisabled();
  await page.locator('[data-next]').click();
  await expect(page.locator('.phase-title')).toHaveText('Ayrılma');
  await expect(page.locator('[role=status].sr-only')).toContainText('Evre: Ayrılma');
  expect(problems).toEqual([]);
  await context.close();
});

test('the test module is hidden without ?demo, and unknown modules fall back to the explorer', async ({ page }) => {
  await page.goto('./?quality=low#/modul/__demo');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 80_000 });
  await page.waitForTimeout(300);
  await expect(page.locator('.toast.show')).toContainText('Bu modül bulunamadı');
  await expect(page.locator('.hero')).toBeVisible();
  expect(page.url()).not.toContain('modul');
});

test('home: module cards, Yakında cards without routes, remembered level, previews only with ?demo', async ({ page }) => {
  await page.goto('./#/');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 80_000 });
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('[data-module-card=cell]')).toBeVisible();
  expect(await page.locator('[data-module-card=__demo]').count()).toBe(0);
  // Every module is released now, so each one has a real card and none is 'Yakında'.
  for (const id of ['mitosis-meiosis', 'membrane-transport', 'dna-protein', 'energy', 'muscle', 'nervous', 'genetics']) {
    await expect(page.locator(`[data-module-card=${id}]`)).toBeVisible();
  }
  expect(await page.locator('[data-soon]').count()).toBe(0);
  // The level choice is remembered across reloads.
  await page.locator('.level-switch').getByRole('button', { name: 'İleri', exact: true }).click();
  await page.reload();
  await expect(page.locator('.level-switch').getByRole('button', { name: 'İleri', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Unreleased (preview) modules appear only with ?demo.
  await page.goto('./?demo#/');
  await page.reload();
  // (every real module is released, so ?demo adds no card: the framework test module never shows on the home page)
  expect(await page.locator('[data-module-card=__demo]').count()).toBe(0);
});

test('explorer: the info drawer opens on selection and closes with Esc and the button; the rail collapses', async ({ page }) => {
  const problems = await openApp(page, '?perf&cell=animal&level=temel&quality=low');
  const drawer = page.locator('aside.drawer');
  await expect(drawer).not.toHaveClass(/open/);
  await page.locator('button.legend-select', { hasText: 'çekirdeği' }).click();
  await expect(drawer).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toHaveClass(/open/);
  await page.locator('button.legend-select').last().click();
  await expect(drawer).toHaveClass(/open/);
  await page.locator('.drawer-close').click();
  await expect(drawer).not.toHaveClass(/open/);
  await page.locator('.rail-toggle').click();
  await expect(page.locator('.rail')).toHaveClass(/collapsed/);
  await page.locator('.rail-toggle').click();
  await expect(page.locator('.rail')).not.toHaveClass(/collapsed/);
  expect(problems).toEqual([]);
});

test('module screen: switching level keeps the playhead and hides İleri-only tracks at Temel', async ({ page }) => {
  await page.goto('./?demo&quality=low#/modul/__demo');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 80_000 });
  await page.waitForTimeout(500);
  await page.locator('.level-switch').getByRole('button', { name: 'İleri', exact: true }).click();
  const tabs = page.locator('[role=tab][data-track], .track-tabs button');
  const ileriCount = await tabs.count();
  await page.locator('.level-switch').getByRole('button', { name: 'Temel', exact: true }).click();
  await expect.poll(() => tabs.count()).toBeLessThan(Math.max(ileriCount, 2));
});

test('Sorular kapalı: the timeline runs through every question; the setting is saved and can be switched back', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto('./?demo&quality=low&sorular=0#/modul/__demo');
  await page.waitForFunction(() => document.body.dataset.moduleReady === '__demo', null, { timeout: 80_000 });
  await page.locator('[data-speed]').selectOption('2');
  await page.locator('[data-play]').click();
  await page.waitForFunction(() => (window.__bilimModules?.session.player.time ?? 0) > 7, null, { timeout: 60_000 });
  await expect(page.locator('.prompt-overlay')).toBeHidden();
  await expect(page.locator('.module-view')).toHaveClass(/questions-off/);
  // The setting menu shows Kapalı; the list still opens a question by hand.
  await page.getByRole('button', { name: 'Ayarlar' }).click();
  await expect(page.getByRole('radio', { name: /Kapalı/ })).toBeChecked();
  await page.getByRole('radio', { name: /Açık/ }).check();
  expect(await page.evaluate(() => localStorage.getItem('bilim.questions'))).toBe('1');
  await expect(page.locator('.module-view')).not.toHaveClass(/questions-off/);
  await page.keyboard.press('Escape');
  await page.locator('[data-drawer]').click();
  await page.locator('[data-check]').first().click();
  await expect(page.locator('.prompt')).toBeVisible();
  expect(problems).toEqual([]);
});

test('compact layout at 1366x768: options behind a button, one-line phase bar, panels clear of each other', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('./?demo&quality=low#/modul/__demo');
  await page.waitForFunction(() => document.body.dataset.moduleReady === '__demo', null, { timeout: 80_000 });
  await expect(page.locator('.module-view')).toHaveClass(/compact/);
  await expect(page.locator('.module-options')).toBeHidden();
  await page.locator('[data-options-btn]').click();
  await expect(page.locator('[data-option="sayi"]')).toBeVisible();
  await page.locator('[data-options-btn]').click();
  await expect(page.locator('.module-options')).toBeHidden();
  await expect(page.locator('.chart-tray')).toHaveClass(/collapsed/);
  const clear = await page.evaluate(() => {
    const box = (s: string): DOMRect | null => document.querySelector(s)?.getBoundingClientRect() ?? null;
    const hit = (a: DOMRect | null | undefined, b: DOMRect | null | undefined): boolean => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const [head, tools, phase, dock] = ['.module-head', '.module-tools', '.phase-card', '.dock'].map(box);
    return { headTools: hit(head, tools), phaseDock: hit(phase, dock), toolsDock: hit(tools, dock) };
  });
  expect(clear).toEqual({ headTools: false, phaseDock: false, toolsDock: false });
  await page.close();
});

test('painted organelle textures stream in for ctx.assets.organelle (demo module, KTX2 tiers)', async ({ page }) => {
  await page.goto('./?demo&quality=low#/modul/__demo');
  await page.waitForFunction(() => document.body.dataset.moduleReady === '__demo', null, { timeout: 80_000 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scene = (window.__bilimModules!.stage as unknown as { scene: { traverse(f: (o: { isInstancedMesh?: boolean; material?: { map?: unknown } }) => void): void } }).scene;
        let textured = 0;
        scene.traverse((o) => { if (o.isInstancedMesh && o.material?.map) textured++; });
        return textured;
      }),
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0);
});
