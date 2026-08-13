**Decision recorded, deliberately not started.** This issue is the anchor for the component-system migration. Nothing in the codebase depends on it yet, and everything currently being built is shaped so that starting it is a port rather than a rewrite.

Full record: `DECISIONS.md` ADR-011 and ADR-012.

## Decision

**TypeScript + React**, with a **hybrid architecture**:

|                        |                                                   |
| ---------------------- | ------------------------------------------------- |
| **SPA**                | homepage, `about-me`, `space-bar`, `arcade` lobby |
| **Standalone entries** | the 8 arcade games, `scoreboard`                  |

## Why React, given a stated preference for TypeScript + Web Components

Four options were weighed: TS + Lit, TS + vanilla custom elements, TS + React, TS + Vue.

**The deciding factor is model-generation quality.** Most code in this repo arrives by prompt — roughly 29% of 190 commits are directly agent-authored, and counting agent PRs merged under human identities it is the majority. Models generate React substantially more reliably than Lit or hand-rolled custom elements. In a repo where prompting _is_ the primary authoring method, that outweighs the architectural elegance of Web Components.

**Honest costs**, so nobody is surprised later:

- ~45KB of runtime where there is currently **zero**. The site has no runtime dependencies at all today; even Firebase loads from a CDN URL rather than npm.
- 14 filesystem-routed MPA entries become React roots, or an SPA with client-side routing on GitHub Pages.
- **Every Canvas game needs a `useRef`/`useEffect` escape hatch out of React's model.** The games are imperative render loops with a fixed virtual resolution and a clamped `dt`; React adds nothing there and costs cleanup correctness. This is exactly why the games stay standalone in the hybrid split rather than being absorbed.
- Lit would have been ~5KB and mapped one-to-one onto the existing per-page component structure. It loses on generation quality alone.

## Blockers to clear before starting

1. **`standards.json` → `no-runtime-deps` must be edited in the same PR that adds React.** It is currently hook-enforced: writing a non-empty `dependencies` block to `package.json` is blocked with a message pointing here. Change the rule deliberately; do not disable the hook quietly.
2. **Tighten TypeScript.** Currently `allowJs: true`, `checkJs: false`, `strict: false` — installed and ready, enforcing nothing. The recorded tightening trigger is: flip `strict: true` and `noUncheckedIndexedAccess: true` in the **first PR that adds a `.ts` file to `shared/`**. Not "later" — later does not arrive.
3. **Decide the SPA routing story on Pages.** Sub-directory previews (`/preview/<topic>/`, `/stage/`) depend on `base: "./"` and relative paths. A client-side router needs to work under an arbitrary path prefix, or the entire preview ladder breaks.

## Migration order, when it starts

**Smallest page first, homepage last.**

1. `scoreboard` — smallest, most self-contained, and the only page with an inline script (`scoreboard/index.html:43-87`). Good proof with low stakes.
2. `about-me` → `space-bar` → `arcade` lobby.
3. The 8 games behind one shared `<GameShell>`, one game per PR. They touch the shared HUD layer in `tailwind.css`, which all eight depend on.
4. **Homepage last.** `script.js` is 850 lines running seven independent animated systems from one rAF loop, with sticky-stage scroll scrubbing and a per-letter `[0,1]` clamp that is load-bearing. PR #53 had to rescue it twice. It is the last thing to touch, not the first.

## What is already being done to make this cheap

- **`react-shaped` is an enforced standard now** (`standards.json`, reviewed by the `page-critic` agent): props in, markup out, no module-scope side effects, no globals, and setup returns its own cleanup. A component written this way is a mechanical port; an IIFE that reaches into `document` is a rewrite.
- **Styling moved into JS** (ADR-009). New components carry Tailwind utility classes in their templates and no new page-local `.css` files are added — which is the shape React wants. The 14 existing stylesheets are frozen, not migrated.
- **`tokens.ts`** is a typed mirror of the `@theme` block, checked by `npm run tokens`, so components import token names instead of guessing them.
- **TypeScript, ESLint and Prettier are installed and green**, gated per rung: `preview` needs only a passing build, `stage` adds format/lint/typecheck. So the toolchain is in place before the migration needs it.

---

_No work should start on this without an explicit decision to begin. Until then it is a record, not a plan._
