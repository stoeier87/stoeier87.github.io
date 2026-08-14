---
name: envs
description: Show what is live on every rung of the deploy ladder right now — URL, HTTP status, branch, commit, age — plus orphaned preview folders that nothing else tracks. Add --verify <rung> for a deep single-rung check (every page reachable, assets resolve under the deploy prefix, no root-absolute path escapes). Use when the user asks what's deployed, what's live, which previews exist, is stage up, or what's on stoeier.dk — or whether an environment is actually healthy, not just up.
---

# /envs

Usage: `/envs` · `/envs --verify <rung>`

Read `envs.json`. For each rung, report **live state, not configuration** — anyone can read the config; the value here is what's actually up.

## `/envs --verify <rung>`

The dashboard view (below) tells you a rung is reachable. This is the deeper pass for one named rung, when reachable isn't enough to trust — after a deploy that touched paths or assets, when a preview URL looks wrong, or whenever someone asks if an environment is actually healthy rather than just up. Read-only, same as the dashboard.

The thing that makes this non-trivial: `vite.config.js` sets `base: "./"` so one build serves both `stoeier.dk` and sub-directory deploys. **The failure mode is a path that resolves against the host root instead of the deploy prefix** — it doesn't 404, it silently loads the _production_ copy. A page can look perfect on a preview while actually showing production's assets, and clicking a link can drop the visitor onto the live site without them noticing.

1. **Reachability.** `curl -sI <url>` → expect 200. Follow one redirect and note it. A 404 on `/stage/` before the first stage deploy is expected. A 404 within ~30 seconds of a green run is `gh-pages` propagation — re-check once.
2. **The URL is the real one.** Branch `preview/foo` publishes to `/preview/preview/foo/` (the doubling quirk). If handed the tidy URL, check both and report which one actually serves.
3. **Every expected page is present.** Loop `envs.json` → `pages.routes`, prefixed with the rung's base, confirm each returns 200. A miss usually means the HTML file moved and `globSync("**/*.html")` no longer picks it up.
4. **Assets resolve under the prefix — the important one.** Fetch the deployed HTML, extract every `href`, `src`, module import. Relative → resolve against the page URL, confirm 200. **Root-absolute (`/…`) → always a finding** — name the file, the path, where it actually lands. Also grep the deployed JS bundles for `"/arcade`, `"/about-me`, `"/space-bar`, `"/scoreboard` — navigation built in JS won't show up in HTML attributes. `script.js`'s homepage planet links are the known offender.
5. **Tailwind and fonts loaded.** Confirm the emitted CSS bundle is reachable and non-trivial in size. A 200 that returns an HTML error page is a classic sub-directory-deploy failure.
6. **`CNAME`, when verifying prod.** `git ls-tree origin/gh-pages CNAME`. Missing means a live production incident — lead with it.

```
envs --verify preview/foo
  url          https://stoeier87.github.io/preview/preview/foo/   200
  pages        13/13 reachable
  assets       41 requests, all resolve under the prefix
  ESCAPES      2 root-absolute paths would leave this environment:
                 script.js  link: "/arcade/orbit-runner"  → production
  verdict      SERVES, but canvas planet links escape to production
```

Lead with escapes when there are any. Don't report the doubled preview path as a bug — known quirk, context not a chase.

## The dashboard (`/envs`, no rung named)

## Gather

Per rung, in parallel where you can:

1. **Reachability** — `curl -s -o /dev/null -w '%{http_code}' <url>` on the rung's URL. Follow one redirect. A 404 on `/stage/` before the first stage deploy is expected, not an error; say so.
2. **Last deploy** — `gh run list --workflow <workflow> --limit 1 --json status,conclusion,createdAt,headBranch,headSha`.
3. **What's actually published** — `git ls-tree -r --name-only origin/gh-pages | head` scoped to the rung's directory, and the commit that wrote it: `git log origin/gh-pages -1 --format='%h %ad %s' --date=relative -- <dir>`. Fetch `gh-pages` first if it isn't present locally.
4. **Local branch state** — for `stage`, whether the local branch is ahead of, behind, or level with `origin/stage`.

## Report

One compact table, most-production last:

```
rung      url                                    http  published        branch
preview   /preview/preview/foo/                  200   3 hours ago      preview/foo
stage     /stage/                                200   20 minutes ago   stage (level)
prod      https://stoeier.dk                     200   2 days ago       main
```

Then a short line per anomaly, only when there is one.

## Always check the two things nothing else tracks

**1. Orphaned preview folders.** `preview-cleanup.yml` only fires for deleted `feature/**` and `stage/**` branches — never `preview/**`. Combined with `keep_files: true`, those folders live on the public site forever. Compare directories under `preview/` on `origin/gh-pages` against branches that still exist on the remote, and list the orphans with their age and URL. Eight were live when this was written.

**2. Path doubling.** `destination_dir: preview/${{ github.ref_name }}` plus a slash in `ref_name` means the branch `preview/foo` publishes to `/preview/preview/foo/`. When you see a doubled path, report the URL that actually works and note why it looks wrong.

## Also worth flagging when true

- **`CNAME`.** `git ls-tree origin/gh-pages CNAME` — production keeps `stoeier.dk` only because `keep_files: true` preserves the file already there; `public/CNAME` was deleted in #52 so the build no longer ships one. If `CNAME` is ever missing from `gh-pages`, that is a live production incident and should lead your report.
- A run that is `in_progress` — say which rung is mid-deploy rather than reporting a stale URL as current.
- A `stage` branch behind `origin/stage`, which means someone else pushed a candidate.

Read-only. This skill never deploys, deletes, or cleans up — if orphans should go, say so and let the user decide.
