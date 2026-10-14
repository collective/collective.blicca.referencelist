"""The Reference List block's public renderer (``@@aurora-block-plone-collective.referencelist``).

The dispatcher of the block add-on contract (§5.1) stamps ``self.data`` and
``self.block_type`` and calls the view. The view resolves the referenced
items (reusing what the serialization transformer already derived) and
hands them to the variation's list template, the first registered of
``aurora-referencelist-<variation>`` and the stock ``aurora-referencelist``.
"""

from plone.blicca.auroraeditor.rendering import BaseBlockView
from zope.component import queryMultiAdapter

from collective.blicca.referencelist.blocks import list_view_names
from collective.blicca.referencelist.blocks import variation_of
from collective.blicca.referencelist.references import resolve_references


class ReferenceListBlockView(BaseBlockView):
    """Render a reference list block through its variation's list template."""

    @property
    def variation(self):
        return variation_of(self.data)

    def items(self):
        """The referenced items' summaries, derived by the transformer or now."""
        enriched = (self.data or {}).get("items")
        if isinstance(enriched, list):
            return enriched
        items, _missing = resolve_references(
            self.context, self.request, (self.data or {}).get("references")
        )
        return items

    def list_view(self):
        """The variation's list template, else the stock one."""
        for name in list_view_names(self.variation):
            view = queryMultiAdapter((self.context, self.request), name=name)
            if view is not None:
                return view
        return None

    def __call__(self):
        view = self.list_view()
        if view is None:
            return ""
        view.data = self.data or {}
        view.items = self.items()
        return view()
