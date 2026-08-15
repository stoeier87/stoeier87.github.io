import { DIAGRAMS, TOOLS, reduced, isMobile, mulberry32 } from "./shared/tools-data.js";
import { extractConstellation, polylineLength } from "./shared/constellation-source.js";

const $ = (id) => document.getElementById(id);
const SVG_NS = "http://www.w3.org/2000/svg";

/* ============================================================
   Backdrop — still, quiet starfield. No motion beyond a slow
   twinkle; this room doesn't need a UFO passing through.
   (The satellite easter egg is a separate, much rarer visitor —
   see the .satellite element in index.html.)
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
   Zodiac — a few of the models drift in the backdrop as faint
   constellations, part of the sky rather than the interface.
   ============================================================ */
(function zodiac() {
  const SPOTS = [
    { key: "venn", left: "2%", top: "6%", size: "clamp(150px, 22vw, 280px)", dur: 120, delay: 0 },
    { key: "octagon", left: "76%", top: "10%", size: "clamp(130px, 20vw, 250px)", dur: 145, delay: -40 },
    { key: "curve", left: "1%", top: "58%", size: "clamp(140px, 21vw, 260px)", dur: 132, delay: -80 },
    { key: "pyramid", left: "78%", top: "62%", size: "clamp(130px, 19vw, 240px)", dur: 155, delay: -20 },
    { key: "radial7", left: "42%", top: "78%", size: "clamp(120px, 17vw, 210px)", dur: 140, delay: -60 },
  ];
  const wrap = document.createElement("div");
  wrap.className = "zodiac";
  wrap.setAttribute("aria-hidden", "true");
  const figs = [];
  for (const s of SPOTS) {
    const fig = document.createElement("div");
    fig.className = "zodiac-fig";
    fig.style.left = s.left;
    fig.style.top = s.top;
    fig.style.width = s.size;
    fig.style.height = s.size;
    fig.style.setProperty("--zd", s.dur + "s");
    fig.style.animationDelay = s.delay + "s";
    const svg = DIAGRAMS[s.key].thumb();
    fig.appendChild(svg);
    wrap.appendChild(fig);
    figs.push({ el: fig, svg, key: s.key, dots: [], stars: [], polys: [], anims: [] });
  }
  document.body.appendChild(wrap);

  /* ── Life. Vertices twinkle, lines breathe, a constellation traces
     itself now and then, and about once a minute the sky draws one line
     that isn't there. All of it stays at or below the figures' current
     luminance: strokes now breathe around a mean of ~0.7 of their old
     constant brightness, which pays for the stars.

     Everything animates through the Web Animations API — no CSS added,
     per-element random timing for free, and one cancel() call per
     animation when reduced motion switches on. ── */
  const rnd = mulberry32(4119);
  const small = window.matchMedia("(max-width: 499px)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const STATIC_DOT = 0.5;
  let lastTraceIdx = -1;

  function buildStars() {
    for (const f of figs) {
      const { stars, polylines } = extractConstellation(f.svg);
      f.stars = stars;
      f.polys = polylines;
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "zodiac-stars");
      for (const p of stars) {
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", p.x.toFixed(1));
        c.setAttribute("cy", p.y.toFixed(1));
        c.setAttribute("r", (1.3 + rnd() * 1.1).toFixed(2));
        c.setAttribute("fill", "currentColor");
        c.style.opacity = STATIC_DOT;
        g.appendChild(c);
        f.dots.push(c);
      }
      f.svg.appendChild(g);
    }
  }

  function startAmbient() {
    for (const f of figs) {
      for (const c of f.dots) {
        // 2–6 s, each on its own clock — never in unison.
        const dur = 2000 + rnd() * 4000;
        const base = 0.12 + rnd() * 0.16;
        const peak = 0.7 + rnd() * 0.3;
        f.anims.push(
          c.animate([{ opacity: base }, { opacity: peak }, { opacity: base }], {
            duration: dur,
            delay: -rnd() * dur,
            iterations: Infinity,
            easing: "ease-in-out",
          }),
        );
      }
      for (const el of f.svg.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect")) {
        if (el.parentNode.getAttribute && el.parentNode.getAttribute("class") === "zodiac-stars") continue;
        // Slower than the stars and phase-scattered, so nothing beats in step.
        const dur = 5000 + rnd() * 4000;
        f.anims.push(
          el.animate([{ opacity: 0.55 }, { opacity: 0.85 }, { opacity: 0.55 }], {
            duration: dur,
            delay: -rnd() * dur,
            iterations: Infinity,
            easing: "ease-in-out",
          }),
        );
      }
    }
  }

  function stopAmbient() {
    for (const f of figs) {
      for (const a of f.anims) a.cancel();
      f.anims = [];
      for (const c of f.dots) c.style.opacity = STATIC_DOT;
    }
  }

  /* One constellation redraws itself: a brighter pulse rides its lines end
     to end over ~2 s while the whole figure lifts slightly, then settles. */
  function traceOne() {
    const candidates = figs.filter((_, i) => i !== lastTraceIdx && figs[i].polys.length);
    if (!candidates.length) return;
    const f = candidates[Math.floor(Math.random() * candidates.length)];
    lastTraceIdx = figs.indexOf(f);

    f.el.animate(
      [
        { opacity: 0.07 },
        { opacity: 0.12, offset: 0.3 },
        { opacity: 0.12, offset: 0.7 },
        { opacity: 0.07 },
      ],
      { duration: 2600, easing: "ease-in-out" },
    );

    const lens = f.polys.map(polylineLength);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const overlays = [];
    f.polys.forEach((points, i) => {
      const d = points.map((p, j) => (j ? "L" : "M") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linecap", "round");
      path.style.opacity = "0.9";
      f.svg.appendChild(path);
      overlays.push(path);
      const L = path.getTotalLength();
      const seg = Math.max(12, L * 0.25);
      path.setAttribute("stroke-dasharray", seg + " " + (L + seg));
      const dur = Math.max(120, 2000 * (lens[i] / total));
      path.animate([{ strokeDashoffset: seg }, { strokeDashoffset: -L }], {
        duration: dur,
        delay: acc,
        easing: "linear",
        fill: "both",
      });
      acc += dur;
    });
    setTimeout(() => overlays.forEach((o) => o.remove()), acc + 400);
  }

  /* The sky rearranging itself: a thin line between two vertices that are
     not normally connected, drawn in, held, gone. */
  function strayLine() {
    const f = figs[Math.floor(Math.random() * figs.length)];
    if (f.stars.length < 2) return;
    let a = null;
    let b = null;
    for (let tries = 0; tries < 14; tries++) {
      const p = f.stars[Math.floor(Math.random() * f.stars.length)];
      const q = f.stars[Math.floor(Math.random() * f.stars.length)];
      if (Math.hypot(p.x - q.x, p.y - q.y) > 45) {
        a = p;
        b = q;
        break;
      }
    }
    if (!a) return;
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", a.x.toFixed(1));
    line.setAttribute("y1", a.y.toFixed(1));
    line.setAttribute("x2", b.x.toFixed(1));
    line.setAttribute("y2", b.y.toFixed(1));
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "0.8");
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    line.setAttribute("stroke-dasharray", L + " " + L);
    line.setAttribute("stroke-dashoffset", String(L));
    line.style.opacity = "0.7";
    f.svg.appendChild(line);
    line.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], {
      duration: 650,
      easing: "ease-out",
      fill: "forwards",
    });
    const fade = line.animate([{ opacity: 0.7 }, { opacity: 0 }], {
      delay: 1100,
      duration: 900,
      fill: "forwards",
    });
    fade.onfinish = () => line.remove();
  }

  /* Recursive timers; each firing re-checks viewport and motion, so
     resizing under 500px or enabling reduced motion quiets them without
     tearing anything down. */
  function schedule(fn, min, max) {
    setTimeout(() => {
      if (!reduced() && !small.matches && !document.hidden) fn();
      schedule(fn, min, max);
    }, min + Math.random() * (max - min));
  }

  buildStars();
  if (!reduced()) startAmbient();
  motionQuery.addEventListener("change", () => {
    if (reduced()) stopAmbient();
    else if (!figs[0].anims.length) startAmbient();
  });
  schedule(traceOne, 15000, 25000);
  schedule(strayLine, 45000, 75000);
})();

/* ============================================================
   Grid + gentle wander — every model sits on a real CSS grid cell;
   the "drift" is a small transform-only wander around that fixed
   position, never far enough to approach a neighbour.
   ============================================================ */
const space = $("space");

function fitLabelFontSize(text, maxWidthPx, maxPx, minPx) {
  const estWidth = text.length * 0.68 * maxPx;
  if (estWidth <= maxWidthPx) return maxPx;
  return Math.max(minPx, maxWidthPx / (text.length * 0.68));
}

// Every thumbnail shares one 160x160 viewBox, but how much of it each
// diagram actually draws into varies a lot (a few thin axes vs. a
// dense nine-block grid). Left alone, that makes some models read as
// bigger than others even though their boxes are identical. Wrapping
// each thumbnail's content in a group and normalising that group's
// real, rendered bounding box to a fixed size fixes both that and the
// label-height inconsistency it causes, without hand-tuning ten sets
// of coordinates.
const THUMB_TARGET_HALF = 46;
function normalizeThumb(svg) {
  const group = document.createElementNS(SVG_NS, "g");
  while (svg.firstChild) group.appendChild(svg.firstChild);
  svg.appendChild(group);
  return group;
}
function applyThumbNormalization(group) {
  let bbox;
  try { bbox = group.getBBox(); } catch (e) { return; }
  if (!bbox || !(bbox.width > 0) || !(bbox.height > 0)) return;
  const cx = bbox.x + bbox.width / 2, cy = bbox.y + bbox.height / 2;
  const scale = (THUMB_TARGET_HALF * 2) / Math.max(bbox.width, bbox.height);
  group.setAttribute("transform", "translate(80,80) scale(" + scale.toFixed(4) + ") translate(" + (-cx).toFixed(2) + "," + (-cy).toFixed(2) + ")");
}

let drifters = [];
let rafId = null;
let lastT = 0;
let idleNode = null, idleFromNode = null, idleStart = 0;
let lastInteraction = 0;

const IDLE_DELAY = 30000, IDLE_DUR = 2600, IDLE_DEG = 6;

function buildNodes() {
  space.querySelectorAll(".tool-node").forEach((n) => n.remove());
  const m = isMobile();
  const labelMaxWidth = m ? 96 : 140;
  const labelMaxPx = m ? 8.6 : 10.56;
  const labelMinPx = m ? 7 : 8.5;
  /* Order now carries meaning, so position must read as fixed: a small
     oscillation around the slot, never more than 6px in any direction,
     always returning home. Free wander would say position is arbitrary. */
  const wanderRadius = m ? 5 : 6;
  const rnd = mulberry32(20260814);

  drifters = TOOLS.map((tool) => {
    const el = document.createElement("a");
    el.href = "./" + tool.slug + "/";
    el.className = "tool-node";

    const diagram = DIAGRAMS[tool.diagram].thumb();
    diagram.setAttribute("class", "tool-diagram");
    diagram.setAttribute("aria-hidden", "true");
    diagram.setAttribute("draggable", "false");
    const group = normalizeThumb(diagram);
    el.appendChild(diagram);

    const label = document.createElement("span");
    label.className = "tool-name";
    label.textContent = tool.shortName;
    label.style.fontSize = fitLabelFontSize(tool.shortName, labelMaxWidth, labelMaxPx, labelMinPx) + "px";
    el.appendChild(label);
    el.setAttribute("aria-label", tool.name);

    space.appendChild(el);
    applyThumbNormalization(group);

    const d = {
      el, tool,
      hover: false, activity: 1,
      phaseX: rnd() * 6.283, phaseY: rnd() * 6.283,
      freqX: 0.16 + rnd() * 0.09, freqY: 0.14 + rnd() * 0.09,
      radius: wanderRadius,
    };

    const enter = () => { d.hover = true; triggerEasterEgg(d); };
    const leave = () => { d.hover = false; };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("touchstart", enter, { passive: true });
    el.addEventListener("touchend", leave, { passive: true });
    el.addEventListener("focus", enter);
    el.addEventListener("blur", leave);

    return d;
  });
}

function step(now) {
  const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
  lastT = now;
  const t = now / 1000;

  for (const d of drifters) {
    const target = d.hover ? 0 : 1;
    d.activity += (target - d.activity) * Math.min(1, dt * 3);

    const dx = Math.cos(t * d.freqX + d.phaseX) * d.radius * d.activity;
    const dy = Math.sin(t * d.freqY + d.phaseY) * d.radius * 0.75 * d.activity;

    let transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px)";
    if (d === idleNode) {
      const rot = idleAngle(now);
      if (rot) transform += " rotate(" + rot.toFixed(2) + "deg)";
    }
    d.el.style.transform = transform;
  }

  rafId = requestAnimationFrame(step);
}

function idleAngle(now) {
  const elapsed = now - idleStart;
  if (elapsed > IDLE_DUR) { idleNode = null; return 0; }
  const half = IDLE_DUR / 2;
  const p = elapsed < half ? elapsed / half : 1 - (elapsed - half) / half;
  const eased = p * p * (3 - 2 * p);
  return eased * IDLE_DEG;
}

/* One random model, only after thirty quiet seconds, rotates a few
   degrees and settles back — once, then a different model is picked
   next time. Never announced, never blocking a tap. */
function markInteraction() { lastInteraction = performance.now(); }
["pointermove", "pointerdown", "touchstart", "keydown", "scroll", "wheel"].forEach((ev) =>
  window.addEventListener(ev, markInteraction, { passive: true })
);

function checkIdle() {
  if (reduced() || idleNode || !drifters.length) return;
  const now = performance.now();
  if (now - lastInteraction < IDLE_DELAY) return;
  const candidates = drifters.filter((d) => d !== idleFromNode);
  const pick = (candidates.length ? candidates : drifters)[Math.floor(Math.random() * (candidates.length || drifters.length))];
  idleNode = pick; idleFromNode = pick; idleStart = now;
  lastInteraction = now;
}

/* ============================================================
   Quiet, optional hover details — never announced, never in the
   way of a tap. Three models get one each; the rest get nothing.
   ============================================================ */
function triggerEasterEgg(d) {
  if (reduced()) return;
  if (d.tool.diagram === "radial7") mudaPulse(d.el);
  else if (d.tool.diagram === "curve") curveDot(d.el);
  else if (d.tool.diagram === "pyramid") pyramidStar(d.el);
}

function mudaPulse(nodeEl) {
  const nodes = nodeEl.querySelectorAll(".muda-thumb-node");
  nodes.forEach((c, i) => {
    setTimeout(() => {
      c.classList.remove("pulse");
      void c.getBoundingClientRect();
      c.classList.add("pulse");
    }, i * 55);
  });
}

function curveDot(nodeEl) {
  const path = nodeEl.querySelector(".curve-thumb-path");
  if (!path || path.dataset.busy) return;
  path.dataset.busy = "1";
  const len = path.getTotalLength();
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", "2.2");
  dot.setAttribute("fill", "var(--red)");
  dot.setAttribute("class", "curve-thumb-dot");
  path.parentNode.appendChild(dot);
  const dur = 700, start = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - start) / dur);
    const pt = path.getPointAtLength(p * len);
    dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
    dot.style.opacity = p > 0.75 ? String(Math.max(0, (1 - p) / 0.25)) : "1";
    if (p < 1) requestAnimationFrame(frame);
    else { dot.remove(); delete path.dataset.busy; }
  }
  requestAnimationFrame(frame);
}

function pyramidStar(nodeEl) {
  const group = nodeEl.querySelector(".tool-diagram > g");
  if (!group || group.querySelector(".pyramid-thumb-star")) return;
  const star = document.createElementNS(SVG_NS, "path");
  star.setAttribute("d", "M 80 4 L 82 9 L 87 11 L 82 13 L 80 18 L 78 13 L 73 11 L 78 9 Z");
  star.setAttribute("fill", "var(--red)");
  star.setAttribute("class", "pyramid-thumb-star");
  group.appendChild(star);
  requestAnimationFrame(() => star.classList.add("show"));
  setTimeout(() => star.classList.remove("show"), 500);
  setTimeout(() => star.remove(), 780);
}

function placeStatic() {
  for (const d of drifters) d.el.style.transform = "";
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
  lastInteraction = performance.now();
  buildNodes();
  startDrift();
  setInterval(checkIdle, 1000);

  // Stagger where in its 40s loop the satellite starts, so it isn't
  // always mid-pass in the first few seconds of every page load.
  const satellite = document.querySelector(".satellite");
  if (satellite) satellite.style.animationDelay = "-" + (Math.random() * 40).toFixed(1) + "s";
}
boot();

let resizeTimer = null;
let wasMobile = isMobile();
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (isMobile() !== wasMobile) {
      wasMobile = isMobile();
      idleNode = null;
      buildNodes();
      startDrift();
    }
  }, 150);
});
