import { submitScoreOnGameOver } from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const fuelEl = document.getElementById("fuel");

  const BASE_W = 720;
  const BASE_H = 1280;

  let W = 0, H = 0, dpr = 1, viewScale = 1, viewOffX = 0, viewOffY = 0;
  let score = 0, best = 0, last = 0, gameOver = false, scoreSubmitted = false, landed = false;
  let stars = [];
  let lander = { x: BASE_W / 2, y: 140, vx: 0, vy: 0, angle: 0, fuel: 100 };
  let keys = { thrust: false, left: false, right: false };
  let pads = [];

  const bestKey = "phobos_lander_best_v1";
  best = Number(localStorage.getItem(bestKey) || 0);

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
    restartBtn.style.display = "none";
    makePads();
  }

  function endGame(won) {
    gameOver = true;
    if (score > best) {
      best = Math.floor(score);
      localStorage.setItem(bestKey, String(best));
    }
    restartBtn.style.display = "block";
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

      if (keys.left) lander.angle -= 2.2 * dt * 60;
      if (keys.right) lander.angle += 2.2 * dt * 60;

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
      const onPad = pads.find((p) =>
        lander.x > p.x && lander.x < p.x + p.w &&
        lander.y + 14 >= p.y && lander.y + 14 <= p.y + p.h + 8
      );

      if (onPad) {
        if (speed < 70 && Math.abs(lander.angle) < 0.35) {
          landed = true;
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

    ctx.fillStyle = "#8a3324";
    ctx.beginPath();
    ctx.arc(BASE_W * 0.82, BASE_H * 0.18, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath();
    ctx.arc(BASE_W * 0.82 - 18, BASE_H * 0.18 + 10, 16, 0, Math.PI * 2);
    ctx.fill();

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

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 32px "Archivo Black", sans-serif';
      ctx.fillText(landed ? "TOUCHDOWN!" : "CRASHED", BASE_W / 2, BASE_H / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

  function setKey(dir, active) {
    keys[dir] = active;
  }

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") setKey("thrust", true);
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", true);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", true);
    if (gameOver && e.code === "KeyR") reset();
  });
  addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") setKey("thrust", false);
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

  const restartBtn = document.createElement("button");
  restartBtn.className = "restart-btn";
  restartBtn.type = "button";
  restartBtn.textContent = "Restart";
  restartBtn.addEventListener("click", reset);
  restartBtn.addEventListener("touchstart", (e) => { e.preventDefault(); reset(); }, { passive: false });
  document.body.appendChild(restartBtn);

  requestAnimationFrame(step);
})();
