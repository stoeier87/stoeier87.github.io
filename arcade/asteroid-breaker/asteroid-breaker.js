import { submitScoreOnGameOver } from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  const BASE_W = 720;
  const BASE_H = 1280;

  let W = 0, H = 0, dpr = 1, viewScale = 1, viewOffX = 0, viewOffY = 0;
  let score = 0, best = 0, last = 0, gameOver = false, scoreSubmitted = false;
  let stars = [];
  let paddle = { x: BASE_W / 2, y: BASE_H - 110, w: 110, h: 14 };
  let ball = { x: BASE_W / 2, y: BASE_H / 2, r: 9, vx: 0, vy: 0 };
  let asteroids = [];
  let targetX = BASE_W / 2;

  const bestKey = "asteroid_breaker_best_v1";
  best = Number(localStorage.getItem(bestKey) || 0);
  bestEl.textContent = best;

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

  function makeAsteroids() {
    asteroids = [];
    const rows = 5;
    const cols = 5;
    const aw = 70;
    const ah = 32;
    const gapX = 24;
    const gapY = 22;
    const startX = (BASE_W - (cols * aw + (cols - 1) * gapX)) / 2 + aw / 2;
    const startY = 120;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        asteroids.push({
          x: startX + c * (aw + gapX),
          y: startY + r * (ah + gapY),
          w: aw,
          h: ah,
          alive: true,
        });
      }
    }
  }
  makeAsteroids();

  function launchBall() {
    ball.x = BASE_W / 2;
    ball.y = BASE_H / 2;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const speed = 340;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }

  function reset() {
    score = 0;
    gameOver = false;
    scoreSubmitted = false;
    scoreEl.textContent = "0";
    paddle.x = BASE_W / 2;
    targetX = BASE_W / 2;
    makeAsteroids();
    launchBall();
    restartBtn.style.display = "none";
  }

  function endGame() {
    gameOver = true;
    if (score > best) {
      best = score;
      localStorage.setItem(bestKey, String(best));
      bestEl.textContent = best;
    }
    restartBtn.style.display = "block";
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({
          gameKey: "asteroid-breaker",
          gameLabel: "Asteroid Breaker",
          score: score,
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
      paddle.x += (targetX - paddle.x) * 0.18;
      paddle.x = Math.max(paddle.w / 2, Math.min(BASE_W - paddle.w / 2, paddle.x));

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
      if (ball.x > BASE_W - ball.r) { ball.x = BASE_W - ball.r; ball.vx *= -1; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }

      if (
        ball.y + ball.r >= paddle.y - paddle.h / 2 &&
        ball.y - ball.r <= paddle.y + paddle.h / 2 &&
        ball.x >= paddle.x - paddle.w / 2 &&
        ball.x <= paddle.x + paddle.w / 2
      ) {
        ball.y = paddle.y - paddle.h / 2 - ball.r;
        const hit = (ball.x - paddle.x) / (paddle.w / 2);
        const speed = Math.min(820, Math.hypot(ball.vx, ball.vy) * 1.02);
        const angle = -Math.PI / 2 + hit * 1.1;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
      }

      if (ball.y > BASE_H + ball.r) {
        endGame();
      }

      for (const a of asteroids) {
        if (!a.alive) continue;
        if (
          ball.x + ball.r > a.x - a.w / 2 &&
          ball.x - ball.r < a.x + a.w / 2 &&
          ball.y + ball.r > a.y - a.h / 2 &&
          ball.y - ball.r < a.y + a.h / 2
        ) {
          a.alive = false;
          ball.vy *= -1;
          score += 20;
          scoreEl.textContent = score;
          break;
        }
      }

      if (asteroids.every((a) => !a.alive)) {
        score += 200;
        scoreEl.textContent = score;
        makeAsteroids();
        launchBall();
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

    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    for (const s of stars) {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const a of asteroids) {
      if (!a.alive) continue;
      ctx.fillStyle = "#5b8bd8";
      ctx.beginPath();
      ctx.roundRect(a.x - a.w / 2, a.y - a.h / 2, a.w, a.h, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath();
      ctx.arc(a.x - 10, a.y - 4, 5, 0, Math.PI * 2);
      ctx.arc(a.x + 14, a.y + 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(paddle.x - paddle.w / 2, paddle.y - paddle.h / 2, paddle.w, paddle.h);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x - paddle.w / 2, paddle.y - paddle.h / 2, paddle.w, paddle.h);

    ctx.fillStyle = "#9de3e6";
    ctx.shadowColor = "#9de3e6";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 32px "Archivo Black", sans-serif';
      ctx.fillText("ASTEROID ESCAPED", BASE_W / 2, BASE_H / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

  function setTarget(clientX) {
    const r = canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    targetX = (sx - viewOffX) / viewScale;
  }

  canvas.addEventListener("pointermove", (e) => {
    if (!gameOver) setTarget(e.clientX);
  }, { passive: true });
  canvas.addEventListener("pointerdown", (e) => {
    if (!gameOver) setTarget(e.clientX);
  }, { passive: true });

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") targetX -= 70;
    if (e.code === "ArrowRight" || e.code === "KeyD") targetX += 70;
    if (gameOver && e.code === "KeyR") reset();
  });

  const restartBtn = document.createElement("button");
  restartBtn.className = "restart-btn";
  restartBtn.type = "button";
  restartBtn.textContent = "Restart";
  restartBtn.addEventListener("click", reset);
  restartBtn.addEventListener("touchstart", (e) => { e.preventDefault(); reset(); }, { passive: false });
  document.body.appendChild(restartBtn);

  launchBall();
  requestAnimationFrame(step);
})();
