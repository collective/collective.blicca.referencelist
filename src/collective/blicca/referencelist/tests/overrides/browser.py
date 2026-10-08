"""The fixture theme's templates, written against the promised base classes."""

from html import escape

from collective.blicca.referencelist.rendering import BaseReferenceListItemView
from collective.blicca.referencelist.rendering import BaseReferenceListView


class ThemeSummaryListView(BaseReferenceListView):
    """``aurora-referencelist-summary``: the theme's own summary list."""

    def __call__(self):
        items = "".join(self.rendered_items)
        return (
            f'<section class="{escape(self.css_class)} theme-summary" '
            f'data-count="{len(self.items or [])}" '
            f'data-headline="{escape(self.headline)}">{items}</section>'
        )


class ThemeGridItemView(BaseReferenceListItemView):
    """``aurora-referencelist-item-grid``: the theme's card for the grid."""

    def __call__(self):
        return (
            f'<div class="item theme-grid-card" data-index="{self.position}" '
            f'data-total="{self.total}">'
            f'<a href="{escape(self.url or "")}">{escape(self.title)}</a></div>'
        )


class ThemeNewsDefaultItemView(BaseReferenceListItemView):
    """``aurora-referencelist-item-default-News Item``: a type's card for one variation."""

    def __call__(self):
        return (
            f'<article class="item theme-news-default">'
            f'<a href="{escape(self.url or "")}">{escape(self.title)}</a></article>'
        )


class ThemeEventItemView(BaseReferenceListItemView):
    """``aurora-referencelist-item-Event``: a type's card for every variation."""

    def __call__(self):
        return (
            f'<article class="item theme-event" data-variation="{escape(self.variation)}" '
            f'data-title-tag="{escape(self.title_tag)}">'
            f'<a href="{escape(self.url or "")}">{escape(self.title)}</a></article>'
        )
