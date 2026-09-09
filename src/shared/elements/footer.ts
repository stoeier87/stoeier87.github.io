import { applyVersionBadge } from "../version-badge.js";
import { CONTACT_LINKS } from "./contact-links.ts";

/**
 * <st-footer> — the contact pills (email, LinkedIn, Instagram, Spotify) plus
 * the servicedesign.dk mark and the build-version badge, repeated
 * byte-identical on the homepage, arcade lobby, scoreboard and about-me
 * (docs/CLAUDE.md rule 8's footer cluster). Plain `class extends
 * HTMLElement`, light DOM, no shadow root — same pattern as `<st-hall-nav>`
 * and `<st-page-header>`.
 *
 * The contact `<li>` markup loops over `CONTACT_LINKS` (contact-links.ts)
 * instead of four hand-copied pills. `id="contact"` and the `.contact`/
 * `nav.contact` class names are load-bearing: index.css's homepage-only
 * scroll rig (`html.js-anim .contact` starting hidden, script.js's
 * `getElementById("contact")` fade/slide-in tied to scroll position) reaches
 * into whatever `<st-footer>` renders by those selectors, not by DOM
 * position. On the other three pages, which never add `.js-anim` via that
 * rig, the same markup just renders as a static row of pills — no reveal
 * animation, none needed.
 *
 * Wraps a real `<footer>` rather than trying to replace itself with one
 * (light-DOM custom elements don't unwrap cleanly) — `applyVersionBadge()`'s
 * own `document.querySelector("footer")` finds it regardless of the nesting.
 *
 * No props: every current usage is identical. `tools/validator/index.html`'s
 * footer is genuinely different copy (a copyright line, no servicedesign.dk
 * link) and stays its own hand-written markup rather than being forced
 * through this with a variant flag.
 */
class FooterElement extends HTMLElement {
  connectedCallback(): void {
    const contactPills = CONTACT_LINKS.map(
      (link) => `
      <a href="${link.href}"${link.external ? ' target="_blank" rel="noopener"' : ""}>
              <li class="pill">
                  <span class="arrow"><i class="${link.iconStyle} ${link.icon} red"></i></span>
                  <span class="pill-label">${link.label}</span>
                  </li>
            </a>`,
    ).join("");

    this.innerHTML = `
      <footer>
        <nav class="contact prevent-select" id="contact" aria-label="Kontakt">
          <ul class="pills">${contactPills}
          </ul>
        </nav>
        <a href="https://servicedesign.dk" target="_blank" rel="noopener">servicedesign.dk</a>
      </footer>
    `;
    applyVersionBadge();
  }
}

export function defineFooter(): void {
  if (!customElements.get("st-footer")) {
    customElements.define("st-footer", FooterElement);
  }
}
