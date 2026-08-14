#!/usr/bin/env node
/**
 * guard.mjs — the two hard blocks.
 *
 * PreToolUse hook on Write/Edit. Enforces exactly the two rules from
 * standards.json whose severity is "fatal" AND whose enforcement is
 * "hook-block", because both of them fail SILENTLY in production:
 *
 *   relative-paths   a root-absolute path escapes /preview/<topic>/ and /stage/
 *                    onto production, with no error anywhere
 *   no-runtime-deps  a runtime dependency ends the zero-dep stance unnoticed
 *
 * Everything else teaches instead of blocking. Noisy hooks get disabled, and a
 * disabled hook protects nothing. See DECISIONS.md ADR-010.
 *
 * Contract: read the hook payload on stdin, exit 0 to allow, exit 2 with a
 * message on stderr to block.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const ESCAPE = "guard:allow-absolute";

const CODE_EXT = new Set([".html", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".css"]);

/** Documentation and config quote absolute paths on purpose. */
const SKIP_EXT = new Set([".md", ".json", ".yml", ".yaml", ".txt"]);

/**
 * Top-level routes, read from standards.json so adding one is a config entry.
 * `"/arcade/..."` in JS is the real-world shape of this bug — known issue 1,
 * script.js:52-125.
 *
 * Falls back to a built-in list if standards.json is unreadable: a hook must
 * never break a session over its own config.
 */
const ROUTES = (() => {
  const fallback = ["arcade", "about-me", "space-bar", "scoreboard", "preview", "stage", "proto"];
  try {
    const root = process.env.CLAUDE_PROJECT_DIR ?? path.resolve(import.meta.dirname, "../..");
    const standards = JSON.parse(readFileSync(path.join(root, "standards.json"), "utf8"));
    const rule = standards.rules?.find((r) => r.id === "relative-paths");
    return rule?.routePrefixes?.length ? rule.routePrefixes : fallback;
  } catch {
    return fallback;
  }
})();

const PATTERNS = [
  {
    re: /(?:href|src|action|poster)\s*=\s*["']\/(?!\/)/i,
    what: "a root-absolute HTML attribute",
  },
  {
    re: /location\s*\.\s*(?:href|assign|replace)\s*(?:=|\()\s*["']\/(?!\/)/i,
    what: "a root-absolute navigation",
  },
  {
    re: new RegExp(`["']\\/(?:${ROUTES.join("|")})(?:\\/|["'])`, "i"),
    what: "a root-absolute site route",
  },
  {
    re: /(?:import|from)\s+["']\/(?!\/)/,
    what: "a root-absolute module import",
  },
];

function extOf(p = "") {
  const i = p.lastIndexOf(".");
  return i === -1 ? "" : p.slice(i).toLowerCase();
}

function baseOf(p = "") {
  return p.split("/").pop() ?? "";
}

/** @returns {{line: number, text: string, what: string} | null} */
function findAbsolutePath(content) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(ESCAPE)) continue;
    for (const { re, what } of PATTERNS) {
      if (re.test(line)) return { line: i + 1, text: line.trim(), what };
    }
  }
  return null;
}

/** True when a "dependencies" block is present and non-empty. */
function addsRuntimeDeps(content) {
  // The JSON key is exactly "dependencies"; "devDependencies" has a capital D,
  // so a lowercase match cannot collide with it.
  const m = content.match(/"dependencies"\s*:\s*\{([^}]*)\}/);
  if (m) return m[1].trim().length > 0;
  // Edit fragments may not include the closing brace.
  return /"dependencies"\s*:\s*\{\s*"/.test(content);
}

function block(lines) {
  process.stderr.write(lines.join("\n") + "\n");
  process.exit(2);
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    process.exit(0); // never break the session over a parse failure
  }

  const input = payload.tool_input ?? {};
  const filePath = input.file_path ?? "";
  if (!filePath) process.exit(0);

  // Write carries the whole file; Edit carries only the replacement text.
  const content =
    typeof input.content === "string"
      ? input.content
      : typeof input.new_string === "string"
        ? input.new_string
        : "";
  if (!content) process.exit(0);

  const ext = extOf(filePath);
  const base = baseOf(filePath);
  const isOwnConfig = filePath.includes("/.claude/");

  /* ── no-runtime-deps ─────────────────────────────────────────────── */
  if (base === "package.json" && addsRuntimeDeps(content)) {
    block([
      "BLOCKED — standards.json rule `no-runtime-deps`",
      "",
      'This adds a non-empty "dependencies" block to package.json.',
      "",
      "Why it matters: this is a static site on GitHub Pages with zero runtime",
      "dependencies. Even Firebase is loaded from a CDN URL rather than npm. A",
      "runtime dep changes the bundle for every visitor and nobody notices.",
      "",
      "  devDependencies  — fine, go ahead",
      "  dependencies     — needs a human decision first",
      "",
      "If this is the React migration starting (DECISIONS.md ADR-011), edit the",
      "`no-runtime-deps` rule in standards.json in the SAME change. Do not",
      "disable this hook quietly.",
    ]);
  }

  /* ── relative-paths ──────────────────────────────────────────────── */
  if (!isOwnConfig && CODE_EXT.has(ext) && !SKIP_EXT.has(ext)) {
    const hit = findAbsolutePath(content);
    if (hit) {
      block([
        "BLOCKED — standards.json rule `relative-paths`",
        "",
        `${filePath}:${hit.line} contains ${hit.what}:`,
        "",
        `    ${hit.text.slice(0, 160)}`,
        "",
        'Why it matters: vite.config.js sets base: "./" so one build serves both',
        "stoeier.dk and the sub-directory deploys. A root-absolute path resolves",
        "against the host root, so it silently escapes /preview/<topic>/ and",
        "/stage/ onto production — no error, and the visitor never learns they",
        "left the preview they were sent.",
        "",
        "Use ./ or ../ instead.",
        "",
        `Genuinely need an absolute path? Put \`${ESCAPE}\` on that line.`,
      ]);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
