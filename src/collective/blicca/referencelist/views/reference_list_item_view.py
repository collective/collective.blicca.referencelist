"""The stock item template (``@@aurora-referencelist-item``).

The card of one referenced item: its picture on the summary and grid
variations, the title as a link, and the description. A theme replaces it
by registering ``aurora-referencelist-item-<variation>``,
``aurora-referencelist-item-<portal_type>`` or
``aurora-referencelist-item-<variation>-<portal_type>`` on its own browser
layer, subclassing ``BaseReferenceListItemView``.
"""

from collective.blicca.referencelist.views.base import BaseReferenceListItemView


class ReferenceListItemView(BaseReferenceListItemView):
    """The stock card: title link, description, the picture on a card variation."""
