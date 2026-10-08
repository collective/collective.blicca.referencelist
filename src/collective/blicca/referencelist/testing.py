"""Testing setup for collective.blicca.referencelist."""

import os

import plone.app.theming
import plone.blicca.auroraeditor
import plone.restapi
import plone.volto
from plone.app.contenttypes.testing import PLONE_APP_CONTENTTYPES_FIXTURE
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import SITE_OWNER_NAME
from plone.app.testing import SITE_OWNER_PASSWORD
from plone.testing.zope import WSGI_SERVER_FIXTURE

import collective.blicca.referencelist
import collective.blicca.referencelist.tests.overrides


class CollectiveBliccaReferencelistLayer(PloneSandboxLayer):
    """Custom testing layer for collective.blicca.referencelist."""

    defaultBases = (PLONE_APP_CONTENTTYPES_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        """Set up Zope."""
        # Compile .po -> .mo so add-on translations load during tests.
        os.environ.setdefault("zope_i18n_compile_mo_files", "true")
        self.loadZCML(package=plone.app.theming)
        self.loadZCML(package=plone.restapi)
        # The host editor: plone.volto's ZCML (never its profile) brings the
        # summary serializer's metadata the way z3c.autoinclude does in a site.
        self.loadZCML(package=plone.volto)
        self.loadZCML(package=plone.blicca.auroraeditor)
        self.loadZCML(package=collective.blicca.referencelist)
        # A theme's own templates, registered on their own layer (the tests'
        # stand-in for a theme overriding one variation).
        self.loadZCML(package=collective.blicca.referencelist.tests.overrides)

    def setUpPloneSite(self, portal):
        """Set up Plone site."""
        self.applyProfile(portal, "plone.restapi:default")
        self.applyProfile(portal, "plone.blicca.auroraeditor:default")
        self.applyProfile(portal, "collective.blicca.referencelist:default")


FIXTURE = CollectiveBliccaReferencelistLayer()

INTEGRATION_TESTING = IntegrationTesting(
    bases=(FIXTURE,),
    name="CollectiveBliccaReferencelistLayer:IntegrationTesting",
)

FUNCTIONAL_TESTING = FunctionalTesting(
    bases=(FIXTURE,),
    name="CollectiveBliccaReferencelistLayer:FunctionalTesting",
)

ACCEPTANCE_TESTING = FunctionalTesting(
    bases=(FIXTURE, WSGI_SERVER_FIXTURE),
    name="CollectiveBliccaReferencelistLayer:AcceptanceTesting",
)


# Test credentials
TEST_USER_ID = "testuser"
TEST_USER_NAME = "testuser"
SITE_OWNER_NAME = SITE_OWNER_NAME
SITE_OWNER_PASSWORD = SITE_OWNER_PASSWORD
