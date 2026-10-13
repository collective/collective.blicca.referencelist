# `@plone-collective/plone-referencelist-block`

The Reference List block's Aurora half: a real npm package (the editor half
belongs to the Aurora ecosystem) *and* the source for the bundle committed
into `../src/collective/blicca/referencelist/static/`.

| consumer | artifact | entry |
| --- | --- | --- |
| Blicca `@@aurora-edit` | the scope-wrapped Plone static bundle, runtime-imported per block add-on contract §4 | `install(config)` via `blockAddons` |
| Aurora proper | this npm package, a source dependency | `install(config)` from the app's registry config |

## Commands

```bash
pnpm install
pnpm build      # -> ../src/collective/blicca/referencelist/static/referencelist-block.{js,css,js.map}
pnpm test       # reads the built bundle, so build first
pnpm typecheck
```

Build artifacts are committed and never built at install time. Rebuild here
and commit the result whenever `src/` changes.

## Layout

- `src/referencelist/schema.ts`: the sidebar form.
- `src/referencelist/data.ts`: reading the stored block, pure functions;
  the TypeScript twin of the Python `blocks.py` and `references.py`.
- `src/referencelist/ReferenceListView.tsx`: the markup, the same anatomy
  the Chameleon templates emit; `tests/anatomy-cases.json` at the
  repository root holds both renderers to it.
- `src/referencelist/ReferenceListEdit.tsx`: the view in edit mode plus the
  canvas notices.
- `src/widgets/`: `referencelist_select` (a select over `choices`, since
  only the Blicca host registers a `choices` widget) and
  `referencelist_references` (the host's own `object_browser`, mounted in
  multiple mode on the stored references; the selection it reports
  replaces the list).
- `src/styles.css`: the one stylesheet, scope-wrapped by the build.

## Why the tests have no facade stubs

`@plone/registry` and `@plone/helpers` are installed for real, at the
versions the host provides. `test/upstream-registry.ts` runs Aurora's own
installers, so every assertion about what resolves to which widget is a
statement about Aurora rather than about a stub.
