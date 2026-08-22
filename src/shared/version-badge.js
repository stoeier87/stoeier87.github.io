/* global __APP_VERSION__ */
// __APP_VERSION__ is replaced at build time by vite.config.js's `define`,
// reading package.json directly -- see docs/CLAUDE.md's Versioning section
// for how that number gets there.
const footer = document.querySelector("footer");
if (footer) {
  const badge = document.createElement("span");
  badge.textContent = ` · v${__APP_VERSION__}`;
  footer.appendChild(badge);
}
