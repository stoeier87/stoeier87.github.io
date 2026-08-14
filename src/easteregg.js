/* Easter egg: an alien guards a red button at the bottom of the homepage.
   Lives entirely on its own fixed overlay — nothing here touches or
   reflows the existing layout, and all motion is transform/opacity/filter. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  align-items: flex-end;
  gap: 10px;
}
/* The scene is the hover region; it only takes pointer events while visible. */
.egg-in .egg-scene { pointer-events: auto; }

/* ── Alien ─────────────────────────────────────────────── */
.egg-alien-float { will-change: transform; }
.egg-alien-tilt { will-change: transform; }
.egg-alien { display: block; height: 96px; width: auto; overflow: visible; }
.egg-alien .line { fill: none; stroke: var(--color-ink); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.egg-alien .thin { stroke-width: 1; }

.egg-eyes { fill: var(--color-red); filter: drop-shadow(0 0 3px rgba(224, 58, 47, 0.9)); }
.egg-antenna-tip { fill: var(--color-red); filter: drop-shadow(0 0 2px rgba(224, 58, 47, 0.9)); }
.egg-glint { stroke: rgba(255, 255, 255, 0.7); }
.egg-sweep { stroke: rgba(255, 255, 255, 0.55); opacity: 0; }
.egg-particle { fill: rgba(255, 255, 255, 0.6); opacity: 0; }

@keyframes eggFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes eggTilt {
  0%, 100% { transform: rotate(-1deg); }
  50% { transform: rotate(1deg); }
}
@keyframes eggBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes eggBeacon {
  0%, 92%, 100% { opacity: 0.35; filter: drop-shadow(0 0 1px rgba(224, 58, 47, 0.4)); }
  94%, 97% { opacity: 1; filter: drop-shadow(0 0 5px rgba(224, 58, 47, 1)); }
}
@keyframes eggSweep {
  0%, 88%, 100% { opacity: 0; transform: translateX(0); }
  90% { opacity: 1; }
  96% { opacity: 0; transform: translateX(26px); }
}
@keyframes eggPuff {
  0%, 60% { opacity: 0; transform: translateY(0); }
  66% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(9px); }
}

.egg-idle .egg-alien-float { animation: eggFloat 4s ease-in-out infinite; }
.egg-idle .egg-alien-tilt { animation: eggTilt 5.3s ease-in-out infinite; }
.egg-idle .egg-eyes { animation: eggBlink 3s ease-in-out infinite; }
.egg-idle .egg-antenna-tip { animation: eggBeacon 4s linear infinite; }
.egg-idle .egg-sweep { animation: eggSweep 6s linear infinite; }
.egg-idle .egg-particle { animation: eggPuff 2s ease-in infinite; }
.egg-idle .egg-particle.p2 { animation-delay: 0.35s; }
.egg-idle .egg-particle.p3 { animation-delay: 0.7s; }

/* ── Escalation states ─────────────────────────────────── */
.egg-arms-folded { opacity: 0; transition: opacity 0.25s ease; }

@keyframes eggRecoil {
  0% { transform: translateX(0); }
  35% { transform: translateX(10px); }
  100% { transform: translateX(0); }
}
.egg-recoil .egg-alien-tilt { animation: eggRecoil 0.45s cubic-bezier(0.2, 0.8, 0.3, 1); }
.egg-eyes-bright .egg-eyes {
  animation: none;
  opacity: 1;
  filter: drop-shadow(0 0 6px rgba(224, 58, 47, 1)) brightness(1.3);
}

.egg-press2plus .egg-arms-normal { opacity: 0; transition: opacity 0.25s ease; }
.egg-press2plus .egg-arms-folded { opacity: 1; }
.egg-antenna { transform-origin: 60px 13px; transition: transform 0.4s ease; }
.egg-press2plus .egg-antenna { transform: rotate(15deg); }
.egg-idle.egg-press2plus .egg-alien-float { animation-duration: 6.5s; }

.egg-alien-turn { transition: transform 0.45s ease; }
.egg-press3 .egg-alien-turn { transform: scaleX(-1); }
.egg-press3 .egg-eyes, .egg-press3 .egg-glint { animation: none; opacity: 0; transition: opacity 0.2s ease; }
.egg-idle.egg-press3 .egg-particle { animation-duration: 0.7s; }
@keyframes eggBtnPulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 80, 64, 0.8)); }
  50% { filter: drop-shadow(0 0 12px rgba(255, 80, 64, 1)); }
}
.egg-press3 .egg-btn-cap { fill: #ff5040; animation: eggBtnPulse 0.6s ease-in-out infinite; }

.egg-press4 .egg-alien-turn { transform: scaleX(1); }
.egg-press4 .egg-eyes {
  opacity: 1;
  animation: none;
  filter: drop-shadow(0 0 8px rgba(224, 58, 47, 1)) brightness(1.5);
}

/* ── Console ───────────────────────────────────────────── */
.egg-console-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
.egg-console { display: block; width: 86px; height: auto; overflow: visible; }
.egg-console .line { fill: none; stroke: var(--color-ink); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.egg-console .cable { stroke: rgba(255, 255, 255, 0.55); stroke-width: 1.1; }
.egg-hazard { fill: none; stroke: var(--color-red); stroke-width: 1.6; opacity: 0.55; }
.egg-ind { fill: var(--color-red); opacity: 0.7; filter: drop-shadow(0 0 2px rgba(224, 58, 47, 0.8)); }
.egg-btn-cap {
  fill: var(--color-red);
  filter: drop-shadow(0 0 6px rgba(224, 58, 47, 0.7));
  transition: filter 0.3s ease, fill 0.3s ease;
}
.egg-label {
  margin-top: 2px;
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-red);
  white-space: nowrap;
}

/* The real button sits invisibly over the drawn cap. */
.egg-button {
  position: absolute;
  top: 10px;
  left: 47%;
  transform: translateX(-50%);
  width: 34px;
  height: 30px;
  border-radius: 50%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
}
.egg-layer:not(.egg-in) .egg-button { pointer-events: none; }
.egg-button:focus-visible { outline: 2px solid var(--color-red); outline-offset: 4px; }

/* ── Speech bubble ─────────────────────────────────────── */
.egg-bubble {
  position: absolute;
  right: 0;
  bottom: calc(100% + 14px);
  max-width: min(210px, calc(100vw - 32px));
  padding: 8px 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  background: rgba(5, 7, 15, 0.85);
  color: var(--color-ink);
  font-size: 0.72rem;
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

/* ── Destruction ───────────────────────────────────────────
   Shake, rotation and scale ride on CSS vars driven by one JS
   interval; everything else is transform/opacity/filter. */
.egg-shaken {
  transform: translate(var(--egg-sx, 0px), var(--egg-sy, 0px))
    rotate(var(--egg-rot, 0deg)) scale(var(--egg-scl, 1));
}

.egg-fx { position: fixed; inset: 0; pointer-events: none; }

.egg-border-flicker { z-index: 330; border: 2px solid var(--color-red); opacity: 0; }
/* exactly three appearances in 0.5s, then gone */
@keyframes eggBorderFlick {
  0%, 20%, 36%, 56%, 72%, 100% { opacity: 0; }
  10%, 46%, 84% { opacity: 1; }
}
.egg-border-flicker.run { animation: eggBorderFlick 0.5s linear 1; }

.egg-band {
  position: fixed;
  left: -80px;
  right: -80px;
  z-index: 310;
  pointer-events: none;
  backdrop-filter: contrast(1.7) invert(0.12) hue-rotate(45deg);
}

@keyframes eggRgb {
  0%, 100% { filter: drop-shadow(-2px 0 rgba(255, 40, 60, 0.85)) drop-shadow(2px 0 rgba(0, 230, 255, 0.85)); }
  50% { filter: drop-shadow(-8px 0 rgba(255, 40, 60, 0.85)) drop-shadow(8px 0 rgba(0, 230, 255, 0.85)); }
}
.egg-rgb { animation: eggRgb 0.16s linear infinite; }

.egg-cracks { z-index: 320; width: 100%; height: 100%; }
.egg-crack { fill: none; stroke: rgba(255, 255, 255, 0.8); stroke-width: 1; }

.egg-scanlines { z-index: 315; opacity: 0; transition: opacity 0.6s ease; overflow: hidden; }
.egg-scanlines.show { opacity: 0.18; }
.egg-scanlines::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: -100%; height: 300%;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255, 255, 255, 0.35) 3px 4px);
  animation: eggScanRoll 1.4s linear infinite;
}
@keyframes eggScanRoll {
  from { transform: translateY(0); }
  to { transform: translateY(33.33%); }
}

.egg-burnout { transition: opacity 1.2s steps(6, end); opacity: 0 !important; }

.egg-flash { z-index: 380; background: #fff; opacity: 0; }
.egg-blackout { z-index: 390; background: #000; opacity: 0; }

/* ── Dead screen ───────────────────────────────────────── */
.egg-dead {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.25rem;
  pointer-events: auto;
  font-family: var(--font-mono);
}
.egg-dead-line {
  color: var(--color-red);
  font-size: clamp(0.85rem, 3.5vw, 1.15rem);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
  min-height: 1.4em;
}
.egg-restart {
  margin-top: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: clamp(0.7rem, 1.8vw, 0.85rem);
  letter-spacing: 0.08em;
  color: var(--color-red);
  padding: 0.85rem 1.4rem;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 100px;
  background: rgba(13, 20, 36, 0.72);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.4s ease, border-color 0.25s ease;
}
.egg-restart.show { opacity: 1; animation: eggRestartPulse 1.6s ease-in-out infinite; }
.egg-restart:hover { border-color: var(--color-red); }
.egg-restart:focus-visible { outline: 2px solid var(--color-red); outline-offset: 4px; }
@keyframes eggRestartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
}

/* ── Small screens ─────────────────────────────────────── */
@media (max-width: 500px) {
  /* bottom is 44px rather than 24 so the DO NOT PUSH label clears the
     footer link at full scroll */
  .egg-layer { right: 24px; bottom: 44px; }
  .egg-alien { height: 64px; }
  .egg-console { width: 62px; }
  .egg-label { font-size: 0.48rem; }
  .egg-bubble { font-size: 0.66rem; max-width: min(180px, calc(100vw - 24px)); }
}

@media (prefers-reduced-motion: reduce) {
  .egg-idle .egg-alien-float,
  .egg-idle .egg-alien-tilt,
  .egg-idle .egg-eyes,
  .egg-idle .egg-antenna-tip,
  .egg-idle .egg-sweep,
  .egg-idle .egg-particle { animation: none; }
  .egg-eyes { opacity: 0.6; }
  .egg-sweep, .egg-particle { opacity: 0; }
  /* escalation is text-only: no recoil, no fold, no turn, no pulses */
  .egg-recoil .egg-alien-tilt,
  .egg-press3 .egg-btn-cap { animation: none; }
  .egg-eyes-bright .egg-eyes, .egg-press4 .egg-eyes { filter: none; opacity: 0.6; }
  .egg-press2plus .egg-arms-normal { opacity: 1; }
  .egg-press2plus .egg-arms-folded { opacity: 0; }
  .egg-press2plus .egg-antenna { transform: none; }
  .egg-press3 .egg-alien-turn, .egg-press4 .egg-alien-turn { transform: none; }
  .egg-press3 .egg-eyes { opacity: 0.6; }
  .egg-press3 .egg-glint { opacity: 1; }
  .egg-restart.show { animation: none; }
}
`;

const ALIEN_SVG = `
<svg class="egg-alien" viewBox="0 0 100 132" aria-hidden="true">
  <defs>
    <clipPath id="eggHeadClip">
      <path d="M 50 12 C 70 12 82 26 81 42 C 80 58 66 72 50 78 C 34 72 20 58 19 42 C 18 26 30 12 50 12 Z" />
    </clipPath>
  </defs>

  <!-- reaching arm (viewer's left, toward the console) -->
  <g class="egg-arms-normal">
    <path class="line thin" d="M 38 90 C 24 94, 12 98, 5 106" />
    <path class="line thin" d="M 5 106 L 0.5 109 M 5 106 L 4.5 112 M 5 106 L 9 111" />
    <path class="line thin" d="M 62 90 C 70 100, 68 112, 60 118" />
  </g>
  <!-- folded arms, hidden until press 2 -->
  <g class="egg-arms-folded">
    <path class="line thin" d="M 36 94 C 44 104, 56 104, 65 96" />
    <path class="line thin" d="M 64 96 C 56 106, 46 106, 38 98" />
  </g>

  <!-- backpack with exhaust nozzles -->
  <g class="egg-pack">
    <path class="line" d="M 66 94 L 75 96 L 74 112 L 66 110" />
    <path class="line thin" d="M 68.5 112 L 68.5 117 M 72.5 112.4 L 72.5 117" />
    <circle class="egg-particle p1" cx="68.5" cy="120" r="1" />
    <circle class="egg-particle p2" cx="72.5" cy="121" r="0.9" />
    <circle class="egg-particle p3" cx="70.5" cy="119" r="0.8" />
  </g>

  <!-- neck and slender torso tapering to a floating point -->
  <path class="line thin" d="M 46 78 L 46 84 M 54 78 L 54 84" />
  <path class="line" d="M 42 84 L 34 92 L 37 106 L 50 126 L 63 106 L 66 92 L 58 84" />
  <path class="line thin" d="M 44 94 L 44.5 106 M 50 95 L 50 110 M 56 94 L 55.5 106" />

  <!-- the head: big teardrop cranium, pointed chin -->
  <path class="line" d="M 50 12 C 70 12 82 26 81 42 C 80 58 66 72 50 78 C 34 72 20 58 19 42 C 18 26 30 12 50 12 Z" />

  <!-- huge slanted almond eyes, unimpressed by default -->
  <g class="egg-eyes">
    <path d="M 25 36 C 30 30 40 32 44 39 C 43 46 32 48 27 44 C 24 42 23 39 25 36 Z" />
    <path d="M 75 36 C 70 30 60 32 56 39 C 57 46 68 48 73 44 C 76 42 77 39 75 36 Z" />
  </g>

  <!-- nostrils and a flat, unimpressed mouth -->
  <circle class="line thin" cx="47" cy="60" r="0.8" />
  <circle class="line thin" cx="53" cy="60" r="0.8" />
  <path class="line thin" d="M 44 68 L 56 68" />

  <!-- cranium highlight plus the travelling sweep -->
  <path class="line thin egg-glint" d="M 30 22 Q 38 13 48 12" />
  <g clip-path="url(#eggHeadClip)">
    <path class="line thin egg-sweep" d="M 25 36 Q 28 15 46 12" />
  </g>

  <!-- antenna, bent once, beacon tip -->
  <g class="egg-antenna">
    <path class="line thin" d="M 60 13 L 66 5 L 62 1" />
    <circle class="egg-antenna-tip" cx="61.5" cy="1" r="2.2" />
  </g>
</svg>`;

const CONSOLE_SVG = `
<svg class="egg-console" viewBox="0 0 96 100" aria-hidden="true">
  <!-- pedestal: top face in perspective, then front face -->
  <path class="line" d="M 22 30 Q 24 26 28 26 L 64 26 Q 68 26 70 30 L 82 44 Q 84 47 80 47 L 12 47 Q 8 47 10 44 Z" />
  <path class="line" d="M 10 47 L 10 60 Q 10 63 13 63 L 79 63 Q 82 63 82 60 L 82 47" />
  <!-- hazard chevrons across the front face -->
  <path class="egg-hazard" d="M 17 62 L 23 48 M 27 62 L 33 48 M 37 62 L 43 48" />
  <!-- indicator lights -->
  <circle class="egg-ind" cx="62" cy="55" r="1.8" />
  <circle class="line thin" cx="70" cy="55" r="1.8" />
  <!-- flipped-open safety cover, hinged at the dome's right edge -->
  <ellipse class="line thin" cx="66" cy="14" rx="8" ry="12" transform="rotate(32 66 14)" />
  <path class="line thin" d="M 58 22 L 61 17" />
  <!-- the big red dome itself -->
  <ellipse class="line thin" cx="46" cy="30" rx="13" ry="9.5" fill="none" />
  <ellipse class="egg-btn-cap" cx="46" cy="26" rx="13" ry="9.5" />
  <path class="line thin" d="M 38 22 Q 42 18 48 18" />
  <!-- cable running down and off the layer -->
  <path class="cable" fill="none" d="M 42 63 C 38 76, 52 84, 46 100" />
</svg>`;

function buildLayer() {
  const layer = document.createElement("div");
  layer.className = "egg-layer" + (reduced ? "" : " egg-idle");
  layer.innerHTML = `
    <div class="egg-scene">
      <div class="egg-bubble" role="status" aria-live="polite"></div>
      <div class="egg-console-wrap">
        ${CONSOLE_SVG}
        <button class="egg-button" type="button" aria-label="Do not push"></button>
        <div class="egg-label">Do not push</div>
      </div>
      <div class="egg-alien-float"><div class="egg-alien-tilt"><div class="egg-alien-turn">${ALIEN_SVG}</div></div></div>
    </div>`;
  return layer;
}

function initEasterEgg() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const layer = buildLayer();
  document.body.appendChild(layer);

  const scene = layer.querySelector(".egg-scene");
  const bubble = layer.querySelector(".egg-bubble");
  const button = layer.querySelector(".egg-button");
  button.tabIndex = -1;

  /* Visible only within 200px of the very bottom of the page. */
  let visible = false;
  let presses = 0;
  function checkBottom() {
    const doc = document.documentElement;
    const fromBottom = doc.scrollHeight - window.innerHeight - window.scrollY;
    const nowVisible = fromBottom <= 200;
    if (nowVisible === visible) return;
    visible = nowVisible;
    layer.classList.toggle("egg-in", visible);
    button.tabIndex = visible ? 0 : -1;
    if (!visible) hideBubble(true);
    if (visible && !introShown && presses === 0) {
      introShown = true;
      setTimeout(() => {
        if (visible && presses === 0) {
          typeBubble(INTRO);
          hideTimer = setTimeout(() => hideBubble(false), 4500);
        }
      }, 500);
    }
  }
  window.addEventListener("scroll", checkBottom, { passive: true });
  window.addEventListener("resize", checkBottom, { passive: true });
  checkBottom();

  const INTRO = "Whatever you do, do not click the button.";
  let introShown = false;

  /* Typewriter bubble, same technique as the space-bar bartender. */
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

  scene.addEventListener("mouseenter", () => {
    if (visible && presses === 0) typeBubble(INTRO);
  });
  scene.addEventListener("mouseleave", () => {
    if (presses === 0) hideTimer = setTimeout(() => hideBubble(false), 600);
  });
  button.addEventListener("focus", () => {
    if (visible && presses === 0) typeBubble(INTRO);
  });

  /* ── Escalation: four presses, each registering immediately ── */
  let recoilTimer = null;
  let brightTimer = null;

  function holdThenFade() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideBubble(false), 2500);
  }

  button.addEventListener("click", () => {
    if (!visible || presses >= 4) return;
    presses += 1;

    if (presses === 1) {
      typeBubble("Don't.");
      holdThenFade();
      layer.classList.add("egg-recoil", "egg-eyes-bright");
      clearTimeout(recoilTimer);
      clearTimeout(brightTimer);
      recoilTimer = setTimeout(() => layer.classList.remove("egg-recoil"), 500);
      brightTimer = setTimeout(() => layer.classList.remove("egg-eyes-bright"), 900);
    } else if (presses === 2) {
      typeBubble("I said don't.");
      holdThenFade();
      layer.classList.remove("egg-recoil", "egg-eyes-bright");
      layer.classList.add("egg-press2plus");
    } else if (presses === 3) {
      typeBubble("Do you know how long that took to build.");
      holdThenFade();
      layer.classList.add("egg-press3");
    } else {
      layer.classList.remove("egg-press3");
      layer.classList.add("egg-press4");
      typeBubble("Fine.");
      clearTimeout(hideTimer);
      setTimeout(startDestruction, 400);
    }
  });

  /* ── Destruction: a 5-second timeline. Flash safety: only two
     full-viewport flashes (2.6s and 4.2s), the edge border flickers
     exactly three times, nothing else strobes. ── */
  function fxDiv(cls) {
    const d = document.createElement("div");
    d.className = "egg-fx " + cls;
    document.body.appendChild(d);
    return d;
  }

  function buildCracks() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "egg-fx egg-cracks");
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
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
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "egg-crack");
      p.setAttribute("pathLength", "1");
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

  function startDestruction() {
    hideBubble(true);
    document.body.style.overflow = "hidden";

    if (reduced) {
      const black = fxDiv("egg-blackout");
      black.style.transition = "opacity 0.8s ease";
      requestAnimationFrame(() => (black.style.opacity = "1"));
      setTimeout(() => showDeadScreen(black), 900);
      return;
    }

    const root = document.documentElement;
    const shakeEls = [
      document.getElementById("starfield"),
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

    // 0.0–0.5s WARNING: hard shake + edge border, three flickers only
    const border = fxDiv("egg-border-flicker");
    border.classList.add("run");
    at(600, () => border.remove());

    // 0.4–1.4s SIGNAL BREAK: glitch bands + RGB split on the name
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

    // 0.8–2.0s FRACTURE: cracks stay, scanlines roll in
    let cracksSvg = null;
    let scan = null;
    at(800, () => {
      cracksSvg = buildCracks();
      scan = fxDiv("egg-scanlines");
      requestAnimationFrame(() => scan.classList.add("show"));
    });

    // 1.2–2.6s COLLAPSE: letters scatter into the centre, pills stretch after
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

    // 2.6s FLASH ONE (permitted), then BURNOUT
    const flash = fxDiv("egg-flash");
    at(2600, () => {
      flash.style.transition = "opacity 0.12s ease-in";
      flash.style.opacity = "1";
      setTimeout(() => {
        flash.style.transition = "opacity 0.25s ease-out";
        flash.style.opacity = "0";
      }, 130);
      document.getElementById("starfield").classList.add("egg-burnout");
      document.querySelector(".dotgrid")?.classList.add("egg-burnout");
      ramping = true;
    });

    // 3.6–4.2s THE ALIEN GOES LAST
    at(3550, () => typeBubble("Told you."));
    at(3600, () => {
      const alien = layer.querySelector(".egg-alien-float");
      const consoleWrap = layer.querySelector(".egg-console-wrap");
      flingToCentre(alien, "rotate(720deg)", 0.55, 0);
      flingToCentre(consoleWrap, "rotate(200deg)", 0.5, 0.12);
    });

    // 4.2s FLASH TWO (permitted): white, hold, then to solid black
    const black = fxDiv("egg-blackout");
    at(4200, () => {
      hideBubble(true);
      flash.style.transition = "opacity 0.1s ease-in";
      flash.style.opacity = "1";
      setTimeout(() => {
        black.style.transition = "opacity 0.4s ease";
        black.style.opacity = "1";
        flash.style.transition = "opacity 0.4s ease";
        flash.style.opacity = "0";
      }, 250);
    });

    // 4.7–5.0s silence on black; every effect is dismantled behind it
    at(4700, () => {
      clearInterval(shaker);
      shakeEls.forEach((el) => el.classList.remove("egg-shaken"));
      ["--egg-sx", "--egg-sy", "--egg-rot", "--egg-scl"].forEach((v) =>
        root.style.removeProperty(v),
      );
      cracksSvg?.remove();
      scan?.remove();
      border.remove();
      flash.remove();
    });

    at(5000, () => showDeadScreen(black));
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
