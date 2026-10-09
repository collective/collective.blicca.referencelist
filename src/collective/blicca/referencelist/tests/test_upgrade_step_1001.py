"""Upgrade step 1000 -> 1001: the block add-on record declares block-api 2.0."""

import pathlib
import xml.etree.ElementTree as ET

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.base.interfaces import INonInstallable
from plone.blicca.auroraeditor import blockaddons
from Products.GenericSetup.upgrade import UpgradeDepends
from zope.component import getAllUtilitiesRegisteredFor

import collective.blicca.referencelist

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME


PROFILE = "collective.blicca.referencelist:default"
UPGRADE_PROFILE = "collective.blicca.referencelist.upgrades:1001"
PREFIX = f"{blockaddons.BLOCKADDON_PREFIX}/{RECORD_NAME}"

PACKAGE = pathlib.Path(collective.blicca.referencelist.__file__).parent
DEFAULT_REGISTRY = PACKAGE / "profiles" / "default" / "registry.xml"
UPGRADE_REGISTRY = PACKAGE / "upgrades" / "1001" / "registry.xml"


def declared_block_api(path):
    """`block_api` per record prefix in a registry profile."""
    # S314: this package's own committed profile XML, not input.
    root = ET.parse(path).getroot()  # noqa: S314
    return {
        records.get("prefix"): value.text.strip()
        for records in root.iter("records")
        for value in records.iter("value")
        if value.get("key") == "block_api"
    }


def hidden_profiles():
    return [
        name
        for utility in getAllUtilitiesRegisteredFor(INonInstallable)
        for name in getattr(utility, "getNonInstallableProfiles", list)()
    ]


class TestUpgradeProfileParity:
    def test_upgrade_declares_what_a_fresh_install_declares(self):
        assert declared_block_api(UPGRADE_REGISTRY) == declared_block_api(DEFAULT_REGISTRY)


class TestUpgrade1001:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        # A site at 1000: the record declares 1.0.
        api.portal.set_registry_record(f"{PREFIX}.block_api", "1.0")
        self.setup_tool.setLastVersionForProfile(PROFILE, "1000")

    def test_the_step_imports_only_the_registry(self):
        steps = [
            step
            for group in self.setup_tool.listUpgrades(PROFILE)
            for step in (group if isinstance(group, list) else [group])
            if step["sdest"] == "1001"
        ]
        assert len(steps) == 1
        assert isinstance(steps[0]["step"], UpgradeDepends)
        assert steps[0]["step"].import_profile == UPGRADE_PROFILE
        assert steps[0]["step"].import_steps == ["plone.app.registry"]

    def test_the_upgrade_profile_is_hidden_from_the_control_panel(self):
        assert UPGRADE_PROFILE in hidden_profiles()

    def test_declares_block_api_2_0(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1001")
        assert block_addon_records()[RECORD_NAME].block_api == "2.0"

    def test_the_block_loads_again(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1001")
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        assert statuses[RECORD_NAME].loadable

    def test_leaves_the_rest_of_the_record_alone(self):
        api.portal.set_registry_record(f"{PREFIX}.enabled", False)
        self.setup_tool.upgradeProfile(PROFILE, dest="1001")
        record = block_addon_records()[RECORD_NAME]
        assert record.enabled is False
        assert record.bundle == "++plone++collective.blicca.referencelist/referencelist-block.js"

    def test_reaches_the_profile_version(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1001")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1001",)
