/**
 * The block against Aurora proper: the registry Aurora builds, from the
 * packages Aurora ships at the versions this host pins, with none of
 * Blicca's overrides, and the block's own `install`, `edit` and `view` on
 * top. Plus the committed artifact's hygiene.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import config from '@plone/registry';

import install, { ReferenceListBlockInfo, ReferenceListSchema, ReferenceListView } from '../src/index';
import { REFERENCELIST_WIDGETS } from '../src/widgets';
import {
  UPSTREAM_BLOCKS,
  UpstreamObjectBrowserWidget,
  UpstreamTextField,
  choicesWidgetOf,
  installUpstreamRegistry,
  resolveWidget,
} from './upstream-registry';

const aurora = installUpstreamRegistry(config as any);
install(aurora);

afterEach(cleanup);

const bundlePath = path.resolve(
  import.meta.dirname,
  '../../src/collective/blicca/referencelist/static/referencelist-block.js',
);

describe('the fixture is Aurora', () => {
  it('registers cmsui’s own widgets and no Blicca substitution', () => {
    expect(aurora.getWidget('object_browser')).toBe(UpstreamObjectBrowserWidget);
    expect((aurora as any).widgets.default).toBe(UpstreamTextField);
    expect(choicesWidgetOf(aurora)).toBeUndefined();
    expect(aurora.getUtility({ type: 'styleFieldDefinition', name: 'backgroundColor' }).method).toBeUndefined();
  });
});

describe('every field resolves to the widget it was designed for', () => {
  const EXPECTED: Record<string, 'ours' | 'upstream' | 'default'> = {
    headline: 'default',
    headlineTag: 'ours',
    variation: 'ours',
    linkItems: 'upstream',
    references: 'ours',
    blockWidth: 'upstream',
  };
  const properties = ReferenceListSchema({ formData: {} }).properties as Record<string, any>;
  const ours = new Set<unknown>(Object.values(REFERENCELIST_WIDGETS));

  it('declares exactly the fields the table covers', () => {
    expect(Object.keys(properties).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [name, verdict] of Object.entries(EXPECTED)) {
    it(`${name} resolves to ${verdict}`, () => {
      const resolved = resolveWidget(aurora, name, properties[name]);
      const isDefault = resolved === (aurora as any).widgets.default;
      if (verdict === 'default') {
        expect(isDefault).toBe(true);
      } else {
        expect(resolved).toBeTruthy();
        expect(isDefault).toBe(false);
        expect(ours.has(resolved)).toBe(verdict === 'ours');
      }
    });
  }

  it('leans on no `choices` widget: every choice field names its own', () => {
    for (const [name, property] of Object.entries(properties)) {
      if (property.choices) expect(typeof property.widget).toBe('string');
      void name;
    }
  });
});

describe('the block joins Aurora rather than displacing it', () => {
  it('leaves upstream’s four blocks intact and adds exactly one', () => {
    for (const id of UPSTREAM_BLOCKS) {
      expect((aurora as any).blocks.blocksConfig[id]).toBeDefined();
    }
    expect((aurora as any).blocks.blocksConfig.referencelist).toBe(ReferenceListBlockInfo);
    const ids = Object.keys((aurora as any).blocks.blocksConfig);
    expect(ids.filter((id) => !UPSTREAM_BLOCKS.includes(id))).toEqual(['referencelist']);
  });

  it('has a well-formed entry: id, plain-string title and description, a component icon', () => {
    expect(ReferenceListBlockInfo.id).toBe('referencelist');
    expect(typeof ReferenceListBlockInfo.title).toBe('string');
    expect(typeof ReferenceListBlockInfo.description).toBe('string');
    expect(typeof ReferenceListBlockInfo.icon).toBe('function');
    expect(typeof ReferenceListBlockInfo.edit).toBe('function');
    expect(typeof ReferenceListBlockInfo.view).toBe('function');
  });

  it('renders the view standalone, reading nothing from the registry', () => {
    const data = {
      variation: 'summary',
      headline: 'Related',
      references: [{ '@id': 'http://host/plone/a', UID: 'ua', title: 'A' }],
    };
    const withAurora = render(<ReferenceListView data={data} />).container.innerHTML;
    cleanup();
    const c = aurora as any;
    const savedWidgets = c.widgets;
    const savedBlocks = c.blocks.blocksConfig;
    try {
      c.widgets = { default: undefined };
      c.blocks.blocksConfig = {};
      expect(render(<ReferenceListView data={data} />).container.innerHTML).toBe(withAurora);
    } finally {
      c.widgets = savedWidgets;
      c.blocks.blocksConfig = savedBlocks;
    }
  });
});

describe('bundle hygiene', () => {
  const source = readFileSync(bundlePath, 'utf8');
  const PROBE_NAME = '.artifact-probe.mjs';
  const PROBE_PATH = path.resolve(import.meta.dirname, PROBE_NAME);
  afterAll(() => rmSync(PROBE_PATH, { force: true }));

  const PROMISED = [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    'jotai',
    'platejs',
    '@plone/registry',
    '@plone/helpers',
  ];

  it('imports only promised modules', () => {
    const imported = [
      ...new Set(
        [...source.matchAll(/(?:^|\n)\s*import[^'"\n]*["']([^"']+)["']/g)].map((m) => m[1]),
      ),
    ].sort();
    expect(imported).toEqual(['@plone/helpers', '@plone/registry', 'react', 'react/jsx-runtime']);
    for (const specifier of imported) expect(PROMISED).toContain(specifier);
  });

  it('carries none of the Aurora app stack it dev-depends on', () => {
    for (const forbidden of [
      '@plone/cmsui',
      '@plone/components',
      '@plone/blocks',
      '@plone/theming',
      '@plone/layout',
      '@plone/plate',
      'react-router',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('ships its stylesheet scope-wrapped to the three roots', () => {
    const css = readFileSync(bundlePath.replace(/\.js$/, '.css'), 'utf8');
    expect(css.trimStart().startsWith('@scope (.aurora-editor, .aurora-editor-portal, .aurora-blocks-view) to (.aurora-pattern-island)')).toBe(true);
    expect(css).toContain('.referencelist.variation-grid');
    expect(css).toContain('@container');
  });

  it('is importable as a plain ESM module whose default export installs', async () => {
    writeFileSync(PROBE_PATH, source.replace(/\/\/# sourceMappingURL=.*/g, ''));
    const specifier = './' + PROBE_NAME;
    const built: any = await import(/* @vite-ignore */ specifier);
    expect(typeof built.default).toBe('function');
    const probe: any = {
      blocks: { blocksConfig: {} },
      widgets: { widget: {} },
      registerWidget: ({ key, definition }: any) => {
        probe.widgets[key] = { ...(probe.widgets[key] ?? {}), ...definition };
      },
      getWidget: () => undefined,
    };
    expect(built.default(probe)).toBe(probe);
    expect(probe.blocks.blocksConfig.referencelist?.id).toBe('referencelist');
    expect(Object.keys(probe.widgets.widget).sort()).toEqual([
      'referencelist_references',
      'referencelist_select',
    ]);
  });
});
