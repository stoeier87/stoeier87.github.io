import { PLANETS } from "./shared/starfield.js";
import { definePlanetField } from "../shared/elements/planet-field.ts";
import { color } from "../tokens.ts";

/* Background — <st-planet-field> (issue #61), replacing the hand-rolled 2D
   starfield that used to live here. Three planets drift behind the cards at
   low parallax, far enough out on the sides to stay clear of them.

   The eight per-card planets below are deliberately NOT converted: they are UI
   rather than background, and nine WebGL contexts on one page would sit at the
   browser's per-page limit for no gain. */
definePlanetField();

const backdrop = document.getElementById("bg");
if (backdrop) {
  backdrop.planets = [
    // s0 is negative here on purpose: worldY starts at 0.55 * viewport height,
    // so a positive s0 would push every one of them below the fold.
    {
      name: "JUPITER",
      r: 0.13,
      s0: -0.55,
      px: -0.09,
      pf: 0.6,
      hi: color.planet.jupiterHi,
      lo: color.planet.jupiterLo,
      bands: true,
      spin: 0.1,
    },
    {
      name: "SATURN",
      r: 0.085,
      s0: 0.35,
      px: 1.09,
      pf: 0.6,
      hi: color.planet.saturnHi,
      lo: color.planet.saturnLo,
      ring: true,
      spin: 0.09,
    },
    {
      name: "NEPTUN",
      r: 0.035,
      s0: 0.5,
      px: 0.05,
      pf: 0.6,
      hi: color.planet.neptunHi,
      lo: color.planet.neptunLo,
      spin: 0.06,
    },
  ];
}

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
