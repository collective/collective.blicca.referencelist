"""ReferenceListBlockView browser view.

The Reference List block's public renderer
"""
from Products.Five.browser import BrowserView


class ReferenceListBlockView(BrowserView):
    """The Reference List block's public renderer"""

    # If you need to override the template registered in configure.zcml:
    # index = ViewPageTemplateFile("reference_list_block_view.pt")

    def __call__(self):
        return self.index()
