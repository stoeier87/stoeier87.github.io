/*
 * Prioritisation model, question set, scoring logic and quadrant
 * definitions are the intellectual property of Tobias Fullerton Støier.
 *
 * (c) 2026 Tobias Fullerton Støier. All rights reserved.
 *
 * Not licensed for reuse, redistribution or commercial application.
 * For permission, contact via servicedesign.dk
 */

const $ = (id) => document.getElementById(id);
const SVG_NS = "http://www.w3.org/2000/svg";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = () => window.innerWidth < 700;

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/* ============================================================
   Backdrop — same quiet starfield as the rest of /tools.
   ============================================================ */
(function backdrop() {
  const cv = $("backdrop");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  let w = 0, h = 0, dpr = 1, stars = [];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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
   Question data — content lives here, separate from the flow
   logic below. Each question's five options are ordered low to
   high; the option's position (1 to 5) is its score. Scores are
   never rendered — only the option text is shown.
   ============================================================ */
const QUESTIONS = [
  {
    key: "reach", title: "Reach",
    prompt: "How large a share of the primary audience is affected?",
    options: [
      "Only a very small part of the audience",
      "A smaller, defined segment",
      "A significant part of the audience",
      "The majority of the audience",
      "Almost the entire audience",
    ],
  },
  {
    key: "frequency", title: "Frequency",
    prompt: "How often does the situation occur for the audience?",
    options: [
      "Rarely, or only in special cases",
      "Occasionally, but not every time",
      "Regularly, roughly once per cycle or as a daily process",
      "Often, several times per cycle",
      "Continuously relevant throughout most of the experience",
    ],
  },
  {
    key: "effect", title: "Effect strength",
    prompt: "How significantly does it improve experience, efficiency or quality?",
    options: [
      "Minimal or cosmetic improvement",
      "Minor improvement or added convenience",
      "Clear and noticeable improvement",
      "Significant improvement that materially changes the experience",
      "Transformative improvement that changes behaviour fundamentally",
    ],
  },
  {
    key: "positioning", title: "Positioning",
    prompt: "Does it strengthen differentiation and preference in your market, or reduce structural dependency on third parties?",
    options: [
      "No real effect on your position",
      "Minor strengthening of an existing position",
      "Supports the strategic direction",
      "Clear differentiation, or reduces a dependency",
      "Significantly changes your competitive position",
    ],
  },
  {
    key: "future", title: "Future-proofing",
    prompt: "How critical is this to staying competitive in two to three years?",
    options: [
      "Short-term or tactical improvement",
      "Relevant in the short to medium term",
      "An expected industry requirement or natural development",
      "Critical to keeping pace with the market",
      "Necessary to remain relevant at all",
    ],
  },
  {
    key: "platform", title: "Platform and enablement",
    prompt: "Does it create a foundation for future initiatives?",
    options: [
      "Isolated solution with no strategic reuse",
      "Limited enablement, few knock-on possibilities",
      "Could support a handful of future initiatives",
      "Enables several future initiatives or products",
      "Creates a platform that opens an entirely new category of initiatives",
    ],
  },
  {
    key: "data", title: "Data and intelligence",
    prompt: "Does it structurally improve decision-making or personalisation?",
    options: [
      "No real effect on data or decisions",
      "Minor improvement in insight",
      "A better basis for decisions",
      "Significantly strengthened use of data or personalisation",
      "A structural lift in data and steering capability",
    ],
  },
  {
    key: "anchoring", title: "Strategic anchoring",
    prompt: "How strongly does it anchor in your organisation's stated strategic priorities?",
    options: [
      "Peripheral contact with one priority",
      "Supporting contribution to one priority",
      "Meaningful contribution to one priority",
      "Load-bearing contribution to one or more priorities",
      "A core initiative, indispensable to delivering a priority",
    ],
  },
  {
    key: "upfront", title: "Upfront investment",
    prompt: "What capital is required to establish it?",
    options: [
      "Minimal, absorbed within existing budgets",
      "Low, fits inside a normal project budget",
      "Moderate, needs its own budget line",
      "High, requires reallocation or a dedicated business case",
      "Very high, an executive or board level decision",
    ],
  },
  {
    key: "capacity", title: "Internal capacity load",
    prompt: "What is the organisational load during implementation?",
    options: [
      "Minimal coordination, few people, short period",
      "Limited cross-functional work",
      "A genuinely cross-organisational project",
      "Dedicated resources over a longer period",
      "A strategic bet requiring significant internal mobilisation",
    ],
  },
  {
    key: "runningCost", title: "Ongoing cost",
    prompt: "What is the annual financial commitment once it is live?",
    options: [
      "No or negligible running costs",
      "Small annual costs",
      "A moderate annual commitment",
      "A high fixed annual cost",
      "A critical or structural financial commitment",
    ],
  },
  {
    key: "support", title: "Ongoing support",
    prompt: "What organisational commitment does it require after launch?",
    options: [
      "Almost no ongoing time",
      "Limited periodic attention",
      "Fixed monthly follow-up and maintenance",
      "Dedicated ongoing ownership",
      "Permanent capacity and a clearly assigned role",
    ],
  },
];

const ROUNDS = [
  { intro: "Who is this for?", start: 0, end: 3 },
  { intro: "What does it change strategically?", start: 3, end: 8 },
  { intro: "What does it cost to run?", start: 8, end: 12 },
];

function roundFor(i) {
  return ROUNDS.find((r) => i >= r.start && i < r.end);
}

/* ============================================================
   State — in memory only, never persisted.
   ============================================================ */
let answers = new Array(QUESTIONS.length).fill(null);
let current = 0;
let started = false;

const stage = $("stage");

/* ============================================================
   Intro — shown once, before question one.
   ============================================================ */
function renderIntro() {
  const screen = document.createElement("div");
  screen.className = "q-screen intro-screen";

  const heading = document.createElement("h1");
  heading.className = "intro-heading";
  heading.textContent = "Idea Validator";
  screen.appendChild(heading);

  const body = document.createElement("div");
  body.className = "intro-body";
  const paragraphs = [
    "You have twenty ideas. They all sound good. Everyone in the room has a favourite and nobody can say which one should be built first.",
    "That is what this is for. Twelve questions place one idea on three matrices and tell you where it sits: worth doing now, worth doing later, or worth killing before anyone starts.",
    "It works best on an idea you have already described properly: what it is, who it is for, what it would change, what it would take. Without that the answers are guesses, and the output is only as good as they are.",
    "Run them one at a time and the order sorts itself out.",
    "Nothing is stored and nothing is sent anywhere, so write the results down as you go.",
  ];
  for (const text of paragraphs) {
    const p = document.createElement("p");
    p.textContent = text;
    body.appendChild(p);
  }
  screen.appendChild(body);

  const start = document.createElement("button");
  start.type = "button";
  start.className = "intro-start";
  start.textContent = "Start";
  start.addEventListener("click", () => {
    started = true;
    render();
  });
  screen.appendChild(start);

  stage.innerHTML = "";
  stage.appendChild(screen);
}

/* ============================================================
   Question flow
   ============================================================ */
function renderQuestion(i) {
  const q = QUESTIONS[i];
  const round = roundFor(i);

  const screen = document.createElement("div");
  screen.className = "q-screen";

  const privacy = document.createElement("p");
  privacy.className = "q-privacy";
  privacy.textContent = "Nothing is stored. Nothing is sent anywhere.";
  screen.appendChild(privacy);

  const roundEl = document.createElement("p");
  roundEl.className = "q-round";
  roundEl.textContent = round.intro;
  screen.appendChild(roundEl);

  const progress = document.createElement("p");
  progress.className = "q-progress";
  progress.textContent = "Question " + (i + 1) + " of " + QUESTIONS.length;
  screen.appendChild(progress);

  const title = document.createElement("h2");
  title.className = "q-title";
  title.textContent = q.title;
  screen.appendChild(title);

  const prompt = document.createElement("p");
  prompt.className = "q-prompt";
  prompt.textContent = q.prompt;
  screen.appendChild(prompt);

  const options = document.createElement("div");
  options.className = "q-options";
  q.options.forEach((text, oi) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "q-option" + (answers[i] === oi + 1 ? " selected" : "");
    const mark = document.createElement("span");
    mark.className = "q-option-mark";
    mark.setAttribute("aria-hidden", "true");
    if (answers[i] === oi + 1) mark.innerHTML = '<i class="fa-solid fa-check"></i>';
    const label = document.createElement("span");
    label.textContent = text;
    btn.appendChild(mark);
    btn.appendChild(label);
    btn.addEventListener("click", () => {
      answers[i] = oi + 1;
      current = i + 1;
      render();
    });
    options.appendChild(btn);
  });
  screen.appendChild(options);

  const nav = document.createElement("div");
  nav.className = "q-nav";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "q-prev";
  prev.textContent = "← Previous question";
  prev.disabled = i === 0;
  prev.addEventListener("click", () => {
    if (i > 0) { current = i - 1; render(); }
  });
  nav.appendChild(prev);
  screen.appendChild(nav);

  stage.innerHTML = "";
  stage.appendChild(screen);

  // Block hover events briefly so a stationary cursor can't make a freshly
  // created option appear pre-selected on the new question.
  const opts = screen.querySelector(".q-options");
  if (opts) {
    opts.style.pointerEvents = "none";
    setTimeout(() => { opts.style.pointerEvents = ""; }, 200);
  }
}

/* ============================================================
   Calculation — internal only. Never surfaced in the DOM, never
   logged. All figures live on a 1 to 5 scale; every matrix uses
   3.0 as the dividing line on both axes.
   ============================================================ */
function round2(n) { return Math.round(n * 100) / 100; }

function computeScores() {
  const v = (key) => answers[QUESTIONS.findIndex((q) => q.key === key)];
  const audienceImpact = round2((v("reach") + v("frequency") + v("effect")) / 3);
  const strategicImpact = round2(
    (2 * v("positioning") + 2 * v("future") + v("platform") + v("data") + v("anchoring")) / 7
  );
  const upfrontInvestment = round2((v("upfront") + v("capacity")) / 2);
  const runningCost = round2((v("runningCost") + v("support")) / 2);
  const value = round2((audienceImpact + strategicImpact) / 2);
  const totalEffort = round2((upfrontInvestment + runningCost) / 2);
  const priorityIndex = round2(value / totalEffort);
  return { audienceImpact, strategicImpact, upfrontInvestment, runningCost, value, totalEffort, priorityIndex };
}

function quadrantOf(yScore, xScore) {
  const top = yScore >= 3.0;
  const right = xScore >= 3.0;
  if (top && !right) return "tl";
  if (top && right) return "tr";
  if (!top && !right) return "bl";
  return "br";
}

const VERDICTS = {
  tl: {
    bands: [
      { min: 1.5, text: "Clear priority. There is no good argument for waiting." },
      { min: 1.0, text: "High priority. Sequence it against the others in this quadrant." },
      { min: -Infinity, text: "High priority. Sequence it against the others in this quadrant." },
    ],
    add: "The index decides order here, not whether to do it.",
  },
  tr: {
    bands: [
      { min: 1.5, text: "A strong bet. Worth the weight." },
      { min: 1.0, text: "A strategic investment. Go in with your eyes open." },
      { min: -Infinity, text: "This needs a leadership decision, not a prioritisation decision." },
    ],
    add: "The index decides which heavy projects go first.",
  },
  bl: {
    bands: [
      { min: 1.5, text: "Take it when there is room. Do not plan around it." },
      { min: 1.0, text: "Low priority. It will keep." },
      { min: -Infinity, text: "Drop it. The effort is not buying anything." },
    ],
    add: "The index decides whether these survive at all.",
  },
  br: {
    bands: [
      { min: 1.0, text: "Worth reassessing before anyone starts." },
      { min: -Infinity, text: "This should not be prioritised." },
    ],
    add: "The index mostly confirms what the position already says.",
  },
};

function verdictFor(quadrantKey, index) {
  const q = VERDICTS[quadrantKey];
  const band = q.bands.find((b) => index >= b.min);
  return band.text + " " + q.add;
}

const MATRIX_DEFS = [
  {
    title: "Value Map",
    yKey: "audienceImpact", xKey: "strategicImpact",
    corners: { tl: "Experience improvements", tr: "Must wins", bl: "Nice to have", br: "Strategic foundation" },
  },
  {
    title: "Cost Map",
    yKey: "runningCost", xKey: "upfrontInvestment",
    corners: { tl: "Creeping cost", tr: "Heavy commitment", bl: "Quick wins", br: "Build and run" },
  },
  {
    title: "Value vs Effort",
    yKey: "value", xKey: "totalEffort",
    corners: { tl: "Easy wins", tr: "Strategic investments", bl: "Take as they come", br: "Deprioritise" },
  },
];

/* ============================================================
   Matrix diagram — thin line-art 2x2, same visual language as
   the tool models. The point is plotted at its real position on
   the 1 to 5 range, never snapped to a quadrant centre.
   ============================================================ */
function buildMatrixSvg(yScore, xScore) {
  const svg = svgEl("svg", { class: "matrix-svg", viewBox: "0 0 160 160" });
  const LINE = { fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linejoin": "round", "stroke-linecap": "round" };
  const rect = svgEl("rect", { x: 28, y: 28, width: 104, height: 104, ...LINE, class: "matrix-axes", pathLength: "1" });
  const vLine = svgEl("line", { x1: 80, y1: 28, x2: 80, y2: 132, ...LINE, "stroke-width": "1", class: "matrix-axes", pathLength: "1" });
  const hLine = svgEl("line", { x1: 28, y1: 80, x2: 132, y2: 80, ...LINE, "stroke-width": "1", class: "matrix-axes", pathLength: "1" });
  svg.appendChild(rect);
  svg.appendChild(vLine);
  svg.appendChild(hLine);

  const px = 28 + ((xScore - 1) / 4) * 104;
  const py = 132 - ((yScore - 1) / 4) * 104;
  const point = svgEl("circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: 4.5, class: "matrix-point" });
  svg.appendChild(point);
  return svg;
}

function buildMatrixBlock(def, scores) {
  const yScore = scores[def.yKey], xScore = scores[def.xKey];
  const quadrant = quadrantOf(yScore, xScore);

  const block = document.createElement("div");
  block.className = "matrix-block";

  const title = document.createElement("p");
  title.className = "matrix-title";
  title.textContent = def.title;
  block.appendChild(title);

  const frame = document.createElement("div");
  frame.className = "matrix-frame";
  frame.appendChild(buildMatrixSvg(yScore, xScore));
  for (const pos of ["tl", "tr", "bl", "br"]) {
    const label = document.createElement("span");
    label.className = "matrix-corner-label " + pos + (pos === quadrant ? " active" : "");
    label.textContent = def.corners[pos];
    frame.appendChild(label);
  }
  block.appendChild(frame);

  const quadrantName = document.createElement("p");
  quadrantName.className = "matrix-quadrant-name";
  quadrantName.textContent = def.corners[quadrant];
  block.appendChild(quadrantName);

  return { block, quadrant };
}

/* ============================================================
   Results
   ============================================================ */
function renderResults() {
  const scores = computeScores();

  const screen = document.createElement("div");
  screen.className = "r-screen";

  const matricesWrap = document.createElement("div");
  matricesWrap.className = "r-matrices";
  const blocks = [];
  let finalQuadrant = null;
  MATRIX_DEFS.forEach((def, i) => {
    const { block, quadrant } = buildMatrixBlock(def, scores);
    if (def.title === "Value vs Effort") finalQuadrant = quadrant;
    blocks.push(block);
    matricesWrap.appendChild(block);
  });
  screen.appendChild(matricesWrap);

  const verdict = document.createElement("div");
  verdict.className = "r-verdict";

  const qName = document.createElement("p");
  qName.className = "r-quadrant";
  const finalDef = MATRIX_DEFS.find((d) => d.title === "Value vs Effort");
  qName.textContent = finalDef.corners[finalQuadrant];
  verdict.appendChild(qName);

  const text = document.createElement("p");
  text.className = "r-text";
  text.textContent = verdictFor(finalQuadrant, scores.priorityIndex);
  verdict.appendChild(text);

  const costDef = MATRIX_DEFS.find((d) => d.title === "Cost Map");
  const costQuadrant = quadrantOf(scores[costDef.yKey], scores[costDef.xKey]);
  if (costQuadrant === "tl") {
    const warning = document.createElement("p");
    warning.className = "r-warning";
    warning.textContent = "Cheap to build, expensive to own. Check who carries that before you start.";
    verdict.appendChild(warning);
  }

  const closing = document.createElement("p");
  closing.className = "r-closing";
  closing.textContent = "The matrix decides sequence within a quadrant, not whether something should be done at all.";
  verdict.appendChild(closing);

  screen.appendChild(verdict);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "r-reset";
  reset.textContent = "Start over";
  reset.addEventListener("click", () => {
    answers = new Array(QUESTIONS.length).fill(null);
    current = 0;
    render();
  });
  screen.appendChild(reset);

  stage.innerHTML = "";
  stage.appendChild(screen);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      blocks.forEach((b) => b.classList.add("show"));
    });
  });
}

/* ============================================================
   Boot
   ============================================================ */
function render() {
  if (!started) renderIntro();
  else if (current < QUESTIONS.length) renderQuestion(current);
  else renderResults();
}
render();
