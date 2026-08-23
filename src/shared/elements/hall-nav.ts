/**
 * <st-hall-nav> — the `<nav class="hall-nav">` back-pill + second-pill block
 * repeated on the arcade lobby and the scoreboard. Plain `class extends
 * HTMLElement`, light DOM, no shadow root — same pattern as `<st-page-header>`
 * and `<st-planet-field>` (DECISIONS.md ADR-023).
 *
 * Renders into the existing shared `.hall-nav`/`.pill`/`.arrow`/`.alien`
 * rules (tailwind.css / arcade.css), so it carries no styles of its own —
 * only markup. The alien SVG is identical on every page that used this block,
 * so it's static rather than a prop.
 *
 * Attributes (all read once in connectedCallback):
 * - `nav-label` — aria-label on the <nav>.
 * - `back-href` — href of the back pill.
 * - `back-label` — used as both aria-label and title on the back pill.
 * - `second-href` — href of the second pill.
 * - `second-icon` — Font Awesome class for the second pill's icon, e.g.
 *   "fa-ranking-star" or "fa-gamepad".
 * - `second-icon-class` — extra class on the icon (default "red"; the
 *   scoreboard's arcade-link icon instead used an inline color, which is the
 *   same --color-red value — "red" covers both cases).
 * - `second-label` — text of the second pill.
 */
class HallNavElement extends HTMLElement {
  connectedCallback() {
    const navLabel = this.getAttribute("nav-label") ?? "";
    const backHref = this.getAttribute("back-href") ?? "../";
    const backLabel = this.getAttribute("back-label") ?? "Back to homepage";
    const secondHref = this.getAttribute("second-href") ?? "";
    const secondIcon = this.getAttribute("second-icon") ?? "";
    const secondIconClass = this.getAttribute("second-icon-class") ?? "red";
    const secondLabel = this.getAttribute("second-label") ?? "";
    const maxWidth = this.getAttribute("max-width") === "screen";

    this.innerHTML = `
      <nav class="hall-nav ${maxWidth ? `full-screen` : ""}" aria-label="${navLabel}">
        <a class="pill back" href="${backHref}" aria-label="${backLabel}" title="${backLabel}">
          <span class="arrow"><i class="fa-solid fa-arrow-left-long"></i></span>
          <span class="alien" aria-hidden="true">
            <svg viewBox="0 0 26 26" width="17" height="17">
              <ellipse cx="13" cy="15" rx="8.5" ry="10" fill="#7eb08a" />
              <ellipse cx="9.6" cy="13.4" rx="2.1" ry="3" fill="#0a1018"
                       transform="rotate(-18 9.6 13.4)" />
              <ellipse cx="16.4" cy="13.4" rx="2.1" ry="3" fill="#0a1018"
                       transform="rotate(18 16.4 13.4)" />
              <path class="alien-arm" d="M20.5 16.5 L25 11"
                    stroke="#7eb08a" stroke-width="2.3" stroke-linecap="round" fill="none" />
            </svg>
          </span>
        </a>
        ${
          secondHref && secondIcon && secondLabel
            ? `
        <a class="pill" href="${secondHref}">
          <span class="arrow"><i class="fa-solid ${secondIcon} ${secondIconClass}"></i></span>
          ${secondLabel}
        </a>
        `
            : ""
        }
      </nav>`;
  }
}

export function defineHallNav(): void {
  if (!customElements.get("st-hall-nav")) {
    customElements.define("st-hall-nav", HallNavElement);
  }
}
