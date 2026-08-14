#!/usr/bin/env node
/**
 * tokens-check.mjs — fail when tokens.ts and the @theme block in tailwind.css
 * disagree.
 *
 * tailwind.css is still the runtime source (Tailwind v4 reads @theme). tokens.ts
 * is the typed mirror JS components import from. Two sources of truth only work
 * if something checks them, so this is that something.
 *
 * Aliases whose CSS value is a var() reference are skipped — they resolve to
 * another token by design and have no literal to compare.
 *
 * Run: npm run tokens
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const SRC = path.join(root, "src");
const CSS = path.join(SRC, "tailwind.css");
const TS = path.join(SRC, "tokens.ts");

/** Pull the @theme block's custom properties out of the stylesheet. */
function parseTheme(css) {
  const start = css.indexOf("@theme");
  if (start === -1) throw new Error("no @theme block found in tailwind.css");

  const open = css.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error("unterminated @theme block");

  const body = css.slice(open + 1, end);
  const out = new Map();
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*--([\w-]+)\s*:\s*(.+?);\s*(?:\/\*.*)?$/);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
}

/**
 * Read THEME_MIRROR out of tokens.ts without a TS toolchain: resolve the
 * `foo.bar.baz` references against the object literals in the same file.
 */
async function parseMirror(ts) {
  const block = ts.match(/export const THEME_MIRROR[^{]*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error("no THEME_MIRROR export found in tokens.ts");

  // Every string literal assigned in the file, keyed by its property path tail.
  const literals = new Map();
  const groupRe = /export const (\w+) = \{([\s\S]*?)\n\} as const;/g;
  for (const [, groupName, groupBody] of ts.matchAll(groupRe)) {
    let sub = null;
    for (const line of groupBody.split("\n")) {
      const openSub = line.match(/^\s{2}(\w+):\s*\{\s*$/);
      if (openSub) {
        sub = openSub[1];
        continue;
      }
      if (/^\s{2}\},?\s*$/.test(line)) {
        sub = null;
        continue;
      }
      const kv = line.match(/^\s+"?([\w-]+)"?:\s*(".*?"|'.*?')\s*,?\s*$/);
      if (kv) {
        const value = kv[2].slice(1, -1);
        const key = sub ? `${groupName}.${sub}.${kv[1]}` : `${groupName}.${kv[1]}`;
        literals.set(key, value);
      }
    }
  }

  const out = new Map();
  for (const line of block[1].split("\n")) {
    const m = line.match(/^\s*"([\w-]+)":\s*(.+?),\s*$/);
    if (!m) continue;
    const [, cssName, expr] = m;
    if (/^["']/.test(expr)) {
      out.set(cssName, expr.slice(1, -1));
      continue;
    }
    // A reference like color.base.bg or spacing[1]
    const normalised = expr.replace(/\[(\d+)\]/g, ".$1");
    const value = literals.get(normalised);
    if (value === undefined) {
      out.set(cssName, { unresolved: expr });
    } else {
      out.set(cssName, value);
    }
  }
  return out;
}

const [css, ts] = await Promise.all([readFile(CSS, "utf8"), readFile(TS, "utf8")]);
const theme = parseTheme(css);
const mirror = await parseMirror(ts);

const problems = [];

for (const [name, cssValue] of theme) {
  if (cssValue.startsWith("var(")) continue; // semantic alias, nothing to compare
  if (!mirror.has(name)) {
    problems.push(`missing from tokens.ts THEME_MIRROR: --${name}: ${cssValue}`);
    continue;
  }
  const tsValue = mirror.get(name);
  if (typeof tsValue === "object") {
    problems.push(`could not resolve tokens.ts value for --${name} (expr: ${tsValue.unresolved})`);
    continue;
  }
  const norm = (v) => v.replace(/\s+/g, " ").replace(/, /g, ",").trim();
  if (norm(tsValue) !== norm(cssValue)) {
    problems.push(`--${name}\n    tailwind.css: ${cssValue}\n    tokens.ts:    ${tsValue}`);
  }
}

for (const name of mirror.keys()) {
  if (!theme.has(name)) problems.push(`in tokens.ts but not in @theme: --${name}`);
}

const compared = [...theme.keys()].filter((k) => !theme.get(k).startsWith("var(")).length;

if (problems.length) {
  console.error(`tokens: ${problems.length} problem(s) — tokens.ts and tailwind.css disagree\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    "\ntailwind.css is the runtime source. Fix tokens.ts to match it, unless you" +
      "\nintended to change the palette — in which case change both, in one commit.",
  );
  process.exit(1);
}

console.log(`tokens: ok — ${compared} literal tokens match tailwind.css @theme`);
