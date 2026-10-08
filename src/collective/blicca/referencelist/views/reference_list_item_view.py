"""ReferenceListItemView browser view.

The stock item template of the Reference List block
"""
from Products.Five.browser import BrowserView


class ReferenceListItemView(BrowserView):
    """The stock item template of the Reference List block"""

    # If you need to override the template registered in configure.zcml:
    # index = ViewPageTemplateFile("reference_list_item_view.pt")

    def __call__(self):
        return self.index()
