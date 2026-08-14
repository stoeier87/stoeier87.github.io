---
name: dedupe
description: Find duplicated logic and CSS across the site, report it ranked with a rule-of-three verdict, and stop. Only after a human approves a cluster does it extract into shared components, one page per pass, verifying visual output stays identical. Designed for /loop /dedupe. Use when the user asks about duplication, redundant code, or wants to move toward shared components.
---

# /dedupe

Standalone, or as `/loop /dedupe`.

**Two phases, and the gate between them is a human.** `standards.json` → `rule-of-three`, `DECISIONS.md` → ADR-008.

---

## Phase 1 — Report, then stop

Run the **`redundancy-scout`** agent and relay its report. **Then stop.** Do not extract anything. Do not "start with the easy one." The loop ends this tick.

The report ranks clusters by `occurrences × risk-of-divergence ÷ extraction-risk`, and each entry carries: exact paths and line numbers, how the copies differ, a rule-of-three verdict, and a proposed extraction target.

### Two things the report must get right

**Some duplication is correct, and calling it a defect is a real error.** The per-page back-pill CSS in `index.css`, `about-me/about-me.css`, `space-bar/space-bar.css` and `arcade/arcade.css` is **deliberate** — ADR-002. The shared `.pill` in `tailwind.css` is load-bearing for every in-game canvas HUD, `tailwind.css` loads last so it wins on equal specificity, and `.topbar { pointer-events: none }` already broke the About-me back arrow once. PR #53 confirmed the per-page duplication as intentional. Mark it `keep`, with the reason.

**Divergence risk is the real ranking signal, not copy count.** Three copies of a pure drawing routine that will never need to differ is a genuine extraction candidate. Three copies that each have hand-tuned visual differences are three components that happen to look similar, and merging them produces a function with five boolean flags — worse than the duplication.

### Standing clusters

| Cluster        | Copies | Verdict                                                                                                                     |
| -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `drawPlanet`   | 3      | extract — `script.js:197`, `arcade/arcade.js:83`, `arcade/shared/starfield.js:55`. `arcade/shared/starfield.js` is the seed |
| head block     | 14     | extract — build-time partial, zero runtime cost                                                                             |
| starfield init | 5      | extract — incl. one inlined in `scoreboard/index.html:43-87`                                                                |
| back-pill CSS  | 4      | **keep** — ADR-002                                                                                                          |

---

## Phase 2 — Extract, one cluster and one page per pass

**Only after a human names a cluster to extract.** Never infer approval from a previous tick.

**1. Create the shared module.** Site-wide code goes in `shared/` at the repo root, not `arcade/shared/` — that directory is arcade-scoped. Written React-shaped: props in, markup out, no module-scope side effects, cleanup returned (`standards.json` → `react-shaped`).

Handle variation with **options, not flags**. `drawPlanet(ctx, p, x, y, r, { ring, bands, earth })` is fine because those are data-driven features the callers already carry. Five booleans that each switch a code path is not.

**2. Migrate exactly one call site.** One page per pass. Not two.

**3. Prove the output is identical.** Screenshot before and after at all six viewports from `envs.json`. **Pixel-identical is the pass condition** — extraction is a refactor, and any visual delta means you changed behaviour and should stop. Then `npm run gates`.

**4. Report and stop.** Leave the change in the working tree. Don't commit, don't deploy, don't start the next page.

### Extraction hazards, specific to this repo

- **Seeded randomness.** Skies are identical on every visit on purpose. If a copy uses `rand(seed)` with a hash PRNG and another uses `mulberry32(9137)`, they produce _different_ skies from the same input. Extracting naively changes what every page looks like. Preserve each call site's seed and generator, or the "pixel-identical" check will fail and it will be right to.
- **`tailwind.css`'s component layer.** Eight games depend on `.pill`, `.topbar`, `.badge`, `.stat`, `.gameover`. Migrate additively — add a new class, move one page, verify, repeat. **Never edit a shared rule and hope.**
- **The scroll pipeline in `script.js` is explicitly out of scope** unless asked. It's the most fragile system here, PR #53 rescued it twice, and it's intentionally self-contained. It's the last thing to touch, not the first.
- **`arcade/shared/backgrounds-iss.js` uses deterministic crater seeds.** Same hazard as above.

## As a loop

- Phase 1 runs once and stops. Report the ranked clusters and hold (`noop: false` — a report is a finding worth keeping).
- Phase 2 does **one page per tick**, then holds for review. A refactor loop that runs unattended across eight game HUDs is how you break the arcade in one pass.
- Long intervals (1800s+). Every tick produces a diff a human has to look at.
- Never commit, never deploy, never merge.
