"""The card picture's responsive ladder, built from Plone's picture variants.

A summary card's picture spans the block, a grid card's one column of it, so
the picture variant follows ``blockWidth`` and the variation. The ladder is
folded onto the ``<img>`` as ``srcset`` plus a matching ``sizes``, and the
one ``<source>`` in front of it is the ladder's AVIF twin, which
plone.namedfile serves on demand. The anatomy both renderers share stays
``picture > img``.
"""

from plone.namedfile.picture import get_picture_variants
from plone.namedfile.picture import Img2PictureTag

from collective.blicca.referencelist.blocks import variation_of


#: Candidate variants; ``fullwidth`` ships with plone.blicca.auroraeditor.
VARIANTS = ("small", "medium", "large", "fullwidth")

#: blockWidth -> its container's max width in px (``None``: the viewport).
CONTAINER_WIDTHS = {
    "narrow": 620,
    "default": 940,
    "layout": 1440,
    "full": None,
}
DEFAULT_BLOCK_WIDTH = "default"

#: The grid's column gutter (``--aurora-column-gutter`` default) and its
#: breakpoints: two columns above 34rem of block width, three above 60rem.
GRID_GAP_PX = 32
GRID_TWO_COLUMNS_FROM_PX = 544
GRID_THREE_COLUMNS_FROM_PX = 960


def container_width(data):
    """The px cap of the block's box, or ``None`` when it spans the viewport."""
    width = (data or {}).get("blockWidth")
    if width not in CONTAINER_WIDTHS:
        width = DEFAULT_BLOCK_WIDTH
    return CONTAINER_WIDTHS[width]


def grid_columns(width):
    if width is None or width > GRID_THREE_COLUMNS_FROM_PX:
        return 3
    if width > GRID_TWO_COLUMNS_FROM_PX:
        return 2
    return 1


def rendered_width(data, variation=None):
    """The widest the card picture gets, in px; ``None`` when unbounded."""
    cap = container_width(data)
    if (variation or variation_of(data)) != "grid" or cap is None:
        return cap
    columns = grid_columns(cap)
    return (cap - GRID_GAP_PX * (columns - 1)) // columns


def sizes(data, variation=None):
    """The ``sizes`` attribute for the card picture."""
    variation = variation or variation_of(data)
    cap = container_width(data)
    if variation != "grid":
        return f"(min-width: {cap}px) {cap}px, 100vw" if cap else "100vw"
    rules = []
    if cap:
        columns = grid_columns(cap)
        rules.append(f"(min-width: {cap}px) {rendered_width(data, variation)}px")
        if columns > 2:
            rules.append("(min-width: 60rem) 33vw")
        if columns > 1:
            rules.append("(min-width: 34rem) 50vw")
    else:
        rules.extend(["(min-width: 60rem) 33vw", "(min-width: 34rem) 50vw"])
    rules.append("100vw")
    return ", ".join(rules)


def variant_for(data, variation=None, variants=None):
    """The smallest variant whose target scale covers the rendered width."""
    if variants is None:
        variants = get_picture_variants()
    tag = Img2PictureTag()
    candidates = []
    for name in VARIANTS:
        sourceset = (variants.get(name) or {}).get("sourceset")
        if sourceset:
            width = tag.get_scale_width(sourceset[-1]["scale"]) or 0
            candidates.append((width, name))
    if not candidates:
        return None
    candidates.sort()
    needed = rendered_width(data, variation)
    if needed is not None:
        for width, name in candidates:
            if width >= needed:
                return name
    return candidates[-1][1]


def responsive_image(source, data, variation=None):
    """``source`` plus ``srcset``/``avif_srcset``/``sizes`` from the fitting variant.

    ``source`` is ``image_source()``'s ``{src, width, height}``; it comes back
    unchanged when no picture variant is available.
    """
    variants = get_picture_variants()
    name = variant_for(data, variation, variants)
    if name is None:
        return source
    picture = Img2PictureTag().create_picture_tag(
        variants[name]["sourceset"], {"src": source["src"]}, lazy=False
    )
    # plone.namedfile puts an ``image/avif`` twin in front of every source; the
    # last source is the variant's own ladder, in the upload's format.
    ladder = picture.find_all("source")[-1]
    avif = picture.find("source", type="image/avif")
    return dict(
        source,
        src=picture.find("img")["src"],
        srcset=", ".join(ladder["srcset"].split(",\n")),
        avif_srcset=", ".join(avif["srcset"].split(",\n")) if avif else None,
        sizes=sizes(data, variation),
    )
