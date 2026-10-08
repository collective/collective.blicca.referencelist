/**
 * The two sidebar widgets, mounted against the upstream registry through
 * the prop envelope `BlockSettingsFormRenderer` and `Field.tsx` build: the
 * schema property spread, `label` from `title`, `defaultValue` from the
 * form state, no `value` and no `id`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import config from '@plone/registry';
import type { ComponentType } from 'react';

import install from '../src/index';
import { REFERENCELIST_WIDGETS, ReferenceListSelectWidget, ReferencesWidget } from '../src/widgets';
import { mergePicked, moveReference } from '../src/widgets/ReferencesWidget';
import { choicesWidgetOf, installUpstreamRegistry, UpstreamObjectBrowserWidget } from './upstream-registry';

const upstream = installUpstreamRegistry(config as any);
install(upstream);

afterEach(cleanup);

function renderField(
  Widget: ComponentType<any>,
  schemaProperty: Record<string, unknown>,
  {
    name = 'field',
    storedValue,
    onChange,
  }: { name?: string; storedValue?: unknown; onChange?: (value: any) => void } = {},
) {
  const props = {
    ...schemaProperty,
    className: 'mb-4',
    label: schemaProperty.title,
    name,
    defaultValue: storedValue,
    required: false,
    error: [],
    placeholder: (schemaProperty.placeholder as string) || 'Type something...',
    onChange,
  };
  return render(<Widget {...props} />);
}

/** A picker stand-in: upstream's needs the edit route and throws in a harness. */
function withPicker<T>(brains: Array<Record<string, unknown>>, body: () => T): T {
  const registry = upstream as any;
  const saved = registry.widgets.widget.object_browser;
  registry.widgets.widget.object_browser = ({ mode, onChange }: any) => (
    <button type="button" data-mode={mode} onClick={() => onChange(brains)}>
      pick
    </button>
  );
  try {
    return body();
  } finally {
    registry.widgets.widget.object_browser = saved;
  }
}

const A = { '@id': 'http://host/plone/a', UID: 'ua', '@type': 'Document', title: 'A' };
const B = { '@id': 'http://host/plone/b', UID: 'ub', '@type': 'News Item', title: 'B' };
const C = { '@id': 'http://host/plone/c', UID: 'uc', '@type': 'Event', title: 'C', review_state: 'x' };

describe('registration', () => {
  it('registers both widgets under namespaced keys', () => {
    for (const [key, widget] of Object.entries(REFERENCELIST_WIDGETS)) {
      expect(upstream.getWidget(key)).toBe(widget);
    }
  });

  it('claims no generic key', () => {
    expect(upstream.getWidget('object_browser')).toBe(UpstreamObjectBrowserWidget);
    expect(upstream.getWidget('select')).toBeUndefined();
    expect(choicesWidgetOf(upstream)).toBeUndefined();
  });
});

describe('referencelist_select', () => {
  const property = {
    title: 'Variation',
    widget: 'referencelist_select',
    choices: [
      ['default', 'Default'],
      ['summary', 'Summary'],
    ],
    default: 'default',
  };

  it('is a labelled select showing the default when nothing is stored', () => {
    renderField(ReferenceListSelectWidget, property);
    const select = screen.getByLabelText('Variation') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('default');
  });

  it('shows the stored value and reports a change', () => {
    const onChange = vi.fn();
    renderField(ReferenceListSelectWidget, property, { storedValue: 'summary', onChange });
    const select = screen.getByLabelText('Variation') as HTMLSelectElement;
    expect(select.value).toBe('summary');
    fireEvent.change(select, { target: { value: 'default' } });
    expect(onChange).toHaveBeenCalledWith('default');
  });

  it('keeps a stored value outside the choices visible', () => {
    renderField(ReferenceListSelectWidget, property, { storedValue: 'grid' });
    expect((screen.getByLabelText('Variation') as HTMLSelectElement).value).toBe('grid');
  });
});

describe('merging and moving (pure)', () => {
  it('appends picked brains once, keyed by UID or @id', () => {
    const merged = mergePicked([A as any], [A, B, { ...B, UID: undefined }, C, { title: 'no id' }]);
    expect(merged.map((r) => r.title)).toEqual(['A', 'B', 'C']);
    expect(merged[2]).toEqual({ '@id': C['@id'], UID: 'uc', '@type': 'Event', title: 'C' });
    expect(mergePicked([A as any], 'nope')).toEqual([A]);
  });

  it('moves within bounds and leaves the list alone otherwise', () => {
    const list = [A, B, C] as any[];
    expect(moveReference(list, 0, 1).map((r) => r.title)).toEqual(['B', 'A', 'C']);
    expect(moveReference(list, 2, 1).map((r) => r.title)).toEqual(['A', 'C', 'B']);
    expect(moveReference(list, 0, -1)).toBe(list);
    expect(moveReference(list, 2, 3)).toBe(list);
  });
});

describe('referencelist_references', () => {
  const property = { title: 'References', widget: 'referencelist_references' };

  it('lists the stored references in order, with type and controls', () => {
    renderField(ReferencesWidget, property, { storedValue: [A, B] });
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual(['ADocument↑↓✕', 'BNews Item↑↓✕']);
    expect((screen.getByLabelText('Move “A” up') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Move “B” down') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Move “A” down') as HTMLButtonElement).disabled).toBe(false);
  });

  it('removes and reorders through onChange', () => {
    const onChange = vi.fn();
    renderField(ReferencesWidget, property, { storedValue: [A, B, C], onChange });
    fireEvent.click(screen.getByLabelText('Move “C” up'));
    expect(onChange).toHaveBeenLastCalledWith([A, C, B]);
    fireEvent.click(screen.getByLabelText('Remove “A”'));
    expect(onChange).toHaveBeenLastCalledWith([C, B]);
    expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      'CEvent↑↓✕',
      'BNews Item↑↓✕',
    ]);
  });

  it('adds what the host picker reports, once, and stores the reference shape', () => {
    withPicker([A, B, C], () => {
      const onChange = vi.fn();
      renderField(ReferencesWidget, property, { storedValue: [A], onChange });
      expect(screen.queryByText('pick')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Add…' }));
      const picker = screen.getByText('pick');
      expect(picker.getAttribute('data-mode')).toBe('multiple');
      fireEvent.click(picker);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith([
        A,
        B,
        { '@id': C['@id'], UID: 'uc', '@type': 'Event', title: 'C' },
      ]);
      // Blicca reports the whole selection on every click: nothing doubles.
      fireEvent.click(picker);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getAllByRole('listitem').length).toBe(3);
      // The picker stays open for the next pick until Done.
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.queryByText('pick')).toBeNull();
    });
  });

  it('follows a stored value the host hands back', () => {
    const { rerender } = renderField(ReferencesWidget, property, { storedValue: [A] });
    expect(screen.getAllByRole('listitem').length).toBe(1);
    rerender(<ReferencesWidget label="References" defaultValue={[A, B]} />);
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  it('says so when the host registers no picker', () => {
    const registry = upstream as any;
    const saved = registry.widgets.widget.object_browser;
    delete registry.widgets.widget.object_browser;
    try {
      renderField(ReferencesWidget, property, { storedValue: [A] });
      expect(screen.queryByRole('button', { name: 'Add…' })).toBeNull();
      expect(screen.getByText('No content picker is registered in this editor.')).toBeTruthy();
      expect(screen.getAllByRole('listitem').length).toBe(1);
    } finally {
      registry.widgets.widget.object_browser = saved;
    }
  });
});
