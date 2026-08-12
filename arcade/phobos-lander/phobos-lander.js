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

  fetchGlobalBest("phobos-lander").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

  function buildBackground() {
    // Build at real screen size so it maps 1:1 regardless of virtual world aspect ratio.
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const o = c.getContext("2d");

    // deep space gradient
    const g = o.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#020309");
    g.addColorStop(1, "#080c18");
    o.fillStyle = g;
    o.fillRect(0, 0, W, H);

    // Mars — large dramatic planet anchored to upper-right.
    // mY < 0 so only the lower arc of Mars shows, giving a "looming planet" feel.
    const lightAngle = -0.85; // sun upper-left
    const mR = Math.max(W, H) * 0.52;
    const mX = W * 0.78;
    const mY = -mR * 0.44;

    // atmosphere glow
    const atm = o.createRadialGradient(mX, mY, mR * 0.94, mX, mY, mR * 1.14);
    atm.addColorStop(0, "rgba(200,90,40,0)");
    atm.addColorStop(0.55, "rgba(210,100,45,0.26)");
    atm.addColorStop(1, "rgba(200,80,30,0)");
    o.fillStyle = atm;
    o.beginPath();
    o.arc(mX, mY, mR * 1.14, 0, Math.PI * 2);
    o.fill();

    // planet body — radial gradient lit from upper-left
    const body = o.createRadialGradient(
      mX + Math.cos(lightAngle) * mR * 0.42,
      mY + Math.sin(lightAngle) * mR * 0.42,
      mR * 0.04,
      mX, mY, mR * 1.02,
    );
    body.addColorStop(0,    "#f0b078");
    body.addColorStop(0.18, "#d06438");
    body.addColorStop(0.52, "#8c2e18");
    body.addColorStop(1,    "#2a0a04");
    o.fillStyle = body;
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fill();

    // surface features, clipped to sphere
    o.save();
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.clip();

    // Valles Marineris — long curved rift valley
    o.strokeStyle = "rgba(55,12,4,0.42)";
    o.lineWidth = mR * 0.045;
    o.lineCap = "round";
    o.beginPath();
    o.moveTo(mX - mR * 0.58, mY + mR * 0.12);
    o.bezierCurveTo(
      mX - mR * 0.22, mY + mR * 0.02,
      mX + mR * 0.18, mY + mR * 0.14,
      mX + mR * 0.52, mY + mR * 0.06,
    );
    o.stroke();

    // Tharsis volcanic plateau — subtle dark patch
    const tharsis = o.createRadialGradient(mX - mR * 0.32, mY - mR * 0.22, 0, mX - mR * 0.32, mY - mR * 0.22, mR * 0.35);
    tharsis.addColorStop(0, "rgba(50,12,4,0.38)");
    tharsis.addColorStop(1, "rgba(50,12,4,0)");
    o.fillStyle = tharsis;
    o.beginPath();
    o.arc(mX - mR * 0.32, mY - mR * 0.22, mR * 0.35, 0, Math.PI * 2);
    o.fill();

    // three Tharsis volcanoes as small dark circles
    for (const v of [{ x: -0.36, y: -0.28 }, { x: -0.2, y: -0.44 }, { x: -0.5, y: -0.16 }]) {
      o.beginPath();
      o.arc(mX + v.x * mR, mY + v.y * mR, mR * 0.048, 0, Math.PI * 2);
      o.fillStyle = "rgba(44,10,3,0.55)";
      o.fill();
      // caldera rim highlight
      o.beginPath();
      o.arc(mX + v.x * mR - mR * 0.01, mY + v.y * mR - mR * 0.01, mR * 0.028, 0, Math.PI * 2);
      o.fillStyle = "rgba(180,90,50,0.22)";
      o.fill();
    }

    // polar ice cap (north)
    const cap = o.createLinearGradient(mX, mY - mR, mX, mY - mR * 0.74);
    cap.addColorStop(0, "rgba(238,218,205,0.92)");
    cap.addColorStop(1, "rgba(238,218,205,0)");
    o.fillStyle = cap;
    o.fillRect(mX - mR, mY - mR, mR * 2, mR * 0.3);

    o.restore();

    // terminator (day/night boundary)
    o.save();
    o.globalCompositeOperation = "multiply";
    const shadow = o.createLinearGradient(
      mX - Math.cos(lightAngle) * mR,
      mY - Math.sin(lightAngle) * mR,
      mX + Math.cos(lightAngle) * mR,
      mY + Math.sin(lightAngle) * mR,
    );
    shadow.addColorStop(0,    "rgba(255,255,255,1)");
    shadow.addColorStop(0.40, "rgba(140,110,90,0.42)");
    shadow.addColorStop(0.70, "rgba(0,0,0,0.50)");
    shadow.addColorStop(1,    "rgba(0,0,0,0.72)");
    o.fillStyle = shadow;
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fill();
    o.restore();

    // stars — skip inside Mars
    for (let i = 0; i < 220; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      if (Math.hypot(sx - mX, sy - mY) < mR * 1.02) continue;
      o.globalAlpha = 0.35 + Math.random() * 0.65;
      o.beginPath();
      o.fillStyle = "#fff";
      o.arc(sx, sy, Math.random() * 1.4 + 0.15, 0, Math.PI * 2);
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
          gameKey: "phobos-lander",
          gameLabel: "Phobos Lander",
          score: Math.floor(score),
          ask: true,
        });
      }, 60);
    }
  }

  function step(ts) {
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
