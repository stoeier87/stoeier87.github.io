/* ============================================================
   Shared model + content data for /tools and its five subpages.
   Nothing here is page-specific: the overview imports this for
   thumbnails and links, each tool subpage imports it to build its
   own diagram, run its assembly animation, and render its content.
   ============================================================ */
export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const isMobile = () => window.innerWidth < 700;
const SVG_NS = "http://www.w3.org/2000/svg";

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

export const LINE = { fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linejoin": "round", "stroke-linecap": "round" };

export function polygonPoints(cx, cy, r, sides, rotate = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rotate + (i / sides) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
export function pointsAttr(pts) {
  return pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
}

export function svgText(x, y, anchor, text, cls) {
  const t = svgEl("text", { x, y, "text-anchor": anchor, class: cls });
  t.textContent = text;
  return t;
}

/* A small chevron, pointing along +x by default, rotated to face the
   given direction. Used for directional and axis-end arrowheads. */
export function arrowHead(x, y, angleDeg, cls) {
  const g = svgEl("g", { transform: "translate(" + x + "," + y + ") rotate(" + angleDeg + ")", class: cls });
  g.appendChild(svgEl("path", {
    d: "M -5,-4 L 4,0 L -5,4",
    fill: "none", stroke: "currentColor", "stroke-width": "1.3",
    "stroke-linejoin": "round", "stroke-linecap": "round",
  }));
  return g;
}

/* ============================================================
   Diagrams — thin line-art SVG, one per tool shape. Each exposes
   thumb() for the small drifting field version. Five expose
   buildStage()/assemble() for the unfold animation; the remaining
   five are development scaffolding and only need thumb() until
   their own tool content and assemble() are written.
   ============================================================ */
export const VB = "0 0 160 160";

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

/* ── Tool 2: Lean UX (triangle) ──────────────────────────────
   Apex at top; vertices computed the same way as the thumbnail
   polygon so the stage version reads as the same shape, just with
   room around it for labels. Arrows sit on the sides themselves, at
   each side's midpoint, well clear of the centre text below them. */
const TRI = { apex: { x: 80, y: 22 }, br: { x: 130.2, y: 109 }, bl: { x: 29.8, y: 109 } };
const TRI_STAGE_VB = "-15 -20 190 165";
const TRI_LABELS = [
  { key: "observe", number: "01", word: "Observe", numX: 80, numY: -1, wordX: 80, wordY: 12, anchor: "middle" },
  { key: "build", number: "02", word: "Build", numX: 130.2, numY: 123, wordX: 130.2, wordY: 136, anchor: "middle" },
  { key: "improve", number: "03", word: "Improve", numX: 29.8, numY: 123, wordX: 29.8, wordY: 136, anchor: "middle" },
];
// Arrow midpoints pulled a little further out along each side (away from
// the centroid) than the true geometric midpoint, so they read as sitting
// on the side itself without crowding the centre text.
const TRI_ARROWS = [
  { x: 111.8, y: 51.9, angle: 60 },   // right side, apex -> bottom-right
  { x: 80, y: 109, angle: 180 },      // bottom side, right -> left
  { x: 48.2, y: 51.9, angle: -60 },   // left side, bottom-left -> apex
];

/* ── Tool 3: Behavior Model (B=MAP curve) ────────────────────── */
const CURVE_STAGE_VB = "-15 -8 215 178";
// A longer, gentler sweep: steep near the vertical axis, easing into a
// true flat asymptote that runs most of the chart's width before ending
// just shy of the horizontal axis.
const CURVE_PATH_D = "M 36 24 C 40 60, 70 118, 148 130";
const CURVE_PROMPT = { cx: 148, cy: 68 };

/* ── Tool 4: Octalysis (octagon) ──────────────────────────────
   Flat-top regular octagon, same rotation as the thumbnail. Edges
   are drawn clockwise starting at the top edge; OCT_EDGE_ORDER maps
   that animation sequence onto the underlying vertex-pair indices.
   Rebuilt with a smaller radius and generous label clearance so the
   two axes can sit fully outside the label ring on every side. */
const OCT = { cx: 80, cy: 80, r: 50, rotate: -Math.PI / 8 };
function octVertices() { return polygonPoints(OCT.cx, OCT.cy, OCT.r, 8, OCT.rotate); }
const OCT_EDGE_ORDER = [6, 7, 0, 1, 2, 3, 4, 5];
const OCT_LABEL_TEXT = [
  ["Epic Meaning", "and Calling"],
  ["Empowerment of", "Creativity and Feedback"],
  ["Social Influence", "and Relatedness"],
  ["Unpredictability", "and Curiosity"],
  ["Loss and Avoidance"],
  ["Scarcity and", "Impatience"],
  ["Ownership and", "Possession"],
  ["Development and", "Accomplishment"],
];
// Anchor geometry per ORIGINAL edge index (0-7): point closest to the
// shape, text-anchor, and which way extra lines grow away from it.
const OCT_LABEL_GEOM = {
  0: { x: 141, y: 80, anchor: "start", grow: "mid" },
  1: { x: 123, y: 123, anchor: "start", grow: "down" },
  2: { x: 80, y: 141, anchor: "middle", grow: "down" },
  3: { x: 37, y: 123, anchor: "end", grow: "down" },
  4: { x: 19, y: 80, anchor: "end", grow: "mid" },
  5: { x: 37, y: 37, anchor: "end", grow: "up" },
  6: { x: 80, y: 19, anchor: "middle", grow: "up" },
  7: { x: 123, y: 37, anchor: "start", grow: "up" },
};
// Edges below the shape's horizontal centre line (original vertex-pair
// indices): lower-right diagonal, bottom, lower-left diagonal, left.
// The right edge sits with the upper half — this is what reproduces
// the real Octalysis white-hat/black-hat split, not a literal 4/4
// bisection by clockwise list position.
const OCT_LOWER_EDGES = new Set([1, 2, 3, 4]);
// The vertical axis sits well left of the leftmost label's full extent
// (the widest lower-left labels run to roughly x=-43 at this font size),
// and the horizontal axis sits well below the bottom label. Nothing in
// the label ring crosses either axis.
const OCT_STAGE_VB = "-100 -12 340 215";
const OCT_LINE_H = 8.5;

/* ── Tool 5: The 11-Star Experience (pyramid, 4 bands) ───────── */
const PYR = { apex: { x: 80, y: 24 }, br: { x: 138, y: 132 }, bl: { x: 22, y: 132 } };
function pyrXAtY(y) {
  const t = (y - PYR.apex.y) / (PYR.br.y - PYR.apex.y);
  return { left: PYR.apex.x - t * (PYR.apex.x - PYR.bl.x), right: PYR.apex.x + t * (PYR.br.x - PYR.apex.x) };
}
const PYR_DIVIDERS_Y = [105, 78, 51];
const PYR_STAGE_VB = "-10 8 250 145";
const PYR_TICKS = [
  { y: 118.5, label: "5 stars", accent: false },
  { y: 91.5, label: "7 stars", accent: false },
  { y: 64.5, label: "9 stars", accent: false },
  { y: 37.5, label: "11 stars", accent: true },
];

export const DIAGRAMS = {
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
    buildStage() {
      const svg = svgEl("svg", { viewBox: TRI_STAGE_VB, draggable: "false" });
      const sideAttrs = { ...LINE, pathLength: "1" };
      const right = svgEl("path", { d: "M " + TRI.apex.x + " " + TRI.apex.y + " L " + TRI.br.x + " " + TRI.br.y, ...sideAttrs, class: "tri-side tri-right" });
      const bottom = svgEl("path", { d: "M " + TRI.br.x + " " + TRI.br.y + " L " + TRI.bl.x + " " + TRI.bl.y, ...sideAttrs, class: "tri-side tri-bottom" });
      const left = svgEl("path", { d: "M " + TRI.bl.x + " " + TRI.bl.y + " L " + TRI.apex.x + " " + TRI.apex.y, ...sideAttrs, class: "tri-side tri-left" });
      [right, bottom, left].forEach((s) => { s.style.strokeDasharray = "1"; s.style.strokeDashoffset = "1"; });
      svg.appendChild(right); svg.appendChild(bottom); svg.appendChild(left);

      const arrows = svgEl("g", { class: "tri-arrows" });
      arrows.style.opacity = "0";
      for (const a of TRI_ARROWS) arrows.appendChild(arrowHead(a.x, a.y, a.angle, "tri-arrow"));
      svg.appendChild(arrows);

      for (const l of TRI_LABELS) {
        svg.appendChild(svgText(l.numX, l.numY, l.anchor, l.number, "tool-label-num tri-label-" + l.key));
        svg.appendChild(svgText(l.wordX, l.wordY, l.anchor, l.word, "tool-label tri-label-" + l.key));
      }

      const centre = svgEl("g", { class: "tri-centre" });
      centre.style.opacity = "0";
      centre.appendChild(svgText(80, 76, "middle", "Prototype", "tri-centre-line"));
      centre.appendChild(svgText(80, 90, "middle", "+ Validate", "tri-centre-line"));
      svg.appendChild(centre);

      return svg;
    },
    assemble(diagramEl) {
      const strokeDur = 180, stagger = 120;
      const sides = ["right", "bottom", "left"];
      const sideEls = sides.map((k) => diagramEl.querySelector(".tri-" + k));
      const labelKeys = ["build", "improve", "observe"];
      const arrows = diagramEl.querySelector(".tri-arrows");
      const centre = diagramEl.querySelector(".tri-centre");
      const labelEls = (key) => diagramEl.querySelectorAll(".tri-label-" + key);

      function applyFinal() {
        sideEls.forEach((s) => { s.style.transition = "none"; s.style.strokeDashoffset = "0"; });
        labelKeys.forEach((k) => labelEls(k).forEach((el) => el.classList.add("show")));
        arrows.style.transition = "none"; arrows.style.opacity = "1";
        centre.style.transition = "none"; centre.style.opacity = "1";
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      sides.forEach((_, i) => {
        timers.push(setTimeout(() => {
          sideEls[i].style.transition = "stroke-dashoffset " + strokeDur + "ms ease";
          sideEls[i].style.strokeDashoffset = "0";
        }, i * stagger));
        timers.push(setTimeout(() => {
          labelEls(labelKeys[i]).forEach((el) => el.classList.add("show"));
        }, i * stagger + strokeDur));
      });

      const afterSides = (sides.length - 1) * stagger + strokeDur;
      const arrowDur = 130;
      timers.push(setTimeout(() => {
        arrows.style.transition = "opacity " + arrowDur + "ms ease";
        arrows.style.opacity = "1";
      }, afterSides + 30));
      const afterArrows = afterSides + 30 + arrowDur;
      const centreDur = 130;
      timers.push(setTimeout(() => {
        centre.style.transition = "opacity " + centreDur + "ms ease";
        centre.style.opacity = "1";
      }, afterArrows + 30));

      return { doneAt: afterArrows + 30 + centreDur, timers, applyFinal };
    },
  },

  curve: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("line", { x1: 22, y1: 132, x2: 22, y2: 22, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: 22, y1: 132, x2: 140, y2: 132, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("path", {
        d: "M 27 28 C 30 62, 55 112, 136 122",
        ...LINE,
      }));
      return svg;
    },
    buildStage() {
      const svg = svgEl("svg", { viewBox: CURVE_STAGE_VB, draggable: "false" });

      // Vertical axis: one arrowhead, at the top only.
      const vAxis = svgEl("path", { d: "M 30 140 L 30 20", ...LINE, "stroke-width": "1", class: "curve-axis-v", pathLength: "1" });
      // Horizontal axis: one arrowhead, at the right only.
      const hAxis = svgEl("path", { d: "M 30 135 L 152 135", ...LINE, "stroke-width": "1", class: "curve-axis-h", pathLength: "1" });
      [vAxis, hAxis].forEach((a) => { a.style.strokeDasharray = "1"; a.style.strokeDashoffset = "1"; });
      svg.appendChild(vAxis);
      svg.appendChild(hAxis);

      const vGroup = svgEl("g", { class: "curve-vgroup" });
      vGroup.style.opacity = "0";
      vGroup.appendChild(arrowHead(30, 17, -90, "curve-arrow"));
      const motivationLabel = svgText(10, 79, "middle", "Motivation", "tool-label neutral show");
      motivationLabel.setAttribute("transform", "rotate(-90 10 79)");
      vGroup.appendChild(motivationLabel);
      svg.appendChild(vGroup);

      const hGroup = svgEl("g", { class: "curve-hgroup" });
      hGroup.style.opacity = "0";
      hGroup.appendChild(arrowHead(155, 135, 0, "curve-arrow"));
      hGroup.appendChild(svgText(132, 150, "start", "Ability", "tool-label neutral show"));
      svg.appendChild(hGroup);

      const curveLine = svgEl("path", {
        d: CURVE_PATH_D, fill: "none", stroke: "currentColor", "stroke-width": "1.5",
        "stroke-linecap": "round", class: "curve-line", pathLength: "1", style: "color: var(--red);",
      });
      curveLine.style.strokeDasharray = "1";
      curveLine.style.strokeDashoffset = "1";
      svg.appendChild(curveLine);
      svg.appendChild(svgText(150, 122, "start", "Action Line", "tool-label curve-label-action"));

      // Zone labels sit well inside the chart, clear of the vertical axis.
      const zoneA = svgText(100, 36, "middle", "Behaviour happens", "tool-label neutral curve-zone-a");
      zoneA.style.fontSize = "7px";
      svg.appendChild(zoneA);
      const zoneB = svgText(95, 125, "middle", "Behaviour does not happen", "tool-label neutral curve-zone-b");
      zoneB.style.fontSize = "5.8px";
      svg.appendChild(zoneB);

      // Prompt circles sit apart from the curve, upper right, clear of it.
      const promptOuter = svgEl("g", { transform: "translate(" + CURVE_PROMPT.cx + "," + CURVE_PROMPT.cy + ")" });
      const promptInner = svgEl("g", { class: "curve-prompt-circles" });
      promptInner.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 13, ...LINE, "stroke-width": "1" }));
      promptInner.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 8, ...LINE, "stroke-width": "1" }));
      promptInner.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 3.5, fill: "currentColor", style: "color: var(--red); opacity: 0.32;" }));
      promptOuter.appendChild(promptInner);
      svg.appendChild(promptOuter);
      svg.appendChild(svgText(CURVE_PROMPT.cx, CURVE_PROMPT.cy - 19, "middle", "Prompt", "tool-label curve-label-prompt"));

      return svg;
    },
    assemble(diagramEl) {
      const vAxis = diagramEl.querySelector(".curve-axis-v");
      const hAxis = diagramEl.querySelector(".curve-axis-h");
      const vGroup = diagramEl.querySelector(".curve-vgroup");
      const hGroup = diagramEl.querySelector(".curve-hgroup");
      const curveLine = diagramEl.querySelector(".curve-line");
      const actionLabel = diagramEl.querySelector(".curve-label-action");
      const zoneA = diagramEl.querySelector(".curve-zone-a");
      const zoneB = diagramEl.querySelector(".curve-zone-b");
      const promptCircles = diagramEl.querySelector(".curve-prompt-circles");
      const promptLabel = diagramEl.querySelector(".curve-label-prompt");

      function applyFinal() {
        [vAxis, hAxis, curveLine].forEach((el) => { el.style.transition = "none"; el.style.strokeDashoffset = "0"; });
        [vGroup, hGroup].forEach((g) => { g.style.transition = "none"; g.style.opacity = "1"; });
        [actionLabel, promptLabel, zoneA, zoneB].forEach((el) => el.classList.add("show"));
        promptCircles.style.transition = "none"; promptCircles.style.animation = "none";
        promptCircles.style.transform = "scale(1)"; promptCircles.style.opacity = "1";
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const vDur = 110;
      timers.push(setTimeout(() => {
        vAxis.style.transition = "stroke-dashoffset " + vDur + "ms ease";
        vAxis.style.strokeDashoffset = "0";
        vGroup.style.transition = "opacity 180ms ease";
        vGroup.style.opacity = "1";
      }, 0));

      const hStart = 70, hDur = 110, hEnd = hStart + hDur;
      timers.push(setTimeout(() => {
        hAxis.style.transition = "stroke-dashoffset " + hDur + "ms ease";
        hAxis.style.strokeDashoffset = "0";
        hGroup.style.transition = "opacity 180ms ease";
        hGroup.style.opacity = "1";
      }, hStart));

      const curveStart = hEnd, curveDur = 230, curveEnd = curveStart + curveDur;
      timers.push(setTimeout(() => {
        curveLine.style.transition = "stroke-dashoffset " + curveDur + "ms ease";
        curveLine.style.strokeDashoffset = "0";
      }, curveStart));
      timers.push(setTimeout(() => actionLabel.classList.add("show"), curveEnd + 15));

      const zoneStart = curveEnd + 15 + 45;
      timers.push(setTimeout(() => {
        zoneA.classList.add("show");
        zoneB.classList.add("show");
      }, zoneStart));

      const pulseStart = zoneStart + 85, pulseDur = 160, pulseEnd = pulseStart + pulseDur;
      timers.push(setTimeout(() => {
        promptCircles.style.animation = "pulseIn " + pulseDur + "ms cubic-bezier(0.2,0.8,0.3,1) forwards";
      }, pulseStart));
      timers.push(setTimeout(() => promptLabel.classList.add("show"), pulseEnd));

      return { doneAt: pulseEnd, timers, applyFinal };
    },
  },

  octagon: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("polygon", {
        points: pointsAttr(polygonPoints(80, 80, 56, 8, -Math.PI / 8)),
        ...LINE,
      }));
      return svg;
    },
    buildStage() {
      const svg = svgEl("svg", { viewBox: OCT_STAGE_VB, draggable: "false" });
      const verts = octVertices();

      OCT_EDGE_ORDER.forEach((edgeIdx, seq) => {
        const a = verts[edgeIdx], b = verts[(edgeIdx + 1) % 8];
        const path = svgEl("path", {
          d: "M " + a[0].toFixed(1) + " " + a[1].toFixed(1) + " L " + b[0].toFixed(1) + " " + b[1].toFixed(1),
          ...LINE, class: "oct-edge oct-edge-" + seq, pathLength: "1", style: "color: var(--red);",
        });
        path.style.strokeDasharray = "1";
        path.style.strokeDashoffset = "1";
        svg.appendChild(path);

        const geom = OCT_LABEL_GEOM[edgeIdx];
        const lines = OCT_LABEL_TEXT[seq];
        // Dim by actual geometric position (edges below the shape's
        // horizontal centre), not by position in the clockwise list —
        // the two are different splits, and only the geometric one
        // reads as "upper half vs lower half" on screen. Labels are
        // always the neutral text colour; only the outline is accent.
        const dimCls = OCT_LOWER_EDGES.has(edgeIdx) ? " dim" : "";
        lines.forEach((line, li) => {
          let y;
          if (geom.grow === "up") y = geom.y - (lines.length - 1 - li) * OCT_LINE_H;
          else if (geom.grow === "down") y = geom.y + li * OCT_LINE_H;
          else y = geom.y - ((lines.length - 1) / 2) * OCT_LINE_H + li * OCT_LINE_H;
          svg.appendChild(svgText(geom.x, y, geom.anchor, line, "tool-label neutral oct-label oct-label-" + seq + dimCls));
        });
      });

      // Both axes sit fully outside the label ring computed above.
      const vAxis = svgEl("path", { d: "M -80 145 L -80 15", ...LINE, "stroke-width": "1", class: "oct-vaxis", pathLength: "1" });
      const hAxis = svgEl("path", { d: "M 20 170 L 200 170", ...LINE, "stroke-width": "1", class: "oct-haxis", pathLength: "1" });
      [vAxis, hAxis].forEach((a) => { a.style.strokeDasharray = "1"; a.style.strokeDashoffset = "1"; });
      svg.appendChild(vAxis);
      svg.appendChild(hAxis);

      const vGroup = svgEl("g", { class: "oct-vaxis-group" });
      vGroup.style.opacity = "0";
      vGroup.appendChild(arrowHead(-80, 12, -90, "oct-arrow"));
      vGroup.appendChild(arrowHead(-80, 148, 90, "oct-arrow"));
      vGroup.appendChild(svgText(-80, 4, "middle", "Appeal", "tool-label neutral show"));
      vGroup.appendChild(svgText(-80, 165, "middle", "Pressure", "tool-label neutral show"));
      svg.appendChild(vGroup);

      const hGroup = svgEl("g", { class: "oct-haxis-group" });
      hGroup.style.opacity = "0";
      hGroup.appendChild(arrowHead(17, 170, 180, "oct-arrow"));
      hGroup.appendChild(arrowHead(203, 170, 0, "oct-arrow"));
      hGroup.appendChild(svgText(13, 185, "end", "Extrinsic", "tool-label neutral show"));
      hGroup.appendChild(svgText(207, 185, "start", "Intrinsic", "tool-label neutral show"));
      svg.appendChild(hGroup);

      return svg;
    },
    assemble(diagramEl) {
      const strokeDur = 100, stagger = 60;
      const edgeEls = Array.from({ length: 8 }, (_, i) => diagramEl.querySelector(".oct-edge-" + i));
      const vAxis = diagramEl.querySelector(".oct-vaxis");
      const hAxis = diagramEl.querySelector(".oct-haxis");
      const vGroup = diagramEl.querySelector(".oct-vaxis-group");
      const hGroup = diagramEl.querySelector(".oct-haxis-group");
      const labelsFor = (i) => diagramEl.querySelectorAll(".oct-label-" + i);

      function applyFinal() {
        edgeEls.forEach((e) => { e.style.transition = "none"; e.style.strokeDashoffset = "0"; });
        for (let i = 0; i < 8; i++) labelsFor(i).forEach((l) => l.classList.add("show"));
        [vAxis, hAxis].forEach((a) => { a.style.transition = "none"; a.style.strokeDashoffset = "0"; });
        [vGroup, hGroup].forEach((g) => { g.style.transition = "none"; g.style.opacity = "1"; });
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      for (let i = 0; i < 8; i++) {
        timers.push(setTimeout(() => {
          edgeEls[i].style.transition = "stroke-dashoffset " + strokeDur + "ms ease";
          edgeEls[i].style.strokeDashoffset = "0";
        }, i * stagger));
        timers.push(setTimeout(() => {
          labelsFor(i).forEach((l) => l.classList.add("show"));
        }, i * stagger + strokeDur));
      }

      const afterEdges = 7 * stagger + strokeDur;
      const vStart = afterEdges + 20, vDur = 110, vEnd = vStart + vDur;
      timers.push(setTimeout(() => {
        vAxis.style.transition = "stroke-dashoffset " + vDur + "ms ease";
        vAxis.style.strokeDashoffset = "0";
        vGroup.style.transition = "opacity " + vDur + "ms ease";
        vGroup.style.opacity = "1";
      }, vStart));

      const hStart = vEnd - 15, hDur = 110, hEnd = hStart + hDur;
      timers.push(setTimeout(() => {
        hAxis.style.transition = "stroke-dashoffset " + hDur + "ms ease";
        hAxis.style.strokeDashoffset = "0";
        hGroup.style.transition = "opacity " + hDur + "ms ease";
        hGroup.style.opacity = "1";
      }, hStart));

      return { doneAt: hEnd, timers, applyFinal };
    },
    // On mobile the diagram wrap sits inside the page's own side padding
    // (2 x 1.25rem), so its width must be measured against the viewport
    // minus that padding, not raw vw, or it overflows the page.
    stageWidth(mobile) { return mobile ? "min(380px, calc(100vw - 3rem))" : "min(560px, 90vw)"; },
  },

  pyramid: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("polygon", { points: "80,24 138,132 22,132", ...LINE }));
      for (const y of PYR_DIVIDERS_Y) {
        const b = pyrXAtY(y);
        svg.appendChild(svgEl("line", { x1: b.left.toFixed(1), y1: y, x2: b.right.toFixed(1), y2: y, ...LINE, "stroke-width": "1" }));
      }
      return svg;
    },
    buildStage() {
      const svg = svgEl("svg", { viewBox: PYR_STAGE_VB, draggable: "false" });

      const outline = svgEl("path", {
        d: "M " + PYR.bl.x + " " + PYR.bl.y + " L " + PYR.br.x + " " + PYR.br.y + " L " + PYR.apex.x + " " + PYR.apex.y + " Z",
        ...LINE, class: "pyr-outline", pathLength: "1",
      });
      outline.style.strokeDasharray = "1";
      outline.style.strokeDashoffset = "1";
      svg.appendChild(outline);

      const topFillEdge = pyrXAtY(51);
      const fillTop = svgEl("path", {
        d: "M " + PYR.apex.x + " " + PYR.apex.y + " L " + topFillEdge.right.toFixed(1) + " 51 L " + topFillEdge.left.toFixed(1) + " 51 Z",
        fill: "currentColor", class: "pyr-fill", style: "color: var(--red); opacity: 0;",
      });
      svg.appendChild(fillTop);

      PYR_DIVIDERS_Y.forEach((y, i) => {
        const b = pyrXAtY(y);
        const line = svgEl("line", {
          x1: b.left.toFixed(1), y1: y, x2: b.right.toFixed(1), y2: y,
          ...LINE, "stroke-width": "1", class: "pyr-divider pyr-divider-" + i, pathLength: "1",
        });
        line.style.strokeDasharray = "1";
        line.style.strokeDashoffset = "1";
        svg.appendChild(line);
      });

      PYR_TICKS.forEach((t, i) => {
        const g = svgEl("g", { class: "pyr-tick pyr-tick-" + i });
        g.appendChild(svgEl("line", { x1: 146, y1: t.y, x2: 156, y2: t.y, ...LINE, "stroke-width": "1" }));
        g.appendChild(svgText(163, t.y + 3, "start", t.label, "tool-label" + (t.accent ? "" : " neutral") + " show"));
        g.style.opacity = "0";
        g.style.transition = "opacity 0.3s ease";
        svg.appendChild(g);
      });

      return svg;
    },
    assemble(diagramEl) {
      const outline = diagramEl.querySelector(".pyr-outline");
      const fillTop = diagramEl.querySelector(".pyr-fill");
      const dividers = [0, 1, 2].map((i) => diagramEl.querySelector(".pyr-divider-" + i));
      const ticks = [0, 1, 2, 3].map((i) => diagramEl.querySelector(".pyr-tick-" + i));

      function applyFinal() {
        outline.style.transition = "none"; outline.style.strokeDashoffset = "0";
        dividers.forEach((d) => { d.style.transition = "none"; d.style.strokeDashoffset = "0"; });
        ticks.forEach((t) => { t.style.transition = "none"; t.style.opacity = "1"; });
        fillTop.style.transition = "none"; fillTop.style.opacity = "0";
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const outlineDur = 220;
      timers.push(setTimeout(() => {
        outline.style.transition = "stroke-dashoffset " + outlineDur + "ms ease";
        outline.style.strokeDashoffset = "0";
      }, 0));

      const divStagger = 60, divDur = 100;
      dividers.forEach((d, i) => {
        const start = outlineDur + i * divStagger;
        timers.push(setTimeout(() => {
          d.style.transition = "stroke-dashoffset " + divDur + "ms ease";
          d.style.strokeDashoffset = "0";
        }, start));
      });
      const afterDividers = outlineDur + (dividers.length - 1) * divStagger + divDur;

      const tickStagger = 55;
      ticks.forEach((t, i) => {
        timers.push(setTimeout(() => { t.style.opacity = "1"; }, afterDividers + i * tickStagger));
      });
      const lastTickStart = afterDividers + (ticks.length - 1) * tickStagger;

      timers.push(setTimeout(() => {
        fillTop.style.transition = "opacity 110ms ease";
        fillTop.style.opacity = "0.28";
        setTimeout(() => { fillTop.style.opacity = "0"; }, 130);
      }, lastTickStart));

      return { doneAt: lastTickStart + 40, timers, applyFinal };
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
   the remaining five can be added without touching the logic
   above. Only `ready: true` tools are interactive/linked. `slug`
   is the subpage URL segment; `shortName` is the single-line
   overview label; `name` is the full title on the tool's page.
   ============================================================ */
export const TOOLS = [
  {
    id: "design-thinking",
    slug: "design-thinking",
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
  {
    id: "lean-ux",
    slug: "lean-ux",
    diagram: "triangle",
    ready: true,
    shortName: "Lean UX",
    name: "Lean UX",
    attribution: "Jeff Gothelf and Josh Seiden, Lean UX, 2013",
    whatItIs: "Assumptions become hypotheses. Hypotheses get tested with the smallest thing that can answer the question. Research runs continuously instead of in a phase at the start.",
    strongFor: "Turning \"make onboarding better\" into a claim that can be proven wrong. The hypothesis format is the real tool here, not the loop.",
    howIUse: "When a team wants to specify everything before building anything. The prototype settles in a week what the document would have argued about for a month.",
    watchOut: "Agree what counts as success before you run the test. Deciding afterwards is not research, it is decoration.",
    source: "https://jeffgothelf.com/blog/category/lean-ux/",
  },
  {
    id: "behavior-model",
    slug: "behavior-model",
    diagram: "curve",
    ready: true,
    shortName: "Behavior Model",
    name: "Behavior Model (B=MAP)",
    attribution: "BJ Fogg, Stanford Behavior Design Lab",
    whatItIs: "Behaviour happens when motivation, ability and a prompt land at the same moment. Take away any one of the three and nothing happens.",
    strongFor: "Working out why people are not doing the thing. It is almost always ability. The room almost always reaches for motivation.",
    howIUse: "When engagement is low and the instinct in the room is another campaign. The fix is usually removing a step, not adding a message.",
    watchOut: "The prompt is the one everyone forgets. Perfect motivation and perfect ability still produce nothing if nobody is asked at the right moment.",
    source: "https://behaviordesign.stanford.edu/people/bj-fogg",
  },
  {
    id: "octalysis",
    slug: "octalysis",
    diagram: "octagon",
    ready: true,
    shortName: "Octalysis",
    name: "Octalysis",
    attribution: "Yu-kai Chou",
    whatItIs: "Eight core drives behind why people engage with anything. The top four pull people in. The bottom four push them. Both work, and they do not feel the same to be on the receiving end of.",
    strongFor: "Loyalty programmes. It makes the difference between pull and pressure impossible to ignore once you have seen where your own design sits.",
    howIUse: "Before anything with points, tiers or rewards gets designed. Pressure works, right up until people notice they are being pushed.",
    watchOut: "Most loyalty programmes cluster in the bottom right, around scarcity and reward, because those are the cheapest to build. That is exactly why so many of them feel identical.",
    sources: [
      { label: "The framework", url: "https://yukaichou.com/gamification-examples/octalysis-gamification-framework/" },
      { label: "White hat vs black hat", url: "https://yukaichou.com/gamification-examples/white-hat-vs-black-hat-gamification/" },
    ],
  },
  {
    id: "11-star-experience",
    slug: "11-star-experience",
    diagram: "pyramid",
    ready: true,
    shortName: "11-Star Experience",
    name: "The 11-Star Experience",
    attribution: "Brian Chesky, Airbnb, on Masters of Scale, episode 1, 2017",
    whatItIs: "Describe the ridiculous version first, the one nobody could possibly build, then scale back until it meets reality.",
    strongFor: "Getting out of incremental thinking. Start from what is possible and you will land on a slightly better version of what already exists.",
    howIUse: "At the very start of concept work, before constraints walk into the room. Where you land after scaling back is still somewhere you would never have reached from the budget.",
    watchOut: "It works once. Run it after estimation has started and the room will treat it as a joke.",
    source: "https://mastersofscale.com/brian-chesky/",
  },
  { diagram: "grid9", ready: false, shortName: "Business Model Canvas" },
  { diagram: "grid6", ready: false, shortName: "Empathy Map" },
  { diagram: "layered", ready: false, shortName: "Service Blueprint" },
  { diagram: "matrix", ready: false, shortName: "Value / Complexity" },
  { diagram: "radial7", ready: false, shortName: "Muda" },
];

/* Renders a tool's title/attribution/sections/source(s) into a given
   container. Shared by every tool subpage. */
export function renderToolContent(tool, container) {
  container.innerHTML = "";
  const title = document.createElement("h1");
  title.className = "tool-title";
  title.textContent = tool.name;
  container.appendChild(title);

  const attribution = document.createElement("p");
  attribution.className = "tool-attribution";
  attribution.textContent = tool.attribution;
  container.appendChild(attribution);

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
    container.appendChild(sec);
  }

  // Most tools carry one source; a tool may instead carry a `sources`
  // array of { label, url } so more than one link can render, each on
  // its own line with its own label.
  const sourceList = tool.sources || [{ label: "Source", url: tool.source }];
  const sourceWrap = document.createElement("div");
  sourceWrap.className = "tool-source";
  for (const { label, url } of sourceList) {
    const line = document.createElement("p");
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = url;
    line.append(label + ": ");
    line.appendChild(a);
    sourceWrap.appendChild(line);
  }
  container.appendChild(sourceWrap);
}
