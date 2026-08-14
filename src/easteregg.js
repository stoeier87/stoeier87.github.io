/* Easter egg: a battle station guards the bottom of the homepage, daring you
   to shoot it. Lives entirely on its own fixed overlay — nothing here
   touches or reflows the existing layout, and all motion is
   transform/opacity/filter. No storage APIs are used anywhere. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canAim = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
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

function buildShipSvg() {
  const svg = svgEl("svg", { viewBox: "0 0 30 16", class: "egg-ship-svg" });
  svg.appendChild(
    svgEl("path", {
      d: "M 1 8 L 24 3.5 L 30 8 L 24 12.5 Z",
      class: "egg-tier-white",
      fill: "none",
    }),
  );
  svg.appendChild(
    svgEl("path", { d: "M 7 6.5 L 1.5 3 M 7 9.5 L 1.5 13", class: "egg-tier-mid", fill: "none" }),
  );
  svg.appendChild(svgEl("path", { d: "M 1 8 L -6 8", class: "egg-thruster" }));
  return svg;
}

function buildFragmentSvg(isDish) {
  const size = 34,
    cx = 17,
    cy = 17;
  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, class: "egg-fragment-svg" });
  const n = 5 + Math.floor(Math.random() * 3);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const r = 8 + Math.random() * 6;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  d += " Z";
  if (isDish) svg.appendChild(svgEl("circle", { cx, cy, r: "7", class: "egg-fragment-glow" }));
  svg.appendChild(svgEl("path", { d, class: "egg-fragment-shape" }));
  svg.appendChild(
    svgEl("path", {
      d: `M ${(cx - 5).toFixed(1)} ${(cy - 3).toFixed(1)} L ${(cx + 4).toFixed(1)} ${(cy + 5).toFixed(1)}`,
      class: "egg-fragment-seam",
    }),
  );
  return svg;
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

/* ── Reticle ───────────────────────────────────────────── */
.egg-reticle {
  position: absolute;
  inset: -10px 0 -10px -10px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.egg-station-wrap.egg-aim .egg-reticle,
.egg-station-wrap:focus-within .egg-reticle { opacity: 1; }
.egg-rt { position: absolute; width: 10px; height: 10px; border-color: var(--color-red); border-style: solid; border-width: 0; }
.egg-rt-tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; }
.egg-rt-bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; }
.egg-rt-tr { top: 10px; right: 0; border-top-width: 2px; border-right-width: 2px; }
.egg-rt-br { bottom: 10px; right: 0; border-bottom-width: 2px; border-right-width: 2px; }

/* ── Speech bubble (complaints) ────────────────────────── */
.egg-bubble {
  position: absolute;
  right: 0;
  bottom: calc(100% + 14px);
  max-width: min(300px, calc(100vw - 32px));
  width: max-content;
  padding: 6px 11px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  background: rgba(5, 7, 15, 0.85);
  color: var(--color-ink);
  font-size: 13px;
  line-height: 1.45;
  white-space: normal;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  pointer-events: none;
}
.egg-bubble::after {
  content: "";
  position: absolute;
  right: 26px;
  top: 100%;
  border: 6px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.5);
}
.egg-bubble.show { opacity: 1; transform: translateY(0); }

/* ── Ship cursor + firing zone (desktop only) ─────────── */
.egg-firezone { position: fixed; z-index: 91; background: transparent; pointer-events: none; }
.egg-firezone.active { pointer-events: auto; cursor: none; }
/* The homepage's UFO cursor-follower yields to the ship inside the zone. */
html.egg-noufo .ufo { opacity: 0 !important; }

.egg-ship { position: fixed; left: 0; top: 0; width: 30px; height: 16px; margin: -8px 0 0 -8px; z-index: 94; opacity: 0; transition: opacity 0.15s ease; pointer-events: none; }
.egg-ship.show { opacity: 1; }
.egg-ship-svg { width: 100%; height: 100%; overflow: visible; }
.egg-thruster { stroke: var(--color-red); stroke-width: 2; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(224, 58, 47, 0.9)); animation: eggThrusterFlicker 0.35s steps(3, end) infinite; }
@keyframes eggThrusterFlicker { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

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

/* ── Alien cameo (destruction amendment) ──────────────── */
.egg-cameo { position: fixed; left: 0; top: 0; z-index: 391; pointer-events: none; }
.egg-cameo-turn { transform-origin: 50% 50%; }
.egg-alien { display: block; height: 96px; width: auto; overflow: visible; }
.egg-alien .line { fill: none; stroke: var(--color-ink); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.egg-alien .thin { stroke-width: 1; }
.egg-eyes { fill: var(--color-red); filter: drop-shadow(0 0 3px rgba(224, 58, 47, 0.9)); }
.egg-antenna-tip { fill: var(--color-red); filter: drop-shadow(0 0 2px rgba(224, 58, 47, 0.9)); }
.egg-glint { stroke: rgba(255, 255, 255, 0.7); }
.egg-sweep, .egg-particle, .egg-arms-folded { opacity: 0; }

/* ── Fragments (destruction amendment) ────────────────── */
.egg-fragment { position: fixed; left: 0; top: 0; width: 34px; height: 34px; margin: -17px 0 0 -17px; pointer-events: none; z-index: 340; }
.egg-fragment-shape { fill: #6f7683; stroke: rgba(240, 243, 248, 0.85); stroke-width: 1; stroke-linejoin: round; }
.egg-fragment-seam { stroke: rgba(16, 19, 25, 0.6); stroke-width: 0.8; }
.egg-fragment-glow { fill: #fff; opacity: 0.4; filter: blur(2px); }

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
  .egg-bubble { font-size: 12px; max-width: min(250px, calc(100vw - 24px)); }
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
      <div class="egg-bubble" role="status" aria-live="polite"></div>
      <div class="egg-station-entrance">
        <div class="egg-station-float">
          <div class="egg-station-tilt">
            <div class="egg-station-jitter">
              <div class="egg-station-wrap">
                <button class="egg-station-btn" type="button" aria-label="Do not shoot"></button>
                <div class="egg-reticle" aria-hidden="true">
                  <span class="egg-rt egg-rt-tl"></span><span class="egg-rt egg-rt-tr"></span>
                  <span class="egg-rt egg-rt-bl"></span><span class="egg-rt egg-rt-br"></span>
                </div>
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

const ALIEN_SVG = `
<svg class="egg-alien" viewBox="0 0 100 132" aria-hidden="true">
  <g class="egg-arms-normal">
    <path class="line thin" d="M 38 90 C 24 94, 12 98, 5 106" />
    <path class="line thin" d="M 62 90 C 70 100, 68 112, 60 118" />
  </g>
  <path class="line thin" d="M 46 78 L 46 84 M 54 78 L 54 84" />
  <path class="line" d="M 42 84 L 34 92 L 37 106 L 50 126 L 63 106 L 66 92 L 58 84" />
  <path class="line thin" d="M 44 94 L 44.5 106 M 50 95 L 50 110 M 56 94 L 55.5 106" />
  <path class="line" d="M 50 12 C 70 12 82 26 81 42 C 80 58 66 72 50 78 C 34 72 20 58 19 42 C 18 26 30 12 50 12 Z" />
  <g class="egg-eyes">
    <path d="M 25 36 C 30 30 40 32 44 39 C 43 46 32 48 27 44 C 24 42 23 39 25 36 Z" />
    <path d="M 75 36 C 70 30 60 32 56 39 C 57 46 68 48 73 44 C 76 42 77 39 75 36 Z" />
  </g>
  <circle class="line thin" cx="47" cy="60" r="0.8" />
  <circle class="line thin" cx="53" cy="60" r="0.8" />
  <path class="line thin" d="M 44 68 L 56 68" />
  <path class="line thin egg-glint" d="M 30 22 Q 38 13 48 12" />
  <g class="egg-antenna">
    <path class="line thin" d="M 60 13 L 66 5 L 62 1" />
    <circle class="egg-antenna-tip" cx="61.5" cy="1" r="2.2" />
  </g>
</svg>`;

function initEasterEgg() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const { layer, crackEls } = buildLayer();
  document.body.appendChild(layer);

  const scene = layer.querySelector(".egg-scene");
  const bubble = layer.querySelector(".egg-bubble");
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

  /* Firing zone + ship cursor (desktop only). Declared before the first
     checkBottom() call because updateZone reads them. */
  let firezone = null;
  let ship = null;
  if (!reduced && canAim) {
    firezone = document.createElement("div");
    firezone.className = "egg-firezone";
    document.body.appendChild(firezone);
    ship = document.createElement("div");
    ship.className = "egg-ship";
    ship.appendChild(buildShipSvg());
    document.body.appendChild(ship);
  }

  /* Visible only within 200px of the very bottom of the page. */
  let visible = false;
  let presses = 0;
  let destroying = false;

  /* The station wanders, so the firing zone re-derives itself on a slow
     tick while visible rather than only on scroll/resize. */
  let zoneTimer = null;
  function checkBottom() {
    const doc = document.documentElement;
    const fromBottom = doc.scrollHeight - window.innerHeight - window.scrollY;
    const nowVisible = fromBottom <= 200;
    if (nowVisible && visible) {
      placeScene();
      updateZone();
    }
    if (nowVisible === visible) return;
    if (nowVisible) placeScene();
    visible = nowVisible;
    layer.classList.toggle("egg-in", visible);
    stationBtn.tabIndex = visible ? 0 : -1;
    updateZone();
    clearInterval(zoneTimer);
    if (visible && firezone) zoneTimer = setInterval(updateZone, 300);
  }
  window.addEventListener("scroll", checkBottom, { passive: true });
  window.addEventListener("resize", checkBottom, { passive: true });
  checkBottom();

  /* ── Complaint bubble (typewriter, same technique as space-bar) ── */
  let typeTimer = null;
  let hideTimer = null;
  function typeBubble(text) {
    clearInterval(typeTimer);
    clearTimeout(hideTimer);
    bubble.textContent = "";
    bubble.classList.add("show");
    let i = 0;
    typeTimer = setInterval(() => {
      bubble.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typeTimer);
    }, 40);
  }
  function hideBubble(instant) {
    clearInterval(typeTimer);
    clearTimeout(hideTimer);
    bubble.classList.remove("show");
    if (instant) bubble.textContent = "";
  }
  function holdThenFade() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideBubble(false), 2500);
  }

  function computeZone() {
    const r = stationBtn.getBoundingClientRect();
    const zone = {
      left: r.left - 320,
      top: r.top - 220,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    document.querySelectorAll("#contact .pill").forEach((pill) => {
      const pr = pill.getBoundingClientRect();
      if (
        pr.right < zone.left ||
        pr.left > zone.right ||
        pr.bottom < zone.top ||
        pr.top > zone.bottom
      )
        return;
      const pad = 10;
      const costs = [
        {
          cost: zone.right - pr.left,
          apply: () => (zone.right = Math.min(zone.right, pr.left - pad)),
        },
        {
          cost: zone.bottom - pr.top,
          apply: () => (zone.bottom = Math.min(zone.bottom, pr.top - pad)),
        },
        {
          cost: pr.right - zone.left,
          apply: () => (zone.left = Math.max(zone.left, pr.right + pad)),
        },
        {
          cost: pr.bottom - zone.top,
          apply: () => (zone.top = Math.max(zone.top, pr.bottom + pad)),
        },
      ].filter((c) => c.cost > 0);
      if (costs.length) costs.sort((a, b) => a.cost - b.cost)[0].apply();
    });
    if (zone.right < zone.left) zone.right = zone.left;
    if (zone.bottom < zone.top) zone.bottom = zone.top;
    return zone;
  }

  function updateZone() {
    if (!firezone) return;
    const active = visible && !destroying;
    firezone.classList.toggle("active", active);
    if (!active) return;
    const z = computeZone();
    firezone.style.left = z.left.toFixed(0) + "px";
    firezone.style.top = z.top.toFixed(0) + "px";
    firezone.style.width = Math.max(0, z.right - z.left).toFixed(0) + "px";
    firezone.style.height = Math.max(0, z.bottom - z.top).toFixed(0) + "px";
  }

  function updateShip(x, y) {
    const r = stationBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    const ang = (Math.atan2(cy - y, cx - x) * 180) / Math.PI;
    ship.style.transform = `translate(${x}px, ${y}px) rotate(${ang}deg)`;
    ship.dataset.ang = ang;
    ship.dataset.x = x;
    ship.dataset.y = y;
  }

  let lastShot = 0;
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

  if (firezone) {
    firezone.addEventListener("pointermove", (e) => {
      updateShip(e.clientX, e.clientY);
      ship.classList.add("show");
      stationWrap.classList.add("egg-aim");
      document.documentElement.classList.add("egg-noufo");
    });
    firezone.addEventListener("pointerleave", () => {
      ship.classList.remove("show");
      stationWrap.classList.remove("egg-aim");
      document.documentElement.classList.remove("egg-noufo");
    });
    firezone.addEventListener("click", (e) => {
      const ang = ((ship.dataset.ang && Number(ship.dataset.ang)) || 0) * (Math.PI / 180);
      const nose = { x: e.clientX + Math.cos(ang) * 11, y: e.clientY + Math.sin(ang) * 11 };
      fire(nose);
    });
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
  /* Touch taps and keyboard activation both land here — no ship exists
     for either, so the bolt starts from the nearest viewport edge. */
  stationBtn.addEventListener("click", () => fire(nearestEdgePoint()));
  stationBtn.addEventListener("focus", () => stationWrap.classList.add("egg-aim"));
  stationBtn.addEventListener("blur", () => stationWrap.classList.remove("egg-aim"));

  /* ── Escalation: five hits, damage accumulates, nothing resets ── */
  const LINES = {
    1: "Ow.",
    2: "Read the sign.",
    3: "Right. Noted. Still here.",
    4: "This is load-bearing.",
    5: "Ah.",
  };
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
    typeBubble(LINES[presses]);
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

    if (presses === 5) {
      clearTimeout(hideTimer);
      setTimeout(startDestruction, 400);
    } else {
      holdThenFade();
    }
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

  function buildAndRunFragments(rect, onDone) {
    const cx = rect.left + rect.width / 2,
      cy = rect.top + rect.height / 2;
    const centreX = window.innerWidth / 2,
      centreY = window.innerHeight / 2;
    const frags = [];
    for (let i = 0; i < 6; i++) {
      const f = buildFragmentSvg(i === 5);
      const wrap = document.createElement("div");
      wrap.className = "egg-fragment";
      wrap.appendChild(f);
      wrap.style.transform = `translate(${cx.toFixed(0)}px, ${cy.toFixed(0)}px)`;
      document.body.appendChild(wrap);
      frags.push(wrap);
    }
    frags.forEach((f, i) => {
      const ang = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist = 26 + Math.random() * 18;
      f.style.transition = "transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)";
      f.style.transform = `translate(${(cx + Math.cos(ang) * dist).toFixed(0)}px, ${(cy + Math.sin(ang) * dist).toFixed(0)}px) rotate(${(Math.random() * 140 - 70).toFixed(0)}deg)`;
    });
    frags.forEach((f, seq) => {
      const delay = 300 + seq * 130;
      setTimeout(() => {
        f.style.transition = `transform 0.38s cubic-bezier(0.55, -0.15, 0.75, 0.5), opacity 0.2s ease 0.22s`;
        f.style.transform = `translate(${centreX.toFixed(0)}px, ${centreY.toFixed(0)}px) rotate(${(Math.random() * 200 - 100).toFixed(0)}deg) scale(0.04)`;
        f.style.opacity = "0";
      }, delay);
    });
    setTimeout(
      () => {
        frags.forEach((f) => f.remove());
        onDone();
      },
      300 + 5 * 130 + 380 + 40,
    );
  }

  function runAlienCameo(onDone) {
    const wrap = document.createElement("div");
    wrap.className = "egg-fx egg-cameo";
    wrap.innerHTML = `<div class="egg-cameo-turn">${ALIEN_SVG}</div>`;
    document.body.appendChild(wrap);
    wrap.querySelector(".egg-alien").style.height = "40px";

    const stopY = window.innerHeight * 0.46;
    const stopX = window.innerWidth - 140;
    const startX = window.innerWidth + 60;
    wrap.style.transform = `translate(${startX}px, ${stopY.toFixed(0)}px)`;
    requestAnimationFrame(() => {
      wrap.style.transition = "transform 0.4s ease-out";
      wrap.style.transform = `translate(${stopX}px, ${stopY.toFixed(0)}px)`;
    });

    setTimeout(() => {
      const turn = wrap.querySelector(".egg-cameo-turn");
      turn.style.transition = "transform 0.18s ease";
      turn.style.transform = "scaleX(-1)";
    }, 600);

    setTimeout(() => {
      bubble.style.position = "fixed";
      bubble.style.left = stopX + "px";
      bubble.style.top = stopY - 46 + "px";
      bubble.style.right = "auto";
      bubble.style.bottom = "auto";
      bubble.style.transform = "none";
      bubble.style.zIndex = "395";
      document.body.appendChild(bubble);
      typeBubble("Told you.");
    }, 780);

    setTimeout(
      () => {
        flingToCentre(wrap, "rotate(360deg)", 0.4, 0);
      },
      780 + 360 + 600,
    );

    setTimeout(
      () => {
        hideBubble(true);
        wrap.remove();
        onDone();
      },
      780 + 360 + 600 + 500,
    );
  }

  function startDestruction() {
    destroying = true;
    hideBubble(true);
    document.body.style.overflow = "hidden";

    /* Ship, reticle and firing zone go the instant destruction starts;
       the system cursor is restored immediately. */
    clearInterval(zoneTimer);
    document.documentElement.classList.remove("egg-noufo");
    if (firezone) {
      firezone.classList.remove("active");
      firezone.remove();
      firezone = null;
    }
    if (ship) {
      ship.remove();
      ship = null;
    }
    stationWrap.classList.remove("egg-aim");
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

    // 3.6s — AMENDMENT: the station breaks apart instead of the alien
    // being dragged to centre; a short alien cameo follows, then the
    // original flash-two/blackout/dead-screen finish.
    at(3600, () => {
      const stationRect = stationEntrance.getBoundingClientRect();
      stationEntrance.style.transition = "opacity 0.15s ease";
      stationEntrance.style.opacity = "0";
      buildAndRunFragments(stationRect, () => {
        runAlienCameo(() => {
          finishSequence();
        });
      });
    });

    function finishSequence() {
      const black = fxDiv("egg-blackout");
      flash.style.transition = "opacity 0.1s ease-in";
      flash.style.opacity = "1";
      setTimeout(() => {
        black.style.transition = "opacity 0.4s ease";
        black.style.opacity = "1";
        flash.style.transition = "opacity 0.4s ease";
        flash.style.opacity = "0";
      }, 250);

      setTimeout(() => {
        clearInterval(shaker);
        shakeEls.forEach((el) => el.classList.remove("egg-shaken"));
        ["--egg-sx", "--egg-sy", "--egg-rot", "--egg-scl"].forEach((v) =>
          root.style.removeProperty(v),
        );
        cracksSvg?.remove();
        scan?.remove();
        border.remove();
        flash.remove();
      }, 500);

      setTimeout(showDeadScreen, 800);
    }
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
