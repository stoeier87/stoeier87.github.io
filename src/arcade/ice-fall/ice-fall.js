/* ICE FALL — stack the ice on Pluto.
 *
 * Canvas contract: this game follows the iss-docking variant rather than
 * meteor-dodge's. BASE_W/BASE_H track the viewport and viewScale is 1, so
 * there is no letterboxing — the playfield is the page, it has to fill the
 * real available height, and it has to dodge two DOM overlays (the pills
 * above, the status panel below) whose sizes are in CSS pixels, not virtual
 * ones. Letterboxing into a fixed virtual box would leave the grid short at
 * one width and overlapping the panel at another. Everything else in the
 * contract is unchanged and load-bearing: the DPR cap, setTransform after
 * every resize, screenToWorld for pointer input, and the clamped dt.
 */

import { definePlanetField } from "../../shared/elements/planet-field.ts";
import { color } from "../../tokens.ts";
import { submitScoreOnGameOver, fetchGlobalBest } from "../shared/score-submit.js";

definePlanetField();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Grid ──────────────────────────────────────────────── */
const COLS = 10;
const ROWS = 20; // visible
const HIDDEN = 2; // spawn rows above the visible field
const TOTAL_ROWS = ROWS + HIDDEN;

/* ── Pieces ────────────────────────────────────────────────
   Spawn orientations are the standard ones. Each piece is stored as a list
   of [x, y] cells per rotation state, generated from the SRS bounding boxes
   so the kick tables below line up with them. */
const SHAPES = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
};

const TYPES = ["I", "J", "L", "O", "S", "T", "Z"];

/* Palette drawn from Pluto and Charon rather than the classic assignments.
   Hue alone does not separate seven pieces: simulated through the
   Viénot-Brettel-Mollon transform, an earlier set put deep glacier blue and
   dusty violet at ΔE 9.9 under protanopia — indistinguishable. Lightness is
   what fixes that, so the set was solved numerically for maximum minimum
   pairwise ΔE across normal, protan, deutan and tritan vision. The worst
   pair is now 23.0, and L* runs 33 to 90 so the seven stay separable even
   where hue collapses entirely. */
const PIECE_COLORS = {
  I: "#bedef5", // pale nitrogen ice
  O: "#ce8c29", // methane amber
  T: "#9b492c", // tholin rust
  S: "#1f517a", // deep glacier blue
  Z: "#ba8dd8", // dusty violet
  J: "#6a7e90", // Charon grey
  L: "#f0e1a9", // pale gold
};

/* ── Gravity and lock delay ────────────────────────────────
   Milliseconds per row by level. The first pass used the brief's table,
   opening at 900ms — a piece took nine seconds to reach the floor untouched
   and the opening played like a screensaver. This opens at 300ms and the
   levels arrive every 8 lines rather than 10, so the game is asking
   something of you from the first piece and level 9, where the garbage
   starts, lands at 64 lines instead of 80. The late levels are near the
   original floor, so the ramp still has somewhere to go. */
const GRAVITY = [
  300, 270, 243, 218, 195, 174, 154, 136, 119, 104, 90, 77, 66, 56, 47, 40, 34, 29, 25, 22,
];
function gravityMs(level) {
  return GRAVITY[Math.min(level, GRAVITY.length) - 1] ?? 30;
}
function lockDelayMs(level) {
  if (level >= 16) return 150;
  if (level >= 10) return 300;
  return 500;
}
/* Garbage cadence in pieces placed. Null means no garbage at this level —
   the PRESSURE bar stays unlit until this returns a number. */
function garbageEvery(level) {
  if (level >= 18) return 10;
  if (level >= 14) return 15;
  if (level >= 9) return 25;
  return null;
}

const MAX_LOCK_RESETS = 15;
const LINES_PER_LEVEL = 8;

/* ── Canvas + view ─────────────────────────────────────── */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = 0,
  H = 0,
  dpr = 1,
  BASE_W = 0,
  BASE_H = 0,
  viewScale = 1,
  viewOffX = 0,
  viewOffY = 0;

/* Playfield geometry, recomputed on resize. */
let cell = 24,
  gridX = 0,
  gridY = 0,
  gridW = 0,
  gridH = 0;

const isNarrow = () => W < 520;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  viewScale = 1;
  viewOffX = 0;
  viewOffY = 0;
  BASE_W = W;
  BASE_H = H;

  /* Insets keep the grid clear of the two DOM overlays at every width. The
     top one covers the pill row plus the hold/next slots under it; the
     bottom one covers the status panel. */
  const topInset = isNarrow() ? 182 : 158;
  const bottomInset = isNarrow() ? 128 : 118;
  const availH = Math.max(120, H - topInset - bottomInset);
  /* On narrow screens the hold and next previews sit either side of the
     grid rather than clear of it, so the width budget has to reserve their
     columns — at 390px an unreserved grid lands exactly against the next
     preview with zero margin. */
  const availW = W - (isNarrow() ? 132 : 40);

  cell = Math.floor(Math.min(availH / ROWS, availW / COLS));
  gridW = cell * COLS;
  gridH = cell * ROWS;
  gridX = Math.round((W - gridW) / 2);
  gridY = Math.round(topInset + (availH - gridH) / 2);

  layoutBackdrop();
  sizeSlots();
}
addEventListener("resize", resize, { passive: true });

/** Screen → world. viewScale is 1 here, but the conversion stays explicit so
    the pointer path does not silently break if that ever changes. */
function screenToWorld(clientX, clientY) {
  return { x: (clientX - viewOffX) / viewScale, y: (clientY - viewOffY) / viewScale };
}

/* ── The setting: Pluto, Charon, the sun, the stars ────────
   Pluto and Charon are real PlanetBody instances inside <st-planet-field>,
   not a second planet renderer. Their spec objects are mutated in place each
   frame rather than reassigned, because assigning `.planets` rebuilds every
   body and regenerates every texture — mutation is read live by the
   element's per-frame placement pass and costs nothing. */
const backdrop = document.getElementById("bg");

const plutoSpec = {
  name: "PLUTO",
  r: 0.62,
  s0: 0,
  px: 0.78,
  pf: 1,
  hi: color.planet.plutoHi,
  lo: color.planet.plutoLo,
  pluto: true,
  spin: 0.0175, // one turn in ~6 minutes
  depth: -260,
};

const charonSpec = {
  name: "CHARON",
  r: 0.055,
  s0: 0,
  px: 0.16,
  pf: 1,
  hi: color.planet.merkurHi,
  lo: color.planet.merkurLo,
  spin: 0.004, // tidally locked: it barely turns relative to Pluto
  depth: -40,
};

/* Charon's position is a pure function of one phase value in [0,1). Part 9
   replaces how the phase advances — a fixed 90s sky crossing that doubles as
   the game's clock — without touching anything that reads it. For now it
   drifts very slowly across the upper left. */
const CHARON_CYCLE_MS = 90000;
let charonPhase = 0.18;

function charonAt(phase) {
  // A shallow arc across the top of the sky, never cropped out of view.
  const t = phase;
  return { px: 0.08 + t * 0.84, s0: -0.3 - Math.sin(t * Math.PI) * 0.1 };
}

function layoutBackdrop() {
  /* Pluto sits lower right and is cropped by the viewport edge so it reads
     as close. Its radius is a fraction of min(w,h), so on a wide desktop it
     has to grow to stay cropped. */
  const portrait = H >= W;
  plutoSpec.r = portrait ? 0.62 : 0.78;
  plutoSpec.px = portrait ? 0.82 : 0.86;
  plutoSpec.s0 = portrait ? 0.46 : 0.5;
}

if (backdrop) {
  backdrop.starLayers = [
    { count: 150, radius: 1.35, alpha: 0.95, parallax: 0.1 },
    { count: 120, radius: 1.0, alpha: 0.7, parallax: 0.05 },
    { count: 90, radius: 0.7, alpha: 0.45, parallax: 0.02 },
  ];
  backdrop.planets = [charonSpec, plutoSpec];
}

/** Where planet-field will draw a spec this frame, in CSS pixels. Mirrors
    the element's own placement maths so the 2D layer can hang the haze ring
    and the plumes on Pluto's limb. */
function planetScreen(spec) {
  const vmin = Math.min(W, H);
  const r = spec.r * vmin;
  const ZF = 1000;
  const depth = spec.depth ?? 0;
  return {
    x: spec.px * W,
    y: H * 0.55 + spec.s0 * H * spec.pf,
    r: (r * ZF) / (ZF - depth),
  };
}

/* ── Cryovolcanic plumes ────────────────────────────────── */
const plumes = [];
let nextPlumeAt = 40000 + Math.random() * 20000;

function spawnPlume(now) {
  if (reduced || plumes.length >= 3) return;
  const p = planetScreen(plutoSpec);
  // Anywhere along the lit crescent, which faces up-left.
  const a = Math.PI * (1.02 + Math.random() * 0.62);
  plumes.push({
    a,
    born: now,
    life: 6000 + Math.random() * 3000,
    h: p.r * (0.08 + Math.random() * 0.06),
  });
}

function drawPlumes(now) {
  for (let i = plumes.length - 1; i >= 0; i--) {
    const pl = plumes[i];
    const t = (now - pl.born) / pl.life;
    if (t >= 1) {
      plumes.splice(i, 1);
      continue;
    }
    const p = planetScreen(plutoSpec);
    const rise = Math.min(1, t * 2.2);
    const fade = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    const bx = p.x + Math.cos(pl.a) * p.r;
    const by = p.y + Math.sin(pl.a) * p.r;
    const tx = p.x + Math.cos(pl.a) * (p.r + pl.h * rise);
    const ty = p.y + Math.sin(pl.a) * (p.r + pl.h * rise);
    const g = ctx.createLinearGradient(bx, by, tx, ty);
    g.addColorStop(0, `rgba(190,214,235,${(0.3 * fade).toFixed(3)})`);
    g.addColorStop(1, "rgba(190,214,235,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(2, p.r * 0.045 * (0.5 + rise));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
}

/* ── Sun and haze ───────────────────────────────────────── */
function drawSun() {
  // A point, no disc. Brightest thing on screen, and it lights nothing.
  const x = W * 0.14,
    y = H * 0.13;
  ctx.save();
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 26);
  halo.addColorStop(0, "rgba(255,255,255,0.5)");
  halo.addColorStop(0.4, "rgba(210,230,255,0.14)");
  halo.addColorStop(1, "rgba(210,230,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 1.7, 0, Math.PI * 2);
  ctx.fill();

  // Small lens flare down the diagonal toward the centre of the frame.
  const dx = W / 2 - x,
    dy = H / 2 - y;
  ctx.globalCompositeOperation = "lighter";
  [
    [0.24, 4, "rgba(150,190,240,0.16)"],
    [0.4, 2.4, "rgba(230,200,170,0.14)"],
    [0.58, 6, "rgba(120,170,230,0.09)"],
  ].forEach(([t, rr, col]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + dx * t, y + dy * t, rr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/* The terminator. planet-field lights every scene from one shared
   DirectionalLight, which is right for the rest of the site and far too
   generous for a body 5 billion km from the sun. Rather than dim that light
   for everyone, the 2D layer paints the night side back on: a dark mask
   clipped to Pluto's disc, its clear point pushed out toward the lit limb so
   only a crescent survives. This is the luminance cap as well as the
   terminator — it is what keeps the falling pieces legible where they cross
   the planet. */
const LIT_ANGLE = Math.PI * 1.28; // up and to the left

function drawPlutoShadow() {
  const p = planetScreen(plutoSpec);
  const lx = p.x + Math.cos(LIT_ANGLE) * p.r * 0.92;
  const ly = p.y + Math.sin(LIT_ANGLE) * p.r * 0.92;

  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 0.5, 0, Math.PI * 2);
  ctx.clip();

  const g = ctx.createRadialGradient(lx, ly, p.r * 0.06, lx, ly, p.r * 1.5);
  g.addColorStop(0, "rgba(4,7,14,0.1)");
  g.addColorStop(0.16, "rgba(4,7,14,0.52)");
  g.addColorStop(0.34, "rgba(4,7,14,0.88)");
  g.addColorStop(1, "rgba(4,7,14,0.97)");
  ctx.fillStyle = g;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.restore();
}

/* ── SRS kick tables ───────────────────────────────────────
   Offsets are tried in order; the first that fits wins. Y is negated
   relative to the published tables because this grid counts rows downward. */
const KICKS_JLSTZ = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};
const KICKS_I = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

/* ── State ─────────────────────────────────────────────── */
let grid = [];
let piece = null;
let holdType = null;
let holdUsed = false;
let bag = [];
let queue = [];

let score = 0;
let lines = 0;
let level = 1;
let best = 0;
let garbageCountdown = null; // pieces remaining until the next rise
let backToBack = false;

let gameOver = false;
let paused = false;
let started = false;
let scoreSubmitted = false;

let dropTimer = 0;
let lockTimer = 0;
let locking = false;
let lockResets = 0;
let lastKickWasSpin = false;

/* Effects. Every pool is capped — a 25-minute run must not accumulate. */
const shards = [];
const frost = [];
const trails = [];
const clearing = []; // rows mid-flare, drawn white before they fall away
let shakeUntil = 0;
let shakeAmp = 0;
let bgPulse = 0;
let freezeRow = -1; // game-over freeze-over progress

const MAX_SHARDS = 160;
const MAX_FROST = 60;
const MAX_TRAILS = 12;

const el = {
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  level: document.getElementById("levelVal"),
  lines: document.getElementById("linesVal"),
  pressure: document.getElementById("pressureFill"),
  status: document.getElementById("status"),
  intro: document.getElementById("intro"),
  introKeys: document.getElementById("introKeys"),
  introTouch: document.getElementById("introTouch"),
  hold: document.getElementById("holdSlot"),
  next: document.getElementById("nextSlot"),
  holdCanvas: document.getElementById("holdCanvas"),
  nextCanvas: document.getElementById("nextCanvas"),
  pause: document.getElementById("pause"),
  resume: document.getElementById("resumeBtn"),
  over: document.getElementById("gameOver"),
  overRestart: document.getElementById("gameOverRestart"),
  finalScore: document.getElementById("finalScore"),
  finalLines: document.getElementById("finalLines"),
  finalLevel: document.getElementById("finalLevel"),
  finalBest: document.getElementById("finalBest"),
  bestMarker: document.getElementById("bestMarker"),
};

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (canHover) el.introKeys.classList.add("show");
else el.introTouch.classList.add("show");

fetchGlobalBest("ice-fall").then((b) => {
  best = Math.max(best, b);
  el.best.textContent = best;
});

/* ── Grid helpers ──────────────────────────────────────── */
function emptyGrid() {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
}

function cellsOf(type, rot, x, y) {
  return SHAPES[type][rot].map(([cx, cy]) => [x + cx, y + cy]);
}

function fits(type, rot, x, y) {
  return cellsOf(type, rot, x, y).every(
    ([cx, cy]) =>
      cx >= 0 && cx < COLS && cy < TOTAL_ROWS && (cy < 0 || !grid[cy] || grid[cy][cx] === null),
  );
}

function refillBag() {
  // Seven-bag: every type appears once per bag, order shuffled.
  const b = TYPES.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  bag = b;
}
function pullType() {
  if (!bag.length) refillBag();
  return bag.pop();
}
function fillQueue() {
  while (queue.length < 4) queue.push(pullType());
}

function spawn(type) {
  const t = type ?? queue.shift();
  fillQueue();
  const p = { type: t, rot: 0, x: 3, y: 0 };
  /* Block out: if the piece cannot occupy its spawn cells, the game is over.
     An earlier version nudged the piece up a row instead, which let it spawn
     entirely above the grid — every cell then failed the `cy < 0` guard in
     lockPiece, so pieces locked into nothing, scored nothing, and the run
     never ended. Topping out has to be terminal. */
  if (!fits(p.type, p.rot, p.x, p.y)) {
    piece = p;
    endGame();
    return;
  }
  piece = p;
  holdUsed = false;
  locking = false;
  lockTimer = 0;
  lockResets = 0;
  lastKickWasSpin = false;
  dropTimer = 0;
  drawSlots();
}

function ghostY() {
  if (!piece) return 0;
  let y = piece.y;
  while (fits(piece.type, piece.rot, piece.x, y + 1)) y++;
  return y;
}

/* ── Movement ──────────────────────────────────────────── */
function tryMove(dx, dy) {
  if (!piece) return false;
  if (!fits(piece.type, piece.rot, piece.x + dx, piece.y + dy)) return false;
  piece.x += dx;
  piece.y += dy;
  if (dx !== 0) lastKickWasSpin = false;
  onPieceMoved();
  return true;
}

function tryRotate(dir) {
  if (!piece) return false;
  const from = piece.rot;
  const to = (from + (dir > 0 ? 1 : 3)) % 4;
  const table = piece.type === "I" ? KICKS_I : KICKS_JLSTZ;
  const kicks = table[`${from}>${to}`] ?? [[0, 0]];
  for (const [kx, ky] of kicks) {
    // Published SRS y is up-positive; this grid is down-positive.
    const nx = piece.x + kx;
    const ny = piece.y - ky;
    if (fits(piece.type, to, nx, ny)) {
      piece.rot = to;
      piece.x = nx;
      piece.y = ny;
      lastKickWasSpin = true;
      onPieceMoved();
      return true;
    }
  }
  return false;
}

/** Lock delay resets on any successful move or rotation, capped at 15 so a
    piece cannot be spun in place forever. */
function onPieceMoved() {
  if (locking && lockResets < MAX_LOCK_RESETS) {
    lockResets++;
    lockTimer = 0;
  }
  if (fits(piece.type, piece.rot, piece.x, piece.y + 1)) locking = false;
}

function hold() {
  if (!piece || holdUsed || gameOver || paused) return;
  const cur = piece.type;
  if (holdType === null) {
    holdType = cur;
    spawn();
  } else {
    const swap = holdType;
    holdType = cur;
    spawn(swap);
  }
  holdUsed = true;
  drawSlots();
}

function softDrop() {
  if (tryMove(0, 1)) {
    score += 1;
    dropTimer = 0;
    updateHud();
  }
}

function hardDrop() {
  if (!piece) return;
  const from = piece.y;
  const to = ghostY();
  if (to > from) score += (to - from) * 2;
  if (!reduced && to > from) {
    for (const [cx] of SHAPES[piece.type][piece.rot]) {
      if (trails.length >= MAX_TRAILS) break;
      trails.push({ col: piece.x + cx, y0: from, y1: to, born: performance.now() });
    }
  }
  piece.y = to;
  lockPiece();
}

/* ── T-spin detection: the standard three-corner rule ───── */
function isTSpin() {
  if (!piece || piece.type !== "T" || !lastKickWasSpin) return false;
  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners = [
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
    [cx - 1, cy + 1],
    [cx + 1, cy + 1],
  ];
  let filled = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) filled++;
    else if (y >= 0 && grid[y][x] !== null) filled++;
  }
  return filled >= 3;
}

/* ── Locking, clearing, scoring ────────────────────────── */
function lockPiece() {
  if (!piece) return;
  const spin = isTSpin();
  const placed = cellsOf(piece.type, piece.rot, piece.x, piece.y);
  // Lock out: a piece that comes to rest entirely inside the hidden rows
  // means the stack has reached the ceiling.
  if (placed.every(([, cy]) => cy < HIDDEN)) {
    for (const [cx, cy] of placed) if (cy >= 0) grid[cy][cx] = piece.type;
    endGame();
    return;
  }
  for (const [cx, cy] of placed) {
    if (cy < 0) continue;
    grid[cy][cx] = piece.type;
  }
  if (!reduced) puffFrost();

  const full = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (grid[y].every((c) => c !== null)) full.push(y);
  }

  if (full.length) {
    lines += full.length;
    const newLevel = Math.min(30, 1 + Math.floor(lines / LINES_PER_LEVEL));
    if (newLevel !== level) level = newLevel;
    scoreClear(full.length, spin);
    beginClear(full);
  } else if (spin) {
    score += 100 * level;
    backToBack = false;
  } else {
    backToBack = false;
  }

  tickGarbage();
  updateHud();
  piece = null;
  if (!gameOver) spawn();
}

function scoreClear(n, spin) {
  let base;
  if (spin) base = [0, 400, 800, 1200, 1600][n];
  else base = [0, 100, 300, 500, 800][n];
  let gained = base * level;
  if (n === 4) {
    if (backToBack) gained = Math.round(gained * 1.5);
    backToBack = true;
  } else if (!spin) {
    backToBack = false;
  }
  score += gained;

  if (n === 4 && !reduced) {
    shakeUntil = performance.now() + 320;
    shakeAmp = 7;
    bgPulse = 1;
  }
}

function beginClear(rows) {
  if (reduced) {
    // No fracture: a short fade, then the rows are gone.
    clearing.push({ rows, born: performance.now(), life: 220, fade: true });
  } else {
    clearing.push({ rows, born: performance.now(), life: 300, fade: false });
    for (const y of rows) {
      for (let x = 0; x < COLS; x++) {
        if (shards.length >= MAX_SHARDS) break;
        shards.push({
          x: gridX + x * cell + cell / 2,
          y: gridY + (y - HIDDEN) * cell + cell / 2,
          vx: (Math.random() - 0.5) * 60,
          vy: 40 + Math.random() * 120,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 6,
          s: cell * (0.16 + Math.random() * 0.2),
          born: performance.now(),
          life: 700 + Math.random() * 400,
          type: grid[y][x] ?? "I",
        });
      }
    }
  }
  // The rows leave the grid immediately; the effect is cosmetic on top.
  const set = new Set(rows);
  const kept = [];
  for (let y = 0; y < TOTAL_ROWS; y++) if (!set.has(y)) kept.push(grid[y]);
  while (kept.length < TOTAL_ROWS) kept.unshift(Array(COLS).fill(null));
  grid = kept;
}

function puffFrost() {
  if (!piece) return;
  // At the contact edge: the lowest cell of each occupied column.
  const low = new Map();
  for (const [cx, cy] of cellsOf(piece.type, piece.rot, piece.x, piece.y)) {
    if (!low.has(cx) || cy > low.get(cx)) low.set(cx, cy);
  }
  for (const [cx, cy] of low) {
    for (let i = 0; i < 3; i++) {
      if (frost.length >= MAX_FROST) return;
      frost.push({
        x: gridX + cx * cell + cell * (0.2 + Math.random() * 0.6),
        y: gridY + (cy - HIDDEN) * cell + cell,
        vx: (Math.random() - 0.5) * 26,
        vy: -8 - Math.random() * 18,
        born: performance.now(),
        life: 380 + Math.random() * 220,
        s: cell * (0.05 + Math.random() * 0.06),
      });
    }
  }
}

/* ── Rising garbage ────────────────────────────────────── */
let garbageGapCol = Math.floor(Math.random() * COLS);
let garbageRowsSinceGapChange = 0;

function tickGarbage() {
  const every = garbageEvery(level);
  if (every === null) {
    garbageCountdown = null;
    el.status.classList.remove("armed", "imminent");
    el.pressure.style.width = "0%";
    return;
  }
  el.status.classList.add("armed");
  if (garbageCountdown === null) garbageCountdown = every;
  garbageCountdown--;
  if (garbageCountdown <= 0) {
    riseGarbage();
    garbageCountdown = every;
  }
}

function riseGarbage() {
  // The gap moves only every third row, so it can be played around.
  if (garbageRowsSinceGapChange >= 3) {
    let next = garbageGapCol;
    while (next === garbageGapCol) next = Math.floor(Math.random() * COLS);
    garbageGapCol = next;
    garbageRowsSinceGapChange = 0;
  }
  garbageRowsSinceGapChange++;

  const row = Array.from({ length: COLS }, (_, x) => (x === garbageGapCol ? null : "G"));
  grid.shift();
  grid.push(row);
  // Push the live piece up with the stack so a rise never buries it.
  if (piece && fits(piece.type, piece.rot, piece.x, piece.y - 1)) piece.y -= 1;
  if (grid[0].some((c) => c !== null)) endGame();
}

function updatePressure() {
  const every = garbageEvery(level);
  if (every === null || garbageCountdown === null) return;
  const p = 1 - garbageCountdown / every;
  el.pressure.style.width = (p * 100).toFixed(0) + "%";
  el.status.classList.toggle("imminent", garbageCountdown <= 2);
}

/* ── HUD ───────────────────────────────────────────────── */
function updateHud() {
  el.score.textContent = Math.floor(score);
  el.level.textContent = level;
  el.lines.textContent = lines;
  updatePressure();
}

/* ── Drawing the ice ───────────────────────────────────────
   A block is a slightly irregular quadrilateral rather than a square, so a
   packed stack reads as ice and not as a grid. Corner jitter and the
   fracture lines are a deterministic function of the cell's position, so a
   block never shimmers between frames — the same cell always looks the
   same. */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function shade(hex, amt) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function drawBlock(g2, px, py, size, type, opts = {}) {
  const active = opts.active === true;
  const alpha = opts.alpha ?? 1;
  const base = type === "G" ? "#5a636e" : (PIECE_COLORS[type] ?? "#8aa");
  const j = size * 0.07;
  const gx = Math.round(px / Math.max(1, size));
  const gy = Math.round(py / Math.max(1, size));

  const q = [
    [px + hash2(gx, gy) * j, py + hash2(gx + 9, gy) * j],
    [px + size - hash2(gx + 1, gy) * j, py + hash2(gx, gy + 7) * j],
    [px + size - hash2(gx + 3, gy + 3) * j, py + size - hash2(gx + 5, gy) * j],
    [px + hash2(gx + 4, gy + 2) * j, py + size - hash2(gx, gy + 4) * j],
  ];

  g2.save();
  g2.globalAlpha = alpha;

  g2.beginPath();
  g2.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < 4; i++) g2.lineTo(q[i][0], q[i][1]);
  g2.closePath();
  g2.fillStyle = base;
  g2.fill();

  // Faint inner glow — stronger while falling, so the active piece is always
  // readable against the stack.
  const g = g2.createRadialGradient(
    px + size * 0.42,
    py + size * 0.4,
    size * 0.05,
    px + size * 0.5,
    py + size * 0.5,
    size * 0.75,
  );
  g.addColorStop(0, `rgba(255,255,255,${active ? 0.3 : 0.12})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  g2.fillStyle = g;
  g2.fill();

  g2.clip();

  // Faceted depth: bright along top and left, dark along bottom and right.
  g2.lineWidth = Math.max(1, size * 0.075);
  g2.strokeStyle = shade(base, 52);
  g2.beginPath();
  g2.moveTo(q[3][0], q[3][1]);
  g2.lineTo(q[0][0], q[0][1]);
  g2.lineTo(q[1][0], q[1][1]);
  g2.stroke();
  g2.strokeStyle = shade(base, -58);
  g2.beginPath();
  g2.moveTo(q[1][0], q[1][1]);
  g2.lineTo(q[2][0], q[2][1]);
  g2.lineTo(q[3][0], q[3][1]);
  g2.stroke();

  // Two or three fracture lines, angled differently per block.
  const n = 2 + (hash2(gx + 2, gy + 6) > 0.55 ? 1 : 0);
  g2.lineWidth = Math.max(0.6, size * 0.028);
  g2.strokeStyle = `rgba(255,255,255,${active ? 0.34 : 0.2})`;
  for (let i = 0; i < n; i++) {
    const a = hash2(gx + i * 5, gy + i * 3) * Math.PI;
    const ox = px + size * (0.2 + hash2(gx + i, gy + i * 2) * 0.6);
    const oy = py + size * (0.2 + hash2(gx + i * 3, gy + i) * 0.6);
    const len = size * (0.3 + hash2(gx + i, gy + 8) * 0.42);
    g2.beginPath();
    g2.moveTo(ox - Math.cos(a) * len * 0.5, oy - Math.sin(a) * len * 0.5);
    g2.lineTo(ox + Math.cos(a) * len * 0.5, oy + Math.sin(a) * len * 0.5);
    g2.stroke();
  }
  g2.restore();
}

function drawPlayfield(now) {
  // Panel: the background stays visible behind it, just quietened.
  ctx.fillStyle = "rgba(6,10,20,0.55)";
  ctx.fillRect(gridX, gridY, gridW, gridH);

  // Column and row hairlines, very faint.
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(gridX + x * cell + 0.5, gridY);
    ctx.lineTo(gridX + x * cell + 0.5, gridY + gridH);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(gridX, gridY + y * cell + 0.5);
    ctx.lineTo(gridX + gridW, gridY + y * cell + 0.5);
  }
  ctx.stroke();

  // Locked stack.
  for (let y = HIDDEN; y < TOTAL_ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = grid[y][x];
      if (!t) continue;
      const frozen = freezeRow >= 0 && y >= freezeRow;
      drawBlock(ctx, gridX + x * cell, gridY + (y - HIDDEN) * cell, cell, t);
      if (frozen) {
        ctx.fillStyle = "rgba(232,244,252,0.86)";
        ctx.fillRect(gridX + x * cell, gridY + (y - HIDDEN) * cell, cell, cell);
      }
    }
  }

  // Active piece.
  if (piece && !gameOver) {
    for (const [cx, cy] of cellsOf(piece.type, piece.rot, piece.x, piece.y)) {
      if (cy < HIDDEN) continue;
      drawBlock(ctx, gridX + cx * cell, gridY + (cy - HIDDEN) * cell, cell, piece.type, {
        active: true,
      });
    }
  }

  // Rows mid-clear flare white over the top.
  for (let i = clearing.length - 1; i >= 0; i--) {
    const c = clearing[i];
    const t = (now - c.born) / c.life;
    if (t >= 1) {
      clearing.splice(i, 1);
      continue;
    }
    const a = c.fade ? 1 - t : 1 - t * t;
    ctx.fillStyle = `rgba(255,255,255,${(a * 0.85).toFixed(3)})`;
    for (const y of c.rows) {
      if (y < HIDDEN) continue;
      ctx.fillRect(gridX, gridY + (y - HIDDEN) * cell, gridW, cell);
    }
  }

  // Border, in the game accent.
  ctx.strokeStyle = "rgba(168,216,232,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(gridX - 1, gridY - 1, gridW + 2, gridH + 2);
}

function drawEffects(now) {
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    const t = (now - s.born) / s.life;
    if (t >= 1) {
      shards.splice(i, 1);
      continue;
    }
    const dt = (now - s.born) / 1000;
    const x = s.x + s.vx * dt;
    const y = s.y + s.vy * dt + 420 * dt * dt;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(x, y);
    ctx.rotate(s.rot + s.vr * dt);
    ctx.fillStyle = PIECE_COLORS[s.type] ?? "#cfe";
    ctx.fillRect(-s.s / 2, -s.s / 2, s.s, s.s);
    ctx.restore();
  }

  for (let i = frost.length - 1; i >= 0; i--) {
    const f = frost[i];
    const t = (now - f.born) / f.life;
    if (t >= 1) {
      frost.splice(i, 1);
      continue;
    }
    const dt = (now - f.born) / 1000;
    ctx.globalAlpha = (1 - t) * 0.7;
    ctx.fillStyle = "#dff0fb";
    ctx.beginPath();
    ctx.arc(f.x + f.vx * dt, f.y + f.vy * dt + 60 * dt * dt, f.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (let i = trails.length - 1; i >= 0; i--) {
    const tr = trails[i];
    const t = (now - tr.born) / 220;
    if (t >= 1) {
      trails.splice(i, 1);
      continue;
    }
    const g = ctx.createLinearGradient(
      0,
      gridY + (tr.y0 - HIDDEN) * cell,
      0,
      gridY + (tr.y1 - HIDDEN) * cell,
    );
    g.addColorStop(0, "rgba(232,244,252,0)");
    g.addColorStop(1, `rgba(232,244,252,${(0.45 * (1 - t)).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(
      gridX + tr.col * cell + cell * 0.28,
      gridY + (tr.y0 - HIDDEN) * cell,
      cell * 0.44,
      Math.max(0, (tr.y1 - tr.y0) * cell),
    );
  }
}

/* ── Hold and next previews ────────────────────────────── */
let slotCell = 16;
function sizeSlots() {
  slotCell = isNarrow() ? 9 : 13;
  const unit = slotCell * 4 + 10;
  el.holdCanvas.width = unit;
  el.holdCanvas.height = slotCell * 2 + 10;
  if (isNarrow()) {
    // Three previews across rather than down, so the band stays one row tall
    // and the grid keeps its height.
    el.nextCanvas.width = (slotCell * 4 + 4) * 3 + 8;
    el.nextCanvas.height = slotCell * 2 + 10;
  } else {
    el.nextCanvas.width = unit;
    el.nextCanvas.height = (slotCell * 2 + 4) * 3 + 8;
  }
  drawSlots();
}

function drawPreview(c, types, horizontal = false) {
  const g = c.getContext("2d");
  g.clearRect(0, 0, c.width, c.height);
  types.forEach((type, i) => {
    if (!type) return;
    const cells = SHAPES[type][0];
    const xs = cells.map((p) => p[0]);
    const ys = cells.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 1;
    const slotW = horizontal ? slotCell * 4 + 4 : c.width;
    const ox =
      (horizontal ? 4 + i * slotW : 0) +
      (slotW - w * slotCell) / 2 -
      Math.min(...xs) * slotCell;
    const oy = (horizontal ? 5 : 5 + i * (slotCell * 2 + 4)) - Math.min(...ys) * slotCell;
    for (const [cx, cy] of cells) {
      drawBlock(g, ox + cx * slotCell, oy + cy * slotCell, slotCell, type);
    }
  });
}

function drawSlots() {
  drawPreview(el.holdCanvas, [holdType]);
  drawPreview(el.nextCanvas, queue.slice(0, 3), isNarrow());
}

/* ── Intro ─────────────────────────────────────────────── */
let introHidden = false;
function hideIntro() {
  if (introHidden || !el.intro) return;
  introHidden = true;
  started = true;
  el.intro.style.opacity = "0";
  el.intro.style.transform = "translateY(-10px)";
  el.intro.style.pointerEvents = "none";
  el.status.classList.add("show");
  el.hold.classList.add("show");
  el.next.classList.add("show");
}

/* ── Controls: desktop ─────────────────────────────────────
   DAS/ARR by hand rather than relying on OS key repeat, whose initial delay
   and rate vary per machine and would make the game feel different on every
   desk. */
const DAS_MS = 170;
const ARR_MS = 50;
const held = { left: false, right: false, down: false };
let dasDir = 0;
let dasTimer = 0;
let arrTimer = 0;

function setDir(dir, on) {
  if (on) {
    held[dir === -1 ? "left" : "right"] = true;
    dasDir = dir;
    dasTimer = 0;
    arrTimer = 0;
    tryMove(dir, 0);
  } else {
    held[dir === -1 ? "left" : "right"] = false;
    if (dasDir === dir) {
      // Fall back to the other direction if it is still held.
      dasDir = held.left ? -1 : held.right ? 1 : 0;
      dasTimer = 0;
    }
  }
}

addEventListener("keydown", (e) => {
  if (e.code === "KeyR" && gameOver) {
    reset();
    return;
  }
  if (e.code === "KeyP" || e.code === "Escape") {
    e.preventDefault();
    togglePause();
    return;
  }
  if (gameOver || paused) return;
  let used = true;
  switch (e.code) {
    case "ArrowLeft":
      setDir(-1, true);
      break;
    case "ArrowRight":
      setDir(1, true);
      break;
    case "ArrowDown":
      held.down = true;
      softDrop();
      break;
    case "ArrowUp":
    case "KeyX":
      tryRotate(1);
      break;
    case "KeyZ":
    case "ControlLeft":
    case "ControlRight":
      tryRotate(-1);
      break;
    case "Space":
      hardDrop();
      break;
    case "ShiftLeft":
    case "ShiftRight":
    case "KeyC":
      hold();
      break;
    default:
      used = false;
  }
  if (used) {
    e.preventDefault();
    hideIntro();
  }
});

addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") setDir(-1, false);
  else if (e.code === "ArrowRight") setDir(1, false);
  else if (e.code === "ArrowDown") held.down = false;
});

/* ── Controls: touch ───────────────────────────────────────
   The whole playfield area is the target; there are no on-screen buttons.
   The single most common way this genre feels bad on a phone is a rotation
   tap being eaten as a short swipe, so the move threshold is a generous
   fraction of a cell and a tap additionally has to be short and nearly
   stationary. */
let touch = null;
const SWIPE_MOVE = () => Math.max(22, cell * 0.72);
const SWIPE_DOWN = () => Math.max(26, cell * 0.85);
const TAP_MAX_MS = 220;
const TAP_MAX_DIST = 14;
const LONG_PRESS_MS = 420;

canvas.addEventListener(
  "touchstart",
  (e) => {
    hideIntro();
    if (gameOver || paused) return;
    if (e.touches.length === 2) {
      tryRotate(-1);
      if (touch) touch.consumed = true;
      e.preventDefault();
      return;
    }
    const t = e.touches[0];
    const w = screenToWorld(t.clientX, t.clientY);
    touch = {
      x0: w.x,
      y0: w.y,
      x: w.x,
      y: w.y,
      t0: performance.now(),
      movedCols: 0,
      softing: false,
      consumed: false,
      longTimer: setTimeout(() => {
        if (touch && !touch.consumed) {
          touch.consumed = true;
          hold();
        }
      }, LONG_PRESS_MS),
    };
    e.preventDefault();
  },
  { passive: false },
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (!touch || gameOver || paused) return;
    const t = e.touches[0];
    const w = screenToWorld(t.clientX, t.clientY);
    touch.x = w.x;
    touch.y = w.y;
    const dx = w.x - touch.x0;
    const dy = w.y - touch.y0;

    // Horizontal: one column per threshold crossed, and holding at the end
    // of a swipe keeps repeating via the DAS path below.
    const want = Math.trunc(dx / SWIPE_MOVE());
    if (want !== touch.movedCols) {
      const step = want > touch.movedCols ? 1 : -1;
      while (touch.movedCols !== want) {
        if (!tryMove(step, 0)) break;
        touch.movedCols += step;
      }
      touch.consumed = true;
      clearTimeout(touch.longTimer);
      dasDir = step;
      dasTimer = 0;
      arrTimer = 0;
    }

    if (dy > SWIPE_DOWN() && Math.abs(dx) < Math.abs(dy)) {
      touch.softing = true;
      touch.consumed = true;
      clearTimeout(touch.longTimer);
    }
    e.preventDefault();
  },
  { passive: false },
);

canvas.addEventListener(
  "touchend",
  (e) => {
    if (!touch) return;
    clearTimeout(touch.longTimer);
    const dt = performance.now() - touch.t0;
    const dx = touch.x - touch.x0;
    const dy = touch.y - touch.y0;
    const dist = Math.hypot(dx, dy);

    if (!gameOver && !paused && !touch.consumed) {
      if (dy < -SWIPE_DOWN() && Math.abs(dy) > Math.abs(dx)) hardDrop();
      else if (dt < TAP_MAX_MS && dist < TAP_MAX_DIST) tryRotate(1);
    }
    touch = null;
    dasDir = 0;
    e.preventDefault();
  },
  { passive: false },
);

/* ── Pause ─────────────────────────────────────────────── */
function togglePause(force) {
  if (gameOver || !started) return;
  paused = force ?? !paused;
  el.pause.classList.toggle("show", paused);
  document.body.classList.toggle("is-paused", paused);
}
el.resume.addEventListener("click", () => togglePause(false));
addEventListener("blur", () => togglePause(true));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) togglePause(true);
});

/* ── Game over ─────────────────────────────────────────── */
function endGame() {
  if (gameOver) return;
  gameOver = true;
  piece = null;
  const beat = Math.floor(score) > best;
  if (beat) {
    best = Math.floor(score);
    el.best.textContent = best;
  }
  el.finalScore.textContent = Math.floor(score);
  el.finalLines.textContent = lines;
  el.finalLevel.textContent = level;
  el.finalBest.textContent = best;
  el.bestMarker.classList.toggle("show", beat);

  // The stack freezes over from the bottom up before the card appears.
  freezeRow = TOTAL_ROWS;
  const step = 800 / TOTAL_ROWS;
  const freeze = setInterval(() => {
    freezeRow--;
    if (freezeRow <= 0) {
      clearInterval(freeze);
      el.over.classList.add("show");
      if (!scoreSubmitted) {
        scoreSubmitted = true;
        setTimeout(() => {
          submitScoreOnGameOver({
            gameKey: "ice-fall",
            gameLabel: "Ice Fall",
            score: Math.floor(score),
            ask: true,
          });
        }, 60);
      }
    }
  }, step);
}

function reset() {
  grid = emptyGrid();
  bag = [];
  queue = [];
  fillQueue();
  piece = null;
  holdType = null;
  holdUsed = false;
  score = 0;
  lines = 0;
  level = 1;
  garbageCountdown = null;
  garbageRowsSinceGapChange = 0;
  garbageGapCol = Math.floor(Math.random() * COLS);
  backToBack = false;
  gameOver = false;
  paused = false;
  scoreSubmitted = false;
  freezeRow = -1;
  shards.length = 0;
  frost.length = 0;
  trails.length = 0;
  clearing.length = 0;
  shakeUntil = 0;
  bgPulse = 0;
  el.over.classList.remove("show");
  el.pause.classList.remove("show");
  el.status.classList.remove("armed", "imminent");
  document.body.classList.remove("is-paused");
  el.pressure.style.width = "0%";
  spawn();
  updateHud();
}

el.overRestart.addEventListener("click", reset);
el.overRestart.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    reset();
  },
  { passive: false },
);
addEventListener("pointerdown", () => hideIntro(), { once: true });

/* ── The loop ──────────────────────────────────────────────
   One rAF loop drives the backdrop and the game. Under reduced motion the
   backdrop renders a single static frame, but the game keeps running — the
   brief asks for unchanged gameplay, not a frozen page. */
let last = 0;
let plumeClock = 0;
/* Reduced motion: the backdrop paints one frame and then stops, the way
   arcade.js does it. The game itself keeps running. */
let backdropPainted = false;

function step(ts) {
  if (!last) last = ts;
  const dt = Math.min(33, ts - last) * 0.001;
  last = ts;

  if (!gameOver && !paused && started) {
    // Gravity.
    dropTimer += dt * 1000;
    const g = gravityMs(level) / (held.down ? 8 : 1);
    while (dropTimer >= g) {
      dropTimer -= g;
      if (fits(piece?.type, piece?.rot, piece?.x, piece?.y + 1)) {
        piece.y += 1;
        locking = false;
      } else {
        locking = true;
        break;
      }
    }

    // Lock delay.
    if (piece && locking) {
      lockTimer += dt * 1000;
      if (lockTimer >= lockDelayMs(level)) lockPiece();
    } else {
      lockTimer = 0;
    }

    // DAS/ARR for held direction (keyboard and held touch swipes alike).
    if (dasDir !== 0 && (held.left || held.right || touch)) {
      dasTimer += dt * 1000;
      if (dasTimer >= DAS_MS) {
        arrTimer += dt * 1000;
        while (arrTimer >= ARR_MS) {
          arrTimer -= ARR_MS;
          if (!tryMove(dasDir, 0)) break;
        }
      }
    }

    // Held soft drop on touch.
    if (touch?.softing) {
      dropTimer += dt * 1000 * 7;
    }

    // Cryovolcanic plumes.
    plumeClock += dt * 1000;
    if (plumeClock >= nextPlumeAt) {
      plumeClock = 0;
      nextPlumeAt = 40000 + Math.random() * 20000;
      spawnPlume(ts);
    }

    // Charon crosses the sky. Part 9 turns this phase into the game clock.
    if (!reduced) {
      charonPhase = (charonPhase + (dt * 1000) / CHARON_CYCLE_MS) % 1;
      const c = charonAt(charonPhase);
      charonSpec.px = c.px;
      charonSpec.s0 = c.s0;
    }
  }

  if (backdrop && (!reduced || !backdropPainted)) {
    backdrop.tick(ts);
    backdropPainted = true;
  }

  draw(ts);
  requestAnimationFrame(step);
}

function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Screen shake, applied to the whole 2D layer.
  let sx = 0,
    sy = 0;
  if (now < shakeUntil && !reduced) {
    const k = (shakeUntil - now) / 320;
    sx = (Math.random() * 2 - 1) * shakeAmp * k;
    sy = (Math.random() * 2 - 1) * shakeAmp * k;
  }

  ctx.save();
  ctx.translate(viewOffX + sx, viewOffY + sy);
  ctx.scale(viewScale, viewScale);

  drawPlutoShadow();
  drawPlumes(now);
  drawSun();

  // A four-line clear pulses light across the whole background.
  if (bgPulse > 0 && !reduced) {
    ctx.fillStyle = `rgba(168,216,232,${(bgPulse * 0.14).toFixed(3)})`;
    ctx.fillRect(-40, -40, BASE_W + 80, BASE_H + 80);
    bgPulse = Math.max(0, bgPulse - 0.05);
  }

  drawPlayfield(now);
  drawEffects(now);

  ctx.restore();
}

/* ── Start ─────────────────────────────────────────────── */
resize();
reset();
started = false;
requestAnimationFrame(step);
