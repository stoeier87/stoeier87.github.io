/* FLYBY — a trajectory game. Jupiter is a gameplay object, not a backdrop.
 *
 * Drag to aim and set power, release to launch. Jupiter pulls hard, the
 * four Galilean moons pull a little, and the moons are moving — the same
 * launch never gives the same result twice. Rings score, close passes by
 * moons multiply, and the radiation belt doubles points while it eats the
 * shield. Three probes per run.
 *
 * Not a dodging game, not a falling-block game, not a paddle game.
 *
 * Canvas contract: the iss-docking/ice-fall variant — the world is the
 * viewport at DESIGN_H scale, no letterbox. DPR cap, setTransform after
 * resize, clamped dt, screenToWorld pointer conversion.
 *
 * Scoreboard: reads and writes through the existing interface only —
 * gameKey stays "comet-pong" because the route owns the key.
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
  layoutSystem();
}
addEventListener("resize", resize, { passive: true });

function screenToWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) / viewScale, y: (clientY - r.top) / viewScale };
}

/* ── Jupiter ───────────────────────────────────────────────
   The sphere itself is a banded PlanetBody in <st-planet-field>; the 2D
   layer adds what the element cannot: band streaks at their own speeds
   shearing where they meet, the Great Red Spot drifting along its band,
   the sun-fixed terminator, and the polar aurorae. */
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

/* Mirror of the element's placement maths, in world units. */
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

/* ── The system: moons, belt, launch pad ─────────────────── */
const SQUASH = 0.44; // orbital plane seen at an angle

/* Each moon in the site's line style, each distinct: Io small and sulphur
   yellow with its plume, Europa pale with fine cracks, Ganymede grey-brown
   and largest, Callisto dark and cratered. Radii/speeds are factors of
   Jupiter's apparent radius, laid out in layoutSystem. */
const MOONS = [
  { key: "io", label: "IO", f: 1.22, r: 9, speed: 0.42, phase: 1.1, hi: "#e8d06a", lo: "#a8862f" },
  { key: "europa", label: "EUROPA", f: 1.48, r: 11, speed: 0.3, phase: 3.9, hi: "#f0f3f6", lo: "#b9c4cc" },
  { key: "ganymede", label: "GANYMEDE", f: 1.78, r: 16, speed: 0.21, phase: 5.4, hi: "#c0a98b", lo: "#77685a" },
  { key: "callisto", label: "CALLISTO", f: 2.12, r: 13, speed: 0.15, phase: 0.3, hi: "#8d7f72", lo: "#4a423b" },
];
let orbitScale = 1; // shrinks the whole system so Callisto fits on phones
let moonSpeedMul = 1; // difficulty
let beltWide = 0; // difficulty: the belt widens

const pad = { x: 30, y: 0 };

function layoutSystem() {
  const j = jupiterWorld();
  pad.x = 30;
  pad.y = BASE_H * 0.42;
  // Callisto's orbit must fit between Jupiter's centre and the left edge.
  orbitScale = Math.min(1, (j.x - 60) / (MOONS[3].f * j.r));
}

function moonAt(m, t) {
  const j = jupiterWorld();
  const a = m.phase + t * m.speed * moonSpeedMul;
  const rx = m.f * j.r * orbitScale;
  return { x: j.x + Math.cos(a) * rx, y: j.y + Math.sin(a) * rx * SQUASH, a, rx };
}

/* Elliptical distance from Jupiter's centre, normalised so 1 = the limb. */
function beltDist(x, y) {
  const j = jupiterWorld();
  return Math.hypot(x - j.x, (y - j.y) / SQUASH) / j.r;
}
function beltBands() {
  return [
    { in: 1.06, out: 1.13 + beltWide, drain: 24 },
    { in: 1.22 + beltWide * 0.5, out: 1.3 + beltWide * 1.5, drain: 15 },
  ];
}
function beltAt(x, y) {
  const d = beltDist(x, y);
  for (const b of beltBands()) if (d >= b.in && d <= b.out) return b;
  return null;
}

/* ── Run state ─────────────────────────────────────────── */
const el = {
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  ringVal: document.getElementById("ringVal"),
  probesVal: document.getElementById("probesVal"),
  shieldFill: document.getElementById("shieldFill"),
  multVal: document.getElementById("multVal"),
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
  finalRings: document.getElementById("finalRings"),
  finalBest: document.getElementById("finalBest"),
  bestMarker: document.getElementById("bestMarker"),
};

let score = 0,
  best = 0,
  gameOver = false,
  scoreSubmitted = false,
  paused = false;
let probes = 3;
let ringIdx = 1;
let ringsPassed = 0;
let mult = 1;
let shield = 100;
let simT = 0; // simulation clock, drives the moons; frozen while paused

let probe = null; // { x, y, vx, vy, flightT, minPass: Map }
let trail = [];
let ring = null; // { x, y, r, flare }
let aim = null; // { sx, sy, cx, cy } pointer drag, slingshot style
let rearmAt = 0;
let auroraFlashUntil = 0;
const fragments = [];
const floats = []; // floating multiplier texts
const ringFx = []; // scored rings collapsing inward

const GM_J = 2.6e7;
const GM_MOON = 260000;
const PROBE_R = 4;

fetchGlobalBest("comet-pong").then((b) => {
  best = Math.max(best, b);
  el.best.textContent = best;
});

function updateHud() {
  el.ringVal.textContent = ringIdx;
  el.probesVal.textContent = probes;
  el.multVal.textContent = "x" + mult.toFixed(1).replace(/\.0$/, "");
  el.shieldFill.style.width = Math.max(0, shield) + "%";
}

/* Ring spawns on the playfield side of the system, and every third ring
   the whole system tightens: moons speed up, the ring sits deeper in the
   gravity well, the belt widens. */
function spawnRing() {
  const j = jupiterWorld();
  const depthSteps = Math.floor((ringIdx - 1) / 3);
  moonSpeedMul = 1 + depthSteps * 0.07;
  beltWide = Math.min(0.1, depthSteps * 0.014);
  const minF = Math.max(1.12, 2.3 - depthSteps * 0.18);
  const maxF = Math.max(minF + 0.25, 2.6 - depthSteps * 0.12);
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.PI * (0.72 + Math.random() * 0.56); // the open side
    const f = minF + Math.random() * (maxF - minF);
    const x = j.x + Math.cos(a) * f * j.r * orbitScale;
    const y = j.y + Math.sin(a) * f * j.r * orbitScale * (0.6 + Math.random() * 0.8);
    if (x < 60 || x > BASE_W - 30 || y < 90 || y > BASE_H - 60) continue;
    if (Math.hypot(x - pad.x, y - pad.y) < 140) continue;
    ring = { x, y, r: 30, flare: 0 };
    return;
  }
  ring = { x: BASE_W * 0.4, y: BASE_H * 0.3, r: 30, flare: 0 };
}

function reset() {
  score = 0;
  probes = 3;
  ringIdx = 1;
  ringsPassed = 0;
  mult = 1;
  shield = 100;
  moonSpeedMul = 1;
  beltWide = 0;
  gameOver = false;
  scoreSubmitted = false;
  probe = null;
  trail = [];
  aim = null;
  fragments.length = 0;
  floats.length = 0;
  ringFx.length = 0;
  el.score.textContent = "0";
  el.over.classList.remove("show");
  spawnRing();
  updateHud();
}

function endGame() {
  gameOver = true;
  if (score > best) {
    best = score;
    el.best.textContent = best;
  }
  el.finalScore.textContent = score;
  el.finalRings.textContent = ringsPassed;
  el.finalBest.textContent = best;
  el.bestMarker.classList.toggle("show", score >= best && score > 0);
  el.over.classList.add("show");
  if (!scoreSubmitted) {
    scoreSubmitted = true;
    setTimeout(() => {
      submitScoreOnGameOver({
        gameKey: "comet-pong",
        gameLabel: "Flyby",
        score,
        ask: true,
      });
    }, 60);
  }
}

/* ── Launch, flight, loss ───────────────────────────────── */
function launchVelocity() {
  if (!aim) return null;
  const dx = aim.sx - aim.cx;
  const dy = aim.sy - aim.cy;
  const len = Math.hypot(dx, dy);
  if (len < 14) return null; // too small a pull to mean it
  const power = Math.min(240, len);
  const speed = 150 + power * 2.0;
  return { vx: (dx / len) * speed, vy: (dy / len) * speed, power };
}

function gravityAt(x, y, t) {
  const j = jupiterWorld();
  let ax = 0,
    ay = 0;
  {
    const dx = j.x - x,
      dy = j.y - y;
    const d2 = Math.max(dx * dx + dy * dy, 900);
    const d = Math.sqrt(d2);
    const a = GM_J / d2;
    ax += (dx / d) * a;
    ay += (dy / d) * a;
  }
  for (const m of MOONS) {
    const p = moonAt(m, t);
    const dx = p.x - x,
      dy = p.y - y;
    const d2 = Math.max(dx * dx + dy * dy, 400);
    const d = Math.sqrt(d2);
    const a = GM_MOON / d2;
    ax += (dx / d) * a;
    ay += (dy / d) * a;
  }
  return { ax, ay };
}

function launch() {
  const v = launchVelocity();
  aim = null;
  if (!v || probe || gameOver || paused) return;
  probe = { x: pad.x, y: pad.y, vx: v.vx, vy: v.vy, flightT: 0, minPass: new Map() };
  trail = [];
}

function loseProbe(kind) {
  if (!probe) return;
  if (!reduced && kind !== "void") {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 160;
      fragments.push({
        x: probe.x,
        y: probe.y,
        vx: Math.cos(a) * sp + probe.vx * 0.2,
        vy: Math.sin(a) * sp + probe.vy * 0.2,
        rot: Math.random() * 6.3,
        rv: (Math.random() - 0.5) * 12,
        life: 0.7 + Math.random() * 0.5,
        t: 0,
      });
    }
    auroraFlashUntil = simT + 0.45;
  }
  probe = null;
  trail = [];
  if (kind !== "void") {
    probes -= 1;
    updateHud();
    if (probes <= 0) {
      setTimeout(endGame, reduced ? 300 : 800);
      return;
    }
  }
  shield = 100;
  updateHud();
  rearmAt = performance.now() + 700;
}

function scoreRing() {
  const inBelt = beltAt(probe.x, probe.y);
  const base = 100 + (ringIdx - 1) * 20;
  const pts = Math.round(base * mult * (inBelt ? 2 : 1));
  score += pts;
  el.score.textContent = score;
  ringsPassed = ringIdx;
  floats.push({
    x: ring.x,
    y: ring.y - 34,
    text: "+" + pts + (inBelt ? " BELT x2" : ""),
    t: 0,
  });
  // the ring flares and collapses inward
  ringFx.push({ x: ring.x, y: ring.y, r: ring.r, t: 0 });
  ringIdx += 1;
  mult = 1;
  shield = 100; // shield refills fully on each new ring
  spawnRing();
  updateHud();
}

function stepProbe(dt) {
  if (!probe) return;
  probe.flightT += dt;
  const SUB = 3;
  const h = dt / SUB;
  for (let s = 0; s < SUB; s++) {
    const { ax, ay } = gravityAt(probe.x, probe.y, simT);
    probe.vx += ax * h;
    probe.vy += ay * h;
    probe.x += probe.vx * h;
    probe.y += probe.vy * h;

    const j = jupiterWorld();
    if (Math.hypot(probe.x - j.x, probe.y - j.y) < j.r * 0.99) return loseProbe("jupiter");
    for (const m of MOONS) {
      const p = moonAt(m, simT);
      const d = Math.hypot(probe.x - p.x, probe.y - p.y);
      if (d < m.r + PROBE_R - 1) return loseProbe("moon");
      // Close pass: near miss multiplies the next ring. Closer is more.
      const gap = d - m.r;
      if (gap > 0 && gap < 36) {
        const prev = probe.minPass.get(m.key) ?? Infinity;
        if (gap < prev) {
          probe.minPass.set(m.key, gap);
          const passMult = 1 + ((36 - gap) / 36) * 3; // up to x4
          if (passMult > mult + 0.05) {
            mult = Math.round(passMult * 10) / 10;
            floats.push({ x: p.x, y: p.y - m.r - 14, text: "x" + mult.toFixed(1), t: 0 });
            m.flare = 1;
            updateHud();
          }
        }
      }
    }
    if (ring && Math.hypot(probe.x - ring.x, probe.y - ring.y) < ring.r) {
      scoreRing();
    }
  }

  // The belt drains the shield while the probe is inside it.
  const band = beltAt(probe.x, probe.y);
  el.status.classList.toggle("draining", !!band);
  if (band) {
    shield -= band.drain * dt;
    updateHud();
    if (shield <= 0) return loseProbe("radiation");
  }

  // Off into the void, or twenty-five seconds of stable orbit: the probe
  // is retrieved quietly. It costs nothing but the time it took.
  if (
    probe.x < -BASE_W * 0.3 ||
    probe.x > BASE_W * 1.35 ||
    probe.y < -300 ||
    probe.y > BASE_H + 300 ||
    probe.flightT > 25
  ) {
    loseProbe("void");
    el.status.classList.remove("draining");
    return;
  }

  if (!reduced || trail.length === 0) {
    trail.push({ x: probe.x, y: probe.y, belt: !!band });
    if (trail.length > 130) trail.shift();
  }
}

/* ── Input ─────────────────────────────────────────────── */
let introHidden = false;
function hideIntro() {
  if (introHidden) return;
  introHidden = true;
  el.intro.style.opacity = "0";
  el.intro.style.transform = "translateY(-10px)";
  el.intro.style.pointerEvents = "none";
  el.status.classList.add("show");
  updateHud();
}
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (canHover) el.introKeys.classList.add("show");
else el.introTouch.classList.add("show");

canvas.addEventListener("pointerdown", (e) => {
  hideIntro();
  if (gameOver || paused || probe) return;
  const w = screenToWorld(e.clientX, e.clientY);
  aim = { sx: w.x, sy: w.y, cx: w.x, cy: w.y };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!aim) return;
  const w = screenToWorld(e.clientX, e.clientY);
  aim.cx = w.x;
  aim.cy = w.y;
});
canvas.addEventListener("pointerup", () => {
  if (aim) launch();
});
canvas.addEventListener("pointercancel", () => {
  aim = null;
});

function togglePause(force) {
  if (gameOver) return;
  paused = force ?? !paused;
  document.body.classList.toggle("is-paused", paused);
  el.pause.classList.toggle("show", paused);
}
el.resumeBtn.addEventListener("click", () => togglePause(false));

addEventListener("keydown", (e) => {
  if (e.code === "KeyP" || e.code === "Escape") togglePause();
  if (e.code === "KeyR") {
    if (gameOver) reset();
    else aim = null; // reset the aim before launching
  }
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

/* ── Drawing ───────────────────────────────────────────── */
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

/* Band streaks at their own speeds, shearing where they meet. Each lives
   at a latitude, scrolls in longitude, and projects like a sphere. */
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

/* The Great Red Spot: drifts along its southern band and slowly turns on
   itself. Projected like everything else on the sphere. */
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

/* Faint aurorae at both poles, pulsing slowly; they flicker once when a
   probe is lost. */
function drawAurorae(t) {
  const j = jupiterWorld();
  const flash = simT < auroraFlashUntil ? 0.35 : 0;
  const pulse = reduced ? 0.5 : 0.5 + 0.35 * Math.sin(t * 0.8);
  for (const pole of [-1, 1]) {
    const py = j.y + pole * j.r * 0.93;
    ctx.strokeStyle = `rgba(150,200,255,${(0.1 + 0.1 * pulse + flash).toFixed(3)})`;
    ctx.lineWidth = j.r * 0.02;
    ctx.beginPath();
    ctx.ellipse(j.x, py, j.r * 0.34, j.r * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBelt() {
  const j = jupiterWorld();
  for (const [i, b] of beltBands().entries()) {
    const mid = (b.in + b.out) / 2;
    const w = (b.out - b.in) * j.r;
    ctx.strokeStyle = `rgba(232,162,75,${i === 0 ? 0.1 : 0.07})`;
    ctx.lineWidth = w;
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
    // sphere with the weak-light treatment, in the site's line style
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
      // the tiny plume
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

    if (m.flare > 0) {
      ctx.strokeStyle = `rgba(232,162,75,${(m.flare * 0.9).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, m.r + 3 + (1 - m.flare) * 10, 0, Math.PI * 2);
      ctx.stroke();
      m.flare = Math.max(0, m.flare - 0.03);
    }
  }
}

function drawRing() {
  if (!ring) return;
  const pulse = reduced ? 0 : Math.sin(simT * 3) * 2;
  ctx.strokeStyle = "rgba(232,162,75,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(232,162,75,0.3)";
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTrail() {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const a = reduced ? 0.35 : (i / trail.length) * 0.5;
    const p0 = trail[i - 1];
    const p1 = trail[i];
    ctx.strokeStyle = p1.belt ? `rgba(232,162,75,${a})` : `rgba(190,214,235,${a})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

function drawProbeShape(x, y, ang, tint) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = tint || "#e6eef8";
  ctx.fillStyle = "rgba(20,28,44,0.9)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4.5);
  ctx.lineTo(-5, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-1, 0, 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawProbe() {
  if (!probe) return;
  const band = beltAt(probe.x, probe.y);
  drawProbeShape(probe.x, probe.y, Math.atan2(probe.vy, probe.vx), band ? "#e8a24b" : null);
}

/* The launcher: pad, pulled-back probe compressing with power, aim arrow
   and the first portion of the predicted arc — the rest is read, not
   solved. */
function drawAim() {
  const armed = !probe && !gameOver && performance.now() >= rearmAt;
  if (!armed) return;
  // the pad
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(pad.x, pad.y, 12, 0, Math.PI * 2);
  ctx.stroke();

  const v = launchVelocity();
  if (!aim || !v) {
    drawProbeShape(pad.x, pad.y, 0, null);
    return;
  }
  const ang = Math.atan2(v.vy, v.vx);
  const squeeze = 1 - (v.power / 240) * 0.25; // compresses before release
  ctx.save();
  ctx.translate(pad.x, pad.y);
  ctx.rotate(ang);
  ctx.scale(squeeze, 1);
  ctx.translate(-(v.power / 240) * 10, 0); // visibly pulled back
  drawProbeShape(0, 0, 0, "#e8a24b");
  ctx.restore();

  // aim arrow
  ctx.strokeStyle = "rgba(232,162,75,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(pad.x, pad.y);
  ctx.lineTo(pad.x + Math.cos(ang) * (20 + v.power * 0.25), pad.y + Math.sin(ang) * (20 + v.power * 0.25));
  ctx.stroke();

  // predicted arc: only the first portion
  let px = pad.x,
    py = pad.y,
    vx = v.vx,
    vy = v.vy;
  ctx.fillStyle = "rgba(232,162,75,0.55)";
  const h = 1 / 60;
  for (let i = 0; i < 48; i++) {
    const { ax, ay } = gravityAt(px, py, simT);
    vx += ax * h;
    vy += ay * h;
    px += vx * h;
    py += vy * h;
    if (i % 4 === 3 && i < 44) {
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFx(dt) {
  for (let i = fragments.length - 1; i >= 0; i--) {
    const f = fragments[i];
    f.t += dt;
    if (f.t >= f.life) {
      fragments.splice(i, 1);
      continue;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.rot += f.rv * dt;
    const a = 1 - f.t / f.life;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.strokeStyle = `rgba(230,238,248,${(a * 0.8).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, -1, 4, 2);
    ctx.restore();
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t > 1.3) {
      floats.splice(i, 1);
      continue;
    }
    ctx.fillStyle = `rgba(232,162,75,${(1 - f.t / 1.3).toFixed(2)})`;
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y - f.t * 22);
  }
  for (let i = ringFx.length - 1; i >= 0; i--) {
    const f = ringFx[i];
    f.t += reduced ? 1 : dt * 2.4;
    if (f.t >= 1) {
      ringFx.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = `rgba(232,162,75,${(0.9 * (1 - f.t)).toFixed(2)})`;
    ctx.lineWidth = 2 + f.t * 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (1 - f.t * 0.9), 0, Math.PI * 2);
    ctx.stroke();
  }
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
    stepProbe(dt);
  }

  if (backdrop && (!reduced || !backdropPainted)) {
    backdrop.tick(ts);
    backdropPainted = true;
  }

  draw(dt);
  requestAnimationFrame(step);
}

function draw(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.scale(viewScale, viewScale);

  drawBands(simT);
  drawGRS(simT);
  drawJupiterShadow();
  drawAurorae(simT);
  drawBelt();
  drawOrbitsAndMoons(simT);
  drawRing();
  drawTrail();
  drawProbe();
  drawAim();
  drawFx(paused ? 0 : dt);

  ctx.restore();
}

resize();
reset();
requestAnimationFrame(step);
