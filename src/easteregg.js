/* Easter egg: a battle station guards the bottom of the homepage, daring you
   to shoot it. Lives entirely on its own fixed overlay — nothing here
   touches or reflows the existing layout, and all motion is
   transform/opacity/filter. No storage APIs are used anywhere. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/* ── Hand-drawn geometry helpers ───────────────────────────
   Every curve is built from many short straight segments with a small
   random radius jitter, so nothing traces a mathematically perfect arc. */
function arcPts(cx, cy, rx, ry, a0, a1, steps, jitter) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    const jr = 1 + (Math.random() - 0.5) * jitter;
    pts.push([cx + Math.cos(a) * rx * jr, cy + Math.sin(a) * ry * jr]);
  }
  return pts;
}
function ptsToPath(pts, overshootPx) {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  if (overshootPx) {
    const [x0, y0] = pts[pts.length - 2];
    const [x1, y1] = pts[pts.length - 1];
    const dx = x1 - x0,
      dy = y1 - y0,
      len = Math.hypot(dx, dy) || 1;
    d += ` L ${(x1 + (dx / len) * overshootPx).toFixed(1)} ${(y1 + (dy / len) * overshootPx).toFixed(1)}`;
  }
  return d;
}
function buildStationSvg() {
  const CX = 60,
    CY = 60,
    R = 38;
  const svg = svgEl("svg", { class: "egg-station", viewBox: "0 0 120 120", "aria-hidden": "true" });

  const defs = svgEl("defs", {});
  function grad(id, type, attrs, stops) {
    const g = svgEl(type, { id, ...attrs });
    stops.forEach(([offset, color, opacity]) => {
      const s = svgEl("stop", { offset, "stop-color": color });
      if (opacity != null) s.setAttribute("stop-opacity", opacity);
      g.appendChild(s);
    });
    defs.appendChild(g);
  }

  /* Lit from the upper left, falling to near-black at the lower-right limb —
     the same metal ramp the ISS modules use, cooled a step. */
  grad("eggBody", "radialGradient", { cx: "38%", cy: "34%", r: "78%" }, [
    ["0%", "#f4f5f7"],
    ["28%", "#c7ccd5"],
    ["55%", "#8b93a1"],
    ["78%", "#3d4451"],
    ["100%", "#101319"],
  ]);
  grad("eggShade", "radialGradient", { cx: "38%", cy: "34%", r: "78%" }, [
    ["0%", "#000000", "0"],
    ["62%", "#000000", "0"],
    ["100%", "#04060b", "0.85"],
  ]);
  /* Concave bowl: dark at the centre, lighter toward the rim. */
  grad("eggDishBowl", "radialGradient", { cx: "50%", cy: "50%", r: "50%" }, [
    ["0%", "#1a1e26"],
    ["62%", "#3c434f"],
    ["100%", "#79818e"],
  ]);

  svg.appendChild(defs);

  const DISH_CX = 46,
    DISH_CY = 44,
    DISH_R = 13;

  /* Hull. */
  svg.appendChild(svgEl("circle", { cx: CX, cy: CY, r: R, fill: "url(#eggBody)" }));

  /* Rotating surface detail, clipped to the sphere and painted under the
     shading overlay so the limb darkness always wins: two faint latitude
     seams and a sparse scatter of panel lines. */
  const clip = svgEl("clipPath", { id: "eggSphereClip" });
  clip.appendChild(svgEl("circle", { cx: CX, cy: CY, r: R - 0.5 }));
  defs.appendChild(clip);
  const spin = svgEl("g", { class: "egg-spin", "clip-path": "url(#eggSphereClip)" });
  spin.style.transformOrigin = `${CX}px ${CY}px`;

  const seams = svgEl("g", { class: "egg-surface-seams" });
  seams.appendChild(
    svgEl("path", { d: ptsToPath(arcPts(CX, CY - 16, 30, 7, 190, 350, 20, 0.02)), fill: "none" }),
  );
  seams.appendChild(
    svgEl("path", { d: ptsToPath(arcPts(CX, CY + 18, 28, 6, 12, 168, 18, 0.02)), fill: "none" }),
  );
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = R * (0.35 + Math.random() * 0.5);
    const px = CX + Math.cos(a) * r,
      py = CY + Math.sin(a) * r;
    const t = a + Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    const len = 4 + Math.random() * 5;
    seams.appendChild(
      svgEl("path", {
        d: `M ${(px - (Math.cos(t) * len) / 2).toFixed(1)} ${(py - (Math.sin(t) * len) / 2).toFixed(1)} L ${(px + (Math.cos(t) * len) / 2).toFixed(1)} ${(py + (Math.sin(t) * len) / 2).toFixed(1)}`,
        fill: "none",
      }),
    );
  }
  spin.appendChild(seams);
  svg.appendChild(spin);

  /* Equatorial seam — one clean structural line, slightly south. */
  svg.appendChild(
    svgEl("path", {
      d: ptsToPath(arcPts(CX, CY + 8, R - 1.5, 7, 187, 353, 22, 0.015)),
      class: "egg-equator",
      fill: "none",
    }),
  );

  /* Shading overlay: pushes the lower-right limb into shadow over
     everything painted so far. */
  svg.appendChild(svgEl("circle", { cx: CX, cy: CY, r: R, fill: "url(#eggShade)" }));

  /* Faint cool rim light along the dark limb, the ISS Earth-rim treatment. */
  svg.appendChild(
    svgEl("path", {
      d: ptsToPath(arcPts(CX, CY, R - 0.6, R - 0.6, 18, 108, 14, 0.01)),
      class: "egg-rimlight",
      fill: "none",
    }),
  );

  /* The dish: concave bowl set into the upper left, bright rim on its
     lit edge, a small pale core that breathes. */
  const dishG = svgEl("g", {});
  dishG.appendChild(
    svgEl("circle", { cx: DISH_CX, cy: DISH_CY, r: DISH_R, fill: "url(#eggDishBowl)" }),
  );
  dishG.appendChild(
    svgEl("circle", {
      cx: DISH_CX,
      cy: DISH_CY,
      r: (DISH_R * 0.55).toFixed(1),
      class: "egg-dish-ring",
      fill: "none",
    }),
  );
  dishG.appendChild(
    svgEl("path", {
      d: ptsToPath(arcPts(DISH_CX, DISH_CY, DISH_R - 0.4, DISH_R - 0.4, 150, 305, 14, 0.01)),
      class: "egg-dish-rim",
      fill: "none",
    }),
  );
  dishG.appendChild(svgEl("circle", { cx: DISH_CX, cy: DISH_CY, r: "3", class: "egg-dish-inner" }));
  svg.appendChild(dishG);

  /* Pre-authored damage cracks, hidden until each hit reveals them. */
  const cracks = svgEl("g", { class: "egg-cracks-static" });
  const crackSpecs = [
    { hit: 1, d: "M 42 32 L 48 42 L 46 52" },
    { hit: 2, d: "M 46 52 L 54 58 L 60 70" },
    { hit: 2, d: "M 48 42 L 40 46 L 34 54" },
    { hit: 4, d: "M 60 70 L 68 76 L 80 80" },
    { hit: 4, d: "M 54 58 L 62 52 L 74 50" },
    { hit: 4, d: "M 34 54 L 30 66 L 36 78" },
  ];
  const crackEls = crackSpecs.map((c) => {
    const p = svgEl("path", { d: c.d, class: "egg-crack", pathLength: "1" });
    p.dataset.hit = c.hit;
    cracks.appendChild(p);
    return p;
  });
  svg.appendChild(cracks);

  return { svg, crackEls };
}

const CSS = `
.egg-layer {
  position: fixed;
  right: 48px;
  bottom: 48px;
  z-index: 90;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
  font-family: var(--font-mono);
}
.egg-layer.egg-in { opacity: 1; }

.egg-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  isolation: isolate;
}
/* ── Station surface ───────────────────────────────────── */
.egg-tier-white { stroke: var(--color-ink); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.egg-tier-mid { stroke: rgba(255, 255, 255, 0.65); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; }
.egg-surface-seams { stroke: rgba(10, 13, 20, 0.35); stroke-width: 1; stroke-linecap: round; }
.egg-equator { stroke: rgba(8, 10, 16, 0.55); stroke-width: 2; stroke-linecap: round; }
.egg-rimlight { stroke: rgba(140, 195, 255, 0.35); stroke-width: 1.2; stroke-linecap: round; }
.egg-dish-ring { stroke: rgba(255, 255, 255, 0.22); stroke-width: 1; }
.egg-dish-rim { stroke: rgba(255, 255, 255, 0.8); stroke-width: 1.5; stroke-linecap: round; }
.egg-dish-inner { fill: rgba(255, 255, 255, 0.9); opacity: 0.25; filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5)); }
.egg-crack {
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transition: stroke-dashoffset 0.5s ease-out, opacity 0.1s ease;
}
.egg-crack.show { opacity: 1; stroke-dashoffset: 0; }

.egg-station { display: block; width: 100px; height: 100px; overflow: visible; }
.egg-station-btn {
  display: block;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  pointer-events: auto;
}
.egg-layer:not(.egg-in) .egg-station-btn { pointer-events: none; }
.egg-station-btn:focus-visible { outline: 2px solid var(--color-red); outline-offset: 6px; border-radius: 50%; }

/* ── Idle motion ───────────────────────────────────────── */
.egg-station-entrance {
  opacity: 0;
  transform: rotate(15deg);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.egg-in .egg-station-entrance { opacity: 1; transform: rotate(0deg); }

@keyframes eggStationBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.egg-idle .egg-station-float { animation: eggStationBob 6s ease-in-out infinite; }

/* The station drifts across the name and back, the same travel the alien
   used. Capped on phones so the complaint bubble can never leave the left
   edge while the station is fully drifted. */
.egg-layer { --egg-wander-x: min(60vw, 820px); }
@keyframes eggWander {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(calc(-1 * var(--egg-wander-x)), -10px); }
}
.egg-idle .egg-wander { animation: eggWander 26s ease-in-out infinite; }

@keyframes eggStationSpin { to { transform: rotate(360deg); } }
@keyframes eggStationSpinUneven {
  0% { transform: rotate(0deg); }
  8% { transform: rotate(38deg); }
  16% { transform: rotate(44deg); }
  30% { transform: rotate(118deg); }
  40% { transform: rotate(150deg); }
  55% { transform: rotate(208deg); }
  62% { transform: rotate(226deg); }
  80% { transform: rotate(300deg); }
  88% { transform: rotate(324deg); }
  100% { transform: rotate(360deg); }
}
.egg-idle .egg-spin { animation: eggStationSpin 90s linear infinite; }
.egg-idle.egg-hit1 .egg-spin { animation-duration: 70s; }
.egg-idle.egg-hit3 .egg-spin { animation: eggStationSpinUneven 66s ease-in-out infinite; }

@keyframes eggDishBreathe {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.35; }
}
.egg-idle .egg-dish-inner { animation: eggDishBreathe 4s ease-in-out infinite; }

.egg-station-tilt { transition: transform 0.5s ease; }
.egg-station-jitter { will-change: transform; }
@keyframes eggStationJitter {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 1px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-1px, 2px); }
  100% { transform: translate(0, 0); }
}
.egg-station-wrap { position: relative; display: block; }

/* ── Shots ─────────────────────────────────────────────
   The homepage's own UFO already follows the cursor, so it is the ship —
   the bolt just leaves from wherever it is. */
/* Return fire is the station's, so it is white-hot rather than the red of
   the shot that provoked it — you can tell incoming from outgoing. */
.egg-bolt-return { background: #eaf2ff; box-shadow: 0 0 8px rgba(190, 220, 255, 0.95); width: 20px; }
.egg-bolt { position: fixed; left: 0; top: 0; width: 16px; height: 2px; background: var(--color-red); border-radius: 2px; transform-origin: 0 50%; box-shadow: 0 0 6px var(--color-red); pointer-events: none; z-index: 95; }
.egg-ring { position: fixed; left: 0; top: 0; width: 6px; height: 6px; margin: -3px 0 0 -3px; border: 1.5px solid var(--color-red); border-radius: 50%; opacity: 0.9; transform: scale(1); pointer-events: none; z-index: 95; transition: transform 0.3s ease-out, opacity 0.3s ease-out; }
.egg-ring.run { transform: scale(6); opacity: 0; }

/* ── Damage escalation (cumulative — hit classes never clear) ── */
@keyframes eggRecoil { 0% { transform: translateX(0); } 35% { transform: translateX(8px); } 100% { transform: translateX(0); } }
.egg-recoil-once .egg-station-tilt { animation: eggRecoil 0.45s cubic-bezier(0.2, 0.8, 0.3, 1); }

@keyframes eggSparkFall { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(var(--sx, 4px), 20px); } }
.egg-spark { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--color-red); opacity: 0; pointer-events: none; filter: drop-shadow(0 0 3px rgba(224, 58, 47, 0.9)); }
.egg-spark-run .egg-spark-1 { animation: eggSparkFall 0.7s ease-in forwards; }
.egg-spark-run .egg-spark-2 { animation: eggSparkFall 0.8s ease-in forwards 0.08s; --sx: -6px; }

.egg-hit3 .egg-station-tilt { transform: rotate(8deg); }
@keyframes eggDishFlickerHard {
  0% { opacity: 0.3; } 12% { opacity: 0.04; } 22% { opacity: 0.4; } 34% { opacity: 0.02; }
  46% { opacity: 0.3; } 60% { opacity: 0.05; } 76% { opacity: 0.2; } 100% { opacity: 0.1; }
}
.egg-hit3 .egg-dish-inner { animation: eggDishFlickerHard 0.5s steps(2, end) forwards; }

.egg-hit4 .egg-station-jitter { animation: eggStationJitter 0.32s steps(5, end) infinite; }
.egg-hit4 .egg-dish-inner { animation: none; opacity: 0.05; }
.egg-hit4 .egg-dish-rim { opacity: 0.3; }

/* ── The Big Bang ──────────────────────────────────────
   The station going critical is the singularity: everything collapses
   inward, holds for a beat of nothing, then the universe starts again. */
/* These sit ABOVE .egg-blackout (390) — the bang happens on the black,
   not behind it — and below .egg-dead (400). */
.egg-singularity {
  position: fixed; left: 0; top: 0; width: 14px; height: 14px; margin: -7px 0 0 -7px;
  border-radius: 50%; background: #fff; z-index: 395; pointer-events: none;
  opacity: 0; transform: scale(0);
  box-shadow: 0 0 20px 6px rgba(255, 255, 255, 0.9), 0 0 60px 20px rgba(160, 200, 255, 0.5);
}
.egg-shockwave {
  position: fixed; left: 0; top: 0; width: 20px; height: 20px; margin: -10px 0 0 -10px;
  border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.9); z-index: 393;
  pointer-events: none; opacity: 0.9; transform: scale(0.2);
  transition: transform 0.75s cubic-bezier(0.15, 0.7, 0.3, 1), opacity 0.75s ease-out;
}
.egg-shockwave.run { transform: scale(var(--sw-scale, 40)); opacity: 0; }
/* The blast itself is light, not a disc — a gradient that stays hot in the
   middle and has no edge at all. */
.egg-blast {
  position: fixed; left: 0; top: 0; width: 40px; height: 40px; margin: -20px 0 0 -20px;
  border-radius: 50%; z-index: 394; pointer-events: none; opacity: 1; transform: scale(0.3);
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 246, 224, 0.95) 18%,
    rgba(255, 200, 140, 0.6) 38%,
    rgba(150, 190, 255, 0.28) 62%,
    rgba(120, 160, 255, 0) 100%
  );
}
.egg-ember {
  position: fixed; left: 0; top: 0; width: 3px; height: 3px; margin: -1.5px 0 0 -1.5px;
  border-radius: 50%; z-index: 394; pointer-events: none;
  box-shadow: 0 0 6px 1px currentColor; color: #fff; background: currentColor;
}

/* ── Destruction (unchanged mechanics, ported from the alien build) ── */
.egg-shaken {
  transform: translate(var(--egg-sx, 0px), var(--egg-sy, 0px))
    rotate(var(--egg-rot, 0deg)) scale(var(--egg-scl, 1));
}
.egg-fx { position: fixed; inset: 0; pointer-events: none; }
.egg-border-flicker { z-index: 330; border: 2px solid var(--color-red); opacity: 0; }
@keyframes eggBorderFlick {
  0%, 20%, 36%, 56%, 72%, 100% { opacity: 0; }
  10%, 46%, 84% { opacity: 1; }
}
.egg-border-flicker.run { animation: eggBorderFlick 0.5s linear 1; }
.egg-band {
  position: fixed; left: -80px; right: -80px; z-index: 310; pointer-events: none;
  backdrop-filter: contrast(1.7) invert(0.12) hue-rotate(45deg);
}
@keyframes eggRgb {
  0%, 100% { filter: drop-shadow(-2px 0 rgba(255, 40, 60, 0.85)) drop-shadow(2px 0 rgba(0, 230, 255, 0.85)); }
  50% { filter: drop-shadow(-8px 0 rgba(255, 40, 60, 0.85)) drop-shadow(8px 0 rgba(0, 230, 255, 0.85)); }
}
.egg-rgb { animation: eggRgb 0.16s linear infinite; }
.egg-cracks-fx { z-index: 320; width: 100%; height: 100%; }
.egg-crack-fx { fill: none; stroke: rgba(255, 255, 255, 0.8); stroke-width: 1; }
.egg-scanlines { z-index: 315; opacity: 0; transition: opacity 0.6s ease; overflow: hidden; }
.egg-scanlines.show { opacity: 0.18; }
.egg-scanlines::before {
  content: ""; position: absolute; left: 0; right: 0; top: -100%; height: 300%;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255, 255, 255, 0.35) 3px 4px);
  animation: eggScanRoll 1.4s linear infinite;
}
@keyframes eggScanRoll { from { transform: translateY(0); } to { transform: translateY(33.33%); } }
.egg-burnout { transition: opacity 1.2s steps(6, end); opacity: 0 !important; }
.egg-flash { z-index: 380; background: #fff; opacity: 0; }
.egg-blackout { z-index: 390; background: #000; opacity: 0; }

/* ── Dead screen ───────────────────────────────────────── */
.egg-dead {
  position: fixed; inset: 0; z-index: 400; background: #000; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem; padding: 1.25rem; pointer-events: auto;
  font-family: var(--font-mono);
}
.egg-dead-line {
  color: var(--color-red); font-size: clamp(0.85rem, 3.5vw, 1.15rem); letter-spacing: 0.22em;
  text-transform: uppercase; white-space: nowrap; min-height: 1.4em;
}
.egg-restart {
  margin-top: 1.6rem; display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: clamp(0.7rem, 1.8vw, 0.85rem); letter-spacing: 0.08em;
  color: var(--color-red); padding: 0.85rem 1.4rem; border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 100px; background: rgba(13, 20, 36, 0.72); cursor: pointer; opacity: 0;
  transition: opacity 0.4s ease, border-color 0.25s ease;
}
.egg-restart.show { opacity: 1; animation: eggRestartPulse 1.6s ease-in-out infinite; }
.egg-restart:hover { border-color: var(--color-red); }
.egg-restart:focus-visible { outline: 2px solid var(--color-red); outline-offset: 4px; }
@keyframes eggRestartPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }

/* ── Small screens ─────────────────────────────────────── */
@media (max-width: 500px) {
  .egg-layer { right: 8px; --egg-wander-x: 100px; }
  .egg-station { width: 68px; height: 68px; }
  .egg-surface-seams > *:nth-child(n+4) { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .egg-station-entrance { opacity: 1 !important; transform: none !important; transition: none !important; }
  .egg-station-float, .egg-spin, .egg-wander, .egg-dish-inner { animation: none !important; }
  .egg-dish-inner { opacity: 0.24; }
  .egg-recoil-once .egg-station-tilt { animation: none; }
  .egg-hit3 .egg-dish-inner { animation: none !important; opacity: 0.1; }
  .egg-hit4 .egg-dish-inner { opacity: 0.05; }
  .egg-station-jitter { animation: none !important; }
  .egg-restart.show { animation: none; }
}
`;

function buildLayer() {
  const layer = document.createElement("div");
  layer.className = "egg-layer" + (reduced ? "" : " egg-idle");
  layer.innerHTML = `
    <div class="egg-wander">
    <div class="egg-scene">
      <div class="egg-station-entrance">
        <div class="egg-station-float">
          <div class="egg-station-tilt">
            <div class="egg-station-jitter">
              <div class="egg-station-wrap">
                <button class="egg-station-btn" type="button" aria-label="Do not shoot"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>`;
  const { svg, crackEls } = buildStationSvg();
  layer.querySelector(".egg-station-btn").appendChild(svg);
  return { layer, crackEls };
}

function initEasterEgg() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const { layer, crackEls } = buildLayer();
  document.body.appendChild(layer);

  const scene = layer.querySelector(".egg-scene");
  const stationBtn = layer.querySelector(".egg-station-btn");
  const stationWrap = layer.querySelector(".egg-station-wrap");
  const stationEntrance = layer.querySelector(".egg-station-entrance");
  stationBtn.tabIndex = -1;

  /* Same anchoring as the old alien+console scene: vertically centred on
     the name block, clamped to the viewport, right-aligned via CSS. */
  function placeScene() {
    const name = document.getElementById("stageName");
    if (!name) return;
    const nameRect = name.getBoundingClientRect();
    const sceneH = scene.offsetHeight || 120;
    let top = nameRect.top + nameRect.height / 2 - sceneH / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - sceneH - 8));
    layer.style.top = top.toFixed(0) + "px";
    layer.style.bottom = "auto";
  }

  /* Visible only within 200px of the very bottom of the page. */
  let visible = false;
  let presses = 0;
  let destroying = false;

  function checkBottom() {
    const doc = document.documentElement;
    const fromBottom = doc.scrollHeight - window.innerHeight - window.scrollY;
    const nowVisible = fromBottom <= 200;
    if (nowVisible && visible) placeScene();
    if (nowVisible === visible) return;
    if (nowVisible) placeScene();
    visible = nowVisible;
    layer.classList.toggle("egg-in", visible);
    stationBtn.tabIndex = visible ? 0 : -1;
  }
  window.addEventListener("scroll", checkBottom, { passive: true });
  window.addEventListener("resize", checkBottom, { passive: true });
  checkBottom();

  let lastShot = 0;
  let pointer = null;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
    },
    { passive: true },
  );

  function fire(origin) {
    if (destroying || presses >= 5) return;
    const now = performance.now ? performance.now() : Date.now();
    if (now - lastShot < 250) return;
    lastShot = now;
    fireBolt(origin);
    setTimeout(registerHit, 150);
  }

  function fireBolt(origin) {
    const r = stationBtn.getBoundingClientRect();
    const tx = r.left + r.width / 2,
      ty = r.top + r.height / 2;
    const dx = tx - origin.x,
      dy = ty - origin.y;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const bolt = document.createElement("div");
    bolt.className = "egg-bolt";
    bolt.style.transform = `translate(${origin.x}px, ${origin.y}px) rotate(${ang}deg)`;
    document.body.appendChild(bolt);
    requestAnimationFrame(() => {
      bolt.style.transition = "transform 0.15s linear";
      bolt.style.transform = `translate(${(origin.x + dx).toFixed(0)}px, ${(origin.y + dy).toFixed(0)}px) rotate(${ang}deg)`;
    });
    setTimeout(() => {
      bolt.remove();
      const ring = document.createElement("div");
      ring.className = "egg-ring";
      ring.style.transform = `translate(${tx.toFixed(0)}px, ${ty.toFixed(0)}px)`;
      document.body.appendChild(ring);
      requestAnimationFrame(() => ring.classList.add("run"));
      setTimeout(() => ring.remove(), 320);
    }, 150);
  }

  function nearestEdgePoint() {
    const r = stationBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    const d = { top: cy, bottom: window.innerHeight - cy, left: cx, right: window.innerWidth - cx };
    const min = Math.min(d.top, d.bottom, d.left, d.right);
    if (min === d.top) return { x: cx, y: 0 };
    if (min === d.bottom) return { x: cx, y: window.innerHeight };
    if (min === d.left) return { x: 0, y: cy };
    return { x: window.innerWidth, y: cy };
  }
  /* The homepage's UFO already follows the cursor, so the shot leaves from
     there. Touch and keyboard have no cursor, so they fire from the nearest
     viewport edge instead. */
  stationBtn.addEventListener("click", () => {
    const r = stationBtn.getBoundingClientRect();
    const far =
      pointer &&
      Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2)) > 30;
    fire(far ? pointer : nearestEdgePoint());
  });

  /* The station's only reply: a bolt back down the line of fire, aimed at
     the cursor — which on this page is the UFO. It always misses, because
     the joke is that it is still there. */
  function returnFire() {
    const r = stationBtn.getBoundingClientRect();
    const ox = r.left + r.width * 0.42;
    const oy = r.top + r.height * 0.4;
    const t = pointer ?? nearestEdgePoint();
    const dx = t.x - ox,
      dy = t.y - oy;
    const len = Math.hypot(dx, dy) || 1;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const bolt = document.createElement("div");
    bolt.className = "egg-bolt egg-bolt-return";
    bolt.style.transform = `translate(${ox.toFixed(0)}px, ${oy.toFixed(0)}px) rotate(${ang}deg)`;
    document.body.appendChild(bolt);
    requestAnimationFrame(() => {
      bolt.style.transition = "transform 0.22s linear, opacity 0.22s ease-in";
      bolt.style.transform = `translate(${(ox + (dx / len) * (len + 90)).toFixed(0)}px, ${(oy + (dy / len) * (len + 90)).toFixed(0)}px) rotate(${ang}deg)`;
      bolt.style.opacity = "0";
    });
    setTimeout(() => bolt.remove(), 260);
  }

  /* ── Escalation: five hits, damage accumulates, nothing resets ──
     The station says nothing. It shoots back. */
  let recoilTimer = null;
  let sparkTimer = null;

  function revealCracksForHit(n) {
    crackEls.forEach((c) => {
      if (Number(c.dataset.hit) === n) c.classList.add("show");
    });
  }

  function registerHit() {
    if (destroying || presses >= 5) return;
    presses += 1;
    layer.classList.add("egg-hit" + presses);
    if (!reduced) returnFire();
    revealCracksForHit(presses);

    if (!reduced) {
      if (presses === 1) {
        layer.classList.add("egg-recoil-once");
        clearTimeout(recoilTimer);
        recoilTimer = setTimeout(() => layer.classList.remove("egg-recoil-once"), 500);
      }
      if (presses === 2) {
        const sparks = document.createElement("div");
        sparks.className = "egg-spark-run";
        sparks.style.position = "absolute";
        sparks.style.left = "38%";
        sparks.style.top = "30%";
        sparks.innerHTML = `<span class="egg-spark egg-spark-1"></span><span class="egg-spark egg-spark-2"></span>`;
        stationWrap.appendChild(sparks);
        clearTimeout(sparkTimer);
        sparkTimer = setTimeout(() => sparks.remove(), 900);
      }
      if (presses === 4) {
        const plates = layer.querySelectorAll(".egg-plate");
        if (plates[1]) plates[1].classList.add("egg-plate-detach");
        if (plates[4]) plates[4].classList.add("egg-plate-detach");
      }
    }

    if (presses === 5) setTimeout(startDestruction, 400);
  }

  /* ── Destruction: unchanged mechanics through the fracture/collapse
     stage; Part 4 amendments replace the "alien dragged to centre" beat
     with the station shattering, then a short alien cameo, before the
     original flash/blackout/dead-screen finish runs unchanged. ── */
  function fxDiv(cls) {
    const d = document.createElement("div");
    d.className = "egg-fx " + cls;
    document.body.appendChild(d);
    return d;
  }

  function buildViewportCracks() {
    const svg = svgEl("svg", { class: "egg-fx egg-cracks-fx" });
    const cx = window.innerWidth / 2,
      cy = window.innerHeight / 2;
    for (let i = 0; i < 9; i++) {
      let a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
      let x = cx,
        y = cy;
      let d = `M ${x.toFixed(0)} ${y.toFixed(0)}`;
      const segs = 5 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segs; s++) {
        a += (Math.random() - 0.5) * 0.9;
        const len = 40 + Math.random() * 120;
        x += Math.cos(a) * len;
        y += Math.sin(a) * len;
        d += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
        if (s === 2 && Math.random() < 0.7) {
          const ba = a + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.5);
          const bx = x + Math.cos(ba) * (30 + Math.random() * 60);
          const by = y + Math.sin(ba) * (30 + Math.random() * 60);
          d += ` M ${x.toFixed(0)} ${y.toFixed(0)} L ${bx.toFixed(0)} ${by.toFixed(0)} M ${x.toFixed(0)} ${y.toFixed(0)}`;
        }
      }
      const p = svgEl("path", { d, class: "egg-crack-fx", pathLength: "1" });
      p.style.strokeDasharray = "1";
      p.style.strokeDashoffset = "1";
      p.style.transition = `stroke-dashoffset 0.7s ease-out ${(i * 0.08).toFixed(2)}s`;
      svg.appendChild(p);
    }
    document.body.appendChild(svg);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        svg.querySelectorAll("path").forEach((p) => (p.style.strokeDashoffset = "0"));
      }),
    );
    return svg;
  }

  function flingToCentre(el, extra, dur, delay) {
    const r = el.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (r.left + r.width / 2);
    const dy = window.innerHeight / 2 - (r.top + r.height / 2);
    el.style.transition = `transform ${dur}s cubic-bezier(0.55, -0.15, 0.75, 0.5) ${delay}s, opacity 0.25s ease ${(delay + dur * 0.8).toFixed(2)}s`;
    el.style.transform = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) ${extra} scale(0.04)`;
    el.style.opacity = "0";
  }

  /* ── The Big Bang ────────────────────────────────────────
     The station goes critical and becomes the singularity. Its debris and
     the whole page collapse into one point, the point holds alone for a
     beat, and then it detonates outward as the new universe. */
  /* The station goes critical: it shrinks in place into a single bright
     point, which is what then detonates. No fragments — the whole thing
     becomes the singularity. */
  function stationToPoint(onDone) {
    const r = stationBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    stationEntrance.style.transformOrigin = "center center";
    stationEntrance.style.transition =
      "transform 0.55s cubic-bezier(0.7, 0, 0.85, 0.2), filter 0.5s ease-in, opacity 0.15s ease 0.5s";
    stationEntrance.style.filter = "brightness(3.4)";
    stationEntrance.style.transform = "scale(0.04)";
    stationEntrance.style.opacity = "0";

    setTimeout(() => onDone({ x: cx, y: cy }), 560);
  }

  /* One point of light alone on black, then the bang. */
  function bigBang(at, onDone) {
    const centreX = at?.x ?? window.innerWidth / 2;
    const centreY = at?.y ?? window.innerHeight / 2;
    // Reach has to cover the farthest corner from wherever it went off.
    const reach = Math.max(
      Math.hypot(centreX, centreY),
      Math.hypot(window.innerWidth - centreX, centreY),
      Math.hypot(centreX, window.innerHeight - centreY),
      Math.hypot(window.innerWidth - centreX, window.innerHeight - centreY),
    );

    const core = document.createElement("div");
    core.className = "egg-singularity";
    core.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) scale(0)`;
    document.body.appendChild(core);

    // A short bright hold where the station was, then it goes.
    requestAnimationFrame(() => {
      core.style.transition = "transform 0.18s ease-out, opacity 0.12s ease-out";
      core.style.opacity = "1";
      core.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) scale(1.1)`;
    });

    // Detonation: the point snaps out and becomes light, three shockwaves
    // chase it out, and embers fly past the edges.
    setTimeout(() => {
      core.style.transition = "transform 0.1s ease-in, opacity 0.1s ease-in";
      core.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) scale(0)`;
      core.style.opacity = "0";

      /* One hard white frame is what actually reads as the bang; the
         gradient behind it carries the expansion. This is the third and
         final full-viewport flash of the whole sequence. */
      const bangFlash = fxDiv("egg-flash");
      bangFlash.style.transition = "opacity 0.06s linear";
      requestAnimationFrame(() => (bangFlash.style.opacity = "0.92"));
      setTimeout(() => {
        bangFlash.style.transition = "opacity 0.45s ease-out";
        bangFlash.style.opacity = "0";
      }, 80);
      setTimeout(() => bangFlash.remove(), 600);

      const blast = document.createElement("div");
      blast.className = "egg-blast";
      blast.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) scale(0.3)`;
      document.body.appendChild(blast);
      requestAnimationFrame(() => {
        blast.style.transition =
          "transform 0.7s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.7s ease-in";
        blast.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) scale(${((reach * 1.15) / 20).toFixed(1)})`;
        blast.style.opacity = "0";
      });
      setTimeout(() => blast.remove(), 750);

      [0, 90, 190].forEach((delay, i) => {
        setTimeout(() => {
          const w = document.createElement("div");
          w.className = "egg-shockwave";
          w.style.setProperty("--sw-scale", (reach / 10) * (1 + i * 0.35));
          w.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) scale(0.2)`;
          document.body.appendChild(w);
          requestAnimationFrame(() => w.classList.add("run"));
          setTimeout(() => w.remove(), 900);
        }, delay);
      });

      const EMBERS = 40; // capped: this runs once, but keep it bounded anyway
      for (let i = 0; i < EMBERS; i++) {
        const e = document.createElement("div");
        e.className = "egg-ember";
        e.style.color = i % 5 === 0 ? "#8fc6ff" : i % 3 === 0 ? "#ffd9a0" : "#ffffff";
        e.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px)`;
        document.body.appendChild(e);
        const ang = Math.random() * Math.PI * 2;
        const dist = reach * (0.5 + Math.random() * 0.75);
        const dur = 0.5 + Math.random() * 0.45;
        requestAnimationFrame(() => {
          e.style.transition = `transform ${dur}s cubic-bezier(0.1, 0.7, 0.3, 1), opacity ${dur}s ease-in`;
          e.style.transform = `translate(${(centreX + Math.cos(ang) * dist).toFixed(0)}px, ${(centreY + Math.sin(ang) * dist).toFixed(0)}px) scale(${(0.4 + Math.random() * 1.6).toFixed(2)})`;
          e.style.opacity = "0";
        });
        setTimeout(() => e.remove(), 1100);
      }
    }, 330);

    /* Detonation is at 330. Hand off while the embers are still travelling —
       waiting for the last one leaves the page sitting empty and undramatic
       for the better part of a second. */
    setTimeout(() => {
      core.remove();
      onDone();
    }, 1050);
  }

  function startDestruction() {
    destroying = true;
    /* Both, not just body: the debris, shockwaves and embers are fixed
       elements that overflow the viewport on purpose, and only the root
       element's overflow suppresses the scrollbar they would otherwise
       produce. */
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    stationBtn.style.pointerEvents = "none";
    const wander = layer.querySelector(".egg-wander");
    if (wander) wander.style.animationPlayState = "paused";

    if (reduced) {
      const black = fxDiv("egg-blackout");
      black.style.transition = "opacity 0.8s ease";
      requestAnimationFrame(() => (black.style.opacity = "1"));
      setTimeout(showDeadScreen, 900);
      return;
    }

    const root = document.documentElement;
    const shakeEls = [
      document.getElementById("sky"),
      document.querySelector(".dotgrid"),
      document.querySelector(".topbar"),
      document.querySelector("main"),
      document.querySelector("footer"),
      scene,
    ].filter(Boolean);
    shakeEls.forEach((el) => el.classList.add("egg-shaken"));

    let amp = 9,
      hSpike = 0,
      rot = 0,
      scl = 1,
      ramping = false;
    const shaker = setInterval(() => {
      if (ramping) {
        amp = Math.min(15, amp + 0.4);
        rot = Math.min(4, rot + 0.27);
        scl = Math.min(1.08, scl + 0.0054);
      }
      root.style.setProperty(
        "--egg-sx",
        ((Math.random() * 2 - 1) * (amp + hSpike)).toFixed(1) + "px",
      );
      root.style.setProperty("--egg-sy", ((Math.random() * 2 - 1) * amp).toFixed(1) + "px");
      root.style.setProperty("--egg-rot", rot.toFixed(2) + "deg");
      root.style.setProperty("--egg-scl", scl.toFixed(4));
    }, 80);

    const at = (ms, fn) => setTimeout(fn, ms);

    // 0.0–0.5s WARNING
    const border = fxDiv("egg-border-flicker");
    border.classList.add("run");
    at(600, () => border.remove());

    // 0.4–1.4s SIGNAL BREAK
    const stageName = document.getElementById("stageName");
    at(400, () => stageName && stageName.classList.add("egg-rgb"));
    for (let i = 0; i < 5; i++) {
      at(400 + Math.random() * 900, () => {
        const band = document.createElement("div");
        band.className = "egg-band";
        band.style.top = Math.random() * 90 + "vh";
        band.style.height = 18 + Math.random() * 26 + "px";
        const shift = (20 + Math.random() * 40) * (Math.random() < 0.5 ? -1 : 1);
        band.style.transform = `translateX(${shift}px)`;
        document.body.appendChild(band);
        hSpike = 30;
        setTimeout(() => {
          hSpike = 0;
          band.remove();
        }, 100);
      });
    }
    at(1400, () => stageName && stageName.classList.remove("egg-rgb"));

    // 0.8–2.0s FRACTURE
    let cracksSvg = null;
    let scan = null;
    at(800, () => {
      cracksSvg = buildViewportCracks();
      scan = fxDiv("egg-scanlines");
      requestAnimationFrame(() => scan.classList.add("show"));
    });

    // 1.2–2.6s COLLAPSE
    at(1200, () => {
      document.querySelectorAll("#stageName .ltr").forEach((el) => {
        const spin = (20 + Math.random() * 100) * (Math.random() < 0.5 ? -1 : 1);
        flingToCentre(el, `rotate(${spin.toFixed(0)}deg)`, 0.9, Math.random() * 0.4);
      });
      document.querySelectorAll(".topbar .pill, #contact .pill").forEach((el) => {
        const r = el.getBoundingClientRect();
        const ang =
          (Math.atan2(
            window.innerHeight / 2 - (r.top + r.height / 2),
            window.innerWidth / 2 - (r.left + r.width / 2),
          ) *
            180) /
          Math.PI;
        flingToCentre(
          el,
          `rotate(${ang.toFixed(0)}deg) scaleX(1.7)`,
          1.0,
          0.15 + Math.random() * 0.35,
        );
      });
    });

    // 2.6s FLASH ONE, then BURNOUT
    const flash = fxDiv("egg-flash");
    at(2600, () => {
      flash.style.transition = "opacity 0.12s ease-in";
      flash.style.opacity = "1";
      setTimeout(() => {
        flash.style.transition = "opacity 0.25s ease-out";
        flash.style.opacity = "0";
      }, 130);
      document.getElementById("sky")?.classList.add("egg-burnout");
      document.querySelector(".dotgrid")?.classList.add("egg-burnout");
      ramping = true;
    });

    /* 3.6s THE STATION GOES. It collapses to a point in place and that
       point detonates — the explosion is the transition, not a prelude to
       one. Everything still shaking is dismantled under the blast. */
    at(3600, () => {
      stationToPoint((at) => {
        clearInterval(shaker);
        shakeEls.forEach((el) => el.classList.remove("egg-shaken"));
        ["--egg-sx", "--egg-sy", "--egg-rot", "--egg-scl"].forEach((v) =>
          root.style.removeProperty(v),
        );
        cracksSvg?.remove();
        scan?.remove();
        border.remove();
        flash.remove();
        layer.remove();

        bigBang(at, () => {
          // The blast has already whited the screen out; settle onto black.
          const black = fxDiv("egg-blackout");
          black.style.transition = "opacity 0.5s ease";
          requestAnimationFrame(() => (black.style.opacity = "1"));
          setTimeout(showDeadScreen, 520);
        });
      });
    });
  }

  function showDeadScreen() {
    const dead = document.createElement("div");
    dead.className = "egg-dead";
    dead.innerHTML = `
      <div class="egg-dead-line"></div>
      <div class="egg-dead-line"></div>
      <button class="egg-restart" type="button">RESTART UNIVERSE</button>`;
    document.body.appendChild(dead);
    const [line1, line2] = dead.querySelectorAll(".egg-dead-line");
    const restartBtn = dead.querySelector(".egg-restart");

    function typeInto(el, text, done) {
      let i = 0;
      const t = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(t);
          done();
        }
      }, 45);
    }

    typeInto(line1, "SIGNAL LOST", () => {
      setTimeout(() => {
        typeInto(line2, "UNIVERSE UNAVAILABLE", () => {
          setTimeout(() => {
            restartBtn.classList.add("show");
            restartBtn.focus();
          }, 1000);
        });
      }, 600);
    });

    let restarting = false;
    function restart() {
      if (restarting) return;
      restarting = true;
      dead.style.transition = "opacity 0.3s ease";
      dead.style.opacity = "0";
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      setTimeout(() => window.location.reload(), 300);
    }
    restartBtn.addEventListener("click", restart);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        restart();
      }
    });
  }
}

initEasterEgg();
