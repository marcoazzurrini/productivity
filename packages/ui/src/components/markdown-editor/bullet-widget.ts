import { WidgetType } from "@codemirror/view";

/** The dot drawn in place of "-", "*" or "+" at the start of a list item. */
export class BulletWidget extends WidgetType {
  // oxlint-disable-next-line class-methods-use-this -- CodeMirror calls it on the instance.
  override eq(): boolean {
    return true;
  }

  // oxlint-disable-next-line class-methods-use-this -- CodeMirror calls it on the instance.
  override toDOM(): HTMLElement {
    const bullet = document.createElement("span");

    bullet.className = "cm-md-bullet";
    bullet.setAttribute("aria-hidden", "true");

    return bullet;
  }
}
