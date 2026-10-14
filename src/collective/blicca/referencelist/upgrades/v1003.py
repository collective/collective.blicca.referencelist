"""Namespace the block type."""

import logging
from copy import deepcopy

from plone import api
from plone.dexterity.utils import iterSchemataForType
from plone.schema import IJSONField
from zope.schema import getFieldsInOrder

from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE


logger = logging.getLogger(__name__)

OLD_BLOCK_TYPE = "referencelist"


def upgrade(context):
    """Rename every stored ``referencelist`` block.

    Upgrade from profile version 1002 to 1003.
    """
    logger.info("Running upgrade step: Namespace the block type")
    catalog = api.portal.get_tool("portal_catalog")
    reindex = "block_types" in catalog.indexes()
    renamed = 0
    for obj in _carriers(catalog):
        count = rename_block_type(obj)
        if count and reindex:
            obj.reindexObject(idxs=["block_types"])
        renamed += count
    logger.info("Renamed %d reference list blocks.", renamed)


def rename_block_type(obj):
    """Rename the old ``@type`` in every JSON field of ``obj`` and return the count."""
    renamed = 0
    for schema, field in _json_fields(obj.portal_type):
        storage = schema(obj, None)
        if storage is None:
            continue
        value = deepcopy(getattr(storage, field.__name__, None))
        count = _rename(value)
        if count:
            field.set(storage, value)
            renamed += count
    return renamed


def _carriers(catalog):
    yield api.portal.get()
    portal_types = [
        name for name in api.portal.get_tool("portal_types").objectIds() if _json_fields(name)
    ]
    if not portal_types:
        return
    for brain in catalog.unrestrictedSearchResults(portal_type=portal_types):
        yield brain._unrestrictedGetObject()


def _json_fields(portal_type):
    return [
        (schema, field)
        for schema in iterSchemataForType(portal_type)
        for _name, field in getFieldsInOrder(schema)
        if IJSONField.providedBy(field)
    ]


def _rename(value):
    if isinstance(value, list):
        return sum(_rename(item) for item in value)
    if not isinstance(value, dict):
        return 0
    count = sum(_rename(item) for item in value.values())
    if value.get("@type") == OLD_BLOCK_TYPE:
        value["@type"] = REFERENCELIST_BLOCK_TYPE
        count += 1
    return count
