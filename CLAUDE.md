# CLAUDE.md — stoeier87.github.io

The canonical contract lives in [`docs/CLAUDE.md`](./docs/CLAUDE.md). It is imported below, so it
loads automatically in every session — this file is a pointer, not a summary. Edit the one in
`docs/`.

@docs/CLAUDE.md

Its companions are read on demand rather than imported, because importing them would load ~50KB
into every session for documents that most turns never touch:

- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — the ADR log, and the record of authority.
- [`docs/ANALYSIS.md`](./docs/ANALYSIS.md) — how the repo and the method actually work.
- [`docs/BACKLOG.md`](./docs/BACKLOG.md) — known debt, one PR each, none in progress.
- [`standards.json`](./standards.json) and [`envs.json`](./envs.json) stay at repo root, next to the
  hooks, eslint config and skills that read them by path.
