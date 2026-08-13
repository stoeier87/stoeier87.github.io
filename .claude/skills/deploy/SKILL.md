---
name: deploy
description: The one deploy verb. Put work on a rung of the ladder — preview, stage, or prod. Reads envs.json, explains what it's about to do, handles the preview path-doubling quirk, and never merges. Use when the user says deploy, ship it to preview, put it on stage, get me a URL, or asks where something is live.
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
3. Commit in house style — see `CLAUDE.md` §5. Conventional Commits, page-level scope, a prose-judgment subject, a body that explains cause and measurement, `Co-Authored-By` with your exact model, and a `Claude-Session:` trailer. **No 🤖 line in commits.**
4. **Confirm once before pushing**, then push with `-u`.
5. Report the URL. **`preview.yml` uses `destination_dir: preview/${{ github.ref_name }}` and `ref_name` already contains the slash**, so the branch `preview/foo` actually publishes to `/preview/preview/foo/`. Report the real, doubled URL — do not report the tidy one and let the user hit a 404. Say plainly that the doubling is a known quirk (`CLAUDE.md` known issue 2).
6. Offer `/loop /deploy-watch` to watch the run and hand back the verified URL.

## `/deploy stage`

The release candidate. One branch, one URL, always the latest.

1. Run the stage gates locally **before** pushing — `npm run gates` (build, format:check, lint, typecheck). If they fail, fix or report; do not push a red candidate.
2. Fast-forward `stage` onto the current work. If `stage` has diverged, stop and show the divergence — do not force-push.
3. Confirm, push, report `/stage/`.
4. Say explicitly that this replaced whatever was there.

## `/deploy prod`

**Stop short of the deploy.** Merging the PR _is_ the production deploy — `deploy.yml` has no `push` trigger, so a merge is irreversible in the sense that it publishes immediately.

1. Run `/verify` and require it green.
2. Compose the PR body with `/ship`.
3. **Print the exact `gh pr create` command and stop.** Do not open the PR, do not merge, do not offer to merge. Hand it over with one line: "merging this publishes to stoeier.dk."

## Rules

- **Never push, open a PR, or merge without an explicit go-ahead in that turn.** Invoking `/deploy` authorises the one push it describes and nothing else.
- Never `git push --force` to a shared branch. If history diverged, show it and ask.
- If the working tree is dirty and the user asked for `stage` or `prod`, surface that first — an accidental commit of half-finished work onto the release candidate is the failure mode here.
- If a rung named by the user isn't in `envs.json`, say so and list the ones that are.
