import data from "./cocktails.json";

const COCKTAILS = data.cocktails;

/* ============================================================
   Helpers
   ============================================================ */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = () => window.innerWidth < 700;

/* Deterministic RNG, so the sky looks the same every visit */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   Backdrop — far starfield with the occasional UFO
   ============================================================ */
(function backdrop() {
  const cv = $("backdrop");
  const ctx = cv.getContext("2d");
  let w = 0, h = 0, dpr = 1, stars = [];
  const ufo = { at: 9000, dur: 15000, on: false, start: 0, seed: 0.5 };

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = mulberry32(9137);
    const n = isMobile() ? 90 : 190;
    stars = Array.from({ length: n }, () => ({
      x: rnd() * w, y: rnd() * h,
      r: 0.3 + rnd() * 1.0,
      a: 0.12 + rnd() * 0.4,
      sp: 0.2 + rnd() * 0.7,
      ph: rnd() * 6.28,
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#04060d");
    g.addColorStop(0.55, "#080c1a");
    g.addColorStop(1, "#0b0f20");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(t * 0.001 * s.sp + s.ph));
      ctx.fillStyle = "#dfe8ff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* Easter egg: a saucer drifts by now and then, far away and unhurried */
    if (!ufo.on && t >= ufo.at) { ufo.on = true; ufo.start = t; ufo.seed = Math.random(); }
    if (ufo.on) {
      const p = (t - ufo.start) / ufo.dur;
      if (p >= 1) { ufo.on = false; ufo.at = t + 40000 + Math.random() * 50000; }
      else {
        const dir = ufo.seed > 0.5 ? 1 : -1;
        const x = dir > 0 ? -70 + p * (w + 140) : w + 70 - p * (w + 140);
        const y = h * (0.1 + ufo.seed * 0.22) + Math.sin(p * 9) * 10;
        const fade = Math.max(0, Math.min(1, Math.min(p, 1 - p) * 8));
        ctx.save();
        ctx.globalAlpha = 0.32 * fade;
        ctx.translate(x, y); ctx.scale(dir, 1);
        ctx.fillStyle = "rgba(130,155,195,.95)";
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 4.4, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "rgba(165,195,230,.8)";
        ctx.beginPath(); ctx.ellipse(0, -3, 6, 5, 0, Math.PI, 6.2832); ctx.fill();
        ctx.fillStyle = "rgba(224,58,47," + (0.4 + 0.6 * Math.abs(Math.sin(p * 90))).toFixed(2) + ")";
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 8.5, 1.8, 1.2, 0, 6.2832); ctx.fill(); }
        ctx.restore();
      }
    }
    requestAnimationFrame(frame);
  }

  size();
  window.addEventListener("resize", size, { passive: true });
  requestAnimationFrame(frame);
})();

/* ============================================================
   The host
   ============================================================ */
const host = $("host"), bubble = $("bubble"), bubbleText = $("bubbleText");
const caret = bubble.querySelector(".caret");
let typeTimer = null, idleTimer = null;

function say(text, hold = 0) {
  clearTimeout(typeTimer);
  bubble.classList.add("show");
  caret.classList.remove("done");
  bubbleText.textContent = "";
  if (reduced()) {
    bubbleText.textContent = text;
    caret.classList.add("done");
    return;
  }
  let i = 0;
  const step = () => {
    bubbleText.textContent = text.slice(0, ++i);
    if (i < text.length) typeTimer = setTimeout(step, 22);
    else caret.classList.add("done");
  };
  typeTimer = setTimeout(step, hold);
}

function nudgeIdle() {
  host.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => host.classList.add("idle"), 7000);
}

/* ============================================================
   Star map
   ============================================================ */
const viewport = $("viewport"), map = $("map"), blackhole = $("blackhole"), rocket = $("rocket");

let field = { w: 0, h: 0 };
let nodes = [];              // { data, el, x, y, size, gone }
let pos = { x: 0, y: 0 };    // map translation
let vel = { x: 0, y: 0 };
let activeFilter = "all";

function computeField() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const m = isMobile();
  field = {
    w: Math.round(Math.max(vw * (m ? 2.7 : 2.1), 1700)),
    h: Math.round(Math.max(vh * (m ? 2.2 : 1.9), 1250)),
  };
  map.style.width = field.w + "px";
  map.style.height = field.h + "px";
}

/* Lower magnitude is brighter. Compressed so Proxima at 11.13 is still a
   visible dot rather than a rounding error. */
function starSize(mag) {
  const MAG_MIN = -1.46, MAG_MAX = 6;
  const m = Math.min(mag, MAG_MAX);
  const norm = (m - MAG_MIN) / (MAG_MAX - MAG_MIN);
  const maxS = isMobile() ? 22 : 26;
  const minS = 7;
  return maxS - (maxS - minS) * Math.pow(norm, 0.8);
}

/* Rejection sampling with a minimum separation, so labels do not collide */
function layout() {
  const rnd = mulberry32(20260812);
  const pad = 90;
  const placed = [];
  let minDist = isMobile() ? 132 : 158;

  for (let i = 0; i < COCKTAILS.length; i++) {
    let best = null;
    for (let tries = 0; tries < 260; tries++) {
      const p = {
        x: pad + rnd() * (field.w - pad * 2),
        y: pad + rnd() * (field.h - pad * 2),
      };
      let ok = true;
      for (const q of placed) {
        if (Math.hypot(p.x - q.x, p.y - q.y) < minDist) { ok = false; break; }
      }
      if (ok) { best = p; break; }
    }
    if (!best) {                       // relax rather than stack them
      minDist *= 0.86;
      i--;
      continue;
    }
    placed.push(best);
  }
  return placed;
}

function buildStars() {
  map.querySelectorAll(".star").forEach((n) => n.remove());
  const spots = layout();
  nodes = COCKTAILS.map((c, i) => {
    const size = starSize(c.magnitude);
    const el = document.createElement("button");
    el.type = "button";
    el.className = "star";
    el.style.left = spots[i].x + "px";
    el.style.top = spots[i].y + "px";
    el.style.setProperty("--size", size.toFixed(1) + "px");
    el.style.setProperty("--tint", c.starColor);
    el.style.setProperty("--glow", c.starColor + "55");
    el.style.setProperty("--tw", (2.4 + (i % 7) * 0.45).toFixed(2) + "s");
    el.style.setProperty("--twd", ((i % 11) * 0.23).toFixed(2) + "s");
    el.setAttribute("aria-label", `${c.drinkName} — ${c.star}`);
    el.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="label">${c.star}</span>`;
    el.addEventListener("click", () => { if (!suppressClick) select(c.id); });
    map.appendChild(el);
    return { data: c, el, x: spots[i].x, y: spots[i].y, size, gone: false, near: false };
  });
}

/* ── Panning ─────────────────────────────────────────────── */
function bounds() {
  return {
    minX: Math.min(0, window.innerWidth - field.w),
    maxX: 0,
    minY: Math.min(0, window.innerHeight - field.h),
    maxY: 0,
  };
}

function applyPos() {
  const b = bounds();
  pos.x = clamp(pos.x, b.minX, b.maxX);
  pos.y = clamp(pos.y, b.minY, b.maxY);
  map.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  markNear();
}

/* Labels brighten near the middle of the viewport */
function markNear() {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const radius = isMobile() ? 150 : 210;
  for (const n of nodes) {
    if (n.gone) { if (n.near) { n.el.classList.remove("near"); n.near = false; } continue; }
    const d = Math.hypot(pos.x + n.x - cx, pos.y + n.y - cy);
    const near = d < radius;
    if (near !== n.near) { n.el.classList.toggle("near", near); n.near = near; }
  }
}

let dragging = false, suppressClick = false, pointerId = null;
let lastPt = { x: 0, y: 0, t: 0 }, startPt = { x: 0, y: 0 }, glideRaf = null;

viewport.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".sheet")) return;
  pointerId = e.pointerId;
  dragging = false;
  suppressClick = false;
  cancelAnimationFrame(glideRaf);
  vel = { x: 0, y: 0 };
  startPt = { x: e.clientX, y: e.clientY };
  lastPt = { x: e.clientX, y: e.clientY, t: performance.now() };
  nudgeIdle();
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

/* Gentle momentum, so releasing feels like drifting rather than stopping */
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

/* Trackpad / wheel panning on desktop */
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  cancelAnimationFrame(glideRaf);
  pos.x -= e.deltaX; pos.y -= e.deltaY;
  applyPos();
  nudgeIdle();
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

$("recentreBtn").addEventListener("click", () => {
  centreOn(field.w / 2, field.h / 2);
  nudgeIdle();
});

/* ============================================================
   Black hole filtering
   ============================================================ */
const OPENERS = ["Hold on.", "Watch this.", "One moment.", "Stand back."];
let bhBusy = false;

function blackholeOpen() {
  if (reduced()) return Promise.resolve();
  blackhole.style.left = field.w / 2 + "px";
  blackhole.style.top = field.h / 2 + "px";
  return blackhole.animate(
    [
      { transform: "scale(0.1) rotate(0deg)", opacity: 0 },
      { transform: "scale(1) rotate(90deg)", opacity: 1 },
    ],
    { duration: 220, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
  ).finished;
}

function blackholeClose() {
  if (reduced()) return Promise.resolve();
  return blackhole.animate(
    [
      { transform: "scale(1) rotate(90deg)", opacity: 1 },
      { transform: "scale(0.05) rotate(200deg)", opacity: 0 },
    ],
    { duration: 300, easing: "cubic-bezier(.5,0,.9,.4)", fill: "forwards" }
  ).finished;
}

function suck(n) {
  const cx = field.w / 2, cy = field.h / 2;
  const dx = cx - n.x, dy = cy - n.y;
  const dist = Math.hypot(dx, dy) || 1;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const px = -dy / dist, py = dx / dist;          // perpendicular, for the curve
  const bow = Math.min(180, dist * 0.35);
  const delay = Math.min(200, dist * 0.11);

  n.gone = true;
  n.el.dataset.gone = "1";

  if (reduced()) {
    n.el.style.opacity = "0";
    n.el.style.pointerEvents = "none";
    return;
  }
  n.el.getAnimations().forEach((a) => a.cancel());
  n.el.animate(
    [
      { transform: "translate3d(0,0,0) rotate(0deg) scale(1,1)", opacity: 1, offset: 0 },
      {
        transform: `translate3d(${dx * 0.4 + px * bow}px, ${dy * 0.4 + py * bow}px, 0) rotate(${deg}deg) scale(1.15,.8)`,
        opacity: 0.95, offset: 0.5,
      },
      {
        transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg) scale(2,.14)`,
        opacity: 0, offset: 1,
      },
    ],
    { duration: 620, delay, easing: "cubic-bezier(.55,0,.85,.35)", fill: "forwards" }
  );
}

function restore(n) {
  n.gone = false;
  delete n.el.dataset.gone;
  if (reduced()) {
    n.el.style.opacity = "";
    n.el.style.pointerEvents = "";
    return;
  }
  const anims = n.el.getAnimations();
  const cx = field.w / 2, cy = field.h / 2;
  const dx = cx - n.x, dy = cy - n.y;
  const dist = Math.hypot(dx, dy) || 1;
  const delay = Math.min(180, dist * 0.09);
  anims.forEach((a) => a.cancel());
  n.el.animate(
    [
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(2,.14)`, opacity: 0, offset: 0 },
      { transform: `translate3d(${dx * 0.25}px, ${dy * 0.25}px, 0) scale(1.1,.9)`, opacity: 1, offset: 0.55 },
      { transform: "translate3d(0,0,0) scale(1,1)", opacity: 1, offset: 1 },
    ],
    { duration: 560, delay, easing: "cubic-bezier(.2,.9,.3,1)", fill: "forwards" }
  );
}

async function applyFilter(key) {
  if (key === activeFilter) return;
  activeFilter = key;
  document.querySelectorAll(".pill.filter").forEach((b) =>
    b.classList.toggle("is-on", b.dataset.filter === key)
  );

  const matches = (c) => key === "all" || c.category === key;
  const toHide = nodes.filter((n) => !matches(n.data) && !n.gone);
  const toShow = nodes.filter((n) => matches(n.data) && n.gone);

  const count = key === "all" ? 40 : COCKTAILS.filter((c) => c.category === key).length;

  if (!toHide.length && !toShow.length) return;

  say(OPENERS[Math.floor(Math.random() * OPENERS.length)]);

  if (reduced()) {
    toHide.forEach(suck);
    toShow.forEach(restore);
    setTimeout(() => say(`${count} left. Take your pick.`), 400);
    return;
  }

  bhBusy = true;
  await blackholeOpen();
  toHide.forEach(suck);
  toShow.forEach(restore);
  /* Longest star animation is 620ms + up to 200ms of delay */
  setTimeout(async () => {
    await blackholeClose();
    bhBusy = false;
    markNear();
    say(`${count} left. Take your pick.`);
  }, 700);
}

document.querySelectorAll(".pill.filter").forEach((b) =>
  b.addEventListener("click", () => { nudgeIdle(); applyFilter(b.dataset.filter); })
);

/* ============================================================
   Rocket + recipe
   ============================================================ */
let rocketAt = { x: 0, y: 0 };

function flyTo(n) {
  return new Promise((resolve) => {
    if (reduced()) { rocketAt = { x: n.x, y: n.y }; resolve(); return; }
    const dx = n.x - rocketAt.x, dy = n.y - rocketAt.y;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    rocket.style.left = rocketAt.x + "px";
    rocket.style.top = rocketAt.y + "px";
    rocket.classList.add("flying");
    const a = rocket.animate(
      [
        { transform: `translate3d(0,0,0) rotate(${deg}deg) scale(.7)`, opacity: 0 },
        { transform: `translate3d(${dx * 0.5}px, ${dy * 0.5}px, 0) rotate(${deg}deg) scale(1)`, opacity: 1, offset: 0.35 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg) scale(.75)`, opacity: 0, offset: 1 },
      ],
      { duration: 760, easing: "cubic-bezier(.4,0,.35,1)", fill: "forwards" }
    );
    rocketAt = { x: n.x, y: n.y };
    a.finished.then(() => { rocket.classList.remove("flying"); resolve(); }).catch(resolve);
  });
}

const sheet = $("sheet");

function select(id) {
  const n = nodes.find((x) => x.data.id === id);
  if (!n) return;
  nudgeIdle();
  flyTo(n).then(() => openRecipe(n.data));
}

function openRecipe(c) {
  $("rStar").textContent = c.star;
  $("rConst").textContent = c.constellation;
  $("rName").textContent = c.drinkName;
  $("rTagline").textContent = c.tagline;
  $("rFact").textContent = c.starFact;
  $("rBased").textContent = c.basedOn;
  $("rGlass").textContent = c.glass;
  $("rMethod").textContent = c.method;

  const ing = $("rIng");
  ing.innerHTML = "";
  for (const line of c.ingredients) {
    const li = document.createElement("li");
    li.textContent = line;
    ing.appendChild(li);
  }

  /* The twins name each other, so let the reader follow it */
  const twinOf = { castor: "pollux", pollux: "castor" };
  const twin = $("rTwin");
  if (twinOf[c.id]) {
    const other = COCKTAILS.find((x) => x.id === twinOf[c.id]);
    twin.hidden = false;
    twin.innerHTML = `Its twin: <button type="button" id="twinBtn">${other.drinkName}</button>`;
    $("twinBtn").addEventListener("click", () => { closeRecipe(); setTimeout(() => select(other.id), 220); });
  } else {
    twin.hidden = true;
    twin.innerHTML = "";
  }

  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add("show"));
  sheet.querySelector(".card").scrollTop = 0;
  $("closeBtn").focus({ preventScroll: true });
  say(c.tagline, 180);
}

function closeRecipe() {
  sheet.classList.remove("show");
  setTimeout(() => { sheet.hidden = true; }, 300);
  nudgeIdle();
}

$("closeBtn").addEventListener("click", closeRecipe);
$("sheetScrim").addEventListener("click", closeRecipe);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !sheet.hidden) closeRecipe();
});

/* ============================================================
   Entry
   ============================================================ */
const entry = $("entry"), bar = $("bar");
let entered = false;

function enter() {
  if (entered) return;
  entered = true;
  entry.classList.add("leaving");
  bar.hidden = false;

  computeField();
  buildStars();
  rocketAt = { x: field.w / 2, y: field.h / 2 };
  centreOn(field.w / 2, field.h / 2, false);

  setTimeout(() => { entry.style.display = "none"; }, 520);
  say("What are you drinking tonight?", 420);
  nudgeIdle();
}

$("enterBtn").addEventListener("click", enter);
document.addEventListener("keydown", (e) => {
  if (!entered && (e.code === "Space" || e.key === " ")) { e.preventDefault(); enter(); }
});

/* Relayout on resize, keeping the current filter and roughly the same view */
let resizeTimer = null;
window.addEventListener("resize", () => {
  if (!entered) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const fx = pos.x, fy = pos.y;
    computeField();
    buildStars();
    if (activeFilter !== "all") {
      const key = activeFilter;
      nodes.forEach((n) => {
        if (n.data.category !== key) {
          n.gone = true;
          n.el.dataset.gone = "1";
          n.el.style.opacity = "0";
          n.el.style.pointerEvents = "none";
        }
      });
    }
    rocketAt = { x: field.w / 2, y: field.h / 2 };
    pos.x = fx; pos.y = fy;
    applyPos();
  }, 200);
}, { passive: true });

["pointerdown", "keydown"].forEach((ev) =>
  document.addEventListener(ev, nudgeIdle, { passive: true })
);
