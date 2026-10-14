"""Reading stored references and resolving them to catalog summaries."""

import pytest
from plone import api
from plone.app.testing import logout
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.uuid.interfaces import IUUID

from collective.blicca.referencelist.references import reference_key
from collective.blicca.referencelist.references import reference_uid
from collective.blicca.referencelist.references import resolve_references
from collective.blicca.referencelist.references import stored_references


class TestStoredReferences:
    def test_accepts_dicts_with_an_id_and_bare_strings(self):
        assert stored_references([{"@id": "/a", "title": "A"}, " /b ", {"@id": ""}, 3, None]) == [
            {"@id": "/a", "title": "A"},
            {"@id": "/b"},
        ]

    @pytest.mark.parametrize("value", [None, "", "/a", {"@id": "/a"}, 7])
    def test_anything_but_a_list_is_empty(self, value):
        assert stored_references(value) == []

    def test_the_key_is_the_uid_else_the_id(self):
        assert reference_key({"@id": "/a", "UID": "u1"}) == "u1"
        assert reference_key({"@id": "/a"}) == "/a"
        assert reference_key({"@id": "/a", "UID": ""}) == "/a"


class ResolutionTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.page = api.content.create(
            container=self.portal, type="Document", id="page", title="A page"
        )
        self.news = api.content.create(
            container=self.portal,
            type="News Item",
            id="news",
            title="The scoop",
            description="News description",
        )


class TestReferenceUid(ResolutionTestCase):
    def test_from_the_stored_uid(self):
        assert reference_uid(self.portal, {"@id": "/nowhere", "UID": "u1"}) == "u1"

    def test_from_a_resolveuid_id(self):
        uid = IUUID(self.page)
        assert reference_uid(self.portal, {"@id": f"../resolveuid/{uid}"}) == uid
        assert reference_uid(self.portal, {"@id": f"../../resolveuid/{uid}/"}) == uid

    def test_from_an_absolute_url_and_from_a_path(self):
        uid = IUUID(self.page)
        assert reference_uid(self.portal, {"@id": self.page.absolute_url()}) == uid
        assert reference_uid(self.portal, {"@id": "/plone/page"}) == uid
        assert reference_uid(self.portal, {"@id": "page"}) == uid

    @pytest.mark.parametrize(
        "at_id", ["https://example.org/x", "/plone/gone", "", "mailto:a@b.c", None]
    )
    def test_nothing_in_this_site_is_none(self, at_id):
        assert reference_uid(self.portal, {"@id": at_id}) is None


class TestResolveReferences(ResolutionTestCase):
    def _refs(self, *objs):
        return [{"@id": obj.absolute_url(), "UID": IUUID(obj)} for obj in objs]

    def test_items_follow_the_stored_order(self):
        items, missing = resolve_references(
            self.portal, self.request, self._refs(self.news, self.page)
        )
        assert [item["title"] for item in items] == ["The scoop", "A page"]
        assert missing == []
        items, _ = resolve_references(self.portal, self.request, self._refs(self.page, self.news))
        assert [item["title"] for item in items] == ["A page", "The scoop"]

    def test_items_are_full_summaries(self):
        items, _ = resolve_references(self.portal, self.request, self._refs(self.news))
        (item,) = items
        assert item["@type"] == "News Item"
        assert item["UID"] == IUUID(self.news)
        assert item["@id"] == self.news.absolute_url()
        assert item["description"] == "News description"
        # ``_all`` metadata: the keys the card renderers read are present.
        assert "image_scales" in item
        assert "review_state" in item

    def test_items_carry_the_view_action_flag(self):
        image = api.content.create(container=self.portal, type="Image", id="pic", title="Pic")
        items, _ = resolve_references(self.portal, self.request, self._refs(image, self.page))
        assert [item["use_view_action_in_listings"] for item in items] == [True, False]

    def test_a_dangling_reference_lands_in_missing(self):
        references = self._refs(self.page) + [{"@id": "../resolveuid/gone", "UID": "gone"}]
        items, missing = resolve_references(self.portal, self.request, references)
        assert [item["title"] for item in items] == ["A page"]
        assert missing == ["../resolveuid/gone"]

    def test_a_reference_without_uid_resolves_through_its_id(self):
        uid = IUUID(self.page)
        items, missing = resolve_references(
            self.portal, self.request, [{"@id": f"../resolveuid/{uid}"}, "/plone/news"]
        )
        assert [item["title"] for item in items] == ["A page", "The scoop"]
        assert missing == []

    def test_content_the_user_may_not_see_is_missing(self):
        # Private content: an anonymous visitor's catalog query cannot see it.
        logout()
        items, missing = resolve_references(self.portal, self.request, self._refs(self.page))
        assert items == []
        assert missing == [self.page.absolute_url()]

    def test_the_request_form_is_left_as_found(self):
        self.request.form["metadata_fields"] = "title"
        resolve_references(self.portal, self.request, self._refs(self.page))
        assert self.request.form["metadata_fields"] == "title"
        del self.request.form["metadata_fields"]
        resolve_references(self.portal, self.request, self._refs(self.page))
        assert "metadata_fields" not in self.request.form

    def test_nothing_stored_resolves_to_nothing(self):
        assert resolve_references(self.portal, self.request, None) == ([], [])
        assert resolve_references(self.portal, self.request, []) == ([], [])
