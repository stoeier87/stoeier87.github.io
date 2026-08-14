---
name: new-page
description: Scaffold a new page that satisfies the page contract by construction — correct head order, relative paths, aria-hidden canvas, js-anim gate, reduced-motion fallback, one rAF loop, Tailwind utilities and no CSS file. Use when adding a real page to the site (not a throwaway — that's /idea).
---

# /new-page

Usage: `/new-page <name>` — creates `<name>/index.html` and `<name>/<name>.js`

For a page that belongs in the site. For a throwaway experiment use `/idea`, which scaffolds into `proto/` instead.

## Why `index.html` and not `<name>.html`

Routing is the filesystem and `vite.config.js` globs `**/*.html` into entries. `<name>/index.html` gives you the clean URL `/<name>/` on GitHub Pages. The repo already renamed away from `<name>/<name>.html` for exactly this reason — the stale `dist/` on disk still shows the old shape, which is why it isn't ground truth.

## The head block, in this order

```html
<!doctype html>
<html lang="da">
  <!-- da for content pages, en for arcade — check siblings -->
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>…</title>
    <link href="../css/all.min.css" rel="stylesheet" />
    <!-- icons, from public/ -->
    <link rel="stylesheet" href="../tailwind.css" />
    <!-- LAST. always. -->
    <script>
      document.documentElement.classList.add("js-anim");
    </script>
  </head>
</html>
```

**`tailwind.css` goes last** — it carries the shared component layer (`.pill`, `.topbar`, `.badge`, `.stat`, `.gameover`) and loading last is what makes it win on equal specificity. Reordering silently restyles eight in-game HUDs.

**No page-local `.css` file.** Styling is Tailwind utility classes in the JS template — `standards.json` → `no-new-css-files`. The 14 existing stylesheets are frozen, not a precedent.

**Every path relative.** The hook blocks root-absolute paths, and it's right to: `base: "./"` is the only reason `/preview/…/` and `/stage/` work.

## Body

```html
<body class="bg-surface-app text-text-primary font-mono">
  <canvas id="bg" aria-hidden="true"></canvas>
  <!-- decorative: hidden -->

  <nav class="pill-back" aria-label="Tilbage">
    <a
      href="../"
      class="focus-visible:outline focus-visible:outline-2
       focus-visible:outline-accent"
      >← Tilbage</a
    >
  </nav>

  <main>…</main>

  <script type="module" src="./<name>.js"></script>
</body>
```

The back pill: **define it locally**, don't reach for the shared `.pill`. That duplication is deliberate — `DECISIONS.md` ADR-002. The shared `.pill` is load-bearing for every in-game canvas HUD, and `.topbar { pointer-events: none }` in `tailwind.css` is what made the About-me back arrow unclickable. Sidestep with a new class; never edit the shared rule.

## The JS

```js
import { cls, motion } from "../tokens.ts";

const reduced = window.matchMedia(motion.reducedMotionQuery);

function setup(host) {
  let raf = 0;
  const tick = (ts) => {
    /* one loop, all systems */ raf = requestAnimationFrame(tick);
  };

  if (reduced.matches) {
    drawStaticEndState(); // the FINISHED composition, not a blank page
  } else {
    raf = requestAnimationFrame(tick);
  }
  return () => cancelAnimationFrame(raf); // React-shaped: return cleanup
}
```

Non-negotiables, all from `standards.json`:

- **One rAF loop.** Scroll listeners are `{ passive: true }` and only set `scrollPos` plus a `dirty` flag.
- **Scroll effects are pure functions of `p = scrollPos / journeyEnd`, clamped `[0,1]`.** The clamp is what makes things settle and hold instead of re-animating later in the scroll.
- **`prefers-reduced-motion` is the only fallback.** Re-read it live with `addEventListener("change", …)`. Never gate motion on viewport width — that was an incident and PR #53 reverted it.
- **Seed your randomness.** This site's skies are identical on every visit on purpose; use a seeded PRNG (`mulberry32`, or the hash PRNG in `script.js`), not `Math.random()`.
- **React-shaped** — props in, markup out, no module-scope side effects, cleanup returned.

## Finish

1. `npm run build` and **confirm `dist/<name>/index.html` exists.** The page does not exist until the build emits it.
2. `npm run gates`.
3. Report the local URL, and offer `/deploy preview <name>` for a shareable one.
