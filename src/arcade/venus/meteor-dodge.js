import {
  submitScoreOnGameOver,
  fetchGlobalBest,
} from "../shared/score-submit.js";
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const bestEl = document.getElementById("best");
  const gameOverEl = document.getElementById("gameOver");
  const gameOverRestart = document.getElementById("gameOverRestart");
  const upgradeChoiceEl = document.getElementById("upgradeChoice");
  const upgradeButtons = [
    {
      btn: document.getElementById("upgradeOptionA"),
      title: document.getElementById("upgradeOptionATitle"),
      sub: document.getElementById("upgradeOptionASub"),
    },
    {
      btn: document.getElementById("upgradeOptionB"),
      title: document.getElementById("upgradeOptionBTitle"),
      sub: document.getElementById("upgradeOptionBSub"),
    },
  ];

  const BASE_W = 720;
  const BASE_H = 1280;

  let W = 0,
    H = 0,
    dpr = 1,
    viewScale = 1,
    viewOffX = 0,
    viewOffY = 0;
  const scorePillEl = document.getElementById("score");
  let score = 0,
    best = 0,
    last = 0,
    runTime = 0,
    spawnT = 0,
    level = 1,
    gameOver = false,
    scoreSubmitted = false,
    choosing = false;
  let pendingChoices = [];
  let levelBannerT = -1;
  const LEVEL_TIME_STEP = 20;
  const LEVEL_BANNER_DUR = 1.7;

  function scoreMultiplier() {
    return 1 + (level - 1) * 0.15;
  }
  let farStars = [],
    stars = [],
    nearMotes = [],
    meteors = [],
    beams = [],
    pickups = [],
    popups = [];
  let planetX = 0,
    planetY = 0,
    planetR = 0,
    cloudOff = 0;
  let beamCd = 0,
    shielded = false,
    shieldUntil = 0,
    hitUntil = 0;
  // Six independent permanent power-ups, each capped at level 5. Immortal
  // shield is the one remaining timed (non-permanent) pickup. Every pickup
  // orb is drawn at the same PICKUP_R regardless of which power-up it ends
  // up offering (that's only decided once it's collected).
  const PICKUP_R = 9;
  let fireRateLv = 0,
    laserCountLv = 0,
    dmgLv = 0,
    hpLv = 0,
    magnetLv = 0,
    auraDmgLv = 0;
  let shipHp = 1,
    shipMaxHp = 1;

  const POWERUPS = [
    {
      key: "fireRate",
      label: "FIRE RATE",
      get: () => fireRateLv,
      bump: () => fireRateLv++,
    },
    {
      key: "laserCount",
      label: "MULTI-LASER",
      get: () => laserCountLv,
      bump: () => laserCountLv++,
    },
    {
      key: "dmg",
      label: "DAMAGE",
      get: () => dmgLv,
      bump: () => dmgLv++,
    },
    {
      key: "hp",
      label: "MAX HP",
      get: () => hpLv,
      bump: () => {
        hpLv++;
        shipMaxHp++;
        shipHp++;
      },
    },
    {
      key: "magnet",
      label: "MAGNET",
      get: () => magnetLv,
      bump: () => magnetLv++,
    },
    {
      key: "auraDmg",
      label: "AURA DMG",
      get: () => auraDmgLv,
      bump: () => auraDmgLv++,
    },
  ];
  const SHIP_Y_MIN = BASE_H * 0.35;
  const SHIP_Y_MAX = BASE_H - 90;
  let ship = { x: BASE_W / 2, y: BASE_H - 140, w: 44, h: 52, vx: 0, vy: 0 };
  let keys = { left: false, right: false, up: false, down: false };

  fetchGlobalBest("venus").then((b) => {
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

    planetX = W * 1.02;
    planetY = H * 0.92;
    planetR = Math.max(W, H) * 0.62;

    initBackground();
  }
  addEventListener("resize", resize, { passive: true });
  resize();

  function worldX(screenX) {
    return (screenX - viewOffX) / viewScale;
  }

  // Three static star layers live in full-screen space, not the letterboxed
  // BASE_W/H area, so the Venus backdrop stays populated on wide viewports
  // instead of showing flat dead bars either side of the play field.
  function initBackground() {
    const area = W * H;
    farStars = [...Array(Math.round(area / 14000))].map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 0.5 + 0.3,
      s: Math.random() * 0.2 + 0.1,
      vx: (Math.random() - 0.5) * 0.15,
    }));
    stars = [...Array(Math.round(area / 10000))].map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      s: Math.random() * 0.7 + 0.25,
      vx: (Math.random() - 0.5) * 0.3,
    }));
    nearMotes = [...Array(Math.round(area / 60000) + 4)].map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 1,
      s: Math.random() * 0.6 + 0.9,
      vx: (Math.random() - 0.5) * 0.6,
    }));
  }

  const METEOR_KINDS = {
    rock: {
      sides: 7,
      jitter: 0.25,
      speedMul: 1,
      vxMul: 1,
      colors: ["#f5d79a", "#c78d46", "#5a3a22"],
    },
    ice: {
      sides: 6,
      jitter: 0.08,
      speedMul: 0.75,
      vxMul: 0.5,
      sizeMul: 1.25,
      colors: ["#eaf9ff", "#8fd6ea", "#2c5f70"],
      glow: "#8fe8ff",
    },
    metal: {
      sides: 5,
      jitter: 0.05,
      speedMul: 1.35,
      vxMul: 1.6,
      sizeMul: 0.75,
      colors: ["#dfe6ee", "#8f97a3", "#33373f"],
    },
  };

  function pickMeteorKind() {
    const r = Math.random();
    if (r < 0.2) return "ice";
    if (r < 0.4) return "metal";
    return "rock";
  }

  function spawnMeteor() {
    const kindName = pickMeteorKind();
    const kind = METEOR_KINDS[kindName];
    const r = (14 + Math.random() * 22) * (kind.sizeMul || 1);
    const maxHp = Math.max(1, Math.round(r / 16));
    meteors.push({
      x: Math.random() * (BASE_W - r * 2) + r,
      y: -r - 20,
      r,
      hp: maxHp,
      maxHp,
      kind: kindName,
      vy: (180 + Math.random() * 220 + (level - 1) * 26) * kind.speedMul,
      vx: (Math.random() - 0.5) * 60 * kind.vxMul,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 3,
      shape: [...Array(kind.sides)].map(
        () => 1 - kind.jitter / 2 + Math.random() * kind.jitter,
      ),
      dead: false,
    });
  }

  function addPopup(x, y, text) {
    popups.push({ x, y, text, t: 0 });
  }

  function killMeteor(m) {
    m.dead = true;
    const yFrac = Math.max(0, Math.min(1, m.y / BASE_H));
    const bonus = Math.round((6 + (1 - yFrac) * 18) * scoreMultiplier());
    score += bonus;
    addPopup(m.x, m.y, `+${bonus}`);
    if (Math.random() < 0.18) {
      pickups.push({
        x: m.x,
        y: m.y,
        r: PICKUP_R,
        vy: 130,
        dead: false,
        type: Math.random() < 0.25 ? "shield" : "upgrade",
      });
    }
  }

  const BEAM_SPEED = 900;
  const BEAM_ANGLE_STEP = 0.09; // radians between adjacent barrels, fanning out

  function fireBeam() {
    if (gameOver || choosing || beamCd > 0) return;
    beamCd = Math.max(0.09, 0.3 - fireRateLv * 0.038);
    const nose = { x: ship.x, y: ship.y - ship.h / 2 };
    const barrels = 1 + laserCountLv;
    for (let i = 0; i < barrels; i++) {
      const angle = (i - (barrels - 1) / 2) * BEAM_ANGLE_STEP;
      beams.push({
        x: nose.x + Math.sin(angle) * 6,
        y: nose.y,
        vx: Math.sin(angle) * BEAM_SPEED,
        vy: -Math.cos(angle) * BEAM_SPEED,
        dead: false,
      });
    }
  }

  function applyUpgrade(index) {
    const choice = pendingChoices[index];
    if (!choice) return;
    choice.bump();
    choosing = false;
    pendingChoices = [];
    upgradeChoiceEl.classList.remove("show");
  }

  function weightedPick(pool) {
    const weights = pool.map((p) => 1 + (p.get() > 0 ? 0.25 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function openUpgradeChoice() {
    const pool = POWERUPS.filter((p) => p.get() < 5);
    if (pool.length === 0) {
      const bonus = Math.round(20 * scoreMultiplier());
      score += bonus;
      addPopup(ship.x, ship.y - 60, `+${bonus}`);
      return;
    }

    const first = weightedPick(pool);
    const rest = pool.filter((p) => p !== first);
    const second = rest.length
      ? rest[Math.floor(Math.random() * rest.length)]
      : null;
    pendingChoices = second ? [first, second] : [first];

    choosing = true;
    upgradeButtons.forEach(({ btn, title, sub }, i) => {
      const choice = pendingChoices[i];
      if (!choice) {
        btn.style.display = "none";
        return;
      }
      btn.style.display = "flex";
      title.textContent = choice.label;
      sub.textContent = `Lv ${choice.get()} → ${choice.get() + 1}`;
    });
    upgradeChoiceEl.classList.add("show");
  }

  function reset() {
    score = 0;
    runTime = 0;
    level = 1;
    levelBannerT = -1;
    meteors = [];
    beams = [];
    pickups = [];
    popups = [];
    beamCd = 0;
    shielded = false;
    shieldUntil = 0;
    hitUntil = 0;
    fireRateLv = 0;
    laserCountLv = 0;
    dmgLv = 0;
    hpLv = 0;
    magnetLv = 0;
    auraDmgLv = 0;
    shipMaxHp = 1;
    shipHp = 1;
    choosing = false;
    pendingChoices = [];
    upgradeChoiceEl.classList.remove("show");
    ship.x = BASE_W / 2;
    ship.y = BASE_H - 140;
    ship.vx = 0;
    ship.vy = 0;
    gameOver = false;
    scoreSubmitted = false;
    spawnT = 0;
    gameOverEl.classList.remove("show");
  }

  function endGame() {
    gameOver = true;
    if (score > best) {
      best = Math.floor(score);

      bestEl.textContent = best;
    }
    gameOverEl.classList.add("show");
    if (!scoreSubmitted) {
      scoreSubmitted = true;
      setTimeout(() => {
        submitScoreOnGameOver({
          gameKey: "venus",
          gameLabel: "Meteor Dodge — Venus",
          score: Math.floor(score),
          ask: true,
        });
      }, 60);
    }
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

    cloudOff += dt * 7;

    for (const layer of [farStars, stars, nearMotes]) {
      for (const s of layer) {
        s.y += s.s * dt * 60;
        s.x += s.vx * dt * 60;
        if (s.y > H) s.y = -2;
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
      }
    }

    if (levelBannerT >= 0) {
      levelBannerT += dt;
      if (levelBannerT > LEVEL_BANNER_DUR) levelBannerT = -1;
    }

    if (!gameOver && !choosing) {
      runTime += dt;
      score += dt * 10 * scoreMultiplier();
      scorePillEl.textContent = Math.floor(score);

      if (runTime >= level * LEVEL_TIME_STEP) {
        level++;
        levelBannerT = 0;
      }

      if (shielded && runTime > shieldUntil) shielded = false;

      spawnT -= dt;
      if (spawnT <= 0) {
        spawnMeteor();
        spawnT = Math.max(0.35, 1.2 - (level - 1) * 0.055);
      }

      const accel = 3600;
      const maxSpeed = 1050;
      const friction = 0.85;
      if (keys.left) ship.vx -= accel * dt;
      if (keys.right) ship.vx += accel * dt;
      ship.vx *= Math.pow(friction, dt * 60);
      ship.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ship.vx));
      ship.x += ship.vx * dt;
      ship.x = Math.max(ship.w / 2, Math.min(BASE_W - ship.w / 2, ship.x));

      if (keys.up) ship.vy -= accel * dt;
      if (keys.down) ship.vy += accel * dt;
      ship.vy *= Math.pow(friction, dt * 60);
      ship.vy = Math.max(-maxSpeed, Math.min(maxSpeed, ship.vy));
      ship.y += ship.vy * dt;
      ship.y = Math.max(SHIP_Y_MIN, Math.min(SHIP_Y_MAX, ship.y));

      beamCd = Math.max(0, beamCd - dt);
      for (const b of beams) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      beams = beams.filter(
        (b) => !b.dead && b.y > -30 && b.x > -30 && b.x < BASE_W + 30,
      );

      for (const p of pickups) p.y += p.vy * dt;

      if (magnetLv > 0) {
        const magnetR = 90 + magnetLv * 45;
        const pull = 200 + magnetLv * 90;
        const shipTargetY = ship.y - ship.h * 0.15;
        for (const p of pickups) {
          if (p.dead) continue;
          const dx = ship.x - p.x;
          const dy = shipTargetY - p.y;
          const d = Math.hypot(dx, dy);
          if (d < magnetR && d > 1) {
            p.x += (dx / d) * pull * dt;
            p.y += (dy / d) * pull * dt;
          }
        }
      }

      if (auraDmgLv > 0) {
        const auraR = 70 + auraDmgLv * 16;
        const auraDps = 1.4 + auraDmgLv * 1.2;
        for (const m of meteors) {
          if (m.dead) continue;
          const dx = m.x - ship.x;
          const dy = m.y - (ship.y - ship.h * 0.15);
          if (dx * dx + dy * dy < auraR * auraR) {
            m.hp -= auraDps * dt;
            if (m.hp <= 0) killMeteor(m);
          }
        }
      }

      for (const m of meteors) {
        if (m.dead) continue;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.rot += m.vr * dt;
        const dx = m.x - ship.x;
        const dy = m.y - (ship.y - ship.h * 0.15);
        const dist = Math.hypot(dx, dy);
        if (dist < m.r + ship.w * 0.35) {
          if (shielded) {
            m.dead = true;
          } else if (runTime >= hitUntil) {
            m.dead = true;
            hitUntil = runTime + 1;
            shipHp -= 1;
            if (shipHp <= 0) {
              endGame();
              break;
            }
          }
        }
      }

      for (const b of beams) {
        if (b.dead) continue;
        for (const m of meteors) {
          if (m.dead) continue;
          const dx = b.x - m.x;
          const dy = b.y - m.y;
          if (dx * dx + dy * dy < (m.r + 6) * (m.r + 6)) {
            b.dead = true;
            m.hp -= 1 + dmgLv;
            if (m.hp > 0) break;
            killMeteor(m);
            break;
          }
        }
      }

      for (const p of pickups) {
        if (p.dead) continue;
        const dx = p.x - ship.x;
        const dy = p.y - (ship.y - ship.h * 0.15);
        if (Math.hypot(dx, dy) < p.r + ship.w * 0.35) {
          p.dead = true;
          if (p.type === "shield") {
            shielded = true;
            shieldUntil = runTime + 6;
          } else {
            openUpgradeChoice();
          }
        }
      }

      beams = beams.filter((b) => !b.dead && b.y > -30);
      meteors = meteors.filter((m) => !m.dead && m.y < BASE_H + m.r + 30);
      pickups = pickups.filter((p) => !p.dead && p.y < BASE_H + p.r + 30);

      for (const p of popups) p.t += dt;
      popups = popups.filter((p) => p.t < 0.7);
    }

    draw();
    requestAnimationFrame(step);
  }

  // Cycles a new backdrop tint in with every level, so the drift into a
  // fresh palette reads as "you've reached the next stretch of sky."
  const BG_PALETTES = [
    ["#4a3420", "#241a2e", "#070b14"],
    ["#1f3a44", "#152a3a", "#050b14"],
    ["#3a1f44", "#241530", "#0a0714"],
    ["#1f4430", "#15302a", "#07140e"],
    ["#442418", "#301a1a", "#140a07"],
  ];

  // Ported from the "Venus game design update" prototype: outer atmosphere
  // glow, a warmer planet-body gradient, clipped drifting cloud bands, a
  // day/night terminator and an atmospheric limb ring.
  function drawVenus(cx, cy, r) {
    const og = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.6);
    og.addColorStop(0, "rgba(232,197,106,0.24)");
    og.addColorStop(0.4, "rgba(210,165,75,0.08)");
    og.addColorStop(1, "rgba(180,130,45,0)");
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    const bg = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.27,
      r * 0.06,
      cx,
      cy,
      r * 1.03,
    );
    bg.addColorStop(0, "#faecd4");
    bg.addColorStop(0.22, "#eedcb4");
    bg.addColorStop(0.52, "#d4b47e");
    bg.addColorStop(0.8, "#b28848");
    bg.addColorStop(1, "#7a5522");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const bands = [
      { dy: -0.7, h: 0.11, a: 0.09, tilt: 0.08 },
      { dy: -0.4, h: 0.16, a: 0.07, tilt: -0.1 },
      { dy: -0.06, h: 0.19, a: 0.1, tilt: 0.06 },
      { dy: 0.28, h: 0.13, a: 0.06, tilt: -0.07 },
      { dy: 0.6, h: 0.11, a: 0.07, tilt: 0.09 },
    ];
    const co = cloudOff % (r * 2);
    for (const b of bands) {
      ctx.fillStyle = `rgba(255,248,220,${b.a})`;
      ctx.beginPath();
      ctx.ellipse(
        cx - co * 0.22,
        cy + r * b.dy,
        r * 1.12,
        r * b.h,
        b.tilt,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    const term = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    term.addColorStop(0, "rgba(0,0,0,0)");
    term.addColorStop(0.58, "rgba(0,0,0,0)");
    term.addColorStop(0.88, "rgba(3,1,0,0.22)");
    term.addColorStop(1, "rgba(3,1,0,0.40)");
    ctx.fillStyle = term;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();

    const limb = ctx.createRadialGradient(cx, cy, r * 0.91, cx, cy, r * 1.08);
    limb.addColorStop(0, "rgba(232,197,106,0)");
    limb.addColorStop(0.55, "rgba(238,206,110,0.50)");
    limb.addColorStop(1, "rgba(200,155,55,0)");
    ctx.fillStyle = limb;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBackground() {
    const palette = BG_PALETTES[(level - 1) % BG_PALETTES.length];
    const bg = ctx.createRadialGradient(
      planetX,
      planetY,
      0,
      planetX,
      planetY,
      planetR * 2.2,
    );
    bg.addColorStop(0, palette[0]);
    bg.addColorStop(0.35, palette[1]);
    bg.addColorStop(1, palette[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.45;
    drawVenus(planetX, planetY, planetR);
    ctx.restore();

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#fff";
    for (const s of farStars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.32;
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#b9c9e6";
    for (const s of nearMotes) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    drawBackground();

    // Dim the play field itself so its edge reads as a frontier against the
    // brighter backdrop beyond it, rather than blending into it.
    ctx.save();
    ctx.fillStyle = "rgba(2,4,10,0.28)";
    ctx.fillRect(viewOffX, viewOffY, BASE_W * viewScale, BASE_H * viewScale);
    ctx.restore();

    ctx.save();
    ctx.translate(viewOffX, viewOffY);
    ctx.scale(viewScale, viewScale);

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, BASE_W, BASE_H);

    for (const m of meteors) {
      const kind = METEOR_KINDS[m.kind] || METEOR_KINDS.rock;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      if (kind.glow) {
        ctx.shadowColor = kind.glow;
        ctx.shadowBlur = 14;
      }
      const g = ctx.createRadialGradient(
        -m.r * 0.3,
        -m.r * 0.3,
        m.r * 0.2,
        0,
        0,
        m.r,
      );
      g.addColorStop(0, kind.colors[0]);
      g.addColorStop(0.5, kind.colors[1]);
      g.addColorStop(1, kind.colors[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      const sides = m.shape.length;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const rr = m.r * m.shape[i];
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (m.hp < m.maxHp) {
        const barW = m.r * 1.6;
        const barY = m.y - m.r - 10;
        const frac = Math.max(0, m.hp / m.maxHp);
        ctx.fillStyle = "rgba(4,6,12,0.7)";
        ctx.fillRect(m.x - barW / 2, barY, barW, 4);
        ctx.fillStyle = frac > 0.4 ? "#e8cfa0" : "#e03a2f";
        ctx.fillRect(m.x - barW / 2, barY, barW * frac, 4);
      }
    }

    for (const b of beams) {
      const speed = Math.hypot(b.vx, b.vy) || 1;
      const tailX = b.x - (b.vx / speed) * 36;
      const tailY = b.y - (b.vy / speed) * 36;
      ctx.save();
      ctx.shadowColor = "#ff6a52";
      ctx.shadowBlur = 12;
      const glow = ctx.createLinearGradient(b.x, b.y, tailX, tailY);
      glow.addColorStop(0, "rgba(255,110,80,.9)");
      glow.addColorStop(1, "rgba(255,110,80,0)");
      ctx.strokeStyle = glow;
      ctx.lineCap = "round";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const core = ctx.createLinearGradient(b.x, b.y, tailX, tailY);
      core.addColorStop(0, "rgba(255,244,232,1)");
      core.addColorStop(0.6, "rgba(255,150,110,.9)");
      core.addColorStop(1, "rgba(255,110,80,0)");
      ctx.strokeStyle = core;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of pickups) {
      const isShield = p.type === "shield";
      const rgb = isShield ? "143,232,255" : "232,207,160";
      const solid = isShield ? "#8fe8ff" : "#e8cfa0";
      const pulse = 1 + Math.sin(runTime * 4 + p.x) * 0.15;
      const g = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.r * pulse * 1.8,
      );
      g.addColorStop(0, `rgba(${rgb},0.9)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = solid;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse * 0.6, 0, Math.PI * 2);
      ctx.fill();

      if (!isShield) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = '700 11px "Space Mono", monospace';
        ctx.fillStyle = "rgba(232,207,160,0.9)";
        ctx.fillText("POWER UP", p.x, p.y - p.r * 2.4);
        ctx.restore();
      }
    }

    ctx.textAlign = "center";
    ctx.font = '700 18px "Space Mono", monospace';
    for (const p of popups) {
      const growIn = Math.min(1, p.t / 0.12);
      const fadeOut = Math.max(0, 1 - Math.max(0, p.t - 0.35) / 0.35);
      const alpha = growIn * fadeOut;
      const scale = 0.6 + growIn * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y - 10 - p.t * 34);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#f5d79a";
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }

    if (levelBannerT >= 0) {
      const growIn = Math.min(1, levelBannerT / 0.32);
      const fadeOut = Math.max(
        0,
        1 - Math.max(0, levelBannerT - (LEVEL_BANNER_DUR - 0.5)) / 0.5,
      );
      const overshoot = growIn < 1 ? 1 + Math.sin(growIn * Math.PI) * 0.22 : 1;
      const scale = (0.4 + growIn * 0.6) * overshoot;
      ctx.save();
      ctx.globalAlpha = growIn * fadeOut;
      ctx.textAlign = "center";
      ctx.translate(BASE_W / 2, BASE_H * 0.28);
      ctx.scale(scale, scale);
      ctx.shadowColor = "#f5d79a";
      ctx.shadowBlur = 28;
      ctx.fillStyle = "#f5d79a";
      ctx.font = '900 64px "Archivo Black", sans-serif';
      ctx.fillText(`LEVEL ${level}`, 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = '700 15px "Space Mono", monospace';
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fillText("METEORS ACCELERATING", 0, 34);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    if (auraDmgLv > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(runTime * 5) * 0.06;
      ctx.strokeStyle = "#e03a2f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -ship.h * 0.15, 70 + auraDmgLv * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (shielded) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(runTime * 10) * 0.15;
      ctx.strokeStyle = "#8fe8ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ship.w * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const thrusting = keys.left || keys.right || keys.up || keys.down;

    if (thrusting) {
      const eg = ctx.createRadialGradient(
        0,
        ship.h / 2 + 6,
        0,
        0,
        ship.h / 2 + 10,
        28,
      );
      eg.addColorStop(0, "rgba(232,197,106,0.72)");
      eg.addColorStop(0.38, "rgba(220,90,25,0.28)");
      eg.addColorStop(1, "rgba(200,45,0,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(0, ship.h / 2 + 8, 28, 0, Math.PI * 2);
      ctx.fill();
    }

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
      ship.w * 0.17,
      ship.h * 0.15,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (thrusting) {
      const fh = 20 + Math.random() * 14;
      ctx.fillStyle = "rgba(232,197,106,0.90)";
      ctx.beginPath();
      ctx.moveTo(-6, ship.h / 2 - 5);
      ctx.lineTo(6, ship.h / 2 - 5);
      ctx.lineTo(0, ship.h / 2 + fh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,235,180,0.75)";
      ctx.beginPath();
      ctx.moveTo(-3, ship.h / 2 - 3);
      ctx.lineTo(3, ship.h / 2 - 3);
      ctx.lineTo(0, ship.h / 2 + fh * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    drawHud();

    ctx.restore();
  }

  // Plain-text status readout drawn inside the play-field border, top-left
  // for ship/upgrade state and top-right for score — no pill chrome, so it
  // reads as part of the scene rather than a UI panel bolted on top.
  function drawHud() {
    ctx.save();
    ctx.font = '700 15px "Space Mono", monospace';
    ctx.shadowColor = "rgba(0,0,0,.85)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 1;

    const dim = "rgba(255,255,255,.72)";
    const leftLines = [
      { text: `LVL ${level}`, color: "#f5d79a" },
      { text: `HP ${Math.max(0, shipHp)}/${shipMaxHp}`, color: "#f5d79a" },
    ];
    if (fireRateLv > 0) leftLines.push({ text: `RATE ${fireRateLv}/5`, color: dim });
    if (laserCountLv > 0) leftLines.push({ text: `GUNS ${laserCountLv}/5`, color: dim });
    if (dmgLv > 0) leftLines.push({ text: `DMG ${dmgLv}/5`, color: dim });
    if (magnetLv > 0) leftLines.push({ text: `MAG ${magnetLv}/5`, color: dim });
    if (auraDmgLv > 0) leftLines.push({ text: `AURA ${auraDmgLv}/5`, color: dim });

    ctx.textAlign = "left";
    let ly = 54;
    for (const line of leftLines) {
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, 26, ly);
      ly += 22;
    }

    const rightLines = [{ text: `SCORE ${Math.floor(score)}`, color: dim }];
    if (level > 1) {
      rightLines.push({
        text: `×${scoreMultiplier().toFixed(2)}`,
        color: "#f5d79a",
      });
    }
    if (shielded) {
      const remain = Math.max(0, Math.ceil(shieldUntil - runTime));
      rightLines.push({ text: `SHIELD ${remain}s`, color: "#8fe8ff" });
    }

    ctx.textAlign = "right";
    let ry = 54;
    for (const line of rightLines) {
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, BASE_W - 26, ry);
      ry += 22;
    }

    ctx.restore();
  }

  function setKey(dir, active) {
    keys[dir] = active;
  }

  addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", true);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", true);
    if (e.code === "ArrowUp" || e.code === "KeyW") setKey("up", true);
    if (e.code === "ArrowDown" || e.code === "KeyS") setKey("down", true);
    if (e.code === "Space" && !e.repeat) fireBeam();
    if (gameOver && e.code === "KeyR") reset();
  });
  addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") setKey("left", false);
    if (e.code === "ArrowRight" || e.code === "KeyD") setKey("right", false);
    if (e.code === "ArrowUp" || e.code === "KeyW") setKey("up", false);
    if (e.code === "ArrowDown" || e.code === "KeyS") setKey("down", false);
  });

  function worldY(screenY) {
    return (screenY - viewOffY) / viewScale;
  }

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (gameOver || choosing) return;
      const wx = worldX(e.clientX);
      const wy = worldY(e.clientY);
      if (wx < ship.x) setKey("left", true);
      else setKey("right", true);
      if (wy < ship.y) setKey("up", true);
      else setKey("down", true);
    },
    { passive: true },
  );
  canvas.addEventListener(
    "pointerup",
    () => {
      setKey("left", false);
      setKey("right", false);
      setKey("up", false);
      setKey("down", false);
    },
    { passive: true },
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      setKey("left", false);
      setKey("right", false);
      setKey("up", false);
      setKey("down", false);
    },
    { passive: true },
  );

  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const upBtn = document.getElementById("up");
  const downBtn = document.getElementById("down");
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
  if (upBtn) addTouch(upBtn, "up");
  if (downBtn) addTouch(downBtn, "down");

  const fireBtn = document.getElementById("fire");
  if (fireBtn) {
    const doFire = (e) => {
      e.preventDefault();
      fireBeam();
    };
    fireBtn.addEventListener("touchstart", doFire, { passive: false });
    fireBtn.addEventListener("mousedown", doFire);
  }

  gameOverRestart.addEventListener("click", reset);
  gameOverRestart.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      reset();
    },
    { passive: false },
  );

  upgradeButtons.forEach(({ btn }, i) => {
    btn.addEventListener("click", () => applyUpgrade(i));
  });

  requestAnimationFrame(step);
})();
