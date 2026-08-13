---
name: envs
description: Show what is live on every rung of the deploy ladder right now — URL, HTTP status, branch, commit, age — plus orphaned preview folders that nothing else tracks. Use when the user asks what's deployed, what's live, which previews exist, is stage up, or what's on stoeier.dk.
---

# /envs

Read `envs.json`. For each rung, report **live state, not configuration** — anyone can read the config; the value here is what's actually up.

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
