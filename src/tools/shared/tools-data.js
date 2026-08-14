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

// Same as svgText, but wraps to one tspan per entry in `lines`, each
// offset from the previous by `lineHeight`. `y` is the baseline of the
// first line.
export function svgTextLines(x, y, anchor, lines, cls, lineHeight) {
  const t = svgEl("text", { x, y, "text-anchor": anchor, class: cls });
  lines.forEach((line, i) => {
    const tspan = svgEl("tspan", { x, dy: i === 0 ? 0 : lineHeight });
    tspan.textContent = line;
    t.appendChild(tspan);
  });
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
// Arrowheads sit at the true midpoint of each side so they read as
// arrowheads on the stroke itself, not detached marks floating beside it.
const TRI_ARROWS = [
  { x: 105.1, y: 65.5, angle: 60 },   // right side, apex -> bottom-right
  { x: 80, y: 109, angle: 180 },      // bottom side, right -> left
  { x: 54.9, y: 65.5, angle: -60 },   // left side, bottom-left -> apex
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

/* ── Tool 6: Business Model Canvas (nine blocks) ───────────────
   Five columns across an upper section, three of them split into
   two stacked blocks, plus a bottom row split into two wide blocks.
   Coordinates are shared between the outline draw order and the
   label placement so the two never drift apart. */
const BMC = {
  x0: 10, x1: 46, x2: 82, x3: 118, x4: 154, x5: 190,
  y0: 10, ySplit: 51, yMid: 92, yBottom: 130,
  xBottomMid: 100,
};
const BMC_STAGE_VB = "0 0 200 140";
const BMC_BLOCKS = [
  { key: "kp", lines: ["Key", "Partners"], cx: (BMC.x0 + BMC.x1) / 2, cy: (BMC.y0 + BMC.yMid) / 2 },
  { key: "ka", lines: ["Key", "Activities"], cx: (BMC.x1 + BMC.x2) / 2, cy: (BMC.y0 + BMC.ySplit) / 2 },
  { key: "kr", lines: ["Key", "Resources"], cx: (BMC.x1 + BMC.x2) / 2, cy: (BMC.ySplit + BMC.yMid) / 2 },
  { key: "vp", lines: ["Value", "Propositions"], cx: (BMC.x2 + BMC.x3) / 2, cy: (BMC.y0 + BMC.yMid) / 2, accent: true },
  { key: "cr", lines: ["Customer", "Relationships"], cx: (BMC.x3 + BMC.x4) / 2, cy: (BMC.y0 + BMC.ySplit) / 2 },
  { key: "ch", lines: ["Channels"], cx: (BMC.x3 + BMC.x4) / 2, cy: (BMC.ySplit + BMC.yMid) / 2 },
  { key: "cs", lines: ["Customer", "Segments"], cx: (BMC.x4 + BMC.x5) / 2, cy: (BMC.y0 + BMC.yMid) / 2 },
  { key: "cost", lines: ["Cost", "Structure"], cx: (BMC.x0 + BMC.xBottomMid) / 2, cy: (BMC.yMid + BMC.yBottom) / 2 },
  { key: "rev", lines: ["Revenue", "Streams"], cx: (BMC.xBottomMid + BMC.x5) / 2, cy: (BMC.yMid + BMC.yBottom) / 2 },
];

/* ── Tool 7: Empathy Map (six filled panels + centre placeholder) ──
   Two columns, three rows, visible gutters between panels. The four
   upper panels are one step lighter than the page background; the two
   lower panels (Pains, Gains) are a second, visibly different shade so
   the split between observation and outcome reads immediately. */
const EMP2_COLW = 60, EMP2_ROWH = 50, EMP2_GUTTER = 4;
const EMP2_PANELS = [
  { key: "think", label: "Thinks and Feels", col: 0, row: 0, shade: 1 },
  { key: "says", label: "Says and Does", col: 1, row: 0, shade: 1 },
  { key: "sees", label: "Sees", col: 0, row: 1, shade: 1 },
  { key: "hears", label: "Hears", col: 1, row: 1, shade: 1 },
  { key: "pains", label: "Pains", col: 0, row: 2, shade: 2 },
  { key: "gains", label: "Gains", col: 1, row: 2, shade: 2 },
];
// Reveal order: the four upper panels clockwise from top left, then the
// two lower panels together; labels follow in the same order.
const EMP2_UPPER_ORDER = ["think", "says", "hears", "sees"];
const EMP2_LOWER_ORDER = ["pains", "gains"];
const EMP2_LABEL_ORDER = ["think", "says", "hears", "sees", "pains", "gains"];

/* ── Tool 8: Service Blueprint (filled row/column template) ───────
   A label column plus a content grid of empty cells, five rows deep,
   with three full-width accent bands standing in for the boundary
   lines and a single phase header above. Content columns drop from
   five to three under 500px so the grid stays legible on a phone. */
const SBP2_ROW_ORDER = [
  { type: "content", label: "Evidence" },
  { type: "content", label: "User Actions" },
  { type: "band", label: "Line of Interaction" },
  { type: "content", label: "Frontstage" },
  { type: "band", label: "Line of Visibility" },
  { type: "content", label: "Backstage" },
  { type: "band", label: "Line of Internal Interaction" },
  { type: "content", label: "Support Processes" },
];
// Three phase segments, spanning only the content columns — the area
// above the row-label column stays empty. Below 400px these abbreviate
// to BEF/DUR/AFT rather than wrapping.
const SBP2_PHASES = ["Before", "During", "After"];
const SBP2_PHASES_SHORT = ["Bef", "Dur", "Aft"];
const SBP2_ROW_H = { content: 24, band: 6.5 };
const SBP2_LABEL_COL_W = 44;
const SBP2_COL_W = 24;
const SBP2_GUTTER = 3;
const SBP2_HEADER_H = 16, SBP2_HEADER_GAP = 5;
// The phase header sits at full strength; the three boundary bands
// sit behind the content, much fainter.
const SBP2_HEADER_FILL = "rgba(224, 58, 47, 0.2)";
const SBP2_BAND_FILL = "rgba(224, 58, 47, 0.1)";
// Three illustrative numbered markers connecting steps across rows —
// not tied to real content. Indices are into SBP2_ROW_ORDER; all three
// land on content rows (Evidence, Frontstage, Support Processes).
const SBP2_MARKER_ROWS = [0, 3, 7];

/* ── Tool 9: Value / Complexity Matrix ─────────────────────────
   Plain L-shaped axes (single arrowhead each, no bounding rect) with
   a dashed cross at the plot centre forming the four quadrants. */
const VCM = { x0: 20, x1: 172, y0: 140, y1: 20 };
const VCM_CX = (VCM.x0 + VCM.x1) / 2, VCM_CY = (VCM.y0 + VCM.y1) / 2;
const VCM_STAGE_VB = "-18 -18 235 200";
const VCM_QUADRANTS = [
  { key: "tl", lines: ["Easy wins"], cx: (VCM.x0 + VCM_CX) / 2, cy: (VCM_CY + VCM.y1) / 2, accent: true },
  { key: "tr", lines: ["Strategic", "investments"], cx: (VCM_CX + VCM.x1) / 2, cy: (VCM_CY + VCM.y1) / 2 },
  { key: "br", lines: ["Deprioritise"], cx: (VCM_CX + VCM.x1) / 2, cy: (VCM.y0 + VCM_CY) / 2 },
  { key: "bl", lines: ["Take as", "they come"], cx: (VCM.x0 + VCM_CX) / 2, cy: (VCM.y0 + VCM_CY) / 2 },
];

/* ── Tool 10: Muda, the seven (plus one) wastes ────────────────
   Eight evenly spaced directions (45 degrees apart) around the
   centre; seven carry a solid line and are the classic wastes, the
   eighth — the "remaining gap" once the seven are placed clockwise
   from the top — carries a shorter dashed line for Unused Talent. */
const MUDA = { cx: 90, cy: 92, r: 52, rDashed: 42 };
const MUDA_NODES = [
  { key: "overproduction", label: "Overproduction", angle: -90 },
  { key: "waiting", label: "Waiting", angle: -45 },
  { key: "transport", label: "Transport", angle: 0 },
  { key: "overprocessing", label: "Over-processing", angle: 45 },
  { key: "inventory", label: "Inventory", angle: 90 },
  { key: "motion", label: "Motion", angle: 135 },
  { key: "defects", label: "Defects", angle: 180 },
];
const MUDA_DASHED = { key: "unused", label: "Unused Talent", angle: 225 };
const MUDA_STAGE_VB = "-30 0 260 185";

/* ── Tool 11: Stakeholder Map ───────────────────────────────────
   Three concentric rings; primary stakeholders inner, secondary
   middle, indirect outer. Inner-ring node angles avoid the top
   (-90deg) on purpose -- that is where the ring label sits. */
const STAKE = { cx: 92, cy: 96, rOuter: 74, rMid: 50, rInner: 26 };
const STAKE_STAGE_VB = "-6 -6 196 204";
// Nodes sit directly on their own ring's radius -- the same convention
// the radial (Muda) diagram uses for node placement -- so spacing scales
// with the ring itself instead of being guessed at a smaller radius.
const STAKE_NODE_R = { inner: STAKE.rInner, mid: STAKE.rMid, outer: STAKE.rOuter };
const STAKE_NODES = [
  { key: "inner-0", ring: "inner", label: "Decision maker", angle: -30 },
  { key: "inner-1", ring: "inner", label: "Daily user", angle: 90 },
  { key: "inner-2", ring: "inner", label: "Owner", angle: 210 },
  { key: "mid-0", ring: "mid", label: "Manager", angle: -30 },
  { key: "mid-1", ring: "mid", label: "Support", angle: 90 },
  { key: "mid-2", ring: "mid", label: "Supplier", angle: 210 },
  { key: "outer-0", ring: "outer", label: "Regulator", angle: 0 },
  { key: "outer-1", ring: "outer", label: "Competitor", angle: 180 },
];
const STAKE_NODES_MOBILE = [
  { key: "inner-0", ring: "inner", label: "Decision maker", angle: 45 },
  { key: "inner-1", ring: "inner", label: "Owner", angle: 225 },
  { key: "mid-0", ring: "mid", label: "Manager", angle: -45 },
  { key: "mid-1", ring: "mid", label: "Support", angle: 135 },
  { key: "outer-0", ring: "outer", label: "Regulator", angle: 0 },
  { key: "outer-1", ring: "outer", label: "Competitor", angle: 180 },
];

/* ── Tool 12: The Reflective Sketching Loop ─────────────────────
   Two tall ellipses (mind / sketch) with a create arc over the
   top and a read arc under the bottom, each ending in an
   arrowhead pointing along its direction of travel. */
const REFLECT = { leftCx: 60, rightCx: 150, cy: 90, rx: 30, ry: 52 };
const REFLECT_STAGE_VB = "-10 -5 240 190";
const REFLECT_UPPER_ARC_D = "M 60 38 Q 105 10 140 38";
const REFLECT_LOWER_ARC_D = "M 140 142 Q 105 170 60 142";

/* ── Tool 13: Lotus Blossom ──────────────────────────────────────
   A 3x3 macro-grid of 9 blocks, each itself a 3x3 grid of cells.
   The centre block's eight surrounding cells are lettered A-H
   clockwise from the top; each outer block's own centre cell
   repeats the letter matching its direction from the centre. */
const LOTUS = { blockSize: 26, cellSize: 8, cellGutter: 1, blockGutter: 4 };
const LOTUS_BLOCK_PITCH = LOTUS.blockSize + LOTUS.blockGutter;
const LOTUS_CELL_PITCH = LOTUS.cellSize + LOTUS.cellGutter;
const LOTUS_STAGE_VB = "-6 -6 98 98";
const LOTUS_DIRS = [
  { key: "A", dc: 1, dr: 0 },
  { key: "B", dc: 2, dr: 0 },
  { key: "C", dc: 2, dr: 1 },
  { key: "D", dc: 2, dr: 2 },
  { key: "E", dc: 1, dr: 2 },
  { key: "F", dc: 0, dr: 2 },
  { key: "G", dc: 0, dr: 1 },
  { key: "H", dc: 0, dr: 0 },
];
function lotusBlockXY(bc, br) {
  return { x: bc * LOTUS_BLOCK_PITCH, y: br * LOTUS_BLOCK_PITCH };
}
function lotusCellXY(blockX, blockY, cc, cr) {
  return { x: blockX + cc * LOTUS_CELL_PITCH, y: blockY + cr * LOTUS_CELL_PITCH };
}

/* ── Tool 14: The Design Squiggle ───────────────────────────────
   An original, procedurally generated line -- not a trace of
   Damien Newman's artwork -- resolving from a dense tangle on the
   left into one straight line on the right. Amplitude is capped
   well inside the rule band so the tangle never touches either
   rule at any width. */
function squigglePoints(mobile) {
  const startX = 10, endX = 214, midY = 90;
  const N = mobile ? 100 : 160;
  const chaosEnd = 0.65;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = startX + t * (endX - startX);
    const chaos = Math.max(0, 1 - t / chaosEnd);
    const freq = (mobile ? 8 : 14) - 8 * Math.min(1, t / chaosEnd);
    const amp = 40 * chaos * chaos;
    const y = midY
      + Math.sin(t * freq * 2 * Math.PI) * amp
      + Math.sin(t * freq * 2.7 * 2 * Math.PI) * amp * 0.3;
    pts.push([x, y]);
  }
  return pts;
}
function squigglePathD(pts) {
  return pts.map((p, i) => (i === 0 ? "M " : "L ") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
}
const SQUIGGLE_STAGE_VB = "0 -18 224 210";
const SQUIGGLE_MARKERS = [
  { key: "research", label: "RESEARCH", x: 40, accent: false },
  { key: "concept", label: "CONCEPT PROTOTYPE", x: 115, accent: false },
  { key: "design", label: "DESIGN", x: 190, accent: true },
];

/* ── Tool 15: The 6x6 Rule ───────────────────────────────────────
   Six questions, each paired with the picture type that answers
   it best -- one row per question, a connector, then a small
   line-drawn icon. */
const SIXBYSIX = { rowH: 26, labelX: 4, connectorX0: 54, connectorX1: 96, iconX: 100, iconSize: 22 };
const SIXBYSIX_STAGE_VB = "-6 -6 190 176";
const SIXBYSIX_ROWS = [
  { key: "who", question: "WHO / WHAT", icon: "portrait" },
  { key: "howmuch", question: "HOW MUCH", icon: "bars" },
  { key: "where", question: "WHERE", icon: "map" },
  { key: "when", question: "WHEN", icon: "timeline" },
  { key: "how", question: "HOW", icon: "flow" },
  { key: "why", question: "WHY", icon: "plot" },
];
function sixbysixRowCY(i) {
  return 13 + i * SIXBYSIX.rowH;
}
function sixbysixIcon(kind) {
  const g = svgEl("g", { class: "sixbysix-icon-shape" });
  const s = { ...LINE, "stroke-width": "1" };
  if (kind === "portrait") {
    g.appendChild(svgEl("rect", { x: 1, y: 1, width: 20, height: 20, rx: 2, ...s, fill: "none" }));
    g.appendChild(svgEl("circle", { cx: 11, cy: 9, r: 3.6, ...s, fill: "none" }));
    g.appendChild(svgEl("path", { d: "M 4 19 Q 11 12 18 19", ...s, fill: "none" }));
  } else if (kind === "bars") {
    g.appendChild(svgEl("rect", { x: 2, y: 12, width: 4.5, height: 9, ...s, fill: "none" }));
    g.appendChild(svgEl("rect", { x: 8.5, y: 6, width: 4.5, height: 15, ...s, fill: "none" }));
    g.appendChild(svgEl("rect", { x: 15, y: 1, width: 4.5, height: 20, ...s, fill: "none" }));
  } else if (kind === "map") {
    g.appendChild(svgEl("polygon", { points: "2,5 10,1 19,6 20,13 14,20 6,18 1,12", ...s, fill: "none" }));
    g.appendChild(svgEl("circle", { cx: 9, cy: 9, r: 1.3, fill: "currentColor" }));
    g.appendChild(svgEl("circle", { cx: 14, cy: 13, r: 1.3, fill: "currentColor" }));
  } else if (kind === "timeline") {
    g.appendChild(svgEl("line", { x1: 1, y1: 11, x2: 21, y2: 11, ...s }));
    [5, 11, 17].forEach((x) => g.appendChild(svgEl("line", { x1: x, y1: 7, x2: x, y2: 15, ...s })));
  } else if (kind === "flow") {
    // arrowHead()'s chevron is 9 units wide -- too big for this icon's
    // tight gaps, so this draws a small filled triangle sized to fit.
    g.appendChild(svgEl("rect", { x: 0, y: 8, width: 4.5, height: 5, ...s, fill: "none" }));
    g.appendChild(svgEl("rect", { x: 8.75, y: 8, width: 4.5, height: 5, ...s, fill: "none" }));
    g.appendChild(svgEl("rect", { x: 17.5, y: 8, width: 4.5, height: 5, ...s, fill: "none" }));
    g.appendChild(svgEl("line", { x1: 4.5, y1: 10.5, x2: 6.75, y2: 10.5, ...s }));
    g.appendChild(svgEl("polygon", { points: "6.75,9.3 6.75,11.7 8.75,10.5", fill: "currentColor", stroke: "none" }));
    g.appendChild(svgEl("line", { x1: 13.25, y1: 10.5, x2: 15.5, y2: 10.5, ...s }));
    g.appendChild(svgEl("polygon", { points: "15.5,9.3 15.5,11.7 17.5,10.5", fill: "currentColor", stroke: "none" }));
  } else if (kind === "plot") {
    g.appendChild(svgEl("line", { x1: 2, y1: 1, x2: 2, y2: 19, ...s }));
    g.appendChild(svgEl("line", { x1: 2, y1: 19, x2: 21, y2: 19, ...s }));
    const dots = [[6, 14], [11, 8], [15, 12], [19, 4]];
    dots.forEach(([x, y]) => g.appendChild(svgEl("circle", { cx: x, cy: y, r: 1.2, fill: "currentColor" })));
    g.appendChild(svgEl("path", { d: "M 6 14 L 11 8 L 15 12 L 19 4", fill: "none", stroke: "currentColor", "stroke-width": "0.8", "stroke-dasharray": "1.5 1.2", opacity: "0.6" }));
  }
  return g;
}

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
        class: "curve-thumb-path",
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
      svg.appendChild(svgText(142, 116, "middle", "Action Line", "tool-label curve-label-action"));

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
      const promptCircles = diagramEl.querySelector(".curve-prompt-circles");
      const promptLabel = diagramEl.querySelector(".curve-label-prompt");

      function applyFinal() {
        [vAxis, hAxis, curveLine].forEach((el) => { el.style.transition = "none"; el.style.strokeDashoffset = "0"; });
        [vGroup, hGroup].forEach((g) => { g.style.transition = "none"; g.style.opacity = "1"; });
        [actionLabel, promptLabel].forEach((el) => el.classList.add("show"));
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

      const pulseStart = curveEnd + 145, pulseDur = 160, pulseEnd = pulseStart + pulseDur;
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
      const x0 = 20, x1 = 44, x2 = 68, x3 = 92, x4 = 116, x5 = 140, y0 = 20, ySplit = 60, yMid = 100, yBottom = 140, xBotMid = 80;
      svg.appendChild(svgEl("rect", { x: x0, y: y0, width: x5 - x0, height: yBottom - y0, ...LINE }));
      svg.appendChild(svgEl("line", { x1: x0, y1: yMid, x2: x5, y2: yMid, ...LINE, "stroke-width": "1" }));
      for (const x of [x1, x2, x3, x4]) svg.appendChild(svgEl("line", { x1: x, y1: y0, x2: x, y2: yMid, ...LINE, "stroke-width": "1" }));
      for (const [a, b] of [[x1, x2], [x3, x4]]) svg.appendChild(svgEl("line", { x1: a, y1: ySplit, x2: b, y2: ySplit, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: xBotMid, y1: yMid, x2: xBotMid, y2: yBottom, ...LINE, "stroke-width": "1" }));
      return svg;
    },
    /* Nine-block canvas: outer rect, the upper/lower split, four column
       dividers, the two inner splits and the bottom split, in that
       order — each block's label sits at its own centre, wrapping to
       two short lines so it fits its (narrow) column. */
    buildStage() {
      const svg = svgEl("svg", { viewBox: BMC_STAGE_VB, draggable: "false" });

      const outer = svgEl("path", {
        d: "M " + BMC.x0 + " " + BMC.y0 + " L " + BMC.x5 + " " + BMC.y0 + " L " + BMC.x5 + " " + BMC.yBottom + " L " + BMC.x0 + " " + BMC.yBottom + " Z",
        ...LINE, class: "bmc-outer", pathLength: "1",
      });
      outer.style.strokeDasharray = "1"; outer.style.strokeDashoffset = "1";
      svg.appendChild(outer);

      const hSplit = svgEl("line", { x1: BMC.x0, y1: BMC.yMid, x2: BMC.x5, y2: BMC.yMid, ...LINE, "stroke-width": "1", class: "bmc-hsplit", pathLength: "1" });
      hSplit.style.strokeDasharray = "1"; hSplit.style.strokeDashoffset = "1";
      svg.appendChild(hSplit);

      const vDividers = [BMC.x1, BMC.x2, BMC.x3, BMC.x4].map((x, i) => {
        const l = svgEl("line", { x1: x, y1: BMC.y0, x2: x, y2: BMC.yMid, ...LINE, "stroke-width": "1", class: "bmc-vdiv bmc-vdiv-" + i, pathLength: "1" });
        l.style.strokeDasharray = "1"; l.style.strokeDashoffset = "1";
        return l;
      });
      vDividers.forEach((l) => svg.appendChild(l));

      const innerSplits = [[BMC.x1, BMC.x2], [BMC.x3, BMC.x4]].map(([a, b], i) => {
        const l = svgEl("line", { x1: a, y1: BMC.ySplit, x2: b, y2: BMC.ySplit, ...LINE, "stroke-width": "1", class: "bmc-inner bmc-inner-" + i, pathLength: "1" });
        l.style.strokeDasharray = "1"; l.style.strokeDashoffset = "1";
        return l;
      });
      innerSplits.forEach((l) => svg.appendChild(l));

      const bottomSplit = svgEl("line", { x1: BMC.xBottomMid, y1: BMC.yMid, x2: BMC.xBottomMid, y2: BMC.yBottom, ...LINE, "stroke-width": "1", class: "bmc-bottomsplit", pathLength: "1" });
      bottomSplit.style.strokeDasharray = "1"; bottomSplit.style.strokeDashoffset = "1";
      svg.appendChild(bottomSplit);

      const labelGroup = svgEl("g", { class: "bmc-labels" });
      labelGroup.style.opacity = "0";
      for (const b of BMC_BLOCKS) {
        // "show" is applied immediately — these fade in together via the
        // parent group's own opacity transition, not individually.
        const cls = "tool-label bmc-label show" + (b.accent ? "" : " neutral");
        b.lines.forEach((line, li) => {
          const y = b.cy - ((b.lines.length - 1) / 2) * 4.6 + li * 4.6;
          labelGroup.appendChild(svgText(b.cx, y, "middle", line, cls));
        });
      }
      svg.appendChild(labelGroup);

      return svg;
    },
    assemble(diagramEl) {
      const outer = diagramEl.querySelector(".bmc-outer");
      const hSplit = diagramEl.querySelector(".bmc-hsplit");
      const vDividers = [0, 1, 2, 3].map((i) => diagramEl.querySelector(".bmc-vdiv-" + i));
      const innerSplits = [0, 1].map((i) => diagramEl.querySelector(".bmc-inner-" + i));
      const bottomSplit = diagramEl.querySelector(".bmc-bottomsplit");
      const labelGroup = diagramEl.querySelector(".bmc-labels");

      function applyFinal() {
        [outer, hSplit, bottomSplit, ...vDividers, ...innerSplits].forEach((el) => { el.style.transition = "none"; el.style.strokeDashoffset = "0"; });
        labelGroup.style.transition = "none"; labelGroup.style.opacity = "1";
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const outerDur = 160;
      timers.push(setTimeout(() => { outer.style.transition = "stroke-dashoffset " + outerDur + "ms ease"; outer.style.strokeDashoffset = "0"; }, 0));

      const hSplitStart = outerDur + 10, hSplitDur = 120, hSplitEnd = hSplitStart + hSplitDur;
      timers.push(setTimeout(() => { hSplit.style.transition = "stroke-dashoffset " + hSplitDur + "ms ease"; hSplit.style.strokeDashoffset = "0"; }, hSplitStart));

      const vStagger = 40, vDur = 80, vStart = hSplitEnd + 10;
      vDividers.forEach((v, i) => {
        timers.push(setTimeout(() => { v.style.transition = "stroke-dashoffset " + vDur + "ms ease"; v.style.strokeDashoffset = "0"; }, vStart + i * vStagger));
      });
      const afterV = vStart + (vDividers.length - 1) * vStagger + vDur;

      const innerStagger = 40, innerDur = 80, innerStart = afterV + 10;
      innerSplits.forEach((l, i) => {
        timers.push(setTimeout(() => { l.style.transition = "stroke-dashoffset " + innerDur + "ms ease"; l.style.strokeDashoffset = "0"; }, innerStart + i * innerStagger));
      });
      const afterInner = innerStart + (innerSplits.length - 1) * innerStagger + innerDur;

      const bottomStart = afterInner + 20, bottomDur = 100, bottomEnd = bottomStart + bottomDur;
      timers.push(setTimeout(() => { bottomSplit.style.transition = "stroke-dashoffset " + bottomDur + "ms ease"; bottomSplit.style.strokeDashoffset = "0"; }, bottomStart));

      const labelStart = bottomEnd + 20, labelDur = 140;
      timers.push(setTimeout(() => { labelGroup.style.transition = "opacity " + labelDur + "ms ease"; labelGroup.style.opacity = "1"; }, labelStart));

      return { doneAt: labelStart + labelDur, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(420px, calc(100vw - 3rem))" : "min(680px, 92vw)"; },
  },

  grid6: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const x0 = 22, xMid = 80, x1 = 138, y0 = 14, y1 = 59, y2 = 105, y3 = 150;
      svg.appendChild(svgEl("rect", { x: x0, y: y0, width: x1 - x0, height: y3 - y0, ...LINE }));
      svg.appendChild(svgEl("line", { x1: xMid, y1: y0, x2: xMid, y2: y3, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: x0, y1: y1, x2: x1, y2: y1, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: x0, y1: y2, x2: x1, y2: y2, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("circle", { cx: xMid, cy: (y0 + y3) / 2, r: 9, fill: "currentColor" }));
      return svg;
    },
    /* A filled template, not line art: six panels in two columns and
       three rows, visible gutters between them. The lower two (Pains,
       Gains) use a visibly different fill so the split between
       observation and outcome reads immediately. A small neutral
       rectangle marks the centre — a placeholder for the person's
       photo — and sits on top of the gutters. */
    buildStage() {
      const colW = EMP2_COLW, rowH = EMP2_ROWH, gutter = EMP2_GUTTER;
      const gridW = colW * 2 + gutter;
      const gridH = rowH * 3 + gutter * 2;
      const svg = svgEl("svg", { viewBox: "-8 -8 " + (gridW + 16) + " " + (gridH + 16), draggable: "false" });

      const colX = [0, colW + gutter];
      const rowY = [0, rowH + gutter, (rowH + gutter) * 2];

      EMP2_PANELS.forEach((p) => {
        const x = colX[p.col], y = rowY[p.row];
        const rect = svgEl("rect", { x, y, width: colW, height: rowH, fill: p.shade === 2 ? "var(--panel-2)" : "var(--panel-1)", class: "emp2-panel emp2-panel-" + p.key });
        rect.style.opacity = "0";
        svg.appendChild(rect);

        const label = svgText(x + colW / 2, y + 11, "middle", p.label, "emp2-panel-label emp2-panel-label-" + p.key);
        label.style.opacity = "0";
        svg.appendChild(label);
      });

      const cx = gridW / 2, cy = gridH / 2;
      const photoOuter = svgEl("g", { transform: "translate(" + cx + "," + cy + ")" });
      const photoInner = svgEl("g", { class: "emp2-photo" });
      photoInner.style.transform = "scale(0)";
      photoInner.style.transformOrigin = "center";
      // A thin outlined figure — "a person goes here" — not a filled
      // block, and small enough that it never covers panel content.
      photoInner.appendChild(svgEl("circle", { cx: 0, cy: -3.5, r: 3, fill: "none", stroke: "var(--ink-muted)", "stroke-width": "1.2" }));
      photoInner.appendChild(svgEl("path", { d: "M -7,4 Q 0,-3 7,4", fill: "none", stroke: "var(--ink-muted)", "stroke-width": "1.2", "stroke-linecap": "round" }));
      photoOuter.appendChild(photoInner);
      svg.appendChild(photoOuter);

      return svg;
    },
    assemble(diagramEl) {
      const panelFor = (k) => diagramEl.querySelector(".emp2-panel-" + k);
      const labelFor = (k) => diagramEl.querySelector(".emp2-panel-label-" + k);
      const photo = diagramEl.querySelector(".emp2-photo");

      function applyFinal() {
        EMP2_PANELS.forEach((p) => {
          panelFor(p.key).style.transition = "none"; panelFor(p.key).style.opacity = "1";
          labelFor(p.key).style.transition = "none"; labelFor(p.key).style.opacity = "1";
        });
        photo.style.transition = "none"; photo.style.transform = "scale(1)";
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const fade = (el, delay, dur) => {
        timers.push(setTimeout(() => { el.style.transition = "opacity " + dur + "ms ease"; el.style.opacity = "1"; }, delay));
      };

      // 1. Four upper panels, clockwise from top left.
      const upperStagger = 45, upperDur = 80;
      EMP2_UPPER_ORDER.forEach((k, i) => fade(panelFor(k), i * upperStagger, upperDur));
      let t = (EMP2_UPPER_ORDER.length - 1) * upperStagger + upperDur + 10;

      // 2. Two lower panels together.
      const lowerDur = 90;
      EMP2_LOWER_ORDER.forEach((k) => fade(panelFor(k), t, lowerDur));
      t = t + lowerDur + 10;

      // 3. Six labels, in the same order.
      const labelStagger = 35, labelDur = 65;
      EMP2_LABEL_ORDER.forEach((k, i) => fade(labelFor(k), t + i * labelStagger, labelDur));
      t = t + (EMP2_LABEL_ORDER.length - 1) * labelStagger + labelDur + 10;

      // 4. Centre rectangle, scaling up last.
      const photoDur = 130;
      timers.push(setTimeout(() => {
        photo.style.transition = "transform " + photoDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        photo.style.transform = "scale(1)";
      }, t));

      return { doneAt: t + photoDur + 15, timers, applyFinal };
    },
  },

  layered: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const x0 = 20, x1 = 140, y0 = 20, bandH = 24;
      for (let i = 0; i <= 5; i++) {
        const y = y0 + i * bandH;
        svg.appendChild(svgEl("line", { x1: x0, y1: y, x2: x1, y2: y, ...LINE, "stroke-width": "1" }));
      }
      svg.appendChild(svgEl("line", { x1: x0, y1: y0, x2: x0, y2: y0 + 5 * bandH, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: x1, y1: y0, x2: x1, y2: y0 + 5 * bandH, ...LINE, "stroke-width": "1" }));
      return svg;
    },
    /* A filled template, not line art: a label column plus a grid of
       empty content cells (three columns under 500px, five above),
       three full-width accent bands standing in for the boundary
       lines, and a single phase header above. Header, then label
       cells top to bottom, then content cells row by row, then the
       three bands with their names, then three illustrative numbered
       markers. */
    buildStage() {
      const cols = window.innerWidth < 500 ? 3 : 5;
      const gutter = SBP2_GUTTER;
      const labelW = SBP2_LABEL_COL_W;
      const colW = SBP2_COL_W;
      const gridW = labelW + gutter + cols * colW + (cols - 1) * gutter;

      const rowY = [];
      let yCursor = 0;
      SBP2_ROW_ORDER.forEach((r) => {
        rowY.push(yCursor);
        yCursor += SBP2_ROW_H[r.type] + gutter;
      });
      const gridH = yCursor - gutter;
      const headerH = SBP2_HEADER_H, headerGap = SBP2_HEADER_GAP;
      const gridTop = headerH + headerGap;
      const totalH = gridTop + gridH;

      const svg = svgEl("svg", { viewBox: "-8 -8 " + (gridW + 16) + " " + (totalH + 16), draggable: "false" });

      // Three chevron segments — Before, During, After — spanning only
      // the content columns, plus two faint vertical guides at the
      // phase divisions running down through the grid. The area above
      // the row-label column stays empty.
      const headerGroup = svgEl("g", { class: "sbp2-header" });
      headerGroup.style.opacity = "0";
      const contentX0 = labelW + gutter;
      const contentW = gridW - contentX0;
      const segW = contentW / 3;
      const notch = headerH * 0.4;
      const chevronPoints = (x) => [
        x + ",0",
        (x + segW - notch) + ",0",
        (x + segW) + "," + headerH / 2,
        (x + segW - notch) + "," + headerH,
        x + "," + headerH,
        (x + notch) + "," + headerH / 2,
      ].join(" ");
      // Abbreviate whenever the narrower three-column layout is active —
      // full-length labels are too wide for a three-way split and
      // collide with each other well before 400px on their own.
      const phases = cols === 3 ? SBP2_PHASES_SHORT : SBP2_PHASES;
      phases.forEach((label, i) => {
        const segX = contentX0 + i * segW;
        headerGroup.appendChild(svgEl("polygon", { points: chevronPoints(segX), fill: SBP2_HEADER_FILL }));
        headerGroup.appendChild(svgText(segX + segW / 2, headerH / 2 + 2, "middle", label, "sbp2-band-label sbp2-header-label"));
      });
      svg.appendChild(headerGroup);

      let contentRowIdx = 0;
      let bandIdx = 0;
      SBP2_ROW_ORDER.forEach((r, i) => {
        const ry = gridTop + rowY[i];
        if (r.type === "content") {
          const cell = svgEl("rect", { x: 0, y: ry, width: labelW, height: SBP2_ROW_H.content, fill: "var(--panel-1)", class: "sbp2-cell sbp2-label-row-" + contentRowIdx });
          cell.style.opacity = "0";
          svg.appendChild(cell);

          const lines = r.label === "Support Processes" ? ["Support", "Processes"] : [r.label];
          const lineH = 5.6;
          const labelY = ry + SBP2_ROW_H.content / 2 - ((lines.length - 1) * lineH) / 2 + 1.8;
          const labelText = svgTextLines(labelW / 2, labelY, "middle", lines, "sbp2-row-label sbp2-label-row-" + contentRowIdx, lineH);
          labelText.style.opacity = "0";
          svg.appendChild(labelText);

          for (let c = 0; c < cols; c++) {
            const cx = labelW + gutter + c * (colW + gutter);
            const ccell = svgEl("rect", { x: cx, y: ry, width: colW, height: SBP2_ROW_H.content, fill: "var(--panel-1)", class: "sbp2-cell sbp2-content-row-" + contentRowIdx + "-col-" + c });
            ccell.style.opacity = "0";
            svg.appendChild(ccell);
          }

          contentRowIdx++;
        } else {
          const band = svgEl("rect", { x: 0, y: ry, width: gridW, height: SBP2_ROW_H.band, fill: SBP2_BAND_FILL, class: "sbp2-band sbp2-band-" + bandIdx });
          band.style.opacity = "0";
          svg.appendChild(band);
          const bandLabel = svgText(gridW / 2, ry + SBP2_ROW_H.band / 2 + 1.8, "middle", r.label, "sbp2-band-label sbp2-band-label-" + bandIdx);
          bandLabel.style.opacity = "0";
          svg.appendChild(bandLabel);
          bandIdx++;
        }
      });

      // Three illustrative numbered markers, spanning early/middle/late
      // rows and columns to suggest a path connecting steps — not tied
      // to real content.
      const markerCols = [0, Math.floor((cols - 1) / 2), cols - 1];
      SBP2_MARKER_ROWS.forEach((rowOrderIdx, mi) => {
        const ry = gridTop + rowY[rowOrderIdx];
        const c = markerCols[mi];
        const mx = labelW + gutter + c * (colW + gutter) + colW / 2;
        const my = ry + SBP2_ROW_H.content / 2;
        const outer = svgEl("g", { transform: "translate(" + mx + "," + my + ")" });
        const inner = svgEl("g", { class: "sbp2-marker sbp2-marker-" + mi });
        inner.style.transform = "scale(0)";
        inner.style.transformOrigin = "center";
        inner.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 4, fill: "none", stroke: "var(--red)", "stroke-width": "1" }));
        inner.appendChild(svgText(0, 1.6, "middle", String(mi + 1), "sbp2-marker-num"));
        outer.appendChild(inner);
        svg.appendChild(outer);
      });

      return svg;
    },
    assemble(diagramEl) {
      const header = diagramEl.querySelector(".sbp2-header");
      const labelRows = Array.from({ length: 5 }, (_, i) => Array.from(diagramEl.querySelectorAll(".sbp2-label-row-" + i)));
      const contentRows = Array.from({ length: 5 }, (_, r) => {
        const cells = [];
        for (let c = 0; ; c++) {
          const el = diagramEl.querySelector(".sbp2-content-row-" + r + "-col-" + c);
          if (!el) break;
          cells.push(el);
        }
        return cells;
      });
      const bandPairs = Array.from({ length: 3 }, (_, i) => [
        diagramEl.querySelector(".sbp2-band-" + i),
        diagramEl.querySelector(".sbp2-band-label-" + i),
      ]);
      const markers = Array.from({ length: 3 }, (_, i) => diagramEl.querySelector(".sbp2-marker-" + i));

      function applyFinal() {
        header.style.transition = "none"; header.style.opacity = "1";
        labelRows.forEach((row) => row.forEach((el) => { el.style.transition = "none"; el.style.opacity = "1"; }));
        contentRows.forEach((row) => row.forEach((el) => { el.style.transition = "none"; el.style.opacity = "1"; }));
        bandPairs.forEach((pair) => pair.forEach((el) => { el.style.transition = "none"; el.style.opacity = "1"; }));
        markers.forEach((m) => { m.style.transition = "none"; m.style.transform = "scale(1)"; });
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const fade = (el, delay, dur) => {
        timers.push(setTimeout(() => { el.style.transition = "opacity " + dur + "ms ease"; el.style.opacity = "1"; }, delay));
      };

      // 1. Header band fades in.
      const headerDur = 80;
      fade(header, 0, headerDur);
      let t = headerDur + 10;

      // 2. Five label cells fade in top to bottom.
      const labelStagger = 35, labelDur = 65;
      labelRows.forEach((row, i) => {
        const start = t + i * labelStagger;
        row.forEach((el) => fade(el, start, labelDur));
      });
      t = t + (labelRows.length - 1) * labelStagger + labelDur + 10;

      // 3. Content cells fade in row by row, left to right within a row.
      const rowStagger = 35, cellStagger = 6, cellDur = 45;
      contentRows.forEach((row, r) => {
        const rowStart = t + r * rowStagger;
        row.forEach((el, c) => fade(el, rowStart + c * cellStagger, cellDur));
      });
      const colsUsed = contentRows[0] ? contentRows[0].length : 0;
      const lastRowStart = t + (contentRows.length - 1) * rowStagger;
      t = lastRowStart + (colsUsed - 1) * cellStagger + cellDur + 10;

      // 4. Three boundary bands fade in top to bottom, each with its name.
      const bandStagger = 55, bandDur = 70;
      bandPairs.forEach((pair, i) => {
        const start = t + i * bandStagger;
        pair.forEach((el) => fade(el, start, bandDur));
      });
      t = t + (bandPairs.length - 1) * bandStagger + bandDur + 10;

      // 5. Three numbered circles pop in.
      const markerStagger = 45, markerDur = 100;
      markers.forEach((m, i) => {
        const start = t + i * markerStagger;
        timers.push(setTimeout(() => {
          m.style.transition = "transform " + markerDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
          m.style.transform = "scale(1)";
        }, start));
      });

      return { doneAt: t + (markers.length - 1) * markerStagger + markerDur + 15, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(360px, calc(100vw - 3rem))" : "min(520px, 90vw)"; },
  },

  matrix: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("line", { x1: 24, y1: 132, x2: 24, y2: 24, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: 24, y1: 132, x2: 136, y2: 132, ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("line", { x1: 80, y1: 24, x2: 80, y2: 132, fill: "none", stroke: "currentColor", "stroke-width": "0.8", "stroke-dasharray": "3 2" }));
      svg.appendChild(svgEl("line", { x1: 24, y1: 78, x2: 136, y2: 78, fill: "none", stroke: "currentColor", "stroke-width": "0.8", "stroke-dasharray": "3 2" }));
      return svg;
    },
    /* Plain L-shaped axes, single arrowhead each, with a dashed cross
       at the plot centre forming the four quadrants. No bounding rect. */
    buildStage() {
      const svg = svgEl("svg", { viewBox: VCM_STAGE_VB, draggable: "false" });

      const vAxis = svgEl("path", { d: "M " + VCM.x0 + " " + VCM.y0 + " L " + VCM.x0 + " " + VCM.y1, ...LINE, "stroke-width": "1", class: "vcm-vaxis", pathLength: "1" });
      const hAxis = svgEl("path", { d: "M " + VCM.x0 + " " + VCM.y0 + " L " + VCM.x1 + " " + VCM.y0, ...LINE, "stroke-width": "1", class: "vcm-haxis", pathLength: "1" });
      [vAxis, hAxis].forEach((a) => { a.style.strokeDasharray = "1"; a.style.strokeDashoffset = "1"; });
      svg.appendChild(vAxis);
      svg.appendChild(hAxis);

      const vGroup = svgEl("g", { class: "vcm-vgroup" });
      vGroup.style.opacity = "0";
      vGroup.appendChild(arrowHead(VCM.x0, VCM.y1 - 3, -90, "vcm-arrow"));
      const valueLabel = svgText(VCM.x0 - 14, VCM_CY, "middle", "Value", "tool-label neutral show");
      valueLabel.setAttribute("transform", "rotate(-90 " + (VCM.x0 - 14) + " " + VCM_CY + ")");
      vGroup.appendChild(valueLabel);
      svg.appendChild(vGroup);

      const hGroup = svgEl("g", { class: "vcm-hgroup" });
      hGroup.style.opacity = "0";
      hGroup.appendChild(arrowHead(VCM.x1 + 3, VCM.y0, 0, "vcm-arrow"));
      hGroup.appendChild(svgText(VCM.x1, VCM.y0 + 16, "end", "Effort", "tool-label neutral show"));
      svg.appendChild(hGroup);

      const hDash = svgEl("line", { x1: VCM.x0, y1: VCM_CY, x2: VCM.x1, y2: VCM_CY, fill: "none", stroke: "currentColor", "stroke-width": "1", "stroke-dasharray": "4 3", class: "vcm-hdash" });
      hDash.style.transformOrigin = VCM.x0 + "px " + VCM_CY + "px";
      hDash.style.transform = "scaleX(0)";
      svg.appendChild(hDash);

      const vDash = svgEl("line", { x1: VCM_CX, y1: VCM.y0, x2: VCM_CX, y2: VCM.y1, fill: "none", stroke: "currentColor", "stroke-width": "1", "stroke-dasharray": "4 3", class: "vcm-vdash" });
      vDash.style.transformOrigin = VCM_CX + "px " + VCM.y0 + "px";
      vDash.style.transform = "scaleY(0)";
      svg.appendChild(vDash);

      for (const q of VCM_QUADRANTS) {
        const cls = "tool-label vcm-label vcm-label-" + q.key + (q.accent ? "" : " neutral");
        q.lines.forEach((line, li) => {
          const y = q.cy - ((q.lines.length - 1) / 2) * 9 + li * 9;
          svg.appendChild(svgText(q.cx, y, "middle", line, cls));
        });
      }

      return svg;
    },
    assemble(diagramEl) {
      const vAxis = diagramEl.querySelector(".vcm-vaxis");
      const hAxis = diagramEl.querySelector(".vcm-haxis");
      const vGroup = diagramEl.querySelector(".vcm-vgroup");
      const hGroup = diagramEl.querySelector(".vcm-hgroup");
      const hDash = diagramEl.querySelector(".vcm-hdash");
      const vDash = diagramEl.querySelector(".vcm-vdash");
      const quadLabels = (key) => diagramEl.querySelectorAll(".vcm-label-" + key);

      function applyFinal() {
        [vAxis, hAxis].forEach((a) => { a.style.transition = "none"; a.style.strokeDashoffset = "0"; });
        [vGroup, hGroup].forEach((g) => { g.style.transition = "none"; g.style.opacity = "1"; });
        hDash.style.transition = "none"; hDash.style.transform = "scaleX(1)";
        vDash.style.transition = "none"; vDash.style.transform = "scaleY(1)";
        ["tl", "tr", "br", "bl"].forEach((k) => quadLabels(k).forEach((l) => l.classList.add("show")));
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const vDur = 130;
      timers.push(setTimeout(() => {
        vAxis.style.transition = "stroke-dashoffset " + vDur + "ms ease";
        vAxis.style.strokeDashoffset = "0";
        vGroup.style.transition = "opacity 160ms ease";
        vGroup.style.opacity = "1";
      }, 0));

      const hStart = 90, hDur = 130, hEnd = hStart + hDur;
      timers.push(setTimeout(() => {
        hAxis.style.transition = "stroke-dashoffset " + hDur + "ms ease";
        hAxis.style.strokeDashoffset = "0";
        hGroup.style.transition = "opacity 160ms ease";
        hGroup.style.opacity = "1";
      }, hStart));

      const hDashStart = hEnd + 20, hDashDur = 110, hDashEnd = hDashStart + hDashDur;
      timers.push(setTimeout(() => { hDash.style.transition = "transform " + hDashDur + "ms ease"; hDash.style.transform = "scaleX(1)"; }, hDashStart));

      const vDashStart = hDashEnd, vDashDur = 110, vDashEnd = vDashStart + vDashDur;
      timers.push(setTimeout(() => { vDash.style.transition = "transform " + vDashDur + "ms ease"; vDash.style.transform = "scaleY(1)"; }, vDashStart));

      const labelOrder = ["tl", "tr", "br", "bl"];
      const labelStagger = 55;
      labelOrder.forEach((k, i) => {
        timers.push(setTimeout(() => quadLabels(k).forEach((l) => l.classList.add("show")), vDashEnd + 20 + i * labelStagger));
      });
      const lastLabelStart = vDashEnd + 20 + (labelOrder.length - 1) * labelStagger;

      return { doneAt: lastLabelStart + 30, timers, applyFinal };
    },
  },

  radial7: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const cx = 80, cy = 84, r = 48;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + i * ((2 * Math.PI) / 7);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        svg.appendChild(svgEl("line", { x1: cx, y1: cy, x2: x, y2: y, ...LINE, "stroke-width": "1" }));
        svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 2.6, fill: "currentColor", stroke: "none", class: "muda-thumb-node" }));
      }
      // Neutral like every other model at rest — the centre used to be a
      // fixed accent colour regardless of hover, which broke the "accent
      // only on hover" rule the other nine models follow.
      svg.appendChild(svgEl("circle", { cx, cy, r: 3, fill: "currentColor" }));
      return svg;
    },
    /* Eight evenly spaced directions (45 degrees apart); seven carry a
       solid radiating line, the eighth — the "remaining gap" once the
       seven are placed clockwise from the top — carries a shorter
       dashed line at reduced opacity. Radius shrinks on mobile so the
       eight labels keep their clearance on a narrow screen. */
    buildStage() {
      const m = isMobile();
      const cx = m ? 62 : 90, cy = m ? 65 : 92;
      const r = m ? 36 : 52, rDashed = m ? 28 : 42;
      const labelGap = m ? 10 : 13;
      const vb = m ? "-18 2 170 128" : MUDA_STAGE_VB;
      const svg = svgEl("svg", { viewBox: vb, draggable: "false" });

      const centreOuter = svgEl("g", { transform: "translate(" + cx + "," + cy + ")" });
      const centreInner = svgEl("circle", { cx: 0, cy: 0, r: 4, class: "muda-centre", fill: "currentColor", style: "color: var(--red);" });
      centreInner.style.transform = "scale(0)";
      centreInner.style.transformOrigin = "center";
      centreOuter.appendChild(centreInner);
      svg.appendChild(centreOuter);

      const rad = Math.PI / 180;
      MUDA_NODES.forEach((n, i) => {
        const a = n.angle * rad;
        const ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
        const line = svgEl("line", { x1: cx, y1: cy, x2: ex, y2: ey, ...LINE, "stroke-width": "1", class: "muda-line muda-line-" + i, pathLength: "1" });
        line.style.strokeDasharray = "1"; line.style.strokeDashoffset = "1";
        svg.appendChild(line);

        const node = svgEl("circle", { cx: ex, cy: ey, r: 3.2, class: "muda-node muda-node-" + i, fill: "currentColor" });
        node.style.opacity = "0";
        svg.appendChild(node);

        const labelR = r + labelGap;
        const lx = cx + Math.cos(a) * labelR, ly = cy + Math.sin(a) * labelR;
        const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
        svg.appendChild(svgText(lx, ly, anchor, n.label, "tool-label neutral muda-label muda-label-" + i));
      });

      const da = MUDA_DASHED.angle * rad;
      const dex = cx + Math.cos(da) * rDashed, dey = cy + Math.sin(da) * rDashed;
      const dashedLine = svgEl("line", { x1: cx, y1: cy, x2: dex, y2: dey, fill: "none", stroke: "currentColor", "stroke-width": "1", "stroke-dasharray": "3 2.5", class: "muda-dashed-line" });
      dashedLine.style.transformOrigin = cx + "px " + cy + "px";
      dashedLine.style.transform = "scale(0)";
      dashedLine.style.opacity = "0.55";
      svg.appendChild(dashedLine);

      const dashedNode = svgEl("circle", { cx: dex, cy: dey, r: 3.2, class: "muda-dashed-node", fill: "currentColor" });
      dashedNode.style.opacity = "0";
      svg.appendChild(dashedNode);

      const dLabelR = rDashed + labelGap;
      const dlx = cx + Math.cos(da) * dLabelR, dly = cy + Math.sin(da) * dLabelR;
      const dAnchor = Math.cos(da) > 0.3 ? "start" : Math.cos(da) < -0.3 ? "end" : "middle";
      svg.appendChild(svgText(dlx, dly, dAnchor, MUDA_DASHED.label, "tool-label neutral dim muda-label muda-dashed-label"));

      return svg;
    },
    assemble(diagramEl) {
      const centre = diagramEl.querySelector(".muda-centre");
      const lines = Array.from({ length: 7 }, (_, i) => diagramEl.querySelector(".muda-line-" + i));
      const nodes = Array.from({ length: 7 }, (_, i) => diagramEl.querySelector(".muda-node-" + i));
      const labelFor = (i) => diagramEl.querySelector(".muda-label-" + i);
      const dashedLine = diagramEl.querySelector(".muda-dashed-line");
      const dashedNode = diagramEl.querySelector(".muda-dashed-node");
      const dashedLabel = diagramEl.querySelector(".muda-dashed-label");

      function applyFinal() {
        centre.style.transition = "none"; centre.style.transform = "scale(1)";
        lines.forEach((l) => { l.style.transition = "none"; l.style.strokeDashoffset = "0"; });
        nodes.forEach((n) => { n.style.transition = "none"; n.style.opacity = "1"; });
        for (let i = 0; i < 7; i++) labelFor(i).classList.add("show");
        dashedLine.style.transition = "none"; dashedLine.style.transform = "scale(1)";
        dashedNode.style.transition = "none"; dashedNode.style.opacity = "0.55";
        dashedLabel.classList.add("show");
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const centreDur = 90;
      timers.push(setTimeout(() => {
        centre.style.transition = "transform " + centreDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        centre.style.transform = "scale(1)";
      }, 0));

      const lineDur = 70, lineStagger = 45, startAfterCentre = centreDur + 10;
      lines.forEach((l, i) => {
        const start = startAfterCentre + i * lineStagger;
        timers.push(setTimeout(() => { l.style.transition = "stroke-dashoffset " + lineDur + "ms ease"; l.style.strokeDashoffset = "0"; }, start));
        timers.push(setTimeout(() => {
          nodes[i].style.transition = "opacity 110ms ease";
          nodes[i].style.opacity = "1";
          labelFor(i).classList.add("show");
        }, start + lineDur));
      });
      const afterLines = startAfterCentre + (lines.length - 1) * lineStagger + lineDur;

      const dashedStart = afterLines + 25, dashedDur = 140, dashedEnd = dashedStart + dashedDur;
      timers.push(setTimeout(() => { dashedLine.style.transition = "transform " + dashedDur + "ms ease"; dashedLine.style.transform = "scale(1)"; }, dashedStart));
      timers.push(setTimeout(() => {
        dashedNode.style.transition = "opacity 110ms ease";
        dashedNode.style.opacity = "0.55";
        dashedLabel.classList.add("show");
      }, dashedEnd));

      return { doneAt: dashedEnd + 110, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(340px, calc(100vw - 3rem))" : "min(460px, 88vw)"; },
  },

  stakemap: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const cx = 80, cy = 82;
      svg.appendChild(svgEl("circle", { cx, cy, r: 60, ...LINE, "stroke-width": "1.2" }));
      svg.appendChild(svgEl("circle", { cx, cy, r: 40, ...LINE, "stroke-width": "1.2" }));
      svg.appendChild(svgEl("circle", { cx, cy, r: 20, fill: "currentColor", opacity: "0.25" }));
      svg.appendChild(svgEl("circle", { cx, cy, r: 20, ...LINE, "stroke-width": "1.2" }));
      return svg;
    },
    buildStage() {
      const nodeList = isMobile() ? STAKE_NODES_MOBILE : STAKE_NODES;
      const svg = svgEl("svg", { viewBox: STAKE_STAGE_VB, draggable: "false" });
      svg.style.opacity = "0";
      svg.style.transform = "scale(0.92)";
      svg.style.transformOrigin = "center center";

      const rings = [
        { key: "outer", r: STAKE.rOuter, label: "INDIRECT" },
        { key: "mid", r: STAKE.rMid, label: "SECONDARY" },
        { key: "inner", r: STAKE.rInner, label: "PRIMARY" },
      ];
      rings.forEach((ring) => {
        const circle = svgEl("circle", {
          cx: STAKE.cx, cy: STAKE.cy, r: ring.r, ...LINE, "stroke-width": "1.2",
          class: "stakemap-ring stakemap-ring-" + ring.key, pathLength: "1",
        });
        circle.style.strokeDasharray = "1";
        circle.style.strokeDashoffset = "1";
        svg.appendChild(circle);
      });

      const fill = svgEl("circle", {
        cx: STAKE.cx, cy: STAKE.cy, r: STAKE.rInner, fill: "currentColor",
        class: "stakemap-fill", style: "color: var(--red); opacity: 0;",
      });
      svg.appendChild(fill);

      rings.forEach((ring) => {
        const ly = STAKE.cy - ring.r - 5;
        svg.appendChild(svgText(STAKE.cx, ly, "middle", ring.label, "tool-label stakemap-ring-label stakemap-ring-label-" + ring.key));
      });

      const rad = Math.PI / 180;
      nodeList.forEach((n) => {
        const r = STAKE_NODE_R[n.ring];
        const a = n.angle * rad;
        const x = STAKE.cx + Math.cos(a) * r, y = STAKE.cy + Math.sin(a) * r;
        const g = svgEl("g", { class: "stakemap-node stakemap-node-" + n.key, transform: "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")" });
        g.style.opacity = "0";
        const w = 32, h = 11;
        g.appendChild(svgEl("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 3, ...LINE, fill: "var(--bg)", "stroke-width": "1" }));
        const nodeLabel = svgText(0, 1.5, "middle", n.label, "tool-label neutral stakemap-node-label");
        nodeLabel.classList.add("show");
        g.appendChild(nodeLabel);
        svg.appendChild(g);
      });

      return svg;
    },
    assemble(diagramEl) {
      const svgRoot = diagramEl;
      const nodeList = isMobile() ? STAKE_NODES_MOBILE : STAKE_NODES;
      const ringKeys = ["outer", "mid", "inner"];
      const ringEls = {};
      const ringLabelEls = {};
      ringKeys.forEach((k) => {
        ringEls[k] = diagramEl.querySelector(".stakemap-ring-" + k);
        ringLabelEls[k] = diagramEl.querySelector(".stakemap-ring-label-" + k);
      });
      const fillEl = diagramEl.querySelector(".stakemap-fill");
      const nodeEls = nodeList.map((n) => diagramEl.querySelector(".stakemap-node-" + n.key));

      function applyFinal() {
        svgRoot.style.transition = "none"; svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
        ringKeys.forEach((k) => {
          ringEls[k].style.transition = "none"; ringEls[k].style.strokeDashoffset = "0";
          ringLabelEls[k].classList.add("show");
        });
        fillEl.style.transition = "none"; fillEl.style.opacity = "0.25";
        nodeEls.forEach((n) => { n.style.transition = "none"; n.style.opacity = "1"; });
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const introDur = 130;
      timers.push(setTimeout(() => {
        svgRoot.style.transition = "opacity " + introDur + "ms ease, transform " + introDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
      }, 0));

      let t = introDur;
      const ringDurs = { outer: 160, mid: 140, inner: 120 };
      const labelDur = 90;
      ringKeys.forEach((k) => {
        const start = t;
        timers.push(setTimeout(() => {
          ringEls[k].style.transition = "stroke-dashoffset " + ringDurs[k] + "ms ease";
          ringEls[k].style.strokeDashoffset = "0";
        }, start));
        timers.push(setTimeout(() => { ringLabelEls[k].classList.add("show"); }, start + ringDurs[k]));
        if (k === "inner") {
          timers.push(setTimeout(() => {
            fillEl.style.transition = "opacity 90ms ease";
            fillEl.style.opacity = "0.25";
          }, start + ringDurs[k]));
        }
        t = start + ringDurs[k] + labelDur;
      });

      const nodeStagger = 35, nodeFade = 110;
      nodeEls.forEach((n, i) => {
        timers.push(setTimeout(() => {
          n.style.transition = "opacity " + nodeFade + "ms ease";
          n.style.opacity = "1";
        }, t + i * nodeStagger));
      });
      const doneAt = t + (nodeEls.length - 1) * nodeStagger + nodeFade;

      return { doneAt, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(320px, calc(100vw - 3rem))" : "min(460px, 88vw)"; },
  },

  reflect: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("ellipse", { cx: 55, cy: 80, rx: 22, ry: 38, ...LINE }));
      svg.appendChild(svgEl("ellipse", { cx: 105, cy: 80, rx: 22, ry: 38, ...LINE }));
      return svg;
    },
    buildStage() {
      const svg = svgEl("svg", { viewBox: REFLECT_STAGE_VB, draggable: "false" });
      svg.style.opacity = "0";
      svg.style.transform = "scale(0.92)";
      svg.style.transformOrigin = "center center";

      const left = svgEl("ellipse", { cx: REFLECT.leftCx, cy: REFLECT.cy, rx: REFLECT.rx, ry: REFLECT.ry, ...LINE, "stroke-width": "1.3", class: "reflect-ellipse reflect-ellipse-left", pathLength: "1" });
      const right = svgEl("ellipse", { cx: REFLECT.rightCx, cy: REFLECT.cy, rx: REFLECT.rx, ry: REFLECT.ry, ...LINE, "stroke-width": "1.3", class: "reflect-ellipse reflect-ellipse-right", pathLength: "1" });
      [left, right].forEach((e) => { e.style.strokeDasharray = "1"; e.style.strokeDashoffset = "1"; });
      svg.appendChild(left); svg.appendChild(right);

      svg.appendChild(svgText(REFLECT.leftCx, REFLECT.cy - 4, "middle", "MIND", "tool-label neutral reflect-label reflect-label-left"));
      svg.appendChild(svgText(REFLECT.leftCx, REFLECT.cy + 10, "middle", "(new) knowledge", "tool-label neutral reflect-sublabel reflect-sublabel-left"));
      svg.appendChild(svgText(REFLECT.rightCx, REFLECT.cy - 4, "middle", "SKETCH", "tool-label neutral reflect-label reflect-label-right"));
      svg.appendChild(svgText(REFLECT.rightCx, REFLECT.cy + 10, "middle", "representation", "tool-label neutral reflect-sublabel reflect-sublabel-right"));

      const upperArc = svgEl("path", { d: REFLECT_UPPER_ARC_D, fill: "none", stroke: "currentColor", "stroke-width": "1.3", "stroke-linecap": "round", class: "reflect-arc reflect-arc-upper", pathLength: "1" });
      const lowerArc = svgEl("path", { d: REFLECT_LOWER_ARC_D, fill: "none", stroke: "currentColor", "stroke-width": "1.3", "stroke-linecap": "round", class: "reflect-arc reflect-arc-lower", pathLength: "1" });
      [upperArc, lowerArc].forEach((a) => { a.style.strokeDasharray = "1"; a.style.strokeDashoffset = "1"; });
      svg.appendChild(upperArc); svg.appendChild(lowerArc);

      const upperArrow = arrowHead(140, 38, 39, "reflect-arrow reflect-arrow-upper");
      const lowerArrow = arrowHead(60, 142, -148, "reflect-arrow reflect-arrow-lower");
      [upperArrow, lowerArrow].forEach((a) => { a.style.opacity = "0"; });
      svg.appendChild(upperArrow); svg.appendChild(lowerArrow);

      svg.appendChild(svgText(100, 4, "middle", "CREATE", "tool-label reflect-arc-label reflect-arc-label-upper"));
      svg.appendChild(svgText(100, 10, "middle", "(seeing that)", "tool-label reflect-arc-sublabel reflect-arc-sublabel-upper"));
      svg.appendChild(svgText(100, 178, "middle", "READ", "tool-label reflect-arc-label reflect-arc-label-lower"));
      svg.appendChild(svgText(100, 184, "middle", "(seeing as)", "tool-label reflect-arc-sublabel reflect-arc-sublabel-lower"));

      return svg;
    },
    assemble(diagramEl) {
      const svgRoot = diagramEl;
      const ellipses = ["left", "right"].map((k) => diagramEl.querySelector(".reflect-ellipse-" + k));
      const innerLabels = ["left", "right"].flatMap((k) => [diagramEl.querySelector(".reflect-label-" + k), diagramEl.querySelector(".reflect-sublabel-" + k)]);
      const upperArc = diagramEl.querySelector(".reflect-arc-upper");
      const lowerArc = diagramEl.querySelector(".reflect-arc-lower");
      const upperArrow = diagramEl.querySelector(".reflect-arrow-upper");
      const lowerArrow = diagramEl.querySelector(".reflect-arrow-lower");
      const upperLabels = [diagramEl.querySelector(".reflect-arc-label-upper"), diagramEl.querySelector(".reflect-arc-sublabel-upper")];
      const lowerLabels = [diagramEl.querySelector(".reflect-arc-label-lower"), diagramEl.querySelector(".reflect-arc-sublabel-lower")];

      function applyFinal() {
        svgRoot.style.transition = "none"; svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
        ellipses.forEach((e) => { e.style.transition = "none"; e.style.strokeDashoffset = "0"; });
        innerLabels.forEach((l) => l.classList.add("show"));
        [upperArc, lowerArc].forEach((a) => { a.style.transition = "none"; a.style.strokeDashoffset = "0"; });
        [upperArrow, lowerArrow].forEach((a) => { a.style.transition = "none"; a.style.opacity = "1"; });
        upperLabels.forEach((l) => l.classList.add("show"));
        lowerLabels.forEach((l) => l.classList.add("show"));
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const introDur = 130;
      timers.push(setTimeout(() => {
        svgRoot.style.transition = "opacity " + introDur + "ms ease, transform " + introDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
      }, 0));

      const ellipseDur = 180;
      timers.push(setTimeout(() => {
        ellipses.forEach((e) => { e.style.transition = "stroke-dashoffset " + ellipseDur + "ms ease"; e.style.strokeDashoffset = "0"; });
      }, introDur));
      const afterEllipses = introDur + ellipseDur;
      timers.push(setTimeout(() => { innerLabels.forEach((l) => l.classList.add("show")); }, afterEllipses));
      let t = afterEllipses + 100;

      const arcDur = 150, arrowDur = 80, labelDur = 80;
      timers.push(setTimeout(() => { upperArc.style.transition = "stroke-dashoffset " + arcDur + "ms ease"; upperArc.style.strokeDashoffset = "0"; }, t));
      timers.push(setTimeout(() => { upperArrow.style.transition = "opacity " + arrowDur + "ms ease"; upperArrow.style.opacity = "1"; }, t + arcDur));
      timers.push(setTimeout(() => { upperLabels.forEach((l) => l.classList.add("show")); }, t + arcDur + arrowDur));
      t = t + arcDur + arrowDur + labelDur;

      timers.push(setTimeout(() => { lowerArc.style.transition = "stroke-dashoffset " + arcDur + "ms ease"; lowerArc.style.strokeDashoffset = "0"; }, t));
      timers.push(setTimeout(() => { lowerArrow.style.transition = "opacity " + arrowDur + "ms ease"; lowerArrow.style.opacity = "1"; }, t + arcDur));
      timers.push(setTimeout(() => { lowerLabels.forEach((l) => l.classList.add("show")); }, t + arcDur + arrowDur));
      const doneAt = t + arcDur + arrowDur + labelDur;

      return { doneAt, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(380px, calc(100vw - 3rem))" : "min(520px, 90vw)"; },
  },

  lotus: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const size = 26, gap = 10, pitch = size + gap;
      const x0 = 80 - (pitch * 3 - gap) / 2, y0 = 80 - (pitch * 3 - gap) / 2;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = x0 + c * pitch, y = y0 + r * pitch;
          const isCentre = r === 1 && c === 1;
          svg.appendChild(svgEl("rect", { x, y, width: size, height: size, ...LINE, fill: isCentre ? "currentColor" : "none", opacity: isCentre ? "0.25" : "1" }));
        }
      }
      return svg;
    },
    buildStage() {
      const narrow = window.innerWidth < 500;
      const svg = svgEl("svg", { viewBox: LOTUS_STAGE_VB, draggable: "false" });
      svg.style.opacity = "0";
      svg.style.transform = "scale(0.92)";
      svg.style.transformOrigin = "center center";

      function blockGrid(bx, by, withInternalLines) {
        const g = svgEl("g", {});
        const s = LOTUS.blockSize;
        g.appendChild(svgEl("rect", { x: bx, y: by, width: s, height: s, ...LINE, "stroke-width": "1", fill: "none" }));
        if (withInternalLines) {
          [8.5, 17.5].forEach((off) => {
            g.appendChild(svgEl("line", { x1: bx + off, y1: by, x2: bx + off, y2: by + s, stroke: "currentColor", "stroke-width": "0.4", opacity: "0.5" }));
            g.appendChild(svgEl("line", { x1: bx, y1: by + off, x2: bx + s, y2: by + off, stroke: "currentColor", "stroke-width": "0.4", opacity: "0.5" }));
          });
        }
        return g;
      }

      const centre = lotusBlockXY(1, 1);
      const centreGroup = svgEl("g", { class: "lotus-centre-block" });
      centreGroup.style.opacity = "0";
      centreGroup.appendChild(blockGrid(centre.x, centre.y, true));
      svg.appendChild(centreGroup);

      const centreFill = svgEl("rect", {
        x: centre.x + LOTUS_CELL_PITCH, y: centre.y + LOTUS_CELL_PITCH,
        width: LOTUS.cellSize, height: LOTUS.cellSize,
        fill: "currentColor", class: "lotus-centre-fill", style: "color: var(--red); opacity: 0;",
      });
      svg.appendChild(centreFill);

      LOTUS_DIRS.forEach((d) => {
        const cell = lotusCellXY(centre.x, centre.y, d.dc, d.dr);
        const lx = cell.x + LOTUS.cellSize / 2, ly = cell.y + LOTUS.cellSize / 2 + 1.4;
        svg.appendChild(svgText(lx, ly, "middle", d.key, "tool-label lotus-letter lotus-letter-centre-" + d.key));
      });

      const outerGroups = [];
      LOTUS_DIRS.forEach((d) => {
        const macro = lotusBlockXY(d.dc, d.dr);
        const g = svgEl("g", { class: "lotus-outer-block lotus-outer-block-" + d.key });
        g.style.opacity = "0";
        g.appendChild(blockGrid(macro.x, macro.y, !narrow));
        const cell = lotusCellXY(macro.x, macro.y, 1, 1);
        const letter = svgText(cell.x + LOTUS.cellSize / 2, cell.y + LOTUS.cellSize / 2 + 1.4, "middle", d.key, "lotus-letter");
        letter.style.fill = "var(--red)";
        g.appendChild(letter);
        svg.appendChild(g);
        outerGroups.push(g);
      });

      return svg;
    },
    assemble(diagramEl) {
      const svgRoot = diagramEl;
      const centreGroup = diagramEl.querySelector(".lotus-centre-block");
      const centreFill = diagramEl.querySelector(".lotus-centre-fill");
      const centreLetters = LOTUS_DIRS.map((d) => diagramEl.querySelector(".lotus-letter-centre-" + d.key));
      const outerGroups = LOTUS_DIRS.map((d) => diagramEl.querySelector(".lotus-outer-block-" + d.key));

      function applyFinal() {
        svgRoot.style.transition = "none"; svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
        centreGroup.style.transition = "none"; centreGroup.style.opacity = "1";
        centreFill.style.transition = "none"; centreFill.style.opacity = "0.25";
        centreLetters.forEach((l) => l.classList.add("show"));
        outerGroups.forEach((g) => { g.style.transition = "none"; g.style.opacity = "1"; });
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const introDur = 110;
      timers.push(setTimeout(() => {
        svgRoot.style.transition = "opacity " + introDur + "ms ease, transform " + introDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
      }, 0));

      const blockFadeDur = 130;
      timers.push(setTimeout(() => {
        centreGroup.style.transition = "opacity " + blockFadeDur + "ms ease";
        centreGroup.style.opacity = "1";
      }, introDur));
      const fillDur = 90;
      timers.push(setTimeout(() => {
        centreFill.style.transition = "opacity " + fillDur + "ms ease";
        centreFill.style.opacity = "0.25";
      }, introDur + blockFadeDur));
      let t = introDur + blockFadeDur + fillDur;

      const letterStagger = 35;
      centreLetters.forEach((l, i) => {
        timers.push(setTimeout(() => l.classList.add("show"), t + i * letterStagger));
      });
      t = t + (centreLetters.length - 1) * letterStagger + 80;

      const outerStagger = 55, outerFadeDur = 90;
      outerGroups.forEach((g, i) => {
        timers.push(setTimeout(() => {
          g.style.transition = "opacity " + outerFadeDur + "ms ease";
          g.style.opacity = "1";
        }, t + i * outerStagger));
      });
      const doneAt = t + (outerGroups.length - 1) * outerStagger + outerFadeDur;

      return { doneAt, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(300px, calc(100vw - 3rem))" : "min(420px, 86vw)"; },
  },

  squiggle: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const raw = squigglePoints(true);
      const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const pad = 20;
      const sx = (160 - pad * 2) / (maxX - minX), sy = (160 - pad * 2) / (maxY - minY);
      const pts = raw.map(([x, y]) => [pad + (x - minX) * sx, pad + (y - minY) * sy]);
      svg.appendChild(svgEl("path", { d: squigglePathD(pts), fill: "none", stroke: "currentColor", "stroke-width": "1.3", "stroke-linecap": "round" }));
      return svg;
    },
    buildStage() {
      const mobile = isMobile();
      const svg = svgEl("svg", { viewBox: SQUIGGLE_STAGE_VB, draggable: "false" });
      svg.style.opacity = "0";
      svg.style.transform = "scale(0.92)";
      svg.style.transformOrigin = "center center";

      const upperRule = svgEl("line", { x1: 0, y1: 30, x2: 224, y2: 30, stroke: "currentColor", "stroke-width": "0.8", class: "squiggle-rule squiggle-rule-upper", pathLength: "1" });
      const lowerRule = svgEl("line", { x1: 0, y1: 150, x2: 224, y2: 150, stroke: "currentColor", "stroke-width": "0.8", class: "squiggle-rule squiggle-rule-lower", pathLength: "1" });
      [upperRule, lowerRule].forEach((l) => { l.style.strokeDasharray = "1"; l.style.strokeDashoffset = "1"; });
      svg.appendChild(upperRule); svg.appendChild(lowerRule);

      const pts = squigglePoints(mobile);
      const squigglePath = svgEl("path", { d: squigglePathD(pts), fill: "none", stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "round", class: "squiggle-line", pathLength: "1" });
      squigglePath.style.strokeDasharray = "1";
      squigglePath.style.strokeDashoffset = "1";
      svg.appendChild(squigglePath);

      const bandGroup = svgEl("g", { class: "squiggle-band" });
      bandGroup.style.opacity = "0";
      const uncertaintyLabel = svgText(4, 16, "start", "UNCERTAINTY / PATTERNS / INSIGHTS", "tool-label neutral squiggle-band-label");
      uncertaintyLabel.classList.add("show");
      bandGroup.appendChild(uncertaintyLabel);
      const clarityLabel = svgText(220, 16, "end", "CLARITY / FOCUS", "tool-label neutral squiggle-band-label");
      clarityLabel.classList.add("show");
      bandGroup.appendChild(clarityLabel);
      bandGroup.appendChild(svgEl("line", { x1: 112, y1: 4, x2: 112, y2: 24, stroke: "currentColor", "stroke-width": "0.6", "stroke-dasharray": "1.5 1.5", opacity: "0.4" }));
      svg.appendChild(bandGroup);

      SQUIGGLE_MARKERS.forEach((m) => {
        const g = svgEl("g", { class: "squiggle-marker squiggle-marker-" + m.key, transform: "translate(" + m.x + ",162)" });
        g.style.opacity = "0";
        g.appendChild(svgEl("polygon", { points: "0,-5 5,4 -5,4", ...LINE, "stroke-width": "1", fill: "none" }));
        const label = svgText(0, 16, "middle", m.label, m.accent ? "tool-label squiggle-marker-label" : "tool-label neutral squiggle-marker-label");
        label.classList.add("show");
        g.appendChild(label);
        svg.appendChild(g);
      });

      return svg;
    },
    assemble(diagramEl) {
      const svgRoot = diagramEl;
      const upperRule = diagramEl.querySelector(".squiggle-rule-upper");
      const lowerRule = diagramEl.querySelector(".squiggle-rule-lower");
      const squigglePath = diagramEl.querySelector(".squiggle-line");
      const bandGroup = diagramEl.querySelector(".squiggle-band");
      const markers = SQUIGGLE_MARKERS.map((m) => diagramEl.querySelector(".squiggle-marker-" + m.key));

      function applyFinal() {
        svgRoot.style.transition = "none"; svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
        [upperRule, lowerRule, squigglePath].forEach((el) => { el.style.transition = "none"; el.style.strokeDashoffset = "0"; });
        bandGroup.style.transition = "none"; bandGroup.style.opacity = "1";
        markers.forEach((m) => { m.style.transition = "none"; m.style.opacity = "1"; });
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const introDur = 110;
      timers.push(setTimeout(() => {
        svgRoot.style.transition = "opacity " + introDur + "ms ease, transform " + introDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
      }, 0));

      const ruleDur = 130;
      timers.push(setTimeout(() => {
        [upperRule, lowerRule].forEach((r) => { r.style.transition = "stroke-dashoffset " + ruleDur + "ms ease"; r.style.strokeDashoffset = "0"; });
      }, introDur));

      const squiggleStart = introDur + ruleDur + 20, squiggleDur = 550;
      timers.push(setTimeout(() => {
        squigglePath.style.transition = "stroke-dashoffset " + squiggleDur + "ms linear";
        squigglePath.style.strokeDashoffset = "0";
      }, squiggleStart));
      const afterSquiggle = squiggleStart + squiggleDur;

      const bandDur = 110;
      timers.push(setTimeout(() => {
        bandGroup.style.transition = "opacity " + bandDur + "ms ease";
        bandGroup.style.opacity = "1";
      }, afterSquiggle));

      const markerStagger = 60, markerDur = 90;
      markers.forEach((m, i) => {
        timers.push(setTimeout(() => {
          m.style.transition = "opacity " + markerDur + "ms ease";
          m.style.opacity = "1";
        }, afterSquiggle + bandDur + i * markerStagger));
      });
      const doneAt = afterSquiggle + bandDur + (markers.length - 1) * markerStagger + markerDur;

      return { doneAt, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(380px, calc(100vw - 3rem))" : "min(560px, 92vw)"; },
  },

  sixbysix: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      for (let i = 0; i < 6; i++) {
        const y = 20 + i * 20;
        svg.appendChild(svgEl("line", { x1: 20, y1: y, x2: 60, y2: y, stroke: "currentColor", "stroke-width": "1" }));
        svg.appendChild(svgEl("circle", { cx: 75, cy: y, r: 5, ...LINE }));
      }
      return svg;
    },
    buildStage() {
      const svg = svgEl("svg", { viewBox: SIXBYSIX_STAGE_VB, draggable: "false" });
      svg.style.opacity = "0";
      svg.style.transform = "scale(0.92)";
      svg.style.transformOrigin = "center center";

      SIXBYSIX_ROWS.forEach((row, i) => {
        const cy = sixbysixRowCY(i);
        svg.appendChild(svgText(SIXBYSIX.labelX, cy + 2, "start", row.question, "tool-label sixbysix-question sixbysix-question-" + row.key));

        const connector = svgEl("line", {
          x1: SIXBYSIX.connectorX0, y1: cy, x2: SIXBYSIX.connectorX1, y2: cy,
          stroke: "currentColor", "stroke-width": "1", class: "sixbysix-connector sixbysix-connector-" + row.key, pathLength: "1",
        });
        connector.style.strokeDasharray = "1";
        connector.style.strokeDashoffset = "1";
        svg.appendChild(connector);

        const iconGroup = svgEl("g", {
          class: "sixbysix-icon sixbysix-icon-" + row.key,
          transform: "translate(" + SIXBYSIX.iconX + "," + (cy - SIXBYSIX.iconSize / 2) + ")",
        });
        iconGroup.style.opacity = "0";
        iconGroup.appendChild(sixbysixIcon(row.icon));
        svg.appendChild(iconGroup);
      });

      return svg;
    },
    assemble(diagramEl) {
      const svgRoot = diagramEl;
      const rows = SIXBYSIX_ROWS.map((row) => ({
        label: diagramEl.querySelector(".sixbysix-question-" + row.key),
        connector: diagramEl.querySelector(".sixbysix-connector-" + row.key),
        icon: diagramEl.querySelector(".sixbysix-icon-" + row.key),
      }));

      function applyFinal() {
        svgRoot.style.transition = "none"; svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
        rows.forEach((r) => {
          r.label.classList.add("show");
          r.connector.style.transition = "none"; r.connector.style.strokeDashoffset = "0";
          r.icon.style.transition = "none"; r.icon.style.opacity = "1";
        });
      }

      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }

      const timers = [];
      const introDur = 110;
      timers.push(setTimeout(() => {
        svgRoot.style.transition = "opacity " + introDur + "ms ease, transform " + introDur + "ms cubic-bezier(0.2,0.8,0.3,1.3)";
        svgRoot.style.opacity = "1"; svgRoot.style.transform = "scale(1)";
      }, 0));

      const rowStagger = 120, labelDur = 45, connectorDur = 50, iconDur = 70;
      rows.forEach((r, i) => {
        const start = introDur + i * rowStagger;
        timers.push(setTimeout(() => { r.label.classList.add("show"); }, start));
        timers.push(setTimeout(() => {
          r.connector.style.transition = "stroke-dashoffset " + connectorDur + "ms ease";
          r.connector.style.strokeDashoffset = "0";
        }, start + labelDur * 0.5));
        timers.push(setTimeout(() => {
          r.icon.style.transition = "opacity " + iconDur + "ms ease";
          r.icon.style.opacity = "1";
        }, start + labelDur * 0.5 + connectorDur));
      });
      const lastStart = introDur + (rows.length - 1) * rowStagger;
      const doneAt = lastStart + labelDur * 0.5 + connectorDur + iconDur;

      return { doneAt, timers, applyFinal };
    },
    stageWidth(mobile) { return mobile ? "min(360px, calc(100vw - 3rem))" : "min(520px, 90vw)"; },
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
    strongFor: "Making the difference between pull and pressure impossible to ignore once you have seen where your own design sits.",
    howIUse: "Mostly when reviewing loyalty programmes. Mapping the mechanics against the eight drives shows within an hour whether members are being invited or cornered.",
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
  {
    id: "business-model-canvas",
    slug: "business-model-canvas",
    diagram: "grid9",
    ready: true,
    shortName: "Business Model Canvas",
    name: "Business Model Canvas",
    attribution: "Alexander Osterwalder and Yves Pigneur, Business Model Generation, 2010",
    whatItIs: "Nine blocks covering who it is for, what it delivers, how it reaches people, and what it costs and earns.",
    strongFor: "Showing that a product idea is not yet a business. The gaps are the output, not the filled blocks.",
    howIUse: "When someone wants to build something but cannot say who pays, or what it costs to keep alive once it exists. The cost side is where enthusiasm usually dies.",
    watchOut: "It describes a model, it does not validate one. A completed canvas is a hypothesis with nine parts, not evidence.",
    source: "https://www.strategyzer.com/library/the-business-model-canvas",
  },
  {
    id: "empathy-map",
    slug: "empathy-map",
    diagram: "grid6",
    ready: true,
    shortName: "Empathy Map",
    name: "Empathy Map",
    attribution: "Dave Gray, XPLANE, in Gamestorming, 2010",
    whatItIs: "What a person sees, hears, says, does, thinks and feels, plus their pains and gains.",
    strongFor: "Separating what people say from what they actually do. The gap between those two is where most service problems live.",
    howIUse: "One per archetype, as direct input to the blueprint. On its own it tells you about a person. Connected to a service, it changes decisions.",
    watchOut: "Built on assumptions rather than research, it is worse than nothing, because it makes guesses look like insight.",
    source: "https://gamestorming.com/empathy-map/",
  },
  {
    id: "service-blueprint",
    slug: "service-blueprint",
    diagram: "layered",
    ready: true,
    shortName: "Service Blueprint",
    name: "Service Blueprint",
    attribution: "After G. Lynn Shostack, Harvard Business Review, 1984",
    whatItIs: "The visible journey above the line, and everything that has to happen behind it: staff, systems and support processes.",
    strongFor: "The parts of a service the customer never sees but always feels.",
    howIUse: "One per archetype, split into before, during and after. Most failures I have found were not in the interface. They were two lines below it.",
    watchOut: "It gets long fast. One archetype, one journey. A blueprint that tries to cover everyone covers nobody.",
    source: "https://hbr.org/1984/01/designing-services-that-deliver",
  },
  {
    id: "value-complexity",
    slug: "value-complexity",
    diagram: "matrix",
    ready: true,
    shortName: "Value / Complexity",
    name: "Value / Complexity Matrix",
    attribution: "No single origin",
    whatItIs: "Value on one axis, complexity and cost on the other.",
    strongFor: "Making a prioritisation conversation short, and forcing people to name what they will not do.",
    howIUse: "To decide sequence within a quadrant, not whether something should be done at all. The matrix ranks work. It does not decide strategy.",
    watchOut: "Both axes are estimates, and the effort axis is usually the one being guessed at. Ask who filled it in and what they were assuming.",
    sources: [{ label: "I built my own version of this. Try it", url: "../validator/", internal: true }],
  },
  {
    id: "muda",
    slug: "muda",
    diagram: "radial7",
    ready: true,
    shortName: "Seven Wastes",
    name: "Muda: The Seven Wastes",
    attribution: "Taiichi Ohno, Toyota Production System",
    whatItIs: "Seven categories of waste from the Toyota Production System. An eighth, unused talent, was added decades later, which is why it sits apart.",
    strongFor: "Looking at a service from the inside, which none of the other tools on this page do.",
    howIUse: "As a checklist when building a business case. The savings side is usually thin because nobody counted the waste, and waiting and over-processing are the two that hide best in service work.",
    watchOut: "Built for factories. Applied literally to a service it produces nonsense, so treat the seven as prompts rather than categories.",
    source: "https://en.wikipedia.org/wiki/Muda_(Japanese_term)",
  },
  {
    id: "stakeholder-map",
    slug: "stakeholder-map",
    diagram: "stakemap",
    ready: true,
    shortName: "Stakeholder Map",
    name: "Stakeholder Map",
    attribution: "No single origin. Stakeholder theory: R. Edward Freeman, 1984",
    whatItIs: "Everyone affected by a service, arranged by how close they sit to the decision. Primary in the centre, secondary around them, indirect on the outside.",
    strongFor: "Finding the person nobody invited to the meeting who can still stop the project.",
    howIUse: "Before a project starts, and again when it stalls. A stalled project usually has a stakeholder sitting in the wrong ring.",
    watchOut: "Closeness is not influence. Someone in the outer ring with a veto belongs in the middle, whatever the org chart says.",
  },
  {
    id: "reflective-sketching",
    slug: "reflective-sketching",
    diagram: "reflect",
    ready: true,
    shortName: "Reflective Sketching",
    name: "The Reflective Sketching Loop",
    attribution: "Bill Buxton, Sketching User Experiences, 2007",
    whatItIs: "You sketch what you are thinking, then read the sketch and learn something you did not know before you drew it. Create, then read, then create again.",
    strongFor: "Explaining why sketching is thinking rather than documenting. The sketch talks back.",
    howIUse: "When a room is stuck arguing in the abstract. Ten minutes of drawing settles more than an hour of discussion, because everyone is finally looking at the same thing.",
    watchOut: "It only works if the sketch is rough enough to argue with. A polished mockup stops the loop, because nobody wants to redraw something that looks finished.",
    source: "https://www.sciencedirect.com/book/9780123740373/sketching-user-experiences",
  },
  {
    id: "lotus-blossom",
    slug: "lotus-blossom",
    diagram: "lotus",
    ready: true,
    shortName: "Lotus Blossom",
    name: "Lotus Blossom",
    attribution: "Yasuo Matsumura, Clover Management Research, Japan, 1980s",
    whatItIs: "A central theme surrounded by eight related themes. Each of those eight then becomes a centre of its own with eight more, so nine cells become eighty one.",
    strongFor: "Getting past the three ideas everyone in the room already had. The structure forces you to keep going after the obvious ones run out.",
    howIUse: "When a brainstorm keeps circling the same answers. The good ideas usually arrive after the easy ones are used up.",
    watchOut: "Eighty one cells is a lot of paper and most of it is filler. Expand only the branches that are actually going somewhere.",
    source: "https://innovationmanagement.se/2004/10/21/creative-thinking-technique-lotus-blossom/",
  },
  {
    id: "design-squiggle",
    slug: "design-squiggle",
    diagram: "squiggle",
    ready: true,
    shortName: "Design Squiggle",
    name: "The Design Squiggle",
    attribution: "Damien Newman, Central, 2003",
    whatItIs: "One line from mess to clarity. Chaos on the left, a single straight line on the right, and no shortcut between them.",
    strongFor: "Managing expectations upward. It answers why there is no solution yet after three weeks.",
    howIUse: "At the start of a project, once, with whoever is paying for it. Showing people the shape of the process in advance is the difference between patience and panic.",
    watchOut: "It describes how the work feels, not how to do it. Nobody ever built anything from the squiggle, and treating it as a method is how you end up with mess and no clarity.",
    source: "https://thedesignsquiggle.com/about",
  },
  {
    id: "six-by-six",
    slug: "six-by-six",
    diagram: "sixbysix",
    ready: true,
    shortName: "6x6 Rule",
    name: "The 6x6 Rule",
    attribution: "Dan Roam, The Back of the Napkin, 2008",
    whatItIs: "Six questions, and for each one the picture type that answers it best. Who or what needs a portrait. How much needs a chart. Where needs a map. When needs a timeline. How needs a flowchart. Why needs a plot with more than one variable.",
    strongFor: "Deciding what to draw before you start drawing. Most bad slides are the right data in the wrong picture.",
    howIUse: "When preparing anything for a leadership audience. Working out which of the six questions I am actually answering usually reveals that I was about to answer a different one.",
    watchOut: "The pairings are a starting point, not a law. But if you are reaching for a bar chart to answer a why question, that is worth noticing.",
    source: "https://www.danroam.com",
  },
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
  // its own line with its own label. An internal link (e.g. to the
  // validator) uses its label as the link text itself, in the same
  // spot and style as an external source, rather than showing a raw
  // URL beside a "Source:" prefix.
  const sourceList = tool.sources || (tool.source ? [{ label: "Source", url: tool.source }] : []);
  if (sourceList.length === 0) return;
  const sourceWrap = document.createElement("div");
  sourceWrap.className = "tool-source";
  for (const { label, url, internal } of sourceList) {
    const line = document.createElement("p");
    const a = document.createElement("a");
    a.href = url;
    if (internal) {
      a.textContent = label;
      line.appendChild(a);
    } else {
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = url;
      line.append(label + ": ");
      line.appendChild(a);
    }
    sourceWrap.appendChild(line);
  }
  container.appendChild(sourceWrap);
}
