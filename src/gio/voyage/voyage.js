import { guardPage } from "../shared/gate.js";

/**
 * THE LONG WAY TO YOU — /gio/voyage
 *
 * Én komplet rejse, Danmark → Valparaíso → hjem, i ti ben over de samme
 * fem etaper. Ingen score, ingen leaderboard, ingen forbindelse til
 * arkadens highscore-system — bevidst. Hjerter er den eneste valuta, og
 * de gemmes ingen steder efter sessionen.
 *
 * Lysmekanikken er kernen og står ingen steder i interfacet: udad ligger
 * havet foran skibet i mørke og forhindringer dukker sent op; hjemad er
 * hun ombord og bærer lyset — en varm radius rejser med skibet, og alt
 * ses flere sekunder før. Hjemturen er hårdere i indhold, men kan læses.
 *
 * Nåde uden bund: hvert forlis på samme ben gør benet målbart lettere
 * (tæthed ×0.85, strøm ×0.8, +1 hjerte pr. forsøg), så Kap Horn ALTID
 * kan passeres til sidst. Ingen kan tabe rejsen permanent.
 *
 * Canvas-kontrakten: fast virtuel opløsning 420×760 letterboxet, dpr-cap
 * 2, setTransform efter resize, dt clamped til 33 ms, én rAF.
 */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Verden ─────────────────────────────────────────────────────────── */
const BASE_W = 420;
const BASE_H = 760;
const SHIP_Y = 530;
const LEG_LEN = 3900; // world-px pr. ben — ca. ét minut sejlads
const CHECKPOINT_KEY = "gio_voyage_checkpoint";

/* De fem etaper. Benene 0-4 er udrejsen (etape 0→4), benene 5-9 er
   hjemrejsen (etape 4→0). Farver lerpes kontinuerligt hen over grænserne. */
const STAGES = [
  {
    name: "THE NORTH SEA",
    deep: "#26323c",
    lite: "#3b4a52",
    tint: "#9fb4c4",
    speed: 58,
    swell: 5,
    roll: 0.05,
    spawn: { stake: 0.9, rock: 0.45 },
    fog: true,
    hearts: 2.2,
  },
  {
    name: "THE ATLANTIC",
    deep: "#132b4e",
    lite: "#1e416f",
    tint: "#7fa8d8",
    speed: 66,
    swell: 11,
    roll: 0.09,
    spawn: { wreck: 0.55, rock: 0.2 },
    whales: true,
    hearts: 2.2,
  },
  {
    name: "THE EQUATOR",
    deep: "#3f7187",
    lite: "#8fc0ca",
    tint: "#f2ead2",
    speed: 62,
    swell: 2,
    roll: 0.03,
    spawn: { debris: 0.85 },
    squalls: true,
    equator: true,
    hearts: 2.2,
  },
  {
    name: "CAPE HORN",
    deep: "#04070c",
    lite: "#0f171f",
    tint: "#5a6b7a",
    speed: 70,
    swell: 14,
    roll: 0.14,
    spawn: { berg: 0.75, rock: 0.3, pool: 0.32 },
    currents: true,
    snow: true,
    hearts: 2.6,
  },
  {
    name: "THE CHILEAN COAST",
    deep: "#274757",
    lite: "#4a7a86",
    tint: "#ffcf7a",
    speed: 58,
    swell: 6,
    roll: 0.06,
    spawn: { kelp: 0.5, boat: 0.5 },
    andes: true,
    hearts: 2.4,
  },
];

const stageForLeg = (leg) => (leg < 5 ? leg : 9 - leg);
const isHomebound = (leg) => leg >= 5;

/* Valparaísos huse — den eneste mættede farve i hele spillet */
const HOUSE_COLORS = ["#e0704a", "#6e8fff", "#ffd166", "#7eb08a", "#e03a2f", "#a8e0e8"];

/* ── DOM ────────────────────────────────────────────────────────────── */
const el = {
  main: document.querySelector("main"),
  canvas: document.getElementById("sea"),
  intro: document.getElementById("intro"),
  paused: document.getElementById("paused"),
  endingScreen: document.getElementById("endingScreen"),
  endingText: document.getElementById("endingText"),
  endingChoices: document.getElementById("endingChoices"),
  endingHearts: document.getElementById("endingHearts"),
  sailAgain: document.getElementById("sailAgain"),
};

const ctx = el.canvas.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2); // uncapped melts phones
let viewScale = 1;
let viewOffX = 0;
let viewOffY = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  el.canvas.width = w * dpr;
  el.canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // after every resize
  viewScale = Math.min(w / BASE_W, h / BASE_H);
  viewOffX = (w - BASE_W * viewScale) / 2;
  viewOffY = (h - BASE_H * viewScale) / 2;
}
addEventListener("resize", resize, { passive: true });
resize();

/* ── Tilstand ───────────────────────────────────────────────────────── */
let mode = "intro"; // intro | sail | turn | ending
let paused = false;
let leg = 0;
let progressY = 0;
let hp = 3;
let hearts = 0;
let attempts = new Array(10).fill(0); // nåden, pr. ben
let lightT = 0; // 0 = udad (mørkt forude), 1 = hun er ombord
let sceneT = 0;
let shakeT = 0;
let invulnT = 0;
let bleachT = 0;
let founderT = 0;
let flareT = 0; // "2x"-floater ved hjemad-hjerter
let wakeT = 0;
let titleText = "";
let titleT = 0;
let equatorCrossed = false;
let spawnCursor = 0;

const ship = { x: BASE_W / 2, vx: 0, target: BASE_W / 2, cracks: [] };
let obstacles = [];
let drops = []; // hjerter
let zones = []; // strøm/kelp-felter
let snowflakes = [];
let squall = null;
let squallTimer = 8;
let fx = []; // små effekter (heart-flare mm.)

/* Vendepunktet i Valparaíso — to bevægelser: skibet hviler, et beat, så
   kommer hun ned ad bjerget (6 s, det eneste der bevæger sig), ombord,
   og først dér bygger lyset over ~3 s. */
const TURN_PHASES = [
  ["arrive", 2.2],
  ["beat", 1.0],
  ["descent", 6.0],
  ["board", 1.6],
  ["light", 3.0],
  ["turn", 1.6],
];
let turnPhase = 0;
let turnT = 0;

/* Slutningen */
let sunT = 0;
let endingStarted = false;

/* ── Checkpoint (kun etape-start; forlis kan aldrig koste mere) ─────── */
function saveCheckpoint() {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ leg, hearts, attempts }));
  } catch {
    /* uden storage starter en genindlæsning bare forfra */
  }
}
function clearCheckpoint() {
  try {
    localStorage.removeItem(CHECKPOINT_KEY);
  } catch {
    /* intet at rydde */
  }
}
try {
  const saved = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) ?? "null");
  if (saved && Number.isInteger(saved.leg) && saved.leg > 0 && saved.leg < 10) {
    leg = saved.leg;
    hearts = Number(saved.hearts) || 0;
    if (Array.isArray(saved.attempts) && saved.attempts.length === 10) {
      attempts = saved.attempts.map((n) => Number(n) || 0);
    }
    lightT = isHomebound(leg) ? 1 : 0;
  }
} catch {
  /* ubrugeligt checkpoint = frisk start */
}

/* ── Farver ─────────────────────────────────────────────────────────── */
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpHex(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* Kontinuerligt farveskifte: inde i benets sidste femtedel blandes mod
   næste bens etape, så grænserne aldrig er et klip. */
function palette() {
  const s = STAGES[stageForLeg(leg)];
  const frac = progressY / LEG_LEN;
  let next = s;
  if (leg < 9) next = STAGES[stageForLeg(leg + 1)];
  const t = frac > 0.8 ? (frac - 0.8) / 0.2 : 0;
  return {
    deep: lerpHex(s.deep, next.deep, t),
    lite: lerpHex(s.lite, next.lite, t),
    tint: lerpHex(s.tint, next.tint, t),
  };
}

/* ── Nåde ───────────────────────────────────────────────────────────── */
const mercyDensity = () => Math.pow(0.85, attempts[leg]);
const mercyCurrent = () => Math.pow(0.8, attempts[leg]);

/* ── Spawning ───────────────────────────────────────────────────────── */
const SPAWN_STEP = 110;
const AHEAD = 980;

function spawnBand(y) {
  const s = STAGES[stageForLeg(leg)];
  const hard = isHomebound(leg) ? 1.35 : 1; // hjemad: hårdere indhold …
  const dens = mercyDensity() * hard * (SPAWN_STEP / 1000);
  for (const [type, per1000] of Object.entries(s.spawn)) {
    if (Math.random() < per1000 * dens) {
      const x = 34 + Math.random() * (BASE_W - 68);
      if (type === "pool") {
        obstacles.push({ type, x, y, r: 46, spin: Math.random() * 6 });
      } else if (type === "berg") {
        obstacles.push({ type, x, y, r: 30 + Math.random() * 16 });
      } else if (type === "kelp") {
        zones.push({ type, x, y, w: 120, h: 220 });
      } else {
        obstacles.push({
          type,
          x,
          y,
          r: type === "stake" ? 7 : 15,
          drift: type === "wreck" ? (Math.random() - 0.5) * 8 : 0,
        });
      }
    }
  }
  /* hjerter: grundrate + ét ekstra pr. forsøg på benet (nåden) */
  const heartRate = (s.hearts + attempts[leg] * 0.26) * (SPAWN_STEP / 1000);
  if (Math.random() < heartRate) {
    drops.push({ x: 40 + Math.random() * (BASE_W - 80), y, ph: Math.random() * 6 });
  }
  if (
    s.currents &&
    Math.random() < 1.5 * mercyDensity() * (isHomebound(leg) ? 1.3 : 1) * (SPAWN_STEP / 1000)
  ) {
    zones.push({
      type: "current",
      x: 0,
      y,
      w: BASE_W,
      h: 240,
      dir: Math.random() < 0.5 ? -1 : 1,
      k: 60 + Math.random() * 50,
    });
  }
  if (s.whales && Math.random() < 0.4 * dens) {
    fx.push({ type: "whale", x: 40 + Math.random() * (BASE_W - 80), y, ph: Math.random() * 6 });
  }
}

function fillAhead() {
  while (spawnCursor < progressY + AHEAD) {
    spawnCursor += SPAWN_STEP;
    if (spawnCursor > 300) spawnBand(spawnCursor);
  }
}

function resetLegEntities() {
  obstacles = [];
  drops = [];
  zones = [];
  fx = [];
  squall = null;
  spawnCursor = progressY;
  equatorCrossed = false;
}

/* ── Input — træk hvor som helst, skibet følger relativ bevægelse ───── */
let dragging = false;
let dragX = 0;
const keys = new Set();

function firstInput() {
  if (mode === "intro") {
    el.intro.hidden = true;
    mode = "sail";
    showTitle();
    return true;
  }
  if (paused) {
    paused = false;
    el.paused.hidden = true;
    last = 0;
    return true;
  }
  return false;
}

el.main.addEventListener("pointerdown", (e) => {
  if (firstInput()) return;
  dragging = true;
  dragX = e.clientX;
});
el.main.addEventListener("pointermove", (e) => {
  if (!dragging || mode !== "sail" || paused) return;
  const dx = (e.clientX - dragX) / viewScale;
  dragX = e.clientX;
  ship.target = Math.max(26, Math.min(BASE_W - 26, ship.target + dx * 1.15));
});
const endDrag = () => {
  dragging = false;
};
el.main.addEventListener("pointerup", endDrag);
el.main.addEventListener("pointercancel", endDrag);
el.main.addEventListener(
  "touchmove",
  (e) => {
    if (dragging) e.preventDefault();
  },
  { passive: false },
);
addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
    keys.add(e.key.toLowerCase());
    firstInput();
  }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

/* ── Auto-pause: fane-skift/blur, genoptager aldrig selv ────────────── */
function autoPause() {
  if (mode === "ending" || mode === "intro" || paused) return;
  paused = true;
  dragging = false;
  el.paused.hidden = false;
}
addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});

/* ── Etape-skift ────────────────────────────────────────────────────── */
function showTitle() {
  titleText = STAGES[stageForLeg(leg)].name;
  titleT = 2.6;
}

function enterLeg(nextLeg) {
  leg = nextLeg;
  progressY = 0;
  resetLegEntities();
  saveCheckpoint();
  showTitle();
}

function founder() {
  founderT = 1.3;
}

function applyFounder() {
  attempts[leg]++;
  hp = 3;
  ship.cracks = [];
  ship.x = ship.target = BASE_W / 2;
  ship.vx = 0;
  progressY = 0;
  resetLegEntities();
  saveCheckpoint();
  showTitle();
}

function damage() {
  if (invulnT > 0 || founderT > 0) return;
  hp--;
  invulnT = 1;
  if (!reduced) shakeT = 0.35;
  ship.cracks.push({ a: Math.random() * 6, b: Math.random() * 6 });
  repairIfPossible();
  if (hp <= 0) founder();
}

/* Fem hjerter reparerer ét point skade — automatisk, ingen knapper */
function repairIfPossible() {
  while (hp < 3 && hp > 0 && hearts >= 5) {
    hearts -= 5;
    hp++;
    ship.cracks.pop();
    fx.push({ type: "repair", t: 0.9 });
  }
}

function collectHeart(d) {
  const gain = isHomebound(leg) ? 2 : 1;
  hearts += gain;
  if (gain === 2) flareT = 0.9;
  wakeT = 0.8;
  fx.push({ type: "flare", x: d.x, y: d.y, t: 0.5 });
  repairIfPossible();
}

/* ── Opdatering ─────────────────────────────────────────────────────── */
let last = 0;

function update(dt) {
  sceneT += dt;
  invulnT = Math.max(0, invulnT - dt);
  shakeT = Math.max(0, shakeT - dt);
  bleachT = Math.max(0, bleachT - dt);
  flareT = Math.max(0, flareT - dt);
  wakeT = Math.max(0, wakeT - dt);
  titleT = Math.max(0, titleT - dt);
  fx = fx.filter((f) => {
    if (f.t !== undefined) {
      f.t -= dt;
      return f.t > 0;
    }
    return f.y > progressY - 400 && f.y < progressY + AHEAD + 100;
  });

  if (mode === "turn") {
    updateTurn(dt);
    return;
  }
  if (mode === "ending") {
    updateEnding(dt);
    return;
  }
  if (mode !== "sail") return;

  if (founderT > 0) {
    founderT -= dt;
    if (founderT <= 0) applyFounder();
    return;
  }

  const s = STAGES[stageForLeg(leg)];
  const speed = s.speed * (isHomebound(leg) ? 1.08 : 1);
  progressY += speed * dt;
  fillAhead();

  /* styring med vægt: en kurve, ikke et trin */
  if (keys.has("arrowleft") || keys.has("a")) ship.target -= 230 * dt;
  if (keys.has("arrowright") || keys.has("d")) ship.target += 230 * dt;
  ship.target = Math.max(26, Math.min(BASE_W - 26, ship.target));
  let push = 0;

  /* tværstrømme (Kap Horn) og squalls (Ækvator) flytter skibet uden input */
  for (const z of zones) {
    if (z.type !== "current") continue;
    if (progressY > z.y - 60 && progressY < z.y + z.h) {
      push += z.dir * z.k * mercyCurrent() * (isHomebound(leg) ? 1.2 : 1);
    }
  }
  if (s.squalls) {
    squallTimer -= dt;
    if (!squall && squallTimer <= 0) {
      squall = { dir: Math.random() < 0.5 ? -1 : 1, t: 3 };
      squallTimer = 9 + Math.random() * 7;
    }
    if (squall) {
      squall.t -= dt;
      push += squall.dir * 85;
      if (squall.t <= 0) squall = null;
    }
  }
  /* malstrømme trækker mod centrum */
  for (const o of obstacles) {
    if (o.type !== "pool") continue;
    const dy = o.y - progressY;
    if (Math.abs(dy) < 130) {
      const dx = o.x - ship.x;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 150) push += (dx / d) * 95 * mercyCurrent();
    }
  }
  /* kelp bremser, men skader ikke */
  let drag = 1;
  for (const z of zones) {
    if (
      z.type === "kelp" &&
      progressY > z.y - 60 &&
      progressY < z.y + z.h &&
      Math.abs(ship.x - (z.x + z.w / 2)) < z.w / 2 + 20
    ) {
      drag = 0.62;
    }
  }
  progressY += speed * dt * (drag - 1);

  const ax = (ship.target - ship.x) * 6 - ship.vx * 3.4;
  ship.vx += (Math.max(-520, Math.min(520, ax)) + push * 2.6) * dt;
  ship.x += ship.vx * dt;
  if (ship.x < 20 || ship.x > BASE_W - 20) {
    ship.x = Math.max(20, Math.min(BASE_W - 20, ship.x));
    ship.vx *= -0.3;
  }
  ship.target += push * dt; // strøm flytter også sigtet, så man skal arbejde imod
  ship.target = Math.max(26, Math.min(BASE_W - 26, ship.target));

  /* drivende vraggods */
  for (const o of obstacles) {
    if (o.drift) o.x = Math.max(24, Math.min(BASE_W - 24, o.x + o.drift * dt));
    if (o.type === "pool") o.spin += dt * 2.4;
  }

  /* kollisioner */
  for (const o of obstacles) {
    const dy = o.y - progressY;
    if (dy < -60 || dy > 90) continue;
    const dx = o.x - ship.x;
    const hitR = o.r + 13;
    if (Math.abs(dx) < hitR && Math.abs(dy) < hitR + 8) {
      if (o.type === "pool") {
        if (Math.hypot(dx, dy) < 16) damage();
      } else {
        damage();
        o.y = progressY - 120; // læg den agterud, så samme klods ikke rammer to gange
      }
    }
  }
  obstacles = obstacles.filter((o) => o.y > progressY - 420);
  zones = zones.filter((z) => z.y > progressY - 500);

  /* hjerter */
  for (const d of drops) {
    d.x += Math.sin(sceneT * 1.4 + d.ph) * 12 * dt;
    const dy = d.y - progressY;
    if (Math.abs(dy) < 26 && Math.abs(d.x - ship.x) < 24) {
      d.hit = true;
      collectHeart(d);
    }
  }
  drops = drops.filter((d) => !d.hit && d.y > progressY - 420);

  /* sne (Kap Horn) */
  if (s.snow && !reduced) {
    if (snowflakes.length < 90 && Math.random() < 0.5) {
      const d = Math.random() < 0.5 ? 1 : -1;
      snowflakes.push({
        x: d === 1 ? -6 : BASE_W + 6,
        y: Math.random() * BASE_H,
        v: 90 + Math.random() * 120,
        d,
      });
    }
    for (const f of snowflakes) {
      f.x += f.v * f.d * dt; // sidelæns hen over skærmen
      f.y += 26 * dt;
    }
    snowflakes = snowflakes.filter((f) => f.x > -12 && f.x < BASE_W + 12 && f.y < BASE_H + 12);
  } else {
    snowflakes = [];
  }

  /* ækvatorlinjen: bleach + tekst, én gang pr. ben */
  if (s.equator && !equatorCrossed && progressY > LEG_LEN / 2) {
    equatorCrossed = true;
    if (!reduced) bleachT = 0.7;
  }

  /* benets afslutning */
  if (progressY >= LEG_LEN) {
    if (leg === 4) {
      mode = "turn";
      turnPhase = 0;
      turnT = 0;
      ship.vx = 0;
      resetLegEntities();
    } else if (leg === 9) {
      mode = "ending";
      sunT = 0;
      resetLegEntities();
      clearCheckpoint();
    } else {
      enterLeg(leg + 1);
    }
  }
}

/* Vendepunktet */
let figure = { x: 0, y: 0, s: 0.35, walk: 0 };
const DESCENT_PATH = [
  [396, 118],
  [352, 186],
  [386, 252],
  [338, 326],
  [296, 398],
  [252, 462],
];
const BOARD_POS = [188, SHIP_Y - 6];

function updateTurn(dt) {
  turnT += dt;
  const [phase, dur] = TURN_PHASES[turnPhase];
  const p = Math.min(1, turnT / dur);
  if (phase === "arrive") {
    ship.x += (188 - ship.x) * Math.min(1, dt * 2.5);
  } else if (phase === "descent") {
    /* hendes nedstigning er det eneste, der bevæger sig */
    const seg = p * (DESCENT_PATH.length - 1);
    const i = Math.min(DESCENT_PATH.length - 2, Math.floor(seg));
    const f = seg - i;
    figure.x = DESCENT_PATH[i][0] + (DESCENT_PATH[i + 1][0] - DESCENT_PATH[i][0]) * f;
    figure.y = DESCENT_PATH[i][1] + (DESCENT_PATH[i + 1][1] - DESCENT_PATH[i][1]) * f;
    figure.s = 0.35 + 0.55 * p;
    figure.walk += dt * 7;
  } else if (phase === "board") {
    figure.x += (BOARD_POS[0] - figure.x) * Math.min(1, dt * 3);
    figure.y += (BOARD_POS[1] - figure.y) * Math.min(1, dt * 3);
    figure.s = 0.9 + 0.1 * p;
    figure.walk += dt * 6;
  } else if (phase === "light") {
    /* lyset skifter ikke — det bygger, over ca. tre sekunder */
    lightT = p;
  }
  if (turnT >= dur) {
    turnPhase++;
    turnT = 0;
    if (phase === "light") lightT = 1;
    if (turnPhase >= TURN_PHASES.length) {
      enterLeg(5);
      mode = "sail";
    }
  }
}

/* Slutningen: solen, der har været fjern hele spillet, står op */
async function updateEnding(dt) {
  sunT = Math.min(1, sunT + dt / 4);
  ship.x += (BASE_W / 2 - ship.x) * Math.min(1, dt);
  if (sunT >= 1 && !endingStarted) {
    endingStarted = true;
    /* Beskeden hentes FØRST nu — dynamisk import, egen chunk. Den findes
       ikke i sidens kilde eller i denne bundle før dette øjeblik. */
    const { getEndingMessage } = await import("./ending.js");
    typeMessage(getEndingMessage());
  }
}

function typeMessage(text) {
  el.endingScreen.hidden = false;
  el.endingScreen.classList.add("flex");
  el.endingHearts.textContent = `♥ ${hearts}`;
  if (reduced) {
    el.endingText.textContent = text;
    el.endingChoices.hidden = false;
    return;
  }
  let i = 0;
  const tick = () => {
    i++;
    el.endingText.textContent = text.slice(0, i);
    if (i < text.length) {
      setTimeout(tick, 52);
    } else {
      setTimeout(() => {
        el.endingChoices.hidden = false;
      }, 900);
    }
  };
  tick();
}

el.sailAgain.addEventListener("click", () => {
  clearCheckpoint();
  location.reload();
});

/* ── Tegning ────────────────────────────────────────────────────────── */
function drawWater(pal, s) {
  const g = ctx.createLinearGradient(0, 0, 0, BASE_H);
  g.addColorStop(0, pal.deep);
  g.addColorStop(1, pal.lite);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  /* vandet flyder nedad forbi skibet: tynde bølgelinjer i verdensrum */
  const frozen = mode === "turn"; // hun går ned — alt andet står stille
  const amp = s.swell * (reduced ? 0.25 : 1) * (frozen ? 0 : 1);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  const t = frozen ? 0 : sceneT;
  for (let i = 0; i < 14; i++) {
    const wy = ((((i * 64 - (progressY % 64)) % (BASE_H + 64)) + BASE_H + 64) % (BASE_H + 64)) - 32;
    ctx.beginPath();
    for (let x = 0; x <= BASE_W; x += 14) {
      const y = wy + Math.sin(x * 0.045 + t * 1.6 + i) * (2 + amp * 0.35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /* strømfelter gør trækket læsbart før det mærkes */
  for (const z of zones) {
    if (z.type === "current") {
      const sy = SHIP_Y - (z.y - progressY);
      if (sy < -z.h || sy > BASE_H + z.h) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      for (let i = 0; i < 7; i++) {
        const yy = sy - (i / 7) * z.h;
        const off = frozen ? 0 : ((sceneT * z.k * 1.6) % 40) * z.dir;
        ctx.beginPath();
        ctx.moveTo(((((i * 67 + off) % BASE_W) + BASE_W) % BASE_W) - 20, yy);
        ctx.lineTo(((((i * 67 + off) % BASE_W) + BASE_W) % BASE_W) + 26 * z.dir - 20, yy + 4);
        ctx.stroke();
      }
    }
    if (z.type === "kelp") {
      const sy = SHIP_Y - (z.y - progressY);
      ctx.strokeStyle = "rgba(126,176,138,0.5)";
      for (let i = 0; i < 8; i++) {
        const kx = z.x + (i / 8) * z.w;
        ctx.beginPath();
        for (let j = 0; j <= 5; j++) {
          const yy = sy - (j / 5) * z.h;
          const xx = kx + Math.sin(j * 1.3 + i + (frozen ? 0 : sceneT)) * 6;
          if (j === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
    }
  }
}

function drawObstacle(o, alpha) {
  const sy = SHIP_Y - (o.y - progressY);
  if (sy < -80 || sy > BASE_H + 80) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(o.x, sy);
  ctx.strokeStyle = "rgba(235,240,250,0.85)";
  ctx.fillStyle = "rgba(10,16,24,0.85)";
  ctx.lineWidth = 1.4;
  if (o.type === "stake") {
    ctx.beginPath();
    ctx.moveTo(-2, 10);
    ctx.lineTo(0, -12);
    ctx.moveTo(4, 9);
    ctx.lineTo(5, -8);
    ctx.stroke();
  } else if (o.type === "rock") {
    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.lineTo(-6, -9);
    ctx.lineTo(4, -6);
    ctx.lineTo(13, 4);
    ctx.lineTo(6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (o.type === "wreck") {
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.quadraticCurveTo(0, 12, 16, 0);
    ctx.moveTo(-9, 0);
    ctx.lineTo(-6, -10);
    ctx.stroke();
  } else if (o.type === "debris") {
    ctx.strokeRect(-8, -4, 9, 7);
    ctx.strokeRect(2, -1, 6, 5);
  } else if (o.type === "berg") {
    ctx.strokeStyle = "rgba(220,235,245,0.95)";
    ctx.fillStyle = "rgba(190,215,230,0.28)";
    ctx.beginPath();
    ctx.moveTo(-o.r, o.r * 0.4);
    ctx.lineTo(-o.r * 0.4, -o.r);
    ctx.lineTo(o.r * 0.5, -o.r * 0.55);
    ctx.lineTo(o.r, o.r * 0.35);
    ctx.lineTo(0, o.r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (o.type === "pool") {
    ctx.strokeStyle = "rgba(210,225,240,0.6)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, o.r - i * 13, o.spin + i, o.spin + i + 4.6);
      ctx.stroke();
    }
  } else if (o.type === "boat") {
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.quadraticCurveTo(0, 9, 12, 3);
    ctx.lineTo(9, -2);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeart(d, alpha) {
  const sy = SHIP_Y - (d.y - progressY);
  if (sy < -40 || sy > BASE_H + 40) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(d.x, sy);
  const pulse = reduced ? 1 : 1 + Math.sin(sceneT * 3 + d.ph) * 0.12;
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = "rgba(224,58,47,0.95)";
  ctx.shadowColor = "rgba(224,58,47,0.8)";
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-9, -2, -5, -10, 0, -4);
  ctx.bezierCurveTo(5, -10, 9, -2, 0, 6);
  ctx.stroke();
  ctx.restore();
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, SHIP_Y);
  const s = STAGES[stageForLeg(leg)];
  const frozen = mode === "turn";
  const roll =
    (frozen ? 0 : Math.sin(sceneT * 1.7) * s.roll * (reduced ? 0.3 : 1)) + ship.vx * 0.0007;
  ctx.rotate(roll);
  /* vendingen: skibet drejer helt rundt hen over fasen — verden vender med */
  if (mode === "turn" && TURN_PHASES[turnPhase][0] === "turn") {
    ctx.rotate(Math.PI * 2 * Math.min(1, turnT / 1.6));
  }
  if (invulnT > 0 && Math.floor(sceneT * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  if (founderT > 0) {
    ctx.globalAlpha = Math.max(0, founderT / 1.3);
    ctx.rotate((1.3 - founderT) * 0.9);
  }

  /* langskib set ovenfra — tynde streger, spidst i begge ender */
  ctx.strokeStyle = "rgba(240,244,252,0.95)";
  ctx.fillStyle = "rgba(12,18,28,0.9)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.quadraticCurveTo(12, -8, 11, 8);
  ctx.quadraticCurveTo(9, 22, 0, 30);
  ctx.quadraticCurveTo(-9, 22, -11, 8);
  ctx.quadraticCurveTo(-12, -8, 0, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); // planker
  ctx.moveTo(-7, -12);
  ctx.quadraticCurveTo(0, -16, 7, -12);
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(0, -2, 8, 2);
  ctx.stroke();

  /* sejlet fanger etapens lys */
  ctx.fillStyle = lerpHex(s.tint, "#ffffff", 0.15);
  ctx.globalAlpha *= 0.32;
  ctx.fillRect(-13, -6, 26, 13);
  ctx.globalAlpha = invulnT > 0 && Math.floor(sceneT * 12) % 2 === 0 ? 0.45 : 1;
  ctx.strokeRect(-13, -6, 26, 13);
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.stroke();

  /* revner i skroget — bliver stående til de repareres */
  ctx.strokeStyle = "rgba(224,58,47,0.9)";
  ctx.lineWidth = 1.1;
  for (const c of ship.cracks) {
    ctx.beginPath();
    ctx.moveTo(-6 + c.a, -18 + c.b * 2);
    ctx.lineTo(-1 + c.b, -10 + c.a * 2);
    ctx.lineTo(4 - c.a, -14 + c.b);
    ctx.stroke();
  }

  /* hun er ombord på hjemturen — en lille skikkelse agter */
  if (lightT > 0.6) drawFigureShape(0, 20, 0.34, 0);

  ctx.restore();

  /* kølvand */
  if (mode === "sail" && founderT <= 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + wakeT * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ship.x - 8, SHIP_Y + 30);
    ctx.lineTo(ship.x - 16, SHIP_Y + 78);
    ctx.moveTo(ship.x + 8, SHIP_Y + 30);
    ctx.lineTo(ship.x + 16, SHIP_Y + 78);
    ctx.stroke();
  }
}

/* Silhuetten med det mørke hår — ingen ansigtstræk, uanset størrelse */
function drawFigureShape(x, y, scale, walk) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "rgba(240,244,252,0.9)";
  ctx.fillStyle = "rgba(8,12,18,0.95)";
  ctx.lineWidth = 1.6 / Math.max(scale, 0.35);
  const sway = Math.sin(walk) * 2.4;
  /* hår — mørkt, falder forbi skuldrene */
  ctx.beginPath();
  ctx.moveTo(-6, -26);
  ctx.quadraticCurveTo(-9, -12, -6, -2);
  ctx.lineTo(6, -2);
  ctx.quadraticCurveTo(9, -12, 6, -26);
  ctx.quadraticCurveTo(0, -33, -6, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  /* krop og ben — enkle streger */
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 14);
  ctx.moveTo(0, 14);
  ctx.lineTo(-4 + sway, 26);
  ctx.moveTo(0, 14);
  ctx.lineTo(4 - sway, 26);
  ctx.moveTo(0, 4);
  ctx.lineTo(-6, 12);
  ctx.moveTo(0, 4);
  ctx.lineTo(6, 12);
  ctx.stroke();
  ctx.restore();
}

/* Andesbjergene, husene og havnen — tegnes på Chile-benene og i vendescenen */
function drawChile(nearShore) {
  ctx.save();
  /* bjergsilhuet langs højre side */
  ctx.fillStyle = "rgba(9,16,24,0.96)";
  ctx.beginPath();
  ctx.moveTo(BASE_W, 0);
  ctx.lineTo(BASE_W - 26, 60);
  ctx.lineTo(BASE_W - 62, 130);
  ctx.lineTo(BASE_W - 30, 210);
  ctx.lineTo(BASE_W - 78, 300);
  ctx.lineTo(BASE_W - 44, 380);
  ctx.lineTo(BASE_W - 90, 470);
  ctx.lineTo(BASE_W, 520);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(240,244,252,0.5)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  /* snedækkede toppe */
  ctx.fillStyle = "rgba(235,242,250,0.85)";
  for (const [px, py] of [
    [BASE_W - 26, 60],
    [BASE_W - 30, 210],
    [BASE_W - 44, 380],
  ]) {
    ctx.beginPath();
    ctx.moveTo(px - 9, py + 12);
    ctx.lineTo(px, py);
    ctx.lineTo(px + 9, py + 12);
    ctx.closePath();
    ctx.fill();
  }
  if (nearShore) {
    /* Valparaíso: husene som små farveblokke op ad skråningen —
       spillets eneste mættede farve */
    for (let i = 0; i < 26; i++) {
      const gx = BASE_W - 118 + ((i * 37) % 96);
      const gy = 402 + Math.floor(i / 6) * 22 + ((i * 13) % 9);
      ctx.fillStyle = HOUSE_COLORS[i % HOUSE_COLORS.length];
      ctx.fillRect(gx, gy, 9 + (i % 3) * 3, 8);
      ctx.strokeStyle = "rgba(10,14,20,0.7)";
      ctx.strokeRect(gx, gy, 9 + (i % 3) * 3, 8);
    }
    /* molen */
    ctx.strokeStyle = "rgba(240,244,252,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(BASE_W - 150, 470);
    ctx.lineTo(230, 486);
    ctx.stroke();
  }
  ctx.restore();
}

/* Lysmekanikken — må kunne aflæses uden at blive forklaret */
function drawLight() {
  if (mode === "ending") return;
  if (lightT < 1) {
    /* udad: solen er lille og kold forude, og havet foran ligger i mørke */
    const dark = ctx.createLinearGradient(0, 0, 0, SHIP_Y + 60);
    const a = 0.8 * (1 - lightT);
    dark.addColorStop(0, `rgba(3,6,10,${a})`);
    dark.addColorStop(0.55, `rgba(3,6,10,${a * 0.55})`);
    dark.addColorStop(1, "rgba(3,6,10,0)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, BASE_W, SHIP_Y + 60);
    ctx.globalAlpha = 1 - lightT;
    ctx.fillStyle = "rgba(210,225,240,0.9)";
    ctx.beginPath();
    ctx.arc(BASE_W / 2, 26, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (lightT > 0) {
    /* hjemad: hun bærer lyset — en varm radius rejser med skibet */
    const r = 150 + 260 * lightT;
    const warm = ctx.createRadialGradient(ship.x, SHIP_Y, 20, ship.x, SHIP_Y, r);
    warm.addColorStop(0, `rgba(255,207,122,${0.26 * lightT})`);
    warm.addColorStop(0.6, `rgba(255,207,122,${0.1 * lightT})`);
    warm.addColorStop(1, "rgba(255,207,122,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }
}

/* Hvor langt forude ting kan ses — udad kort, hjemad langt */
function visibilityAlpha(worldY) {
  const ahead = worldY - progressY;
  if (ahead <= 0) return 1;
  const visD = 175 + (420 - 175) * lightT;
  return Math.max(0, Math.min(1, (visD - ahead) / 70));
}

function drawHud() {
  ctx.font = "13px 'Space Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(240,244,252,0.9)";
  ctx.fillText(`♥ ${hearts}`, BASE_W - 14, 30);
  if (flareT > 0) {
    ctx.fillStyle = `rgba(255,207,122,${flareT})`;
    ctx.fillText("2x", BASE_W - 14, 48);
  }
  /* tre små skibe — skadekapacitet, dæmpes når skaden tages */
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(20 + i * 22, BASE_H - 24);
    ctx.strokeStyle = i < hp ? "rgba(240,244,252,0.9)" : "rgba(240,244,252,0.22)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.quadraticCurveTo(0, 7, 7, 2);
    ctx.lineTo(5, -2);
    ctx.lineTo(-5, -2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -9);
    ctx.stroke();
    ctx.restore();
  }
  /* etapenavn — to sekunder, centreret, monospace */
  if (titleT > 0) {
    const a = Math.min(1, titleT / 0.5) * Math.min(1, (2.6 - titleT) / 0.4);
    ctx.globalAlpha = a;
    ctx.font = "16px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(240,244,252,0.95)";
    ctx.fillText(titleText, BASE_W / 2, BASE_H * 0.3);
    ctx.globalAlpha = 1;
  }
}

function render() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(viewOffX, viewOffY);
  ctx.scale(viewScale, viewScale);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, BASE_W, BASE_H);
  ctx.clip();

  if (shakeT > 0)
    ctx.translate((Math.random() - 0.5) * 6 * shakeT, (Math.random() - 0.5) * 6 * shakeT);

  const s = STAGES[stageForLeg(leg)];
  const pal = palette();
  drawWater(pal, s);

  /* tåge (Nordsøen) */
  if (s.fog) {
    for (let i = 0; i < 3; i++) {
      const fy = ((i * 260 + sceneT * 6) % (BASE_H + 120)) - 60;
      ctx.fillStyle = "rgba(200,212,224,0.07)";
      ctx.fillRect(-20, fy, BASE_W + 40, 60);
    }
  }

  /* hvalrygge — afstand, ikke fare */
  for (const f of fx) {
    if (f.type !== "whale") continue;
    const sy = SHIP_Y - (f.y - progressY);
    if (sy < -40 || sy > BASE_H + 40) continue;
    const surface = Math.sin(sceneT * 0.7 + f.ph);
    if (surface > 0.1) {
      ctx.strokeStyle = `rgba(200,215,230,${0.5 * surface})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(f.x, sy, 16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }

  if (s.andes || mode === "turn") {
    const nearShore =
      mode === "turn" ||
      (leg === 4 && progressY > LEG_LEN * 0.62) ||
      (leg === 5 && progressY < LEG_LEN * 0.35);
    drawChile(nearShore);
  }

  /* ækvatorlinjen */
  if (s.equator) {
    const eq = SHIP_Y - (LEG_LEN / 2 - progressY);
    if (eq > -20 && eq < BASE_H + 20) {
      ctx.strokeStyle = "rgba(242,234,210,0.7)";
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(0, eq);
      ctx.lineTo(BASE_W, eq);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "11px 'Space Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(242,234,210,0.85)";
      ctx.fillText("THE EQUATOR", BASE_W / 2, eq - 8);
    }
  }

  for (const o of obstacles) drawObstacle(o, visibilityAlpha(o.y));
  for (const d of drops) drawHeart(d, visibilityAlpha(d.y));

  /* hjerte-flares */
  for (const f of fx) {
    if (f.type === "flare") {
      const sy = SHIP_Y - (f.y - progressY);
      ctx.strokeStyle = `rgba(224,58,47,${f.t * 1.6})`;
      ctx.beginPath();
      ctx.arc(f.x, sy, (0.5 - f.t) * 60 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawShip();

  /* squall-regn */
  if (squall && !reduced) {
    ctx.strokeStyle = "rgba(220,232,244,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const rx = (i * 71 + sceneT * 500 * squall.dir) % BASE_W;
      const ry = (i * 113 + sceneT * 700) % BASE_H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 14 * squall.dir, ry + 10);
      ctx.stroke();
    }
  }

  /* sne på tværs */
  ctx.fillStyle = "rgba(240,246,252,0.8)";
  for (const f of snowflakes) {
    ctx.fillRect(f.x, f.y, 1.6, 1.6);
  }

  drawLight();

  /* nedstigningen og ombordstigningen */
  if (mode === "turn" && turnPhase >= 2 && turnPhase <= 3) {
    drawFigureShape(figure.x, figure.y, figure.s, figure.walk);
  }

  /* slutningens solopgang — nær og varm, som på /gio */
  if (mode === "ending") {
    ctx.fillStyle = "rgba(38,50,60,1)";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(30 + i * 48, 90 + (i % 3) * 14, 2, 34); // hjemlige bundgarnspæle
    }
    const g = ctx.createRadialGradient(
      BASE_W / 2,
      BASE_H * 1.1,
      40,
      BASE_W / 2,
      BASE_H * 1.1,
      BASE_H * 1.15,
    );
    g.addColorStop(0, `rgba(255,207,122,${0.85 * sunT})`);
    g.addColorStop(0.4, `rgba(255,209,102,${0.4 * sunT})`);
    g.addColorStop(0.75, `rgba(224,58,47,${0.12 * sunT})`);
    g.addColorStop(1, "rgba(224,58,47,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  /* ækvator-bleach */
  if (bleachT > 0) {
    ctx.fillStyle = `rgba(250,248,240,${bleachT * 0.9})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  drawHud();
  ctx.restore();
}

/* ── Én rAF ─────────────────────────────────────────────────────────── */
function frame(ts) {
  const dt = last ? Math.min(33, ts - last) * 0.001 : 0; // unclamped explodes on a dropped frame
  last = ts;
  if (!paused) update(dt);
  render();
  requestAnimationFrame(frame);
}

/* Lågen først — spillet starter ikke, før siden faktisk er åbnet */
guardPage().then(() => {
  requestAnimationFrame(frame);
});
