import { guardPage } from "../shared/gate.js";

/**
 * THE SHIP OF LOVE — /gio/voyage
 *
 * Én komplet rejse, Danmark → Valparaíso → hjem, i ti ben over de samme
 * fem etaper — hele turen på ~2½-3 minutter, og der sejles FORBI noget
 * hele tiden (SIGHTS: kyster, fyrtårn, skibe, delfiner, sydlys). Ingen score, ingen leaderboard, ingen forbindelse til
 * arkadens highscore-system — bevidst. Hjerter er den eneste valuta, og
 * de gemmes ingen steder efter sessionen.
 *
 * Lysmekanikken er kernen og står ingen steder i interfacet: udad ligger
 * havet foran skibet i mørke og forhindringer dukker sent op; hjemad er
 * hun ombord og bærer lyset — en varm radius rejser med skibet, og alt
 * ses flere sekunder før. Hjemturen er hårdere i indhold, men kan læses.
 *
 * Der er ingen liv at miste: nuestro amor tiene vidas infinitas — et
 * sammenstød ryster og ridser, men koster intet, og rejsen kan ikke
 * ende i forlis. Hjerterne heler ridserne og tælles ved ankomsten.
 *
 * Canvas-kontrakten: fast virtuel opløsning 420×760 letterboxet, dpr-cap
 * 2, setTransform efter resize, dt clamped til 33 ms, én rAF.
 */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Verden ─────────────────────────────────────────────────────────── */
const BASE_W = 420;
const BASE_H = 760;
const SHIP_Y = 530;
const LEG_LEN = 1500; // world-px pr. ben — ca. 14 sekunders sejlads; hele rejsen ~2½ min
const CHECKPOINT_KEY = "gio_voyage_checkpoint";

/* De fem etaper. Benene 0-4 er udrejsen (etape 0→4), benene 5-9 er
   hjemrejsen (etape 4→0). Farver lerpes kontinuerligt hen over grænserne. */
const STAGES = [
  {
    name: "EL MAR DEL NORTE",
    deep: "#26323c",
    lite: "#3b4a52",
    tint: "#9fb4c4",
    speed: 95,
    swell: 5,
    roll: 0.05,
    spawn: { tentacle: 2.2, rock: 0.9 },
    fog: true,
    hearts: 3.0,
  },
  {
    name: "EL ATLÁNTICO",
    deep: "#132b4e",
    lite: "#1e416f",
    tint: "#7fa8d8",
    speed: 105,
    swell: 11,
    roll: 0.09,
    spawn: { serpent: 1.4, rock: 0.5 },
    whales: true,
    hearts: 3.0,
  },
  {
    name: "EL ECUADOR",
    deep: "#3f7187",
    lite: "#8fc0ca",
    tint: "#f2ead2",
    speed: 100,
    swell: 2,
    roll: 0.03,
    spawn: { jelly: 2.2 },
    squalls: true,
    equator: true,
    hearts: 3.0,
  },
  {
    name: "CABO DE HORNOS",
    deep: "#04070c",
    lite: "#0f171f",
    tint: "#5a6b7a",
    speed: 112,
    swell: 14,
    roll: 0.14,
    spawn: { berg: 1.7, rock: 0.8, pool: 0.55 },
    currents: true,
    snow: true,
    hearts: 3.6,
  },
  {
    name: "LA COSTA CHILENA",
    deep: "#274757",
    lite: "#4a7a86",
    tint: "#ffcf7a",
    speed: 95,
    swell: 6,
    roll: 0.06,
    spawn: { kelp: 1.1, crab: 1.2 },
    andes: true,
    hearts: 3.2,
  },
];

/* Talebobler fra skibet — hans egne replikker, tre ud og tre hjem,
   med hendes navn vævet ind hvor det falder naturligt ("flaca" og
   "mi valquiria" beholder deres pladser). Én pr. ben, vist ~5 s. */
const BUBBLES = {
  0: "¡Necesito cruzar el Pacífico por un beso tuyo, Gio!",
  2: "Necesito más completos que remos... pero más a ti, flaca.",
  4: "Zarpé sin brújula: mi corazón siempre te necesitó, Gio.",
  5: "Necesito llevarte a Kattegat, Gio, ¡los dioses se enamorarán!",
  7: "Necesito tu risa más que el viento, mi valquiria.",
  9: "Solo necesito una cosa, Gio: ¡que zarpes conmigo otra vez!",
};
const BUBBLE_P = { 0: 0.6, 2: 0.42, 4: 0.16, 5: 0.4, 7: 0.44, 9: 0.5 };

const stageForLeg = (leg) => (leg < 5 ? leg : 9 - leg);
const isHomebound = (leg) => leg >= 5;

/* Valparaísos huse — den eneste mættede farve i hele spillet */
const HOUSE_COLORS = ["#e0704a", "#6e8fff", "#ffd166", "#7eb08a", "#e03a2f", "#a8e0e8"];

/* Seværdigheder — det man sejler FORBI. Rejsen skal føles som lande der
   passerer, ikke som åbent hav i minutter: hver etape har 2-3 navngivne
   ting i siden af billedet, med en lille billedtekst når de glider ind.
   p er brøkdel af benet; side -1 = venstre, 1 = højre, 0 = ved skibet. */
const SIGHTS = [
  [
    { p: 0.02, kind: "sea", label: "KATTEGAT" },
    {
      p: 0.07,
      kind: "coast",
      side: 1,
      label: "DINAMARCA, A POPA",
      place: "DINAMARCA",
      houses: true,
      gulls: true,
    },
    { p: 0.45, kind: "lighthouse", side: -1, label: "UN FARO EN LA NIEBLA" },
    {
      p: 0.82,
      kind: "coast",
      side: 1,
      label: "LOS ACANTILADOS BLANCOS DE DOVER",
      place: "DOVER",
      cliffs: true,
    },
  ],
  [
    { p: 0.2, kind: "island", side: -1, label: "LAS AZORES", place: "AZORES", peaks: true },
    { p: 0.52, kind: "ship", side: 1, label: "UN CARGUERO, RUMBO AL SUR", vyw: -150 },
    {
      p: 0.85,
      kind: "island",
      side: 1,
      label: "LAS ISLAS CANARIAS",
      place: "CANARIAS",
      peaks: true,
    },
  ],
  [
    { p: 0.16, kind: "island", side: -1, label: "CABO VERDE", place: "CABO VERDE", palms: true },
    { p: 0.62, kind: "dolphins", side: 0, label: "DELFINES EN LA PROA" },
    { p: 0.88, kind: "coast", side: 1, label: "LA COSTA DE BRASIL", place: "BRASIL", palms: true },
  ],
  [
    { p: 0.28, kind: "island", side: -1, label: "LAS MALVINAS", place: "MALVINAS" },
    { p: 0.52, kind: "aurora", side: 0, label: "LA AURORA AUSTRAL" },
    { p: 0.84, kind: "horn", side: 1, label: "CABO DE HORNOS", place: "CABO DE HORNOS" },
  ],
  [
    { p: 0.26, kind: "dolphins", side: 0, label: "PELÍCANOS EN LA COSTA", pel: true },
    {
      p: 0.52,
      kind: "ship",
      side: -1,
      label: "LOS PESCADORES DE QUINTAY",
      vyw: -25,
      fishing: true,
    },
  ],
  [
    {
      p: 0.24,
      kind: "ship",
      side: 1,
      label: "LOS PESCADORES SE DESPIDEN",
      vyw: -20,
      fishing: true,
    },
    { p: 0.66, kind: "dolphins", side: 0, label: "DELFINES DE FIESTA" },
  ],
  [
    {
      p: 0.26,
      kind: "horn",
      side: -1,
      label: "CABO DE HORNOS, UNA ÚLTIMA VEZ",
      place: "CABO DE HORNOS",
    },
    { p: 0.6, kind: "aurora", side: 0, label: "LA AURORA AUSTRAL, PARA ELLA" },
  ],
  [
    {
      p: 0.24,
      kind: "coast",
      side: -1,
      label: "LA COSTA DE BRASIL",
      place: "BRASIL",
      palms: true,
    },
    { p: 0.68, kind: "dolphins", side: 0, label: "PECES VOLADORES", fly: true },
  ],
  [
    {
      p: 0.22,
      kind: "island",
      side: 1,
      label: "LAS ISLAS CANARIAS",
      place: "CANARIAS",
      peaks: true,
    },
    { p: 0.56, kind: "ship", side: -1, label: "UN CARGUERO, RUMBO A CASA", vyw: -150 },
    {
      p: 0.86,
      kind: "island",
      side: -1,
      label: "LAS AZORES OTRA VEZ",
      place: "AZORES",
      peaks: true,
    },
  ],
  [
    {
      p: 0.2,
      kind: "coast",
      side: -1,
      label: "LOS ACANTILADOS OTRA VEZ",
      place: "DOVER",
      cliffs: true,
    },
    { p: 0.5, kind: "lighthouse", side: 1, label: "EL FARO, TODAVÍA ENCENDIDO" },
    { p: 0.76, kind: "sea", label: "KATTEGAT" },
    {
      p: 0.88,
      kind: "coast",
      side: 1,
      label: "DINAMARCA A LA VISTA",
      place: "DINAMARCA",
      houses: true,
      gulls: true,
    },
  ],
];

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
let hearts = 0;
let attempts = new Array(10).fill(0); // nåden, pr. ben
let lightT = 0; // 0 = udad (mørkt forude), 1 = hun er ombord
let sceneT = 0;
let shakeT = 0;
let hitT = 0; // rødt kant-blink ved træf
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
let squallTimer = 4;
let fx = []; // små effekter (heart-flare mm.)
let sights = []; // aktive seværdigheder
let sightQueue = []; // benets endnu ikke nåede seværdigheder
let captionText = "";
let captionT = 0;
let bubbleLines = [];
let bubbleT = 0;
let bubbleDone = false;

/* Vendepunktet i Valparaíso — to bevægelser: skibet hviler, et beat, så
   kommer hun ned ad bjerget (6 s, det eneste der bevæger sig), ombord,
   og først dér bygger lyset over ~3 s. */
const TURN_PHASES = [
  ["arrive", 1.6],
  ["beat", 0.8],
  ["descent", 5.0],
  ["board", 1.4],
  ["light", 2.4],
  ["turn", 1.4],
];
let turnPhase = 0;
let turnT = 0;

/* Slutningen */
let sunT = 0;
let endingStarted = false;
let endHearts = [];
let endHeartAcc = 0;

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
        const R = { tentacle: 9, serpent: 16, jelly: 12, crab: 12, rock: 15 };
        obstacles.push({
          type,
          x,
          y,
          r: R[type] ?? 15,
          drift:
            type === "serpent"
              ? (Math.random() - 0.5) * 10
              : type === "jelly"
                ? (Math.random() - 0.5) * 6
                : 0,
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
  sights = [];
  captionT = 0;
  bubbleT = 0;
  bubbleDone = false;
  sightQueue = SIGHTS[leg]
    .map((q) => ({ ...q, y: q.p * LEG_LEN }))
    .filter((q) => q.y > progressY)
    .sort((a, b) => a.y - b.y);
}

function caption(text) {
  captionText = text;
  captionT = 2.6;
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
  ship.target = Math.max(26, Math.min(BASE_W - 26, ship.target + dx * 1.25));
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

/* Etapeskift er SØMLØSE: intet ryddes og intet klippes — verdenen
   forskydes bare én benlængde tilbage, så alt på skærmen (uhyrer,
   hjerter, en halvt passeret kyst) sejler naturligt videre. Kun det
   nye bens seværdigheder lægges i kø. Nulstilling findes stadig, men
   kun ved forlis (applyFounder) og sceneskift — dér er den meningen. */
function enterLeg(nextLeg) {
  leg = nextLeg;
  progressY -= LEG_LEN;
  spawnCursor -= LEG_LEN;
  const shiftY = (arr) => {
    for (const o of arr) if (o.y !== undefined) o.y -= LEG_LEN;
  };
  shiftY(obstacles);
  shiftY(drops);
  shiftY(zones);
  shiftY(fx);
  shiftY(sights);
  equatorCrossed = false;
  bubbleDone = false;
  sightQueue = SIGHTS[leg]
    .map((q) => ({ ...q, y: q.p * LEG_LEN }))
    .filter((q) => q.y > progressY)
    .sort((a, b) => a.y - b.y);
  saveCheckpoint();
  showTitle();
}

/* Man kan ikke dø her — vores kærlighed har uendelige liv. Et sammenstød
   MÆRKES stadig (ryst, rødt blink, en ridse i skroget), men koster
   aldrig noget og kan aldrig ende rejsen. Ridserne heler kærligheden:
   hvert hjerte man samler, lukker én — med den varme ring om skroget. */
function damage() {
  if (invulnT > 0) return;
  invulnT = 1;
  hitT = 0.55;
  if (!reduced) shakeT = 0.4;
  if (ship.cracks.length < 3) ship.cracks.push({ a: Math.random() * 6, b: Math.random() * 6 });
}

function collectHeart(d) {
  const gain = isHomebound(leg) ? 2 : 1;
  hearts += gain;
  if (gain === 2) flareT = 0.9;
  wakeT = 0.8;
  fx.push({ type: "flare", x: d.x, y: d.y, t: 0.5 });
  if (ship.cracks.length > 0) {
    ship.cracks.pop();
    fx.push({ type: "repair", t: 0.9 });
  }
}

/* ── Opdatering ─────────────────────────────────────────────────────── */
let last = 0;

function update(dt) {
  sceneT += dt;
  invulnT = Math.max(0, invulnT - dt);
  shakeT = Math.max(0, shakeT - dt);
  hitT = Math.max(0, hitT - dt);
  bleachT = Math.max(0, bleachT - dt);
  flareT = Math.max(0, flareT - dt);
  wakeT = Math.max(0, wakeT - dt);
  titleT = Math.max(0, titleT - dt);
  captionT = Math.max(0, captionT - dt);
  bubbleT = Math.max(0, bubbleT - dt);
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

  const s = STAGES[stageForLeg(leg)];
  const speed = s.speed * (isHomebound(leg) ? 1.08 : 1);
  progressY += speed * dt;
  fillAhead();

  /* seværdigheder: verdensfaste aktiveres i god tid (de skal glide ind),
     de tidsstyrede (delfiner, sydlys) først når man faktisk er der */
  while (sightQueue.length && sightQueue[0].y < progressY + AHEAD) {
    const q = sightQueue[0];
    if (q.kind === "dolphins" || q.kind === "aurora") {
      if (q.y > progressY + 460) break; // køen er sorteret — vent
      sights.push({
        ...q,
        dur: q.kind === "aurora" ? 8 : 4,
        t: q.kind === "aurora" ? 8 : 4,
        ph: Math.random() * 6,
      });
      caption(q.label);
    } else {
      /* havnavne (kind sea) skriver sig selv i vandet — ingen billedtekst */
      sights.push({ ...q, seen: q.kind === "sea" });
    }
    sightQueue.shift();
  }
  for (const si of sights) {
    if (si.t !== undefined) si.t -= dt;
    else if (!si.seen && si.y - progressY < 500) {
      si.seen = true;
      caption(si.label);
    }
    if (si.kind === "ship") si.y += si.vyw * dt;
  }
  sights = sights.filter((si) => (si.t !== undefined ? si.t > 0 : si.y > progressY - 700));

  /* skibets replik på dette ben */
  if (!bubbleDone && BUBBLES[leg] !== undefined && progressY > BUBBLE_P[leg] * LEG_LEN) {
    bubbleDone = true;
    showBubble(BUBBLES[leg]);
  }

  /* styring med vægt: en kurve, ikke et trin */
  if (keys.has("arrowleft") || keys.has("a")) ship.target -= 300 * dt;
  if (keys.has("arrowright") || keys.has("d")) ship.target += 300 * dt;
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
      squallTimer = 7 + Math.random() * 5;
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
    if (Math.abs(dy) < 30 && Math.abs(d.x - ship.x) < 28) {
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
  sunT = Math.min(1, sunT + dt / 2.5);
  ship.x += (BASE_W / 2 - ship.x) * Math.min(1, dt);
  /* en masse hjerter — de stiger op gennem solopgangen */
  if (endingStarted) {
    if (reduced) {
      if (endHearts.length === 0) {
        for (let i = 0; i < 20; i++) {
          endHearts.push({
            x: 20 + Math.random() * (BASE_W - 40),
            y: 60 + Math.random() * (BASE_H - 140),
            v: 0,
            sway: Math.random() * 6,
            size: 0.6 + Math.random() * 0.9,
          });
        }
      }
    } else {
      endHeartAcc += dt * 9;
      while (endHeartAcc > 1 && endHearts.length < 52) {
        endHeartAcc -= 1;
        endHearts.push({
          x: 12 + Math.random() * (BASE_W - 24),
          y: BASE_H + 16,
          v: 26 + Math.random() * 40,
          sway: Math.random() * 6,
          size: 0.5 + Math.random() * 1.0,
        });
      }
      for (const hh of endHearts) {
        hh.y -= hh.v * dt;
        hh.x += Math.sin(sceneT * 1.3 + hh.sway) * 11 * dt;
      }
      endHearts = endHearts.filter((hh) => hh.y > -30);
    }
  }
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
  if (o.type === "tentacle") {
    /* en krakenarm der bryder overfladen — den vrider sig, og sugekopperne
       gløder rødt: det HER skal man udenom */
    const wg = reduced ? 0 : Math.sin(sceneT * 2.4 + o.y * 0.01) * 2.5;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-2, 12);
    ctx.quadraticCurveTo(-8 + wg, 2, -2 + wg, -6);
    ctx.quadraticCurveTo(4 + wg * 1.4, -14, -3 + wg * 1.4, -19);
    ctx.stroke();
    ctx.fillStyle = "rgba(224,58,47,0.85)";
    for (const [sxp, syp] of [
      [-4 + wg * 0.5, 3],
      [-1 + wg, -5],
      [1 + wg * 1.2, -12],
    ]) {
      ctx.beginPath();
      ctx.arc(sxp, syp, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (o.type === "serpent") {
    /* søslangen: to bugter og et hoved med gab og rødt øje */
    const und = reduced ? 0 : Math.sin(sceneT * 2 + o.y * 0.01) * 1.5;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(15, 6);
    ctx.quadraticCurveTo(10, -5 - und, 5, 6);
    ctx.moveTo(3, 6);
    ctx.quadraticCurveTo(-2, -6 + und, -7, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-13, -2, 4.5, 5.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-20.5, 3);
    ctx.stroke();
    ctx.fillStyle = "rgba(224,58,47,0.95)";
    ctx.shadowColor = "rgba(224,58,47,0.9)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(-13.5, -4.2, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
  } else if (o.type === "jelly") {
    /* kæmpegoplen: klokke der pulserer, brændetråde der slæber rødt */
    const pu = reduced ? 0 : Math.sin(sceneT * 2.6 + o.y * 0.01) * 1.5;
    ctx.beginPath();
    ctx.moveTo(-10 - pu, 0);
    ctx.quadraticCurveTo(0, -15 - pu, 10 + pu, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(224,58,47,0.35)";
    ctx.beginPath();
    ctx.arc(0, -5 - pu * 0.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,58,47,0.7)";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) {
      const tx = -7 + i * 4.6;
      ctx.beginPath();
      ctx.moveTo(tx, 1);
      ctx.quadraticCurveTo(tx + (reduced ? 2 : Math.sin(sceneT * 3 + i) * 3), 8, tx + 1, 16);
      ctx.stroke();
    }
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
  } else if (o.type === "crab") {
    /* kæmpekrabben: løftede kløer, øjne på stilke — klar besked */
    const snap = reduced ? 0 : Math.max(0, Math.sin(sceneT * 3 + o.y * 0.01)) * 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.1;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(side * 8, -2 + i * 3);
        ctx.lineTo(side * (13 + i), 1 + i * 4);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 6, -4);
      ctx.quadraticCurveTo(side * 11, -9, side * (9 + snap), -12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(side * (9 + snap), -13, 2.4, 0, Math.PI * 1.55);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(224,58,47,0.95)";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 2, -5);
      ctx.lineTo(side * 3, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(side * 3, -8.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHeartAt(x, y, scale, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
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

function drawHeart(d, alpha) {
  const sy = SHIP_Y - (d.y - progressY);
  if (sy < -40 || sy > BASE_H + 40) return;
  const pulse = reduced ? 1 : 1 + Math.sin(sceneT * 3 + d.ph) * 0.12;
  drawHeartAt(d.x, sy, pulse, alpha);
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
    ctx.rotate(Math.PI * 2 * Math.min(1, turnT / 1.4));
  }
  if (invulnT > 0 && Math.floor(sceneT * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  if (founderT > 0) {
    ctx.globalAlpha = Math.max(0, founderT / 1.3);
    ctx.rotate((1.3 - founderT) * 0.9);
  }

  /* langskib set ovenfra — og umiskendeligt et VIKINGESKIB: dragehoved
     i stævnen, krøllet agterstavn, skjolde langs rælingen, årer ude og
     klinkbyggede planker */
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
  ctx.beginPath(); // klinkbyggede planker
  ctx.moveTo(-7, -12);
  ctx.quadraticCurveTo(0, -16, 7, -12);
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(0, -2, 8, 2);
  ctx.moveTo(-7, 14);
  ctx.quadraticCurveTo(0, 10, 7, 14);
  ctx.stroke();

  /* dragehovedet: hals der rejser sig af stævnen og krøller */
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.quadraticCurveTo(2, -37, 6, -40);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4.6, -41.5, 2.6, -0.6, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath(); // gab
  ctx.moveTo(6.6, -43.4);
  ctx.lineTo(9.4, -44.6);
  ctx.stroke();
  /* agterstavnens krølle */
  ctx.beginPath();
  ctx.moveTo(0, 29);
  ctx.quadraticCurveTo(-1.5, 35, -4, 37);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-4.5, 35, 2.2, 0.8, Math.PI * 2.1);
  ctx.stroke();

  /* skjolde langs begge rælinger */
  const SHIELD_Y = [-17, -8, 1, 10, 19];
  const HULL_W = [9.8, 11, 11.4, 10.8, 9.2];
  ctx.lineWidth = 1.2;
  for (let i = 0; i < SHIELD_Y.length; i++) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * HULL_W[i], SHIELD_Y[i], 3.1, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "rgba(224,58,47,0.55)" : "rgba(20,28,40,0.95)";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(side * HULL_W[i], SHIELD_Y[i], 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* årerne, med et roligt tag i vandet */
  ctx.lineWidth = 1.1;
  const stroke = frozen || reduced ? 0 : Math.sin(sceneT * 2.2) * 3;
  for (const oy of [-6, 6, 16]) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 10.5, oy);
      ctx.lineTo(side * (19 + stroke * 0.4), oy + 8 + stroke);
      ctx.stroke();
    }
  }

  /* råsejlet fanger etapens lys — og bærer vikingesejlets striber */
  const sailA = ctx.globalAlpha;
  ctx.fillStyle = lerpHex(s.tint, "#ffffff", 0.15);
  ctx.globalAlpha = sailA * 0.34;
  ctx.fillRect(-14, -7, 28, 14);
  ctx.globalAlpha = sailA * 0.42;
  ctx.fillStyle = "rgba(224,58,47,0.8)";
  for (let sx = -14; sx < 14; sx += 8) {
    ctx.fillRect(sx, -7, 4, 14);
  }
  ctx.globalAlpha = sailA;
  ctx.strokeRect(-14, -7, 28, 14);
  ctx.beginPath(); // ræen
  ctx.moveTo(-15, -7);
  ctx.lineTo(15, -7);
  ctx.stroke();
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
  if (lightT > 0.6) drawFigureShape(0, 16, 0.28, 0);

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

/* Prinsessen — mørkt, flagrende hår, diadem med små sten, taljeret
   kjole med foldefald og løftet søm når hun går. Aldrig ansigtstræk,
   uanset størrelse. Hun bærer en svag varm glød: det er hende, der er
   lyset, længe før mekanikken siger det højt. */
function drawFigureShape(x, y, scale, walk) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const lw = 1.5 / Math.max(scale, 0.34);
  const sway = Math.sin(walk) * 2;
  const step = Math.sin(walk * 2) * 1.4;

  /* den varme glød omkring hende */
  const halo = ctx.createRadialGradient(0, -8, 2, 0, -8, 46);
  halo.addColorStop(0, "rgba(255,207,122,0.16)");
  halo.addColorStop(1, "rgba(255,207,122,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, -8, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(242,246,252,0.92)";
  ctx.fillStyle = "rgba(8,12,18,0.96)";
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  /* håret bagest: langt og mørkt, ned over ryggen til taljen, med et
     blødt sving efter gangen */
  ctx.beginPath();
  ctx.moveTo(-6.5, -36);
  ctx.quadraticCurveTo(-11, -26, -9.5, -14);
  ctx.quadraticCurveTo(-9 - sway, -4, -6 - sway, 3);
  ctx.quadraticCurveTo(-2, 5, 0, 2);
  ctx.quadraticCurveTo(2, 5, 6 + sway * 0.6, 3);
  ctx.quadraticCurveTo(9 + sway * 0.6, -4, 9.5, -14);
  ctx.quadraticCurveTo(11, -26, 6.5, -36);
  ctx.quadraticCurveTo(0, -42, -6.5, -36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  /* hårets indre bølgelinjer */
  ctx.beginPath();
  ctx.moveTo(-6, -30);
  ctx.quadraticCurveTo(-7.5, -18, -5.5 - sway * 0.5, -6);
  ctx.moveTo(6, -30);
  ctx.quadraticCurveTo(7.5, -18, 5.5 + sway * 0.4, -6);
  ctx.stroke();

  /* hovedet som silhuet i håret */
  ctx.beginPath();
  ctx.ellipse(0, -32.5, 5.2, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  /* diademet: fin gylden bue med tre spidser og små sten */
  ctx.strokeStyle = "rgba(255,209,102,0.95)";
  ctx.fillStyle = "rgba(255,209,102,0.95)";
  ctx.lineWidth = lw * 0.85;
  ctx.beginPath();
  ctx.moveTo(-4.6, -37.5);
  ctx.quadraticCurveTo(0, -39.5, 4.6, -37.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3.2, -38.2);
  ctx.lineTo(-2.6, -41);
  ctx.moveTo(0, -39);
  ctx.lineTo(0, -42.6);
  ctx.moveTo(3.2, -38.2);
  ctx.lineTo(2.6, -41);
  ctx.stroke();
  for (const [gx, gy] of [
    [-2.6, -41.4],
    [0, -43.1],
    [2.6, -41.4],
  ]) {
    ctx.beginPath();
    ctx.arc(gx, gy, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  /* hals, skuldre og taljeret liv */
  ctx.strokeStyle = "rgba(242,246,252,0.92)";
  ctx.fillStyle = "rgba(8,12,18,0.96)";
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-1.4, -26.5);
  ctx.lineTo(-1.4, -24);
  ctx.moveTo(1.4, -26.5);
  ctx.lineTo(1.4, -24);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6.5, -22.5);
  ctx.quadraticCurveTo(0, -25.5, 6.5, -22.5);
  ctx.quadraticCurveTo(5, -14, 3.6, -9);
  ctx.lineTo(-3.6, -9);
  ctx.quadraticCurveTo(-5, -14, -6.5, -22.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  /* armene: den ene løfter sømmen let, den anden svinger med */
  ctx.beginPath();
  ctx.moveTo(-6, -21);
  ctx.quadraticCurveTo(-9.5, -14, -8.5 + sway * 0.5, -5.5);
  ctx.moveTo(6, -21);
  ctx.quadraticCurveTo(9.5, -15, 8, -7.5);
  ctx.quadraticCurveTo(7.4, -6, 6.4, -5.8);
  ctx.stroke();

  /* kjolen: flarer fra taljen til en svungen søm; foldefald indeni,
     og sømmen løfter sig lidt i den side, hun lige har taget skridtet */
  ctx.beginPath();
  ctx.moveTo(-3.6, -9);
  ctx.quadraticCurveTo(-11, 6, -13.5 + sway * 0.6, 22 - step);
  ctx.quadraticCurveTo(-6, 26.5 + sway * 0.4, 0, 25.2);
  ctx.quadraticCurveTo(6, 26.5 - sway * 0.4, 13.5 + sway * 0.6, 22 + step);
  ctx.quadraticCurveTo(11, 6, 3.6, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4.5, -4);
  ctx.quadraticCurveTo(-6.5, 10, -6 + sway * 0.4, 23.5);
  ctx.moveTo(0.5, -4);
  ctx.quadraticCurveTo(0, 10, 0.5, 25);
  ctx.moveTo(5, -4);
  ctx.quadraticCurveTo(7, 10, 6.5 + sway * 0.4, 24);
  ctx.stroke();

  /* en fodspids under sømmen, skiftevis, når hun går */
  if (Math.abs(step) > 0.5) {
    ctx.beginPath();
    ctx.moveTo(step > 0 ? -3.5 : 3.5, 25.8);
    ctx.lineTo(step > 0 ? -6 : 6, 26.6);
    ctx.stroke();
  }
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
    /* Valparaíso: terrasserede husrækker der FØLGER skråningen — ens
       højde, fælles bundlinje pr. række, alle inde på land. Det er byen
       set fra havet, ikke konfetti. Stadig spillets eneste mættede farve. */
    ctx.lineWidth = 1;
    let ci = 0;
    for (const [by, startX] of [
      [392, BASE_W - 46],
      [412, BASE_W - 58],
      [432, BASE_W - 70],
      [452, BASE_W - 80],
      [472, BASE_W - 88],
    ]) {
      let hx = startX;
      while (hx < BASE_W - 4) {
        const hw = 8 + ((ci * 7) % 5);
        ctx.fillStyle = HOUSE_COLORS[ci % HOUSE_COLORS.length];
        ctx.fillRect(hx, by - 8, hw, 8);
        ctx.strokeStyle = "rgba(10,14,20,0.75)";
        ctx.strokeRect(hx, by - 8, hw, 8);
        /* et lille varmt vindue i hvert tredje hus */
        if (ci % 3 === 0) {
          ctx.fillStyle = "rgba(255,209,102,0.95)";
          ctx.fillRect(hx + hw / 2 - 1, by - 5, 2, 2);
        }
        hx += hw + 3;
        ci++;
      }
    }
    drawPlaceName("VALPARA\u00cdSO", BASE_W - 64, 374, -0.5, 11, 0.8);
    /* molen: forankret på kysten, båret af pæle, ud mod hvor skibet lægger til */
    ctx.strokeStyle = "rgba(240,244,252,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(BASE_W - 84, 482);
    ctx.lineTo(180, 498);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const px = BASE_W - 100 - i * 26;
      const py = 483 + (BASE_W - 84 - px) * (16 / (BASE_W - 84 - 180));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ── Seværdighederne — landene man sejler forbi ─────────────────────── */
function drawPalmAt(x, y) {
  ctx.strokeStyle = "rgba(240,244,252,0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 3, y - 8, x + 6, y - 14);
  ctx.stroke();
  for (const [dx, dy] of [
    [-8, -2],
    [8, -1],
    [-5, -6],
    [7, -6],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 14);
    ctx.quadraticCurveTo(x + 6 + dx * 0.6, y - 16 + dy, x + 6 + dx, y - 14 + dy);
    ctx.stroke();
  }
}

function drawGull(x, y) {
  ctx.strokeStyle = "rgba(240,244,252,0.8)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.quadraticCurveTo(x - 2, y - 3.5, x, y);
  ctx.quadraticCurveTo(x + 2, y - 3.5, x + 5, y);
  ctx.stroke();
}

/* Stednavne skrevet grafisk ind på landet — displayfonten, spatieret,
   halvt gennemsigtig, som navne trykt på et gammelt søkort. Hendes side
   af havet bærer sine egne navne: CABO VERDE, BRASIL, CABO DE HORNOS. */
function spacedText(t) {
  return t.split("").join(" ");
}

function drawPlaceName(text, x, y, angle, size = 10, alpha = 0.55) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.font = `${size}px 'Archivo Black', 'Space Mono', monospace`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(240,244,252,0.9)";
  ctx.fillText(spacedText(text), 0, 0);
  ctx.restore();
}

/* Havnavne — KATTEGAT står i vandet når man stævner ud, og igen når man
   kommer hjem */
function drawSeaName(s, sy) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.font = "13px 'Archivo Black', 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(240,244,252,0.85)";
  const t = spacedText(s.label);
  ctx.fillText(t, BASE_W / 2, sy);
  const w = ctx.measureText(t).width;
  ctx.strokeStyle = "rgba(240,244,252,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 7]);
  ctx.beginPath();
  ctx.moveTo(18, sy - 4);
  ctx.lineTo(BASE_W / 2 - w / 2 - 14, sy - 4);
  ctx.moveTo(BASE_W / 2 + w / 2 + 14, sy - 4);
  ctx.lineTo(BASE_W - 18, sy - 4);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCoast(s, sy) {
  const edge = s.side === 1 ? BASE_W : 0;
  const dir = s.side === 1 ? -1 : 1;
  const L = 460;
  ctx.fillStyle = "rgba(9,16,24,0.96)";
  ctx.strokeStyle = "rgba(240,244,252,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(edge, sy - L / 2);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const yy = sy - L / 2 + (L / 8) * i;
    const inl = 34 + ((i * 53 + Math.round(s.y)) % 47); // deterministisk pr. sight
    pts.push([edge + dir * inl, yy]);
    ctx.lineTo(edge + dir * inl, yy);
  }
  ctx.lineTo(edge, sy + L / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (s.cliffs) {
    /* Dover: selve kystlinjen lyser hvidt */
    ctx.strokeStyle = "rgba(235,242,250,0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
  }
  if (s.houses) {
    /* hjemlandet: varme vinduer der lyser i mørket — de farvede huse er
       Valparaísos signatur alene, Danmark er gyldent lys på en mørk kyst */
    ctx.save();
    ctx.fillStyle = "rgba(255,209,102,0.9)";
    ctx.shadowColor = "rgba(255,207,122,0.8)";
    ctx.shadowBlur = 5;
    for (let i = 0; i < 12; i++) {
      const [px, py] = pts[Math.floor((i * 7) % 9)];
      const hx = px - dir * (7 + ((i * 29) % 24));
      const hy = py + ((i * 13) % 20) - 10;
      ctx.fillRect(hx, hy, 2.4, 2.4);
    }
    ctx.restore();
  }
  if (s.palms) {
    for (let i = 1; i < 8; i += 3) drawPalmAt(pts[i][0] - dir * 4, pts[i][1]);
  }
  if (s.gulls) {
    for (let i = 0; i < 3; i++) {
      const wob = reduced ? 0 : Math.sin(sceneT * 1.6 + i * 2) * 9;
      drawGull(edge + dir * (88 + i * 22) + wob, sy - 90 + i * 42);
    }
  }
  if (s.place) {
    drawPlaceName(s.place, edge + dir * 58, sy, dir === 1 ? Math.PI / 2 : -Math.PI / 2);
  }
}

function drawIsland(s, sy) {
  const cx = s.side === 1 ? BASE_W - 52 : 52;
  ctx.fillStyle = "rgba(9,16,24,0.96)";
  ctx.strokeStyle = "rgba(240,244,252,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 66, sy + 18);
  ctx.quadraticCurveTo(cx - 30, sy - 26, cx, sy - 20);
  ctx.quadraticCurveTo(cx + 42, sy - 30, cx + 66, sy + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (s.peaks) {
    ctx.beginPath();
    ctx.moveTo(cx - 7, sy - 22);
    ctx.lineTo(cx + 4, sy - 48);
    ctx.lineTo(cx + 15, sy - 20);
    ctx.stroke();
    ctx.fillStyle = "rgba(235,242,250,0.85)";
    ctx.beginPath();
    ctx.moveTo(cx, sy - 38);
    ctx.lineTo(cx + 4, sy - 48);
    ctx.lineTo(cx + 8, sy - 38);
    ctx.closePath();
    ctx.fill();
  }
  if (s.palms) {
    drawPalmAt(cx - 26, sy - 18);
    drawPalmAt(cx + 14, sy - 20);
  }
  if (s.place) drawPlaceName(s.place, cx, sy + 34, 0, 9);
}

function drawLighthouse(s, sy) {
  const x = s.side === 1 ? BASE_W - 46 : 46;
  ctx.fillStyle = "rgba(9,16,24,0.96)";
  ctx.strokeStyle = "rgba(240,244,252,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 26, sy + 16);
  ctx.lineTo(x - 10, sy + 2);
  ctx.lineTo(x + 12, sy + 4);
  ctx.lineTo(x + 26, sy + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  /* strålen fejer — det er en begivenhed, ikke kulisse */
  const ang = reduced ? 0.55 : sceneT * 0.9;
  const ex = x + Math.cos(ang) * 190;
  const ey = sy - 37 + Math.sin(ang) * 64;
  const px2 = -Math.sin(ang) * 24;
  const py2 = Math.cos(ang) * 9;
  ctx.fillStyle = "rgba(255,209,102,0.10)";
  ctx.beginPath();
  ctx.moveTo(x, sy - 37);
  ctx.lineTo(ex - px2, ey - py2);
  ctx.lineTo(ex + px2, ey + py2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(235,242,250,0.9)";
  ctx.fillRect(x - 5, sy - 34, 10, 36);
  ctx.fillStyle = "rgba(224,58,47,0.85)";
  ctx.fillRect(x - 5, sy - 26, 10, 7);
  ctx.fillRect(x - 5, sy - 12, 10, 7);
  ctx.strokeRect(x - 5, sy - 34, 10, 36);
  ctx.fillStyle = "rgba(255,209,102,0.95)";
  ctx.fillRect(x - 3.4, sy - 40, 6.8, 6);
}

function drawPassingShip(s, sy) {
  const x = s.side === 1 ? BASE_W - 64 : 64;
  ctx.strokeStyle = "rgba(235,240,250,0.85)";
  ctx.fillStyle = "rgba(10,16,24,0.9)";
  ctx.lineWidth = 1.3;
  if (s.fishing) {
    /* tre små kuttere i klynge */
    for (let i = 0; i < 3; i++) {
      const bx = x + (i - 1) * 34;
      const by = sy + (i % 2) * 26 - 8;
      ctx.beginPath();
      ctx.moveTo(bx - 11, by + 3);
      ctx.quadraticCurveTo(bx, by + 8, bx + 11, by + 3);
      ctx.lineTo(bx + 8, by - 2);
      ctx.lineTo(bx - 8, by - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by - 2);
      ctx.lineTo(bx, by - 12);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,209,102,0.9)";
      ctx.fillRect(bx - 1, by - 7, 2, 2); // lanterne
      ctx.fillStyle = "rgba(10,16,24,0.9)";
    }
  } else {
    /* fragtskibet: langt, mørkt, med en række lys — verden derude fortsætter */
    ctx.beginPath();
    ctx.moveTo(x - 13, sy - 36);
    ctx.lineTo(x + 13, sy - 36);
    ctx.lineTo(x + 10, sy + 40);
    ctx.lineTo(x - 10, sy + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeRect(x - 8, sy + 22, 16, 12); // broen
    ctx.fillStyle = "rgba(255,209,102,0.85)";
    for (let i = 0; i < 5; i++) ctx.fillRect(x - 6 + i * 3, sy - 26 + i * 11, 1.8, 1.8);
  }
}

function drawHorn(s, sy) {
  const edge = s.side === 1 ? BASE_W : 0;
  const dir = s.side === 1 ? -1 : 1;
  ctx.fillStyle = "rgba(5,9,14,0.98)";
  ctx.strokeStyle = "rgba(240,244,252,0.6)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(edge, sy + 120);
  ctx.lineTo(edge + dir * 30, sy + 62);
  ctx.lineTo(edge + dir * 22, sy + 12);
  ctx.lineTo(edge + dir * 58, sy - 28);
  ctx.lineTo(edge + dir * 42, sy - 108);
  ctx.lineTo(edge + dir * 12, sy - 150);
  ctx.lineTo(edge, sy - 160);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  /* brænding ved foden */
  ctx.strokeStyle = "rgba(235,242,250,0.7)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const wy = sy + 90 + i * 12 + (reduced ? 0 : Math.sin(sceneT * 2 + i) * 3);
    ctx.beginPath();
    ctx.moveTo(edge, wy);
    ctx.lineTo(edge + dir * (34 - i * 8), wy);
    ctx.stroke();
  }
  if (s.place) {
    drawPlaceName(
      s.place,
      edge + dir * 26,
      sy - 12,
      dir === 1 ? Math.PI / 2 : -Math.PI / 2,
      11,
      0.7,
    );
  }
}

function drawAurora(s) {
  const a = Math.max(0, Math.min(1, (s.dur - s.t) / 1.2, s.t / 1.2)) * (reduced ? 0.6 : 1);
  ctx.save();
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(126,224,168,${(0.2 - i * 0.04) * a})`;
    ctx.shadowColor = "rgba(126,224,168,0.5)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let x = -10; x <= BASE_W + 10; x += 20) {
      const y = 44 + i * 26 + Math.sin(x * 0.02 + (reduced ? 0 : sceneT * 0.8) + i * 1.7) * 15;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPod(s) {
  const a = Math.max(0, Math.min(1, (s.dur - s.t) / 0.6, s.t / 0.6));
  ctx.save();
  ctx.globalAlpha = a;
  if (s.pel) {
    /* pelikaner i linje hen over himlen */
    const t = 1 - s.t / s.dur;
    for (let i = 0; i < 4; i++) {
      drawGull(
        -30 + (BASE_W + 60) * t - i * 26,
        110 + i * 9 + (reduced ? 0 : Math.sin(sceneT * 2 + i) * 4),
      );
    }
  } else if (s.fly) {
    /* flyvefisk: små sølvbuer der springer hen over kursen */
    ctx.strokeStyle = "rgba(220,232,244,0.85)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const ph = (reduced ? 0.6 : sceneT * 2.4) + i * 1.3 + s.ph;
      const hop = Math.sin(ph % Math.PI);
      const fxp = ship.x - 90 + i * 44 + ((ph * 30) % 60);
      ctx.beginPath();
      ctx.arc(fxp, SHIP_Y - 40 - hop * 26, 5, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();
    }
  } else {
    /* delfiner langs siden — de springer på skift */
    ctx.strokeStyle = "rgba(200,220,236,0.9)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ph = (reduced ? 1.2 : sceneT * 2.6) + i * 1.15 + s.ph;
      const hop = Math.max(0, Math.sin(ph));
      if (hop < 0.08) continue;
      const dxp = ship.x + (i === 0 ? -58 : i === 1 ? -36 : 48);
      const dy = SHIP_Y + 6 - hop * 24;
      ctx.beginPath();
      ctx.arc(dxp, dy, 9, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.beginPath(); // finnen
      ctx.moveTo(dxp, dy - 9);
      ctx.lineTo(dxp + 3, dy - 13);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSights() {
  for (const si of sights) {
    if (si.kind === "aurora") {
      drawAurora(si);
      continue;
    }
    if (si.kind === "dolphins") {
      drawPod(si);
      continue;
    }
    const sy = SHIP_Y - (si.y - progressY);
    if (sy < -600 || sy > BASE_H + 600) continue;
    if (si.kind === "sea") {
      drawSeaName(si, sy);
      continue;
    }
    /* landkending må gerne anes i mørket — den dæmpes, men forsvinder ikke */
    ctx.save();
    ctx.globalAlpha = Math.max(0.6, visibilityAlpha(si.y));
    if (si.kind === "coast") drawCoast(si, sy);
    else if (si.kind === "island") drawIsland(si, sy);
    else if (si.kind === "lighthouse") drawLighthouse(si, sy);
    else if (si.kind === "ship") drawPassingShip(si, sy);
    else if (si.kind === "horn") drawHorn(si, sy);
    ctx.restore();
  }
}

/* Lysmekanikken — må kunne aflæses uden at blive forklaret */
function drawLight() {
  if (mode === "ending") return;
  if (lightT < 1) {
    /* udad: solen er lille og kold forude, og havet foran ligger i mørke */
    const dark = ctx.createLinearGradient(0, 0, 0, SHIP_Y + 60);
    const a = 0.68 * (1 - lightT); // mørkt nok til at bære mekanikken, lyst nok til at kysterne læses
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
  /* farten er sat op, så sigtbarheden følger med — reaktionstiden er den
     samme følelse som før: ~2 s udad, rigeligt hjemad */
  const visD = 240 + (470 - 240) * lightT;
  return Math.max(0, Math.min(1, (visD - ahead) / 80));
}

/* Taleboblen: tekst brudt i korte linjer, boks med hale ned til
   dragehovedet. Ren tekst, varm kant — sødt, ikke støjende. */
function showBubble(text) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > 26) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  bubbleLines = lines;
  bubbleT = 5;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBubble() {
  if (bubbleT <= 0 || mode !== "sail" || founderT > 0) return;
  const a = Math.min(1, bubbleT / 0.4, (5 - bubbleT) / 0.3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = "11px 'Space Mono', monospace";
  const lineH = 15;
  let w = 0;
  for (const l of bubbleLines) w = Math.max(w, ctx.measureText(l).width);
  w += 26;
  const h = bubbleLines.length * lineH + 16;
  const bx = Math.max(12, Math.min(BASE_W - w - 12, ship.x + 26));
  const by = SHIP_Y - 66 - h;
  ctx.fillStyle = "rgba(6,10,18,0.88)";
  ctx.strokeStyle = "rgba(255,207,122,0.75)";
  ctx.lineWidth = 1.3;
  roundedRect(bx, by, w, h, 9);
  ctx.fill();
  ctx.stroke();
  /* halen ned mod stævnen */
  const tx = Math.max(bx + 14, Math.min(bx + w - 14, ship.x + 8));
  ctx.fillStyle = "rgba(6,10,18,0.88)";
  ctx.beginPath();
  ctx.moveTo(tx - 6, by + h);
  ctx.lineTo(tx + 6, by + h);
  ctx.lineTo(ship.x + 5, SHIP_Y - 44);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,207,122,0.75)";
  ctx.beginPath();
  ctx.moveTo(tx - 6, by + h);
  ctx.lineTo(ship.x + 5, SHIP_Y - 44);
  ctx.lineTo(tx + 6, by + h);
  ctx.stroke();
  ctx.fillStyle = "rgba(240,244,252,0.95)";
  ctx.textAlign = "left";
  for (let i = 0; i < bubbleLines.length; i++) {
    ctx.fillText(bubbleLines[i], bx + 13, by + 13 + i * lineH + 4);
  }
  ctx.restore();
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
  /* hvor liv-ikonerne stod: sandheden om det her skib. Lille, varm,
     altid til stede — og mekanisk sand: man kan ikke dø. */
  ctx.font = "10px 'Space Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,207,122,0.8)";
  const amor = "nuestro amor tiene vidas infinitas";
  ctx.fillText(amor, 14, BASE_H - 44);
  drawHeartAt(14 + ctx.measureText(amor).width + 11, BASE_H - 47, 0.5, 0.85);

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
  /* billedtekst til seværdighederne — mindre end etapenavnet, nederst */
  if (captionT > 0) {
    const a = Math.min(1, captionT / 0.4) * Math.min(1, (2.6 - captionT) / 0.35);
    ctx.globalAlpha = a * 0.9;
    ctx.font = "11px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(240,244,252,0.9)";
    ctx.fillText(captionText, BASE_W / 2, BASE_H - 64);
    ctx.globalAlpha = 1;
  }
  drawRouteMap();
}

/* Rutekortet — en lille transparent linje nederst: hjem til venstre,
   hende til højre, skibet som prik derimellem. Udad sejler prikken mod
   hjertet; hjemad vender den og sejler tilbage mod huset. */
function drawRouteMap() {
  if (mode === "ending") return;
  const y = BASE_H - 26;
  const x0 = 96;
  const x1 = BASE_W - 40;
  const overall = Math.min(1, (leg + Math.min(1, progressY / LEG_LEN)) / 10);
  const t = mode === "turn" ? 1 : overall <= 0.5 ? overall * 2 : (1 - overall) * 2;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "rgba(240,244,252,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  /* etape-prikker */
  ctx.fillStyle = "rgba(240,244,252,0.6)";
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x0 + ((x1 - x0) * i) / 5, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  /* hjem: et lille hus */
  ctx.strokeStyle = "rgba(240,244,252,0.8)";
  ctx.lineWidth = 1.1;
  ctx.strokeRect(x0 - 8, y - 4, 7, 5);
  ctx.beginPath();
  ctx.moveTo(x0 - 9, y - 4);
  ctx.lineTo(x0 - 4.5, y - 8);
  ctx.lineTo(x0, y - 4);
  ctx.stroke();
  /* hende: et hjerte for enden */
  drawHeartAt(x1 + 8, y - 1, 0.55, 0.9);
  /* skibet: en lille prik med retning */
  const sx = x0 + (x1 - x0) * t;
  ctx.fillStyle = "rgba(255,207,122,0.95)";
  ctx.beginPath();
  ctx.arc(sx, y, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (isHomebound(leg)) {
    /* hjemad har prikken en lille varm hale — hun er med */
    ctx.strokeStyle = "rgba(255,207,122,0.5)";
    ctx.beginPath();
    ctx.moveTo(sx + 4, y);
    ctx.lineTo(sx + 10, y);
    ctx.stroke();
  }
  ctx.restore();
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

  drawSights();

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
      ctx.fillText("EL ECUADOR", BASE_W / 2, eq - 8);
    }
  }

  for (const o of obstacles) drawObstacle(o, visibilityAlpha(o.y));
  for (const d of drops) drawHeart(d, visibilityAlpha(d.y));

  /* reparation: en varm ring der lukker sig om skibet */
  for (const f of fx) {
    if (f.type !== "repair") continue;
    ctx.strokeStyle = `rgba(255,207,122,${f.t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ship.x, SHIP_Y, 40 - (0.9 - f.t) * 26, 0, Math.PI * 2);
    ctx.stroke();
  }

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

  /* træf: kanten blinker rødt — skaden skal kunne MÆRKES */
  if (hitT > 0) {
    const g = ctx.createRadialGradient(
      BASE_W / 2,
      BASE_H / 2,
      BASE_H * 0.32,
      BASE_W / 2,
      BASE_H / 2,
      BASE_H * 0.72,
    );
    const a = (reduced ? 0.22 : 0.4) * (hitT / 0.55);
    g.addColorStop(0, "rgba(224,58,47,0)");
    g.addColorStop(1, `rgba(224,58,47,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  /* nedstigningen og ombordstigningen — med hendes navn over sig */
  if (mode === "turn" && turnPhase >= 2 && turnPhase <= 3) {
    drawFigureShape(figure.x, figure.y, figure.s, figure.walk);
    const nameA = turnPhase === 2 ? Math.min(1, turnT / 0.8) : 1;
    const nx = Math.max(78, Math.min(BASE_W - 78, figure.x));
    const ny = figure.y - 46 * figure.s - 12;
    ctx.save();
    ctx.globalAlpha = nameA;
    ctx.font = "10px 'Archivo Black', 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,209,102,0.95)";
    const nameText = spacedText("PRINCESA GIO");
    ctx.fillText(nameText, nx, ny);
    drawHeartAt(nx + ctx.measureText(nameText).width / 2 + 10, ny - 3, 0.5, nameA * 0.9);
    ctx.restore();
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
    for (const hh of endHearts) {
      const a =
        Math.max(0, Math.min(1, (BASE_H - hh.y) / 90)) * Math.max(0.25, Math.min(1, hh.y / 120));
      drawHeartAt(hh.x, hh.y, hh.size, reduced ? 0.5 : a);
    }
  }

  /* ækvator-bleach */
  if (bleachT > 0) {
    ctx.fillStyle = `rgba(250,248,240,${bleachT * 0.9})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  drawBubble();
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

resetLegEntities(); // også ved genoptaget checkpoint: benets seværdigheder skal i kø fra start

/* Lågen først — spillet starter ikke, før siden faktisk er åbnet */
guardPage().then(() => {
  requestAnimationFrame(frame);
});
