"""Reference List serialization transformers.

The editor canvas and the public renderer both read ``items``, the JSON
summaries of the referenced content, and ``missing``, the references that
resolved to nothing. Neither is stored: this pair derives both on every
serialization and strips both again on save (block add-on contract §5.3).

Registered for content with the ``IBlocks`` behavior and for the site root,
so a reference list in a footer stored on the root works on every page.
plone.restapi's blocks visitor recurses into the somersault tree, so the
nested block nodes are transformed too.
"""

import logging

from plone.base.interfaces import IPloneSiteRoot
from plone.restapi.behaviors import IBlocks
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from plone.restapi.serializer.converters import json_compatible
from zope.component import adapter
from zope.interface import implementer

from collective.blicca.referencelist.blocks import DERIVED_KEYS
from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE
from collective.blicca.referencelist.interfaces import ICollectiveBliccaReferencelistLayer
from collective.blicca.referencelist.references import resolve_references
from collective.blicca.referencelist.references import with_uids


logger = logging.getLogger(__name__)


class ReferenceListSerializerBase:
    """Resolve the stored references into ``items`` and ``missing``."""

    order = 200
    block_type = REFERENCELIST_BLOCK_TYPE

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_KEYS:
            value.pop(key, None)
        try:
            references = with_uids(self.context, value.get("references"))
            items, missing = resolve_references(self.context, self.request, references)
        except Exception:
            # One broken reference list must not break the page's serialization.
            logger.exception("Could not resolve the references of a reference list")
            return value
        if "references" in value:
            value["references"] = references
        value["items"] = json_compatible(items)
        value["missing"] = list(missing)
        return value


@implementer(IBlockFieldSerializationTransformer)
@adapter(IBlocks, ICollectiveBliccaReferencelistLayer)
class ReferenceListSerializer(ReferenceListSerializerBase):
    """Resolve the references for content with the IBlocks behavior."""


@implementer(IBlockFieldSerializationTransformer)
@adapter(IPloneSiteRoot, ICollectiveBliccaReferencelistLayer)
class ReferenceListSerializerRoot(ReferenceListSerializerBase):
    """Resolve the references on the site root."""


class ReferenceListDeserializerBase:
    """Strip the derived keys before the block is persisted."""

    order = 200
    block_type = REFERENCELIST_BLOCK_TYPE

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_KEYS:
            value.pop(key, None)
        return value


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IBlocks, ICollectiveBliccaReferencelistLayer)
class ReferenceListDeserializer(ReferenceListDeserializerBase):
    """Strip the derived keys for content with the IBlocks behavior."""


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IPloneSiteRoot, ICollectiveBliccaReferencelistLayer)
class ReferenceListDeserializerRoot(ReferenceListDeserializerBase):
    """Strip the derived keys on the site root."""
