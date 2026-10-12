/* E2E: the References field is the site's content browser.
 *
 * The block's references are always on show in the content browser's own
 * selected-items list, several are picked in one visit to the browser, and
 * every change made in that list — add, remove, reorder — reaches the
 * block and its preview on the canvas.
 *
 *  1. An empty block: the list is empty, the canvas says so.
 *  2. Open the browser ONCE, click the first image, Shift-click the sixth,
 *     add the selection: six references in the folder's order, six cards.
 *  3. Remove one in the list: five references, five cards.
 *  4. Drag the last item to the top: the block and the canvas follow.
 *  5. Add one more: it is appended, the dragged order holds.
 *  6. Save, reload: the list shows the stored six, in their order.
 *  7. Replace the sidebar while its seeded references are still loading.
 *
 * Prerequisites: a running Plone site with collective.blicca.referencelist
 * installed, and the mockup bundle (pat-contentbrowser) reachable from the
 * edit page. Configure via environment:
 *   AURORA_E2E_BASE       folder to build the fixture in
 *                         (default http://127.0.0.1:8099/Plone15)
 *   AURORA_E2E_USER       login    (default admin)
 *   AURORA_E2E_PASSWORD   password (default admin)
 *   AURORA_E2E_CHROMIUM   chromium executable (default: playwright-core's)
 *   AURORA_E2E_PAGE_TYPE  fixture portal_type (default Document) — set to
 *                         Article where only that type has blocks
 *   AURORA_E2E_REROUTE    optional "prefix=>replacement" URL rewrite for the
 *                         mockup bundle
 *
 * Run: pnpm e2e   (after `pnpm install` in this directory)
 */
const { chromium } = require('playwright-core');
const { BASE, USER, PASSWORD, EXECUTABLE, PAGE_TYPE, PNG_B64, api, fail } = require('./support');

const FOLDER_ID = 'referencelist-e2e-picker';
const PAGE_ID = 'page';
const BLOCK_ID = 'references';
const IMAGES = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `image-${n}`, title: `E2E image ${n}` }));

/** The page first: its edit lock would keep the folder. */
async function cleanup() {
  await api('DELETE', `/${FOLDER_ID}/${PAGE_ID}`);
  await api('DELETE', `/${FOLDER_ID}`);
}

function expectList(actual, expected, what) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${what}: [${actual.join(', ')}], expected [${expected.join(', ')}]`);
  } else {
    console.log(`ok: ${what}`);
  }
}

const title = (n) => IMAGES[n - 1].title;

const WIDGET = '#sidebar .referencelist-references-widget';

/** The titles in the field's selected-items list, in order. */
const listed = (page) =>
  page.locator(`${WIDGET} .selected-item .item-title`).allTextContents();

/** The item titles the block shows on the canvas, in order. */
const canvasTitles = (page) =>
  page
    .locator(`[data-slate-editor] [data-block-id="${BLOCK_ID}"] .referencelist-items article :is(h2, h3, h4)`)
    .allTextContents();

/** Wait until the list and the canvas both show `titles`, then compare. */
async function expectShown(page, titles, what) {
  const want = JSON.stringify(titles);
  await page
    .waitForFunction(
      ({ widget, block, want }) => {
        const text = (nodes) => JSON.stringify([...nodes].map((node) => node.textContent.trim()));
        return (
          text(document.querySelectorAll(`${widget} .selected-item .item-title`)) === want &&
          text(
            document.querySelectorAll(
              `[data-slate-editor] [data-block-id="${block}"] .referencelist-items article :is(h2, h3, h4)`,
            ),
          ) === want
        );
      },
      { widget: WIDGET, block: BLOCK_ID, want },
      { timeout: 15000 },
    )
    .catch(() => {});
  expectList(await listed(page), titles, `${what}: the field lists`);
  expectList((await canvasTitles(page)).map((t) => t.trim()), titles, `${what}: the canvas shows`);
}

/** Click the block on the canvas so the sidebar shows its form. */
async function selectBlock(page) {
  await page.locator(`[data-slate-editor] [data-block-id="${BLOCK_ID}"]`).click();
  await page.locator(`${WIDGET} .content-browser-selected-items-wrapper`).waitFor({ timeout: 15000 });
  // The browser loads the seeded selection before it lists it.
  await page.waitForTimeout(1000);
}

(async () => {
  // -- fixture: six images and the page, in one folder ----------------------
  await cleanup();
  await api('POST', '/', { '@type': 'Folder', id: FOLDER_ID, title: 'Reference list e2e' });
  const uids = {};
  for (const image of IMAGES) {
    const created = await api('POST', `/${FOLDER_ID}`, {
      '@type': 'Image',
      ...image,
      image: { data: PNG_B64, encoding: 'base64', filename: `${image.id}.png`, 'content-type': 'image/png' },
    });
    uids[image.title] = created.UID;
  }
  await api('POST', `/${FOLDER_ID}`, {
    '@type': PAGE_TYPE,
    id: PAGE_ID,
    title: 'Reference list e2e page',
    blocks: {
      __somersault__: {
        '@type': '__somersault__',
        value: [
          { type: 'title', children: [{ text: 'Reference list e2e page' }] },
          {
            type: 'ploneBlock',
            '@type': 'referencelist',
            id: BLOCK_ID,
            variation: 'grid',
            children: [{ text: '' }],
          },
        ],
      },
    },
    blocks_layout: { items: ['__somersault__'] },
  });

  const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

  const reroute = (process.env.AURORA_E2E_REROUTE || '').split('=>');
  if (reroute.length === 2) {
    await page.route(`${reroute[0]}/**`, async (route) => {
      const url = route.request().url().replace(reroute[0], reroute[1]);
      const resp = await fetch(url);
      await route.fulfill({
        status: resp.status,
        headers: { 'content-type': resp.headers.get('content-type') || 'application/javascript' },
        body: Buffer.from(await resp.arrayBuffer()),
      });
    });
  }

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack || String(error)));
  page.on('dialog', (dialog) => dialog.accept());

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="__ac_name"]', USER);
    await page.fill('input[name="__ac_password"]', PASSWORD);
    // Enter, not a click: a theme's menu backdrop may lie over the button.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.press('input[name="__ac_password"]', 'Enter'),
    ]);

    const edit = `${BASE}/${FOLDER_ID}/${PAGE_ID}/@@aurora-edit`;
    await page.goto(edit, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-slate-editor]', { timeout: 90000 });
    await page.waitForTimeout(1500);

    // -- 1. an empty block --------------------------------------------------
    await selectBlock(page);
    expectList(await listed(page), [], 'an empty block: the field lists');

    // -- 2. six images in one visit ------------------------------------------
    await page.locator(`${WIDGET} .content-browser-selected-items-wrapper > a.btn`).click();
    const item = (n) =>
      page.locator(`.content-browser .contentItem[data-uuid="${uids[title(n)]}"]`);
    await item(1).waitFor({ timeout: 15000 });
    await item(1).click();
    await item(6).click({ modifiers: ['Shift'] });
    const addSelected = page.locator('.content-browser .preview .levelToolbar button.btn-primary');
    await addSelected.waitFor({ timeout: 10000 });
    const marked = await page.locator('.content-browser .contentItem.selectedItem').count();
    if (marked !== 6) fail(`Shift-click marked ${marked} items, expected 6`);
    await addSelected.click();
    await page.locator('.content-browser').waitFor({ state: 'detached', timeout: 10000 });
    await expectShown(page, [1, 2, 3, 4, 5, 6].map(title), 'six picked at once');

    // -- 3. remove one ---------------------------------------------------------
    await page
      .locator(`${WIDGET} .selected-item[data-uuid="${uids[title(3)]}"] button[aria-label="remove"]`)
      .click();
    await expectShown(page, [1, 2, 4, 5, 6].map(title), 'one removed');

    // -- 4. reorder: the last to the top ----------------------------------------
    const row = (n) => page.locator(`${WIDGET} .selected-item[data-uuid="${uids[title(n)]}"]`);
    await row(6).dragTo(row(1), { targetPosition: { x: 20, y: 5 } });
    await expectShown(page, [6, 1, 2, 4, 5].map(title), 'the last dragged to the top');

    // -- 5. add one more: appended, the order holds ------------------------------
    await page.locator(`${WIDGET} .content-browser-selected-items-wrapper > a.btn`).click();
    await item(3).waitFor({ timeout: 15000 });
    await item(3).click();
    await page.locator('.content-browser .preview .levelToolbar button.btn-primary').click();
    await page.locator('.content-browser').waitFor({ state: 'detached', timeout: 10000 });
    await expectShown(page, [6, 1, 2, 4, 5, 3].map(title), 'one more added after the reorder');

    // -- 6. save, reload --------------------------------------------------------
    await page.click('.aurora-save');
    await page.waitForTimeout(3000);
    const saved = await api('GET', `/${FOLDER_ID}/${PAGE_ID}`);
    const node = (saved.blocks.__somersault__.value || []).find((n) => n.id === BLOCK_ID);
    expectList(
      (node?.references || []).map((reference) => reference.UID),
      [6, 1, 2, 4, 5, 3].map((n) => uids[title(n)]),
      'saved: the references',
    );

    await page.goto(edit, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-slate-editor]', { timeout: 90000 });
    await page.waitForTimeout(1500);
    await selectBlock(page);
    await expectShown(page, [6, 1, 2, 4, 5, 3].map(title), 'reloaded');

    // -- 7. unmount during the seeded selection's vocabulary request ---------
    const heading = page.locator('[data-slate-editor] [data-block-id]').first();
    await heading.click();
    await page.locator(WIDGET).waitFor({ state: 'detached' });
    const uidQuery = (request) => {
      try {
        const parameters = request.method() === 'POST'
          ? new URLSearchParams(request.postData() || '') : new URL(request.url()).searchParams;
        return JSON.parse(parameters.get('query') || '{}').criteria?.some((criterion) => criterion.i === 'UID');
      } catch {
        return false;
      }
    };
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const holdLookup = async (route) => {
      if (!uidQuery(route.request())) return route.continue();
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    };
    await page.route('**/*', holdLookup);
    const pending = page.waitForRequest(uidQuery);
    await page.locator(`[data-slate-editor] [data-block-id="${BLOCK_ID}"]`).click();
    await pending;
    await page.locator(`${WIDGET} .content-browser-wrapper`).waitFor();
    await heading.click();
    await page.locator(WIDGET).waitFor({ state: 'detached' });
    const completed = page.waitForResponse((response) => uidQuery(response.request()));
    release();
    await completed;
    await page.waitForTimeout(300);
    await page.unroute('**/*', holdLookup);
    console.log('ok: the sidebar was replaced during a pending reference lookup');

    if (pageErrors.length) fail(`uncaught page errors:\n${pageErrors.join('\n')}`);
    if (process.exitCode !== 1) console.log('PASS');
  } finally {
    await browser.close();
    await cleanup();
  }
})().catch((error) => {
  console.error('E2E crashed:', error);
  process.exit(1);
});
