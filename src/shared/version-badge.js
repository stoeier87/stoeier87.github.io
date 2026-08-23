/* global __APP_VERSION__ */
// __APP_VERSION__ is replaced at build time by vite.config.js's `define`,
// reading package.json directly -- see docs/CLAUDE.md's Versioning section
// for how that number gets there.
export function applyVersionBadge() {
  const footer = document.querySelector("footer");
  if (footer) {
    const badge = document.createElement("span");
    badge.textContent = ` · v${__APP_VERSION__}`;
    footer.appendChild(badge);
  }
}

// Kept for tools/validator/index.html, the one page still loading this via a
// plain <script type="module" src="..."> rather than <st-footer>. New call
// sites should import applyVersionBadge() explicitly instead -- see
// src/shared/elements/footer.ts.
applyVersionBadge();
