/**
 * The 12 zodiac signs as simple point-and-line figures for
 * `<st-planet-field>`'s `constellations` prop.
 *
 * These are stylized, decorative line figures in the tradition of a printed
 * star chart's icon glyphs — not a reproduction of real stellar
 * right-ascension/declination data. Nobody should navigate by these.
 *
 * Star coordinates are local unit space, roughly -1..1, laid out as if
 * looking at the page (up is +y); `ConstellationSpec.scale`/`px`/`py`
 * position and size each figure on screen.
 */

import { rand } from "./planet-textures.ts";
import type { ConstellationSpec } from "./planet-field.ts";

// A middle row at py 0.5 used to sit dead centre behind the score-card grid,
// which has an opaque-ish background and blur -- the sign was there but
// genuinely covered up, not just hard to read. The board is always roughly
// centred with margins above and below it, so two rows (top strip, bottom
// strip) plus tighter jitter keeps every sign in that open margin instead.
const GRID_COLS = [0.08, 0.24, 0.4, 0.6, 0.76, 0.92];
const GRID_ROWS = [0.13, 0.87];

/**
 * A loose grid anchor, then jittered by a few percent of the viewport using
 * the shared deterministic `rand()` — enough to read as a scattered sky
 * rather than a spreadsheet, while still guaranteeing all 12 signs stay
 * spread out, in the top/bottom margins, and none overlap.
 */
function anchor(index: number): { px: number; py: number } {
  const col = index % GRID_COLS.length;
  const row = Math.floor(index / GRID_COLS.length);
  const jx = (rand(index * 41 + 3) - 0.5) * 0.08;
  const jy = (rand(index * 41 + 7) - 0.5) * 0.04;
  return { px: GRID_COLS[col]! + jx, py: GRID_ROWS[row]! + jy };
}

type Element = "Fire" | "Earth" | "Air" | "Water";

interface ZodiacShape {
  name: string;
  dateRange: string;
  symbol: string;
  /** Classical triplicity -- drives the sign's star/line tint below. */
  element: Element;
  stars: Array<{ x: number; y: number }>;
  edges: Array<[number, number]>;
}

/** Cosmic-warm variants of the scoreboard's indigo/violet/gold palette, one per element. */
const ELEMENT_COLOR: Record<Element, string> = {
  Fire: "#ff8a63",
  Earth: "#d9b568",
  Air: "#9fb8ff",
  Water: "#5fd0c9",
};

const SHAPES: ZodiacShape[] = [
  {
    name: "ARIES",
    dateRange: "Mar 21 – Apr 20",
    symbol: "♈",
    element: "Fire",
    stars: [
      { x: -0.8, y: -0.2 },
      { x: -0.2, y: 0.3 },
      { x: 0.3, y: 0.1 },
      { x: 0.8, y: 0.4 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: "TAURUS",
    dateRange: "Apr 21 – May 21",
    symbol: "♉",
    element: "Earth",
    stars: [
      { x: -0.6, y: 0.6 },
      { x: 0, y: 0.2 },
      { x: 0.6, y: 0.6 },
      { x: 0, y: -0.6 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    name: "GEMINI",
    dateRange: "May 22 – Jun 21",
    symbol: "♊",
    element: "Air",
    stars: [
      { x: -0.5, y: 0.7 },
      { x: -0.5, y: -0.7 },
      { x: 0.5, y: 0.7 },
      { x: 0.5, y: -0.7 },
    ],
    edges: [
      [0, 1],
      [2, 3],
      [0, 2],
    ],
  },
  {
    name: "CANCER",
    dateRange: "Jun 22 – Jul 23",
    symbol: "♋",
    element: "Water",
    stars: [
      { x: -0.7, y: 0.1 },
      { x: -0.2, y: -0.4 },
      { x: 0.2, y: -0.4 },
      { x: 0.7, y: 0.1 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: "LEO",
    dateRange: "Jul 24 – Aug 23",
    symbol: "♌",
    element: "Fire",
    stars: [
      { x: -0.7, y: -0.3 },
      { x: -0.3, y: 0.5 },
      { x: 0.2, y: 0.6 },
      { x: 0.6, y: 0.1 },
      { x: 0.4, y: -0.6 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "VIRGO",
    dateRange: "Aug 24 – Sep 23",
    symbol: "♍",
    element: "Earth",
    stars: [
      { x: -0.8, y: 0.4 },
      { x: -0.3, y: -0.2 },
      { x: 0.2, y: 0.3 },
      { x: 0.7, y: -0.4 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: "LIBRA",
    dateRange: "Sep 24 – Oct 23",
    symbol: "♎",
    element: "Air",
    stars: [
      { x: -0.7, y: 0 },
      { x: 0, y: 0.5 },
      { x: 0, y: -0.5 },
      { x: 0.7, y: 0 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
  },
  {
    name: "SCORPIO",
    dateRange: "Oct 24 – Nov 22",
    symbol: "♏",
    element: "Water",
    stars: [
      { x: -0.8, y: 0.5 },
      { x: -0.4, y: 0.1 },
      { x: 0, y: -0.2 },
      { x: 0.4, y: -0.1 },
      { x: 0.7, y: -0.6 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "SAGITTARIUS",
    dateRange: "Nov 23 – Dec 21",
    symbol: "♐",
    element: "Fire",
    stars: [
      { x: -0.7, y: -0.6 },
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.7 },
      { x: 0.4, y: 0.7 },
      { x: 0.8, y: 0.3 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
  },
  {
    name: "CAPRICORN",
    dateRange: "Dec 22 – Jan 20",
    symbol: "♑",
    element: "Earth",
    stars: [
      { x: -0.7, y: 0.4 },
      { x: -0.2, y: -0.3 },
      { x: 0.3, y: 0 },
      { x: 0.7, y: -0.5 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: "AQUARIUS",
    dateRange: "Jan 21 – Feb 19",
    symbol: "♒",
    element: "Air",
    stars: [
      { x: -0.8, y: 0.2 },
      { x: -0.4, y: -0.2 },
      { x: 0, y: 0.2 },
      { x: 0.4, y: -0.2 },
      { x: 0.8, y: 0.2 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "PISCES",
    dateRange: "Feb 20 – Mar 20",
    symbol: "♓",
    element: "Water",
    stars: [
      { x: -0.7, y: -0.5 },
      { x: -0.2, y: 0.2 },
      { x: 0.2, y: 0.2 },
      { x: 0.7, y: -0.5 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
];

type AnchorFn = (_index: number) => { px: number; py: number };

function buildSigns(anchorFn: AnchorFn): ConstellationSpec[] {
  return SHAPES.map((shape, i) => {
    const seed = i * 131 + 17;
    // depth 0 = nearest, 1 = farthest. Drives size, brightness and parallax
    // together so each sign reads as one consistent distance, not a grid of
    // identical glyphs with a random dial turned on each axis independently.
    const depth = rand(seed + 500);
    return {
      name: shape.name,
      dateRange: shape.dateRange,
      symbol: shape.symbol,
      color: ELEMENT_COLOR[shape.element],
      stars: shape.stars,
      edges: shape.edges,
      // Smaller than before -- the figures now live in the top/bottom margin
      // strips above/below the score-card grid, and the old size range was
      // tall enough to brush the cards' top/bottom edge from there.
      scale: 0.04 + (1 - depth) * 0.032,
      alpha: 0.5 + (1 - depth) * 0.45,
      pf: 0.08 + (1 - depth) * 0.32,
      // Same 0..1 depth signal, now also driving the fake-perspective
      // apparent-size factor PlanetBody uses (ConstellationSpec.depth) --
      // nearest signs (depth 0) sit slightly forward of their baked-in
      // scale, farthest (depth 1) slightly back, so distance is doubly
      // consistent instead of only baked into scale/alpha/pf at build time.
      depth: 60 - depth * 260,
      seed,
      ...anchorFn(i),
    };
  });
}

export const ZODIAC_SIGNS: ConstellationSpec[] = buildSigns(anchor);

/**
 * Base-`base` van der Corput sequence -- a low-discrepancy sequence, meaning
 * consecutive points land spread evenly across [0,1) without ever falling
 * into a straight row or column the way naive `rand()` jitter around a fixed
 * grid can. Two different bases per axis (2 for x, 3 for y below) is the
 * standard Halton-sequence trick for a scattered-not-gridded 2D layout.
 */
function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

/**
 * A scattered, non-grid layout for narrow/touch viewports -- see
 * `scoreboard.js`, which switches to this under 640px. The grid `anchor()`
 * above reads as "one horizontal line of signs, then another" on a narrow
 * screen; Halton points spread across the whole viewport with no row or
 * column structure to catch the eye, closer to how the star field itself is
 * scattered than to a UI grid.
 */
function haltonAnchor(index: number): { px: number; py: number } {
  return {
    px: 0.08 + halton(index + 1, 2) * 0.84,
    py: 0.08 + halton(index + 1, 3) * 0.84,
  };
}

export const ZODIAC_SIGNS_SCATTERED: ConstellationSpec[] = buildSigns(haltonAnchor);
