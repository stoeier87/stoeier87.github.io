/**
 * tokens.ts — the structured, typed mirror of the @theme block in tailwind.css.
 *
 * tailwind.css is still the runtime source: Tailwind v4 reads @theme, and this
 * file does not generate it. What this file gives you is a typed handle on the
 * same names so JS/TS components stop guessing at token spellings, plus a drift
 * check (`npm run tokens`) that fails when the two disagree.
 *
 * Rules that go with it (see standards.json):
 *   - tokens-sole-sourced : nothing hardcodes a colour
 *   - no-new-css-files    : styling lives in JS from here on
 *
 * When the React migration issue is picked up, flip this from mirror to source
 * and generate the @theme block from it. Not now — that would mean editing
 * tailwind.css, and the existing CSS is deliberately frozen.
 */

/** A CSS custom-property reference, e.g. `var(--color-red)`. */
export type TokenRef = `var(--${string})`;

const ref = (name: string): TokenRef => `var(--${name})` as TokenRef;

/* ── Colour ─────────────────────────────────────────────────────────── */

export const color = {
  /** Base palette — the literal values. */
  base: {
    bg: "#0d1424",
    bgDeep: "#070b14",
    ink: "#ffffff",
    inkMuted: "rgba(255,255,255,0.6)",
    inkDim: "rgba(255,255,255,0.35)",
    red: "#e03a2f",
    redTint: "rgba(224,58,47,0.12)",
    border: "rgba(255,255,255,0.28)",
    borderStrong: "rgba(255,255,255,0.4)",
    borderHover: "rgba(255,255,255,0.58)",
    borderFaint: "rgba(255,255,255,0.12)",
    cardBg: "rgba(13,20,36,0.72)",
    pillBg: "rgba(13,20,36,0.6)",
    scoreHighlight: "#c8ffdd",
  },

  /** Rank / medal semantics. */
  rank: {
    gold: "#ffd166",
    silver: "#b0bcd8",
    bronze: "#cd8b5a",
  },

  /**
   * Semantic aliases. Prefer these in new components — they are the layer that
   * survives a palette change.
   */
  semantic: {
    surfaceApp: ref("color-surface-app"),
    surfaceCard: ref("color-surface-card"),
    surfacePill: ref("color-surface-pill"),
    textPrimary: ref("color-text-primary"),
    textMuted: ref("color-text-muted"),
    textDim: ref("color-text-dim"),
    accent: ref("color-accent"),
    accentTint: ref("color-accent-tint"),
    borderDefault: ref("color-border-default"),
  },

  /**
   * Scoreboard subsystem. A deliberate, documented palette drift — bluer and
   * darker than the rest of the site. Do not "fix" it to match; see
   * standards.json → tokens-sole-sourced → exception.
   */
  scoreboard: {
    bg: "#080b14",
    card: "rgba(18,22,42,0.82)",
    cardBorder: "rgba(90,110,200,0.2)",
    text: "#eef0ff",
    muted: "#8892b8",
    accent: "#6e8fff",
    line: "rgba(60,75,130,0.35)",
  },
} as const;

/* ── Type ───────────────────────────────────────────────────────────── */

export const font = {
  display: '"Archivo Black", sans-serif',
  mono: '"Space Mono", ui-monospace, monospace',
} as const;

/** Fluid sizes. clamp() everywhere — this site is read on 320px phones. */
export const text = {
  hero: "clamp(2.6rem, 12vw, 10.5rem)",
  h1: "clamp(2rem, 8vw, 4.5rem)",
  h2Card: "1.15rem",
  body: "0.9rem",
  small: "0.82rem",
  overline: "clamp(0.6rem, 1.6vw, 0.72rem)",
} as const;

export const tracking = {
  tight: "-0.02em",
  wide: "0.03em",
  wider: "0.06em",
  widest: "0.14em",
  loose: "0.22em",
} as const;

export const leading = {
  display: "0.92",
  body: "1.5",
  tight: "1.35",
} as const;

/* ── Space, shape, motion ───────────────────────────────────────────── */

/** Hand-picked, deliberately non-linear. Do not "regularise" the gaps. */
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  7: "32px",
  9: "64px",
  22: "88px",
} as const;

export const radius = {
  pill: "999px",
  card: "18px",
  boardCard: "14px",
  hud: "10px",
} as const;

export const motion = {
  ease: {
    standard: "ease",
    inOut: "ease-in-out",
  },
  animate: {
    pulseDot: "pulseDot 1.6s ease-in-out infinite",
    floatY: "floatY 5s ease-in-out infinite",
    hintBounce: "hintBounce 2s ease-in-out infinite",
    hintPulse: "hintPulse 2s ease-in-out infinite",
  },
  /**
   * The only motion fallback. Never gate motion on viewport width — that was
   * an incident, and PR #53 reverted it. See standards.json →
   * reduced-motion-only-fallback.
   */
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
  /** dt clamp, in ms, from the canvas contract. */
  dtClampMs: 33,
  /** DPR ceiling. Uncapped devicePixelRatio melts phones. */
  dprCap: 2,
} as const;

/* ── Tailwind class names ───────────────────────────────────────────── */

/**
 * Utility-class shorthands for JS/TS component templates. Using these instead
 * of raw strings means a token rename is one edit here, not a grep across
 * every component.
 */
export const cls = {
  surface: {
    app: "bg-surface-app",
    card: "bg-surface-card",
    pill: "bg-surface-pill",
  },
  textColor: {
    primary: "text-text-primary",
    muted: "text-text-muted",
    dim: "text-text-dim",
    accent: "text-accent",
  },
  border: {
    default: "border border-border-default",
    faint: "border border-border-faint",
    strong: "border border-border-strong",
  },
  font: {
    display: "font-display",
    mono: "font-mono",
  },
  radius: {
    pill: "rounded-pill",
    card: "rounded-card",
    hud: "rounded-hud",
  },
  /** Focus ring required by standards.json → a11y-baseline. */
  focusRing:
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
} as const;

/**
 * Flat name → value map, used by scripts/tokens-check.mjs to diff this file
 * against the @theme block. Keep the keys byte-identical to the CSS custom
 * property names, minus the leading `--`.
 */
export const THEME_MIRROR: Record<string, string> = {
  "color-bg": color.base.bg,
  "color-bg-deep": color.base.bgDeep,
  "color-ink": color.base.ink,
  "color-ink-muted": color.base.inkMuted,
  "color-ink-dim": color.base.inkDim,
  "color-red": color.base.red,
  "color-red-tint": color.base.redTint,
  "color-border": color.base.border,
  "color-border-strong": color.base.borderStrong,
  "color-border-hover": color.base.borderHover,
  "color-border-faint": color.base.borderFaint,
  "color-card-bg": color.base.cardBg,
  "color-pill-bg": color.base.pillBg,
  "color-score-highlight": color.base.scoreHighlight,

  "color-rank-gold": color.rank.gold,
  "color-rank-silver": color.rank.silver,
  "color-rank-bronze": color.rank.bronze,

  "color-scoreboard-bg": color.scoreboard.bg,
  "color-scoreboard-card": color.scoreboard.card,
  "color-scoreboard-card-border": color.scoreboard.cardBorder,
  "color-scoreboard-text": color.scoreboard.text,
  "color-scoreboard-muted": color.scoreboard.muted,
  "color-scoreboard-accent": color.scoreboard.accent,
  "color-scoreboard-line": color.scoreboard.line,

  "font-display": font.display,
  "font-mono": font.mono,

  "text-hero": text.hero,
  "text-h1": text.h1,
  "text-h2-card": text.h2Card,
  "text-body": text.body,
  "text-small": text.small,
  "text-overline": text.overline,

  "tracking-tight": tracking.tight,
  "tracking-wide": tracking.wide,
  "tracking-wider": tracking.wider,
  "tracking-widest": tracking.widest,
  "tracking-loose": tracking.loose,

  "leading-display": leading.display,
  "leading-body": leading.body,
  "leading-tight": leading.tight,

  "spacing-1": spacing[1],
  "spacing-2": spacing[2],
  "spacing-3": spacing[3],
  "spacing-4": spacing[4],
  "spacing-6": spacing[6],
  "spacing-7": spacing[7],
  "spacing-9": spacing[9],
  "spacing-22": spacing[22],

  "radius-pill": radius.pill,
  "radius-card": radius.card,
  "radius-board-card": radius.boardCard,
  "radius-hud": radius.hud,

  "ease-standard": motion.ease.standard,
  "ease-in-out": motion.ease.inOut,
  "animate-pulse-dot": motion.animate.pulseDot,
  "animate-float-y": motion.animate.floatY,
  "animate-hint-bounce": motion.animate.hintBounce,
  "animate-hint-pulse": motion.animate.hintPulse,
};
