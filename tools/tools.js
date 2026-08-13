import { DIAGRAMS, TOOLS, reduced, isMobile, mulberry32 } from "./shared/tools-data.js";

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ============================================================
   Backdrop — still, quiet starfield. No motion beyond a slow
   twinkle; this room doesn't need a UFO passing through.
   ============================================================ */
(function backdrop() {
  const cv = $("backdrop");
  const ctx = cv.getContext("2d");
  let w = 0, h = 0, dpr = 1, stars = [];

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = mulberry32(4118);
    const n = isMobile() ? 70 : 140;
    stars = Array.from({ length: n }, () => ({
      x: rnd() * w, y: rnd() * h,
      r: 0.3 + rnd() * 0.9,
      a: 0.1 + rnd() * 0.32,
      sp: 0.15 + rnd() * 0.5,
      ph: rnd() * 6.28,
    }));
  }

  function frame(t) {
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, w, h);
    for (const s of stars) {
      ctx.globalAlpha = reduced() ? s.a : s.a * (0.7 + 0.3 * Math.sin(t * 0.0008 * s.sp + s.ph));
      ctx.fillStyle = "#dfe8ff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  size();
  window.addEventListener("resize", size, { passive: true });
  requestAnimationFrame(frame);
})();

/* ============================================================
   Field — every model drifts slowly and continuously on its own
   path, like objects in zero gravity. No panning, no scrolling:
   all ten always stay within the viewport, at every screen size.
   ============================================================ */
const space = $("space");
const TOP_CLEAR = 82;
const BOTTOM_CLEAR = 24;
const SIDE_CLEAR = 20;

function fitLabelFontSize(text, maxWidthPx, maxPx, minPx) {
  const estWidth = text.length * 0.68 * maxPx;
  if (estWidth <= maxWidthPx) return maxPx;
  return Math.max(minPx, maxWidthPx / (text.length * 0.68));
}

let drifters = [];
let rafId = null;
let lastT = 0;

function bounds() {
  return {
    minX: SIDE_CLEAR,
    maxX: window.innerWidth - SIDE_CLEAR,
    minY: TOP_CLEAR,
    maxY: window.innerHeight - BOTTOM_CLEAR,
  };
}

function seedSpots(n, r) {
  const rnd = mulberry32(20260813);
  const m = isMobile();
  const b = bounds();
  const cols = m ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const areaW = b.maxX - b.minX, areaH = b.maxY - b.minY;
  const cellW = areaW / cols, cellH = areaH / rows;
  const jitterX = Math.max(0, cellW / 2 - r);
  const jitterY = Math.max(0, cellH / 2 - r);
  const spots = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = b.minX + cellW * (col + 0.5);
    const cy = b.minY + cellH * (row + 0.5);
    spots.push({
      x: clamp(cx + (rnd() * 2 - 1) * jitterX, b.minX + r, b.maxX - r),
      y: clamp(cy + (rnd() * 2 - 1) * jitterY, b.minY + r, b.maxY - r),
    });
  }
  return spots;
}

function buildNodes() {
  space.querySelectorAll(".tool-node").forEach((n) => n.remove());
  const m = isMobile();
  const r = m ? 50 : 70;
  const spots = seedSpots(TOOLS.length, r);
  const labelMaxWidth = m ? 96 : 140;
  const labelMaxPx = m ? 8.6 : 10.56;
  const labelMinPx = m ? 7 : 8.5;
  const rnd = mulberry32(9042);

  drifters = TOOLS.map((tool, i) => {
    const isReady = !!tool.ready;
    const el = document.createElement(isReady ? "a" : "div");
    if (isReady) el.href = "./" + tool.slug + "/";
    el.className = "tool-node" + (isReady ? "" : " placeholder");
    if (!isReady) el.setAttribute("aria-hidden", "true");

    const diagram = DIAGRAMS[tool.diagram].thumb();
    diagram.setAttribute("class", "tool-diagram");
    diagram.setAttribute("aria-hidden", "true");
    diagram.setAttribute("draggable", "false");
    el.appendChild(diagram);

    if (isReady) {
      const label = document.createElement("span");
      label.className = "tool-name";
      label.textContent = tool.shortName;
      label.style.fontSize = fitLabelFontSize(tool.shortName, labelMaxWidth, labelMaxPx, labelMinPx) + "px";
      el.appendChild(label);
      el.setAttribute("aria-label", tool.name);
    }

    space.appendChild(el);

    const angle = rnd() * Math.PI * 2;
    const speed = m ? 4.5 + rnd() * 3.5 : 5 + rnd() * 5;
    return {
      el, r,
      x: spots[i].x, y: spots[i].y,
      angle,
      angleVel: (rnd() - 0.5) * 0.35,
      speed, curSpeed: speed,
      hover: false,
    };
  });

  drifters.forEach((d) => {
    const slow = () => { d.hover = true; };
    const wake = () => { d.hover = false; };
    d.el.addEventListener("pointerenter", slow);
    d.el.addEventListener("pointerleave", wake);
    d.el.addEventListener("touchstart", slow, { passive: true });
    d.el.addEventListener("touchend", wake, { passive: true });
    d.el.addEventListener("focus", slow);
    d.el.addEventListener("blur", wake);
  });
}

function placeStatic() {
  for (const d of drifters) {
    d.el.style.transform = "translate3d(" + (d.x - d.r).toFixed(1) + "px, " + (d.y - d.r).toFixed(1) + "px, 0)";
  }
}

function step(t) {
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
  lastT = t;
  const b = bounds();

  for (const d of drifters) {
    d.angle += d.angleVel * dt;
    const target = d.hover ? d.speed * 0.04 : d.speed;
    d.curSpeed += (target - d.curSpeed) * Math.min(1, dt * 2.2);
    d.x += Math.cos(d.angle) * d.curSpeed * dt;
    d.y += Math.sin(d.angle) * d.curSpeed * dt;

    if (d.x < b.minX + d.r) { d.x = b.minX + d.r; d.angle = Math.PI - d.angle; }
    if (d.x > b.maxX - d.r) { d.x = b.maxX - d.r; d.angle = Math.PI - d.angle; }
    if (d.y < b.minY + d.r) { d.y = b.minY + d.r; d.angle = -d.angle; }
    if (d.y > b.maxY - d.r) { d.y = b.maxY - d.r; d.angle = -d.angle; }
  }

  for (let i = 0; i < drifters.length; i++) {
    for (let j = i + 1; j < drifters.length; j++) {
      const a = drifters[i], c = drifters[j];
      const dx = c.x - a.x, dy = c.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minDist = a.r + c.r;
      if (dist < minDist) {
        const overlap = (minDist - dist) / 2;
        const ux = dx / dist, uy = dy / dist;
        a.x -= ux * overlap; a.y -= uy * overlap;
        c.x += ux * overlap; c.y += uy * overlap;
        const pushAngle = Math.atan2(dy, dx);
        a.angle = pushAngle + Math.PI;
        c.angle = pushAngle;
      }
    }
  }

  placeStatic();
  rafId = requestAnimationFrame(step);
}

function startDrift() {
  cancelAnimationFrame(rafId);
  lastT = 0;
  if (reduced()) { placeStatic(); return; }
  rafId = requestAnimationFrame(step);
}

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  buildNodes();
  startDrift();
}
boot();

let resizeTimer = null;
let wasMobile = isMobile();
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (isMobile() !== wasMobile) {
      wasMobile = isMobile();
      buildNodes();
      startDrift();
      return;
    }
    const b = bounds();
    for (const d of drifters) {
      d.x = clamp(d.x, b.minX + d.r, b.maxX - d.r);
      d.y = clamp(d.y, b.minY + d.r, b.maxY - d.r);
    }
  }, 150);
});
