# Changelog

## 1.0.0a1 (unreleased)

- Initial release: the Reference List block. Any number of content items
  picked with the content browser, rendered like the listing block as a
  stack, as summary cards or as a grid. The referenced items are resolved
  in the catalog on every load; only the references are stored.
- The list template and the item template can be replaced per variation,
  and a content type can get its own card, by registering a named view
  (`aurora-referencelist-<variation>`,
  `aurora-referencelist-item-<variation>[-<portal_type>]`).
