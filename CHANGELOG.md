# Changelog

## 1.0.0a1 (2026-10-08)

- The References field is the content browser itself: the picked items are
  always listed in it, several are picked in one visit, and removing or
  dragging an item there updates the block. The move and remove buttons
  and the Add disclosure are gone. A reference stored without a UID is
  served with the one it names, so the browser can list it.
- Initial release: the Reference List block. Any number of content items
  picked with the content browser, rendered like the listing block as a
  stack, as summary cards or as a grid. The referenced items are resolved
  in the catalog on every load; only the references are stored.
- The list template and the item template can be replaced per variation,
  and a content type can get its own card, by registering a named view
  (`aurora-referencelist-<variation>`,
  `aurora-referencelist-item-<variation>[-<portal_type>]`).
