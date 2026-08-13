---
name: ux-polish
description: Iteratively polish one page's user experience — render at six viewports, screenshot, critique against the site's visual identity, apply exactly one improvement, verify nothing regressed, report. Designed for /loop /ux-polish <page>. Use when the user wants a page to feel better, tightened, or more polished.
---

# /ux-polish

Usage: `/ux-polish <page>` · `/loop /ux-polish <page>`

**One improvement per pass.** That is the whole discipline. A pass that changes five things can't be reviewed or reverted cleanly, and on scroll-driven canvas pages the interactions between changes are exactly where regressions hide.

## One pass

**1. Look.** Serve `dist/` (`npm run build && npx vite preview`) and screenshot the page at all six viewports from `envs.json`: 1440×900, 1280×800, 390×844, 375×812, 360×640, 320×568. For scroll-driven pages capture at least start / middle / end of the journey. Also capture with `prefers-reduced-motion: reduce` emulated.

**2. Critique against _this_ site's identity**, not general taste:

- **Type.** `Archivo Black` for display, `Space Mono` for UI. Fluid `clamp()` sizes from `tokens.ts` — `--text-hero`, `--text-h1`, `--text-overline`. Tracking is wide on overlines (`0.14em`–`0.22em`) and tight on display.
- **Palette.** `--color-bg` `#0d1424`, ink white with muted/dim alpha steps, `--color-red` `#e03a2f` as the single accent. **Nothing hardcoded** — `tokens.ts` is the source. The `--color-scoreboard-*` sub-palette is a deliberate drift; leave it.
- **Motion vocabulary.** Slow, orbital, deterministic. Seeded PRNG so the sky is identical every visit. Parallax factors between 0.03 and 0.62. Sine-based twinkle and float. Nothing snappy or bouncy — the whole site drifts.
- **Contrast against moving content.** A planet passing behind text is the recurring readability failure. The homepage solves it with a `.stage::before` radial scrim. Check text legibility at the _worst_ frame, not a lucky one.
- **Voice.** Light and warm, mixed Danish/English on purpose. Run `copy-keeper` before touching any words.
- **Touch.** ≥44px targets. Portrait first — most visits are phones.
- **Z-order.** dotgrid (1) < starfield/planets (2) < journey (5) < topbar (20). Explicit and unconditional.

**3. Pick one thing.** Prefer, in order: something broken at 320–375px · a contrast or legibility failure · a spacing inconsistency against the token scale · a motion detail that adds delight. Say what you picked and what you deliberately left.

**4. Apply it.**

- Tailwind utilities in the JS template. **No new `.css` file**, no edits to the shared component layer in `tailwind.css` — eight game HUDs depend on it.
- Tokens only, no literal colours.
- **Never gate motion on viewport width.** `prefers-reduced-motion` is the only fallback.
- Keep the single rAF loop and the `[0,1]` clamp on scroll progress.

**5. Verify.** Re-screenshot all six viewports and diff against the before set. Confirm the intended change happened **and nothing else did**. Run `npm run gates`. On a scroll page, re-check the end state — headline and topbar not colliding, letters settled.

**6. Report.**

```
ux-polish space-bar — pass 3
  looked at   6 viewports + reduced-motion
  found       filter row baseline drifts 4px from the alien at 360px
  changed     alien 54px→50px on <=390px so the baselines line up
  left alone  star-map density on desktop (fine), copy (needs your call)
  verified    6/6 viewports, no other visual delta, gates green
```

## As a loop

- One improvement per tick, then hold. Don't batch.
- If a pass finds nothing worth changing, say so and hold quietly (`noop: true`) — a polish loop that invents work to justify itself makes the page worse.
- Long intervals (1200s+). This is human-review-paced work, and every pass produces a diff someone has to look at.
- **Never commit, never deploy.** Leave the change in the working tree and report. The human decides whether it ships.
- Copy changes are always proposed, never applied — Danish copy in particular.
