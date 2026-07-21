(function () {
  "use strict";

  document.documentElement.classList.add("js-anim");

  /* ============ Starfield ============ */
  let canvas = document.getElementById("starfield");
  let ctx = canvas.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 1;
  let layers = [];
  let LAYER_DEFS = [
    { density: 22000, sizeMin: 0.5, sizeMax: 1.0, parallax: 0.12, alpha: 0.5 },
    { density: 14000, sizeMin: 1.0, sizeMax: 1.7, parallax: 0.3, alpha: 0.7 },
    { density: 26000, sizeMin: 1.7, sizeMax: 2.5, parallax: 0.55, alpha: 0.9 },
  ];

  function rand(seed) {
    let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildStars() {
    layers = LAYER_DEFS.map(function (def, li) {
      let count = Math.max(20, Math.round((W * H) / def.density));
      let stars = [];
      for (let i = 0; i < count; i++) {
        let s = li * 10000 + i * 7;
        stars.push({
          x: rand(s + 1) * W,
          y: rand(s + 2) * H,
          r: def.sizeMin + rand(s + 3) * (def.sizeMax - def.sizeMin),
          phase: rand(s + 4) * Math.PI * 2,
          speed: 0.5 + rand(s + 5) * 1.2,
        });
      }
      return { def: def, stars: stars };
    });
  }

  /* ============ Planeter ============ */
  let PLANETS = [
    {
      name: "MERKUR",
      r: 0.02,
      s0: 0.06,
      px: 0.8,
      pf: 0.42,
      hi: "#b8b0a8",
      lo: "#5c554e",
      msg: "Swift little MERKUR ⚡",
    },
    {
      name: "VENUS",
      r: 0.034,
      s0: 0.16,
      px: 0.16,
      pf: 0.5,
      hi: "#e8cfa0",
      lo: "#a67c48",
      msg: "Cloud queen VENUS ☁️",
    },
    {
      name: "JORDEN",
      r: 0.04,
      s0: 0.27,
      px: 0.83,
      pf: 0.58,
      hi: "#6fb6e8",
      lo: "#1c4e8a",
      earth: true,
      msg: "Home signal: JORDEN 🌍",
    },
    {
      name: "MARS",
      r: 0.028,
      s0: 0.38,
      px: 0.14,
      pf: 0.46,
      hi: "#e0704a",
      lo: "#8a3520",
      msg: "Red frontier MARS 🔴",
    },
    {
      name: "JUPITER",
      r: 0.105,
      s0: 0.52,
      px: 0.85,
      pf: 0.62,
      hi: "#d9b48a",
      lo: "#8a6238",
      bands: true,
      msg: "Giant JUPITER says hi 🌀",
    },
    {
      name: "SATURN",
      r: 0.08,
      s0: 0.67,
      px: 0.16,
      pf: 0.55,
      hi: "#e3c68f",
      lo: "#9c7a48",
      ring: true,
      msg: "Rings online: SATURN 💍",
    },
    {
      name: "URANUS",
      r: 0.042,
      s0: 0.8,
      px: 0.82,
      pf: 0.48,
      hi: "#a8e0e8",
      lo: "#4a98a8",
      msg: "Cool drift: URANUS 🧊",
    },
    {
      name: "NEPTUN",
      r: 0.046,
      s0: 0.92,
      px: 0.15,
      pf: 0.6,
      hi: "#6a8ce8",
      lo: "#2a3f9c",
      msg: "Deep blue NEPTUN 🌊",
    },
  ];

  // Runtime map of visible planets for hover/click hit-test
  let visiblePlanets = [];
  let hoveredPlanetIndex = -1;

  // Earth system (moon + ISS orbit) - no live API fetch
  let earthState = { visible: false, x: 0, y: 0, r: 0 };

  // Mouse — listeners are registered below, after the toast helpers,
  // on document rather than the canvas (canvas has pointer-events: none).
  let mouse = { x: -9999, y: -9999, inside: false };

  // Simple toast
  let toastEl = null;
  let toastHideAt = 0;
  function ensureToast() {
    if (toastEl) return;
    toastEl = document.createElement("div");
    toastEl.style.position = "fixed";
    toastEl.style.left = "50%";
    toastEl.style.bottom = "1.2rem";
    toastEl.style.transform = "translateX(-50%) translateY(12px)";
    toastEl.style.padding = "0.55rem 0.9rem";
    toastEl.style.border = "1px solid rgba(255,255,255,0.35)";
    toastEl.style.borderRadius = "999px";
    toastEl.style.background = "rgba(13,20,36,0.88)";
    toastEl.style.color = "#fff";
    toastEl.style.fontFamily = "'Space Mono', ui-monospace, monospace";
    toastEl.style.fontSize = "0.72rem";
    toastEl.style.letterSpacing = "0.06em";
    toastEl.style.zIndex = "120";
    toastEl.style.opacity = "0";
    toastEl.style.transition = "opacity .2s ease, transform .2s ease";
    toastEl.style.pointerEvents = "none";
    document.body.appendChild(toastEl);
  }

  // Mouse — listen on document so pointer-events: none on the canvas
  // doesn't break planet hover/click interaction.
  document.addEventListener(
    "mousemove",
    function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.inside = true;
    },
    { passive: true },
  );
  document.addEventListener(
    "mouseleave",
    function () {
      mouse.inside = false;
      hoveredPlanetIndex = -1;
    },
    { passive: true },
  );
  document.addEventListener("click", function () {
    if (hoveredPlanetIndex < 0) return;
    showToast(PLANETS[hoveredPlanetIndex].msg);
  });
  function showToast(text) {
    ensureToast();
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translateX(-50%) translateY(0)";
    toastHideAt = performance.now() + 1400;
  }

  function drawPlanet(p, x, y, r) {
    let glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
    glow.addColorStop(0, "rgba(255,255,255,0.06)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, 6.2832);
    ctx.fill();

    if (p.ring) {
      ctx.strokeStyle = "rgba(214, 194, 150, 0.55)";
      ctx.lineWidth = r * 0.3;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, Math.PI, 6.2832);
      ctx.stroke();
    }

    let body = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.35,
      r * 0.1,
      x,
      y,
      r * 1.05,
    );
    body.addColorStop(0, p.hi);
    body.addColorStop(1, p.lo);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();

    if (p.bands || p.earth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.clip();
      if (p.bands) {
        ctx.fillStyle = "rgba(110, 74, 44, 0.35)";
        ctx.fillRect(x - r, y - r * 0.52, r * 2, r * 0.18);
        ctx.fillRect(x - r, y - r * 0.1, r * 2, r * 0.22);
        ctx.fillRect(x - r, y + r * 0.38, r * 2, r * 0.15);
        ctx.fillStyle = "rgba(200, 90, 60, 0.75)";
        ctx.beginPath();
        ctx.ellipse(
          x + r * 0.35,
          y + r * 0.24,
          r * 0.18,
          r * 0.11,
          0,
          0,
          6.2832,
        );
        ctx.fill();
      }
      if (p.earth) {
        ctx.fillStyle = "rgba(76, 156, 94, 0.85)";
        ctx.beginPath();
        ctx.ellipse(
          x - r * 0.3,
          y - r * 0.15,
          r * 0.42,
          r * 0.3,
          0.5,
          0,
          6.2832,
        );
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(
          x + r * 0.42,
          y + r * 0.35,
          r * 0.28,
          r * 0.2,
          -0.4,
          0,
          6.2832,
        );
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.ellipse(x + r * 0.1, y - r * 0.8, r * 0.35, r * 0.18, 0, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }

    if (p.ring) {
      ctx.strokeStyle = "rgba(224, 204, 160, 0.7)";
      ctx.lineWidth = r * 0.3;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.75, r * 0.55, -0.32, 0, Math.PI);
      ctx.stroke();
    }
  }

  function drawEarthSystem(scroll, now) {
    if (!earthState.visible) return;

    let ex = earthState.x;
    let ey = earthState.y;
    let er = earthState.r;

    // ISS on inner orbit
    let issOrbit = er * 1.9;
    let issA = now * 0.0012;
    let ix = ex + Math.cos(issA) * issOrbit;
    let iy = ey + Math.sin(issA) * issOrbit * 0.75;

    ctx.strokeStyle = "rgba(200,230,255,0.20)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ex, ey, issOrbit, issOrbit * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();

    let blink = 0.6 + 0.4 * Math.sin(now * 0.006);
    let ig = ctx.createRadialGradient(ix, iy, 0, ix, iy, 10);
    ig.addColorStop(0, "rgba(235,245,255," + (0.5 * blink).toFixed(3) + ")");
    ig.addColorStop(1, "rgba(235,245,255,0)");
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(ix, iy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255," + (0.88 * blink).toFixed(3) + ")";
    ctx.fillRect(ix - 1.1, iy - 0.75, 2.2, 1.5);
    ctx.fillRect(ix - 4.0, iy - 0.42, 2.2, 0.84);
    ctx.fillRect(ix + 1.8, iy - 0.42, 2.2, 0.84);

    // Moon on outer orbit
    let moonOrbit = er * 2.7;
    let moonR = Math.max(1.8, er * 0.18);
    let moonA = now * 0.00045;
    let mx = ex + Math.cos(moonA) * moonOrbit;
    let my = ey + Math.sin(moonA) * moonOrbit * 0.75;

    ctx.strokeStyle = "rgba(210,220,245,0.17)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ex, ey, moonOrbit, moonOrbit * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();

    let moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, moonR * 4);
    moonGlow.addColorStop(0, "rgba(240,245,255,0.25)");
    moonGlow.addColorStop(1, "rgba(240,245,255,0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, moonR * 4, 0, Math.PI * 2);
    ctx.fill();

    let moonBody = ctx.createRadialGradient(
      mx - moonR * 0.35,
      my - moonR * 0.35,
      0,
      mx,
      my,
      moonR * 1.2,
    );
    moonBody.addColorStop(0, "#f4f4f6");
    moonBody.addColorStop(1, "#9ca3ad");
    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlanets(scroll, now) {
    let vmin = Math.min(W, H);
    let S = journeyEnd;
    visiblePlanets.length = 0;
    earthState.visible = false;

    for (let i = 0; i < PLANETS.length; i++) {
      let p = PLANETS[i];
      let r = p.r * vmin;
      let worldY = H * 0.55 + p.s0 * S * p.pf;
      let y = worldY - scroll * p.pf;
      let x = p.px * W;
      if (y < -r * 3 || y > H + r * 3) continue;

      drawPlanet(p, x, y, r);
      visiblePlanets.push({ idx: i, x: x, y: y, r: r });

      if (p.earth) {
        earthState.visible = true;
        earthState.x = x;
        earthState.y = y;
        earthState.r = r;
      }
    }

    drawEarthSystem(scroll, now);
  }

  /* ============ Shooting stars + satellites (no live ISS) ============ */
  let shootingStars = [];
  let satellites = [];
  let nextShootAt = 0;

  function scheduleNextShoot(now) {
    let delay = 1800 + Math.random() * 4700;
    nextShootAt = now + delay;
  }

  function spawnShootingStar() {
    let startX = Math.random() * W * 0.6 - W * 0.2;
    let startY = Math.random() * H * 0.35;
    let speed = 650 + Math.random() * 550;
    let len = 90 + Math.random() * 120;
    let angle = (25 + Math.random() * 20) * (Math.PI / 180);
    shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      ttl: 700 + Math.random() * 450,
      len: len,
      width: 1 + Math.random() * 1.2,
    });
  }

  function updateShootingStars(dt, now) {
    if (now >= nextShootAt && shootingStars.length < 3) {
      spawnShootingStar();
      scheduleNextShoot(now);
    }
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      let s = shootingStars[i];
      s.life += dt;
      s.x += s.vx * (dt / 1000);
      s.y += s.vy * (dt / 1000);
      if (s.life > s.ttl || s.x > W + s.len || s.y > H + s.len)
        shootingStars.splice(i, 1);
    }
  }

  function drawShootingStars() {
    for (let i = 0; i < shootingStars.length; i++) {
      let s = shootingStars[i];
      let p = 1 - s.life / s.ttl;
      let n = Math.hypot(s.vx, s.vy) || 1;
      let tailX = s.x - (s.vx / n) * s.len;
      let tailY = s.y - (s.vy / n) * s.len;
      let grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, "rgba(255,255,255," + (0.95 * p).toFixed(3) + ")");
      grad.addColorStop(
        0.35,
        "rgba(180,220,255," + (0.45 * p).toFixed(3) + ")",
      );
      grad.addColorStop(1, "rgba(180,220,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  function createSatellite() {
    let fromLeft = Math.random() > 0.5;
    let yBand = H * (0.1 + Math.random() * 0.45);
    let baseSpeed = 18 + Math.random() * 26;
    return {
      x: fromLeft ? -40 : W + 40,
      y: yBand,
      vx: fromLeft ? baseSpeed : -baseSpeed,
      vy: (Math.random() - 0.5) * 2.2,
      size: 1.3 + Math.random() * 1.1,
      blinkPhase: Math.random() * Math.PI * 2,
      blinkSpeed: 0.006 + Math.random() * 0.005,
      glow: 0.55 + Math.random() * 0.25,
    };
  }

  function initSatellites() {
    satellites.length = 0;
    let count = 5;
    for (let i = 0; i < count; i++) satellites.push(createSatellite());
  }

  function updateSatellites(dt, now) {
    for (let i = satellites.length - 1; i >= 0; i--) {
      let s = satellites[i];
      s.x += s.vx * (dt / 1000);
      s.y += s.vy * (dt / 1000);
      s.y += Math.sin((now + s.blinkPhase * 2000) * 0.00035) * 0.02;
      let out = s.x < -80 || s.x > W + 80 || s.y < -40 || s.y > H + 40;
      if (out) satellites[i] = createSatellite();
    }
  }

  function drawSatellites(now) {
    for (let i = 0; i < satellites.length; i++) {
      let s = satellites[i];
      let blink = 0.55 + 0.45 * Math.sin(now * s.blinkSpeed + s.blinkPhase);
      let alpha = s.glow * blink;
      let g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 6);
      g.addColorStop(0, "rgba(220,240,255," + (0.45 * alpha).toFixed(3) + ")");
      g.addColorStop(1, "rgba(220,240,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(210,230,255," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateCanvasInteractions() {
    if (!mouse.inside) {
      hoveredPlanetIndex = -1;
      return;
    }

    let best = -1;
    for (let i = visiblePlanets.length - 1; i >= 0; i--) {
      let p = visiblePlanets[i];
      let dx = mouse.x - p.x;
      let dy = mouse.y - p.y;
      if (dx * dx + dy * dy <= p.r * p.r) {
        best = p.idx;
        break;
      }
    }
    hoveredPlanetIndex = best;
  }

  function drawStars(scroll, time) {
    ctx.clearRect(0, 0, W, H);

    for (let li = 0; li < layers.length; li++) {
      let layer = layers[li],
        def = layer.def,
        offset = scroll * def.parallax;
      for (let i = 0; i < layer.stars.length; i++) {
        let st = layer.stars[i];
        let y = (st.y - offset) % H;
        if (y < 0) y += H;
        let tw = 0.65 + 0.35 * Math.sin(time * 0.001 * st.speed + st.phase);
        ctx.globalAlpha = def.alpha * tw;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(st.x, y, st.r, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    let dt = Math.min(64, time - (drawStars._lastTime || time));

    updateShootingStars(dt, time);
    drawShootingStars();
    updateSatellites(dt, time);
    drawSatellites(time);

    drawPlanets(scroll, time);

    updateCanvasInteractions();

    if (toastEl && toastHideAt && time > toastHideAt) {
      toastHideAt = 0;
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(-50%) translateY(12px)";
    }

    drawStars._lastTime = time;
  }

  /* ============ Bogstav-rejsen ============ */
  let journey = document.querySelector(".journey");
  let hint = document.getElementById("hint");
  let contact = document.getElementById("contact");
  let arcadePills = document.getElementById("arcadePills");
  let stageName = document.getElementById("stageName");
  let letters = [];
  let journeyEnd = 1;
  let lastContactT = -1;
  let lastArcadePillsT = -1;
  let stageParallaxMax = 38; // px

  let WINDOWS = [
    [0.03, 0.3],
    [0.36, 0.62],
    [0.68, 0.9],
  ];

  function splitLetters() {
    let words = document.querySelectorAll("#stageName .word");
    let idx = 0;
    words.forEach(function (word, wi) {
      let chars = Array.from(word.textContent);
      word.textContent = "";
      let n = chars.length;
      chars.forEach(function (ch, ci) {
        let span = document.createElement("span");
        span.className = "ltr";
        span.textContent = ch;
        word.appendChild(span);
        let w0 = WINDOWS[wi][0],
          w1 = WINDOWS[wi][1],
          range = w1 - w0;
        let seed = idx * 13 + 5,
          angle = rand(seed + 1) * Math.PI * 2;
        let vmax = Math.max(window.innerWidth, window.innerHeight);
        letters.push({
          el: span,
          t0: w0 + (ci / n) * range * 0.65,
          dur: range * 0.35,
          dx: Math.cos(angle) * (0.55 + rand(seed + 2) * 0.7) * vmax,
          dy: Math.sin(angle) * (0.55 + rand(seed + 3) * 0.7) * vmax,
          scale: 0.3 + rand(seed + 4) * 2.4,
          rot: (rand(seed + 5) - 0.5) * 90,
          last: -1,
        });
        idx++;
      });
      word.style.visibility = "visible";
    });
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function updateLetters(p) {
    for (let i = 0; i < letters.length; i++) {
      let l = letters[i];
      let t = (p - l.t0) / l.dur;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (t === l.last) continue;
      l.last = t;
      let e = easeOutCubic(t),
        inv = 1 - e;
      l.el.style.transform =
        "translate3d(" +
        (l.dx * inv).toFixed(1) +
        "px," +
        (l.dy * inv).toFixed(1) +
        "px,0) rotate(" +
        (l.rot * inv).toFixed(2) +
        "deg) scale(" +
        (l.scale + (1 - l.scale) * e).toFixed(3) +
        ")";
      l.el.style.opacity = Math.min(1, e * 1.8).toFixed(3);
    }

    // B-mode: parallax resolves to centered at end (p=1 => y=0)
    if (stageName) {
      let y = (1 - p) * stageParallaxMax;
      stageName.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
    }

    if (hint) hint.style.opacity = p > 0.02 ? "0" : "1";

    let ct = (p - 0.92) / 0.07;
    ct = ct < 0 ? 0 : ct > 1 ? 1 : ct;

    if (arcadePills && ct !== lastArcadePillsT) {
      lastArcadePillsT = ct;
      let ce = easeOutCubic(ct);
      arcadePills.style.opacity = ce.toFixed(3);
      arcadePills.style.transform =
        "translateY(" + (-40 * (1 - ce)).toFixed(1) + "px)";
      arcadePills.style.pointerEvents = ct > 0.5 ? "auto" : "none";
    }

    if (contact && ct !== lastContactT) {
      lastContactT = ct;
      let ce = easeOutCubic(ct);
      contact.style.opacity = ce.toFixed(3);
      contact.style.transform =
        "translateY(" + (40 * (1 - ce)).toFixed(1) + "px)";
      contact.style.pointerEvents = ct > 0.5 ? "auto" : "none";
    }
  }

  /* ============ Loop ============ */
  let scrollPos = window.scrollY || 0;
  let dirty = true;

  function measure() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars();
    initSatellites();
    scheduleNextShoot(performance.now());
    if (journey) journeyEnd = Math.max(1, journey.offsetHeight - H);
    dirty = true;
  }

  let titleSats = [];
  function initTitleSats() {
    let stage = document.querySelector(".stage");
    for (let i = 0; i < 4; i++) {
      let el = document.createElement("span");
      el.className = "title-sat";
      stage.appendChild(el);
      titleSats.push({
        el: el,
        a: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.0007,
        rx: 140 + Math.random() * 120,
        ry: 45 + Math.random() * 40,
      });
    }
  }

  function updateTitleSats(time) {
    if (!stageName) return;
    let r = stageName.getBoundingClientRect();
    let cx = r.left + r.width / 2;
    let cy = r.top + r.height / 2;

    for (let i = 0; i < titleSats.length; i++) {
      let s = titleSats[i];
      let ang = s.a + time * s.speed;
      let x = cx + Math.cos(ang) * s.rx;
      let y = cy + Math.sin(ang) * s.ry;
      s.el.style.transform =
        "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      scrollPos = window.scrollY;
      dirty = true;
    },
    { passive: true },
  );
  window.addEventListener("resize", measure, { passive: true });
  measure();

  /* ============ UFO-cursor ============ */
  let ufo = document.getElementById("ufo");
  let finePointer = window.matchMedia("(pointer: fine)").matches;
  let ufoX = -100,
    ufoY = -100,
    targetX = -100,
    targetY = -100,
    ufoTilt = 0;
  let pillsExpandMargin = 80;

  if (finePointer && ufo) {
    document.documentElement.classList.add("ufo-on");
    document.addEventListener(
      "mousemove",
      function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!ufo.classList.contains("live")) {
          ufoX = targetX;
          ufoY = targetY;
          ufo.classList.add("live");
        }
      },
      { passive: true },
    );

    document.querySelectorAll("a").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        ufo.classList.add("zap");
      });
      el.addEventListener("mouseleave", function () {
        ufo.classList.remove("zap");
      });
    });
  }

  function updateUfo() {
    let dx = targetX - ufoX;
    ufoX += dx * 0.18;
    ufoY += (targetY - ufoY) * 0.18;
    let tilt = Math.max(-22, Math.min(22, dx * 0.6));
    ufoTilt += (tilt - ufoTilt) * 0.15;
    ufo.style.transform =
      "translate3d(" +
      (ufoX - 24).toFixed(1) +
      "px," +
      (ufoY - 18).toFixed(1) +
      "px,0) rotate(" +
      ufoTilt.toFixed(2) +
      "deg)";

    let pillsList = document.querySelector(".pills");
    if (pillsList) {
      let pills = pillsList.querySelectorAll(".pill"),
        inPillZone = false;
      for (let i = 0; i < pills.length; i++) {
        let rect = pills[i].getBoundingClientRect();
        let expandedTop = rect.top - pillsExpandMargin,
          expandedBottom = rect.bottom + pillsExpandMargin;
        let expandedLeft = rect.left,
          expandedRight = rect.right;
        if (
          ufoX + 24 >= expandedLeft &&
          ufoX + 24 <= expandedRight &&
          ufoY + 18 >= expandedTop &&
          ufoY + 18 <= expandedBottom
        ) {
          inPillZone = true;
          break;
        }
      }
      if (inPillZone) ufo.classList.add("zap");
      else ufo.classList.remove("zap");
    }
  }

  splitLetters();
  initTitleSats();
  updateLetters(0);
  let ufoActive = finePointer && ufo;
  (function frame(time) {
    drawStars(scrollPos, time);
    if (dirty) {
      dirty = false;
      let p = scrollPos / journeyEnd;
      updateLetters(p < 0 ? 0 : p > 1 ? 1 : p);
    }
    updateTitleSats(time);
    if (ufoActive) updateUfo();
    requestAnimationFrame(frame);
  })(0);
})();
