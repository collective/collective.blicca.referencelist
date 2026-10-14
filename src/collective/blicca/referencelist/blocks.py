"""The Reference List block's identity and vocabulary, spelled once.

``plone-collective.referencelist`` is the block's ``@type``. It takes its
namespace from the npm package ``@plone-collective/aurora-referencelist-block``,
as ADR 0025 in plone.blicca.auroraeditor asks. The serialization
transformers, the renderer view name
(``aurora-block-<REFERENCELIST_BLOCK_TYPE>``) and the registry record all
derive their spelling from here.

The variations mirror the listing block's: a plain stack, summary cards with
the picture over the text, and the same cards laid out in a grid.
"""

REFERENCELIST_BLOCK_TYPE = "plone-collective.referencelist"

#: The variations the block offers, in sidebar order.
VARIATIONS = ("default", "summary", "grid")
DEFAULT_VARIATION = "default"

#: Variations whose items are summary cards: the picture over the text.
CARD_VARIATIONS = ("summary", "grid")

#: The keys the serialization transformer injects. Derived data is never
#: persisted: the deserializer strips every one of these again on save.
DERIVED_KEYS = ("items", "missing")

HEADLINE_TAGS = ("h2", "h3")


def variation_of(data):
    """The block's effective variation; anything unknown renders as default."""
    value = (data or {}).get("variation")
    return value if value in VARIATIONS else DEFAULT_VARIATION


def shows_cards(data):
    return variation_of(data) in CARD_VARIATIONS


def headline_of(data):
    value = (data or {}).get("headline")
    return value.strip() if isinstance(value, str) else ""


def headline_tag_of(data):
    tag = (data or {}).get("headlineTag")
    return tag if tag in HEADLINE_TAGS else "h2"


def item_title_tag_of(data):
    """Item titles sit one level below a visible headline, else at its level."""
    tag = headline_tag_of(data)
    if not headline_of(data):
        return tag
    return "h3" if tag == "h2" else "h4"


def links_items(data):
    """Item titles link to their items unless the author switched it off."""
    return (data or {}).get("linkItems") is not False


def list_view_names(variation):
    """The list template lookup chain, most specific first."""
    return [f"aurora-referencelist-{variation}", "aurora-referencelist"]


def item_view_names(variation, portal_type):
    """The item template lookup chain, most specific first.

    A theme registers the variation's card, a type's card, or a type's card
    for one variation; the stock card is the floor.
    """
    names = []
    if portal_type:
        names.append(f"aurora-referencelist-item-{variation}-{portal_type}")
    names.append(f"aurora-referencelist-item-{variation}")
    if portal_type:
        names.append(f"aurora-referencelist-item-{portal_type}")
    names.append("aurora-referencelist-item")
    return names
