"""The base classes of the list templates and the item templates.

The block renders in two steps, each through a named view on the page's
(context, request) pair, so a theme can replace either step for one
variation without touching the other:

1. the **list template**, ``aurora-referencelist-<variation>`` when one is
   registered, else the stock ``aurora-referencelist``;
2. the **item template** for each referenced item,
   ``aurora-referencelist-item-<variation>-<portal_type>``,
   ``aurora-referencelist-item-<variation>``,
   ``aurora-referencelist-item-<portal_type>``, else the stock
   ``aurora-referencelist-item``.

A different name per step and per variation, rather than one name on a
more specific layer, so a theme never has to win a layer-precedence contest
against this package. The block stamps what a template needs and the base
class derives the rest.
"""

from plone.blicca.auroraeditor.rendering import image_source
from plone.blicca.auroraeditor.rendering import link_href
from Products.Five.browser import BrowserView
from zope.component import queryMultiAdapter

from collective.blicca.referencelist.blocks import CARD_VARIATIONS
from collective.blicca.referencelist.blocks import headline_of
from collective.blicca.referencelist.blocks import headline_tag_of
from collective.blicca.referencelist.blocks import item_title_tag_of
from collective.blicca.referencelist.blocks import item_view_names
from collective.blicca.referencelist.blocks import links_items
from collective.blicca.referencelist.blocks import variation_of
from collective.blicca.referencelist.picture import responsive_image


class BaseReferenceListView(BrowserView):
    """Base of a list template; the block stamps ``data`` and ``items``."""

    #: The block's data, after the serialization transformers ran.
    data = None
    #: The referenced items' JSON summaries, in stored order.
    items = None

    @property
    def variation(self):
        return variation_of(self.data)

    @property
    def shows_cards(self):
        return self.variation in CARD_VARIATIONS

    @property
    def headline(self):
        return headline_of(self.data)

    @property
    def headline_tag(self):
        return headline_tag_of(self.data)

    @property
    def item_title_tag(self):
        return item_title_tag_of(self.data)

    @property
    def css_class(self):
        return f"referencelist variation-{self.variation}"

    def item_view(self, item):
        """The item template for one summary, most specific registration first."""
        portal_type = (item or {}).get("@type") or (item or {}).get("portal_type") or ""
        for name in item_view_names(self.variation, portal_type):
            view = queryMultiAdapter((self.context, self.request), name=name)
            if view is not None:
                return view
        return None

    def render_item(self, item, index):
        view = self.item_view(item)
        if view is None:
            return ""
        view.item = item
        view.data = self.data
        view.variation = self.variation
        view.title_tag = self.item_title_tag
        view.position = index
        view.total = len(self.items or [])
        return view()

    @property
    def rendered_items(self):
        return [self.render_item(item, index) for index, item in enumerate(self.items or [])]

    def __call__(self):
        return self.index()


class BaseReferenceListItemView(BrowserView):
    """Base of an item template; the list template stamps the attributes below."""

    #: The referenced item's JSON summary (every catalog column, image_scales included).
    item = None
    #: The block's data.
    data = None
    #: The block's effective variation.
    variation = "default"
    #: The heading level of the item title.
    title_tag = "h3"
    #: The item's position in the list (0-based), and how many there are.
    #: Not ``index``: that name is the view's own template.
    position = 0
    total = 0

    @property
    def portal_type(self):
        item = self.item or {}
        return item.get("@type") or item.get("portal_type") or ""

    @property
    def shows_cards(self):
        return self.variation in CARD_VARIATIONS

    @property
    def css_class(self):
        return "item summary" if self.shows_cards else "item"

    @property
    def linked(self):
        """Whether the block links item titles to their items."""
        return links_items(self.data)

    @property
    def url(self):
        """The card's link, or ``None`` when the target must not be linked."""
        if not self.linked:
            return None
        item = self.item or {}
        href = link_href(item.get("@id"))
        if href and item.get("use_view_action_in_listings"):
            return f"{href}/view"
        return href

    @property
    def title(self):
        item = self.item or {}
        return item.get("title") or item.get("id") or ""

    @property
    def description(self):
        return (self.item or {}).get("description") or ""

    @property
    def image(self):
        """``{src, srcset, avif_srcset, sizes, width, height}``, or ``None``."""
        source = image_source(self.item or {})
        if not source:
            return None
        return responsive_image(source, self.data, self.variation)

    def __call__(self):
        return self.index()
