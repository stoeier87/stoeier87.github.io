import { GAMES } from "./games-data.js";

/**
 * <st-game-intro> — the pre-game "briefing card" (title, body copy, and
 * optional keyboard/touch key-hint lists), dismissed on first input.
 * Used by all 9 arcade games. Plain `class extends HTMLElement`, light DOM,
 * no shadow root — same pattern as `<st-game-topbar>`/`<st-game-over>`.
 *
 * Self-contained: looks itself up in GAMES (games-data.js, same directory)
 * by `game-key` and renders its own title/body/key-hints from there — no
 * host-page JS has to look up the game, build markup, or populate this
 * element by id. A game's own JS only needs to call `defineGameIntro()` and
 * separately wire up dismissing #intro on first input (id="intro" is fixed
 * on the generated element for exactly that).
 *
 * Renders into the existing shared `.intro-container`/`.intro`/`.intro-title`
 * /`.intro-body`/`.intro-keys` rules (game-overlay.css, or the per-game CSS
 * for games where that pair has real layout variance — see games-data.js's
 * doc comment), so it carries no styles of its own — only markup.
 *
 * Attribute:
 * - `game-key` — the GAMES entry's `key`, e.g. "pluto". Throws if there's
 *   no matching entry, or if that entry has no `introBody` (mercury/venus
 *   originally had neither — every GAMES entry has one now, but a game
 *   added without one should fail loudly rather than render an empty card).
 */
class GameIntroElement extends HTMLElement {
  connectedCallback() {
    const gameKey = this.getAttribute("game-key") ?? "";
    const game = GAMES.find((g) => g.key === gameKey);
    if (!game || !game.introBody) {
      throw new Error(`<st-game-intro game-key="${gameKey}">: no GAMES entry with introBody`);
    }

    const title = game.introTitle ?? game.gameLabel.toUpperCase();
    const keysHTML = game.introKeys
      ? renderIntroKeys("introKeys", game.introKeys.kb) + renderIntroKeys("introTouch", game.introKeys.touch)
      : "";
    console.log(title, game, keysHTML);
    console.log(game.introKeys ? game.introKeys.kb : "no keys");
    this.innerHTML = `
      <div class="intro-container">
        <div class="intro" id="intro">
          <div class="intro-title">${title}</div>
          <div class="intro-body">${game.introBody}</div>
          ${keysHTML}
        </div>
      </div>`;
  }
}

/**
 * Renders one `.intro-keys` block from a GAMES entry's `introKeys.kb`/
 * `.touch` pairs — `[["← →", "move"], ...]` becomes
 * `<span><b>← →</b> move</span>...`.
 */
export function renderIntroKeys(id: string, pairs: string[][]): string {
  console.log("renderIntroKeys", id, pairs);
  const spans = pairs.map(([keys, action]) => `<span><b>${keys}</b> ${action}</span>`).join("");
  return `<div class="intro-keys" id="${id}">${spans}</div>`;
}

export function defineGameIntro(): void {
  console.log("defineGameIntro");
  if (!customElements.get("st-game-intro")) {
    customElements.define("st-game-intro", GameIntroElement);
  }
}
