# AGENTS.md — stoeier87.github.io

## 1. Repository overview

This is the personal portfolio and browser-arcade site of Tobias Fullerton Støier, deployed as a static GitHub Pages site at `stoeier.dk`.

- **Build tool:** Vite (`vite.config.js` auto-discovers every `*.html` page as a Rollup input).
- **Runtime:** Vanilla ES modules, Canvas 2D, no frameworks.
- **Backend:** Firebase Realtime Database for arcade leaderboards only.
- **Deployment:** GitHub Actions workflow `.github/workflows/deploy.yml` builds to `dist/` and deploys to Pages on pushes to `main`.

### Directory layout

```
index.html              # Homepage: space-themed scroll journey
script.js               # Starfield, planet parallax, letter animation, UFO cursor
styles.css              # Design tokens, layout, animations

arcade/
  index.html            # Arcade lobby / planet picker
  arcade.js             # Shared arcade starfield + planet card rendering
  orbit-runner/         # Gravity orbit game
  meteor-dodge/         # Dodging game
  iss-docking/          # Rotation-matching docking game
  phobos-lander/        # Lunar-lander style game
  comet-pong/           # Pong variant
  star-memory/          # Memory game
  nebula-trail/         # Snake variant
  asteroid-breaker/     # Breakout variant
  shared/
    starfield.js        # Shared PLANETS data + drawPlanet helper
    score-submit.js     # Firebase score submission helpers
    firebase-config.js  # Generated at build time from repo variables

scoreboard/             # Global leaderboard page
public/                 # FontAwesome CSS/webfonts, SVG icons
```

## 2. Architecture and conventions

### Code style

- **No build-time transpilation beyond Vite.** Write plain ES modules that run in modern browsers.
- **No frameworks or UI libraries.** All rendering is either DOM manipulation or Canvas 2D.
- **IIFE wrappers for top-level scripts.** Most game scripts wrap logic in `(() => { ... })();` with `"use strict"` to avoid leaking globals.
- **Functional, procedural Canvas code.** Physics and rendering live in the same file; no ECS, no classes, no inheritance.
- **Danish and English mixed freely** in user-facing copy and code comments; follow the existing convention in each file.

### Canvas patterns

- Use a fixed virtual resolution (`BASE_W`/`BASE_H`) for each game and a letter-boxed `viewScale`/`viewOffX`/`viewOffY` transform so games scale cleanly on mobile and desktop.
- Cap DPR at 2: `dpr = Math.min(window.devicePixelRatio || 1, 2);`
- Use `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` after resizing.
- Convert pointer events to world space with `screenToWorld(clientX, clientY)`.
- Clamp `dt` to avoid simulation explosions: `dt = Math.min(33, ts - last) * 0.001;`

### State and reactivity

- State is plain variables and small objects (`{ x, y, vx, vy, ... }`).
- Flags like `gameOver`, `scoreSubmitted`, and `landed` gate one-time actions.
- Games commonly expose `reset()` and `endGame()` functions and a `restartBtn` that is hidden/shown from `endGame`.

### Accessibility and motion

- Add `aria-hidden="true"` to all canvas and decorative elements.
- Use `html.js-anim` to hide content until JS enhances it, then reveal it gracefully.
- Respect reduced-motion implicitly by keeping animations driven by JS and providing fallback static states where appropriate.
- Provide focus-visible outlines in `--red` for keyboard users.

### Shared assets

- `arcade/shared/starfield.js` exports `PLANETS` and `drawPlanet`. Games either import from this module or duplicate the planet drawing logic. Prefer importing it for new planets or arcade screens.
- `arcade/shared/score-submit.js` exports:
  - `submitScoreOnGameOver(options)` — shows `confirm`/`prompt` and submits to Firebase.
  - `submitScore(db, options)` — low-level validation + push.
  - `fetchGlobalBest(gameKey)` — returns the top score or `0`.

### Build and deployment

- `npm run dev` starts Vite on port 3000.
- `npm run build` outputs to `dist/`.
- The deploy workflow validates that all `FIREBASE_*` repository variables exist, then regenerates `firebase-config.js`. Do not commit real Firebase secrets; the file is overwritten in CI.

## 3. Author's thinking style and strong sides

This section is derived from reading the codebase and is meant to help future agents work in the same direction.

### Playful, narrative-first design

Tobias builds around a strong theme — here, a “Solar Arcade” where each planet gets its own mini-game. The homepage is not a static CV; it is a scroll-driven journey where the user’s name assembles from drifting letters while planets rise from below. This shows a preference for **story and motion over conventional layouts**.

### Browser-native craft

The author is clearly comfortable with low-level browser APIs: Canvas 2D, `requestAnimationFrame`, `matchMedia`, `visualViewport`, `devicePixelRatio`, and passive event listeners. There is no dependency on frameworks because the author prefers to **own the rendering pipeline directly**.

### Strong visual sensibility

- Tight color system (`--bg`, `--ink`, `--red`, `--ink-muted`, `--ink-dim`).
- Consistent typography: `Space Mono` for UI, `Archivo Black` for display.
- Subtle details everywhere: dot-grid overlays, twinkling stars, planet glows, ring geometry, tilted orbits for the ISS, and a custom SVG UFO cursor with a beam animation.
- Mobile-first responsive thinking: portrait game presets and clamp-based typography.

### Iterative, feature-complete polish

The codebase is not a prototype; it is a finished product. Examples:

- Homepage has five independent animated systems (stars, shooting stars, satellites, planet parallax, letter assembly, UFO cursor, title satellites).
- Arcade games reuse a common score-submission contract with Firebase.
- The deploy pipeline validates secrets before building.
- Reduced-motion and keyboard focus states are handled.

### Pragmatic duplication

The planet-drawing logic appears in `script.js`, `arcade/arcade.js`, and `arcade/shared/starfield.js`. Rather than prematurely abstract everything, the author duplicates small, self-contained drawing routines when they need slight variations. This is a **pragmatic, ship-oriented mindset** over architectural purism.

### Gentle, human copy

Messages like “Swift little MERKUR ⚡” and “Cloud queen VENUS ☁️” show a light, friendly voice. Code comments are informal and in Danish at times (“Bogstav-rejsen”, “Scroll-rejsen”). Keep that tone when editing user-facing text.

## 4. Working with this codebase

### Do

- Keep it vanilla. Avoid adding React, Vue, Tailwind, or heavy libraries unless absolutely necessary.
- Maintain the dark-space visual identity if touching UI.
- Add new pages as standalone HTML files in appropriate folders; Vite will pick them up automatically.
- Use `arcade/shared/starfield.js` and `arcade/shared/score-submit.js` for arcade features.
- Follow the existing virtual-resolution pattern for new Canvas games.
- Preserve accessibility: `aria-hidden` on decorative canvas, focus-visible outlines, and keyboard support where feasible.

### Avoid

- Refactoring the homepage scroll animation into a framework or splitting it across files unless asked; it is intentionally self-contained in `script.js`.
- Committing Firebase secrets; they are injected by GitHub Actions.
- Removing Danish copy or comments without checking with the author.
- Adding large runtime dependencies that increase bundle size for a static site.

## 5. Testing and validation

- Run `npm run build` locally after changes.
- Open the site in a browser and scroll through the homepage to verify the letter animation and planets.
- Test arcade games with both mouse and touch.
- Verify that `dist/` contains all expected `.html` files because Vite's `rollupOptions.input` is generated from `globSync("**/*.html")`.
