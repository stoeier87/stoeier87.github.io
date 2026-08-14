import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

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
    scoreSubmitted = false;
  let stars = [];
  let paddle = { x: BASE_W / 2, y: BASE_H - 110, w: 110, h: 14 };
  let ball = { x: BASE_W / 2, y: BASE_H / 2, r: 10, vx: 0, vy: 0 };
  let targetY = BASE_H / 2;

  fetchGlobalBest("comet-pong").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

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
      s: Math.random() * 0.5 + 0.1,
    }));
  }
  initStars();

  function launchBall() {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const speed = 360 + score * 4;
    ball.x = BASE_W / 2;
    ball.y = BASE_H / 2;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }

  function reset() {
    score = 0;
    gameOver = false;
    scoreSubmitted = false;
    scoreEl.textContent = "0";
    paddle.x = BASE_W / 2;
    launchBall();
    restartBtn.style.display = "none";
  }

  function endGame() {
    gameOver = true;
    if (score > best) {
      best = Math.floor(score);

      bestEl.textContent = best;
    }
    restartBtn.style.display = "block";
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({
          gameKey: "comet-pong",
          gameLabel: "Comet Pong",
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
      paddle.x += (targetY - paddle.x) * 0.18;
      paddle.x = Math.max(
        paddle.w / 2,
        Math.min(BASE_W - paddle.w / 2, paddle.x),
      );

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) {
        ball.x = ball.r;
        ball.vx *= -1;
      }
      if (ball.x > BASE_W - ball.r) {
        ball.x = BASE_W - ball.r;
        ball.vx *= -1;
      }
      if (ball.y < ball.r) {
        ball.y = ball.r;
        ball.vy *= -1;
      }

      if (
        ball.y + ball.r >= paddle.y - paddle.h / 2 &&
        ball.y - ball.r <= paddle.y + paddle.h / 2 &&
        ball.x >= paddle.x - paddle.w / 2 &&
        ball.x <= paddle.x + paddle.w / 2
      ) {
        ball.y = paddle.y - paddle.h / 2 - ball.r;
        const hit = (ball.x - paddle.x) / (paddle.w / 2);
        const speed = Math.min(900, Math.hypot(ball.vx, ball.vy) * 1.03);
        const angle = -Math.PI / 2 + hit * 1.1;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        score += 10;
        scoreEl.textContent = score;
      }

      if (ball.y > BASE_H + ball.r) {
        endGame();
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

    const bands = ["#8f533b", "#c48b6a", "#a86d4c", "#e3c6a9"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = bands[i % bands.length];
      ctx.fillRect(0, 80 + i * 28, BASE_W, 18);
    }

    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(
      paddle.x - paddle.w / 2,
      paddle.y - paddle.h / 2,
      paddle.w,
      paddle.h,
    );
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      paddle.x - paddle.w / 2,
      paddle.y - paddle.h / 2,
      paddle.w,
      paddle.h,
    );

    const g = ctx.createRadialGradient(
      ball.x - 3,
      ball.y - 3,
      2,
      ball.x,
      ball.y,
      ball.r * 2,
    );
    g.addColorStop(0, "#fff");
    g.addColorStop(0.4, "#f5d79a");
    g.addColorStop(1, "rgba(245,215,154,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5d79a";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 32px "Archivo Black", sans-serif';
      ctx.fillText("COMET LOST", BASE_W / 2, BASE_H / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

  function setTarget(clientX) {
    const r = canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    targetY = (sx - viewOffX) / viewScale;
  }

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!gameOver) setTarget(e.clientX);
    },
    { passive: true },
  );
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (!gameOver) setTarget(e.clientX);
    },
    { passive: true },
  );

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") targetY -= 60;
    if (e.code === "ArrowRight" || e.code === "KeyD") targetY += 60;
    if (gameOver && e.code === "KeyR") reset();
  });

  const restartBtn = document.createElement("button");
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

  launchBall();
  requestAnimationFrame(step);
})();
