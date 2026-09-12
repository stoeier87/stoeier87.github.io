import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";
import { definePlanetField } from "../../shared/elements/planet-field.ts";
import { defineGameTopbar } from "../../shared/elements/game-topbar.ts";
import { defineGameOver } from "../../shared/elements/game-over.ts";
import { defineGameIntro } from "../shared/game-intro.ts";
import { color } from "../../tokens.ts";

definePlanetField();
defineGameTopbar();
defineGameOver();
defineGameIntro();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// .intro-keys defaults to display:none; only the list matching the
// player's input method gets .show (same pattern as pluto/ice-fall.js).
{
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover) document.getElementById("introKeys")?.classList.add("show");
  else document.getElementById("introTouch")?.classList.add("show");
}

function hideIntro() {
  const el = document.getElementById("intro");
  if (!el) return;
  el.style.opacity = "0";
  el.style.transform = "translateY(-10px)";
  el.style.pointerEvents = "none";
}
addEventListener("pointerdown", hideIntro, { once: true });
addEventListener("keydown", hideIntro, { once: true });

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  // Dual world presets: desktop tracks the viewport, mobile is portrait-native.
  const MOBILE_W = 720;
  const MOBILE_H = 1280; // 9:16

  let BASE_W = MOBILE_W;
  let BASE_H = MOBILE_H;

  let W = 0,
    H = 0,
    dpr = 1,
    last = 0,
    score = 0,
    spawnT = 0,
    beamCd = 0,
    elapsed = 0,
    campZone = -1,
    campMs = 0,
    gameOver = false;
  let debris = [],
    beams = [];
  let pointer = { x: 0, y: 0, down: false, seen: false, id: null };
  const gameOverEl = document.getElementById("gameOver");
  const finalScoreEl = document.getElementById("finalScore");
  const finalBestEl = document.getElementById("finalBest");
  const bestMarkerEl = document.getElementById("bestMarker");
  const gameOverRestart = document.getElementById("gameOverRestart");
  let scoreSubmissionStarted = false;

  let viewScale = 1;
  let viewOffX = 0;
  let viewOffY = 0;

  let best = 0;
  bestEl.textContent = best;
  fetchGlobalBest("mercury").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

  const ufo = { x: 0, y: 0, r: 14 };
  const planet = { x: 0, y: 0, r: 52, mass: 18000 };

  function worldW() {
    return BASE_W;
  }
  function worldH() {
    return BASE_H;
  }

  function isMobileLike() {
    return (
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900
    );
  }

  function setWorldPreset() {
    if (isMobileLike()) {
      BASE_W = MOBILE_W;
      BASE_H = MOBILE_H;
    } else {
      BASE_W = W;
      BASE_H = H;
    }
  }

  function getViewportSize() {
    const vv = window.visualViewport;
    if (vv) return { w: Math.round(vv.width), h: Math.round(vv.height) };
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function updateView() {
    viewScale = Math.min(W / BASE_W, H / BASE_H);
    viewOffX = (W - BASE_W * viewScale) * 0.5;
    viewOffY = (H - BASE_H * viewScale) * 0.5;
  }

  function screenToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    let wx = (sx - viewOffX) / viewScale;
    let wy = (sy - viewOffY) / viewScale;
    wx = Math.max(0, Math.min(BASE_W, wx));
    wy = Math.max(0, Math.min(BASE_H, wy));
    return { x: wx, y: wy };
  }

  function setPointerFromEvent(e) {
    const p = screenToWorld(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.seen = true;
  }

  /* ── The setting: Mercury itself ──────────────────────────────────────
     A real PlanetBody inside <st-planet-field>, same as pluto/neptune/
     saturn/jupiter — the element also supplies the star layers, so the old
     hand-rolled 2D starfield is gone. The spec is mutated in place on
     resize (assigning `.planets` would rebuild textures); layoutBackdrop()
     inverts the element's placement maths so the sphere lands exactly
     where the gameplay planet sits on screen. */
  const backdrop = document.getElementById("bg");
  let backdropPainted = false;

  const mercurySpec = {
    name: "MERCURY",
    r: 0.06,
    s0: 0,
    px: 0.5,
    pf: 1,
    hi: color.planet.merkurHi,
    lo: color.planet.merkurLo,
    spin: 0.02,
  };

  if (backdrop) backdrop.planets = [mercurySpec];

  function layoutBackdrop() {
    /* The element draws at x = px*W, y = H*0.55 + s0*H*pf, r = spec.r*vmin.
       Solve those for the planet's screen position; pf is 1 by choice. */
    const sx = viewOffX + planet.x * viewScale;
    const sy = viewOffY + planet.y * viewScale;
    mercurySpec.px = sx / W;
    mercurySpec.s0 = sy / H - 0.55;
    /* 1.15: a touch larger than the gravity circle for presence — the
       planet has no collision, so its drawn size is purely visual. */
    mercurySpec.r = (planet.r * 1.15 * viewScale) / Math.min(W, H);
  }

  function placeCoreObjects() {
    ufo.x = worldW() * 0.5;
    ufo.y = worldH() * 0.78;
    planet.x = worldW() * 0.5;
    planet.y = worldH() * 0.5;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const vp = getViewportSize();
    W = vp.w;
    H = vp.h;

    setWorldPreset();

    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateView();
    placeCoreObjects();
    layoutBackdrop();
  }

  addEventListener("resize", resize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize, { passive: true });
    window.visualViewport.addEventListener("scroll", resize, { passive: true });
  }
  resize();

  /* ---- Difficulty ramp -------------------------------------------------
     Every progressive value is derived from `elapsed`, so reset() only has to
     zero that (plus the camp tracker) to restore a genuinely fresh run. */
  const RAMP_MS = 120000; // two minutes to full difficulty
  const SPAWN_MS_START = 1200;
  const SPAWN_MS_END = 350;
  const FALL_SPEED_CAP = 1.8; // multiple of the starting meteor speed
  const CAMP_MS = 3000; // dwell time in one zone before we lean on it
  const CAMP_BIAS = 0.6; // share of a wave aimed at a camped ship
  const CULL_PAD = 140; // world-units margin beyond every edge before culling

  function difficulty() {
    return Math.min(1, elapsed / RAMP_MS);
  }

  function spawnInterval() {
    return SPAWN_MS_START + (SPAWN_MS_END - SPAWN_MS_START) * difficulty();
  }

  function fallSpeedMul() {
    return 1 + (FALL_SPEED_CAP - 1) * difficulty();
  }

  function waveSize() {
    return Math.max(1, Math.round(1 + difficulty() * 2 + (Math.random() - 0.5)));
  }

  /* Small ones fly fast, big ones lumber, so the field has to be read rather
     than purely reacted to. */
  const METEOR_CLASSES = [
    { w: 0.4, r: [7, 11], speed: [1.15, 1.4] },
    { w: 0.4, r: [12, 18], speed: [0.9, 1.1] },
    { w: 0.2, r: [19, 28], speed: [0.6, 0.8] },
  ];

  function pickClass() {
    let roll = Math.random();
    for (const c of METEOR_CLASSES) {
      if (roll < c.w) return c;
      roll -= c.w;
    }
    return METEOR_CLASSES[METEOR_CLASSES.length - 1];
  }

  /* Meteors arrive from ALL four edges, aimed loosely at the planet — the
     gravity well then bends every path, so nothing crosses in a straight
     line. A camped ship pulls part of the aim onto itself: pressure, not a
     homing missile. Edges are 0 top, 1 right, 2 bottom, 3 left. */
  function makeMeteor(edge, camping) {
    const c = pickClass();
    const r = c.r[0] + Math.random() * (c.r[1] - c.r[0]);
    const speed = c.speed[0] + Math.random() * (c.speed[1] - c.speed[0]);
    const WW = worldW(),
      HH = worldH();
    const off = r + 8;
    let x, y;
    if (edge === 0) {
      x = Math.random() * WW;
      y = -off;
    } else if (edge === 1) {
      x = WW + off;
      y = Math.random() * HH;
    } else if (edge === 2) {
      x = Math.random() * WW;
      y = HH + off;
    } else {
      x = -off;
      y = Math.random() * HH;
    }

    let tx = planet.x,
      ty = planet.y;
    if (camping && Math.random() < CAMP_BIAS) {
      tx += (ufo.x - planet.x) * 0.65;
      ty += (ufo.y - planet.y) * 0.65;
    }
    const heading = Math.atan2(ty - y, tx - x) + (Math.random() - 0.5) * 0.6;
    const v = HH * 0.13 * speed * fallSpeedMul();
    return {
      x,
      y,
      vx: Math.cos(heading) * v,
      vy: Math.sin(heading) * v,
      r,
      alive: true,
    };
  }

  function spawnWave() {
    const camping = campMs >= CAMP_MS;
    const n = waveSize();
    /* Walk the edges from a random start, so a multi-meteor wave never
       arrives as one clump from a single direction — and a route out always
       exists, because no wave can seal more than its own edges. */
    const start = Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) debris.push(makeMeteor((start + i) % 4, camping));
  }

  function fireBeam() {
    if (beamCd > 0 || gameOver) return;
    beamCd = 120;
    const centerY = worldH() * 0.5;
    const shootDown = ufo.y < centerY;
    beams.push({
      x: ufo.x,
      y: ufo.y + (shootDown ? ufo.r : -ufo.r),
      vx: 0,
      vy: shootDown ? 560 : -560,
    });
  }

  /* ── Input: two schemes, split on pointer type ─────────────────────────
     Mouse: the ship follows the cursor absolutely, click fires — the
     cursor IS where the ship already is, so firing never displaces it.
     Touch/pen: steering is RELATIVE — the ship follows the finger's
     MOVEMENT, never its position, so a firing tap cannot yank the ship
     across the screen (which it did: pointerdown both fired and set the
     follow target to the tap point — lethal now that threats come from
     every side). A still tap fires; a second finger during a steering
     drag fires too. */
  const TOUCH_GAIN = 1.15; // full-screen reach without full-screen thumb travel
  const TAP_MS = 300;
  const TAP_SLOP_PX = 12;
  const touch = { steering: false, lastX: 0, lastY: 0, startX: 0, startY: 0, t0: 0, moved: false };

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse") {
        if (pointer.id !== null && e.pointerId !== pointer.id) return;
        setPointerFromEvent(e);
        if (pointer.down) e.preventDefault();
        return;
      }
      if (!touch.steering || e.pointerId !== pointer.id) return;
      pointer.x = Math.max(
        0,
        Math.min(BASE_W, pointer.x + ((e.clientX - touch.lastX) / viewScale) * TOUCH_GAIN),
      );
      pointer.y = Math.max(
        0,
        Math.min(BASE_H, pointer.y + ((e.clientY - touch.lastY) / viewScale) * TOUCH_GAIN),
      );
      pointer.seen = true;
      touch.lastX = e.clientX;
      touch.lastY = e.clientY;
      if (Math.hypot(e.clientX - touch.startX, e.clientY - touch.startY) > TAP_SLOP_PX) {
        touch.moved = true;
      }
      e.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      if (gameOver) return;
      if (e.pointerType !== "mouse" && pointer.id !== null) {
        fireBeam(); // second finger mid-drag: fire, and never steal the steering
        return;
      }
      pointer.down = true;
      pointer.id = e.pointerId;
      if (e.pointerType === "mouse") {
        setPointerFromEvent(e);
        fireBeam();
      } else {
        /* The finger claims steering from wherever the ship IS — no jump */
        touch.steering = true;
        touch.moved = false;
        touch.t0 = performance.now();
        touch.lastX = touch.startX = e.clientX;
        touch.lastY = touch.startY = e.clientY;
        pointer.x = ufo.x;
        pointer.y = ufo.y;
        pointer.seen = true;
      }
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    },
    { passive: false },
  );

  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (pointer.id !== null && e.pointerId !== pointer.id) return;
      if (touch.steering && !touch.moved && performance.now() - touch.t0 < TAP_MS) {
        fireBeam(); // a still tap is a shot, not a destination
      }
      touch.steering = false;
      pointer.down = false;
      if (canvas.releasePointerCapture) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      pointer.id = null;
    },
    { passive: true },
  );

  canvas.addEventListener(
    "pointercancel",
    (e) => {
      if (pointer.id !== null && e.pointerId !== pointer.id) return;
      touch.steering = false;
      pointer.down = false;
      pointer.id = null;
    },
    { passive: true },
  );

  addEventListener("keydown", (e) => {
    if (e.code === "Space") fireBeam();
    if (gameOver && e.code === "KeyR") reset();
  });

  function reset() {
    score = 0;
    debris.length = 0;
    beams.length = 0;
    gameOver = false;
    /* Every progressive value goes back to its opening state */
    elapsed = 0;
    spawnT = SPAWN_MS_START;
    beamCd = 0;
    campZone = -1;
    campMs = 0;
    scoreSubmissionStarted = false;
    placeCoreObjects();
    gameOverEl.classList.remove("show");
  }

  /* Auto-pause: tab switch or window blur pauses; the run resumes only
     by hand, and there is no manual pause control. dt is derived from the
     frozen `last`, so no time is lost across a pause. */
  let paused = false;
  const pauseEl = document.getElementById("pause");
  function autoPause() {
    if (paused || gameOver) return;
    paused = true;
    pauseEl?.classList.add("show");
    document.body.classList.add("is-paused"); // blurs the 3D backdrop
  }
  addEventListener("blur", autoPause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) autoPause();
  });
  document.getElementById("resumeBtn")?.addEventListener("click", () => {
    paused = false;
    pauseEl?.classList.remove("show");
    document.body.classList.remove("is-paused");
    last = 0;
  });

  function step(ts) {
    if (paused) {
      requestAnimationFrame(step);
      return;
    }
    if (!last) last = ts;
    const dt = Math.min(33, ts - last);
    last = ts;
    if (beamCd > 0) beamCd -= dt;

    const WW = worldW(),
      HH = worldH();

    if (!gameOver) {
      score += dt * 0.01;
      scoreEl.textContent = Math.floor(score);

      elapsed += dt;

      if (pointer.seen) {
        /* Time-based easing (τ ≈ 67 ms, the old 0.22/frame at 60 fps) —
           same feel at every refresh rate. The per-frame lerp doubled the
           ship's speed on 120 Hz phones the moment the opaque 2D
           background stopped throttling the loop to 60 fps. */
        const k = 1 - Math.exp(-dt / 67);
        ufo.x += (pointer.x - ufo.x) * k;
        ufo.y += (pointer.y - ufo.y) * k;
      }

      ufo.x = Math.max(10, Math.min(WW - 10, ufo.x));
      ufo.y = Math.max(10, Math.min(HH - 10, ufo.y));

      /* Which of the nine world zones (3×3) the ship is loitering in, and
         for how long — threats come from every side now, so camping is a
         position, not just a column */
      const zone =
        Math.min(2, Math.floor((ufo.x / WW) * 3)) +
        3 * Math.min(2, Math.floor((ufo.y / HH) * 3));
      if (zone === campZone) campMs += dt;
      else {
        campZone = zone;
        campMs = 0;
      }

      /* Spawned after the ship has moved, so a wave reacts to where it is now */
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnWave();
        spawnT = spawnInterval() * (0.88 + Math.random() * 0.24);
      }

      for (const d of debris) {
        const dx = planet.x - d.x,
          dy = planet.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        const g = planet.mass / (dist * dist);
        d.vx += (dx / dist) * g * dt * 0.001;
        d.vy += (dy / dist) * g * dt * 0.001;
        d.x += d.vx * dt * 0.001;
        d.y += d.vy * dt * 0.001;
      }

      for (const b of beams) {
        b.x += b.vx * dt * 0.001;
        b.y += b.vy * dt * 0.001;
      }
      beams = beams.filter((b) => b.y > -30 && b.y < HH + 30);

      for (const b of beams) {
        for (const d of debris) {
          if (!d.alive) continue;
          const dx = b.x - d.x,
            dy = b.y - d.y;
          if (dx * dx + dy * dy < (d.r + 4) * (d.r + 4)) {
            d.alive = false;
            score += 12;
          }
        }
      }
      /* Cull what has left the field — symmetric now that meteors enter and
         slingshot out through any edge. Spawns sit at most ~36 units outside,
         well inside the pad, so a fresh meteor is never culled. */
      debris = debris.filter(
        (d) =>
          d.alive &&
          d.x > -CULL_PAD &&
          d.x < WW + CULL_PAD &&
          d.y > -CULL_PAD &&
          d.y < HH + CULL_PAD,
      );

      for (const d of debris) {
        const dx = d.x - ufo.x,
          dy = d.y - ufo.y;
        if (dx * dx + dy * dy < (d.r + ufo.r) * (d.r + ufo.r)) {
          gameOver = true;
          if (score > best) {
            best = Math.floor(score);
            bestEl.textContent = best;
          }
          finalScoreEl.textContent = Math.floor(score);
          finalBestEl.textContent = best;
          bestMarkerEl.classList.toggle("show", score >= best && score > 0);
          gameOverEl.classList.add("show");

          if (!scoreSubmissionStarted) {
            scoreSubmissionStarted = true;
            setTimeout(async () => {
              const result = await submitScoreOnGameOver({
                gameKey: "mercury",
                gameLabel: "Orbit Runner — Mercury",
                score: Math.floor(score),
                ask: true,
              });
              console.log("[Orbit Runner] Score submission result:", result);
            }, 60);
          }
        }
      }
    }

    /* Under reduced motion the backdrop paints one static frame and stays
       put — same pattern as pluto/neptune/saturn/jupiter. */
    if (backdrop && (!reduced || !backdropPainted)) {
      backdrop.tick(ts);
      backdropPainted = true;
    }

    draw();
    requestAnimationFrame(step);
  }

  function draw() {
    /* The canvas is transparent: Mercury, the stars and the deep-space
       background all come from <st-planet-field> underneath. */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    const WW = worldW(),
      HH = worldH();

    /* Letterboxed viewports used to hide off-world spawns behind opaque
       bars; with a transparent canvas the clip does that job, so meteors
       still enter the frame instead of popping into existence. */
    ctx.beginPath();
    ctx.rect(0, 0, WW, HH);
    ctx.clip();

    for (const d of debris) {
      const shade = ctx.createRadialGradient(
        d.x - d.r * 0.35,
        d.y - d.r * 0.35,
        d.r * 0.2,
        d.x,
        d.y,
        d.r,
      );
      shade.addColorStop(0, "#d8dee8");
      shade.addColorStop(1, "#6d7684");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of beams) {
      const grad = ctx.createLinearGradient(
        b.x,
        b.y,
        b.x,
        b.y - (b.vy > 0 ? -24 : 24),
      );
      grad.addColorStop(0, "rgba(224,58,47,.95)");
      grad.addColorStop(1, "rgba(224,58,47,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y - (b.vy > 0 ? -28 : 28));
      ctx.stroke();
    }

    ctx.fillStyle = "#dfe6f2";
    ctx.beginPath();
    ctx.ellipse(ufo.x, ufo.y, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(180,220,255,.8)";
    ctx.beginPath();
    ctx.ellipse(ufo.x, ufo.y - 5, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(0, HH * 0.5);
    ctx.lineTo(WW, HH * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
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

  /* Start from the same state Restart produces, so run one and run two are
     identical rather than the first game quietly opening on different values */
  reset();

  requestAnimationFrame(step);
})();
