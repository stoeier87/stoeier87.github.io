/* Constellation geometry, derived from the model diagrams themselves.

   The 23 tool models are drawn once, in tools-data.js, as line SVGs. Anything
   that wants to render a model as a constellation — star points at the
   vertices, thin lines between them — samples that same drawing rather than
   redrawing it, so the shapes can never drift apart. Consumers: the /tools
   backdrop (zodiac), and the Star Memory card faces.

   The SVG must be in the DOM when extracted: corner detection walks the real
   rendered geometry via getTotalLength/getPointAtLength, and nested group
   transforms are resolved through getScreenCTM. */

export function extractConstellation(svg, opts = {}) {
  const step = opts.step ?? 24; // spacing between fill stars, viewBox units
  const cornerRad = ((opts.cornerDeg ?? 30) * Math.PI) / 180;
  const fine = 2; // dense sampling pitch for corner detection

  const toRoot = (el) => {
    try {
      const rootM = svg.getScreenCTM();
      const elM = el.getScreenCTM();
      if (!rootM || !elM) return null;
      return rootM.inverse().multiply(elM);
    } catch {
      return null;
    }
  };
  // getScreenCTM hands back the legacy SVGMatrix, so the mapping goes through
  // the matching legacy SVGPoint rather than DOMMatrix.transformPoint.
  const svgPoint = svg.createSVGPoint();
  const mapped = (m, p) => {
    if (!m) return { x: p.x, y: p.y };
    svgPoint.x = p.x;
    svgPoint.y = p.y;
    const q = svgPoint.matrixTransform(m);
    return { x: q.x, y: q.y };
  };

  const stars = [];
  const polylines = [];
  const addStar = (p) => {
    // Shared corners (nested chevrons, touching boxes) collapse to one star.
    for (const s of stars) if (Math.hypot(s.x - p.x, s.y - p.y) < 2) return;
    stars.push(p);
  };

  for (const el of svg.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect")) {
    if (el.closest(".zodiac-stars")) continue;
    const cs = getComputedStyle(el);
    const m = toRoot(el);

    // Small filled dots (muda nodes, plot points) are vertices in their own right.
    if (el.tagName === "circle") {
      const r = Number.parseFloat(el.getAttribute("r") || "0");
      if (r > 0 && r <= 4.5 && cs.fill !== "none") {
        addStar(mapped(m, { x: +el.getAttribute("cx"), y: +el.getAttribute("cy") }));
        continue;
      }
    }
    // Filled-only shapes (arrowheads) have no line to ride along.
    if (cs.stroke === "none" || cs.strokeWidth === "0px") continue;

    let L;
    try {
      L = el.getTotalLength();
    } catch {
      continue;
    }
    if (!Number.isFinite(L) || L < 8) continue;

    const n = Math.max(2, Math.ceil(L / fine));
    const raw = [];
    for (let i = 0; i <= n; i++) raw.push(el.getPointAtLength((L * i) / n));

    // Corners first, so rects and chevrons star their actual angles …
    const kept = [0];
    for (let i = 1; i < raw.length - 1; i++) {
      const a = raw[i - 1];
      const b = raw[i];
      const c = raw[i + 1];
      const a1 = Math.atan2(b.y - a.y, b.x - a.x);
      const a2 = Math.atan2(c.y - b.y, c.x - b.x);
      let d = Math.abs(a2 - a1);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > cornerRad && i - kept[kept.length - 1] > 2) kept.push(i);
    }
    kept.push(n);

    // … then evenly spaced fill stars along the runs between corners.
    const idx = [];
    for (let k = 0; k < kept.length - 1; k++) {
      const i0 = kept[k];
      const i1 = kept[k + 1];
      idx.push(i0);
      const runLen = (i1 - i0) * fine;
      const fills = Math.floor(runLen / step);
      for (let f = 1; f <= fills; f++) idx.push(i0 + Math.round(((i1 - i0) * f) / (fills + 1)));
    }
    idx.push(n);

    const line = idx.map((i) => mapped(m, raw[i]));
    for (const p of line) addStar(p);
    polylines.push(line);
  }

  return { stars, polylines };
}

/** Total length of an extracted polyline, for pacing a travelling pulse. */
export function polylineLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++)
    L += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return L;
}
