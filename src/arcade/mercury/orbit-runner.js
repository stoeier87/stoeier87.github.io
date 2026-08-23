import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  // Dual world presets:
  // - desktop: fills wide screens
  // - mobile: portrait-native
  const DESKTOP_W = 1600;
  const DESKTOP_H = 900; // 16:9
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
  let stars = [],
    debris = [],
    beams = [];
  let pointer = { x: 0, y: 0, down: false, seen: false, id: null };
  let restartBtn = null;
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

  function updateRestartBtn() {
    if (!restartBtn) return;
    restartBtn.style.display = gameOver ? "block" : "none";
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

  function initStars() {
    stars = [
      ...Array(Math.max(90, Math.round((worldW() * worldH()) / 13000))),
    ].map(() => ({
      x: Math.random() * worldW(),
      y: Math.random() * worldH(),
      r: Math.random() * 1.5 + 0.4,
      s: Math.random() * 0.8 + 0.2,
    }));
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
    initStars();
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
  const FALL_SPEED_CAP = 1.8; // multiple of the starting fall speed
  const SPAWN_PAD = 26; // keeps a meteor fully on-screen at either edge
  const CAMP_MS = 3000; // dwell time in one third before we lean on it
  const CAMP_BIAS = 0.6; // share of a wave pulled toward the camped third

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

  /* Small ones fall fast, big ones lumber, so the field has to be read rather
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

  /* The full playable span — spawns cover all of it, edges included */
  function playableBand() {
    return { lo: SPAWN_PAD, hi: worldW() - SPAWN_PAD };
  }

  function shipLaneY() {
    return worldH() * 0.78;
  }

  /* The corridor the ship needs to slip through, in world units */
  function safeGap() {
    return ufo.r * 2 + 52;
  }

  function makeMeteor(x) {
    const c = pickClass();
    const r = c.r[0] + Math.random() * (c.r[1] - c.r[0]);
    const speed = c.speed[0] + Math.random() * (c.speed[1] - c.speed[0]);
    return {
      x,
      y: -r - 8,
      vx: (Math.random() - 0.5) * 30,
      vy: worldH() * 0.13 * speed * fallSpeedMul(),
      r,
      alive: true,
    };
  }

  /* Uniform across the whole band, except that parking in one third starts
     tilting the odds toward it — pressure, not a homing missile. */
  function sampleX(camping) {
    const { lo, hi } = playableBand();
    if (camping && campZone >= 0 && Math.random() < CAMP_BIAS) {
      const third = (hi - lo) / 3;
      return lo + campZone * third + Math.random() * third;
    }
    return lo + Math.random() * (hi - lo);
  }

  /* Forward-integrate a copy under the same gravity the live meteors feel, so
     the gap we validate is the gap the player actually arrives at rather than
     the one at spawn height. */
  function projectedX(m) {
    let x = m.x,
      y = m.y,
      vx = m.vx,
      vy = m.vy;
    const target = shipLaneY();
    const dt = 32;
    for (let i = 0; i < 300 && y < target; i++) {
      const dx = planet.x - x,
        dy = planet.y - y;
      const dist = Math.hypot(dx, dy) || 1;
      const g = planet.mass / (dist * dist);
      vx += (dx / dist) * g * dt * 0.001;
      vy += (dy / dist) * g * dt * 0.001;
      x += vx * dt * 0.001;
      y += vy * dt * 0.001;
    }
    return x;
  }

  /* Widest opening left at the ship's altitude, in world units */
  function widestGap(wave) {
    const { lo, hi } = playableBand();
    const blocked = wave
      .map((m) => {
        const px = projectedX(m);
        const half = m.r + ufo.r + 4;
        return [px - half, px + half];
      })
      .sort((a, b) => a[0] - b[0]);

    let cursor = lo;
    let widest = 0;
    for (const [a, b] of blocked) {
      if (a > cursor) widest = Math.max(widest, a - cursor);
      cursor = Math.max(cursor, b);
    }
    return Math.max(widest, hi - cursor);
  }

  function spawnWave() {
    const camping = campMs >= CAMP_MS;
    const wave = [];
    const n = waveSize();
    for (let i = 0; i < n; i++) wave.push(makeMeteor(sampleX(camping)));

    /* Checked, not assumed: thin the wave until a route exists. Dropping a
       meteor can only widen a gap, so this always terminates. */
    while (wave.length > 1 && widestGap(wave) < safeGap()) {
      wave.splice(Math.floor(Math.random() * wave.length), 1);
    }

    for (const m of wave) debris.push(m);
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

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (pointer.id !== null && e.pointerId !== pointer.id) return;
      setPointerFromEvent(e);
      if (pointer.down) e.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      if (gameOver) return;
      pointer.down = true;
      pointer.id = e.pointerId;
      setPointerFromEvent(e);
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      fireBeam();
    },
    { passive: false },
  );

  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (pointer.id !== null && e.pointerId !== pointer.id) return;
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
    updateRestartBtn();
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
  }
  addEventListener("blur", autoPause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) autoPause();
  });
  document.getElementById("resumeBtn")?.addEventListener("click", () => {
    paused = false;
    pauseEl?.classList.remove("show");
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

    for (const s of stars) {
      s.y += s.s * dt * 0.05;
      if (s.y > HH) s.y = -2;
    }

    if (!gameOver) {
      score += dt * 0.01;
      scoreEl.textContent = Math.floor(score);

      elapsed += dt;

      if (pointer.seen) {
        ufo.x += (pointer.x - ufo.x) * 0.22;
        ufo.y += (pointer.y - ufo.y) * 0.22;
      }

      ufo.x = Math.max(10, Math.min(WW - 10, ufo.x));
      ufo.y = Math.max(10, Math.min(HH - 10, ufo.y));

      /* Which third is the ship loitering in, and for how long */
      const band = playableBand();
      const third = Math.max(
        0,
        Math.min(2, Math.floor(((ufo.x - band.lo) / (band.hi - band.lo)) * 3)),
      );
      if (third === campZone) campMs += dt;
      else {
        campZone = third;
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
      /* Cull what has left the field — at a 350ms cadence the old code's
         alive-only filter let spent meteors accumulate for the whole run */
      debris = debris.filter(
        (d) =>
          d.alive &&
          d.y < HH + 90 &&
          d.y > -400 &&
          d.x > -160 &&
          d.x < WW + 160,
      );

      for (const d of debris) {
        const dx = d.x - ufo.x,
          dy = d.y - ufo.y;
        if (dx * dx + dy * dy < (d.r + ufo.r) * (d.r + ufo.r)) {
          gameOver = true;
          updateRestartBtn();
          if (score > best) {
            best = Math.floor(score);
            bestEl.textContent = best;
          }

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

    draw();
    requestAnimationFrame(step);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    const WW = worldW(),
      HH = worldH();
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, WW, HH);

    for (const s of stars) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const g = ctx.createRadialGradient(
      planet.x - 14,
      planet.y - 14,
      8,
      planet.x,
      planet.y,
      planet.r * 1.2,
    );
    g.addColorStop(0, "#7bc2f2");
    g.addColorStop(1, "#1d4f8d");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
    ctx.fill();

    for (const d of debris) {
      ctx.fillStyle = "#bfc9d6";
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

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(0, 0, WW, HH);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 30px "Archivo Black", sans-serif';
      ctx.fillText("MISSION FAILED", WW / 2, HH / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", WW / 2, HH / 2 + 14);
    }

    ctx.restore();
  }

  restartBtn = document.createElement("button");
  restartBtn.className = "restart-btn";
  restartBtn.type = "button";
  restartBtn.textContent = "Restart";
  restartBtn.addEventListener("click", reset);
  restartBtn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      reset();
    },
    { passive: false },
  );
  document.body.appendChild(restartBtn);

  /* Start from the same state Restart produces, so run one and run two are
     identical rather than the first game quietly opening on different values */
  reset();

  requestAnimationFrame(step);
})();
