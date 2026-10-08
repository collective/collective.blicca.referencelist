"""The stock list template (``@@aurora-referencelist``).

A headline, then every referenced item through its item template. A theme
replaces it for one variation by registering ``aurora-referencelist-<variation>``
on its own browser layer, subclassing ``BaseReferenceListView``.
"""

from collective.blicca.referencelist.views.base import BaseReferenceListView


class ReferenceListView(BaseReferenceListView):
    """The stock list: headline and the rendered items."""
