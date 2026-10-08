/**
 * The Reference List's two sidebar widgets and their registration.
 *
 * Both keys are namespaced: `registerWidget` writes into one global
 * last-wins map, so a block claiming a generic key (`select`, `choices`,
 * `object_browser`) would change every other block's fields in the host.
 */
import { ReferenceListSelectWidget } from './SelectWidget';
import { ReferencesWidget } from './ReferencesWidget';

export { ReferenceListSelectWidget } from './SelectWidget';
export { ReferencesWidget } from './ReferencesWidget';

type WidgetRegistrar = {
  registerWidget: (options: { key: string; definition: unknown }) => void;
};

/** Schema `widget:` value → component. */
export const REFERENCELIST_WIDGETS = {
  referencelist_select: ReferenceListSelectWidget,
  referencelist_references: ReferencesWidget,
} as const;

/**
 * Registered from `install()`, against the config the loader hands us, so
 * a host that composes more than one registry gets its widgets on the one it
 * is building.
 */
export function registerReferenceListWidgets<T extends WidgetRegistrar>(config: T): T {
  config.registerWidget({ key: 'widget', definition: { ...REFERENCELIST_WIDGETS } });
  return config;
}
