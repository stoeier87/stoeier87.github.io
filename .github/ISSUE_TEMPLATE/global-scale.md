---
name: Global scale-up
about: A pattern that works in one corner of the site but needs to become shared, unified core code
title: "[global] "
labels: global
assignees: Spiegelberg
---

<!--
For: reporting a place where legacy/duplicated code should be unified into
shared core code, at app scale (not a single-page bug).
Example scope used below: arcade. Swap for whatever area you're flagging.
-->

## Scope

Which area is this about? (e.g. `arcade`, `homepage`, all pages with a topbar…)

## What exists today (legacy)

Describe the current, per-page/per-component way this is done. Point at the
specific files/functions if you know them.

- File(s):
- Pattern/duplication observed:

## What "unified" should look like

What should this become instead — one shared component, one source of truth,
one config? Reference `docs/CLAUDE.md` §3 rule 8 (rule of three) and §7
(element-shaped components) if relevant.

## Screenshots

<!-- Drag & drop images here. Before/after if you have both. -->

## Live URLs

<!-- Preview / stage / prod links that show the current behavior. -->
-

## Additional context

<!-- Anything else Jesper needs to make the call: scale of the change, risk, dependencies. -->

---

## For Tobias — copy/paste this to your Claude Code session

```
I'm filing a "global" issue for Jesper about unifying some legacy code
across the site. Scope: <fill in area, e.g. "arcade">.

Please gather, from the current state of the repo:
1. Every file/component implementing this pattern today, with file paths
   and line numbers.
2. How many times it's duplicated (rule of three from docs/CLAUDE.md §3.8)
   and where the copies differ.
3. Screenshots of the current behavior on at least two pages that use it
   (use the /run skill or dev server, and save the images so I can attach
   them to the GitHub issue).
4. The live preview/stage/prod URLs where this is visible, if any
   (check with /envs).
5. A short, plain-English description of what "unified" should look like —
   one shared component/config, not per-page copies — that I can hand to
   Jesper without him having to read code.

Do not fix or extract anything — this is for a GitHub issue, read-only
investigation only. Give me the answer as: Scope, What exists today,
Proposed unification, list of files, and list of URLs, so I can paste it
straight into the issue template.
```
