"""Setup handlers for collective.blicca.referencelist."""

from plone.base.interfaces import INonInstallable
from zope.interface import implementer


@implementer(INonInstallable)
class HiddenProfiles:
    """Hidden profiles from the Plone add-ons control panel."""

    def getNonInstallableProfiles(self):
        """Return list of profiles that should not be available for install."""
        return [
            "collective.blicca.referencelist:uninstall",
            "collective.blicca.referencelist.upgrades:1001",
            "collective.blicca.referencelist.upgrades:1002",
            "collective.blicca.referencelist.upgrades:1003",
        ]


def uninstall(context):
    """Uninstall script."""
    # Do something on uninstall if needed
    pass
