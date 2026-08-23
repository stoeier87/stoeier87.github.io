import { definePlanetField } from "../shared/elements/planet-field.ts";
import { definePageHeader } from "../shared/elements/page-header.ts";
import { defineHallNav } from "../shared/elements/hall-nav.ts";
import { CardPlanetRenderer } from "../shared/elements/card-planet-renderer.ts";
import { color } from "../tokens.ts";
import { GAMES } from "./shared/games-data.js";

definePlanetField();
definePageHeader();
defineHallNav();

/* The solar-system grid: one .planet-card per GAMES entry, in source order.
   Was 9 hand-copied blocks in index.html; only the copy differed between
   them, so it's rendered from the shared data instead. */
const solarSystem = document.getElementById("solarSystem");
if (solarSystem) {
  solarSystem.innerHTML = GAMES.map(({ key, label, gameLabel, tagline, cardPlanetLabel }) => {
    const planetSlug = label.toLowerCase();
    return `
      <a class="planet-card live" href="${key}/" data-planet="${planetSlug}">
        <span class="planet ${planetSlug}" aria-hidden="true"></span>
        <div class="info">
          <h2>${gameLabel}</h2>
          <p class="game">${cardPlanetLabel ?? label}</p>
          <p class="tagline">${tagline}</p>
        </div>
        <span class="badge">
          <img src="../svg/gamepad.svg" class="arcade-icon" alt="" aria-hidden="true" />
          Play</span>
      </a>`;
  }).join("");
}

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
  pluto:   { name: "PLUTO",   r: 0, s0: 0, px: 0, pf: 0, hi: color.planet.plutoHi,   lo: color.planet.plutoLo,   spin: 0.025, pluto: true },
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
    /* The ninth. px continues the ~0.21 stride past Neptune, so it is off-screen
       at rest like Merkur and Neptun already are and only arrives via
       setTravelTarget. s0 is pulled the other side of zero from Neptune's 0.18
       so the two never converge mid-pan, and the small negative depth keeps it
       behind anything it grazes rather than z-fighting. r is genuinely the
       smallest of the nine — that is the character, and the click target is the
       card, not the sphere. */
    { ...FEATURED_SPECS.pluto,   r: 0.016, s0: -0.12, px:  1.46, pf: 0.50, depth: -120 },
  ];
}

/* Card planet icons — one shared Three.js renderer for all 8 cards, same
   PlanetBody class as the background. One rAF loop drives everything below. */
const dpr = Math.min(devicePixelRatio, 2);
const cardRenderer = new CardPlanetRenderer(120);

/* Selecting a game: the cards dissolve, the whole page recedes a touch, the
   backdrop's desktop blur clears, and the backdrop flies to and zooms in on
   the chosen planet (setTravelTarget already does both — see planet-field.ts)
   before the browser actually navigates. Reduced motion skips straight to
   navigation, same convention as the rest of the site (rule 6).

   TRANSITION_MS has to give the fly itself room to read: setTravelTarget's
   pan eases at dt*1.5 (~90% arrived after ~1.4s) and its zoom at dt*3
   (~90% after ~0.7s) — cutting away at 650ms, the original guess, sliced
   the pan off before it had gone anywhere. Same cubic-bezier as the back
   pill's alien reveal (.pill.back .alien in arcade.css) for the CSS side,
   so the dissolve/recede/blur-clear share the site's one "nice" ease-out
   instead of the stiffer default `ease`. */
const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.3, 1)";
const TRANSITION_MS = 1300;
let leaving = false;

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

  if (card.classList.contains("live")) {
    card.addEventListener("click", (event) => {
      // Modifier/middle clicks mean "open in a new tab" -- let the browser
      // handle those natively rather than hijacking them into a transition
      // that then navigates the current tab out from under it.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (leaving) return;

      const href = card.getAttribute("href");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!href || reduced || !backdrop) return;

      event.preventDefault();
      leaving = true;

      document.querySelectorAll(".planet-card").forEach((c) => {
        c.style.pointerEvents = "none";
        c.style.transition = `opacity 380ms ${EASE_OUT}, transform 380ms ${EASE_OUT}`;
        c.style.opacity = "0";
        c.style.transform = "scale(0.92) translateY(8px)";
      });
      const wrap = document.querySelector("main.wrap");
      if (wrap) {
        wrap.style.transition = `transform 700ms ${EASE_OUT}`;
        wrap.style.transform = "scale(0.97)";
      }
      backdrop.style.transition = `filter 700ms ${EASE_OUT}`;
      backdrop.style.filter = "blur(0px)";
      backdrop.setTravelTarget(spec.name);

      setTimeout(() => {
        window.location.href = href;
      }, TRANSITION_MS);
    });
  }
});

/* Card hover: the header padding collapses so the grid has room to
   breathe. That is the whole hover response now — the backdrop no longer
   pans or zooms toward the hovered planet. The travel pan translated the
   entire background on pointer movement, and the desktop backdrop must
   not move: no drift, no parallax, no pointer-driven translation. The
   planets keep their own rotation and full 3D treatment; the card's own
   hover styling is untouched.

   Still gated on actual hover capability — a touch tap fires a synthetic
   mouseenter with no matching mouseleave, which would leave the header
   collapsed after every tap. */
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const hall = document.querySelector(".hall");
if (canHover) {
  document.querySelectorAll(".planet-card.live").forEach((card) => {
    card.addEventListener("mouseenter", () => hall?.classList.add("card-hovered"));
    card.addEventListener("mouseleave", () => hall?.classList.remove("card-hovered"));
  });
}

/* ============ Single rAF loop ============
   Drives the backdrop (driven) and the card renderer. One loop, two renderers.
   Under prefers-reduced-motion: one static frame, then stop. */
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let last = 0;

function frame(time) {
  const dt = last ? Math.min(33, time - last) * 0.001 : 0;
  last = time;
  if (backdrop) backdrop.tick(time);
  cardRenderer.tick(dt);
  if (!motionQuery.matches) requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
motionQuery.addEventListener("change", () => {
  if (!motionQuery.matches) requestAnimationFrame(frame);
});
