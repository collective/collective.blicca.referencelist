"""Pytest configuration for collective.blicca.referencelist tests."""

from pytest_plone import fixtures_factory

from collective.blicca.referencelist.testing import FUNCTIONAL_TESTING
from collective.blicca.referencelist.testing import INTEGRATION_TESTING


globals().update(
    fixtures_factory((
        (INTEGRATION_TESTING, "integration"),
        (FUNCTIONAL_TESTING, "functional"),
    ))
)
