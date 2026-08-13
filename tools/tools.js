/* ============================================================
   Helpers
   ============================================================ */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = () => window.innerWidth < 700;
const SVG_NS = "http://www.w3.org/2000/svg";

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

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

const LINE = { fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linejoin": "round", "stroke-linecap": "round" };

function polygonPoints(cx, cy, r, sides, rotate = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rotate + (i / sides) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
function pointsAttr(pts) {
  return pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
}

/* ============================================================
   Diagrams — thin line-art SVG, one per tool shape. Each exposes
   thumb() for the small drifting field version. `venn` additionally
   exposes buildStage()/assemble() for the unfold animation; the
   remaining nine are development scaffolding and only need thumb()
   until their own tool content and assemble() are written.
   ============================================================ */
const VB = "0 0 160 160";

const VENN = {
  viable:    { cx: 80, cy: 62, r: 44 },
  desirable: { cx: 60, cy: 98, r: 44 },
  feasible:  { cx: 100, cy: 98, r: 44 },
};

/* The stage version needs breathing room outside the circles for its
   labels, so it uses a wider viewBox than the thumbnail while keeping
   the same circle geometry — the labels are true SVG children of this
   box, positioned relative to their own circle, not page elements. */
const VENN_STAGE_VB = "-60 -20 280 180";
const VENN_LABELS = [
  { key: "viable", text: "Viable", x: 80, y: 4, anchor: "middle" },
  { key: "desirable", text: "Desirable", x: 10, y: 98, anchor: "end" },
  { key: "feasible", text: "Feasible", x: 150, y: 98, anchor: "start" },
];

function vennCirclesSvg(viewBox, pathLength) {
  const svg = svgEl("svg", { viewBox, draggable: "false" });
  for (const key of ["viable", "desirable", "feasible"]) {
    const c = VENN[key];
    const attrs = { cx: c.cx, cy: c.cy, r: c.r, ...LINE, class: "venn-circle venn-" + key };
    if (pathLength) attrs["pathLength"] = "1";
    svg.appendChild(svgEl("circle", attrs));
  }
  return svg;
}

const DIAGRAMS = {
  venn: {
    thumb() { return vennCirclesSvg(VB, false); },
    /* Builds the full interactive stage version: three drawable circles,
       the true triple-intersection fill via nested clipPaths, and the
       three labels as SVG text anchored to their own circle. */
    buildStage() {
      const svg = vennCirclesSvg(VENN_STAGE_VB, true);
      const defs = svgEl("defs", {});
      const clipA = svgEl("clipPath", { id: "vennClipA" });
      clipA.appendChild(svgEl("circle", { cx: VENN.viable.cx, cy: VENN.viable.cy, r: VENN.viable.r }));
      const clipB = svgEl("clipPath", { id: "vennClipB" });
      clipB.appendChild(svgEl("circle", { cx: VENN.desirable.cx, cy: VENN.desirable.cy, r: VENN.desirable.r }));
      defs.appendChild(clipA);
      defs.appendChild(clipB);
      const gA = svgEl("g", { "clip-path": "url(#vennClipA)" });
      const gB = svgEl("g", { "clip-path": "url(#vennClipB)" });
      const fill = svgEl("circle", {
        cx: VENN.feasible.cx, cy: VENN.feasible.cy, r: VENN.feasible.r,
        fill: "currentColor", class: "venn-fill", style: "color: var(--red); opacity: 0;",
      });
      gB.appendChild(fill);
      gA.appendChild(gB);
      svg.insertBefore(gA, svg.firstChild);
      svg.insertBefore(defs, svg.firstChild);
      svg.querySelectorAll(".venn-circle").forEach((c) => {
        c.style.strokeDasharray = "1";
        c.style.strokeDashoffset = "1";
      });
      for (const l of VENN_LABELS) {
        const t = svgEl("text", {
          class: "venn-label venn-label-" + l.key,
          x: l.x, y: l.y,
          "text-anchor": l.anchor,
        });
        t.textContent = l.text;
        svg.appendChild(t);
      }
      return svg;
    },
    assemble(diagramEl) {
      const order = ["viable", "desirable", "feasible"];
      const strokeDur = 200, stagger = 130;
      const circleEls = order.map((k) => diagramEl.querySelector(".venn-" + k));
      const labelEls = order.map((k) => diagramEl.querySelector(".venn-label-" + k));
      const fillEl = diagramEl.querySelector(".venn-fill");

      function applyFinal() {
        circleEls.forEach((c) => { c.style.transition = "none"; c.style.strokeDashoffset = "0"; });
        labelEls.forEach((l) => l.classList.add("show"));
        fillEl.style.transition = "none";
        fillEl.style.opacity = "0.28";
      }

      if (reduced()) {
        applyFinal();
        return { doneAt: 0, timers: [], applyFinal };
      }

      const timers = [];
      order.forEach((key, i) => {
        timers.push(setTimeout(() => {
          circleEls[i].style.transition = "stroke-dashoffset " + strokeDur + "ms ease";
          circleEls[i].style.strokeDashoffset = "0";
          labelEls[i].classList.add("show");
        }, i * stagger));
      });
      const afterStrokes = (order.length - 1) * stagger + strokeDur;
      timers.push(setTimeout(() => {
        fillEl.style.transition = "opacity 160ms ease";
        fillEl.style.opacity = "0.28";
      }, afterStrokes + 40));

      return { doneAt: afterStrokes + 40 + 160, timers, applyFinal };
    },
  },

  triangle: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("polygon", { points: pointsAttr(polygonPoints(80, 80, 58, 3)), ...LINE }));
      return svg;
    },
  },

  curve: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("line", { x1: 18, y1: 122, x2: 142, y2: 122, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("path", {
        d: "M 18 118 C 55 118, 60 30, 80 30 C 100 30, 105 118, 142 118",
        ...LINE,
      }));
      return svg;
    },
  },

  octagon: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("polygon", { points: pointsAttr(polygonPoints(80, 80, 56, 8, -Math.PI / 8)), ...LINE }));
      return svg;
    },
  },

  pyramid: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("polygon", { points: "80,24 138,132 22,132", ...LINE }));
      svg.appendChild(svgEl("line", { x1: 51, y1: 78, x2: 109, y2: 78, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: 36.5, y1: 105, x2: 123.5, y2: 105, ...LINE, "stroke-width": "1" }));
      return svg;
    },
  },

  grid9: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("rect", { x: 24, y: 24, width: 112, height: 112, ...LINE }));
      for (const p of [24 + 112 / 3, 24 + (112 / 3) * 2]) {
        svg.appendChild(svgEl("line", { x1: p, y1: 24, x2: p, y2: 136, ...LINE, "stroke-width": "1" }));
        svg.appendChild(svgEl("line", { x1: 24, y1: p, x2: 136, y2: p, ...LINE, "stroke-width": "1" }));
      }
      return svg;
    },
  },

  grid6: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("rect", { x: 22, y: 40, width: 116, height: 80, ...LINE }));
      for (const p of [22 + 116 / 3, 22 + (116 / 3) * 2]) {
        svg.appendChild(svgEl("line", { x1: p, y1: 40, x2: p, y2: 120, ...LINE, "stroke-width": "1" }));
      }
      svg.appendChild(svgEl("line", { x1: 22, y1: 80, x2: 138, y2: 80, ...LINE, "stroke-width": "1" }));
      return svg;
    },
  },

  layered: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("line", { x1: 26, y1: 26, x2: 26, y2: 134, ...LINE, "stroke-width": "1" }));
      const widths = [92, 68, 104, 50];
      widths.forEach((w, i) => {
        const y = 40 + i * 24;
        svg.appendChild(svgEl("line", { x1: 26, y1: y, x2: 26 + w, y2: y, ...LINE }));
      });
      return svg;
    },
  },

  matrix: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("rect", { x: 28, y: 28, width: 104, height: 104, ...LINE }));
      svg.appendChild(svgEl("line", { x1: 80, y1: 16, x2: 80, y2: 144, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: 16, y1: 80, x2: 144, y2: 80, ...LINE, "stroke-width": "1" }));
      return svg;
    },
  },

  radial7: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const pts = polygonPoints(80, 80, 54, 7);
      svg.appendChild(svgEl("polygon", { points: pointsAttr(pts), ...LINE, "stroke-width": "1" }));
      for (const p of pts) {
        svg.appendChild(svgEl("line", { x1: 80, y1: 80, x2: p[0], y2: p[1], ...LINE, "stroke-width": "1" }));
      }
      return svg;
    },
  },
};

/* ============================================================
   Tool data — content lives here, separate from rendering, so
   the remaining nine can be added without touching the logic
   below. Only `ready: true` tools are interactive. `shortName`
   is the single-line overview label; `name` is the full title
   used once a tool is expanded.
   ============================================================ */
const TOOLS = [
  {
    id: "design-thinking",
    diagram: "venn",
    ready: true,
    shortName: "Design Thinking",
    name: "Design Thinking: The Three Lenses",
    attribution: "IDEO / Tim Brown, Change by Design, 2009",
    whatItIs: "Desirable, viable, feasible. A solution has to sit where all three meet.",
    strongFor: "Stopping a team that has already fallen in love with one solution. Naming which lens is missing turns an argument about taste into a conversation about risk.",
    howIUse: "Early, as a question rather than a process. One lens is almost always doing all the talking, and it is usually feasibility.",
    watchOut: "Useless once the decision is already made. Then it becomes a slide that justifies rather than a lens that tests.",
    source: "https://designthinking.ideo.com/introduction",
  },
  { diagram: "triangle", ready: false, shortName: "Lean UX" },
  { diagram: "curve", ready: false, shortName: "Behavior Model" },
  { diagram: "octagon", ready: false, shortName: "Octalysis" },
  { diagram: "pyramid", ready: false, shortName: "11-Star Experience" },
  { diagram: "grid9", ready: false, shortName: "Business Model Canvas" },
  { diagram: "grid6", ready: false, shortName: "Empathy Map" },
  { diagram: "layered", ready: false, shortName: "Service Blueprint" },
  { diagram: "matrix", ready: false, shortName: "Value / Complexity" },
  { diagram: "radial7", ready: false, shortName: "Muda" },
];

/* ============================================================
   Field — pannable, larger than the viewport, gentle momentum.
   Kept close to the viewport size (roughly 1.5x) so most or all
   models are visible without panning on desktop, three or four
   at a time on mobile. A grid with light jitter replaces random
   placement so the field fills evenly instead of clumping.
   ============================================================ */
const viewport = $("viewport"), field = $("field");
let fieldSize = { w: 0, h: 0 };
let nodes = [];
let pos = { x: 0, y: 0 };
let vel = { x: 0, y: 0 };

function computeField() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const m = isMobile();
  fieldSize = {
    w: Math.round(vw * (m ? 1.3 : 1.5)),
    h: Math.round(vh * (m ? 1.9 : 1.5)),
  };
  field.style.width = fieldSize.w + "px";
  field.style.height = fieldSize.h + "px";
}

function layout() {
  const rnd = mulberry32(20260813);
  const m = isMobile();
  const cols = m ? 2 : 5;
  const rows = Math.ceil(TOOLS.length / cols);
  // Desktop: cluster the grid within roughly the viewport itself, centred
  // in the larger field, so most or all models are visible without panning.
  // Mobile: let it span the taller field — three or four visible at a time,
  // found with a short scroll, is the goal there, not everything at once.
  const areaW = m ? Math.min(fieldSize.w, window.innerWidth * 0.98) : Math.min(fieldSize.w, window.innerWidth * 0.94);
  const areaH = m ? Math.min(fieldSize.h, window.innerHeight * 1.6) : Math.min(fieldSize.h, window.innerHeight * 0.86);
  const offsetX = (fieldSize.w - areaW) / 2;
  const offsetY = (fieldSize.h - areaH) / 2 + (m ? 30 : 0);
  const cellW = areaW / cols;
  const cellH = areaH / rows;
  const jitterX = cellW * 0.14;
  const jitterY = cellH * 0.14;
  const pad = 60;
  const spots = [];
  for (let i = 0; i < TOOLS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = offsetX + cellW * (col + 0.5);
    const cy = offsetY + cellH * (row + 0.5);
    const x = clamp(cx + (rnd() * 2 - 1) * jitterX, pad, fieldSize.w - pad);
    const y = clamp(cy + (rnd() * 2 - 1) * jitterY, pad, fieldSize.h - pad);
    spots.push({ x, y });
  }
  return spots;
}

function fitLabelFontSize(text, maxWidthPx, maxPx, minPx) {
  const estWidth = text.length * 0.68 * maxPx;
  if (estWidth <= maxWidthPx) return maxPx;
  return Math.max(minPx, maxWidthPx / (text.length * 0.68));
}

function buildNodes() {
  field.querySelectorAll(".tool-node").forEach((n) => n.remove());
  const spots = layout();
  const m = isMobile();
  const labelMaxWidth = m ? 118 : 150;
  const labelMaxPx = m ? 9.9 : 10.56;
  const labelMinPx = m ? 7.5 : 8.5;
  nodes = TOOLS.map((tool, i) => {
    const isReady = !!tool.ready;
    const el = document.createElement(isReady ? "button" : "div");
    if (isReady) el.type = "button";
    el.className = "tool-node" + (isReady ? "" : " placeholder");
    el.style.left = spots[i].x + "px";
    el.style.top = spots[i].y + "px";
    el.style.setProperty("--drift-dur", (7 + (i % 5) * 1.1).toFixed(1) + "s");
    el.style.setProperty("--drift-delay", (-(i % 7) * 0.9).toFixed(1) + "s");
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
      el.addEventListener("click", () => { if (!suppressClick) openTool(tool, el); });
    }

    field.appendChild(el);
    return { tool, el, x: spots[i].x, y: spots[i].y, near: false };
  });
}

function bounds() {
  return {
    minX: Math.min(0, window.innerWidth - fieldSize.w),
    maxX: 0,
    minY: Math.min(0, window.innerHeight - fieldSize.h),
    maxY: 0,
  };
}

function applyPos() {
  const b = bounds();
  pos.x = clamp(pos.x, b.minX, b.maxX);
  pos.y = clamp(pos.y, b.minY, b.maxY);
  field.style.transform = "translate3d(" + pos.x + "px, " + pos.y + "px, 0)";
  markNear();
}

function markNear() {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const radius = isMobile() ? 160 : 220;
  for (const n of nodes) {
    const d = Math.hypot(pos.x + n.x - cx, pos.y + n.y - cy);
    const near = d < radius;
    if (near !== n.near) { n.el.classList.toggle("near", near); n.near = near; }
  }
}

/* Dragging only ever pans the field — a node has no pointer handlers
   of its own, and native image/SVG drag is switched off below so a
   press-and-pull on a model can't be mistaken for grabbing it. */
let dragging = false, suppressClick = false, pointerId = null;
let lastPt = { x: 0, y: 0, t: 0 }, startPt = { x: 0, y: 0 }, glideRaf = null;

field.addEventListener("dragstart", (e) => e.preventDefault());

viewport.addEventListener("pointerdown", (e) => {
  if (stageOpen) return;
  pointerId = e.pointerId;
  dragging = false;
  suppressClick = false;
  cancelAnimationFrame(glideRaf);
  vel = { x: 0, y: 0 };
  startPt = { x: e.clientX, y: e.clientY };
  lastPt = { x: e.clientX, y: e.clientY, t: performance.now() };
});

viewport.addEventListener("pointermove", (e) => {
  if (pointerId !== e.pointerId) return;
  const dx = e.clientX - lastPt.x, dy = e.clientY - lastPt.y;
  if (!dragging && Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) > 7) {
    dragging = true;
    viewport.classList.add("dragging");
    viewport.setPointerCapture?.(e.pointerId);
  }
  if (!dragging) return;
  const now = performance.now();
  const dt = Math.max(1, now - lastPt.t);
  vel = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
  pos.x += dx; pos.y += dy;
  lastPt = { x: e.clientX, y: e.clientY, t: now };
  applyPos();
});

function endDrag(e) {
  if (pointerId !== e.pointerId) return;
  pointerId = null;
  if (dragging) {
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 60);
    viewport.classList.remove("dragging");
    glide();
  }
  dragging = false;
}
viewport.addEventListener("pointerup", endDrag);
viewport.addEventListener("pointercancel", endDrag);

function glide() {
  const step = () => {
    vel.x *= 0.94; vel.y *= 0.94;
    if (Math.abs(vel.x) < 0.12 && Math.abs(vel.y) < 0.12) return;
    const b = bounds();
    const nx = clamp(pos.x + vel.x, b.minX, b.maxX);
    const ny = clamp(pos.y + vel.y, b.minY, b.maxY);
    if (nx === pos.x) vel.x = 0;
    if (ny === pos.y) vel.y = 0;
    pos.x = nx; pos.y = ny;
    applyPos();
    glideRaf = requestAnimationFrame(step);
  };
  glideRaf = requestAnimationFrame(step);
}

viewport.addEventListener("wheel", (e) => {
  if (stageOpen) return;
  e.preventDefault();
  cancelAnimationFrame(glideRaf);
  pos.x -= e.deltaX; pos.y -= e.deltaY;
  applyPos();
}, { passive: false });

function centreOn(x, y, animate = true) {
  const b = bounds();
  const tx = clamp(window.innerWidth / 2 - x, b.minX, b.maxX);
  const ty = clamp(window.innerHeight / 2 - y, b.minY, b.maxY);
  cancelAnimationFrame(glideRaf);
  if (!animate || reduced()) { pos.x = tx; pos.y = ty; applyPos(); return; }
  const from = { ...pos }, t0 = performance.now(), dur = 520;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    pos.x = from.x + (tx - from.x) * e;
    pos.y = from.y + (ty - from.y) * e;
    applyPos();
    if (p < 1) glideRaf = requestAnimationFrame(step);
  };
  glideRaf = requestAnimationFrame(step);
}

/* ============================================================
   Assembly stage — a selected model animates from the field into
   the centre and draws itself. Runs as a fresh overlay render
   rather than reparenting the field's own node, so the "move to
   centre and scale up" step is a single transform-from-origin
   animation (FLIP-style) instead of a DOM move.
   ============================================================ */
const stage = $("stage"), stageScrim = $("stageScrim"), stageClose = $("stageClose");
const stageDiagramWrap = document.querySelector(".stage-diagram-wrap");
const stageDiagramHost = $("stageDiagram");
const toolContent = $("toolContent");

let stageOpen = false;
let activeAnim = null;
let lastTrigger = null;

function renderToolContent(tool) {
  toolContent.innerHTML = "";
  const title = document.createElement("h2");
  title.className = "tool-title";
  title.textContent = tool.name;
  toolContent.appendChild(title);

  const attribution = document.createElement("p");
  attribution.className = "tool-attribution";
  attribution.textContent = tool.attribution;
  toolContent.appendChild(attribution);

  const sections = [
    ["What it is", tool.whatItIs],
    ["Strong for", tool.strongFor],
    ["How I use it", tool.howIUse],
    ["Watch out", tool.watchOut],
  ];
  for (const [label, text] of sections) {
    const sec = document.createElement("div");
    sec.className = "tool-section";
    const h3 = document.createElement("h3");
    h3.textContent = label;
    const p = document.createElement("p");
    p.textContent = text;
    sec.appendChild(h3);
    sec.appendChild(p);
    toolContent.appendChild(sec);
  }

  const source = document.createElement("p");
  source.className = "tool-source";
  const a = document.createElement("a");
  a.href = tool.source;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = tool.source;
  source.append("Source: ");
  source.appendChild(a);
  toolContent.appendChild(source);
}

function openTool(tool, triggerEl) {
  if (stageOpen) return;
  const diagramDef = DIAGRAMS[tool.diagram];
  if (!diagramDef.buildStage) return;

  stageOpen = true;
  lastTrigger = triggerEl;
  cancelAnimationFrame(glideRaf);
  document.body.classList.add("stage-open");

  const triggerRect = triggerEl.querySelector(".tool-diagram").getBoundingClientRect();

  stageDiagramHost.innerHTML = "";
  const stageSvg = diagramDef.buildStage();
  stageSvg.setAttribute("class", "stage-diagram");
  stageDiagramHost.appendChild(stageSvg);

  toolContent.classList.remove("show");
  renderToolContent(tool);

  stage.classList.add("show");
  stage.setAttribute("aria-hidden", "false");
  stage.inert = false;

  // FLIP: start the diagram at the trigger's screen position/size, then
  // animate to identity so it reads as "moves to the centre and scales up".
  requestAnimationFrame(() => {
    const targetRect = stageDiagramWrap.getBoundingClientRect();
    const dx = (triggerRect.left + triggerRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const dy = (triggerRect.top + triggerRect.height / 2) - (targetRect.top + targetRect.height / 2);
    const scale = Math.max(0.12, triggerRect.width / targetRect.width);
    const isReduced = reduced();

    stageDiagramWrap.style.transition = "none";
    stageDiagramWrap.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
    stageDiagramWrap.style.opacity = isReduced ? "1" : "0.4";

    requestAnimationFrame(() => {
      stageDiagramWrap.style.transition = isReduced ? "none" : "transform 320ms cubic-bezier(0.16,0.9,0.3,1), opacity 220ms ease";
      stageDiagramWrap.style.transform = "translate(0,0) scale(1)";
      stageDiagramWrap.style.opacity = "1";

      const anim = diagramDef.assemble(stageSvg);
      activeAnim = anim;
      const textTimer = setTimeout(() => {
        toolContent.classList.add("show");
      }, anim.doneAt + 20);
      anim.timers.push(textTimer);
    });
  });

  stageClose.focus();
  document.addEventListener("keydown", onStageKeydown);
}

function skipAssembly() {
  if (!activeAnim) return;
  activeAnim.timers.forEach(clearTimeout);
  activeAnim.applyFinal();
  toolContent.classList.add("show");
  stageDiagramWrap.style.transition = "none";
  stageDiagramWrap.style.transform = "translate(0,0) scale(1)";
  stageDiagramWrap.style.opacity = "1";
  activeAnim = null;
}

function closeTool() {
  if (!stageOpen) return;
  stageOpen = false;
  stage.classList.remove("show");
  stage.setAttribute("aria-hidden", "true");
  stage.inert = true;
  document.body.classList.remove("stage-open");
  if (activeAnim) { activeAnim.timers.forEach(clearTimeout); activeAnim = null; }
  document.removeEventListener("keydown", onStageKeydown);
  if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
}

function onStageKeydown(e) {
  if (e.key === "Escape") closeTool();
}

stageClose.addEventListener("click", closeTool);
stageScrim.addEventListener("click", closeTool);
stageDiagramWrap.addEventListener("click", () => {
  if (activeAnim) skipAssembly();
});

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  computeField();
  buildNodes();
  centreOn(fieldSize.w / 2, fieldSize.h / 2, false);
}
boot();

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    computeField();
    buildNodes();
    applyPos();
  }, 150);
});
