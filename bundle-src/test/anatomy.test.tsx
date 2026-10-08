/**
 * The shared anatomy fixture, held against the React view. The Python suite
 * (`tests/test_anatomy.py`) reads the same file and applies the same
 * skeleton rule, so the two renderers cannot drift apart unnoticed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ReferenceListView } from '../src/referencelist/ReferenceListView';

const FIXTURE = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../../tests/anatomy-cases.json'), 'utf8'),
) as { cases: Array<{ name: string; note: string; data: Record<string, unknown>; html: string }> };

const AVIF_SOURCE = /<source\b[^>]*\btype="image\/avif"[^>]*\/?>\s*/gi;
const TAG = /<([a-z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*\/?>/gi;
const CLASS = /class="[^"]*"/;

/** Tags, `class` attributes and text; nothing else. */
export function skeleton(html: string): string {
  return html
    .replace(AVIF_SOURCE, '')
    .replace(TAG, (_match, tag: string, attributes: string) => {
      const klass = CLASS.exec(attributes || '');
      return klass ? `<${tag} ${klass[0]}>` : `<${tag}>`;
    })
    .replace(/>\s+</g, '><')
    .trim();
}

afterEach(cleanup);

describe('the view matches the cross-renderer skeleton', () => {
  it('reads a well-formed fixture', () => {
    expect(FIXTURE.cases.length).toBeGreaterThanOrEqual(7);
    expect(new Set(FIXTURE.cases.map((c) => c.name)).size).toBe(FIXTURE.cases.length);
    expect(FIXTURE.cases.every((c) => c.note)).toBe(true);
  });

  for (const testCase of FIXTURE.cases) {
    it(`renders ${testCase.name}`, () => {
      const { container } = render(<ReferenceListView data={testCase.data as any} />);
      expect(skeleton(container.innerHTML)).toBe(skeleton(testCase.html));
    });
  }

  it('emits the same skeleton in edit mode, with no href on any anchor', () => {
    const richest = FIXTURE.cases.find((c) => c.name === 'summary-cards')!;
    const { container } = render(<ReferenceListView data={richest.data as any} isEditMode />);
    expect(skeleton(container.innerHTML)).toBe(skeleton(richest.html));
    expect(container.querySelector('a[href]')).toBeNull();
    expect(container.querySelectorAll('a').length).toBe(2);
  });

  it('links each item to its @id on the public rendering', () => {
    const stack = FIXTURE.cases.find((c) => c.name === 'default-stack')!;
    const { container } = render(<ReferenceListView data={stack.data as any} />);
    expect([...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      'http://nohost/plone/page',
      'http://nohost/plone/news',
    ]);
  });

  it('marks the card picture decorative and lazy', () => {
    const cards = FIXTURE.cases.find((c) => c.name === 'summary-cards')!;
    const { container } = render(<ReferenceListView data={cards.data as any} />);
    const img = container.querySelector('picture img')!;
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('src')).toBe('/plone/news/@@images/image-400-abc.png');
    expect(img.getAttribute('width')).toBe('400');
  });
});
