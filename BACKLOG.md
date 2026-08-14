# BACKLOG.md

Known debt, deliberately not fixed. Each item is one PR through the chain — `preview/<topic>` → cherry-pick onto `stage` → `main`.

Nothing here is in progress. Nothing here blocks anything. The point of writing it down is that it stops being rediscovered.

Grouped by what happens if it's ignored, not by effort.

---

## Can bite production

### B1 — Homepage canvas planet links are root-absolute

`script.js:52-125` — the eight planet links are `/arcade/<game>`. On a preview or on `/stage/`, clicking a planet leaves the environment and lands on production. The visitor is never told.

This is the one standing violation of `standards.json` → `relative-paths`. The hook blocks new ones; this predates it. Fix is mechanical — relative paths, then check every viewport still navigates. **Small.**

### B2 — `public/CNAME` is gone, so the custom domain survives on inertia

Added in #46, deleted again in #52. Production keeps `stoeier.dk` only because `keep_files: true` preserves the `CNAME` already sitting on `gh-pages`. Any full rebuild of that branch, or one publish with `keep_files: false`, drops the custom domain.

Restore `public/CNAME` so the build ships it. **Tiny, and the cheapest insurance here.**

### B3 — `main` is unprotected

No required status checks, no review requirement, `enforcement_level: off`. With non-technical contributors in the repo, one merge button sits between them and `stoeier.dk`.

Not code — a GitHub settings change. Require the build check, at minimum. **Five minutes, highest value on this page.**

---

## Erodes trust in the tooling

### B4 — `preview-cleanup.yml` doesn't match `preview/**`

It fires on deleted `feature/**` and `stage/**` branches only. With `keep_files: true`, a deleted `preview/*` branch leaves its folder on `gh-pages` permanently — publicly served from `stoeier.dk`.

One orphan exists right now: `/preview/preview/claude-toolbox/` returns 200 with no branch behind it. Removing it needs a direct `gh-pages` commit, which bypasses the `gh-pages-write` concurrency group — do it when nothing else is deploying.

Fix the glob, then sweep once. **Small.**

### B5 — Preview paths double

`destination_dir: preview/${{ github.ref_name }}` and `ref_name` already contains the slash, so `preview/foo` publishes to `/preview/preview/foo/`. The `/deploy` skill compensates; a manual push doesn't.

Fix in the workflow rather than the skill, then drop the compensation. **Small, but touches the deploy path — worth a real preview test.**

### B6 — `envs.json` names a host that redirects

Preview and stage URLs are recorded as `stoeier87.github.io`, which 301s to `stoeier.dk` because of the `CNAME` on `gh-pages`. It works, but every reported URL is a redirect hop, and previews are publicly served from the production domain. Worth knowing whichever way it's resolved. **Tiny.**

### B7 — No lockfile

`package-lock.json` is gitignored and CI runs `npm install`, so builds are not reproducible and a transitive change can break production with no diff to review. Commit the lockfile and switch CI to `npm ci`. **Small, but it changes CI — verify on a preview first.**

---

## Slows work down over time

### B8 — Formatting debt: 17 stylesheets plus `tools/`

The original 14 pages and the `tools/` section are in `.prettierignore` (ADR-007, ADR-019). Consequence, stated plainly: **`format:check` currently covers almost nothing real.**

Do not fix this in one sweep — formatting `tools/` alone rewrites 2763 lines. Opt files in one at a time, by deleting their line while already working in that file for another reason. **Ongoing, never a task of its own.**

### B9 — Duplication clusters need a recount

ADR-008 recorded `drawPlanet` ×3, back-pill CSS ×4 (deliberate, keep), starfield init ×5, head block ×14. Then `/tools` landed with 12 more pages and their own canvas work, so every one of those numbers is stale.

Run `/dedupe` — it reports and stops. Do not extract anything without approving a cluster first. **Half a day for the report; extraction is separate.**

### B10 — 15 dead symbols across the pages

Surfaced as `npm run lint` warnings rather than hidden: `showToast`, `toastHideAt` (`script.js`), `bhBusy` (`space-bar`), `docked` (`iss-docking`), `landed` (`phobos-lander`), `gameOverTitle` (`nebula-trail`), `DESKTOP_W`/`DESKTOP_H` (`orbit-runner`), `raf` (`about-me`), `time` (`arcade`), `MUDA` (`tools-data`), an unused catch binding (`tools.js`), an unused arg (`validator.js`), `GTAG_ID` and `gtagPlugin` (`vite.config.js`).

Each is a one-line deletion. Best done opportunistically, in the same PR as other work in that file. **Trivial individually.**

### B11 — `arcade/shared/firebase-config.js` is tracked with live values

`.gitignore` covers a `scoreboard/firebase-config.js` that does not exist. CI regenerates the arcade one from repo variables, so the tracked copy is dead weight — but it is in git history.

For a client-side Firebase app these values are inherently public; the real control is Realtime Database security rules, which are not in this repo. **The rules are the actual work here, not the file.** Medium, and worth doing properly rather than quickly.

### B12 — Dead analytics stub in `vite.config.js`

`GTAG_ID` and an empty `gtagPlugin()` commented out of the plugin array. Either wire up analytics or delete it. **Trivial, but it is a decision, not a cleanup.**

---

## Toolbox follow-ups

Not legacy — work the setup itself still needs.

- **`/promote` still means "prepare a PR to main."** Under ADR-018 it should mean cherry-pick onto `stage`. It currently describes something that no longer exists.
- **Contributor commit hygiene is unenforced.** Cherry-picking only works on small, self-contained commits, and `/deploy preview` writes their commits for them — so that is where one-logical-change gets enforced. Nothing does it today.
- **`/pipeline` does not exist.** No view of contributor branches in flight: who is working on what, how long it has sat, whether it builds, whether it is ready to pick up.
- **`/drift-check` reports instead of adapting.** Written read-only, which produces a list to reconcile by hand rather than a diff. Should re-read reality and rewrite stale claims, stopping only where intent is ambiguous.
- **The catch-up hook.** Re-analyse between commits so drift is corrected continuously rather than in a session that never happens.
- **The stack decision is unfiled.** `docs/stack-decision-issue.md` is ready; `gh` was not installed. ADR-016 has the command.
