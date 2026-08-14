/**
 * ESLint flat config.
 *
 * A small, deliberate rule set aimed at THIS codebase's real failure modes —
 * not a style pack. Formatting is Prettier's job; anything ESLint says here
 * should be a potential bug.
 *
 * Graduated on purpose (DECISIONS.md ADR-007): legacy pages get the bug rules,
 * new code in shared/ and proto/ gets those plus the path rule that the write
 * hook enforces live. Tightening happens per file, when you're already in it.
 */

import { readFileSync } from "node:fs";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  location: "readonly",
  console: "readonly",
  // Bare `addEventListener(...)` is implicit `window.addEventListener` and is
  // used that way throughout the arcade. Without these it reads as 20 no-undefs.
  addEventListener: "readonly",
  removeEventListener: "readonly",
  dispatchEvent: "readonly",
  scrollTo: "readonly",
  scrollBy: "readonly",
  self: "readonly",
  screen: "readonly",
  crypto: "readonly",
  Event: "readonly",
  CustomEvent: "readonly",
  AbortController: "readonly",
  DOMParser: "readonly",
  OffscreenCanvas: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  matchMedia: "readonly",
  devicePixelRatio: "readonly",
  innerWidth: "readonly",
  innerHeight: "readonly",
  scrollY: "readonly",
  visualViewport: "readonly",
  performance: "readonly",
  fetch: "readonly",
  Image: "readonly",
  Audio: "readonly",
  Path2D: "readonly",
  ResizeObserver: "readonly",
  IntersectionObserver: "readonly",
  MutationObserver: "readonly",
  HTMLElement: "readonly",
  HTMLCanvasElement: "readonly",
  CanvasRenderingContext2D: "readonly",
  customElements: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  history: "readonly",
  alert: "readonly",
  confirm: "readonly",
  prompt: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  structuredClone: "readonly",
  queueMicrotask: "readonly",
  getComputedStyle: "readonly",
};

const nodeGlobals = {
  process: "readonly",
  console: "readonly",
  __dirname: "readonly",
  Buffer: "readonly",
  URL: "readonly",
};

/**
 * Root-absolute site routes, read from standards.json — the same list the write
 * hook uses, so adding a route is one config entry and both enforcers pick it up.
 * Escapes /preview/<topic>/ and /stage/ onto production.
 */
const routePrefixes = JSON.parse(readFileSync(new URL("./standards.json", import.meta.url), "utf8"))
  .rules.find((r) => r.id === "relative-paths")
  .routePrefixes.join("|");

const ABSOLUTE_ROUTE = String.raw`/^\/(?:${routePrefixes})(?:\/|$)/`;

const unusedVarsOptions = {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  caughtErrorsIgnorePattern: "^_",
  destructuredArrayIgnorePattern: "^_",
};

const bugRules = {
  // Real bugs, not taste.
  "no-undef": "error",
  /**
   * Warn, not error, on legacy pages. Measured: 15 genuine dead-code findings
   * across the existing 14 pages (showToast, toastHideAt, bhBusy, docked,
   * landed, DESKTOP_W/H, GTAG_ID, gtagPlugin). All real, none urgent — making
   * them errors would leave the stage gate red on day one and teach everyone to
   * ignore it. New code gets `error`; see the strict block at the bottom.
   */
  "no-unused-vars": ["warn", unusedVarsOptions],
  "no-dupe-keys": "error",
  "no-dupe-args": "error",
  "no-duplicate-case": "error",
  "no-unreachable": "error",
  "no-const-assign": "error",
  "no-self-assign": "error",
  "no-self-compare": "error",
  "no-unsafe-negation": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
  "no-fallthrough": "error",
  "no-cond-assign": ["error", "always"],
  "no-constant-condition": ["error", { checkLoops: false }],

  // Cheap correctness wins in vanilla, IIFE-heavy code.
  eqeqeq: ["error", "smart"],
  "no-implicit-coercion": "off",
  "no-empty": ["warn", { allowEmptyCatch: true }],

  /**
   * `no-var` and `prefer-const` are deliberately NOT here. Measured on the real
   * repo they produced 290 of 325 findings — pure style noise on code that uses
   * `let` and `var` pervasively and correctly. Formatting and idiom are not this
   * config's job; a lint report that is 89% noise gets ignored wholesale, and
   * then the four real bugs in it get ignored too. Enforced on new code only.
   */

  // Games log deliberately.
  "no-console": "off",
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src/public/**",
      ".vite/**",
      // A git worktree holds a FULL second copy of the repo. ESLint, unlike
      // glob, happily descends into dot-directories, so without this every
      // worktree gets linted twice over and reports errors against files that
      // are not the ones you are editing. Same failure class as ADR-014.
      ".claude/worktrees/**",
      // Generated in CI from repo variables — never hand-edited, never linted.
      "src/arcade/shared/firebase-config.js",
    ],
  },

  // Browser code: pages, games, shared modules, prototypes.
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: bugRules,
  },

  // Tooling that runs in Node.
  {
    files: ["vite.config.js", "eslint.config.js", "scripts/**/*.mjs", ".claude/hooks/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: bugRules,
  },

  /**
   * New code, held to the full bar. This is the "gradual, strict later" of
   * DECISIONS.md ADR-011 made concrete: legacy is warned about, new code is
   * gated. A legacy file opts in by being moved into shared/ — which is exactly
   * when someone is already reading it.
   *
   * vite.config.js is deliberately absent: its two unused symbols are the dead
   * gtagPlugin stub, documented as known issue 6.
   */
  {
    files: [
      "src/shared/**/*.{js,mjs,ts}",
      "src/proto/**/*.{js,mjs,ts}",
      "scripts/**/*.mjs",
      ".claude/hooks/*.mjs",
      "eslint.config.js",
    ],
    rules: {
      "no-unused-vars": ["error", unusedVarsOptions],
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },

  /**
   * The path rule on new code. The write hook blocks root-absolute paths live,
   * but it only sees edits made through the harness — this catches anything that
   * arrives another way: a paste, a merge, an editor, a different agent.
   *
   * Scoped to new code because script.js:52-125 holds the standing violation
   * (known issue 1), and turning the whole repo red would make the gate
   * meaningless on day one.
   */
  {
    files: ["src/shared/**/*.{js,mjs,ts}", "src/proto/**/*.{js,mjs,ts}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${ABSOLUTE_ROUTE}]`,
          message:
            'Root-absolute site path. base: "./" means this escapes /preview/<topic>/ and /stage/ onto production. Use ./ or ../ — see standards.json rule `relative-paths`.',
        },
      ],
    },
  },
];
