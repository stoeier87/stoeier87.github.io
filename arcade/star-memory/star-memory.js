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
    gameOver = false,
    scoreSubmitted = false;
  let stars = [];
  let cards = [];
  let flipped = [];
  let matched = 0;
  let lock = false;
  let lastTime = 0;

  fetchGlobalBest("star-memory").then((b) => {
    best = Math.max(best, b);
    bestEl.textContent = best;
  });

  const symbols = ["★", "☆", "✦", "✧", "✶", "✷", "✹", "✺"];

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

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeCards() {
    const deck = shuffle([...symbols, ...symbols]);
    cards = [];
    const cols = 4;
    const rows = 4;
    const cardW = 120;
    const cardH = 160;
    const gap = 20;
    const startX = (BASE_W - (cols * cardW + (cols - 1) * gap)) / 2 + cardW / 2;
    const startY =
      (BASE_H - (rows * cardH + (rows - 1) * gap)) / 2 + cardH / 2 - 40;
    for (let i = 0; i < deck.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cards.push({
        x: startX + col * (cardW + gap),
        y: startY + row * (cardH + gap),
        w: cardW,
        h: cardH,
        symbol: deck[i],
        open: false,
        matched: false,
        scale: 1,
      });
    }
  }
  makeCards();

  function reset() {
    score = 0;
    matched = 0;
    flipped = [];
    lock = false;
    gameOver = false;
    scoreSubmitted = false;
    scoreEl.textContent = "0";
    makeCards();
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
          gameKey: "star-memory",
          gameLabel: "Star Memory",
          score: score,
          ask: true,
        });
      }, 60);
    }
  }

  function handleMatch() {
    const [a, b] = flipped;
    if (a.symbol === b.symbol) {
      a.matched = true;
      b.matched = true;
      score += 100;
      matched += 2;
      if (matched === cards.length) {
        score += 200;
        endGame();
      }
    } else {
      score = Math.max(0, score - 10);
      setTimeout(() => {
        a.open = false;
        b.open = false;
      }, 700);
    }
    flipped = [];
    setTimeout(() => {
      lock = false;
    }, 750);
    scoreEl.textContent = score;
  }

  function onTap(clientX, clientY) {
    if (lock || gameOver) return;
    const r = canvas.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    const wx = (sx - viewOffX) / viewScale;
    const wy = (sy - viewOffY) / viewScale;
    for (const c of cards) {
      if (
        !c.open &&
        !c.matched &&
        wx >= c.x - c.w / 2 &&
        wx <= c.x + c.w / 2 &&
        wy >= c.y - c.h / 2 &&
        wy <= c.y + c.h / 2
      ) {
        c.open = true;
        flipped.push(c);
        if (flipped.length === 2) {
          lock = true;
          handleMatch();
        }
        break;
      }
    }
  }

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      onTap(e.clientX, e.clientY);
    },
    { passive: true },
  );

  addEventListener("keydown", (e) => {
    if (gameOver && e.code === "KeyR") reset();
  });

  function step(ts) {
    const dt = Math.min(33, ts - lastTime) * 0.001;
    lastTime = ts;

    for (const s of stars) {
      s.y += s.s * dt * 60;
      if (s.y > BASE_H) s.y = -2;
    }

    for (const c of cards) {
      const target = c.matched ? 0 : 1;
      c.scale += (target - c.scale) * 0.15;
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

    ctx.strokeStyle = "rgba(214,196,145,.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(BASE_W / 2, BASE_H / 2 - 40, 260, 90, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (const c of cards) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.fillStyle =
        c.open || c.matched ? "rgba(20,30,52,.9)" : "rgba(10,14,24,.85)";
      ctx.strokeStyle =
        c.open || c.matched ? "#d6c491" : "rgba(255,255,255,.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12);
      ctx.fill();
      ctx.stroke();
      if (c.open || c.matched) {
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '700 48px "Space Mono", monospace';
        ctx.fillText(c.symbol, 0, 0);
      } else {
        ctx.fillStyle = "rgba(255,255,255,.15)";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 32px "Archivo Black", sans-serif';
      ctx.fillText("CONSTELLATION COMPLETE", BASE_W / 2, BASE_H / 2 - 20);
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

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
