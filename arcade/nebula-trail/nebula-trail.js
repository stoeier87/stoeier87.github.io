import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  const BASE_W = 900;
  const BASE_H = 900;

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
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let keys = { north: false, south: false, east: false, west: false };
  let moveT = 0;
  const moveInterval = 0.12;

  fetchGlobalBest("nebula-trail").then((b) => {
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
    stars = [...Array(120)].map(() => ({
      x: Math.random() * BASE_W,
      y: Math.random() * BASE_H,
      r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.3 + 0.1,
    }));
  }
  initStars();

  function randomFood() {
    const margin = 60;
    food.x = margin + Math.random() * (BASE_W - margin * 2);
    food.y = margin + Math.random() * (BASE_H - margin * 2);
  }

  function reset() {
    score = 0;
    gameOver = false;
    scoreSubmitted = false;
    snake = [{ x: BASE_W / 2, y: BASE_H / 2 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    moveT = 0;
    scoreEl.textContent = "0";
    randomFood();
    restartBtn.style.display = "none";
  }

  function endGame() {
    gameOver = true;
    if (score > best) {
      best = score;

      bestEl.textContent = best;
    }
    restartBtn.style.display = "block";
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

  function setDirection(newDir) {
    // Ignore if already moving in that direction
    if (newDir.x === dir.x && newDir.y === dir.y) return;
    // Ignore if opposite direction (180 turn)
    if (newDir.x === -dir.x && newDir.y === -dir.y) return;
    nextDir = newDir;
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
      if (keys.north) {
        setDirection({ x: 0, y: -1 });
        keys.north = false;
      }
      if (keys.south) {
        setDirection({ x: 0, y: 1 });
        keys.south = false;
      }
      if (keys.east) {
        setDirection({ x: 1, y: 0 });
        keys.east = false;
      }
      if (keys.west) {
        setDirection({ x: -1, y: 0 });
        keys.west = false;
      }

      moveT += dt;
      if (moveT >= moveInterval) {
        moveT = 0;
        dir = nextDir;
        const stepSize = 22;
        const head = {
          x: snake[0].x + dir.x * stepSize,
          y: snake[0].y + dir.y * stepSize,
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
            Math.hypot(head.x - seg.x, head.y - seg.y) < stepSize * 0.8
          ) {
            endGame();
            break;
          }
        }

        if (!gameOver) {
          snake.unshift(head);
          if (Math.hypot(head.x - food.x, head.y - food.y) < 22) {
            score += 10;
            scoreEl.textContent = score;
            randomFood();
          } else {
            snake.pop();
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
    ctx.translate(
      viewOffX + (BASE_W * viewScale) / 2,
      viewOffY + (BASE_H * viewScale) / 2,
    );
    ctx.translate((-BASE_W * viewScale) / 2, (-BASE_H * viewScale) / 2);
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

    ctx.strokeStyle = "rgba(157,227,230,.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, BASE_W - 24, BASE_H - 24);

    ctx.fillStyle = "#9de3e6";
    ctx.shadowColor = "#9de3e6";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(food.x, food.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const alpha = 1 - (i / Math.max(snake.length, 1)) * 0.6;
      ctx.fillStyle = `rgba(91,139,216,${alpha})`;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, i === 0 ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 32px "Archivo Black", sans-serif';
      ctx.fillText("TRAIL FADED", BASE_W / 2, BASE_H / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.north = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.south = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.east = true;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.west = true;
    if (gameOver && e.code === "KeyR") reset();
  });

  addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.north = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.south = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.east = false;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.west = false;
  });

  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const addTouch = (el, dir) => {
    const setKey = (val) => {
      keys[dir] = val;
    };
    el.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        setKey(true);
      },
      { passive: false },
    );
    el.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        setKey(false);
      },
      { passive: false },
    );
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      setKey(true);
    });
    el.addEventListener("mouseup", (e) => {
      e.preventDefault();
      setKey(false);
    });
    el.addEventListener("mouseleave", (e) => {
      e.preventDefault();
      setKey(false);
    });
  };
  addTouch(leftBtn, "west");
  addTouch(rightBtn, "east");

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

  reset();
  requestAnimationFrame(step);
})();
