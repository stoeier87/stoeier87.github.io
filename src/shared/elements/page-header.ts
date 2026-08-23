/**
 * <st-page-header> — the `<header><h1>…</h1><p class="sub">…</p></header>`
 * block repeated (identically shaped) on the arcade lobby and the scoreboard.
 * Plain `class extends HTMLElement`, light DOM, no shadow root, no base class
 * — same pattern as `<st-planet-field>` (DECISIONS.md ADR-023).
 *
 * Renders into `tailwind.css`'s existing shared `header`/`.red`/`.sub`/`header
 * h1 i` rules, so it carries no styles of its own — only markup.
 *
 * Attributes (all read once in connectedCallback; this element never changes
 * after mount, so there's no need for observedAttributes/reactive setters):
 * - `heading` — plain part of the h1 text, before the accent span.
 * - `accent` — red part of the h1 text (`.red`), after `heading`.
 * - `subtitle` — the `.sub` paragraph text.
 * - `icon` — optional Font Awesome class, e.g. "fa-ranking-star".
 * - `icon-hidden` — boolean attribute; renders the icon with `.hidden` (kept
 *   for parity with the scoreboard's current markup, which mounts the icon
 *   hidden rather than omitting it).
 */
class PageHeaderElement extends HTMLElement {
  connectedCallback() {
    const heading = this.getAttribute("heading") ?? "";
    const accent = this.getAttribute("accent") ?? "";
    const subtitle = this.getAttribute("subtitle") ?? "";
    const icon = this.getAttribute("icon");
    const iconHidden = this.hasAttribute("icon-hidden");

    const iconHtml = icon
      ? `<i class="fa-solid ${icon}${iconHidden ? " hidden" : ""}"></i> `
      : "";
    const accentHtml = accent ? ` <span class="red">${accent}</span>` : "";

    this.innerHTML = `
      <header>
        <h1>${iconHtml}${heading}${accentHtml}</h1>
        <p class="sub">${subtitle}</p>
      </header>`;
  }
}

export function definePageHeader(): void {
  if (!customElements.get("st-page-header")) {
    customElements.define("st-page-header", PageHeaderElement);
  }
}
