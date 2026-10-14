/* E2E: with Link items on, the whole card is the title's link.
 *
 * On the public page, a summary card's picture, description and padding
 * all hit the title's anchor, and a click on the description opens the
 * item. With Link items off, nothing on the card is a link.
 *
 * Prerequisites and environment as in references-picker.e2e.js; this
 * script needs no mockup bundle.
 *
 * Run: node card-link.e2e.js   (after `pnpm install` in this directory)
 */
const { chromium } = require('playwright-core');
const { BASE, EXECUTABLE, PAGE_TYPE, PNG_B64, AUTH, api, fail } = require('./support');

const FOLDER_ID = 'referencelist-e2e-card-link';
const PAGE_ID = 'page';

/** The page first: its edit lock would keep the folder. */
async function cleanup() {
  await api('DELETE', `/${FOLDER_ID}/${PAGE_ID}`);
  await api('DELETE', `/${FOLDER_ID}`);
}

function block(id, headline, reference, extra = {}) {
  return {
    type: 'ploneBlock',
    '@type': 'plone-collective.referencelist',
    id,
    headline,
    variation: 'summary',
    references: [reference],
    children: [{ text: '' }],
    ...extra,
  };
}

/** The link each part of the card under `headline` hits, or null. */
function hits(page, headline) {
  return page.evaluate((headline) => {
    const list = [...document.querySelectorAll('.referencelist')].find(
      (node) => node.querySelector('.headline')?.textContent.trim() === headline,
    );
    const card = list.querySelector('article.item');
    // elementFromPoint sees the viewport only: show the probed part first.
    const linkAt = (element, block, point) => {
      element.scrollIntoView({ block, behavior: 'instant' });
      const [x, y] = point(element.getBoundingClientRect());
      const anchor = document.elementFromPoint(x, y)?.closest('a');
      return anchor ? new URL(anchor.href).pathname : null;
    };
    const centre = (rect) => [rect.left + rect.width / 2, rect.top + rect.height / 2];
    return {
      picture: linkAt(card.querySelector('picture'), 'center', centre),
      description: linkAt(card.querySelector('.item-content p'), 'center', centre),
      padding: linkAt(card, 'end', (rect) => [rect.left + rect.width / 2, rect.bottom - 4]),
    };
  }, headline);
}

function expectHits(actual, expected, what) {
  for (const [part, link] of Object.entries(actual)) {
    if (link !== expected) fail(`${what}: the ${part} hits ${link}, expected ${expected}`);
    else console.log(`ok: ${what}: the ${part} hits ${link}`);
  }
}

(async () => {
  await cleanup();
  await api('POST', '/', { '@type': 'Folder', id: FOLDER_ID, title: 'Card link e2e' });
  const image = await api('POST', `/${FOLDER_ID}`, {
    '@type': 'Image',
    id: 'image',
    title: 'E2E image',
    description: 'The image the card links to.',
    image: { data: PNG_B64, encoding: 'base64', filename: 'image.png', 'content-type': 'image/png' },
  });
  const reference = { '@id': image['@id'], UID: image.UID, '@type': 'Image', title: image.title };
  await api('POST', `/${FOLDER_ID}`, {
    '@type': PAGE_TYPE,
    id: PAGE_ID,
    title: 'Card link e2e page',
    blocks: {
      __somersault__: {
        '@type': '__somersault__',
        value: [
          { type: 'title', children: [{ text: 'Card link e2e page' }] },
          block('linked', 'Linked', reference),
          block('unlinked', 'Unlinked', reference, { linkItems: false }),
        ],
      },
    },
    blocks_layout: { items: ['__somersault__'] },
  });

  const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { Authorization: AUTH },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack || String(error)));

  try {
    await page.goto(`${BASE}/${FOLDER_ID}/${PAGE_ID}`, { waitUntil: 'load' });
    const imagePath = new URL(image['@id']).pathname;

    expectHits(await hits(page, 'Linked'), imagePath, 'Link items on');
    expectHits(await hits(page, 'Unlinked'), null, 'Link items off');

    // A mouse click, not locator.click(): Playwright refuses to click an
    // element another one covers, and the card's link covers it on purpose.
    const description = page
      .locator('.referencelist', { has: page.locator('.headline', { hasText: /^Linked$/ }) })
      .locator('article.item .item-content p');
    await description.scrollIntoViewIfNeeded();
    const box = await description.boundingBox();
    await Promise.all([
      page.waitForURL((url) => url.pathname === imagePath, { timeout: 15000 }),
      page.mouse.click(box.x + box.width / 2, box.y + box.height / 2),
    ]).then(
      () => console.log('ok: a click on the description opens the item'),
      () => fail(`a click on the description left the page at ${page.url()}`),
    );

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
