"""The stable import path for themes and add-ons that register a template.

A theme replacing the list template or the item template of one variation
subclasses the two base classes from here and registers its view under the
name the lookup chain tries first (see ``list_view_names`` and
``item_view_names``). This module is the promised surface; the modules
behind it may move.
"""

from collective.blicca.referencelist.blocks import CARD_VARIATIONS
from collective.blicca.referencelist.blocks import DEFAULT_VARIATION
from collective.blicca.referencelist.blocks import item_view_names
from collective.blicca.referencelist.blocks import list_view_names
from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE
from collective.blicca.referencelist.blocks import VARIATIONS
from collective.blicca.referencelist.views.base import BaseReferenceListItemView
from collective.blicca.referencelist.views.base import BaseReferenceListView


__all__ = [
    "BaseReferenceListItemView",
    "BaseReferenceListView",
    "CARD_VARIATIONS",
    "DEFAULT_VARIATION",
    "REFERENCELIST_BLOCK_TYPE",
    "VARIATIONS",
    "item_view_names",
    "list_view_names",
]
