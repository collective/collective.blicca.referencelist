/**
 * The two sidebar widgets, mounted against the upstream registry through
 * the prop envelope `BlockSettingsFormRenderer` and `Field.tsx` build: the
 * schema property spread, `label` from `title`, `defaultValue` from the
 * form state, no `value` and no `id`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import config from '@plone/registry';
import { useState, type ComponentType } from 'react';

import install from '../src/index';
import { REFERENCELIST_WIDGETS, ReferenceListSelectWidget, ReferencesWidget } from '../src/widgets';
import { pickedReferences } from '../src/widgets/ReferencesWidget';
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

/**
 * A picker stand-in: upstream's needs the edit route and throws in a
 * harness. It records the props of every mount and reports `brains` as the
 * whole selection on a click, as both hosts' pickers do.
 */
function withPicker<T>(brains: Array<Record<string, unknown>>, body: (mounts: any[]) => T): T {
  const registry = upstream as any;
  const saved = registry.widgets.widget.object_browser;
  const mounts: any[] = [];
  registry.widgets.widget.object_browser = (props: any) => {
    const [mounted] = useState(() => {
      mounts.push(props);
      return props;
    });
    return (
      <button type="button" data-mode={mounted.mode} onClick={() => props.onChange(brains)}>
        pick
      </button>
    );
  };
  try {
    return body(mounts);
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

describe('picked references (pure)', () => {
  it('stores the reported selection in its order, once per item, as references', () => {
    const picked = pickedReferences([A as any], [C, A, { ...C }, { title: 'no id' }]);
    expect(picked.map((r) => r.title)).toEqual(['C', 'A']);
    expect(picked[0]).toEqual({ '@id': C['@id'], UID: 'uc', '@type': 'Event', title: 'C' });
    expect(pickedReferences([A as any], 'nope')).toEqual([A]);
  });

  it('keeps what a stored reference holds and the picker does not report again', () => {
    const stored = { ...A, description: 'kept' };
    expect(pickedReferences([stored as any], [{ '@id': A['@id'], UID: 'ua', title: 'A2' }])).toEqual([
      { ...stored, title: 'A2' },
    ]);
  });
});

describe('referencelist_references', () => {
  const property = { title: 'References', widget: 'referencelist_references' };

  it('mounts the host picker on the stored references, in multiple mode', () => {
    withPicker([], (mounts) => {
      renderField(ReferencesWidget, property, { storedValue: [A, B] });
      expect(screen.getByText('pick').getAttribute('data-mode')).toBe('multiple');
      expect(mounts).toHaveLength(1);
      expect(mounts[0].defaultValue).toEqual([A, B]);
      expect(mounts[0].selectedItemAttrs).toContain('UID');
    });
  });

  it('replaces the list with what the picker reports, and only on a change', () => {
    withPicker([C, A], (mounts) => {
      const onChange = vi.fn();
      renderField(ReferencesWidget, property, { storedValue: [A, B], onChange });
      fireEvent.click(screen.getByText('pick'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith([
        { '@id': C['@id'], UID: 'uc', '@type': 'Event', title: 'C' },
        A,
      ]);
      fireEvent.click(screen.getByText('pick'));
      expect(onChange).toHaveBeenCalledTimes(1);
      // The picker reported it: it already shows it, no remount.
      expect(mounts).toHaveLength(1);
    });
  });

  it('keeps the picker when the host hands back what the widget reported', () => {
    withPicker([B], (mounts) => {
      let stored: unknown = [A];
      const { rerender } = renderField(ReferencesWidget, property, {
        storedValue: stored,
        onChange: (value) => (stored = value),
      });
      fireEvent.click(screen.getByText('pick'));
      rerender(<ReferencesWidget label="References" defaultValue={stored} />);
      expect(mounts).toHaveLength(1);
    });
  });

  it('remounts the picker on a stored value it did not report', () => {
    withPicker([], (mounts) => {
      const { rerender } = renderField(ReferencesWidget, property, { storedValue: [A] });
      rerender(<ReferencesWidget label="References" defaultValue={[A, B]} />);
      expect(mounts).toHaveLength(2);
      expect(mounts[1].defaultValue).toEqual([A, B]);
    });
  });

  it('lists the references read-only when the host registers no picker', () => {
    const registry = upstream as any;
    const saved = registry.widgets.widget.object_browser;
    delete registry.widgets.widget.object_browser;
    try {
      renderField(ReferencesWidget, property, { storedValue: [A, B] });
      expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual(['A', 'B']);
      expect(screen.getByText('No content picker is registered in this editor.')).toBeTruthy();
    } finally {
      registry.widgets.widget.object_browser = saved;
    }
  });
});
