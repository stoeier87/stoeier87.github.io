---
name: deploy
description: The one deploy verb. Put work on a rung of the ladder — preview, stage, or prod — then watch the run and hand back a verified URL. Reads envs.json, explains what it's about to do, handles the preview path-doubling quirk, and never merges. Use when the user says deploy, ship it to preview, put it on stage, get me a URL, or asks where something is live.
---

# /deploy

Usage: `/deploy` · `/deploy preview <topic>` · `/deploy stage` · `/deploy prod`

**Read `envs.json` first — it is the source of truth for rungs, URLs, triggers and gates.** Never hardcode a URL or a branch pattern in your reasoning; read it.

## Always narrate before acting

Print one short line saying what will happen and one saying _why_, then act. This is the teaching channel — the user learns the model by watching the verb explain itself. Example:

> `stage` is a single persistent URL, so this overwrites the current candidate at `/stage/`. Use `/deploy preview <topic>` if you want it side by side with what's there.

## No argument

Show the ladder and where things stand. Don't guess a rung — if work is uncommitted and no rung was named, show the ladder and ask which one.

```
rung      url                                          gates
local     http://localhost:3000                        —
preview   /preview/<topic>/                            build
stage     /stage/                                      + format lint typecheck
prod      https://stoeier.dk                           + /verify   (merge = deploy)
```

Then: current branch, whether the tree is clean, and which rung that branch maps to.

## `/deploy preview <topic>`

The fast lane. Sloppy code is allowed here on purpose — the only gate is that the build passes.

1. `npm run build` locally first. A broken build wastes a CI round trip.
2. Branch: `preview/<topic>` (kebab-case the topic). If already on it, stay.
3. Commit in house style — see `CLAUDE.md` §5. Conventional Commits, page-level scope, a prose-judgment subject, a body that explains cause and measurement, and a `Claude-Session:` trailer. **No `Co-Authored-By` line, no 🤖 line in commits.**
4. **Confirm once before pushing**, then push with `-u`.
5. Report the URL. **`preview.yml` uses `destination_dir: preview/${{ github.ref_name }}` and `ref_name` already contains the slash**, so the branch `preview/foo` actually publishes to `/preview/preview/foo/`. Report the real, doubled URL — do not report the tidy one and let the user hit a 404. Say plainly that the doubling is a known quirk (`CLAUDE.md` known issue 2).
6. **Watch and verify — see below.** Don't stop at "pushed."

## `/deploy stage`

**`stage` is the integrator's cherry-pick workbench, not a shared branch.** It is derived state: contributors keep developing on their own long-lived branches, the integrator picks commits from those onto `stage` to assemble a production-ready set, and a nightly cron hard-resets `stage` back to `main`. Nothing exists only here, so nothing here is precious. See `DECISIONS.md` ADR-018.

1. Run the stage gates locally **before** pushing — `npm run gates` (build, format:check, lint, typecheck). If they fail, fix or report; do not push a red candidate.
2. Get the work onto `stage`. Fast-forward if it's clean; **force-push if it isn't.** Divergence on a workbench is normal, not an incident.
3. Confirm, push, report `/stage/`.
4. Say explicitly what this replaced, and — if `stage` was ahead of `main` — name the commits being dropped and where they still live, so re-picking is one command rather than an archaeology exercise.
5. **Watch and verify — see below.**

**Never rescue work off `stage`.** If something looks like it exists only there, that is a signal the contributor branch was deleted or rewritten — say so, because the actual problem is upstream. The fix is never to preserve `stage`.

## Watching and verifying, after every `preview`/`stage` push

Every push gets watched — this is not a separate step to remember, it's how `/deploy` finishes.

**1. Find the run.**

```
gh run list --branch <branch> --limit 1 --json databaseId,status,conclusion,workflowName,createdAt
```

No run at all is a finding, not a no-op: a push to a branch outside `preview.yml`/`stage.yml`'s trigger globs deploys nothing and nobody is told. Say so.

**2. Block on it.** `gh run watch <id>`. That's the primary wake signal — don't poll around it.

**3. If it failed**, read the log and **name the cause**, don't dump it: `gh run view <id> --log-failed`. Recognisable failure modes:

- **Missing `FIREBASE_*` repo variable.** `build.yml` validates seven and `exit 1`s, naming the key. `FIREBASE_MEASUREMENT_ID` is written but not validated, so an empty one fails later and stranger.
- **Vite build error.** Usually a bad import path or an HTML file that moved — `rollupOptions.input` comes from `globSync("**/*.html")`.
- **`npm install` resolution.** No committed lockfile, CI runs `npm install` — a transitive change can break CI with no diff to review.
- **Gate failure on `stage`** — format, lint or typecheck. Report which and the file:line. The ladder working as designed, not a broken pipeline.
- **Concurrency wait.** All publishing workflows share `gh-pages-write` with `cancel-in-progress: false` — a queued run is correct, not a hang.

**4. If it succeeded**, verify, don't just print the URL:

- HTTP 200 on the real (possibly doubled) URL. A 404 in the first ~30 seconds is `gh-pages` propagation, not failure — re-check once.
- Every expected page from `envs.json` → `pages.routes`, prefixed with the rung's base, reachable.
- No root-absolute path escapes — grep the deployed HTML/JS for `"/arcade`, `"/about-me`, `"/space-bar`, `"/scoreboard`. `script.js`'s homepage planet links are the known offender (known issue 1); report any new one as a finding.

```
deploy  preview/foo
  run       preview.yml #1234  success  1m 42s
  url       https://stoeier87.github.io/preview/preview/foo/   (doubling is expected)
  verified  200 · 14 pages · assets resolve · no absolute-path escapes
```

## `/deploy prod`

**Stop short of the deploy.** Merging the PR _is_ the production deploy — `deploy.yml` has no `push` trigger, so a merge is irreversible in the sense that it publishes immediately.

1. Run `/verify` and require it green.
2. Compose the PR body with `/ship`.
3. **Print the exact `gh pr create` command and stop.** Do not open the PR, do not merge, do not offer to merge. Hand it over with one line: "merging this publishes to stoeier.dk."

## Rules

- **Never push, open a PR, or merge without an explicit go-ahead in that turn.** Invoking `/deploy` authorises the one push it describes and nothing else.
- **Never force-push a contributor branch or `main`.** Those are the source of truth — a contributor's branch is where their work actually lives, and rewriting it is the one way this model can lose something. `stage` is the sole exception, because it is derived (ADR-018).
- If the working tree is dirty and the user asked for `stage` or `prod`, surface that first — an accidental commit of half-finished work onto the release candidate is the failure mode here.
- If a rung named by the user isn't in `envs.json`, say so and list the ones that are.
