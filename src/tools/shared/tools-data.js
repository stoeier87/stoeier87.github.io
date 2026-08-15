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
  { key: "design", label: "DESIGN", x: 190, accent: false },
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


/* ── Helpers for the eight 2026 diagrams ─────────────────────
   One drawing idiom, three verbs: prepStroke arms an element for the
   dash-draw, runStroke plays it, snapStroke jumps to done (the reduced
   -motion path and the tap-to-skip path both end there). */
function prepStroke(el) {
  el.style.strokeDasharray = "1";
  el.style.strokeDashoffset = "1";
}
function runStroke(el, ms) {
  el.style.transition = "stroke-dashoffset " + ms + "ms ease";
  el.style.strokeDashoffset = "0";
}
function snapStroke(el) {
  el.style.transition = "none";
  el.style.strokeDashoffset = "0";
}

/* A REAN chevron: rectangle with a pointed right edge; every one after
   the first is notched on the left so it nests into its neighbour. */
function reanChevronPath(x, y, w, h, d, flatLeft) {
  const yMid = y + h / 2;
  let p = "M " + x + " " + y + " L " + (x + w - d) + " " + y + " L " + (x + w) + " " + yMid +
          " L " + (x + w - d) + " " + (y + h) + " L " + x + " " + (y + h);
  p += flatLeft ? " Z" : " L " + (x + d) + " " + yMid + " Z";
  return p;
}

/* The Peak-End experience line: several small bumps, one tall peak about
   two thirds along, a decline, then a modest rise at the very end. */
const PEAKEND_D_THUMB = "M 25 105 C 40 92, 48 110, 58 100 C 68 92, 74 108, 82 95 C 88 80, 92 58, 95 55 C 100 60, 108 92, 118 105 C 124 112, 130 98, 133 92";
const PEAKEND_D_STAGE =
  "M 30 122 C 48 108, 62 126, 78 114 C 94 104, 104 124, 122 112 C 140 102, 152 120, 168 108 " +
  "C 190 92, 214 52, 235 42 C 252 50, 268 92, 288 116 C 304 132, 322 118, 336 96";

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

  /* ────────────────────────────────────────────────────────────
     The eight 2026 additions. Same contract as everything above:
     thumb() for the overview, buildStage() for the subpage,
     assemble() returning { doneAt, timers, applyFinal }, every
     animation under 1.2s, reduced() jumping straight to final.
     Narrow-viewport degradations follow the brief: below 500px
     Kano drops its decay arrow and shortens labels, Core Model
     halves its chevrons and stacks the goal blocks, Crazy Eights
     moves the timer below the sheet.
     ──────────────────────────────────────────────────────────── */

  rean: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      for (let i = 0; i < 4; i++) {
        svg.appendChild(svgEl("path", { d: reanChevronPath(22 + i * 32, 62, 30, 36, 9, i === 0), ...LINE }));
      }
      svg.appendChild(svgEl("path", { d: "M 140 104 C 140 124, 62 124, 58 106", fill: "none", stroke: "currentColor", "stroke-width": "1.5" }));
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(380px, calc(100vw - 3rem))" : "min(560px, 90vw)"; },
    buildStage() {
      const svg = svgEl("svg", { viewBox: "0 0 360 150", draggable: "false" });
      const STAGES = ["REACH", "ENGAGE", "ACTIVATE", "NURTURE"];
      const OWNERS = ["MARKETING", "PRODUCT", "PRODUCT", "CRM"];
      const w = 78, d = 14, y = 30, h = 44, step = 80, x0 = 16;
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * step;
        const p = svgEl("path", { d: reanChevronPath(x, y, w, h, d, i === 0), ...LINE, pathLength: "1", class: "rean-chev rean-chev-" + i });
        prepStroke(p);
        svg.appendChild(p);
        const t = svgText(x + w / 2 + (i === 0 ? -2 : 5), y + h / 2 + 2.5, "middle", STAGES[i], "tool-label neutral rean-stage rean-stage-" + i);
        svg.appendChild(t);
        const tickX = x + w / 2 + 3;
        const tick = svgEl("path", { d: "M " + tickX + " " + (y + h + 8) + " L " + tickX + " " + (y + h + 16), fill: "none", stroke: "currentColor", "stroke-width": "1.2", class: "rean-own rean-own-" + i });
        tick.style.opacity = "0";
        svg.appendChild(tick);
        const ot = svgText(tickX, y + h + 27, "middle", OWNERS[i], "tool-label rean-ownlabel rean-own-" + i);
        svg.appendChild(ot);
      }
      // Return arc: right edge of NURTURE back under the row to ENGAGE's left edge.
      const arc = svgEl("path", { d: "M 332 78 C 332 126, 120 132, 99 84", fill: "none", stroke: "var(--red)", "stroke-width": "1.5", pathLength: "1", class: "rean-arc" });
      prepStroke(arc);
      svg.appendChild(arc);
      const head = arrowHead(99, 84, -115, "rean-arc-head");
      head.setAttribute("fill", "var(--red)");
      head.setAttribute("stroke", "var(--red)");
      head.style.opacity = "0";
      svg.appendChild(head);
      return svg;
    },
    assemble(el) {
      const chevs = [0, 1, 2, 3].map((i) => el.querySelector(".rean-chev-" + i));
      const stages = [0, 1, 2, 3].map((i) => el.querySelectorAll(".rean-stage-" + i)[0]);
      const owns = [...el.querySelectorAll(".rean-own")];
      const ownLabels = [...el.querySelectorAll(".rean-ownlabel")];
      const arc = el.querySelector(".rean-arc");
      const head = el.querySelector(".rean-arc-head");
      function applyFinal() {
        chevs.forEach((c) => snapStroke(c));
        stages.forEach((s) => s.classList.add("show"));
        owns.forEach((o) => { o.style.transition = "none"; o.style.opacity = "1"; });
        ownLabels.forEach((l) => l.classList.add("show"));
        snapStroke(arc);
        head.style.transition = "none";
        head.style.opacity = "1";
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      chevs.forEach((c, i) => {
        timers.push(setTimeout(() => { runStroke(c, 160); stages[i].classList.add("show"); }, i * 120));
      });
      timers.push(setTimeout(() => {
        owns.forEach((o) => { o.style.transition = "opacity 140ms ease"; o.style.opacity = "1"; });
        ownLabels.forEach((l) => l.classList.add("show"));
      }, 540));
      timers.push(setTimeout(() => { runStroke(arc, 280); }, 700));
      timers.push(setTimeout(() => { head.style.transition = "opacity 100ms ease"; head.style.opacity = "1"; }, 960));
      return { doneAt: 1060, timers, applyFinal };
    },
  },

  coremodel: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("rect", { x: 55, y: 60, width: 50, height: 40, ...LINE }));
      for (let i = 0; i < 3; i++) {
        svg.appendChild(svgEl("path", { d: "M 30 " + (66 + i * 12) + " l 12 0 l 5 4 l -5 4 l -12 0 z", ...LINE, "stroke-width": "1" }));
        svg.appendChild(svgEl("path", { d: "M 113 " + (66 + i * 12) + " l 12 0 l 5 4 l -5 4 l -12 0 z", ...LINE, "stroke-width": "1" }));
      }
      for (let i = 0; i < 3; i++) {
        svg.appendChild(svgEl("line", { x1: 60, y1: 42 + i * 5, x2: 76, y2: 42 + i * 5, ...LINE, "stroke-width": "1" }));
        svg.appendChild(svgEl("line", { x1: 84, y1: 42 + i * 5, x2: 100, y2: 42 + i * 5, ...LINE, "stroke-width": "1" }));
      }
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(360px, calc(100vw - 3rem))" : "min(540px, 90vw)"; },
    buildStage() {
      const narrow = window.innerWidth < 500;
      const svg = svgEl("svg", { viewBox: narrow ? "0 0 300 210" : "0 0 360 180", draggable: "false" });
      const R = narrow ? { x: 105, y: 96, w: 90, h: 74 } : { x: 130, y: 66, w: 100, h: 84 };
      const rect = svgEl("rect", { x: R.x, y: R.y, width: R.w, height: R.h, ...LINE, pathLength: "1", class: "cm-rect" });
      prepStroke(rect);
      svg.appendChild(rect);
      svg.appendChild(svgText(R.x + R.w / 2, R.y + R.h / 2 + 2.5, "middle", "CORE CONTENT", "tool-label neutral cm-corelabel cm-rectlabel"));

      const nCh = narrow ? 2 : 4;
      const chH = 16, chGap = narrow ? 10 : 5;
      const colH = nCh * chH + (nCh - 1) * chGap;
      const chY0 = R.y + (R.h - colH) / 2;
      const mkChev = (x, i, cls) => {
        const y = chY0 + i * (chH + chGap);
        const p = svgEl("path", { d: "M " + x + " " + y + " l 30 0 l 9 " + chH / 2 + " l -9 " + chH / 2 + " l -30 0 z", ...LINE, "stroke-width": "1.2", class: cls });
        p.style.opacity = "0";
        return p;
      };
      for (let i = 0; i < nCh; i++) {
        svg.appendChild(mkChev(R.x - 62, i, "cm-in cm-in-" + i));
        svg.appendChild(mkChev(R.x + R.w + 14, i, "cm-fwd cm-fwd-" + i));
      }
      svg.appendChild(svgText(R.x - 43, chY0 - 10, "middle", "INWARD PATHS", "tool-label neutral cm-colhead cm-pathlabel-in"));
      svg.appendChild(svgText(R.x + R.w + 37, chY0 - 10, "middle", "FORWARD PATHS", "tool-label neutral cm-colhead cm-pathlabel-fwd"));

      // Goal blocks: two stacks of ruled lines, side by side on desktop,
      // stacked vertically on narrow screens.
      const stacks = narrow
        ? [{ x: R.x + 8, y: 24, label: "BUSINESS GOALS" }, { x: R.x + 8, y: 58, label: "USER TASKS" }]
        : [{ x: R.x + 4, y: 30, label: "BUSINESS GOALS" }, { x: R.x + R.w / 2 + 6, y: 30, label: "USER TASKS" }];
      stacks.forEach((st, si) => {
        svg.appendChild(svgText(st.x + 20, st.y - 6, "middle", st.label, "tool-label neutral cm-colhead cm-goal-" + si));
        for (let i = 0; i < 3; i++) {
          const ln = svgEl("line", { x1: st.x, y1: st.y + i * 6, x2: st.x + 40, y2: st.y + i * 6, ...LINE, "stroke-width": "1", pathLength: "1", class: "cm-rule cm-rule-" + si });
          prepStroke(ln);
          svg.appendChild(ln);
        }
      });
      return svg;
    },
    assemble(el) {
      const rect = el.querySelector(".cm-rect");
      const rectLabel = el.querySelector(".cm-rectlabel");
      const rules = [...el.querySelectorAll(".cm-rule")];
      const goalLabels = [el.querySelector(".cm-goal-0"), el.querySelector(".cm-goal-1")];
      const ins = [...el.querySelectorAll(".cm-in")];
      const fwds = [...el.querySelectorAll(".cm-fwd")];
      const pathLabels = [el.querySelector(".cm-pathlabel-in"), el.querySelector(".cm-pathlabel-fwd")];
      function applyFinal() {
        snapStroke(rect);
        rectLabel.classList.add("show");
        rules.forEach(snapStroke);
        goalLabels.forEach((l) => l.classList.add("show"));
        [...ins, ...fwds].forEach((c) => { c.style.transition = "none"; c.style.opacity = "1"; });
        pathLabels.forEach((l) => l.classList.add("show"));
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      timers.push(setTimeout(() => { runStroke(rect, 240); }, 0));
      timers.push(setTimeout(() => rectLabel.classList.add("show"), 220));
      timers.push(setTimeout(() => {
        rules.forEach((r, i) => setTimeout(() => runStroke(r, 90), i * 25));
        goalLabels.forEach((l) => l.classList.add("show"));
      }, 300));
      ins.forEach((c, i) => timers.push(setTimeout(() => { c.style.transition = "opacity 110ms ease"; c.style.opacity = "1"; }, 560 + i * 70)));
      timers.push(setTimeout(() => pathLabels[0].classList.add("show"), 560));
      fwds.forEach((c, i) => timers.push(setTimeout(() => { c.style.transition = "opacity 110ms ease"; c.style.opacity = "1"; }, 840 + i * 70)));
      timers.push(setTimeout(() => pathLabels[1].classList.add("show"), 840));
      return { doneAt: 1120 + 110, timers, applyFinal };
    },
  },

  peakend: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("path", { d: "M 25 130 L 25 40 M 25 130 L 135 130", ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("path", { d: PEAKEND_D_THUMB, ...LINE }));
      svg.appendChild(svgEl("circle", { cx: 95, cy: 55, r: 4, fill: "currentColor", stroke: "none" }));
      svg.appendChild(svgEl("circle", { cx: 133, cy: 92, r: 4, fill: "currentColor", stroke: "none" }));
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(380px, calc(100vw - 3rem))" : "min(560px, 90vw)"; },
    buildStage() {
      const svg = svgEl("svg", { viewBox: "0 0 360 190", draggable: "false" });
      const axes = svgEl("path", { d: "M 30 20 L 30 155 L 340 155", ...LINE, "stroke-width": "1.2", pathLength: "1", class: "pe-axes" });
      prepStroke(axes);
      svg.appendChild(axes);
      svg.appendChild(svgText(30, 14, "middle", "INTENSITY", "tool-label neutral pe-axlabel pe-ax-0"));
      svg.appendChild(svgText(340, 168, "end", "TIME", "tool-label neutral pe-axlabel pe-ax-1"));
      const line = svgEl("path", { d: PEAKEND_D_STAGE, ...LINE, pathLength: "1", class: "pe-line" });
      prepStroke(line);
      svg.appendChild(line);
      const avg = svgEl("line", { x1: 34, y1: 108, x2: 336, y2: 108, stroke: "currentColor", "stroke-width": "1", "stroke-dasharray": "4 5", class: "pe-avg" });
      avg.style.opacity = "0";
      svg.appendChild(avg);
      svg.appendChild(svgText(40, 103, "start", "AVERAGE", "tool-label neutral dim pe-avglabel"));
      const peak = svgEl("circle", { cx: 235, cy: 42, r: 4.5, fill: "var(--red)", stroke: "none", class: "pe-peak" });
      peak.style.opacity = "0";
      svg.appendChild(peak);
      svg.appendChild(svgText(235, 28, "middle", "PEAK", "tool-label pe-peaklabel"));
      const end = svgEl("circle", { cx: 336, cy: 96, r: 4.5, fill: "var(--red)", stroke: "none", class: "pe-end" });
      end.style.opacity = "0";
      svg.appendChild(end);
      svg.appendChild(svgText(330, 132, "middle", "END", "tool-label pe-endlabel"));
      return svg;
    },
    assemble(el) {
      const axes = el.querySelector(".pe-axes");
      const axLabels = [...el.querySelectorAll(".pe-axlabel")];
      const line = el.querySelector(".pe-line");
      const avg = el.querySelector(".pe-avg");
      const avgLabel = el.querySelector(".pe-avglabel");
      const peak = el.querySelector(".pe-peak"), peakLabel = el.querySelector(".pe-peaklabel");
      const end = el.querySelector(".pe-end"), endLabel = el.querySelector(".pe-endlabel");
      function applyFinal() {
        snapStroke(axes); snapStroke(line);
        axLabels.forEach((l) => l.classList.add("show"));
        avg.style.transition = "none"; avg.style.opacity = "0.4";
        avgLabel.classList.add("show");
        [peak, end].forEach((d) => { d.style.transition = "none"; d.style.opacity = "1"; });
        peakLabel.classList.add("show"); endLabel.classList.add("show");
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      timers.push(setTimeout(() => { runStroke(axes, 220); axLabels.forEach((l) => l.classList.add("show")); }, 0));
      timers.push(setTimeout(() => { runStroke(line, 420); }, 200));
      timers.push(setTimeout(() => { avg.style.transition = "opacity 140ms ease"; avg.style.opacity = "0.4"; avgLabel.classList.add("show"); }, 650));
      timers.push(setTimeout(() => { peak.style.transition = "opacity 120ms ease"; peak.style.opacity = "1"; peakLabel.classList.add("show"); }, 840));
      timers.push(setTimeout(() => { end.style.transition = "opacity 120ms ease"; end.style.opacity = "1"; endLabel.classList.add("show"); }, 1000));
      return { doneAt: 1120, timers, applyFinal };
    },
  },

  kano: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("path", { d: "M 80 25 L 80 135 M 25 80 L 135 80", ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("path", { d: "M 30 125 C 60 70, 90 45, 130 35", ...LINE }));
      svg.appendChild(svgEl("path", { d: "M 30 125 L 130 40", ...LINE, "stroke-width": "1" }));
      svg.appendChild(svgEl("path", { d: "M 30 130 C 65 90, 95 78, 130 74", ...LINE, "stroke-width": "1" }));
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(360px, calc(100vw - 3rem))" : "min(540px, 90vw)"; },
    buildStage() {
      const narrow = window.innerWidth < 500;
      const svg = svgEl("svg", { viewBox: "0 0 340 205", draggable: "false" });
      const axes = svgEl("path", { d: "M 170 16 L 170 186 M 22 101 L 322 101", ...LINE, "stroke-width": "1.1", pathLength: "1", class: "kn-axes" });
      prepStroke(axes);
      svg.appendChild(axes);
      svg.appendChild(svgText(170, 10, "middle", "SATISFACTION", "tool-label neutral kn-axlabel"));
      svg.appendChild(svgText(322, 114, "end", "IMPLEMENTATION", "tool-label neutral kn-axlabel"));
      const L = narrow ? { d: "DELIGHT", p: "PERF", m: "MUST" } : { d: "DELIGHTER", p: "PERFORMANCE", m: "MUST-BE" };
      const mkCurve = (d, cls, stroke, w2) => {
        const p = svgEl("path", { d, fill: "none", stroke, "stroke-width": w2, "stroke-linecap": "round", pathLength: "1", class: cls });
        prepStroke(p);
        return p;
      };
      svg.appendChild(mkCurve("M 30 182 C 95 122, 160 104, 300 92", "kn-must", "rgba(255,255,255,0.45)", "1.3"));
      svg.appendChild(mkCurve("M 30 178 L 300 30", "kn-perf", "currentColor", "1.3"));
      svg.appendChild(mkCurve("M 30 132 C 120 128, 165 48, 300 24", "kn-delight", "var(--red)", "1.6"));
      svg.appendChild(svgText(305, 95, "start", L.m, "tool-label neutral dim kn-lab kn-lab-must"));
      svg.appendChild(svgText(305, 33, "start", L.p, "tool-label neutral kn-lab kn-lab-perf"));
      svg.appendChild(svgText(305, 21, "start", L.d, "tool-label kn-lab kn-lab-delight"));
      if (!narrow) {
        const decay = svgEl("path", { d: "M 218 38 C 232 52, 236 68, 230 84", fill: "none", stroke: "var(--red)", "stroke-width": "1.2", pathLength: "1", class: "kn-decay" });
        prepStroke(decay);
        svg.appendChild(decay);
        const head = arrowHead(230, 84, 105, "kn-decay-head");
        head.setAttribute("fill", "var(--red)");
        head.setAttribute("stroke", "var(--red)");
        head.style.opacity = "0";
        svg.appendChild(head);
        svg.appendChild(svgText(252, 47, "middle", "OVER TIME", "tool-label kn-decaylabel"));
      }
      return svg;
    },
    assemble(el) {
      const axes = el.querySelector(".kn-axes");
      const axLabels = [...el.querySelectorAll(".kn-axlabel")];
      const curves = ["must", "perf", "delight"].map((k) => el.querySelector(".kn-" + k));
      const labels = ["must", "perf", "delight"].map((k) => el.querySelector(".kn-lab-" + k));
      const decay = el.querySelector(".kn-decay");
      const decayHead = el.querySelector(".kn-decay-head");
      const decayLabel = el.querySelector(".kn-decaylabel");
      function applyFinal() {
        snapStroke(axes);
        axLabels.forEach((l) => l.classList.add("show"));
        curves.forEach(snapStroke);
        labels.forEach((l) => l.classList.add("show"));
        if (decay) { snapStroke(decay); decayHead.style.transition = "none"; decayHead.style.opacity = "1"; decayLabel.classList.add("show"); }
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      timers.push(setTimeout(() => { runStroke(axes, 200); axLabels.forEach((l) => l.classList.add("show")); }, 0));
      curves.forEach((c, i) => timers.push(setTimeout(() => { runStroke(c, 260); labels[i].classList.add("show"); }, 220 + i * 180)));
      if (decay) {
        timers.push(setTimeout(() => { runStroke(decay, 180); decayLabel.classList.add("show"); }, 860));
        timers.push(setTimeout(() => { decayHead.style.transition = "opacity 90ms ease"; decayHead.style.opacity = "1"; }, 1030));
      }
      return { doneAt: 1120, timers, applyFinal };
    },
  },

  doublediamond: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("polygon", { points: "20,80 55,48 90,80 55,112", ...LINE }));
      svg.appendChild(svgEl("polygon", { points: "90,80 125,48 160,80 125,112", ...LINE }));
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(380px, calc(100vw - 3rem))" : "min(600px, 92vw)"; },
    buildStage() {
      const svg = svgEl("svg", { viewBox: "0 0 380 190", draggable: "false" });
      const d1 = svgEl("path", { d: "M 30 95 L 105 35 L 180 95 L 105 155 Z", ...LINE, pathLength: "1", class: "dd-d1" });
      const d2 = svgEl("path", { d: "M 180 95 L 255 35 L 330 95 L 255 155 Z", ...LINE, pathLength: "1", class: "dd-d2" });
      [d1, d2].forEach(prepStroke);
      svg.appendChild(d1);
      svg.appendChild(d2);
      const mid = svgEl("line", { x1: 180, y1: 45, x2: 180, y2: 145, stroke: "currentColor", "stroke-width": "1", class: "dd-mid" });
      mid.style.opacity = "0";
      svg.appendChild(mid);
      const PHASES = [["DISCOVER", 67], ["DEFINE", 142], ["DEVELOP", 217], ["DELIVER", 292]];
      PHASES.forEach(([txt, x], i) => svg.appendChild(svgText(x, 24, "middle", txt, "tool-label neutral dd-phase dd-phase-" + i)));
      svg.appendChild(svgText(105, 176, "middle", "THE PROBLEM", "tool-label dd-lower dd-lower-0"));
      svg.appendChild(svgText(255, 176, "middle", "THE SOLUTION", "tool-label dd-lower dd-lower-1"));
      const ARROWS = [70, 140, 220, 290];
      ARROWS.forEach((x, i) => {
        const g = svgEl("g", { class: "dd-arrow dd-arrow-" + i });
        g.appendChild(svgEl("line", { x1: x - 9, y1: 95, x2: x + 5, y2: 95, stroke: "currentColor", "stroke-width": "1" }));
        const h = arrowHead(x + 6, 95, 0, "");
        h.setAttribute("fill", "currentColor");
        g.appendChild(h);
        g.style.opacity = "0";
        svg.appendChild(g);
      });
      return svg;
    },
    assemble(el) {
      const d1 = el.querySelector(".dd-d1"), d2 = el.querySelector(".dd-d2"), mid = el.querySelector(".dd-mid");
      const phases = [...el.querySelectorAll(".dd-phase")];
      const lowers = [...el.querySelectorAll(".dd-lower")];
      const arrows = [...el.querySelectorAll(".dd-arrow")];
      function applyFinal() {
        [d1, d2].forEach(snapStroke);
        mid.style.transition = "none"; mid.style.opacity = "0.5";
        phases.forEach((p) => p.classList.add("show"));
        lowers.forEach((l) => l.classList.add("show"));
        arrows.forEach((a) => { a.style.transition = "none"; a.style.opacity = "0.7"; });
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      timers.push(setTimeout(() => runStroke(d1, 260), 0));
      timers.push(setTimeout(() => runStroke(d2, 260), 240));
      timers.push(setTimeout(() => { mid.style.transition = "opacity 120ms ease"; mid.style.opacity = "0.5"; }, 480));
      phases.forEach((p, i) => timers.push(setTimeout(() => p.classList.add("show"), 540 + i * 80)));
      timers.push(setTimeout(() => lowers.forEach((l) => l.classList.add("show")), 880));
      timers.push(setTimeout(() => arrows.forEach((a) => { a.style.transition = "opacity 140ms ease"; a.style.opacity = "0.7"; }), 1000));
      return { doneAt: 1140, timers, applyFinal };
    },
  },

  fivewhys: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      const widths = [56, 74, 92, 110, 128];
      widths.forEach((w, i) => {
        svg.appendChild(svgEl("rect", { x: 80 - w / 2, y: 22 + i * 25, width: w, height: 12, ...LINE, "stroke-width": i === 4 ? "2" : "1.2" }));
        if (i < 4) svg.appendChild(svgEl("line", { x1: 80, y1: 34 + i * 25 + 2, x2: 80, y2: 34 + i * 25 + 9, ...LINE, "stroke-width": "1" }));
      });
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(320px, calc(100vw - 3rem))" : "min(440px, 86vw)"; },
    buildStage() {
      const svg = svgEl("svg", { viewBox: "0 0 300 215", draggable: "false" });
      const widths = [100, 130, 160, 190, 220];
      widths.forEach((w, i) => {
        const y = 12 + i * 40;
        const r = svgEl("rect", { x: 150 - w / 2, y, width: w, height: 20, ...LINE, "stroke-width": i === 4 ? "2.2" : "1.3", pathLength: "1", class: "fw-rect fw-rect-" + i });
        prepStroke(r);
        svg.appendChild(r);
        if (i < 4) {
          const ay = y + 24;
          const g = svgEl("g", { class: "fw-arrow fw-arrow-" + i });
          g.appendChild(svgEl("line", { x1: 150, y1: ay, x2: 150, y2: ay + 9, stroke: "currentColor", "stroke-width": "1.1" }));
          const h = arrowHead(150, ay + 10.5, 90, "");
          h.setAttribute("fill", "currentColor");
          g.appendChild(h);
          g.style.opacity = "0";
          svg.appendChild(g);
          svg.appendChild(svgText(162, ay + 9, "start", "WHY", "tool-label fw-why fw-why-" + i));
        }
      });
      svg.appendChild(svgText(150, 25, "middle", "SYMPTOM", "tool-label neutral dim fw-symptom"));
      svg.appendChild(svgText(150, 185, "middle", "CAUSE", "tool-label fw-cause"));
      return svg;
    },
    assemble(el) {
      const rects = [...el.querySelectorAll(".fw-rect")];
      const arrows = [...el.querySelectorAll(".fw-arrow")];
      const whys = [...el.querySelectorAll(".fw-why")];
      const symptom = el.querySelector(".fw-symptom");
      const cause = el.querySelector(".fw-cause");
      function applyFinal() {
        rects.forEach(snapStroke);
        arrows.forEach((a) => { a.style.transition = "none"; a.style.opacity = "0.8"; });
        whys.forEach((w) => w.classList.add("show"));
        symptom.classList.add("show");
        cause.classList.add("show");
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      timers.push(setTimeout(() => { runStroke(rects[0], 150); symptom.classList.add("show"); }, 0));
      for (let i = 0; i < 4; i++) {
        timers.push(setTimeout(() => {
          arrows[i].style.transition = "opacity 100ms ease";
          arrows[i].style.opacity = "0.8";
          whys[i].classList.add("show");
        }, 170 + i * 200));
        timers.push(setTimeout(() => runStroke(rects[i + 1], 150), 250 + i * 200));
      }
      timers.push(setTimeout(() => cause.classList.add("show"), 1060));
      return { doneAt: 1160, timers, applyFinal };
    },
  },

  crazyeights: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      svg.appendChild(svgEl("path", { d: "M 25 45 L 134 44 L 135 116 L 26 117 Z", ...LINE }));
      svg.appendChild(svgEl("line", { x1: 61.5, y1: 45, x2: 61.5, y2: 116, ...LINE, "stroke-width": "1.8" }));
      svg.appendChild(svgEl("line", { x1: 98, y1: 44.6, x2: 98, y2: 116.4, ...LINE, "stroke-width": "1.8" }));
      svg.appendChild(svgEl("line", { x1: 25.5, y1: 80.5, x2: 134.5, y2: 80, ...LINE, "stroke-width": "1.8" }));
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(320px, calc(100vw - 3rem))" : "min(540px, 90vw)"; },
    buildStage() {
      const narrow = window.innerWidth < 500;
      const svg = svgEl("svg", { viewBox: narrow ? "0 0 260 268" : "0 0 340 180", draggable: "false" });
      // The sheet: outer edge hand-jittered so it reads as paper, fold
      // lines heavier than a table's rules would be.
      const S = narrow ? { x: 20, y: 14, w: 220, h: 140 } : { x: 20, y: 20, w: 220, h: 140 };
      const edge = svgEl("path", {
        d: "M " + S.x + " " + (S.y + 1) + " L " + (S.x + S.w * 0.5) + " " + (S.y - 0.8) + " L " + (S.x + S.w) + " " + (S.y + 0.6) +
           " L " + (S.x + S.w + 0.9) + " " + (S.y + S.h * 0.5) + " L " + (S.x + S.w - 0.6) + " " + (S.y + S.h) +
           " L " + (S.x + S.w * 0.5) + " " + (S.y + S.h + 0.9) + " L " + (S.x + 0.7) + " " + (S.y + S.h - 0.5) + " Z",
        ...LINE, "stroke-width": "1.3", pathLength: "1", class: "ce-edge",
      });
      prepStroke(edge);
      svg.appendChild(edge);
      const folds = [];
      [1 / 3, 2 / 3].forEach((f, i) => {
        const x = S.x + S.w * f + (i === 0 ? 0.6 : -0.4);
        const ln = svgEl("line", { x1: x, y1: S.y + 0.5, x2: x - 0.8, y2: S.y + S.h - 0.5, stroke: "currentColor", "stroke-width": "1.9", "stroke-linecap": "round", pathLength: "1", class: "ce-fold ce-fold-v" });
        prepStroke(ln);
        folds.push(ln);
        svg.appendChild(ln);
      });
      const hy = S.y + S.h / 2;
      const hl = svgEl("line", { x1: S.x + 0.5, y1: hy - 0.5, x2: S.x + S.w - 0.5, y2: hy + 0.7, stroke: "currentColor", "stroke-width": "1.9", "stroke-linecap": "round", pathLength: "1", class: "ce-fold ce-fold-h" });
      prepStroke(hl);
      folds.push(hl);
      svg.appendChild(hl);
      for (let i = 0; i < 6; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const nx = S.x + S.w * (col + 1) / 3 - 8;
        const ny = S.y + S.h * (row + 1) / 2 - 7;
        const n = svgText(nx, ny, "end", String(i + 1), "tool-label neutral dim ce-num ce-num-" + i);
        svg.appendChild(n);
      }
      // The timer, beside the sheet on desktop, below it on narrow screens.
      const T = narrow ? { cx: 130, cy: S.y + S.h + 46, r: 26 } : { cx: 293, cy: 74, r: 28 };
      const face = svgEl("circle", { cx: T.cx, cy: T.cy, r: T.r, ...LINE, "stroke-width": "1.3", pathLength: "1", class: "ce-face" });
      prepStroke(face);
      svg.appendChild(face);
      const hand = svgEl("line", { x1: T.cx, y1: T.cy, x2: T.cx + T.r * 0.55, y2: T.cy - T.r * 0.62, stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "round", class: "ce-hand" });
      hand.style.opacity = "0";
      svg.appendChild(hand);
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 1.65;
      const arc = svgEl("path", {
        d: "M " + T.cx + " " + (T.cy - T.r - 5) + " A " + (T.r + 5) + " " + (T.r + 5) + " 0 1 1 " +
           (T.cx + (T.r + 5) * Math.cos(a1)) + " " + (T.cy + (T.r + 5) * Math.sin(a1)),
        fill: "none", stroke: "var(--red)", "stroke-width": "1.6", "stroke-linecap": "round", pathLength: "1", class: "ce-arc",
      });
      prepStroke(arc);
      svg.appendChild(arc);
      svg.appendChild(svgText(T.cx, T.cy + T.r + 22, "middle", "30 SECONDS", "tool-label ce-timerlabel"));
      return svg;
    },
    assemble(el) {
      const edge = el.querySelector(".ce-edge");
      const foldsV = [...el.querySelectorAll(".ce-fold-v")];
      const foldH = el.querySelector(".ce-fold-h");
      const nums = [...el.querySelectorAll(".ce-num")];
      const face = el.querySelector(".ce-face");
      const hand = el.querySelector(".ce-hand");
      const arc = el.querySelector(".ce-arc");
      const timerLabel = el.querySelector(".ce-timerlabel");
      function applyFinal() {
        [edge, ...foldsV, foldH, face, arc].forEach(snapStroke);
        nums.forEach((n) => n.classList.add("show"));
        hand.style.transition = "none"; hand.style.opacity = "1";
        timerLabel.classList.add("show");
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      timers.push(setTimeout(() => runStroke(edge, 240), 0));
      foldsV.forEach((f, i) => timers.push(setTimeout(() => runStroke(f, 120), 240 + i * 90)));
      timers.push(setTimeout(() => runStroke(foldH, 140), 430));
      nums.forEach((n, i) => timers.push(setTimeout(() => n.classList.add("show"), 560 + i * 45)));
      timers.push(setTimeout(() => runStroke(face, 180), 760));
      timers.push(setTimeout(() => { hand.style.transition = "opacity 90ms ease"; hand.style.opacity = "1"; }, 930));
      timers.push(setTimeout(() => { runStroke(arc, 200); timerLabel.classList.add("show"); }, 950));
      return { doneAt: 1150, timers, applyFinal };
    },
  },

  silentvoting: {
    thumb() {
      const svg = svgEl("svg", { viewBox: VB, draggable: "false" });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        svg.appendChild(svgEl("rect", { x: 28 + c * 38, y: 30 + r * 36, width: 30, height: 24, ...LINE, "stroke-width": "1" }));
      }
      [[44, 40], [82, 42], [120, 76], [46, 112], [84, 108]].forEach(([x, y]) => {
        svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 3.2, fill: "currentColor", stroke: "none" }));
      });
      return svg;
    },
    stageWidth(mobile) { return mobile ? "min(360px, calc(100vw - 3rem))" : "min(540px, 90vw)"; },
    buildStage() {
      const svg = svgEl("svg", { viewBox: "0 0 340 190", draggable: "false" });
      const CARD_W = 54, CARD_H = 40;
      const xs = [30, 96, 162], ys = [20, 72, 124];
      const rnd = mulberry32(8181);
      for (let i = 0; i < 9; i++) {
        const x = xs[i % 3], y = ys[Math.floor(i / 3)];
        const card = svgEl("rect", { x, y, width: CARD_W, height: CARD_H, ...LINE, "stroke-width": "1.1", pathLength: "1", class: "sv-card sv-card-" + i });
        prepStroke(card);
        svg.appendChild(card);
        const nLines = 2 + (i % 2);
        for (let l = 0; l < nLines; l++) {
          const lw = 18 + rnd() * 22;
          const ln = svgEl("line", { x1: x + 8, y1: y + 10 + l * 9, x2: x + 8 + lw, y2: y + 10 + l * 9, stroke: "rgba(255,255,255,0.4)", "stroke-width": "1", pathLength: "1", class: "sv-sketch sv-sketch-" + i });
          prepStroke(ln);
          svg.appendChild(ln);
        }
      }
      /* Dots clustered unevenly: some cards three, some one, two with
         none. Two dots noticeably larger — weight in the vote, not the
         timing. */
      const DOTS = [
        [0, 3, false], [1, 1, false], [2, 0, false],
        [3, 2, false], [4, 3, true], [5, 1, false],
        [6, 0, false], [7, 1, true], [8, 2, false],
      ];
      let dotIdx = 0;
      const dotPositions = [];
      DOTS.forEach(([card, n, hasBig]) => {
        const x = xs[card % 3], y = ys[Math.floor(card / 3)];
        for (let k = 0; k < n; k++) {
          dotPositions.push({ cx: x + 12 + ((dotIdx * 7 + k * 17) % (CARD_W - 22)), cy: y + CARD_H - 9 - ((dotIdx * 5 + k * 9) % 14), r: 3.2, big: false });
          dotIdx++;
        }
        if (hasBig) {
          dotPositions.push({ cx: x + CARD_W - 13, cy: y + 12, r: 5.6, big: true });
        }
      });
      dotPositions.forEach((d, i) => {
        const c = svgEl("circle", { cx: d.cx.toFixed(1), cy: d.cy.toFixed(1), r: d.r, fill: "var(--red)", stroke: "none", class: "sv-dot" + (d.big ? " sv-dot-big" : "") + " sv-dot-" + i });
        c.style.opacity = "0";
        svg.appendChild(c);
      });
      // The sequence of voters, seniors last.
      const FY = [40, 85, 130];
      const seq = svgEl("line", { x1: 300, y1: FY[0], x2: 300, y2: FY[2], stroke: "currentColor", "stroke-width": "1", pathLength: "1", class: "sv-seqline" });
      prepStroke(seq);
      svg.appendChild(seq);
      FY.forEach((fy, i) => {
        const f = svgEl("circle", { cx: 300, cy: fy, r: 7, ...LINE, "stroke-width": "1.2", pathLength: "1", class: "sv-fig sv-fig-" + i });
        prepStroke(f);
        svg.appendChild(f);
      });
      svg.appendChild(svgText(300, 152, "middle", "LAST", "tool-label sv-last"));
      return svg;
    },
    assemble(el) {
      const cards = [...el.querySelectorAll(".sv-card")];
      const sketches = [...el.querySelectorAll(".sv-sketch")];
      const dots = [...el.querySelectorAll(".sv-dot:not(.sv-dot-big)")];
      const bigDots = [...el.querySelectorAll(".sv-dot-big")];
      const seqLine = el.querySelector(".sv-seqline");
      const figs = [...el.querySelectorAll(".sv-fig")];
      const last = el.querySelector(".sv-last");
      function applyFinal() {
        [...cards, ...sketches, seqLine, ...figs].forEach(snapStroke);
        [...dots, ...bigDots].forEach((d) => { d.style.transition = "none"; d.style.opacity = "1"; });
        last.classList.add("show");
      }
      if (reduced()) { applyFinal(); return { doneAt: 0, timers: [], applyFinal }; }
      const timers = [];
      cards.forEach((c, i) => timers.push(setTimeout(() => runStroke(c, 110), i * 40)));
      timers.push(setTimeout(() => sketches.forEach((s) => runStroke(s, 90)), 300));
      const scatter = [4, 9, 1, 7, 11, 2, 8, 0, 5, 10, 3, 6];
      dots.forEach((d, i) => {
        const at = 460 + (scatter[i % scatter.length] * 28);
        timers.push(setTimeout(() => { d.style.transition = "opacity 80ms ease"; d.style.opacity = "1"; }, at));
      });
      bigDots.forEach((d, i) => timers.push(setTimeout(() => { d.style.transition = "opacity 110ms ease"; d.style.opacity = "1"; }, 830 + i * 70)));
      timers.push(setTimeout(() => runStroke(seqLine, 120), 940));
      figs.forEach((f, i) => timers.push(setTimeout(() => runStroke(f, 90), 980 + i * 60)));
      timers.push(setTimeout(() => last.classList.add("show"), 1130));
      return { doneAt: 1180, timers, applyFinal };
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
/* The overview renders TOOLS in array order, and the array order is the
   page's information architecture: strongest first, grouped by purpose,
   with the groups never labelled — the sequence carries the meaning on
   its own. Do not sort, shuffle, or append casually; a new model gets
   spliced into its slot in this list. */
export const TOOLS = [
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
    id: "rean",
    slug: "rean",
    diagram: "rean",
    ready: true,
    shortName: "REAN",
    name: "REAN",
    attribution: "Xavier Blanc. Popularised by Steve Jackson, Cult of Analytics, 2009",
    whatItIs: "Four things a digital service has to do. Reach people, engage them, activate the behaviour you want, and keep them coming back.",
    strongFor: "Showing that four different people own four parts of the same chain, and that none of them can see the whole of it from where they sit.",
    howIUse: "Backwards, starting at Nurture. Working out what would actually bring someone back usually reveals there is nothing to bring them back to yet, and that changes what Engage and Activate need to contain.",
    watchOut: "It is four containers, not a journey. It tells you both ends must exist. It tells you nothing about how anyone gets from one to the next, and using it as a journey map loses everything a blueprint would have caught.",
  },
  {
    id: "core-model",
    slug: "core-model",
    diagram: "coremodel",
    ready: true,
    shortName: "Core Model",
    name: "Core Model",
    attribution: "Are Halland, IA Summit, 2007",
    whatItIs: "One page at a time. What brings someone here, what the page has to deliver, and where they should go next. Business goals and user tasks are named before any content is written.",
    strongFor: "Killing the argument about what goes on the front page. The front page is a route, not a destination.",
    howIUse: "On the pages that actually carry the work, not on the sitemap. Most sites I have worked on had good core pages that nobody could reach and a navigation nobody read.",
    watchOut: "It is a page-level tool. Run it across a whole site and you have rebuilt an information architecture the slow way.",
    source: "https://www.corepages.io",
  },
  {
    id: "peak-end-rule",
    slug: "peak-end-rule",
    diagram: "peakend",
    ready: true,
    shortName: "Peak-End Rule",
    name: "Peak-End Rule",
    attribution: "Daniel Kahneman and Barbara Fredrickson, 1993",
    whatItIs: "People do not remember an experience as an average. They remember the most intense moment and how it ended.",
    strongFor: "Deciding where to spend the budget. You cannot make every touchpoint remarkable, so the question becomes which two.",
    howIUse: "Forwards, to place the moment rather than backwards to explain a score. In hospitality the ending is checkout, not the stay, and checkout is where almost nobody invests because the arrival got the money.",
    watchOut: "A peak in the wrong place is expensive and forgettable. Work out what people already expect as standard before deciding what will surprise them, or the surprise turns out to be something they assumed came with the room.",
    source: "https://en.wikipedia.org/wiki/Peak-end_rule",
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
    id: "empathy-map",
    slug: "empathy-map",
    diagram: "grid6",
    ready: true,
    shortName: "Empathy Map",
    name: "Empathy Map",
    attribution: "Dave Gray, XPLANE, in Gamestorming, 2010",
    whatItIs: "What a person sees, hears, says, does, thinks and feels, plus their pains and gains.",
    strongFor: "Separating what people say from what they actually do. The gap between those two is where most service problems live.",
    howIUse: "As the layer underneath a blueprint, never on its own. On its own it tells you about a person. Attached to a service, it changes decisions.",
    watchOut: "Built on assumptions rather than research, it is worse than nothing, because it makes guesses look like insight.",
    source: "https://gamestorming.com/empathy-map/",
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
    howIUse: "Mostly when reviewing loyalty programmes. Mapping the mechanics against the eight drives shows whether members are being invited or cornered, and it is rarely flattering.",
    watchOut: "Most loyalty programmes cluster in the bottom right, around scarcity and reward, because those are the cheapest to build. That is exactly why so many of them feel identical.",
    sources: [
      { label: "The framework", url: "https://yukaichou.com/gamification-examples/octalysis-gamification-framework/" },
      { label: "White hat vs black hat", url: "https://yukaichou.com/gamification-examples/white-hat-vs-black-hat-gamification/" },
    ],
  },
  {
    id: "kano",
    slug: "kano",
    diagram: "kano",
    ready: true,
    shortName: "Kano Model",
    name: "Kano Model",
    attribution: "Noriaki Kano, Tokyo University of Science, 1984",
    whatItIs: "Three kinds of feature. Must-be, which nobody notices until it is missing. Performance, where more is better. And delighters, which nobody asked for.",
    strongFor: "Explaining why a long list of improvements produced no change in satisfaction. Most of them were must-be features, and meeting an expectation is invisible.",
    howIUse: "When deciding what goes into a paid add-on and what has to be included. Charging for a must-be feature reads as a fee, not an offer, and that distinction is worth more than any pricing model.",
    watchOut: "Delighters decay. Today's surprise is next year's baseline, and anything you built to be remarkable is on a clock from the day it ships.",
    source: "https://en.wikipedia.org/wiki/Kano_model",
  },
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
    id: "double-diamond",
    slug: "double-diamond",
    diagram: "doublediamond",
    ready: true,
    shortName: "Double Diamond",
    name: "Double Diamond",
    attribution: "British Design Council, 2004",
    whatItIs: "Open up, narrow down, twice. First on the problem, then on the solution.",
    strongFor: "Explaining why the brief you were given is not the problem you are solving yet. The first diamond is the one people want to skip.",
    howIUse: "To describe where we are, not to plan where we go. Naming the phase out loud settles most arguments about whether it is too early to decide something.",
    watchOut: "It is a description of divergence, not a project plan. Turned into a Gantt chart with four boxes it stops being true, because the widening was never meant to happen on schedule.",
    source: "https://www.designcouncil.org.uk",
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
    id: "five-whys",
    slug: "five-whys",
    diagram: "fivewhys",
    ready: true,
    shortName: "Five Whys",
    name: "Five Whys",
    attribution: "Sakichi Toyoda, Toyota",
    whatItIs: "Ask why the problem happened. Then ask why that happened. Five times, or until the answers stop changing.",
    strongFor: "Getting past the first answer, which is almost always a description of the symptom wearing the clothes of a cause.",
    howIUse: "When a fix has already been proposed before anyone explained the problem. It takes four minutes and it usually moves the conversation from the interface to the process behind it.",
    watchOut: "It follows one chain. Real failures usually have several, and asking why five times gives you a confident answer to a question that had more than one.",
    source: "https://en.wikipedia.org/wiki/Five_whys",
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
    strongFor: "Asking what in a service is waste rather than what it does. A blueprint shows you the backstage. This tells you which of it should not be there.",
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
    id: "crazy-eights",
    slug: "crazy-eights",
    diagram: "crazyeights",
    ready: true,
    shortName: "Crazy Eights",
    name: "Crazy Eights",
    attribution: "Popularised by Google Ventures design sprints. Eight frames, eight minutes",
    whatItIs: "Fold a sheet into equal frames and sketch one idea per frame against the clock. One minute each in the original.",
    strongFor: "Getting past the ideas people walked in with. Under time pressure nobody has room to censor themselves, which is the entire mechanism.",
    howIUse: "As six frames at thirty seconds, not eight at a minute. With a large group the last two frames produce polite variations rather than new ideas, and the shorter clock keeps the sketching fast and ugly. The timer sits visibly in the room on an iPad, so the pressure comes from the clock and not from me.",
    watchOut: "It is individual work. Run it as a group and you get one person's ideas with five witnesses.",
  },
  {
    id: "silent-voting",
    slug: "silent-voting",
    diagram: "silentvoting",
    ready: true,
    shortName: "Silent Voting",
    name: "Silent Voting",
    attribution: "No single origin. Common in design sprints and dot voting practice",
    whatItIs: "Everyone marks the ideas they think should go forward, without discussion and without seeing anyone else explain their choice first.",
    strongFor: "Getting an honest read of the room before the loudest person has framed what counts as a good idea.",
    howIUse: "Anyone senior votes last. If their judgement should carry more weight, they get physically larger dots rather than earlier ones. Weight belongs in the vote, not in the timing, and the moment a director's dot goes up first the rest of the wall arranges itself around it.",
    watchOut: "It measures appeal, not feasibility. A wall of dots tells you what the room liked, which is worth knowing and is not the same as what should be built.",
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
    id: "six-by-six",
    slug: "six-by-six",
    diagram: "sixbysix",
    ready: true,
    shortName: "6x6 Rule",
    name: "The 6x6 Rule",
    attribution: "Dan Roam, The Back of the Napkin, 2008",
    whatItIs: "Six questions, and for each one the picture type that answers it best. Who or what needs a portrait. How much needs a chart. Where needs a map. When needs a timeline. How needs a flowchart. Why needs a plot with more than one variable.",
    strongFor: "Deciding what to draw before you start drawing. Most bad slides are the right data in the wrong picture.",
    howIUse: "Before building a deck that has to survive a leadership meeting. Working out which of the six questions I am answering usually reveals I was about to answer a different one.",
    watchOut: "The pairings are a starting point, not a law. But if you are reaching for a bar chart to answer a why question, that is worth noticing.",
    source: "https://www.danroam.com",
  },
];

/* Two forward-looking fields on every model, defined here so they never
   have to be retrofitted across twenty-three pages later. Both are empty
   and render nothing anywhere yet.
   - sequences: references to combination pages where this model is used
     as part of a sequence of tools applied to a real problem.
   - facilitation: how to actually run the tool in a room. */
for (const tool of TOOLS) {
  tool.sequences = [];
  tool.facilitation = {
    groupSize: "",
    duration: "",
    materials: "",
    commonFailure: "",
    recovery: "",
  };
}


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
