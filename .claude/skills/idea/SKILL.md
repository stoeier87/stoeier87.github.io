---
name: idea
description: Turn a one-sentence idea into a running page in about a minute. Scaffolds proto/<slug>/ React-shaped with Tailwind utilities and no CSS file, satisfying the page contract, then starts the dev server. Use when someone describes something they want to see, sketches a concept, or says wouldn't it be cool if.
---

# /idea

Usage: `/idea "planets should react when you shout at them"`

The front door of the prototyping pipeline: **a sentence in, a URL out.** Speed is the feature. Gates come later, at `/promote`. Do not lint, do not typecheck, do not polish — get it moving and get out of the way.

**This is the prototyper's tool, and prototyping is a sandbox** (`DECISIONS.md` ADR-017). Work happens on a `preview/<slug>` branch and deploys to the `preview` rung only. Never suggest `stage`, never suggest a PR to `main`, never suggest merging — none of that is this role's job, and a `preview/` branch structurally cannot reach production. Say so if asked; it's the reason the sandbox can stay this loose.

If the working branch isn't already a `preview/**` one, create `preview/<slug>` before doing anything else.

## 1. One round of clarification, maximum

Ask at most **one** short question, and only if the answer changes the scaffold — which page it lives near, or whether it's canvas or DOM. If you can guess sensibly, guess and say what you assumed. A second question costs more than a wrong guess you can iterate on.

## 2. Scaffold `proto/<slug>/`

Slug is kebab-case from the idea. Three files, no more:

```
proto/<slug>/index.html    the page
proto/<slug>/<slug>.js     one component, React-shaped
proto/<slug>/README.md     the idea in one line + what to try
```

**No `.css` file.** Styling is Tailwind utility classes in the JS template — `standards.json` → `no-new-css-files`, and it's what makes the component a mechanical React port later.

`proto/` is inside the glob, so Vite picks the page up automatically and it ships with a build. That is intentional: a prototype you can send someone is worth more than one you can describe. It also means **prototypes reach production if you merge them** — `/promote` exists so that's a decision, not an accident.

## 3. The component shape — React-shaped on purpose

`standards.json` → `react-shaped`. Props in, markup out, no module-scope side effects, no globals, and **setup returns its own cleanup**:

```js
// proto/<slug>/<slug>.js
export function createThing(host, { speed = 1, accent = "text-accent" } = {}) {
  const el = document.createElement("div");
  el.className = `${accent} font-mono text-body`; // tokens via utilities
  host.append(el);

  let raf = 0;
  const tick = (ts) => {
    /* ... */ raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    el.remove();
  }; // cleanup
}
```

Import token shorthands from `../../tokens.ts` (`cls`, `motion`) rather than retyping class strings or hardcoding a colour.

## 4. The page contract still applies — it's cheap

Even a throwaway gets these, because retrofitting them at `/promote` is the expensive path:

- Every path relative (`../../tailwind.css`). **The hook will block you otherwise.**
- Head order: page CSS if any → icons → `tailwind.css` **last**.
- Decorative canvas gets `aria-hidden="true"`.
- `prefers-reduced-motion` fallback — a static end-state is enough. **Never gate on viewport width.**
- One rAF loop. Scroll effects as pure functions of `p`, clamped `[0,1]`.

## 5. Run it

Start `npm run dev` in the background and hand back `http://localhost:3000/proto/<slug>/`. Then, in three lines: what you built, what you assumed, and what to try next.

Offer — don't run — the next steps:

- `/deploy preview <slug>` for a URL to send someone
- `/idea` again to fork a variant

When it has earned a place in the codebase, that's `/promote <slug>` — but say it as a **handoff**, not a next step you'd take. Promotion is the integrator's call and the boundary between the sandbox and the system.

## Keep out of scope

Don't touch existing pages, don't extract anything into `shared/`, don't add dependencies, don't write tests. A prototype that reaches into the rest of the site stops being disposable, and disposability is the whole point.
