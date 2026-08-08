import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";
import createIssBackground from "../shared/backgrounds-iss.js";

(() => {
  const canvas = document.getElementById("game");
  if (!canvas) return; // guard so background doesn't run on other pages
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
    scoreSubmitted = false,
    docked = false;
  let stars = [];
  let capsule = { x: 120, y: 120, vx: 0, vy: 0, r: 14, angle: 0 };
  let station = { x: BASE_W / 2, y: BASE_H / 2, r: 46, angle: 0, av: 0.4 };
  let keys = { up: false, down: false, left: false, right: false };

  // Scoring / tuning constants (easy to tweak)
  const MAX_TIME = 60; // countdown start + seconds used for time-based scoring
  const POINTS_PER_SEC = 50; // points per remaining second
  const DOCKING_BONUS = 500;

  // Dock thresholds (tuneable)
  const DIST_MARGIN_EXTRA = 8; // added to station.r + capsule.r
  const SPEED_THRESHOLD = 140; // allowed approach speed
  const ANGLE_THRESHOLD = 0.9; // radians (~52deg)

  // Debug / HUD
  let startTime = 0;
  let showDebug = false; // toggled with 'D'

  // background drawer (offscreen cached)
  const bg = createIssBackground({ BASE_W, BASE_H });
  bg.init();

  fetchGlobalBest("iss-docking").then((b) => {
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

    // regenerate background cache at virtual resolution
    if (bg && typeof bg.resize === "function") bg.resize(BASE_W, BASE_H);
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

  function reset() {
    score = 0;
    docked = false;
    gameOver = false;
    scoreSubmitted = false;
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    capsule.x = 120;
    capsule.y = 120;
    capsule.vx = 0;
    capsule.vy = 0;
    capsule.angle = 0;
    station.angle = 0;
    startTime = performance.now();
    scoreEl.textContent = MAX_TIME;
    restartBtn.style.display = "none";
  }

  function endGame(won) {
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
          gameKey: "iss-docking",
          gameLabel: "ISS Docking",
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
      // update station rotation
      station.angle += station.av * dt;

      const thrust = 260;
      if (keys.up) capsule.vy -= thrust * dt;
      if (keys.down) capsule.vy += thrust * dt;
      if (keys.left) capsule.vx -= thrust * dt;
      if (keys.right) capsule.vx += thrust * dt;

      capsule.vx *= Math.pow(0.96, dt * 60);
      capsule.vy *= Math.pow(0.96, dt * 60);
      capsule.x += capsule.vx * dt;
      capsule.y += capsule.vy * dt;

      capsule.x = Math.max(capsule.r, Math.min(BASE_W - capsule.r, capsule.x));
      capsule.y = Math.max(capsule.r, Math.min(BASE_H - capsule.r, capsule.y));

      // compute approach geometry
      const dx = station.x - capsule.x;
      const dy = station.y - capsule.y;
      const dist = Math.hypot(dx, dy);
      const approachSpeed = Math.hypot(capsule.vx, capsule.vy);

      // direction from capsule TO station
      const portAngle = Math.atan2(dy, dx);
      // visible docking port sits on the station's +X; the approach vector to match is opposite
      const dockAngle = (station.angle + Math.PI) % (Math.PI * 2);

      // helper for smallest-angle difference
      function angleDiff(a, b) {
        return Math.abs(((a - b + Math.PI) % (Math.PI * 2)) - Math.PI);
      }

      const angleDiffToPort = angleDiff(dockAngle, portAngle);

      // live HUD: count down from MAX_TIME so faster docking = higher score
      const elapsed = (ts - startTime) * 0.001; // seconds
      const timeLeft = Math.max(0, MAX_TIME - elapsed);
      scoreEl.textContent = Math.ceil(timeLeft);

      // thresholds used for display and logic
      const DIST_MARGIN = station.r + capsule.r + DIST_MARGIN_EXTRA;
      const SPEED_THRESH = SPEED_THRESHOLD;
      const ANGLE_THRESH = ANGLE_THRESHOLD;

      if (dist < DIST_MARGIN && approachSpeed < SPEED_THRESH && angleDiffToPort < ANGLE_THRESH) {
        docked = true;
        // compute final score rewarding speed (lower elapsed => higher points)
        const remaining = Math.max(0, MAX_TIME - elapsed);
        const timeScore = Math.floor(remaining * POINTS_PER_SEC);
        score = timeScore + DOCKING_BONUS;
        scoreEl.textContent = score;
        endGame(true);
      } else if (dist < station.r + capsule.r + 2) {
        endGame(false);
      }

      // store diagnostic values on capsule for HUD draw
      capsule._debug = { dist, approachSpeed, angleDiffToPort, DIST_MARGIN, SPEED_THRESH, ANGLE_THRESH };
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

    // draw themed background (earth + moon) via drawer
    if (bg && typeof bg.draw === "function") bg.draw(ctx, { capsule, station, BASE_W, BASE_H }, performance.now());

    // stars
    for (const s of stars) {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // station (polished)
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.rotate(station.angle);

    // soft back glow for the station
    ctx.beginPath();
    ctx.arc(0, 0, station.r + 34, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4,12,22,0.4)";
    ctx.fill();

    // cross structure (existing)
    ctx.fillStyle = "#dfe6f2";
    ctx.fillRect(-52, -10, 104, 20);
    ctx.fillRect(-10, -52, 20, 104);

    // central module
    ctx.fillStyle = "#9aa7bd";
    ctx.fillRect(-34, -34, 68, 68);

    // docking port highlight (where the red arc sits)
    ctx.save();
    ctx.translate(46, 0);
    ctx.beginPath();
    ctx.arc(0, 0, 14, -0.6, 0.6);
    ctx.fillStyle = "rgba(224,58,47,0.18)";
    ctx.fill();
    ctx.strokeStyle = "#e03a2f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#e03a2f";
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // inner ring to help read docking orientation
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, station.r + 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // capsule
    ctx.save();
    ctx.translate(capsule.x, capsule.y);
    ctx.rotate(Math.atan2(capsule.vy, capsule.vx) || 0);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4aa3df";
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (keys.up || keys.down || keys.left || keys.right) {
      ctx.fillStyle = "#e03a2f";
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-10, 4);
      ctx.lineTo(-22 - Math.random() * 8, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(station.x, station.y, station.r + 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // debug / status overlay (always show key diagnostics; toggle shows extra detail)
    const hudX = 12;
    const hudY = 18;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = '400 12px "Space Mono", monospace';
    ctx.textAlign = "left";

    const d = capsule._debug || { dist: 0, approachSpeed: 0, angleDiffToPort: 0, DIST_MARGIN: station.r + capsule.r + DIST_MARGIN_EXTRA, SPEED_THRESH: SPEED_THRESHOLD, ANGLE_THRESH: ANGLE_THRESHOLD };

    ctx.fillText(`dist: ${d.dist.toFixed(1)} (need < ${d.DIST_MARGIN.toFixed(1)})`, hudX, hudY);
    ctx.fillText(`speed: ${d.approachSpeed.toFixed(1)} (need < ${d.SPEED_THRESH})`, hudX, hudY + 16);
    ctx.fillText(`angleΔ: ${d.angleDiffToPort.toFixed(2)}rad (need < ${d.ANGLE_THRESH.toFixed(2)})`, hudX, hudY + 32);

    if (showDebug) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`DEBUG ON — Press D to toggle`, hudX, hudY + 52);
      // extra tips
      ctx.fillText(`Tips: line capsule with the red arc on the station; slow down before approach.`, hudX, hudY + 68);
      ctx.fillText(`Scoring: faster docks score higher (MAX ${MAX_TIME * POINTS_PER_SEC + DOCKING_BONUS})`, hudX, hudY + 84);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`Press D to toggle debug`, hudX, hudY + 52);
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = '700 32px "Archivo Black", sans-serif';
      ctx.fillText(
        docked ? "DOCKED!" : "DOCKING FAILED",
        BASE_W / 2,
        BASE_H / 2 - 20,
      );
      ctx.font = '400 14px "Space Mono", monospace';
      ctx.fillText("Tap Restart (or press R)", BASE_W / 2, BASE_H / 2 + 16);
    }

    ctx.restore();
  }

  function setKey(dir, active) {
    keys[dir] = active;
  }

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") setKey("up", true);
    if (e.code === "ArrowDown" || e.code === "KeyS") setKey("down", true);
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", true);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", true);
    if (e.code === "KeyD") {
      // toggle debug
      showDebug = !showDebug;
    }
    if (gameOver && e.code === "KeyR") reset();
  });
  addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") setKey("up", false);
    if (e.code === "ArrowDown" || e.code === "KeyS") setKey("down", false);
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", false);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", false);
  });

  const bindBtn = (id, dir) => {
    const el = document.getElementById(id);
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
  bindBtn("up", "up");
  bindBtn("down", "down");
  bindBtn("left", "left");
  bindBtn("right", "right");

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

  // initialize
  reset();
  requestAnimationFrame(step);
})();
