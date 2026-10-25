import { WidgetType } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

/**
 * A real checkbox drawn in place of "[ ]" or "[x]". Clicking it edits the
 * text between the brackets, so the Markdown stays the single source.
 */
export class CheckboxWidget extends WidgetType {
  readonly checked: boolean;

  constructor(checked: boolean) {
    super();
    this.checked = checked;
  }

  override eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked;
  }

  override toDOM(view: EditorView): HTMLElement {
    const box = document.createElement("input");

    box.type = "checkbox";
    box.checked = this.checked;
    box.tabIndex = -1;
    box.className = "cm-md-checkbox";
    box.setAttribute("aria-label", this.checked ? "Done" : "To do");

    // Keep the cursor where it is: ticking a box is not editing the line.
    box.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    box.addEventListener("click", (event) => {
      event.preventDefault();

      // Looked up on click, because edits above may have moved the box.
      const open = view.posAtDOM(box);

      view.dispatch({
        changes: {
          from: open + 1,
          insert: this.checked ? " " : "x",
          to: open + 2,
        },
      });
    });

    return box;
  }
}
