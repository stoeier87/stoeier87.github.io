# CLAUDE.md — stoeier87.github.io

Canonical contract for this repo. `AGENTS.md` is a stub that points here.

Companion files: **`envs.json`** (the ladder) · **`standards.json`** (the rules, machine-readable) · **`tokens.ts`** (design tokens) · **`DECISIONS.md`** (why things are the way they are) · **`ANALYSIS.md`** (how the repo and the method actually work) · **`BACKLOG.md`** (known debt, one PR each, none in progress).

---

## 1. Deploy truth — read this first

**`deploy.yml` has no `push` trigger. A direct commit to `main` deploys nothing.**

Production publishes only when a PR to `main` is closed _as merged_, or on manual `workflow_dispatch`. **Merging the PR is the deploy button.** That is why merge latency in this repo is six to eight seconds — the PR is a deploy mechanism, not a review gate.

### The ladder

| Rung      | Trigger                | Lands at            | Gates                     |
| --------- | ---------------------- | ------------------- | ------------------------- |
| `local`   | `npm run dev`          | `localhost:3000`    | none                      |
| `preview` | push `preview/<topic>` | `/preview/<topic>/` | build                     |
| `stage`   | push to `stage`        | `/stage/`           | + format, lint, typecheck |
| `prod`    | merge a PR to `main`   | `stoeier.dk`        | + `/verify`               |

The gate asymmetry is deliberate — it's the prototyping balance. **A rough idea reaches a real URL in about ninety seconds with nothing but a passing build.** Rigour arrives when something is promoted toward production, not when it's imagined. Don't add gates to `preview`.

Use `/deploy` rather than pushing by hand. Two things it handles for you:

- `preview.yml` uses `destination_dir: preview/${{ github.ref_name }}`, and `ref_name` already contains the slash — so pushing `preview/foo` by hand publishes to the **doubled** `/preview/preview/foo/`. `/deploy` strips the prefix.
- `stage` is a single branch with one persistent URL, so deploying there **overwrites** the current candidate. Use `preview` when you want things side by side.

All three publishing workflows share `concurrency: gh-pages-write, cancel-in-progress: false` with `keep_files: true`. One branch, many destination dirs, never cancel a write. Anything new that writes `gh-pages` must join that group.

`build.yml` is reusable (`workflow_call`), hard-fails if any of seven `FIREBASE_*` repo _variables_ is empty, and regenerates `arcade/shared/firebase-config.js`. `FIREBASE_MEASUREMENT_ID` is written but not validated.

---

## 1b. Who does what

Two roles, and the split is the point.

|            | **Prototyper** (Tobias)                         | **Integrator** (Jesper)    |
| ---------- | ----------------------------------------------- | -------------------------- |
| Works in   | `preview/<topic>` branches and `proto/`         | anywhere                   |
| Deploys to | `preview` **only**                              | `preview`, `stage`, `prod` |
| Gate       | build must pass                                 | the full ladder            |
| Owns       | ~70% of the work — the ideas, the exploration   | promotion into the system  |
| Never      | pushes `stage`, opens a PR to `main`, or merges | —                          |

**Prototyping is a complete sandbox.** A `preview/<topic>` branch cannot reach production: `preview.yml` publishes it to its own directory, `deploy.yml` has no `push` trigger, and nothing promotes automatically. So the prototyper can be as rough as they like — that speed is the asset, and it is the thing this whole setup exists to protect.

**The handoff is `/promote`.** That is the boundary between "his idea is live and clickable" and "this is in our system." Everything `/idea` deliberately skips — extraction, standards, gates, verification — happens there, and it is the integrator's tool, not the prototyper's.

If you are working as the prototyper: use `/idea`, `/deploy preview`, and `/explain`. That's the whole surface. You do not need the rest, and nothing you do on a `preview/` branch can break `stoeier.dk`.

**This table is documentation, not enforcement — GitHub branch protection on `main` and `stage` is the actual mechanism**, since pre-contract history shows exactly the failure this split exists to stop (direct merges to `main`, pushes to `stage/*`). See `DECISIONS.md` ADR-020 for the exact settings.

## 2. What this is

Personal portfolio and browser arcade for Tobias Fullerton Støier, at `stoeier.dk`.

- **Vanilla ES modules + Canvas 2D.** No framework, no SPA router, no component model yet.
- **Vite 8 as a pure MPA bundler.** `vite.config.js` globs `**/*.html` into `rollupOptions.input`, so **routing is the filesystem** — drop an HTML file anywhere and it ships. There is no `src/`; the repo layout _is_ the route table.
- **Tailwind v4** via `@tailwindcss/vite`, CSS-first config, no `tailwind.config.js`. Used as a **design-token layer plus a shared component layer**, not as a utility framework — only `index.html` uses utilities in markup today.
- **Firebase Realtime Database** for arcade leaderboards only, loaded from a CDN URL rather than npm.
- **Zero runtime dependencies.** Four devDependencies before this setup; `prettier`, `eslint` and `typescript` were added with it.

14 pages, 8 Canvas games. `dist/` on disk is stale — it predates the `index.html` rename, so don't read it as ground truth; rebuild.

---

## 3. Standards

The machine-readable version is `standards.json`, which `page-critic` and the hooks read. Adding a rule there makes it enforced without a code change. In prose:

**Paths and builds**

1. **Every path is relative** — `./` or `../`. `base: "./"` in `vite.config.js` is the only reason sub-directory deploys work; a root-absolute path resolves against the host root and silently escapes `/preview/…/` and `/stage/` onto production. **Hook-blocked.** Escape hatch if you truly need one: `guard:allow-absolute` on the same line.
2. **No runtime dependencies.** `devDependencies` are fine. **Hook-blocked.**
3. **A page exists when the build emits it.** After adding or moving HTML, confirm it's in `dist/`.

**Page contract** — every page, no exceptions

4. Head order: page CSS → icon CSS → **`tailwind.css` last**. It loads last so its component layer wins on equal specificity.
5. Decorative canvas carries `aria-hidden="true"`; interactive elements get a focus-visible outline in `--color-red`.
6. **`prefers-reduced-motion` is the only motion fallback.** Never gate motion on viewport width.
7. **One rAF loop per page.** The scroll listener is `{ passive: true }` and does nothing but set `scrollPos` and a `dirty` flag; all work happens in the loop. Every scroll effect is a pure function of `p = scrollPos / journeyEnd`, **clamped to `[0,1]`**.

Rules 6 and 7 are not preferences. They are the two halves of the regression PR #53 had to fix: an earlier "mobile fix" disabled parallax below 760px instead of root-causing per-letter scatter, and the fix removed the letter fly-in outright. The width gate is gone and the clamp is what makes letters settle and hold. Don't reintroduce either.

**Change discipline**

8. **Rule of three.** Two copies are fine when the variants genuinely differ; a third means stop and propose an extraction. Never extract silently as a side effect of another change. Current clusters: `drawPlanet` ×3, back-pill CSS ×4, starfield init ×5.
9. **Design tokens are sole-sourced** in `tailwind.css` `@theme`, mirrored typed in `tokens.ts`. Nothing hardcodes a colour. The `--color-scoreboard-*` sub-palette is a deliberate documented drift — leave it.
10. **Styling lives in JS from here on.** New components carry Tailwind utility classes in their templates. **No new page-local `.css` files.** The 14 existing ones are frozen: they keep working, they stop growing.
11. **Write components React-shaped** — props in, markup out, no module-scope side effects, no globals, setup returns its own cleanup. See §7.

### Canvas contract

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2); // uncapped melts phones
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // after every resize
const dt = Math.min(33, ts - last) * 0.001; // unclamped explodes on a dropped frame
```

Plus a fixed virtual resolution `BASE_W`/`BASE_H` letterboxed through `viewScale`/`viewOffX`/`viewOffY`, and pointer input converted with `screenToWorld(clientX, clientY)`. That's what makes one game readable at 320px and at 1440px.

### The Tailwind collision worth knowing

`tailwind.css` styles `.topbar { pointer-events: none }` and gives `.pill` a 10px radius, and it loads **last**. This is what made the About-me back arrow unclickable. **Sidestep with a new class; never edit the shared rule** — every in-game HUD depends on `.pill`, `.topbar`, `.badge`, `.stat` and `.gameover`. `index.css:104` is the documented precedent, and PR #45 called the approach "sidestepped rather than fought."

Z-order is explicit and unconditional: dotgrid (1) < starfield/planets (2) < journey (5) < topbar (20).

---

## 4. The toolbox

Trimmed once already (`DECISIONS.md` ADR-020) — four things that looked like separate tools turned out to be one tool with a mode, or a subroutine wearing a top-level name. What's left is what a two-person team actually reaches for.

### Skills

|                           |                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/idea "<sentence>"`      | An idea → a running local page. Scaffolds `proto/<slug>/`, React-shaped, Tailwind utilities, no CSS file.                                                  |
| `/promote <slug>`         | Hardens a proto into the codebase: extract, gates, verify, composes the PR via `ship`. Stops before opening.                                               |
| `/deploy [rung] [topic]`  | The one deploy verb. Pushes, then watches the run and hands back a verified URL — no separate watch step. Reads `envs.json`. Narrates _why_ before acting. |
| `/envs [--verify <rung>]` | What's live on every rung, including orphaned preview folders nothing else tracks. `--verify` runs a deep single-rung health check.                        |
| `/new-page <name>`        | Scaffolds a page against the contract.                                                                                                                     |
| `/new-game <name>`        | The above plus the canvas contract and score submission.                                                                                                   |
| `/verify [page]`          | Build + six-viewport check run. Emits the `N/N checks` line and the `⚠️` caveat.                                                                           |
| `/explain <thing>`        | "What happens when I push to stage?" Answers from this file plus live repo state.                                                                          |

`ship` still exists (`.claude/skills/ship/`) as `promote`'s final step and for the rare already-clean change with no extraction needed — it's not a separate thing to remember, `promote` reaches for it.

### Loops — `/loop /<name>`, self-paced

`/ux-polish <page>` · `/drift-check` · `/dedupe`

`/dedupe` is deliberately two-phase: it reports duplication and **stops**. Extraction happens only after a human approves a cluster.

**PR watching is event-driven, not a loop.** For one PR you just opened, ask to have it watched — `subscribe_pr_activity` fires once and CI failures, review comments, and merge-conflict notices arrive as they happen. `/pr-watch` (or `/loop /pr-watch`) is for a point-in-time sweep across _every_ open PR at once, a different job event subscription doesn't cover.

### Agents — all read-only, they report and you decide

`page-critic` (diff vs `standards.json`) and `copy-keeper` (voice and the Danish/English split) run automatically inside `promote`/`ux-polish` — not something you invoke standalone. `redundancy-scout` and `env-verifier` are the same pattern: invoked by `/dedupe` and `/envs --verify` respectively, not separate entry points.

### Hooks — two hard blocks, nothing else

Root-absolute paths, and `dependencies` in `package.json`. Everything else teaches inline. Noisy hooks get disabled, and a disabled hook protects nothing.

---

## 5. Commit and PR conventions

### Commits

Conventional Commits with **page-level scopes**, comma-separated multi-scope allowed, plus a non-standard **`content:`** type for copy-only edits:

```
fix(space-bar): dial the alien back down, 40% read as too heavy
fix(homepage,arcade,scoreboard,space-bar): unify the back pill
content(about): revise the teaching and jury paragraphs
```

Subjects are **prose judgments, not changelog lines**. Bodies explain **cause and measurement**, with numbers:

```
68px desktop / 54px mobile, up from the original 58/46 — noticeably more
presence without the bulk the full 40% bump added.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Fx1PN1RacHCrY8vkkA8cvW
```

Trailers: `Co-Authored-By` naming the **exact model**, and a `Claude-Session:` URL so any line traces back to the conversation that produced it. **Do not put the "🤖 Generated with Claude Code" line in commit messages** — it belongs in PR bodies only. This overrides the global default.

### PR bodies

There have been zero code reviews across 53 PRs and `main` is unprotected, so **the PR body is the review artifact.** Required shape:

1. **Preview URL on line one.**
2. A `##` heading per touched surface.
3. **Root cause in bold before the fix.** Show the mismatch as code where you can. If it isn't a regression from recent work, say so and name the commit that proves it.
4. Before/after table with measured numbers — **including a row that asserts what did not change.**
5. `## Verification` with a check count (`29/29`, `42 checks across two suites`) and the viewports used.
6. An explicit `⚠️` caveat naming what you could not verify, plus any residual task handed back.
7. Footer: `_Generated by [Claude Code](https://claude.ai/code/session_…)_`.

Superseded PRs get an explicit hand-off: _"Superseded by #45 — same commits, no work lost."_

### Branches

Prefix by tool of origin or intent: `claude/` `copilot/` `iterm/` `github/` for origin; `fix/` `hotfix/` `patch/` `findings/` for intent; `preview/<topic>` and `stage` for the ladder. Legacy `stage/**` branches still make per-branch preview folders via `preview.yml` — harmless, but `stage` (no slash) is the rung.

---

## 6. Voice

Mixed Danish and English is **deliberate**, not drift — `lang="da"` on the homepage, `lang="en"` in the arcade. Danish comments stay ("Bogstav-rejsen", "Scroll-rejsen"). Copy is light and warm: "Swift little MERKUR ⚡", "Cloud queen VENUS ☁️". **Never remove Danish copy or comments without asking.**

---

## 7. Where this is going

The stack decision is **TypeScript + React**, with a **hybrid architecture** — SPA for the content pages, standalone entries for the 8 games. It is **decided and deliberately not started.**

`DECISIONS.md` ADR-011 is the record of authority. A GitHub issue was meant to be the anchor but `gh` is not installed on this machine, so it hasn't been filed yet — the ready-to-paste body and the exact command are in ADR-011.

Until then, every new component is written **React-shaped on purpose**: props in, markup out, no module-scope side effects, no globals, cleanup returned from setup. A component written that way is a mechanical port later. A component written as an IIFE that reaches into `document` is a rewrite.

TypeScript is installed with `allowJs: true`, `checkJs: false`, `strict: false` — nothing is type-checked into submission today, and the toolchain is ready the moment the issue is picked up. The tightening trigger is recorded in `DECISIONS.md`.

---

## 8. Authority

**Prepare freely. Never push, open a PR, or merge without an explicit go-ahead in that turn.** Invoking `/deploy` or `/ship` is a go-ahead for that one action and nothing further. Merging is never yours — it's the production deploy.

---

## 9. Known issues — documented, deliberately unfixed

1. **Homepage canvas planet links are root-absolute** (`script.js:52-125`, `/arcade/<game>`) and jump out of previews onto production. The one standing violation of rule 1; the hook stops new ones.
2. **`preview-cleanup.yml` doesn't match `preview/**`** — only `feature/` and `stage/`. With `keep_files: true`, deleted `preview/*` branches leave their folders on the public site forever. Eight stale previews are up now.
3. **`public/CNAME` was added in #46 and deleted again in #52.** Production keeps `stoeier.dk` only because `keep_files: true` preserves the file already on `gh-pages`. A full rebuild or a `keep_files: false` publish drops the custom domain.
4. **`arcade/shared/firebase-config.js` is tracked with live values.** `.gitignore` covers a non-existent `scoreboard/firebase-config.js` instead. For a client-side Firebase app these values are inherently public, so the real control is Realtime Database security rules — which aren't in this repo.
5. **No lockfile.** `package-lock.json` is gitignored and CI runs `npm install`, so builds aren't reproducible and a transitive change can break production with no diff to review.
6. **Dead code in `vite.config.js`** — `GTAG_ID` and an empty `gtagPlugin()` stub, commented out of the plugin array. Analytics is half-wired and abandoned.
7. **Twelve dead symbols across the pages**, all now surfaced as `npm run lint` warnings rather than hidden: `showToast`/`toastHideAt` (`script.js`), `bhBusy` (`space-bar`), `docked` (`iss-docking`), `landed` (`phobos-lander`), `gameOverTitle` (`nebula-trail`), `DESKTOP_W`/`DESKTOP_H` (`orbit-runner`), `raf` (`about-me`), `time` (`arcade`). Each is a one-line deletion; none is urgent.

None of these are in progress. Pick them off deliberately, one PR each.

**Fixed while building this setup:** `vite.config.js` `getInputs()` was globbing `dist/**` back in as build input — 25 entries instead of 13, and an outright build failure whenever a stale `dist/` from a different `base` was present. CI never hit it because CI checks out fresh, so it only broke local rebuilds. See `DECISIONS.md` ADR-014.
