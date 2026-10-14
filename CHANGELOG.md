# Changelog

## 1.0.0a6 (2026-10-14)


- The descriptions call the Reference List block a Plone block, not an Aurora
  block.
- The block's `@type` is now `plone-collective.referencelist` instead of
  `referencelist`. It takes its namespace from the npm package, as ADR 0025
  in plone.blicca.auroraeditor asks. The renderer is
  `@@aurora-block-plone-collective.referencelist`. Upgrade step 1003 renames
  every stored block and sets the record's `types`.
- Link images and files to their `/view` page instead of the bare file. The
  site setting *Types which use the view action in listing views* names the
  types. Each item summary has a new `use_view_action_in_listings` key.


## 1.0.0a5 (2026-10-12)

- With **Link items** on, the whole card links to its item: a click on the
  picture or the description follows the title link. The link's name stays
  the title.


## 1.0.0a4 (2026-10-12)

- Add a **Link items** switch, on by default: off, the item titles render
  as plain text instead of links. Blocks saved before it keep their links.

- The picker e2e also swaps the sidebar while the picked references are
  still loading. pre-commit leaves build output and scaffold metadata alone.


## 1.0.0a3 (2026-10-10)

- Drop the retired `block_api` from the reference list block record; needs
  `plone.blicca.auroraeditor` 1.0.0a4 (upgrade step 1002 deletes a
  left-over record).


## 1.0.0a2 (2026-10-10)

- Declare block-api 2.0 for the Plate 53 editor (upgrade step 1001). A 2.0
  host skips every 1.x declaration. The bundle needs no rebuild: it imports
  none of the `platejs` names 2.0 removed.


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
