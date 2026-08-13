---
name: explain
description: Answer how-does-this-work questions about the repo from the contract plus live state — what happens when I push to stage, why does tailwind.css load last, where does this deploy to, why is this rule here. Teaches the mechanism rather than just answering. Use for any why or what-happens-if question about this project.
---

# /explain

Usage: `/explain <thing>` — e.g. `/explain what happens when I push to stage` · `/explain why tailwind.css loads last` · `/explain the preview URL doubling`

The teaching channel. Answer from **the contract plus live repo state**, never from general knowledge about static sites — this repo has specific, load-bearing quirks and a generic answer is worse than none.

## Where to look, in this order

1. **`CLAUDE.md`** — the contract. Deploy truth, standards, contracts, conventions.
2. **`DECISIONS.md`** — _why_ it's that way, and whether it was ever reversed. Best source for "why is this weird."
3. **`ANALYSIS.md`** — how the code and the method actually work, in depth.
4. **`envs.json` / `standards.json` / `tokens.ts`** — the config the tooling reads.
5. **The code and workflows themselves** — and if they disagree with the docs, **say so plainly**. That's a finding, not a footnote: the previous `AGENTS.md` drifted into being wrong on five points within three weeks, which is exactly what `/drift-check` exists to catch.
6. **Live state** — `gh run list`, `git log`, `curl` a URL. "Where does this deploy to" deserves a real answer about what's up right now.

## How to answer

Lead with the direct answer in one or two sentences. Then the mechanism. Then the consequence for the person asking.

Cite files as clickable references — `script.js:197`, `.github/workflows/preview.yml` — so the answer is checkable rather than trusted.

**Explain the mechanism, not just the rule.** "Because `tailwind.css` loads last, so its `.topbar { pointer-events: none }` beats your page CSS on equal specificity — that's what made the About-me back arrow unclickable" teaches something. "Because that's the convention" doesn't.

**Name the incident when there is one.** Several rules here exist because something broke: the width-gated parallax, the `neptune`/`neptun` spelling mismatch, the deleted `public/CNAME`, the letter clamp. The story is what makes the rule stick.

Keep it short. Two or three paragraphs for most questions. Offer to go deeper rather than pre-emptively going deep.

## The questions that come up most

- **"What happens when I push to `main`?"** Nothing deploys. `deploy.yml` has no `push` trigger — production publishes only when a PR to `main` closes as merged, or on manual dispatch. Merging the PR _is_ the deploy button.
- **"Where will this be live?"** Read `envs.json`. And warn about the doubling: pushing `preview/foo` publishes to `/preview/preview/foo/` because `destination_dir` is `preview/${{ github.ref_name }}` and `ref_name` already has the slash.
- **"Why can't I use `/arcade/`?"** `base: "./"` means one build serves both `stoeier.dk` and the sub-directory deploys. An absolute path resolves against the host root, so it escapes the preview onto production silently. `guard:allow-absolute` is the escape hatch if you really need it.
- **"Why is `drawPlanet` in three places?"** It was a deliberate stance, and it's been superseded — `DECISIONS.md` ADR-008. Rule of three now. But the per-page back-pill duplication stays, for the reason in ADR-002.
- **"Can I add a dependency?"** `devDependencies` yes. `dependencies` is hook-blocked and needs a decision — see ADR-011, which is where React is parked.
- **"Why does my prototype pass on preview and fail on stage?"** That's the design. ADR-007 — gates hang off the ladder so prototyping stays fast and cleanup happens on promotion.

Read-only. If the answer reveals a bug, say so and stop — don't fix it inside an explanation.
