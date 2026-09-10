import { guardPage } from "../shared/gate.js";
import published from "../../../content/gio/published.json";

/**
 * Pensamientos — en løbende strøm af refleksioner, nyeste øverst.
 *
 * Siden viser KUN content/gio/published.json — køen ligger i
 * content/gio/queue.json, som intet her importerer, så den bundtes
 * aldrig og kan aldrig hentes over HTTP. En upubliceret tekst er
 * simpelthen ikke i buildet; det er hele designet, ingen kryptering.
 *
 * Arbejdsgangen er nu manuel med vilje: han skriver dagens tanke på
 * engelsk i en Claude-session, som lægger den ind i published.json med
 * publiceringsdatoen og deployer. Ingen læst/ulæst-tilstand, ingen
 * dagslås — hun skal kunne dykke ned i strømmen når som helst.
 *
 * Rammen er spansk (hendes sprog); selve indlæggene er engelske og
 * bærer lang="en". Datoen vises uden årstal: "10 sep".
 */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Afsnit på tomme linjer, linjeskift indenfor et afsnit bevares. */
function bodyHtml(body) {
  return String(body)
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

/* Publiceringsdato uden årstal, på spansk: "10 sep" */
const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function prettyDate(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ES[m - 1]}`;
}

const entries = [...published.entries].sort((a, b) => (a.date < b.date ? 1 : -1));

const feed = document.getElementById("feed");

if (entries.length === 0) {
  feed.innerHTML = `<p class="text-center text-sm leading-relaxed text-text-muted">Aún no hay pensamientos — el primero llega pronto.</p>`;
} else {
  feed.innerHTML = entries
    .map(
      (entry) => `
    <article class="flex flex-col gap-3 rounded-card border border-border-faint bg-card-bg px-6 py-6 backdrop-blur-[2px]">
      <p class="flex items-center gap-2 text-xs tracking-loose text-text-dim">
        <span class="text-accent" aria-hidden="true">♥</span>${escapeHtml(prettyDate(entry.date))}
      </p>
      <div lang="en" class="flex flex-col gap-3 text-base leading-relaxed text-ink">${bodyHtml(entry.body)}</div>
    </article>`,
    )
    .join("");
}

/* ── Det store svævende hjerte med Gio indeni ───────────────────────
   Ét stort, glødende hjerte der svæver roligt øverst til højre, med
   hendes navn i guld. Prikker man på det, drysser det små hjerter.
   Sidens eneste rAF; reduced motion = hjertet hænger stille og dryssene
   toner bare ud på stedet. */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("corazon");
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
}
addEventListener("resize", resize, { passive: true });
resize();

function heartPos(t) {
  const bx = W - 64;
  const by = 108;
  if (reduced) return { x: bx, y: by };
  return { x: bx + Math.sin(t * 0.5) * 10, y: by + Math.sin(t * 0.8) * 9 };
}

function drawHeartPath(scale) {
  ctx.beginPath();
  ctx.moveTo(0, 6 * scale);
  ctx.bezierCurveTo(-9 * scale, -2 * scale, -5 * scale, -10 * scale, 0, -4 * scale);
  ctx.bezierCurveTo(5 * scale, -10 * scale, 9 * scale, -2 * scale, 0, 6 * scale);
}

let sprinkles = [];

addEventListener("pointerdown", (e) => {
  if (e.target.closest("a, button, input, form, summary")) return;
  const t = performance.now() * 0.001;
  const { x, y } = heartPos(t);
  if (Math.hypot(e.clientX - x, e.clientY - y) < 46) {
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 26 + Math.random() * 70;
      sprinkles.push({
        x,
        y,
        vx: reduced ? 0 : Math.cos(ang) * sp,
        vy: reduced ? 0 : Math.sin(ang) * sp - 36,
        ox: reduced ? Math.cos((i / 10) * Math.PI * 2) * 40 : 0,
        oy: reduced ? Math.sin((i / 10) * Math.PI * 2) * 40 : 0,
        size: 0.5 + Math.random() * 0.7,
        t: 0.9 + Math.random() * 0.5,
      });
    }
  }
});

let last = 0;
function frame(ts) {
  const dt = last ? Math.min(33, ts - last) * 0.001 : 0;
  last = ts;
  const t = ts * 0.001;
  ctx.clearRect(0, 0, W, H);

  const { x, y } = heartPos(t);
  const pulse = reduced ? 1 : 1 + Math.sin(t * 1.6) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "rgba(224,58,47,0.16)";
  ctx.strokeStyle = "rgba(224,58,47,0.95)";
  ctx.shadowColor = "rgba(224,58,47,0.8)";
  ctx.shadowBlur = 16;
  ctx.lineWidth = 1.8;
  drawHeartPath(4.6);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = "13px 'Archivo Black', 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,209,102,0.95)";
  ctx.fillText("Gio", 0, 1);
  ctx.restore();

  for (const s of sprinkles) {
    s.t -= dt;
    if (!reduced) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 24 * dt; // små hjerter stiger
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, s.t));
    ctx.translate(s.x + s.ox, s.y + s.oy);
    ctx.strokeStyle = "rgba(224,58,47,0.95)";
    ctx.shadowColor = "rgba(224,58,47,0.8)";
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.6;
    drawHeartPath(s.size);
    ctx.stroke();
    ctx.restore();
  }
  sprinkles = sprinkles.filter((s) => s.t > 0);

  requestAnimationFrame(frame);
}

guardPage();
requestAnimationFrame(frame);
