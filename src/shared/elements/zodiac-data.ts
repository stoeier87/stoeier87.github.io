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

const GRID_COLS = [0.12, 0.38, 0.62, 0.88];
const GRID_ROWS = [0.2, 0.5, 0.8];

/**
 * A loose grid anchor, then jittered by up to a few percent of the viewport
 * using the shared deterministic `rand()` — enough to read as a scattered
 * sky rather than a spreadsheet, while still guaranteeing all 12 signs stay
 * spread out and none overlap.
 */
function anchor(index: number): { px: number; py: number } {
  const col = index % GRID_COLS.length;
  const row = Math.floor(index / GRID_COLS.length);
  const jx = (rand(index * 41 + 3) - 0.5) * 0.14;
  const jy = (rand(index * 41 + 7) - 0.5) * 0.12;
  return { px: GRID_COLS[col]! + jx, py: GRID_ROWS[row]! + jy };
}

interface ZodiacShape {
  name: string;
  dateRange: string;
  stars: Array<{ x: number; y: number }>;
  edges: Array<[number, number]>;
}

const SHAPES: ZodiacShape[] = [
  {
    name: "ARIES",
    dateRange: "Mar 21 – Apr 19",
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
    dateRange: "Apr 20 – May 20",
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
    dateRange: "May 21 – Jun 20",
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
    dateRange: "Jun 21 – Jul 22",
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
    dateRange: "Jul 23 – Aug 22",
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
    dateRange: "Aug 23 – Sep 22",
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
    dateRange: "Sep 23 – Oct 22",
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
    dateRange: "Oct 23 – Nov 21",
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
    dateRange: "Nov 22 – Dec 21",
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
    dateRange: "Dec 22 – Jan 19",
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
    dateRange: "Jan 20 – Feb 18",
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
    dateRange: "Feb 19 – Mar 20",
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

export const ZODIAC_SIGNS: ConstellationSpec[] = SHAPES.map((shape, i) => {
  const seed = i * 131 + 17;
  // depth 0 = nearest, 1 = farthest. Drives size, brightness and parallax
  // together so each sign reads as one consistent distance, not a grid of
  // identical glyphs with a random dial turned on each axis independently.
  const depth = rand(seed + 500);
  return {
    name: shape.name,
    dateRange: shape.dateRange,
    stars: shape.stars,
    edges: shape.edges,
    scale: 0.055 + (1 - depth) * 0.05,
    alpha: 0.5 + (1 - depth) * 0.45,
    pf: 0.08 + (1 - depth) * 0.32,
    seed,
    ...anchor(i),
  };
});
