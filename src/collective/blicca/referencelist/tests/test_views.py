"""The block's public renderer: dispatch, variations, and the template chains."""

import re

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor.browser.rendering.base import BlockDispatchMixin
from plone.namedfile.file import NamedBlobImage
from plone.uuid.interfaces import IUUID
from zope.component import getMultiAdapter
from zope.interface import alsoProvides
from zope.interface import noLongerProvides

from collective.blicca.referencelist.blocks import REFERENCELIST_BLOCK_TYPE
from collective.blicca.referencelist.interfaces import ICollectiveBliccaReferencelistLayer
from collective.blicca.referencelist.tests.overrides.interfaces import IReferenceListOverridesLayer


VIEW_NAME = f"aurora-block-{REFERENCELIST_BLOCK_TYPE}"

# A valid 1x1 transparent PNG.
PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xff"
    b"\xff?\x03\x00\x08\xfc\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND"
    b"\xaeB`\x82"
)


class RenderTestCase:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, ICollectiveBliccaReferencelistLayer)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )
        self.page = api.content.create(
            container=self.portal,
            type="Document",
            id="page",
            title="A page",
            description="Page description",
        )
        self.news = api.content.create(
            container=self.portal,
            type="News Item",
            id="news",
            title="The scoop",
            description="News description",
        )
        self.news.image = NamedBlobImage(data=PNG, filename="scoop.png")
        self.news.reindexObject()
        self.event = api.content.create(
            container=self.portal, type="Event", id="event", title="The event"
        )

    def refs(self, *objs):
        return [{"@id": obj.absolute_url(), "UID": IUUID(obj)} for obj in objs]

    def render(self, context=None, **data):
        view = getMultiAdapter((context or self.doc, self.request), name=VIEW_NAME)
        view.block_type = REFERENCELIST_BLOCK_TYPE
        view.data = dict(data, **{"@type": REFERENCELIST_BLOCK_TYPE})
        return view()


class TestDispatch(RenderTestCase):
    def test_view_name_is_the_dispatch_convention(self):
        assert VIEW_NAME == "aurora-block-referencelist"
        view = getMultiAdapter((self.doc, self.request), name=VIEW_NAME)
        assert view.__name__ == VIEW_NAME

    def test_the_dispatcher_finds_it_rather_than_the_default(self):
        dispatcher = BlockDispatchMixin()
        dispatcher.context = self.doc
        dispatcher.request = self.request
        markup = dispatcher.render_block_data({
            "@type": REFERENCELIST_BLOCK_TYPE,
            "references": self.refs(self.page),
        })
        assert "block-unrendered" not in markup
        assert markup.lstrip().startswith('<div class="referencelist variation-default">')

    def test_renders_on_the_site_root_too(self):
        markup = self.render(context=self.portal, references=self.refs(self.page))
        assert "A page" in markup

    def test_reuses_items_the_transformer_derived(self):
        markup = self.render(
            references=[],
            items=[{"@id": "http://nohost/plone/x", "title": "Derived", "@type": "Document"}],
        )
        assert "Derived" in markup
        assert 'href="/plone/x"' in markup


class TestAnatomy(RenderTestCase):
    def test_items_follow_the_stored_order(self):
        markup = self.render(references=self.refs(self.news, self.page))
        assert markup.index("The scoop") < markup.index("A page")
        markup = self.render(references=self.refs(self.page, self.news))
        assert markup.index("A page") < markup.index("The scoop")

    def test_default_variation_is_a_stack_without_pictures(self):
        markup = self.render(references=self.refs(self.news, self.page))
        assert '<div class="referencelist variation-default">' in markup
        assert markup.count('<article class="item">') == 2
        assert "<picture" not in markup
        assert '<a href="/plone/news">The scoop</a>' in markup
        assert "<p>News description</p>" in markup

    def test_summary_variation_shows_cards_with_the_picture(self):
        markup = self.render(variation="summary", references=self.refs(self.news, self.page))
        assert '<div class="referencelist variation-summary">' in markup
        assert markup.count('<article class="item summary">') == 2
        # The news item has a picture, the page has none.
        assert markup.count("<picture") == 1
        # picture > img, with the AVIF twin (where plone.namedfile offers one) in front
        assert re.search(r'<picture>\s*(<source type="image/avif"[^>]*>\s*)?<img\b', markup)
        assert 'alt=""' in markup
        assert 'loading="lazy"' in markup
        assert "/plone/news/@@images/image" in markup

    def test_grid_variation_lays_the_same_cards_out(self):
        markup = self.render(variation="grid", references=self.refs(self.news))
        assert '<div class="referencelist variation-grid">' in markup
        assert '<article class="item summary">' in markup
        assert "<picture" in markup

    def test_a_grid_card_asks_for_a_column_wide_picture(self):
        summary = self.render(
            variation="summary", blockWidth="layout", references=self.refs(self.news)
        )
        grid = self.render(variation="grid", blockWidth="layout", references=self.refs(self.news))
        assert 'sizes="(min-width: 1440px) 1440px, 100vw"' in summary
        assert (
            'sizes="(min-width: 1440px) 458px, (min-width: 60rem) 33vw, '
            '(min-width: 34rem) 50vw, 100vw"'
        ) in grid

    def test_unknown_variation_renders_as_default(self):
        markup = self.render(variation="cards", references=self.refs(self.page))
        assert "variation-default" in markup
        assert '<article class="item">' in markup

    def test_headline_and_heading_levels(self):
        markup = self.render(headline="Related", references=self.refs(self.page))
        assert '<h2 class="headline">Related</h2>' in markup
        assert "<h3>" in markup and "<h2>" not in markup.replace('<h2 class="headline">', "")
        markup = self.render(headline="Related", headlineTag="h3", references=self.refs(self.page))
        assert '<h3 class="headline">Related</h3>' in markup
        assert "<h4>" in markup
        markup = self.render(references=self.refs(self.page))
        assert "headline" not in markup
        assert "<h2>" in markup

    def test_a_headline_of_whitespace_is_no_headline(self):
        markup = self.render(headline="   ", references=self.refs(self.page))
        assert "headline" not in markup
        assert "<h2>" in markup

    def test_an_empty_list_renders_the_root_alone(self):
        markup = re.sub(r"\s+", "", self.render(references=[]))
        assert markup == '<divclass="referencelistvariation-default"></div>'
        markup = self.render(headline="Related", references=[])
        assert '<h2 class="headline">Related</h2>' in markup
        assert "referencelist-items" not in markup

    def test_a_dangling_reference_is_skipped(self):
        references = self.refs(self.page) + [{"@id": "../resolveuid/gone", "UID": "gone"}]
        markup = self.render(references=references)
        assert markup.count("<article") == 1
        assert "gone" not in markup

    def test_escapes_what_the_catalog_holds(self):
        self.page.setTitle("<script>alert(1)</script>")
        self.page.reindexObject()
        markup = self.render(references=self.refs(self.page))
        assert "<script>" not in markup
        assert "&lt;script&gt;" in markup


class TestLinkPolicy(RenderTestCase):
    def test_an_absolute_url_becomes_a_site_relative_path(self):
        markup = self.render(references=self.refs(self.page))
        assert 'href="/plone/page"' in markup

    @pytest.mark.parametrize("target", ["javascript:alert(1)", "data:text/html,x"])
    def test_an_unsafe_target_loses_its_anchor_href(self, target):
        markup = self.render(items=[{"@id": target, "title": "Trap"}])
        assert "<a>Trap</a>" in markup
        assert "javascript" not in markup
        assert "data:" not in markup


class TestTemplateOverrides(RenderTestCase):
    """A theme's templates, registered on its own layer, win per name."""

    @pytest.fixture(autouse=True)
    def _theme(self, _setup):
        alsoProvides(self.request, IReferenceListOverridesLayer)

    def test_the_list_template_of_one_variation(self):
        markup = self.render(
            variation="summary", headline="Hi", references=self.refs(self.page, self.news)
        )
        assert markup.startswith(
            '<section class="referencelist variation-summary theme-summary" '
            'data-count="2" data-headline="Hi">'
        )
        # the theme's list still renders the stock cards
        assert markup.count('<article class="item summary">') == 2

    def test_other_variations_keep_the_stock_list_template(self):
        for variation in ("default", "grid"):
            markup = self.render(variation=variation, references=self.refs(self.page))
            assert "theme-summary" not in markup
            assert f'<div class="referencelist variation-{variation}">' in markup

    def test_the_item_template_of_one_variation(self):
        markup = self.render(variation="grid", references=self.refs(self.page, self.news))
        assert '<div class="item theme-grid-card" data-index="0" data-total="2">' in markup
        assert '<div class="item theme-grid-card" data-index="1" data-total="2">' in markup
        assert "<article" not in markup
        markup = self.render(variation="summary", references=self.refs(self.page))
        assert "theme-grid-card" not in markup

    def test_a_types_card_for_one_variation(self):
        markup = self.render(references=self.refs(self.news, self.page))
        assert '<article class="item theme-news-default">' in markup
        assert markup.count('<article class="item">') == 1
        markup = self.render(variation="summary", references=self.refs(self.news))
        assert "theme-news-default" not in markup
        assert '<article class="item summary">' in markup

    def test_a_types_card_for_every_variation(self):
        for variation in ("default", "summary"):
            markup = self.render(variation=variation, references=self.refs(self.event))
            assert f'<article class="item theme-event" data-variation="{variation}"' in markup
            assert 'data-title-tag="h2"' in markup
        markup = self.render(variation="summary", headline="Soon", references=self.refs(self.event))
        assert 'data-title-tag="h3"' in markup

    def test_the_variations_card_outranks_a_types_card(self):
        markup = self.render(variation="grid", references=self.refs(self.event))
        assert "theme-grid-card" in markup
        assert "theme-event" not in markup

    def test_without_the_layer_everything_is_stock(self):
        noLongerProvides(self.request, IReferenceListOverridesLayer)
        for variation in ("default", "summary", "grid"):
            markup = self.render(variation=variation, references=self.refs(self.news, self.event))
            assert "theme-" not in markup
            assert markup.count("<article") == 2
