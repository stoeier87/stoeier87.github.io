import { guardPage } from "./shared/gate.js";
import { definePlanetField } from "../shared/elements/planet-field.ts";

/**
 * Forsiden af Gio-universet: solen står som en RIGTIG klode lavt på
 * himlen — samme <st-planet-field> som stoeier.dk's forside (regel 12:
 * komponeret gennem props, aldrig en ny scene i hånden) — og små
 * hjerter svæver op gennem lyset. Rører man et hjerte, springer det ud
 * i en lille byge af flere; rører man tomt hav af stjerner, stiger et
 * enkelt lille hjerte op fra fingeren.
 *
 * Én rAF ejer det hele (feltet er `driven` og tickes herfra), dpr-cap
 * 2, setTransform efter resize. Reduced motion: solen står stille,
 * hjerterne hænger stille i luften og byger toner bare ind og ud.
 */

definePlanetField();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Solen ──────────────────────────────────────────────────────────── */
const field = document.getElementById("bg");

const sunSpec = {
  name: "EL SOL",
  r: 0.55,
  s0: 0.62,
  px: 0.5,
  pf: 0.5,
  hi: "#ffd166",
  lo: "#e0704a",
  seed: 12,
  spin: reduced ? 0 : 0.015,
  depth: 40,
};

function layoutSun() {
  const portrait = window.innerHeight >= window.innerWidth;
  /* lav og beskåret af underkanten — en glødende bue bag kortene,
     ikke en væg af orange */
  sunSpec.r = portrait ? 0.44 : 0.38;
  sunSpec.s0 = portrait ? 0.82 : 0.86;
  if (field && !field.failed) field.planets = [sunSpec];
}

if (field) {
  field.addEventListener("planet-field-failed", () => {
    /* uden WebGL bærer CSS-gradienten og hjerterne temaet alene */
  });
  field.starLayers = [
    { count: 110, radius: 1.1, alpha: 0.7, parallax: 0.06 },
    { count: 80, radius: 0.7, alpha: 0.4, parallax: 0.03 },
  ];
  /* selvlysende: høj varm ambient, blød varm key — det er en sol,
     ikke en belyst planet */
  field.lighting = {
    ambientColor: "#ffd166",
    ambientIntensity: 1.2,
    keyColor: "#fff3d6",
    keyIntensity: 0.55,
  };
  layoutSun();
}

/* ── Hjerterne ──────────────────────────────────────────────────────── */
const canvas = document.getElementById("hearts");
const ctx = canvas.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2); // uncapped melts phones
let W = 0;
let H = 0;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // after every resize
  layoutSun();
}
addEventListener("resize", resize, { passive: true });
resize();

const rand = (a, b) => a + Math.random() * (b - a);

const HEART_COUNT = 11;
const hearts = [];
function makeHeart(fromBottom) {
  return {
    x: rand(24, Math.max(48, W - 24)),
    y: fromBottom && !reduced ? H + 24 : rand(H * 0.1, H * 0.86),
    v: rand(9, 22),
    sway: rand(0, 6),
    size: rand(0.8, 1.7),
    a: rand(0.4, 0.85),
  };
}
for (let i = 0; i < HEART_COUNT; i++) hearts.push(makeHeart(false));

/* bygerne: små hjerter der springer ud af det man rørte */
let burst = [];

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

function burstAt(x, y, big) {
  const n = big ? 12 : 1;
  for (let i = 0; i < n; i++) {
    const ang = rand(0, Math.PI * 2);
    const sp = big ? rand(30, 90) : 0;
    burst.push({
      x,
      y,
      vx: reduced ? 0 : Math.cos(ang) * sp,
      vy: reduced ? 0 : Math.sin(ang) * sp - 40,
      /* reduced: bygen står som en lille ring og toner ud i stedet */
      ox: reduced && big ? Math.cos((i / n) * Math.PI * 2) * 34 : 0,
      oy: reduced && big ? Math.sin((i / n) * Math.PI * 2) * 34 : 0,
      size: rand(0.45, 0.95),
      t: rand(0.9, 1.4),
    });
  }
}

/* Klik/tryk: rammer man et hjerte → byge; ellers → ét lille hjerte.
   Lyttes på window så kortene og lågen beholder deres egne klik. */
addEventListener("pointerdown", (e) => {
  if (e.target.closest("a, button, input, form, summary")) return;
  let hit = null;
  for (const h of hearts) {
    if (Math.hypot(e.clientX - h.x, e.clientY - h.y) < 20 + 14 * h.size) {
      hit = h;
      break;
    }
  }
  if (hit) {
    burstAt(hit.x, hit.y, true);
    Object.assign(hit, makeHeart(true));
  } else {
    burstAt(e.clientX, e.clientY, false);
  }
});

/* ── Én rAF: sol-feltet tickes, hjerterne flyder ────────────────────── */
let last = 0;
function frame(ts) {
  const dt = last ? Math.min(33, ts - last) * 0.001 : 0;
  last = ts;
  const t = ts * 0.001;

  field?.tick?.(ts);

  ctx.clearRect(0, 0, W, H);
  for (const h of hearts) {
    if (!reduced) {
      h.y -= h.v * dt;
      h.x += Math.sin(t * 0.9 + h.sway) * 8 * dt;
      if (h.y < -26) Object.assign(h, makeHeart(true));
    }
    const pulse = reduced ? 1 : 1 + Math.sin(t * 2 + h.sway) * 0.08;
    drawHeartAt(h.x, h.y, h.size * pulse, h.a);
  }
  for (const b of burst) {
    b.t -= dt;
    if (!reduced) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy -= 26 * dt; // små hjerter stiger, de falder ikke
    }
    drawHeartAt(b.x + b.ox, b.y + b.oy, b.size, Math.max(0, Math.min(1, b.t)));
  }
  burst = burst.filter((b) => b.t > 0);

  requestAnimationFrame(frame);
}

guardPage();
requestAnimationFrame(frame);
