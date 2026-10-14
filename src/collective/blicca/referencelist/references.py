"""Reading the stored references and resolving them to catalog summaries.

A reference is stored as a dict carrying the picked item's ``@id`` (which
plone.restapi rewrites to ``../resolveuid/<UID>`` on save and back to a URL
on read, for any dict with an ``@id``), usually its ``UID``, and a small
snapshot (``@type``, ``title``) the editor canvas shows until the server has
resolved the reference. The public page never renders the snapshot: every
item is looked up in the catalog on each load, so a renamed or moved target
is always shown as it is now, and a deleted or unpublished one disappears.
"""

from plone.registry.interfaces import IRegistry
from plone.restapi.deserializer.utils import path2uid
from plone.restapi.interfaces import ISerializeToJsonSummary
from plone.restapi.serializer.utils import RESOLVEUID_RE
from Products.CMFCore.utils import getToolByName
from zope.component import getMultiAdapter
from zope.component import getUtility


def stored_references(value):
    """The stored ``references`` as a list of dicts with an ``@id``.

    A bare string is read as an ``@id``; anything else is dropped.
    """
    if not isinstance(value, list | tuple):
        return []
    references = []
    for entry in value:
        if isinstance(entry, str) and entry.strip():
            references.append({"@id": entry.strip()})
        elif isinstance(entry, dict) and isinstance(entry.get("@id"), str) and entry["@id"]:
            references.append(entry)
    return references


def reference_key(reference):
    """What identifies a reference for matching: its UID, else its ``@id``."""
    uid = reference.get("UID")
    if isinstance(uid, str) and uid:
        return uid
    return reference.get("@id") or ""


def reference_uid(context, reference):
    """The UID a reference names, or ``None`` when it names no content here.

    Read from the stored ``UID`` first, then from a ``../resolveuid/<UID>``
    ``@id``, and finally by turning an absolute URL or a path into one.
    """
    uid = reference.get("UID")
    if isinstance(uid, str) and uid:
        return uid
    at_id = reference.get("@id")
    if not isinstance(at_id, str) or not at_id:
        return None
    match = RESOLVEUID_RE.match(at_id)
    if match is None:
        match = RESOLVEUID_RE.match(path2uid(context=context, link=at_id))
    return match.group(1) if match else None


def with_uids(context, references):
    """The stored references, each carrying the UID it names.

    The editor's content picker tracks a selection by UID, so a reference
    stored with an ``@id`` only would be invisible to it.
    """
    result = []
    for reference in stored_references(references):
        uid = reference_uid(context, reference)
        if uid and reference.get("UID") != uid:
            reference = {**reference, "UID": uid}
        result.append(reference)
    return result


def _summaries_by_uid(context, request, uids):
    if not uids:
        return {}
    catalog = getToolByName(context, "portal_catalog")
    brains = catalog(UID=list(uids))
    view_action_types = getUtility(IRegistry).get("plone.types_use_view_action_in_listings", [])
    form = request.form
    saved = form.get("metadata_fields", None)
    # ``_all`` makes the summary carry image_scales and every other catalog
    # column; the form is restored so no request state leaks.
    form["metadata_fields"] = "_all"
    try:
        return {
            brain.UID: {
                **getMultiAdapter((brain, request), ISerializeToJsonSummary)(),
                # The same key as in plone.restapi's navigation. The renderers
                # add ``/view`` to the item's link when it is true.
                "use_view_action_in_listings": brain.portal_type in view_action_types,
            }
            for brain in brains
        }
    finally:
        if saved is None:
            form.pop("metadata_fields", None)
        else:
            form["metadata_fields"] = saved


def resolve_references(context, request, references):
    """Resolve references to ``(items, missing)``.

    ``items`` are the JSON summaries of the targets the current user may see,
    in stored order; ``missing`` lists the ``@id`` of every reference that
    resolved to nothing (deleted, unpublished, or never content).
    """
    references = stored_references(references)
    uids = [reference_uid(context, reference) for reference in references]
    summaries = _summaries_by_uid(context, request, {uid for uid in uids if uid})
    items = []
    missing = []
    for reference, uid in zip(references, uids, strict=True):
        summary = summaries.get(uid) if uid else None
        if summary is None:
            missing.append(reference["@id"])
        else:
            items.append(summary)
    return items, missing
