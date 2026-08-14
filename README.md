# stoeier87.github.io

Personal portfolio and browser arcade for Tobias Fullerton Støier, live at [stoeier.dk](https://stoeier.dk).

Vanilla ES modules + Canvas 2D, Tailwind v4, Vite as a pure multi-page bundler. No framework, no SPA router — routing is the filesystem. Zero runtime dependencies.

**This file is the front door. `CLAUDE.md` is the canonical contract** — deploy mechanics, standards, the full toolbox, commit/PR conventions. Read that before touching CI, `.claude/`, or anything gated. This file exists so a clone doesn't start with `CLAUDE.md`'s wall of text.

---

## Quick start

```bash
npm install
npm run dev        # localhost:3000, no gates
```

Other scripts:

```bash
npm run build       # vite build → dist/
npm run gates       # build + format:check + lint + typecheck + tokens — what CI runs on stage/prod
npm run format      # prettier --write .
npm run tokens      # scripts/tokens-check.mjs — tokens.ts vs tailwind.css @theme
```

No lockfile is committed (`package-lock.json` is gitignored — see [Known issues](#known-issues) below), so `npm install`, not `npm ci`.

---

## Branches and deploy

**There is no `push` trigger to `main`. Merging a PR is the deploy.** A direct commit to `main` publishes nothing; closing a PR against it as merged publishes to `stoeier.dk` within about a minute.

| Rung      | How you get there      | Lands at            | Gates                     |
| --------- | ---------------------- | ------------------- | ------------------------- |
| `local`   | `npm run dev`          | `localhost:3000`    | none                      |
| `preview` | push `preview/<topic>` | `/preview/<topic>/` | build                     |
| `stage`   | push to `stage`        | `/stage/`           | + format, lint, typecheck |
| `prod`    | merge a PR to `main`   | `stoeier.dk`        | + `/verify`               |

Branch naming: prefix by origin (`claude/`, `copilot/`, `iterm/`, `github/`) or intent (`fix/`, `hotfix/`, `patch/`, `findings/`); `preview/<topic>` and `stage` are reserved for the ladder itself.

**Two roles, deliberately split** (`CLAUDE.md` §1b):

- **Tobias, prototyper** — works in `preview/<topic>` and `proto/`, deploys to `preview` only. Never pushes `stage`, never opens a PR to `main`, never merges.
- **Jesper, integrator/CTO** — works anywhere, owns promotion from `preview` through `stage` into `prod`.

That split is enforced by GitHub branch protection on `main` and `stage` (`DECISIONS.md` ADR-020), not just by this paragraph — the table alone was tried once already and pre-contract history is exactly what it's meant to stop.

Use `/deploy` (a Claude Code skill, see below) rather than pushing by hand — it handles the `preview/<topic>` directory-doubling quirk and watches the run for you.

---

## Versioning and changelog

**There is no changelog file and no semver scheme in place yet.** `package.json` has sat at a static `"version": "1.0.0"` since the repo's start, there are no git tags, and nothing in CI reads or bumps the version.

A design for this exists but is **parked, not built**: bump `package.json` before merge, tag the commit after a successful prod deploy, a new `/release` skill, and a hand-authored `CHANGELOG.md` (Keep a Changelog style, not auto-generated from commit messages — house style here is prose judgments, not changelog-formatted subjects). If you want to pick this up, ask for it explicitly; it hasn't been scoped into a `DECISIONS.md` ADR yet.

Until then, **the commit log is the changelog.** Conventional Commits with page-level scopes:

```
fix(space-bar): dial the alien back down, 40% read as too heavy
fix(homepage,arcade,scoreboard,space-bar): unify the back pill
content(about): revise the teaching and jury paragraphs
```

`content:` is a non-standard type reserved for copy-only edits. Subjects are prose judgments ("dial back down, read as too heavy"), not terse changelog lines. See `CLAUDE.md` §5 for the full convention, including the `Claude-Session:` trailer Claude-authored commits carry.

---

## The `.claude/` toolbox

This repo carries a set of Claude Code skills and read-only review agents scoped to the deploy ladder and the standards below. Two entry points if you're new to it:

- `/idea "<sentence>"` — prototyper's whole surface: scaffolds `proto/<slug>/` and deploys to `preview`.
- `/deploy [rung] [topic]` — the one deploy verb; pushes, watches the run, hands back a verified URL.

Full toolbox reference — every skill, what each read-only agent checks, and what got trimmed and why — is `CLAUDE.md` §4 and `DECISIONS.md` ADR-020.

---

## Standards, briefly

Full rules (and the machine-readable version the hooks and `page-critic` read) are `standards.json` and `CLAUDE.md` §3. The two hard-blocked ones:

1. **Every path is relative** (`./`, `../`) — `base: "./"` in `vite.config.js` is the only reason sub-directory deploys work at all.
2. **No runtime dependencies** — `devDependencies` only.

Everything else — the Canvas contract (DPR cap, `dt` clamp, virtual-resolution letterboxing), the one-rAF-loop rule, `prefers-reduced-motion` as the sole motion fallback, design tokens sole-sourced in `tailwind.css` `@theme` — is taught inline in `CLAUDE.md` §3, not repeated here.

---

## Repo map

```
*.html                    # every page — routing is the filesystem, drop a file anywhere and it ships
arcade/                   # 8 canvas games + shared arcade code
proto/                    # prototyper sandbox, deploys to preview only
tools/                    # a later addition, own canvas work, own duplication cluster (BACKLOG B9)
tokens.ts                 # design tokens, typed mirror of tailwind.css @theme
standards.json            # machine-readable rules — page-critic and guard.mjs read this
envs.json                 # deploy ladder ground truth — what's live on each rung
.claude/                  # skills, agents, hooks
.github/workflows/        # build, deploy, preview, preview-cleanup, stage, stage-reset
```

`dist/` on disk (if present) is stale — rebuild rather than trust it.

---

## Docs, in reading order

1. **`CLAUDE.md`** — canonical contract: deploy truth, role split, standards, full toolbox, commit/PR conventions.
2. **`DECISIONS.md`** — the ADR log, why things are the way they are, sequential.
3. **`BACKLOG.md`** — known debt, one PR each, grouped by what happens if ignored. Nothing in it is in progress.
4. **`ANALYSIS.md`** — how the repo and the prototyping method actually work in practice.

## Known issues

Twelve tracked items live in `BACKLOG.md`, grouped by blast radius. The two sharpest: `main` branch protection is specified but not yet applied (`BACKLOG.md` B3, `DECISIONS.md` ADR-020 has the exact settings), and there's no committed lockfile so builds aren't strictly reproducible (B7). Don't fix opportunistically — each is scoped as its own PR.
