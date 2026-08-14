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

/* ── Console ───────────────────────────────────────────── */
.egg-console-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
.egg-console { display: block; width: 86px; height: auto; overflow: visible; }
.egg-console .line { fill: none; stroke: var(--color-ink); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.egg-console .cable { stroke: rgba(255, 255, 255, 0.55); stroke-width: 1.1; }
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
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
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
}
`;

const ALIEN_SVG = `
<svg class="egg-alien" viewBox="0 0 100 130" aria-hidden="true">
  <defs>
    <clipPath id="eggDomeClip">
      <path d="M 30 46 L 30 30 Q 30 10 50 10 Q 70 10 70 30 L 70 46 Z" />
    </clipPath>
  </defs>

  <!-- reaching arm (viewer's left, toward the console) -->
  <g class="egg-arm-reach">
    <path class="line thin" d="M 36 68 C 24 74, 14 82, 8 92" />
    <path class="line thin" d="M 8 92 L 3.5 95.5 M 8 92 L 7.5 98 M 8 92 L 12 97" />
  </g>
  <!-- relaxed arm -->
  <g class="egg-arm-relax">
    <path class="line thin" d="M 64 68 C 70 80, 68 94, 62 102" />
  </g>

  <!-- backpack with exhaust nozzles -->
  <g class="egg-pack">
    <path class="line" d="M 68 72 L 77 74 L 76 92 L 68 90" />
    <path class="line thin" d="M 70.5 92 L 70.5 97 M 74.5 92.4 L 74.5 97" />
    <circle class="egg-particle p1" cx="70.5" cy="100" r="1" />
    <circle class="egg-particle p2" cx="74.5" cy="101" r="0.9" />
    <circle class="egg-particle p3" cx="72.5" cy="99" r="0.8" />
  </g>

  <!-- torso: sloped shoulders, ribbed chest, tapering to a point -->
  <path class="line" d="M 40 62 L 32 70 L 35 96 L 50 118 L 65 96 L 68 70 L 60 62" />
  <path class="line thin" d="M 44 74 L 44.5 90 M 50 75 L 50 92 M 56 74 L 55.5 90" />

  <!-- head: wide top, hard corners, narrow jaw -->
  <path class="line" d="M 35 26 L 65 26 L 61 52 L 55 60 L 45 60 L 39 52 Z" />

  <!-- eyes: narrow, angled down toward centre -->
  <g class="egg-eyes">
    <polygon points="38.5,37 46,40.5 46,43.5 38.5,39.5" />
    <polygon points="61.5,37 54,40.5 54,43.5 61.5,39.5" />
  </g>

  <!-- helmet dome and inner highlight -->
  <path class="line" d="M 30 46 L 30 30 Q 30 10 50 10 Q 70 10 70 30 L 70 46" />
  <path class="line thin egg-glint" d="M 36 24 Q 37 15 45 12.5" />
  <g clip-path="url(#eggDomeClip)">
    <path class="line thin egg-sweep" d="M 34 40 Q 34 16 52 11" />
  </g>

  <!-- antenna, bent once, beacon tip -->
  <path class="line thin" d="M 33 19 L 27 10 L 31 4" />
  <circle class="egg-antenna-tip" cx="31" cy="3" r="2.2" />
</svg>`;

const CONSOLE_SVG = `
<svg class="egg-console" viewBox="0 0 86 96" aria-hidden="true">
  <!-- top face in perspective, then front face -->
  <path class="line" d="M 20 24 Q 22 21 26 21 L 60 21 Q 64 21 66 24 L 76 36 Q 77 38 74 38 L 12 38 Q 9 38 10 36 Z" />
  <path class="line" d="M 10 38 L 10 48 Q 10 51 13 51 L 73 51 Q 76 51 76 48 L 76 38" />
  <!-- red button cap -->
  <ellipse class="egg-btn-cap" cx="43" cy="24" rx="11" ry="8" />
  <ellipse class="line thin" cx="43" cy="27" rx="11" ry="8" fill="none" />
  <!-- cable running down and off the layer -->
  <path class="cable" fill="none" d="M 40 51 C 36 66, 50 76, 45 96" />
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
      <div class="egg-alien-float"><div class="egg-alien-tilt">${ALIEN_SVG}</div></div>
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
  function checkBottom() {
    const doc = document.documentElement;
    const fromBottom = doc.scrollHeight - window.innerHeight - window.scrollY;
    const nowVisible = fromBottom <= 200;
    if (nowVisible === visible) return;
    visible = nowVisible;
    layer.classList.toggle("egg-in", visible);
    button.tabIndex = visible ? 0 : -1;
    if (!visible) hideBubble(true);
  }
  window.addEventListener("scroll", checkBottom, { passive: true });
  window.addEventListener("resize", checkBottom, { passive: true });
  checkBottom();

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
    if (visible) typeBubble("Don't.");
  });
  scene.addEventListener("mouseleave", () => {
    hideTimer = setTimeout(() => hideBubble(false), 600);
  });
  button.addEventListener("focus", () => {
    if (visible) typeBubble("Don't.");
  });
}

initEasterEgg();
