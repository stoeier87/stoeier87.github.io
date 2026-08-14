import { definePlanetField } from "../shared/elements/planet-field.ts";
import { CardPlanetRenderer } from "../shared/elements/card-planet-renderer.ts";
import { color } from "../tokens.ts";

definePlanetField();

/* Planet specs — visual props only. r/s0/px/pf are overridden per usage:
   - card renderer: places each planet at origin, unit radius (r=0 placeholder)
   - backdrop:      spread across the viewport with real r/s0/px/pf values */
const FEATURED_SPECS = {
  merkur:  { name: "MERKUR",  r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.merkurHi,  lo: color.planet.merkurLo,  spin: 0.05              },
  venus:   { name: "VENUS",   r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.venusHi,   lo: color.planet.venusLo,   spin: 0.035             },
  jorden:  { name: "JORDEN",  r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.jordenHi,  lo: color.planet.jordenLo,  spin: 0.08,  earth: true },
  mars:    { name: "MARS",    r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.marsHi,    lo: color.planet.marsLo,    spin: 0.075             },
  jupiter: { name: "JUPITER", r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.jupiterHi, lo: color.planet.jupiterLo, spin: 0.16,  bands: true },
  saturn:  { name: "SATURN",  r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.saturnHi,  lo: color.planet.saturnLo,  spin: 0.15,  ring: true  },
  uranus:  { name: "URANUS",  r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.uranusHi,  lo: color.planet.uranusLo,  spin: 0.09              },
  neptun:  { name: "NEPTUN",  r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.neptunHi,  lo: color.planet.neptunLo,  spin: 0.095             },
};

/* Background — <st-planet-field> (issue #61). All 8 planets are present in
   the backdrop, spread across the canvas. No drift: the travel pan is the
   motion. Hovering a card calls setTravelTarget(), which pans + zooms the
   backdrop to centre that planet — so you see where you're going before you
   click.

   worldY = H * 0.55 + s0 * H * pf  (on a page with no scroll, journeyEnd = H)
   With pf=1 the range is s0 ∈ [-0.55, 0.45] → worldY ∈ [0, H].
   px is the horizontal fraction of viewport width (can exceed [0,1]). */
const backdrop = document.getElementById("bg");
if (backdrop) {
  backdrop.planets = [
    { ...FEATURED_SPECS.merkur,  r: 0.018, s0: -0.30, px: -0.25, pf: 0.40 },
    { ...FEATURED_SPECS.venus,   r: 0.030, s0:  0.10, px: -0.04, pf: 0.50 },
    { ...FEATURED_SPECS.jorden,  r: 0.038, s0: -0.15, px:  0.17, pf: 0.55 },
    { ...FEATURED_SPECS.mars,    r: 0.024, s0:  0.22, px:  0.38, pf: 0.45 },
    { ...FEATURED_SPECS.jupiter, r: 0.09,  s0: -0.35, px:  0.59, pf: 0.85 },
    { ...FEATURED_SPECS.saturn,  r: 0.075, s0:  0.30, px:  0.80, pf: 0.78 },
    { ...FEATURED_SPECS.uranus,  r: 0.038, s0: -0.05, px:  1.01, pf: 0.55 },
    { ...FEATURED_SPECS.neptun,  r: 0.040, s0:  0.18, px:  1.25, pf: 0.58 },
  ];
}

/* Card planet icons — one shared Three.js renderer for all 8 cards, same
   PlanetBody class as the background. One rAF loop drives everything below. */
const dpr = Math.min(devicePixelRatio, 2);
const cardRenderer = new CardPlanetRenderer(120);

document.querySelectorAll(".planet-card").forEach((card) => {
  const key = card.getAttribute("data-planet");
  const spec = FEATURED_SPECS[key];
  if (!spec) return;

  const canvas = document.createElement("canvas");
  canvas.className = "planet-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = 120 * dpr;
  canvas.height = 120 * dpr;

  const spanEl = card.querySelector(".planet");
  if (spanEl) spanEl.replaceWith(canvas);

  cardRenderer.add(spec, canvas);
});

/* Card hover:
   - backdrop pans + zooms to the hovered planet (setTravelTarget)
   - header padding collapses so the planet has room to breathe */
const hall = document.querySelector(".hall");
document.querySelectorAll(".planet-card.live").forEach((card) => {
  const key = card.getAttribute("data-planet");
  const spec = FEATURED_SPECS[key];
  if (!spec || !backdrop) return;
  card.addEventListener("mouseenter", () => {
    backdrop.setTravelTarget(spec.name);
    hall?.classList.add("card-hovered");
  });
  card.addEventListener("mouseleave", () => {
    backdrop.setTravelTarget(null);
    hall?.classList.remove("card-hovered");
  });
});

/* ============ Single rAF loop ============
   Drives the backdrop (driven) and the card renderer. One loop, two renderers.
   Under prefers-reduced-motion: one static frame, then stop. */
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const header = document.querySelector("header");
const solarSystem = document.getElementById("solarSystem");
let last = 0;

/* Aims the travel-target pan at the open gap between the header (which
   moves up on hover, see arcade.css) and the card grid below it, rather
   than dead viewport centre. Read from live rects every frame so it tracks
   the header's padding-top transition and any resize, no separate hover
   handling needed. */
function updateFocusY() {
  if (!backdrop || !header || !solarSystem) return;
  const headerBottom = header.getBoundingClientRect().bottom;
  const solarTop = solarSystem.getBoundingClientRect().top;
  backdrop.focusY = (headerBottom + solarTop) / 2 / window.innerHeight;
}

function frame(time) {
  const dt = last ? Math.min(33, time - last) * 0.001 : 0;
  last = time;
  updateFocusY();
  if (backdrop) backdrop.tick(time);
  cardRenderer.tick(dt);
  if (!motionQuery.matches) requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
motionQuery.addEventListener("change", () => {
  if (!motionQuery.matches) requestAnimationFrame(frame);
});
