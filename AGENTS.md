# AGENTS.md — stoeier87.github.io

**The canonical contract for this repo is [`docs/CLAUDE.md`](./docs/CLAUDE.md). Read it before making changes.** The `CLAUDE.md` at repo root is a pointer that imports it — Claude Code discovers context by filename at root, never by directory, so that stub is what keeps the contract auto-loading.

Quick orientation, so this file is useful on its own:

- Personal portfolio and browser arcade at `stoeier.dk`. **Vanilla ES modules + Canvas 2D**, no framework.
- **Vite 8 as an MPA bundler** — `vite.config.js` globs `**/*.html` into entries, so routing is the filesystem. No `src/`.
- **Tailwind v4** is a core dependency, used as a design-token and shared-component layer. `tailwind.css` loads **last** in every `<head>`.
- **`base: "./"` is load-bearing.** Every path must be relative or it escapes preview/stage onto production.
- **`deploy.yml` has no `push` trigger.** A commit to `main` deploys nothing — merging a PR is the deploy.
- Machine-readable rules live in [`standards.json`](./standards.json); the deploy ladder in [`envs.json`](./envs.json).

> This file used to carry a full prose brief. It was generated in July 2026 and drifted badly — it forbade Tailwind after Tailwind had been adopted, referenced a `styles.css` that had been deleted, described a deploy trigger that no longer existed, and omitted four pages. Rather than maintain two documents that disagree, the content moved to `docs/CLAUDE.md` and this became a pointer. Its useful half — the author's design intent and voice — is preserved in `docs/ANALYSIS.md` §4.
