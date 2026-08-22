import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const fuelEl = document.getElementById("fuel");
  const bestEl = document.getElementById("best");
  const introEl = document.getElementById("intro");
  const gameOverEl = document.getElementById("gameOver");
  const gameOverCard = gameOverEl.querySelector(".gameover-card");
  const gameOverTitle = document.getElementById("gameOverTitle");
  const gameOverRestart = document.getElementById("gameOverRestart");

  const BASE_W = 720;
  const BASE_H = 1280;

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
    landed = false,
    introHidden = false;
  let stars = [];
  let lander = { x: BASE_W / 2, y: 140, vx: 0, vy: 0, angle: 0, fuel: 100 };
  let keys = { thrust: false, left: false, right: false };
  let pads = [];
  let bgCanvas = null;

  fetchGlobalBest("mars").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

  function buildBackground() {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const o = c.getContext("2d");

    // Deep space
    const sky = o.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#010208");
    sky.addColorStop(0.6, "#050914");
    sky.addColorStop(1, "#060a16");
    o.fillStyle = sky;
    o.fillRect(0, 0, W, H);

    // Mars — looms from upper-right, center above viewport
    const lA = -0.85; // light direction angle (sun upper-left)
    const lx = Math.cos(lA), ly = Math.sin(lA);
    const mR = Math.max(W, H) * 0.52;
    const mX = W * 0.78;
    const mY = -mR * 0.44;

    // Outer atmosphere haze (two-layer)
    const haze = o.createRadialGradient(mX, mY, mR * 0.96, mX, mY, mR * 1.24);
    haze.addColorStop(0,    "rgba(230,105,50,0)");
    haze.addColorStop(0.28, "rgba(230,105,50,0.20)");
    haze.addColorStop(0.68, "rgba(210,80,35,0.07)");
    haze.addColorStop(1,    "rgba(190,65,25,0)");
    o.fillStyle = haze;
    o.beginPath();
    o.arc(mX, mY, mR * 1.24, 0, Math.PI * 2);
    o.fill();

    // Thin inner limb ring
    const limb = o.createRadialGradient(mX, mY, mR * 0.91, mX, mY, mR * 1.01);
    limb.addColorStop(0,   "rgba(245,140,70,0)");
    limb.addColorStop(0.6, "rgba(245,135,65,0.34)");
    limb.addColorStop(1,   "rgba(220,100,45,0)");
    o.fillStyle = limb;
    o.beginPath();
    o.arc(mX, mY, mR * 1.01, 0, Math.PI * 2);
    o.fill();

    // Planet body — 6-stop radial gradient for rich spherical shading
    const body = o.createRadialGradient(
      mX + lx * mR * 0.40, mY + ly * mR * 0.40, mR * 0.02,
      mX, mY, mR,
    );
    body.addColorStop(0,    "#f8c890"); // sunlit specular
    body.addColorStop(0.10, "#eda060"); // bright rust
    body.addColorStop(0.28, "#d0602c"); // mid rust-orange
    body.addColorStop(0.52, "#962c14"); // deep rust
    body.addColorStop(0.78, "#521408"); // dark margin
    body.addColorStop(1,    "#1c0502"); // near-black limb
    o.fillStyle = body;
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fill();

    // ── Surface features (clipped to sphere) ──────────────────────────────
    o.save();
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.clip();

    // Hellas Planitia — ancient impact basin, southern hemi (slightly lighter)
    const hellasG = o.createRadialGradient(
      mX + mR * 0.44, mY + mR * 0.40, 0,
      mX + mR * 0.44, mY + mR * 0.40, mR * 0.30,
    );
    hellasG.addColorStop(0,   "rgba(205,125,72,0.40)");
    hellasG.addColorStop(0.55, "rgba(185,98,52,0.16)");
    hellasG.addColorStop(1,   "rgba(0,0,0,0)");
    o.fillStyle = hellasG;
    o.beginPath();
    o.arc(mX + mR * 0.44, mY + mR * 0.40, mR * 0.30, 0, Math.PI * 2);
    o.fill();

    // Arabia Terra — ancient highlands (dark mid-band)
    const arabiaG = o.createRadialGradient(
      mX + mR * 0.14, mY - mR * 0.06, 0,
      mX + mR * 0.14, mY - mR * 0.06, mR * 0.52,
    );
    arabiaG.addColorStop(0, "rgba(72,18,6,0.32)");
    arabiaG.addColorStop(1, "rgba(72,18,6,0)");
    o.fillStyle = arabiaG;
    o.fillRect(mX - mR, mY - mR, mR * 2, mR * 2);

    // Tharsis plateau — broad elevated region
    const tharsisG = o.createRadialGradient(
      mX - mR * 0.30, mY - mR * 0.18, 0,
      mX - mR * 0.30, mY - mR * 0.18, mR * 0.42,
    );
    tharsisG.addColorStop(0,   "rgba(175,72,28,0.24)");
    tharsisG.addColorStop(0.5, "rgba(130,48,18,0.10)");
    tharsisG.addColorStop(1,   "rgba(0,0,0,0)");
    o.fillStyle = tharsisG;
    o.fillRect(mX - mR, mY - mR, mR * 2, mR * 2);

    // Olympus Mons — largest volcano in solar system (22 km high)
    const omX = mX - mR * 0.48, omY = mY - mR * 0.30;
    const omR = mR * 0.115;
    // Broad flanks (concentric gradient)
    const omFlank = o.createRadialGradient(omX, omY, 0, omX, omY, omR * 1.4);
    omFlank.addColorStop(0,   "rgba(30,6,1,0.72)");
    omFlank.addColorStop(0.42, "rgba(55,14,4,0.50)");
    omFlank.addColorStop(0.80, "rgba(88,28,8,0.22)");
    omFlank.addColorStop(1,   "rgba(0,0,0,0)");
    o.fillStyle = omFlank;
    o.beginPath();
    o.arc(omX, omY, omR * 1.4, 0, Math.PI * 2);
    o.fill();
    // Sunlit flank highlight
    o.beginPath();
    o.arc(omX + omR * 0.25, omY - omR * 0.28, omR * 0.50, 0, Math.PI * 2);
    o.fillStyle = "rgba(215,125,62,0.26)";
    o.fill();
    // Caldera pit
    o.beginPath();
    o.arc(omX, omY, omR * 0.24, 0, Math.PI * 2);
    o.fillStyle = "rgba(20,4,1,0.70)";
    o.fill();
    // Caldera rim catch-light
    o.beginPath();
    o.arc(omX - omR * 0.08, omY - omR * 0.08, omR * 0.14, 0, Math.PI * 2);
    o.fillStyle = "rgba(200,110,55,0.30)";
    o.fill();

    // Tharsis chain: Ascraeus, Pavonis, Arsia Mons
    for (const v of [
      { x: -0.26, y: -0.16 },
      { x: -0.28, y: -0.03 },
      { x: -0.30, y:  0.11 },
    ]) {
      const vx = mX + v.x * mR, vy = mY + v.y * mR, vR = mR * 0.068;
      const vg = o.createRadialGradient(vx, vy, 0, vx, vy, vR * 1.3);
      vg.addColorStop(0,   "rgba(28,6,1,0.65)");
      vg.addColorStop(0.45, "rgba(52,14,4,0.38)");
      vg.addColorStop(1,   "rgba(0,0,0,0)");
      o.fillStyle = vg;
      o.beginPath();
      o.arc(vx, vy, vR * 1.3, 0, Math.PI * 2);
      o.fill();
      // caldera
      o.beginPath();
      o.arc(vx, vy, mR * 0.018, 0, Math.PI * 2);
      o.fillStyle = "rgba(18,4,1,0.72)";
      o.fill();
    }

    // Valles Marineris — canyon system with floor + sunlit rim
    o.lineCap = "round";
    o.lineJoin = "round";
    // Canyon floor (dark wide stroke)
    o.strokeStyle = "rgba(32,7,2,0.60)";
    o.lineWidth = mR * 0.065;
    o.beginPath();
    o.moveTo(mX - mR * 0.62, mY + mR * 0.14);
    o.bezierCurveTo(
      mX - mR * 0.22, mY + mR * 0.04,
      mX + mR * 0.22, mY + mR * 0.16,
      mX + mR * 0.56, mY + mR * 0.08,
    );
    o.stroke();
    // Sunward rim highlight (narrow bright stroke on top)
    o.strokeStyle = "rgba(210,120,60,0.24)";
    o.lineWidth = mR * 0.016;
    o.beginPath();
    o.moveTo(mX - mR * 0.62, mY + mR * 0.10);
    o.bezierCurveTo(
      mX - mR * 0.22, mY + mR * 0.00,
      mX + mR * 0.22, mY + mR * 0.12,
      mX + mR * 0.56, mY + mR * 0.04,
    );
    o.stroke();

    // Dust storm wisps — horizontal ellipses fading at edges
    for (const b of [
      { cy: -0.05, wx: 0.90, wy: 0.050, a: 0.10 },
      { cy:  0.24, wx: 0.72, wy: 0.036, a: 0.07 },
      { cy: -0.40, wx: 0.52, wy: 0.026, a: 0.06 },
    ]) {
      const by = mY + b.cy * mR;
      const dust = o.createLinearGradient(mX - b.wx * mR, by, mX + b.wx * mR, by);
      dust.addColorStop(0,    `rgba(218,128,65,0)`);
      dust.addColorStop(0.18, `rgba(218,128,65,${b.a})`);
      dust.addColorStop(0.82, `rgba(218,128,65,${b.a})`);
      dust.addColorStop(1,    `rgba(218,128,65,0)`);
      o.fillStyle = dust;
      o.beginPath();
      o.ellipse(mX, by, b.wx * mR, b.wy * mR, 0, 0, Math.PI * 2);
      o.fill();
    }

    // Polar ice cap — layered with spiral layering hint
    const cap = o.createLinearGradient(mX, mY - mR, mX, mY - mR * 0.73);
    cap.addColorStop(0,    "rgba(248,234,220,0.96)");
    cap.addColorStop(0.38, "rgba(235,216,202,0.74)");
    cap.addColorStop(0.75, "rgba(228,208,192,0.30)");
    cap.addColorStop(1,    "rgba(225,205,188,0)");
    o.fillStyle = cap;
    o.fillRect(mX - mR, mY - mR, mR * 2, mR * 0.34);
    // Subtle spiral layering strokes
    o.strokeStyle = "rgba(175,148,128,0.28)";
    o.lineWidth = mR * 0.005;
    for (let i = 1; i <= 4; i++) {
      o.beginPath();
      o.moveTo(mX - mR * (0.38 * i / 4.5), mY - mR + mR * 0.055 * i);
      o.bezierCurveTo(
        mX + mR * 0.22, mY - mR + mR * 0.040 * i,
        mX + mR * (0.40 * i / 4.5), mY - mR + mR * 0.090 * i,
        mX + mR * 0.12, mY - mR + mR * 0.120 * i,
      );
      o.stroke();
    }

    // Impact craters (southern/eastern hemisphere)
    for (const cr of [
      { x:  0.36, y:  0.28, r: 0.054 },
      { x: -0.14, y:  0.52, r: 0.038 },
      { x:  0.60, y:  0.16, r: 0.030 },
      { x:  0.24, y: -0.28, r: 0.026 },
      { x: -0.54, y:  0.22, r: 0.021 },
      { x:  0.50, y:  0.44, r: 0.018 },
    ]) {
      const cx = mX + cr.x * mR, cy = mY + cr.y * mR, cr2 = cr.r * mR;
      // Bowl
      const bowl = o.createRadialGradient(cx, cy, 0, cx, cy, cr2);
      bowl.addColorStop(0,   "rgba(38,8,2,0.48)");
      bowl.addColorStop(0.55, "rgba(155,72,32,0.18)");
      bowl.addColorStop(1,   "rgba(0,0,0,0)");
      o.fillStyle = bowl;
      o.beginPath();
      o.arc(cx, cy, cr2, 0, Math.PI * 2);
      o.fill();
      // Sunlit rim arc
      o.beginPath();
      o.arc(cx - cr2 * 0.30, cy - cr2 * 0.28, cr2 * 0.72, -Math.PI * 0.65, Math.PI * 0.15);
      o.strokeStyle = "rgba(225,135,72,0.30)";
      o.lineWidth = cr2 * 0.20;
      o.stroke();
    }

    o.restore();

    // Terminator — clipped to planet, multiply blend
    o.save();
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.clip();
    o.globalCompositeOperation = "multiply";
    const termG = o.createLinearGradient(
      mX - lx * mR, mY - ly * mR,
      mX + lx * mR, mY + ly * mR,
    );
    termG.addColorStop(0,    "rgba(255,255,255,1)");
    termG.addColorStop(0.36, "rgba(165,122,98,0.36)");
    termG.addColorStop(0.60, "rgba(8,2,1,0.58)");
    termG.addColorStop(1,    "rgba(0,0,0,0.82)");
    o.fillStyle = termG;
    o.fillRect(mX - mR * 1.1, mY - mR * 1.1, mR * 2.2, mR * 2.2);
    o.restore();

    // Stars — skip inside planet + atmosphere, occasional tinted
    for (let i = 0; i < 280; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      if (Math.hypot(sx - mX, sy - mY) < mR * 1.05) continue;
      const rng = Math.random();
      const col = rng < 0.06 ? "#ffd8a8" : rng < 0.11 ? "#b8d4ff" : "#ffffff";
      o.globalAlpha = 0.28 + Math.random() * 0.72;
      o.beginPath();
      o.fillStyle = col;
      o.arc(sx, sy, Math.random() * 1.6 + 0.1, 0, Math.PI * 2);
      o.fill();
    }
    o.globalAlpha = 1;

    bgCanvas = c;
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
    viewScale = Math.min(W / BASE_W, H / BASE_H);
    viewOffX = (W - BASE_W * viewScale) * 0.5;
    viewOffY = (H - BASE_H * viewScale) * 0.5;
    buildBackground();
  }
  addEventListener("resize", resize, { passive: true });
  resize();

  function initStars() {
    stars = [...Array(90)].map(() => ({
      x: Math.random() * BASE_W,
      y: Math.random() * BASE_H,
      r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.4 + 0.1,
    }));
  }
  initStars();

  function makePads() {
    pads = [];
    const count = 4;
    const gap = BASE_W / count;
    for (let i = 0; i < count; i++) {
      const y = BASE_H - 90 - Math.random() * 180;
      const w = 70 + Math.random() * 40;
      const x = i * gap + gap / 2;
      pads.push({ x: x - w / 2, y, w, h: 10 });
    }
  }
  makePads();

  function hideIntro() {
    if (introHidden || !introEl) return;
    introHidden = true;
    introEl.style.opacity = "0";
    introEl.style.transform = "translateY(-10px)";
  }

  function reset() {
    score = 0;
    landed = false;
    gameOver = false;
    scoreSubmitted = false;
    lander.x = BASE_W / 2;
    lander.y = 140;
    lander.vx = (Math.random() - 0.5) * 60;
    lander.vy = 0;
    lander.angle = 0;
    lander.fuel = 100;
    scoreEl.textContent = "0";
    fuelEl.textContent = "100";
    gameOverEl.classList.remove("show");
    makePads();
  }

  function endGame(won) {
    gameOver = true;
    landed = won;
    if (score > best) {
      best = Math.floor(score);
      bestEl.textContent = best;
    }
    gameOverTitle.textContent = won ? "TOUCHDOWN!" : "CRASHED";
    gameOverCard.classList.toggle("landed", won);
    gameOverCard.classList.toggle("crashed", !won);
    gameOverEl.classList.add("show");
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({
          gameKey: "mars",
          gameLabel: "Mars",
          score: Math.floor(score),
          ask: true,
        });
      }, 60);
    }
  }

  /* Auto-pause: tab switch or window blur pauses; the run resumes only
     by hand, and there is no manual pause control. */
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
    const dt = Math.min(33, ts - last) * 0.001;
    last = ts;

    for (const s of stars) {
      s.y += s.s * dt * 60;
      if (s.y > BASE_H) s.y = -2;
    }

    if (!gameOver) {
      score += dt * 2;
      scoreEl.textContent = Math.floor(score);

      const gravity = 60;
      lander.vy += gravity * dt;

      if (keys.left) lander.angle -= 2.2 * dt;
      if (keys.right) lander.angle += 2.2 * dt;

      if (keys.thrust && lander.fuel > 0) {
        const power = 180;
        lander.vx += Math.sin(lander.angle) * power * dt;
        lander.vy -= Math.cos(lander.angle) * power * dt;
        lander.fuel = Math.max(0, lander.fuel - 18 * dt);
        fuelEl.textContent = Math.floor(lander.fuel);
      }

      lander.x += lander.vx * dt;
      lander.y += lander.vy * dt;

      if (lander.x < 0 || lander.x > BASE_W) {
        lander.vx *= -0.6;
        lander.x = Math.max(0, Math.min(BASE_W, lander.x));
      }

      const speed = Math.hypot(lander.vx, lander.vy);
      const onPad = pads.find(
        (p) =>
          lander.x > p.x &&
          lander.x < p.x + p.w &&
          lander.y + 14 >= p.y &&
          lander.y + 14 <= p.y + p.h + 8,
      );

      if (onPad) {
        if (speed < 70 && Math.abs(lander.angle) < 0.35) {
          score += 500 + Math.floor(lander.fuel * 5);
          lander.vx = 0;
          lander.vy = 0;
          lander.y = onPad.y - 14;
          endGame(true);
        } else {
          endGame(false);
        }
      } else if (lander.y > BASE_H - 40) {
        endGame(false);
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // background is built at screen CSS-pixel size — draw it 1:1
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    // drifting parallax stars (subtle — bg already has static ones)
    for (const s of stars) {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Phobos surface — dark regolith strip at bottom
    const grd = ctx.createLinearGradient(0, BASE_H - 80, 0, BASE_H);
    grd.addColorStop(0, "#1c1410");
    grd.addColorStop(1, "#141008");
    ctx.fillStyle = grd;
    ctx.fillRect(0, BASE_H - 60, BASE_W, 60);
    // uneven surface ridge
    ctx.fillStyle = "#201814";
    ctx.beginPath();
    ctx.moveTo(0, BASE_H - 60);
    for (let x = 0; x <= BASE_W; x += 40) {
      ctx.lineTo(x, BASE_H - 60 + (Math.sin(x * 0.031) * 8 + Math.cos(x * 0.071) * 5));
    }
    ctx.lineTo(BASE_W, BASE_H);
    ctx.lineTo(0, BASE_H);
    ctx.closePath();
    ctx.fill();

    // landing pads
    for (const p of pads) {
      // support legs
      ctx.strokeStyle = "rgba(180,160,140,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 8, p.y + p.h);
      ctx.lineTo(p.x + 4, p.y + p.h + 14);
      ctx.moveTo(p.x + p.w - 8, p.y + p.h);
      ctx.lineTo(p.x + p.w - 4, p.y + p.h + 14);
      ctx.stroke();
      // pad surface
      ctx.fillStyle = "#e07a5f";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 6, p.y + 5);
      ctx.lineTo(p.x + p.w - 6, p.y + 5);
      ctx.stroke();
    }

    // lander
    ctx.save();
    ctx.translate(lander.x, lander.y);
    ctx.rotate(lander.angle);
    ctx.fillStyle = "#dfe6f2";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(180,220,255,.7)";
    ctx.beginPath();
    ctx.arc(0, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    if (keys.thrust && lander.fuel > 0) {
      ctx.fillStyle = "#e03a2f";
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.lineTo(5, 8);
      ctx.lineTo(0, 28 + Math.random() * 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  function setKey(dir, active) {
    keys[dir] = active;
    if (active) hideIntro();
  }

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW")
      setKey("thrust", true);
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", true);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", true);
    if (gameOver && e.code === "KeyR") reset();
  });
  addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW")
      setKey("thrust", false);
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", false);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", false);
  });

  const bindBtn = (id, dir) => {
    const el = document.getElementById(id);
    el.addEventListener("touchstart", (e) => { e.preventDefault(); setKey(dir, true); }, { passive: false });
    el.addEventListener("touchend", (e) => { e.preventDefault(); setKey(dir, false); }, { passive: false });
    el.addEventListener("mousedown", (e) => { e.preventDefault(); setKey(dir, true); });
    el.addEventListener("mouseup", (e) => { e.preventDefault(); setKey(dir, false); });
    el.addEventListener("mouseleave", (e) => { e.preventDefault(); setKey(dir, false); });
  };
  bindBtn("thrust", "thrust");
  bindBtn("left", "left");
  bindBtn("right", "right");

  gameOverRestart.addEventListener("click", reset);
  gameOverRestart.addEventListener("touchstart", (e) => { e.preventDefault(); reset(); }, { passive: false });

  requestAnimationFrame(step);
})();
