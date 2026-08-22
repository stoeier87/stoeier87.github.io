/* DIAMOND RAIN — the field descends over Neptune.
 *
 * A rebuild of the old static-brick breaker into a descending-field game:
 * closer to invaders than to breakout. Canvas contract follows the
 * iss-docking/ice-fall variant — viewScale 1, BASE_W/BASE_H track the
 * viewport, no letterbox — because the playfield is the page and has to
 * dodge DOM overlays sized in CSS pixels. DPR cap, setTransform after every
 * resize, screenToWorld, clamped dt: all unchanged and load-bearing.
 */

import { definePlanetField } from "../../shared/elements/planet-field.ts";
import { color } from "../../tokens.ts";
import { submitScoreOnGameOver, fetchGlobalBest } from "../shared/score-submit.js";

definePlanetField();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

/* Playfield geometry. The field spans most of the width; the floor line
   sits above the status panel, the probe just above the floor. */
let fieldX = 0,
  fieldW = 0,
  fieldTop = 0,
  floorY = 0,
  probeY = 0,
  blockW = 24,
  blockH = 16;

const COLS = 12;
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

  const topInset = isNarrow() ? 128 : 78;
  const bottomInset = isNarrow() ? 150 : 138;
  fieldW = Math.min(W - (isNarrow() ? 20 : 48), 640);
  fieldX = Math.round((W - fieldW) / 2);
  fieldTop = topInset;
  floorY = H - bottomInset;
  probeY = floorY - 26;
  blockW = fieldW / COLS;
  blockH = Math.max(13, Math.min(20, blockW * 0.62));
  layoutBackdrop();
}
addEventListener("resize", resize, { passive: true });

function screenToWorld(clientX, clientY) {
  return { x: (clientX - viewOffX) / viewScale, y: (clientY - viewOffY) / viewScale };
}

/* ── The setting: Neptune and Triton ──────────────────────
   Real PlanetBody instances in <st-planet-field>; specs are mutated in
   place, never reassigned. The 2D layer paints what the shared element
   cannot: the terminator, the storm oval, the fast cloud streaks, the
   faint incomplete rings, and Triton's geysers. */
const backdrop = document.getElementById("bg");

const neptuneSpec = {
  name: "NEPTUN",
  r: 0.72,
  s0: 0.48,
  px: 0.84,
  pf: 1,
  hi: color.planet.neptunHi,
  lo: color.planet.neptunLo,
  bands: true,
  spin: 0.02,
  depth: -260,
};
const tritonSpec = {
  name: "TRITON",
  r: 0.045,
  s0: -0.32,
  px: 0.14,
  pf: 1,
  hi: "#cfd8dc",
  lo: "#78868e",
  spin: -0.01, // retrograde: it visibly turns against everything else
  depth: -40,
};

function layoutBackdrop() {
  const portrait = H >= W;
  neptuneSpec.r = portrait ? 0.66 : 0.82;
  neptuneSpec.px = portrait ? 0.84 : 0.87;
  neptuneSpec.s0 = portrait ? 0.5 : 0.52;
}

if (backdrop) {
  backdrop.starLayers = [
    { count: 110, radius: 1.2, alpha: 0.85, parallax: 0.08 },
    { count: 80, radius: 0.8, alpha: 0.5, parallax: 0.03 },
  ];
  backdrop.planets = [tritonSpec, neptuneSpec];
}

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

const LIT_ANGLE = Math.PI * 1.25;

/* Terminator + luminance cap, same technique as the Pluto build: the night
   side painted back on over the shared element's generous light. */
function drawNeptuneShadow() {
  const p = planetScreen(neptuneSpec);
  const lx = p.x + Math.cos(LIT_ANGLE) * p.r * 0.9;
  const ly = p.y + Math.sin(LIT_ANGLE) * p.r * 0.9;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 0.5, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(lx, ly, p.r * 0.08, lx, ly, p.r * 1.55);
  g.addColorStop(0, "rgba(4,7,14,0.14)");
  g.addColorStop(0.2, "rgba(4,7,14,0.42)");
  g.addColorStop(0.42, "rgba(4,7,14,0.8)");
  g.addColorStop(1, "rgba(4,7,14,0.96)");
  ctx.fillStyle = g;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.restore();
}

/* The storm oval: drifting slowly along its band, elongating and
   contracting over minutes. Clipped to the disc. */
function drawStorm(now) {
  const p = planetScreen(neptuneSpec);
  const t = now * 0.001;
  const drift = reduced ? 0 : Math.sin(t * 0.008 + 1) * p.r * 0.22;
  const breathe = reduced ? 1 : 1 + Math.sin(t * 0.02) * 0.25;
  const sx = p.x - p.r * 0.34 + drift;
  const sy = p.y - p.r * 0.42;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(10,18,44,0.55)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, p.r * 0.13 * stormScale * breathe, p.r * 0.065 * stormScale, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
let stormScale = 1; // contracts during game over

/* White methane streaks, moving visibly faster than the bands beneath —
   Neptune's winds are the fastest in the solar system and that should be
   legible without a label. */
const streaks = Array.from({ length: 5 }, (_, i) => ({
  band: -0.5 + i * 0.22,
  phase: i * 1.7,
  len: 0.32 + (i % 3) * 0.12,
  speed: 0.05 + (i % 2) * 0.025,
}));
function drawStreaks(now) {
  const p = planetScreen(neptuneSpec);
  const t = now * 0.001;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineCap = "round";
  for (const s of streaks) {
    const u = reduced ? s.phase : (s.phase + t * s.speed) % 2;
    const cx = p.x + (u - 1) * p.r * 1.6;
    const cy = p.y + s.band * p.r;
    const half = p.r * s.len * 0.5;
    const g = ctx.createLinearGradient(cx - half, cy, cx + half, cy);
    g.addColorStop(0, "rgba(235,244,255,0)");
    g.addColorStop(0.5, "rgba(235,244,255,0.34)");
    g.addColorStop(1, "rgba(235,244,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1.6, p.r * 0.014);
    ctx.beginPath();
    ctx.moveTo(cx - half, cy);
    ctx.quadraticCurveTo(cx, cy - p.r * 0.02, cx + half, cy);
    ctx.stroke();
  }
  ctx.restore();
}

/* The rings: very faint, thin, incomplete — two denser arcs. */
function drawRings() {
  const p = planetScreen(neptuneSpec);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-0.42);
  ctx.scale(1, 0.24);
  const arcs = [
    { r: p.r * 1.32, a0: -2.4, a1: 0.6, alpha: 0.1 },
    { r: p.r * 1.32, a0: 0.9, a1: 1.6, alpha: 0.22 },
    { r: p.r * 1.48, a0: -1.8, a1: 1.1, alpha: 0.08 },
    { r: p.r * 1.48, a0: 1.4, a1: 1.9, alpha: 0.18 },
  ];
  for (const a of arcs) {
    ctx.strokeStyle = `rgba(190,210,240,${a.alpha})`;
    ctx.lineWidth = Math.max(1, p.r * 0.012);
    ctx.beginPath();
    ctx.arc(0, 0, a.r, a.a0, a.a1);
    ctx.stroke();
  }
  ctx.restore();
}

/* Triton's occasional nitrogen geyser: a thin plume rising and drifting
   sideways. */
let geyser = null;
let nextGeyserAt = 20000 + Math.random() * 20000;
function drawGeyser(now) {
  if (reduced) return;
  if (!geyser && now > nextGeyserAt) {
    geyser = { born: now, life: 7000 };
    nextGeyserAt = now + 30000 + Math.random() * 25000;
  }
  if (!geyser) return;
  const t = (now - geyser.born) / geyser.life;
  if (t >= 1) {
    geyser = null;
    return;
  }
  const p = planetScreen(tritonSpec);
  const rise = Math.min(1, t * 2.5) * p.r * 2.2;
  const fade = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
  const drift = t * p.r * 1.4;
  ctx.save();
  ctx.strokeStyle = `rgba(210,228,240,${(0.34 * fade).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.4, p.r * 0.1);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - p.r * 0.6);
  ctx.quadraticCurveTo(p.x + drift * 0.3, p.y - p.r * 0.6 - rise * 0.7, p.x + drift, p.y - p.r * 0.6 - rise);
  ctx.stroke();
  ctx.restore();
}

/* Triton brightens while TRITON PULL holds. */
function drawTritonGlow() {
  if (pickupState.tritonUntil <= nowMs) return;
  const p = planetScreen(tritonSpec);
  const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.4, p.x, p.y, p.r * 3);
  g.addColorStop(0, "rgba(210,235,255,0.35)");
  g.addColorStop(1, "rgba(210,235,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
  ctx.fill();
}

/* ── Difficulty ────────────────────────────────────────────
   Depth increases every 90 seconds and on every full clear of the visible
   field. The descent step interval is the primary tuning lever. */
function descentStepMs(depth) {
  return Math.max(1200, 4500 * Math.pow(0.92, depth - 1));
}
function newRowMs(depth) {
  return Math.max(7000, 20000 * Math.pow(0.9, depth - 1));
}
function shardSpeed(depth) {
  return BASE_SHARD_SPEED * Math.min(2.5, 1 + (depth - 1) * 0.05);
}
const BASE_SHARD_SPEED = 340; // px/s
const DEPTH_MS = 90000;

/* Block types. Colour-blind separation leans on lightness, same method as
   the Pluto build: methane pale (L*~85), water near-white (L*~95), ammonia
   mid violet (L*~55), core rock dark (L*~30). */
const BLOCK = {
  METHANE: { hp: 1, color: "#bcd8ef" },
  WATER: { hp: 2, color: "#f4f7fb" },
  AMMONIA: { hp: 3, color: "#8a6fb8" },
  ROCK: { hp: Infinity, color: "#3a4148" },
};
function mixFor(depth) {
  const mix = [["METHANE", 1]];
  if (depth >= 2) mix.push(["WATER", 0.55]);
  if (depth >= 4) mix.push(["AMMONIA", 0.3]);
  if (depth >= 6) mix.push(["ROCK", 0.12]);
  return mix;
}
function rollType(depth) {
  const mix = mixFor(depth);
  const total = mix.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [t, w] of mix) {
    r -= w;
    if (r <= 0) return t;
  }
  return "METHANE";
}

/* ── State ─────────────────────────────────────────────── */
let blocks = []; // { col, row, type, hp, jx[4] corner jitter, seed }
let shards = []; // { x, y, vx, vy, rot, vr, held, diamondUntil }
let probe = { x: 0, w: 120, targetX: 0 };
let pickups = []; // at most one on screen
let pickupState = { tiltedUntil: 0, tritonUntil: 0, surgeUntil: 0 };
let particles = [];
const MAX_PARTICLES = 140;
const SHARD_CAP = () => (isNarrow() ? 6 : 8);

let score = 0;
let best = 0;
let depth = 1;
let lives = 3;
let destroyed = 0; // blocks destroyed, drives pickup drops
let nowMs = 0;

let started = false;
let paused = false;
let gameOver = false;
let scoreSubmitted = false;

let depthClock = 0;
let stepClock = 0;
let rowClock = 0;
let stepShake = 0;
let edgeDimUntil = 0;
let shearFlash = 0;
let overFall = 0; // game-over: field falls through the floor

const el = {
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  depth: document.getElementById("depthVal"),
  shards: document.getElementById("shardsVal"),
  lives: document.getElementById("livesVal"),
  descent: document.getElementById("descentFill"),
  status: document.getElementById("status"),
  intro: document.getElementById("intro"),
  introKeys: document.getElementById("introKeys"),
  introTouch: document.getElementById("introTouch"),
  pause: document.getElementById("pause"),
  resume: document.getElementById("resumeBtn"),
  over: document.getElementById("gameOver"),
  overRestart: document.getElementById("gameOverRestart"),
  finalScore: document.getElementById("finalScore"),
  finalDepth: document.getElementById("finalDepth"),
  finalBest: document.getElementById("finalBest"),
  bestMarker: document.getElementById("bestMarker"),
};

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (canHover) el.introKeys.classList.add("show");
else el.introTouch.classList.add("show");

fetchGlobalBest("neptune").then((b) => {
  best = Math.max(best, b);
  el.best.textContent = best;
});

/* ── Field helpers ─────────────────────────────────────── */
function jitterCorners(seed) {
  const r = (n) => {
    const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 0.16;
  };
  return [r(1), r(2), r(3), r(4), r(5), r(6), r(7), r(8)];
}

function spawnRow(atRow) {
  for (let c = 0; c < COLS; c++) {
    if (Math.random() < 0.14) continue; // holes keep the field playable
    const type = rollType(depth);
    blocks.push({ col: c, row: atRow, type, hp: BLOCK[type].hp, seed: Math.random() * 1000, jx: null });
  }
}

function blockRect(b) {
  return {
    x: fieldX + b.col * blockW + 1,
    y: fieldTop + b.row * blockH * 1.25 + 1,
    w: blockW - 2,
    h: blockH,
  };
}

function lowestRowY() {
  let maxRow = -1;
  for (const b of blocks) if (b.row > maxRow) maxRow = b.row;
  return maxRow < 0 ? fieldTop : fieldTop + (maxRow + 1) * blockH * 1.25;
}

function descentStep() {
  for (const b of blocks) {
    // Core rock does not ride the shared timer — the field deforms around
    // it. It steps on its own alternate beats.
    if (b.type === "ROCK") continue;
    b.row += 1;
  }
  rockBeat = !rockBeat;
  if (rockBeat) for (const b of blocks) if (b.type === "ROCK") b.row += 1;
  if (!reduced) {
    stepShake = 5;
  }
  // A block reaching the floor line ends the game immediately.
  if (lowestRowY() >= floorY) endGame();
}
let rockBeat = false;

/* ── The probe ─────────────────────────────────────────── */
function probeW() {
  return pickupState.surgeUntil > nowMs ? probe.w * 1.4 : probe.w;
}
function drawProbe(now) {
  const w = probeW();
  const x = probe.x;
  const y = probeY;
  const flat = pickupState.surgeUntil > nowMs;
  ctx.save();
  const dim = now < edgeDimUntil ? 0.55 : 1;
  ctx.globalAlpha = dim;
  ctx.strokeStyle = "rgba(240,246,255,0.92)";
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  // flattened wedge
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + 6);
  ctx.lineTo(x - w * 0.3, y - 4);
  ctx.lineTo(x + w * 0.3, y - 4);
  ctx.lineTo(x + w / 2, y + 6);
  ctx.closePath();
  ctx.stroke();
  // shield arc across the upper surface — flatter under STORM SURGE
  const arcH = flat ? 6 : 12;
  ctx.strokeStyle = "rgba(120,180,255,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 2);
  ctx.quadraticCurveTo(x, y - 2 - arcH, x + w / 2, y - 2);
  ctx.stroke();
  // shield flare at recent contact
  if (probeFlare.until > now) {
    const k = (probeFlare.until - now) / 220;
    ctx.strokeStyle = `rgba(180,220,255,${(0.9 * k).toFixed(2)})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(probeFlare.x - 14, y - 3);
    ctx.quadraticCurveTo(probeFlare.x, y - 3 - arcH, probeFlare.x + 14, y - 3);
    ctx.stroke();
  }
  // thrusters flare in the direction of travel
  const vx = probe.targetX - probe.x;
  if (!reduced && Math.abs(vx) > 1.5) {
    const dir = Math.sign(vx);
    ctx.strokeStyle = "rgba(120,170,255,0.7)";
    ctx.lineWidth = 2;
    for (const off of [-w * 0.22, w * 0.22]) {
      ctx.beginPath();
      ctx.moveTo(x + off, y + 7);
      ctx.lineTo(x + off - dir * (5 + Math.random() * 6), y + 11);
      ctx.stroke();
    }
  }
  ctx.restore();
}
let probeFlare = { x: 0, until: 0 };

/* ── The shard: an angular carbon crystal, tumbling, short trail, bright
   leading edge. */
function makeShard(x, y, held) {
  const sides = 4 + Math.floor(Math.random() * 3);
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const r = 5 + Math.random() * 3;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return {
    x, y, vx: 0, vy: 0, held: held === true,
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 8,
    pts, trail: [], diamondUntil: 0,
  };
}

function launchHeld() {
  let launched = false;
  for (const s of shards) {
    if (!s.held) continue;
    s.held = false;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const v = shardSpeed(depth);
    s.vx = Math.cos(a) * v;
    s.vy = Math.sin(a) * v;
    launched = true;
  }
  return launched;
}

function drawShard(s, now) {
  ctx.save();
  // very short trail
  if (!reduced && !s.held) {
    for (let i = 0; i < s.trail.length; i++) {
      const t = s.trail[i];
      ctx.globalAlpha = 0.14 * (i + 1) / s.trail.length;
      ctx.fillStyle = "#cfe4ff";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  const diamond = s.diamondUntil > now;
  ctx.beginPath();
  s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  if (diamond) {
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(30,40,60,0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(220,236,255,0.85)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // refraction: a bright edge on the leading face
    const lead = Math.atan2(s.vy, s.vx) - s.rot;
    let bi = 0, bd = 1e9;
    s.pts.forEach(([px, py], i) => {
      const d = Math.abs(Math.atan2(py, px) - lead);
      if (d < bd) { bd = d; bi = i; }
    });
    const a = s.pts[bi], b = s.pts[(bi + 1) % s.pts.length];
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Blocks: irregular quadrilaterals, faceted edges, fracture lines —
   the Pluto build's treatment, no two alike. */
function drawBlock(b) {
  const r = blockRect(b);
  if (!b.jx) b.jx = jitterCorners(b.seed);
  const j = b.jx;
  const q = [
    [r.x + j[0] * r.w, r.y + j[1] * r.h],
    [r.x + r.w + j[2] * r.w, r.y + j[3] * r.h],
    [r.x + r.w + j[4] * r.w, r.y + r.h + j[5] * r.h],
    [r.x + j[6] * r.w, r.y + r.h + j[7] * r.h],
  ];
  const base = BLOCK[b.type].color;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.clip();
  // facets: light top/left, dark bottom/right
  ctx.lineWidth = Math.max(1, r.h * 0.09);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(q[3][0], q[3][1]);
  ctx.lineTo(q[0][0], q[0][1]);
  ctx.lineTo(q[1][0], q[1][1]);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.moveTo(q[1][0], q[1][1]);
  ctx.lineTo(q[2][0], q[2][1]);
  ctx.lineTo(q[3][0], q[3][1]);
  ctx.stroke();
  // fracture lines; water ice cracks visibly after its first hit
  const n = b.type === "WATER" && b.hp === 1 ? 5 : 2 + Math.floor((b.seed * 7) % 2);
  ctx.strokeStyle = b.type === "ROCK" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.34)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < n; i++) {
    const a = ((b.seed * 13 + i * 5.3) % 3.1);
    const ox = r.x + r.w * (0.2 + ((b.seed * 3 + i * 2.7) % 0.6));
    const oy = r.y + r.h * (0.2 + ((b.seed * 5 + i * 1.9) % 0.6));
    const len = r.w * 0.3;
    ctx.beginPath();
    ctx.moveTo(ox - Math.cos(a) * len * 0.5, oy - Math.sin(a) * len * 0.5);
    ctx.lineTo(ox + Math.cos(a) * len * 0.5, oy + Math.sin(a) * len * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Pickups ───────────────────────────────────────────── */
const PICKUP_DEFS = {
  SHEAR: { label: "SHEAR", color: "#9fd0ff" },
  TILT: { label: "TILT", color: "#7ea0e0" },
  TRITON: { label: "TRITON", color: "#d2ecff" },
  SURGE: { label: "SURGE", color: "#6fa8dc" },
  DIAMOND: { label: "CORE", color: "#ffffff" },
};
function rollPickup() {
  // SHEAR and SURGE common, TILT uncommon, TRITON and DIAMOND rare —
  // and relief gets scarcer exactly when it is wanted most.
  const tritonW = Math.max(0.02, 0.08 - (depth - 1) * 0.008);
  const table = [
    ["SHEAR", 0.34], ["SURGE", 0.32], ["TILT", 0.18],
    ["TRITON", tritonW], ["DIAMOND", 0.08],
  ];
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [t, w] of table) { r -= w; if (r <= 0) return t; }
  return "SHEAR";
}

function maybeDropPickup(x, y) {
  if (pickups.length > 0) return; // never two on screen
  if (destroyed % 12 !== 0 || destroyed === 0) return;
  pickups.push({ type: rollPickup(), x, y, vy: 60 });
}

function applyPickup(type) {
  if (type === "SHEAR") {
    const cap = SHARD_CAP();
    const live = shards.filter((s) => !s.held);
    const room = Math.max(0, cap - shards.length);
    for (const s of live.slice(0, room)) {
      const twin = makeShard(s.x, s.y, false);
      const a = Math.atan2(s.vy, s.vx);
      const v = Math.hypot(s.vx, s.vy);
      twin.vx = Math.cos(a + 0.28) * v;
      twin.vy = Math.sin(a + 0.28) * v;
      s.vx = Math.cos(a - 0.28) * v;
      s.vy = Math.sin(a - 0.28) * v;
      shards.push(twin);
    }
    if (!reduced) shearFlash = 1;
  } else if (type === "TILT") {
    pickupState.tiltedUntil = nowMs + 8000;
  } else if (type === "TRITON") {
    for (const b of blocks) b.row = Math.max(0, b.row - 2);
    pickupState.tritonUntil = nowMs + 6000;
    stepClock = -6000 + stepClock; // pause the descent timer while it holds
  } else if (type === "SURGE") {
    pickupState.surgeUntil = nowMs + 12000;
  } else if (type === "DIAMOND") {
    const live = shards.filter((s) => !s.held);
    if (live.length) live[0].diamondUntil = nowMs + 5000;
  }
}

function drawPickup(p) {
  const def = PICKUP_DEFS[p.type];
  ctx.save();
  ctx.strokeStyle = def.color;
  ctx.fillStyle = "rgba(10,16,30,0.8)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = def.color;
  ctx.font = "600 6px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(def.label, p.x, p.y + 2);
  ctx.restore();
}

/* Densest remaining cluster, for TILTED FIELD's gentle curve. */
function densestClusterX() {
  if (!blocks.length) return W / 2;
  const counts = new Array(COLS).fill(0);
  for (const b of blocks) counts[b.col]++;
  let bi = 0;
  for (let i = 1; i < COLS; i++) if (counts[i] > counts[bi]) bi = i;
  return fieldX + (bi + 0.5) * blockW;
}

/* ── Particles (capped) ────────────────────────────────── */
function shatter(x, y, colr) {
  if (reduced) return;
  for (let i = 0; i < 7; i++) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 160,
      vy: -40 - Math.random() * 120,
      life: 500 + Math.random() * 300,
      born: nowMs, color: colr, s: 2 + Math.random() * 2.5,
    });
  }
}

/* ── Physics ───────────────────────────────────────────── */
function updateShards(dt) {
  const tiltActive = pickupState.tiltedUntil > nowMs;
  const tx = tiltActive ? densestClusterX() : 0;

  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    if (s.held) {
      s.x = probe.x;
      s.y = probeY - 12;
      continue;
    }
    if (tiltActive) {
      // curve gently toward the densest remaining cluster
      const pull = Math.sign(tx - s.x) * 90;
      s.vx += pull * dt;
      const v = Math.hypot(s.vx, s.vy), want = shardSpeed(depth);
      s.vx *= want / v;
      s.vy *= want / v;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.rot += s.vr * dt;
    if (!reduced) {
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 5) s.trail.shift();
    }

    // walls
    if (s.x < fieldX + 6 && s.vx < 0) s.vx = Math.abs(s.vx);
    if (s.x > fieldX + fieldW - 6 && s.vx > 0) s.vx = -Math.abs(s.vx);
    if (s.y < fieldTop - 20 && s.vy < 0) s.vy = Math.abs(s.vy);

    // probe deflection: angle depends on where along the arc it lands
    const w = probeW();
    if (s.vy > 0 && s.y > probeY - 10 && s.y < probeY + 8 && Math.abs(s.x - probe.x) < w / 2) {
      const u = (s.x - probe.x) / (w / 2); // -1 .. 1
      const flat = pickupState.surgeUntil > nowMs;
      const maxAng = flat ? 0.62 : 0.95; // radians off vertical
      const a = -Math.PI / 2 + u * maxAng;
      const v = shardSpeed(depth);
      s.vx = Math.cos(a) * v;
      s.vy = Math.sin(a) * v;
      probeFlare = { x: s.x, until: nowMs + 220 };
    }

    // block collisions
    const diamond = s.diamondUntil > nowMs;
    for (let bi = blocks.length - 1; bi >= 0; bi--) {
      const b = blocks[bi];
      const r = blockRect(b);
      if (s.x < r.x - 4 || s.x > r.x + r.w + 4 || s.y < r.y - 4 || s.y > r.y + r.h + 4) continue;
      if (b.type === "ROCK" && !diamond) {
        // indestructible: deflect only
        bounceOff(s, r);
        break;
      }
      if (!diamond) bounceOff(s, r);
      b.hp -= 1;
      if (b.hp <= 0) {
        blocks.splice(bi, 1);
        destroyed++;
        score += b.type === "AMMONIA" ? 40 : b.type === "WATER" ? 25 : 15;
        shatter(r.x + r.w / 2, r.y + r.h / 2, BLOCK[b.type].color);
        if (b.type === "AMMONIA") clouds.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, born: nowMs });
        maybeDropPickup(r.x + r.w / 2, r.y + r.h / 2);
        if (blocks.length === 0) {
          depthUp(); // full clear bumps depth and refills
          for (let k = 0; k < 3; k++) spawnRow(k);
        }
      }
      if (!diamond) break;
    }

    // ammonia clouds slow shards passing through
    for (const c of clouds) {
      if (Math.hypot(s.x - c.x, s.y - c.y) < 34) {
        s.x -= s.vx * dt * 0.4;
        s.y -= s.vy * dt * 0.4;
      }
    }

    // lost past the probe
    if (s.y > floorY + 20) {
      shards.splice(i, 1);
      if (!reduced) edgeDimUntil = nowMs + 300;
      if (shards.length === 0) loseLife();
    }
  }
}

function bounceOff(s, r) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const dx = (s.x - cx) / (r.w / 2), dy = (s.y - cy) / (r.h / 2);
  if (Math.abs(dx) > Math.abs(dy)) s.vx = Math.abs(s.vx) * Math.sign(dx);
  else s.vy = Math.abs(s.vy) * Math.sign(dy);
}

let clouds = []; // ammonia clouds, briefly slowing shards
function updateClouds() {
  clouds = clouds.filter((c) => nowMs - c.born < 3500);
}
function drawClouds() {
  for (const c of clouds) {
    const t = (nowMs - c.born) / 3500;
    const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 34);
    g.addColorStop(0, `rgba(150,120,200,${(0.3 * (1 - t)).toFixed(3)})`);
    g.addColorStop(1, "rgba(150,120,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 34, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loseLife() {
  lives -= 1;
  updateHud();
  if (lives <= 0) {
    endGame();
    return;
  }
  shards.push(makeShard(probe.x, probeY - 12, true));
  updateHud();
}

function depthUp() {
  depth = Math.min(30, depth + 1);
  depthClock = 0;
  updateHud();
}

/* ── HUD ───────────────────────────────────────────────── */
function updateHud() {
  el.score.textContent = Math.floor(score);
  el.depth.textContent = depth;
  el.shards.textContent = shards.length;
  el.lives.textContent = lives;
  // DESCENT: how close the lowest block is to the floor line
  const y = lowestRowY();
  const p = Math.max(0, Math.min(1, (y - fieldTop) / (floorY - fieldTop)));
  el.descent.style.width = (p * 100).toFixed(0) + "%";
  const stepsLeft = Math.floor((floorY - y) / (blockH * 1.25));
  el.status.classList.toggle("imminent", stepsLeft <= 2 && blocks.length > 0);
}

/* ── Intro / pause / game over ─────────────────────────── */
let introHidden = false;
function hideIntro() {
  if (introHidden || !el.intro) return;
  introHidden = true;
  started = true;
  el.intro.style.opacity = "0";
  el.intro.style.transform = "translateY(-10px)";
  el.intro.style.pointerEvents = "none";
  el.status.classList.add("show");
}

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

function endGame() {
  if (gameOver) return;
  gameOver = true;
  overFall = 0.001; // the field falls through the floor line
  const beat = Math.floor(score) > best;
  if (beat) {
    best = Math.floor(score);
    el.best.textContent = best;
  }
  el.finalScore.textContent = Math.floor(score);
  el.finalDepth.textContent = depth;
  el.finalBest.textContent = best;
  el.bestMarker.classList.toggle("show", beat);
}

function finishGameOver() {
  el.over.classList.add("show");
  if (!scoreSubmitted) {
    scoreSubmitted = true;
    setTimeout(() => {
      submitScoreOnGameOver({
        gameKey: "neptune",
        gameLabel: "Diamond Rain — Neptune",
        score: Math.floor(score),
        ask: true,
      });
    }, 60);
  }
}

function reset() {
  blocks = [];
  shards = [makeShard(W / 2, 0, true)];
  pickups = [];
  clouds = [];
  particles = [];
  pickupState = { tiltedUntil: 0, tritonUntil: 0, surgeUntil: 0 };
  score = 0;
  depth = 1;
  lives = 3;
  destroyed = 0;
  depthClock = 0;
  stepClock = 0;
  rowClock = 0;
  stormScale = 1;
  overFall = 0;
  gameOver = false;
  paused = false;
  scoreSubmitted = false;
  probe.x = W / 2;
  probe.targetX = W / 2;
  for (let k = 0; k < 3; k++) spawnRow(k);
  shards[0].x = probe.x;
  el.over.classList.remove("show");
  el.pause.classList.remove("show");
  document.body.classList.remove("is-paused");
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

/* ── Controls ──────────────────────────────────────────── */
const held = { left: false, right: false };
addEventListener("keydown", (e) => {
  if (e.code === "KeyR" && gameOver) return reset();
  if (gameOver || paused) return;
  let used = true;
  switch (e.code) {
    case "ArrowLeft":
    case "KeyA":
      held.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      held.right = true;
      break;
    case "Space":
      launchHeld();
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
  if (e.code === "ArrowLeft" || e.code === "KeyA") held.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") held.right = false;
});

// Mouse: absolute positioning.
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const w = screenToWorld(e.clientX, e.clientY);
  probe.targetX = w.x;
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") return;
  hideIntro();
  if (!gameOver && !paused) launchHeld();
});

/* Touch: drag anywhere in the lower third moves the probe by RELATIVE
   movement, so the finger never covers it. Tap launches. Relative + a
   1.4x gain is what lets the probe reach both edges without the finger
   leaving the screen. */
let touchDrag = null;
canvas.addEventListener(
  "touchstart",
  (e) => {
    hideIntro();
    const t = e.touches[0];
    const w = screenToWorld(t.clientX, t.clientY);
    touchDrag = { x0: w.x, probe0: probe.targetX, moved: false, t0: nowMs };
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    if (!touchDrag) return;
    const t = e.touches[0];
    const w = screenToWorld(t.clientX, t.clientY);
    if (w.y > H * 0.55) {
      const dx = (w.x - touchDrag.x0) * 1.4;
      if (Math.abs(dx) > 6) touchDrag.moved = true;
      probe.targetX = touchDrag.probe0 + dx;
    }
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchend",
  (e) => {
    if (touchDrag && !touchDrag.moved && nowMs - touchDrag.t0 < 250 && !gameOver && !paused) {
      launchHeld();
    }
    touchDrag = null;
    e.preventDefault();
  },
  { passive: false },
);

/* ── The loop ──────────────────────────────────────────── */
let last = 0;
let backdropPainted = false;

function step(ts) {
  if (!last) last = ts;
  const dt = Math.min(33, ts - last) * 0.001;
  last = ts;
  nowMs = ts;

  if (started && !paused && !gameOver) {
    // probe movement: keys at a fixed rate, mouse/touch via targetX
    const KEY_SPEED = 560;
    if (held.left) probe.targetX -= KEY_SPEED * dt;
    if (held.right) probe.targetX += KEY_SPEED * dt;
    const w = probeW();
    probe.targetX = Math.max(fieldX + w / 2, Math.min(fieldX + fieldW - w / 2, probe.targetX));
    probe.x += (probe.targetX - probe.x) * Math.min(1, dt * 18);

    // clocks
    depthClock += dt * 1000;
    if (depthClock >= DEPTH_MS) depthUp();
    if (pickupState.tritonUntil <= nowMs) {
      stepClock += dt * 1000;
      if (stepClock >= descentStepMs(depth)) {
        stepClock = 0;
        descentStep();
      }
    }
    rowClock += dt * 1000;
    if (rowClock >= newRowMs(depth)) {
      rowClock = 0;
      for (const b of blocks) if (b.row === 0) b.row = 1; // make room
      spawnRow(0);
    }

    updateShards(dt);
    updateClouds();

    // pickups drift down, collected by the probe
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.y += p.vy * dt;
      if (Math.abs(p.x - probe.x) < probeW() / 2 + 12 && Math.abs(p.y - probeY) < 18) {
        applyPickup(p.type);
        pickups.splice(i, 1);
      } else if (p.y > floorY + 30) {
        pickups.splice(i, 1);
      }
    }

    updateHud();
  }

  // game over: the field falls through the floor, the storm contracts
  if (gameOver && overFall > 0) {
    overFall += dt * 2;
    stormScale = Math.max(0.3, 1 - overFall * 0.5);
    if (overFall > 1.6 && !el.over.classList.contains("show")) finishGameOver();
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

  let sx = 0, sy = 0;
  if (stepShake > 0 && !reduced) {
    sx = (Math.random() * 2 - 1) * stepShake;
    sy = (Math.random() * 2 - 1) * stepShake;
    stepShake = Math.max(0, stepShake - 0.5);
  }

  ctx.save();
  ctx.translate(viewOffX + sx, viewOffY + sy);
  ctx.scale(viewScale, viewScale);

  // Neptune layer
  drawNeptuneShadow();
  drawStorm(now);
  drawStreaks(now);
  drawRings();
  drawGeyser(now);
  drawTritonGlow();

  // SHEAR wind streak + brief desaturation stand-in (a cool wash)
  if (shearFlash > 0) {
    ctx.fillStyle = `rgba(200,215,235,${(shearFlash * 0.16).toFixed(3)})`;
    ctx.fillRect(-40, -40, BASE_W + 80, BASE_H + 80);
    ctx.strokeStyle = `rgba(235,244,255,${(shearFlash * 0.8).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-40, probeY - 160);
    ctx.lineTo(BASE_W + 40, probeY - 180);
    ctx.stroke();
    shearFlash = Math.max(0, shearFlash - 0.05);
  }

  // TILTED FIELD line at its visible 47-degree offset
  if (pickupState.tiltedUntil > nowMs) {
    ctx.save();
    ctx.strokeStyle = "rgba(126,160,224,0.28)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    const cx = W / 2, cy = H / 2;
    const a = (47 * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * W, cy - Math.sin(a) * W);
    ctx.lineTo(cx + Math.cos(a) * W, cy + Math.sin(a) * W);
    ctx.stroke();
    ctx.restore();
  }

  // floor line
  ctx.strokeStyle = "rgba(232,137,106,0.5)";
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fieldX, floorY);
  ctx.lineTo(fieldX + fieldW, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  // field frame (subtle)
  ctx.strokeStyle = "rgba(126,160,224,0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(fieldX, fieldTop - 8, fieldW, floorY - fieldTop + 8);

  // blocks (falling through the floor after game over)
  ctx.save();
  if (overFall > 0) ctx.translate(0, overFall * overFall * 300);
  for (const b of blocks) drawBlock(b);
  ctx.restore();

  drawClouds();
  for (const p of pickups) drawPickup(p);
  for (const s of shards) drawShard(s, now);
  drawProbe(now);

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const t = (now - p.born) / p.life;
    if (t >= 1) {
      particles.splice(i, 1);
      continue;
    }
    const dts = (now - p.born) / 1000;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x + p.vx * dts - p.s / 2, p.y + p.vy * dts + 240 * dts * dts - p.s / 2, p.s, p.s);
  }
  ctx.globalAlpha = 1;

  // edge dim after a lost shard
  if (now < edgeDimUntil) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

/* ── Start ─────────────────────────────────────────────── */
resize();
reset();
started = false;
requestAnimationFrame(step);
