import widgets
from widgets import Widget


def render(name: str, width: int) -> str:
    widget: widgets.Widget = widgets.Widget(name, width=width)
    try:
        return widgets.Widget.render(widget, prefix="> ")
    except widgets.WidgetError:
        return ""
