import { PLANETS } from "./shared/starfield.js";

// Background starfield
const c = document.getElementById("bg");
const x = c.getContext("2d");
let w = 0,
  h = 0,
  dpr = 1,
  stars = [];

function rs() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  w = innerWidth;
  h = innerHeight;
  c.width = w * dpr;
  c.height = h * dpr;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = [...Array(Math.max(80, Math.round((w * h) / 14000)))].map(() => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.6 + 0.4,
    s: Math.random() * 0.6 + 0.2,
  }));
}

addEventListener("resize", rs, { passive: true });
rs();

function f(t) {
  x.clearRect(0, 0, w, h);
  for (const s of stars) {
    s.y += s.s;
    if (s.y > h) s.y = -2;
    x.globalAlpha = 0.5 + Math.sin(t * 0.001 + s.x) * 0.5;
    x.beginPath();
    x.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    x.fillStyle = "#fff";
    x.fill();
  }
  x.globalAlpha = 1;
  requestAnimationFrame(f);
}

requestAnimationFrame(f);

// Planet cards
const planetMap = {
  merkur: 0,
  venus: 1,
  jorden: 2,
  mars: 3,
  jupiter: 4,
  saturn: 5,
  uranus: 6,
  neptun: 7,
};

function initCardPlanet(card, planetName) {
  const planetIndex = planetMap[planetName];
  if (planetIndex === undefined) return;

  const planet = PLANETS[planetIndex];
  const spanEl = card.querySelector(".planet");

  // Create planet canvas
  const canvas = document.createElement("canvas");
  canvas.className = "planet-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = 120;
  canvas.height = 120;

  // Replace the span with the canvas
  if (spanEl) {
    spanEl.replaceWith(canvas);
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 120 * dpr;
  canvas.height = 120 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  function drawPlanet(p, x, y, r) {
    let glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
    glow.addColorStop(0, "rgba(255,255,255,0.06)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, 6.2832);
    ctx.fill();

    if (p.ring) {
      ctx.strokeStyle = "rgba(214, 194, 150, 0.55)";
      ctx.lineWidth = r * 0.3;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, Math.PI, 6.2832);
      ctx.stroke();
    }

    let body = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.35,
      r * 0.1,
      x,
      y,
      r * 1.05,
    );
    body.addColorStop(0, p.hi);
    body.addColorStop(1, p.lo);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();

    if (p.bands || p.earth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.clip();
      if (p.bands) {
        ctx.fillStyle = "rgba(110, 74, 44, 0.35)";
        ctx.fillRect(x - r, y - r * 0.52, r * 2, r * 0.18);
        ctx.fillRect(x - r, y - r * 0.1, r * 2, r * 0.22);
        ctx.fillRect(x - r, y + r * 0.38, r * 2, r * 0.15);
        ctx.fillStyle = "rgba(200, 90, 60, 0.75)";
        ctx.beginPath();
        ctx.ellipse(
          x + r * 0.35,
          y + r * 0.24,
          r * 0.18,
          r * 0.11,
          0,
          0,
          6.2832,
        );
        ctx.fill();
      }
      if (p.earth) {
        ctx.fillStyle = "rgba(76, 156, 94, 0.85)";
        ctx.beginPath();
        ctx.ellipse(
          x - r * 0.3,
          y - r * 0.15,
          r * 0.42,
          r * 0.3,
          0.5,
          0,
          6.2832,
        );
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(
          x + r * 0.42,
          y + r * 0.35,
          r * 0.28,
          r * 0.2,
          -0.4,
          0,
          6.2832,
        );
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.ellipse(x + r * 0.1, y - r * 0.8, r * 0.35, r * 0.18, 0, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }

    if (p.ring) {
      ctx.strokeStyle = "rgba(224, 204, 160, 0.7)";
      ctx.lineWidth = r * 0.3;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, 0, Math.PI);
      ctx.stroke();
    }
  }

  function animate(time) {
    ctx.clearRect(0, 0, 120, 120);

    const cx = 60;
    const cy = 60;
    const planetRadius = 32;

    drawPlanet(planet, cx, cy, planetRadius);

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

document.querySelectorAll(".planet-card").forEach((card) => {
  const planetName = card.getAttribute("data-planet");
  initCardPlanet(card, planetName);
});
