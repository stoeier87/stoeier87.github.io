import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-check.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { ARCADE_FIREBASE_CONFIG } from "../../arcade/shared/firebase-config.js";
import { GAMES } from "../../arcade/shared/games-data.js";
import { definePageHeader } from "../../shared/elements/page-header.ts";
import { defineHallNav } from "../../shared/elements/hall-nav.ts";
import { rand } from "../../shared/elements/planet-textures.ts";
import { color } from "../../tokens.ts";
import {
  ZODIAC_PERIODS,
  periodWindowUtc,
  periodOfTimestamp,
  currentPeriod,
} from "../../shared/zodiac-periods.js";
import { CONSTELLATIONS } from "./constellations.js";

definePageHeader();
defineHallNav();

/* Same Firebase + App Check boot as scoreboard.js (see the comments there);
   a distinct app name keeps the instances apart if both pages ever share a
   session. */
const app = initializeApp(ARCADE_FIREBASE_CONFIG, "hall-of-stars");
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
window.process ??= { env: {} };
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(ARCADE_FIREBASE_CONFIG.appCheckSiteKey),
  isTokenAutoRefreshEnabled: true,
});
const db = getDatabase(app);

/* ── Static wiring ─────────────────────────────────────────────────────
   Ring order = ZODIAC_PERIODS order (Aries → Pisces, true zodiacal order);
   CONSTELLATIONS is keyed by IAU name and re-sorted to match here, so slot
   k on the ring is always period k in the table. */
const SIGNS = ZODIAC_PERIODS.map((p) => {
  const pattern = CONSTELLATIONS.find((c) => c.name === p.constellation);
  if (!pattern) throw new Error(`No star pattern for ${p.constellation}`);
  return { ...p, pattern: normalizePattern(pattern) };
});

/** Planet-dot colour per game, from the token palette (lit face). */
const PLANET_DOT = {
  mercury: color.planet.merkurHi,
  venus: color.planet.venusHi,
  earth: color.planet.jordenHi,
  mars: color.planet.marsHi,
  jupiter: color.planet.jupiterHi,
  saturn: color.planet.saturnHi,
  uranus: color.planet.uranusHi,
  neptune: color.planet.neptunHi,
  pluto: color.planet.plutoHi,
};

/* Patterns arrive in chart coordinates at arbitrary scale; re-centre on the
   centroid and fit to the unit circle so every constellation renders at a
   comparable size regardless of how spread its real stars are. */
function normalizePattern({ name, stars, edges }) {
  const cx = stars.reduce((a, s) => a + s.x, 0) / stars.length;
  const cy = stars.reduce((a, s) => a + s.y, 0) / stars.length;
  let max = 0;
  for (const s of stars) {
    max = Math.max(max, Math.hypot(s.x - cx, s.y - cy));
  }
  const k = max > 0 ? 1 / max : 1;
  return {
    name,
    edges,
    stars: stars.map((s) => ({ x: (s.x - cx) * k, y: (s.y - cy) * k, mag: s.mag })),
  };
}

/* ── State ─────────────────────────────────────────────────────────── */

/* `reduced` is live, not a load-time snapshot — see the change listener
   below the rAF loop, which parks or restarts the scene mid-session. */
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduced = motionQuery.matches;
const SLOT = (Math.PI * 2) / 12;

const now = currentPeriod();

/* ── The hall's first period ───────────────────────────────────────────
   The hall has existed since Leo 2026 — there is no time before it, so
   backward travel stops there: no earlier year is selectable, and in the
   birth year the signs before Leo are off the reachable arc entirely.
   Without this floor, every period back to the earliest score's year was
   browsable as an "unclaimed" list of pure nothing. */
const EPOCH_INDEX = ZODIAC_PERIODS.findIndex((p) => p.name === "Leo");
const EPOCH_YEAR = 2026;
const EPOCH_START_MS = periodWindowUtc(EPOCH_INDEX, EPOCH_YEAR).startUtcMs;

/* The ceiling is the RUNNING period's label year, not the calendar year —
   in the first days of January the calendar says Y+1 while every period
   that exists is still labelled Y, and a selectable-but-empty Y+1 would be
   a year made entirely of future. */
let maxYear = periodOfTimestamp(Date.now()).year;
let minYear = maxYear; // widened once scores load, never past EPOCH_YEAR
let selectedYear = now.year;
let activeIndex = now.index; // slot nearest the front
let ringAngle = -activeIndex * SLOT; // slot k is front when ringAngle ≡ -k·SLOT
let angVel = 0;
let dragging = false;
let forcedSlot = null; // tap-to-rotate / arrow target
/* sceneT starts at 0, so 0 here gives the visitor the same ten quiet
   seconds on the running period at load that any touch buys later —
   with -Infinity the auto-turn started immediately and had drifted the
   hall off the current sign before anyone had read it. */
let lastInteraction = 0;
let lineDraw = reduced ? 1 : 0; // active constellation line-draw progress
let sceneT = 0;
/* +1 turns the ring backward through time (the only open direction from
   the running period); the auto-turn flips it at the future wall. */
let autoDir = 1;

/** rows per game key, raw from both paths — filtered per period at render. */
const rowsByGame = new Map();
let loadFailed = false;

/* ── No time travel outside the hall's existence ───────────────────────
   The hall only contains time that has happened TO IT. For the selected
   year a sign is reachable only once its period has started — and only if
   it starts no earlier than the hall's own first period (Leo 2026); both
   walls keep the reachable signs one contiguous arc, since the ring is in
   chronological order. Everything that navigates — arrows, taps, snap,
   momentum, the auto-turn — checks this table, so the winners panel can
   never land on a period that hasn't begun, nor on one from before the
   hall existed. */
const allowed = new Array(12).fill(true);

function refreshAllowed() {
  const nowMs = Date.now();
  for (let i = 0; i < 12; i++) {
    const start = periodWindowUtc(i, selectedYear).startUtcMs;
    allowed[i] = start <= nowMs && start >= EPOCH_START_MS;
  }
}

function isAllowed(k) {
  return allowed[((k % 12) + 12) % 12];
}

/** Nearest reachable slot by ring distance — the wall a fling bounces off. */
function clampSlot(k) {
  if (isAllowed(k)) return ((k % 12) + 12) % 12;
  for (let d = 1; d <= 6; d++) {
    if (isAllowed(k - d)) return (((k - d) % 12) + 12) % 12;
    if (isAllowed(k + d)) return (((k + d) % 12) + 12) % 12;
  }
  return activeIndex;
}

/* ── DOM ───────────────────────────────────────────────────────────── */

const el = {
  scene: document.getElementById("scene"),
  sky: document.getElementById("sky"),
  yearPrev: document.getElementById("yearPrev"),
  yearNext: document.getElementById("yearNext"),
  yearLabel: document.getElementById("yearLabel"),
  signPrev: document.getElementById("signPrev"),
  signNext: document.getElementById("signNext"),
  signName: document.getElementById("signName"),
  winners: document.getElementById("winners"),
  note: document.getElementById("hallNote"),
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ── Winners ───────────────────────────────────────────────────────────
   Always computed from the raw stored rows at view time — never an
   archived copy. Winner = highest score whose createdAt falls inside the
   period's Copenhagen window; ties go to the earliest submission (policy
   implemented here and deliberately stated nowhere in the interface). */
function winnersFor(index, year) {
  const { startUtcMs, endUtcMsExclusive } = periodWindowUtc(index, year);
  return GAMES.map((game) => {
    let best = null;
    for (const row of rowsByGame.get(game.key) ?? []) {
      const t = Number(row?.createdAt);
      if (!Number.isFinite(t) || t < startUtcMs || t >= endUtcMsExclusive) continue;
      const score = Number(row.score ?? 0);
      if (
        !best ||
        score > best.score ||
        (score === best.score && t < best.createdAt)
      ) {
        best = { name: String(row.name ?? "Unknown"), score, createdAt: t };
      }
    }
    return { game, best };
  });
}

let winnersTimer = 0;
function scheduleWinners() {
  clearTimeout(winnersTimer);
  winnersTimer = setTimeout(renderWinners, reduced ? 0 : 250);
}

function renderWinners() {
  const list = winnersFor(activeIndex, selectedYear);
  const build = () => {
    el.winners.innerHTML = list
      .map(({ game, best }) => {
        const claimed = !!best;
        return `
      <li class="flex items-center gap-3 border-b border-scoreboard-line py-2.5 text-small last:border-b-0"
          data-claimed="${claimed}">
        <span class="dot h-2.5 w-2.5 shrink-0 rounded-pill" style="background:${PLANET_DOT[game.key]}"></span>
        <span class="w-28 shrink-0 text-scoreboard-muted md:w-40">${escapeHtml(game.gameLabel)}</span>
        ${
          claimed
            ? `<span class="grow truncate">${escapeHtml(best.name)}</span>
        <span class="shrink-0 font-bold tabular-nums text-score-highlight">${best.score.toLocaleString("en")}</span>`
            : `<span class="grow truncate italic text-text-dim">unclaimed</span>
        <span class="shrink-0 italic text-text-dim">unclaimed</span>`
        }
      </li>`;
      })
      .join("");
    if (!reduced) {
      const rows = [...el.winners.children];
      rows.forEach((row, i) => {
        row.animate(
          [
            { opacity: 0, transform: "translateY(4px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 240, delay: i * 45, fill: "backwards", easing: "ease-out" },
        );
        /* The ignition: a small point of light beside each claimed row,
           top to bottom, like stars switching on. */
        if (row.dataset.claimed === "true") {
          const dot = row.querySelector(".dot");
          dot?.animate(
            [
              { boxShadow: "0 0 0 0 transparent", transform: "scale(1)" },
              {
                boxShadow: `0 0 14px 4px ${color.hall.cityLight}`,
                transform: "scale(2)",
                offset: 0.4,
              },
              { boxShadow: "0 0 0 0 transparent", transform: "scale(1)" },
            ],
            { duration: 700, delay: 180 + i * 90, easing: "ease-out" },
          );
        }
      });
    }
  };

  if (reduced || !el.winners.children.length) {
    build();
    return;
  }
  /* Constellation/year change: rows fade out together, then back in
     one after another from the top (staggered in build()). */
  const fade = el.winners.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 150,
    easing: "ease-in",
  });
  fade.onfinish = () => {
    el.winners.style.opacity = "";
    build();
  };
}

/* ── Year selector ─────────────────────────────────────────────────── */

function renderYear() {
  /* Forward never passes the running period's label year (re-read here so
     a tab that lives across a period boundary picks the new ceiling up);
     back never passes the hall's first year, Leo 2026's. The
     reachable-sign table depends on both the year and the clock, so it
     refreshes here too. */
  maxYear = periodOfTimestamp(Date.now()).year;
  refreshAllowed();
  el.yearLabel.textContent = String(selectedYear);
  el.yearNext.disabled = selectedYear >= maxYear;
  el.yearPrev.disabled = selectedYear <= minYear;
  updateSignArrows();
}

function setYear(year) {
  selectedYear = year;
  refreshAllowed();
  /* A sign reachable in the old year can be future in the new one — walk
     back to the nearest period that has actually started. setActive fires
     right away (name + winners), while stepTo lets the ring catch up. */
  if (!isAllowed(activeIndex)) {
    const target = clampSlot(activeIndex);
    stepTo(target);
    setActive(target);
  }
  renderYear();
  scheduleWinners();
}

el.yearPrev.addEventListener("click", () => {
  if (selectedYear > minYear) setYear(selectedYear - 1);
});
el.yearNext.addEventListener("click", () => {
  if (selectedYear < maxYear) setYear(selectedYear + 1);
});

/* ── Live period rollover ──────────────────────────────────────────────
   A hall left open across Danish midnight at a sign boundary updates by
   itself: the ceiling and the reachable arc refresh, and if the visitor
   was parked at the future wall — on the running period — the sky follows
   them into the new one. A minute tick catches the boundary while the tab
   stays visible; the visibilitychange handler below covers waking up. */
let watchedPeriodStart = now.startUtcMs;

function rollPeriod() {
  const p = currentPeriod();
  if (p.startUtcMs === watchedPeriodStart) return;
  const wasAtWall = selectedYear === maxYear && !isAllowed(activeIndex + 1);
  watchedPeriodStart = p.startUtcMs;
  maxYear = periodOfTimestamp(Date.now()).year;
  if (wasAtWall) {
    selectedYear = p.year;
    refreshAllowed();
    stepTo(p.index);
    setActive(p.index);
  }
  renderYear(); // re-reads the ceiling and the reachable arc either way
  scheduleWinners();
}
setInterval(rollPeriod, 60_000);

/* ── Active constellation ──────────────────────────────────────────── */

function updateSignArrows() {
  el.signPrev.disabled = !isAllowed(activeIndex - 1);
  el.signNext.disabled = !isAllowed(activeIndex + 1);
}

function setActive(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  updateSignArrows();
  lineDraw = reduced ? 1 : 0;
  if (reduced) {
    el.signName.textContent = SIGNS[index].constellation;
  } else {
    el.signName.style.opacity = "0";
    setTimeout(() => {
      el.signName.textContent = SIGNS[index].constellation;
      el.signName.style.opacity = "1";
    }, 160);
  }
  scheduleWinners();
}

function stepTo(index) {
  const target = ((index % 12) + 12) % 12;
  if (!isAllowed(target)) return; // no stepping into a period that hasn't begun
  lastInteraction = sceneT;
  angVel = 0;
  if (reduced) {
    /* Arrows are the only navigation under reduced motion: jump, no tween. */
    ringAngle = -target * SLOT;
    setActive(target);
    renderScene();
    return;
  }
  forcedSlot = target;
}
el.signPrev.addEventListener("click", () => stepTo(activeIndex - 1));
el.signNext.addEventListener("click", () => stepTo(activeIndex + 1));

/* ── Scene ─────────────────────────────────────────────────────────── */

const ctx = el.sky.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2); // uncapped melts phones
let W = 0;
let H = 0;
let CX = 0;
let CY = 0;
let RING_R = 0;
let EARTH_R = 0;
const TILT = 0.3; // ring tilt off horizontal — band, not flat circle
let CAM = 0;

/* Pre-rendered sprites/textures — all built once (or per resize), never
   per frame. */
let spriteCore, spriteSoft, spriteAccent;
let earthTex, cloudTex, cityLights;
let nebulae = [];
let starLayers = [];
let smallViewport = false;
let dropNebulae = false; // adaptive, <500px only (brief 3F)
let frameSkip = false; // adaptive fps cap
let fpsEma = 60;

function makeSprite(size, tint, hardness) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, tint);
  grad.addColorStop(hardness, tint);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "lighter";
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/* Flat illustrated Earth, painted once onto a 2:1 equirect strip: ocean
   gradient, soft blurred continent blobs (hand-placed, roughly the real
   continents), polar ice. The sphere look comes from the per-column
   asin() sampling in drawEarth(), not from the texture. */
const TEX_W = 1024;
const TEX_H = 512;
function makeEarthTexture() {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d");
  const sea = g.createLinearGradient(0, 0, 0, TEX_H);
  sea.addColorStop(0, color.hall.oceanDeep);
  sea.addColorStop(0.5, color.hall.ocean);
  sea.addColorStop(1, color.hall.oceanDeep);
  g.fillStyle = sea;
  g.fillRect(0, 0, TEX_W, TEX_H);

  /* [x, y, rx, ry, rot] in texture space — Americas, Africa/Europe, Asia,
     Australia, and a few islands. Painted twice (±TEX_W) so the seam wraps. */
  const land = [
    [150, 165, 88, 74, -0.3], // North America
    [212, 305, 55, 96, 0.32], // South America
    [478, 250, 80, 82, 0.12], // Africa
    [472, 140, 92, 42, 0.1], // Europe
    [660, 160, 175, 76, 0.05], // Asia
    [706, 272, 58, 38, 0.2], // SE Asia
    [810, 345, 66, 40, -0.15], // Australia
    [336, 398, 40, 22, 0.2], // islands
    [908, 188, 36, 24, -0.2],
  ];
  g.filter = "blur(6px)";
  for (const pass of [-TEX_W, 0, TEX_W]) {
    for (let i = 0; i < land.length; i++) {
      const [x, y, rx, ry, rot] = land[i];
      g.fillStyle = color.hall.land;
      g.beginPath();
      g.ellipse(x + pass, y, rx, ry, rot, 0, Math.PI * 2);
      g.fill();
      /* darker southern shading gives the flat shapes a hint of form */
      g.fillStyle = color.hall.landShade;
      g.beginPath();
      g.ellipse(x + pass + rx * 0.14, y + ry * 0.3, rx * 0.72, ry * 0.5, rot, 0, Math.PI * 2);
      g.fill();
    }
  }
  /* No ice bands in the texture: near the limb the thin columns compress
     the strip so hard that a white band there turns into a dotted moiré
     necklace along the edge. The polar caps are drawn in screen space in
     drawEarth() instead, where they stay soft. */
  g.filter = "none";

  /* wrap strip: drawEarth samples 1.5px-wide columns, and a column starting
     at the last texel used to read past the right edge into transparency —
     the dark seam line. A copy of the left edge appended past the right
     edge makes every sample wrap-safe. */
  const wrapped = document.createElement("canvas");
  wrapped.width = TEX_W + 4;
  wrapped.height = TEX_H;
  const wg = wrapped.getContext("2d");
  wg.drawImage(c, 0, 0);
  wg.drawImage(c, 0, 0, 4, TEX_H, TEX_W, 0, 4, TEX_H);
  return wrapped;
}

function makeCloudTexture() {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d");
  g.filter = "blur(9px)";
  g.fillStyle = color.hall.cloud;
  for (let i = 0; i < 26; i++) {
    const x = rand(i * 17 + 1) * TEX_W;
    const y = TEX_H * (0.14 + rand(i * 17 + 5) * 0.72);
    const rx = 30 + rand(i * 17 + 9) * 64;
    const ry = 7 + rand(i * 17 + 13) * 13;
    g.globalAlpha = 0.12 + rand(i * 17 + 3) * 0.14;
    for (const pass of [-TEX_W, 0, TEX_W]) {
      g.beginPath();
      g.ellipse(x + pass, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.filter = "none";
  g.globalAlpha = 1;
  const wrapped = document.createElement("canvas");
  wrapped.width = TEX_W + 4;
  wrapped.height = TEX_H;
  const wg = wrapped.getContext("2d");
  wg.drawImage(c, 0, 0);
  wg.drawImage(c, 0, 0, 4, TEX_H, TEX_W, 0, 4, TEX_H);
  return wrapped;
}

/* City lights live at fixed lon/lat on land: rejection-sample the finished
   surface texture so the pinpoints always sit on continents. */
function sampleCityLights(tex) {
  const g = tex.getContext("2d");
  const img = g.getImageData(0, 0, TEX_W, TEX_H).data;
  const lights = [];
  let seed = 0;
  while (lights.length < 110 && seed < 4000) {
    seed++;
    const x = Math.floor(rand(seed * 7 + 2) * TEX_W);
    const y = Math.floor(TEX_H * (0.12 + rand(seed * 7 + 4) * 0.76));
    const i = (y * TEX_W + x) * 4;
    const isLand = img[i + 1] > img[i + 2] + 12; // green over blue
    if (isLand) {
      lights.push({
        lon: (x / TEX_W) * Math.PI * 2,
        latFrac: y / TEX_H - 0.5, // linear-lat, matching the strip sampling
        tw: rand(seed * 7 + 6) * Math.PI * 2,
      });
    }
  }
  return lights;
}

function makeNebula(tint, r) {
  const size = Math.max(64, Math.ceil(r * 2));
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  /* three offset soft blobs read as a cloud rather than a perfect disc */
  for (let i = 0; i < 3; i++) {
    const ox = size / 2 + (rand(r + i * 31) - 0.5) * size * 0.34;
    const oy = size / 2 + (rand(r + i * 31 + 7) - 0.5) * size * 0.3;
    const rr = size * (0.28 + rand(r + i * 31 + 3) * 0.2);
    const grad = g.createRadialGradient(ox, oy, 0, ox, oy, rr);
    grad.addColorStop(0, tint);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.55;
    g.fillStyle = grad;
    g.beginPath();
    g.arc(ox, oy, rr, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function buildStarLayers() {
  const scale = smallViewport ? 0.55 : 1;
  const per1e5 = [10, 6.5, 4]; // density per 100k px², back to front
  const parallax = [10, 26, 52]; // px of drift per radian of ring turn
  const sizes = [
    [0.5, 1.1],
    [0.7, 1.5],
    [0.9, 1.9],
  ];
  const alphas = [0.45, 0.62, 0.8];
  starLayers = per1e5.map((d, li) => {
    const n = Math.round(((W * H) / 1e5) * d * scale);
    const stars = [];
    for (let i = 0; i < n; i++) {
      const s = li * 5000 + i;
      stars.push({
        x: rand(s * 11 + 1) * W,
        y: rand(s * 11 + 3) * H,
        r: sizes[li][0] + rand(s * 11 + 5) * (sizes[li][1] - sizes[li][0]),
        tw: rand(s * 11 + 7) * Math.PI * 2,
      });
    }
    return { stars, parallax: parallax[li], alpha: alphas[li] };
  });
}

function buildNebulae() {
  if (smallViewport && dropNebulae) {
    nebulae = [];
    return;
  }
  const specs = [
    { fx: 0.18, fy: 0.24, r: W * 0.2, tint: color.hall.nebulaBlue, par: 4 },
    { fx: 0.84, fy: 0.3, r: W * 0.17, tint: color.hall.nebulaRed, par: 6 },
    { fx: 0.56, fy: 0.8, r: W * 0.15, tint: color.hall.nebulaBlue, par: 5 },
  ];
  nebulae = specs.map((s) => ({ ...s, sprite: makeNebula(s.tint, s.r) }));
}

/* The canvas is the whole viewport; the globe anchors to the transparent
   #scene box in the page flow, so it scrolls with the content while the
   star field stays put behind everything. Re-read every frame (and on
   scroll under reduced motion) — one getBoundingClientRect per frame on
   one element is cheap, and it is what keeps the anchor honest. */
function updateAnchor() {
  const rect = el.scene.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  CX = rect.left + w / 2;
  CY = rect.top + h * 0.44;
  /* Earth deliberately smaller than the ring's front arc, so the active
     constellation reads over the lower limb instead of drowning in the disc */
  EARTH_R = Math.min(w * 0.13, h * 0.24);
  RING_R = Math.min(w * 0.34, h * 0.52);
  CAM = RING_R * 2.9;
}

function resize() {
  W = Math.max(1, window.innerWidth);
  H = Math.max(1, window.innerHeight);
  el.sky.width = W * dpr;
  el.sky.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // after every resize
  smallViewport = W < 500;
  updateAnchor();
  buildStarLayers();
  buildNebulae();
  if (reduced) renderScene();
}

spriteCore = makeSprite(48, "rgba(255,255,255,0.95)", 0.18);
spriteSoft = makeSprite(64, hexToRgba(color.hall.starLine, 0.8), 0.05);
spriteAccent = makeSprite(64, hexToRgba(color.base.red, 0.9), 0.12);
const spriteWarm = makeSprite(48, hexToRgba(color.hall.cityLight, 0.95), 0.22);
const spriteCap = makeSprite(96, hexToRgba(color.hall.ice, 0.9), 0.08);
earthTex = makeEarthTexture();
cloudTex = makeCloudTexture();
cityLights = sampleCityLights(earthTex);

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* slot k → screen position + perspective scale. z is depth toward the
   camera before tilt; front of the ring sits low, back sits high. */
function project(k) {
  const th = ringAngle + k * SLOT;
  const x = RING_R * Math.sin(th);
  const z = RING_R * Math.cos(th); // +RING_R = front
  const s = CAM / (CAM - z * Math.cos(TILT));
  return {
    x: CX + x * s,
    y: CY + z * Math.sin(TILT) * s,
    s,
    z,
  };
}

function wrapPI(a) {
  return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}
function nearestSlot() {
  return ((Math.round(-ringAngle / SLOT) % 12) + 12) % 12;
}

/* ── Drawing ───────────────────────────────────────────────────────── */

function drawSprite(sprite, x, y, r, alpha) {
  if (alpha <= 0 || r <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

function drawStarfield(t) {
  ctx.globalCompositeOperation = "lighter";
  for (const layer of starLayers) {
    const ox = ringAngle * layer.parallax;
    for (const star of layer.stars) {
      const x = ((star.x - ox) % W + W) % W;
      const tw = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 1.7 + star.tw);
      drawSprite(spriteSoft, x, star.y, star.r * 2.2, layer.alpha * 0.35 * tw);
      drawSprite(spriteCore, x, star.y, star.r, layer.alpha * tw);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawNebulae(t) {
  ctx.globalCompositeOperation = "lighter";
  for (const n of nebulae) {
    const drift = reduced ? 0 : t * 0.8; // almost imperceptible
    const x = ((n.fx * W - ringAngle * n.par + drift) % (W + n.r * 2)) - n.r;
    ctx.globalAlpha = 0.16;
    ctx.drawImage(n.sprite, x - n.r, n.fy * H - n.r, n.r * 2, n.r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

let earthRot = 0;
let cloudRot = 0;
const SHADE_X = 0.66;
const SHADE_Y = -0.75; // shadow toward the upper-right limb, away from the band

function drawEarth(t) {
  const R = EARTH_R;
  const colStep = 2;
  /* surface + clouds, column by column: asin() maps screen x to longitude,
     which is the whole "sphere" — same technique as ISS Docking's Earth,
     redrawn here in the site's flat illustrated palette. The circle clip
     smooths the stair-stepped column edges into a clean limb. */
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R - 0.5, 0, Math.PI * 2);
  ctx.clip();
  for (let sx = -R; sx < R; sx += colStep) {
    const ang = Math.asin(Math.min(1, Math.max(-1, (sx + colStep / 2) / R)));
    const h = 2 * Math.sqrt(Math.max(0, R * R - sx * sx));
    const lon = (earthRot + ang + Math.PI * 2) % (Math.PI * 2);
    const tx = (lon / (Math.PI * 2)) * TEX_W;
    ctx.drawImage(earthTex, tx, 0, 1.5, TEX_H, CX + sx, CY - h / 2, colStep, h);
    const lonC = (cloudRot + ang + Math.PI * 2) % (Math.PI * 2);
    const txC = (lonC / (Math.PI * 2)) * TEX_W;
    ctx.globalAlpha = 0.22;
    ctx.drawImage(cloudTex, txC, 0, 1.5, TEX_H, CX + sx, CY - h / 2, colStep, h);
    ctx.globalAlpha = 1;
  }
  /* polar caps, screen space: a soft round sprite squashed into an ellipse
     hugging each pole — clipped by the disc so it ends at the limb */
  ctx.globalAlpha = 0.42;
  ctx.drawImage(spriteCap, CX - R * 0.55, CY - R * 1.14, R * 1.1, R * 0.5);
  ctx.globalAlpha = 0.3;
  ctx.drawImage(spriteCap, CX - R * 0.45, CY + R * 0.68, R * 0.9, R * 0.44);
  ctx.globalAlpha = 1;
  ctx.restore();

  /* terminator: the side away from the band falls into night */
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(
    CX - SHADE_X * R,
    CY - SHADE_Y * R,
    CX + SHADE_X * R,
    CY + SHADE_Y * R,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.38, "rgba(0,0,0,0)");
  g.addColorStop(0.62, hexToRgba(color.hall.night, 0.55));
  g.addColorStop(1, hexToRgba(color.hall.night, 0.93));
  ctx.fillStyle = g;
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

  /* warm city pinpoints, only on the visible night side */
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < cityLights.length; i++) {
    const light = cityLights[i];
    const rel = wrapPI(light.lon - earthRot);
    if (Math.abs(rel) > Math.PI / 2 - 0.06) continue; // back hemisphere
    const sx = R * Math.sin(rel);
    const h = 2 * Math.sqrt(Math.max(0, R * R - sx * sx));
    const sy = light.latFrac * h;
    const shade = (sx * SHADE_X + sy * SHADE_Y) / R;
    if (shade < 0.18) continue; // day side — lights off
    const tw = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 2.6 + light.tw);
    drawSprite(
      spriteWarm,
      CX + sx,
      CY + sy,
      1.1 + R * 0.008,
      Math.min(1, (shade - 0.1) * 1.7) * tw,
    );
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  /* atmospheric rim: brightest at the limb, falling off both ways */
  ctx.globalCompositeOperation = "lighter";
  let rim = ctx.createRadialGradient(CX, CY, R * 0.82, CX, CY, R);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(1, hexToRgba(color.hall.atmosphere, 0.16));
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fill();
  rim = ctx.createRadialGradient(CX, CY, R * 0.99, CX, CY, R * 1.16);
  rim.addColorStop(0, hexToRgba(color.hall.atmosphere, 0.24));
  rim.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(CX, CY, R * 1.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function drawConstellation(k, t) {
  const p = project(k);
  const active = k === activeIndex;
  const depth = (p.s - 0.75) / 0.7; // ~0 at the back, ~1 at the front
  const size = RING_R * 0.3 * p.s;
  const back = p.z < 0;
  /* A sign whose period hasn't begun in the selected year stays in the
     sky but reads clearly asleep — extra dim, on top of ring depth. */
  const futureDim = isAllowed(k) ? 1 : 0.4;
  const baseAlpha = (0.28 + 0.62 * Math.max(0, Math.min(1, depth))) * futureDim;
  const pattern = SIGNS[k].pattern;

  const px = (star) => p.x + star.x * size;
  const py = (star) => p.y - star.y * size;

  ctx.globalCompositeOperation = "lighter";

  /* glow bloom behind the active pattern */
  if (active) {
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 1.05);
    glow.addColorStop(0, hexToRgba(color.base.red, 0.13));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  /* lines: faint and neutral everywhere; the active pattern re-draws them
     in the accent colour, star to star, in under half a second */
  const edges = pattern.edges;
  ctx.lineWidth = back ? 0.7 : 1;
  ctx.strokeStyle = hexToRgba(color.hall.starLine, active ? 0.1 : 0.16 * baseAlpha + 0.05);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  for (const [a, b] of edges) {
    ctx.moveTo(px(pattern.stars[a]), py(pattern.stars[a]));
    ctx.lineTo(px(pattern.stars[b]), py(pattern.stars[b]));
  }
  ctx.stroke();

  if (active && lineDraw > 0) {
    const total = edges.length;
    const progress = lineDraw * total;
    ctx.strokeStyle = hexToRgba(color.base.red, 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const f = Math.max(0, Math.min(1, progress - i));
      if (f <= 0) break;
      const a = pattern.stars[edges[i][0]];
      const b = pattern.stars[edges[i][1]];
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(a) + (px(b) - px(a)) * f, py(a) + (py(b) - py(a)) * f);
    }
    ctx.stroke();
  }

  /* stars: size from real magnitude, brighter stars bigger; the active
     pattern's stars pulse gently, each out of phase with the others */
  for (let i = 0; i < pattern.stars.length; i++) {
    const star = pattern.stars[i];
    const pulse = active && !reduced ? 1 + 0.2 * Math.sin(t * 2.4 + i * 0.9) : 1;
    const r =
      Math.max(0.8, 2.8 - 0.38 * star.mag) * (size / 110) * (0.7 + 0.5 * depth) * pulse;
    const alpha = Math.min(1, baseAlpha * (active ? 1.25 * pulse : 1));
    if (back) {
      /* back of the ring: smaller, dimmer, slightly blurred — soft sprite
         only, no sharp core */
      drawSprite(spriteSoft, px(star), py(star), r * 2.6, alpha * 0.8);
    } else {
      drawSprite(spriteSoft, px(star), py(star), r * 2.4, alpha * 0.5);
      drawSprite(active ? spriteAccent : spriteCore, px(star), py(star), r, alpha);
      if (active) drawSprite(spriteCore, px(star), py(star), r * 0.6, alpha);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/* shooting star across the far background every 20–40 s */
let shot = null;
let nextShotAt = 8; // first one early-ish, then 20–40s apart
function drawShootingStar(t) {
  if (reduced) return;
  if (!shot && t > nextShotAt) {
    const a = (rand(Math.floor(t) * 13 + 1) - 0.5) * 1.4 + (rand(Math.floor(t) + 2) > 0.5 ? 0 : Math.PI);
    shot = {
      t0: t,
      dur: 0.7,
      x: W * (0.15 + rand(Math.floor(t) * 13 + 3) * 0.7),
      y: H * (0.08 + rand(Math.floor(t) * 13 + 5) * 0.4),
      dx: Math.cos(a),
      dy: Math.sin(a) * 0.5 + 0.32,
      v: W * 0.9,
    };
  }
  if (!shot) return;
  const f = (t - shot.t0) / shot.dur;
  if (f >= 1) {
    shot = null;
    nextShotAt = t + 20 + rand(Math.floor(t) * 29 + 7) * 20;
    return;
  }
  const hx = shot.x + shot.dx * shot.v * f * shot.dur;
  const hy = shot.y + shot.dy * shot.v * f * shot.dur;
  const tail = 90;
  const fade = f < 0.2 ? f / 0.2 : 1 - (f - 0.2) / 0.8;
  const g = ctx.createLinearGradient(hx - shot.dx * tail, hy - shot.dy * tail, hx, hy);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, `rgba(255,255,255,${0.75 * fade})`);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(hx - shot.dx * tail, hy - shot.dy * tail);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  drawSprite(spriteCore, hx, hy, 1.8, fade);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function renderScene() {
  const t = sceneT;
  ctx.clearRect(0, 0, W, H);
  drawNebulae(t);
  drawStarfield(t);
  drawShootingStar(t);
  /* painter's order: back arc, Earth, front arc — that's the 3D */
  const order = [];
  for (let k = 0; k < 12; k++) order.push({ k, z: project(k).z });
  order.sort((a, b) => a.z - b.z);
  for (const { k, z } of order) if (z < 0) drawConstellation(k, t);
  drawEarth(t);
  for (const { k, z } of order) if (z >= 0) drawConstellation(k, t);
}

/* ── The one rAF loop ──────────────────────────────────────────────── */

let last = 0;
let rafId = 0;
function frame(ts) {
  const dt = last ? Math.min(33, ts - last) * 0.001 : 0; // unclamped explodes on a dropped frame
  last = ts;
  sceneT += dt;
  fpsEma = fpsEma * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;

  /* adaptive: on a struggling small screen, drop nebulae and halve stars —
     never the constellations (3F). On any screen, cap to every 2nd frame. */
  if (fpsEma < 34 && smallViewport && !dropNebulae) {
    dropNebulae = true;
    buildNebulae();
    buildStarLayers();
  }
  frameSkip = fpsEma < 30 ? !frameSkip : false;

  if (!reduced) {
    earthRot += 0.05 * dt;
    cloudRot += 0.068 * dt;

    if (dragging) {
      /* ringAngle written directly by the pointer handlers */
    } else if (forcedSlot !== null) {
      const err = wrapPI(ringAngle + forcedSlot * SLOT);
      ringAngle -= err * Math.min(1, dt * 6);
      if (Math.abs(err) < 0.004) {
        ringAngle = -forcedSlot * SLOT;
        forcedSlot = null;
      }
    } else if (Math.abs(angVel) > 0.25) {
      /* momentum, easing to a stop. The future is a wall, not a tunnel:
         the instant a fling crosses into a period that hasn't begun, the
         velocity reflects (softly) instead of coasting on through the
         future arc and out the other side. */
      ringAngle += angVel * dt;
      if (isAllowed(nearestSlot())) {
        angVel *= Math.exp(-2.2 * dt);
      } else {
        angVel = -angVel * 0.2;
      }
    } else if (sceneT - lastInteraction > 10) {
      /* auto-rotation: one full turn every two minutes, resuming only
         after ten untouched seconds. It travels backward through time,
         and in a year whose later periods haven't begun it ping-pongs
         inside the arc that has — never through the future. */
      angVel = 0;
      ringAngle += autoDir * ((Math.PI * 2) / 120) * dt;
      if (!isAllowed(nearestSlot())) autoDir = -autoDir;
    } else {
      /* snap the nearest REACHABLE constellation to the front */
      angVel = 0;
      const err = wrapPI(ringAngle + clampSlot(nearestSlot()) * SLOT);
      ringAngle -= err * Math.min(1, dt * 7);
    }

    setActive(clampSlot(nearestSlot()));
    if (lineDraw < 1) lineDraw = Math.min(1, lineDraw + dt / 0.45);
  }

  updateAnchor(); // the globe follows its box as the page scrolls
  if (!frameSkip) renderScene();
  rafId = requestAnimationFrame(frame);
}

/* Pause rendering entirely when the page is not visible; recheck the year
   ceiling on the way back (midnight may have passed). */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    last = 0;
  } else {
    rollPeriod(); // hidden tabs throttle the minute tick — catch up on wake
    renderYear();
    if (!rafId && !reduced) rafId = requestAnimationFrame(frame);
    if (reduced) renderScene();
  }
});

/* Flipping the OS motion setting mid-session takes effect immediately:
   into reduced, the ring settles on the active slot and holds one static
   finished frame; out of it, the loop simply resumes. */
motionQuery.addEventListener("change", () => {
  reduced = motionQuery.matches;
  if (reduced) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    last = 0;
    dragging = false;
    angVel = 0;
    forcedSlot = null;
    lineDraw = 1;
    ringAngle = -activeIndex * SLOT;
    renderScene();
  } else if (!document.hidden && !rafId) {
    rafId = requestAnimationFrame(frame);
  }
});

/* ── Pointer interaction — inside the globe area only ──────────────── */

let downX = 0;
let downY = 0;
let downT = 0;
let lastX = 0;
let moveV = 0;

/* Handlers are attached unconditionally and gated on the live `reduced`
   flag — under reduced motion the arrows are the only navigation, so the
   pointerdown guard is what turns dragging off. */
el.scene.addEventListener("pointerdown", (e) => {
  if (reduced) return;
  dragging = true;
  lastInteraction = sceneT;
  downX = lastX = e.clientX;
  downY = e.clientY;
  downT = sceneT;
  moveV = 0;
  angVel = 0;
  forcedSlot = null;
  el.scene.setPointerCapture(e.pointerId);
});
el.scene.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    lastInteraction = sceneT;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    /* vertical axis only: horizontal drag turns the ring, nothing tumbles.
       Dragging toward a period that hasn't begun meets rubber-band
       resistance instead of travel — without it a long drag could carry
       the front clean through the future arc and out the other side. */
    const dTheta = dx / (RING_R * 1.15);
    const tentative = ringAngle + dTheta;
    ringAngle = isAllowed(Math.round(-tentative / SLOT)) ? tentative : ringAngle + dTheta * 0.15;
    moveV = moveV * 0.6 + (dTheta / Math.max(0.001, 1 / 60)) * 0.4;
});
const release = (e) => {
    if (!dragging) return;
    dragging = false;
    lastInteraction = sceneT;
    const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (dist < 8 && sceneT - downT < 0.4) {
      /* a tap: rotate the tapped constellation to the front */
      /* project() speaks viewport coordinates now (fixed full-bleed
         canvas), so the pointer's client position compares directly */
      const mx = e.clientX;
      const my = e.clientY;
      let hit = null;
      for (let k = 0; k < 12; k++) {
        const p = project(k);
        const size = RING_R * 0.3 * p.s;
        const d = Math.hypot(mx - p.x, my - p.y);
        if (d < size * 0.95 && (!hit || d < hit.d)) hit = { k, d };
      }
      if (hit && isAllowed(hit.k)) forcedSlot = hit.k;
      moveV = 0;
    }
    angVel = Math.max(-6, Math.min(6, moveV));
};
el.scene.addEventListener("pointerup", release);
el.scene.addEventListener("pointercancel", () => {
  dragging = false;
  lastInteraction = sceneT;
});
/* touch-action:none handles it in every modern browser; the explicit
   preventDefault is the belt to those braces (3F) */
el.scene.addEventListener(
  "touchmove",
  (e) => {
    if (dragging) e.preventDefault();
  },
  { passive: false },
);

/* ── Boot ──────────────────────────────────────────────────────────── */

new ResizeObserver(resize).observe(el.scene);
addEventListener("resize", resize, { passive: true });
/* Under reduced motion there is no loop to chase the anchor, so scrolling
   re-renders the one static frame (rAF-debounced one-shot, not a loop). */
let scrollShot = 0;
addEventListener(
  "scroll",
  () => {
    if (!reduced || scrollShot) return;
    scrollShot = requestAnimationFrame(() => {
      scrollShot = 0;
      updateAnchor();
      renderScene();
    });
  },
  { passive: true },
);
resize();
el.signName.textContent = SIGNS[activeIndex].constellation;
renderYear();
renderWinners(); // nine unclaimed rows until data lands — never an error state

if (reduced) {
  renderScene(); // one static frame; arrows re-render on demand
} else {
  rafId = requestAnimationFrame(frame);
}

/* All raw rows for every game, read whole from both of its paths (planet
   key + legacy gamekey, same union as the scoreboard) at view time. */
(async () => {
  await Promise.all(
    GAMES.map(async (game) => {
      const paths = game.gamekey === game.key ? [game.key] : [game.key, game.gamekey];
      const rows = [];
      for (const path of paths) {
        try {
          const snap = await get(ref(db, `arcade/scores/${path}`));
          snap.forEach((child) => {
            rows.push(child.val());
          });
        } catch (err) {
          console.warn(`hall-of-stars: could not read ${path}`, err);
          loadFailed = true;
        }
      }
      rowsByGame.set(game.key, rows);
    }),
  );

  /* the year floor: the label year of the earliest timestamped score */
  let minTs = Infinity;
  for (const rows of rowsByGame.values()) {
    for (const row of rows) {
      const t = Number(row?.createdAt);
      if (Number.isFinite(t) && t < minTs) minTs = t;
    }
  }
  if (Number.isFinite(minTs)) {
    /* A stray score stamped before the hall existed must not reopen the
       years before it — the epoch is the floor, whatever the data says. */
    minYear = Math.max(EPOCH_YEAR, Math.min(maxYear, periodOfTimestamp(minTs).year));
  }
  if (loadFailed && ![...rowsByGame.values()].some((r) => r.length)) {
    el.note.textContent = "The leaderboard could not be reached — showing the empty sky.";
    el.note.classList.remove("hidden");
  }
  renderYear();
  renderWinners();
})();
