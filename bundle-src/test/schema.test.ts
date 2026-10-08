import { describe, expect, it } from 'vitest';

import { ReferenceListSchema, REFERENCELIST_BLOCK_TYPE } from '../src/referencelist/schema';
import { REFERENCELIST_WIDGETS } from '../src/widgets';

describe('the sidebar schema', () => {
  const schema = ReferenceListSchema({ formData: {} });

  it('names the block', () => {
    expect(REFERENCELIST_BLOCK_TYPE).toBe('referencelist');
    expect(schema.title).toBe('Reference list');
    expect(schema.required).toEqual([]);
  });

  it('offers the listing fields with references in place of a query', () => {
    expect(schema.fieldsets.map((fieldset) => fieldset.id)).toEqual(['default', 'styling']);
    expect(schema.fieldsets[0].fields).toEqual(['headline', 'headlineTag', 'variation', 'references']);
    expect(schema.fieldsets[1].fields).toEqual(['blockWidth']);
  });

  it('declares every field its fieldsets list, and no other', () => {
    const listed = schema.fieldsets.flatMap((fieldset) => fieldset.fields).sort();
    expect(Object.keys(schema.properties).sort()).toEqual(listed);
  });

  it('has no conditional field, so the renderer never re-keys a field', () => {
    const richer = ReferenceListSchema({
      formData: { headline: 'x', variation: 'grid', references: [{ '@id': '/a' }] },
    });
    expect(richer.fieldsets).toEqual(schema.fieldsets);
  });

  it('names a widget of its own on every choice field', () => {
    for (const name of ['headlineTag', 'variation']) {
      const property = schema.properties[name as keyof typeof schema.properties] as any;
      expect(property.choices.length).toBeGreaterThan(1);
      expect(property.widget).toBe('referencelist_select');
      expect(property.widget in REFERENCELIST_WIDGETS).toBe(true);
    }
  });

  it('offers the three variations in sidebar order, default first', () => {
    const variation = schema.properties.variation as any;
    expect(variation.choices.map(([value]: [string, string]) => value)).toEqual([
      'default',
      'summary',
      'grid',
    ]);
    expect(variation.default).toBe('default');
    expect((schema.properties.headlineTag as any).default).toBe('h2');
  });

  it('edits the references through its own widget', () => {
    const references = schema.properties.references as any;
    expect(references.widget).toBe('referencelist_references');
    expect(references.widget in REFERENCELIST_WIDGETS).toBe(true);
  });

  it('keeps blockWidth a style field and offers no background where the host has none', () => {
    const width = schema.properties.blockWidth as any;
    expect(width.widget).toBe('width');
    expect(width.styleField).toBe(true);
    expect(width.default).toBe('default');
    expect('backgroundColor' in schema.properties).toBe(false);
  });
});
