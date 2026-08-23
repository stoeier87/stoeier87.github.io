/**
 * <st-game-topbar> — the `<div class="topbar">` back-circle + title badge +
 * SCORE/BEST chrome repeated byte-for-byte across all 9 arcade games (only
 * the title text ever varied). Plain `class extends HTMLElement`, light DOM,
 * no shadow root — same pattern as `<st-page-header>`/`<st-hall-nav>`, and
 * lives alongside them here rather than in src/arcade/shared/ (which holds
 * arcade-only CSS, not elements).
 *
 * Renders into the existing shared `.topbar`/`.pill`/`.back-circle`/`.badge`
 * /`.stat` rules (tailwind.css, src/arcade/shared/game-hud.css), so it
 * carries no styles of its own — only markup.
 *
 * IMPORTANT: every game's own JS reaches its score/best elements via
 * `document.getElementById("score")` / `getElementById("best")` directly —
 * light DOM means those ids are still found by a plain document-wide
 * getElementById the same as if the markup were written inline, so no game
 * JS needs to change. Back/scoreboard hrefs are always the same two levels
 * up (every game lives at src/arcade/<name>/index.html), so they're not
 * props — only the title varies.
 *
 * Attribute:
 * - `game-title` — the badge text, e.g. "ISS DOCKING". (Not `title` —
 *   that's a global HTML attribute and would show a hover tooltip instead.)
 */
class GameTopbarElement extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("game-title") ?? "";

    this.innerHTML = `
      <div class="topbar">
        <div class="topbar-group">
          <a href="../../arcade/" class="pill back-circle" aria-label="Back to arcade" title="Back to arcade">&larr;</a>
          <div class="pill badge">
            <span class="beacon"></span>
            <span class="badge-name">${title}</span>
          </div>
        </div>
        <div class="topbar-group">
          <div class="pill stat">SCORE <strong id="score">0</strong></div>
          <a class="pill stat" href="../../scoreboard/">BEST <strong id="best" class="best-val">0</strong></a>
        </div>
      </div>`;
  }
}

export function defineGameTopbar(): void {
  if (!customElements.get("st-game-topbar")) {
    customElements.define("st-game-topbar", GameTopbarElement);
  }
}
