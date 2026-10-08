/**
 * Reading the Reference List's stored JSON — the TypeScript twin of
 * `blocks.py` and `references.py`. Pure functions of one block dict.
 *
 * The stored `references` are the picked items: an `@id` (which
 * plone.restapi rewrites to a resolveuid reference on save and back on
 * read), usually a `UID`, and a snapshot of the brain the picker handed
 * over. The server derives `items`, the fresh catalog summaries, and
 * `missing`, the references that resolved to nothing. The canvas prefers
 * the fresh summary, falls back to the snapshot for a reference the server
 * has not seen yet, and drops what the server reported missing.
 */

export type Reference = Record<string, unknown> & {
  '@id': string;
  UID?: string;
  '@type'?: string;
  title?: string;
  description?: string;
  image_field?: string;
  image_scales?: Record<string, unknown>;
};

export type Item = Reference & { id?: string };

export type ReferenceListData = {
  headline?: unknown;
  headlineTag?: unknown;
  variation?: unknown;
  references?: unknown;
  items?: unknown;
  missing?: unknown;
  blockWidth?: unknown;
};

export const VARIATIONS = ['default', 'summary', 'grid'] as const;
export type Variation = (typeof VARIATIONS)[number];
export const DEFAULT_VARIATION: Variation = 'default';
export const CARD_VARIATIONS: readonly Variation[] = ['summary', 'grid'];

export type HeadingTag = 'h2' | 'h3' | 'h4';

/** What a picked brain contributes to the stored reference. */
export const REFERENCE_ATTRS = [
  '@id',
  'UID',
  '@type',
  'title',
  'description',
  'image_field',
  'image_scales',
  'hasPreviewImage',
] as const;

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export function variationOf(data: ReferenceListData = {}): Variation {
  const value = data.variation;
  return (VARIATIONS as readonly unknown[]).includes(value)
    ? (value as Variation)
    : DEFAULT_VARIATION;
}

export function showsCards(data: ReferenceListData = {}): boolean {
  return CARD_VARIATIONS.includes(variationOf(data));
}

export function headlineOf(data: ReferenceListData = {}): string {
  return asText(data.headline);
}

export function headlineTagOf(data: ReferenceListData = {}): 'h2' | 'h3' {
  return data.headlineTag === 'h3' ? 'h3' : 'h2';
}

/** Item titles sit one level below a visible headline, else at its level. */
export function itemTitleTagOf(data: ReferenceListData = {}): HeadingTag {
  const tag = headlineTagOf(data);
  if (!headlineOf(data)) return tag;
  return tag === 'h2' ? 'h3' : 'h4';
}

function isReference(value: unknown): value is Reference {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Reference)['@id'] === 'string' &&
    (value as Reference)['@id'] !== ''
  );
}

/** The stored references as dicts with an `@id`; a bare string is an `@id`. */
export function storedReferences(value: unknown): Reference[] {
  if (!Array.isArray(value)) return [];
  const references: Reference[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) {
      references.push({ '@id': entry.trim() });
    } else if (isReference(entry)) {
      references.push(entry);
    }
  }
  return references;
}

/** What identifies a reference for matching: its UID, else its `@id`. */
export function referenceKey(reference: Reference): string {
  return typeof reference.UID === 'string' && reference.UID
    ? reference.UID
    : reference['@id'];
}

/** The stored reference for a picked brain: the attributes above, no more. */
export function referenceFrom(brain: Record<string, unknown>): Reference | null {
  if (!isReference(brain)) return null;
  const reference: Record<string, unknown> = {};
  for (const key of REFERENCE_ATTRS) {
    if (brain[key] !== undefined) reference[key] = brain[key];
  }
  return reference as Reference;
}

export function derivedItems(data: ReferenceListData = {}): Item[] {
  return Array.isArray(data.items) ? data.items.filter(isReference) : [];
}

export function missingOf(data: ReferenceListData = {}): string[] {
  return Array.isArray(data.missing)
    ? data.missing.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export type MergedItems = {
  /** What to render, in stored order: the fresh summary, else the snapshot. */
  items: Item[];
  /** References the server reported as resolving to nothing. */
  missing: Reference[];
};

/**
 * The items the canvas shows. A reference the server resolved is shown
 * from its summary; one the server has not seen (just picked) from its own
 * snapshot; one the server reported missing is left out and reported.
 */
export function mergedItems(data: ReferenceListData = {}): MergedItems {
  if (data.references === undefined) {
    // Nothing stored to match against: what the server derived is the list,
    // as the public renderer reads it.
    return { items: derivedItems(data), missing: [] };
  }
  const references = storedReferences(data.references);
  const fresh = new Map<string, Item>();
  for (const item of derivedItems(data)) {
    if (typeof item.UID === 'string' && item.UID) fresh.set(item.UID, item);
    fresh.set(item['@id'], item);
  }
  const missing = new Set(missingOf(data));
  const result: MergedItems = { items: [], missing: [] };
  for (const reference of references) {
    const item =
      (typeof reference.UID === 'string' ? fresh.get(reference.UID) : undefined) ??
      fresh.get(reference['@id']);
    if (item) result.items.push(item);
    else if (missing.has(reference['@id'])) result.missing.push(reference);
    else result.items.push(reference);
  }
  return result;
}

export type PreviewImage = { src: string; width?: number; height?: number };

type Scale = { download?: string; width?: number; height?: number };

/** The card's preview picture from the summary's `image_scales`, if any. */
export function previewImage(item: Item): PreviewImage | undefined {
  const scales = (item.image_scales ?? {}) as Record<
    string,
    Array<{ base_path?: string; scales?: Record<string, Scale> }>
  >;
  const field =
    (typeof item.image_field === 'string' && item.image_field) ||
    ('image' in scales ? 'image' : Object.keys(scales)[0]);
  const image = field ? scales[field]?.[0] : undefined;
  const named = image?.scales ?? {};
  const scale = named.preview ?? named.large ?? named.thumb;
  if (!scale?.download) return undefined;
  return {
    src: `${image?.base_path || item['@id']}/${scale.download}`,
    width: scale.width,
    height: scale.height,
  };
}

export function titleOf(item: Item): string {
  return asText(item.title) || asText(item.id) || item['@id'];
}

export function descriptionOf(item: Item): string {
  return asText(item.description);
}
