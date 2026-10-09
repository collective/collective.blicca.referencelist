"""Upgrade step 1001 -> 1002: delete the reference list block's orphaned block_api record."""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.registry import field
from plone.registry import Record
from plone.registry.interfaces import IRegistry
from zope.component import getUtility


PROFILE = "collective.blicca.referencelist:default"
NAME = "collective.blicca.referencelist.referencelist"
PREFIX = f"plone.blicca.auroraeditor.blockaddons/{NAME}"
RECORD = f"{PREFIX}.block_api"


class TestUpgrade1002:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = self.portal.portal_setup
        self.registry = getUtility(IRegistry)
        self.setup_tool.setLastVersionForProfile(PROFILE, "1001")

    def test_deletes_the_orphan_record(self):
        """A site still holding the retired field loses it."""
        self.registry.records[RECORD] = Record(field.TextLine(title="old"), "2.0")
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert RECORD not in self.registry.records

    def test_tolerates_a_missing_record(self):
        """A site without the orphan record is untouched."""
        assert RECORD not in self.registry.records
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert RECORD not in self.registry.records

    def test_leaves_the_rest_of_the_record_alone(self):
        self.registry.records[RECORD] = Record(field.TextLine(title="old"), "2.0")
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert api.portal.get_registry_record(f"{PREFIX}.enabled") is True
        assert api.portal.get_registry_record(f"{PREFIX}.bundle") == (
            "++plone++collective.blicca.referencelist/referencelist-block.js"
        )

    def test_reaches_the_profile_version(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1002",)
