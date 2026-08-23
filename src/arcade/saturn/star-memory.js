/* STAR MEMORY — constellation faces from the tools library, and a run
 * against the clock.
 *
 * The card faces are the 23 model diagrams from /tools, sampled into
 * constellations by the same shared module the tools backdrop uses
 * (constellation-source.js) — star points at the vertices, thin faint
 * lines between them, a fixed background scatter and a fixed colour cast
 * per model, so a returning player recognises a shape. The geometry is
 * imported, never redrawn.
 *
 * The run is continuous: clearing a board starts the next round on a
 * shorter clock (90s, minus 5 per round, floor 35 at round 12), with up
 * to 15 unspent seconds carried forward. Fewer mistakes still earn more
 * — 100 a match times a streak multiplier that one mismatch resets.
 *
 * Canvas contract: fixed 720x1280 virtual board, letterboxed. DPR cap,
 * setTransform after resize, world-space pointer conversion, clamped dt.
 */

import { definePlanetField } from "../../shared/elements/planet-field.ts";
import { color } from "../../tokens.ts";
import { submitScoreOnGameOver, fetchGlobalBest } from "../shared/score-submit.js";
import { DIAGRAMS, TOOLS, mulberry32 } from "../../tools/shared/tools-data.js";
import { extractConstellation } from "../../tools/shared/constellation-source.js";

definePlanetField();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BASE_W = 720;
const BASE_H = 1280;
let W = 0,
  H = 0,
  dpr = 1,
  viewScale = 1,
  viewOffX = 0,
  viewOffY = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  viewScale = Math.min(W / BASE_W, H / BASE_H);
  viewOffX = (W - BASE_W * viewScale) * 0.5;
  viewOffY = (H - BASE_H * viewScale) * 0.5;
  layoutBackdrop();
  if (typeof placeCards === "function" && cards?.length) placeCards();
}
addEventListener("resize", resize, { passive: true });

/* ── Saturn ────────────────────────────────────────────────
   A real ringed PlanetBody: the shared element's RingGeometry is a true
   plane in 3D, so the rings pass in front of the globe on the near side
   and behind it on the far side without any drawing tricks here. The 2D
   layer adds what the element cannot: the weak-light terminator, the
   ring shadow band across the cloud tops, the polar hexagon, and
   Titan's haze. */
const backdrop = document.getElementById("bg");

const saturnSpec = {
  name: "SATURN",
  r: 0.5,
  s0: 0.5,
  px: 0.82,
  pf: 1,
  hi: color.planet.saturnHi,
  lo: color.planet.saturnLo,
  ring: true,
  spin: 0.02,
  depth: -240,
};
const titanSpec = {
  name: "TITAN",
  r: 0.028,
  s0: 0.18,
  px: 0.24,
  pf: 1,
  hi: "#d8a05c",
  lo: "#8a5f36",
  spin: 0.008,
  depth: -60,
};

function layoutBackdrop() {
  const portrait = H >= W;
  saturnSpec.r = portrait ? 0.46 : 0.56;
  saturnSpec.px = portrait ? 0.86 : 0.85;
  saturnSpec.s0 = portrait ? 0.52 : 0.5;
  titanSpec.px = portrait ? 0.18 : 0.24;
}

if (backdrop) {
  backdrop.starLayers = [
    { count: 90, radius: 1.1, alpha: 0.8, parallax: 0.06 },
    { count: 70, radius: 0.7, alpha: 0.45, parallax: 0.02 },
  ];
  backdrop.planets = [titanSpec, saturnSpec];
}

function planetScreen(spec) {
  const vmin = Math.min(W, H);
  const r = spec.r * vmin;
  const ZF = 1000;
  const depth = spec.depth ?? 0;
  return { x: spec.px * W, y: H * 0.55 + spec.s0 * H * spec.pf, r: (r * ZF) / (ZF - depth) };
}

const LIT_ANGLE = Math.PI * 1.25;

function drawSaturnShadow() {
  const p = planetScreen(saturnSpec);
  const lx = p.x + Math.cos(LIT_ANGLE) * p.r * 0.9;
  const ly = p.y + Math.sin(LIT_ANGLE) * p.r * 0.9;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 0.5, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(lx, ly, p.r * 0.08, lx, ly, p.r * 1.5);
  g.addColorStop(0, "rgba(4,7,14,0.12)");
  g.addColorStop(0.22, "rgba(4,7,14,0.4)");
  g.addColorStop(0.46, "rgba(4,7,14,0.78)");
  g.addColorStop(1, "rgba(4,7,14,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.restore();
}

/* The ring shadow: a soft dark band across the lit face where the ring
   plane crosses it — and it sweeps once when a board completes. */
let ringSweep = -1; // 0..1 while sweeping
function drawRingShadow() {
  const p = planetScreen(saturnSpec);
  const off = ringSweep >= 0 ? (ringSweep - 0.5) * p.r * 1.2 : 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(20,16,8,0.4)";
  ctx.lineWidth = p.r * 0.1;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - p.r * 0.28 + off, p.r * 1.05, p.r * 0.3, -0.18, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();
}

/* The polar hexagon — Saturn's most distinctive feature, and almost
   nobody draws it. Faint, turning very slowly. */
let hexRot = 0;
function drawHexagon(dt) {
  if (!reduced) hexRot += dt * 0.03;
  const p = planetScreen(saturnSpec);
  const hx = p.x - p.r * 0.12;
  const hy = p.y - p.r * 0.78;
  const hr = p.r * 0.16;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(hx, hy);
  ctx.scale(1, 0.42); // foreshortened toward the pole
  ctx.rotate(hexRot);
  ctx.strokeStyle = "rgba(120,100,70,0.5)";
  ctx.lineWidth = Math.max(1, p.r * 0.014);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * hr,
      y = Math.sin(a) * hr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/* Titan: hazy orange, soft blurred edge — the one moon with a thick
   atmosphere. The glow is what says haze. */
function drawTitanHaze() {
  const p = planetScreen(titanSpec);
  const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.3, p.x, p.y, p.r * 2.4);
  g.addColorStop(0, "rgba(216,160,92,0.3)");
  g.addColorStop(0.55, "rgba(216,160,92,0.12)");
  g.addColorStop(1, "rgba(216,160,92,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
  ctx.fill();
}

/* ── The 23 model constellations ───────────────────────────
   Extracted once at boot from the very SVGs /tools draws, via the shared
   sampler. Extraction needs the SVGs in the DOM with real layout, so
   they pass through a hidden host and are gone before first paint. */

/* Dense diagrams sample coarser so a card reads as a constellation, not
   a scatter plot — the brief's "simplify rather than enlarge". */
const STEP_OVERRIDE = {
  grid9: 44,
  grid6: 40,
  lotus: 44,
  crazyeights: 36,
  sixbysix: 38,
  matrix: 32,
  stakemap: 32,
  octagon: 30,
  fivewhys: 36,
  silentvoting: 44,
  coremodel: 36,
  layered: 42,
  venn: 32,
  rean: 30,
  kano: 30,
};

/* Silhouette families for board spacing. Six families; no board carries
   more than two of a family, and the EXCLUSIVE groups below are pairs or
   trios close enough to confuse (Design Thinking's venn and Octalysis's
   octagon are both round mandalas; the three axis-plus-curve charts;
   the two triangles; the two row-lists; the two 3x3 grids). */
const FAMILY = {
  venn: "circular",
  octagon: "circular",
  reflect: "circular",
  triangle: "angular",
  pyramid: "angular",
  doublediamond: "angular",
  grid9: "grid",
  grid6: "grid",
  matrix: "grid",
  lotus: "grid",
  crazyeights: "grid",
  curve: "curve",
  peakend: "curve",
  kano: "curve",
  squiggle: "curve",
  radial7: "radial",
  stakemap: "radial",
  coremodel: "radial",
  silentvoting: "radial",
  rean: "linear",
  fivewhys: "linear",
  layered: "linear",
  sixbysix: "linear",
};
const EXCLUSIVE = [
  ["venn", "octagon"],
  ["grid9", "lotus"],
  ["curve", "peakend", "kano"],
  ["triangle", "pyramid"],
  ["grid6", "sixbysix"],
];

const GEO = {};
(function extractAllModels() {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);

  TOOLS.forEach((tool, i) => {
    const key = tool.diagram;
    if (GEO[key]) return;
    const svg = DIAGRAMS[key].thumb();
    svg.style.cssText = "display:block;width:160px;height:160px;";
    host.appendChild(svg);
    const { stars, polylines } = extractConstellation(svg, { step: STEP_OVERRIDE[key] ?? 26 });
    svg.remove();
    if (!stars.length) return;

    // Normalise to a centred [-1, 1] box, aspect preserved.
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const scan = (p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    };
    stars.forEach(scan);
    polylines.forEach((line) => line.forEach(scan));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const scale = 2 / Math.max(maxX - minX, maxY - minY, 1);
    const norm = (p) => ({ x: (p.x - cx) * scale, y: (p.y - cy) * scale });

    /* Everything seeded from the model's index, so size, brightness, the
       one-or-two off-grid points, the scatter and the hue are fixed for
       that model forever — a returning player recognises it. */
    const rnd = mulberry32(1000 + i * 77);
    const offA = Math.floor(rnd() * stars.length);
    const offB = (offA + 1 + Math.floor(rnd() * Math.max(1, stars.length - 1))) % stars.length;
    let normStars = stars.map((p, si) => {
      const q = norm(p);
      if (si === offA || si === offB) {
        q.x += (rnd() - 0.5) * 0.11;
        q.y += (rnd() - 0.5) * 0.11;
      }
      return { ...q, r: 0.55 + rnd() * 0.75, a: 0.55 + rnd() * 0.45 };
    });
    /* Corner-heavy diagrams (nine boxes = 36 corners) stay dense no matter
       the sampling step, so the last resort is merging: fuse the closest
       pair until at most 30 stars remain. The thin lines still carry the
       full shape — this only calms the sparkle. */
    while (normStars.length > 30) {
      let bi = 0,
        bj = 1,
        bd = Infinity;
      for (let a = 0; a < normStars.length; a++)
        for (let b2 = a + 1; b2 < normStars.length; b2++) {
          const d =
            (normStars[a].x - normStars[b2].x) ** 2 + (normStars[a].y - normStars[b2].y) ** 2;
          if (d < bd) {
            bd = d;
            bi = a;
            bj = b2;
          }
        }
      const A = normStars[bi];
      const B = normStars[bj];
      const merged = {
        x: (A.x + B.x) / 2,
        y: (A.y + B.y) / 2,
        r: Math.max(A.r, B.r),
        a: Math.max(A.a, B.a),
      };
      normStars = normStars.filter((_, idx) => idx !== bi && idx !== bj);
      normStars.push(merged);
    }
    const scatter = [...Array(9)].map(() => ({
      x: (rnd() * 2 - 1) * 1.12,
      y: (rnd() * 2 - 1) * 1.12,
      r: 0.25 + rnd() * 0.35,
      a: 0.12 + rnd() * 0.14,
    }));

    GEO[key] = {
      stars: normStars,
      polys: polylines.map((line) => line.map(norm)),
      scatter,
      hue: (i * 137.508) % 360, // golden-angle spread: 23 distinct casts
    };
  });
  host.remove();
})();

const ALL_KEYS = TOOLS.map((t) => t.diagram).filter((k) => GEO[k]);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Fresh set each round: models from the previous round sit at the back
   of each family's queue (rule 2 relaxes before rule 3 by construction),
   families cap at two per board, and an EXCLUSIVE group contributes at
   most one model. Round-robin across shuffled families spreads the rest. */
function selectModels(pairs, prev) {
  const groupOf = (k) => EXCLUSIVE.findIndex((g) => g.includes(k));
  const byFam = {};
  for (const k of ALL_KEYS) (byFam[FAMILY[k]] ??= []).push(k);
  const famNames = shuffle(Object.keys(byFam));
  for (const f of famNames) {
    const fresh = shuffle(byFam[f].filter((k) => !prev.includes(k)));
    const stale = shuffle(byFam[f].filter((k) => prev.includes(k)));
    byFam[f] = fresh.concat(stale);
  }
  const picked = [];
  const famCount = {};
  const usedGroups = new Set();
  // Two sweeps: every family's fresh models first, and only once fresh is
  // exhausted everywhere may last round's models return — rule 2 relaxes
  // before rule 3, never the other way around.
  for (const freshOnly of [true, false]) {
    for (let pass = 0; pass < 6 && picked.length < pairs; pass++) {
      for (const f of famNames) {
        if (picked.length >= pairs) break;
        if ((famCount[f] || 0) >= 2) continue;
        const next = byFam[f].find(
          (k) =>
            !picked.includes(k) &&
            (!freshOnly || !prev.includes(k)) &&
            (groupOf(k) < 0 || !usedGroups.has(groupOf(k))),
        );
        if (!next) continue;
        picked.push(next);
        famCount[f] = (famCount[f] || 0) + 1;
        if (groupOf(next) >= 0) usedGroups.add(groupOf(next));
      }
    }
  }
  return picked;
}

/* ── Run state ─────────────────────────────────────────── */
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const pairsEl = document.getElementById("pairsVal");
const roundEl = document.getElementById("roundVal");
const multEl = document.getElementById("multVal");
const timeFill = document.getElementById("timeFill");
const statusEl = document.getElementById("status");

let score = 0,
  best = 0,
  gameOver = false,
  scoreSubmitted = false;
let cards = [];
let flipped = [];
let matched = 0;
let lock = false;
let nowMs = 0;

let phase = "intro"; // intro | play | transition | reveal | over
let round = 1;
let roundsCleared = 0;
let boardPairsNow = 6;
let roundTotal = 90;
let timeLeft = 90;
let streak = 0;
let mult = 1;
let prevKeys = [];

fetchGlobalBest("saturn").then((b) => {
  best = Math.max(best, b);
  bestEl.textContent = best;
});

const baseTime = (r) => Math.max(35, 90 - 5 * (r - 1));
const boardPairs = (r) => (r <= 3 ? 6 : r <= 7 ? 8 : r <= 12 ? 10 : 12);
const GRIDS = { 6: [3, 4], 8: [4, 4], 10: [4, 5], 12: [4, 6] };

/* The chrome is DOM in screen space and the cards live in world space, so
   the clear band between the pill rows and the status panel has to be
   measured, not assumed — on a phone the pills wrap to two rows and the
   panel spans the full width, and both were eating the board. */
function boardArea() {
  const toWorldY = (sy) => (sy - viewOffY) / viewScale;
  const tb = document.querySelector(".topbar")?.getBoundingClientRect();
  const pn = document.getElementById("status")?.getBoundingClientRect();
  const top = Math.max(110, tb ? toWorldY(tb.bottom) + 22 : 200);
  // The desktop panel is a narrow bottom-left box the centred board never
  // meets; only a full-width (mobile) panel actually caps the band.
  const panelCaps = pn && pn.width > window.innerWidth * 0.55;
  const bot = Math.min(1250, panelCaps ? toWorldY(pn.top) - 22 : toWorldY(window.innerHeight) - 40);
  return { top, bot: Math.max(top + 320, bot) };
}

function placeCards() {
  if (!cards.length) return;
  const [cols, rows] = GRIDS[boardPairsNow];
  const gap = 20;
  const { top, bot } = boardArea();
  let cardW = (BASE_W - 52 - (cols - 1) * gap) / cols;
  let cardH = cardW * 1.3;
  const availH = bot - top - (rows - 1) * gap;
  if (cardH * rows > availH) {
    cardH = availH / rows;
    cardW = cardH / 1.3;
  }
  const startX = (BASE_W - (cols * cardW + (cols - 1) * gap)) / 2 + cardW / 2;
  const startY = top + (bot - top - (rows * cardH + (rows - 1) * gap)) / 2 + cardH / 2;
  cards.forEach((c, i) => {
    c.x = startX + (i % cols) * (cardW + gap);
    c.y = startY + Math.floor(i / cols) * (cardH + gap);
    c.w = cardW;
    c.h = cardH;
  });
}

function makeBoard() {
  boardPairsNow = boardPairs(round);
  const keys = selectModels(boardPairsNow, prevKeys);
  prevKeys = keys;
  const deck = shuffle([...keys, ...keys]);
  cards = deck.map((key) => ({
    x: 0,
    y: 0,
    w: 100,
    h: 130,
    key,
    open: false,
    matched: false,
    flip: 0, // 0 back .. 1 face
    shudderUntil: 0,
    matchAnimStart: 0,
    completeFlash: 0,
    driftPhase: Math.random() * 6.28,
    driftFreq: 0.25 + Math.random() * 0.2,
  }));
  placeCards();
  matched = 0;
  flipped = [];
  updateHud();
}

function updateHud() {
  pairsEl.textContent = matched / 2 + " / " + boardPairsNow;
  roundEl.textContent = round;
  multEl.textContent = "x" + mult;
}

function reset() {
  score = 0;
  round = 1;
  roundsCleared = 0;
  streak = 0;
  mult = 1;
  prevKeys = [];
  lock = false;
  gameOver = false;
  scoreSubmitted = false;
  ringSweep = -1;
  roundTotal = baseTime(1);
  timeLeft = roundTotal;
  scoreEl.textContent = "0";
  makeBoard();
  phase = introHidden ? "play" : "intro";
  el.over.classList.remove("show");
}

/* Board cleared: bonus, flash, ring sweep, then the next round on a
   shorter clock with up to 15 unspent seconds carried in. */
function boardCleared() {
  score += 200;
  scoreEl.textContent = score;
  roundsCleared = round;
  phase = "transition";
  const seq = reduced ? 0 : 1;
  cards.forEach((c, i) => {
    setTimeout(() => (c.completeFlash = 1), seq * i * 50);
  });
  if (!reduced) setTimeout(() => (ringSweep = 0), 900);
  setTimeout(
    () => {
      const carry = Math.min(15, Math.max(0, timeLeft));
      round += 1;
      roundTotal = baseTime(round) + carry;
      timeLeft = roundTotal;
      makeBoard();
      phase = "play";
    },
    reduced ? 500 : 1800,
  );
}

/* Time out: the remaining cards show themselves one at a time, then the
   completion card. This is the run's only ending. */
function beginTimeout() {
  phase = "reveal";
  lock = true;
  statusEl.classList.remove("imminent");
  const hidden = cards.filter((c) => !c.open && !c.matched);
  const stepMs = reduced ? 45 : 130;
  hidden.forEach((c, i) => {
    setTimeout(() => (c.open = true), i * stepMs);
  });
  setTimeout(showFinal, hidden.length * stepMs + (reduced ? 350 : 750));
}

function showFinal() {
  phase = "over";
  gameOver = true;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  document.getElementById("gameOverTitle").textContent = "OUT OF TIME";
  el.finalScore.textContent = score;
  el.finalRounds.textContent = roundsCleared;
  el.finalBest.textContent = best;
  el.bestMarker.classList.toggle("show", score >= best && score > 0);
  el.over.classList.add("show");
  if (!scoreSubmitted) {
    scoreSubmitted = true;
    setTimeout(() => {
      submitScoreOnGameOver({
        gameKey: "saturn",
        gameLabel: "Star Memory — Saturn",
        score,
        ask: true,
      });
    }, 60);
  }
}

function handleMatch() {
  const [a, b] = flipped;
  if (a.key === b.key) {
    a.matched = true;
    b.matched = true;
    a.matchAnimStart = nowMs;
    b.matchAnimStart = nowMs;
    streak += 1;
    mult = Math.min(5, streak);
    score += 100 * mult;
    matched += 2;
    updateHud();
    if (matched === cards.length) boardCleared();
    flipped = [];
    setTimeout(() => (lock = false), 500);
  } else {
    score = Math.max(0, score - 10);
    streak = 0;
    mult = 1;
    updateHud();
    // hold 900ms, shudder once, flip back
    setTimeout(() => {
      if (!reduced) {
        a.shudderUntil = nowMs + 160;
        b.shudderUntil = nowMs + 160;
      }
      setTimeout(() => {
        a.open = false;
        b.open = false;
      }, 170);
    }, 900);
    flipped = [];
    setTimeout(() => (lock = false), 1100);
  }
  scoreEl.textContent = score;
}

function onTap(clientX, clientY) {
  hideIntro();
  if (paused || lock || phase !== "play") return;
  const r = canvas.getBoundingClientRect();
  const wx = (clientX - r.left - viewOffX) / viewScale;
  const wy = (clientY - r.top - viewOffY) / viewScale;
  for (const c of cards) {
    if (
      !c.open &&
      !c.matched &&
      wx >= c.x - c.w / 2 &&
      wx <= c.x + c.w / 2 &&
      wy >= c.y - c.h / 2 &&
      wy <= c.y + c.h / 2
    ) {
      c.open = true;
      flipped.push(c);
      if (flipped.length === 2) {
        lock = true;
        handleMatch();
      }
      break;
    }
  }
}
canvas.addEventListener("pointerdown", (e) => onTap(e.clientX, e.clientY), { passive: true });
addEventListener("keydown", (e) => {
  if (gameOver && e.code === "KeyR") reset();
});

/* ── Drawing a constellation face ──────────────────────────
   Shape first, colour second: the geometry is the model's own, the cast
   is a courtesy, and everything must survive greyscale. */
function drawFace(c, matchT) {
  const g = GEO[c.key];
  if (!g) return;
  const side = Math.min(c.w * 0.82, c.h * 0.62);
  const s = side / 2;
  const px = (v) => v * s;

  // fixed background scatter — part of the model's identity
  for (const q of g.scatter) {
    ctx.fillStyle = `hsla(${g.hue},40%,85%,${q.a.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px(q.x), px(q.y), Math.max(0.6, q.r * (side / 130)), 0, Math.PI * 2);
    ctx.fill();
  }

  // the connecting lines, very thin and faint
  ctx.strokeStyle = `hsla(${g.hue},45%,80%,${(0.22 + matchT * 0.3).toFixed(2)})`;
  ctx.lineWidth = Math.max(0.7, side * 0.008);
  for (const line of g.polys) {
    ctx.beginPath();
    line.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.x), px(p.y));
      else ctx.lineTo(px(p.x), px(p.y));
    });
    ctx.stroke();
  }

  // the stars — varied sizes and brightness, a couple slightly off-true
  const rScale = side / 130;
  for (const st of g.stars) {
    const rr = Math.max(0.9, st.r * 2.4 * rScale) * (1 + matchT * 0.3);
    ctx.fillStyle = `hsla(${g.hue},55%,${Math.round(72 + st.a * 20)}%,${Math.min(1, st.a + matchT * 0.25).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px(st.x), px(st.y), rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* All backs identical: dark, low contrast, a faint scatter of stars and
   a small accent dot at the centre. Fixed seed — every back the same. */
const BACK_SCATTER = (() => {
  const rnd = mulberry32(424242);
  return [...Array(12)].map(() => ({
    x: rnd() * 2 - 1,
    y: rnd() * 2 - 1,
    r: 0.5 + rnd() * 0.8,
    a: 0.1 + rnd() * 0.12,
  }));
})();

function drawCardBack(c) {
  const s = Math.min(c.w, c.h) * 0.4;
  for (const q of BACK_SCATTER) {
    ctx.fillStyle = `rgba(223,232,255,${q.a.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(q.x * s, q.y * s * 1.35, q.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d6c491";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCard(c, now) {
  // flip progress
  const target = c.open || c.matched ? 1 : 0;
  const speed = reduced ? 1000 / 150 : 1000 / 400;
  c.flip += (target - c.flip) * Math.min(1, dtGlobal * speed * 3.2);
  if (Math.abs(c.flip - target) < 0.01) c.flip = target;

  let dx = 0,
    dy = 0;
  if (!reduced && !c.open && !c.matched) {
    // idle drift, never more than 2px, staggered
    dx = Math.cos(now * 0.001 * c.driftFreq + c.driftPhase) * 2;
    dy = Math.sin(now * 0.001 * c.driftFreq * 0.8 + c.driftPhase) * 1.5;
  }
  if (c.shudderUntil > now) {
    dx += (Math.random() - 0.5) * 5;
  }

  ctx.save();
  ctx.translate(c.x + dx, c.y + dy);

  if (reduced) {
    // crossfade instead of flipping
    const p = c.flip;
    drawCardShell(c, 1, p < 0.5 ? 1 - p * 2 : 0, now);
    if (p > 0.5) drawCardFace(c, (p - 0.5) * 2, now);
  } else {
    const p = c.flip;
    const sx = Math.abs(Math.cos(p * Math.PI));
    const lift = 1 + Math.sin(p * Math.PI) * 0.06;
    ctx.scale(sx * lift, lift);
    if (p < 0.5) {
      drawCardShell(c, 1, 1, now);
    } else {
      drawCardFace(c, 1, now);
    }
    // edge glow mid-turn
    if (p > 0.06 && p < 0.94) {
      ctx.strokeStyle = `rgba(214,196,145,${(Math.sin(p * Math.PI) * 0.6).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCardShell(c, alpha, backAlpha, _now) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(10,14,24,0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12);
  ctx.fill();
  ctx.stroke();
  if (backAlpha > 0) {
    ctx.globalAlpha = alpha * backAlpha;
    drawCardBack(c);
  }
  ctx.globalAlpha = 1;
}

function drawCardFace(c, alpha, now) {
  // matched cards settle to a dimmed state with a thin accent border —
  // they stay on the board.
  let dim = 1;
  let matchT = 0;
  if (c.matched) {
    const since = now - c.matchAnimStart;
    if (since < 900 && !reduced) {
      matchT = Math.min(1, since / 700);
      dim = 1 + 0.25 * Math.sin(Math.min(1, since / 250) * Math.PI); // the pulse
    } else {
      dim = reduced ? 0.62 : 0.55;
    }
    if (c.completeFlash > 0) {
      dim = Math.min(1.1, dim + c.completeFlash * 0.5);
      c.completeFlash = Math.max(0, c.completeFlash - dtGlobal * 1.4);
    }
  }
  ctx.globalAlpha = alpha * Math.min(1, dim);
  ctx.fillStyle = "rgba(16,22,38,0.92)";
  ctx.strokeStyle = c.matched ? "rgba(214,196,145,0.75)" : "rgba(255,255,255,0.3)";
  ctx.lineWidth = c.matched ? 1.8 : 1.5;
  ctx.beginPath();
  ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12);
  ctx.fill();
  ctx.stroke();
  drawFace(c, matchT);
  ctx.globalAlpha = 1;
}

/* ── Intro / HUD ───────────────────────────────────────── */
const el = {
  intro: document.getElementById("intro"),
  introKeys: document.getElementById("introKeys"),
  introTouch: document.getElementById("introTouch"),
  status: document.getElementById("status"),
  over: document.getElementById("gameOver"),
  overRestart: document.getElementById("gameOverRestart"),
  finalScore: document.getElementById("finalScore"),
  finalRounds: document.getElementById("finalRounds"),
  finalBest: document.getElementById("finalBest"),
  bestMarker: document.getElementById("bestMarker"),
};
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (canHover) el.introKeys.classList.add("show");
else el.introTouch.classList.add("show");

let introHidden = false;
function hideIntro() {
  if (introHidden) return;
  introHidden = true;
  el.intro.style.opacity = "0";
  el.intro.style.transform = "translateY(-10px)";
  el.intro.style.pointerEvents = "none";
  el.status.classList.add("show");
  phase = "play"; // the clock starts with the first touch
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

/* ── The loop ──────────────────────────────────────────── */
let last = 0;
let dtGlobal = 0.016;
let backdropPainted = false;

/* Auto-pause: tab switch or window blur pauses; the run resumes only by
   hand, and there is no manual pause control. The clock is dt-driven, so
   freezing the loop freezes it. */
let paused = false;
const pauseOverlayEl = document.getElementById("pause");
function autoPause() {
  if (paused || gameOver) return;
  paused = true;
  pauseOverlayEl?.classList.add("show");
}
addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});
document.getElementById("resumeBtn")?.addEventListener("click", () => {
  paused = false;
  pauseOverlayEl?.classList.remove("show");
  last = 0;
});

function step(ts) {
  if (paused) {
    requestAnimationFrame(step);
    return;
  }
  if (!last) last = ts;
  dtGlobal = Math.min(33, ts - last) * 0.001;
  last = ts;
  nowMs = ts;

  if (phase === "play") {
    timeLeft -= dtGlobal;
    if (timeFill) {
      timeFill.style.width = Math.max(0, (timeLeft / roundTotal) * 100).toFixed(1) + "%";
    }
    statusEl.classList.toggle("imminent", timeLeft <= 10);
    if (timeLeft <= 0) beginTimeout();
  }

  if (ringSweep >= 0) {
    ringSweep += dtGlobal * 0.7;
    if (ringSweep > 1) ringSweep = -1;
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

  // Saturn layer, in screen space
  drawSaturnShadow();
  drawRingShadow();
  drawHexagon(dtGlobal);
  drawTitanHaze();

  ctx.save();
  ctx.translate(viewOffX, viewOffY);
  ctx.scale(viewScale, viewScale);

  // a quiet scrim behind the board so faces never fight the rings
  if (cards.length) {
    const lastCard = cards[cards.length - 1];
    ctx.fillStyle = "rgba(5,8,16,0.35)";
    const bx = cards[0].x - cards[0].w / 2 - 24;
    const by = cards[0].y - cards[0].h / 2 - 24;
    const bw = lastCard.x + lastCard.w / 2 + 24 - bx;
    const bh = lastCard.y + lastCard.h / 2 + 24 - by;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 18);
    ctx.fill();
  }

  for (const c of cards) drawCard(c, now);

  ctx.restore();
}

resize();
makeBoard();
timeLeft = roundTotal;
requestAnimationFrame(step);
