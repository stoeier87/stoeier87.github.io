/**
 * <st-game-over> — the `#gameOver.gameover > .gameover-card` wrapper chrome
 * repeated across all 9 arcade games: a title, an optional per-game score
 * breakdown, a "Press R or Tap" sub-line, and a restart button. Plain
 * `class extends HTMLElement`, light DOM, no shadow root — same pattern as
 * `<st-page-header>`/`<st-hall-nav>`/`<st-game-topbar>`.
 *
 * The host markup still carries `id="gameOver" class="gameover"` on the
 * `<st-game-over>` tag itself — that's what every game's JS already toggles
 * via `document.getElementById("gameOver").classList.add("show")`, and it's
 * what tailwind.css's `.gameover`/`.gameover.show` rules select on, so this
 * component renders no wrapper of its own and needs no new CSS.
 *
 * Each game's own score breakdown (a `.final-rows` block, or nothing) is
 * passed as light-DOM children rather than a prop — there's no `<slot>`
 * without a shadow root, so this captures `innerHTML` before overwriting it
 * and splices the captured markup back in. The ids inside that block
 * (`finalScore`, `finalBest`, `bestMarker`, ...) are untouched, so every
 * game's existing `getElementById` wiring keeps working unchanged.
 *
 * Attributes:
 * - `game-title` — the `.gameover-title` text, e.g. "MISSION FAILED".
 *   (Not `title` — that's a global HTML attribute and would show a hover
 *   tooltip instead.)
 * - `restart-label` — the restart button's text (default "Restart"; five
 *   games use "Play again").
 */
class GameOverElement extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("game-title") ?? "";
    const restartLabel = this.getAttribute("restart-label") ?? "Restart";
    const rows = this.innerHTML.trim();

    this.innerHTML = `
      <div class="gameover-card">
        <div id="gameOverTitle" class="gameover-title">${title}</div>
        ${rows}
        <div class="gameover-sub">Press R or Tap</div>
        <button id="gameOverRestart" class="restart-btn" type="button">${restartLabel}</button>
      </div>`;
  }
}

export function defineGameOver(): void {
  if (!customElements.get("st-game-over")) {
    customElements.define("st-game-over", GameOverElement);
  }
}
