"""The promised import path a theme writes its templates against."""

from collective.blicca.referencelist import rendering


class TestPromisedImports:
    def test_all_names_are_stated_and_importable(self):
        assert sorted(rendering.__all__) == [
            "BaseReferenceListItemView",
            "BaseReferenceListView",
            "CARD_VARIATIONS",
            "DEFAULT_VARIATION",
            "REFERENCELIST_BLOCK_TYPE",
            "VARIATIONS",
            "item_view_names",
            "list_view_names",
        ]
        for name in rendering.__all__:
            assert getattr(rendering, name) is not None

    def test_the_vocabulary(self):
        assert rendering.REFERENCELIST_BLOCK_TYPE == "referencelist"
        assert rendering.VARIATIONS == ("default", "summary", "grid")
        assert rendering.DEFAULT_VARIATION == "default"
        assert rendering.CARD_VARIATIONS == ("summary", "grid")

    def test_the_list_template_chain(self):
        assert rendering.list_view_names("summary") == [
            "aurora-referencelist-summary",
            "aurora-referencelist",
        ]

    def test_the_item_template_chain(self):
        assert rendering.item_view_names("grid", "News Item") == [
            "aurora-referencelist-item-grid-News Item",
            "aurora-referencelist-item-grid",
            "aurora-referencelist-item-News Item",
            "aurora-referencelist-item",
        ]
        assert rendering.item_view_names("default", "") == [
            "aurora-referencelist-item-default",
            "aurora-referencelist-item",
        ]

    def test_the_base_classes_carry_the_stamped_attributes(self):
        assert rendering.BaseReferenceListView.data is None
        assert rendering.BaseReferenceListView.items is None
        item = rendering.BaseReferenceListItemView
        assert item.item is None
        assert item.data is None
        assert item.variation == "default"
        assert item.title_tag == "h3"
        assert item.position == 0
        assert item.total == 0
