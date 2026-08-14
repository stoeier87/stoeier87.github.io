---
name: promote
description: Harden a prototype into the codebase — extract the component, satisfy every standard, run the gates, verify at six viewports, and compose the PR body. Stops before opening the PR. Use when a proto has proven itself and should become real, or the user says promote it, make it real, or clean this up for production.
---

# /promote

Usage: `/promote <slug>`

The one gate between "his idea is live and clickable" and "this is in the codebase." Everything `/idea` deliberately skipped happens here. **This is where the mess gets cleaned** — `DECISIONS.md` ADR-007.

**This is the integrator's tool** (ADR-017). The prototyper produces the idea and the exploration; this skill is how it crosses into the system. Assume the incoming code is prompt-shaped and unreviewed — that is the design, not a complaint. Your job is to make it belong here, not to judge how it arrived.

Work through the phases in order and report a checklist at the end. If a phase fails, stop there and say what's blocking; do not continue and paper over it.

## Phase 1 — Decide where it lives

Read `src/proto/<slug>/` and answer three questions out loud before touching anything:

1. **Is this a page or a component?** A page moves to its own top-level directory (`src/<name>/index.html`). A component moves to `src/shared/components/`, and the proto page becomes its first call site.
2. **Does it duplicate something?** Run `redundancy-scout` against the proto. If it reimplements a starfield, a planet, a back pill or a HUD, use the existing one — extracting on the way in is far cheaper than a cluster to unpick later. `standards.json` → `rule-of-three`.
3. **Does it need Firebase?** If it submits a score, use `src/arcade/shared/score-submit.js` (`submitScoreOnGameOver`, `submitScore`, `fetchGlobalBest`). Never write a second Firebase path.

## Phase 2 — Satisfy every standard

Read `standards.json` and walk it rule by rule. Then hand the diff to **`page-critic`** and fix what it reports. The rules most often missing from a proto:

- `head-order` — `tailwind.css` last.
- `a11y-baseline` — `aria-hidden` on decorative canvas, focus-visible outline in `--color-red`, touch targets ≥44px.
- `canvas-contract` — dpr capped at 2, `setTransform` after resize, `dt` clamped to 33ms, `screenToWorld` for pointer input, virtual `BASE_W`/`BASE_H`.
- `reduced-motion-only-fallback` — a real static end-state, not a disabled page.
- `tokens-sole-sourced` — no hardcoded colours; use `tokens.ts`.
- `react-shaped` — cleanup actually returned and actually called.

## Phase 3 — Copy

Run **`copy-keeper`** over any user-facing text. House voice is light and warm, and mixed Danish/English is deliberate. If the proto invented English copy for a page whose siblings are Danish, flag it rather than silently choosing.

## Phase 4 — Gates

```
npm run gates      # build + format:check + lint + typecheck
```

Fix, don't suppress. An `eslint-disable` needs a comment saying why, and a rule that gets disabled twice is a rule worth changing in `eslint.config.js` instead.

## Phase 5 — Verify

Run `/verify <page>` across the six viewports in `envs.json`. You need the `N/N checks` line and the honest `⚠️` caveat — both are required by the PR template, and the caveat is not optional. If Google Fonts is blocked in your sandbox, say so: anything about how text _sits_ needs human eyes.

## Phase 6 — Compose, then stop

`/ship` builds the PR body. Requirements it will enforce: preview URL first, bolded root cause or purpose, a before/after table with measured numbers **including a row asserting what didn't change**, `## Verification` with the check count and viewports, the `⚠️` caveat, and the session footer.

**Then stop.** Print the `gh pr create` command. Do not open it, do not merge — merging is the production deploy.

## Phase 7 — Clean up the proto

Delete `src/proto/<slug>/` in the same change if the work moved out of it. Leaving both means two live copies and a stale URL people will send each other. If the proto should stay as a playground, say so explicitly in the PR body.

## Report

```
promote <slug>
  location      src/shared/components/<name>.js + src/<page>/index.html
  reused        src/arcade/shared/score-submit.js
  standards     11/11 (page-critic clean)
  copy          Danish, matches siblings
  gates         build ✓  format ✓  lint ✓  typecheck ✓
  verify        24/24 across 6 viewports
  ⚠️            <what you could not check>
  proto         removed
  next          gh pr create … (not run)
```
