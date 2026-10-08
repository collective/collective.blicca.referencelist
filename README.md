# collective.blicca.referencelist

A **Reference List** block for the Aurora editor in [Plone](https://plone.org) Blicca.
Blicca is the former Plone Classic UI. The author picks any number of content
items with the content browser, in the order they should appear, and the
block renders them the way the listing block renders a query result: as a
plain stack, as summary cards with a picture, or as a grid of those cards.

Typical uses:

- "See also" or "Related" lists curated by hand instead of by a query;
- a set of case studies, partners or services picked for one landing page;
- a grid of teasers to a handful of pages, without one teaser block each.

The block needs [plone.blicca.auroraeditor](https://github.com/derico-de/plone.blicca.auroraeditor),
which brings the Aurora editor to Blicca. Its editor half is also a plain
Aurora block package, `@plone-collective/aurora-referencelist-block`, see
[Using the block in Aurora](#using-the-block-in-aurora).

## Features

- **Hand-picked references.** Any number of items, added through the site's
  own content browser, removed and reordered in the sidebar.
- **Always current.** Only the reference is stored. On every page load the
  referenced items are looked up in the catalog, so a renamed or moved item
  shows its current title and picture, and a deleted or unpublished one
  disappears from the list.
- **The listing's three variations.** `default` stacks title and
  description, `summary` puts the item's picture over each card, `grid`
  lays the summary cards out in two or three columns depending on the
  block's width.
- **Headline and heading levels** as on the listing block: an optional
  headline as `h2` or `h3`, item titles one level below it.
- **Responsive pictures.** The card picture is served through the site's
  picture variants with `srcset`, `sizes` and an AVIF alternative, sized
  for the block's width, or for one column of it on the grid.
- **Templates and item templates per variation.** A theme replaces the
  list template, the item template, or a content type's card for one
  variation or for all of them by registering a named view. See
  [Templates](#templates).
- **Honest editor preview.** The canvas shows the referenced items as the
  page will, says when nothing is picked yet, and names a reference whose
  target no longer exists.
- **One markup, one stylesheet** for the public page, the editor canvas
  and an Aurora frontend. Block width and background colour come from the
  editor's regular block styling controls.

## Requirements

- Plone 6.0 or later
- `plone.blicca.auroraeditor` 1.0.0a3 or later

The JavaScript bundle is committed to the package. No Node is needed at
install time.

## Installation

Add the package to your project's dependencies:

```toml
# pyproject.toml
dependencies = [
    "collective.blicca.referencelist",
]
```

Then install **Collective Blicca Referencelist** from Plone's Add-ons
control panel, or apply the `collective.blicca.referencelist:default`
profile. Uninstalling removes the block registration again.

## Using the block

Insert the **Reference list** block in the Aurora editor and fill in the
sidebar. The canvas is a live preview; all editing happens in the sidebar.

| Field | What it does |
|---|---|
| Headline | Optional heading above the list |
| Headline tag | `H2` or `H3`. Item titles are one level below a visible headline, else at that level |
| Variation | `Default`, `Summary` or `Grid` |
| References | The picked items, in order. **Add…** opens the content browser, every item has move and remove controls |
| Block width | The editor's width control |
| Background | A background colour, if the site offers a palette |

Rules worth knowing:

- Items render in the order they are listed. The order is the author's;
  nothing is sorted.
- An item the visitor may not see is skipped silently on the page. In the
  editor a reference whose target no longer exists is named in a notice.
- The summary and grid variations show an item's picture when it has one
  (a lead image, or the image of an Image item). Items without a picture
  keep their place without one.
- An empty list renders its headline and nothing else on the page.

## Rendered markup

```html
<div class="referencelist variation-summary">
  <h2 class="headline">Related</h2>                 <!-- only with a headline -->
  <div class="referencelist-items">                 <!-- only with items -->
    <article class="item summary">                  <!-- "item" on the default variation -->
      <picture>                                     <!-- summary and grid, only with a picture -->
        <source type="image/avif" srcset="…" sizes="…">   <!-- public page only -->
        <img src="…" srcset="…" sizes="…" width="…" height="…"
             alt="" loading="lazy" decoding="async">
      </picture>
      <div class="item-content">
        <h3><a href="…">Title</a></h3>              <!-- h2, h3 or h4 -->
        <p>Description</p>                          <!-- only with a description -->
      </div>
    </article>
  </div>
</div>
```

- The root always carries `variation-<name>` with the variation in effect;
  an unknown stored value renders as `default`.
- The grid variation uses the same cards as the summary variation and lays
  them out in columns with a container query on the block's own width.
- The picture is decorative (`alt=""`): the title link beside it carries the
  item's name.
- Block width and background classes are added by the host on a wrapper
  around this markup, as for every Aurora block.

## Templates

The block renders in two steps, each through a named browser view on the
page's (context, request) pair, so a theme or add-on can replace one step
for one variation without touching the rest:

| Step | Looked up, most specific first |
|---|---|
| The list | `aurora-referencelist-<variation>`, then `aurora-referencelist` |
| Each item | `aurora-referencelist-item-<variation>-<portal_type>`, `aurora-referencelist-item-<variation>`, `aurora-referencelist-item-<portal_type>`, then `aurora-referencelist-item` |

The names without a suffix are the stock templates this package registers.
To replace one, register a view under the more specific name on your own
browser layer (`for="*"`, permission `zope2.View`) and subclass the base
class from `collective.blicca.referencelist.rendering`. The portal type
goes into the name verbatim, space included: `aurora-referencelist-item-summary-News Item`.

```xml
<browser:page
    name="aurora-referencelist-item-grid"
    for="*"
    class=".cards.GridCard"
    template="grid_card.pt"
    permission="zope2.View"
    layer=".interfaces.IMyThemeLayer"
    />
```

```python
from collective.blicca.referencelist.rendering import BaseReferenceListItemView


class GridCard(BaseReferenceListItemView):
    """The grid card: whatever the theme wants, from the stamped item."""
```

What the base classes give a template:

- `BaseReferenceListView` (the list) is stamped with `data`, the block's
  data, and `items`, the referenced items' JSON summaries in stored order.
  It derives `variation`, `headline`, `headline_tag`, `item_title_tag`,
  `shows_cards` and `css_class`, and `rendered_items`, the items rendered
  through their item templates. A custom list template normally emits its
  own wrapper around `rendered_items`.
- `BaseReferenceListItemView` (one item) is stamped with `item`, the
  summary (every catalog metadata column, `image_scales` included), `data`,
  `variation`, `title_tag`, `position` (0-based) and `total`. It derives
  `portal_type`, `url` (screened, `None` when the target must not be
  linked), `title`, `description`, `shows_cards`, `css_class` and `image`
  (`src`, `srcset`, `avif_srcset`, `sizes`, `width`, `height`, or `None`).

A variation's item template outranks a content type's card, so a theme
that registers `aurora-referencelist-item-grid` renders every type with it
on the grid, whatever cards the types have elsewhere. The editor canvas
does not take part: it shows the generic card for every item.

## How it works

The block stores its headline, headline tag, variation and the list of
references. A reference is the picked item's `@id` (which plone.restapi
rewrites to `../resolveuid/<UID>` on save and back to a URL on read), its
UID, type and a snapshot of its title. Nothing else is persisted.

1. On every load, a `plone.restapi` block serialization transformer resolves
   the references in the catalog and injects `items`, the full JSON summary
   of every target the current user may see, in stored order, plus
   `missing`, the references that resolved to nothing.
2. On save, a matching deserialization transformer strips both keys again,
   so derived data is never written to the database.
3. The public renderer hands `items` to the variation's list template,
   which renders each one through its item template.
4. The React renderer reads `items` too. A freshly picked reference the
   server has not seen yet is previewed from the stored snapshot, and a
   reference in `missing` is left out and named in a notice.

The transformers are registered for content with the `IBlocks` behavior and
for the site root, so a reference list in a footer stored on the site root
works on every page. Nested blocks inside a text container are transformed
too.

Two renderers emit the same markup: the Chameleon templates behind the
`aurora-block-referencelist` view for the public page, and a React `view`
component for the editor canvas and for Aurora frontends. Both are held to
the shared fixture `tests/anatomy-cases.json` by their test suites.

## Theming

The stylesheet mirrors the listing block's: quiet dividers, a picture over
the card on the summary and grid variations, the grid's two and three
columns from container queries on the block's width. One custom property is
read, `--referencelist-divider`, which falls back to the editor's
`--aurora-divider`. Every rule descends from `.referencelist`, the block's
own root. The stylesheet is `@scope`-wrapped to the editor and the public
blocks view, so a theme that wants different cards registers a template
(see above) rather than fighting the rules.

## Using the block in Aurora

The editor half lives in `bundle-src/` as the npm package
`@plone-collective/aurora-referencelist-block` (not yet published). It
registers the block and its two widgets through the usual `install(config)`
entry point and resolves every other field to an upstream Aurora widget.

- **The Python package must still be installed on the backend.** The React
  `view` reads the `items` the server injects; without it the canvas shows
  the stored snapshots only.
- The references widget mounts the host's own `object_browser` widget in
  multiple mode. Aurora's can only be mounted inside the edit route, where
  the block sidebar lives.
- **Bring your own styling.** The stylesheet is scoped to the Blicca roots
  and does not apply in an Aurora frontend.
- The block has been verified against the registry the Aurora installers
  build, not inside a running Aurora application.

## Development

The JavaScript build output is committed into
`src/collective/blicca/referencelist/static/`. Rebuild and commit it whenever
`bundle-src/src/` changes; CI fails when the committed bundle does not match
the source.

```bash
cd bundle-src
pnpm install
pnpm build        # writes ../src/collective/blicca/referencelist/static/referencelist-block.{js,css}
pnpm test         # reads the built bundle, so build first
pnpm typecheck
```

```bash
uv run --extra test pytest
```

Every change to a GenericSetup profile XML file needs an upgrade step, even
in an alpha release. Scaffold it with `plonecli add upgrade_step`.

## License

GPL-2.0-or-later

## Author

Maik Derstappen, [derico.de](https://derico.de), <md@derico.de>
