"""The serialization transformer pair: derive on read, strip on write."""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import SOMERSAULT_BLOCK_ID
from plone.blicca.auroraeditor import SOMERSAULT_BLOCK_TYPE
from plone.restapi.behaviors import IBlocks
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from plone.restapi.interfaces import IDeserializeFromJson
from plone.restapi.interfaces import ISerializeToJson
from plone.uuid.interfaces import IUUID
from zope.component import getMultiAdapter
from zope.component import subscribers
from zope.interface import alsoProvides

from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE
from collective.blicca.referencelist.interfaces import ICollectiveBliccaReferencelistLayer
from collective.blicca.referencelist.transform import ReferenceListDeserializer
from collective.blicca.referencelist.transform import ReferenceListDeserializerRoot
from collective.blicca.referencelist.transform import ReferenceListSerializer
from collective.blicca.referencelist.transform import ReferenceListSerializerRoot


def somersault(value):
    return {SOMERSAULT_BLOCK_ID: {"@type": SOMERSAULT_BLOCK_TYPE, "value": value}}


def reference_block(**fields):
    node = {"type": "ploneBlock", "@type": REFERENCELIST_BLOCK_TYPE, "children": [{"text": ""}]}
    node.update(fields)
    return node


class TransformTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, ICollectiveBliccaReferencelistLayer)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        # A blocks page: the behavior, not just its marker, so the `blocks`
        # field takes part in plone.restapi's (de)serialization.
        fti = self.portal.portal_types["Document"]
        if "volto.blocks" not in fti.behaviors:
            fti.behaviors = (*tuple(fti.behaviors), "volto.blocks")
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )
        # The marker too: the FTI change above reaches objects created after
        # the schema cache noticed it, which the first test of a run is not.
        alsoProvides(self.doc, IBlocks)
        self.page = api.content.create(
            container=self.portal, type="Document", id="page", title="A page"
        )

    def _ref(self, obj):
        return {"@id": obj.absolute_url(), "UID": IUUID(obj), "title": "stale"}


class TestSerializer(TransformTestCase):
    def test_derives_items_and_missing(self):
        value = {
            "@type": REFERENCELIST_BLOCK_TYPE,
            "references": [self._ref(self.page), {"@id": "../resolveuid/gone"}],
        }
        out = ReferenceListSerializer(self.doc, self.request)(value)
        assert [item["title"] for item in out["items"]] == ["A page"]
        assert out["missing"] == ["../resolveuid/gone"]

    def test_a_reference_without_uid_gets_the_one_it_names(self):
        stored = self._ref(self.page)
        value = {
            "@type": REFERENCELIST_BLOCK_TYPE,
            "references": [stored, {"@id": self.doc.absolute_url()}, "../resolveuid/gone"],
        }
        out = ReferenceListSerializer(self.doc, self.request)(value)
        assert out["references"] == [
            stored,
            {"@id": self.doc.absolute_url(), "UID": IUUID(self.doc)},
            {"@id": "../resolveuid/gone", "UID": "gone"},
        ]

    def test_a_block_without_references_gets_none(self):
        out = ReferenceListSerializer(self.doc, self.request)({"@type": REFERENCELIST_BLOCK_TYPE})
        assert "references" not in out

    def test_replaces_whatever_derived_data_arrived(self):
        value = {
            "@type": REFERENCELIST_BLOCK_TYPE,
            "references": [],
            "items": [{"title": "stale"}],
            "missing": ["stale"],
        }
        out = ReferenceListSerializer(self.doc, self.request)(value)
        assert out["items"] == []
        assert out["missing"] == []

    def test_a_block_without_references_gets_empty_derived_keys(self):
        out = ReferenceListSerializer(self.doc, self.request)({"@type": REFERENCELIST_BLOCK_TYPE})
        assert out["items"] == []
        assert out["missing"] == []

    def test_registered_for_blocks_content_and_the_site_root(self):
        for context, cls in (
            (self.doc, ReferenceListSerializer),
            (self.portal, ReferenceListSerializerRoot),
        ):
            handlers = [
                handler
                for handler in subscribers(
                    (context, self.request), IBlockFieldSerializationTransformer
                )
                if handler.block_type == REFERENCELIST_BLOCK_TYPE
            ]
            assert [type(h) for h in handlers] == [cls]
            assert handlers[0].order == 200

    def test_runs_inside_the_somersault_tree(self):
        self.doc.blocks = somersault([reference_block(references=[self._ref(self.page)])])
        self.doc.blocks_layout = {"items": [SOMERSAULT_BLOCK_ID]}
        serialized = getMultiAdapter((self.doc, self.request), ISerializeToJson)()
        node = serialized["blocks"][SOMERSAULT_BLOCK_ID]["value"][0]
        assert [item["title"] for item in node["items"]] == ["A page"]
        assert node["missing"] == []
        # plone.restapi's own resolveuid pass gave the reference its URL back.
        assert node["references"][0]["@id"] == self.page.absolute_url()


class TestDeserializer(TransformTestCase):
    def test_strips_the_derived_keys(self):
        value = {
            "@type": REFERENCELIST_BLOCK_TYPE,
            "references": [self._ref(self.page)],
            "items": [{"title": "x"}],
            "missing": [],
        }
        out = ReferenceListDeserializer(self.doc, self.request)(value)
        assert "items" not in out
        assert "missing" not in out
        assert out["references"][0]["UID"] == IUUID(self.page)

    def test_registered_for_blocks_content_and_the_site_root(self):
        for context, cls in (
            (self.doc, ReferenceListDeserializer),
            (self.portal, ReferenceListDeserializerRoot),
        ):
            handlers = [
                handler
                for handler in subscribers(
                    (context, self.request), IBlockFieldDeserializationTransformer
                )
                if handler.block_type == REFERENCELIST_BLOCK_TYPE
            ]
            assert [type(h) for h in handlers] == [cls]

    def test_nothing_derived_is_persisted_and_the_reference_becomes_a_uid(self):
        node = reference_block(
            references=[self._ref(self.page)], items=[{"title": "x"}], missing=["y"]
        )
        getMultiAdapter((self.doc, self.request), IDeserializeFromJson)(
            validate_all=False,
            data={"blocks": somersault([node]), "blocks_layout": {"items": [SOMERSAULT_BLOCK_ID]}},
        )
        stored = self.doc.blocks[SOMERSAULT_BLOCK_ID]["value"][0]
        assert "items" not in stored
        assert "missing" not in stored
        assert stored["references"][0]["@id"] == f"../resolveuid/{IUUID(self.page)}"
