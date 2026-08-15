/* GALILEO — minesweeper over Jupiter, named for the probe that surveyed
 * the system and was deliberately flown into the planet at end of mission
 * so it could never contaminate Europa.
 *
 * The setting is the retired trajectory game's, reused unchanged: banded
 * Jupiter with the Great
 * Red Spot, four moons on elliptical paths, the belt
 * arcs, the aurorae, the starfield. The gameplay layer is new: a translucent survey grid
 * over the centre of the field, radiation pockets hidden in it, and a
 * radiation meter instead of instant death — first pocket 33%, second
 * 66% (clock runs 20% faster), third loses the probe. Radiation resets
 * each board. Boards cascade 9x9 → 16x16 against a carried clock.
 *
 * First click is always safe and always opens a cascade (the layout is
 * generated after it), and every board is verified solvable by deduction
 * alone before it is dealt — no 50/50s.
 *
 * Canvas contract: viewport world at DESIGN_H scale, DPR cap, transform
 * after resize, clamped dt, screenToWorld pointer conversion.
 *
 * Scoreboard: existing interface only, gameKey "galileo".
 */

import { definePlanetField } from "../../shared/elements/planet-field.ts";
import { color } from "../../tokens.ts";
import { submitScoreOnGameOver, fetchGlobalBest } from "../shared/score-submit.js";

definePlanetField();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const DESIGN_H = 900;
let W = 0,
  H = 0,
  dpr = 1,
  viewScale = 1,
  BASE_W = 900,
  BASE_H = 900;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  viewScale = H / DESIGN_H;
  BASE_W = W / viewScale;
  BASE_H = H / viewScale;
}
addEventListener("resize", resize, { passive: true });

function screenToWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) / viewScale, y: (clientY - r.top) / viewScale };
}

/* ── The setting: Jupiter, inherited unchanged ───────────── */
const backdrop = document.getElementById("bg");

const jupiterSpec = {
  name: "JUPITER",
  r: 0.52,
  s0: 0,
  px: 1.0,
  pf: 1,
  hi: color.planet.jupiterHi,
  lo: color.planet.jupiterLo,
  bands: true,
  spin: reduced ? 0 : 0.035,
  depth: -200,
};

if (backdrop) {
  backdrop.starLayers = [
    { count: 130, radius: 1.2, alpha: 0.85, parallax: 0.08 },
    { count: 90, radius: 0.8, alpha: 0.5, parallax: 0.03 },
  ];
  backdrop.planets = [jupiterSpec];
}

function jupiterWorld() {
  const vmin = Math.min(W, H) / viewScale;
  const r = jupiterSpec.r * vmin;
  const ZF = 1000;
  return {
    x: jupiterSpec.px * BASE_W,
    y: BASE_H * 0.55 + jupiterSpec.s0 * BASE_H * jupiterSpec.pf,
    r: (r * ZF) / (ZF - (jupiterSpec.depth ?? 0)),
  };
}

const SQUASH = 0.44;
const MOONS = [
  { key: "io", f: 1.22, r: 9, speed: 0.42, phase: 1.1, hi: "#e8d06a", lo: "#a8862f" },
  { key: "europa", f: 1.48, r: 11, speed: 0.3, phase: 3.9, hi: "#f0f3f6", lo: "#b9c4cc" },
  { key: "ganymede", f: 1.78, r: 16, speed: 0.21, phase: 5.4, hi: "#c0a98b", lo: "#77685a" },
  { key: "callisto", f: 2.12, r: 13, speed: 0.15, phase: 0.3, hi: "#8d7f72", lo: "#4a423b" },
];
let orbitScale = 1;

function layoutSystem() {
  const j = jupiterWorld();
  orbitScale = Math.min(1, (j.x - 60) / (MOONS[3].f * j.r));
}

function moonAt(m, t) {
  const j = jupiterWorld();
  const a = m.phase + t * m.speed;
  const rx = m.f * j.r * orbitScale;
  return { x: j.x + Math.cos(a) * rx, y: j.y + Math.sin(a) * rx * SQUASH };
}

const LIT_ANGLE = Math.PI * 1.25;

function drawJupiterShadow() {
  const j = jupiterWorld();
  const lx = j.x + Math.cos(LIT_ANGLE) * j.r * 0.9;
  const ly = j.y + Math.sin(LIT_ANGLE) * j.r * 0.9;
  ctx.save();
  ctx.beginPath();
  ctx.arc(j.x, j.y, j.r + 0.5, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(lx, ly, j.r * 0.1, lx, ly, j.r * 1.75);
  g.addColorStop(0, "rgba(4,7,14,0.05)");
  g.addColorStop(0.35, "rgba(4,7,14,0.22)");
  g.addColorStop(0.62, "rgba(4,7,14,0.6)");
  g.addColorStop(1, "rgba(4,7,14,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(j.x - j.r, j.y - j.r, j.r * 2, j.r * 2);
  ctx.restore();
}

const STREAKS = [
  { lat: -0.55, w: 0.05, speed: 0.09, len: 0.5, a: 0.14, colour: "244,236,214" },
  { lat: -0.28, w: 0.07, speed: -0.055, len: 0.62, a: 0.16, colour: "196,141,88" },
  { lat: -0.06, w: 0.05, speed: 0.075, len: 0.55, a: 0.13, colour: "241,229,205" },
  { lat: 0.2, w: 0.06, speed: -0.045, len: 0.6, a: 0.15, colour: "186,120,72" },
  { lat: 0.62, w: 0.05, speed: 0.06, len: 0.45, a: 0.12, colour: "232,215,185" },
];
function drawBands(t) {
  const j = jupiterWorld();
  const tt = reduced ? 0 : t;
  ctx.save();
  ctx.beginPath();
  ctx.arc(j.x, j.y, j.r - 1, 0, Math.PI * 2);
  ctx.clip();
  for (const s of STREAKS) {
    const band = Math.sqrt(Math.max(0.05, 1 - s.lat * s.lat));
    const lam0 = (tt * s.speed * Math.PI * 2) % (Math.PI * 2);
    for (const off of [0, Math.PI]) {
      const lam = lam0 + off;
      const x0 = Math.sin(lam) * band;
      if (Math.cos(lam) < -0.1) continue;
      ctx.strokeStyle = `rgba(${s.colour},${s.a})`;
      ctx.lineWidth = j.r * s.w;
      ctx.lineCap = "round";
      ctx.beginPath();
      const half = (s.len / 2) * band;
      ctx.moveTo(j.x + (x0 - half) * j.r, j.y + s.lat * j.r);
      ctx.lineTo(j.x + (x0 + half) * j.r, j.y + s.lat * j.r);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGRS(t) {
  const j = jupiterWorld();
  const lat = 0.38;
  const band = Math.sqrt(1 - lat * lat);
  const lam = reduced ? 0.5 : 0.5 + t * 0.045;
  const wrapped = ((lam + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (Math.cos(wrapped) < 0.12) return;
  const fs = Math.max(0.2, Math.cos(wrapped));
  const gx = j.x + Math.sin(wrapped) * band * j.r;
  const gy = j.y + lat * j.r;
  const selfRot = reduced ? 0 : t * 0.18;
  ctx.save();
  ctx.beginPath();
  ctx.arc(j.x, j.y, j.r - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(gx, gy);
  ctx.rotate(-0.12);
  ctx.scale(fs, 1);
  for (const [rr, colr, alpha] of [
    [0.115, "188,84,58", 0.5],
    [0.082, "204,102,70", 0.55],
    [0.05, "222,128,92", 0.6],
  ]) {
    ctx.strokeStyle = `rgba(${colr},${alpha})`;
    ctx.lineWidth = j.r * 0.012;
    ctx.beginPath();
    ctx.ellipse(0, 0, j.r * rr, j.r * rr * 0.62, selfRot, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/* The aurorae react to the player: at 66% radiation they pulse faster. */
function drawAurorae(t) {
  const j = jupiterWorld();
  const rate = !reduced && radLevel >= 2 ? 2.2 : 0.8;
  const pulse = reduced ? 0.5 : 0.5 + 0.35 * Math.sin(t * rate);
  for (const pole of [-1, 1]) {
    const py = j.y + pole * j.r * 0.93;
    ctx.strokeStyle = `rgba(150,200,255,${(0.1 + 0.1 * pulse).toFixed(3)})`;
    ctx.lineWidth = j.r * 0.02;
    ctx.beginPath();
    ctx.ellipse(j.x, py, j.r * 0.34, j.r * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBeltArcs() {
  const j = jupiterWorld();
  for (const [i, mid] of [1.1, 1.27].entries()) {
    ctx.strokeStyle = `rgba(232,162,75,${i === 0 ? 0.1 : 0.07})`;
    ctx.lineWidth = j.r * 0.055;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.ellipse(j.x, j.y, mid * j.r, mid * j.r * SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawOrbitsAndMoons(t) {
  const j = jupiterWorld();
  for (const m of MOONS) {
    const rx = m.f * j.r * orbitScale;
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(j.x, j.y, rx, rx * SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const m of MOONS) {
    const p = moonAt(m, t);
    const g = ctx.createRadialGradient(
      p.x - m.r * 0.35,
      p.y - m.r * 0.35,
      m.r * 0.15,
      p.x,
      p.y,
      m.r * 1.05,
    );
    g.addColorStop(0, m.hi);
    g.addColorStop(1, m.lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (m.key === "io") {
      ctx.strokeStyle = "rgba(232,208,106,0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x + m.r * 0.5, p.y - m.r * 0.8);
      ctx.quadraticCurveTo(p.x + m.r * 1.3, p.y - m.r * 1.9, p.x + m.r * 2.0, p.y - m.r * 1.5);
      ctx.stroke();
    } else if (m.key === "europa") {
      ctx.strokeStyle = "rgba(150,120,110,0.5)";
      ctx.lineWidth = 0.7;
      for (const [a0, a1] of [
        [-0.6, 0.4],
        [2.2, 3.4],
        [1.1, 1.9],
      ]) {
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a0) * m.r * 0.8, p.y + Math.sin(a0) * m.r * 0.8);
        ctx.lineTo(p.x + Math.cos(a1) * m.r * 0.7, p.y + Math.sin(a1) * m.r * 0.7);
        ctx.stroke();
      }
    } else if (m.key === "ganymede") {
      ctx.fillStyle = "rgba(60,52,44,0.35)";
      ctx.beginPath();
      ctx.arc(p.x - m.r * 0.3, p.y + m.r * 0.15, m.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.key === "callisto") {
      ctx.fillStyle = "rgba(235,228,220,0.25)";
      for (const [ox, oy, r] of [
        [-0.35, -0.3, 0.22],
        [0.3, 0.1, 0.16],
        [-0.05, 0.45, 0.13],
      ]) {
        ctx.beginPath();
        ctx.arc(p.x + ox * m.r, p.y + oy * m.r, r * m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/* ── Board data ─────────────────────────────────────────── */
const TIERS = [
  { upTo: 3, n: 9, mines: 10, time: 120 },
  { upTo: 7, n: 12, mines: 22, time: 150 },
  { upTo: 12, n: 14, mines: 34, time: 165 },
  { upTo: Infinity, n: 16, mines: 48, time: 180 },
];
const tierFor = (b) => TIERS.find((t) => b <= t.upTo);

let boardNum = 1;
let N = 9;
let mineCount = 10;
let cells = []; // { mine, revealed, flagged, count, revealAt, dissolveAt, pocketHit }
let minesPlaced = false;
let radLevel = 0; // 0, 1 (33%), 2 (66%); third hit ends the run
let timeLeft = 120;
let roundTotal = 120;
let flags = 0;
let revealedSafe = 0;
let boardHadHit = false;
let phase = "intro"; // intro | play | clearing | beat | over
let score = 0,
  best = 0,
  gameOver = false,
  scoreSubmitted = false,
  paused = false;
let simT = 0;
let boardsCleared = 0;
const shocks = []; // interference shockwaves
let probeFall = null; // { t } — the probe falling into Jupiter on game over
let boardDrawnAt = 0;

// touch pan/zoom state, so the 16x16 board stays tappable at 375px
let gridZoom = 1;
let gridPanX = 0;
let gridPanY = 0;

const el = {
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  boardVal: document.getElementById("boardVal"),
  pocketsVal: document.getElementById("pocketsVal"),
  radFill: document.getElementById("radFill"),
  timeVal: document.getElementById("timeVal"),
  status: document.getElementById("status"),
  intro: document.getElementById("intro"),
  introKeys: document.getElementById("introKeys"),
  introTouch: document.getElementById("introTouch"),
  pause: document.getElementById("pause"),
  resumeBtn: document.getElementById("resumeBtn"),
  over: document.getElementById("gameOver"),
  overTitle: document.getElementById("gameOverTitle"),
  overRestart: document.getElementById("gameOverRestart"),
  finalScore: document.getElementById("finalScore"),
  finalBoards: document.getElementById("finalBoards"),
  finalBest: document.getElementById("finalBest"),
  bestMarker: document.getElementById("bestMarker"),
};

fetchGlobalBest("galileo").then((b) => {
  best = Math.max(best, b);
  el.best.textContent = best;
});

function gridGeom() {
  const availW = BASE_W - 36;
  const availH = BASE_H - 200;
  const size = Math.min(availW, availH);
  return { size, cell: size / N, x0: (BASE_W - size) / 2, y0: 92 + (availH - size) / 2 };
}

const idx = (c, r) => r * N + c;
function neighbours(i) {
  const c = i % N;
  const r = (i / N) | 0;
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nc = c + dc;
      const nr = r + dr;
      if (nc >= 0 && nc < N && nr >= 0 && nr < N) out.push(idx(nc, nr));
    }
  return out;
}

/* ── Generation: safe first click, no-guess boards ───────────
   The layout is created after the first click, with the clicked cell and
   its whole neighbourhood mine-free so it always cascades. Candidate
   layouts are then played by a deduction solver (the two classic rules
   plus constraint subtraction); only a layout the solver can finish
   without guessing is dealt. */
function candidateLayout(firstI) {
  const banned = new Set([firstI, ...neighbours(firstI)]);
  const spots = [];
  for (let i = 0; i < N * N; i++) if (!banned.has(i)) spots.push(i);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return new Set(spots.slice(0, mineCount));
}

function countsFor(mineSet) {
  const counts = new Array(N * N).fill(0);
  for (let i = 0; i < N * N; i++) {
    if (mineSet.has(i)) continue;
    counts[i] = neighbours(i).filter((n) => mineSet.has(n)).length;
  }
  return counts;
}

function solvableByDeduction(mineSet, firstI) {
  const counts = countsFor(mineSet);
  const revealed = new Set();
  const flagged = new Set();
  const openCascade = (start) => {
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (revealed.has(i) || mineSet.has(i)) continue;
      revealed.add(i);
      if (counts[i] === 0) for (const n of neighbours(i)) if (!revealed.has(n)) stack.push(n);
    }
  };
  openCascade(firstI);

  let changed = true;
  while (changed) {
    changed = false;
    const constraints = [];
    for (const i of revealed) {
      if (counts[i] === 0) continue;
      const hid = neighbours(i).filter((n) => !revealed.has(n) && !flagged.has(n));
      const m = counts[i] - neighbours(i).filter((n) => flagged.has(n)).length;
      if (hid.length) constraints.push({ hid, m });
    }
    for (const c of constraints) {
      if (c.m === c.hid.length) {
        for (const n of c.hid)
          if (!flagged.has(n)) {
            flagged.add(n);
            changed = true;
          }
      } else if (c.m === 0) {
        for (const n of c.hid)
          if (!revealed.has(n)) {
            openCascade(n);
            changed = true;
          }
      }
    }
    if (changed) continue;
    // subset rule: A ⊂ B lets B − A be decided
    for (let a = 0; a < constraints.length && !changed; a++) {
      for (let b = 0; b < constraints.length && !changed; b++) {
        if (a === b) continue;
        const A = constraints[a];
        const B = constraints[b];
        if (A.hid.length >= B.hid.length) continue;
        if (!A.hid.every((x) => B.hid.includes(x))) continue;
        const rest = B.hid.filter((x) => !A.hid.includes(x));
        const m = B.m - A.m;
        if (!rest.length) continue;
        if (m === 0) {
          for (const n of rest) openCascade(n);
          changed = true;
        } else if (m === rest.length) {
          for (const n of rest) flagged.add(n);
          changed = true;
        }
      }
    }
  }
  return revealed.size === N * N - mineSet.size;
}

function placeMines(firstI) {
  const t0 = performance.now();
  let layout = null;
  let attempts = 0;
  // Attempt budget bounded by wall-clock so the first click never hitches;
  // in practice a solvable layout lands within a handful of tries.
  while (performance.now() - t0 < 450 && attempts < 220) {
    attempts++;
    const cand = candidateLayout(firstI);
    if (solvableByDeduction(cand, firstI)) {
      layout = cand;
      break;
    }
    if (!layout) layout = cand;
  }
  const counts = countsFor(layout);
  cells.forEach((c, i) => {
    c.mine = layout.has(i);
    c.count = counts[i];
  });
  minesPlaced = true;
}

function buildBoard() {
  const t = tierFor(boardNum);
  N = t.n;
  mineCount = t.mines;
  cells = Array.from({ length: N * N }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
    revealAt: 0,
    dissolveAt: 0,
    pocketHit: false,
  }));
  minesPlaced = false;
  radLevel = 0;
  boardHadHit = false;
  flags = 0;
  revealedSafe = 0;
  gridZoom = 1;
  gridPanX = 0;
  gridPanY = 0;
  boardDrawnAt = performance.now();
  updateHud();
}

function updateHud() {
  el.boardVal.textContent = boardNum;
  el.pocketsVal.textContent = Math.max(0, mineCount - flags);
  el.timeVal.textContent = Math.max(0, Math.ceil(timeLeft));
  const pct = radLevel === 0 ? 0 : radLevel === 1 ? 33 : 66;
  el.radFill.style.width = pct + "%";
  el.radFill.style.background = radLevel === 0 ? "#e8a24b" : radLevel === 1 ? "#e8896a" : "#e05545";
  el.status.classList.toggle("critical", radLevel >= 2);
}

function reset() {
  score = 0;
  boardNum = 1;
  boardsCleared = 0;
  gameOver = false;
  scoreSubmitted = false;
  probeFall = null;
  shocks.length = 0;
  roundTotal = tierFor(1).time;
  timeLeft = roundTotal;
  el.score.textContent = "0";
  el.over.classList.remove("show");
  buildBoard();
  phase = introHidden ? "play" : "intro";
}

function endGame(title) {
  gameOver = true;
  phase = "over";
  // every remaining pocket shows itself
  for (const c of cells) if (c.mine) c.revealed = true;
  if (score > best) {
    best = score;
    el.best.textContent = best;
  }
  el.overTitle.textContent = title;
  el.finalScore.textContent = score;
  el.finalBoards.textContent = boardsCleared;
  el.finalBest.textContent = best;
  el.bestMarker.classList.toggle("show", score >= best && score > 0);
  const delay = probeFall && !reduced ? 1500 : 500;
  setTimeout(() => {
    el.over.classList.add("show");
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({ gameKey: "galileo", gameLabel: "Galileo", score, ask: true });
      }, 60);
    }
  }, delay);
}

/* ── Reveal mechanics ───────────────────────────────────── */
function cascadeFrom(i, now) {
  // BFS so the ripple opens outward from the click over ~250ms.
  const queue = [[i, 0]];
  const seen = new Set([i]);
  let maxD = 0;
  while (queue.length) {
    const [ci, d] = queue.shift();
    const c = cells[ci];
    if (c.revealed || c.flagged || c.mine) continue;
    c.revealed = true;
    c.revealAt = reduced ? now : now + d * 34;
    maxD = Math.max(maxD, d);
    revealedSafe++;
    score += 10;
    if (c.count === 0) {
      for (const n of neighbours(ci))
        if (!seen.has(n)) {
          seen.add(n);
          queue.push([n, d + 1]);
        }
    }
  }
  el.score.textContent = score;
  return maxD;
}

function hitPocket(i, now) {
  const c = cells[i];
  c.revealed = true; // permanently — the information is not lost
  c.pocketHit = true;
  c.revealAt = now;
  boardHadHit = true;
  radLevel++;
  if (!reduced) {
    const g = gridGeom();
    shocks.push({ x: g.x0 + ((i % N) + 0.5) * g.cell, y: g.y0 + (((i / N) | 0) + 0.5) * g.cell, t: 0 });
  }
  if (radLevel >= 3) {
    probeFall = reduced ? null : { t: 0 };
    endGame("PROBE LOST");
  }
  updateHud();
}

function revealCell(i) {
  if (phase !== "play") return;
  const now = performance.now();
  const c = cells[i];
  if (c.revealed || c.flagged) return;
  if (!minesPlaced) placeMines(i);
  if (c.mine) {
    hitPocket(i, now);
    return;
  }
  cascadeFrom(i, now);
  checkBoardClear();
}

function toggleFlag(i) {
  if (phase !== "play") return;
  const c = cells[i];
  if (c.revealed) return;
  c.flagged = !c.flagged;
  flags += c.flagged ? 1 : -1;
  updateHud();
}

function chord(i) {
  if (phase !== "play" || !minesPlaced) return;
  const c = cells[i];
  if (!c.revealed || c.count === 0) return;
  const ns = neighbours(i);
  const flaggedN = ns.filter((n) => cells[n].flagged).length;
  if (flaggedN !== c.count) return;
  const now = performance.now();
  for (const n of ns) {
    const nc = cells[n];
    if (nc.revealed || nc.flagged) continue;
    if (nc.mine) {
      hitPocket(n, now);
      if (gameOver) return;
    } else {
      cascadeFrom(n, now);
    }
  }
  checkBoardClear();
}

function checkBoardClear() {
  if (gameOver) return;
  if (revealedSafe < N * N - mineCount) return;
  // board cleared
  let bonus = 200 + boardNum * 50;
  if (!boardHadHit) bonus *= 2; // clean sweeps are where the points are
  score += bonus + Math.floor(Math.max(0, timeLeft)) * 5;
  el.score.textContent = score;
  boardsCleared = boardNum;
  phase = "clearing";
  const now = performance.now();
  const g = gridGeom();
  const cx = g.x0 + g.size / 2;
  const cy = g.y0 + g.size / 2;
  for (let i = 0; i < cells.length; i++) {
    const x = g.x0 + ((i % N) + 0.5) * g.cell;
    const y = g.y0 + (((i / N) | 0) + 0.5) * g.cell;
    cells[i].dissolveAt = reduced ? now : now + (Math.hypot(x - cx, y - cy) / g.size) * 420;
  }
  const carry = Math.min(30, Math.max(0, timeLeft));
  setTimeout(
    () => {
      phase = "beat"; // Jupiter, fully visible, for a moment
      setTimeout(
        () => {
          boardNum++;
          roundTotal = tierFor(boardNum).time + carry;
          timeLeft = roundTotal;
          buildBoard();
          phase = "play";
        },
        reduced ? 150 : 600,
      );
    },
    reduced ? 200 : 700,
  );
  updateHud();
}

/* ── Input: click/flag/chord, tap/long-press/double-tap ────── */
let introHidden = false;
function hideIntro() {
  if (introHidden) return;
  introHidden = true;
  el.intro.style.opacity = "0";
  el.intro.style.transform = "translateY(-10px)";
  el.intro.style.pointerEvents = "none";
  el.status.classList.add("show");
  if (phase === "intro") phase = "play";
  updateHud();
}
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (canHover) el.introKeys.classList.add("show");
else el.introTouch.classList.add("show");

function cellAt(clientX, clientY) {
  const w = screenToWorld(clientX, clientY);
  const g = gridGeom();
  const cx = g.x0 + g.size / 2;
  const cy = g.y0 + g.size / 2;
  // invert the zoom/pan transform
  const gx = (w.x - cx - gridPanX) / gridZoom + cx;
  const gy = (w.y - cy - gridPanY) / gridZoom + cy;
  const c = Math.floor((gx - g.x0) / g.cell);
  const r = Math.floor((gy - g.y0) / g.cell);
  if (c < 0 || c >= N || r < 0 || r >= N) return -1;
  return idx(c, r);
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

if (canHover) {
  canvas.addEventListener("mousedown", (e) => {
    hideIntro();
    if (paused || gameOver) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0) return;
    // both buttons or middle: chord
    if (e.buttons === 3 || e.button === 1) {
      e.preventDefault();
      chord(i);
      return;
    }
    if (e.button === 2) toggleFlag(i);
    else if (e.button === 0) revealCell(i);
  });
} else {
  /* Touch: tap reveals, a long press flags (and never counts as a tap),
     double tap on a number chords, pinch zooms, drag pans when zoomed. */
  const LONG_MS = 450;
  const MOVE_TOL = 12;
  let touchState = null; // { x, y, i, timer, longFired, moved }
  let lastTap = { i: -1, at: 0 };
  let pinch = null;

  canvas.addEventListener(
    "touchstart",
    (e) => {
      hideIntro();
      if (paused || gameOver) return;
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        pinch = {
          d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          zoom: gridZoom,
        };
        if (touchState) {
          clearTimeout(touchState.timer);
          touchState = null;
        }
        return;
      }
      const t = e.touches[0];
      const i = cellAt(t.clientX, t.clientY);
      touchState = {
        x: t.clientX,
        y: t.clientY,
        i,
        longFired: false,
        moved: false,
        panStartX: gridPanX,
        panStartY: gridPanY,
        timer: setTimeout(() => {
          if (touchState && !touchState.moved && touchState.i >= 0) {
            touchState.longFired = true;
            toggleFlag(touchState.i);
          }
        }, LONG_MS),
      };
    },
    { passive: true },
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        gridZoom = Math.max(1, Math.min(2.6, (pinch.zoom * d) / pinch.d));
        clampPan();
        return;
      }
      if (!touchState) return;
      const t = e.touches[0];
      const dx = t.clientX - touchState.x;
      const dy = t.clientY - touchState.y;
      if (!touchState.moved && Math.hypot(dx, dy) > MOVE_TOL) {
        touchState.moved = true;
        clearTimeout(touchState.timer);
      }
      if (touchState.moved && gridZoom > 1) {
        e.preventDefault();
        gridPanX = touchState.panStartX + dx / viewScale;
        gridPanY = touchState.panStartY + dy / viewScale;
        clampPan();
      }
    },
    { passive: false },
  );

  const endTouch = () => {
    if (pinch) pinch = null;
    if (!touchState) return;
    clearTimeout(touchState.timer);
    const { i, longFired, moved } = touchState;
    touchState = null;
    if (longFired || moved || i < 0) return; // a long press is never a tap
    const now = performance.now();
    if (lastTap.i === i && now - lastTap.at < 320 && cells[i]?.revealed) {
      chord(i);
      lastTap = { i: -1, at: 0 };
      return;
    }
    lastTap = { i, at: now };
    revealCell(i);
  };
  canvas.addEventListener("touchend", endTouch);
  canvas.addEventListener("touchcancel", () => {
    if (touchState) clearTimeout(touchState.timer);
    touchState = null;
    pinch = null;
  });
}

function clampPan() {
  const g = gridGeom();
  const over = (g.size * (gridZoom - 1)) / 2;
  gridPanX = Math.max(-over, Math.min(over, gridPanX));
  gridPanY = Math.max(-over, Math.min(over, gridPanY));
}

/* ── Auto-pause: tab switch or window blur pauses; nothing resumes on
   its own. There is no manual pause. ── */
function autoPause() {
  if (paused || gameOver || phase === "intro") return;
  paused = true;
  document.body.classList.add("is-paused");
  el.pause.classList.add("show");
}
addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});
el.resumeBtn.addEventListener("click", () => {
  paused = false;
  document.body.classList.remove("is-paused");
  el.pause.classList.remove("show");
});

addEventListener("keydown", (e) => {
  if (gameOver && e.code === "KeyR") reset();
});
el.overRestart.addEventListener("click", reset);
el.overRestart.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    reset();
  },
  { passive: false },
);

/* ── Drawing the survey grid ────────────────────────────── */
const ACCENT = "232,162,75";

function drawGrid(now) {
  if (phase === "beat" || phase === "over" || phase === "intro") {
    if (phase !== "over") return;
  }
  const g = gridGeom();
  const cx = g.x0 + g.size / 2;
  const cy = g.y0 + g.size / 2;

  ctx.save();
  ctx.translate(cx + gridPanX, cy + gridPanY);
  ctx.scale(gridZoom, gridZoom);
  ctx.translate(-cx, -cy);

  // radiation tint over the survey area
  if (radLevel > 0 && phase === "play") {
    ctx.fillStyle = `rgba(224,85,69,${radLevel === 1 ? 0.05 : 0.11})`;
    ctx.fillRect(g.x0 - 8, g.y0 - 8, g.size + 16, g.size + 16);
  }

  const boardAge = now - boardDrawnAt;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const col = i % N;
    const row = (i / N) | 0;
    const x = g.x0 + col * g.cell;
    const y = g.y0 + row * g.cell;
    const pad = Math.max(1, g.cell * 0.045);

    // the next grid draws itself in with a small stagger
    let drawIn = 1;
    if (!reduced && boardAge < 500) drawIn = Math.max(0, Math.min(1, (boardAge - (col + row) * 9) / 160));
    if (drawIn <= 0) continue;

    // board-clear dissolve, outward from the centre
    let dissolve = 1;
    if (c.dissolveAt) {
      dissolve = 1 - Math.max(0, Math.min(1, (now - c.dissolveAt) / 260));
      if (dissolve <= 0) continue;
    }

    let alpha = drawIn * dissolve;
    let stroke = 0.3;
    let fill = 0;
    if (c.revealed) {
      const p = reduced ? 1 : Math.max(0, Math.min(1, (now - c.revealAt) / 160));
      if (p <= 0) {
        stroke = 0.3;
      } else {
        // revealed cells step back so Jupiter shows through
        stroke = 0.3 - 0.22 * p;
        fill = 0;
      }
    } else {
      fill = 0.1; // hidden cells carry a faint pane
    }

    if (radLevel >= 2 && !reduced && phase === "play") {
      // the grid edges flicker at 66%
      stroke += 0.1 * Math.max(0, Math.sin(now * 0.02 + i * 1.7));
    }

    if (fill > 0) {
      ctx.fillStyle = `rgba(16,22,38,${(fill * alpha).toFixed(3)})`;
      ctx.fillRect(x + pad, y + pad, g.cell - pad * 2, g.cell - pad * 2);
    }
    ctx.strokeStyle = `rgba(255,255,255,${(stroke * alpha).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + pad, y + pad, g.cell - pad * 2, g.cell - pad * 2);

    if (c.flagged) {
      const s = g.cell * 0.16;
      ctx.fillStyle = `rgba(${ACCENT},${(0.9 * alpha).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(x + g.cell / 2, y + g.cell / 2 - s);
      ctx.lineTo(x + g.cell / 2 + s, y + g.cell / 2);
      ctx.lineTo(x + g.cell / 2, y + g.cell / 2 + s);
      ctx.lineTo(x + g.cell / 2 - s, y + g.cell / 2);
      ctx.closePath();
      ctx.fill();
    }

    if (c.revealed && c.pocketHit) {
      const p = reduced ? 1 : Math.max(0, Math.min(1, (now - c.revealAt) / 300));
      const flare = 1 - p;
      ctx.fillStyle = `rgba(224,85,69,${(0.25 + flare * 0.55) * alpha})`;
      ctx.fillRect(x + pad, y + pad, g.cell - pad * 2, g.cell - pad * 2);
      ctx.strokeStyle = `rgba(224,85,69,${(0.9 * alpha).toFixed(2)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x + g.cell / 2, y + g.cell / 2, g.cell * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + g.cell / 2, y + g.cell / 2, g.cell * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224,85,69,${(0.95 * alpha).toFixed(2)})`;
      ctx.fill();
    } else if (c.revealed && c.count > 0) {
      const p = reduced ? 1 : Math.max(0, Math.min(1, (now - c.revealAt) / 160));
      // brightness rises with the count: a 1 murmurs, an 8 alarms
      const bright = 0.4 + (c.count / 8) * 0.6;
      ctx.fillStyle = `rgba(${ACCENT},${(bright * p * alpha).toFixed(3)})`;
      ctx.font = `${Math.round(g.cell * 0.42)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(c.count), x + g.cell / 2, y + g.cell / 2 + 1);
    }

    if (gameOver && c.mine && !c.pocketHit) {
      // every remaining pocket, revealed on the darkened grid
      ctx.strokeStyle = `rgba(224,85,69,${(0.7 * alpha).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x + g.cell / 2, y + g.cell / 2, g.cell * 0.17, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // interference shockwaves from revealed pockets
  for (let s = shocks.length - 1; s >= 0; s--) {
    const sh = shocks[s];
    sh.t += 0.016;
    if (sh.t > 0.8) {
      shocks.splice(s, 1);
      continue;
    }
    const rr = sh.t * g.size * 1.1;
    ctx.strokeStyle = `rgba(224,85,69,${(0.5 * (1 - sh.t / 0.8)).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(4,7,14,0.45)";
    ctx.fillRect(g.x0 - 8, g.y0 - 8, g.size + 16, g.size + 16);
  }

  ctx.restore();
}

function drawProbeFall(dt) {
  if (!probeFall) return;
  probeFall.t += dt;
  const p = Math.min(1, probeFall.t / 1.4);
  const j = jupiterWorld();
  const g = gridGeom();
  const sx = g.x0 + g.size / 2;
  const sy = g.y0 + g.size / 2;
  const x = sx + (j.x - sx) * p;
  const y = sy + (j.y - sy) * p + Math.sin(p * Math.PI) * -60;
  const scale = 1 - p * 0.75;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p * 5);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#e6eef8";
  ctx.fillStyle = "rgba(20,28,44,0.9)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4.5);
  ctx.lineTo(-5, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (p >= 1) probeFall = null;
}

/* ── The loop ──────────────────────────────────────────── */
let last = 0;
let backdropPainted = false;

function step(ts) {
  if (!last) last = ts;
  const dt = Math.min(33, ts - last) * 0.001;
  last = ts;

  if (!paused && !gameOver) {
    simT += dt;
    if (phase === "play" && minesPlacedOrRunning()) {
      // at 66% radiation the clock runs 20% faster for the rest of the board
      timeLeft -= dt * (radLevel >= 2 ? 1.2 : 1);
      el.timeVal.textContent = Math.max(0, Math.ceil(timeLeft));
      if (timeLeft <= 0) endGame("OUT OF TIME");
    }
  }

  if (backdrop && (!reduced || !backdropPainted)) {
    backdrop.tick(ts);
    backdropPainted = true;
  }
  draw(dt, performance.now());
  requestAnimationFrame(step);
}

/* The clock only runs once the board is live — after the intro, and it
   keeps running between the first click and the layout (placeMines is
   synchronous, so there is no gap). */
function minesPlacedOrRunning() {
  return introHidden;
}

function draw(dt, now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.scale(viewScale, viewScale);

  drawBands(simT);
  drawGRS(simT);
  drawJupiterShadow();
  drawAurorae(simT);
  drawBeltArcs();
  drawOrbitsAndMoons(simT);
  drawGrid(now);
  drawProbeFall(paused ? 0 : dt);

  ctx.restore();
}

resize();
layoutSystem();
addEventListener("resize", layoutSystem, { passive: true });
reset();
requestAnimationFrame(step);
