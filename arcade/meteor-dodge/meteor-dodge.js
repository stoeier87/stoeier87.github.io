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
    spawnT = 0,
    gameOver = false,
    scoreSubmitted = false;
  let stars = [],
    meteors = [];
  let ship = { x: BASE_W / 2, y: BASE_H - 140, w: 44, h: 52, vx: 0 };
  let keys = { left: false, right: false };

  fetchGlobalBest("meteor-dodge").then((b) => {
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

  function worldX(screenX) {
    return (screenX - viewOffX) / viewScale;
  }

  function initStars() {
    stars = [...Array(100)].map(() => ({
      x: Math.random() * BASE_W,
      y: Math.random() * BASE_H,
      r: Math.random() * 1.6 + 0.4,
      s: Math.random() * 1.2 + 0.4,
    }));
  }
  initStars();

  function spawnMeteor() {
    const r = 14 + Math.random() * 22;
    meteors.push({
      x: Math.random() * (BASE_W - r * 2) + r,
      y: -r - 20,
      r,
      vy: 180 + Math.random() * 220 + score * 0.8,
      vx: (Math.random() - 0.5) * 60,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 3,
    });
  }

  function reset() {
    score = 0;
    meteors = [];
    ship.x = BASE_W / 2;
    ship.vx = 0;
    gameOver = false;
    scoreSubmitted = false;
    spawnT = 0;
    scoreEl.textContent = "0";
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
          gameKey: "meteor-dodge",
          gameLabel: "Meteor Dodge",
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
      score += dt * 10;
      scoreEl.textContent = Math.floor(score);

      spawnT -= dt;
      if (spawnT <= 0) {
        spawnMeteor();
        spawnT = Math.max(0.35, 1.2 - score * 0.008);
      }

      const accel = 1400;
      const maxSpeed = 520;
      const friction = 0.88;
      if (keys.left) ship.vx -= accel * dt;
      if (keys.right) ship.vx += accel * dt;
      ship.vx *= Math.pow(friction, dt * 60);
      ship.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ship.vx));
      ship.x += ship.vx * dt;
      ship.x = Math.max(ship.w / 2, Math.min(BASE_W - ship.w / 2, ship.x));

      for (const m of meteors) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.rot += m.vr * dt;
        const dx = m.x - ship.x;
        const dy = m.y - (ship.y - ship.h * 0.15);
        const dist = Math.hypot(dx, dy);
        if (dist < m.r + ship.w * 0.35) {
          endGame();
          break;
        }
      }
      meteors = meteors.filter((m) => m.y < BASE_H + m.r + 30);
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

    for (const m of meteors) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      const g = ctx.createRadialGradient(
        -m.r * 0.3,
        -m.r * 0.3,
        m.r * 0.2,
        0,
        0,
        m.r,
      );
      g.addColorStop(0, "#f5d79a");
      g.addColorStop(0.5, "#c78d46");
      g.addColorStop(1, "#5a3a22");
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rr = m.r * (0.75 + Math.random() * 0.25);
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.fillStyle = "#dfe6f2";
    ctx.beginPath();
    ctx.moveTo(0, -ship.h / 2);
    ctx.lineTo(ship.w / 2, ship.h / 2);
    ctx.lineTo(0, ship.h / 2 - 10);
    ctx.lineTo(-ship.w / 2, ship.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(180,220,255,.8)";
    ctx.beginPath();
    ctx.ellipse(
      0,
      -ship.h * 0.15,
      ship.w * 0.25,
      ship.h * 0.22,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (keys.left || keys.right) {
      ctx.fillStyle = "#e03a2f";
      ctx.beginPath();
      ctx.moveTo(-6, ship.h / 2 - 6);
      ctx.lineTo(6, ship.h / 2 - 6);
      ctx.lineTo(0, ship.h / 2 + 18 + Math.random() * 10);
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
      ctx.fillText("BURNED UP", BASE_W / 2, BASE_H / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

  function setKey(dir, active) {
    keys[dir] = active;
  }

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", true);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", true);
    if (gameOver && e.code === "KeyR") reset();
  });
  addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", false);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", false);
  });

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (gameOver) return;
      const wx = worldX(e.clientX);
      if (wx < ship.x) setKey("left", true);
      else setKey("right", true);
    },
    { passive: true },
  );
  canvas.addEventListener(
    "pointerup",
    () => {
      setKey("left", false);
      setKey("right", false);
    },
    { passive: true },
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      setKey("left", false);
      setKey("right", false);
    },
    { passive: true },
  );

  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const addTouch = (el, dir) => {
    el.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        setKey(dir, true);
      },
      { passive: false },
    );
    el.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        setKey(dir, false);
      },
      { passive: false },
    );
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      setKey(dir, true);
    });
    el.addEventListener("mouseup", (e) => {
      e.preventDefault();
      setKey(dir, false);
    });
    el.addEventListener("mouseleave", (e) => {
      e.preventDefault();
      setKey(dir, false);
    });
  };
  addTouch(leftBtn, "left");
  addTouch(rightBtn, "right");

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

  requestAnimationFrame(step);
})();
