# ADR 0001: The list and item templates are named views per variation

Status: accepted, 2026-10-08

## Context

The block renders picked content the way the listing block renders a query
result, with the same three variations. Themes want to change what a
variation looks like, and often only one of them: a different grid card, a
different summary list wrapper, a News Item card with its date. The listing
block's own hook (`aurora-listing-item-<portal_type>`) covers the item of
one type but not the list wrapper, and not one variation on its own.

Two ways to open that seam were on the table:

1. One view per step (`aurora-referencelist`, `aurora-referencelist-item`),
   overridden by registering the **same name on a more specific layer**.
2. A **lookup chain of distinct names** per step, with the variation and
   the portal type in the name, and the stock template as the floor.

## Decision

The second. The block view hands the resolved items to the first registered
of `aurora-referencelist-<variation>` and `aurora-referencelist`; the list
template hands each item to the first registered of
`aurora-referencelist-item-<variation>-<portal_type>`,
`aurora-referencelist-item-<variation>`,
`aurora-referencelist-item-<portal_type>` and `aurora-referencelist-item`.
A variation's item template outranks a type's card.

The templates are plain browser views stamped by the step above them. The
base classes live at the promised path `collective.blicca.referencelist.rendering`.

## Consequences

- A theme never competes with this package on layer precedence: the order
  of browser layers on a request is not something a theme controls, and a
  tie there would make an override work on one site and not on another.
  A distinct name always wins.
- Replacing one variation leaves the other two on the stock templates, and
  replacing the list wrapper leaves the cards alone (and vice versa).
- The names are the contract. Adding a variation means adding a name; the
  stock templates stay the floor for everything a theme does not name.
- The editor canvas is not part of this: it renders the generic card for
  every item. A theme's card is a public-page concern, the way the listing
  block's per-type card is.
