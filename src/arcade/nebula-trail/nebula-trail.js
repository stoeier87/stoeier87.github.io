import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";
import { PLANETS, drawPlanet } from "../shared/starfield.js";

(() => {
  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const introEl = document.getElementById("intro");
  const gameOverEl = document.getElementById("gameOver");
  const gameOverTitle = document.getElementById("gameOverTitle");
  const gameOverRestart = document.getElementById("gameOverRestart");

  const BASE_W = 900;
  const BASE_H = 900;
  const STEP_SIZE = 22;
  const MOVE_INTERVAL = 0.12;
  const RARE_CHANCE = 1 / 6;
  const RARE_TTL = 5.5;

  // Background color palettes — interpolated based on score
  const NEBULA_PALETTES = [
    [[120, 90, 220], [80, 200, 210], [157, 227, 230]],   // 0: violet/cyan
    [[160, 60, 200], [120, 80, 255], [180, 100, 255]],   // 1: deep violet
    [[220, 60, 160], [140, 60, 220], [200, 80, 220]],    // 2: magenta
    [[220, 120, 40], [180, 80, 180], [255, 180, 80]],    // 3: golden amber
  ];
  const SCORE_PER_THEME = 200;

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
    waiting = true,
    scoreSubmitted = false,
    introHidden = false;
  let stars = [];
  let bgCanvas = null;
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let rareDrop = null;
  let popups = [];
  let ripples = []; // { x, y, t, dur, color }
  let moveT = 0;

  fetchGlobalBest("nebula-trail").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

  function buildBackground() {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const o = c.getContext("2d");

    const sky = o.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#02030a");
    sky.addColorStop(0.55, "#070b14");
    sky.addColorStop(1, "#050814");
    o.fillStyle = sky;
    o.fillRect(0, 0, W, H);

    // Distant planet — Uranus glimpsed in a corner (matches the arcade card)
    const uranus = PLANETS.find((p) => p.name === "Uranus");
    if (uranus) {
      const pr = Math.min(W, H) * 0.16;
      drawPlanet(o, uranus, W * 0.88, H * 0.14, pr);
    }

    // Starfield
    for (let i = 0; i < 220; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const rng = Math.random();
      const col = rng < 0.08 ? "#9de3e6" : rng < 0.14 ? "#c9b8ff" : "#ffffff";
      o.globalAlpha = 0.25 + Math.random() * 0.75;
      o.beginPath();
      o.fillStyle = col;
      o.arc(sx, sy, Math.random() * 1.5 + 0.15, 0, Math.PI * 2);
      o.fill();
    }
    o.globalAlpha = 1;

    bgCanvas = c;
  }

  // Draw nebula clouds live so their colors can shift with score
  function drawNebula() {
    const phase = score / SCORE_PER_THEME;
    const idx = Math.floor(phase) % NEBULA_PALETTES.length;
    const next = (idx + 1) % NEBULA_PALETTES.length;
    const t = phase - Math.floor(phase);
    const colors = NEBULA_PALETTES[idx].map((c, i) =>
      c.map((v, j) => Math.round(v + (NEBULA_PALETTES[next][i][j] - v) * t))
    );
    const cloudDefs = [
      { x: W * 0.18, y: H * 0.24, r: Math.max(W, H) * 0.42 },
      { x: W * 0.82, y: H * 0.7,  r: Math.max(W, H) * 0.38 },
      { x: W * 0.55, y: H * 0.08, r: Math.max(W, H) * 0.3  },
    ];
    for (let i = 0; i < cloudDefs.length; i++) {
      const cl = cloudDefs[i];
      const cStr = colors[i].join(",");
      const g = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
      g.addColorStop(0, `rgba(${cStr},0.18)`);
      g.addColorStop(0.5, `rgba(${cStr},0.06)`);
      g.addColorStop(1, `rgba(${cStr},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
      ctx.fill();
    }
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
    stars = [...Array(60)].map(() => ({
      x: Math.random() * BASE_W,
      y: Math.random() * BASE_H,
      r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.3 + 0.1,
    }));
  }
  initStars();

  function randomFreeCell(margin) {
    let pos;
    let tries = 0;
    do {
      pos = {
        x: margin + Math.random() * (BASE_W - margin * 2),
        y: margin + Math.random() * (BASE_H - margin * 2),
      };
      tries++;
    } while (
      tries < 30 &&
      snake.some(
        (seg) => Math.hypot(pos.x - seg.x, pos.y - seg.y) < STEP_SIZE * 1.2,
      )
    );
    return pos;
  }

  function randomFood() {
    Object.assign(food, randomFreeCell(60));
  }

  function maybeSpawnRareDrop() {
    if (rareDrop || Math.random() > RARE_CHANCE) return;
    const pos = randomFreeCell(70);
    rareDrop = { x: pos.x, y: pos.y, spawnedAt: performance.now(), ttl: RARE_TTL };
  }

  function foodValue() {
    return 10 + Math.floor((snake.length - 1) / 4) * 5;
  }

  function addPopup(x, y, text) {
    popups.push({ x, y, text, t: 0 });
  }

  function addRipple(x, y, color) {
    ripples.push({ x, y, t: 0,     dur: 0.7, color });
    ripples.push({ x, y, t: -0.18, dur: 0.7, color }); // second ring, delayed
  }

  function reset() {
    score = 0;
    gameOver = false;
    scoreSubmitted = false;
    snake = [{ x: BASE_W / 2, y: BASE_H / 2 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    moveT = 0;
    rareDrop = null;
    popups = [];
    ripples = [];
    waiting = true;
    scoreEl.textContent = "0";
    randomFood();
    gameOverEl.classList.remove("show");
    if (introEl) {
      introHidden = false;
      introEl.style.opacity = "";
      introEl.style.transform = "";
      introEl.style.pointerEvents = "";
    }
  }

  function endGame() {
    gameOver = true;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    gameOverEl.classList.add("show");
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({
          gameKey: "nebula-trail",
          gameLabel: "Nebula Trail",
          score: score,
          ask: true,
        });
      }, 60);
    }
  }

  function hideIntro() {
    if (introHidden || !introEl) return;
    introHidden = true;
    introEl.style.opacity = "0";
    introEl.style.transform = "translateY(-10px)";
    introEl.style.pointerEvents = "none";
  }

  function setDirection(newDir) {
    if (waiting) {
      waiting = false;
      hideIntro();
      if (!(newDir.x === -dir.x && newDir.y === -dir.y)) {
        nextDir = newDir;
      }
      return;
    }
    if (newDir.x === dir.x && newDir.y === dir.y) return;
    if (newDir.x === -dir.x && newDir.y === -dir.y) return;
    nextDir = newDir;
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

    for (const p of popups) p.t += dt;
    popups = popups.filter((p) => p.t < 0.6);

    for (const r of ripples) r.t += dt;
    ripples = ripples.filter((r) => r.t < r.dur);

    if (rareDrop && (performance.now() - rareDrop.spawnedAt) / 1000 > rareDrop.ttl) {
      rareDrop = null;
    }

    if (!gameOver && !waiting) {
      moveT += dt;
      if (moveT >= MOVE_INTERVAL) {
        moveT = 0;
        dir = nextDir;
        const head = {
          x: snake[0].x + dir.x * STEP_SIZE,
          y: snake[0].y + dir.y * STEP_SIZE,
        };

        if (
          head.x < 12 ||
          head.x > BASE_W - 12 ||
          head.y < 12 ||
          head.y > BASE_H - 12
        ) {
          endGame();
        }
        for (let i = 0; i < snake.length; i++) {
          const seg = snake[i];
          if (
            i > 0 &&
            Math.hypot(head.x - seg.x, head.y - seg.y) < STEP_SIZE * 0.8
          ) {
            endGame();
            break;
          }
        }

        if (!gameOver) {
          snake.unshift(head);
          let grew = false;

          if (Math.hypot(head.x - food.x, head.y - food.y) < 22) {
            const value = foodValue();
            score += value;
            scoreEl.textContent = score;
            addPopup(food.x, food.y, `+${value}`);
            addRipple(food.x, food.y, "157,227,230");
            randomFood();
            maybeSpawnRareDrop();
            grew = true;
          }

          if (rareDrop && Math.hypot(head.x - rareDrop.x, head.y - rareDrop.y) < 22) {
            const value = 75 + Math.floor((snake.length - 1) / 4) * 10;
            score += value;
            scoreEl.textContent = score;
            addPopup(rareDrop.x, rareDrop.y, `+${value}`);
            addRipple(rareDrop.x, rareDrop.y, "255,209,102");
            rareDrop = null;
            grew = true;
          }

          if (!grew) snake.pop();
        }
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);
    drawNebula();

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    for (const s of stars) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(157,227,230,.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, BASE_W - 24, BASE_H - 24);

    // eat ripples
    for (const r of ripples) {
      if (r.t <= 0) continue;
      const p = r.t / r.dur;
      ctx.strokeStyle = `rgba(${r.color},${(1 - p) * 0.65})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, p * 80, 0, Math.PI * 2);
      ctx.stroke();
    }

    // food
    ctx.fillStyle = "#9de3e6";
    ctx.shadowColor = "#9de3e6";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(food.x, food.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // rare drop — pulsing gold dot with a shrinking countdown ring
    if (rareDrop) {
      const elapsed = (performance.now() - rareDrop.spawnedAt) / 1000;
      const frac = Math.max(0, 1 - elapsed / rareDrop.ttl);
      const pulse = 1 + Math.sin(elapsed * 10) * 0.15;

      ctx.save();
      ctx.translate(rareDrop.x, rareDrop.y);

      ctx.strokeStyle = "rgba(255,209,102,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffd166";
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // snake
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const alpha = 1 - (i / Math.max(snake.length, 1)) * 0.6;
      ctx.fillStyle = `rgba(91,139,216,${alpha})`;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, i === 0 ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // floating score popups
    ctx.textAlign = "center";
    ctx.font = '700 16px "Space Mono", monospace';
    for (const p of popups) {
      const alpha = 1 - p.t / 0.6;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillText(p.text, p.x, p.y - 14 - p.t * 26);
    }

    ctx.restore();
  }

  const rotateLeft  = () => { const d = dir; setDirection({ x:  d.y, y: -d.x }); };
  const rotateRight = () => { const d = dir; setDirection({ x: -d.y, y:  d.x }); };

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp"    || e.code === "KeyW") setDirection({ x: 0, y: -1 });
    if (e.code === "ArrowDown"  || e.code === "KeyS") setDirection({ x: 0, y:  1 });
    if (e.code === "ArrowRight" || e.code === "KeyD") setDirection({ x: 1, y:  0 });
    if (e.code === "ArrowLeft"  || e.code === "KeyA") setDirection({ x: -1, y: 0 });
    if (e.code === "KeyQ") rotateLeft();
    if (e.code === "KeyE") rotateRight();
    if (gameOver && e.code === "KeyR") reset();
  });

  const numInput = document.getElementById("numInput");
  if (numInput) {
    numInput.addEventListener("input", () => {
      const v = numInput.value;
      numInput.value = "";
      if (v === "1") rotateLeft();
      if (v === "9") rotateRight();
    });
  }

  const bindBtn = (id, newDir) => {
    const el = document.getElementById(id);
    const press = (e) => {
      e.preventDefault();
      setDirection(newDir);
    };
    el.addEventListener("touchstart", press, { passive: false });
    el.addEventListener("mousedown", press);
  };
  bindBtn("up", { x: 0, y: -1 });
  bindBtn("down", { x: 0, y: 1 });
  bindBtn("left", { x: -1, y: 0 });
  bindBtn("right", { x: 1, y: 0 });

  const bindRotateBtn = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => { e.preventDefault(); fn(); };
    el.addEventListener("touchstart", press, { passive: false });
    el.addEventListener("mousedown", press);
  };
  bindRotateBtn("rotateLeft",  rotateLeft);
  bindRotateBtn("rotateRight", rotateRight);

  gameOverRestart.addEventListener("click", reset);
  gameOverRestart.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      reset();
    },
    { passive: false },
  );

  reset();
  requestAnimationFrame(step);
})();
