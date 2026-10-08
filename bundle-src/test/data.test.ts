import { describe, expect, it } from 'vitest';

import {
  descriptionOf,
  headlineOf,
  headlineTagOf,
  itemTitleTagOf,
  mergedItems,
  previewImage,
  referenceFrom,
  referenceKey,
  showsCards,
  storedReferences,
  titleOf,
  variationOf,
} from '../src/referencelist/data';

describe('variation and headline', () => {
  it('knows the three variations and falls back to default', () => {
    expect(variationOf({})).toBe('default');
    expect(variationOf({ variation: 'summary' })).toBe('summary');
    expect(variationOf({ variation: 'grid' })).toBe('grid');
    expect(variationOf({ variation: 'cards' })).toBe('default');
    expect(showsCards({ variation: 'summary' })).toBe(true);
    expect(showsCards({ variation: 'grid' })).toBe(true);
    expect(showsCards({})).toBe(false);
  });

  it('reads the headline stripped and its tag validated', () => {
    expect(headlineOf({ headline: '  Related ' })).toBe('Related');
    expect(headlineOf({ headline: '   ' })).toBe('');
    expect(headlineOf({})).toBe('');
    expect(headlineTagOf({})).toBe('h2');
    expect(headlineTagOf({ headlineTag: 'h3' })).toBe('h3');
    expect(headlineTagOf({ headlineTag: 'h1' })).toBe('h2');
  });

  it('puts item titles one level below a visible headline', () => {
    expect(itemTitleTagOf({})).toBe('h2');
    expect(itemTitleTagOf({ headlineTag: 'h3' })).toBe('h3');
    expect(itemTitleTagOf({ headline: 'x' })).toBe('h3');
    expect(itemTitleTagOf({ headline: 'x', headlineTag: 'h3' })).toBe('h4');
  });
});

describe('stored references', () => {
  it('accepts dicts with an @id and bare strings, and drops the rest', () => {
    expect(
      storedReferences([{ '@id': '/a', title: 'A' }, ' /b ', { '@id': '' }, 3, null]),
    ).toEqual([{ '@id': '/a', title: 'A' }, { '@id': '/b' }]);
    expect(storedReferences(undefined)).toEqual([]);
    expect(storedReferences('/a')).toEqual([]);
  });

  it('keys a reference by UID, else by @id', () => {
    expect(referenceKey({ '@id': '/a', UID: 'u' })).toBe('u');
    expect(referenceKey({ '@id': '/a' })).toBe('/a');
  });

  it('keeps only the reference attributes of a picked brain', () => {
    const brain = {
      '@id': 'http://host/plone/a',
      UID: 'u',
      '@type': 'Document',
      title: 'A',
      description: 'd',
      image_field: 'image',
      image_scales: { image: [] },
      hasPreviewImage: true,
      review_state: 'published',
      getObjSize: '1 KB',
    };
    expect(referenceFrom(brain)).toEqual({
      '@id': 'http://host/plone/a',
      UID: 'u',
      '@type': 'Document',
      title: 'A',
      description: 'd',
      image_field: 'image',
      image_scales: { image: [] },
      hasPreviewImage: true,
    });
    expect(referenceFrom({ title: 'no id' })).toBeNull();
  });
});

describe('merged items', () => {
  const stored = [
    { '@id': 'http://host/plone/a', UID: 'ua', title: 'A (stale)' },
    { '@id': 'http://host/plone/b', UID: 'ub', title: 'B (stale)' },
    { '@id': 'http://host/plone/c', UID: 'uc', title: 'C (just picked)' },
  ];

  it('prefers the fresh summary, keeps the snapshot of an unresolved one, drops the missing', () => {
    const { items, missing } = mergedItems({
      references: stored,
      items: [{ '@id': 'http://host/plone/a', UID: 'ua', title: 'A (fresh)' }],
      missing: ['http://host/plone/b'],
    });
    expect(items.map(titleOf)).toEqual(['A (fresh)', 'C (just picked)']);
    expect(missing.map(titleOf)).toEqual(['B (stale)']);
  });

  it('keeps the stored order whatever the summaries came back in', () => {
    const { items } = mergedItems({
      references: stored,
      items: [
        { '@id': 'http://host/plone/c', UID: 'uc', title: 'C' },
        { '@id': 'http://host/plone/a', UID: 'ua', title: 'A' },
        { '@id': 'http://host/plone/b', UID: 'ub', title: 'B' },
      ],
    });
    expect(items.map(titleOf)).toEqual(['A', 'B', 'C']);
  });

  it('matches by @id when a reference carries no UID', () => {
    const { items } = mergedItems({
      references: [{ '@id': 'http://host/plone/a' }],
      items: [{ '@id': 'http://host/plone/a', UID: 'ua', title: 'A' }],
    });
    expect(items.map(titleOf)).toEqual(['A']);
  });

  it('shows the snapshots before the server has looked at all', () => {
    const { items, missing } = mergedItems({ references: stored });
    expect(items.map(titleOf)).toEqual(['A (stale)', 'B (stale)', 'C (just picked)']);
    expect(missing).toEqual([]);
  });

  it('ignores a summary nothing references any more', () => {
    const { items } = mergedItems({
      references: [],
      items: [{ '@id': 'http://host/plone/a', title: 'A' }],
    });
    expect(items).toEqual([]);
  });
});

describe('card text and picture', () => {
  it('titles an item by title, id, then @id', () => {
    expect(titleOf({ '@id': '/a', title: 'T' })).toBe('T');
    expect(titleOf({ '@id': '/a', id: 'a' })).toBe('a');
    expect(titleOf({ '@id': '/a' })).toBe('/a');
    expect(descriptionOf({ '@id': '/a', description: ' d ' })).toBe('d');
    expect(descriptionOf({ '@id': '/a' })).toBe('');
  });

  it('builds the preview from the summary image scales', () => {
    const item = {
      '@id': 'http://host/plone/news',
      image_field: 'image',
      image_scales: {
        image: [
          {
            base_path: '/plone/news',
            scales: {
              preview: { download: '@@images/image-400-x.png', width: 400, height: 225 },
              large: { download: '@@images/image-800-x.png', width: 800, height: 450 },
            },
          },
        ],
      },
    };
    expect(previewImage(item)).toEqual({
      src: '/plone/news/@@images/image-400-x.png',
      width: 400,
      height: 225,
    });
  });

  it('falls back to the large scale, the @id as base, and nothing without scales', () => {
    expect(
      previewImage({
        '@id': 'http://host/plone/news',
        image_scales: {
          image: [{ scales: { large: { download: '@@images/image-800-x.png', width: 800 } } }],
        },
      }),
    ).toEqual({ src: 'http://host/plone/news/@@images/image-800-x.png', width: 800, height: undefined });
    expect(previewImage({ '@id': '/a' })).toBeUndefined();
    expect(previewImage({ '@id': '/a', image_scales: { image: [{ scales: {} }] } })).toBeUndefined();
  });
});
