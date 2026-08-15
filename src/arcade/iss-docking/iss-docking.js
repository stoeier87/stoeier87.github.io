import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  if (!canvas) return; // guard so this doesn't run on other pages
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const distFill = document.getElementById("distFill");
  const speedFill = document.getElementById("speedFill");
  const angleFill = document.getElementById("angleFill");
  const introEl = document.getElementById("intro");
  const approachEl = document.getElementById("approach");
  const gameOverEl = document.getElementById("gameOver");
  const gameOverCard = gameOverEl.querySelector(".gameover-card");
  const gameOverTitle = document.getElementById("gameOverTitle");
  const gameOverRestart = document.getElementById("gameOverRestart");

  const DESIGN_H = 900; // reference world height; keeps art/physics scale consistent
  let BASE_W = 900;
  let BASE_H = 900;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Countdown / scoring: docking faster leaves more time on the clock.
  const MAX_TIME = 60; // countdown start + seconds used for time-based scoring
  const POINTS_PER_SEC = 50;
  const DOCKING_BONUS = 500;

  // Fixed "normal" tuning (matches the previous game's difficulty).
  const TUNING = { thrust: 260, speedThresh: 140, angleThresh: 0.9 };
  const STATION_SPIN = 0.4;

  let W = 0,
    H = 0,
    dpr = 1,
    viewScale = 1,
    viewOffX = 0,
    viewOffY = 0;
  let score = 0,
    best = 0,
    last = 0,
    gameOver = false,
    scoreSubmitted = false,
    docked = false,
    startTime = 0,
    introHidden = false;
  let stars = [];
  let capsule = { x: 120, y: 120, vx: 0, vy: 0, r: 14 };
  let station = { x: BASE_W / 2, y: BASE_H / 2, r: 46, angle: 0, av: STATION_SPIN };
  let keys = { up: false, down: false, left: false, right: false };
  let bgCanvas = null;

  // Touch thrust zones: keyboard always drives at full strength (kbKeys),
  // while touch-held directions ramp in over ~180ms (touchStart timestamps).
  // `keys` (above) stays the OR of both sources, used for the exhaust flame.
  const kbKeys = { up: false, down: false, left: false, right: false };
  const touchStart = { up: 0, down: 0, left: 0, right: 0 };
  const TOUCH_RAMP_MS = 180;
  const activeTouches = new Map(); // touch.identifier -> { dir, glow }
  const isTouchDevice =
    matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  fetchGlobalBest("iss-docking").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

  function initStars() {
    stars = [...Array(120)].map(() => ({
      x: Math.random() * BASE_W,
      y: Math.random() * BASE_H,
      r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.3 + 0.1,
    }));
  }

  function buildBackground() {
    const c = document.createElement("canvas");
    c.width = BASE_W;
    c.height = BASE_H;
    const o = c.getContext("2d");
    const g = o.createLinearGradient(0, 0, 0, BASE_H);
    g.addColorStop(0, "#050617");
    g.addColorStop(0.6, "#071025");
    g.addColorStop(1, "#02030a");
    o.fillStyle = g;
    o.fillRect(0, 0, BASE_W, BASE_H);

    const eR = BASE_W * 0.42,
      eX = -eR * 0.15,
      eY = BASE_H - eR * 0.52;
    const lightAngle = -0.78; // upper-left sun direction, shared by earth + moon

    // atmosphere rim
    let rim = o.createRadialGradient(eX, eY, eR * 0.97, eX, eY, eR * 1.09);
    rim.addColorStop(0, "rgba(140,195,255,0)");
    rim.addColorStop(0.7, "rgba(140,195,255,0.35)");
    rim.addColorStop(1, "rgba(140,195,255,0)");
    o.fillStyle = rim;
    o.beginPath();
    o.arc(eX, eY, eR * 1.09, 0, Math.PI * 2);
    o.fill();
    let glow = o.createRadialGradient(eX, eY, eR * 0.5, eX, eY, eR * 2);
    glow.addColorStop(0, "rgba(255,255,255,0.05)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    o.fillStyle = glow;
    o.beginPath();
    o.arc(eX, eY, eR * 2, 0, Math.PI * 2);
    o.fill();

    // ocean sphere with sunlit highlight
    let body = o.createRadialGradient(
      eX + Math.cos(lightAngle) * eR * 0.45,
      eY + Math.sin(lightAngle) * eR * 0.45,
      eR * 0.05,
      eX,
      eY,
      eR * 1.05,
    );
    body.addColorStop(0, "#8fd0f2");
    body.addColorStop(0.28, "#3f8fc9");
    body.addColorStop(0.65, "#1f5f96");
    body.addColorStop(1, "#0d2c4d");
    o.fillStyle = body;
    o.beginPath();
    o.arc(eX, eY, eR, 0, Math.PI * 2);
    o.fill();

    /* Continents, caps, clouds and the terminator moved to the live pass
       (drawEarthDynamic): the surface now rotates and the cloud bands ride
       over it at their own speed, so nothing painted here may sit above
       them. Same shapes, same colours, same light. */
    EARTH.x = eX;
    EARTH.y = eY;
    EARTH.r = eR;
    EARTH.light = lightAngle;

    // moon: maria + varied craters + terminator
    const mR = BASE_W * 0.075,
      mX = BASE_W * 0.78,
      mY = BASE_H * 0.18;
    let mg = o.createRadialGradient(
      mX + Math.cos(lightAngle) * mR * 0.5,
      mY + Math.sin(lightAngle) * mR * 0.5,
      mR * 0.05,
      mX,
      mY,
      mR * 1.02,
    );
    mg.addColorStop(0, "#fbfbf9");
    mg.addColorStop(0.55, "#d6d3cc");
    mg.addColorStop(1, "#8f8c86");
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fillStyle = mg;
    o.fill();
    o.save();
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.clip();
    // maria (dark basaltic plains)
    o.fillStyle = "rgba(70,68,66,0.28)";
    for (const m of [{ ax: -0.15, ay: -0.2, s: 0.34 }, { ax: 0.38, ay: 0.22, s: 0.24 }, { ax: -0.48, ay: 0.32, s: 0.2 }, { ax: 0.12, ay: -0.55, s: 0.16 }, { ax: -0.55, ay: -0.35, s: 0.14 }]) {
      const dist = Math.min(0.94, Math.hypot(m.ax, m.ay));
      const fs = Math.sqrt(Math.max(0.2, 1 - dist * dist));
      const ang = Math.atan2(m.ay, m.ax);
      o.beginPath();
      o.ellipse(mX + m.ax * mR, mY + m.ay * mR, mR * m.s, mR * m.s * 0.7 * fs, ang, 0, Math.PI * 2);
      o.fill();
    }
    // craters with rim shading, radially foreshortened near the limb
    for (const c2 of [{ ax: 0.28, ay: -0.14, s: 0.12 }, { ax: -0.18, ay: 0.06, s: 0.09 }, { ax: 0.09, ay: 0.22, s: 0.07 }, { ax: -0.35, ay: -0.02, s: 0.05 }, { ax: 0.42, ay: 0.06, s: 0.06 }, { ax: 0.05, ay: -0.4, s: 0.045 }, { ax: -0.42, ay: 0.32, s: 0.06 }, { ax: 0.2, ay: 0.4, s: 0.04 }, { ax: 0.62, ay: -0.32, s: 0.05 }, { ax: -0.7, ay: 0.12, s: 0.045 }, { ax: -0.15, ay: 0.68, s: 0.055 }, { ax: 0.55, ay: 0.5, s: 0.04 }, { ax: -0.6, ay: -0.5, s: 0.04 }, { ax: 0.03, ay: 0.82, s: 0.035 }]) {
      const dist = Math.min(0.94, Math.hypot(c2.ax, c2.ay));
      const fs = Math.sqrt(Math.max(0.25, 1 - dist * dist));
      const ang = Math.atan2(c2.ay, c2.ax);
      const cx = mX + c2.ax * mR,
        cy = mY + c2.ay * mR,
        cr = mR * c2.s;
      o.save();
      o.translate(cx, cy);
      o.rotate(ang);
      o.scale(fs, 1);
      o.beginPath();
      o.arc(0, 0, cr, 0, Math.PI * 2);
      o.fillStyle = "rgba(50,48,46,0.32)";
      o.fill();
      o.beginPath();
      o.arc(-cr * 0.25, -cr * 0.25, cr * 0.62, 0, Math.PI * 2);
      o.fillStyle = "rgba(120,116,110,0.22)";
      o.fill();
      o.beginPath();
      o.arc(cr * 0.35, cr * 0.35, cr * 0.5, -0.3, 2.4);
      o.strokeStyle = "rgba(255,255,255,0.18)";
      o.lineWidth = cr * 0.18;
      o.stroke();
      o.restore();
    }
    o.restore();
    o.save();
    o.globalCompositeOperation = "multiply";
    let mshadow = o.createLinearGradient(
      mX - Math.cos(lightAngle) * mR,
      mY - Math.sin(lightAngle) * mR,
      mX + Math.cos(lightAngle) * mR,
      mY + Math.sin(lightAngle) * mR,
    );
    mshadow.addColorStop(0, "rgba(255,255,255,1)");
    mshadow.addColorStop(0.5, "rgba(150,150,150,0.5)");
    mshadow.addColorStop(1, "rgba(0,0,0,0.7)");
    o.fillStyle = mshadow;
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fill();
    o.restore();
    for (let i = 0; i < 80; i++) {
      o.globalAlpha = 0.6;
      o.beginPath();
      o.fillStyle = "#fff";
      o.arc(Math.random() * BASE_W, Math.random() * BASE_H, Math.random() * 1.2 + 0.2, 0, Math.PI * 2);
      o.fill();
    }
    o.globalAlpha = 1;
    bgCanvas = c;
  }

  /* ── Earth, dimensional ─────────────────────────────────
     The Pluto/Neptune treatment: the surface turns, the cloud deck turns
     faster and unevenly (banded), and the light side / terminator stays
     fixed to the sun. Every colour is the one the static bake used.

     Geometry: a point painted at normalized (nx, ny) on the old flat disc
     is treated as sitting on the sphere at latitude-band sqrt(1-ny²); its
     longitude advances with time and it re-projects to x = sin(λ)·band,
     foreshortening toward the limb and vanishing onto the far side. */
  const EARTH = { x: 0, y: 0, r: 1, light: -0.78 };
  const EARTH_SURFACE_W = 0.02; // rad/s — one lap in ~5 min
  const EARTH_CLOUD_W = 0.034; // faster than the ground below

  const CONTINENTS = [
    [[-0.05, -0.6], [0.2, -0.55], [0.34, -0.36], [0.2, -0.18], [0.3, 0.05], [0.18, 0.3], [0.05, 0.62], [-0.1, 0.36], [-0.24, 0.14], [-0.08, -0.1], [-0.2, -0.32], [-0.1, -0.5]],
    [[-0.55, -0.85], [-0.2, -0.92], [0.2, -0.88], [0.55, -0.75], [0.8, -0.55], [0.6, -0.42], [0.35, -0.5], [0.1, -0.4], [0.05, -0.15], [-0.15, -0.35], [-0.45, -0.55], [-0.65, -0.7]],
    [[0.55, 0.42], [0.72, 0.38], [0.78, 0.55], [0.65, 0.65], [0.48, 0.58], [0.45, 0.46]],
    [[-0.85, -0.6], [-0.72, -0.5], [-0.68, -0.1], [-0.78, 0.2], [-0.7, 0.55], [-0.85, 0.6], [-0.96, 0.2], [-0.96, -0.3]],
  ];
  const CLOUDS = [
    { x: -0.05, y: -0.55, s: 0.16 }, { x: 0.35, y: -0.3, s: 0.2 }, { x: -0.45, y: -0.15, s: 0.18 },
    { x: 0.55, y: 0.1, s: 0.15 }, { x: -0.3, y: 0.4, s: 0.19 }, { x: 0.15, y: 0.55, s: 0.14 },
    { x: -0.65, y: 0.35, s: 0.13 }, { x: 0.7, y: -0.5, s: 0.12 }, { x: 0.02, y: 0.02, s: 0.13 },
  ];

  function earthProject(nx, ny, rot) {
    const band = Math.sqrt(Math.max(0.0004, 1 - ny * ny));
    const lam0 = Math.asin(Math.max(-1, Math.min(1, nx / band)));
    const lam = (((lam0 + rot + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const front = Math.cos(lam) > 0;
    // Back-side points clamp to their limb so a shape straddling the edge
    // squashes onto it instead of folding across the disc.
    const x = front ? Math.sin(lam) * band : Math.sign(Math.sin(lam) || 1) * band;
    return { x, y: ny, front, cos: Math.max(0, Math.cos(lam)) };
  }

  function drawEarthDynamic(c, t) {
    const { x: eX, y: eY, r: eR, light } = EARTH;
    const rot = reducedMotion ? 0 : t * EARTH_SURFACE_W;

    c.save();
    c.beginPath();
    c.arc(eX, eY, eR, 0, Math.PI * 2);
    c.clip();

    const blobRot = (pts, rot2, scale = 1, dy = 0) => {
      const proj = pts.map(([nx, ny]) => earthProject(nx * scale, ny * scale + dy, rot2));
      if (!proj.some((p) => p.front)) return false;
      const p = proj.map((q) => [eX + q.x * eR, eY + q.y * eR]);
      const n = p.length;
      c.beginPath();
      c.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) {
        const a = p[i],
          b = p[(i + 1) % n];
        c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      c.closePath();
      return true;
    };

    c.fillStyle = "rgba(84,138,72,0.9)";
    for (const shape of CONTINENTS) if (blobRot(shape, rot)) c.fill();
    // Inland shading on the two big landmasses, as before.
    c.fillStyle = "rgba(58,100,50,0.55)";
    if (blobRot(CONTINENTS[0], rot, 0.55, -0.05)) c.fill();
    if (blobRot(CONTINENTS[1], rot, 0.6, -0.1)) c.fill();
    // Madagascar rides its longitude too.
    const mad = earthProject(0.34, 0.34, rot);
    if (mad.front) {
      c.fillStyle = "rgba(84,138,72,0.9)";
      c.beginPath();
      c.ellipse(eX + mad.x * eR, eY + mad.y * eR, eR * 0.035 * Math.max(0.25, mad.cos), eR * 0.06, 0.3, 0, Math.PI * 2);
      c.fill();
    }

    // Polar caps sit on the axis: they do not travel. Identical gradients.
    let capN = c.createLinearGradient(eX, eY - eR, eX, eY - eR * 0.62);
    capN.addColorStop(0, "rgba(255,255,255,0.95)");
    capN.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = capN;
    c.fillRect(eX - eR, eY - eR, eR * 2, eR * 0.42);
    let capS = c.createLinearGradient(eX, eY + eR, eX, eY + eR * 0.62);
    capS.addColorStop(0, "rgba(255,255,255,0.95)");
    capS.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = capS;
    c.fillRect(eX - eR, eY + eR * 0.58, eR * 2, eR * 0.42);

    // Cloud deck: same nine clouds, banded speeds — each latitude row slides
    // at its own rate over the ground, shearing where bands meet.
    const cloudRot = reducedMotion ? 0 : t * EARTH_CLOUD_W;
    c.fillStyle = "rgba(255,255,255,0.55)";
    for (const cl of CLOUDS) {
      const bandSpeed = 1 + 0.35 * Math.sin(cl.y * 6.5);
      const p = earthProject(cl.x, cl.y, cloudRot * bandSpeed);
      if (!p.front) continue;
      const dist = Math.min(0.96, Math.hypot(p.x, p.y));
      const fs = Math.sqrt(Math.max(0.2, 1 - dist * dist));
      const ang = Math.atan2(p.y, p.x);
      c.globalAlpha = 0.3;
      c.beginPath();
      c.ellipse(eX + p.x * eR, eY + p.y * eR, eR * cl.s * Math.max(0.3, p.cos), eR * cl.s * 0.42 * fs, ang, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.restore();

    // Terminator, fixed to the sun — drawn over the moving surface so the
    // night side always wins. Same multiply gradient as the old bake.
    c.save();
    c.globalCompositeOperation = "multiply";
    const shadow = c.createLinearGradient(
      eX - Math.cos(light) * eR,
      eY - Math.sin(light) * eR,
      eX + Math.cos(light) * eR,
      eY + Math.sin(light) * eR,
    );
    shadow.addColorStop(0, "rgba(255,255,255,1)");
    shadow.addColorStop(0.45, "rgba(120,130,150,0.55)");
    shadow.addColorStop(0.75, "rgba(0,0,0,0.55)");
    shadow.addColorStop(1, "rgba(0,0,0,0.75)");
    c.fillStyle = shadow;
    c.beginPath();
    c.arc(eX, eY, eR, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Thin atmospheric limb, crisp against the soft rim the bake carries.
    c.strokeStyle = "rgba(160,205,255,0.28)";
    c.lineWidth = Math.max(1.2, eR * 0.006);
    c.beginPath();
    c.arc(eX, eY, eR * 1.004, 0, Math.PI * 2);
    c.stroke();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Dynamic world size matches the viewport aspect ratio so the canvas
    // fills the window exactly without letterboxing or zoom changes.
    const prevW = BASE_W;
    const prevH = BASE_H;
    viewScale = H / DESIGN_H;
    BASE_W = W / viewScale;
    BASE_H = H / viewScale;
    viewOffX = 0;
    viewOffY = 0;

    // Rebuild background if aspect ratio changed significantly.
    if (!bgCanvas || Math.abs(prevW - BASE_W) > 1 || Math.abs(prevH - BASE_H) > 1) {
      initStars();
      buildBackground();
    }
  }
  addEventListener("resize", resize, { passive: true });

  /* ── Hazards ────────────────────────────────────────────
     Three kinds, all telegraphed: micrometeoroids cross the field and cost
     alignment on contact (an impulse, never the run); one large debris
     fragment at a time tumbles through the corridor on a straight,
     readable path and ends the approach on contact; and the station's own
     solar wings sweep the approach as it rotates — timing the gap is the
     intended skill. Density ramps with elapsed time. Everything spawns at
     an edge and travels in, so nothing appears without warning. */
  const rocks = [];
  const debris = [];
  const impacts = [];
  let nextRockAt = 0;
  let nextDebrisAt = 0;

  function edgeSpawn(speed, aimX, aimY) {
    const side = Math.floor(Math.random() * 4);
    const x = side === 2 ? -40 : side === 3 ? BASE_W + 40 : Math.random() * BASE_W;
    const y = side === 0 ? -40 : side === 1 ? BASE_H + 40 : Math.random() * BASE_H;
    const ang = Math.atan2(aimY - y, aimX - x);
    return { x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed };
  }

  function spawnRock() {
    // Aimed loosely across the middle of the field so it crosses the
    // approach path at some angle rather than hugging an edge.
    const s = edgeSpawn(
      120 + Math.random() * 170,
      BASE_W * (0.25 + Math.random() * 0.5),
      BASE_H * (0.25 + Math.random() * 0.5),
    );
    const r = 3.5 + Math.random() * 3;
    rocks.push({
      ...s,
      r,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2.4),
      verts: [...Array(7)].map(() => 0.7 + Math.random() * 0.5),
    });
  }

  function spawnDebris() {
    // A predictable straight line that passes near the station — through
    // the docking corridor — slow enough to be read minutes ahead.
    const s = edgeSpawn(
      55 + Math.random() * 35,
      station.x + (Math.random() * 2 - 1) * 110,
      station.y + (Math.random() * 2 - 1) * 110,
    );
    debris.push({
      ...s,
      r: 15 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.9),
    });
  }

  /* Capsule vs the station's solar wings, in the station's rotating frame.
     Wing rectangles match drawISS: y = ±82, x from mast (10) to tip (68),
     half-width 9.5. The small gimbal wobble is cosmetic and ignored. */
  function wingHit() {
    const dx = capsule.x - station.x;
    const dy = capsule.y - station.y;
    const ca = Math.cos(-station.angle);
    const sa = Math.sin(-station.angle);
    const lx = dx * ca - dy * sa;
    const ly = dx * sa + dy * ca;
    const m = capsule.r * 0.7;
    for (const wy of [-82, 82]) {
      if (Math.abs(ly - wy) < 9.5 + m && Math.abs(lx) > 10 - m && Math.abs(lx) < 68 + m) return true;
    }
    return false;
  }

  function reset() {
    score = 0;
    docked = false;
    gameOver = false;
    scoreSubmitted = false;
    keys = { up: false, down: false, left: false, right: false };
    capsule.x = 120;
    capsule.y = 120;
    capsule.vx = 0;
    capsule.vy = 0;
    station.x = BASE_W / 2;
    station.y = BASE_H / 2;
    station.angle = 0;
    startTime = performance.now();
    scoreEl.textContent = MAX_TIME;
    gameOverEl.classList.remove("show");
    rocks.length = 0;
    debris.length = 0;
    impacts.length = 0;
    nextRockAt = 3000;
    nextDebrisAt = 13000;
  }

  function endGame(won) {
    gameOver = true;
    docked = won;
    if (score > best) {
      best = Math.floor(score);
      bestEl.textContent = best;
    }
    gameOverTitle.textContent = won ? "DOCKED" : "DOCKING FAILED";
    gameOverCard.classList.toggle("docked", won);
    gameOverCard.classList.toggle("failed", !won);
    gameOverEl.classList.add("show");
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({
          gameKey: "iss-docking",
          gameLabel: "ISS Docking",
          score: Math.floor(score),
          ask: true,
        });
      }, 60);
    }
  }

  function hideIntro() {
    if (introHidden || !introEl) return;
    introHidden = true;
    introEl.style.transition = "opacity .4s ease, transform .4s ease";
    introEl.style.opacity = "0";
    introEl.style.transform = "translateY(-10px)";
    if (approachEl && introHidden) {
      approachEl.style.display = "block";
      approachEl.style.transition = "opacity .4s ease-in 0.4s, transform .4s ease-in 0.4s";
      approachEl.style.opacity = "1";
      approachEl.style.transform = "translateY(-10px)";
    }
  }

  // Keyboard + d-pad: instant full-strength thrust (unchanged behavior).
  function press(dir) {
    kbKeys[dir] = true;
    keys[dir] = true;
    hideIntro();
  }
  function release(dir) {
    kbKeys[dir] = false;
    if (!touchStart[dir]) keys[dir] = false;
  }

  // Invisible touch zones: thrust ramps in via touchStart timestamps (see step()).
  function pressTouchDir(dir) {
    if (!touchStart[dir]) touchStart[dir] = performance.now();
    keys[dir] = true;
    hideIntro();
  }
  function releaseTouchDir(dir) {
    touchStart[dir] = 0;
    if (!kbKeys[dir]) keys[dir] = false;
  }

  function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function step(ts) {
    if (!last) last = ts;
    const dt = Math.min(33, ts - last) * 0.001;
    last = ts;
    const set = TUNING;

    for (const s of stars) {
      s.y += s.s * dt * 60;
      if (s.y > BASE_H) s.y = -2;
    }

    if (!gameOver) {
      station.angle += station.av * dt;
      const thrust = set.thrust;
      // Keyboard thrust is always full strength (unchanged from before);
      // touch thrust ramps in over TOUCH_RAMP_MS so it doesn't snap on contact.
      const thrustFactor = (dir) => {
        if (kbKeys[dir]) return 1;
        if (!touchStart[dir]) return 0;
        return Math.min(1, (performance.now() - touchStart[dir]) / TOUCH_RAMP_MS);
      };
      if (keys.up) capsule.vy -= thrust * thrustFactor("up") * dt;
      if (keys.down) capsule.vy += thrust * thrustFactor("down") * dt;
      if (keys.left) capsule.vx -= thrust * thrustFactor("left") * dt;
      if (keys.right) capsule.vx += thrust * thrustFactor("right") * dt;
      capsule.vx *= Math.pow(0.96, dt * 60);
      capsule.vy *= Math.pow(0.96, dt * 60);
      capsule.x += capsule.vx * dt;
      capsule.y += capsule.vy * dt;
      capsule.x = Math.max(capsule.r, Math.min(BASE_W - capsule.r, capsule.x));
      capsule.y = Math.max(capsule.r, Math.min(BASE_H - capsule.r, capsule.y));

      const dx = station.x - capsule.x,
        dy = station.y - capsule.y;
      const dist = Math.hypot(dx, dy);
      const approachSpeed = Math.hypot(capsule.vx, capsule.vy);
      const portAngle = Math.atan2(dy, dx);
      const dockAngle = (station.angle + Math.PI) % (Math.PI * 2);
      const angleDiff = Math.abs(((dockAngle - portAngle + Math.PI) % (Math.PI * 2)) - Math.PI);

      // countdown from MAX_TIME so faster docking = higher score
      const elapsed = (ts - startTime) * 0.001;
      const timeLeft = Math.max(0, MAX_TIME - elapsed);
      scoreEl.textContent = Math.ceil(timeLeft);

      // ── Hazards: spawn (density ramps with the run), move, collide ──
      const elapsedMs = elapsed * 1000;
      if (elapsedMs >= nextRockAt && rocks.length < 10) {
        spawnRock();
        nextRockAt = elapsedMs + Math.max(950, 2600 - elapsed * 50);
      }
      if (elapsedMs >= nextDebrisAt && debris.length < (elapsed > 35 ? 2 : 1)) {
        spawnDebris();
        nextDebrisAt = elapsedMs + Math.max(9000, 16000 - elapsed * 130);
      }

      for (let i = rocks.length - 1; i >= 0; i--) {
        const rk = rocks[i];
        rk.x += rk.vx * dt;
        rk.y += rk.vy * dt;
        rk.rot += rk.rv * dt;
        if (rk.x < -60 || rk.x > BASE_W + 60 || rk.y < -60 || rk.y > BASE_H + 60) {
          rocks.splice(i, 1);
          continue;
        }
        if (Math.hypot(rk.x - capsule.x, rk.y - capsule.y) < rk.r + capsule.r) {
          // Costs alignment, not the run: shoved off axis along the rock's
          // own line of travel, forcing a correction.
          const sp = Math.hypot(rk.vx, rk.vy) || 1;
          const push = 100 + Math.random() * 50;
          capsule.vx += (rk.vx / sp) * push;
          capsule.vy += (rk.vy / sp) * push;
          impacts.push({ x: rk.x, y: rk.y, until: ts + 350 });
          rocks.splice(i, 1);
        }
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const db = debris[i];
        db.x += db.vx * dt;
        db.y += db.vy * dt;
        db.rot += db.rv * dt;
        if (db.x < -80 || db.x > BASE_W + 80 || db.y < -80 || db.y > BASE_H + 80) {
          debris.splice(i, 1);
          continue;
        }
        if (Math.hypot(db.x - capsule.x, db.y - capsule.y) < db.r * 0.85 + capsule.r) {
          score = Math.floor(MAX_TIME - timeLeft);
          endGame(false);
        }
      }

      // The panels sweep the corridor; clipping one ends the approach.
      if (!gameOver && wingHit()) {
        score = Math.floor(MAX_TIME - timeLeft);
        endGame(false);
      }

      const DIST_MARGIN = station.r + capsule.r + 8;
      const distPct = Math.max(0, Math.min(100, 100 - (dist / (DIST_MARGIN * 3)) * 100));
      const speedPct = Math.max(0, Math.min(100, 100 - (approachSpeed / set.speedThresh) * 60));
      const anglePct = Math.max(0, Math.min(100, 100 - (angleDiff / set.angleThresh) * 60));
      if (distFill) {
        distFill.style.width = distPct + "%";
        distFill.style.background = dist < DIST_MARGIN ? "#3fd67a" : "#e03a2f";
      }
      if (speedFill) {
        speedFill.style.width = speedPct + "%";
        speedFill.style.background = approachSpeed < set.speedThresh ? "#3fd67a" : "#e03a2f";
      }
      if (angleFill) {
        angleFill.style.width = anglePct + "%";
        angleFill.style.background = angleDiff < set.angleThresh ? "#3fd67a" : "#e03a2f";
      }

      // gameOver may already be set by a debris or wing strike this frame.
      if (!gameOver) {
        if (dist < DIST_MARGIN && approachSpeed < set.speedThresh && angleDiff < set.angleThresh) {
          score = Math.floor(timeLeft * POINTS_PER_SEC) + DOCKING_BONUS;
          scoreEl.textContent = score;
          endGame(true);
        } else if (dist < station.r + capsule.r + 2) {
          score = Math.floor(MAX_TIME - timeLeft);
          endGame(false);
        }
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function drawRock(c, rk) {
    c.save();
    c.translate(rk.x, rk.y);
    c.rotate(rk.rot);
    c.beginPath();
    rk.verts.forEach((v, i) => {
      const a = (i / rk.verts.length) * Math.PI * 2;
      const x = Math.cos(a) * rk.r * v;
      const y = Math.sin(a) * rk.r * v;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    c.fillStyle = "#59606c";
    c.fill();
    c.strokeStyle = "rgba(230,238,248,0.55)";
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }

  function drawDebris(c, db) {
    // A torn panel fragment: a shard with the solar-cell blues and a bent
    // strut, tumbling — the same palette drawSolarWing uses.
    c.save();
    c.translate(db.x, db.y);
    c.rotate(db.rot);
    const r = db.r;
    c.beginPath();
    c.moveTo(-r, -r * 0.55);
    c.lineTo(r * 0.7, -r * 0.85);
    c.lineTo(r, r * 0.35);
    c.lineTo(-r * 0.25, r * 0.8);
    c.closePath();
    const g = c.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, "#1c4a73");
    g.addColorStop(0.55, "#0d2c47");
    g.addColorStop(1, "#0a2038");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "rgba(200,220,240,0.7)";
    c.lineWidth = 1.6;
    c.stroke();
    c.strokeStyle = "rgba(140,180,230,0.35)";
    c.lineWidth = 0.7;
    for (let gx = -r * 0.7; gx < r; gx += r * 0.32) {
      c.beginPath();
      c.moveTo(gx, -r * 0.7);
      c.lineTo(gx * 0.8, r * 0.6);
      c.stroke();
    }
    c.strokeStyle = "#8b93a0";
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-r * 1.1, r * 0.2);
    c.lineTo(-r * 0.2, -r * 0.15);
    c.stroke();
    c.restore();
  }

  function drawSolarWing(c, dir) {
    const len = 58,
      wid = 19,
      mastLen = 10;
    c.save();
    c.scale(dir, 1);
    c.strokeStyle = "#8b93a0";
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(mastLen, 0);
    c.stroke();
    c.translate(mastLen, 0);
    let panelGrad = c.createLinearGradient(0, -wid / 2, 0, wid / 2);
    panelGrad.addColorStop(0, "#1c4a73");
    panelGrad.addColorStop(0.5, "#0d2c47");
    panelGrad.addColorStop(1, "#0a2038");
    c.fillStyle = panelGrad;
    c.fillRect(0, -wid / 2, len, wid);
    c.strokeStyle = "rgba(140,180,230,0.35)";
    c.lineWidth = 0.6;
    for (let gx = 6; gx < len; gx += 8) {
      c.beginPath();
      c.moveTo(gx, -wid / 2);
      c.lineTo(gx, wid / 2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(len, 0);
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.08)";
    c.fillRect(4, -wid / 2 + 2, len - 8, 3);
    c.strokeStyle = "rgba(10,16,26,0.8)";
    c.lineWidth = 1.4;
    c.strokeRect(0, -wid / 2, len, wid);
    c.restore();
  }

  function drawISS(c, st, t) {
    c.save();
    c.translate(st.x, st.y);
    c.rotate(st.angle);

    let glow = c.createRadialGradient(0, 0, 20, 0, 0, 150);
    glow.addColorStop(0, "rgba(180,210,255,0.10)");
    glow.addColorStop(1, "rgba(180,210,255,0)");
    c.fillStyle = glow;
    c.beginPath();
    c.arc(0, 0, 150, 0, Math.PI * 2);
    c.fill();

    const trussTop = -118,
      trussBot = 118,
      trussW = 9;
    let trussGrad = c.createLinearGradient(-trussW / 2, 0, trussW / 2, 0);
    trussGrad.addColorStop(0, "#5b6472");
    trussGrad.addColorStop(0.5, "#e8edf5");
    trussGrad.addColorStop(1, "#5b6472");
    c.fillStyle = trussGrad;
    c.fillRect(-trussW / 2, trussTop, trussW, trussBot - trussTop);
    c.strokeStyle = "rgba(20,26,36,0.5)";
    c.lineWidth = 1.2;
    for (let y = trussTop + 6; y < trussBot; y += 11) {
      c.beginPath();
      c.moveTo(-trussW / 2, y);
      c.lineTo(trussW / 2, y - 9);
      c.stroke();
      c.beginPath();
      c.moveTo(-trussW / 2, y - 9);
      c.lineTo(trussW / 2, y);
      c.stroke();
    }

    for (const spec of [{ y: -82, gimbal: 0.35 }, { y: 82, gimbal: -0.28 }]) {
      const gAngle = spec.gimbal * Math.sin(t * 0.15) - st.angle * 0.15;
      c.save();
      c.translate(0, spec.y);
      c.fillStyle = "#c9a227";
      c.fillRect(-6, -6, 12, 12);
      c.rotate(gAngle);
      drawSolarWing(c, -1);
      drawSolarWing(c, 1);
      c.restore();
    }

    for (const rx of [-24, 30]) {
      c.save();
      c.translate(rx, 0);
      let rg = c.createLinearGradient(-9, 0, 9, 0);
      rg.addColorStop(0, "#aeb8c4");
      rg.addColorStop(0.5, "#f2f5f9");
      rg.addColorStop(1, "#aeb8c4");
      c.fillStyle = rg;
      c.fillRect(-9, -34, 18, 68);
      c.strokeStyle = "rgba(20,26,36,0.35)";
      c.lineWidth = 1;
      for (let ry = -30; ry < 34; ry += 8) {
        c.beginPath();
        c.moveTo(-9, ry);
        c.lineTo(9, ry);
        c.stroke();
      }
      c.restore();
    }

    const modules = [
      { x: -52, len: 26, d: 22, c1: "#d7cf9a", c2: "#a89a5a" },
      { x: -26, len: 24, d: 24, c1: "#e7ebf1", c2: "#aab2bd" },
      { x: 0, len: 26, d: 26, c1: "#d5dbe3", c2: "#9aa4b0" },
      { x: 26, len: 24, d: 24, c1: "#e7ebf1", c2: "#aab2bd" },
    ];
    for (const m of modules) {
      c.save();
      c.translate(m.x, 0);
      let mg = c.createLinearGradient(0, -m.d / 2, 0, m.d / 2);
      mg.addColorStop(0, m.c2);
      mg.addColorStop(0.45, m.c1);
      mg.addColorStop(1, m.c2);
      c.fillStyle = mg;
      roundRectPath(c, -m.len / 2, -m.d / 2, m.len, m.d, m.d / 2.2);
      c.fill();
      c.strokeStyle = "rgba(15,20,30,0.4)";
      c.lineWidth = 1;
      roundRectPath(c, -m.len / 2, -m.d / 2, m.len, m.d, m.d / 2.2);
      c.stroke();
      c.fillStyle = "rgba(60,120,190,0.55)";
      c.beginPath();
      c.arc(-2, 0, 2.6, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    c.save();
    c.translate(46, 0);
    const pulse = 0.55 + 0.45 * Math.sin(t * 3);
    c.beginPath();
    c.arc(0, 0, 15, -0.65, 0.65);
    c.fillStyle = `rgba(224,58,47,${0.12 + 0.1 * pulse})`;
    c.fill();
    c.strokeStyle = "#e03a2f";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 9, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#e03a2f";
    c.beginPath();
    c.arc(0, 0, 4.5, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.fillStyle = `rgba(255,80,60,${0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 4))})`;
    c.beginPath();
    c.arc(0, trussTop + 4, 2.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = `rgba(120,200,255,${0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 4 + Math.PI))})`;
    c.beginPath();
    c.arc(0, trussBot - 4, 2.6, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  function drawCapsule(c, cap, k) {
    c.save();
    c.translate(cap.x, cap.y);
    const heading = Math.atan2(cap.vy, cap.vx) || 0;
    c.rotate(heading);
    c.fillStyle = "#123a5e";
    c.fillRect(-4, -17, 9, 8);
    c.fillRect(-4, 9, 9, 8);
    let bodyGrad = c.createLinearGradient(0, -9, 0, 9);
    bodyGrad.addColorStop(0, "#e9edf3");
    bodyGrad.addColorStop(0.5, "#c3cad4");
    bodyGrad.addColorStop(1, "#8b93a0");
    c.fillStyle = bodyGrad;
    roundRectPath(c, -14, -9, 22, 18, 6);
    c.fill();
    c.beginPath();
    c.moveTo(8, -9);
    c.lineTo(20, 0);
    c.lineTo(8, 9);
    c.closePath();
    c.fillStyle = "#aab2bd";
    c.fill();
    c.fillStyle = "#4aa3df";
    c.beginPath();
    c.arc(-2, 0, 3.6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(10,16,26,0.6)";
    c.lineWidth = 1;
    roundRectPath(c, -14, -9, 22, 18, 6);
    c.stroke();
    if (k.up || k.down || k.left || k.right) {
      c.fillStyle = "#e03a2f";
      c.beginPath();
      c.moveTo(-14, -4);
      c.lineTo(-14, 4);
      c.lineTo(-24 - Math.random() * 7, 0);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function draw() {
    const t = performance.now() * 0.001;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0);
    drawEarthDynamic(ctx, t);

    for (const s of stars) {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawISS(ctx, station, t);

    // Hazards render above the station so nothing sneaks up hidden by it.
    for (const db of debris) drawDebris(ctx, db);
    for (const rk of rocks) drawRock(ctx, rk);
    for (let i = impacts.length - 1; i >= 0; i--) {
      const im = impacts[i];
      const left = (im.until - performance.now()) / 350;
      if (left <= 0) {
        impacts.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(255,190,120,${(left * 0.8).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(im.x, im.y, 8 + (1 - left) * 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawCapsule(ctx, capsule, keys);

    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(station.x, station.y, station.r + 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Game-over sign is an HTML overlay (#gameOver), not drawn on the canvas.
    ctx.restore();
  }

  // --- input ---
  addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") press("up");
    if (e.code === "ArrowDown" || e.code === "KeyS") press("down");
    if (e.code === "ArrowLeft" || e.code === "KeyA") press("left");
    if (e.code === "ArrowRight" || e.code === "KeyD") press("right");
    if (gameOver && e.code === "KeyR") reset();
  });
  addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") release("up");
    if (e.code === "ArrowDown" || e.code === "KeyS") release("down");
    if (e.code === "ArrowLeft" || e.code === "KeyA") release("left");
    if (e.code === "ArrowRight" || e.code === "KeyD") release("right");
  });

  const bindBtn = (id, dir) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(dir);
    });
    const up = (e) => {
      e.preventDefault();
      release(dir);
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  };
  bindBtn("up", "up");
  bindBtn("down", "down");
  bindBtn("left", "left");
  bindBtn("right", "right");

  // Touch zones: invisible N/S/E/W directional areas split along diagonals
  // through the capsule's current on-screen position. Only activate on
  // touch-capable devices.
  if (isTouchDevice) {
    document.documentElement.classList.add("touch-zones");
    const touchZonesEl = document.getElementById("touchZones");
    if (touchZonesEl) {
      const resolveDir = (x, y) => {
        // Pivot on where the capsule is drawn (world → viewport, matches the
        // draw transform in the render pass). Read live so touchstart and
        // touchmove both use the capsule's current position.
        const cx = capsule.x * viewScale + viewOffX;
        const cy = capsule.y * viewScale + viewOffY;
        const dx = x - cx;
        const dy = y - cy;
        return Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
      };

      const createGlow = (x, y) => {
        const glow = document.createElement("div");
        glow.className = "touch-glow";
        glow.style.left = x + "px";
        glow.style.top = y + "px";
        touchZonesEl.appendChild(glow);
        setTimeout(() => glow.classList.add("on"), 0);
        return glow;
      };

      const fadeOutGlow = (glow) => {
        glow.classList.remove("on");
        glow.addEventListener(
          "transitionend",
          () => glow.remove(),
          { once: true }
        );
      };

      touchZonesEl.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          for (const t of e.touches) {
            if (activeTouches.has(t.identifier)) continue;
            const dir = resolveDir(t.clientX, t.clientY);
            const glow = createGlow(t.clientX, t.clientY);
            activeTouches.set(t.identifier, { dir, glow });
            pressTouchDir(dir);
          }
        },
        { passive: false }
      );

      touchZonesEl.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          for (const t of e.touches) {
            const entry = activeTouches.get(t.identifier);
            if (!entry) continue;
            entry.glow.style.left = t.clientX + "px";
            entry.glow.style.top = t.clientY + "px";
            // Follow the finger: if it drags into a new quadrant, swap thrust
            // directions without needing a lift-and-retap. Ramp restarts for
            // the new direction (pressTouchDir only sets touchStart when 0).
            const newDir = resolveDir(t.clientX, t.clientY);
            if (newDir !== entry.dir) {
              releaseTouchDir(entry.dir);
              pressTouchDir(newDir);
              entry.dir = newDir;
            }
          }
        },
        { passive: false }
      );

      const handleTouchEnd = (e) => {
        for (const t of e.changedTouches) {
          const entry = activeTouches.get(t.identifier);
          if (entry) {
            const { dir, glow } = entry;
            activeTouches.delete(t.identifier);
            fadeOutGlow(glow);
            releaseTouchDir(dir);
          }
        }
      };

      touchZonesEl.addEventListener("touchend", handleTouchEnd);
      touchZonesEl.addEventListener("touchcancel", handleTouchEnd);
    }
  } else {
    document.documentElement.classList.add("no-touch-zones");
  }

  gameOverRestart.addEventListener("click", reset);
  gameOverRestart.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      reset();
    },
    { passive: false },
  );

  // initialize
  resize(); // size the world to the viewport before building the background
  initStars();
  buildBackground();
  reset();
  requestAnimationFrame(step);
})();
