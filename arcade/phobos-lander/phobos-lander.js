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
    const c = document.createElement("canvas");
    c.width = BASE_W;
    c.height = BASE_H;
    const o = c.getContext("2d");

    // deep space gradient
    const g = o.createLinearGradient(0, 0, 0, BASE_H);
    g.addColorStop(0, "#050610");
    g.addColorStop(0.6, "#080c1a");
    g.addColorStop(1, "#020308");
    o.fillStyle = g;
    o.fillRect(0, 0, BASE_W, BASE_H);

    const lightAngle = -0.78;

    // Mars — large reddish planet peeking in from the bottom
    const mR = BASE_W * 0.55;
    const mX = BASE_W * 0.5;
    const mY = BASE_H + mR * 0.35;

    // atmosphere rim
    const rim = o.createRadialGradient(mX, mY, mR * 0.97, mX, mY, mR * 1.08);
    rim.addColorStop(0, "rgba(200,100,60,0)");
    rim.addColorStop(0.6, "rgba(200,100,60,0.28)");
    rim.addColorStop(1, "rgba(200,100,60,0)");
    o.fillStyle = rim;
    o.beginPath();
    o.arc(mX, mY, mR * 1.08, 0, Math.PI * 2);
    o.fill();

    // Mars body with sunlit highlight
    const body = o.createRadialGradient(
      mX + Math.cos(lightAngle) * mR * 0.45,
      mY + Math.sin(lightAngle) * mR * 0.45,
      mR * 0.05,
      mX, mY, mR * 1.02,
    );
    body.addColorStop(0, "#e8a880");
    body.addColorStop(0.25, "#c96040");
    body.addColorStop(0.6, "#8a3020");
    body.addColorStop(1, "#3c1008");
    o.fillStyle = body;
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fill();

    // Mars surface detail — region blobs
    o.save();
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.clip();
    const blob = (pts) => {
      const p = pts.map(([nx, ny]) => [mX + nx * mR, mY + ny * mR]);
      const n = p.length;
      o.beginPath();
      o.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) {
        const a = p[i], b = p[(i + 1) % n];
        o.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      o.closePath();
    };
    // darker volcanic plains
    o.fillStyle = "rgba(90,30,10,0.5)";
    blob([[-0.3, -0.7], [0.1, -0.75], [0.35, -0.5], [0.2, -0.2], [-0.1, -0.3], [-0.4, -0.5]]);
    o.fill();
    blob([[0.4, -0.3], [0.7, -0.4], [0.75, -0.1], [0.55, 0.15], [0.3, 0.05]]);
    o.fill();
    blob([[-0.55, -0.2], [-0.65, 0.1], [-0.45, 0.3], [-0.2, 0.1], [-0.3, -0.15]]);
    o.fill();
    // polar ice cap (north)
    const capN = o.createLinearGradient(mX, mY - mR, mX, mY - mR * 0.65);
    capN.addColorStop(0, "rgba(240,220,200,0.9)");
    capN.addColorStop(1, "rgba(240,220,200,0)");
    o.fillStyle = capN;
    o.fillRect(mX - mR, mY - mR, mR * 2, mR * 0.38);
    o.restore();

    // terminator shadow
    o.save();
    o.globalCompositeOperation = "multiply";
    const shadow = o.createLinearGradient(
      mX - Math.cos(lightAngle) * mR,
      mY - Math.sin(lightAngle) * mR,
      mX + Math.cos(lightAngle) * mR,
      mY + Math.sin(lightAngle) * mR,
    );
    shadow.addColorStop(0, "rgba(255,255,255,1)");
    shadow.addColorStop(0.45, "rgba(120,100,90,0.4)");
    shadow.addColorStop(0.75, "rgba(0,0,0,0.5)");
    shadow.addColorStop(1, "rgba(0,0,0,0.7)");
    o.fillStyle = shadow;
    o.beginPath();
    o.arc(mX, mY, mR, 0, Math.PI * 2);
    o.fill();
    o.restore();

    // stars
    for (let i = 0; i < 120; i++) {
      o.globalAlpha = 0.55 + Math.random() * 0.45;
      o.beginPath();
      o.fillStyle = "#fff";
      o.arc(Math.random() * BASE_W, Math.random() * BASE_H * 0.72, Math.random() * 1.2 + 0.2, 0, Math.PI * 2);
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
    ctx.fillStyle = "#050610";
    ctx.fillRect(0, 0, W, H);

    // draw background fullscreen (cover scale)
    if (bgCanvas) {
      const scale = Math.max(W / bgCanvas.width, H / bgCanvas.height);
      const dstW = Math.round(bgCanvas.width * scale);
      const dstH = Math.round(bgCanvas.height * scale);
      const dx = Math.round((W - dstW) * 0.5);
      const dy = Math.round((H - dstH) * 0.5);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bgCanvas, 0, 0, bgCanvas.width, bgCanvas.height, dx, dy, dstW, dstH);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    // drifting star particles
    for (const s of stars) {
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // landing pads
    for (const p of pads) {
      ctx.fillStyle = "#e07a5f";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 6, p.y + 5);
      ctx.lineTo(p.x + p.w - 6, p.y + 5);
      ctx.stroke();
    }

    // ground line
    ctx.fillStyle = "#5a2010";
    ctx.fillRect(0, BASE_H - 30, BASE_W, 30);

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
