"""Upgrade step 1002 to 1003 namespaces the block type.

Following ADR 0025 in plone.blicca.auroraeditor, the block's ``@type`` went
from ``referencelist`` to ``plone-collective.referencelist``. The upgrade
sets the record's new ``types`` and renames every stored block, wherever it
is nested.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from Products.GenericSetup.upgrade import UpgradeDepends
from Products.GenericSetup.upgrade import UpgradeStep

from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME


PROFILE = "collective.blicca.referencelist:default"
UPGRADE_PROFILE = "collective.blicca.referencelist.upgrades:1003"
OLD_TYPE = "referencelist"


def plone_block(node_id, block_type, **data):
    return {
        "type": "ploneBlock",
        "id": node_id,
        "children": [{"text": ""}],
        "@type": block_type,
        **data,
    }


def somersault(*nodes):
    return {"@type": "__somersault__", "value": list(nodes)}


def add_blocks_behavior(portal_type):
    fti = api.portal.get_tool("portal_types")[portal_type]
    fti._updateProperty("behaviors", (*fti.behaviors, "volto.blocks"))


class UpgradeTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")

    def _upgrade(self):
        self.setup_tool.setLastVersionForProfile(PROFILE, "1002")
        self.setup_tool.upgradeProfile(PROFILE, dest="1003")


class TestRegistry(UpgradeTestCase):
    def _steps(self):
        found = []
        for step in self.setup_tool.listUpgrades(PROFILE, show_old=True):
            found.extend(step if isinstance(step, list) else [step])
        return [s["step"] for s in found if s["ssource"] == "1002" and s["sdest"] == "1003"]

    def test_the_registry_import_is_narrowed_to_the_registry_step(self):
        depends = [s for s in self._steps() if isinstance(s, UpgradeDepends)]
        assert len(depends) == 1
        assert depends[0].import_profile == UPGRADE_PROFILE
        assert depends[0].import_steps == ["plone.app.registry"]

    def test_the_content_is_renamed_by_the_handler(self):
        handlers = [s for s in self._steps() if isinstance(s, UpgradeStep)]
        assert [s.handler.__module__ for s in handlers] == [
            "collective.blicca.referencelist.upgrades.v1003"
        ]

    def test_a_site_at_1002_gets_the_new_type(self):
        record = block_addon_records()[RECORD_NAME]
        record.types = [OLD_TYPE]
        record.enabled = False

        self._upgrade()

        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1003",)
        record = block_addon_records()[RECORD_NAME]
        assert record.types == [REFERENCELIST_BLOCK_TYPE]
        assert record.enabled is False


class TestContent(UpgradeTestCase):
    @pytest.fixture(autouse=True)
    def _page(self, _setup):
        add_blocks_behavior("Document")
        self.doc = api.content.create(container=self.portal, type="Document", id="doc", title="Doc")

    def test_renames_the_blocks_wherever_they_are_nested(self):
        self.doc.blocks = {
            "top": {"@type": "referencelist", "headline": "Related"},
            "grid": {"@type": "gridBlock", "blocks": {"cell": {"@type": "referencelist"}}},
            "__somersault__": somersault(
                plone_block("n1", "referencelist", variation="grid"),
                {"type": "p", "id": "p1", "children": [{"text": "referencelist"}]},
            ),
        }

        self._upgrade()

        blocks = self.doc.blocks
        assert blocks["top"] == {"@type": REFERENCELIST_BLOCK_TYPE, "headline": "Related"}
        assert blocks["grid"]["blocks"]["cell"]["@type"] == REFERENCELIST_BLOCK_TYPE
        node, paragraph = blocks["__somersault__"]["value"]
        assert node == plone_block("n1", REFERENCELIST_BLOCK_TYPE, variation="grid")
        assert paragraph == {"type": "p", "id": "p1", "children": [{"text": "referencelist"}]}

    def test_leaves_other_blocks_alone(self):
        blocks = {
            "teaser": {"@type": "teaser", "title": "referencelist"},
            "done": {"@type": REFERENCELIST_BLOCK_TYPE, "headline": "Related"},
        }
        self.doc.blocks = dict(blocks)

        self._upgrade()

        assert self.doc.blocks == blocks

    def test_renames_the_site_roots_blocks(self):
        add_blocks_behavior("Plone Site")
        self.portal.blocks = {"b1": {"@type": "referencelist"}}

        self._upgrade()

        assert self.portal.blocks == {"b1": {"@type": REFERENCELIST_BLOCK_TYPE}}


class TestBlockTypesIndex(UpgradeTestCase):
    @pytest.fixture(autouse=True)
    def _index(self, _setup):
        self.catalog = api.portal.get_tool("portal_catalog")
        add_blocks_behavior("Document")
        self.doc = api.content.create(container=self.portal, type="Document", id="doc", title="Doc")
        self.doc.blocks = {"b1": {"@type": "referencelist"}}
        self.doc.reindexObject()

    def found(self, block_type):
        return [brain.getId for brain in self.catalog(block_types=block_type)]

    def test_finds_the_page_under_its_new_type(self):
        assert self.found("referencelist") == ["doc"]

        self._upgrade()

        assert self.found("referencelist") == []
        assert self.found(REFERENCELIST_BLOCK_TYPE) == ["doc"]
