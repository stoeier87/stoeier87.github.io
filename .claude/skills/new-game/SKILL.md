---
name: new-game
description: Scaffold a new arcade game with the canvas contract satisfied by construction — virtual resolution letterboxing, DPR cap, clamped dt, screenToWorld pointer input, game-accent theming, reset/endGame, restart button and Firebase score submission. Use when adding a game to the arcade.
---

# /new-game

Usage: `/new-game <name>` — creates `src/arcade/<name>/index.html` and `src/arcade/<name>/<name>.js`

Everything in `/new-page` applies. This adds the game layer.

## The canvas contract — copy it exactly

These four numbers are not style choices. Each one is a bug that was hit and fixed.

```js
const BASE_W = 720,
  BASE_H = 1280; // portrait virtual resolution

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // uncapped melts phones
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // after EVERY resize

  viewScale = Math.min(innerWidth / BASE_W, innerHeight / BASE_H); // letterbox
  viewOffX = (innerWidth - BASE_W * viewScale) / 2;
  viewOffY = (innerHeight - BASE_H * viewScale) / 2;
}

function screenToWorld(clientX, clientY) {
  // all pointer input goes through this
  return { x: (clientX - viewOffX) / viewScale, y: (clientY - viewOffY) / viewScale };
}

function frame(ts) {
  const dt = Math.min(33, ts - last) * 0.001; // unclamped explodes on a dropped
  last = ts; // frame or a backgrounded tab
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
```

Virtual resolution is what makes one game readable at 320px and at 1440px. Everything in `update()` and `draw()` works in `BASE_W`×`BASE_H` space and never touches `innerWidth`.

## State and lifecycle

Plain variables and small objects — `{ x, y, vx, vy }`. No classes, no ECS, no inheritance. That's the house style and it's the right call for a 600-line game.

One-time actions are gated by flags: `gameOver`, `scoreSubmitted`, `landed`. Expose `reset()` and `endGame()`, and show/hide `restartBtn` from `endGame`.

## Score submission — use the shared module, never a second Firebase path

```js
import { submitScoreOnGameOver, fetchGlobalBest } from "../shared/score-submit.js";
```

`submitScoreOnGameOver(options)` handles the confirm/prompt flow and the push. `fetchGlobalBest(gameKey)` returns the top score or `0`. `src/arcade/shared/firebase-config.js` is **generated in CI** from repo variables — don't edit it, and don't add a second config.

## Theming and HUD

Use the shared arcade component layer from `tailwind.css` — `.pill`, `.topbar`, `.stat`, `.badge`, `.beacon`, `.gameover`, `.gameover-card`, `.restart-btn` — and theme them per game:

```css
/* the ONE exception to no-new-css-files: two custom properties, nothing else */
.game-root {
  --game-accent: #6e8fff;
  --game-accent-dim: rgba(110, 143, 255, 0.35);
}
```

Do not restyle the shared classes. Eight games depend on them.

## Input

Mouse **and** touch, both through `screenToWorld`. Listeners `{ passive: false }` only where you genuinely need `preventDefault` for scroll suppression, `{ passive: true }` otherwise. Keyboard where it makes sense, and a visible focus ring on the restart button.

## Register it in the lobby

`src/arcade/index.html` holds the planet cards. Add a `.planet-card live` with `data-planet="<planet>"`, and check `src/arcade/arcade.js`'s `planetMap` for the key spelling.

**The known trap:** the HTML once said `data-planet="neptune"` while `planetMap` had `neptun` — Danish against English. `planetMap["neptune"]` was `undefined`, so `initCardPlanet` returned early and that card silently never got its planet. PR #43 root-caused it. Check both spellings match before you finish.

## Verify

`/verify arcade/<name>` at all six viewports, plus by hand:

- Portrait phone and landscape desktop both letterbox correctly, no stretch.
- Pointer input lands where you tapped at every viewport — that's `screenToWorld` working.
- The tab backgrounded for ten seconds and refocused does **not** teleport the simulation. That's the `dt` clamp.
- Game over → restart → score submits once, not twice (`scoreSubmitted`).
- Reduced motion still yields a playable game, not a blank canvas.
