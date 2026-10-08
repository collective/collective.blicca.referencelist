import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { ReferenceListEdit } from '../src/referencelist/ReferenceListEdit';

afterEach(cleanup);

const A = { '@id': 'http://host/plone/a', UID: 'ua', title: 'A' };
const B = { '@id': 'http://host/plone/b', UID: 'ub', title: 'B' };

describe('the canvas', () => {
  it('is the view with every href dropped', () => {
    const { container } = render(
      <ReferenceListEdit data={{ references: [A, B], items: [A, B], missing: [] }} />,
    );
    expect(container.querySelector('.referencelist')).toBeTruthy();
    expect(container.querySelectorAll('article').length).toBe(2);
    expect(container.querySelector('a[href]')).toBeNull();
    expect(container.querySelector('.referencelist-notice')).toBeNull();
  });

  it('says when nothing is referenced yet', () => {
    const { container } = render(<ReferenceListEdit data={{}} />);
    expect(container.querySelector('.referencelist')?.innerHTML).toBe('');
    const notice = container.querySelector('.referencelist-notice')!;
    expect(notice.textContent).toBe('No references yet. Pick content in the sidebar.');
    expect(notice.getAttribute('contenteditable')).toBe('false');
    // outside the root, so the block's own selectors never reach it
    expect(container.querySelector('.referencelist .referencelist-notice')).toBeNull();
  });

  it('names a reference the server could not resolve instead of dropping it silently', () => {
    const { container } = render(
      <ReferenceListEdit data={{ references: [A, B], items: [A], missing: [B['@id']] }} />,
    );
    expect(container.querySelectorAll('article').length).toBe(1);
    const notices = [...container.querySelectorAll('.referencelist-notice')];
    expect(notices.map((n) => n.textContent)).toEqual(['“B” no longer exists and is not shown.']);
  });

  it('previews a freshly picked reference from its snapshot', () => {
    const { container } = render(
      <ReferenceListEdit data={{ references: [A, B], items: [A], missing: [] }} />,
    );
    expect([...container.querySelectorAll('article a')].map((a) => a.textContent)).toEqual(['A', 'B']);
    expect(container.querySelector('.referencelist-notice')).toBeNull();
  });
});
