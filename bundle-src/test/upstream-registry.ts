/**
 * An Aurora-shaped registry, and nothing more: Aurora's own five installers
 * at the versions the host pins, with none of the Blicca wrapper's
 * additions (`choices`, the `backgroundColor` style field, the substituted
 * `object_browser`). A field that only works because Blicca registered
 * something fails here rather than in Aurora proper.
 */
import type { ComponentType } from 'react';

import installTheming from '@plone/theming';
import installPlate from '@plone/plate';
import installBlocks from '@plone/blocks';
import installLayout from '@plone/layout';
import installCmsui from '@plone/cmsui';

import { TextField } from '@plone/components/quanta';
import { ObjectBrowserWidget } from '@plone/cmsui/components/ObjectBrowserWidget/ObjectBrowserWidget';

export type UpstreamConfig = {
  blocks: {
    blocksConfig: Record<string, unknown>;
    plateBlocksConfig?: Record<string, unknown>;
  };
  widgets: Record<string, any>;
  settings: Record<string, any>;
  registerWidget: (options: { key: string; definition: unknown }) => void;
  getWidget: (key: string) => ComponentType<any> | undefined;
  getUtility: (options: { type: string; name: string }) => { method?: unknown };
};

/** Upstream's default widget: every unmatched field lands here. */
export const UpstreamTextField = TextField as unknown as ComponentType<any>;
export const UpstreamObjectBrowserWidget = ObjectBrowserWidget as unknown as ComponentType<any>;

/** The blocks `@plone/blocks` registers; ours must appear beside them. */
export const UPSTREAM_BLOCKS = ['image', 'teaser', 'video', 'listing'];

const installed = new WeakSet<object>();

/** Aurora's registrations in the host's order: theming, plate, blocks, layout, cmsui. */
export function installUpstreamRegistry<T extends UpstreamConfig>(config: T): T {
  if (installed.has(config)) return config;
  installTheming(config as any);
  installPlate(config as any);
  installBlocks(config as any);
  installLayout(config as any);
  installCmsui(config as any);
  installed.add(config);
  return config;
}

/**
 * How the host resolves a `choices` widget: `Field.tsx` reads
 * `config.widgets.choices` directly, and `getWidget('choices')` cannot see a
 * registration stored as a bare component.
 */
export function choicesWidgetOf(config: UpstreamConfig): unknown {
  return (config as any).widgets?.choices;
}

/**
 * `Field.tsx`'s widget resolution for the attributes this schema uses:
 * field id first, then a string `widget` (short-circuiting to the default),
 * then `choices`, then `type`, then the default.
 */
export function resolveWidget(
  config: UpstreamConfig,
  name: string,
  property: Record<string, any>,
) {
  const c = config as any;
  const byFieldId = c.getWidget(property.id ?? name) ?? null;
  if (byFieldId) return byFieldId;
  if (typeof property.widget === 'string') {
    return c.getWidget(property.widget) ?? c.widgets.default;
  }
  if (property.choices || property.vocabulary) return c.widgets?.choices ?? null;
  if (property.type) return c.getWidget(property.type) ?? null;
  return c.widgets.default;
}
