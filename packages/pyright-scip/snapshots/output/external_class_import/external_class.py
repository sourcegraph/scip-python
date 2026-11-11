# < definition scip-python python snapshot-util 0.1 external_class/__init__:

import widgets
#      ^^^^^^^ reference  widgets 1.2.3 widgets/__init__:
from widgets import Widget
#    ^^^^^^^ reference  widgets 1.2.3 widgets/__init__:
#                   ^^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#


def render(name: str, width: int) -> str:
#   ^^^^^^ definition  snapshot-util 0.1 external_class/render().
#          ^^^^ definition  snapshot-util 0.1 external_class/render().(name)
#                ^^^ reference  python-stdlib 3.11 builtins/str#
#                     ^^^^^ definition  snapshot-util 0.1 external_class/render().(width)
#                            ^^^ reference  python-stdlib 3.11 builtins/int#
#                                    ^^^ reference  python-stdlib 3.11 builtins/str#
    widget: widgets.Widget = widgets.Widget(name, width=width)
#   ^^^^^^ definition local 0
#           ^^^^^^^ reference  widgets 1.2.3 widgets/__init__:
#                   ^^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#
#                            ^^^^^^^ reference  widgets 1.2.3 widgets/__init__:
#                                    ^^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#
#                                           ^^^^ reference  snapshot-util 0.1 external_class/render().(name)
#                                                 ^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#__init__().(width)
#                                                       ^^^^^ reference  snapshot-util 0.1 external_class/render().(width)
    try:
        return widgets.Widget.render(widget, prefix="> ")
#              ^^^^^^^ reference  widgets 1.2.3 widgets/__init__:
#                      ^^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#
#                             ^^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#render().
#                                    ^^^^^^ reference local 0
#                                            ^^^^^^ reference  widgets 1.2.3 `widgets.models`/Widget#render().(prefix)
    except widgets.WidgetError:
#          ^^^^^^^ reference  widgets 1.2.3 widgets/__init__:
#                  ^^^^^^^^^^^ reference  widgets 1.2.3 `widgets.models`/WidgetError#
        return ""

