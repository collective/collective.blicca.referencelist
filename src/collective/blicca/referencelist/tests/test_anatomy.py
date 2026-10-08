"""The shared anatomy fixture, held against the server renderer.

``tests/anatomy-cases.json`` at the repository root is read by this suite
and by ``bundle-src/test/anatomy.test.tsx`` alike, so the Chameleon
templates and the React view cannot drift apart unnoticed: one
scope-wrapped stylesheet dresses both.
"""

import json
import re
from pathlib import Path

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from zope.component import getMultiAdapter
from zope.interface import alsoProvides

from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE
from collective.blicca.referencelist.interfaces import ICollectiveBliccaReferencelistLayer


FIXTURE = Path(__file__).resolve().parents[5] / "tests" / "anatomy-cases.json"
CASES = json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]

_AVIF_SOURCE = re.compile(r'<source\b[^>]*\btype="image/avif"[^>]*/?>\s*', re.I)
_TAG = re.compile(r"<([a-z0-9]+)((?:\s+[^\s=>]+(?:=\"[^\"]*\")?)*)\s*/?>", re.I)
_CLASS = re.compile(r'class="[^"]*"')


def skeleton(html):
    """Tags, ``class`` attributes and text; nothing else."""

    def one(match):
        tag, attributes = match.groups()
        klass = _CLASS.search(attributes or "")
        return f"<{tag} {klass.group(0)}>" if klass else f"<{tag}>"

    html = _AVIF_SOURCE.sub("", html)
    html = _TAG.sub(one, html)
    return re.sub(r">\s+<", "><", html).strip()


class TestAnatomy:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, ICollectiveBliccaReferencelistLayer)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )

    def render(self, data):
        view = getMultiAdapter(
            (self.doc, self.request), name=f"aurora-block-{REFERENCELIST_BLOCK_TYPE}"
        )
        view.block_type = REFERENCELIST_BLOCK_TYPE
        view.data = dict(data, **{"@type": REFERENCELIST_BLOCK_TYPE})
        return view()

    def test_the_fixture_is_well_formed(self):
        assert len(CASES) >= 7
        assert len({case["name"] for case in CASES}) == len(CASES)
        assert all(case["note"] for case in CASES)

    @pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
    def test_matches_the_cross_renderer_skeleton(self, case):
        assert skeleton(self.render(case["data"])) == skeleton(case["html"])

    def test_the_skeleton_rule_keeps_classes_and_text_only(self):
        assert skeleton('<a href="/x" class="c">T</a>\n <img src="/p" alt="" />') == (
            '<a class="c">T</a><img>'
        )
