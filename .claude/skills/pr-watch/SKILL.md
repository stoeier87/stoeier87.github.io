---
name: pr-watch
description: Watch open pull requests for merge-readiness — build status, whether a preview actually deployed, and whether the body carries the required root cause and verification sections. Never merges. Designed for /loop /pr-watch. Use when the user asks about open PRs or what's ready to merge.
---

# /pr-watch

Standalone, or as `/loop /pr-watch`.

**Merging a PR to `main` is the production deploy** — `deploy.yml` has no `push` trigger. So "merge-ready" here means "ready to be live on `stoeier.dk` in about a minute." Judge it that way.

## One pass

```
gh pr list --state open --json number,title,headRefName,author,createdAt,isDraft,body,statusCheckRollup
```

Per PR, assess four things:

**1. Checks.** `statusCheckRollup`, and `gh run list --branch <headRef> --limit 3` for detail. Note that **every** PR event triggers a build in `deploy.yml` as a merge-commit smoke test — a green build there does not mean anything was published.

**2. Did a preview actually deploy?** Only `preview/**`, `stage/**` and `feature/**` pushes publish. A PR from `claude/…`, `copilot/…`, `fix/…` or a bare branch name has **no preview**, which means nobody can look at it before it goes live. That is the single most useful thing this skill reports. The remedy is a rename: `git branch -m preview/<topic>` — PR #44 → #45 is the precedent, and the hand-off note there is the model ("Same commits. Not merged — yours to look at first.").

Check the URL is actually up, don't infer it from the branch name.

**3. Body completeness**, against the template in `CLAUDE.md` §5:

- preview URL on line one
- root cause in bold, before the fix
- a before/after table with measured numbers, including a row asserting what didn't change
- `## Verification` with a check count and the viewports used
- a `⚠️` limits caveat
- session-link footer

An empty body is worth flagging every time. Historically human PRs here have empty bodies — #51's was literally `PR ` — and since there are no reviews, an empty body means the change has no durable record of why it's correct.

**4. Age and staleness.** Behind `main`? Superseded by a newer PR from the same branch family? Say so, and suggest the explicit hand-off note rather than a silent close.

## Report

```
#54  fix(space-bar): settle the star map on narrow phones     [preview/star-map]
     checks    ✓ build 1m38s
     preview   ✓ https://stoeier87.github.io/preview/preview/star-map/  (200)
     body      ⚠ no before/after table, no ⚠️ caveat
     verdict   NOT READY — body missing verification section

#52  trying to fix                                            [super/cool]
     checks    ✓
     preview   ✗ branch prefix doesn't trigger preview.yml — nothing to look at
     body      ✗ empty
     verdict   NOT READY — no preview, no record. Rename to preview/<topic>.
```

End with one line: which PRs are merge-ready and which aren't.

## Never

- Never merge. Never approve. Never push to someone else's branch.
- Never edit a PR body. Draft the missing section and offer it.
- Don't re-report an unchanged PR every tick. Report on change; otherwise hold quietly (`noop: true`) with a long interval (1200s+). Open PRs move on human timescales — checking every minute is waste.
