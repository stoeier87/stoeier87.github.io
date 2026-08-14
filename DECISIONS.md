# DECISIONS.md

Append-only decision log. Newest last. Each entry: **decision · why · consequences · status.**

**Why a log and not a document:** decisions get reversed in this repo. `public/CNAME` was added in #46 and deleted in #52. Homepage parallax was disabled below 760px, then restored. A document tells you the current state; a log tells you _why it flipped_, so the next flip isn't blind.

Statuses: `active` · `deferred` · `superseded by ADR-nnn` · `reversed`.

---

## ADR-001 — `base: "./"`, and therefore relative paths everywhere

**Decided:** 2026-08-12 (recorded retroactively 2026-08-13)
**Status:** active

`vite.config.js` sets `base: "./"` so emitted asset URLs are relative.

**Why:** the same build has to work at `/` on `stoeier.dk` and at `/preview/<topic>/` or `/stage/` on `stoeier87.github.io`. Relative paths are the only way one artifact serves both.

**Consequences:** every `href`, `src`, import and navigation target must be relative. A root-absolute path resolves against the host root and silently escapes the preview onto production — the user never learns they left. This is now hook-blocked. The one standing violation is `script.js:52-125`, where the homepage canvas planet links were rewritten to `/arcade/<game>` in `1cdb600` ("new preview urls"); it's recorded as known issue 1 rather than fixed here.

---

## ADR-002 — `tailwind.css` loads last, and the shared component layer is untouchable

**Decided:** 2026-08-12 (retroactive)
**Status:** active

`tailwind.css` is the final stylesheet in every `<head>`, and carries both the `@theme` tokens and a shared component layer (`.pill`, `.topbar`, `.badge`, `.stat`, `.gameover`).

**Why:** one palette, one place, and shared HUD chrome that eight games can rely on.

**Consequences:** load order does real work — the shared layer wins on equal specificity. `.topbar { pointer-events: none }` is the trap; it made the About-me back arrow unclickable. **The rule is sidestep, never edit:** add a new class rather than changing the shared rule. PR #45 called it "sidestepped rather than fought", and `index.css:104` documents an override with a comment explaining why. Every page keeps its own local `.pill.back`, and PR #53 confirmed that duplication as intentional for exactly this reason.

---

## ADR-003 — `prefers-reduced-motion` is the only motion fallback

**Decided:** 2026-08-13 (PR #53)
**Status:** active · **reverses an earlier fix**

Motion is gated on `prefers-reduced-motion` and nothing else.

**Why:** an earlier mobile fix disabled the entire scroll-driven parallax below 760px. That treated a symptom. The real bug was the per-letter fly-in scattering characters during scroll. PR #53 root-caused it, removed the width gate, and restored the fly-in.

**Consequences:** never gate motion on viewport width. Reduced motion sets `html.static-home`, which flattens `.journey` to `height:auto`, un-stickies `.stage`, hides `.hint`/`.title-sat`, and calls `updateHeadline(1)` once to pin the finished composition. `html.js-anim` hides un-split words so the name never flashes static. The media query is re-read live via `addEventListener("change", …)`.

---

## ADR-004 — Scroll progress is clamped to `[0,1]` per letter

**Decided:** 2026-08-13 (PR #53)
**Status:** active

Each letter's local progress `t = (p - t0) / dur` is clamped to `[0,1]`.

**Why:** the clamp is the entire trick. Without it, letters that have already assembled re-scatter as the scroll continues past their window.

**Consequences:** scroll effects stay pure functions of `p = scrollPos / journeyEnd`. The scroll listener is `{ passive: true }` and only sets `scrollPos` plus a `dirty` flag; all work happens in the single rAF loop. Three per-word windows: `[[0.03,0.30],[0.36,0.62],[0.68,0.90]]`.

---

## ADR-005 — Mixed Danish and English is deliberate

**Decided:** ongoing (retroactive)
**Status:** active

`lang="da"` on the homepage, `lang="en"` in the arcade. Danish comments and copy stay.

**Why:** it's the site's voice, not drift.

**Consequences:** never remove Danish copy or comments without asking. "Bogstav-rejsen" and "Scroll-rejsen" are the intended names for those systems. The `copy-keeper` agent flags any diff that drops a Danish string.

---

## ADR-006 — Four-rung deploy ladder, with `stage` as one persistent URL

**Decided:** 2026-08-13
**Status:** active

`local` → `preview/<topic>` → `stage` → `prod`. Declared in `envs.json`.

**Why:** `stage/**` and `preview/**` were siblings that each published a folder per branch, so "staging" meant eight different URLs and nobody knew which was current. Collapsing `stage` to a single branch with a single persistent address gives one thing to bookmark and one thing to send someone.

**Consequences:** one new workflow, `stage.yml`, on push to the `stage` branch. The four existing workflows are untouched, so legacy `stage/**` branches still publish per-branch folders via `preview.yml` — harmless, and a one-line follow-up if you want it gone. `/deploy` is the single verb, and it strips the `preview/` prefix to work around `destination_dir: preview/${{ github.ref_name }}` producing the doubled `/preview/preview/foo/`.

---

## ADR-007 — Gates hang off the ladder, not the repo

**Decided:** 2026-08-13
**Status:** active

`preview` gates on build only. `stage` adds format, lint and typecheck. `prod` adds `/verify`.

**Why:** this is the prototyping balance. The loop that made Tobias productive is _idea → live URL in ninety seconds_, and putting a lint gate in front of that would kill the thing that's working. But the mess has to be cleaned somewhere, so it's cleaned on promotion toward production rather than at the moment of imagining.

**Consequences:** an ugly-but-working page is _supposed_ to pass on `preview` and fail on `stage`. If both behave the same, the balance isn't built. Don't add gates to `preview`. Toolchain: Prettier (zero-config, so formatting stops being reviewable content), ESLint flat config with a small rule set aimed at this codebase's real failure modes rather than a style pack, and TypeScript configured but not enforcing. No test runner yet — verification is the `/verify` procedure with `npx playwright` invoked ad-hoc and never added to `package.json`.

---

## ADR-008 — Rule of three replaces "pragmatic duplication"

**Decided:** 2026-08-13
**Status:** active · **supersedes the stance in the old AGENTS.md §3**

Two copies are fine when the variants genuinely differ. A third means stop and propose an extraction.

**Why:** the old brief canonised triplicated `drawPlanet` as a ship-oriented virtue. At 14 pages it stopped being one. But blanket "extract everything" is worse — the per-page `.pill.back` duplication is _correct_, because the shared `.pill` is load-bearing for eight game HUDs (ADR-002).

**Consequences:** `redundancy-scout` reports clusters and never edits. `/dedupe` is two-phase and stops after reporting. Extraction is its own PR, approved cluster by cluster. Standing clusters: `drawPlanet` ×3 (`script.js:197`, `arcade/arcade.js:83`, `arcade/shared/starfield.js:55`), back-pill CSS ×4, starfield init ×5 including one inlined in `scoreboard/index.html:43-87`.

---

## ADR-009 — Styling moves into JS; the existing CSS is frozen

**Decided:** 2026-08-13
**Status:** active

New components carry Tailwind utility classes in their JS/TS templates. No new page-local `.css` files. The 14 existing ones keep working and stop growing.

**Why:** utility classes in JS is the shape React wants, so every component written this way is a mechanical port when ADR-011 is picked up. Every new `.css` file is one more thing to unpick.

**Consequences:** `tokens.ts` is the typed mirror of the `@theme` block, with a `cls` map of utility shorthands so a token rename is one edit rather than a grep. `npm run tokens` fails on drift between the two. Migrating the existing CSS is explicitly **not** in scope — that work is part of ADR-011.

---

## ADR-010 — Two hard blocks, everything else teaches

**Decided:** 2026-08-13
**Status:** active

Hooks block exactly two things: root-absolute paths, and touching `dependencies` in `package.json`. Nothing else is enforced by the harness.

**Why:** both of those fail _silently_ in production — an absolute path escapes the preview without an error, and a runtime dependency ends the zero-dep stance without anyone noticing. Everything else is caught by review, by `page-critic`, or by the skill explaining itself as it runs. And noisy hooks get disabled, at which point they protect nothing.

**Consequences:** `guard:allow-absolute` on the same line is the documented escape hatch. `devDependencies` pass freely. When ADR-011 starts, the no-runtime-deps rule is edited in the same PR that adds React — not disabled quietly.

---

## ADR-011 — Component system: TypeScript + React, hybrid architecture

**Decided:** 2026-08-13
**Status:** **deferred** — filed as a GitHub issue, deliberately not started

TypeScript + React, with a hybrid architecture: SPA for the content pages (home, about-me, space-bar, arcade lobby), standalone entries for the 8 games and the scoreboard.

**Why React**, given the author personally prefers TypeScript and Web Components: models generate React more reliably than Lit or vanilla custom elements, by a wide margin. That is the deciding factor in a repo where most code arrives by prompt. The honest cost: 14 MPA entries become React roots or an SPA, ~45KB of runtime where there is currently zero, and every Canvas game needs a `useRef`/`useEffect` escape hatch out of React's model — which is why the games stay standalone in the hybrid split.

**Consequences while deferred:** components are written React-shaped now (ADR-012) so the migration is mechanical. TypeScript is installed with `allowJs: true`, `checkJs: false`, `strict: false`. **Tightening trigger:** flip `strict: true` and `noUncheckedIndexedAccess: true` in the first PR that adds a `.ts` file to `shared/`, not "later" — later doesn't arrive. Migration order when it starts: smallest page first (`scoreboard`), **homepage last** — it's the most fragile system here and PR #53 already rescued it twice.

---

## ADR-012 — Components are written React-shaped before React arrives

**Decided:** 2026-08-13
**Status:** active

Props in, markup out. No module-scope side effects, no globals, and setup returns its own cleanup function.

**Why:** it costs nothing today and makes ADR-011 a port rather than a rewrite.

**Consequences:** `/idea` scaffolds this shape by default. The existing IIFE-per-page style stays as it is — this applies to new code in `shared/` and `proto/`.

---

## ADR-013 — `CLAUDE.md` is canonical; `AGENTS.md` is a pointer

**Decided:** 2026-08-13
**Status:** active

**Why:** `AGENTS.md` was generated by Copilot in PR #13 (created and merged twelve seconds apart) and drifted badly within three weeks — it forbade Tailwind after Tailwind was adopted, cited a deleted `styles.css`, described a `push`-to-`main` deploy trigger that no longer existed, claimed the Firebase config wasn't committed when it is, and omitted four pages. Two documents that disagree are worse than one.

**Consequences:** the useful half of the old brief — design intent and voice — is preserved in `ANALYSIS.md` §4. `/drift-check` exists specifically to catch `CLAUDE.md` going the same way, by diffing each factual claim against the code and CI.

---

## ADR-014 — `dist/**` is excluded from the Vite entry glob

**Decided:** 2026-08-13
**Status:** active · **fixes a live defect**

`vite.config.js` `getInputs()` now ignores `["node_modules/**", "dist/**"]` instead of `node_modules/**` alone.

**Why:** routing is the filesystem, and `globSync("**/*.html")` was picking up the previous build's own output — 25 entries instead of 13. With a stale `dist/` that had been built under a different `base`, the build failed outright: `Failed to resolve /assets/index-BsQ3efER.js from dist/index.html`. CI never hit it because CI always checks out fresh, so this only ever broke local rebuilds — which is exactly where a prototyping loop lives.

**Consequences:** `npm run build` now emits exactly the 13 routes in `envs.json` → `pages.routes`. `expectedHtmlCount` was corrected from 14 to 13 at the same time. The stale `dist/` on disk (which predated the `index.html` rename and was described in `ANALYSIS.md` as "not ground truth") was deleted; `emptyOutDir` keeps it honest from here.

---

## ADR-015 — The lint rule set was chosen by measurement, not by preference

**Decided:** 2026-08-13
**Status:** active

`no-var` and `prefer-const` are **excluded** from the legacy scope and enforced only in `shared/`, `proto/`, `scripts/` and `.claude/hooks/`. `no-unused-vars` is `warn` on legacy and `error` on new code.

**Why:** the first rule set produced **325 findings, 290 of them `prefer-const` and `no-var`** — pure style noise on code that uses `let` and `var` pervasively and correctly. A report that is 89% noise gets ignored wholesale, and the real findings get ignored with it. After tuning, `npm run lint` returns **0 errors and 12 warnings, and all 12 are genuine dead code**: `showToast` and `toastHideAt` (`script.js`), `bhBusy` (`space-bar`), `docked` (`iss-docking`), `landed` (`phobos-lander`), `gameOverTitle` (`nebula-trail`), `DESKTOP_W`/`DESKTOP_H` (`orbit-runner`), `raf` (`about-me`), `time` (`arcade`), and `GTAG_ID`/`gtagPlugin` (`vite.config.js`, known issue 6).

**Consequences:** the `stage` gate is green today, which is what makes it credible tomorrow. A legacy file opts into the strict rules by moving into `shared/` — which is precisely when someone is already reading it. Same graduated logic applies to `.prettierignore`: the 14 existing pages are listed there, and the way to opt one in is to delete its line while you're already in that file for another reason.

---

## ADR-016 — The ADR log is the record of authority, not the issue tracker

**Decided:** 2026-08-13
**Status:** active

ADR-011 was meant to be anchored by a GitHub issue. **`gh` is not installed on this machine, so the issue was not filed.** Rather than leave `CLAUDE.md` claiming an issue exists — the exact species of drift that made the old `AGENTS.md` untrustworthy — the claim was corrected and the issue body was committed to the repo instead.

**To file it when `gh` is available:**

```sh
gh issue create \
  --title "Component system: TypeScript + React, hybrid architecture (decision recorded, not started)" \
  --body-file docs/stack-decision-issue.md \
  --label enhancement
```

**Consequences:** `DECISIONS.md` is the record of authority for decisions in this repo. An issue is a convenience for tracking and discussion, not the source of truth — issues get closed, and a closed issue is a poor home for a decision that is still in force. `docs/stack-decision-issue.md` carries the full rationale, the honest costs, the three blockers to clear, and the migration order.

---

## ADR-017 — Two roles: the prototyper is fully sandboxed, the integrator promotes

**Decided:** 2026-08-14
**Status:** active

Tobias works as **prototyper** — `preview/<topic>` branches and `proto/` only, deploying to the `preview` rung and nowhere else, gated on nothing but a passing build. He produces roughly 70% of the work: the ideas and the exploration. Jesper works as **integrator** and owns promotion into the system.

**Why:** the 14–21 days that got this repo to its current state also produced the loop that makes Tobias productive — idea, live URL, look at it on a phone, iterate. Putting a lint gate or a review step in front of that would destroy the thing that is working. But the output of that loop is prompt-shaped code that should not land in the codebase unexamined. Separating the roles lets both be true: the sandbox stays frictionless, and nothing crosses into the system without passing through `/promote`.

**Why it is a genuine sandbox, not a convention:** a `preview/<topic>` branch is structurally incapable of reaching production. `preview.yml` publishes it to its own directory under `gh-pages`, `deploy.yml` has no `push` trigger so only a merged PR publishes, and nothing promotes automatically. The isolation is enforced by the pipeline, not by anyone remembering a rule.

**Consequences:**

- The prototyper's whole surface is `/idea`, `/deploy preview` and `/explain`. `/idea` defaults to a `preview/` branch and never offers `stage` or `prod`.
- `/promote` is the integrator's tool and the single handoff point. It is where extraction, standards, gates and verification happen — see ADR-007 for why they happen there and not earlier.
- Gates stay off the `preview` rung permanently. Adding one is a decision to slow down the 70%, and should be argued for as such.
- `proto/` ships with a build, so a prototype merged to `main` would go live. That is why `/promote` deletes the proto directory when the work moves out of it, and why merging is never an agent's call.

---

## ADR-018 — `stage` is a cherry-pick workbench, hard-reset to `main` nightly

**Decided:** 2026-08-14
**Status:** active · **supersedes the environment model in ADR-006**

Contributors (currently the CEO and CFO, non-technical) develop on their own **long-lived branches**, which publish to the `preview` rung. The integrator cherry-picks commits from those branches onto `stage`, makes them production-ready, and releases. A scheduled workflow hard-resets `stage` to `main` every night.

**Why this and not a strict `preview → stage → main` chain.** A promotion chain rots at the seam where `main` moves without `stage`: a hotfix lands, `stage` is behind, and the next release either conflicts or silently reverts it. The nightly reset removes the seam entirely — `stage` can never accumulate divergence because it never survives a day.

**The property everything rests on: `stage` is derived state, never a source of truth.** Contributor branches are. So a hard reset destroys nothing, re-picking is idempotent, and the branches keep developing regardless of what happens downstream.

**The reset is a deadline, not a cleanup.** Work that didn't reach production that day is re-picked tomorrow at the cost of one command. A skipped release means there was nothing urgent — which is the correct signal, and better than manufacturing release pressure to avoid losing a branch that was never at risk.

**Consequences:**

- **Force-pushing `stage` is correct**, and the `/deploy stage` skill was inverted to say so. Force-pushing a contributor branch or `main` is never correct — those are where work actually lives.
- **Contributor commit hygiene becomes load-bearing.** You cannot cherry-pick half a commit, so one 400-line commit spanning three unrelated ideas is unpickable. Neither contributor will split commits by instinct, so `/deploy preview` writes the commit for them and must keep it to one logical change. This is enforced at their end precisely because they never see it.
- **`stage.yml` will not fire on the nightly reset.** GitHub deliberately prevents a `GITHUB_TOKEN`-driven push from triggering another workflow, so `stage-reset.yml` republishes `/stage/` itself. Without that, `/stage/` would keep serving yesterday's candidate after the branch had already been reset — a stale environment that looks live.
- The nightly job reports which commits it is discarding and where they still live, so a re-pick is a command rather than an archaeology exercise.

**When to revisit.** The strict chain is the right answer at larger scale — this one works because **one person owns the production server and does all the integration**. Revisit when that stops being true: a second integrator, someone else responsible for prod, or contributors who merge their own work. At that point the safety the chain buys stops being ceremony and starts being necessary.
