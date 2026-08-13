---
name: verify
description: Run the real verification pass — build, confirm every page was emitted, then check the pages across six viewports for console errors, canvas actually painting, reduced-motion fallback, focus rings and touch targets. Emits the N/N checks line and the honest limits caveat that the PR template requires. Use before shipping, or when the user asks to verify, test, or check a page.
---

# /verify

Usage: `/verify` (all pages) · `/verify <page>` (one route)

This exists to make the repo's verification claims **reproducible**. Historically every agent PR claimed "42 checks across two suites" using a Playwright harness built and thrown away each session — real numbers, no reproducible harness. This skill is the harness, without turning a throwaway tool into a permanent dependency.

**Playwright is invoked ad-hoc via `npx` and must never be added to `package.json`.** `standards.json` → `no-runtime-deps` governs runtime deps; keeping the browser out of devDependencies too is a deliberate call, because it's a 300MB install for a check that runs a few times a week.

## Phase 1 — Build, and confirm the routes exist

```
npm run build
```

Then confirm every expected route emitted an HTML file. Read the route list from `envs.json` → `pages.routes` and compare against `dist/`. **Routing is the filesystem** — `vite.config.js` builds inputs from `globSync("**/*.html")`, so a page missing from `dist/` does not exist and nothing else will tell you. Report the count and name any route that's absent or unexpected.

## Phase 2 — Browser checks

Viewports come from `envs.json` → `viewports`: **1440×900 · 1280×800 · 390×844 · 375×812 · 360×640 · 320×568.** Serve `dist/` (`npx vite preview`) rather than the dev server, so you're checking what actually ships.

Per page, per viewport:

1. **No console errors and no unhandled rejections.** Collect them; an error on one viewport only is the interesting case.
2. **Canvas actually paints.** Not "the element exists" — read pixels back and assert they aren't uniformly transparent or uniformly the background colour. A silently blank canvas is this codebase's most common regression and the DOM looks perfect when it happens.
3. **No horizontal overflow.** `documentElement.scrollWidth <= innerWidth + 1`.
4. **Touch targets ≥44px** on anything interactive.
5. **Focus ring visible** — tab to the first interactive element and confirm a visible outline.
6. **Reduced motion.** Re-run with `prefers-reduced-motion: reduce` emulated and assert the page renders its **finished static composition**, not a blank or half-assembled one. On the homepage that means `html.static-home` present, `.journey` not 650vh, and the headline pinned as if scrolled to the end.
7. **Scroll end-state**, for scroll-driven pages: scroll to the bottom and assert the headline and topbar don't collide and letters have settled — the `[0,1]` clamp holding.
8. **Relative paths resolve.** Fail on any network request 404, and separately grep the built output for root-absolute `href`/`src`. This is how you'd catch a preview escaping onto production.

Take a screenshot per page per viewport into a scratch directory. Don't commit them.

## Phase 3 — Report

End with the two lines the PR template requires:

```
24/24 checks — 4 pages × 6 viewports, headless Chromium, dist/ served by vite preview
⚠️  Google Fonts is blocked in this sandbox, so screenshots use fallback type.
    Anything about how text *sits* — line breaks, spacing — needs your eyes.
```

**The caveat is not optional and must be honest.** State what you could not check, every time: blocked fonts, no real touch hardware, no Safari/WebKit, Firebase not exercised. A verification section that claims more than it checked is worse than none — the whole point of the count is that someone can trust it.

If any check fails, report the failing viewport and page, the actual value versus expected, and stop. Do not adjust a threshold to make a check pass.
