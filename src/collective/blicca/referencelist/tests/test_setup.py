"""Test collective.blicca.referencelist installation.

The install profile is what makes the committed bundle reachable: the editor
discovers add-ons per site through an ``IAuroraBlockAddon`` record and gates
each on *enabled*, *bundle resolves* and *block-api compatible*. Uninstall
must undo exactly what install did, or the block stays in the slash menu of
a site that can no longer render it.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons
from plone.blicca.auroraeditor.interfaces import IAuroraBlockAddon
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE
from collective.blicca.referencelist.interfaces import ICollectiveBliccaReferencelistLayer


RECORD_NAME = "collective.blicca.referencelist.referencelist"
RESOURCE = "++plone++collective.blicca.referencelist"


def block_addon_records():
    registry = getUtility(IRegistry)
    return registry.collectionOfInterface(
        IAuroraBlockAddon, prefix=blockaddons.BLOCKADDON_PREFIX, check=False
    )


class TestSetup:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]

    def test_addon_installed(self):
        installer = api.addon.get_installer(self.portal)
        assert installer.is_product_installed("collective.blicca.referencelist")

    def test_browserlayer(self):
        from plone.browserlayer import utils

        assert ICollectiveBliccaReferencelistLayer in utils.registered_layers()

    def test_blockaddon_record_installed(self):
        record = block_addon_records()[RECORD_NAME]
        assert record.bundle == f"{RESOURCE}/referencelist-block.js"
        assert record.css == f"{RESOURCE}/referencelist-block.css"
        assert record.types == [REFERENCELIST_BLOCK_TYPE]
        assert record.enabled
        assert record.weight == 100
        assert not getattr(record, "permission", "")

    def test_blockaddon_record_declares_the_api_floor(self):
        record = block_addon_records()[RECORD_NAME]
        assert record.block_api == "2.0"
        assert blockaddons.is_compatible(record.block_api, blockaddons.host_block_api())

    def test_addon_loadable_by_the_editor(self):
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        status = statuses[RECORD_NAME]
        assert status.skip_reason is None
        assert status.loadable
        assert status.bundle_url
        assert status.css_url

    def test_uninstall_profile_is_hidden(self):
        from plone.base.interfaces import INonInstallable
        from zope.component import getAllUtilitiesRegisteredFor

        hidden = [
            name
            for utility in getAllUtilitiesRegisteredFor(INonInstallable)
            for name in getattr(utility, "getNonInstallableProfiles", list)()
        ]
        assert "collective.blicca.referencelist:uninstall" in hidden


class TestUninstall:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.installer = api.addon.get_installer(self.portal)
        self.installer.uninstall_product("collective.blicca.referencelist")

    def test_addon_uninstalled(self):
        assert not self.installer.is_product_installed("collective.blicca.referencelist")

    def test_blockaddon_record_removed(self):
        assert RECORD_NAME not in block_addon_records()

    def test_browserlayer_removed(self):
        from plone.browserlayer import utils

        assert ICollectiveBliccaReferencelistLayer not in utils.registered_layers()
