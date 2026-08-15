/* STAR MEMORY — the visual layer rebuilt over the existing logic.
 *
 * The matching game is unchanged: eight pairs, flip two, 100 a match,
 * minus 10 a miss, 200 for the board. What changed is everything the eye
 * sees: Saturn with real perspective rings behind the board, and card
 * faces that are eight different kinds of star, distinguishable by
 * silhouette alone — colour is only the secondary cue.
 *
 * Canvas contract: the meteor-dodge variant this game already used —
 * fixed 720x1280 virtual board, letterboxed. DPR cap, setTransform after
 * resize, world-space pointer conversion, clamped dt.
 */

import { definePlanetField } from "../../shared/elements/planet-field.ts";
import { color } from "../../tokens.ts";
import { submitScoreOnGameOver, fetchGlobalBest } from "../shared/score-submit.js";

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
   plane crosses it. The single detail that does the most for
   dimensionality, so it gets its own pass — and it sweeps once when the
   board completes. */
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

/* ── Cards ─────────────────────────────────────────────── */
const TYPES = [
  "REDGIANT",
  "WHITEDWARF",
  "BINARY",
  "PULSAR",
  "SUPERNOVA",
  "NEBULA",
  "BLACKHOLE",
  "PROTOSTAR",
];

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const pairsEl = document.getElementById("pairsVal");

let score = 0,
  best = 0,
  gameOver = false,
  scoreSubmitted = false;
let cards = [];
let flipped = [];
let matched = 0;
let lock = false;
let nowMs = 0;

fetchGlobalBest("star-memory").then((b) => {
  best = Math.max(best, b);
  bestEl.textContent = best;
});

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeCards() {
  const deck = shuffle([...TYPES, ...TYPES]);
  cards = [];
  const cols = 4,
    rows = 4,
    cardW = 132,
    cardH = 172,
    gap = 22;
  const startX = (BASE_W - (cols * cardW + (cols - 1) * gap)) / 2 + cardW / 2;
  const startY = (BASE_H - (rows * cardH + (rows - 1) * gap)) / 2 + cardH / 2 - 20;
  for (let i = 0; i < deck.length; i++) {
    cards.push({
      x: startX + (i % cols) * (cardW + gap),
      y: startY + Math.floor(i / cols) * (cardH + gap),
      w: cardW,
      h: cardH,
      type: deck[i],
      open: false,
      matched: false,
      flip: 0, // 0 back .. 1 face
      shudderUntil: 0,
      matchAnimStart: 0,
      completeFlash: 0,
      driftPhase: Math.random() * 6.28,
      driftFreq: 0.25 + Math.random() * 0.2,
    });
  }
}
makeCards();

function updatePairs() {
  pairsEl.textContent = matched / 2 + " / 8";
}

function reset() {
  score = 0;
  matched = 0;
  flipped = [];
  lock = false;
  gameOver = false;
  scoreSubmitted = false;
  ringSweep = -1;
  scoreEl.textContent = "0";
  makeCards();
  updatePairs();
  el.over.classList.remove("show");
}

function endGame() {
  gameOver = true;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  // board complete: matched cards brighten in sequence, then the ring
  // shadow sweeps once, then the card.
  const seq = reduced ? 0 : 1;
  cards.forEach((c, i) => {
    setTimeout(() => (c.completeFlash = 1), seq * i * 60);
  });
  if (!reduced) setTimeout(() => (ringSweep = 0), 1100);
  setTimeout(
    () => {
      el.finalScore.textContent = score;
      el.finalBest.textContent = best;
      el.bestMarker.classList.toggle("show", score >= best && score > 0);
      el.over.classList.add("show");
      if (!scoreSubmitted) {
        scoreSubmitted = true;
        setTimeout(() => {
          submitScoreOnGameOver({
            gameKey: "star-memory",
            gameLabel: "Star Memory",
            score,
            ask: true,
          });
        }, 60);
      }
    },
    reduced ? 400 : 2100,
  );
}

function handleMatch() {
  const [a, b] = flipped;
  if (a.type === b.type) {
    a.matched = true;
    b.matched = true;
    a.matchAnimStart = nowMs;
    b.matchAnimStart = nowMs;
    score += 100;
    matched += 2;
    updatePairs();
    if (matched === cards.length) {
      score += 200;
      endGame();
    }
  } else {
    score = Math.max(0, score - 10);
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
  }
  flipped = [];
  setTimeout(() => (lock = false), 1100);
  scoreEl.textContent = score;
}

function onTap(clientX, clientY) {
  hideIntro();
  if (lock || gameOver) return;
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

/* ── Drawing the star types ────────────────────────────────
   Every face must be identifiable by silhouette alone. The geometry is
   the identity; colour is a courtesy. */
function drawFace(c, t) {
  const R = 42;
  switch (c.type) {
    case "REDGIANT": {
      // large soft circle, wavering edge, short flare licks
      ctx.strokeStyle = "#d1603f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const rr = R * (1 + 0.05 * Math.sin(a * 5 + 1.3));
        const x = Math.cos(a) * rr,
          y = Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05);
        ctx.lineTo(Math.cos(a + 0.12) * R * 1.28, Math.sin(a + 0.12) * R * 1.28);
        ctx.stroke();
      }
      break;
    }
    case "WHITEDWARF": {
      // tiny dense circle, four long diffraction spikes
      ctx.strokeStyle = "#cfe8ff";
      ctx.fillStyle = "#cfe8ff";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35);
        ctx.stroke();
      }
      break;
    }
    case "BINARY": {
      // two unequal circles on a shared orbit, a stream between them
      const orbitA = t * Math.PI * 2; // completes an orbit on match
      ctx.strokeStyle = "#d6c491";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.1, R * 0.45, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      const ax = Math.cos(orbitA) * R * 0.75,
        ay = Math.sin(orbitA) * R * 0.3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-ax, -ay, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, ay, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax - 6, ay - 2);
      ctx.quadraticCurveTo(0, -6, -ax + 10, -ay);
      ctx.stroke();
      break;
    }
    case "PULSAR": {
      // small circle, two tilted light cones, three sweep arcs
      const sweep = t * 0.8;
      ctx.strokeStyle = "#b48ade";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.stroke();
      const tilt = -0.5 + sweep;
      for (const dir of [1, -1]) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(tilt) * 10 * dir, Math.sin(tilt) * 10 * dir);
        ctx.lineTo(Math.cos(tilt + 0.22) * R * 1.25 * dir, Math.sin(tilt + 0.22) * R * 1.25 * dir);
        ctx.moveTo(Math.cos(tilt) * 10 * dir, Math.sin(tilt) * 10 * dir);
        ctx.lineTo(Math.cos(tilt - 0.22) * R * 1.25 * dir, Math.sin(tilt - 0.22) * R * 1.25 * dir);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 14 + i * 9, tilt - 0.5, tilt + 0.5);
        ctx.stroke();
      }
      break;
    }
    case "SUPERNOVA": {
      // broken concentric shell arcs, radial filaments
      const grow = 1 + t * 0.35; // expands on match
      for (let ring = 0; ring < 3; ring++) {
        const rr = (R * (0.55 + ring * 0.28)) * grow;
        ctx.strokeStyle = ring === 2 ? "#f5ead2" : "#e8b46a";
        ctx.lineWidth = ring === 2 ? 2 : 1.3;
        for (let s = 0; s < 6; s++) {
          const a0 = (s / 6) * Math.PI * 2 + ring * 0.4;
          ctx.beginPath();
          ctx.arc(0, 0, rr, a0, a0 + 0.7);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#e8b46a";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.26;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25);
        ctx.lineTo(Math.cos(a) * R * 1.15 * grow, Math.sin(a) * R * 1.15 * grow);
        ctx.stroke();
      }
      break;
    }
    case "NEBULA": {
      // soft irregular cloud of overlapping open curves + 3 embedded points
      ctx.strokeStyle = "#6fbfb4";
      ctx.lineWidth = 1.4;
      const lobes = [
        [-14, -8, 26], [12, -14, 22], [16, 10, 24], [-10, 14, 20], [0, 0, 30],
      ];
      for (const [lx, ly, lr] of lobes) {
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0.4, 5.6);
        ctx.stroke();
      }
      ctx.fillStyle = "#d8f2ee";
      for (const [px, py] of [[-8, -4], [10, 2], [2, 12]]) {
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "BLACKHOLE": {
      // the only card with a solid fill
      const bend = 0.9 + t * 0.5; // the arc bends further on match
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f2f6ff";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = "rgba(242,246,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.35, R * 0.85, R * 0.3 * bend, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    case "PROTOSTAR": {
      // dim centre in a flattened spiral disc of three inward arcs
      ctx.strokeStyle = "#c98f96";
      ctx.fillStyle = "rgba(201,143,150,0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const a0 = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        for (let s = 0; s <= 16; s++) {
          const u = s / 16;
          const a = a0 + u * 2.4;
          const rr = R * 1.1 * (1 - u * 0.72);
          const x = Math.cos(a) * rr,
            y = Math.sin(a) * rr * 0.45;
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
  }
}

function drawCardBack() {
  // faint ring-plane motif echoing Saturn, small accent dot at centre
  ctx.strokeStyle = "rgba(214,196,145,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 14, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 10, -0.3, 0, Math.PI * 2);
  ctx.stroke();
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
    drawCardBack();
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
  updatePairs();
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

function step(ts) {
  if (!last) last = ts;
  dtGlobal = Math.min(33, ts - last) * 0.001;
  last = ts;
  nowMs = ts;

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
  ctx.fillStyle = "rgba(5,8,16,0.35)";
  const bx = cards.length ? cards[0].x - cards[0].w / 2 - 24 : 0;
  const by = cards.length ? cards[0].y - cards[0].h / 2 - 24 : 0;
  const bw = cards.length ? cards[15].x + cards[15].w / 2 + 24 - bx : BASE_W;
  const bh = cards.length ? cards[15].y + cards[15].h / 2 + 24 - by : BASE_H;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 18);
  ctx.fill();

  for (const c of cards) drawCard(c, now);

  ctx.restore();
}

resize();
requestAnimationFrame(step);
