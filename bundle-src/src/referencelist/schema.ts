/**
 * The Reference List's sidebar form.
 *
 * The schema function receives `{ formData }` (what `BlockSettingsForm`
 * passes) and re-runs on every change. No field is conditional, so the
 * renderer's index-keyed fields never shift.
 *
 * The two choice fields carry `widget: 'referencelist_select'` rather than
 * bare `choices`: only the Blicca host registers a `choices` widget, and in
 * Aurora proper a field relying on it degrades to a text input.
 */
import { getStyleFieldDefinitionsFromRegistry } from '@plone/helpers';

export const REFERENCELIST_BLOCK_TYPE = 'referencelist';

const BACKGROUND_FIELD_NAME = 'backgroundColor';

export const VARIATION_CHOICES: Array<[string, string]> = [
  ['default', 'Default'],
  ['summary', 'Summary'],
  ['grid', 'Grid'],
];

export const HEADLINE_TAG_CHOICES: Array<[string, string]> = [
  ['h2', 'H2'],
  ['h3', 'H3'],
];

/**
 * Backgrounds are the host's palette: where the host registers no
 * `backgroundColor` style field the control is absent by mechanism.
 */
function backgroundField(data: Record<string, unknown>) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: REFERENCELIST_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME,
  }) as Array<{ name?: unknown; label?: unknown }>;
  const choices = definitions
    .filter((definition) => typeof definition?.name === 'string')
    .map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: 'Background',
    choices,
    ...(choices.some(([name]) => name === 'none') ? { default: 'none' } : {}),
    styleField: true,
  };
}

export function ReferenceListSchema({
  formData = {},
}: { formData?: Record<string, unknown> } = {}) {
  const background = backgroundField(formData);
  return {
    title: 'Reference list',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['headline', 'headlineTag', 'variation', 'references'],
      },
      {
        id: 'styling',
        title: 'Styling',
        fields: ['blockWidth', ...(background ? [BACKGROUND_FIELD_NAME] : [])],
      },
    ],
    properties: {
      headline: { title: 'Headline' },
      headlineTag: {
        title: 'Headline tag',
        widget: 'referencelist_select',
        choices: HEADLINE_TAG_CHOICES,
        default: 'h2',
      },
      variation: {
        title: 'Variation',
        widget: 'referencelist_select',
        choices: VARIATION_CHOICES,
        default: 'default',
      },
      references: {
        title: 'References',
        description: 'The content to list, in this order.',
        widget: 'referencelist_references',
      },
      blockWidth: {
        title: 'Block width',
        widget: 'width',
        default: 'default',
        styleField: true,
      },
      ...(background ? { [BACKGROUND_FIELD_NAME]: background } : {}),
    },
    required: [],
  };
}

export default ReferenceListSchema;
