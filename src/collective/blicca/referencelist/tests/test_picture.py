"""The card picture's ladder: the variant and ``sizes`` follow width and variation."""

import re

import pytest
from plone.namedfile.picture import get_picture_variants
from plone.namedfile.picture import Img2PictureTag

from collective.blicca.referencelist.picture import container_width
from collective.blicca.referencelist.picture import grid_columns
from collective.blicca.referencelist.picture import rendered_width
from collective.blicca.referencelist.picture import responsive_image
from collective.blicca.referencelist.picture import sizes
from collective.blicca.referencelist.picture import variant_for


class TestPureGeometry:
    @pytest.mark.parametrize(
        "width,expected",
        [
            (None, 940),
            ("narrow", 620),
            ("default", 940),
            ("layout", 1440),
            ("full", None),
            ("x", 940),
        ],
    )
    def test_container_width(self, width, expected):
        assert container_width({"blockWidth": width} if width else {}) == expected

    @pytest.mark.parametrize("width,columns", [(620, 2), (940, 2), (1440, 3), (None, 3), (500, 1)])
    def test_grid_columns(self, width, columns):
        assert grid_columns(width) == columns

    def test_rendered_width_is_the_block_for_cards_and_a_column_for_the_grid(self):
        assert rendered_width({"blockWidth": "layout"}, "summary") == 1440
        assert rendered_width({"blockWidth": "layout"}, "grid") == 458
        assert rendered_width({"blockWidth": "default"}, "grid") == 454
        assert rendered_width({"blockWidth": "full"}, "grid") is None
        assert rendered_width({"variation": "grid", "blockWidth": "narrow"}) == 294

    def test_sizes_for_cards(self):
        assert sizes({"blockWidth": "narrow"}, "summary") == "(min-width: 620px) 620px, 100vw"
        assert sizes({"blockWidth": "full"}, "summary") == "100vw"
        assert sizes({}, "default") == "(min-width: 940px) 940px, 100vw"

    def test_sizes_for_the_grid(self):
        assert sizes({"blockWidth": "layout"}, "grid") == (
            "(min-width: 1440px) 458px, (min-width: 60rem) 33vw, (min-width: 34rem) 50vw, 100vw"
        )
        assert sizes({"blockWidth": "default"}, "grid") == (
            "(min-width: 940px) 454px, (min-width: 34rem) 50vw, 100vw"
        )
        assert sizes({"blockWidth": "full"}, "grid") == (
            "(min-width: 60rem) 33vw, (min-width: 34rem) 50vw, 100vw"
        )


class TestVariantFromTheSiteRegistry:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.variants = get_picture_variants()

    def _max_width(self, name):
        sourceset = self.variants[name]["sourceset"]
        return Img2PictureTag().get_scale_width(sourceset[-1]["scale"])

    def test_the_smallest_variant_covering_the_rendered_width(self):
        for block_width in ("narrow", "default", "layout"):
            data = {"blockWidth": block_width}
            name = variant_for(data, "summary")
            assert self._max_width(name) >= rendered_width(data, "summary") or name == max(
                self.variants, key=self._max_width
            )

    def test_a_grid_card_takes_a_smaller_variant_than_a_summary_card(self):
        data = {"blockWidth": "layout"}
        assert self._max_width(variant_for(data, "grid")) <= self._max_width(
            variant_for(data, "summary")
        )
        assert self._max_width(variant_for(data, "grid")) >= 458

    def test_no_variants_means_no_ladder(self):
        assert variant_for({}, "summary", variants={}) is None

    def test_responsive_image_carries_the_ladder_and_its_avif_twin(self):
        source = {"src": "/plone/pic/@@images/image-1600-abc.png", "width": 1600, "height": 900}
        image = responsive_image(source, {"blockWidth": "default"}, "summary")
        assert image["width"] == 1600
        assert image["src"].startswith("/plone/pic/@@images/image/")
        assert re.search(r"/plone/pic/@@images/image/\w+ \d+w", image["srcset"])
        assert image["sizes"] == "(min-width: 940px) 940px, 100vw"
        # The AVIF twin mirrors what plone.namedfile itself puts in front of a
        # picture's sources: present exactly when the site's namedfile offers it.
        name = variant_for({"blockWidth": "default"}, "summary", self.variants)
        tag = Img2PictureTag().create_picture_tag(
            self.variants[name]["sourceset"], {"src": source["src"]}, lazy=False
        )
        if tag.find("source", type="image/avif") is None:
            assert image["avif_srcset"] is None
        else:
            assert ".avif" in image["avif_srcset"]
            assert image["avif_srcset"].count(" ") == image["srcset"].count(" ")
