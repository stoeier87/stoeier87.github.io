---
name: deploy-watch
description: Watch the GitHub Actions run for the current branch, diagnose the cause on failure, and hand back a verified live URL on success. Designed for /loop /deploy-watch after a push. Use when the user asks to watch the deploy, check if the build passed, or wants the preview URL when it's ready.
---

# /deploy-watch

Standalone, or as `/loop /deploy-watch` after a push.

## One pass

**1. Find the run.** Determine the current branch and which workflow it triggers, from `envs.json`:

- `preview/**` → `preview.yml`
- `stage` → `stage.yml`
- a PR to `main` → `deploy.yml` (builds on every PR event; **publishes only on merged close**)

```
gh run list --branch <branch> --limit 1 --json databaseId,status,conclusion,workflowName,createdAt
```

No run at all is a finding, not a no-op: a push to a branch outside the trigger globs deploys nothing and nobody is told. Say so.

**2. If in progress** — `gh run watch <id>` and let it block. That's the primary wake signal; don't poll around it.

**3. If it failed** — read the log and **name the cause**, don't dump it:

```
gh run view <id> --log-failed
```

The failure modes worth recognising immediately:

- **Missing `FIREBASE_*` repo variable.** `build.yml` validates seven of them and `exit 1`s. The message names the key. Note that `FIREBASE_MEASUREMENT_ID` is written into the generated config but _not_ validated, so an empty one fails later and stranger.
- **Vite build error.** Usually a bad import path or an HTML file that moved — remember `rollupOptions.input` comes from `globSync("**/*.html")`.
- **`npm install` resolution.** There's no committed lockfile and CI runs `npm install`, so a transitive change can break CI with no diff to review. If the failure is in install and the code is untouched, this is your first suspicion.
- **Gate failure on `stage`** — format, lint or typecheck. Report which and the file:line. This is the ladder working as designed, not a broken pipeline.
- **Concurrency wait.** All publishing workflows share `gh-pages-write` with `cancel-in-progress: false`, so a queued run is correct behaviour and not a hang.

**4. If it succeeded** — get the URL and _check it_, don't just print it.

Read the step summary (`preview.yml` and `stage.yml` both echo the URL), and build the expected URL from `envs.json`. **Report the real URL including the `preview/preview/` doubling** — `destination_dir` is `preview/${{ github.ref_name }}` and `ref_name` already contains the slash. Handing over a tidy-looking 404 is the failure this step exists to prevent.

Then hand to the **`env-verifier`** agent: HTTP 200, assets resolve _under the deploy prefix_, no root-absolute path escaping onto production, every expected page present.

Note that `gh-pages` publishing takes a moment after the run goes green — a 404 within the first ~30 seconds is propagation, not failure. Re-check once before reporting a problem.

## Report

```
deploy-watch  preview/foo
  run       preview.yml #1234  success  1m 42s
  url       https://stoeier87.github.io/preview/preview/foo/   (doubling is expected)
  verified  200 · 14 pages · assets resolve · no absolute-path escapes
```

## As a loop

Pace it off real signals, not a clock:

- A run is in progress → `gh run watch` blocks until it finishes. Nothing else to do.
- Green and verified → this branch is done. Set a **long** fallback (1200s+) and hold quietly (`noop: true`), so a later push gets picked up without burning wakeups.
- Failed → report once with the cause, then hold. **Don't re-report the same failure on every tick.** One tick, one finding.
- Nothing to watch → hold long and quiet.

Never deploy, re-run, or fix anything from inside the loop. Report and stop — the human decides what to do about a red build.
