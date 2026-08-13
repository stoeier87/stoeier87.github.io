# ANALYSIS.md

Reverse-engineering of this repo and the method used to build it, done 2026-08-13 over 190 commits and 53 PRs. Written down so nobody re-derives it from git archaeology.

`CLAUDE.md` is the contract — what to do. This is the explanation — how things actually work and why.

---

## 1. The codebase

**Vanilla ES modules + Canvas 2D, bundled by Vite as a multi-page static site.** No framework, no SPA router, no component model. There is no `src/`; pages live at their URL path, so **the repo layout is the route table.**

```
index.html  index.css  script.js      homepage: the scroll journey
tailwind.css                          @theme tokens + shared arcade component layer
vite.config.js                        MPA input discovery + a dev-server dir-index fix
about-me/  space-bar/  scoreboard/    standalone pages
arcade/
  index.html arcade.js arcade.css     lobby / planet picker
  shared/ starfield.js score-submit.js backgrounds-iss.js firebase-config.js
  <8 games>/ index.html <game>.js <game>.css
public/                               FontAwesome CSS + webfonts, gamepad.svg
```

**Stack:** Vite 8 (Rolldown-based), Tailwind v4 via `@tailwindcss/vite` with CSS-first config, `glob` as a build-time dependency, Node 24 in CI. No TypeScript before this setup. **Zero runtime dependencies** — Firebase is loaded from a `gstatic.com` URL, not npm.

### The two things in `vite.config.js` that matter

**MPA input discovery.** `globSync("**/*.html")` becomes `rollupOptions.input`, which is why "add an HTML file anywhere and it becomes a page" works — and why you must check `dist/` after moving one.

**`base: "./"`.** Load-bearing. It makes emitted asset URLs relative so one build serves `/` on `stoeier.dk` and `/preview/<topic>/` on `stoeier87.github.io`. Everything about the preview system rests on this.

There's also `directoryIndexRedirect()`, a custom dev-only middleware. Vite's dev server resolves `/foo/` and `/foo.html` but never `/foo` → `/foo/index.html`, so bare paths fell through to the SPA fallback and silently served the homepage. The plugin 302s to the trailing-slash form. It's a **dev/prod-parity fix** — the same instinct behind PR #47 ("new preview urls") and #41/#42 ("worktree relative paths fix"): a bug that only reproduced on the real host, closed in the dev server so it can't happen again.

Dead code left in place: `GTAG_ID` and an empty `gtagPlugin()` stub, commented out of the plugin array.

### Content

No markdown, no CMS, no content collections. Prose lives inline in the HTML. The one structured data file is **`space-bar/cocktails.json`** — 40 entries pairing a real star with a drink, each carrying `magnitude` (which sizes the rendered star) and `starColor` (which colours it). It's a **build-time `import`**, not a fetch, which PR #45 justified as "safer given the relative-path work in #42."

### Styling

Hybrid, and worth understanding before touching anything: **Tailwind provides tokens and a shared component layer; each page hand-writes its own component CSS.** Utility classes in markup appear on the homepage only. `@apply` shows up in `tailwind.css` and four page/game stylesheets.

All tokens live in one `@theme` block, `tailwind.css:1-116`, in three parallel naming schemes: base (`--color-bg`), semantic aliases (`--color-surface-app` → `var(--color-bg)`), and an isolated `--color-scoreboard-*` sub-palette that is deliberately drifted. Spacing is a hand-picked non-linear scale (4/8/12/16/24/32/64/88px) — don't regularise it.

Lines 118–250 hold the shared arcade UI layer outside `@theme`: `.pill`, `.topbar`, `.link`, `.badge`, `.beacon`, `.stat`, `.gameover`, `.restart-btn`, themed per game through `--game-accent`.

### Animation, which is the actual craft here

Everything is hand-rolled `requestAnimationFrame` + Canvas 2D + `transform: translate3d`. No GSAP, no ScrollTrigger, no Web Animations API.

**`script.js` (850 lines, one IIFE)** runs seven independent systems from a single rAF loop:

1. **Starfield parallax** — 3 layers at factors `0.12 / 0.30 / 0.55`, star count derived from viewport area, offset wrapped with a modulo for infinite vertical scroll, per-star sine twinkle. Positions come from a deterministic hash PRNG, so **the sky is identical every visit** — that's on purpose.
2. **Planet parallax** — 8 planets, each with position along the journey, horizontal fraction, parallax factor (0.42–0.62), radius as a fraction of `vmin`, gradient stops, and feature flags for rings/bands/earth. Off-screen culled at `±r*3`.
3. **Earth sub-system** — ISS on an inner tilted ellipse (0.75 y-squash), Moon on an outer orbit.
4. **Letter assembly ("Bogstav-rejsen")** — each character wrapped in a `span.ltr`, given a deterministic scatter vector, eased with `easeOutCubic`, written as one `translate3d(…) rotate(…) scale(…)` string. Three per-word progress windows. **The `[0,1]` clamp on each letter's local `t` is the whole trick** — it makes letters settle and hold instead of re-scattering.
5. **Headline rigid-block parallax**, 6. **contact reveal** gated at `p > 0.92`, 7. **title satellites** on elliptical orbits that re-read the headline's bounding rect every frame so they track it.

Plus: **canvas planets are clickable.** A radius hit-test runs against visible planets each frame, and the listeners are on `document` rather than the canvas because the canvas is `pointer-events: none`.

**The scroll technique is sticky-stage scrubbing, not scroll-event animation.** `.journey` is 650vh, `.stage` is `position: sticky`, `journeyEnd = journey.offsetHeight - H`, and `p = scrollPos / journeyEnd` is the single input every DOM effect is a pure function of. The scroll listener is `{ passive: true }` and does nothing but set `scrollPos` and a `dirty` flag.

Other pages: **`about-me/about-me.js`** (812 lines) is the most elaborate — two switchable canvas scenes, a lander that descends with scroll, timed easter eggs, and the only `IntersectionObserver` in the repo. **`space-bar/space-bar.js`** uses `mulberry32(9137)` "so the sky looks the same every visit" and halves star count on mobile. **`scoreboard/index.html:43-87`** has the repo's only inline script.

Games share a canvas contract: fixed `BASE_W`/`BASE_H` letterboxed via `viewScale`/`viewOffX`/`viewOffY`, `dpr` capped at 2, `screenToWorld()`, and `dt` clamped to 33ms.

---

## 2. The method, extracted from 190 commits

### Cadence: burst-driven

190 commits across **nine calendar days**, 170 of them in three sessions (65 on 2026-07-21, 27 on 08-08, 84 on 08-12). PR #37 is titled "first patch post client meeting." Work arrives in client-driven bursts, then nothing.

### Authorship: eight identities, two humans, two agent classes

Jesper Spiegelberg (104 commits, the operator) · stoeier87 / Tobias Fullerton Støier (76, the site owner's account, which is also what web-UI merges land under) · Claude (44) · copilot-swe-agent (11). **Roughly 29% of commits are directly agent-authored**, and counting agent PRs merged under human identities, most of the codebase is.

### Two commit registers, side by side

**Agent commits** are Conventional Commits with page-level scopes, a non-standard **`content:`** type for copy edits, comma-separated multi-scope (`fix(homepage,arcade,scoreboard,space-bar):`), and subjects written as **prose judgments rather than changelog lines** — `fix(space-bar): dial the alien back down, 40% read as too heavy`. Bodies explain **cause and measurement**, with numbers, and long ones use sub-headings.

Trailers record the **exact model** (`Co-Authored-By: Claude Opus 5`, `Opus 4.8`, `Sonnet 5`, `Haiku 4.5` — nine variants across the history) plus `Claude-Session: https://claude.ai/code/session_…` on 40 commits. Session IDs recur across whole PR series, so a session is traceable end to end. Notably **zero commits carry the "🤖 Generated with Claude Code" boilerplate** — it appears only in PR bodies.

**Human commits** are terse: `iterm-fix`, `new preview urls`, `trying to fix (#52)`, `Update index.html`.

### Branch naming is tool-of-origin based, which is unusual and useful

`claude/<topic>-<6char>` (cloud sessions, auto-named) · `copilot/<topic>` · `github/<topic>` (edited in the web UI) · `iterm/<topic>` (local terminal) — layered over a conventional intent scheme (`fix/`, `hotfix/`, `patch/`, `findings/`) and a deployment tier (`stage/`, `preview/`). You can read _which agent or surface produced a change_ off the branch name. `feature/**` is declared in `preview.yml` and has never once been used.

### The PR body is the review artifact

**Zero reviews across 53 PRs.** No PR template, no CODEOWNERS, no labels in use, `main` unprotected, `required_status_checks` off. Only one PR ever requested a reviewer (#7, the only draft — closed unmerged). Merge latency is 6–8 seconds. Review happens out of band: in the Claude Code session, and by eyeballing the deployed preview on a phone.

So the discipline went into the PR body instead, and it's genuinely good. The recurring shape:

1. **Preview URL first.**
2. `##` heading per touched surface.
3. **Root cause in bold before the fix**, shown as code where possible. #43 printed the mismatch directly — `data-planet="neptune"` in the HTML against `planetMap = { … neptun: 7 }` in the JS — then noted _"It's a spelling mismatch that has been there all along"_ and pre-empted blame: _"Not a regression from recent work — the last commit touching these files predates it."_
4. **Before/after table with measured numbers**, including a row asserting **what didn't change** (`desktop journey 5901px → 5901px`). Proving what you didn't break is a habit here.
5. **`## Verification` with a check count** — _"42 checks across two suites"_, _"29/29"_, _"24/24 at 1440×900 and 390×844"_. Recurring viewports: 1440×900, 1280, 390×844, 375×812, 360×640, 320.
6. **An explicit `⚠️` limits-of-verification caveat**, repeated near-verbatim across #43/#45/#48: _"Google Fonts is blocked in my sandbox, so my screenshots use fallback type. Anything about how text sits — line breaks, spacing — needs your eyes."_ Residual tasks get handed back by name.
7. Footer linking the session.

Human PR bodies are the inverse: empty. #51's body is literally `PR `. **The documentation discipline is a property of the Claude Code workflow, not of the team** — which is exactly why it needed encoding in `CLAUDE.md`.

The best single example of the method is `6cad956`, which names a previous fix as wrong and root-causes it instead, then in the _second_ commit of the same PR partially reverses itself and labels the reversal honestly.

---

## 3. Deploy, precisely

GitHub Pages publishing to the **`gh-pages` branch via `peaceiris/actions-gh-pages@v4`** — not the `actions/deploy-pages` artifact flow. Custom domain `stoeier.dk` via a root `CNAME`.

| Workflow              | Trigger                                        | Publishes                                                                                            |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `build.yml`           | `workflow_call` only                           | nothing — validates 7 `FIREBASE_*` vars, generates `firebase-config.js`, builds, uploads `site-dist` |
| `deploy.yml`          | `pull_request` to `main` + `workflow_dispatch` | only when action is `closed` **and** `merged == true`, or manual → `gh-pages/`                       |
| `preview.yml`         | push to `feature/**`, `stage/**`, `preview/**` | → `gh-pages/preview/<ref_name>/`                                                                     |
| `preview-cleanup.yml` | branch `delete`                                | `rm -rf preview/<ref>`, but **only for `feature/` and `stage/`**                                     |

**Every PR event builds** (a merge-commit-SHA smoke test) but only a merged close publishes. **There is no `push: [main]` trigger** — this is the single most misunderstood fact in the repo, and it explains both the 6-second merges and one-line PRs like #52.

All three publishing workflows share `concurrency: gh-pages-write, cancel-in-progress: false` with `keep_files: true`. That's a coherent design: one branch, many destination dirs, never cancel a write.

Two consequences of `destination_dir: preview/${{ github.ref_name }}` when `ref_name` already contains a slash: **path doubling** (`preview/foo` → `/preview/preview/foo/`) and a **cleanup gap** (`preview/**` is never removed, and `keep_files: true` means nothing else removes it either).

The pipeline was itself under active development when this analysis was written — `stage/pipeline`, `stage/testing`, `preview/re-deploy` and PRs #50–#53 are all meta-work on the deploy flow, all landed within two days.

### Gates, before this setup

None. No test runner, no ESLint, no Prettier, no typecheck, no lockfile (`package-lock.json` is gitignored and CI runs `npm install`, so builds aren't reproducible). `build.yml` was the only quality gate, and it only checked that the build succeeded and the Firebase vars existed.

Meanwhile every agent PR claimed dozens of automated checks. Playwright was used ad-hoc and thrown away each session — never installed, never committed. So the numbers were real but the harness wasn't reproducible. `/verify` exists to close that gap without turning a throwaway tool into a permanent dependency.

---

## 4. Design intent and voice

_Preserved from the original AGENTS.md §3, which was the useful half of that file._

**Playful, narrative-first design.** The site is built around a strong theme — a "Solar Arcade" where each planet gets its own mini-game. The homepage isn't a static CV; it's a scroll-driven journey where the visitor's name assembles from drifting letters while planets rise from below. **Story and motion over conventional layouts.**

**Browser-native craft.** Comfortable with low-level APIs: Canvas 2D, `requestAnimationFrame`, `matchMedia`, `visualViewport`, `devicePixelRatio`, passive listeners. There's no framework because the author prefers to **own the rendering pipeline directly.**

**Strong visual sensibility.** A tight colour system. `Space Mono` for UI, `Archivo Black` for display. Subtle details everywhere — dot-grid overlays, twinkling stars, planet glows, ring geometry, tilted ISS orbits, a custom SVG UFO cursor with a beam animation. Mobile-first: portrait game presets, clamp-based typography.

**Iterative, feature-complete polish.** Not a prototype. Seven independent animated systems on the homepage, a shared score-submission contract, reduced-motion and keyboard focus handled.

**Gentle, human copy.** "Swift little MERKUR ⚡", "Cloud queen VENUS ☁️". Comments are informal and sometimes Danish. **Keep that tone when editing user-facing text.**

One stance from the original has been **superseded**: it framed the triplicated `drawPlanet` as a virtue ("pragmatic, ship-oriented over architectural purism"). See `DECISIONS.md` ADR-008 — rule of three replaces it, while keeping the per-page `.pill.back` duplication, which is correct for the reason in ADR-002.

---

## 5. Duplication, measured

| Cluster        | Copies | Where                                                                                |
| -------------- | ------ | ------------------------------------------------------------------------------------ |
| `drawPlanet`   | 3      | `script.js:197`, `arcade/arcade.js:83`, `arcade/shared/starfield.js:55`              |
| back-pill CSS  | 4      | `index.css`, `about-me/about-me.css`, `space-bar/space-bar.css`, `arcade/arcade.css` |
| starfield init | 5      | incl. one inlined in `scoreboard/index.html:43-87`                                   |
| head block     | 14     | every page, hand-copied                                                              |

The back-pill duplication is **intentional** and should stay (ADR-002). The others are extraction candidates, gated behind `/dedupe`'s report-and-stop phase.

---

## 6. Where the repo contradicted its own docs

Recorded because it's the failure mode `/drift-check` exists to prevent. As of 2026-08-13, the old `AGENTS.md` said: styles live in `styles.css` (deleted in `e0c6dfe`) · avoid adding Tailwind (adopted in `ba331e5` / PR #27) · deploys happen on pushes to `main` (untrue since #50/#51) · Firebase secrets aren't committed (`arcade/shared/firebase-config.js` is tracked with live values) · and its directory listing omitted `about-me/`, `space-bar/`, `index.css` and `tailwind.css`.

It was generated by Copilot in PR #13, created and merged twelve seconds apart, and never maintained.
